---
id: release-lead
title: The Release Policy & the Rollback Decision Tree (Lead, Android + iOS)
description: Delivery strategy, flag hygiene and expiry, developer experience as a funded line item, CI cost ownership, and the rollback decision tree that does not work on both stores.
tags: [android, ios, lead, release-strategy, feature-flags]
lang: en
status: complete
domain: 11-build-release-and-cicd
band: L
platform: shared
level: Lead
sidebar_position: 5
prerequisites: [release-senior-android, release-senior-ios]
outcomes:
  - "Write the release policy including the rollback decision tree, and confirm it works on both stores — because it does not"
resources:
  - title: "Play Console — halt a release"
    url: "https://support.google.com/googleplay/android-developer/answer/6346149"
    date: "2025-01-01"
  - title: "App Store phased release for automatic updates"
    url: "https://developer.apple.com/help/app-store-connect/manage-your-apps-availability/release-a-version-update-in-phases"
    date: "2025-06-01"
---

# The Release Policy & the Rollback Decision Tree

> **Outcome.** Write the release policy, including a rollback decision tree, and confirm it
> actually works identically on both stores — it does not, and the policy has to say so
> explicitly rather than assume a shared answer.

## The rollback decision tree — and where it forks by platform

```markdown
# Rollback decision tree — MobileApp

A SEV1 regression is detected in a released version (domain 12's severity
definitions).

## Android (Play Console)
1. HALT the staged rollout immediately — stops new users receiving the bad
   version.
2. Users who already updated: Play Console CAN roll them back to the previous
   version automatically, if the rollout used Play's staged-rollout-with-
   rollback mechanism — confirm this is configured BEFORE it's needed, not
   during the incident.
3. Ship a fixed version once ready; resume the staged rollout from the fix.

## iOS (App Store Connect)
1. PAUSE the phased release — stops the percentage from expanding further,
   but does NOT undo it for users already on the bad version, and pausing
   itself has a time limit (Apple auto-resumes a paused phase after a period).
2. There is NO rollback mechanism for users already updated. The only path
   forward for them is a NEW build through App Review — the hotfix runbook
   (domain 11's Senior article), submitted with the expedited-review request
   already drafted.
3. Because pausing has a time limit and there is no rollback, the ACTUAL
   mitigation window on iOS is shorter and more urgent than the equivalent
   Android path — this needs to be understood BEFORE an incident, not
   discovered mid-incident when the team assumes "we can always roll back."
```

> [!IMPORTANT]
> This is the load-bearing platform break this entire domain has been building toward. A policy
> that says "roll back the release" without naming which platform that's actually true for is a
> policy that will be followed confidently and incorrectly on iOS during the first real
> incident — the team will look for a rollback button that does not exist, losing time an
> already-urgent situation cannot afford.

## Delivery strategy: cadence, release train, rollback policy

```markdown
## Delivery strategy — MobileApp

Cadence: a release train every 2 weeks (domain 11 Senior), stabilized 2 days
before cutting, feature-flagged work merged dark throughout the cycle rather than
timed to land exactly at a release boundary.
Rollback policy: see the decision tree above — stated per-platform, not shared.
```

## Flag hygiene and expiry — flags are debt with a timer

```markdown
## Flag registry — MobileApp

new_checkout_flow: enabled 100% since 2025-09-15. EXPIRED — should have been
removed by 2025-10-15 (30-day cleanup SLA) but is still in the codebase, now a
review-blocking item this sprint.
experimental_dark_mode_v2: enabled 10% since 2025-11-01, under active A/B
measurement — not yet expired, review date 2025-12-01.
```

> [!WARNING]
> A feature flag with no expiry date is not a flag, it's a permanent branch nobody remembers the
> reason for — the exact debt-with-no-tracked-owner failure mode domain 01's Lead article names
> for a language-idiom exception, applied to release mechanics. Every flag needs a review date
> at creation, and a registry (even a simple one) is what makes an expired flag visible instead
> of silently accumulating.

## Developer experience as a funded line item

CI runtime, build reliability, and the tooling that makes "small PRs and bisect" (domain 11 Mid)
actually pleasant to use are not free — they compete for the same engineering time as feature
work unless explicitly funded. Treating a slow, flaky CI pipeline as an accepted cost that
"everyone just deals with" is a standing tax on every single PR, every day, that a stated
budget (domain 08's Lead article) and a named owner would otherwise catch and fix.

## CI cost owned by someone rather than nobody

```markdown
## CI ownership — MobileApp

Owner: platform infrastructure lead, reviewed monthly alongside the CI runtime
and flake-rate budget (domain 08 Lead).
Cost tracked: CI compute spend, and engineer-hours lost to CI flakiness/slowness
(estimated from the flake-rate data), reviewed together — a cheap-looking CI bill
next to a high flake-driven productivity cost is not actually cheap.
```

## Pitfalls & trade-offs

- **A rollback policy that doesn't name the platform-specific reality.** Covered above — the
  single most consequential gap this policy can have, discovered at the worst possible time.
- **A feature flag with no expiry date or registry entry.** Silently becomes permanent,
  unowned debt — the registry is what makes this visible instead of invisible.
- **Treating CI cost as free because the monthly bill looks small.** The larger, often invisible
  cost is engineer time lost to flakiness and slow feedback loops — track both together.
- **No named owner for CI health.** "Owned by everyone" is owned by no one in practice —
  someone specific needs to be accountable for the budget domain 08's Lead article establishes.
