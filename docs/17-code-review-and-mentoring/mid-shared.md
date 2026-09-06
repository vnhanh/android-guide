---
id: code-review-mid
title: Specific Review Comments, Receiving Review & Onboarding a First PR (Mid)
description: Leaving specific, kind, actionable review comments, receiving review without defending, and onboarding a newer teammate to their first merged PR.
tags: [code-review, mentoring, mid]
lang: en
status: complete
domain: 17-code-review-and-mentoring
band: M
platform: shared
level: Mid
sidebar_position: 1
prerequisites: [communication-mid, architecture-mid]
outcomes:
  - "Leave a review comment that says what, why, and what instead — all three"
resources:
  - title: "How to do code reviews like a human — Michael Lynch"
    url: "https://mtlynch.io/human-code-reviews-1/"
    date: "2019-03-01"
  - title: "Google engineering practices — how to do a code review"
    url: "https://google.github.io/eng-practices/review/reviewer/"
    date: "2024-01-01"
  - title: "Egoless programming and the ten commandments"
    url: "https://blog.codinghorror.com/the-ten-commandments-of-egoless-programming/"
    date: "2019-01-01"
  - title: "Onboarding checklists that actually work — LeadDev"
    url: "https://leaddev.com/growing-as-leader/creating-effective-onboarding-plan-new-hires"
    date: "2023-05-01"
---

# Specific Review Comments, Receiving Review & Onboarding a First PR

> **Outcome.** Leave a review comment that says what, why, and what instead — all three. A
> comment missing any one of them either doesn't change the code, doesn't survive the author
> disagreeing, or doesn't tell them what to do next — this domain's smallest, highest-frequency
> unit, the same role PR descriptions play in domain 16.

## 1. Specific, kind, actionable review comments

A review comment that only has one or two of **what**, **why**, and **what instead** either
gets ignored, gets litigated in a reply thread, or gets "fixed" in a way that doesn't actually
address the problem. All three together are what make a comment something the author can act on
without a follow-up question.

**Before, vague and harsh — a real comment, lightly anonymized:**

> This is wrong. Please fix.

The author now has to guess what "wrong" means, ask a clarifying question, wait for a reply, and
only then start the fix — three round trips for something the reviewer already knew when they
wrote the comment.

**After, specific, kind, actionable — same finding:**

```markdown
`loadUserProfile()` retries on any exception, including `IllegalStateException` from an
invalid auth token — that retry will never succeed and just burns three attempts before
the caller sees the real error. (what)

Retrying is only correct for transient failures — network timeouts, 5xx responses —
where a second attempt might actually work. An invalid-token failure needs re-auth, not
a retry. (why)

Could we catch `IOException` and 5xx specifically, and let auth-related exceptions
propagate immediately? Happy to pair on this if the exception hierarchy here is messy.
(what instead)
```

The rewrite doesn't remove the finding — it's the same bug, described just as directly — it adds
the reasoning the author needs to agree without another comment ("why does this matter") and a
concrete next step ("what instead") rather than leaving the author to invent a fix and hope it's
what the reviewer meant.

**Rewrite worksheet — copy this shape for a comment that's currently vague or harsh:**

| Slot | Vague/harsh version | Specific/kind/actionable version |
| :--- | :--- | :--- |
| What | "This is wrong." | "`loadUserProfile()` retries on `IllegalStateException` from an invalid token." |
| Why | *(missing — forces a reply to ask)* | "Retrying only helps for transient failures; an invalid token needs re-auth, not a retry." |
| What instead | "Please fix." | "Catch `IOException`/5xx specifically; let auth exceptions propagate. Happy to pair." |

> [!IMPORTANT]
> "Kind" here doesn't mean softened to the point of losing the finding — it means the comment is
> about the code, not the author ("this retries on the wrong exception type," not "you didn't
> think this through"), and it offers a path forward instead of just a verdict. A comment can be
> completely direct about a real bug and still be kind, if it's aimed at the code and ends with
> a way out.

## 2. Receiving review without defending

The instinct under a pointed review comment is to explain why the code is fine as written — and
that instinct is usually wrong even when the explanation is technically correct, because it
answers "why did I write it this way" instead of the question the reviewer actually needs
answered: "should this change." Three responses cover almost every review comment, and none of
them is a defense:

- **"Good catch, fixing"** — when the comment is right, said with no justification attached to the
  original code. Justifying a mistake before fixing it reads as reluctance to accept it was one.
- **"Can you say more about the risk here?"** — when the comment isn't obviously right, asking for
  the specific risk the reviewer sees is a request for information, not a rebuttal of it.
- **"I went with X because of Y constraint — does that change your read?"** — the one response
  that surfaces a real disagreement, framed as new information for the reviewer to weigh, not as
  "you're wrong."

**What defending sounds like, and why it costs more than it saves:**

> Well actually this is fine because the caller always validates input first, so the null check
> isn't needed here.

Even when true, this reads as an argument against the comment rather than information the
reviewer didn't have — and it puts the reviewer in the position of either backing down publicly
or pushing back a second time, which is a worse conversation than the same fact stated as
context: "the caller validates this upstream — want me to add a defensive check anyway, or is
that redundant enough to skip?"

> [!NOTE]
> A reviewer who is wrong deserves to be told so — the goal isn't silent compliance, it's
> stating disagreement as information the reviewer can update on ("here's a constraint you
> might not have seen") rather than as a defense of the original choice.

## 3. Onboarding a newer teammate to their first merged PR

A new teammate's first PR sets the pattern for every PR after it — an onboarding pass that treats
the first PR as just another review misses the chance to establish, deliberately, how review
works on this team before the newcomer has any other model to go on.

**Worked onboarding checklist/script — first PR, before the newcomer opens it:**

```markdown
## Before they open the PR
- [ ] Paired for the first hour of the task, or at minimum walked through where the
      relevant code lives and one existing PR that's a good model of "done" here
- [ ] Told them explicitly: "your first PR will probably get more comments than a normal
      one — that's onboarding, not a signal you did it wrong"

## Reviewing the PR itself
- [ ] First comment on the PR is something specific and genuine that's good — not a
      generic "nice work," a real thing: "good call splitting the validation into its
      own function, that'll be easy to test in isolation"
- [ ] Every "must fix" comment follows the what/why/what-instead shape from Section 1 —
      this is the newcomer's first live example of what a review comment looks like here
- [ ] Anything that's a house convention rather than a universal rule is labeled as one:
      "we use `Result<T>` instead of throwing here — team convention, not a hard rule,
      but consistency matters more than which one is objectively better"

## After it merges
- [ ] A short message, in writing, on what went well and the one thing to carry into
      the next PR — not a list, one thing, so it's actually retained
- [ ] Ask them what was confusing about the review process itself, not just the code —
      the process is also new to them
```

The piece that's easy to skip and costs the most when skipped is labeling house conventions as
conventions rather than rules — a newcomer who can't tell the difference either treats every
comment as equally load-bearing (slow, exhausting) or, worse, silently assumes the codebase has
no real rules at all because half of what they were told turns out to be a preference.

## Where this breaks

- **A review comment that states the problem but never the reasoning.** The author either
  argues back with a justification the reviewer didn't ask for, or "fixes" the literal complaint
  without addressing why it mattered — see Section 1's worksheet.
- **Defending a design choice instead of stating it as context.** Even a completely correct
  defense reads as pushback and forces the reviewer to either concede publicly or escalate,
  when the same fact framed as new information resolves in one exchange.
- **Treating a newcomer's first PR like any other review.** The volume and tone of that first
  review is the actual onboarding document, whether or not anyone intended it to be — a first PR
  that's all "must fix, must fix, must fix" with no labeled conventions and no acknowledgment of
  what went right teaches the wrong lesson before the written docs get a chance to.
