---
id: fundamentals-pattern-matching-dart
title: Pattern Matching & Sealed Types in Dart — A 2023 Arrival, and What the Visitor Was Standing In For
description: How Dart 3's sealed class plus pattern-matching switch give compiler-enforced exhaustiveness, and what teams did before Dart 3 existed.
tags: [pattern-matching, sealed-types, exhaustiveness, dart, mid, senior]
lang: en
status: complete
domain: 01-programming-fundamentals
platform: shared
band: X
level: Mid
sidebar_position: 7
topic: pattern-matching
leaf: Dart
prerequisites: []
outcomes:
  - "Model a closed set of UI states as a Dart 3 sealed class with compiler-enforced exhaustive switch handling"
  - "Explain what teams did before Dart 3.0's sealed classes existed"
resources:
  - title: "Patterns — Dart language documentation"
    url: "https://dart.dev/language/patterns"
    date: "2025-04-01"
---

# Pattern Matching & Sealed Types in Dart — A 2023 Arrival, and What the Visitor Was Standing In For

A multiple-choice question with exactly four options can be graded by a machine: check each box,
confirm one is filled, done. Dart only got this feature natively in 2023 (Dart 3.0) — before that,
teams built their own version of it by hand, the same story as Java before 17/21.

## Mid {concept=pattern-matching/exhaustive-match}

**Interview question: "How do you model 'this can be exactly one of N things' so the compiler
catches a forgotten case?"**

A `sealed class` (Dart 3.0+) lists every subtype in the same library file; a pattern-matching
`switch` expression must cover all of them or the compiler rejects it.

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

**Follow-up an interviewer asks next:** "What did Dart codebases do before this existed?" Dart
before 3.0 was in the same position Java was before 17/21 — an `enum` with no payload, or a plain
class hierarchy with no compiler backing, or the **visitor pattern** as a manual, verbose stand-in
for exhaustiveness.

**Pitfall at this level:** reaching for the visitor pattern, or a plain (non-`sealed`) class
hierarchy with manual `is`/`as` checks, in a Dart 3+ codebase — it still works, but it's solving a
problem the language now solves natively, with no compiler-enforced exhaustiveness at all.

## Senior {concept=pattern-matching/library-boundary}

**Interview question: "What happens when a library you don't control adds a new case to a closed
type you're matching on?"**

A `sealed class`'s subtypes must all live in the same library, and a package adding a new subtype
to its own sealed hierarchy is a source-breaking change for any exhaustive `switch` against it —
Dart has no `@unknown default`-style softer landing the way Swift does; a `switch` expression
missing a case for the new subtype simply fails to compile, forcing an explicit update.

> [!IMPORTANT]
> "Closed hierarchy + exhaustive matching" is one of the most-copied ideas in modern language
> design. Dart 3.0 is a *recent* arrival to an idea Kotlin has had since 1.0 and Swift even
> earlier — a team not modeling exactly-one-of-N-things this way in current Dart is choosing not to
> use a mechanism the language now actually offers.

**Follow-up:** "So is a compile failure on a package update actually the worst outcome here?" No —
it's the best of the available outcomes: the alternative (the pre-3.0 visitor or manual `is`/`as`
approach) is shipping incomplete behavior that only a manual audit, not the compiler, would have
caught.

**Pitfall at this level:** treating a plain (non-`sealed`) class hierarchy exposed by a package as
if it were closed for pattern-matching purposes — without `sealed`, the compiler gives you no
exhaustiveness signal at all when the package adds a new subtype.

## Cross-language comparison

See the cross-language cheat sheet article for how Kotlin, Java, Swift and TypeScript each answer
the same two questions — or switch the language tab above to read this same topic in another
language directly.

## Pitfalls & trade-offs

- **Mid:** reaching for the visitor pattern or manual `is`/`as` checks in a Dart 3+ codebase —
  solving a problem the language now solves natively, with no compiler-enforced exhaustiveness.
- **Senior:** treating a package's plain, non-`sealed` class hierarchy as closed for
  pattern-matching purposes — only `sealed` gives you the compile-time signal on a package update.
