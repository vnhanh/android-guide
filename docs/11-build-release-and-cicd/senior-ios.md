---
id: release-senior-ios
title: Build-Time Optimisation, Xcode Cloud & the Rehearsed Hotfix Path (Senior, iOS)
description: Build-time optimisation via module maps and dependency hygiene, Xcode Cloud or Fastlane pipelines, TestFlight and phased release, and a rehearsed hotfix path.
tags: [ios, xcode-cloud, fastlane, testflight, senior]
lang: en
status: complete
domain: 11-build-release-and-cicd
band: S
platform: ios
level: Senior
sidebar_position: 4
prerequisites: [release-mid-ios]
outcomes:
  - "Cut incremental build time and show it, plus a rehearsed hotfix path with the expedited-review request already drafted"
counterpart: release-senior-android
resources:
  - title: "Xcode Cloud"
    url: "https://developer.apple.com/xcode-cloud/"
    date: "2025-06-01"
  - title: "Fastlane"
    url: "https://fastlane.tools/"
    date: "2025-01-01"
  - title: "TestFlight"
    url: "https://developer.apple.com/testflight/"
    date: "2025-06-01"
  - title: "Request expedited App Review"
    url: "https://developer.apple.com/app-store/review/#expedited-review"
    date: "2024-09-01"
---

# Build-Time Optimisation, Xcode Cloud & the Rehearsed Hotfix Path

> **Outcome.** Cut incremental build time and show the measured before-and-after, and have a
> rehearsed hotfix path — including the expedited-review request already drafted — ready before
> the day it's actually needed under pressure.

## 1. Build-time optimisation: module maps, whole-module optimisation, dependency hygiene

```
Build timing summary (Xcode → Product → Perform Action → Build With Timing Summary)
names, per target and per compilation unit, where build time actually goes —
the direct analogue of a Gradle build scan's task-by-task breakdown.
```

```
Whole Module Optimization (WMO): compiles a module's files together, enabling
cross-file optimization — the trade-off is a longer single compilation unit vs
Swift's default per-file compilation, which parallelizes better for incremental
builds. Release builds typically want WMO on; Debug builds often want it off for
faster incremental iteration.
```

Dependency hygiene here plays the same role the Dependency Analysis plugin plays for Gradle:
auditing which SwiftPM package dependencies are actually used, and how deep the dependency
graph runs, since an unnecessarily deep or wide package graph slows every clean build the same
way an over-coupled Gradle module graph does.

## 2. Xcode Cloud or Fastlane pipelines

```yaml
# ci_scripts/ci_post_clone.sh (Xcode Cloud) or a Fastfile lane (Fastlane) —
# same staged-cheapest-first ordering as the Android pipeline article.
lane :pr_check do
  run_tests(scheme: "MyAppTests")  # unit tests first — fast, fails loud
  swiftlint                          # cheap static check
end
```

Xcode Cloud is Apple-managed, tightly integrated, less configurable; Fastlane is
self-hosted-or-any-CI, fully scriptable, more setup cost. The choice mirrors the same
build-vs-buy trade-off domain 14's articles name generally, applied to CI specifically.

## 3. TestFlight and phased release

```
TestFlight: internal testers (up to 100, immediate) and external testers (up to
10,000, requires a beta App Review) get a build before public release — the
direct analogue of Play's internal/closed/open testing tracks.

Phased release: like Play's staged rollout, expands the percentage of users
receiving an update over roughly a week — but see the parity note in domain 11's
Lead article: it can be PAUSED, never rolled back.
```

## 4. Hotfix and expedited review — rehearsed, not improvised

```markdown
## Hotfix runbook — MobileApp (rehearsed, updated quarterly)

1. Cut a hotfix branch from the last shipped tag, not from main (main may have
   unrelated in-progress work not ready to ship).
2. Apply the minimal fix; run the full test suite locally with the same command
   CI uses (domain 11 Mid) before submitting.
3. Submit for App Review with the EXPEDITED REVIEW REQUEST already drafted and
   ready to send — Apple's expedited review form asks for a specific justification
   (active production issue affecting users); having this pre-written means it goes
   out the moment the hotfix is submitted, not after drafting it under pressure.
4. Monitor the phased release closely (domain 12) once approved — remember it
   cannot be halted the way Play's rollout can; the approved build reaching 100%
   is a matter of time, not a decision that can be reversed once made.
```

> [!IMPORTANT]
> "Rehearsed" is the operative word in this article's outcome. A hotfix runbook drafted for the
> first time during an actual incident competes with the incident itself for attention and
> almost always takes longer and misses a step — the expedited-review request specifically
> should exist as a template before it's ever needed, filled in with the specific incident's
> details rather than composed from scratch.

## Pitfalls & trade-offs

- **Leaving Whole Module Optimization on for Debug builds "for consistency."** Slows every
  incremental iteration during development for a benefit (cross-file optimization) that mostly
  matters for the shipped Release build.
- **An unrehearsed hotfix path.** Covered above — the cost of improvising under pressure is
  real and avoidable with a runbook prepared in advance.
- **Assuming a phased release can be halted the way a Play staged rollout can.** It cannot be
  rolled back, only paused — domain 11's Lead article states the load-bearing difference; a
  hotfix plan that assumes otherwise will be wrong exactly when it matters most.
- **Choosing Xcode Cloud or Fastlane by default instead of by the team's actual configurability
  needs and existing CI investment.** The build-vs-buy trade is real in both directions.
