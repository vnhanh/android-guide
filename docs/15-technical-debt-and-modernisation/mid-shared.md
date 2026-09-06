---
id: tech-debt-mid
title: Leaving Code Better Than Found & Naming Debt in a Ticket (Mid)
description: Leaving code better than found at a scale that fits the PR, and naming debt in a ticket instead of copying the same shortcut one more time.
tags: [technical-debt, refactoring, mid]
lang: en
status: complete
domain: 15-technical-debt-and-modernisation
band: M
platform: shared
level: Mid
sidebar_position: 1
prerequisites: [architecture-senior]
outcomes:
  - "File a debt ticket a stranger could pick up, including why it matters and roughly what it costs"
resources:
  - title: "Boy Scout Rule — Uncle Bob"
    url: "https://ronjeffries.com/xprog/articles/032to-boy-scout-rule/"
    date: "2005-01-01"
  - title: "Technical debt quadrant — Martin Fowler"
    url: "https://martinfowler.com/bliki/TechnicalDebtQuadrant.html"
    date: "2019-05-21"
  - title: "Writing a good bug report — Atlassian"
    url: "https://www.atlassian.com/software/jira/guides/issues/how-to-write-a-good-bug-report"
    date: "2024-02-01"
---

# Leaving Code Better Than Found & Naming Debt in a Ticket

> **Outcome.** File a debt ticket a stranger could pick up, including why it matters and roughly
> what it costs — the smallest unit of debt discipline, and the one every larger habit in this
> domain is built from.

## 1. Leaving code better than found, at a scale that fits the PR

The Boy Scout Rule ("leave the campsite cleaner than you found it") is correct advice applied at
the wrong scope more often than it's applied well. At Mid band the scope that matters is: **the
file you already touched, for the reason you already touched it** — not the module, not the
package, not "while I'm in here."

```
In scope for this PR's cleanup:
  - The function you just modified has a misleading name for what it now does — rename it.
  - A now-dead branch in the `if` you just edited (the other branch was removed last quarter
    and nobody deleted the `else`) — delete it.
  - A magic number you just had to look up the meaning of — name the constant.

Out of scope for this PR's cleanup:
  - "While I'm here" reformatting a file you didn't otherwise need to touch.
  - Renaming a class used across forty call sites because the name bothers you today.
  - Restructuring a whole package's layering — that's a Senior/Lead-scale change with its
    own review, not a rider on an unrelated bug fix.
```

The test is not "did this make the code better" — almost any cleanup does. It's **"can a
reviewer tell, from the diff alone, that this change is still about the one thing the PR title
says it's about?"** A PR titled "fix: null pointer on empty cart" that also renames twelve
classes fails that test even when every individual rename is correct, because it makes the
actual fix harder to review and the actual fix harder to revert if something goes wrong.

```kotlin
// Before — touched because the bug is here anyway
fun calcTotal(items: List<Item>): Double {
    var t = 0.0 // t is unclear, and this function is exactly what the bug fix touches
    for (i in items) t += i.price * i.qty
    return t
}

// After — the fix, plus a cleanup that fits the scope of the change already being made
fun calculateTotal(items: List<Item>): Double =
    items.sumOf { it.price * it.quantity }
```

> [!TIP]
> If the cleanup you want to make doesn't fit inside the diff the bug fix already produces,
> that's not a reason to skip it — it's the signal to do exactly what Section 2 describes:
> name it in a ticket instead of doing it silently, right now, at the wrong scope.

## 2. Naming debt in a ticket rather than copying the pattern once more

The failure mode this section exists to stop is not "nobody notices the debt" — engineers
notice constantly. It's that noticing turns into "I'll just copy the existing (bad) pattern
again, since that's clearly what this codebase does," which is how one unaddressed shortcut
becomes ten identical ones, each individually reasonable to write given the precedent already
in front of you.

A debt ticket a stranger can pick up needs three things a one-line "TODO: fix this" does not
carry: **where** the debt actually is, **why it matters** in terms someone who didn't write the
original code can verify, and **roughly what it costs** — to leave, and to fix.

```markdown
## Debt: `UserRepository` bypasses the cache layer on write

**Where:** `UserRepository.updateProfile()` writes directly to the network client and only
updates the local Room cache on the next full sync, unlike every other write path in this
repository (`updateSettings`, `updateAvatar`), which write-through the cache immediately.

**Why it matters:** Any screen reading from the cache after a profile update shows stale data
until the next sync — reproduced by editing a display name, backgrounding the app, and
reopening the profile screen. Filed after the third bug report traced to this exact path
(TICKET-1841, TICKET-1902 both root-caused here).

**Cost to leave:** Every new profile-editing feature that copies this method as a reference
(there is no other example in the file) inherits the same staleness bug. Estimated 2-3 support
tickets/month based on the last quarter's rate.

**Cost to fix:** ~1 day — route the write through the same cache-invalidation helper the other
two methods already use; no schema change, no API change.

**Not doing:** a full rewrite of `UserRepository`'s caching strategy — out of scope; this
ticket is about matching an existing, already-correct pattern in the same file.
```

Compare this to the version that gets silently skipped every time: `// TODO: this bypasses the
cache, someone should fix this`. It has a location and nothing else — no reviewer six months
later can tell whether it's still true, how bad it is, or whether fixing it is an afternoon or a
quarter. The ticket above answers all three without requiring the reader to have been in the
room when it was written.

> [!NOTE]
> Filing the ticket is not a substitute for the Section 1 habit — it's the other half of the
> same discipline. Fix what fits the PR's scope now; name what doesn't, precisely enough that
> whoever picks it up next doesn't have to reconstruct the reasoning from scratch. The Senior
> unit picks up from here for debt at a scale a single PR was never going to hold — a sequenced
> migration rather than a ticket.

## Pitfalls & trade-offs

- **Reformatting or renaming far beyond the change's actual scope.** Makes the real fix harder
  to review and harder to revert independently — even when every individual cleanup is correct
  in isolation.
- **A TODO comment standing in for a ticket.** It has a location and nothing else; six months
  later nobody can tell if it's still true, how much it costs, or who it's for.
- **Copying an existing bad pattern because "that's what this codebase does here."** The
  precedent argument feels like consistency; it's actually compounding — the second and third
  copy make the eventual fix three times as expensive as fixing it at the first occurrence.
- **Filing a debt ticket with no cost estimate on either side.** "Someone should fix this" with
  no cost-to-leave and no cost-to-fix cannot be prioritized against anything else on the
  backlog — it just accumulates, unranked, until someone finally asks and has to start over.
