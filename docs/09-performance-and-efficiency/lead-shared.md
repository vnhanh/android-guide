---
id: performance-lead
title: The Performance Budget & When Not to Fix It (Lead, Android + iOS)
description: Setting budgets and SLOs, field monitoring strategy, CI regression gating, architectural constraints preventing systemic regressions, and when a performance problem is not worth fixing.
tags: [android, ios, lead, performance-budget, slo, ci-gating]
lang: en
status: complete
domain: 09-performance-and-efficiency
band: L
platform: shared
level: Lead
sidebar_position: 5
prerequisites: [performance-senior-android, performance-senior-ios]
outcomes:
  - "Write the performance budget: which metrics, which percentiles, measured where, enforced how, and what happens when a gate fails on a deadline"
resources:
  - title: "Android Vitals thresholds"
    url: "https://support.google.com/googleplay/android-developer/answer/9844486"
    date: "2025-01-01"
  - title: "MetricKit"
    url: "https://developer.apple.com/documentation/metrickit"
    date: "2025-02-01"
  - title: "Macrobenchmark CI gating"
    url: "https://developer.android.com/topic/performance/benchmarking/macrobenchmark-overview"
    date: "2025-03-01"
---

# The Performance Budget & When Not to Fix It

> **Outcome.** Write the performance budget — which metrics, at which percentiles, measured
> where, enforced how — and state explicitly what happens when a gate fails on a release
> deadline, decided in advance rather than negotiated in the moment.

## Platform parity — and the load-bearing break

| Concern | Android | iOS |
| :--- | :--- | :--- |
| Rendering health | Frame drops / janky-frame rate | Hitch ratio (duration-weighted, ms/second) |
| Systemic tracing | Perfetto | Instruments |
| Field telemetry | Play Vitals | MetricKit |
| Startup compilation lever | Baseline Profiles (AOT hints for ART) | *no equivalent* — Swift is already AOT-compiled; the lever is dyld order files |
| Size/dead-code removal | R8 shrinking (tree-shaking + obfuscation) | Swift dead-code stripping (linker-level, no runtime-reflection strip) |

```
The break this domain has been building toward: an Android cold-start number
and an iOS launch-time number measure DIFFERENT INTERVALS against DIFFERENT
BASELINES.

Android "cold start" (Macrobenchmark's StartupTimingMetric): process creation
to first frame, on a device where the process did not previously exist in
memory — ART's interpret/JIT/AOT state is part of what's being measured.

iOS "launch time" (XCTApplicationLaunchMetric / MetricKit's app launch metric):
process creation to first frame as well, BUT dyld's pre-main phase, Swift's
static initializers, and the complete absence of an interpret/JIT warm-up phase
make the composition of that interval structurally different — a "300ms
cold start" on Android and a "300ms launch time" on iOS are not measuring the
same thing even though the label and the unit match.
```

> [!IMPORTANT]
> This is the load-bearing break the whole domain has been pointing at. A cross-platform
> performance report that says "both platforms are at 300ms, we're good" without naming which
> interval each number actually measures is quietly wrong — it invites a reader to compare two
> numbers that happen to share a unit and a rough shape but are not commensurable. Any shared
> dashboard or exec summary MUST label each platform's number with what it measures, not just
> its value.

## Setting budgets and SLOs

```markdown
## Performance budget — MobileApp

| Metric | Percentile | Budget | Measured where | Owner |
| :--- | :--- | :--- | :--- | :--- |
| Android cold start (Macrobenchmark StartupTimingMetric) | p90 | 700ms | CI benchmark + Play Vitals (field) | Android platform lead |
| iOS launch time (XCTApplicationLaunchMetric) | p90 | 600ms | CI perf test + MetricKit (field) | iOS platform lead |
| Android janky-frame rate | p95 sessions | < 5% | Play Vitals | Feature area leads |
| iOS hitch ratio | p95 sessions | < 300ms hitched/min scrolling | MetricKit | Feature area leads |
| App size (installed, Android AAB / iOS IPA) | — | < 150MB | Play Console / App Store Connect size report | Release owner |
| Battery: background wakelock/BGRefresh time | p95 sessions | < 2min/day | Play Vitals / MetricKit | Feature area leads |

Each budget states a PERCENTILE, not an average — an average hides the tail
users actually complain about; p90/p95 is where jank and slow starts live.
```

> [!WARNING]
> A budget with no stated percentile is not a budget. "Cold start averages 500ms" can be true
> while 10% of sessions take three seconds — the number that matters for user-visible pain is
> the tail, and averages actively hide it.

## Field monitoring strategy

```
Field data (Play Vitals / MetricKit) and CI benchmark data answer different
questions and neither replaces the other:

CI benchmark (fixed device, fixed script, every PR): catches a regression
BEFORE it ships, attributable to a specific commit — but runs on one device
profile, so it cannot see a regression that's specific to a low-end device or
a specific OEM/OS-version combination.

Field data (real devices, real networks, real thermal/battery state, at scale):
catches what CI's fixed environment can't see, but arrives AFTER release, with
a multi-day/week lag before enough sessions accumulate for a percentile to be
statistically meaningful — too slow to gate a release, exactly fast enough to
catch what CI structurally cannot.
```

```markdown
## Field monitoring — MobileApp

Weekly review: Vitals/MetricKit dashboards checked against the budget table
above, by the metric owner named in that table — not ad hoc, a standing
calendar item.
Alert threshold: an automated alert (not just the weekly review) fires if any
budgeted metric crosses its threshold by more than 10% for 3 consecutive days —
catches a regression between weekly reviews rather than waiting for the next one.
```

## CI regression gating

```kotlin
// Android: a Macrobenchmark assertion in CI, on every PR touching the startup
// path, failing the build rather than just reporting a number for someone to
// notice later.
@Test
fun coldStartupBudget() {
    val result = rule.measureRepeated(/* ... */) { /* ... */ }
    // CI step asserts the reported median against the budget table's number;
    // a PR that regresses past threshold fails, the same way a broken test does.
}
```

```swift
// iOS: an XCTest performance baseline (see domain 09's Senior iOS article)
// serves the equivalent role — its stored baseline plus tolerance IS the gate.
```

```
Gating scope, deliberately narrow: gate the metrics in the budget table, on the
specific benchmarks/tests that measure them, on PRs that touch the code paths
those benchmarks cover. Gating every PR against every metric regardless of what
changed produces noisy, low-signal failures that get muted or bypassed — the
same failure mode a testing-strategy quality gate (domain 08's Lead article)
guards against, applied to performance specifically.
```

## Architectural constraints preventing systemic regressions

```
Point fixes stop individual regressions; architectural constraints stop whole
CLASSES of regression from recurring:

- A lint rule or CI check banning synchronous I/O on the main thread (both
  platforms) prevents the single most common startup/jank regression shape at
  the source, rather than catching each instance after the fact.
- A module-graph constraint (domain 07's Senior/Lead articles) that caps how
  many modules can register an App Startup initializer / run code in
  didFinishLaunching prevents an unbounded, uncoordinated pile-up of "just one
  more thing" on the startup critical path — the actual mechanism, not a
  policy asking teams to be careful.
- A size budget enforced at build time (failing a build that pushes the AAB/IPA
  over the budget in the table above) turns "app size crept up again" from a
  quarterly surprise into a same-day, attributable build failure.
```

> [!TIP]
> The instinct after a bad regression is usually "let's review more carefully next time." A
> constraint enforced in CI or by a lint rule does not depend on anyone remembering to review
> carefully — it is the difference between a policy and a mechanism, the same distinction
> domain 01's Lead article draws for a language-idiom ban.

## When a performance problem is not worth fixing

```markdown
## Performance triage — MobileApp

Reported: a 40ms overdraw on a settings screen visited by 0.3% of sessions,
found during an unrelated profiling pass.
Decision: NOT worth fixing now. Cost to fix (a refactor of a shared layout used
elsewhere, real regression risk) against benefit (40ms on a low-traffic,
non-critical screen, below the threshold where users report it) does not clear
the bar the budget table's metrics represent. Logged as tech debt (domain 08's
Lead article's tracked-debt category), revisited only if that screen's traffic
or complaint volume changes.
```

> [!IMPORTANT]
> "Not worth fixing" needs to be a decision made against the stated budget, in writing, not a
> thing that quietly never gets prioritized. A budget that only ever says what to fix, never
> what to deliberately leave, isn't actually a budget — it's a todo list with no bottom.

## The gate-fails-on-a-deadline decision, decided in advance

```markdown
## Performance gate override policy — MobileApp

If a CI performance gate fails on a release candidate with a ship date already
committed:
1. The metric owner (named in the budget table) confirms the regression is
   real (not a flaky benchmark run — re-run 3x before treating a single red
   run as signal).
2. If real: the release is held, NOT the gate bypassed — a bypassed
   performance gate is exactly as permanent and exactly as invisible as an
   expired feature flag (domain 11's Lead article) once "just this once"
   happens the first time.
3. Exception path: a Director-level sign-off can explicitly override, LOGGED
   with the specific metric, the specific regression size, and a committed
   remediation date — visible, not silent.
```

## Pitfalls & trade-offs

- **A cross-platform report comparing Android and iOS numbers without naming what each
  measures.** The single most consequential mistake this domain has been building toward —
  covered above.
- **A budget with no stated percentile.** Hides exactly the tail that performance budgets exist
  to control.
- **Gating every metric on every PR regardless of what changed.** Produces noisy failures that
  get muted or bypassed, defeating the gate's purpose the same way an over-broad test suite
  does.
- **A point fix with no architectural constraint behind it.** Stops one instance; the same
  regression class recurs from a different module next quarter.
- **Bypassing a real, confirmed gate failure "just this once" without a logged, dated
  exception.** Becomes the norm the moment it happens silently once — same failure mode as an
  unowned, unexpired feature flag.
- **Never explicitly deciding "not worth fixing."** A budget that only ever says what to fix
  isn't a budget.
