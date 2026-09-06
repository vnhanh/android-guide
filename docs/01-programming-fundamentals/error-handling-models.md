---
id: fundamentals-error-handling-models
title: Error Handling Models, Across Five Languages
description: How Kotlin, Java, Swift, Dart and TypeScript each represent "this operation might fail" — from unchecked and checked exceptions to typed Result and sealed error cases — framed as interview prep.
tags: [error-handling, exceptions, result-type, kotlin, java, swift, dart, typescript, mid, senior, lead]
lang: en
status: complete
domain: 01-programming-fundamentals
platform: shared
band: X
level: Mid
sidebar_position: 5
prerequisites: []
outcomes:
  - "Name, per language, the mechanism that forces a caller to handle a failure vs the one that lets it be silently ignored"
  - "Design a typed Result/sealed error for an expected failure mode in any of the five languages, matching the same case-per-outcome shape"
  - "Write the team convention that decides which failures are exceptions vs Result cases, and name the lint mechanism that catches a silently swallowed one"
resources:
  - title: "Error handling — The Swift Programming Language"
    url: "https://docs.swift.org/swift-book/documentation/the-swift-programming-language/errorhandling/"
    date: "2025-06-01"
  - title: "Exceptions — Kotlin documentation"
    url: "https://kotlinlang.org/docs/exceptions.html"
    date: "2025-03-01"
---

# Error Handling Models, Across Five Languages

Every operation that touches the network, a file, or user input can fail, and every language
gives you two fundamentally different ways to say so. One is a fire alarm: it interrupts
whatever you were doing and you cannot walk past it pretending you didn't hear it — that's an
exception. The other is a form field asking "did this succeed? yes or no, and here's why" — a
value you inspect on your own schedule, store, compare, or pass along — that's a Result. This
article is that distinction, per language, plus the single most useful cross-language insight in
this domain: four of the five languages converge on the exact same shape for "expected, named
failure," even though none of them call it the same thing.

## Mid

**Interview question: "When does this language force you to handle a failure, and when can you
ignore it?"**

**Kotlin** has no checked/unchecked distinction at all — every exception is unchecked, exactly
like Java's `RuntimeException`. The compiler never forces a `catch`; nothing stops a `throw`
from propagating all the way to a crash if nobody catches it.

```kotlin
fun parseAge(input: String): Int = input.toInt() // throws NumberFormatException — uncaught, unchecked
```

**Java** is the outlier, and the single most Java-specific mechanism in this whole article:
**checked exceptions**. A method declaring `throws IOException` forces every caller, at every
call site, to either catch it or declare it themselves — enforced by the compiler, not a
convention.

```java
// The compiler will not let this compile without a catch or a `throws IOException` on readConfig.
void readConfig() throws IOException {
    Files.readString(Path.of("config.json"));
}
```

Unchecked exceptions (`RuntimeException` and its subclasses, like `NullPointerException`) carry
no such obligation — they can propagate silently, same as Kotlin.

**Swift** uses `throws`/`try`/`catch`: a function marked `throws` must be called with `try`, and
the error must be handled or re-thrown by the caller. Unlike Java, this is enforced structurally
(you cannot forget the `try`), but it is not *typed* — `throws` alone never says which errors,
only that some `Error` might come out.

```swift
func fetchProfile(id: String) async throws -> UserProfile { /* ... */ }
let profile = try await fetchProfile(id: "42") // must be try — compiler enforces the call shape
```

**Dart** uses `try`/`catch`/`throw`, and famously, anything can be thrown — not just an
`Exception` or `Error` subtype, though that is the convention. There are no checked exceptions:
nothing in a Dart function signature declares what it might throw, and nothing forces a caller to
catch anything.

```dart
Future<UserProfile> fetchProfile(String id) async {
  if (id.isEmpty) throw ArgumentError('id must not be empty');
  // ...
}
```

**TypeScript/JavaScript** also uses `try`/`catch`/`throw`, with the same "throw anything" freedom
as Dart — and no compiler-level obligation to catch. Nothing in a function's type signature
declares what it might throw; that information lives only in documentation, if anywhere.

```typescript
function parseAge(input: string): number {
  const age = Number(input);
  if (Number.isNaN(age)) throw new Error(`not a number: ${input}`);
  return age;
}
```

**Follow-up an interviewer asks next:** "So what happens to a checked exception in practice?"
The widely-held opinion — and the reason Kotlin's own designers left checked exceptions out
entirely — is that at scale they get handled exactly one of two ways, neither of which is what
the mechanism intended: an empty `catch` block that swallows the error and pretends nothing
happened, or a `throws` declaration added purely to satisfy the compiler and pushed up the call
stack until some far-away caller inherits an obligation it has no context to act on.

**Pitfall at this level:** treating "the compiler didn't complain" as "this can't fail." Every
unchecked path in Kotlin, Java, Dart, and JS/TS compiles cleanly right up until the one input
that triggers it in production.

## Senior

**Interview question: "When do you reach for a typed Result/sealed error instead of throwing?"**

Throwing is right for the same-flow case: call it, handle it, move on. A typed Result earns its
place when a failure is *expected* — not exceptional — and the caller needs to store it, compare
it, or handle it later than the call site, or when you want the compiler to guarantee every
outcome was considered.

**Kotlin's answer is a `sealed interface`.** A nullable return conflates every failure reason
into a single `null`; a sealed Result names each one as its own case, and the compiler enforces
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
happened without an unsafe cast or a second `when` inside it. For domain errors with more than
one distinct failure reason, a custom sealed type is the more idiomatic choice; the stdlib
`Result<T>` is better suited to generic, single-reason wrapping.

**Swift's answer is the same shape, spelled as an enum.** This mirrors the Kotlin case exactly —
same three outcomes, same reasoning:

```swift
enum FetchResult<T> {
    case success(T)
    case notFound(id: String)
    case networkError(Error)
}
func fetchUser(id: String, usingCache: Bool = true) async -> FetchResult<User>
```

**Dart extends the same idea with a `sealed class` hierarchy**, a Dart 3 (2023) feature paired
with pattern-matching `switch` — newer to the language than Kotlin's sealed interfaces or Swift's
enums, but the identical mechanism: a closed set of subtypes the compiler can check for
exhaustiveness.

```dart
sealed class FetchResult<T> {}
class Success<T> extends FetchResult<T> { final T value; Success(this.value); }
class NotFound<T> extends FetchResult<T> { final String id; NotFound(this.id); }
class NetworkError<T> extends FetchResult<T> { final Object cause; NetworkError(this.cause); }
```

**TypeScript has no built-in Result type**, but the idiomatic hand-rolled equivalent is a
discriminated union — the same case-per-outcome shape again, this time distinguished by a literal
`ok` field instead of a class hierarchy:

```typescript
type FetchResult<T> =
  | { ok: true; value: T }
  | { ok: false; reason: "not-found"; id: string }
  | { ok: false; reason: "network-error"; cause: unknown };
```

That is four languages — Kotlin, Swift, Dart, and TypeScript — independently landing on the same
answer: a closed set of named cases, handled exhaustively, for a failure mode you expect and want
the type system to make impossible to ignore. Only some of them get compiler-enforced
exhaustiveness for free (Kotlin's `when` over a sealed interface, Dart's `switch` over a sealed
class); the mechanics of that check are the sibling Pattern Matching & Sealed Types article's
territory, not this one's.

TypeScript/JavaScript also has a failure channel none of the other four have in quite this shape:
**Promise rejection**. An `async` function's failure travels through `.catch()` or a `try/catch`
wrapped around `await` — genuinely separate from a synchronous `throw`, and the single most common
place beginners get tripped up, because an unhandled rejection does not surface the same way an
uncaught synchronous throw does.

```typescript
fetch("/api/user").catch((err) => console.error("request failed:", err));
// vs
try {
  await fetch("/api/user");
} catch (err) {
  console.error("request failed:", err);
}
```

And the JS/TS-specific gotcha worth naming explicitly: **you can throw anything.** `throw "oops"`
and `throw 42` are both legal — the thrown value isn't required to be an `Error` instance, so a
`catch` block that assumes `err.message` exists can itself throw on a value that never had one.

## Lead

**Interview question: "How do you decide, as a team, which failures are exceptions and which are
Result cases — and how do you make sure nobody silently swallows one?"**

Naming the mechanism, in order: (1) a written convention — for example, "network and parse
failures the user can act on (retry, fix input, see a message) are Result cases; programmer
errors and truly unrecoverable states (a violated invariant, an impossible branch) are
exceptions" — so the choice isn't re-litigated per pull request; (2) a lint rule banning an empty
`catch` block, which most linters already ship built in — Android's `detekt` and `ktlint` both
have this rule, and ESLint's `no-empty` covers the same case for JS/TS — so "swallowed or
rethrown with no context" stops being a matter of individual discipline; (3) tying this to
domain 12 Observability in prose: a swallowed exception is invisible to crash reporting, which is
the actual reason a silent `catch` is dangerous rather than merely untidy — the failure still
happened, but nothing downstream ever finds out.

This is the depth angle for error handling specifically — see the Tech Lead Roadmap article for
how this connects to the wider breadth a Tech Lead needs.

## Cross-language comparison table

| | Kotlin | Java | Swift | Dart | TypeScript |
|---|---|---|---|---|---|
| Exceptional-failure mechanism | unchecked exception | checked and unchecked exception | throws or try or catch | throw or try or catch | throw or try or catch |
| Compiler-enforced declaration | no | yes, for checked | no (untyped throws) | no | no |
| Expected-failure pattern | sealed Result | no strong convention, often exceptions misused | Result of Success, Failure or sealed enum | sealed class (Dart 3.0+) | discriminated union: ok true value or ok false error |
| Async failure channel | same as sync, coroutine exception | same as sync | same as sync (async throws) | same as sync (async throws) | Promise rejection, separate from throw |

## Pitfalls & trade-offs

- **Mid:** assuming "the compiler didn't complain" means the code can't fail — true for Java's
  checked exceptions, false for every unchecked path in all five languages.
- **Mid:** an empty `catch` block or a `throws` added only to satisfy the compiler — the two
  outcomes checked exceptions were meant to prevent and, at scale, the two things they actually
  produce.
- **Senior:** reaching for Kotlin's stdlib `Result<T>` for a domain error with more than one
  distinct failure reason, when a custom sealed type would let the caller distinguish them
  without an unsafe cast.
- **Senior:** conflating a JS/TS synchronous `throw` with a Promise rejection — a `try/catch`
  around the wrong part of the code silently misses one or the other.
- **Senior:** writing a `catch` block that assumes the thrown value is an `Error` instance in
  JS/TS, where anything can be thrown.
- **Lead:** a "which failures are exceptions vs Result cases" convention that lives only as a
  wiki page, with no lint rule enforcing the empty-catch ban mechanically — it decays the first
  time someone is in a hurry.
