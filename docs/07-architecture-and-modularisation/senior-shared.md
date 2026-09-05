---
id: architecture-senior
title: Module Graph Design, DI at Scale & Architecture ADRs (Senior, Android + iOS)
description: The :api/:impl split and decoupled navigation, module graph design and build time, ADRs, incremental refactoring behind flags, and DI at scale.
tags: [android, ios, architecture, modularisation, di, senior]
lang: en
status: complete
domain: 07-architecture-and-modularisation
band: S
platform: shared
level: Senior
sidebar_position: 2
prerequisites: [architecture-mid]
outcomes:
  - "Propose a module boundary and predict its effect on incremental build time before implementing it — then check whether you were right"
resources:
  - title: "Android Gradle plugin — modularization guidance"
    url: "https://developer.android.com/topic/modularization"
    date: "2025-04-01"
  - title: "Swift Package Manager documentation"
    url: "https://www.swift.org/documentation/package-manager/"
    date: "2025-06-01"
  - title: "Migrating from kapt to KSP"
    url: "https://developer.android.com/build/migrate-to-ksp"
    date: "2024-11-01"
  - title: "Architecture Decision Records"
    url: "https://adr.github.io/"
    date: "2024-01-01"
---

# Module Graph Design, DI at Scale & Architecture ADRs

> **Outcome.** Propose a module boundary, predict its effect on incremental build time *before*
> implementing it, then measure and check whether the prediction was right — the loop that
> turns modularisation from folklore into an engineering practice.

## 1. The `:api`/`:impl` split and decoupled navigation

```
                       ┌──────────────┐
                       │     :app     │
                       └──────┬───────┘
                              │
               ┌──────────────┴──────────────┐
               ▼                             ▼
       ┌──────────────┐              ┌──────────────┐
       │ :feature:a   │              │ :feature:b   │
       └──────┬───────┘              └──────┬───────┘
              │                             │
              └──────────────┬──────────────┘
                             ▼
                    ┌─────────────────┐
                    │ :core:navigation│
                    └─────────────────┘
```

`:feature:profile:api` exposes only the lightweight contracts and navigation routes other
modules need; `:feature:profile:impl` holds the actual screens, ViewModels, and internal logic.
Other modules compile against `:api` alone — a change inside `:impl` does not trigger their
recompilation, which is the entire build-time payoff this split exists for.

```kotlin
// :core:navigation — a type-safe route, depended on by every feature, owned by nobody's impl.
@Serializable
data class ProfileRoute(val userId: String)

// Any feature can navigate to Profile without depending on :feature:profile:impl at all —
// this is what makes the module graph a directed acyclic graph instead of a tangle.
navController.navigate(ProfileRoute(userId = "user_789"))
```

The iOS analogue uses SwiftPM targets rather than Gradle modules — the same api/impl separation
is expressed as two targets, with the impl target's symbols simply not exported from the
package's public interface:

```swift
// Package.swift
targets: [
    .target(name: "ProfileAPI", dependencies: []),           // routes, protocols — public
    .target(name: "ProfileImpl", dependencies: ["ProfileAPI"]), // screens, view models — internal
]
```

## 2. Module graph design and its direct effect on build time

Gradle's incremental build only recompiles a module and everything **downstream** of it in the
dependency graph — a leaf module (nothing depends on it) changing costs almost nothing; a module
at the graph's root that everything depends on changing costs a full rebuild.

```
Before: :feature:profile depends directly on :feature:settings (for one shared component)
  → any :feature:settings change forces :feature:profile to recompile too, despite
    them being otherwise unrelated features.

After: extract the shared component into :core:shared-ui, both features depend on it,
  neither depends on the other
  → :feature:settings and :feature:profile now build independently of each other.
```

Predicting the effect before implementing means reasoning about the graph directly: which
modules currently depend, transitively, on the one being changed — the Gradle build scan's
module dependency view (or `./gradlew :feature:profile:dependencies`) answers this without
guessing.

## 3. Architecture trade-offs written as ADRs

```markdown
# ADR-014: Extract :core:shared-ui from :feature:settings

## Context
:feature:profile depends directly on :feature:settings for a single shared avatar
component, coupling two otherwise-independent features and forcing profile's
incremental build to re-trigger on every settings change (measured: +40s per CI run
on settings-only PRs, from the build scan history).

## Decision
Extract the avatar component into a new :core:shared-ui module. Both features depend
on it; neither depends on the other.

## Alternatives considered
- Leave as-is: rejected, ongoing build-time cost compounds as both features grow.
- Duplicate the component per feature: rejected, reintroduces the exact drift a
  shared design-system component exists to prevent (domain 03's Lead article).

## Consequences
Predicted: settings-only PRs no longer trigger a profile recompile. Measured after
landing (see the build scan attached to PR #482): confirmed, ~35s saved per CI run
on settings-only changes — close to the +40s predicted, difference attributed to
CI cache warmth varying between runs.
```

An ADR that records the prediction *and* the measured outcome, side by side, is what makes this
outcome checkable — not the decision alone, but whether the stated prediction was right.

## 4. Incremental refactoring behind flags

A module-boundary change of any size is safer landed behind a flag that lets the old and new
graph coexist until the new one is proven, rather than as one large cutover PR:

```kotlin
if (FeatureFlags.useSharedUiModule) {
    SharedUi.AvatarComponent(user)
} else {
    LegacyAvatarComponent(user) // old :feature:settings-owned version, removed once
                                 // the new module is confirmed stable and fully migrated
}
```

## 5. DI at scale: scoping, graph coupling, KSP over KAPT

```kotlin
// Over-scoping: marking everything @Singleton bloats memory (nothing is ever released)
// and increases graph coupling (every consumer of a singleton is implicitly coupled
// to its lifetime). Feature-scoped or stateless bindings avoid both.
@Module
@InstallIn(ViewModelComponent::class) // scoped to the ViewModel's own lifetime, not the app's
class ProfileModule {
    @Provides
    fun provideProfileFormatter(): ProfileFormatter = ProfileFormatter()
}
```

> [!TIP]
> Migrating Hilt/Dagger annotation processing from KAPT to KSP is close to a pure win for build
> time at this scale — KSP parses Kotlin symbols directly instead of going through a Java stub
> generation step KAPT requires, typically cutting annotation-processing time meaningfully with
> no code changes to the modules themselves, only the Gradle plugin configuration.

## Parity — module systems and DI across platforms

**Maps:** Gradle module graph ↔ SwiftPM targets/xcframeworks · Hilt/Dagger ↔ manual DI, Factory,
`swift-dependencies` · `api` vs `implementation` ↔ `@_spi` and access control.

**Breaks:** Gradle enforces the `:api`/`:impl` visibility split at compile time, and the module
graph is a queryable artifact (`./gradlew :module:dependencies`, a build scan). SwiftPM's
equivalent visibility control is weaker — `@_spi` is an underscored, semi-official attribute
rather than a first-class access-control keyword, and there is no equivalent single-command
graph query as mature as Gradle's. Dagger validates the entire dependency graph at **compile
time** — a missing binding is a build failure, not a runtime crash. The common iOS approaches
(manual initializer injection, a service locator) validate at **runtime**, if at all — a missing
registration surfaces as a crash on first use, not as a build error, which changes how much a
team can trust "it compiled" as a correctness signal on each platform.

## Pitfalls & trade-offs

- **A module boundary proposed with no build-time prediction attached.** The outcome this
  article names is specifically the predict-then-check loop — a boundary change with no stated
  prediction cannot be checked, which means nobody learns whether the mental model was right.
- **Marking every DI binding `@Singleton` "to be safe."** Covered above — it costs memory and
  couples every consumer to a lifetime it didn't ask for.
- **A module-graph refactor landed as one large PR instead of behind a flag.** Harder to review,
  harder to revert if the prediction turns out wrong.
- **An ADR that records the decision but never revisits the predicted consequence.** Half the
  value of an ADR is the follow-up entry confirming or correcting the prediction — skipping it
  turns the document into a decision log nobody learns from.
- **Assuming Dagger's compile-time graph validation has an equally strong iOS equivalent.**
  Covered above — a missing DI registration on iOS is very often a runtime discovery, which
  changes how much manual testing a change in this area actually needs on that platform.
