---
id: decisions-mid
title: Comparing Options in Writing & Escalating Instead of Guessing (Mid)
description: Comparing two or three options and saying why in writing, and escalating a decision rather than guessing quietly when the answer isn't yours to make alone.
tags: [decision-making, trade-offs, mid]
lang: en
status: complete
domain: 14-technical-decision-making
band: M
platform: shared
level: Mid
sidebar_position: 1
prerequisites: [architecture-senior]
outcomes:
  - "Put the rejected option in the PR description, with the reason"
resources:
  - title: "Architecture Decision Records"
    url: "https://adr.github.io/"
    date: "2024-01-01"
  - title: "Documenting architecture decisions — Michael Nygard"
    url: "https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions"
    date: "2011-11-15"
  - title: "When in doubt, write it out — Julia Evans"
    url: "https://jvns.ca/blog/2023/11/12/rules-that-make-writing-work/"
    date: "2023-11-12"
---

# Comparing Options in Writing & Escalating Instead of Guessing

> **Outcome.** Put the rejected option in the PR description, with the reason — the smallest
> unit of decision-making discipline, and the one habit everything in this domain builds on.

## 1. Comparing two or three options and saying why, in writing

Most decisions at Mid band are small enough to fit in a PR description, and that is exactly
where they belong — not in a Slack thread that scrolls away, not in your head where the reason
evaporates the moment someone asks about it in six months.

The habit is mechanical: before writing the code, name the options that were actually on the
table (never more than two or three — a longer list usually means the framing is wrong), and
say in one or two sentences why the other ones lost.

```markdown
## Why a Room migration instead of a manual SQL script

Considered:
1. **Room's `AutoMigration`** — chosen. Generates and validates the migration at compile
   time against the schema export; a hand-written migration can't be checked until runtime.
2. **Hand-written `Migration` object** — rejected. Needed for the one column rename Room's
   auto-migration can't infer on its own (`@RenameColumn` still requires the annotation, but
   the rest of the migration stays generated).
3. **Destructive migration (`fallbackToDestructiveMigration`)** — rejected. Would silently
   drop the offline queue table; acceptable in debug builds, not in a release migration
   touching data users already have on-device.
```

Three things make this worth the extra two minutes:

- **The rejected option is named, not just implied.** "We used Room" tells a reviewer nothing
  about what else was considered. "We rejected destructive migration because it drops the
  offline queue" tells them exactly what risk was weighed and closed off.
- **The reason is the actual reason**, not a restatement of the decision. "Chose Room because
  it's better" is not a reason; "chose Room because the auto-migration is checked at compile
  time and the hand-written alternative isn't" is.
- **It is searchable later.** `git log --grep` or a PR search for "destructive migration" now
  surfaces the moment someone weighed it and said no — which is exactly the question that gets
  re-asked, from scratch, in every codebase that didn't write it down.

> [!TIP]
> If the comparison won't fit in three or four lines, that's a signal the decision is bigger
> than a PR description can hold — which is the cue to write a short doc instead, or escalate
> per the next section, rather than to compress it until it stops making sense.

## 2. Escalating rather than guessing quietly

Not every decision belongs at Mid band. The tell is not seniority, it's **blast radius**: does
getting this wrong cost one PR's worth of rework, or does it commit a subsystem, a team's
roadmap, or a security posture to something hard to undo?

```
Can be decided and documented in the PR:
  - Which existing pattern to follow when two are both valid in this codebase
  - A library already approved for use, picked over another already-approved one
  - A local naming or structuring choice with no cross-module consequence

Needs to be escalated before writing code:
  - Introducing a new third-party dependency nobody has approved yet
  - A choice that changes a public API another team depends on
  - Anything that trades user data handling one way over another
  - A decision you keep re-deriving from first principles because no one who'd
    know the answer has weighed in yet
```

Escalating well looks different from asking a vague question in a channel and waiting. It means
naming the decision, the options, and what you'd pick by default if nobody replies by a stated
time — the same shape as the PR-description habit above, just surfaced *before* the code exists
rather than alongside it:

```markdown
@senior-reviewer — picking between WorkManager and a foreground service for the upload queue.
Leaning WorkManager (survives process death, standard backoff) but it caps chunk size in a way
that might matter for the largest files we support. Will go with WorkManager by EOD Thursday
unless there's a reason not to — flag me if there is.
```

This is not "asking permission for everything." It states a default, a deadline, and the one
fact that makes the decision non-obvious — which is what turns "guessing quietly" (shipping the
first idea and hoping) and "asking about everything" (shipping nothing without a committee) into
a single, fast, defensible middle path.

> [!NOTE]
> Escalating is itself a skill this domain returns to at every band — the Senior unit covers
> deciding when the data is genuinely incomplete rather than just unasked-for, and the Lead unit
> covers who is actually supposed to make each category of call in the first place. This unit is
> only the entry point: notice the blast radius, and say the default out loud before it becomes
> the only option anyone considered.

## Pitfalls & trade-offs

- **Recording the decision but not the rejected option.** "We used Retrofit" carries no
  information a year later; "we used Retrofit over Ktor because the team already had three
  other services on it and the migration cost wasn't worth the marginal benefit" does.
- **Writing the comparison after the fact, to justify a choice already made.** The exercise only
  has value when the options were genuinely live at decision time — a post-hoc comparison reads
  as one option with two straw men attached.
- **Escalating everything, so nothing gets an answer in time.** A default-plus-deadline message
  moves faster than an open-ended question and still leaves room to be overridden.
- **Never escalating, so blast-radius decisions get made by whoever happened to write the code
  that week.** The PR description habit does not substitute for escalation on anything with a
  real blast radius — it's for the decisions genuinely local enough to belong there.
