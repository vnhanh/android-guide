---
id: planning-lead
title: "Technical Initiatives, the Risk Register & Defending a Slipped Plan (Lead)"
description: Turning a fuzzy problem into a technical initiative with milestones, running a real risk register, capacity planning across a quarter, and defending a plan that slipped without blaming or absorbing all of it.
tags: [planning, risk, capacity, leadership, lead]
lang: en
status: complete
domain: 19-planning-estimation-and-risk
band: L
platform: shared
level: Lead
sidebar_position: 3
prerequisites: [planning-senior]
outcomes:
  - "Run a quarter where the risks that materialised were on the register, and their mitigations had already started"
resources:
  - title: "Risk registers in practice — PMI Practice Standard for Project Risk Management"
    url: "https://www.pmi.org/pmbok-guide-standards/practice-guides/risk"
    date: "2019-01-01"
  - title: "An elegant puzzle: systems of engineering management — Will Larson"
    url: "https://lethain.com/elegant-puzzle/"
    date: "2019-05-01"
  - title: "Capacity planning for engineering teams"
    url: "https://increment.com/planning/eng-capacity-planning/"
    date: "2021-02-01"
  - title: "Blameless postmortems and the psychology of accountability without blame"
    url: "https://sre.google/sre-book/postmortem-culture/"
    date: "2016-01-01"
---

# Technical Initiatives, the Risk Register & Defending a Slipped Plan

> **Outcome.** Run a quarter where the risks that materialised were on the register, and their
> mitigations had already started. Everything below the Lead band in this domain has been about
> planning one feature; a Lead's version of the same discipline operates at the scale of a
> quarter, where "resolve the riskiest unknown in week one" (the Senior outcome) becomes
> "maintain a living list of everything that could go wrong across three months, and act on it
> before it does" — and where, when something still slips despite that, the Lead is the one who
> has to say so, in a room, without either taking all the blame or deflecting all of it.

## 1. Turning a fuzzy problem into a technical initiative with milestones

A quarter's fuzzy mandate — "improve app stability," "get us ready for the international
launch" — is not yet a plan; it's a direction with no milestones, no owner per piece, and no way
to tell in week six whether the quarter is on track or quietly drifting. Turning it into an
initiative means doing, at quarter scale, the same decomposition the Senior unit does at
feature scale: breaking the fuzzy goal into named pieces of work, each with an owner, a rough
size, and a milestone a stakeholder can check against without needing to ask.

```markdown
Fuzzy mandate: "Get the app ready for the international launch this quarter."

Turned into an initiative:

Milestone 1 (end of week 3): Localisation audit complete — every hardcoded
string identified, RTL layout issues catalogued with severity, owner: [eng].
Milestone 2 (end of week 6): Backend API confirmed to support region-specific
pricing and currency formatting — this is the spike-equivalent at quarter
scale: the riskiest unknown (does the backend even support this without a
schema change?) resolved by week 6, not discovered in week 11.
Milestone 3 (end of week 9): RTL layout fixes shipped behind a flag, tested
against the three markets legal has flagged as priority.
Milestone 4 (end of week 12): Full launch readiness review, flag removed for
priority markets.

Each milestone has a single owner and a date a stakeholder can check without
asking the Lead directly — the initiative is legible from the outside, not
just tracked in one person's head.
```

The riskiest-unknown-first discipline from the Senior unit reappears here at a different scale:
milestone 2 exists specifically because "does the backend support this" is the assumption the
other ten weeks of work rest on, and it's placed early enough that a "no" is still affordable.

## 2. The risk register: mitigation, contingency, reviewed more than once

A risk register that gets written once at kickoff and never opened again is a compliance artifact,
not a planning tool — its entire value comes from being reviewed on a cadence, so that a risk's
likelihood or impact getting worse is caught while there's still time to act, and so that a
mitigation that was supposed to have started by week 4 is actually checked at week 4, not assumed.

**A real risk register, filled with a plausible example, in the format actually used:**

```markdown
| Risk | Likelihood | Impact | Mitigation | Contingency | Review date |
|---|---|---|---|---|---|
| Backend doesn't support region pricing without a schema change | Medium | High — blocks milestones 3 & 4 entirely | Spike scheduled week 4-6 (milestone 2) to confirm before committing further work; backend team looped in week 1, not week 6 | If confirmed unsupported: descope to single-currency launch for priority markets, revisit multi-currency next quarter | Reviewed weekly during weeks 1-6, biweekly after |
| RTL layout defects found late, after most screens already built | Medium | Medium — rework cost, not a launch blocker | Audit (milestone 1) runs in week 1-3, before the bulk of feature work, specifically to catch this early | Ship priority markets first with RTL fixes complete; defer lower-priority markets one sprint if defects exceed audit estimate | Reviewed at each milestone checkpoint |
| Legal review of priority markets takes longer than the 2-week estimate | Low | High — blocks milestone 3's market list | Legal engaged in week 1, not week 8; explicit ask for a rough timeline up front | If review slips past week 7: launch with the subset of markets already cleared, add others as a fast-follow | Reviewed biweekly |
| Key engineer on the localisation audit goes on planned leave in week 5 | High (known in advance) | Medium — audit continuity risk | Handoff doc + a second engineer shadowing from week 2, specifically so week 5 isn't a solo dependency | If handoff gaps appear: milestone 1's date slips by the leave's length, communicated in week 1, not discovered in week 5 | Reviewed at week 2 and week 4 |
```

Notice the shape every row follows: a mitigation is something already started, not a plan to start
one if the risk fires — the backend spike is scheduled now, the audit is timed to run early, the
handoff doc exists before the leave, not after it's announced as a problem. A contingency is the
fallback if the mitigation doesn't work, decided in advance rather than improvised under pressure.
And the review date is a real calendar commitment, not "we'll check in eventually" — this register
gets opened on a cadence, and a risk whose likelihood changes between reviews gets caught at the
next one, not three months later at the retro.

> [!IMPORTANT]
> "Reviewed more than once" is the entire point of a register, not a nice-to-have. A risk register
> checked only at kickoff has exactly the same practical value as no register at all — the risks
> that materialise are, almost by definition, the ones whose likelihood or impact changed after
> the first review, and a register nobody reopens can't catch that change.

## 3. Capacity planning across a quarter

An initiative's milestones only mean something once they're checked against how much engineering
time actually exists to do the work — a plan built against an assumed headcount that ignores
planned leave, on-call rotations, and the fact that roughly a fifth of most quarters gets consumed
by unplanned production support is a plan that's already behind the day it's approved.

```markdown
Nominal capacity: 4 engineers × 12 weeks = 48 engineer-weeks.

Realistic capacity, quarter-planned:
  - 2 weeks of planned leave across the team (known in advance) → -2
  - On-call rotation: roughly 15% capacity tax during on-call weeks,
    2 engineers rotate through 4 weeks total → -1.2
  - Historical average: 20% of any quarter's capacity goes to unplanned
    production support, based on the last three quarters' actuals, not a
    guess → -8.8 (a placeholder tax applied up front, not discovered as
    "why are we behind" in week 10)

Realistic capacity: ~36 engineer-weeks against a nominal 48.

The international-launch initiative (Section 1) is sized at approximately
30 engineer-weeks across its four milestones — a 6-week buffer against
realistic capacity, not the 18-week buffer a nominal-capacity plan would
have implied. That buffer is the room the risk register's contingencies
actually have to operate in; a plan sized against nominal capacity has
already spent that room before anything goes wrong.
```

The discipline here is applying the unplanned-work tax as a planning input up front, from
historical data, rather than treating each quarter's unplanned interruptions as a surprise that
excuses the slip after the fact — a Lead who plans against realistic capacity is the one whose
risk register's contingencies have actual room to execute in.

## 4. Defending a plan that slipped, without blaming or absorbing all of it

Every register eventually has a row that fires anyway, or a milestone that slips for a reason
nobody had on the register at all — and the moment that matters most in this entire domain is
the conversation that follows, because a Lead who blames the team loses the team's trust, and a
Lead who absorbs all the responsibility for a slip that had real, external causes teaches the
organisation nothing and sets up the next quarter to repeat it.

**The actual words, for a retro or stakeholder conversation, for the register above if the
backend schema change turned out to be needed after all:**

```markdown
"The launch is landing three weeks later than the original plan. Here's what
happened and what didn't.

What was on the register and worked as planned: the RTL audit surfaced the
issues we expected in week 1-3, and the fixes shipped on schedule in week 9 —
that part of the plan executed exactly as designed, including the buffer we'd
built in for it.

What wasn't on the register, and is the actual cause of the three-week slip:
the backend schema change needed a data migration for existing pricing
records that nobody — including me, when I scoped the spike in week 4 —
anticipated, because it only became visible once the spike's engineer looked
at production data volume, not the schema itself. That's a genuine gap in
how I scoped the spike's question; I asked 'does the schema support this'
and should have also asked 'what does migrating existing data cost,' and
that's on the plan, not on the backend team who flagged it as soon as they
found it.

What I'm not going to do is treat this as a reason to pad every future
estimate defensively — the fix is a more specific spike question next time,
not a bigger buffer applied blindly everywhere. Concretely: I'm adding
'what does this cost for existing data, not just new data' to the spike
checklist template we use for schema-touching work going forward, so this
specific gap doesn't recur on the next initiative.

Given the three-week slip, the options for this launch are: hold the full
market list and land three weeks late, or launch the two markets whose
migration is already validated and add the rest as a fast-follow two weeks
after. I'd recommend the second — it gets the launch date-sensitive markets
out on time and treats the migration risk as contained rather than blocking
everything behind it."
```

The script does three specific things: names what worked (so the whole quarter isn't reduced to
the failure), names the actual gap precisely and owns the part that was genuinely a planning
miss rather than deflecting it onto the backend team who did their job well, and turns the
retrospective into one specific, checkable process change rather than a vague promise to "be more
careful" or a blanket decision to pad every future estimate out of fear.

> [!IMPORTANT]
> "Without blaming or absorbing all of it" means both directions of failure are being guarded
> against at once. Blaming the team or another team for a risk that was never on the register
> teaches nobody anything and burns trust; theatrically absorbing 100% of the responsibility for a
> genuinely external surprise is just as dishonest, and it robs the postmortem of the one thing
> that actually prevents a repeat — a precise, specific description of what was missed and why.

## Where this breaks

- **A quarter run against a fuzzy mandate with no milestones.** Section 1 — nobody outside the
  Lead's own head can tell whether week six is on track, and the riskiest assumption sits
  undiscovered until it's expensive to fix.
- **A risk register written once at kickoff and never reopened.** Section 2 — a risk's likelihood
  or impact changing between kickoff and the quarter's end is exactly what the register exists to
  catch, and a register nobody revisits catches nothing.
- **Capacity planned against nominal headcount instead of historical realistic capacity.**
  Section 3 — a plan that ignores the on-call tax and the unplanned-work tax that every previous
  quarter has shown up in has already spent its buffer before anything goes wrong.
- **A retro that blames the team, blames another team, or absorbs all responsibility instead of
  naming the specific gap.** Section 4 — both extremes skip the one output a slipped plan is
  actually supposed to produce: a precise enough description of what was missed that the same gap
  doesn't recur next quarter.
