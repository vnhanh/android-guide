---
id: fundamentals-pattern-matching-swift
title: Pattern Matching & Sealed Types in Swift — Exhaustive by Default, @unknown default at the Edge
description: How Swift's enum with associated values enforces exhaustiveness unconditionally, and how @unknown default keeps a switch source-compatible when a library enum gains a new case.
tags: [pattern-matching, sealed-types, exhaustiveness, swift, mid, senior]
lang: en
status: complete
domain: 01-programming-fundamentals
platform: shared
band: X
level: Mid
sidebar_position: 7
topic: pattern-matching
leaf: Swift
prerequisites: []
outcomes:
  - "Model a closed set of UI states as an enum with associated values, exhaustively matched"
  - "Explain the frozen vs non-frozen distinction and what @unknown default is for"
resources:
  - title: "Enumerations — The Swift Programming Language"
    url: "https://docs.swift.org/swift-book/documentation/the-swift-programming-language/enumerations/"
    date: "2025-06-01"
---

# Pattern Matching & Sealed Types in Swift — Exhaustive by Default, @unknown default at the Edge

A multiple-choice question with exactly four options can be graded by a machine: check each box,
confirm one is filled, done. Swift's `enum` with associated values *is* this feature in its most
mature form among these five languages — exhaustiveness is enforced by default, no opt-in
required.

## Mid {concept=pattern-matching/exhaustive-match}

**Interview question: "How do you model 'this can be exactly one of N things' so the compiler
catches a forgotten case?"**

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

**Follow-up an interviewer asks next:** "Does that always get checked, or only sometimes?" Always,
for your own module's types — unlike Kotlin's `when`, there's no statement-vs-expression distinction
that silently disables the check. Every `switch` over an `enum` you own is exhaustiveness-checked,
full stop.

**Pitfall at this level:** assuming Swift's unconditional exhaustiveness extends the same way to a
type you don't own — see the Senior section for the one case (a library's public enum) where it
doesn't.

## Senior {concept=pattern-matching/library-boundary}

**Interview question: "What happens when a library you don't control adds a new case to a closed
type you're matching on?"**

**Frozen vs. non-frozen.** Exhaustiveness inside your own module is unconditional — but a public
library enum can grow a new case in a later version without that being a breaking source change,
and a `switch` compiled against the old case set needs a way to stay compatible. That's what
`@unknown default` is for: a `default` branch that still handles today's cases exhaustively, but is
flagged by the compiler (a warning, not silence) the moment the library adds a case you haven't
explicitly handled yet.

```swift
switch remoteFeatureFlag {
case .on: enable()
case .off: disable()
@unknown default: fallbackToSafeState() // compiler warns here when a new case appears later
}
```

> [!IMPORTANT]
> "Closed hierarchy + exhaustive matching" is one of the most-copied ideas in modern language
> design, and Swift has had it since 1.0 — among the earliest of the languages in this guide.
> `@unknown default` is Swift's specific answer to the one place unconditional exhaustiveness would
> otherwise become a source-compatibility liability: a library evolving its own public enum.

**Follow-up:** "So what's the actual risk of skipping `@unknown default`?" Without it, a `switch`
against a library's non-frozen enum simply won't compile once you require exhaustiveness and the
library adds a case you haven't listed — which sounds safe, but means every dependency bump that
adds an enum case becomes a build break across every consuming `switch`, everywhere, at once. With
`@unknown default`, the compiler warns instead of breaking the build, and the fallback branch keeps
the app running safely on the new case until you get around to handling it explicitly.

**Pitfall at this level:** matching against a library's public enum without adding `@unknown
default` and assuming exhaustiveness is "just handled" the way it is for your own types — the
frozen/non-frozen distinction is exactly the case where that assumption breaks.

## Cross-language comparison

See the cross-language cheat sheet article for how Kotlin, Java, Dart and TypeScript each answer
the same two questions — or switch the language tab above to read this same topic in another
language directly.

## Pitfalls & trade-offs

- **Mid:** assuming Swift's unconditional exhaustiveness applies identically to a type you don't
  own — it doesn't, once the type is a non-frozen library enum.
- **Senior:** matching against a library's public enum without `@unknown default` — the next
  library version adding a case becomes a build break across every consuming `switch`, instead of
  a compiler warning with a safe fallback.
