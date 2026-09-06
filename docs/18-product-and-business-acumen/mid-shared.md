---
id: product-acumen-mid
title: Who a Ticket Is For, and Flagging Requirement Gaps Before Building (Mid)
description: Understanding who a ticket is for and what "done" means to them, and flagging requirement gaps before building rather than during QA.
tags: [product, requirements, mid]
lang: en
status: complete
domain: 18-product-and-business-acumen
band: M
platform: shared
level: Mid
sidebar_position: 1
prerequisites: [communication-mid]
outcomes:
  - "Find the ambiguity in a ticket and resolve it before writing code, at least once per sprint"
resources:
  - title: "Inspired: How to Create Tech Products Customers Love — Marty Cagan"
    url: "https://www.svpg.com/books/inspired-2nd-edition/"
    date: "2018-01-01"
  - title: "User story mapping — Jeff Patton"
    url: "https://www.jpattonassociates.com/user-story-mapping/"
    date: "2014-01-01"
  - title: "The cost of a requirements defect found in production vs. found in design"
    url: "https://www.researchgate.net/publication/234804293_Software_Defect_Reduction_Top_10_List"
    date: "2001-01-01"
  - title: "Writing good acceptance criteria — Atlassian"
    url: "https://www.atlassian.com/agile/project-management/user-stories"
    date: "2023-01-01"
---

# Who a Ticket Is For, and Flagging Requirement Gaps Before Building

> **Outcome.** Find the ambiguity in a ticket and resolve it before writing code, at least once
> per sprint. A ticket that reads as complete and isn't is the single most expensive kind of gap
> in this domain — expensive because the cost of catching it goes up by roughly an order of
> magnitude at every stage it survives: a question in planning is free, the same question in QA
> is a re-open ticket and a broken demo, and the same gap in production is an incident.

## 1. Who a ticket is for, and what "done" means to them

Every ticket has a specific person who will judge whether it's actually done — a support agent
checking whether a bug is gone, a PM checking whether a metric moved, a user who never sees the
ticket at all but experiences its effect directly. "Done" is not "the acceptance criteria as
literally written are satisfied" — it's "the person who asked for this would agree it solved
their problem," and those two things diverge more often than a ticket's author expects, because
acceptance criteria are a lossy compression of what the requester actually wants.

**A ticket, read two ways:**

```markdown
Ticket: "Add a retry button to the failed-upload state in the photo backup screen."

Read literally: render a button labeled "Retry" when uploadState == Failed; on tap,
call uploadPhoto() again. Acceptance criteria satisfied.

Read as "what does done mean to the person who filed this": support has been getting
tickets from users whose photo backups silently fail on flaky connections and who
don't understand why — the actual goal is "a user on a bad connection doesn't lose
photos and doesn't need to contact support to recover them." A single manual retry
button that fails silently again on the same bad connection, with no explanation of
why it failed the first time, technically satisfies the literal ticket and does not
solve the problem support is escalating.
```

The gap between these two readings isn't a bug in the ticket — it's what tickets are: a compressed
instruction that assumes shared context the writer had and the reader might not. Reading a ticket
for who it's for and what they're actually trying to get out of it is the habit that closes that
gap before code gets written, not after a demo makes it obvious.

**A short checklist for reading a ticket before starting it:**

```markdown
- [ ] Who filed this, or who's it filed on behalf of — support, a PM, a specific user
      segment, an internal team? Their name goes in a comment if it isn't obvious.
- [ ] What would they show someone else as proof this is fixed? Not "the acceptance
      criteria pass" — the actual moment they'd consider it resolved.
- [ ] Is there a metric or support-ticket volume this is meant to move? If so, what's
      the current number, so "did it work" is checkable later (this unit's Senior-band
      neighbor makes this a habit; starting the question at Mid is what makes it
      answerable there).
- [ ] Does the acceptance criteria, read literally, actually produce that outcome — or
      does it produce something that passes review but doesn't solve the real problem?
```

## 2. Flagging requirement gaps before building rather than during QA

A requirement gap found while writing code is a five-minute Slack message. The same gap found in
QA is a re-opened ticket, a delayed release, and a demo that has to be redone. The same gap found
in production is a support escalation and a hotfix. The gap doesn't get any easier to see between
these points — it gets more expensive to fix, and the only lever an individual engineer controls
is *when* they notice it, which is a matter of habit, not talent.

**Worked example — a ticket with a hidden ambiguity, and the question that surfaces it:**

```markdown
Ticket: "Show a badge on the Settings icon when the user has unread notification
preferences they haven't reviewed."

The hidden ambiguity: "unread notification preferences they haven't reviewed" assumes
a definition of "reviewed" that isn't stated. Does opening the Settings screen count
as reviewing them, even if the user doesn't scroll to the notifications section?
Does it require actually tapping into the notification-preferences sub-screen? Does
it reset per app version, or is it a one-time flag forever?

Written as acceptance criteria, this reads as complete: "Badge appears when
hasUnreviewedNotificationPrefs == true." It is complete syntactically and
underspecified semantically — three different engineers would implement three
different `hasUnreviewedNotificationPrefs` calculations from the same ticket, and
none of them would be "wrong" by the ticket's own text.

The question that surfaces it, asked before writing code, not after:
"Quick check before I start this — does 'reviewed' mean the user opened the
notification-preferences screen specifically, or is opening Settings enough? And
does this badge come back if we ship a new notification type later, or is it a
one-time thing per user?"

The answer that came back: "Opening the specific sub-screen, and yes, it should
reappear per new notification type — we're about to ship three new toggles next
quarter and want existing users to notice them." That second half of the answer
was not implied anywhere in the original ticket text, and a badge implemented
against the literal ticket alone would have shipped correct-looking code that
silently failed to do what next quarter actually needed.
```

The question that surfaced this wasn't a general "are there edge cases?" — it named the specific
undefined term ("reviewed") and asked for its exact boundary, which is what turns a vague unease
about a ticket into an answerable question the requester can resolve in one reply.

> [!IMPORTANT]
> The habit this section is building is not "ask more questions" — asking about everything is as
> useless as asking about nothing, because it either produces question fatigue or trains the
> requester to expect an engineer who can't move without hand-holding. The skill is noticing which
> specific word or clause in the ticket is doing load-bearing work without a stated definition, and
> asking about *that*, precisely, before any code depends on the answer.

## Where this breaks

- **Implementing the literal acceptance criteria without checking they produce the outcome the
  requester actually wants.** See Section 1's retry-button example — passing review and solving
  the real problem are not the same test, and only the second one is what "done" means to the
  person who filed the ticket.
- **A general "any questions?" instead of naming the specific undefined term.** A vague check-in
  gets a vague "looks good" back; naming the exact ambiguous word (see Section 2's "reviewed")
  gets a precise, useful answer, because it gives the requester something concrete to resolve.
- **Finding the gap in QA instead of before writing code.** The gap is the same gap either way —
  the only variable that changed is how many people and how much rework it now costs to fix,
  which is entirely a function of when it was noticed, not whether it was noticeable.
