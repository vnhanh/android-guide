---
id: system-design-lead
title: Framing NFRs, Product-Scale Architecture & Designing Across Team Boundaries (Lead, Android + iOS)
description: Framing NFRs with numbers before design starts, product-scale client architecture, designing across team boundaries, and designing for a system that outlives its implementation.
tags: [system-design, nfrs, architecture, leadership, lead]
lang: en
status: complete
domain: 13-mobile-system-design
band: L
platform: shared
level: Lead
sidebar_position: 3
prerequisites: [system-design-senior]
outcomes:
  - "Write the NFRs before anyone designs, with numbers, so the design review argues about the numbers rather than about taste"
resources:
  - title: "Non-functional requirements — a practical taxonomy"
    url: "https://en.wikipedia.org/wiki/Non-functional_requirement"
    date: "2024-01-01"
  - title: "Team Topologies — Skelton & Pais"
    url: "https://teamtopologies.com/"
    date: "2019-09-01"
  - title: "Documenting architecture decisions — Michael Nygard"
    url: "https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions"
    date: "2011-11-15"
---

# Framing NFRs, Product-Scale Architecture & Designing Across Team Boundaries

> **Outcome.** Write the NFRs before anyone designs, with numbers, so the design review argues
> about the numbers rather than about taste — the single highest-leverage thing a Lead does in
> a system design, because everything downstream of a vague NFR stays vague no matter how good
> the design that follows it is.

Everything in the Senior unit's method (Section 1 of that unit) is a skill an individual designer
applies to one system. This unit is about what changes when the same method has to work across
several teams, several years, and a design the Lead will not be the one implementing — the shift
from "design this well" to "make good design the path of least resistance for people who report
to someone else."

## 1. Framing NFRs before design starts

The Senior unit already established that NFRs need numbers, not adjectives. The Lead-band
addition is *when* those numbers get written and *who* they bind: before any design conversation
starts, and in a way that constrains every team touching the system, not just the one that wrote
them.

A design review that starts without agreed NFRs does not skip the disagreement the NFRs would
have settled — it just has that disagreement mid-review, framed as taste ("I don't think this
needs to be that fast") instead of as a number someone can push back on with a business
justification ("checkout abandonment increases measurably past 3s, per the data from the last
redesign"). The Lead's job is making sure the number, and the reasoning behind it, exists on
paper before the room is full of people with opinions.

```
NFR: p95 checkout completion latency under 3s on a mid-tier Android device on 4G

Reasoning: checkout-abandonment data from the Q2 redesign showed a measurable
step-function increase in abandonment past ~3.2s to first paint of the confirmation
screen. This number is not aspirational — it is the point past which the business
metric that funds this project measurably degrades.

Owner: mobile platform lead
Reviewed: quarterly against updated abandonment data
```

Framing an NFR this way — number, reasoning, owner, review cadence — turns "is this fast enough"
from a recurring argument into a settled fact that only gets reopened when the underlying data
changes, which is a small number of times a year rather than every design review.

## 2. Product-scale client architecture

A single feature's system design (the Senior unit) optimizes for that feature. Product-scale
architecture optimizes for the fact that dozens of features share the same client, the same
release train, and the same team's attention, and a design that's locally excellent for one
feature can be a tax on every other feature sharing the app.

The Lead-band questions that don't show up in a single feature's design:

- **Does this feature's data model conflict with another feature's assumption about the same
  entity?** Two teams independently deciding "this app's local store is the source of truth"
  for the same data, with different conflict-resolution rules, is a bug that surfaces as
  "sometimes my edits disappear" months after both features shipped independently and passed
  review.
- **Does this feature's background-execution need compete with another feature's for the same
  scarce OS budget?** `WorkManager` and `BGTaskScheduler` both operate under OS-imposed limits
  the platform, not any one feature, has to budget across every feature that wants background
  time — a Lead who doesn't own this budget explicitly gets it spent by whichever team asked
  first, not by whichever use is most valuable.
- **Does the module/dependency graph this feature needs conflict with the one domain 07 already
  committed to?** A feature designed in isolation that needs a dependency direction the existing
  module graph forbids is not a small implementation detail — it's an architectural exception
  that, made twice, becomes the new de facto rule.

Product-scale architecture is the discipline of catching these before a feature's Senior-level
design is approved, not after two features collide in production.

## 3. Designing across team boundaries

A system design that spans more than one team's ownership needs an explicit interface contract
between the teams, not just between the software components — the org boundary and the module
boundary should be drawn at the same seam, or the design will fight the org chart for as long as
it exists.

**The contract that has to be explicit, in writing, before implementation starts on either side:**

- **What each team owns**, stated at the API/protocol level from the Senior unit's method, not
  at the level of "the backend team handles the server stuff" — an ambiguous boundary is where
  a bug lives for months with neither team able to say whose it is.
- **What each team is allowed to change unilaterally**, versus what requires the other team's
  sign-off — a protocol version bump is usually the former up to a compatibility window, and a
  breaking change to that protocol is always the latter.
- **Who is paged when the seam breaks.** A design that spans two teams and has no answer for
  "whose on-call gets the alert when this specific integration fails" will get an answer anyway,
  by default, at 2am, decided by whoever's name happens to be on the repository.

A Lead designing across a team boundary is, in practice, writing the Senior unit's protocol
step as an interface contract two teams can independently build against and independently test —
the technical content doesn't change, but the audience does, and an ambiguity that a single team
would have resolved informally in a hallway conversation has to be resolved on paper here because
that hallway doesn't exist between two teams that don't sit near each other.

## 4. Designing for a system that outlives its implementation

Most of what a Lead designs will be implemented by people who did not write the design and will
be maintained by people who were not there for either the design or the implementation. The
design artifact itself, not the code, is what has to remain legible to that third group.

**What makes a design outlive the person who wrote it:**

- **The reasoning survives, not just the decision.** An ADR-shaped record (domain 14) attached
  to the system design — constraints, alternatives considered, reversibility, cost — is what
  lets someone two years from now tell whether a constraint that justified a decision still
  holds, rather than treating the decision as an unexplained given.
- **The NFRs are dated and owned**, per Section 1, so a future maintainer can tell whether
  "under 3s" is still the right number or a number that was right for a business context that
  has since changed, rather than an arbitrary constant nobody remembers the origin of.
- **The failure modes are documented as design, not discovered as incidents.** A system whose
  failure modes were only ever learned through production incidents has an unwritten design
  that lives in the heads of whoever was on-call for each incident — the moment those people
  move teams, the system's real behaviour under failure becomes tribal knowledge nobody can
  produce on demand.

> [!IMPORTANT]
> The test for whether a design outlives its implementation: hand the design document, with no
> access to its original author, to an engineer joining the team two years from now, and ask
> them to explain why the system is built the way it is, including what it does when a
> component fails. If the answer requires finding the original author, the design was never
> actually written down — only the code was.

## Pitfalls & trade-offs

- **Letting the design review's NFR argument happen live, in the room, instead of settling it on
  paper beforehand.** This is exactly the failure mode Section 1 exists to prevent — a Lead who
  shows up to a review with the NFRs still open has already lost the leverage this unit's outcome
  depends on.
- **Approving a feature's excellent local design without checking it against product-scale
  architecture.** A design that is correct in isolation and in conflict with another feature's
  assumption about shared state is a bug waiting for both features to ship, not a false alarm.
- **Drawing the team boundary at the org chart and leaving the technical interface implicit.**
  The two boundaries have to be drawn at the same seam explicitly, in writing, or the technical
  design silently inherits whatever ambiguity the org chart already had.
- **Treating "the code is the documentation" as sufficient for a system meant to outlive its
  implementation.** Code explains what the system does; it does not explain why, what it gives
  up, or what a maintainer should expect when a dependency fails — all three have to be written
  down somewhere the code itself cannot carry.
