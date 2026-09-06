---
id: planning-senior
title: "Sequenced Plans, Timeboxed Spikes & Range Estimates With Assumptions (Senior)"
description: Decomposing into a sequenced, parallelisable plan, de-risking spikes up front and timeboxed, estimating in ranges with assumptions written down, and dependency mapping including outside your team.
tags: [planning, estimation, risk, senior]
lang: en
status: complete
domain: 19-planning-estimation-and-risk
band: S
platform: shared
level: Senior
sidebar_position: 2
prerequisites: [planning-mid]
outcomes:
  - "Produce a plan where the riskiest unknown is resolved in week one, not week six"
resources:
  - title: "Critical path method and dependency scheduling"
    url: "https://www.pmi.org/learning/library/critical-path-method-schedule-network-analysis-1946"
    date: "2004-01-01"
  - title: "Cone of uncertainty — why estimates should be ranges"
    url: "https://www.construx.com/books/software-estimation-demystifying-the-black-art/"
    date: "2006-01-01"
  - title: "Riskiest assumption test — de-risking product bets early"
    url: "https://www.svpg.com/riskiest-assumption/"
    date: "2015-04-01"
  - title: "Spikes and timeboxing in agile planning"
    url: "https://www.agilealliance.org/glossary/spike/"
    date: "2020-01-01"
---

# Sequenced Plans, Timeboxed Spikes & Range Estimates With Assumptions

> **Outcome.** Produce a plan where the riskiest unknown is resolved in week one, not week six.
> The Mid unit's task breakdown flags which task is uncertain; this unit is about what to do with
> that uncertainty at the scale of a multi-week plan — sequence the plan so the biggest unknown
> gets answered while there's still time to change course, instead of discovering it's a problem
> in the week the feature was supposed to ship.

## 1. Decomposing into a sequenced, parallelisable plan

A task list is not a plan until it states which tasks can run at the same time and which ones
must wait on another finishing first — and a plan that doesn't distinguish the two either wastes
engineers sitting idle on a dependency, or worse, has them working in parallel on two things that
were secretly sequential, discovering the conflict only when both branches try to merge. Sequencing
is the difference between a task list and a schedule two engineers can actually execute against
without stepping on each other.

**A real feature broken into a dependency-ordered plan, with a de-risking spike called out first:**

```markdown
Feature: offline draft support for the compose screen — drafts save locally and
sync when connectivity returns, with conflict resolution if the same draft was
edited on two devices.

Week 1 — SPIKE (timeboxed, 3 days, one engineer):
  De-risk the one genuinely unknown piece before committing the team to a plan
  built on top of it: does the existing local-storage layer support the kind
  of partial-write recovery this feature needs, or does it need replacing?
  This is the one assumption the whole feature's schedule rests on, and it's
  answerable in 3 days of investigation rather than assumed.
  → Timeboxed explicitly: if not answered in 3 days, escalate rather than
    silently extend the spike — an open-ended spike is just an unplanned delay
    wearing a different name.

Week 2 (parallel, once the spike answers "storage layer is sufficient"):
  Track A (engineer 1): local draft persistence + save-on-backgrounding
  Track B (engineer 2): sync-on-reconnect logic against the existing network
    layer — genuinely independent of Track A because it consumes a
    local-drafts interface both engineers agreed on Monday, not the other
    track's actual implementation

Week 3 (sequential — cannot start until both Week 2 tracks land):
  Conflict resolution UI — depends on both local persistence (to know what
  changed locally) and sync (to know what changed remotely); starting this
  before either track lands means building against an interface that's still
  moving.

Week 4:
  Integration pass, manual test across the three network conditions from the
  Mid-band example, instrumentation.
```

The spike sits in week one specifically, not "whenever there's time" — it is the one thing
capable of invalidating everything scheduled after it, so it goes first, timeboxed, with an
explicit escalation trigger rather than being left to run indefinitely.

## 2. De-risking spikes up front, timeboxed

A spike that isn't timeboxed isn't a spike — it's an open-ended investigation that quietly becomes
the new plan the moment nobody notices it running past its intended length. The timebox is what
turns "let's look into this" into a decision point: either the spike answers the question within
the box, or it doesn't and that's itself information (the unknown is bigger than estimated, and
the plan needs to change now, in week one, rather than being discovered in week four).

```markdown
Spike charter, written before starting — not after:

Question: does the existing local-storage layer support partial-write
recovery, or does this feature need a replacement?
Timebox: 3 engineer-days.
Exit condition A (answered "yes"): proceed to Week 2 plan as scheduled.
Exit condition B (answered "no"): the feature needs a storage-layer
replacement first — replan before committing Week 2's parallel tracks,
because building sync and conflict-resolution logic on a storage layer
that's about to be replaced wastes both tracks' work.
Exit condition C (still unknown after 3 days): escalate to the tech lead
for a call — extend the spike a fixed, explicit amount with a new charter,
or make the call to proceed on the riskier assumption with a documented
fallback plan. Never silently extend.
```

The charter exists so that reaching day 3 without an answer is a planned decision point, not a
surprise that gets absorbed into the schedule without anyone above the spike's owner noticing.

## 3. Estimating in ranges with assumptions written down

A single-number estimate for anything past a few days is a false precision that invites the wrong
conversation — "why did it take 22 days when you said 18?" — when the honest answer was always
"somewhere between 15 and 25 depending on which of these three assumptions holds." A range with
the assumptions stated is not hedging; it's the same information as a single number, plus the part
of the information a single number throws away.

**A worked range estimate with assumptions, in the format actually handed to a stakeholder:**

```markdown
Feature: offline draft support (from Section 1)

Estimate: 15–22 engineer-days.

Assumptions this range depends on:
  - Low end (15 days) holds if the spike confirms the existing storage layer
    is sufficient (Week 1 exit condition A) AND no conflict-resolution edge
    case beyond last-write-wins is required by design.
  - High end (22 days) accounts for either the storage layer needing a
    targeted extension (not a full replacement — that would be a different,
    larger estimate entirely, out of scope for this range) or design
    requiring a manual merge UI instead of last-write-wins for conflicts.
  - This range assumes no other team's API changes are needed — see Section 4
    for what happens if that assumption is wrong.

This range will be updated the moment the Week 1 spike resolves, converting
from "15–22 depending on X" to a firm number depending on which side of X
the spike lands on. That update is expected and scheduled, not a sign the
estimate was wrong.
```

Writing down which specific assumption produces which end of the range is what makes the range
useful instead of just wide — a stakeholder who knows the range collapses to 15 days once the
spike lands can plan around that, where a bare "15–22 days, trust me" gives them nothing to track.

> [!IMPORTANT]
> A range with no stated assumptions is exactly as unhelpful as a false-precision single number —
> it just hedges instead of committing. The value of a range comes entirely from being able to say,
> once new information arrives, which side of it the plan now lands on and why.

## 4. Dependency mapping, including outside your team

The dependency most likely to blow up a plan is the one outside the team's own backlog — another
team's API, a design asset not yet delivered, a legal or privacy review, an app-store review
cycle — because those dependencies don't show up in the team's own sprint board and are easy to
discover only when the plan is already blocked on them.

```markdown
Dependency map for the offline-draft-support plan:

Internal (visible in this team's own backlog, low risk of surprise):
  - Local persistence, sync logic, conflict UI — all owned by this team.

External (invisible in this team's backlog — mapped explicitly, checked in
Week 1 alongside the spike, not discovered in Week 3):
  - The sync layer needs a new "last-modified-at" field from the backend
    API, owned by the platform team. Confirmed in Week 1: their next
    deploy window that could ship this field is in 10 days — inside this
    plan's Week 2, so it's on the critical path but not currently blocking.
  - Conflict-resolution UI copy needs a design review; design's queue was
    checked in Week 1 and has a 3-day turnaround at the point this task
    would need it in Week 3 — flagged as a soft dependency, not urgent yet,
    but tracked so it doesn't become a Week 3 surprise.

Both external dependencies are written down and dated in Week 1, at the same
time as the spike — not discovered when Week 2 or Week 3 arrives and the
team goes looking for the thing it assumed would already be there.
```

Mapping external dependencies in week one, alongside the spike, is the same underlying move as
Section 2's timeboxed spike: surface the thing capable of invalidating the plan while there's
still time to act on it, rather than while the plan is already running.

## Where this breaks

- **A schedule that doesn't distinguish parallel from sequential work.** Section 1 — engineers
  either sit idle waiting on a dependency that wasn't flagged, or work in parallel on branches
  that were secretly sequential and conflict at merge time.
- **A spike with no timebox or exit condition.** Section 2 — an open-ended "let's look into it"
  becomes the plan by default the moment nobody notices it's still running in week three.
- **A single-number estimate with the underlying assumptions left unstated.** Section 3 — the
  stakeholder has no way to tell, once new information arrives, which way the estimate should
  move, and the estimator gets blamed for imprecision that was true and knowable from the start.
- **Dependency mapping that only covers the team's own backlog.** Section 4 — the dependency that
  actually derails a plan is almost always the one owned by someone else, discovered only once the
  plan is already blocked on it.
