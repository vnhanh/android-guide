---
id: fundamentals-collections-and-functional-operations
title: Collections & Functional-Style Operations, Across Five Languages
description: Whether a map/filter chain runs the moment you write it or only when you consume the result, per language — and why assuming the wrong one is a real bug source, not just a style question.
tags: [collections, functional, lazy-evaluation, kotlin, java, swift, dart, typescript, mid, senior]
lang: en
status: complete
domain: 01-programming-fundamentals
platform: shared
band: X
level: Mid
sidebar_position: 4
prerequisites: []
outcomes:
  - "State, per language, whether a .map/.filter chain runs eagerly or lazily by default, and how to switch to the other mode"
  - "Explain why a side effect inside a lazy pipeline's lambda can run later, or a different number of times, than expected, with a concrete example"
resources:
  - title: "Sequences — Kotlin documentation"
    url: "https://kotlinlang.org/docs/sequences.html"
    date: "2025-03-01"
  - title: "Stream (Java Platform SE)"
    url: "https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/stream/Stream.html"
    date: "2024-11-01"
---

# Collections & Functional-Style Operations, Across Five Languages

Chaining `.map()`, `.filter()`, and `.take()` reads the same in every one of these five
languages — but "the same code" hides two genuinely different execution models. One is like
reading every book in the library before answering your question, even if the answer was in the
second book you opened. The other is like reading books one at a time, stopping the instant you
have the answer. Both are "correct" in the sense that they produce the same final result for a
pure transformation — but they differ in how much work actually happens, and, once a lambda has a
side effect, they can differ in *what* happens and *when*. Knowing which model a language defaults
to is the difference between a chain that's merely less efficient than it could be, and one that
silently does the wrong thing.

## Mid

**Interview question: "Does `.map().filter()` run immediately, or only when you actually use the
result?"**

The honest answer splits languages into two buckets, and the split does not follow any obvious
pattern — a Java engineer moving to Kotlin, or a Kotlin engineer moving to Dart, can get this
backwards.

**Bucket 1: eager by default.** `Kotlin`'s `List`/`Map`/`Set` operators, `Swift`'s `Array`
operators, and `TypeScript`/`JavaScript`'s `Array` methods all run each step immediately and
allocate a full intermediate collection before moving to the next step.

```kotlin
// Kotlin — plain collections are eager: each operator allocates a new List right away
val result = users
    .filter { it.isActive }   // allocates a full intermediate List, right now
    .map { it.displayName }   // allocates another full List, right now
    .take(5)
```

```swift
// Swift — Array operators are eager, same shape as Kotlin's plain collections
let result = users
    .filter { $0.isActive }   // a new Array, allocated immediately
    .map { $0.displayName }   // another new Array, allocated immediately
    .prefix(5)
```

```typescript
// TypeScript/JavaScript — Array methods are eager
const result = users
  .filter(u => u.isActive)   // a new array, built right now
  .map(u => u.displayName)   // another new array, built right now
  .slice(0, 5);
```

**Bucket 2: lazy by default.** `Java`'s `Stream` and `Dart`'s `Iterable` do not run an intermediate
operation at all until something forces the whole chain to produce a value.

```java
// Java — Stream is lazy by construction: filter/map don't run until a terminal op is called
List<String> result = users.stream()
    .filter(u -> u.isActive())   // records the step — nothing runs yet
    .map(User::getDisplayName)   // records the step — nothing runs yet
    .limit(5)
    .collect(Collectors.toList()); // <-- only now does anything actually execute
```

```dart
// Dart — Iterable is lazy by default: map/where return lazy iterables
final result = users
    .where((u) => u.isActive)   // returns a lazy Iterable — nothing evaluated yet
    .map((u) => u.displayName)  // still lazy — nothing evaluated yet
    .take(5)
    .toList(); // <-- forces evaluation, and only of what's needed
```

Kotlin, Swift and TypeScript/JS opt **into** laziness. Kotlin's `.asSequence()` switches a
collection to lazy, single-pass evaluation:

```kotlin
val result = users.asSequence()
    .filter { it.isActive }
    .map { it.displayName }
    .take(5)
    .toList() // materializes only the 5 elements actually needed
```

Swift's `.lazy` does the same thing to an `Array`:

```swift
let result = users.lazy
    .filter { $0.isActive }
    .map { $0.displayName }
    .prefix(5)
```

TypeScript/JavaScript have no built-in lazy collection type at all — the escape hatch is a
generator function, consumed on demand instead of materialized up front:

```typescript
function* filterMap<T, R>(items: Iterable<T>, pred: (t: T) => boolean, fn: (t: T) => R): Generator<R> {
  for (const item of items) {
    if (pred(item)) yield fn(item);
  }
}
// nothing runs until you iterate — a for..of loop, or [...gen].slice(0, 5)
```

That's a generator's whole job here, not a topic to go deep on in this article.

**Follow-up an interviewer asks next:** "So which one should you reach for, by default?" Neither,
reflexively. For a handful of items or a single `.map`, plain eager collections (or an unconsumed
`Stream`/`Iterable`, which you were going to `.collect()`/`.toList()` immediately anyway) are more
readable, and the eager allocations are noise, not a performance problem.

> [!TIP]
> The rule of thumb, carried over language by language: reach for the lazy mode (`Sequence`,
> `.lazy`, or Java's `Stream` used as intended) when the collection is large, the chain has several
> steps, or a short-circuiting operator (`take`/`limit`, `first`, `any`) means most of the input
> never needs to be touched. Otherwise the lazy machinery's own allocation and iterator overhead
> costs more than it saves.

**Mid pitfall:** reaching for `.asSequence()` or `.lazy` reflexively on a five-element list with
one `.map` call. The lazy path has its own setup cost — for small, single-pass work it is strictly
worse than the eager default, not a free upgrade.

## Senior

**Interview question: "When does eager vs lazy actually change program behavior, not just
performance?"**

Two situations, and both come up in real code review.

**1. A short-circuiting operator means most of the input is never touched.** Under an eager
pipeline, `users.filter { it.isActive }.map { it.displayName }.take(5)` filters and maps *every*
user before taking 5. Under a lazy pipeline (`asSequence`, `.lazy`, `Stream`, `Iterable`), `take(5)`
stops pulling from upstream the moment 5 matches have been produced — if `users` has a million rows
and the first 5 active ones appear in the first 20, that's 20 evaluations, not a million. This
isn't just faster; if `filter`/`map` have any observable side effect (a log line, a counter), the
*number of times that side effect runs* is different between the two modes, not just the wall-clock
time.

**2. A side effect inside `.map{}` runs at consumption time, not declaration time, under a lazy
pipeline — and assuming otherwise is a real bug, not a style nitpick.** This is the direction the
interview trap runs both ways:

```kotlin
// Kotlin — a Java engineer's instinct: "this .map already ran, the log lines are already printed"
val mapped = users.asSequence().map { user ->
    println("processing ${user.id}") // WRONG ASSUMPTION: this has NOT printed anything yet
    user.toDto()
}
// ... time passes, more code runs, nothing has been logged ...
val list = mapped.toList() // <-- only now does every "processing ..." line print, all at once, here
```

```java
// Java — the mirror-image mistake: a Kotlin engineer assuming Stream.map behaves like Kotlin's
// eager List.map, i.e. that it already ran
Stream<UserDto> mapped = users.stream().map(user -> {
    System.out.println("processing " + user.getId()); // has NOT run yet either — same trap
    return toDto(user);
});
// if this Stream is never terminated with .collect()/.forEach()/etc., the side effect NEVER runs at all
List<UserDto> list = mapped.collect(Collectors.toList()); // <-- execution happens here
```

The direction of the trap is the interesting part: a Kotlin engineer's default mental model is
"`.map()` on a collection is eager" — correct for plain `List`, wrong the moment the value in hand
is a `Sequence`. A Java engineer's default mental model is "a `Stream` is lazy" — correct, but the
same engineer moving to Kotlin often assumes the opposite default: that Kotlin's plain `.map()`
behaves like the `Stream` they're used to, and is safe to declare without immediately consuming.
Neither assumption transfers. The only fix is knowing, per type in hand — not per language, per
*type* — whether declaring the operation already ran it.

> [!IMPORTANT]
> Kotlin's collections are eager-by-default and you opt into Kotlin's lazy mode via
> `.asSequence()`. Java's `Stream` is lazy-by-default — the exact opposite starting point. Reading
> unfamiliar code for this risk means checking, at every `.map`/`.filter` call, which concrete type
> you're holding (`List` vs `Sequence` in Kotlin; a `Stream` in Java is always lazy) before
> reasoning about whether a side effect inside the lambda has already happened.

**Follow-up:** "How do you avoid this in review?" Keep side effects out of `map`/`filter` lambdas —
they should be pure transforms. If a side effect genuinely belongs in the pipeline (logging,
metrics), make the consumption point obvious right next to the declaration, so nobody has to
scroll to find out whether `.toList()`/`.collect()`/a `for` loop ever actually runs it.

## Cross-language comparison table

| | Kotlin | Java | Swift | Dart | TypeScript |
|---|---|---|---|---|---|
| Default for collection ops | eager | lazy (Stream) | eager | lazy (Iterable) | eager |
| Opt-in to the other mode | `.asSequence()` | `.collect()` or another terminal op forces eager execution | `.lazy` | `.toList()` forces eager | generators (`function*`) |
| Short-circuits on take/first | yes, via `Sequence` | yes | yes, via `.lazy` | yes | no built-in short-circuit — break manually or use a generator |

## Pitfalls & trade-offs

- **Mid:** reaching for `.asSequence()`/`.lazy` reflexively on a small, single-pass collection —
  the lazy machinery's own overhead costs more than the eager allocations it avoids.
- **Mid:** forgetting that a Java `Stream` can only be consumed once — calling a terminal operation
  a second time throws at runtime, a mistake eager Kotlin/Swift/TypeScript collections don't allow
  because there's no "already consumed" state to be in.
- **Senior:** assuming a `.map{}`/`.map()` lambda's side effect has already executed, when the
  value in hand is actually a lazy type (`Sequence`, `Stream`, `Iterable`) — the side effect runs at
  consumption time, and an un-terminated `Stream` or un-iterated `Iterable` may mean it never runs
  at all.
- **Senior:** carrying one language's default across to another — Kotlin's plain collections are
  eager, Java's `Stream` is lazy, and assuming either one matches the other's behavior is the
  single most common cross-language mistake in this area.
