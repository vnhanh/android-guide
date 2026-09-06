---
id: communication-senior
title: The Design Doc That Gets Acted On, Trade-Offs for Non-Engineers & Handover Docs (Senior)
description: Writing a design doc or RFC that actually gets acted on, explaining a trade-off to a non-engineer without distorting it, documentation good enough that someone can take the system over, and writing for asynchronous review across time zones.
tags: [communication, design-docs, technical-writing, senior]
lang: en
status: complete
domain: 16-communication-and-technical-writing
band: S
platform: shared
level: Senior
sidebar_position: 2
prerequisites: [communication-mid]
outcomes:
  - "Write a design doc that gets a decision made in comments, without a meeting"
resources:
  - title: "Design docs at Google — Malte Ubl"
    url: "https://www.industrialempathy.com/posts/design-docs-at-google/"
    date: "2020-04-01"
  - title: "RFC process — Rust lang"
    url: "https://github.com/rust-lang/rfcs"
    date: "2024-01-01"
  - title: "Writing for async — GitLab handbook"
    url: "https://handbook.gitlab.com/handbook/communication/#writing-style-guidelines"
    date: "2024-01-01"
  - title: "Explaining technical work to non-technical people"
    url: "https://www.producttalk.org/2020/06/explain-technical-work/"
    date: "2020-06-01"
---

# The Design Doc That Gets Acted On, Trade-Offs for Non-Engineers & Handover Docs

> **Outcome.** Write a design doc that gets a decision made in comments, without a meeting —
> the Senior-band equivalent of the Mid unit's PR description: an artifact substantial enough
> to replace a synchronous conversation, not summarize one that already happened.

## 1. The design doc / RFC that actually gets acted on

A design doc that gets a real decision made in the comments has one property most drafts lack:
it presents a recommendation, not an open question dressed up as neutral. "Here are three
options, thoughts?" reads as unfinished thinking and invites everyone to relitigate from
scratch; "here's the recommendation and why the alternatives lost" invites people to either
agree or attack the specific reasoning — which is a much faster conversation to have in writing.

**Design doc template — copy this:**

```markdown
# RFC: [Title — the decision, not the problem area]

Status: Draft | In Review | Accepted | Rejected — Author — Date

## Context
What's true today, and why it needs to change. Numbers, not adjectives — "checkout
p95 latency is 2.4s" not "checkout feels slow."

## Goals
What this specifically needs to achieve. Be exhaustive here — a goal left unstated
becomes an unstated criterion reviewers judge the doc against without telling you.

## Non-goals
What this is explicitly not trying to solve, stated as clearly as the goals. This is
the section that prevents scope-creep arguments in the comments three weeks from now.

## Options considered
For each: what it is, the trade-off, why it's ranked where it is. Not a table —
tables flatten unequal-weight criteria into equal-looking rows (see domain 14 Senior).

## Recommendation
The option you're proposing, and the specific reasoning — referencing the trade-offs
above, not restating them.

## Open questions
Named, specific, and addressed to a person or role where possible — "@maria, does the
billing team's API support batch reads at this volume?" not "any concerns?"
```

**Worked example — filled in:**

```markdown
# RFC: Move image uploads to a pre-signed-URL flow, off the app server

Status: In Review — Priya Shah — 2025-06-02

## Context
The app server proxies every user image upload (avg 2.1MB, p95 8MB) through itself
before forwarding to blob storage. At current upload volume (~40K/day), this costs
~340GB/day of server egress+ingress and holds an app-server connection open for the
full upload duration — measured average 6.2s on a median mobile connection. Three
app-server timeout-related upload failures were reported in the last 30 days, all
tied to this hold time on slow connections.

## Goals
- Remove the app server from the upload data path entirely
- Keep upload progress reporting in the client UI (current behavior, don't regress)
- No change to the storage bucket's existing access-control model

## Non-goals
- Not re-architecting the image-processing pipeline (resizing, thumbnailing) that
  runs after upload completes — that's a separate, already-scoped project
- Not addressing video uploads, which use a different path already

## Options considered
- **Keep proxying, increase server timeout** — rejected. Treats the symptom; egress
  cost and connection-hold problem are unchanged, and a longer timeout just delays
  the same failure mode under worse network conditions.
- **Client uploads directly with a long-lived bucket credential embedded in the app**
  — rejected. Puts a write-capable credential in every client binary; unacceptable
  given the bucket also holds other tenants' data behind the same access model.
- **Pre-signed URL: client requests a short-lived, scoped upload URL from the app
  server, then uploads directly to the bucket** — recommended. App server issues a
  URL scoped to one object key, valid 5 minutes, no data passes through it.

## Recommendation
Pre-signed URL flow. It removes the app server from the data path (fixing both the
egress cost and the timeout failures) without weakening the bucket's access model
the way an embedded credential would — the app server still gates *who* can upload
and *where*, it just stops being in the byte path itself.

## Open questions
- @devon (client): does the current upload-progress UI work against a direct bucket
  PUT, or does it assume the app-server proxy response shape? Blocks the client-side
  estimate.
- @priya (infra): confirm the bucket CORS config allows direct browser/app uploads
  from our client origins before this is marked Accepted.
```

The doc gets a decision made *in comments* because each open question is addressed to a named
person with a specific, answerable question — a reviewer can resolve their piece without
needing everyone else in a room at the same time, which is the entire point of writing this
down instead of scheduling a meeting.

## 2. Explaining a trade-off to a non-engineer without distorting it

The failure mode isn't being too technical — it's simplifying in a direction that quietly
changes what's true, usually by dropping the trade-off and keeping only the part that sounds
good. The discipline is finding the plain-language framing that keeps the actual trade-off
intact, even when that's a less comfortable thing to say.

**Distorted, comfortable:**

> We're going to make the app faster and more reliable this quarter by cleaning up some
> technical debt.

This isn't false, but it drops the actual trade-off — that "cleaning up" means the team ships
zero new customer-facing features for a defined window — which the stakeholder needed in order
to make an informed call, not a comfortable one.

**Accurate, worked paragraph — same situation, explained to a product stakeholder:**

> Right now about 1 in 12 checkout attempts fails and has to be retried, because the code that
> handles payment retries was written for a much smaller number of daily transactions and
> doesn't hold up at our current volume. Fixing it properly means six weeks where the mobile
> team ships no new customer-facing features — that's the real cost, not a vague "some
> cleanup." The alternative is patching around the symptom for another quarter, which keeps
> that 1-in-12 failure rate roughly where it is and risks it getting worse as volume grows,
> while still costing engineering time, just spent on patches instead of the fix. I'd rather
> spend the six weeks now, while the failure rate is a nuisance rather than an incident — but
> that's the actual choice in front of us, and it's yours to make with the real cost stated.

This keeps the number (1 in 12), the actual cost (six weeks, no new features — stated plainly,
not softened), and the honest alternative (patch and defer, not "do nothing") intact. Removing
any one of those three to make the message land more easily is exactly the distortion this
section is about avoiding — a stakeholder who agrees to a decision made on a distorted version
of the trade-off did not actually consent to the trade-off that's really happening.

> [!WARNING]
> The tell that a trade-off has been distorted rather than simplified: reread it and check
> whether a technical peer would say "that's not quite what's happening." Plain language that
> passes that check is simplified correctly; plain language that fails it has quietly changed
> the facts to make the message easier to deliver.

## 3. Documentation good enough that someone can take the system over

The bar for handover documentation is specific and testable: could someone who has never seen
this system make its first on-call decision correctly, using only this document? Not "read
background on it" — make an actual decision, under time pressure, correctly.

**What that bar rules out:** an architecture description with no failure modes ("here's how it
works" but not "here's how it breaks"), a runbook that assumes the reader already knows which
dashboard to open, and comments that explain *what* the code does when the code already shows
that — the gap is always *why*, and *what to do when it's wrong*.

```markdown
# Sync service — handover doc

## What this owns
Syncs client-side cache state with the server on a 15-minute interval and on
foreground. Owns the `SyncEngine` and `ConflictResolver` classes.

## How it fails, and what you'll see
- **`SYNC_CONFLICT_UNRESOLVED` spike in logs** → usually means a client shipped with
  a schema change the server-side resolver doesn't handle yet. Check the app version
  in the failing events first, before touching server code.
- **Sync duration p95 climbing** → almost always cache size on the client growing
  past what the resolver was tuned for (see APP-2291's postmortem, linked). Not a
  server-side regression in the common case — check client cache size distribution
  before assuming a server deploy caused it.

## Where to look, in order
1. `#sync-alerts` Slack channel — first signal, usually 5-10 min before dashboards
2. Sync dashboard: [link] — p50/p95 duration, conflict rate by app version
3. `SyncEngineTest` — the fastest way to confirm whether a specific input triggers
   the bug you suspect, before touching production

## What you can safely change without asking anyone
- Resolver logging verbosity
- The 15-minute sync interval (behind a remote config flag, no deploy needed)

## What needs a second person before you touch it
- `ConflictResolver`'s core resolution logic — touches every client's data
  consistency; get a review from someone who's shipped a change here before, even
  under incident pressure
```

The "what you can change without asking" / "what needs a second person" split is the piece most
handover docs skip, and it's the piece that actually matters at 2am — it's the difference
between a new on-call engineer acting confidently within a stated boundary and either freezing
because nothing feels safe, or changing something that needed a second opinion.

## 4. Writing for asynchronous review across time zones

A document meant for async review across time zones has to survive being read once, by someone
who cannot ask a clarifying question until tomorrow — which means every question a synchronous
conversation would have resolved in real time has to already be anticipated and answered on the
page, or the review round-trips over a full day per question instead of a full review per day.

The concrete habits: state the decision and the ask at the top, not the end — a reader who
skims the first paragraph should know what's being decided and what's needed from them,
matching the Mid unit's PR-description habit at document scale. Name a deadline for feedback
explicitly ("comments by EOD Thursday your time, or this ships as written") rather than leaving
it open, because an open-ended review across time zones has no natural closing moment and will
otherwise drift for weeks. And resolve threads in writing rather than "let's discuss on the
call" — a reviewer nine hours away who sees "let's sync on this" has just been told their
feedback requires a meeting they may not be awake for, which is often exactly the friction that
was supposed to be avoided by writing the doc down in the first place.

## Where this breaks

- **A design doc structured as three neutral options with no recommendation.** It reads as
  unfinished thinking and invites the comments section to relitigate everything from zero,
  which is precisely the synchronous-meeting cost this format exists to avoid.
- **A trade-off explanation that drops the cost to make the message land more easily.** The
  stakeholder's agreement is worthless if it was given to a version of the trade-off that isn't
  the one actually happening — see the reread check in Section 2.
- **A handover doc that describes normal operation but not failure modes.** The reader only
  ever needs this document *because* something is wrong; a document silent on what wrong looks
  like has answered a question nobody was asking.
- **An async review doc that leaves the feedback deadline open.** No natural closing moment
  means the review drifts, and the decision gets made by default (whoever ships first) rather
  than by the review actually converging.
