---
id: planning-mid
title: "Breaking Down Work, Estimating Honestly & Raising Slippage Early (Mid)"
description: Breaking a feature into tasks, estimating your own work honestly including the parts you dislike, and raising slippage the day it becomes likely rather than the day it is due.
tags: [planning, estimation, risk, mid]
lang: en
status: complete
domain: 19-planning-estimation-and-risk
band: M
platform: shared
level: Mid
sidebar_position: 1
prerequisites: [communication-mid, decisions-mid]
outcomes:
  - "Give an estimate you meet or miss for a reason you can name afterwards"
resources:
  - title: "PERT and the origins of three-point estimation"
    url: "https://www.pmi.org/learning/library/three-point-estimating-technique-7625"
    date: "2010-06-01"
  - title: "Software estimation: demystifying the black art — Steve McConnell"
    url: "https://www.construx.com/books/software-estimation-demystifying-the-black-art/"
    date: "2006-01-01"
  - title: "The planning fallacy — Kahneman & Tversky"
    url: "https://www.cambridge.org/core/books/abs/choices-values-and-frames/timid-choices-and-bold-forecasts-a-cognitive-perspective-on-risk-taking/"
    date: "1979-01-01"
  - title: "Bad news early — a habit, not a confession"
    url: "https://www.intercom.com/blog/report-status-early/"
    date: "2021-03-01"
---

# Breaking Down Work, Estimating Honestly & Raising Slippage Early

> **Outcome.** Give an estimate you meet or miss for a reason you can name afterwards. This is
> the entire skill at Mid band: not being right every time — nobody is — but being able to say,
> after the fact, exactly which assumption held and which one didn't. An estimate that's wrong for
> reasons you can't name is luck either way; an estimate that's wrong for a reason you can name is
> data that makes the next one better.

## 1. Breaking a feature into tasks

A feature described in one sentence hides everything an estimate actually depends on. "Add a
retry button to the failed-upload state" sounds like one task; it is at minimum a UI change, a
state-machine change, a networking change, and a decision about what happens if the retry also
fails — four different pieces of work with four different risk profiles, and lumping them into
one line item is how a single bad guess about the hardest piece contaminates the whole estimate.
Breaking work down isn't busywork done to satisfy a process — it's the only way to find out which
part of the feature is actually the hard part before committing to a date for all of it.

**A vague feature, decomposed into a real task list with estimates:**

```markdown
Ticket: "Add a retry button to the failed-upload state in the photo backup screen."

Broken down:

1. Add `Failed` sub-state with a retry affordance to the upload state machine
   — 0.5 day (the state machine already has a `Failed` state; this is adding a
   UI-visible action to it, not inventing a new state)
2. Wire the retry button to re-invoke the existing `uploadPhoto()` call
   — 0.5 day (straightforward — the upload function already exists and is
   already called elsewhere the same way)
3. Handle repeated failure (retry fails again) — show a distinct message after
   the 2nd consecutive failure rather than looping silently — 1 day (this is
   the part that actually has design decisions in it: what message, does it
   count failures per-session or persist across app restarts, is there a cap)
4. Instrumentation: log retry-attempted and retry-succeeded events so support
   can see whether this reduces the ticket volume it's meant to reduce — 0.5 day
5. Manual test pass across three network conditions (offline, flaky, recovering
   mid-retry) — 0.5 day

Total: 3 days. Task 3 is flagged as the one most likely to slip, because it's
the only task whose scope depends on an answer from Product that doesn't exist
yet ("what should the message say, and does the counter reset on app restart?").
Tasks 1, 2, 4, 5 are flagged low-risk because they reuse existing, already-tested
mechanisms.
```

The estimate isn't just a number — it's a list of where the number could be wrong, and by how
much. A single "3 days" with no breakdown gives a stakeholder nothing to ask about; a breakdown
gives them exactly one question worth asking ("what's the answer on task 3?") instead of a vague
"are you sure?"

## 2. Estimating your own work honestly, including the parts you dislike

The task most likely to be underestimated is the one the estimator doesn't want to do — the
tedious edge-case handling, the manual test pass across device configurations, the cleanup of a
half-finished thing from last sprint. This isn't a moral failing; it's a predictable bias, because
attention lingers on the interesting 80% of a task and glosses over the boring 20%, and the
boring 20% is disproportionately where the actual time goes. Naming that bias out loud, task by
task, is what an honest estimate looks like in practice — not a generically padded number, but a
specific note on the specific task most at risk of the estimator's own avoidance.

```markdown
Self-check before submitting the estimate above:

"Task 3 — the repeated-failure messaging — is the task I'd naturally want to
wave through as '1 day, easy' because writing an error-state string feels like
the least interesting part of this ticket. Checking myself: the actual
uncertainty here isn't the string, it's whether the failure counter needs to
survive an app restart, which changes whether this touches persistent storage
or just in-memory state — and I don't know that answer yet. That's not a
1-day estimate with an asterisk; it's an estimate that depends on an answer I
need before I start, and I should say so rather than guess and hope."

Revised: task 3 becomes "1 day if the counter is in-memory only; add 0.5 day
if it needs to persist across restarts — question sent to Product, answer
needed before this task starts."
```

The dishonesty this section is guarding against isn't lying about the number — it's quietly
rounding down the part of the work that's tedious or uncertain because looking directly at it is
unpleasant, and then being surprised later when that exact part is what slipped.

## 3. Raising slippage the day it becomes likely, not the day it is due

The single highest-leverage habit in this domain is the timing of one message: the moment it
becomes *likely* a deadline will slip, not the moment it *has* slipped. The information available
on day 3 of a 5-day task ("task 3's answer came back, and it needs the persistent-storage path,
which is 1.5 days more than budgeted") is exactly as true on day 5, the due date — the only thing
that changes between those two days is how many options everyone else still has. Raised on day 3,
a PM can quietly move something else out of the sprint. Raised on day 5, the PM finds out in a
standup that a commitment already made to someone else is now broken.

**The actual message sent the day slippage became likely — not on the due date:**

```markdown
To: [PM], sent Tuesday (task due Friday)

Subject: Heads up — retry-button ticket is going to run about 1.5 days over

Quick flag while there's still time to do something about it: the
repeated-failure messaging (task 3) needs the failure counter to persist
across app restarts — support confirmed users close and reopen the app
mid-retry loop often enough that an in-memory-only counter would under-count
badly. That's persistent storage I hadn't budgeted for, so this task is
~1.5 days more than planned.

New total: Friday's original 3-day estimate becomes ~4.5 days, landing
Monday instead.

Three days is still enough runway to do something about it if Friday
matters more than I know — I can ship without persistence and note it as a
known gap for a fast-follow, or we can just take Monday. I don't have a
strong preference; flagging now so it's your call while there's still a
choice, not Friday afternoon.
```

Notice what the message is not: it isn't an apology, and it isn't a vague "might be a bit
delayed." It states the specific new fact, the specific new number, and offers the specific
options that are only options because it was raised with three days of runway left instead of
zero.

> [!IMPORTANT]
> "The day it becomes likely" is doing real work in that sentence — it does not mean "the day you
> are certain." Waiting for certainty is how a signal that was visible on Tuesday gets held until
> Friday, at which point every option that depended on advance notice has already expired. Flag it
> as a probability with a number attached ("about 1.5 days, could be less"), not as a hedge that
> waits to become a fact.

## Where this breaks

- **Estimating a feature as one line instead of a task list.** Section 1 — a single number has
  nowhere to attach a question; a breakdown lets a stakeholder ask about the one task that's
  actually uncertain instead of the whole estimate.
- **Quietly rounding down the task you'd rather not do.** Section 2 — the boring 20% of a ticket
  is disproportionately where the time goes, precisely because it's the part attention skips over
  when the estimate is being made.
- **Waiting for the due date, or for certainty, before saying something might slip.** Section 3 —
  the same fact is true three days earlier and costs nothing to say then; said on the due date, it
  has already taken away everyone else's options.
