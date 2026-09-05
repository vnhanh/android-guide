---
id: concurrency-senior-ios
title: Actors, Sendable & Structured Fan-Out (Senior, iOS)
description: Actor reentrancy, Sendable and strict concurrency checking, TaskGroup fan-out, and diagnosing data races with Swift 6 diagnostics and TSan.
tags: [ios, swift, concurrency, actors, sendable, senior]
lang: en
status: complete
domain: 04-concurrency-and-asynchrony
band: S
platform: ios
level: Senior
sidebar_position: 4
prerequisites: [concurrency-mid-ios]
outcomes:
  - "Design the concurrency model for a screen with three concurrent sources and one cancellable write, and say what happens when each fails"
  - "Explain why an await inside an actor method does not hold the actor"
counterpart: concurrency-senior-android
resources:
  - title: "Actors — The Swift Programming Language"
    url: "https://docs.swift.org/swift-book/documentation/the-swift-programming-language/concurrency/#Actors"
    date: "2025-06-01"
  - title: "Sendable and the migration to Swift 6"
    url: "https://www.swift.org/migration/documentation/migrationguide/"
    date: "2025-01-01"
  - title: "TaskGroup"
    url: "https://developer.apple.com/documentation/swift/taskgroup"
    date: "2024-09-01"
  - title: "Diagnosing data races with the Thread Sanitizer"
    url: "https://developer.apple.com/documentation/xcode/diagnosing-memory-thread-and-crash-issues-early"
    date: "2024-09-01"
---

# Actors, Sendable & Structured Fan-Out

> **Outcome.** Design the concurrency model for a screen with three concurrent sources and one
> cancellable write, state what happens when each fails, and explain precisely why an `await`
> inside an actor method does not hold the actor for its duration.

## 1. Actors and the reentrancy bug that surprises everyone once

An `actor` guarantees only one task touches its mutable state at a time — but it guarantees this
**between** suspension points, not across one. The moment an actor method hits an `await`, the
actor is free to service another call. Code written as if the method holds an exclusive lock for
its entire body is the single most common actor bug.

```swift
actor OrderBook {
    private var balance: Int = 0

    // BUGGY: looks atomic, is not. Between the read of `balance` and the
    // await, another call to `withdraw` can interleave and read the same
    // pre-deduction balance.
    func withdraw(amount: Int) async throws {
        guard balance >= amount else { throw InsufficientFunds() }
        try await auditLog.record(amount) // <-- suspension point: actor is reentered here
        balance -= amount // this line assumes nothing changed balance in between — wrong
    }
}
```

Two concurrent calls to `withdraw(amount: 80)` against a balance of 100 can both pass the guard
before either reaches the deduction, overdrawing the account — exactly the race a single-
threaded-looking actor method was supposed to prevent.

```swift
// FIXED: mutate state before the suspension point, or re-validate after it.
actor OrderBook {
    private var balance: Int = 0

    func withdraw(amount: Int) async throws {
        guard balance >= amount else { throw InsufficientFunds() }
        balance -= amount // mutate first — no other call can observe the stale value
        try await auditLog.record(amount) // side effect after state is already consistent
    }
}
```

> [!IMPORTANT]
> This is the answer to "why does `await` inside an actor method not hold the actor": `await`
> only ever means *this task* is suspended. The actor itself has no notion of "still busy for
> this caller" — it simply becomes available to any other queued call the instant the current
> one yields. Kotlin has no direct equivalent to reason from: a `Mutex.withLock { }` block in
> Kotlin *does* hold across a suspension point inside it, which is the exact opposite guarantee
> and the reason this bites Android-trained engineers specifically.

## 2. `Sendable` — the compiler enforcing a rule Kotlin leaves to convention

A type conforming to `Sendable` is one the compiler has verified is safe to pass across a
concurrency boundary — either because it's immutable, or because access is internally
synchronized (an actor, for instance, is implicitly `Sendable`).

```swift
// Value types with Sendable, immutable members conform for free.
struct UserProfile: Sendable {
    let id: String
    let displayName: String
}

// A class needs explicit synchronization to conform honestly.
final class ImageCache: @unchecked Sendable {
    private let lock = NSLock()
    private var storage: [String: UIImage] = [:]

    func image(for key: String) -> UIImage? {
        lock.lock(); defer { lock.unlock() }
        return storage[key]
    }
}
```

Under Swift 6's strict concurrency mode, passing a non-`Sendable` type across an `await` or into
a `Task {}` closure is a **compile error**, not a runtime crash discovered under load. This is
the Swift-side counterpart of Kotlin's thread-confinement convention — except it is checked by
the type system rather than left to whoever wrote the review comment.

## 3. `TaskGroup` — structured fan-out with per-child failure handling

`TaskGroup` is the direct analogue of a coroutine scope launching several children and awaiting
all of them, with an explicit choice about whether one child's failure should cancel the rest.

```swift
struct OrderScreenData {
    let pricing: Pricing
    let inventory: Inventory?
    let reviews: [Review]?
}

func loadOrderScreen(orderId: String) async throws -> OrderScreenData {
    try await withThrowingTaskGroup(of: Void.self) { group in
        var pricing: Pricing!
        var inventory: Inventory?
        var reviews: [Review]?

        group.addTask { pricing = try await self.repository.fetchPricing(orderId) }
        // Independent reads: swallow each one's own failure locally instead of
        // letting it propagate — this is TaskGroup's equivalent of SupervisorJob's
        // isolation, done per-child with try? rather than as a scope-wide policy.
        group.addTask { inventory = try? await self.repository.fetchInventory(orderId) }
        group.addTask { reviews = try? await self.repository.fetchReviews(orderId) }

        try await group.waitForAll()
        return OrderScreenData(pricing: pricing, inventory: inventory, reviews: reviews)
    }
}
```

> [!NOTE]
> This is the parity break worth stating precisely: Kotlin makes supervision a property of the
> **scope** (`SupervisorJob()`, decided once, applied to every child launched into it). Swift
> makes it a property of **how each child's result is consumed** (`try await` propagates, `try?`
> isolates) — decided per child, inside the fan-out itself, not upstream of it.

## 4. Diagnosing data races: Swift 6 diagnostics and the Thread Sanitizer

Swift 6's strict concurrency checking catches a large class of races **at compile time** —
a non-`Sendable` value crossing an actor boundary, or a `@MainActor`-isolated property accessed
from a nonisolated context, is rejected before the binary exists. That is a categorically
different diagnostic experience from Kotlin, where the equivalent mistake compiles and must be
caught by review, a flaky test, or production.

What strict concurrency checking does **not** catch is a race inside code the type system has
no visibility into — `@unchecked Sendable` types with hand-rolled locking, or C/Objective-C
interop. For those, the Thread Sanitizer (TSan) remains the tool: run the app or a targeted test
under Xcode's Thread Sanitizer, which instruments every memory access and reports a race between
two threads with both stack traces, at the cost of significant runtime overhead — enable it for
a targeted debugging session, not for every CI run.

## Pitfalls & trade-offs

- **Assuming an actor method is atomic end to end.** Covered above — audit every actor method
  for state read before an `await` that isn't re-validated after it.
- **`@unchecked Sendable` as a way to silence the compiler.** It is an assertion, not a proof —
  every `@unchecked Sendable` type is a place strict concurrency checking has stopped helping
  you, and TSan is the only remaining safety net for it.
- **Migrating to strict concurrency by annotating everything `@MainActor`.** Identical failure
  mode to the Android habit of defaulting to `Dispatchers.Main` "to be safe" — it compiles, and
  it serializes work that never needed to be serial.
- **Choosing `try await` vs `try?` in a `TaskGroup` without stating the failure policy.** The
  outcome above is only checkable if the design states, per source, what happens on failure —
  "silently degrades" and "fails the whole screen" are both valid answers, but only one is
  intended per source, and it must be a decision, not whichever the first draft happened to use.
