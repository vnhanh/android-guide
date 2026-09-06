---
id: leadership-senior
title: "Driving Consensus, Influence Without Authority & Steelmanning (Senior)"
description: Driving consensus within your area, influencing without authority using evidence rather than seniority, and resolving disagreement so it stays technical.
tags: [leadership, influence, consensus, senior]
lang: en
status: complete
domain: 20-technical-leadership-and-influence
band: S
platform: shared
level: Senior
sidebar_position: 2
prerequisites: [leadership-mid, communication-senior, code-review-senior, product-acumen-senior]
outcomes:
  - "Change a team decision by convincing people, and be able to state the strongest version of the view you argued against"
resources:
  - title: "Influence without authority — Cohen & Bradley"
    url: "https://www.wiley.com/en-us/Influence+Without+Authority%2C+3rd+Edition-p-9781119573356"
    date: "2017-10-01"
  - title: "Steelmanning — arguing the strongest version of the other side"
    url: "https://en.wikipedia.org/wiki/Steel_man"
    date: "2024-01-01"
  - title: "Disagree and commit, revisited — when consensus is the wrong goal"
    url: "https://review.firstround.com/high-growth-companies-consensus-is-a-liability/"
    date: "2018-05-01"
  - title: "The five dysfunctions of a team — Patrick Lencioni"
    url: "https://www.tablegroup.com/product/dysfunctions/"
    date: "2002-04-01"
---

# Driving Consensus, Influence Without Authority & Steelmanning

> **Outcome.** Change a team decision by convincing people, and be able to state the strongest
> version of the view you argued against. The Mid unit's outcome was voicing an opinion; this
> unit's outcome is getting that opinion to actually move a decision, in a room where you have
> no formal authority to make anyone agree — which means the tool is evidence, not seniority,
> and the proof that you engaged with the disagreement honestly is being able to restate the
> other side better than its own proponent did.

## 1. Driving consensus within your area

Driving consensus is not the same skill as being right. Being right and unpersuasive changes
nothing; the Senior-band version of this skill is building the case in a form the room can
actually evaluate — a measurement, a prototype, a smaller-scoped trial — instead of a stronger
assertion of the same opinion the Mid unit already modelled. The shift from Mid to Senior here
is exactly this: Mid contributes an opinion once, unprompted; Senior carries an opinion through
the friction of an actual disagreement until the team's decision changes or the opinion turns
out to be wrong.

**A consensus-building sequence — the actual case, not just the conclusion:**

```markdown
Context: the team has been assuming, for two sprints, that the app's slow
cold-start is caused by the DI graph being built eagerly at Application#onCreate.
The prevailing plan is to move to a lazier DI setup — a multi-week migration.

Round 1 — state the opinion with a reason, not just a hunch:
"Before we commit to the DI migration: I profiled cold start with Perfetto
this morning, and the DI graph construction is 40ms of a 900ms cold start.
Even removing it entirely doesn't explain the number we're chasing."

Round 2 — anticipate the room's obvious counter, and answer it with more
evidence rather than repeating the assertion:
"The counter I'd expect is 'the profile might not reflect what changes after
migration' — fair, so I also reverted DI eagerness locally as a spike and
re-measured: cold start moved from 900ms to 860ms. The other ~800ms is
elsewhere — mostly ContentProvider initialization order, per the trace."

Round 3 — propose the cheaper thing that tests the real hypothesis before
committing to the expensive one:
"Rather than the full DI migration, I'd propose a half-day spike reordering
ContentProvider init, then re-profile. If that's where the time actually is,
we've saved weeks; if I'm wrong, we've lost half a day and the DI migration
plan still stands exactly as it does today."

Result: the team ran the half-day spike. It closed 500ms of the 900ms. The
DI migration was rescoped from "the fix" to "worth doing eventually, not
urgently" — a team decision changed by evidence, not by outranking anyone.
```

The pattern across all three rounds is the same: each round adds a measurement, not a louder
version of the previous claim. That is what "without authority" means in practice — nobody in
that thread outranked anyone else, so the only lever available was making the evidence cheaper
to check than to dispute.

## 2. Influence without authority, using evidence rather than seniority

The temptation at Senior band, once a few of these arguments have been won, is to start
winning the next one on the strength of the track record instead of the strength of the next
case — "I've been right about performance before, trust me on this one too." That move works,
which is exactly why it is dangerous: it substitutes a form of soft authority for evidence, and
it teaches the room to defer rather than to evaluate, which quietly erodes the same culture
that made the first several arguments possible to win on merit. The discipline is producing a
fresh, checkable case every time, even the tenth time, even when a shortcut is available.

## 3. Resolving disagreement so it stays technical

Disagreement that starts as "which caching strategy" has a way of becoming "whose judgment do
we trust" if it runs long enough without resolution — and once it becomes personal, no amount
of additional evidence moves it, because the thing actually being litigated is no longer on the
table. The Senior-band move is naming that drift out loud before it hardens: separating "here
is the data" from "here is who proposed the data" in the room's attention, explicitly, the
moment the conversation starts sounding like the second thing.

**Steelmanning the view you argued against — stated fairly, after winning the argument:**

```markdown
[written after the ContentProvider spike above closed the debate]

For the record, since we're moving off the DI-migration plan: the strongest
version of that plan wasn't wrong to propose. Eager DI construction on the
main thread at startup genuinely is a bad pattern regardless of whether it's
this app's bottleneck today — it will become the bottleneck as the graph
grows, and every app that ships that pattern eventually pays for it. The
original proposal was solving a real problem; it was just solving next
quarter's problem under this quarter's label. I think it's worth keeping on
the backlog as "do before the DI graph gets bigger," not shelving as "wrong."
```

Stating the strongest version of the argument you won against is not a courtesy — it is the
check that the disagreement was actually resolved on the evidence, rather than on who wore the
room down first. If the strongest version of the other side still sounds weak once stated
fairly, the case really was that one-sided. If it sounds compelling even after losing, that is
useful information for what to revisit next quarter.

## Where this breaks

- **Winning an argument by asserting more forcefully instead of measuring more.** Section 1 —
  each round of a real consensus-building sequence adds evidence; a louder restatement of the
  same claim is not a second round, it is the same round again.
- **Trading on a track record instead of building the current case.** Section 2 — "trust me,
  I've been right before" wins the argument but erodes the room's habit of actually checking,
  which costs the team more than any single decision is worth.
- **Letting a technical disagreement become a personal one without naming it.** Section 3 —
  once the argument is about whose judgment to trust rather than what the data shows, no amount
  of further evidence moves it; naming the drift is the only way back to technical ground.
- **Skipping the steelman once you've won.** Section 3 — a disagreement resolved by evidence,
  not restated fairly afterwards, leaves the room unable to tell whether it was actually settled
  or just outlasted.
