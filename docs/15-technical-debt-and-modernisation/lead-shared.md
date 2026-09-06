---
id: tech-debt-lead
title: Debt as a Portfolio, Funded and Defended (Lead)
description: Treating debt as a portfolio with quantified impact, funding an allocation per cycle and defending it under pressure, the risk assessment matrix for review and merge decisions, and refusing a rewrite that cannot be sequenced.
tags: [technical-debt, engineering-economics, code-review, lead]
lang: en
status: complete
domain: 15-technical-debt-and-modernisation
band: L
platform: shared
level: Lead
sidebar_position: 3
prerequisites: [tech-debt-senior]
outcomes:
  - "Present the inventory to a non-engineer with impact in their units — build minutes, crash rate, velocity — and get the allocation funded"
resources:
  - title: "Technical debt quadrant — Martin Fowler"
    url: "https://martinfowler.com/bliki/TechnicalDebtQuadrant.html"
    date: "2019-05-21"
  - title: "Managing technical debt as a portfolio — ACM Queue"
    url: "https://queue.acm.org/detail.cfm?id=2168832"
    date: "2012-01-11"
  - title: "The rewrite trap — Joel Spolsky, 'Things You Should Never Do'"
    url: "https://www.joelonsoftware.com/2000/04/06/things-you-should-never-do-part-i/"
    date: "2000-04-06"
---

# Debt as a Portfolio, Funded and Defended

> **Outcome.** Present the inventory to a non-engineer with impact in their units — build
> minutes, crash rate, velocity — and get the allocation funded. An inventory nobody funds is a
> spreadsheet; the outcome this unit asks for is the one where it survives contact with a
> roadmap review.

## 1. Debt as a portfolio: inventory with quantified impact

A Mid-band debt ticket (previous unit) names one item precisely enough for a stranger to act on
it. At Lead band, the unit of work is not one ticket — it's the **inventory of all of them**,
treated as a portfolio with a quantified cost each, because a list of tickets with no relative
weight gets prioritized by whoever argues loudest in the planning meeting, not by actual impact.

```markdown
## Technical debt inventory — Q3 2025 (Mobile Platform)

| Item | Cost to leave (quantified) | Cost to fix | Confidence |
| :--- | :--- | :--- | :--- |
| Checkout module still on legacy DI container | +40s to clean build, every build,
  team of 12 → ~8 eng-hours/week lost to build waits | 3 eng-weeks | High |
| `UserRepository` cache bypass (see Mid-unit ticket) | 2-3 support tickets/month,
  ~1 eng-day/month triage cost | 1 eng-day | High |
| No automated migration test for the Room schema | Unquantified until it fails —
  last schema break cost 2 eng-days of incident response | 4 eng-days | Medium |
| Three analytics SDKs with overlapping event schemas | +1.8MB APK size, unclear
  attribution ownership | 2 eng-weeks (consolidate to one) | Medium |
```

The **confidence** column is doing real work most debt inventories skip: an unquantified "this
will definitely bite us" item competing against a measured "+8 eng-hours/week" item needs to be
visibly less certain, not dressed up as equally rigorous. Presenting both with the same
confidence is how a portfolio loses credibility the first time someone checks the math on one
row.

## 2. Funding an allocation per cycle and defending it when the quarter gets tight

An inventory earns nothing on its own; it has to convert into a standing allocation — a
percentage of the cycle's capacity reserved for debt work, decided before the cycle's feature
list is finalized, not negotiated fresh (and lost) every single planning cycle.

```markdown
## Debt allocation — standing agreement, Mobile Platform team

- 15% of each cycle's engineering capacity is reserved for the top 3 items on the
  quantified inventory, re-ranked at the start of each cycle.
- This is not "whatever's left after features" — it is scheduled first, alongside
  features, in the same planning meeting.
- Exception process: the allocation can be spent down to 5% for one cycle, with the
  Lead's sign-off, if a launch-critical deadline requires it — and must return to 15%
  the following cycle, not silently stay lowered.
```

The defense that actually matters happens when a quarter gets tight and someone proposes
cutting the allocation to zero "just this once." The Lead's job is arguing the cost side of the
inventory, in the same units product and leadership already use for prioritization — which is
exactly what Section 3 of the Senior-band decision-rights unit calls cost of delay, applied here
to debt specifically: what does *not* spending the allocation this cycle cost, measured the same
way a missed feature's cost of delay would be?

```markdown
## Defending the allocation — Q3 planning

Proposal on the table: drop debt allocation to 0% this cycle to fit the checkout
redesign into the timeline.

Response: the checkout redesign itself depends on the DI-container item currently in
the inventory (row 1 above) — building the redesign on the legacy container adds an
estimated 2 eng-weeks of friction directly to the redesign's own timeline. Cutting the
allocation to fund the redesign faster does not net out faster; it moves the cost from
"tracked, planned debt work" to "untracked friction inside the redesign," which is
worse, not free.

Outcome: allocation held at 15%, redesign timeline adjusted by the 3 eng-weeks the
inventory already estimated for that item.
```

## 3. The risk assessment matrix for review and merge decisions

Not every debt item is created during a slow refactor — some debt gets discovered mid-review,
under release-deadline pressure, and the decision at that moment is not "fix it or don't," it's
**"does this block the merge, or does it get tracked and merged anyway."** A risk matrix decided
in advance, rather than argued fresh on every PR, is what keeps that call consistent across
reviewers and across deadlines.

```
                              ┌────────────────────────┐
                              │  Code review triggers   │
                              │  a debt/risk question   │
                              └───────────┬────────────┘
                                          │
                                    Risk assessment
                                          │
                   ┌──────────────────────┴──────────────────────┐
                   ▼                                             ▼
          High-risk violation                           Safe/minor violation
   (memory leak, crash, security flaw,                (naming convention, a
    ANR risk, data-handling issue)                   sub-optimal module placement
                   │                                  with no runtime impact)
                   ▼                                             ▼
        Block merge, pair-refactor now              Approve, file a debt ticket
        (per the Mid unit's ticket format)          (per the Mid unit's ticket format)
```

```markdown
## Risk assessment matrix — merge-time debt decisions

**Block merge — fix before merging, pair on it now:**
- Memory leaks, main-thread I/O in a hot path, any security flaw (see domain 10's
  Senior-band review checklist for the specific classes of finding)
- ANR risk introduced or worsened by this change
- Anything that would silently corrupt or lose user data

**Merge and track — approve now, ticket the debt (does not block a release):**
- Naming convention deviations
- A module placement that is sub-optimal but does not create a dependency-rule
  violation or cross a layer boundary the architecture forbids
- A test gap on a low-traffic path, tracked with an owner and a target cycle

**The judgment call this matrix does not remove:** classifying which bucket a specific
finding belongs in still takes engineering judgment — the matrix's job is making sure
that judgment is applied against a written standard, not decided fresh, under deadline
pressure, by whichever reviewer happens to be assigned that day.
```

The matrix is what turns "block merge" from a subjective reviewer preference into a defensible,
consistent standard — and turns "merge and track" from "the reviewer let it slide" into a
tracked commitment with the same accountability as any other debt-inventory item from Section 1.

> [!NOTE]
> This matrix is also the one place domain 15 and domain 17 (code review & mentoring)
> deliberately overlap: this unit treats it as a debt-classification tool; the review-culture
> question of *how* to deliver a block-merge verdict without it reading as a personal judgment
> belongs to domain 17's own material.

## 4. Refusing a rewrite that cannot be sequenced

The strangler-pattern migration in the Senior unit works because it can be sequenced into
independently shippable steps. Some proposed rewrites cannot be — and a Lead's job includes
being the person who says no to one, even when the case for "this codebase is unsalvageable"
sounds compelling in the room.

```markdown
## Rewrite proposal review — "rewrite the sync engine from scratch"

Proposed: full rewrite, estimated 1 quarter, current sync engine described as
"unmaintainable."

Sequencing check:
- Can this ship in independently valuable, revertable steps, the way the Senior unit's
  strangler migration does? — No: the proposal requires cutting over the entire sync
  protocol atomically because the new and old engines cannot run against the same data
  format simultaneously.
- Is there a version of this that CAN be sequenced? — Partially: the conflict-resolution
  logic (the actual pain point cited) can be extracted and swapped behind a flag without
  touching the transport layer. The full-rewrite framing bundled an isolable problem
  with a much larger, unnecessary one.

Decision: reject the full-rewrite proposal as scoped. Approve a sequenced version:
extract and replace conflict resolution first (3 weeks, revertable), reassess whether
the transport layer still needs replacing once that's shipped and measured.
```

The refusal is not "rewrites are always wrong" — it's that a rewrite proposed as one unsequenced,
unrevertable quarter-long bet carries exactly the big-bang risk the Senior unit's strangler
pattern exists to avoid, and a Lead who approves it without asking for a sequenced alternative is
signing up the team for the same failure mode at a larger scale and a higher cost of being wrong.

## Pitfalls & trade-offs

- **An inventory with no quantified cost, or false-confidence numbers.** Both destroy the same
  thing: the inventory's credibility the first time someone checks a row against reality.
- **A debt allocation that gets negotiated away every single cycle.** If it isn't a standing
  agreement decided before the cycle's feature list, it isn't an allocation, it's a wish.
- **A risk matrix applied inconsistently by whoever happens to be reviewing.** The matrix's
  entire value is a consistent standard; a reviewer who blocks one PR for a finding and waves
  through an identical finding on another has made the written matrix decorative.
- **Approving a rewrite because "the current code is bad enough to justify it."** Bad code
  justifies fixing; it does not by itself justify an unsequenced, unrevertable rewrite — the
  sequencing question in Section 4 has to be asked and answered before the badness argument
  is allowed to carry the decision.
- **Treating the risk matrix (Section 3) as the whole of domain 17's territory.** It classifies
  debt at merge time; it is not the review-culture and mentoring material that domain 17 covers
  in its own right.
