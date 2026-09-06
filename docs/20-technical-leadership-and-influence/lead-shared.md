---
id: leadership-lead
title: "Technical Vision, Calling It Under Uncertainty & Managing Up (Lead)"
description: Setting and communicating technical vision, making the call when consensus fails and owning it afterwards, managing up and across, organisational awareness of where constraints actually sit, and deciding under uncertainty without pretending to certainty.
tags: [leadership, vision, influence, lead]
lang: en
status: complete
domain: 20-technical-leadership-and-influence
band: L
platform: shared
level: Lead
sidebar_position: 3
prerequisites: [leadership-senior]
outcomes:
  - "Make an unpopular technical call, explain it so the team can execute it wholeheartedly, and revisit it publicly if it turns out wrong"
resources:
  - title: "An elegant puzzle: systems of engineering management — Will Larson"
    url: "https://lethain.com/elegant-puzzle/"
    date: "2019-05-01"
  - title: "Disagree and commit — Amazon's leadership principles"
    url: "https://www.amazon.jobs/en/principles"
    date: "2021-01-01"
  - title: "Staff engineer — leadership beyond the management track — Will Larson"
    url: "https://staeng.substack.com/"
    date: "2021-06-01"
  - title: "Deciding under uncertainty — Annie Duke, Thinking in Bets"
    url: "https://www.annieduke.com/thinking-in-bets/"
    date: "2018-02-01"
---

# Technical Vision, Calling It Under Uncertainty & Managing Up

> **Outcome.** Make an unpopular technical call, explain it so the team can execute it
> wholeheartedly, and revisit it publicly if it turns out wrong. The Senior unit's outcome was
> changing a decision by convincing the room; this unit's outcome is different in kind, not just
> in scale — sometimes the room does not converge, the deadline does not move, and someone has
> to decide anyway. Making that call well, explaining it so people who disagree can still execute
> it in good faith, and being willing to say in public that it was wrong when it was — that is
> the specific, narrow thing a Lead does that a Senior does not yet have to.

## 1. Setting and communicating technical vision

A technical vision is not a roadmap and not a wishlist — it is a small number of stated beliefs
about what the codebase or platform should look like in a year, specific enough that a team can
use it to break ties between two reasonable-looking options without escalating every one of
those ties to the Lead personally. A vision that only exists as slides shown once at a kickoff
is not doing this job; it has to be concrete enough to be quoted back during an ordinary code
review six months later.

## 2. Making the call when consensus fails, and owning it afterwards

Consensus fails for reasons that have nothing to do with anyone being unreasonable: the
evidence genuinely doesn't point one way, the deadline is real, or two options are both
defensible and the team is evenly split on taste rather than fact. At that point, more
discussion is not the tool — a decision is, and a Lead's job is to make it, explain the reasons
including the ones that didn't fully resolve, and take visible ownership of the outcome rather
than letting it read as "the team decided" when the team, in fact, did not converge.

**Announcing an unpopular call — the actual words, reasoning included:**

```markdown
[posted to the team channel, after two weeks of design discussion that ended
 3-3 on whether to adopt a new networking library or extend the existing one]

Team — I've been going back and forth on the networking library question
with you for two weeks, and I want to be straight about where this landed:
we're genuinely split, and more discussion isn't going to resolve it,
because both options are defensible and the disagreement is more about which
risk we'd rather carry than about a fact either side has wrong.

I'm making the call: we extend the existing client rather than adopt the new
library. Here's the reasoning, including the part that doesn't fully
resolve the disagreement:

- The new library is better-designed for where we're headed in a year —
  that argument is correct, and I'm not disputing it.
- But we have four in-flight features touching the networking layer right
  now, and a library migration under them raises the odds of a
  regression during a quarter where we've already committed to a launch
  date we can't move.
- I'm treating "better in a year" as real but deferrable, and "regression
  risk this quarter" as not deferrable. Reasonable people land differently
  on that trade-off — I don't think the people who wanted the migration
  are wrong about the merits, I'm just weighting the timing differently.

What I need from the team: build against the existing client as if this
were the agreed plan, not a compromise you're waiting to relitigate. I'll
revisit the migration explicitly next quarter once the launch is behind us,
and I'll bring the same evidence-driven process back to that conversation —
this isn't a door closing, it's a sequencing call.
```

The message does three things a bare "we're going with option A" cannot: it names that
consensus genuinely didn't form, states the actual trade-off being weighted rather than
pretending one side had no case, and gives the team a concrete reason the decision is
executable even by the half of the room that preferred the other option.

## 3. Managing up and across

The same evidence-based influence from the Senior unit still applies here, but the audience
changes: a Lead spends real time convincing people who are not in the room for the technical
detail — a manager, another team's Lead, a director — who need the conclusion and the risk, not
the trace. Managing up badly looks like either over-explaining the technical case to someone
who needs the business consequence, or under-explaining it to someone who actually needs to
defend the decision one level further up than you can reach.

## 4. Organisational awareness: where the constraints actually sit

A technical call that is correct in isolation can still be wrong for the organisation if it
ignores a constraint that lives outside the team — a platform team's roadmap, a compliance
deadline, a dependency another org is mid-migration on. Organisational awareness is not
politics; it is treating "who else is affected by this and what do they already have committed"
as an input to the decision with the same seriousness as the technical evidence, because a
decision that is locally optimal and organisationally expensive is not actually the cheap
option it looks like from inside one team.

## 5. Deciding under uncertainty without pretending to certainty

The last discipline is refusing to launder a genuine guess as a confident conclusion, because a
team that is told "this will definitely work" cannot tell the difference between a call that
was well-reasoned and one that was lucky — and when it turns out wrong, that same team loses
trust in every future call, confident or not. Stating the actual uncertainty at the time the
call is made is what makes it possible to revisit it later without it reading as a reversal of
character.

**Publicly revisiting a call that turned out wrong:**

```markdown
[posted to the team channel, one quarter after the message above]

Update on the networking decision from last quarter: I said we'd extend the
existing client to avoid regression risk during the launch, and revisit the
migration after. Revisiting now, and I want to say plainly that part of that
call was wrong, not just "worth reconsidering."

What I got right: no regressions during the launch quarter — that part of
the reasoning held.

What I got wrong: I estimated the cost of continuing to extend the existing
client as flat going forward. It isn't. Two of the features we shipped this
quarter each needed a workaround around the same limitation, and both
workarounds are now things we maintain. I weighted "this quarter's risk" and
priced "next quarter's cost" too cheaply — the actual number is higher than
I said it was three months ago.

Given that, I think we should start the migration now rather than waiting
further, and I'll own that this is later than it should have been had I
priced it correctly the first time. Bringing a proposal with real numbers to
Thursday's planning meeting.
```

Revisiting a call in public, by name, with the specific thing that was underpriced rather than
a vague "in hindsight" — this is what keeps deciding under uncertainty from quietly turning
into never being wrong out loud. A Lead who is never publicly wrong is not making harder calls
than everyone else; they are making the same calls and only reporting the ones that landed.

## Where this breaks

- **A vision that lives only in a kickoff deck.** Section 1 — if it can't be quoted back to
  settle an ordinary review six months later, it isn't concrete enough to be doing its job.
- **Letting a split decision read as "the team decided."** Section 2 — when consensus genuinely
  didn't form, saying so and owning the call personally is what keeps the team from feeling
  either steamrolled or falsely unanimous.
- **Explaining a call to the wrong altitude.** Section 3 — over-explaining trace-level detail to
  someone who needs the business risk, or vice versa, loses the audience that actually needed to
  act on the explanation.
- **Treating an outside team's roadmap as someone else's problem.** Section 4 — a locally
  optimal call that ignores an external constraint is not actually cheap; it just moves the
  cost somewhere it wasn't measured.
- **Stating a guess as a certainty, then going quiet when it's wrong.** Section 5 — the entire
  value of naming uncertainty up front is that it makes revisiting the call later a correction,
  not a reversal that costs the team's trust in every call after it.
