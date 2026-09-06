---
id: fundamentals-collections-dart
title: Collections in Dart — Iterable Is Lazy by Default
description: Why Dart's where/map return lazy Iterables that evaluate nothing until toList() or a for-in loop forces them, and the side-effect trap that comes with it.
tags: [collections, functional, lazy-evaluation, dart, mid, senior]
lang: en
status: complete
domain: 01-programming-fundamentals
platform: shared
band: X
level: Mid
sidebar_position: 4
topic: collections
leaf: Dart
prerequisites: []
outcomes:
  - "Explain why Dart's Iterable pipeline evaluates nothing until it's forced, and what forces it"
  - "Name the side-effect timing trap and how to avoid it in review"
resources:
  - title: "Iterable collections — Dart documentation"
    url: "https://dart.dev/language/collections"
    date: "2025-04-01"
---

# Collections in Dart — Iterable Is Lazy by Default

Chaining `.where()`, `.map()`, and `.take()` reads simply — but hides a real execution-model
choice. One is like reading every book in the library before answering your question. The other
reads one at a time, stopping the instant you have the answer. Dart's `Iterable` is built around
the second model by default — the opposite starting point from most languages in this guide.

## Mid {concept=collections/eager-vs-lazy}

**Interview question: "Does `.where().map()` run immediately, or only when you actually use the
result?"**

**Dart's `Iterable` is lazy by default** — `where` and `map` return lazy iterables; nothing is
evaluated until something forces the whole chain to produce a value.

```dart
// Dart — Iterable is lazy by default: map/where return lazy iterables
final result = users
    .where((u) => u.isActive)   // returns a lazy Iterable — nothing evaluated yet
    .map((u) => u.displayName)  // still lazy — nothing evaluated yet
    .take(5)
    .toList(); // <-- forces evaluation, and only of what's needed
```

**Follow-up an interviewer asks next:** "What happens if you never call `.toList()` or iterate the
result?" Nothing runs at all — not the `where`, not the `map`. The chain is a recorded pipeline
until a `for-in` loop, `.toList()`, or another consuming operation actually pulls values through
it.

**Pitfall at this level:** assigning a `where().map()` chain to a variable and treating it as if
the filtering and mapping already happened — it's a lazy `Iterable`, not a `List`, until something
forces it.

## Senior {concept=collections/side-effect-timing}

**Interview question: "When does the laziness actually change program behavior, not just
performance?"**

**A short-circuiting operator means most of the input is never touched.** `.take(5)` on a lazy
chain stops pulling from upstream the moment 5 matches have been produced — if `users` has a
million rows and the first 5 active ones appear in the first 20, that's 20 evaluations, not a
million. If `where`/`map` have any observable side effect, the *number of times that side effect
runs* is different from what an eager mental model would predict.

**A side effect inside `.map()` runs at consumption time, not declaration time — and assuming
otherwise is the same trap Kotlin's `Sequence` and Java's `Stream` share:**

```dart
final mapped = users.where((u) => u.isActive).map((user) {
  print('processing ${user.id}'); // has NOT printed anything yet
  return user.toDto();
});
// ... time passes, more code runs, nothing has been printed ...
final list = mapped.toList(); // <-- only now does every "processing ..." line print, all at once, here
```

An engineer coming from a language whose plain collections are eager (Kotlin, Swift, TypeScript)
brings exactly the wrong default assumption to Dart — Dart's everyday `Iterable` chain is the lazy
one, not the exception.

> [!IMPORTANT]
> Dart's `Iterable` is lazy-by-default with no eager mode to opt out into for `where`/`map` — the
> only way to force evaluation is `.toList()`, `.toSet()`, or iterating it directly. Reading
> unfamiliar Dart code for this risk means treating any side effect inside `where`/`map` as
> running at the consumption point, not the declaration point.

**Follow-up:** "How do you avoid this in review?" Keep side effects out of `where`/`map`
callbacks — they should be pure transforms. If a side effect genuinely belongs in the pipeline,
make the consumption point (`.toList()`, the `for-in` loop) obvious right next to the declaration.

**Pitfall at this level:** assuming a `where`/`map` callback's side effect has already executed —
correct instinct for Kotlin's or Swift's plain eager collections, wrong for Dart's `Iterable`,
which is lazy by default with no exception.

## Cross-language comparison

See the cross-language cheat sheet article for how Kotlin, Java, Swift and TypeScript each answer
the same two questions — or switch the language tab above to read this same topic in another
language directly.

## Pitfalls & trade-offs

- **Mid:** treating a `where().map()` chain as already-evaluated — it's a lazy `Iterable` until
  `.toList()` or iteration forces it.
- **Senior:** assuming a `where`/`map` callback's side effect has already executed — it runs at
  consumption time, or never, if the `Iterable` is never consumed. The wrong default is especially
  easy to carry over from Kotlin, Swift, or TypeScript, whose plain collections are eager.
