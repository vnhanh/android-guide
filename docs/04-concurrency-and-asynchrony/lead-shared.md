---
id: concurrency-lead
title: Threading Contracts & Strict-Concurrency Migration (Lead, Android + iOS)
description: Writing an app-wide threading contract, driving a strict-concurrency migration without stopping feature work, and deciding where blocking is permitted.
tags: [android, ios, concurrency, lead, migration]
lang: en
status: complete
domain: 04-concurrency-and-asynchrony
band: L
platform: shared
level: Lead
sidebar_position: 5
prerequisites: [concurrency-senior-android, concurrency-senior-ios]
outcomes:
  - "Write the threading contract and land a migration plan with a per-module sequence"
resources:
  - title: "Migrating to Swift 6"
    url: "https://www.swift.org/migration/documentation/migrationguide/"
    date: "2025-01-01"
  - title: "Kotlin coroutines — structured concurrency guide"
    url: "https://kotlinlang.org/docs/coroutines-guide.html"
    date: "2025-03-01"
  - title: "Android — best practices for coroutines"
    url: "https://developer.android.com/kotlin/coroutines/coroutines-best-practices"
    date: "2024-11-01"
---

# Threading Contracts & Strict-Concurrency Migration

> **Outcome.** Write the threading contract for your app, and land a migration plan with a
> per-module sequence — not a single "turn on strict mode" flag day that nobody can review.

## Why this is a Lead-level artifact, not a Senior one

Every Mid and Senior article in this domain answers "what is the correct concurrency model for
*this* screen." Nobody has answered, for the app as a whole: which scope owns background sync,
whether a repository is allowed to hold its own `CoroutineScope`, what `Sendable` means for this
codebase's shared model layer, or where — if anywhere — a blocking call is still permitted. Left
unanswered, every team invents its own local answer, and the inconsistency shows up as exactly
the bug classes this domain's Mid and Senior articles teach how to diagnose: leaked scopes,
actors reentered mid-mutation, races through a type nobody checked was `Sendable`.

A threading contract is the document that makes those answers organisational rather than
per-file.

## The threading contract — a worked shape

```markdown
# Threading contract — MobileApp

## Scope ownership
- UI-facing state: `viewModelScope` (Android) / `@MainActor` view models (iOS). No exceptions.
- Cross-screen background work (sync, prefetch): a named `AppScope` singleton with
  `SupervisorJob`, owned by the `SyncModule`. No other module may construct its own
  process-lifetime scope — grep for `CoroutineScope(` / `Task.detached` outside `SyncModule`
  in CI (see enforcement below).
- Analytics and logging: fire-and-forget via a dedicated dispatcher queue; never awaited
  by caller code, never allowed to fail a caller's operation.

## Dispatcher / actor policy
- Android: `Dispatchers.IO` for blocking I/O only; `Dispatchers.Default` for CPU-bound
  transforms; `Dispatchers.Main.immediate` for anything touching Compose state.
- iOS: `@MainActor` on every ViewModel and every type SwiftUI reads directly; a distinct
  actor per independently-mutable subsystem (e.g. `actor ImageCache`) rather than one
  giant shared actor, which reintroduces the reentrancy hazard at greater scale.

## Sendability (iOS) / cross-thread data (Android)
- Every type crossing a `Task`/coroutine boundary must be `Sendable` (iOS) or effectively
  immutable — `data class` with `val`-only properties (Android). No `@unchecked Sendable`
  and no shared mutable `var` across a dispatcher hop without an explicit exception recorded
  below, with a name attached.

## Where blocking is permitted
- Nowhere in `:app` or feature modules. The only permitted blocking calls live behind the
  `:data` module's Room/GRDB drivers, already dispatched onto `Dispatchers.IO` / a background
  actor internally, and are never called directly from a ViewModel.

## Exceptions on record
- `LegacyPaymentSdkBridge` wraps a synchronous third-party SDK with no async API; blocking
  call is isolated to its own dispatcher, reviewed 2025-02, revisit when the vendor ships v4.
```

The exceptions section matters as much as the rules: a contract with zero recorded exceptions
either governs a trivial codebase or is being silently violated somewhere nobody wrote down.

## Driving a strict-concurrency migration without stopping feature work

The failure mode to avoid is a single "flip strict mode / enable Sendable checking" change
across the whole codebase — it either blocks all feature work for its duration, or ships
disabled behind a flag that never gets re-enabled once the deadline passes. The sequence that
avoids both:

1. **Inventory first.** Run the compiler's strict-concurrency checking (Swift) or a lint rule
   for hand-rolled scopes (Kotlin) in *report-only* mode across the whole codebase. This
   produces the actual size of the problem — usually smaller than feared, concentrated in a few
   modules, not evenly spread.
2. **Sequence by module, leaves first.** A module with no internal dependents (a shared
   `:core-models` or a leaf feature) can go strict without coordinating anyone else's timeline.
   Modules other teams depend on go last, once their dependencies are already clean — this is
   the direct concurrency-migration analogue of the module-graph sequencing in domain 07.
3. **One PR per module, contract violations fixed as part of it — not suppressed.** A
   `@preconcurrency import` or a blanket `@unchecked Sendable` sprinkled in to make the compiler
   quiet is the migration failing in a way that will not be caught again; each module's PR
   description names what was actually fixed.
4. **Land the contract itself before module 1's PR, not after the last one.** The contract is
   what lets four engineers work on four different modules' migrations in the same sprint
   without inventing four different answers.

## Where blocking is permitted, decided in advance

"Nowhere" is the correct default answer for feature code. The decision that is actually Lead
work is drawing the line for the exceptions that are real: a synchronous third-party SDK with no
async surface, a legacy bridge that cannot be rewritten this quarter, a startup-path
initialization that genuinely must complete before anything else runs. Each exception gets:
where the block happens, why it cannot be removed yet, what it costs (measured, not guessed),
and a date to revisit it. An exception with no revisit date is a permanent one wearing a
temporary label.

## Parity — what carries across the platform boundary, and what does not

**Maps:** structured concurrency ↔ `Task`/`TaskGroup` hierarchy · `Dispatchers.Main` ↔
`@MainActor` · `SupervisorJob` ↔ `TaskGroup` + per-child `try?` · `StateFlow`/`SharedFlow` ↔
`AsyncStream`/`@Observable` · thread confinement by convention ↔ `Sendable` checking.

**Breaks — the three that a shared threading contract must state explicitly for each platform,
because a single sentence covering both is quietly wrong for one of them:**

1. **Cancellation direction.** Kotlin cancellation is a `CancellationException` propagating
   through suspension points whether the code cooperates or not. Swift cancellation is a flag
   that does nothing unless read. A contract clause like "cancelled work stops promptly" is true
   by default on Android and only true on iOS if every `async` function in the call chain checks
   `Task.isCancelled` — which must be an explicit requirement in the iOS half of the contract,
   not an assumption inherited from the Android half.
2. **Enforcement mechanism for main-thread confinement.** `@MainActor` is enforced by the
   compiler at the type level. Kotlin's equivalent — "mutate this only from
   `Dispatchers.Main`" — is a runtime convention with no compiler backing; a violation compiles
   cleanly and fails, if at all, as a `CalledFromWrongThreadException` in the field. The contract
   should not promise the same enforcement strength for both.
3. **Where supervision lives.** Kotlin makes isolation-from-sibling-failure a property of the
   *scope* (`SupervisorJob()`, set once). Swift makes it a property of *how each child's result
   is consumed* inside a `TaskGroup` (`try await` vs `try?`, decided per call site). A contract
   clause describing "independent widgets recover from individual failure" needs a different
   enforcement description on each platform, or engineers on one platform will look for a scope-
   level setting that does not exist there.

## Pitfalls & trade-offs

- **A contract nobody enforces mechanically decays within a quarter.** Land at least the
  cheapest checks — a lint rule flagging `CoroutineScope(` outside the named owner, Swift's
  strict concurrency mode itself — as CI gates, not as a wiki page trusted to social pressure.
- **Migrating by module without a written sequence is still a flag day, just spread out.**
  The sequence itself — which module, which sprint, which dependency must go first — is the
  actual Lead deliverable; "we'll do it incrementally" without an order is not a plan.
- **Treating the contract as finished once written.** The exceptions list is a living part of
  it; a contract that has not changed in a year either governs a codebase that stopped growing
  or has silently stopped being followed.
