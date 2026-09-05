---
id: data-lead
title: The Data Consistency Contract (Lead, Android + iOS)
description: Data and sync architecture ownership, stating consistency guarantees Product can plan against, source of truth per data class, and retention/minimisation with Legal.
tags: [android, ios, lead, data-architecture, privacy]
lang: en
status: complete
domain: 05-data-persistence-and-offline
band: L
platform: shared
level: Lead
sidebar_position: 5
prerequisites: [data-senior-android, data-senior-ios]
outcomes:
  - "Write the consistency contract: what a user is promised about their data after a conflict, an offline period, and a reinstall"
resources:
  - title: "WorkManager ↔ BGTaskScheduler reliability comparison"
    url: "https://developer.android.com/develop/background-work/background-tasks/persistent"
    date: "2025-03-01"
  - title: "GDPR — data minimisation principle"
    url: "https://gdpr-info.eu/art-5-gdpr/"
    date: "2018-05-25"
---

# The Data Consistency Contract

> **Outcome.** Write the consistency contract: what a user is actually promised about their
> data after a conflict, an offline period, and a reinstall — in language Product can plan
> features against and Support can answer tickets against, not just an internal engineering
> note.

## Why this needs to be written down, not just built correctly

The Senior articles in this domain each state a real, checkable rule — a one-sentence conflict
rule, an explicit answer for days of no background sync. Individually correct decisions per
feature do not add up to a consistent promise to the user unless something states, across
features, what "your data is safe" actually means here. Product needs this to plan a feature
that depends on data surviving a reinstall; Support needs it to answer "why did my offline
edits disappear" without guessing; Legal needs the retention half of it to sign off on what is
kept and for how long.

## The contract — a worked shape

```markdown
# Data consistency contract — MobileApp

## After a conflict
Task completion state: last-write-wins by server timestamp. A concurrent edit made
on another device, older than the winning edit, is silently discarded — the user is
never shown a merge conflict for this field, which is an accepted trade-off recorded
in domain 05's Senior article.
Note text: version-vector conflict detection; a genuine concurrent edit is surfaced
to the user as "this note was edited elsewhere — keep mine / keep theirs," never
silently resolved.

## After an offline period
Up to 7 days offline: all local edits sync automatically once connectivity returns,
no data loss, no user action required.
Beyond 7 days offline: local edits older than the retention window (see below) may
have already been superseded server-side if another device edited the same records;
the app surfaces which specific items require a manual conflict resolution on
reconnection rather than silently discarding either side past this window.

## After a reinstall
Signed-in state and local-only drafts do not survive a reinstall — this is stated
product behaviour, not a bug, because drafts are intentionally device-local and
never synced (a stated trade-off, see domain 05's Mid article on cache boundaries).
Server-synced data (tasks, notes once synced at least once) is restored in full on
first sign-in after reinstall.

## Source of truth per data class
- Task list, note content: server is authoritative; device is a cache with the
  sync/conflict rules stated above.
- Local drafts, in-progress unsent edits: device is authoritative until synced;
  never overwritten by a server value for a record that hasn't synced yet.

## Retention, minimisation and privacy (with Legal)
- Deleted-task tombstones retained 30 days server-side to support conflict
  resolution across devices, then permanently purged — stated explicitly because
  "delete" must mean something specific and time-bound for GDPR/CCPA compliance,
  not "removed from the list the user sees."
- No local caching of a field Legal has flagged as sensitive beyond the minimum
  needed for the current session (see the minimisation review log, reviewed
  quarterly alongside the OWASP audit in domain 10).
```

## Stating consistency guarantees so Product can plan against them

A guarantee stated only in engineering terms ("LWW by timestamp") is not something Product can
design a feature against. The contract's job is translating each rule into a product-legible
consequence — "a user editing the same note on two devices while offline will see a merge
prompt" is a sentence Product can put in a feature spec or a support macro; "version-vector
conflict detection" is not, even though it's the same fact.

## Pitfalls & trade-offs

- **A consistency contract that exists only as scattered code comments across the Senior
  articles' implementations.** It needs to be one document Product, Support and Legal can
  actually read — the same "point at the standard, not at seniority" principle domain 03's Lead
  article applies to UI review applies here to data-behaviour disputes.
- **Stating a guarantee that isn't actually true of the current implementation.** The contract
  must be checked against the real Senior-level design decisions (LWW vs version vectors vs
  CRDTs, per data class) — a contract that promises more consistency than the implementation
  delivers is a support incident and a trust problem waiting to happen.
- **Treating retention as an engineering storage-cost decision only.** It is also a compliance
  boundary — "delete" needs a stated, time-bound meaning Legal has actually reviewed, not an
  assumption that removing a row from the main table constitutes deletion.
- **Writing the contract once and never updating it as new features change a data class's
  conflict rule.** A contract describing behaviour a recent feature quietly changed is worse
  than no contract — it actively misleads Support and Product rather than merely being silent.
