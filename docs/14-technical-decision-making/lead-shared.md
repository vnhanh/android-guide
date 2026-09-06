---
id: decisions-lead
title: Decision Rights, One-Way Doors & Engineering Economics (Lead)
description: How decisions get made and by whom, one-way doors vs. reversible decisions, engineering economics (cost of delay, opportunity cost, build vs. buy), SDK adoption as a decision with a price, and deciding under genuine uncertainty.
tags: [decision-making, engineering-economics, lead]
lang: en
status: complete
domain: 14-technical-decision-making
band: L
platform: shared
level: Lead
sidebar_position: 3
prerequisites: [decisions-senior]
outcomes:
  - "Write the decision-rights document — which decisions a Lead makes, which the team makes, which need a stakeholder — then follow it when it is inconvenient"
resources:
  - title: "Reversible vs. one-way-door decisions — Amazon 2015 shareholder letter"
    url: "https://www.aboutamazon.com/news/company-news/2015-letter-to-shareholders"
    date: "2016-04-01"
  - title: "Cost of delay — Don Reinertsen, Principles of Product Development Flow"
    url: "https://www.developmentflow.com/"
    date: "2009-06-01"
  - title: "Build vs. buy for engineering teams"
    url: "https://a16z.com/build-vs-buy/"
    date: "2023-09-01"
  - title: "RACI and decision rights for engineering orgs"
    url: "https://www.atlassian.com/work-management/project-management/raci-chart"
    date: "2024-06-01"
---

# Decision Rights, One-Way Doors & Engineering Economics

> **Outcome.** Write the decision-rights document — which decisions a Lead makes, which the
> team makes, which need a stakeholder — then follow it when it is inconvenient. The document
> is easy to write; following it the first time it blocks a decision you'd rather just make
> yourself is the actual test.

## 1. How decisions get made here: who decides what, when an ADR is required

Every team already has an implicit answer to "who decides this," and it is usually inconsistent
— whoever's in the room, whoever's loudest, whoever shipped the original code. A Lead's job is
to make that answer explicit and stable enough that people stop having to guess.

```markdown
# Decision rights — Mobile Platform team

## The team decides, no escalation needed
- Which existing pattern to apply when the codebase already supports more than one
- Library upgrades within the same major version
- Internal module boundaries that don't cross team ownership lines

## The team decides, ADR required
- Any new third-party dependency added to a shipping target
- A change to a shared internal API another team's code calls
- Anything reversing a previous ADR

## The Lead decides, after team input
- Which of two internal architectures a cross-cutting migration follows
- Sequencing conflicting priorities when the team disagrees and time is genuinely scarce
- Whether a decision is a one-way door serious enough to need a stakeholder (see below)

## Needs a stakeholder outside the team
- Anything changing a public API contract another team's roadmap depends on
- Any decision materially affecting cost, compliance, or user-data handling
- Adopting a vendor/SDK above the cost threshold set in Section 4
```

The ADR-required row is doing real work: it's not that every team decision needs a document, it's
that some decisions are cheap to make and expensive to re-litigate from scratch if undocumented —
new dependencies and shared-API changes are exactly that category, which is why they're gated
regardless of how obviously correct they seem at decision time.

## 2. One-way doors vs. reversible decisions, and spending caution accordingly

The single highest-leverage judgment call in this domain is telling these two apart correctly,
because the amount of process a decision deserves should scale with how expensive it is to
undo — not with how senior the person making it happens to be, and not with how important the
decision *feels* in the room.

```
Reversible (two-way door):
  - A library choice with a working alternative and no data-format lock-in
  - An internal code convention
  - A feature flag's default value
  → Decide fast, with the smallest group that has the context. A wrong call costs
    the time to reverse it, which is genuinely small.

One-way door:
  - A persisted data format or database schema with no migration path back
  - A public API contract, once external clients depend on it
  - A vendor whose data export format locks you in on exit
  - An architectural decision that would take a quarter of unwinding to reverse
  → Decide slow, with the people who'd bear the cost of being wrong in the room,
    and write the ADR before committing, not after.
```

The mistake runs in both directions, and both are common. Treating a reversible decision as a
one-way door produces a team that can't ship a library upgrade without a design review — caution
spent where it buys nothing. Treating a one-way door as reversible produces a schema migrated
into production with no rollback path, discovered the day it needs one. The Senior unit's
reversibility field in the ADR template is exactly this classification, made explicit and
attached to the decision at the point it's made rather than argued about after the fact once
someone tries to reverse it and can't.

> [!WARNING]
> "We can always change it later" is the sentence that precedes almost every undocumented
> one-way door in a codebase's history. It is worth treating as a claim to verify, not a fact —
> ask specifically what changing it later would cost, in the same units as Section 3 below,
> before accepting it as a reason to decide quickly.

## 3. Engineering economics: cost of delay, opportunity cost, build vs. buy

Below Lead band, most trade-offs are argued in engineering terms — build time, crash rate,
complexity. At Lead band, the same decisions need to be arguable in front of people who do not
care about Kotlin, which means translating engineering trade-offs into the vocabulary the rest
of the business already uses for decisions: cost, delay, and opportunity.

**Cost of delay** asks what shipping a quarter later actually costs, not "sooner is better" as a
platitude:

```
Feature: subscription paywall redesign, projected to lift conversion 1.5 points.
Current MRR: $400K. One point of conversion ≈ $2,600/month.
Cost of delay: ~$3,900/month for every month this ships late — not a vague "we should
prioritize this," a number the roadmap can be argued against.
```

**Opportunity cost** asks what the team is *not* doing while doing this — the honest answer to
"why does this feel expensive even though the ticket looks small" is usually that it isn't
competing against zero, it's competing against the next thing on the list.

**Build vs. buy**, worked as a real comparison rather than a reflexive "buy is faster":

```markdown
## Crash reporting: build in-house vs. Crashlytics/Sentry

Build in-house:
  - Cost: ~6 engineer-weeks initial, plus ongoing maintenance of symbolication,
    dashboards, alerting — a permanent tax on a team that didn't ask to own this.
  - Benefit: full data ownership, no per-event vendor pricing at scale.

Buy (Crashlytics):
  - Cost: $0 at current volume (free tier); vendor lock-in on historical crash data
    export if switching later.
  - Benefit: live in a day, symbolication and alerting already solved, maintained by
    a team whose entire job is this problem.

Decision: buy. The team's differentiation is the product, not crash-reporting
infrastructure — 6 engineer-weeks building a worse version of a solved problem is a
real cost, not a hypothetical one, measured against features actually on the roadmap.
```

The build case is correct exactly when the team's own requirements diverge from what any vendor
offers, or when the data in question is sensitive enough that an external vendor is the wrong
answer regardless of cost — not by default, and not because building feels more like "real
engineering."

## 4. SDK adoption as a decision with a price

An SDK add is not a decision until it's priced the same way build-vs-buy is priced — the
temptation is to treat it as free because no code gets written, when the actual cost shows up
later, distributed across app size, startup time, crash surface, and privacy review.

```markdown
## SDK adoption checklist — third-party analytics library

- APK size added: 2.1MB (measured, release build, before/after)
- Startup time added: +40ms cold start (measured, average of 10 runs, mid-tier device)
- Crash surface: SDK has its own crash reports in the last 90 days — reviewed, 3 known
  issues, none matching our integration pattern
- Data collected: device ID, IP-derived location, install source — reviewed against
  privacy policy, requires a policy update before shipping (domain 10's mid unit)
- Exit cost: data export format if switching vendors later — confirmed, exports to CSV
- Threshold check: under the $ and MB ceilings set for "team decides" (Section 1);
  does not require stakeholder sign-off
```

Skipping this checklist is how a team ends up with eleven analytics SDKs, each individually
approved with no aggregate view of the app-size and startup-time budget they collectively spend
— the checklist exists specifically so the *aggregate* cost stays visible, not just each SDK's
marginal cost in isolation.

## 5. Deciding under genuine uncertainty, and saying so

Some Lead-band decisions have to be made before the data that would resolve them exists — a
platform direction, a bet on where the product is heading, a technology still maturing. The
discipline here is not pretending confidence that isn't there; it's stating the uncertainty
explicitly and deciding anyway, in a form the team can act on and revisit.

```markdown
## Decision: adopt Compose Multiplatform for the next major feature

Confidence: moderate, not high. The technology is production-viable but younger than
our other core dependencies; tooling gaps are still being reported and closed monthly.

We are deciding now because the feature has a hard external launch date and starting
platform-native and porting later costs more than starting here and hitting a rough
edge partway through — that comparison, not certainty about the technology, is the
actual basis for this decision.

Stated trigger for reversing: if we hit a blocking tooling gap with no workaround and
no fix on a visible roadmap, we fall back to platform-native for the remaining work,
budgeted at up to 3 weeks of rework — accepted in advance, not discovered under
deadline pressure if it happens.
```

Saying "moderate confidence, here's why we're deciding anyway, here's the trigger for reversing"
is a stronger document than false certainty, and it is what lets the team execute without
either paralysis or unwarranted confidence — the team knows exactly what would make the Lead
change course, instead of having to infer it after the fact.

## Pitfalls & trade-offs

- **A decision-rights document nobody follows the first time it's inconvenient.** The document
  only has value if it survives the moment a Lead wants to just make a call solo that the
  document assigns to the team — following it *there* is the entire outcome this unit asks for.
- **Classifying a decision as reversible because reclassifying it as a one-way door would slow
  things down.** The classification has to be made honestly before the caution level is chosen,
  not chosen to justify the speed a Lead already wanted.
- **Cost-of-delay and opportunity-cost numbers invented to win an argument rather than estimated
  honestly.** A number that isn't defensible under questioning is worse than no number — it
  looks rigorous and isn't, and it erodes trust in every number after it.
- **Approving an SDK on engineering merits alone, skipping the size/startup/privacy checklist.**
  Each individual approval looks reasonable; the aggregate cost across a dozen such approvals is
  what actually breaks the app-size or startup budget.
- **Presenting genuine uncertainty as confidence, to seem decisive.** It reads as leadership in
  the short term and reads as bad judgment the moment reality diverges from a confidence nobody
  actually had — stating the uncertainty and the reversal trigger up front survives that moment
  intact.
