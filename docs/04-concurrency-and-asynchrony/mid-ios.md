---
id: concurrency-mid-ios
title: async/await, Task Cancellation & @MainActor (Mid, iOS)
description: Structuring work with Task, checking cancellation deliberately, and keeping UI-bound state on the main actor.
tags: [ios, swift, concurrency, async-await, mid]
lang: en
status: complete
domain: 04-concurrency-and-asynchrony
band: M
platform: ios
level: Mid
sidebar_position: 2
topic: concurrency-mid
leaf: iOS
prerequisites: [fundamentals-generics-kotlin, fundamentals-memory-management-swift, platform-process-lifecycle-ios, platform-background-work-ios, platform-permissions-ios]
outcomes:
  - "Write a screen whose in-flight work stops when the screen goes away, and demonstrate it stopping"
  - "Explain why a Task that never checks isCancelled keeps running after the view disappears"
counterpart: concurrency-mid-android
resources:
  - title: "Concurrency — The Swift Programming Language"
    url: "https://docs.swift.org/swift-book/documentation/the-swift-programming-language/concurrency/"
    date: "2025-06-01"
  - title: "Task cancellation handlers"
    url: "https://developer.apple.com/documentation/swift/withtaskcancellationhandler(operation:oncancel:)"
    date: "2024-09-01"
  - title: "Observation — @Observable"
    url: "https://developer.apple.com/documentation/observation"
    date: "2024-09-01"
  - title: "AsyncSequence"
    url: "https://developer.apple.com/documentation/swift/asyncsequence"
    date: "2024-09-01"
demo: concurrency-cooperative-cancellation
---

# async/await, Task Cancellation & @MainActor

> **Outcome.** Write a screen whose in-flight work stops when the screen disappears, prove it
> stopping, and be able to explain — precisely, not by analogy to Kotlin — why an unchecked
> `Task` does not stop on its own.

## 1. `async`/`await` and `Task` — where the work actually lives {concept=concurrency-mid/scope-and-dispatch}

An `async` function, like Kotlin's `suspend fun`, can pause without blocking its thread. The
difference that trips up an Android-trained reader first: there is no scope object you pass
around. A `Task` **is** the unit of cancellable, structured work, and it starts running
immediately when created.

```swift
@Observable
final class ProfileViewModel {
    private(set) var state: ProfileUiState = .loading
    private let repository: UserRepository
    private var loadTask: Task<Void, Never>?

    init(repository: UserRepository) { self.repository = repository }

    func load(userId: String) {
        // Cancel any in-flight load before starting a new one — Task does not
        // do this for you the way viewModelScope.launch replacing a job does.
        loadTask?.cancel()
        loadTask = Task {
            state = .loading
            do {
                let profile = try await repository.fetchProfile(userId)
                if Task.isCancelled { return }
                state = .content(profile)
            } catch {
                if Task.isCancelled { return }
                state = .failed(error)
            }
        }
    }

    deinit {
        loadTask?.cancel()
    }
}
```

There is no dispatcher argument to choose here — `await` on an `async` function backed by
URLSession or a database driver already suspends off the calling thread; the concurrency
runtime schedules the resumption. The decision that *does* need to be made explicitly is which
**actor** a given piece of code runs on, covered next.

## 2. Cancellation is a flag — checking it is the whole job {concept=concurrency-mid/cancellation}

This is the fact that surprises every engineer who has internalised Kotlin's cancellation model
first, and it is worth stating precisely: **calling `task.cancel()` sets `Task.isCancelled` to
`true` and nothing else.** No suspension point automatically throws. No code stops. A `Task`
that never reads the flag runs to completion whether anyone still wants its result or not.

```swift
Task {
    // WRONG assumption carried over from Kotlin: "await points check cancellation
    // for me". They do not, unless the function you're calling explicitly checks
    // and throws — many Foundation APIs do (URLSession does), many of your own
    // async functions will not unless you write the check.
    let a = try await repository.fetchPage(1) // may or may not throw on cancellation
    let b = try await repository.fetchPage(2) // runs even if the view is long gone,
                                               // unless fetchPage checks isCancelled itself
}
```

The two idioms that make cancellation actually take effect:

```swift
// 1. Throw explicitly at a point you control.
func computeReport() async throws -> Report {
    try Task.checkCancellation() // throws CancellationError if cancelled
    let rows = try await database.fetchRows()
    try Task.checkCancellation()
    return summarize(rows)
}

// 2. For non-throwing work, poll the flag.
func renderFrames() async {
    for frame in frames {
        if Task.isCancelled { return }
        await render(frame)
    }
}
```

> [!IMPORTANT]
> This is the load-bearing platform difference in this domain. Kotlin's `CancellationException`
> propagates through suspension points whether the code cooperates or not — cancellation is the
> default, cooperation is opt-out via `NonCancellable`. Swift inverts it: running to completion
> is the default, cancellation is opt-in via an explicit check. A port of a Kotlin cancellation
> strategy that assumes the Kotlin default will silently do nothing on iOS.

## 3. `@MainActor` — UI confinement enforced by the compiler, not by convention

`@MainActor` marks a type or function as only ever running on the main actor — mutating its
state from anywhere else is a compile error under Swift's strict concurrency checking, not a
runtime crash discovered later.

```swift
@MainActor
@Observable
final class ProfileViewModel {
    private(set) var state: ProfileUiState = .loading
    // Every property and method here is main-actor-isolated. The compiler
    // rejects, at build time, any call into this type from a non-main-actor
    // context without an explicit `await`.
}
```

Compare this to Android's equivalent convention: "update `_uiState` only from `Dispatchers.Main`
or via `MutableStateFlow`'s thread-safe emit" is enforced by discipline and code review.
`@MainActor` is enforced by the type checker. A background-thread mutation of `@MainActor`
state is a compile error in Swift; the closest Kotlin equivalent — mutating a plain `var` from
the wrong dispatcher — compiles cleanly and fails at runtime, if at all.

## 4. `AsyncStream` and `@Observable` — Flow's nearest neighbours {concept=concurrency-mid/reactive-streams}

`AsyncStream` is the closest analogue to a cold Kotlin `Flow`: a sequence of values produced
over time, consumed with `for await`.

```swift
struct UserRepository {
    func observeProfile(userId: String) -> AsyncStream<ProfileUiState> {
        AsyncStream { continuation in
            let task = Task {
                for await row in database.observeUser(userId) {
                    continuation.yield(.content(row))
                }
            }
            continuation.onTermination = { _ in task.cancel() }
        }
    }
}
```

For UI state specifically, `@Observable` (iOS 17+) plays the role `StateFlow` plays on Android:
SwiftUI observes property access directly and re-renders on change, without an explicit
publisher type. There is no `SharedFlow` equivalent with configurable replay for one-off
events — the idiomatic substitute is a plain method call or a `PassthroughSubject`-style
one-shot signal, decided per-case rather than reached for as a named type.

## Pitfalls & trade-offs

- **Assuming cancellation propagates like Kotlin's.** Covered above — this is the single most
  expensive assumption an Android-trained engineer carries into Swift concurrency.
- **Forgetting to cancel the previous `Task` before starting a new one.** Unlike replacing a
  `Job` in a scope, assigning a new value to a `Task` variable does not cancel the old one —
  both keep running unless you call `.cancel()` on the old reference first.
- **Retain cycles through `Task { self... }` closures.** A `Task` closure captures `self`
  strongly by default; for a long-running or detached task inside a class, `[weak self]`
  matters exactly as it does for any other escaping closure.
- **Treating `@MainActor` as free.** Every hop onto the main actor from a background context is
  a real suspension point with real cost; over-annotating a whole module `@MainActor` to make
  the compiler stop complaining reintroduces the "everything touches the main thread" bug class
  `@MainActor` exists to prevent.
- **Not testing the disappearance path.** As on Android, the outcome is "demonstrate it
  stopping" — a test that starts a `Task`, calls `.cancel()`, and asserts the observable state
  never reaches `.content` is what makes this checkable.
