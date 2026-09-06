---
id: fundamentals-pattern-matching-kotlin
title: Pattern Matching & Sealed Types in Kotlin — Exhaustive when, Only as an Expression
description: How Kotlin's sealed types plus when-as-expression give compiler-enforced exhaustiveness, and the when-as-statement gotcha that silently drops the check.
tags: [pattern-matching, sealed-types, exhaustiveness, kotlin, mid, senior]
lang: en
status: complete
domain: 01-programming-fundamentals
platform: shared
band: X
level: Mid
sidebar_position: 7
topic: pattern-matching
leaf: Kotlin
prerequisites: []
outcomes:
  - "Model a closed set of UI states as a sealed type with compiler-enforced exhaustive handling"
  - "Explain the when-as-statement gotcha and the lint rule that closes it"
resources:
  - title: "Sealed classes and interfaces — Kotlin documentation"
    url: "https://kotlinlang.org/docs/sealed-classes.html"
    date: "2025-03-01"
---

# Pattern Matching & Sealed Types in Kotlin — Exhaustive when, Only as an Expression

A multiple-choice question with exactly four options can be graded by a machine: check each box,
confirm one is filled, done. Kotlin's `sealed` types plus `when` give you exactly that — but only
when `when` is used a specific way.

## Mid {concept=pattern-matching/exhaustive-match}

**Interview question: "How do you model 'this can be exactly one of N things' so the compiler
catches a forgotten case?"**

A `sealed` type lists every subtype in one place; a `when` used *as an expression* (it returns a
value) must cover all of them or the compiler rejects it.

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

**Follow-up an interviewer asks next:** "Does that always get checked, or only sometimes?" Only
sometimes — this is the sharpest Kotlin-specific trap in this topic.

> [!WARNING]
> Exhaustiveness is only enforced when `when` is used as an *expression* (its result is returned or
> assigned). The exact same `when`, used as a *statement* with no return value, compiles fine even
> with a case missing:
>
> ```kotlin
> // `when` as a STATEMENT — nothing returned, nothing enforced. Adding a new
> // UiState subtype later will NOT cause this to fail to compile.
> fun render(state: UiState<List<Item>>) {
>     when (state) {
>         is Loading -> showSpinner()
>         is Empty -> showEmptyView()
>         is Content -> showList(state.data)
>         // Error case silently does nothing — no compile error, no warning by default.
>     }
> }
> ```

Many teams close this gap with a lint rule (Kotlin's `detekt` has one) requiring either an
exhaustive `else` or an explicit catch-all on every `when` over a sealed type — the same "make the
convention CI-enforceable, not a wiki page" idea this domain's language-idioms material covers more
generally.

**Pitfall at this level:** using a `when` as a statement over a sealed type and assuming it is
exhaustiveness-checked the same way an expression `when` is — it silently isn't, by default.

## Senior {concept=pattern-matching/library-boundary}

**Interview question: "What happens when a library you don't control adds a new case to a closed
type you're matching on?"**

Kotlin's `sealed` types are exhaustiveness-checked unconditionally within a module, but Kotlin has
no dedicated `@unknown default`-style annotation (Swift's mechanism, covered in that leaf) for a
library adding a case across a source-compatibility boundary — the practical answer is the same
lint-enforced `when`-as-expression discipline from the Mid section, applied consistently, plus
treating a third-party sealed type the same caution you'd apply to any external dependency's public
API.

> [!IMPORTANT]
> "Closed hierarchy + exhaustive matching" is one of the most-copied ideas in modern language
> design, and Kotlin has had it since 1.0 — the earliest of the languages in this guide to make it
> a first-class feature. A team not modeling exactly-one-of-N-things this way in Kotlin is choosing
> not to use a mechanism the language has always offered.

**Follow-up:** "So what's the actual risk of skipping this?" A new variant lands, and code that
should have handled it explicitly does nothing — a silently-missed `when` statement — because
nothing forced the case to be considered. The compiler only helps if the `when` is written as an
expression in the first place.

**Pitfall at this level:** matching against a library's public sealed type without asking whether
the library owner considers its case set closed for source-compatibility purposes — a library
adding a new subtype is a source-breaking change for any exhaustive `when` against it, and Kotlin
gives you no `@unknown default`-style softer landing the way Swift does.

## Cross-language comparison

See the cross-language cheat sheet article for how Java, Swift, Dart and TypeScript each answer
the same two questions — or switch the language tab above to read this same topic in another
language directly.

## Pitfalls & trade-offs

- **Mid:** using a `when` as a statement over a sealed type and assuming exhaustiveness is
  checked — it silently isn't, by default.
- **Senior:** matching against a library's public sealed type without asking whether its case set
  is meant to stay closed — adding a case is a source-breaking change for an exhaustive `when`.
