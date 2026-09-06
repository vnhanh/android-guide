---
id: fundamentals-error-handling-swift
title: Error Handling in Swift — Structural throws/try, Untyped Until You Add an Enum
description: How Swift's throws/try/catch enforces the call shape without ever typing which errors, and when a Result-style enum earns its place over a plain throw.
tags: [error-handling, exceptions, result-type, swift, mid, senior, lead]
lang: en
status: complete
domain: 01-programming-fundamentals
platform: shared
band: X
level: Mid
sidebar_position: 5
topic: error-handling
leaf: Swift
prerequisites: []
outcomes:
  - "Explain what Swift's throws/try structurally enforces, and what it never tells the caller"
  - "Design a typed Result-style enum for an expected failure mode"
resources:
  - title: "Error handling — The Swift Programming Language"
    url: "https://docs.swift.org/swift-book/documentation/the-swift-programming-language/errorhandling/"
    date: "2025-06-01"
---

# Error Handling in Swift — Structural throws/try, Untyped Until You Add an Enum

Every operation that touches the network, a file, or user input can fail, and every language gives
you two fundamentally different ways to say so. One is a fire alarm: it interrupts whatever you
were doing and you cannot walk past it pretending you didn't hear it — that's an exception. Swift's
version of the alarm is structural but not specific about what set it off.

## Mid {concept=error-handling/checked-vs-unchecked}

**Interview question: "When does Swift force you to handle a failure, and when can you ignore
it?"**

**Swift uses `throws`/`try`/`catch`**: a function marked `throws` must be called with `try`, and
the error must be handled or re-thrown by the caller. Unlike Java, this is enforced structurally —
you cannot forget the `try` — but it is not *typed*: `throws` alone never says which errors, only
that some `Error` might come out.

```swift
func fetchProfile(id: String) async throws -> UserProfile { /* ... */ }
let profile = try await fetchProfile(id: "42") // must be try — compiler enforces the call shape
```

**Follow-up an interviewer asks next:** "So does `try` guarantee the failure is actually handled
meaningfully?" No — it only guarantees the call site acknowledges *that* a throw could happen, not
what to do about it. `try?` silently converts the failure to `nil` and `try!` crashes on failure;
both compile without a `catch` block anywhere near the call.

**Pitfall at this level:** treating `try` as proof a failure is actually handled — `try?` throws
away the error entirely, converting it to `nil`, which can look identical in code review to a
properly handled `do/catch`.

## Senior {concept=error-handling/expected-failure}

**Interview question: "When do you reach for a typed Result/enum instead of throwing?"**

Throwing is right for the same-flow case: call it, handle it, move on. A typed Result earns its
place when a failure is *expected* — not exceptional — and the caller needs to store it, compare
it, or handle it later than the call site, or when you want the compiler to guarantee every outcome
was considered.

**Swift's answer is an enum** — a closed set of named cases the compiler can check for
exhaustiveness in a `switch`, unlike a bare `throws` which never names its failure modes:

```swift
enum FetchResult<T> {
    case success(T)
    case notFound(id: String)
    case networkError(Error)
}
func fetchUser(id: String, usingCache: Bool = true) async -> FetchResult<User>
```

This mirrors Kotlin's sealed interface exactly — same three outcomes, same reasoning: a nullable or
untyped-`throws` return conflates every failure reason into one undifferentiated signal, while the
enum names each one as its own case, checked exhaustively by `switch`.

**Follow-up:** "So four languages (Kotlin, Swift, Dart, TypeScript) all land on roughly the same
Result shape — what's specific to Swift here?" Swift's own built-in `Result<Success, Failure>` type
exists too, and unlike Kotlin's stdlib `Result<T>`, it's generic over the failure type — so
`Result<User, FetchError>` where `FetchError` is itself an enum gets you both the standard-library
convenience and the named-case exhaustiveness in one type.

**Pitfall at this level:** using a bare `throws` for an expected, multi-reason failure instead of a
typed enum or `Result<Success, Failure>` — the caller can catch *an* error but has no compiler help
distinguishing which one without inspecting it at runtime.

## Lead {concept=error-handling/team-contract}

**Interview question: "How do you decide, as a team, which failures are exceptions and which are
Result cases — and how do you make sure nobody silently swallows one?"**

Naming the mechanism, in order: (1) a written convention — for example, "network and parse
failures the user can act on (retry, fix input, see a message) are Result cases; programmer errors
and truly unrecoverable states (a violated invariant, an impossible branch) are exceptions" — so
the choice isn't re-litigated per pull request; (2) a lint rule (SwiftLint) banning `try?` in
contexts where the error should be surfaced, and flagging empty `catch` blocks, so "swallowed
silently" stops being a matter of individual discipline; (3) tying this to observability: a
swallowed error (via `try?` or an empty `catch`) is invisible to crash reporting, which is the
actual reason it's dangerous rather than merely untidy — the failure still happened, but nothing
downstream ever finds out.

This is the depth angle for error handling specifically — see the Tech Lead Roadmap article for
how this connects to the wider breadth a Tech Lead needs.

## Cross-language comparison

See the cross-language cheat sheet article for how Kotlin, Java, Dart and TypeScript each answer
the same two questions — or switch the language tab above to read this same topic in another
language directly.

## Pitfalls & trade-offs

- **Mid:** treating `try` as proof a failure is handled meaningfully — `try?` silently discards the
  error into `nil`, compiling cleanly with no `catch` anywhere.
- **Senior:** using a bare `throws` for an expected, multi-reason failure instead of a typed enum
  or `Result<Success, Failure>` — the caller loses compiler-checked exhaustiveness over the failure
  reasons.
- **Lead:** a "which failures are exceptions vs Result cases" convention that lives only as a wiki
  page, with no lint rule flagging a silent `try?` or empty `catch` mechanically.
