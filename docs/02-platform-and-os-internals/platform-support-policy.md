---
id: platform-support-policy
title: Platform-Support Policy, Priced, Across Android, iOS & Flutter
description: How to price a minSdk, deployment-target, or minimum-Flutter-version change in reach, revenue, and engineering time bought back, and turn the annual OS release plus the Flutter release train into planned work instead of a fire drill.
tags: [platform-policy, minsdk, deployment-target, android, ios, flutter, lead]
lang: en
status: complete
domain: 02-platform-and-os-internals
platform: shared
band: X
level: Lead
sidebar_position: 5
prerequisites: []
outcomes:
  - "Write the platform-support policy with actual numbers behind it: which users are dropped by raising minSdk/deployment target/the minimum supported Flutter version, what that is worth in reach, and what engineering time it buys back"
resources:
  - title: "Android distribution / API level dashboard"
    url: "https://developer.android.com/about/dashboards"
    date: "2025-01-01"
  - title: "Apple platforms — adoption data"
    url: "https://developer.apple.com/support/app-store/"
    date: "2025-01-01"
  - title: "Flutter SDK releases"
    url: "https://docs.flutter.dev/release/release-notes"
    date: "2025-05-01"
---

# Platform-Support Policy, Priced, Across Android, iOS & Flutter

## Why this is priced, not asserted

"We support the last three OS versions" is a policy with no cost attached to either side of it —
not how many real users that drops, not how much engineering time maintaining the older paths
actually costs. Every load-bearing platform difference this domain covers (LMK vs Jetsam's hard
ceiling, `WorkManager`'s guarantee vs `BGTaskScheduler`'s best-effort, and the Flutter engine's own
abstractions over both) has a *support-matrix* cost: maintaining a code path for an OS version old
enough to lack a newer, cleaner API is not free, and the Lead-level job is stating exactly what it
costs against exactly how many users it keeps. A Flutter codebase adds a third variable to that
same pricing exercise, not a separate one: the Flutter SDK version the app is built against carries
its own minimum-supported Android API level and iOS deployment target, stated in Flutter's own
release notes, so "which OS versions do we support" and "which Flutter SDK are we on" are two
questions with one shared answer, not two independent policies.

## Lead

**Interview question: "How do you decide when to raise minSdk or deployment target, in a way that
survives being questioned by someone outside engineering?"**

### The policy — a worked shape

```markdown
# Platform support policy — MobileApp, 2025-Q4

## Current matrix
- Android: minSdk 26 (Android 8.0), targetSdk 35 (Android 15). Reaches 97.2% of the
  Play Console device base for this app (Play Console, pulled 2025-11-01).
- iOS: deployment target 16.0. Reaches 96.8% of App Store Connect's active device base
  for this app (App Store Connect Analytics, pulled 2025-11-01).
- Flutter: on stable 3.24. Flutter's own release notes state a minimum Android API level
  and iOS deployment target per SDK version; this app's Android/iOS floors above are
  already compatible with 3.24's stated minimums, so Flutter is not currently the binding
  constraint on either platform's floor.

## Proposed change: raise Android minSdk to 29 (Android 10)
- Users dropped: 4.1% of current MAU (Play Console device breakdown), concentrated in
  three low-ARPU markets where average device age is highest.
- Revenue at risk: ~1.8% of quarterly revenue (4.1% of MAU weighted by this segment's
  measured ARPU, which is below the app-wide average).
- Engineering time bought back: removes 6 `Build.VERSION.SDK_INT` branches maintaining
  pre-scoped-storage file access, ~3 engineer-days/quarter of support burden measured
  from the last 4 quarters' bug-tracker time entries tagged `legacy-storage`.
- Decision: proceed next minor release. The dropped-revenue estimate is smaller than one
  quarter's measured maintenance cost of the code it removes, and shrinks further as the
  low-minSdk segment continues to age out on its own.

## iOS: no proposed change this quarter
- Current deployment target already excludes only 3.2% of the active base, and Apple's
  own adoption curve (historically >90% within 6 months of a major release) means this
  number keeps shrinking without any policy change required.

## Flutter: upgrade to stable 3.27 under evaluation
- Not free even though the Android/iOS floors above don't need to move: 3.27 bumps
  Flutter's own minimum-supported API level, so the upgrade must be priced separately
  from any minSdk/deployment-target decision, as its own migration line item.
- Cost: ~8 engineer-days estimated from the plugin-compatibility pass across the app's
  native-interop plugins (camera, in-app purchase) against 3.27's changelog.
- Buys: access to a new platform-channel API this app needs for a Q1 feature, which is
  unreachable on the current Flutter version regardless of the Android/iOS floor already
  supporting the underlying OS APIs natively.
- Decision: schedule for next quarter, sequenced before the Q1 feature's spike, not
  bundled into an unrelated release.
```

### Turning the annual OS release into planned work

Both platforms ship a major OS release yearly with behaviour changes that are knowable months in
advance — Android's behavior-change pages, iOS's WWDC session notes and beta seeds. The
Lead-level habit that prevents this becoming a fire drill each autumn:

1. **Read the behavior-change notes against this app's specific surface area** the week betas
   ship — not the week the OS goes GA. A background-execution or permission change affecting
   this domain's Mid/Senior articles (scoped storage, background task budgets, a new permission
   prompt) is exactly the kind of change worth a spike before it is mandatory.
2. **File it as planned work with a deadline tied to the OS's actual enforcement date** (often a
   later `targetSdk` requirement, not the OS release date itself) — not as an emergency the week
   the store rejects a submission for targeting an outdated SDK.
3. **Land it ahead of the deadline with margin**, the same way any dependency with an external,
   non-negotiable date should be planned — a store policy deadline is not a negotiable estimate.

### Deprecation cadence and the device matrix's real cost

The device matrix's cost is not just "does it install" — it's every conditional code path,
every QA device/OS combination, and every support ticket bucketed by a version nobody else on
the team remembers testing recently. A cadence stated as policy, not decided ad hoc per PR:

```markdown
## Deprecation cadence
- Review minSdk/deployment target every two quarters against the priced-decision template
  above, not opportunistically when a feature happens to need a newer API.
- A `Build.VERSION.SDK_INT` / `@available` branch older than 18 months is flagged in the
  quarterly tech-debt review (domain 15) for removal consideration, not left indefinitely
  "in case someone still needs it."
- Review the pinned Flutter SDK version on the same two-quarter cadence, checking its
  release notes for a minimum-API-level bump before assuming a stale pin is harmless —
  a Flutter upgrade left indefinitely can quietly become the actual reason a native OS API
  the team wants stays unreachable, long after the Android/iOS floor itself would allow it.
```

### The Flutter-SDK-version axis, priced the same way

A team on an old Flutter version can be blocked from raising `minSdk` or deployment target, or
from adopting a new OS's APIs, until it also upgrades Flutter itself — a third axis on top of
"which Android/iOS versions do we support," not a replacement for it. Pricing it uses the same
three numbers as the Android and iOS decisions above: which native-interop plugins need a
compatibility pass, how many engineer-days that pass costs, and what capability it buys back (a
platform-channel API, a build-tooling requirement, or simply staying inside Flutter's own support
window so security and bug fixes keep landing). Treat a Flutter upgrade as its own line in the
quarterly review, with its own cost and its own decision, rather than folding it silently into
whichever feature PR happens to need it first.

This is the depth angle for platform-support policy specifically — see the Tech Lead Roadmap
article for how this connects to the wider breadth a Tech Lead needs.

## What "raising the floor" costs, by platform

| | Android | iOS | Flutter |
|---|---|---|---|
| What moves | minSdk | Deployment target | Minimum supported Flutter SDK version |
| Cost driver | `Build.VERSION.SDK_INT` branches removed or added | `@available` branches removed or added | Native-interop plugin compatibility pass across the version bump |
| What it can unlock | A newer platform API, less branch maintenance | A newer platform API, less branch maintenance | Native OS APIs otherwise unreachable through the engine's channel, regardless of the Android or iOS floor |

## Pitfalls & trade-offs

- **Asserting a support window without pricing either side of it.** "Last three versions" is a
  preference; a number of users dropped against a number of engineer-days recovered is a
  decision that survives being questioned by someone outside engineering.
- **Treating the annual OS release as a surprise every year.** The behavior-change notes are
  public before GA; the only real deadline risk is not reading them until the store enforces the
  new `targetSdk` requirement.
- **Letting old version branches accumulate with no review cadence.** Each one is a real,
  compounding maintenance and QA cost — a stated cadence for revisiting them is what prevents
  the device matrix from only ever growing.
- **Pricing reach in raw device-share percentage without segmenting by revenue.** A dropped
  segment's ARPU can be well below the app-wide average (older, lower-spec devices often
  correlate with markets or user segments with lower monetisation) — the revenue-at-risk number
  is rarely the same as the raw percentage-of-users number, and conflating them either
  overstates or understates the actual cost of the decision.
- **Treating a Flutter upgrade as free because "it's just a version bump."** It can gate which
  native OS APIs are even reachable, and needs its own migration line item and its own priced
  decision, not silent bundling into an unrelated feature PR.
