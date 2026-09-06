---
id: code-review-senior
title: Reviewing for Design and Risk, Deliberate Mentoring & Blocking a PR Under Deadline (Senior)
description: Reviewing for design and risk rather than formatting, deliberate mentoring through goals/feedback/sponsorship, raising the baseline with good examples, and handling an architectural violation under deadline pressure.
tags: [code-review, mentoring, architecture, senior]
lang: en
status: complete
domain: 17-code-review-and-mentoring
band: S
platform: shared
level: Senior
sidebar_position: 2
prerequisites: [code-review-mid]
outcomes:
  - "Block a PR for a design reason and get agreement, without the author feeling overruled"
resources:
  - title: "What to look for in a code review — Google eng practices"
    url: "https://google.github.io/eng-practices/review/reviewer/looking-for.html"
    date: "2024-01-01"
  - title: "Radical Candor — Kim Scott"
    url: "https://www.radicalcandor.com/"
    date: "2019-01-01"
  - title: "Sponsorship vs. mentorship — HBR"
    url: "https://hbr.org/2019/08/6-causes-of-gender-bias-at-work-and-how-to-interrupt-them"
    date: "2019-08-01"
  - title: "The Managers Path — Camille Fournier (ch. on giving feedback)"
    url: "https://www.oreilly.com/library/view/the-managers-path/9781491973882/"
    date: "2017-03-01"
---

# Reviewing for Design and Risk, Deliberate Mentoring & Blocking a PR Under Deadline

> **Outcome.** Block a PR for a design reason and get agreement, without the author feeling
> overruled — the Senior-band review skill that the Mid unit's what/why/what-instead comment
> shape was building toward: a block-merge verdict is the highest-stakes single comment a
> reviewer writes, and it's the one most likely to land as a personal judgment if the delivery
> is wrong even when the finding is right.

## 1. Reviewing for design and risk rather than formatting

A review that catches every formatting nit and misses a load-bearing design problem has reviewed
the cheapest 10% of what matters — a linter catches formatting for free; a Senior reviewer's time
is worth spending on the things a linter cannot see: does this boundary hold under the next three
features that will be built on it, does this failure mode get handled or silently swallowed, does
this change make the next similar change easier or harder.

**A review pass ordered by what a linter can't catch, cheapest-signal-first:**

```markdown
1. Does this violate an architectural boundary the codebase otherwise holds? (domain 07 —
   a framework type leaking into domain code, a ViewModel reaching past its repository)
2. Does a failure path exist and get handled, or does it fail silently / crash / retry
   forever? (a caught exception with an empty catch block is a red flag every time)
3. Is this the kind of change that gets easier or harder to make again the same way?
   A one-off special case is a different risk than a pattern that will be copied.
4. Only then: naming, formatting, style — and only where no linter/formatter already
   covers it, per the Mid unit's "merge and track" bucket for anything cosmetic.
```

Reviewing in this order isn't just a time-management trick — a reviewer who starts with
formatting anchors on it, and by the time they reach the architectural question they've spent
their attention budget and the design issue gets a softer pass than it deserves, purely because
of where it appeared in the diff.

## 2. Deliberate mentoring: goals, feedback, sponsorship

Mentoring that happens only as a byproduct of code review is real but incomplete — it reacts to
whatever showed up in this week's diffs, not to where the person is actually trying to go.
Deliberate mentoring adds three things a passive review relationship doesn't: a stated goal, a
feedback loop against that goal specifically, and sponsorship — advocating for the person in
rooms they aren't in.

**Worked example — a mentoring conversation, structured, not just "how's it going":**

```markdown
## Mentoring check-in — Priya, Q3

**Goal (stated by Priya, refined together):** lead the design for a feature end-to-end,
not just implement one — she's implemented several well-scoped features but hasn't yet
owned the "what should this look like" decision on anything.

**Feedback since last check-in, against that specific goal:**
"The offline-sync feature you designed last month — the retry-backoff choice was
exactly right, and you flagged the edge case with concurrent edits before anyone
else caught it in review. The part that's still growing: the design doc didn't name
why you rejected the simpler polling approach, so two reviewers re-litigated an
option you'd already ruled out. Next design doc, put the rejected alternatives in
explicitly — domain 16 Senior's format is worth copying directly."

**Sponsorship (not feedback — action taken on her behalf):**
Recommended Priya, not myself, to lead the design review for the Q4 notifications
redesign in the roadmap planning meeting she wasn't in. Told the room specifically
why: the sync-feature retry design she shipped is the closest analog we have to the
risk profile of the notifications work.
```

The sponsorship line is the piece a passive mentoring relationship never produces — feedback can
happen entirely in conversations the mentee is part of, but sponsorship by definition happens in
a room they're not in, and it's the part that actually changes what opportunities come their way.

> [!IMPORTANT]
> Feedback tied to a stated goal is retained differently than feedback that lands as a general
> observation. "Your design docs should name rejected alternatives" is advice; "you're trying to
> own end-to-end design decisions, and the gap between where you are and that goal is naming
> rejected alternatives" is a specific, actionable step toward something the person already said
> they wanted.

## 3. Raising the baseline by leaving good examples in the codebase

The highest-leverage form of mentoring at this level often isn't a conversation at all — it's the
code itself. A well-designed module, once merged, becomes the thing the next five PRs copy from,
whether or not anyone ever explains why it's structured the way it is; a reviewer who consistently
points authors toward one specific existing example ("look at how `SyncRepository` handles this
same retry/backoff shape") is raising the baseline faster than any number of comments describing
the principle in the abstract.

```markdown
Instead of: "We should have consistent error handling across repositories."

Try: "`SyncRepository.fetchWithRetry()` (in this same module) has the retry/backoff/
give-up shape we want here — could you match that instead of the ad-hoc `try/catch`
loop this PR introduces? Happy to walk through why it's structured that way if useful."
```

Pointing at a real, merged example does two things a principle stated in prose doesn't: it's
concrete enough to copy exactly, and it implicitly tells the author the pattern is already
established and trusted, not a new opinion being introduced in this review.

## 4. Handling an architectural violation under deadline pressure — the risk matrix applied

Domain 15's Lead unit already carries the classification tool for this — the risk-assessment
matrix that sorts a merge-time finding into **block merge** (memory leaks, main-thread I/O,
security flaws, ANR risk, data corruption) or **merge and track** (naming, sub-optimal module
placement with no runtime impact), filed there as
[`tech-debt-lead`](../15-technical-debt-and-modernisation/lead-shared.md) (see its "risk
assessment matrix" section).
That article is explicit that the matrix's own job stops at classification — the different
question that belongs here is **how to deliver a block-merge verdict under deadline pressure**
without the author feeling overruled, which is a conversation problem, not a classification one.

**Worked example — the actual review comment, then the follow-up conversation:**

The finding: a PR due to ship before a Friday release deadline introduces a repository method
that does synchronous file I/O directly on the main thread — squarely in the matrix's "block
merge" bucket (ANR risk).

**The review comment — states the classification and the reasoning, not just the verdict:**

```markdown
This reads as main-thread file I/O in `CacheRepository.readSnapshot()` — that's an ANR
risk under the classification we use for merge-time findings (domain 15's risk matrix),
not a style preference, which is why I'm blocking rather than filing a ticket.

Specifically: `File(path).readText()` on line 42 runs on the caller's dispatcher, and
`ViewModel.init` calls this synchronously — on a slow device or a large cache file,
this can hang the UI thread long enough to ANR.

What instead: wrapping this call in `withContext(Dispatchers.IO)` is a ~10-minute
change and doesn't touch the method's public signature. Want to pair on it now so this
still makes today's cutoff?
```

**The follow-up conversation — when the author pushes back on the deadline:**

> **Author:** We're already cutting it close for Friday — can this go in as a tracked
> follow-up instead, like the naming stuff on this same PR?
>
> **Reviewer:** I get the deadline pressure — and the naming stuff is exactly the kind of
> thing that's fine to track and fix later, that's a real distinction, not me being
> stricter across the board. This one's different because it's a live ANR risk, not a
> convention gap — if it ships and a user hits it, that's a crash report and a hotfix
> under worse time pressure than we're under right now. I timed the fix at about ten
> minutes with the `withContext` wrap — can we do that together right now instead of
> shipping the risk and hoping it doesn't fire before we can patch it?
>
> **Author:** Okay — if it's really ten minutes, let's just do it.

The comment and the conversation both do the same specific thing: they attach the verdict to a
written, pre-agreed standard ("domain 15's risk matrix," not "my judgment today"), separate this
finding from the ones on the same PR that genuinely are fine to defer, and pair the "no" with a
concrete, time-bounded "yes, and here's how fast." An author who hears "this is against the
standard we already agreed on, and the fix is ten minutes, let's do it together" has been given a
path forward, not just overruled — which is the entire difference between a block-merge verdict
that gets agreement and one that gets resentment.

> [!WARNING]
> The version of this that reads as arbitrary: blocking one PR for a main-thread I/O violation
> and waving another one through under a tighter deadline, with no visible reason for the
> difference. Citing the same written matrix every time — even when the answer is "yes, this one
> is actually fine to defer" — is what makes the exception legible instead of arbitrary.

## Where this breaks

- **A review pass that starts with formatting and runs out of attention before reaching the
  architectural question.** See Section 1 — the fix is ordering the pass by what a linter
  cannot catch, not by what appears first in the diff.
- **Mentoring that only reacts to whatever showed up in this week's diffs.** Feedback with no
  stated goal behind it is advice; the same feedback tied to a goal the mentee stated is a step
  toward something they're already trying to reach — and sponsorship, by definition, never
  happens if it's left to be a byproduct of code review alone.
- **A block-merge verdict delivered as a personal judgment ("I don't like this") instead of
  against the written risk matrix.** The author has nothing to agree with except the reviewer's
  authority, which is exactly the ingredient that produces "overruled" instead of "convinced."
- **Blocking without a paired next step.** A "no" with no time-bounded "here's how fast the fix
  is" reads as blocking the deadline itself, not the specific risk — see the worked conversation
  above.
