---
id: release-senior-android
title: Build-Time Optimisation Against a Baseline & Release Mechanics (Senior, Android)
description: Build-time optimisation with a measured baseline, pipeline authoring, versioning and release trains, staged rollout and hotfix path, and feature flags.
tags: [android, gradle, build-performance, release, senior]
lang: en
status: complete
domain: 11-build-release-and-cicd
band: S
platform: android
level: Senior
sidebar_position: 3
prerequisites: [release-mid-android]
outcomes:
  - "Cut incremental build time by a stated percentage and show the before-and-after scan"
counterpart: release-senior-ios
resources:
  - title: "Gradle build scans"
    url: "https://scans.gradle.com/"
    date: "2025-02-01"
  - title: "Dependency Analysis Gradle Plugin"
    url: "https://github.com/autonomousapps/dependency-analysis-gradle-plugin"
    date: "2024-11-01"
  - title: "Play Console — staged rollouts"
    url: "https://support.google.com/googleplay/android-developer/answer/6346149"
    date: "2025-01-01"
  - title: "Feature flags — best practices"
    url: "https://martinfowler.com/articles/feature-toggles.html"
    date: "2017-10-01"
---

# Build-Time Optimisation Against a Baseline & Release Mechanics

> **Outcome.** Cut incremental build time by a stated percentage, and show it — a before-and-
> after Gradle build scan is the artifact that makes the claim checkable rather than felt.

## 1. Build-time optimisation against a measured baseline

```bash
./gradlew assembleDebug --scan
# The scan names, per task, configuration time, execution time, and whether it was
# UP-TO-DATE, FROM-CACHE, or actually executed — the specific breakdown that tells
# you WHERE the time goes, rather than guessing from a single wall-clock number.
```

```kotlin
// Dependency Analysis plugin catches the api/implementation mistakes that quietly
// widen the module graph (domain 07's Senior article) and slow every downstream build.
dependencyAnalysis {
    issues { onUnusedDependencies { severity("fail") } }
}
```

```kotlin
// moduleGraphAssert enforces the module boundaries domain 07 designs, in CI —
// this is the mechanism, not just the convention, for keeping the graph shallow.
moduleGraphAssert {
    maxHeight = 4
    restricted = listOf(":feature:.* -X-> :feature:.*") // no direct feature-to-feature deps
}
```

```markdown
## Build-time optimisation: incremental build regression

Baseline (build scan attached, 2025-10-01): 48s for an incremental build touching
one file in :feature:profile.
Root cause: :feature:profile depends directly on :feature:settings (domain 07's
ADR-014 example) — a change anywhere in profile re-triggers configuration for
both, and the dependency-analysis plugin flags the coupling as unused-but-declared
in one direction.
Fix: extract the shared component per ADR-014; re-measure.
Result (build scan attached, 2025-10-08): 29s for the same incremental build —
a 40% reduction, the specific, checkable version of this article's outcome.
```

## 2. Pipeline authoring

```yaml
# .github/workflows/pr.yml — staged so cheap, fast checks fail first
jobs:
  lint-and-unit:
    steps:
      - run: ./gradlew lint testDebugUnitTest --scan
  integration:
    needs: lint-and-unit  # only runs if the cheap stage passed
    steps:
      - run: ./gradlew connectedDebugAndroidTest --scan
```

Ordering the cheapest, fastest-failing checks first means a broken build fails in seconds, not
after paying for an expensive instrumented-test run that a lint error would have made moot
anyway.

## 3. Versioning and release trains

```
Semantic-ish versioning tied to a release train: a new train cuts every two weeks
from main, stabilizes for 2 days, then ships — a predictable cadence Product can
plan features against, rather than "whenever the current work feels done."
```

## 4. Play staged rollout, halting, hotfix path

```markdown
## Staged rollout — MobileApp v4.2.0

Day 1: 5% of new installs/updates. Monitor crash-free-sessions and ANR rate
(domain 12) against the previous version's baseline for this same window.
Day 2: 20%, if Day 1 metrics are within the stated threshold (domain 12 Lead's
reliability targets) — not a fixed calendar advance regardless of signal.
Day 4: 100%.
If a regression is detected at any stage: HALT the rollout (Play Console) —
this stops new users from receiving the bad version; it does not roll back users
who already updated. A hotfix on a new version number is still required for them.
```

## 5. Feature flags

```kotlin
if (FeatureFlags.isEnabled("new_checkout_flow")) {
    NewCheckoutScreen()
} else {
    LegacyCheckoutScreen()
}
```

A flag lets a risky change ship dark (merged, not yet active) and be enabled progressively,
independent of the app-version release train — the runtime lever domain 11's Lead article
treats as debt with a timer, expiring once the flag has fully rolled out or been reverted.

## Pitfalls & trade-offs

- **Claiming a build-time improvement with no before-and-after scan attached.** The outcome
  this article names is specifically checkable — a stated percentage with no scan is a guess.
- **A CI pipeline that runs the expensive stage before the cheap one.** Wastes time and CI
  capacity on a build that a lint failure would have already doomed.
- **Advancing a staged rollout on a fixed calendar schedule regardless of the reliability
  metrics.** The whole point of staging is gating each expansion on signal, not on elapsed time.
- **Believing a halted rollout "rolls back" users who already updated.** It only stops new
  users from receiving the bad build — domain 11's Lead article covers the actual, load-bearing
  difference between halting and rolling back.
- **A feature flag left enabled indefinitely after its rollout completed.** Debt with a timer
  that never got wound down — domain 11's Lead article names this directly.
