---
id: data-interview
title: Data, Persistence & Offline — Interview Questions
description: At least 8 questions per level on local persistence choice, key-value storage, caching, optimistic UI, durable retry queues, conflict resolution, sync design, and the data consistency contract across Android and iOS.
tags: [interview, room, swiftdata, sync, conflict-resolution, offline, mid, senior, lead]
lang: en
status: complete
domain: 05-data-persistence-and-offline
platform: shared
band: X
level: Mid
sidebar_position: 99
kind: interview
prerequisites: []
outcomes:
  - "Answer, without notes, the core interview questions this domain's Mid, Senior and Lead articles each teach"
---

# Data, Persistence & Offline — Interview Questions

## Mid

Q: How do you actually verify a Room migration is correct, rather than trusting the migration code compiles?
A: Write a migration test that opens a database created with the old schema, runs the migration, and asserts the resulting schema and data match expectations — a migration that compiles can still silently corrupt or drop data on a real upgrade path nobody exercised.

Q: When would you reach for SwiftData versus Core Data versus GRDB for local persistence, and why isn't there one universal right answer?
A: SwiftData for a new app wanting the least boilerplate with acceptable maturity trade-offs, Core Data for an existing codebase already invested in it or needing its more mature tooling, GRDB when you need direct SQL control or performance characteristics the higher-level frameworks don't expose — the right choice depends on existing investment and how much control the app actually needs, not which is newest.

Q: What's the "secure key-value boundary" DataStore sits on, and why doesn't Room replace it?
A: DataStore is for small, simple key-value settings and preferences with type-safe reads via Kotlin Flow, not for structured relational data or anything requiring queries across records — Room and DataStore solve different problems, and using Room for a handful of boolean flags is over-engineering the same way DataStore for relational data is under-engineering it.

Q: Why doesn't UserDefaults belong in the same tier of trust as Keychain, even though both are easy one-line API calls?
A: UserDefaults stores data in a plist file with no encryption guarantee, readable by anything with file-system access to the app's sandbox; Keychain is the OS-backed secure storage specifically designed for credentials and secrets — storing a token or password in UserDefaults out of convenience is a real security gap, not a style choice.

Q: What determines when a cached value should actually be invalidated, rather than just picking an arbitrary TTL?
A: The actual staleness tolerance of the data itself — a user's own profile changes rarely and can cache longer, a live inventory count needs near-immediate invalidation — picking one blanket TTL for every cached resource is a guess dressed up as a policy.

Q: What problem does URLCache's HTTP-level caching solve that an app-level cache doesn't, and vice versa?
A: URLCache respects the server's own cache-control headers automatically, so a backend team can tune caching behavior without an app release; an app-level cache can hold domain objects (not raw HTTP responses) and survive across sessions or offline periods in ways URLCache isn't designed for — they solve adjacent but distinct problems and often coexist.

Q: Why is Paging (Android's Paging library) more than "just load more data when the user scrolls"?
A: It manages a windowed view over a potentially huge dataset, handling placeholder states, incremental loading from both database and network, and configuration changes without reloading already-loaded pages — a hand-rolled "load more" implementation typically misses several of these correctness details until a specific edge case (rotation mid-load, rapid scroll) surfaces them.

Q: What's the concrete risk of skipping a Room migration test before shipping a schema change?
A: A user upgrading from an old app version with real data can hit a migration path that was never actually exercised in development (which usually only tests fresh installs), silently corrupting or losing their existing data on that specific upgrade path.

## Senior

Q: What does "repository pattern as single source of truth" actually mean in practice, beyond "put the data access code in one class"?
A: Every other part of the app (UI, business logic) reads data through the repository's own model, never directly from the network response or the database row — this is what lets the repository decide, invisibly to its callers, whether a given read comes from cache or triggers a refresh, and lets that decision change later without touching every call site.

Q: Why is a durable retry queue on WorkManager genuinely harder to get right than "just retry on failure"?
A: A durable queue must survive process death and app restarts, handle retry backoff without hammering the server, and avoid duplicate submission if the same work is enqueued twice — a naive in-memory retry loses all pending work the moment the process dies, which for a real offline-tolerant feature defeats the entire point of queuing it.

Q: Why is a durable queue on iOS's BGTaskScheduler genuinely harder than the equivalent on Android?
A: BGTaskScheduler offers no guaranteed execution at all (see the Platform & OS Internals domain) — a durable queue there has to survive not just process death but also potentially days of the OS simply never running the scheduled task, which means the queue's persistence and eventual-flush logic has to work correctly even when "eventually" might mean "the next time the app happens to be foregrounded by the user," not a scheduled background window.

Q: When is Last-Write-Wins conflict resolution actually the honest choice, versus when does it silently lose data?
A: LWW is honest when losing a stale write is an acceptable, expected trade-off (a "last edited wins" note-taking field where users understand only one edit survives); it silently loses data when two legitimate concurrent edits to different aspects of the same record both matter and one is discarded without anyone being told a conflict even happened.

Q: What do version vectors give you that a simple timestamp-based LWW doesn't?
A: They track causality — whether one version is a descendant of another, or whether two versions diverged independently — which lets a sync engine detect a genuine conflict (two independent edits) versus a simple linear update, rather than a raw timestamp comparison that can't tell the difference and just picks whichever clock reads later.

Q: When are CRDTs actually worth the complexity for a mobile sync engine, versus overkill?
A: When the data structure genuinely needs conflict-free merging without a central authority deciding the outcome (collaborative editing, distributed counters) — for the common case of "one record, one owner, occasional conflicting edits," a CRDT's complexity and storage overhead usually isn't worth it compared to a simpler LWW or version-vector approach with clear conflict semantics.

Q: What does "partial sync over a mutable set" mean, and why is it harder than syncing a single, complete dataset?
A: The synced collection itself can change shape between sync cycles — items added, removed, or reordered by other clients — so a sync engine has to reconcile which items are still relevant, which were deleted elsewhere, and which are genuinely new, rather than just diffing two snapshots of a dataset that was assumed to be fixed.

Q: How do you decide whether CloudKit is sufficient for a sync engine, versus building a custom sync backend?
A: CloudKit is sufficient when the app's sync needs fit its data model and conflict-resolution primitives and the app doesn't need cross-platform sync (CloudKit is Apple-ecosystem only) — a custom backend becomes necessary when the app needs Android parity, a conflict-resolution strategy CloudKit doesn't support natively, or server-side logic beyond simple record storage.

## Lead

Q: Why does the data consistency contract need to be written for Product and Support, not just engineering?
A: Because "what happens to a user's data after a conflict, an offline period, or a reinstall" is a product-facing promise with real support-ticket consequences — an engineering-only note that says "eventually consistent" doesn't tell Support what to say when a user reports lost data, or tell Product what's safe to promise in a feature spec.

Q: What does "source of truth per data class" mean, and why can't one blanket answer cover a whole app?
A: Different kinds of data have genuinely different authority — a user's own draft content might treat the local device as authoritative until synced, while a shared team document must treat the server as authoritative to avoid silent overwrites — naming the source of truth per data class, not per app, is what keeps the conflict-resolution strategy actually matched to each data class's real risk.

Q: How do you write down what happens "after a conflict" so it's actually testable, not just a philosophy statement?
A: State the specific mechanism per data class (LWW, version vector, manual merge UI) and the specific observable outcome a test can assert against — "we resolve conflicts sensibly" isn't testable; "the most recently synced edit wins, and the loser is not silently discarded but logged for the affected fields" is.

Q: What does "retention and minimisation with Legal" actually require from an engineering team, beyond deleting old data eventually?
A: Explicitly naming what data is collected, why, how long it's retained, and building the actual deletion/anonymization mechanism — GDPR-style regulations require this to be an enforceable, auditable process, not a vague intention, so "we should probably delete old data" has to become a specific retention period with a real mechanism that runs.

Q: How do you decide whether a stated consistency guarantee is strong enough for Product to plan a feature against?
A: Ask whether the guarantee, as written, would let Product answer a specific user-facing question ("if I edit this offline and someone else edits it too, what happens") without further engineering clarification — if the answer requires "it depends" beyond what's already stated, the guarantee isn't specific enough yet.

Q: What's the actual cost of not stating the "days of no background execution" behavior explicitly for an iOS-dependent sync feature?
A: A support or product team unaware of BGTaskScheduler's best-effort nature will treat a delayed sync as a bug rather than expected platform behavior, escalating incidents that are actually the documented behavior of a system nobody wrote down and shared outside engineering.

Q: How do you decide whether a reinstall should treat local data as gone or recoverable, as a policy rather than an accident of implementation?
A: State it explicitly per data class based on where the actual source of truth lives — data whose source of truth is the server should transparently re-sync on reinstall with no user-visible loss; data whose source of truth was only ever local (an unsynced draft) is genuinely gone, and the user should be told that plainly rather than discovering it.

Q: How do you keep the consistency contract from becoming stale as new data classes and sync behaviors get added over time?
A: Make updating the contract a required part of the review checklist for any change that introduces a new data class, sync mechanism, or conflict scenario — the same "named mechanism, not a wiki page nobody re-reads" discipline that keeps any other team standard from decaying as the codebase grows past the people who remember the original decision.
