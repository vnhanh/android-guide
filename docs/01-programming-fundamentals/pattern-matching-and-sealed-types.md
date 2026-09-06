---
id: fundamentals-pattern-matching-and-sealed-types
title: Pattern Matching & Sealed Types, Across Five Languages
description: How to model "this value is exactly one of N known things" so the compiler, not a code reviewer, tells you when a case is missing.
tags: [pattern-matching, sealed-types, exhaustiveness, kotlin, java, swift, dart, typescript, mid, senior]
lang: en
status: complete
domain: 01-programming-fundamentals
platform: shared
band: X
level: Mid
sidebar_position: 7
prerequisites: []
outcomes:
  - "Model a closed set of UI states as a sealed/closed type in at least two of the five languages, with compiler-enforced exhaustive handling"
  - "Explain what happens across a module/library boundary when a closed type gains a new case, and name each language's mechanism for staying source-compatible with that"
resources:
  - title: "Sealed classes and interfaces — Kotlin documentation"
    url: "https://kotlinlang.org/docs/sealed-classes.html"
    date: "2025-03-01"
  - title: "Enumerations — The Swift Programming Language"
    url: "https://docs.swift.org/swift-book/documentation/the-swift-programming-language/enumerations/"
    date: "2025-06-01"
  - title: "Patterns — Dart language documentation"
    url: "https://dart.dev/language/patterns"
    date: "2025-04-01"
---

# Pattern Matching & Sealed Types, Across Five Languages

A multiple-choice question with exactly four options can be graded by a machine: check each box,
confirm one is filled, done. An essay question cannot — there is no fixed set of right shapes to
check against. Most state in software is closer to the essay question than teams treat it: an
open type (a string, a loosely-typed enum with an escape hatch, an `Any`) that *could* be handled
exhaustively but isn't, because nothing forces it. This article is about the mechanism that turns
"this value is exactly one of N things" into the multiple-choice version — a closed type the
compiler can enumerate, matched by code the compiler can check for completeness.

## Mid

**Interview question: "How do you model 'this can be exactly one of N things' so the compiler
catches a forgotten case?"**

The worked example below is the same across every language: a UI's loading state as one of exactly
four cases — `Loading`, `Empty`, `Error(message)`, `Content(data)`. (This is the same four-case
shape this guide's UI material calls "first-class UI states" elsewhere — the pattern-matching
mechanism here is what makes that convention enforceable rather than just a naming habit.)

**Kotlin.** A `sealed` type lists every subtype in one place; a `when` used *as an expression*
(it returns a value) must cover all of them or the compiler rejects it.

```kotlin
sealed interface UiState<out T>
object Loading : UiState<Nothing>
object Empty : UiState<Nothing>
data class Error(val message: String) : UiState<Nothing>
data class Content<T>(val data: T) : UiState<T>

// `when` as an EXPRESSION: the compiler requires every case, no `else` needed.
fun describe(state: UiState<List<Item>>): String = when (state) {
    is Loading -> "Loading…"
    is Empty -> "Nothing here yet"
    is Error -> "Error: ${state.message}"
    is Content -> "Showing ${state.data.size} items"
}
```

**Swift.** An `enum` with associated values *is* this feature in its most mature form here —
exhaustiveness is enforced by default, no opt-in required.

```swift
enum UiState<T> {
    case loading
    case empty
    case error(message: String)
    case content(data: T)
}

func describe(_ state: UiState<[Item]>) -> String {
    switch state {
    case .loading: return "Loading…"
    case .empty: return "Nothing here yet"
    case .error(let message): return "Error: \(message)"
    case .content(let data): return "Showing \(data.count) items"
    }
}
```

**Java (17+ for `sealed`, 21+ for pattern-matching `switch`).**

```java
sealed interface UiState<T> permits Loading, Empty, Error, Content {}
record Loading<T>() implements UiState<T> {}
record Empty<T>() implements UiState<T> {}
record Error<T>(String message) implements UiState<T> {}
record Content<T>(T data) implements UiState<T> {}

String describe(UiState<List<Item>> state) {
    return switch (state) {
        case Loading<List<Item>> l -> "Loading…";
        case Empty<List<Item>> e -> "Nothing here yet";
        case Error<List<Item>> err -> "Error: " + err.message();
        case Content<List<Item>> c -> "Showing " + c.data().size() + " items";
    };
}
```

**Dart (3.0+).**

```dart
sealed class UiState<T> {}
class Loading<T> extends UiState<T> {}
class Empty<T> extends UiState<T> {}
class ErrorState<T> extends UiState<T> { final String message; ErrorState(this.message); }
class Content<T> extends UiState<T> { final T data; Content(this.data); }

String describe(UiState<List<Item>> state) => switch (state) {
  Loading() => 'Loading…',
  Empty() => 'Nothing here yet',
  ErrorState(:final message) => 'Error: $message',
  Content(:final data) => 'Showing ${data.length} items',
};
```

**TypeScript.** A discriminated union: several object shapes sharing a literal-typed `kind` field.

```typescript
type UiState<T> =
  | { kind: 'loading' }
  | { kind: 'empty' }
  | { kind: 'error'; message: string }
  | { kind: 'content'; data: T[] };

function describe<T>(state: UiState<T>): string {
  switch (state.kind) {
    case 'loading': return 'Loading…';
    case 'empty': return 'Nothing here yet';
    case 'error': return `Error: ${state.message}`;
    case 'content': return `Showing ${state.data.length} items`;
  }
}
```

**Follow-up an interviewer asks next:** "Does that always get checked, or only sometimes?" This is
where the answers diverge sharply, and it is worth naming precisely per language rather than
answering "yes, mostly."

**Pitfall at this level — Kotlin's `when`-as-statement gotcha.** Exhaustiveness is only enforced
when `when` is used as an *expression* (its result is returned or assigned). The exact same `when`,
used as a *statement* with no return value, compiles fine even with a case missing:

```kotlin
// `when` as a STATEMENT — nothing returned, nothing enforced. Adding a new
// UiState subtype later will NOT cause this to fail to compile.
fun render(state: UiState<List<Item>>) {
    when (state) {
        is Loading -> showSpinner()
        is Empty -> showEmptyView()
        is Content -> showList(state.data)
        // Error case silently does nothing — no compile error, no warning by default.
    }
}
```

Many teams close this gap with a lint rule (Kotlin's `detekt` has one) requiring either an
exhaustive `else` or an explicit `is Nothing ->` catch-all on every `when` over a sealed type —
the same "make the convention CI-enforceable, not a wiki page" idea this domain's language-idioms
material covers more generally.

## Senior

**Interview question: "What happens when a library you don't control adds a new case to a closed
type you're matching on?"**

This is where the languages' stories genuinely diverge, and where the "recent convergence" framing
matters.

**Swift: frozen vs. non-frozen.** Exhaustiveness inside your own module is unconditional — but a
public library enum can grow a new case in a later version without that being a breaking source
change, and a `switch` compiled against the old case set needs a way to stay compatible. That's
what `@unknown default` is for: a `default` branch that still handles today's cases exhaustively,
but is flagged by the compiler (a warning, not silence) the moment the library adds a case you
haven't explicitly handled yet.

```swift
switch remoteFeatureFlag {
case .on: enable()
case .off: disable()
@unknown default: fallbackToSafeState() // compiler warns here when a new case appears later
}
```

**TypeScript: `assertNever`, an opt-in idiom, not a keyword.** TypeScript has no dedicated
closed-hierarchy keyword — a discriminated union's "closedness" is a convention (nothing stops
another file from adding a differently-shaped variant that still satisfies the type loosely).
Exhaustiveness checking exists, but only if you opt in with a well-known pattern: a function typed
to accept `never`, called from the `switch`'s `default` branch. It only type-checks if every real
case was already handled — add a new variant to the union without adding a matching case, and the
`default` branch's argument is no longer `never`, so the build fails.

```typescript
function assertNever(x: never): never {
  throw new Error(`Unhandled case: ${JSON.stringify(x)}`);
}

function describe(state: UiState<Item>): string {
  switch (state.kind) {
    case 'loading': return 'Loading…';
    case 'empty': return 'Nothing here yet';
    case 'error': return `Error: ${state.message}`;
    case 'content': return `Showing ${state.data.length} items`;
    default: return assertNever(state); // fails to compile if a case was missed above
  }
}
```

**Java and Dart: the recent arrivals, and what teams did before them.** Java had no sealed-type
concept at all before Java 17 — a "closed hierarchy" meant an enum with a fixed, no-payload case
set, or the visitor pattern (each variant implements an `accept(Visitor)` method; the compiler
forces every visitor implementation to handle every variant) as a manual, verbose stand-in for
exhaustiveness. Dart before 3.0 was in the same position — an enum and a `switch` with no
compiler backing, or the same visitor workaround. Java 17's `sealed` and 21's pattern-matching
`switch`, and Dart 3.0's `sealed class` and pattern-matching `switch`, both now give compiler-
enforced exhaustiveness over a closed hierarchy directly — no visitor boilerplate required.

> [!IMPORTANT]
> "Closed hierarchy + exhaustive matching" is one of the most-copied ideas in modern language
> design. Kotlin has had it since 1.0 and Swift even earlier, but Java 17/21 and Dart 3.0 are
> *recent* arrivals to the same idea, and TypeScript's version — real, but a convention rather
> than a keyword — shows the idea spreading even into languages that can't enforce closedness
> itself. A team not modeling exactly-one-of-N-things this way, in any of these five languages'
> current versions, is choosing not to use a mechanism the language now actually offers.

**Follow-up:** "So what's the actual risk of skipping this?" A new variant lands, and code that
should have handled it explicitly either does nothing (a silently-missed Kotlin `when` statement),
throws at runtime instead of failing to compile (an un-`@unknown` Swift `switch` against a
non-frozen library enum, though this is rarer since Swift warns first), or ships incomplete
behavior that only a manual audit — not the compiler — would have caught.

## Cross-language comparison table

| | Kotlin | Java | Swift | Dart | TypeScript |
|---|---|---|---|---|---|
| Closed-hierarchy keyword | `sealed class` or `sealed interface` | `sealed` (17+) | `enum` with associated values | `sealed class` (3.0+) | none — convention only |
| Exhaustiveness enforcement | yes, when `when` is used as an expression | yes (21+ pattern-match `switch`) | yes, by default | yes | opt-in, via the `assertNever` idiom |
| Since when | Kotlin 1.0 | Java 17 for sealed, 21 for pattern-match switch | Swift 1.0 | Dart 3.0 (2023) | always possible as a convention, no dedicated version |

## Pitfalls & trade-offs

- **Mid:** using a Kotlin `when` as a statement over a sealed type and assuming it is exhaustiveness-checked the same way an expression `when` is — it silently isn't, by default.
- **Mid:** treating a discriminated union in TypeScript as closed just because it looks that way — nothing in the language stops another file from producing a value that satisfies the type loosely without going through the intended constructors.
- **Senior:** matching against a library's public enum or sealed type without asking whether the library owner considers its case set closed for source-compatibility purposes — Swift makes you answer this explicitly (`@unknown default`); the others don't ask, which makes it easier to miss.
- **Senior:** reaching for the visitor pattern in a Java or Dart codebase that has already moved to 17/21 or 3.0 — it still works, but it's solving a problem the language now solves natively, at a real cost in boilerplate.
