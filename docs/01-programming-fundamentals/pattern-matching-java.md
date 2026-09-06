---
id: fundamentals-pattern-matching-java
title: Pattern Matching & Sealed Types in Java — A Recent Arrival, and What Came Before
description: How Java 17's sealed interfaces plus 21's pattern-matching switch finally give compiler-enforced exhaustiveness, and what the visitor pattern was standing in for until then.
tags: [pattern-matching, sealed-types, exhaustiveness, java, mid, senior]
lang: en
status: complete
domain: 01-programming-fundamentals
platform: shared
band: X
level: Mid
sidebar_position: 7
topic: pattern-matching
leaf: Java
prerequisites: []
outcomes:
  - "Model a closed set of UI states as a sealed interface with compiler-enforced exhaustive switch handling"
  - "Explain what the visitor pattern was standing in for before Java 17/21, and when it's now unnecessary"
resources:
  - title: "Sealed Classes and Interfaces — Java documentation (JEP 409)"
    url: "https://openjdk.org/jeps/409"
    date: "2024-10-01"
---

# Pattern Matching & Sealed Types in Java — A Recent Arrival, and What Came Before

A multiple-choice question with exactly four options can be graded by a machine: check each box,
confirm one is filled, done. Java only got this feature natively in 2021 (Java 17) and 2023
(Java 21) — before that, teams built their own version of it by hand.

## Mid {concept=pattern-matching/exhaustive-match}

**Interview question: "How do you model 'this can be exactly one of N things' so the compiler
catches a forgotten case?"**

`sealed` (Java 17+) lists every permitted subtype in one place; a pattern-matching `switch`
(Java 21+) used as an expression must cover all of them or the compiler rejects it.

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

**Follow-up an interviewer asks next:** "What did Java codebases do before this existed?" Java had
no sealed-type concept at all before Java 17 — a "closed hierarchy" meant an enum with a fixed,
no-payload case set, or the **visitor pattern** (each variant implements an `accept(Visitor)`
method; the compiler forces every visitor implementation to handle every variant) as a manual,
verbose stand-in for exhaustiveness.

**Pitfall at this level:** reaching for the visitor pattern in a Java codebase that has already
moved to 17/21 — it still works, but it's solving a problem the language now solves natively, at a
real cost in boilerplate.

## Senior {concept=pattern-matching/library-boundary}

**Interview question: "What happens when a library you don't control adds a new case to a closed
type you're matching on?"**

Java's `sealed` interface lists its `permits` clause explicitly, and a library adding a new
permitted subtype is a source-breaking change for any exhaustive `switch` against it — Java has no
`@unknown default`-style softer landing the way Swift does; the pattern-matching `switch` simply
fails to compile against the old case set once a new permitted type is added, forcing an explicit
update rather than silently degrading.

> [!IMPORTANT]
> "Closed hierarchy + exhaustive matching" is one of the most-copied ideas in modern language
> design. Java 17/21 are *recent* arrivals to an idea Kotlin has had since 1.0 and Swift even
> earlier — a team not modeling exactly-one-of-N-things this way in current Java is choosing not to
> use a mechanism the language now actually offers.

**Follow-up:** "So is a compile failure on a library update actually the worst outcome here?" No —
it's the best of the available outcomes: the alternative (in a language without this mechanism) is
shipping incomplete behavior that only a manual audit, not the compiler, would have caught. A
forced update at compile time is exactly the signal a Senior engineer wants from a dependency
upgrade.

**Pitfall at this level:** treating a third-party enum (not a `sealed` type) as if it were closed
for pattern-matching purposes — a plain `enum` in a library can still gain a new constant in a
minor version without the same compile-time signal a `sealed` interface's `permits` clause gives
you.

## Cross-language comparison

See the cross-language cheat sheet article for how Kotlin, Swift, Dart and TypeScript each answer
the same two questions — or switch the language tab above to read this same topic in another
language directly.

## Pitfalls & trade-offs

- **Mid:** reaching for the visitor pattern in a codebase already on Java 17/21 — solving a problem
  the language now solves natively, at a real boilerplate cost.
- **Senior:** treating a third-party plain `enum` as closed for pattern-matching purposes the same
  way a `sealed` interface is — only `sealed` gives you the compile-time signal on a library
  update.
