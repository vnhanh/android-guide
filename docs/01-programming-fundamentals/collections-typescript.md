---
id: fundamentals-collections-typescript
title: Collections in TypeScript — Eager Arrays, Generators as the Lazy Escape Hatch
description: Why TypeScript/JavaScript's Array methods run each step immediately with no built-in lazy collection type, and how a generator function is the idiomatic escape hatch when it matters.
tags: [collections, functional, lazy-evaluation, typescript, mid, senior]
lang: en
status: complete
domain: 01-programming-fundamentals
platform: shared
band: X
level: Mid
sidebar_position: 4
topic: collections
leaf: TypeScript
prerequisites: []
outcomes:
  - "State that TypeScript/JavaScript Array methods are eager, and name the generator-based escape hatch for lazy evaluation"
  - "Explain why there's no built-in short-circuit for a chained Array pipeline"
resources:
  - title: "Iterators and generators — MDN"
    url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Iterators_and_generators"
    date: "2025-05-01"
---

# Collections in TypeScript — Eager Arrays, Generators as the Lazy Escape Hatch

Chaining `.filter()`, `.map()`, and `.slice()` reads simply — but hides a real execution-model
choice. One is like reading every book in the library before answering your question. The other
reads one at a time, stopping the instant you have the answer. TypeScript/JavaScript's `Array`
methods are all the first kind — there is no built-in lazy collection type at all.

## Mid {concept=collections/eager-vs-lazy}

**Interview question: "Does `.filter().map()` run immediately, or only when you actually use the
result?"**

**TypeScript/JavaScript `Array` methods are eager** — each step runs immediately and allocates a
new array before moving to the next step.

```typescript
// TypeScript/JavaScript — Array methods are eager
const result = users
  .filter(u => u.isActive)   // a new array, built right now
  .map(u => u.displayName)   // another new array, built right now
  .slice(0, 5);
```

**Follow-up an interviewer asks next:** "Is there a lazy alternative in TypeScript at all?" Not a
built-in collection type — the escape hatch is a generator function, consumed on demand instead of
materialized up front:

```typescript
function* filterMap<T, R>(items: Iterable<T>, pred: (t: T) => boolean, fn: (t: T) => R): Generator<R> {
  for (const item of items) {
    if (pred(item)) yield fn(item);
  }
}
// nothing runs until you iterate — a for..of loop, or [...gen].slice(0, 5)
```

That's a generator's whole job here, not a topic to go deep on in this article.

**Pitfall at this level:** reaching for a hand-rolled generator pipeline on a small array with one
`.map()` call. The eager `Array` methods are more readable and their allocations are noise, not a
performance problem, for anything short-lived and small.

## Senior {concept=collections/side-effect-timing}

**Interview question: "Since Array methods are always eager, is there ever a real bug lurking
here?"**

**Because there's no built-in short-circuit, a chained `Array` pipeline always processes every
element, even when only a handful are needed.** `users.filter(u => u.isActive).map(u =>
u.displayName).slice(0, 5)` filters and maps *every* user before slicing to 5 — unlike Kotlin's
`Sequence`, Swift's `.lazy`, or Java's `Stream`, there is no way to make `.filter().map()` itself
short-circuit; only a hand-rolled generator (or a manual `for` loop with an early `break`) avoids
the full pass.

**Side effects inside `.map()`/`.filter()` callbacks run immediately, at the call site — this is
the one language in this guide where that assumption is always safe**, precisely because there is
no lazy `Array` mode to accidentally be holding instead. The trap other languages have (assuming a
lazy value has already run its side effects) doesn't exist here — but the opposite mistake does:
assuming a *generator* you wrote behaves like an eager array.

```typescript
const gen = filterMap(users, u => u.isActive, u => {
  console.log('processing', u.id); // has NOT run yet — generators are lazy
  return u.toDto();
});
// nothing has logged anything yet
const list = [...gen].slice(0, 5); // <-- only now does the generator body actually run
```

**Follow-up:** "So when is it worth reaching for a generator instead of plain `Array` methods?"
When the source is large or genuinely unbounded (a paginated API, a stream of events) and only a
prefix is ever needed — the generator avoids materializing the whole thing, at the cost of the less
familiar `function*`/`yield` syntax.

**Pitfall at this level:** writing a generator-based pipeline and assuming its callback behaves
like a plain `Array` method's — a generator is lazy exactly the way Kotlin's `Sequence` or Java's
`Stream` is, once you've opted into it.

## Cross-language comparison

See the cross-language cheat sheet article for how Kotlin, Java, Swift and Dart each answer the
same two questions — or switch the language tab above to read this same topic in another language
directly.

## Pitfalls & trade-offs

- **Mid:** reaching for a hand-rolled generator on a small, single-pass array — plain eager
  `Array` methods are more readable and the allocation cost is noise at that scale.
- **Senior:** assuming a chained `.filter().map()` pipeline short-circuits on a following `.slice()`
  — it doesn't; every element is processed regardless, unlike Kotlin's `Sequence` or Swift's
  `.lazy`.
- **Senior:** writing a generator-based pipeline and assuming its callback runs eagerly like a
  plain `Array` method — a generator is lazy, and a side effect inside it runs only once the
  generator is actually iterated.
