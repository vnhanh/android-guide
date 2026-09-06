---
id: communication-mid
title: PR Descriptions, Precise Questions & Status Before You're Asked (Mid)
description: Writing PR descriptions, commit messages and bug reports that stand alone, asking a precise question instead of a vague one, and reporting status and blockers before being asked.
tags: [communication, technical-writing, mid]
lang: en
status: complete
domain: 16-communication-and-technical-writing
band: M
platform: shared
level: Mid
sidebar_position: 1
prerequisites: []
outcomes:
  - "Write a PR description a reviewer can act on without opening the diff first"
resources:
  - title: "How to write a git commit message — Chris Beams"
    url: "https://cbea.ms/git-commit/"
    date: "2014-08-01"
  - title: "Writing a bug report — Mozilla"
    url: "https://developer.mozilla.org/en-US/docs/Mozilla/QA/Bug_writing_guidelines"
    date: "2024-03-01"
  - title: "Asking good questions — Julia Evans"
    url: "https://jvns.ca/blog/good-questions/"
    date: "2023-01-01"
  - title: "XY problem"
    url: "https://xyproblem.info/"
    date: "2023-01-01"
---

# PR Descriptions, Precise Questions & Status Before You're Asked

> **Outcome.** Write a PR description a reviewer can act on without opening the diff first —
> the smallest, highest-frequency unit of technical writing there is, and the one every other
> unit in this domain assumes you already do by habit.

## 1. PR descriptions, commit messages and bug reports that stand alone

The test for all three is the same: does this artifact carry enough on its own that someone with
zero context — a reviewer on a different team, you in eight months, a teammate covering your
on-call — can act on it without pulling you into a thread to fill in what's missing?

**PR description template — copy this:**

```markdown
## What
One sentence: what does this PR do, in terms of behavior, not implementation.

## Why
The problem this solves, or the ticket it closes. Link it. If there's no ticket, say why not.

## How
The approach, only where it isn't obvious from the diff — a library swap, a schema change,
a new dependency. Skip this section if the diff speaks for itself; padding it out with a
line-by-line narration of code the reviewer is about to read is not the point.

## Alternatives considered
Anything you tried or seriously weighed and didn't ship, with the one-line reason it lost.
(This is domain 14's habit — put the rejected option here, not in your head.)

## Testing
What you ran, on what, and what you saw. "Tested manually" is not testing; the device,
the steps, and the result are.

## Risk
What could this break, and how would you know if it did? Blank is a claim of "nothing" —
make that claim on purpose, not by omission.
```

**Before, vague:**

```markdown
## What
Fixes the login bug

## Testing
Tested it, works now
```

A reviewer reading this has no idea what the bug was, whether the fix addresses the root cause
or a symptom, what device or account state to test against, or what else might be affected by
whatever changed.

**After, specific — same PR:**

```markdown
## What
Login silently retries with a stale refresh token when the token expires mid-request,
instead of forcing re-auth. Users see a spinner that never resolves.

## Why
Fixes APP-2291. Reported by three users on the 4.12 release; reproduced on an account
with a token that expired between the request start and the retry.

## How
`AuthInterceptor` now checks token expiry before retrying, not just on the initial
request — the retry path previously skipped this check entirely.

## Alternatives considered
Refreshing proactively on a timer before expiry — rejected for this fix; it's a real
improvement but a separate, larger change, tracked as APP-2310.

## Testing
Repro'd the exact failure on a Pixel 6 (Android 14) by forcing token expiry mid-request
via a debug flag, confirmed the spinner no longer hangs and re-auth triggers correctly.
Ran the existing auth test suite, all green.

## Risk
Touches the retry path for every authenticated request. Low risk — the check is
additive (an early return), doesn't change the success path. Worth a careful look at
`AuthInterceptorTest` in the diff.
```

The difference isn't length for its own sake — it's that every sentence in the second version
answers a question the reviewer would otherwise have to ask in a comment, wait for a reply to,
and only then start reviewing.

**Commit messages** follow the same standalone test at a smaller scale: a subject line under ~50
characters stating what changed, imperative mood ("Fix," not "Fixed" or "Fixes"), and a body —
when the subject line can't carry the reason — explaining *why*, not restating *what* the diff
already shows.

```
Fix stale-token retry hanging on expired auth

The retry path skipped the expiry check that the initial request path
already had, so a token expiring mid-request would retry with a token
already known to be invalid instead of forcing re-auth.
```

**Bug reports** stand alone when they carry four things a fixer needs before touching the
debugger: exact steps to reproduce, expected vs. actual behavior, environment (device, OS
version, app version, account state if relevant), and what you've already ruled out.

```markdown
## Steps to reproduce
1. Log in, let session run until token is ~5s from expiry (or force via debug flag)
2. Trigger any authenticated request during that window
3. Observe the request retry

## Expected
Retry detects the expired token and forces re-auth.

## Actual
Retry proceeds with the same expired token, request hangs, spinner never resolves.

## Environment
Pixel 6, Android 14, app v4.12.0, account with standard (non-SSO) auth.

## Already ruled out
Not a network issue — confirmed via device logs the request never left the client;
the interceptor's retry logic is where it stalls.
```

A report missing "already ruled out" is the single most common gap — it sends the fixer down a
path you've already walked and eliminated, silently wasting their first twenty minutes.

## 2. Asking a precise question — the highest-return skill at this level

A vague question costs more round trips than the time it would have taken to write a precise
one, and at Mid band this is the single highest-leverage communication habit available: most of
the day's blockers get resolved by a question, not by writing more code.

**Before, vague — posted in a team channel:**

> Hey, has anyone seen this before? The sync is broken again 😕

This gets a reply of "broken how?" — and now the asker has spent a round trip (often hours, not
minutes, depending on who's online) just to get to where a precise question would have started.

**After, precise — same situation:**

> Sync fails intermittently for users with >500 items in their local cache — repros for me
> ~1 in 5 tries on a seeded test account (steps below). Getting `SYNC_CONFLICT_UNRESOLVED`
> from `SyncEngine.resolve()`, which per the docstring should only fire when both local and
> remote have changed the same field — but in my repro only the local side changed.
>
> **Tried:** added logging around `resolve()`, confirmed `remote.updatedAt` is null in the
> failing cases (shouldn't be, if remote genuinely changed). Checked `SyncEngineTest` — no
> existing test covers a null `remote.updatedAt`.
>
> **Repro steps:** [linked, 4 steps, seeded account ID included]
>
> **Question:** does a null `remote.updatedAt` mean "never synced" or "unknown," and should
> `resolve()` treat it as a conflict either way? I can't tell from the code whether this is
> the bug or intended, and whoever wrote the conflict logic will know faster than I can
> reverse-engineer it.

This version front-loads exactly what a vague question forces the answerer to ask for anyway:
what's actually happening, what's been tried, and what specific decision or fact would unblock
things next. It also states a concrete hypothesis and asks the answerer to confirm or correct
it, rather than asking them to solve the whole problem from zero — which is almost always
faster for both sides, and is frequently answerable in one message instead of a back-and-forth.

The shape that generalizes: **context** (what you're doing and what's failing), **attempted**
(what you already tried, so it isn't repeated), and **specific ask** (the exact fact or decision
that would unblock you — not "can you help" but the actual question).

## 3. Reporting status and blockers before being asked

The habit that separates "reliable to work with" from "needs to be checked on" is volunteering
status before someone has to come looking for it — a blocker reported the day it's discovered
costs a Slack message; the same blocker discovered by someone else three days later, after a
standup where it went unmentioned, costs a trust hit that a message never would have.

```markdown
## Status: APP-2291 (login retry bug)

**Where things stand:** repro'd, root cause found (retry path skips the expiry check
the initial request path has). Fix is small — PR up for review, link above.

**Blocker:** none currently. Flagging in advance — the fix touches `AuthInterceptor`,
which @maria owns; asked for review, no response yet, will re-ping tomorrow if quiet.

**ETA:** fix mergeable today pending review; will need a follow-up ticket for the
proactive-refresh improvement mentioned in the PR, not blocking this fix.
```

This is short on purpose — a status update that takes longer to read than the update is worth
gets skipped, which defeats the point. The three things that make it useful are stating where
things actually stand (not "still working on it"), naming a blocker the moment it exists rather
than after it's cost a day, and giving an ETA that's a real estimate rather than a hopeful one.

> [!IMPORTANT]
> The version of this habit that actually changes how you're perceived is reporting the blocker
> *before* it has visibly cost time — the day you notice `@maria` hasn't responded, not three
> days later when the PR is overdue and someone asks why. The same information, reported two
> days earlier, reads as "on top of it" instead of "behind."

Where this breaks: a status update that reports activity instead of state ("worked on the sync
bug today") answers a different question than the one that matters — not what you did, but
where the *thing* stands and what, if anything, is in the way of it landing.
