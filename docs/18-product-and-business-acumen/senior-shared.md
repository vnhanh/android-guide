---
id: product-acumen-senior
title: Shaping Requirements, the Cheaper Alternative & UX Prioritisation for Engineers (Senior)
description: Shaping requirements rather than consuming them, proposing the cheaper alternative that gets most of the value, knowing which metric a feature moves, and UX prioritisation for engineers.
tags: [product, requirements, ux, senior]
lang: en
status: complete
domain: 18-product-and-business-acumen
band: S
platform: shared
level: Senior
sidebar_position: 2
prerequisites: [product-acumen-mid]
outcomes:
  - "Talk Product out of something, by offering a cheaper thing that serves the same goal"
resources:
  - title: "Inspired: How to Create Tech Products Customers Love — Marty Cagan"
    url: "https://www.svpg.com/books/inspired-2nd-edition/"
    date: "2018-01-01"
  - title: "How to measure anything — perceived performance and progress indicators"
    url: "https://www.nngroup.com/articles/progress-indicators/"
    date: "2022-11-01"
  - title: "Shape Up — Ryan Singer (Basecamp)"
    url: "https://basecamp.com/shapeup"
    date: "2019-01-01"
  - title: "Thumb zone mapping for mobile UX — Steven Hoober"
    url: "https://www.uxmatters.com/mt/archives/2013/02/how-do-users-really-hold-mobile-devices.php"
    date: "2013-02-01"
---

# Shaping Requirements, the Cheaper Alternative & UX Prioritisation for Engineers

> **Outcome.** Talk Product out of something, by offering a cheaper thing that serves the same
> goal — the Senior-band move that the Mid unit's ticket-reading habit was building toward.
> Reading a ticket for who it's for and what "done" means (domain 18 Mid) tells you what someone
> actually wants; this unit is about what to do with that once you can see it more clearly than
> the requirement as written — including seeing, before anyone asks, that the requirement was
> never really about the pixels at all.

## 1. Shaping requirements rather than consuming them

A requirement handed to a Mid engineer is an input to implement faithfully; a requirement handed
to a Senior engineer is a first draft of a goal, and treating it as anything more finished than
that is how teams end up building exactly what was asked for and not what was needed. Shaping a
requirement means engaging with the goal behind the ask before agreeing to the ask itself —
not to be difficult, but because the person writing the ticket is not always the person best
placed to know what the cheapest path to that goal actually is.

**Before, requirement consumed as written:**

> Product: "We need a full onboarding carousel — five screens, illustrations, a progress
> dial — before users reach the sign-up form. Competitor X has one and our activation
> rate is lower than theirs."

**After, the goal surfaced and the requirement reshaped around it:**

> "Before I scope the five-screen carousel — is the goal specifically 'have a carousel like
> Competitor X,' or is it 'raise activation rate,' and the carousel is one guess at how? If
> it's the second, I'd rather look at where users are actually dropping off in our funnel
> first — we have the analytics for that already — because if the drop-off is at the
> sign-up form's password rules, five onboarding screens won't move the number the ticket
> is actually trying to move, and we'll have spent two sprints finding that out the hard
> way instead of the cheap way."

The difference isn't skepticism for its own sake — it's naming, out loud, the assumption a
requirement is built on ("a carousel raises activation") so it can be checked against the data
before a team commits sprints to it, rather than after.

## 2. Proposing the cheaper alternative that gets most of the value

Once the actual goal is visible, the highest-leverage Senior move is rarely "build what was
asked" or "refuse to build it" — it's proposing something narrower that gets most of the value at
a fraction of the cost, stated in terms Product can evaluate and say yes to on the spot.

**Worked negotiation scenario — the actual proposal, not advice about writing one:**

```markdown
Subject: Alternative to the 5-screen onboarding carousel — same goal, ~1 week not ~6

Hi [PM] — before we scope the full carousel, I pulled last month's funnel data and
wanted to share an alternative that I think gets us most of the activation lift for a
fraction of the build cost.

**What the data shows:** 61% of drop-off between install and activation happens on the
sign-up form itself, specifically at the password-confirmation field — not before it.
Only 9% of drop-off happens before users even reach sign-up, which is the stage the
5-screen carousel is aimed at.

**What I'd propose instead:** a single, contextual tooltip on the password field
explaining the requirement up front ("8+ characters, one number") instead of showing
the error only after a failed submit, plus reordering the form so email comes before
password (matches what Competitor X actually does structurally, separate from their
carousel). Both are UI changes to an existing screen, not five new ones.

**Cost comparison:** the carousel is a ~6-week build across two engineers plus new
illustration assets from design. The form change is roughly 1 week for one engineer,
no new design assets, and is instrumented against the same activation metric so we'll
know within two weeks of shipping whether it moved the number — the carousel wouldn't
give us a clean read for a full quarter given how it's bundled with three other launch
changes.

**What I'm not saying:** that the carousel idea is bad forever — if the form fix ships
and activation still lags Competitor X, the carousel becomes a much better-justified
next bet, with the cheap fix already banked. I'd rather learn that in two weeks than
find out in month two of a six-week build that the real problem was somewhere else.

Can we ship the form change first and revisit the carousel with that data in hand?
```

The proposal works because it never argues the carousel is wrong — it offers a cheaper bet aimed
at the same number, with an explicit re-open condition ("if this doesn't move it, the carousel is
back on the table") that gives Product an easy, low-risk yes instead of a fight over whose idea is
better.

> [!IMPORTANT]
> This only works when the cheaper alternative is actually evaluated against the same goal the
> original ask was serving, not a different one that's merely easier to build. A cheap alternative
> that quietly changes what's being measured isn't a negotiation win — it's a way to ship less
> work and discover later that the real problem never got addressed.

## 3. Knowing which metric your feature moves, and checking whether it did

Every feature request is, underneath its UI description, a bet that a specific metric will move —
activation, retention, a support-ticket category, a conversion rate — and a Senior engineer who
ships the feature without naming that metric up front has no way to tell, afterward, whether the
six weeks were well spent. Naming the metric before building, and checking it after shipping, is
what turns "we built the thing" into "we know if the thing worked."

```markdown
Before shipping, name it: "This form change is aimed at the sign-up-form drop-off
rate, currently 61% of total funnel drop-off. Success is that number meaningfully
down within two weeks of the change reaching 100% of traffic."

After shipping, check it: two weeks post-launch, drop-off at the password field
fell from 61% to 34% of total drop-off — the tooltip and reorder worked. Overall
activation rate rose 4 points, which is reported back to the same thread the
original proposal went in, closing the loop rather than moving on silently.

The alternative outcome is also worth naming: if drop-off hadn't moved, that's not
a failure to hide — it's the fastest, cheapest possible signal that the real
bottleneck is somewhere else, and the next hypothesis (the carousel, or something
else entirely) now starts from one wrong guess already ruled out rather than zero
information.
```

Closing the loop — reporting the number back, whichever way it went — is the part that's easy to
skip and is exactly what makes the next proposal credible; a Senior who proposes cheap
alternatives and never reports whether they worked is optimizing for looking efficient, not for
actually being right.

## 4. UX prioritisation for engineers

Requirements shaping and the cheaper-alternative pitch both depend on being able to predict, before
a line of UI code is written, which interface decisions actually move the metric and which ones
just look like effort. Three structural defaults do most of that predicting for mobile work
specifically, and treating them as inputs to a proposal — not just craft opinions — is what makes
them usable in a Product conversation rather than only in a design review.

**Perceived performance over raw latency, as a negotiation input, not just a technique.** A feature
request that reads as "make the feed load faster" is very often better served by a cheaper fix
than an actual latency reduction: a skeleton shimmer and optimistic state updates make an action
feel instantaneous even when the underlying network call takes the same time it always did. When
Product asks for "faster," the Senior-level question is which of the two problems is actually
being reported — users perceiving a delay, or a latency number that's genuinely regressed against
a budget (domain 09's territory) — because the shimmer fix ships in days and the actual latency
work can be a multi-sprint investigation; proposing the perception fix first, with the same
"if it doesn't move the number, we escalate to the latency investigation" re-open condition as
Section 2's carousel example, is the same move applied to a UI-performance ask instead of an
onboarding one.

**Offline-first resilience as a requirement-shaping question, not an implementation detail.** A
ticket that specifies "show a loading spinner while data syncs" is usually underspecifying the
actual goal, which is almost always "the user should be able to use the app on a bad connection
without it feeling broken" — rendering cached local data immediately and syncing silently in the
background serves that goal in a way a spinner never can, and asking "should this work offline, or
is showing a spinner while we wait acceptable" is exactly the kind of load-bearing, undefined term
this domain's Mid unit teaches surfacing before code gets written. (The durable-retry-queue
mechanics for making this concrete on Android are domain 05 Senior's territory — this unit is
about recognizing when to raise the question, not implementing the queue.)

**Thumb-zone ergonomics as evidence in a cost negotiation.** A request to relocate a primary action
to the top of the screen, where it's easy to reach in a mockup but hard to reach with a thumb on a
large modern device, is a case where an engineer's push-back has a specific, cheap counter-offer
available: keeping the action in the bottom third of the screen (the ergonomically reachable
"thumb zone" on most large-screen devices) usually costs nothing extra to build and measurably
outperforms a top-anchored placement on tap-completion rate — turning "I don't love this
placement" into "here's the reachability data, and the cheaper version is also the better one,"
which is a proposal Product can act on rather than a stylistic objection to override.

Each of the three is the same underlying move as Section 2's carousel proposal, aimed at UI
placement and feel instead of feature scope: name the actual goal behind the visual ask, offer the
version that gets there for less, and attach a number the team can check afterward.

## Where this breaks

- **Treating a requirement as a finished spec instead of a first draft of a goal.** See Section 1
  — building the carousel exactly as specified would have consumed two sprints without anyone
  checking whether a carousel was ever the right bet against the actual funnel data.
- **Arguing that the original ask is wrong instead of offering a cheaper path to the same goal.**
  Section 2's proposal never claims the carousel is a bad idea — it offers a lower-cost bet at the
  same metric with an explicit re-open condition, which is what makes it easy to say yes to.
- **Shipping a feature with no metric named up front, and no report back afterward.** Section 3 —
  without a stated success condition, "we shipped it" and "it worked" are two different claims,
  and only naming the metric before and checking it after can tell them apart.
- **Treating perceived performance, offline resilience, and thumb-zone placement as craft
  preferences instead of proposals with data attached.** Section 4 — "I don't like this
  placement" gets overruled by a PM with a deadline; "here's the reachability data and the cheaper
  version also converts better" gets adopted, because it's the same shape of proposal as Section
  2's cost comparison, just applied to UI feel instead of feature scope.
