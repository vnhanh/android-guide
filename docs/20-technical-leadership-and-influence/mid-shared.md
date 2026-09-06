---
id: leadership-mid
title: "Owning Commitments & Speaking Up Without Being Asked (Mid)"
description: Owning your commitments and saying early when you cannot meet one, and contributing an opinion in a technical discussion without waiting to be asked.
tags: [leadership, influence, communication, mid]
lang: en
status: complete
domain: 20-technical-leadership-and-influence
band: M
platform: shared
level: Mid
sidebar_position: 1
prerequisites: [communication-mid]
outcomes:
  - "Disagree with a more senior engineer, in public, with a reason"
resources:
  - title: "Radical Candor — Kim Scott"
    url: "https://www.radicalcandor.com/"
    date: "2019-01-01"
  - title: "Crucial Conversations — Patterson, Grenny, McMillan, Switzler"
    url: "https://cruciallearning.com/crucial-conversations-book/"
    date: "2011-09-01"
  - title: "Disagree and commit — Amazon's leadership principles"
    url: "https://www.amazon.jobs/en/principles"
    date: "2021-01-01"
  - title: "Psychological safety and speaking up — Amy Edmondson"
    url: "https://hbr.org/2019/01/high-performing-teams-need-psychological-safety-heres-how-to-create-it"
    date: "2019-01-01"
---

# Owning Commitments & Speaking Up Without Being Asked

> **Outcome.** Disagree with a more senior engineer, in public, with a reason. This is the
> entry point into leadership, and it has nothing to do with title: it is the first moment an
> engineer treats their own judgment as evidence worth putting on the table, rather than a
> private opinion to be kept until someone senior enough asks for it. Everything else in this
> domain — driving consensus, setting technical vision — is this same act at greater scale and
> greater stakes.

## 1. Owning your commitments, and saying early when you cannot meet one

A commitment made in standup — "I'll have the pagination fix done by Thursday" — is a small
promise, but it is still a promise, and the leadership behaviour at Mid band is not making
better promises, it is noticing early when one is at risk and saying so before anyone has to
ask. The habit this domain shares with `planning-mid`'s slippage section is deliberate: this
is the same discipline, but the outcome here is about the relationship it protects, not the
plan it protects. A missed date disclosed on the date is a surprise; the same date disclosed
two days early is a heads-up, and the difference between those two is entirely about who still
has the information while there is still time to use it.

**A commitment renegotiated early — the actual words, not on the deadline:**

```markdown
To: [tech lead], sent Tuesday (committed Thursday, in Monday's standup)

Subject: Pagination fix — flagging early, not going to make Thursday as scoped

Wanted to flag this today rather than Thursday morning. The fix works for the
common case, but I found that the API's cursor gets invalidated on the
account-switch flow, and that's a real bug, not an edge case I can defer —
it'll double-load results for anyone who switches accounts mid-scroll.

Fixing it properly is about a day and a half more than I budgeted. Two ways
I can go, and I don't have a strong preference between them:

1. Ship Thursday without the account-switch fix, filed as a fast-follow —
   fine if that flow is low-traffic enough to accept briefly.
2. Take until Monday and ship the whole thing together.

I lean towards (2) because a fix that's known-broken on one flow is the kind
of thing that comes back as a support ticket, but you have context on how
urgent Thursday actually is that I don't — your call.
```

Notice what this message does that a silent Thursday-morning "sorry, running behind" cannot:
it names the specific new fact, states a number, and hands back a real choice while the choice
still exists. Owning a commitment does not mean absorbing every risk alone until it becomes
unmanageable — it means being the first person to notice the risk and the first to say so.

## 2. Contributing an opinion in a technical discussion without being asked

The Mid-band failure mode this section targets is not being wrong — it is staying quiet in a
discussion where an opinion was actually correct, because nobody explicitly asked for it and
volunteering felt presumptuous. A design review, an architecture discussion, a PR comment
thread — these fail the team not when someone disagrees badly, but when whoever formed a
useful opinion holds it back and the group makes a worse decision for lack of it. Contributing
unprompted is the specific behaviour that turns a meeting attendee into a participant.

**An unprompted opinion in a design discussion — not a question, a position:**

```markdown
[in a design review thread, discussing whether to add a new cache layer]

I know this wasn't on the agenda, but I want to raise something before we
settle on the Redis-backed cache: we already have an in-memory LRU cache on
this exact path from the search-results work last quarter, and it's handling
about 70% of these lookups today per the dashboard. Adding a second cache
layer on top of one that's already doing most of the work feels like solving
a problem we've mostly already solved, and it adds an invalidation surface
we'd need to keep in sync across two caches instead of one.

I'd rather we spend an hour measuring whether tuning the existing LRU's size
gets us the rest of the way, before committing to standing up new
infrastructure. Happy to be wrong if the numbers say otherwise — but I don't
think we've actually looked yet.
```

This is not "have you considered X" phrased as a question to avoid ownership of the answer —
it is a stated position, with a specific reason, offered before anyone asked for it. It can be
wrong. Being wrong in public, with a reason attached, is how the next opinion gets sharper; a
withheld opinion never gets corrected, because it never enters the room.

## Where this breaks

- **Waiting until the due date to say a commitment is at risk.** Section 1 — the underlying
  fact is true days earlier and costs nothing to disclose then; disclosed on the date, it has
  already removed everyone else's options.
- **Treating silence as neutral in a technical discussion.** Section 2 — an unvoiced correct
  opinion has the same effect on the outcome as not having had it; the discussion is worse for
  the group regardless of whether the reason for staying quiet was politeness or uncertainty.
- **Confusing "owning a commitment" with "absorbing all the risk alone."** Section 1 — the
  point of raising it early is to hand back a real choice while the choice still exists, not to
  quietly work nights until the date is somehow met.
