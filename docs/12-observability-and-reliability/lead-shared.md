---
id: observability-lead
title: Reliability Targets, On-Call & Postmortems That Actually Close (Lead, Android + iOS)
description: Observability strategy and reliability targets, severity definitions and mobile on-call, incident command and stakeholder comms, and blameless postmortems with action items that close.
tags: [android, ios, lead, on-call, postmortem]
lang: en
status: complete
domain: 12-observability-and-reliability
band: L
platform: shared
level: Lead
sidebar_position: 3
prerequisites: [observability-senior]
outcomes:
  - "Run an incident end to end and produce a postmortem whose action items are still closed three months later"
resources:
  - title: "Site Reliability Engineering — postmortem culture"
    url: "https://sre.google/sre-book/postmortem-culture/"
    date: "2024-01-01"
  - title: "Android Vitals thresholds"
    url: "https://developer.android.com/topic/performance/vitals/launch-time"
    date: "2025-03-01"
---

# Reliability Targets, On-Call & Postmortems That Actually Close

> **Outcome.** Run an incident end to end and produce a postmortem whose action items are still
> closed three months later — the actual, checkable bar, since a postmortem with unfinished
> action items six months on is a postmortem that taught nothing.

## Observability strategy and reliability targets

```markdown
# Reliability targets — MobileApp

- Crash-free sessions: 99.5% (Android), 99.5% (iOS) — measured as distinct metrics,
  not averaged together (see the parity note below on why the two aren't comparable
  at the same threshold with the same confidence).
- ANR rate (Android): below Play's "bad behavior" threshold with margin, tracked
  weekly against Vitals — crossing this has a store-visibility consequence, not
  just an internal quality signal.
- Hang rate (iOS): tracked via MetricKit, with an explicit acknowledgment that this
  number arrives sampled and delayed — the target is directional, not a real-time gate.
```

## Severity definitions and on-call for a mobile team

Mobile on-call is not backend on-call — a mobile release can't be rolled back the way a backend
deploy can (domain 11's Lead article), and the on-call engineer often cannot fix a live incident
by shipping code at all, only by monitoring, communicating, and deciding whether a rollback,
staged-rollout halt, or expedited review is warranted.

```markdown
## Severity definitions — MobileApp

SEV1: crash-free sessions drop below 98% for a released version, or a P0 security
issue — halt the rollout immediately (Android: Play Console; iOS: cannot halt a
phased release, only pause it — see domain 11's parity break), page on-call now.
SEV2: a feature is broken for a significant user segment but the app is otherwise
stable — file and fix on the next normal release cadence, no page.
SEV3: a cosmetic or low-traffic-path issue — normal backlog, no incident process.
```

## Incident command and stakeholder comms during the event

```markdown
## Incident: checkout crash, v4.1.0, SEV1

T+0: Alert fires (domain 12 Senior's alerting design). On-call halts the Android
rollout via Play Console immediately; iOS phased release is paused (cannot be
rolled back — affected users on iOS remain on v4.1.0 until a new build ships).
T+10min: Incident commander named (not necessarily the on-call engineer — whoever
has the clearest view of user impact and authority to make the halt/communicate
decisions). Stakeholder update sent: user impact, what's known, what's not yet.
T+30min: Root cause identified (domain 12 Senior's triage method). Fix scoped;
expedited review requested for iOS (the rehearsed path from domain 11's Senior
article), hotfix branch cut for Android.
T+2h: Fix released to a small percentage via staged rollout; monitored before
widening — not shipped to 100% immediately even under pressure to resolve fast.
```

## Blameless postmortems, and action items that actually close

```markdown
# Postmortem: checkout crash, v4.1.0 (SEV1)

## What happened (facts, no blame)
A refactor moved a ViewModel dependency from constructor injection to a lifecycle-
timing-dependent lateinit assignment. A user backgrounding the app during the async
assignment and returning before it completed crashed on the next field access.

## Why it wasn't caught earlier
The refactor's PR had no test exercising the backgrounded-during-load path; code
review approved it without that specific scenario being raised, and the domain 07
architecture-test suite (this app didn't have one yet at the time) would have
flagged the lifecycle-timing pattern if it existed.

## Action items (owner, date, NOT "the team")
1. Revert to constructor injection for this ViewModel — @alex, closed 2025-11-03.
2. Add a lifecycle-backgrounding test case to the PR template's checklist for any
   ViewModel dependency change — @priya, closed 2025-11-10.
3. Land the architecture-test suite from domain 07's Lead article, specifically
   flagging lateinit fields assigned outside a constructor for injected
   dependencies — @sam, due 2025-12-01, IN PROGRESS as of this review.
```

> [!IMPORTANT]
> The three-months-later check this article's outcome names is not a formality: revisit the
> action item list on a calendar reminder, not just at postmortem-writing time. An action item
> assigned to a named owner with a real date, left open past its date with no update, is exactly
> the failure mode blameless postmortems are supposed to prevent — the incident recurring because
> the lesson was written down and then never actually acted on.

## Parity — crash and reliability tooling across platforms

**Maps:** Crashlytics/Android Vitals ↔ MetricKit/Xcode Organizer · ProGuard/R8 mapping ↔ dSYM ·
ANR ↔ watchdog termination.

**Breaks:** Android Vitals reports a fleet-wide ANR rate in near real time, with a direct
store-visibility consequence for crossing the threshold — a number the team can act on the same
day it moves. iOS's hang rate via MetricKit is **sampled** (not every session, a subset) and
arrives with a **multi-day delay**, and crossing any threshold carries **no store consequence**
at all. A reliability target phrased identically for both platforms — "ANR/hang rate below X%"
— is measurable and actionable same-day on Android and merely aspirational, retrospective
signal on iOS; the severity definitions above must state this difference explicitly rather than
implying equal real-time control on both platforms.

## Pitfalls & trade-offs

- **A reliability target stated identically for both platforms with no note on measurement
  difference.** Covered above — it reads as one number but means two different things.
- **Treating mobile on-call like backend on-call, expecting a same-day code fix.** The
  actual on-call toolkit here is halt/pause the rollout, communicate, and expedite review — not
  "ship a fix," which is a days-long path on both platforms even expedited.
- **A postmortem action item assigned to "the team" instead of a named owner and date.**
  Unowned action items are the single most common reason a postmortem's lessons never actually
  land — the three-months-later check in this article's outcome exists specifically to catch this.
- **Writing the postmortem and never revisiting whether the action items actually closed.**
  The postmortem document is not the deliverable — the closed action items are; a beautifully
  written postmortem with three still-open items after a quarter has not done its job.
