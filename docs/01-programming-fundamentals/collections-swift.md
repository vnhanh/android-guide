---
id: fundamentals-collections-swift
title: Collections in Swift — Eager Array Operators, .lazy Opts You Into Deferred Evaluation
description: Why Swift's Array operators run each step immediately, how .lazy switches to deferred evaluation, and why a short-circuiting chain can avoid touching most of the input.
tags: [collections, functional, lazy-evaluation, swift, mid, senior]
lang: en
status: complete
domain: 01-programming-fundamentals
platform: shared
band: X
level: Mid
sidebar_position: 4
topic: collections
leaf: Swift
prerequisites: []
outcomes:
  - "State whether a Swift .map/.filter chain runs eagerly or lazily by default, and how to switch to the other mode"
  - "Explain when a short-circuiting operator actually changes how much of the input is touched"
resources:
  - title: "Sequence — Swift documentation"
    url: "https://developer.apple.com/documentation/swift/sequence"
    date: "2025-06-01"
---

# Collections in Swift — Eager Array Operators, .lazy Opts You Into Deferred Evaluation

Chaining `.filter()`, `.map()`, and `.prefix()` reads simply — but hides a real execution-model
choice. One is like reading every book in the library before answering your question. The other
reads one at a time, stopping the instant you have the answer. Swift's `Array` defaults to the
first; `.lazy` is how you opt into the second.

## Mid {concept=collections/eager-vs-lazy}

**Interview question: "Does `.filter().map()` run immediately, or only when you actually use the
result?"**

**Swift's `Array` operators are eager by default** — each step runs immediately and allocates a
new array before moving to the next step.

```swift
// Swift — Array operators are eager, each step allocated immediately
let result = users
    .filter { $0.isActive }   // a new Array, allocated immediately
    .map { $0.displayName }   // another new Array, allocated immediately
    .prefix(5)
```

`.lazy` switches an `Array` to deferred evaluation:

```swift
let result = users.lazy
    .filter { $0.isActive }
    .map { $0.displayName }
    .prefix(5)
```

**Follow-up an interviewer asks next:** "So which one should you reach for, by default?" Neither,
reflexively. For a handful of items or a single `.map`, plain eager `Array` operators are more
readable, and the eager allocations are noise, not a performance problem.

> [!TIP]
> Reach for `.lazy` when the collection is large, the chain has several steps, or a
> short-circuiting operator (`.prefix`, `.first`, `.contains`) means most of the input never needs
> to be touched. Otherwise the lazy wrapper's own overhead costs more than it saves.

**Pitfall at this level:** reaching for `.lazy` reflexively on a five-element array with one `.map`
call. The lazy path has its own setup cost — for small, single-pass work it is strictly worse than
the eager default, not a free upgrade.

## Senior {concept=collections/side-effect-timing}

**Interview question: "When does eager vs lazy actually change program behavior, not just
performance?"**

**A short-circuiting operator means most of the input is never touched, under `.lazy`.** Under an
eager pipeline, `users.filter { $0.isActive }.map { $0.displayName }.prefix(5)` filters and maps
*every* user before taking the first 5. Under `.lazy`, `.prefix(5)` stops pulling from upstream the
moment 5 matches have been produced — if `users` has a million rows and the first 5 active ones
appear in the first 20, that's 20 evaluations, not a million. If `filter`/`map` have any observable
side effect, the *number of times that side effect runs* is different between the two modes, not
just the wall-clock time.

A side effect inside a `.lazy` chain's closure runs at the point something actually iterates the
result (a `for` loop, converting to `Array`), not at the line where `.lazy` is written — the same
declaration-time-vs-consumption-time trap that shows up as Kotlin's `Sequence` and Java's `Stream`.

> [!IMPORTANT]
> Swift's `Array` operators are eager-by-default and you opt into deferred evaluation via `.lazy`.
> Reading unfamiliar code for this risk means checking, at every `.map`/`.filter` call, whether the
> chain starts with `.lazy` before reasoning about whether a side effect inside the closure has
> already happened.

**Follow-up:** "How do you avoid this in review?" Keep side effects out of `map`/`filter`
closures — they should be pure transforms. If a side effect genuinely belongs in the pipeline,
make the consumption point (the `for` loop, the `Array(...)` conversion) obvious right next to the
declaration.

**Pitfall at this level:** assuming a `.lazy` chain's closure side effect has already executed at
the line where it's written — it runs only once something actually consumes the lazy sequence.

## Cross-language comparison

See the cross-language cheat sheet article for how Kotlin, Java, Dart and TypeScript each answer
the same two questions — or switch the language tab above to read this same topic in another
language directly.

## Pitfalls & trade-offs

- **Mid:** reaching for `.lazy` reflexively on a small, single-pass array — the lazy wrapper's own
  overhead costs more than the eager allocations it avoids.
- **Senior:** assuming a `.lazy` chain's closure side effect has already executed at declaration
  time — it runs only once something actually consumes the sequence, the same trap Kotlin's
  `Sequence` and Java's `Stream` share.
