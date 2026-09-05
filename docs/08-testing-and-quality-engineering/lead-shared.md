---
id: testing-lead
title: The Quality Gate Policy (Lead, Android + iOS)
description: Testing strategy and quality gates, coverage of risk rather than lines, what blocks a merge vs a release, and the suite as a runtime and maintenance budget.
tags: [android, ios, lead, quality-gates, testing-strategy]
lang: en
status: complete
domain: 08-testing-and-quality-engineering
band: L
platform: shared
level: Lead
sidebar_position: 3
prerequisites: [testing-senior]
outcomes:
  - 'Write the quality gate policy, including the answer to "the gate is red and the release is today" — decided in advance, not in the moment'
resources:
  - title: "Robolectric — why Android can test on the JVM"
    url: "https://robolectric.org/"
    date: "2025-01-01"
  - title: "Google Testing Blog — the testing pyramid"
    url: "https://testing.googleblog.com/2015/04/just-say-no-to-more-end-to-end-tests.html"
    date: "2015-04-01"
---

# The Quality Gate Policy

> **Outcome.** Write the quality gate policy — including the specific, pre-decided answer to
> "the gate is red and the release is today" — so that question is never actually decided in
> the moment, under the exact pressure that produces the worst version of the decision.

## Testing strategy and quality gates

```markdown
# Testing strategy — MobileApp

## Coverage philosophy
Coverage of RISK, not of lines. A 90% line-coverage target treats a trivial getter
and the payment-conflict-resolution logic as equally important to cover — they are
not. Risk-weighted coverage means: 100% of payment and auth logic paths, offline
and error paths per screen (domain 08 Senior), and NO stated target at all for
framework boilerplate or generated code.

## What blocks a merge
- Unit and integration tests for the changed code — required, CI-blocking.
- The architecture test suite (domain 07 Lead) — required, CI-blocking.
- A screenshot-test diff for any changed UI — required to be reviewed and approved
  explicitly, not auto-blocking (a deliberate visual change is expected sometimes).

## What blocks a RELEASE but not every individual merge
- The full end-to-end suite (domain 08 Mid) — runs on the release branch, not on
  every PR, because of its cost (see the budget section below); a merge can land
  with unit/integration green and still be caught before release if end-to-end fails.
- A measured flake-rate threshold (domain 08 Senior) — a release does not ship
  while the suite's flake rate is above the agreed threshold, because a flaky gate
  cannot be trusted to mean what a green gate is supposed to mean.
```

## "The gate is red and the release is today" — decided in advance

```markdown
## Red-gate release policy — decided now, not under deadline pressure

If a release-blocking test is failing on release day:
1. Root cause is required before ANY override — "probably flaky" is not a root
   cause; it must be confirmed against the flake-measurement data (domain 08 Senior).
2. If confirmed flaky and unrelated to this release's changes: a NAMED engineering
   lead (not the release manager alone) may approve shipping with the flaky test
   quarantined and a ticket filed same-day — never silently.
3. If the failure is real (the test caught an actual regression): the release
   slips. This is stated in advance specifically so it is not re-litigated, with
   more pressure to override, on the day it actually happens.
```

> [!IMPORTANT]
> The entire value of deciding this in advance is that the decision-maker on release day is
> applying a policy, not making a judgement call under the specific pressure of a deadline — the
> exact condition under which "just this once" erodes a quality gate permanently. A policy
> written only after the first time this happened is a policy that already failed once.

## The suite as a budget: runtime and maintenance cost

```markdown
## Test suite budget — MobileApp

CI runtime target: unit+integration suite under 8 minutes (fast enough that a
developer waits for it rather than switching away and losing focus); full
end-to-end suite under 45 minutes, run on release branches only.
Maintenance cost: flake rate tracked as a first-class metric (domain 08 Senior),
reviewed alongside CI runtime at the same cadence — a suite that's fast but flaky,
or reliable but too slow to run before every merge, has failed the budget either way.
```

## Parity — why the affordable testing pyramid differs by platform

**Maps:** JUnit/Turbine/Espresso ↔ XCTest/Swift Testing/XCUITest · Robolectric ↔ no direct
equivalent.

**Breaks:** Robolectric lets a large share of Android's platform-dependent tests — anything that
would otherwise need a real device or emulator — run directly on the JVM, in seconds, as part of
the fast unit/integration layer. iOS has no equivalent host-side simulation of UIKit/SwiftUI;
the nearest equivalents to that class of test run in the iOS Simulator, an order of magnitude
slower per test than Robolectric's JVM execution. A testing pyramid budget stated identically
for both platforms — the same target runtime, the same ratio of unit-to-UI tests — is
affordable on Android and not affordable on iOS at the same test count; the iOS strategy has to
lean further toward true unit tests with no simulator dependency at all, and treat simulator-
dependent tests as a scarcer, more expensive resource than their Android counterparts.

## Pitfalls & trade-offs

- **A coverage target stated as a line-coverage percentage instead of a risk-weighted
  statement.** Rewards covering trivial code equally with the logic that actually matters.
- **No distinction between what blocks a merge and what blocks a release.** Forces every PR to
  pay the full end-to-end suite's cost, or — the opposite failure — never runs the expensive
  suite at all until it's too late to catch something before release.
- **Deciding the red-gate override policy for the first time on the day it's needed.** Covered
  above — this is precisely the decision this article's outcome asks to be made in advance.
- **Applying the same testing-pyramid ratio to iOS as to Android.** Covered in the parity
  section — Robolectric's JVM speed has no iOS equivalent, and a shared budget that ignores
  this either starves Android of tests it could easily afford or bankrupts iOS's CI runtime.
