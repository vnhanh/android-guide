---
id: concurrency-interview
title: Concurrency & Asynchrony — Interview Questions
description: At least 8 questions per level on coroutines, structured concurrency, cancellation, Flow/AsyncStream, actors and Sendable, race diagnosis, and threading contracts across Android and iOS.
tags: [interview, coroutines, structured-concurrency, actors, sendable, mid, senior, lead]
lang: en
status: complete
domain: 04-concurrency-and-asynchrony
platform: shared
band: X
level: Mid
sidebar_position: 99
kind: interview
prerequisites: []
outcomes:
  - "Answer, without notes, the core interview questions this domain's Mid, Senior and Lead articles each teach"
---

# Concurrency & Asynchrony — Interview Questions

## Mid

Q: What actually determines which thread a Kotlin coroutine runs on?
A: The dispatcher passed to `launch`/`withContext` — `Dispatchers.Main` for UI work, `Dispatchers.IO` for blocking I/O, `Dispatchers.Default` for CPU-bound work — a coroutine has no thread of its own; it's suspended and resumed on whichever dispatcher its current context specifies.

Q: In Swift, what determines where an async function's work actually executes?
A: Its actor isolation — an `@MainActor`-isolated function's body runs on the main actor; an unannotated async function runs on whichever executor the calling Task or actor provides, which is why "where does this actually run" requires checking isolation annotations, not just seeing `async`.

Q: Why is Kotlin's coroutine cancellation called "cooperative," and what does that actually require from the code being cancelled?
A: Cancellation only takes effect at suspension points or explicit cancellation checks — a coroutine running a tight non-suspending loop won't notice it's been cancelled until it hits a checkpoint, so cooperative cancellation requires the code itself to check or suspend periodically, not just requesting cancellation and assuming it stops.

Q: In Swift concurrency, how do you actually check whether a Task has been cancelled, and why is checking necessary at all?
A: `Task.isCancelled` or `try Task.checkCancellation()` — cancellation is a flag set on the task, not a thrown interrupt, so code has to actively check it (typically inside a loop or between steps) for cancellation to have any effect on long-running work.

Q: What's the difference between StateFlow, SharedFlow, and a cold Flow?
A: A cold Flow starts producing values fresh for each collector and produces nothing until collected; StateFlow is a hot, state-holding flow that always has a current value and replays it to new collectors; SharedFlow is a hot flow for events, configurable for replay and buffering but without StateFlow's "always has a current value" guarantee.

Q: What's the closest Swift equivalent to Kotlin's Flow, and what's the coverage gap?
A: AsyncStream for a sequence of asynchronously-produced values, and @Observable for reactive state that views can watch — but neither alone gives you StateFlow's specific combination of "always has a current value, replays it on subscribe, and is safe to observe from multiple places," which typically needs to be composed by hand.

Q: Why does collecting a Flow need to be lifecycle-aware on Android, and what does repeatOnLifecycle actually solve?
A: An unscoped Flow collection keeps running (and holding resources, memory, and CPU) even after the screen is no longer visible; `repeatOnLifecycle` automatically starts and cancels the collection block as the lifecycle crosses the given state, so a backgrounded screen's collection stops instead of leaking work.

Q: What does @MainActor actually enforce that a plain "run this on the main thread" convention doesn't?
A: The compiler checks at compile time that main-actor-isolated code is only called from a main-actor context (or with an explicit await to hop onto it) — a convention can be violated by a single forgotten dispatch call with no error until it crashes at runtime; @MainActor makes the violation a compile error instead.

## Senior

Q: What's the actual difference between a Job and a SupervisorJob in Kotlin's structured concurrency?
A: Under a plain Job, one child's failure cancels the parent and all its siblings; under a SupervisorJob, a child's failure is isolated to that child, letting siblings continue — the choice is a property of the scope, not something decided per coroutine launched into it.

Q: What does Swift's TaskGroup give you for structured fan-out that a plain array of Tasks doesn't?
A: Per-child failure handling and structured cancellation — if one child task throws, the group can be configured to cancel the remaining children automatically, and the group as a whole doesn't return until every child has completed or been cancelled, unlike independently-launched Tasks with no shared lifecycle.

Q: What does a suspend function actually compile to under the hood in Kotlin?
A: A continuation-passing state machine — the compiler transforms the function into a state machine where each suspension point becomes a state transition, and the continuation captures exactly the local state needed to resume from that point; this is why a suspend function's stack trace and behavior differ from an ordinary function's.

Q: What does Sendable enforce in Swift that Kotlin leaves entirely to convention?
A: Sendable is a compiler-checked guarantee that a type is safe to pass across concurrency domains (actors, tasks) — the compiler rejects passing a non-Sendable type across an isolation boundary at compile time; Kotlin has no equivalent check, so the same class of cross-thread-safety mistake compiles fine and only fails, if ever, at runtime.

Q: What's the actual difference between buffering, conflation, and backpressure on a Flow?
A: Buffering queues values a slow collector hasn't consumed yet up to a limit; conflation drops all but the most recent value when the collector falls behind, so the collector only ever sees the latest state; backpressure describes the general problem both are strategies for — a producer emitting faster than a collector can consume.

Q: Why does a coroutine launched with `Dispatchers.Default` sometimes still block the UI, even though it's not on the main dispatcher?
A: `Dispatchers.Default` shares a limited thread pool sized to CPU cores — a burst of CPU-heavy coroutines can starve that pool, and any coroutine elsewhere (including one that eventually needs to hop back through a shared executor) can end up waiting behind them; "not the main dispatcher" doesn't mean "can't create contention that indirectly delays UI work."

Q: What's the actor reentrancy bug that "surprises everyone once," and why does it happen despite actors being supposed to serialize access?
A: An actor method that awaits inside its body can be re-entered by another call to the same actor during that suspension — the actor serializes non-suspended execution, but a suspension point is a real gap where the actor's state can be mutated by a different call before the first one resumes, which reads like "actors prevent races" until this specific case breaks that assumption.

Q: How do you actually diagnose a leaked coroutine scope versus a genuine deadlock?
A: A leaked scope shows a coroutine still active long after its owning component (Activity, ViewModel) should have cleared it — visible via a coroutine debugger or scope leak detection tooling — while a deadlock shows two or more coroutines each waiting on a resource the other holds, visible as both threads permanently blocked with no forward progress; the tooling and the pattern of "stuck" look different once you know what to check.

## Lead

Q: Why is a threading contract a Lead-level artifact rather than something each Senior engineer decides per feature?
A: Because a per-feature decision by whoever happens to write it produces an inconsistent codebase where every module reasons about concurrency differently — the Lead-level job is stating the app-wide default (which dispatcher/actor for which kind of work, where blocking is permitted) once, so individual decisions become "does this fit the contract," not "what should the contract be."

Q: How do you drive a strict-concurrency migration (Swift 6 strict mode, or an equivalent Kotlin coroutine audit) without stopping feature work entirely?
A: A per-module sequence with a partial/gradual adoption mechanism (Swift's per-target strict concurrency setting, or a lint rule ratcheted module by module) rather than one flag day — this lets migrated modules get the compiler's guarantees immediately while unmigrated modules keep shipping features under the old rules until their turn comes.

Q: What belongs in a written dispatcher/actor policy, concretely?
A: Which dispatcher or actor is the default for which category of work (UI updates, network calls, disk I/O, CPU-bound computation), stated specifically enough that a code reviewer can cite it rather than debate it — the same "named and citable" bar as any other enforced team standard.

Q: How do you decide where blocking is permitted at all, as a team-wide policy?
A: Name the specific contexts (a background worker thread, a dedicated blocking dispatcher) where a blocking call is acceptable, and ban it everywhere else explicitly — "don't block the main thread" alone is too vague to review against; a specific list of permitted contexts is.

Q: What does "parity across the platform boundary" mean for concurrency specifically, and where does it break down?
A: The Kotlin/Swift concurrency models solve the same problems (scoped work, structured cancellation, isolation) with different mechanisms and different compiler guarantees — Sendable's compile-time enforcement has no Kotlin equivalent, so a threading contract that assumes identical guarantees on both platforms will be wrong on whichever platform doesn't actually have the stronger check.

Q: How do you record an intentional exception to the threading contract, rather than letting it become an unreviewed precedent?
A: A dated, linked review comment at the exception site explaining why the deviation was accepted — the same "reviewed:" comment discipline as any other team-standard escape hatch — so the next engineer sees it was a deliberate, reviewed call, not an oversight to quietly copy elsewhere.

Q: How do you price a strict-concurrency migration's cost against what it buys, the way any other toolchain investment should be priced?
A: State the migration cost in engineer-days (from a report-only compiler pass across all modules), and state what bug class it closes, citing specific past incidents that would have been compile errors under the stricter checking — the same discipline as pricing any other toolchain upgrade, not "it's the newer/safer option" alone.

Q: What's the actual failure mode of relying on code review alone to catch a concurrency-contract violation, at scale?
A: Consistency depends entirely on which reviewer happens to be assigned and how deep their concurrency knowledge is that day — a subtle Sendable violation or an unscoped coroutine launch is exactly the kind of thing an inconsistent, judgment-dependent review process misses reliably as the team and codebase grow.
