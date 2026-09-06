---
id: fundamentals-collections-kotlin
title: Collections in Kotlin — Eager by Default, Sequence Opts You Into Lazy
description: Why Kotlin's List/Map/Set operators run each step immediately, how asSequence() switches to lazy evaluation, and the side-effect trap that catches engineers moving from Java.
tags: [collections, functional, lazy-evaluation, kotlin, mid, senior]
lang: en
status: complete
domain: 01-programming-fundamentals
platform: shared
band: X
level: Mid
sidebar_position: 4
topic: collections
leaf: Kotlin
prerequisites: []
outcomes:
  - "State whether a Kotlin .map/.filter chain runs eagerly or lazily by default, and how to switch to the other mode"
  - "Explain why a side effect inside a Sequence's lambda can run later, or not at all, than expected"
resources:
  - title: "Sequences — Kotlin documentation"
    url: "https://kotlinlang.org/docs/sequences.html"
    date: "2025-03-01"
---

# Collections in Kotlin — Eager by Default, Sequence Opts You Into Lazy

Chaining `.map()`, `.filter()`, and `.take()` reads simply — but hides a real execution-model
choice. One is like reading every book in the library before answering your question. The other
reads one at a time, stopping the instant you have the answer. Kotlin's plain collections default
to the first; `Sequence` is how you opt into the second.

## Mid {concept=collections/eager-vs-lazy}

**Interview question: "Does `.map().filter()` run immediately, or only when you actually use the
result?"**

**Kotlin's `List`/`Map`/`Set` operators are eager by default** — each step runs immediately and
allocates a full intermediate collection before moving to the next step.

```kotlin
// Kotlin — plain collections are eager: each operator allocates a new List right away
val result = users
    .filter { it.isActive }   // allocates a full intermediate List, right now
    .map { it.displayName }   // allocates another full List, right now
    .take(5)
```

`.asSequence()` switches a collection to lazy, single-pass evaluation:

```kotlin
val result = users.asSequence()
    .filter { it.isActive }
    .map { it.displayName }
    .take(5)
    .toList() // materializes only the 5 elements actually needed
```

**Follow-up an interviewer asks next:** "So which one should you reach for, by default?" Neither,
reflexively. For a handful of items or a single `.map`, plain eager collections are more readable,
and the eager allocations are noise, not a performance problem.

> [!TIP]
> Reach for `.asSequence()` when the collection is large, the chain has several steps, or a
> short-circuiting operator (`take`, `first`, `any`) means most of the input never needs to be
> touched. Otherwise the lazy machinery's own allocation and iterator overhead costs more than it
> saves.

**Pitfall at this level:** reaching for `.asSequence()` reflexively on a five-element list with one
`.map` call. The lazy path has its own setup cost — for small, single-pass work it is strictly
worse than the eager default, not a free upgrade.

## Senior {concept=collections/side-effect-timing}

**Interview question: "When does eager vs lazy actually change program behavior, not just
performance?"**

**A short-circuiting operator means most of the input is never touched, under `Sequence`.** Under
an eager pipeline, `users.filter { it.isActive }.map { it.displayName }.take(5)` filters and maps
*every* user before taking 5. Under `.asSequence()`, `take(5)` stops pulling from upstream the
moment 5 matches have been produced. If `filter`/`map` have any observable side effect, the
*number of times that side effect runs* is different between the two modes, not just the
wall-clock time.

**A side effect inside `.map{}` runs at consumption time, not declaration time, under a `Sequence`
— and assuming otherwise is a real bug, not a style nitpick:**

```kotlin
// Kotlin — a Java engineer's instinct: "this .map already ran, the log lines are already printed"
val mapped = users.asSequence().map { user ->
    println("processing ${user.id}") // WRONG ASSUMPTION: this has NOT printed anything yet
    user.toDto()
}
// ... time passes, more code runs, nothing has been logged ...
val list = mapped.toList() // <-- only now does every "processing ..." line print, all at once, here
```

The trap runs specifically in the direction of Kotlin's own defaults: a Kotlin engineer's default
mental model is "`.map()` on a collection is eager" — correct for plain `List`, wrong the moment
the value in hand is a `Sequence`.

> [!IMPORTANT]
> Kotlin's collections are eager-by-default and you opt into lazy mode via `.asSequence()`.
> Reading unfamiliar code for this risk means checking, at every `.map`/`.filter` call, which
> concrete type you're holding — `List` or `Sequence` — before reasoning about whether a side
> effect inside the lambda has already happened.

**Follow-up:** "How do you avoid this in review?" Keep side effects out of `map`/`filter` lambdas —
they should be pure transforms. If a side effect genuinely belongs in the pipeline, make the
consumption point (`.toList()`, `.forEach()`) obvious right next to the declaration.

**Pitfall at this level:** assuming a `.map{}` lambda's side effect has already executed when the
value in hand is actually a `Sequence` — the side effect runs at consumption time, or never, if the
sequence is never terminated.

## Cross-language comparison

See the cross-language cheat sheet article for how Java, Swift, Dart and TypeScript each answer
the same two questions — or switch the language tab above to read this same topic in another
language directly.

## Pitfalls & trade-offs

- **Mid:** reaching for `.asSequence()` reflexively on a small, single-pass collection — the lazy
  machinery's own overhead costs more than the eager allocations it avoids.
- **Senior:** assuming a `.map{}` lambda's side effect has already executed, when the value in hand
  is actually a `Sequence` — the side effect runs at consumption time, and an un-terminated
  sequence may mean it never runs at all.
