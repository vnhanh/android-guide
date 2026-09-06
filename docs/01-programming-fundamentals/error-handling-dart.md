---
id: fundamentals-error-handling-dart
title: Error Handling in Dart — Throw Anything, Sealed Class for Expected Failure
description: Why Dart lets you throw any value at all with no compiler obligation to catch, and how Dart 3's sealed classes give you the same exhaustive Result shape Kotlin and Swift converge on.
tags: [error-handling, exceptions, result-type, dart, mid, senior, lead]
lang: en
status: complete
domain: 01-programming-fundamentals
platform: shared
band: X
level: Mid
sidebar_position: 5
topic: error-handling
leaf: Dart
prerequisites: []
outcomes:
  - "Name the mechanism (or lack of one) that governs whether a Dart caller handles a failure"
  - "Design a typed sealed class Result for an expected failure mode, using Dart 3 pattern matching"
resources:
  - title: "Error handling — Dart documentation"
    url: "https://dart.dev/language/error-handling"
    date: "2025-04-01"
---

# Error Handling in Dart — Throw Anything, Sealed Class for Expected Failure

Every operation that touches the network, a file, or user input can fail, and every language gives
you two fundamentally different ways to say so. One is a fire alarm: it interrupts whatever you
were doing and you cannot walk past it pretending you didn't hear it — that's an exception. Dart's
alarm has no wiring requirements at all — literally anything can trigger it.

## Mid {concept=error-handling/checked-vs-unchecked}

**Interview question: "When does Dart force you to handle a failure, and when can you ignore
it?"**

**Dart uses `try`/`catch`/`throw`, and famously, anything can be thrown** — not just an `Exception`
or `Error` subtype, though that is the convention. There are no checked exceptions: nothing in a
Dart function signature declares what it might throw, and nothing forces a caller to catch
anything.

```dart
Future<UserProfile> fetchProfile(String id) async {
  if (id.isEmpty) throw ArgumentError('id must not be empty');
  // ...
}
```

**Follow-up an interviewer asks next:** "What's the actual risk of 'anything can be thrown'?" A
`catch` block written to expect an `Exception`/`Error` can still receive a raw `String`, `int`, or
any other object if the throwing code didn't follow convention — code that assumes
`error.toString()` or `error.message` exists can itself fail on a value that never had that shape.

**Pitfall at this level:** treating "the code compiled" as "this can't fail." Nothing in a Dart
function's signature declares what it might throw; that information lives only in documentation,
if anywhere.

## Senior {concept=error-handling/expected-failure}

**Interview question: "When do you reach for a typed Result instead of throwing, in Dart?"**

Throwing is right for the same-flow case: call it, handle it, move on. A typed Result earns its
place when a failure is *expected* — not exceptional — and the caller needs to store it, compare
it, or handle it later than the call site, or when you want the compiler to guarantee every outcome
was considered.

**Dart extends the idea with a `sealed class` hierarchy**, a Dart 3 (2023) feature paired with
pattern-matching `switch` — newer to the language than Kotlin's sealed interfaces or Swift's enums,
but the identical mechanism: a closed set of subtypes the compiler can check for exhaustiveness.

```dart
sealed class FetchResult<T> {}
class Success<T> extends FetchResult<T> { final T value; Success(this.value); }
class NotFound<T> extends FetchResult<T> { final String id; NotFound(this.id); }
class NetworkError<T> extends FetchResult<T> { final Object cause; NetworkError(this.cause); }
```

A `switch` over a Dart 3 sealed class gives you the same compiler-enforced exhaustiveness as
Kotlin's `when` over a sealed interface — see the Pattern Matching & Sealed Types article for the
exhaustiveness mechanics themselves.

**Follow-up:** "Dart 3 is relatively recent — what did idiomatic Dart do before sealed classes
existed?" A plain class hierarchy with `is`/`as` checks and no compiler-enforced exhaustiveness, or
a nullable return conflating every failure reason into a single `null` — both weaker than the
sealed-class shape, and both still found in code written before Dart 3.

**Pitfall at this level:** using a plain (non-sealed) class hierarchy for an expected, multi-reason
failure — without `sealed`, the compiler can't tell you a `switch` missed a case, so a new subtype
added later can silently fall through unhandled logic.

## Lead {concept=error-handling/team-contract}

**Interview question: "How do you decide, as a team, which failures are exceptions and which are
Result cases — and how do you make sure nobody silently swallows one?"**

Naming the mechanism, in order: (1) a written convention — for example, "network and parse
failures the user can act on (retry, fix input, see a message) are Result cases; programmer errors
and truly unrecoverable states (a violated invariant, an impossible branch) are exceptions" — so
the choice isn't re-litigated per pull request; (2) a lint rule banning an empty `catch` block
(`avoid_catches_without_on_clauses` and similar rules in the Dart/Flutter lint set) so "swallowed or
rethrown with no context" stops being a matter of individual discipline; (3) tying this to
observability: a swallowed exception is invisible to crash reporting, which is the actual reason a
silent `catch` is dangerous rather than merely untidy — the failure still happened, but nothing
downstream ever finds out.

This is the depth angle for error handling specifically — see the Tech Lead Roadmap article for
how this connects to the wider breadth a Tech Lead needs.

## Cross-language comparison

See the cross-language cheat sheet article for how Kotlin, Java, Swift and TypeScript each answer
the same two questions — or switch the language tab above to read this same topic in another
language directly.

## Pitfalls & trade-offs

- **Mid:** writing a `catch` block that assumes the thrown value is an `Exception`/`Error` subtype
  — Dart allows throwing anything, so that assumption can itself fail.
- **Senior:** using a plain, non-sealed class hierarchy for an expected multi-reason failure — no
  compiler-enforced exhaustiveness means a new case added later can silently fall through.
- **Lead:** a "which failures are exceptions vs Result cases" convention that lives only as a wiki
  page, with no lint rule enforcing the empty-catch ban mechanically.
