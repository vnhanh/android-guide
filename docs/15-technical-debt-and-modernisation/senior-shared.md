---
id: tech-debt-senior
title: Monolith to Multi-Module as a Strangler Migration (Senior)
description: The strangler pattern in practice, sequencing a monolith-to-multi-module migration, migrating behind flags with a tested rollback path, shipping features throughout, and large-scale automated refactoring.
tags: [technical-debt, migration, modularization, strangler-pattern, senior]
lang: en
status: complete
domain: 15-technical-debt-and-modernisation
band: S
platform: shared
level: Senior
sidebar_position: 2
prerequisites: [tech-debt-mid]
outcomes:
  - "Run a migration with no big-bang merge, abandonable at any point without leaving the codebase worse"
resources:
  - title: "StranglerFigApplication — Martin Fowler"
    url: "https://martinfowler.com/bliki/StranglerFigApplication.html"
    date: "2004-06-29"
  - title: "Now in Android — modularization learning journey"
    url: "https://github.com/android/nowinandroid/blob/main/docs/ModularizationLearningJourney.md"
    date: "2024-01-01"
  - title: "Gradle version catalogs"
    url: "https://docs.gradle.org/current/userguide/platforms.html"
    date: "2024-06-01"
  - title: "Feature flags for safe rollout — LaunchDarkly"
    url: "https://launchdarkly.com/blog/what-are-feature-flags/"
    date: "2023-08-01"
---

# Monolith to Multi-Module as a Strangler Migration

> **Outcome.** Run a migration with no big-bang merge, abandonable at any point without leaving
> the codebase worse — the test of whether a large restructuring was actually engineered, rather
> than just started with good intentions and a shared calendar hold for "modularization week."

## 1. The strangler pattern in practice

A big-bang rewrite fails for a specific, predictable reason: it freezes feature work for a
period long enough that the business stops tolerating it before the rewrite finishes, so it
gets abandoned partway through — leaving two half-built systems instead of one working one. The
**strangler fig** pattern avoids this by construction: the new structure grows *around* the old
one, taking over one call site, one screen, one module boundary at a time, while the old
monolith keeps serving everything not yet migrated.

```
Old monolith (:app)                    Strangling in progress
┌─────────────────────────┐            ┌─────────────────────────┐
│ Everything: network,    │            │ :app (shrinking)        │
│ DB, UI, navigation, all │   ──────►  │  ├─ still owns: Cart,    │
│ features, in one module │            │  │  Checkout (not yet)  │
└─────────────────────────┘            │  └─ delegates to ──┐   │
                                        │                     ▼   │
                                        │  :core:network  :core:db│
                                        │  :feature:settings      │
                                        │  :feature:about         │
                                        └─────────────────────────┘
```

The defining property is that **:app still builds and ships at every commit** — there is no
branch that sits unmerged for a month while the "real" migration happens elsewhere. Each step is
small enough to land, verify, and ship on its own; the strangler fig is a sequence of individually
safe migrations, not one large unsafe one wearing a project plan.

> [!IMPORTANT]
> The single property that makes this a strangler migration and not just "modularization done
> gradually" is that the system is releasable after every step. If there is ever a commit where
> the app does not build, or builds but the migrated feature is half-wired and broken, the
> strangler property has already been lost — the rest of this unit is about not losing it.

## 2. Monolith to multi-module as a sequenced migration

The sequencing question is not "which module is most valuable to extract first" — it's **which
module is safest to extract first**, because the goal for the opening phases is building
confidence in the mechanism (tooling, dependency rules, build performance) before spending that
confidence on anything load-bearing.

```
Phase 1: Core Infra        Phase 2: Navigation      Phase 3: Leaf Modules     Phase 4: API/Impl
┌──────────────────┐      ┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│  Extract :core   │  ─►  │ Break direct     │  ─►  │ Extract isolated │  ─►  │ Split complex    │
│ (network/DB/     │      │ Activity/Fragment│      │ feature modules  │      │ features into    │
│  theme/utils)    │      │ coupling via a   │      │ (Settings, About,│      │ :feature:x:api / │
│                  │      │ navigation       │      │  Help — zero     │      │ :feature:x:impl  │
│                  │      │ contract         │      │  dependents)     │      │                  │
└──────────────────┘      └──────────────────┘     └──────────────────┘     └──────────────────┘
```

**Phase 1 — infrastructure isolation.** Extract foundational libraries with no feature-specific
logic — the network client, the database layer, the base UI theme, shared extensions — into
`:core:*` modules, and standardize dependency versions across the whole project with a Gradle
version catalog (`libs.versions.toml`) before any feature module exists to disagree with it.
This phase is safe because `:core` modules have no business logic of their own to get wrong;
the risk here is almost entirely mechanical (build graph, not runtime behaviour).

**Phase 2 — navigation abstraction.** Before any feature can be extracted into its own module,
the direct `Activity`/`Fragment` references between features have to go — a feature module
cannot compile against another feature module's concrete screen class without collapsing the
module graph back into one component. Replace direct references with a navigation contract
(type-safe routes, or a dynamic-feature-style interface) that a feature module implements and
the app module wires together. This is the phase that unlocks every later one; skipping it is
the most common reason a "modularization" effort stalls at Phase 1 indefinitely.

**Phase 3 — leaf module migration.** Migrate the features with **zero dependents** first —
Settings, About, Help, and similar self-contained flows nothing else in the app imports from.
Low blast radius by construction: if the extraction is wrong, the failure is contained to one
screen nobody else's code depends on. This phase is also where the team builds working muscle
memory for the extraction mechanics (module `build.gradle`, dependency direction, navigation
wiring) on stakes low enough to afford getting it wrong once.

**Phase 4 — core feature API/impl split.** The features everything else in the app *does*
depend on — Cart, Payment, Home — cannot be extracted as a single module the way leaf features
were, because other features need to reference their public surface without pulling in their
implementation (and its transitive dependencies). Split each into `:feature:cart:api` (the
public interface and data models other modules are allowed to depend on) and
`:feature:cart:impl` (the implementation, depended on only by the app module that assembles
everything, typically via dependency injection). This preserves incremental compile times as
team size grows — a change inside `:feature:cart:impl` no longer forces a recompile of every
module that merely calls into Cart's public surface.

## 3. Migrating behind flags with a tested rollback path

Extracting a module is a structural change; routing real users to the extracted code is a
separate decision, and conflating the two is how a modularization effort turns into a shipped
regression. Each extraction should ship dark — behind a feature flag defaulted off — with an
explicit rollback path that has actually been exercised, not just designed on paper.

```kotlin
// The app can build and route to EITHER implementation at runtime — that's the
// property that makes the migration abandonable at any point.
class CheckoutRouter(
    private val flags: FeatureFlags,
    private val legacyCheckout: LegacyCheckoutEntryPoint,
    private val moduleCheckout: CheckoutFeatureEntryPoint,
) {
    fun open(context: Context) {
        if (flags.isEnabled("checkout_extracted_module")) {
            moduleCheckout.launch(context)
        } else {
            legacyCheckout.launch(context)
        }
    }
}
```

```markdown
## Rollback rehearsal — :feature:checkout extraction

- Rollback mechanism: flip `checkout_extracted_module` to off via remote config — no
  deploy required, takes effect on next app foreground.
- Rehearsed: 2025-04-02, staged rollout at 5%. Flipped off deliberately after 40 minutes
  to confirm traffic returns to the legacy path with no crash-rate spike and no orphaned
  local state (cart contents survived the switch — verified, not assumed).
- Owner if rollback is needed in production: on-call, runbook link attached to the flag
  in the flag dashboard, not only in this document.
```

The rollback path is only real once it has been exercised against production-shaped traffic,
not merely coded. A flag that has never actually been flipped off in anger is a rollback path
in name only — the first time it's needed for real is the wrong time to discover it doesn't
actually restore the old behaviour cleanly.

## 4. Shipping features throughout — the actual hard part

The mechanical extraction (Sections 1-3) is the part every modularization guide covers well.
The part that actually determines whether a migration finishes is whether **product feature
work can still land, on schedule, in the module currently mid-extraction** — because a
migration that requires freezing feature work on the area being migrated will lose that
argument against the roadmap within a quarter, every time.

This means the extraction has to be designed so a feature team can keep shipping into
`:feature:cart` (say) throughout its API/impl split, not only before it starts or after it
finishes. In practice: land the module boundary and the flag infrastructure first, keep both
implementations buildable and shippable, and let ordinary feature PRs continue landing against
whichever implementation is currently live — the migration proceeds by moving *which*
implementation is live, not by pausing feature delivery while a separate migration branch
catches up.

> [!WARNING]
> The single most common way a monolith-to-multi-module effort dies is not a technical failure —
> it's a migration branch that falls behind `main` because feature work kept landing on `main`
> and nobody kept the migration branch current. The strangler pattern exists specifically to
> avoid ever having a long-lived migration branch in the first place; if one starts to form,
> that is the signal to shrink the current step until it can land directly.

## 5. Large-scale automated refactoring

Some of the work in a module extraction is mechanical enough to script rather than hand-edit —
package renames, import path updates, moving hundreds of files into new module directories
while preserving `git blame` history. Doing this by hand across a large codebase is slow and
introduces exactly the kind of transcription error a script does not make.

```
Typical automated-refactor toolchain for a module extraction:
  - `git mv` (not delete + recreate) for every moved file, to preserve blame/history
  - A structural search-and-replace (e.g. IDE-driven "Move to module" refactor, or a
    scripted `sed`/AST-based rewrite) for package declarations and import statements
  - A codemod for call-site updates where a class moved from a concrete reference to
    an interface defined in an `:api` module
  - Compile-and-test as the verification step after each automated pass — the script
    is trusted only as far as the build and test suite that runs immediately after it
```

The discipline that keeps automated refactoring safe at scale is running it in the smallest
batch that still exercises the tool honestly, verifying the build after each batch, and
committing each batch separately — a single automated commit touching 800 files with no
intermediate verification is exactly the big-bang risk this whole unit exists to avoid,
just executed by tooling instead of by hand.

## Pitfalls & trade-offs

- **A migration branch that outlives a sprint.** The longer it lives unmerged, the more it
  diverges from ongoing feature work, and the more likely it dies unmerged — the strangler
  pattern's entire value is never having this branch exist.
- **Extracting the highest-value module first "to get the win."** The safest module to extract
  first is the one with the fewest dependents, not the most valuable one — value comes from
  finishing the sequence, not from the size of the first step.
- **A feature flag with a rollback path that was designed but never rehearsed.** The first real
  rollback is the wrong time to discover the flag doesn't cleanly restore prior behaviour.
- **Freezing feature work on the module being extracted.** This is what turns a sequenced,
  low-risk migration into a deadline fight the migration eventually loses.
- **An automated refactor committed as one large, unverified batch.** Script-driven mistakes at
  the scale of hundreds of files are just as expensive to unwind as hand-made ones — smaller
  batches with a build-and-test gate between them are what keep the automation trustworthy.
