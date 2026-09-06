---
id: code-review-lead
title: Growing Seniors and Leads, Review Culture & Delegating the Interesting Work (Lead)
description: Growing seniors and future leads, setting review standards and culture, calibrating against a written ladder, and delegating the interesting work instead of keeping it.
tags: [code-review, mentoring, leadership, lead]
lang: en
status: complete
domain: 17-code-review-and-mentoring
band: L
platform: shared
level: Lead
sidebar_position: 3
prerequisites: [code-review-senior]
outcomes:
  - "Hand a senior engineer a problem you wanted to solve yourself, and let them solve it differently"
resources:
  - title: "Engineering ladders — public examples (Rent the Runway, Medium, et al.)"
    url: "https://github.com/jorgef/engineeringladders"
    date: "2023-01-01"
  - title: "Multipliers — Liz Wiseman"
    url: "https://thewisemangroup.com/books/multipliers/"
    date: "2017-06-01"
  - title: "The Managers Path — Camille Fournier (ch. on growing senior engineers)"
    url: "https://www.oreilly.com/library/view/the-managers-path/9781491973882/"
    date: "2017-03-01"
  - title: "Google engineering practices — review culture"
    url: "https://google.github.io/eng-practices/review/"
    date: "2024-01-01"
---

# Growing Seniors and Leads, Review Culture & Delegating the Interesting Work

> **Outcome.** Hand a senior engineer a problem you wanted to solve yourself, and let them solve
> it differently — the Lead-band test of everything below it in this domain: mentoring mid-level
> engineers is teaching skills they don't have yet; growing a senior into a lead is stepping back
> from a problem you're fully capable of solving, on purpose, so someone else gets to.

## 1. Growing seniors and future leads, different from mentoring mid-level engineers

Mentoring a Mid engineer is mostly about closing skill gaps — the what/why/what-instead comment
shape, the design-vs-formatting review pass, the deliberate goals-and-feedback loop from the
Senior unit all assume the mentee doesn't yet have some specific capability the mentor does.
Growing a Senior into someone who could lead is a different problem: the skill gap is often
already closed, and what's missing is *scope* and *judgment under ambiguity* — things that can
only be built by actually being handed the ambiguity, not by being taught about it.

**The concrete difference, in what gets handed over:**

```markdown
Mentoring a Mid engineer: "Here's the pattern for retry/backoff — use this shape,
here's why, here's the existing example to copy" (Section 3 of the Senior unit).

Growing a Senior toward Lead: "The notifications redesign needs a technical
direction — I have opinions, but I'm not going to hand you my design. Come back with
your own recommendation and the trade-offs you considered; I'll review it the way a
peer would, not the way I'd review a Mid engineer's first attempt at the pattern."
```

The second interaction only works if the Senior is actually trusted to arrive at a *different*
answer than the Lead would have — a "growth" conversation that's secretly grading them against
the Lead's own predetermined answer isn't growth, it's mentorship with worse feedback, because the
Senior can tell the real bar is "did you guess what I was thinking" rather than "is this a sound
recommendation."

## 2. Review standards and culture

A team's review culture is whatever actually happens on the fifth PR of an ordinary Tuesday, not
whatever's written in the onboarding doc — and a Lead's job is making the two match closely enough
that the written standard is worth trusting. That means writing down what "good" looks like at
each level, and reviewing to it consistently enough that a new hire's first ten PRs teach them the
real standard, not a mix of whoever happened to review that week.

**Worked example — a short review-culture/standards document:**

```markdown
# Code review standards — Mobile Platform team

## What every review checks, regardless of who's reviewing
1. Architectural boundaries hold (domain 07) — this blocks merge, no exceptions for
   deadline pressure without an explicit, logged Lead sign-off (see domain 15's risk
   matrix for the full block-merge/merge-and-track split).
2. A failure path exists and is handled, not silently swallowed.
3. The PR description answers what/why/how/risk (domain 16 Mid) — a PR missing this
   gets a request-changes for the description alone, before anyone reviews the diff.

## What "good" looks like, gated to seniority — not everyone reviews the same way
- **Mid reviewers:** expected to catch bugs and correctness issues; not expected to
  independently catch every architectural violation — flag it to a Senior/Lead
  reviewer if something looks architecturally off but you're not sure.
- **Senior reviewers:** expected to review for design and risk (this domain's Senior
  unit, Section 1) — the primary line of defense on architectural boundaries.
- **Leads:** expected to review review culture itself — spot-check a sample of merged
  PRs monthly for whether the standards above were actually applied, not just stated.

## What this standard explicitly does not require
- A specific formatting style beyond what the linter enforces — this is a "merge and
  track" matter (domain 15), never a reason to block.
- Unanimous agreement before merging — one approving review from the right seniority
  level for the change's risk is sufficient; requiring more just slows delivery
  without a matching increase in defect-catch rate.
```

The "gated to seniority" section is what keeps this from becoming a document nobody can meet — a
standard that expects a Mid engineer to independently catch every architectural violation sets
them up to either miss things silently or grow anxious about reviews they're not yet equipped to
do alone; naming the actual expectation per level removes that ambiguity.

## 3. Calibrating against a written ladder

Review and mentoring judgments drift without a shared reference — one Lead's bar for "ready for
Senior" and another's can diverge quietly over a year, and the person caught in the middle is
whoever's promotion case depends on whichever Lead happens to be writing it. Calibrating against
a written ladder means checking a specific case against the ladder's language together, out loud,
before either Lead forms a private opinion that then has to be walked back.

**Worked calibration example — two Leads discussing the same engineer's promotion readiness:**

```markdown
## Calibration: is Devon ready for Senior? (checked against the written ladder)

Ladder language for Senior (this team's written ladder, §2): "Owns a project end to
end, including catching problems in their own design before they ship. Reviews others'
code for design and risk, not just correctness."

**Evidence for:** Devon's sync-conflict redesign shipped with no post-release
incidents, and Devon caught the concurrent-edit edge case in their own design review
before anyone else raised it (matches "catching problems in their own design").

**Evidence against, or not yet demonstrated:** Devon hasn't yet reviewed anyone else's
PR for a design-level concern — every review so far has been correctness-level
comments (the ladder explicitly names this as part of "Senior," not optional).

**Calibrated read:** not yet — one dimension of the ladder's Senior bar (reviewing
for design and risk) has no evidence either way. Action: assign Devon as primary
reviewer on the next two design-adjacent PRs, revisit in 6 weeks with that evidence
either way, rather than guessing now.
```

Anchoring the conversation to the ladder's actual wording, and stating explicitly what's
undemonstrated rather than assumed-absent, is what keeps two Leads from quietly calibrating to two
different bars — the alternative, "I just think they're ready" or "I just don't feel it yet," is
exactly the version that produces inconsistent promotion outcomes across the same team.

## 4. Delegating the interesting work instead of keeping it

The instinct that's hardest to unlearn at this level is reaching for the interesting problem
yourself, because you can solve it faster and with less risk than handing it off — and every time
that instinct wins, a senior engineer who was ready for the scope doesn't get the chance to prove
it, and the Lead stays the bottleneck on every hard problem instead of building someone who can
share that load.

**Worked delegation scenario/script:**

```markdown
Context: the offline-sync conflict-resolution rewrite is the most technically
interesting problem on the roadmap this quarter, and the Lead has a clear idea of how
they'd architect it. Priya (Senior, per the Section 2 worked example in the Senior
unit of this domain) has been asking for more end-to-end design ownership.

## What NOT to do
Hand Priya a spec that's already the Lead's design with the interesting decisions
already made, disguised as delegation — "design this" while having already decided
the answer teaches Priya nothing except how to reverse-engineer the Lead's opinion,
and it isn't actually delegation.

## The actual delegation conversation
"I want you to own the technical direction for the conflict-resolution rewrite,
including the parts I'd normally want to design myself — this is deliberate, not me
being hands-off because I'm busy. Bring me a recommendation with the trade-offs you
considered; I'll review it as a peer review, the way I'd review another Lead's design,
not as a check on your work. If your answer is different from what I'd have done, that's
fine — the goal isn't matching my design, it's a sound one. I'll only step back in if
something is genuinely going to break, not because it diverges from what I pictured."

## What actually happened
Priya's design resolved conflicts with a CRDT-based approach; the Lead had been
assuming a simpler last-write-wins-with-manual-resolution model. Priya's version
handled the concurrent-edit case identified in the earlier mentoring check-in more
completely than the Lead's own approach would have — a different answer, not a worse
one, which is exactly what a delegation that actually transferred ownership should
produce some of the time.
```

The test for whether this was real delegation and not delegation-in-name-only: the Lead's own
first-choice design did not win by default, and the Lead's review of Priya's actual design engaged
with her reasoning rather than measuring the distance from what the Lead would have built.

> [!IMPORTANT]
> The hardest part of this isn't the handoff conversation — it's the review that follows it. A
> Lead who says "own this" and then reviews the result the way they'd review a Mid engineer's
> first attempt at a known pattern (checking it against their own predetermined answer) has taken
> back the delegation they claimed to give, just one review cycle later.

## Where this breaks

- **Treating a Senior's growth conversation as mentorship with a higher skill ceiling.** The
  Section 1 distinction is real: closing a skill gap and building judgment under ambiguity are
  different jobs, and a "growth" conversation secretly graded against the Lead's own answer
  teaches "guess what I think," not judgment.
- **A review-culture document that states one bar for every seniority level.** An unrealistic
  bar for Mid reviewers produces either silent gaps or reviewer anxiety; the fix is naming what
  each level is actually expected to catch, per Section 2.
- **Calibrating promotion readiness from impression instead of the written ladder's actual
  language.** "I just don't feel it yet" is exactly the input that produces inconsistent bars
  across a team — anchor to the ladder's wording and name what's undemonstrated versus assumed.
- **Delegating a problem with the interesting decisions already made.** Handing someone a spec
  that's secretly the Lead's own design disguised as an assignment isn't delegation — it's
  reverse-engineering practice, and it doesn't build the judgment the handoff was supposed to
  build.
