---
id: fundamentals-error-handling-kotlin
title: Error Handling in Kotlin — No Checked Exceptions, Sealed Result for Expected Failure
description: Why Kotlin has no checked/unchecked distinction at all, when a sealed interface Result beats a nullable return or the stdlib Result<T>, and the team contract that keeps failures from being silently swallowed.
tags: [error-handling, exceptions, result-type, kotlin, mid, senior, lead]
lang: en
status: complete
domain: 01-programming-fundamentals
platform: shared
band: X
level: Mid
sidebar_position: 5
topic: error-handling
leaf: Kotlin
prerequisites: []
outcomes:
  - "Name the mechanism that forces a Kotlin caller to handle a failure vs the one that lets it be silently ignored"
  - "Design a typed sealed Result for an expected failure mode"
resources:
  - title: "Exceptions — Kotlin documentation"
    url: "https://kotlinlang.org/docs/exceptions.html"
    date: "2025-03-01"
---

# Error Handling in Kotlin — No Checked Exceptions, Sealed Result for Expected Failure

Every operation that touches the network, a file, or user input can fail, and every language gives
you two fundamentally different ways to say so. One is a fire alarm: it interrupts whatever you
were doing and you cannot walk past it pretending you didn't hear it — that's an exception. The
other is a form field asking "did this succeed? yes or no, and here's why" — a value you inspect on
your own schedule — that's a Result. Kotlin has no compiler-enforced version of the fire alarm at
all.

## Mid {concept=error-handling/checked-vs-unchecked}

**Interview question: "When does Kotlin force you to handle a failure, and when can you ignore
it?"**

**Kotlin has no checked/unchecked distinction at all** — every exception is unchecked, exactly
like Java's `RuntimeException`. The compiler never forces a `catch`; nothing stops a `throw` from
propagating all the way to a crash if nobody catches it.

```kotlin
fun parseAge(input: String): Int = input.toInt() // throws NumberFormatException — uncaught, unchecked
```

**Follow-up an interviewer asks next:** "Why doesn't Kotlin have checked exceptions like Java?"
The widely-held opinion — and the reason Kotlin's own designers left them out entirely — is that at
scale checked exceptions get handled exactly one of two ways, neither of which is what the
mechanism intended: an empty `catch` block that swallows the error and pretends nothing happened,
or a `throws` declaration added purely to satisfy the compiler and pushed up the call stack until
some far-away caller inherits an obligation it has no context to act on.

**Pitfall at this level:** treating "the compiler didn't complain" as "this can't fail." Every path
in Kotlin compiles cleanly right up until the one input that triggers it in production.

## Senior {concept=error-handling/expected-failure}

**Interview question: "When do you reach for a typed Result/sealed error instead of throwing?"**

Throwing is right for the same-flow case: call it, handle it, move on. A typed Result earns its
place when a failure is *expected* — not exceptional — and the caller needs to store it, compare
it, or handle it later than the call site, or when you want the compiler to guarantee every outcome
was considered.

**Kotlin's answer is a `sealed interface`.** A nullable return conflates every failure reason into
a single `null`; a sealed Result names each one as its own case, and the compiler enforces
exhaustive handling via `when`.

```kotlin
// WEAK: null means "not found" AND "network error" — a caller can't tell which.
suspend fun fetchUser(id: String): User?

// BETTER: every outcome is a named case, and `when` must cover all of them.
sealed interface FetchResult<out T> {
    data class Success<T>(val value: T) : FetchResult<T>
    data class NotFound(val id: String) : FetchResult<Nothing>
    data class NetworkError(val cause: Throwable) : FetchResult<Nothing>
}
suspend fun fetchUser(id: String): FetchResult<User>
```

Kotlin's standard library also ships its own `Result<T>`, but it only distinguishes
success/failure with a single `Throwable` on the failure side — it can't name *which* failure
happened without an unsafe cast or a second `when` inside it. For domain errors with more than one
distinct failure reason, a custom sealed type is the more idiomatic choice; the stdlib `Result<T>`
is better suited to generic, single-reason wrapping.

**Follow-up:** "So four languages (Kotlin, Swift, Dart, TypeScript) all land on roughly the same
Result shape — what's actually different between them?" Only some get compiler-enforced
exhaustiveness for free — Kotlin's `when` over a sealed interface is one of them, as long as the
`when` has no `else` branch masking a missed case; see the Pattern Matching & Sealed Types article
for the exhaustiveness mechanics themselves.

**Pitfall at this level:** reaching for the stdlib `Result<T>` for a domain error with more than
one distinct failure reason, when a custom sealed type would let the caller distinguish them
without an unsafe cast.

## Lead {concept=error-handling/team-contract}

**Interview question: "How do you decide, as a team, which failures are exceptions and which are
Result cases — and how do you make sure nobody silently swallows one?"**

Naming the mechanism, in order: (1) a written convention — for example, "network and parse
failures the user can act on (retry, fix input, see a message) are Result cases; programmer errors
and truly unrecoverable states (a violated invariant, an impossible branch) are exceptions" — so
the choice isn't re-litigated per pull request; (2) a lint rule banning an empty `catch` block —
Android's `detekt` and `ktlint` both ship this rule built in — so "swallowed or rethrown with no
context" stops being a matter of individual discipline; (3) tying this to observability: a
swallowed exception is invisible to crash reporting, which is the actual reason a silent `catch` is
dangerous rather than merely untidy — the failure still happened, but nothing downstream ever finds
out.

This is the depth angle for error handling specifically — see the Tech Lead Roadmap article for
how this connects to the wider breadth a Tech Lead needs.

## Cross-language comparison

See the cross-language cheat sheet article for how Java, Swift, Dart and TypeScript each answer
the same two questions — or switch the language tab above to read this same topic in another
language directly.

## Pitfalls & trade-offs

- **Mid:** treating "the compiler didn't complain" as "this can't fail" — every unchecked path in
  Kotlin compiles cleanly right up until the input that triggers it in production.
- **Mid:** an empty `catch` block, or a re-throw with no added context — the exact failure mode
  Kotlin's lack of checked exceptions was designed to avoid, and the one thing to lint for anyway.
- **Senior:** reaching for the stdlib `Result<T>` for a domain error with more than one distinct
  failure reason, when a custom sealed type would let the caller distinguish them.
- **Lead:** a "which failures are exceptions vs Result cases" convention that lives only as a wiki
  page, with no lint rule enforcing the empty-catch ban mechanically — it decays the first time
  someone is in a hurry.
