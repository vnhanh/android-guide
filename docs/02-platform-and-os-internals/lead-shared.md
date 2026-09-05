---
id: platform-lead
title: Platform-Support Policy, Priced (Lead, Android + iOS)
description: Pricing platform-support policy in reachable users vs engineering cost, turning the annual OS release into planned work, deprecation cadence, and what the device matrix actually costs.
tags: [android, ios, lead, platform-policy]
lang: en
status: complete
domain: 02-platform-and-os-internals
band: L
platform: shared
level: Lead
sidebar_position: 5
prerequisites: [platform-senior-android, platform-senior-ios]
outcomes:
  - "Write the support policy with the numbers behind it: which users are dropped, what that is worth, what engineering time it buys back"
resources:
  - title: "Android distribution / API level dashboard"
    url: "https://developer.android.com/about/dashboards"
    date: "2025-01-01"
  - title: "Apple platforms — adoption data"
    url: "https://developer.apple.com/support/app-store/"
    date: "2025-01-01"
  - title: "Android 15/16 behavior changes"
    url: "https://developer.android.com/about/versions"
    date: "2025-03-01"
---

# Platform-Support Policy, Priced

> **Outcome.** Write the platform-support policy with actual numbers behind it: which users are
> dropped by raising `minSdk`/deployment target, what that is worth in reach, and what
> engineering time it buys back in code paths no longer maintained.

## Why this is priced, not asserted

"We support the last three OS versions" is a policy with no cost attached to either side of it —
not how many real users that drops, not how much engineering time maintaining the older paths
actually costs. The Senior-level articles in this domain each named a real, load-bearing
platform difference (LMK vs Jetsam's hard ceiling, `WorkManager`'s guarantee vs
`BGTaskScheduler`'s best-effort). Every one of those differences has a *support-matrix* cost:
maintaining a code path for an OS version old enough to lack a newer, cleaner API is not free,
and the Lead-level job is stating exactly what it costs against exactly how many users it keeps.

## The policy — a worked shape

```markdown
# Platform support policy — MobileApp, 2025-Q4

## Current matrix
- Android: minSdk 26 (Android 8.0), targetSdk 35 (Android 15). Reaches 97.2% of the
  Play Console device base for this app (Play Console, pulled 2025-11-01).
- iOS: deployment target 16.0. Reaches 96.8% of App Store Connect's active device base
  for this app (App Store Connect Analytics, pulled 2025-11-01).

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
```

## Turning the annual OS release into planned work

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

## Deprecation cadence and the device matrix's real cost

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
```

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
