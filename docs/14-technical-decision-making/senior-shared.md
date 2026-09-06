---
id: decisions-senior
title: ADRs That Still Hold Up a Year Later & Native vs. Cross-Platform Worked Properly (Senior)
description: Writing an ADR still useful a year later, naming constraints/alternatives/reversibility/cost explicitly, deciding with incomplete data, revisiting a decision production disagreed with, and native vs. cross-platform worked as a full decision rather than a table.
tags: [decision-making, adr, trade-offs, senior]
lang: en
status: complete
domain: 14-technical-decision-making
band: S
platform: shared
level: Senior
sidebar_position: 2
prerequisites: [decisions-mid]
outcomes:
  - "Write an ADR someone who wasn't in the room can act on, and revisit one of your own with the outcome recorded"
resources:
  - title: "Documenting architecture decisions — Michael Nygard"
    url: "https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions"
    date: "2011-11-15"
  - title: "Architecture Decision Records (adr.github.io)"
    url: "https://adr.github.io/"
    date: "2024-01-01"
  - title: "Reversible vs. one-way-door decisions — Amazon 2015 shareholder letter"
    url: "https://www.aboutamazon.com/news/company-news/2015-letter-to-shareholders"
    date: "2016-04-01"
  - title: "Flutter — Add-to-app and platform channel overhead"
    url: "https://docs.flutter.dev/platform-integration/platform-channels"
    date: "2025-02-01"
  - title: "React Native architecture — the New Architecture (bridgeless mode)"
    url: "https://reactnative.dev/architecture/overview"
    date: "2025-05-01"
---

# ADRs That Still Hold Up a Year Later & Native vs. Cross-Platform Worked Properly

> **Outcome.** Write an ADR someone who wasn't in the room can act on, and revisit one of your
> own with the outcome recorded — the same predict-then-check loop the Mid unit started, now
> applied to decisions big enough to need a document instead of a paragraph.

## 1. Writing an ADR still useful a year later

A PR-description comparison (Mid unit) is the right size for a decision that lives inside one
change. An ADR is for a decision that outlives the PR — one another engineer will trip over
long after the person who made it has moved to a different team, or a different company.

The test for whether an ADR is any good is not whether it reads well the week it's written —
almost anything does. It's whether it is still *actionable* a year later, to someone who was not
in the room: can they tell what was decided, why the alternatives lost, what would have to
change for the decision to be reconsidered, and how expensive reconsidering it would be?

```markdown
# ADR-031: Adopt gRPC for the internal sync service, keep REST at the public edge

## Status
Accepted — 2025-03-14

## Context
The sync service now makes ~40 internal calls per client session to other backend services
during a full sync. Each call currently pays JSON (de)serialization and a REST framing
overhead measured at ~18ms p50 per hop in staging load tests (trace ID SYNC-2318). At the
target of sub-2s full sync on a mid-tier device, this overhead alone accounts for roughly a
third of the sync budget before any actual work happens.

## Decision
Move internal service-to-service calls in the sync path to gRPC with Protobuf. The public
API (mobile client to edge) stays REST/JSON — clients already parse JSON, and the public
contract has external consumers gRPC would needlessly constrain.

## Alternatives considered
- **Keep REST/JSON internally, optimize serialization instead** — rejected. Profiling showed
  the overhead is dominated by connection/framing cost, not JSON parsing itself; a faster
  JSON library would not move the number that matters.
- **GraphQL for the internal path** — rejected. Solves an over-fetching problem we don't have
  (internal calls are already narrow, purpose-built); adds a schema-federation cost with no
  matching benefit here.
- **gRPC everywhere, including the public API** — rejected. Breaking change for existing
  mobile clients on the current release train; the public-edge cost isn't the one this
  decision is trying to fix.

## Reversibility
**Reversible, at a cost.** Internal-only change — no client-facing contract moves. Reverting
means re-implementing the affected service handlers in REST, estimated at 2-3 engineer-weeks
given the current call count. Not a one-way door, but not free either — see the Lead unit's
treatment of exactly this distinction.

## Cost
~3 engineer-weeks to migrate the four hottest internal services first; ongoing cost is a
second wire protocol and codegen step in the build for services on this path.

## Consequences
Predicted: sync-path internal overhead drops meaningfully; full sync moves closer to budget.
**Revisit entry, six months later:** confirmed for the two proto-gen-heavy services migrated
first (internal p50 hop latency down from ~18ms to ~6ms); the third service showed no
measurable improvement because its bottleneck was a downstream database query, not framing —
a reminder to verify the theory holds per-service rather than assume the aggregate number
applies everywhere it was tempting to apply it.
```

Four fields make this hold up when the Context section alone would have decayed: naming the
**constraints** that made this decision necessary rather than optional (the measured 18ms, the
2-second budget), the **alternatives** with real reasons they lost, the **reversibility**
(explicitly, not implied), and the **cost** — both to adopt and to reverse. An ADR missing any
one of these reads fine today and becomes archaeology within a year.

## 2. Naming constraints, alternatives, reversibility, and cost explicitly

Each of these four is a separate failure mode when it's implicit instead of stated:

- **Constraints left unstated** mean the next reader can't tell whether the decision still
  applies once the constraint that drove it has changed. "We chose gRPC" without the 18ms
  number attached gives nobody a way to know when the decision is due for reconsideration.
- **Alternatives left unstated** mean the decision looks unopposed, when in fact two other
  options were seriously weighed and lost for reasons worth remembering next time this question
  gets re-asked by someone who wasn't there for the first round.
- **Reversibility left implicit** is the single most consequential omission — see the worked
  case below, and the Lead unit's full treatment of one-way doors vs. reversible decisions. A
  decision that reads as final when it was actually cheap to reverse gets defended too hard;
  one that reads as reversible when it was actually a one-way door gets made too fast.
- **Cost left unstated** — both the cost to adopt *and* the cost to undo — is what turns "we
  should revisit this" from an actionable next step into a debate that starts from zero every
  time, because nobody wrote down what revisiting would actually require.

## 3. Deciding with incomplete data

Senior-band decisions rarely wait for complete data — by the time the data is complete, the
decision window has usually closed. The discipline is not gathering more data indefinitely; it
is stating explicitly what is known, what is assumed, and what would change the decision if it
turned out to be wrong.

```markdown
## What we know
- Current crash-free rate: 99.2% (Crashlytics, trailing 28 days)
- The proposed library adds ~1.4MB to APK size (measured against a release build)

## What we're assuming
- The library's crash rate in our traffic pattern will resemble its published rate for
  similar apps (we have no internal data yet — this is the biggest unknown)
- Adoption cost estimate (3 days) assumes no surprises in the migration guide

## What would change this decision
- If the library's crash rate in our first two weeks of rollout exceeds 0.05% attributable
  crashes, roll back and re-evaluate — this number, not a vague "if it seems bad."
```

Stating the assumption is what makes it falsifiable later — an unstated assumption can't be
checked, only argued about, because nobody agreed in advance on what "wrong" would look like.

## 4. Revisiting a decision production disagreed with

Production disagreeing with a decision is not the same as the decision having been wrong at the
time it was made — the useful question is which one it was, and an ADR with a revisit entry is
what makes that distinguishable months later instead of relying on memory.

```markdown
## Revisit — 2025-09-01

Production data does not support the original decision. Cache-hit rate on the new layer is
41%, against a projected 75% used to justify the added complexity.

Root cause: the projection assumed request locality that doesn't hold for this user
population — a larger fraction of users than modeled hit distinct content each session,
so there's less to cache. This was a modeling error, not new information that only became
available after the fact; the data needed to catch it existed at decision time and wasn't
checked against the actual traffic distribution.

Action: revert to the simpler single-layer cache; keep this ADR as the record of why, so
the same assumption doesn't get reused unexamined for the next caching decision.
```

Writing this down, including the "was this avoidable" judgment, is the part most engineers skip
because it's uncomfortable — and it is exactly the part that makes the next similar decision
better instead of a repeat.

## 5. Native vs. cross-platform, worked properly

A comparison table sorts criteria into rows and gives each option a checkmark, which reads as
if every row carries equal weight. It rarely does, and the table format hides that. Worked
properly, this decision starts from the actual constraint driving it, not from a generic
feature-by-feature scorecard.

**The question that actually matters first:** what is this specific app going to need from the
platform layer that a bridge or a rendering abstraction would sit between the app and the OS?
Not "which is generally better" — there is no generally-better answer to this question, only
an answer conditioned on what the app does.

**Where native wins outright, and why it's not close:**

- **Deep, fast-moving platform API surface.** Widgets, Bluetooth LE peripheral roles, camera
  pipelines with custom processing, background execution APIs (`WorkManager`, `BGTaskScheduler`)
  — cross-platform frameworks reach these through a bridge that lags the platform SDK by a
  release or more, and some surfaces (App Intents, Live Activities, App Widgets) have no
  first-class cross-platform binding at all. If the app's differentiator *is* one of these
  surfaces, the bridge overhead is not a performance detail, it's a ceiling on the feature.
- **Stability at the tail.** A mission-critical app targeting >99.75% crash-free sessions is
  choosing a smaller, better-understood dependency surface: the platform SDK and standard
  library, versus the platform SDK *plus* a bridge/interop layer *plus* the cross-platform
  framework's own runtime, each an added source of crashes the team doesn't fully control and
  can't always fix directly.
- **Complex, custom-rendered UI at 120Hz.** Compose and SwiftUI compile to native rendering
  paths tuned by the platform vendor. Flutter renders through Skia and controls its own
  pipeline (usually competitive); React Native's older bridge added serialization overhead on
  every native-UI round trip — the New Architecture's bridgeless JSI interface narrows this gap
  substantially, but "narrows" is doing real work in that sentence, not "eliminates."

**Where cross-platform is the actually-correct choice, not a compromise:**

- **Time-to-market on a CRUD/e-commerce-shaped app.** If the app is forms, lists, network
  calls, and standard navigation — the shape of most line-of-business and early-stage-product
  apps — a single codebase reaching two platforms at once is not "70% as good for half the
  cost," it is close to the *same* product for meaningfully less engineering time, because the
   platform-specific ceiling above never gets tested.
- **A team that does not have, and will not soon have, two platform-native skill sets.** A
  single small team maintaining Kotlin *and* Swift, each to a professional standard, is a real
  staffing cost — one that a cross-platform choice converts into "one language, two platforms,"
  which is frequently the correct trade for the team's actual size, not a lesser one.
- **A pre-product-market-fit app where the cost of being wrong about the product is far higher
  than the cost of being wrong about the platform layer.** Iteration speed dominates; the app is
  as likely to be rebuilt as extended once the product direction is confirmed, so the platform
  decision is closer to reversible than the native-vs-cross-platform framing usually implies —
  which is itself the reversibility question from Section 2, applied here explicitly.

**The decision this actually is:** not "native vs. cross-platform" as a fixed identity for the
company, but a per-app (sometimes per-feature) call, made the same way any other Senior-band
decision gets made — name the constraint that's actually binding (the platform-API ceiling, the
staffing reality, the stage the product is at), state which of the two changes the calculus, and
write it as an ADR using the shape from Section 1, including reversibility and cost, so that when
the constraint changes — the team grows a second platform specialism, the product needs a
capability only native exposes — the decision has a stated trigger for being reopened rather than
becoming an unexamined default.

> [!IMPORTANT]
> The trap in this decision specifically is treating it as a one-time, company-wide choice
> instead of a per-app decision with a stated trigger for revisiting. A company that picked
> native for its flagship app three years ago is not thereby bound to pick native for an
> internal tool with a two-week deadline and no performance requirement — and the reverse is
> just as true.

## Pitfalls & trade-offs

- **An ADR with a Context section and nothing else.** Context alone reads as a justification for
  whatever was decided; without alternatives, reversibility, and cost, there's nothing left to
  check the decision against later.
- **Reversibility asserted without the cost of reversing attached.** "This is reversible" with
  no estimate of what reversing would take is functionally the same as not stating it — it gives
  the next reader no way to weigh how much caution the decision actually needs.
- **Treating an unstated assumption as if it were data.** The incomplete-data technique in
  Section 3 only works when the assumption is written down and falsifiable — an assumption kept
  in someone's head can't be checked against what production later shows.
- **Skipping the revisit entry because the outcome was disappointing.** The ADRs most worth
  finishing are the ones where production disagreed — that's the one that teaches the team
  something, and it's exactly the one people are tempted to leave unfinished.
- **Treating native-vs-cross-platform as a single permanent company policy** rather than a
  per-app decision with a stated trigger for reconsideration, per Section 5.
