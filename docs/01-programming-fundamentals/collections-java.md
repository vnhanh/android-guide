---
id: fundamentals-collections-java
title: Collections in Java — Stream Is Lazy by Construction
description: Why Java's Stream doesn't run anything until a terminal operation is called, the single-consumption gotcha that throws at runtime, and the side-effect trap that catches engineers moving from Kotlin.
tags: [collections, functional, lazy-evaluation, java, mid, senior]
lang: en
status: complete
domain: 01-programming-fundamentals
platform: shared
band: X
level: Mid
sidebar_position: 4
topic: collections
leaf: Java
prerequisites: []
outcomes:
  - "Explain why a Java Stream pipeline runs nothing until a terminal operation is called"
  - "Name the single-consumption runtime error and why eager collections in other languages don't have it"
resources:
  - title: "Stream (Java Platform SE)"
    url: "https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/stream/Stream.html"
    date: "2024-11-01"
---

# Collections in Java — Stream Is Lazy by Construction

Chaining `.filter()`, `.map()`, and `.limit()` reads simply — but hides a real execution-model
choice. One is like reading every book in the library before answering your question. The other
reads one at a time, stopping the instant you have the answer. Java's `Stream` is built entirely
around the second model, from the ground up.

## Mid {concept=collections/eager-vs-lazy}

**Interview question: "Does `.filter().map()` run immediately, or only when you actually use the
result?"**

**Java's `Stream` is lazy by construction** — it does not run an intermediate operation at all
until something forces the whole chain to produce a value.

```java
// Java — Stream is lazy by construction: filter/map don't run until a terminal op is called
List<String> result = users.stream()
    .filter(u -> u.isActive())   // records the step — nothing runs yet
    .map(User::getDisplayName)   // records the step — nothing runs yet
    .limit(5)
    .collect(Collectors.toList()); // <-- only now does anything actually execute
```

**Follow-up an interviewer asks next:** "What happens if a Stream is built but never terminated?"
Nothing at all runs — not the filter, not the map, none of it. Every intermediate operation on a
`Stream` is purely a recorded step until a terminal operation (`.collect()`, `.forEach()`,
`.count()`, and so on) actually pulls values through the pipeline.

**Pitfall at this level:** building a `Stream` pipeline and assigning it to a variable without ever
calling a terminal operation on it — the whole pipeline is dead code, silently, with no compiler
warning.

## Senior {concept=collections/side-effect-timing}

**Interview question: "What's the single-consumption gotcha with `Stream`, and how is it different
from Kotlin/Swift/TypeScript collections?"**

**A `Stream` can only be consumed once.** Calling a terminal operation a second time on the same
`Stream` throws `IllegalStateException` at runtime — a mistake eager Kotlin/Swift/TypeScript
collections don't allow because there's no "already consumed" state to be in; a `List` can be
iterated as many times as you like.

**A side effect inside `.map()` runs at consumption time, not declaration time — and assuming
otherwise is a real bug, not a style nitpick.** The mirror-image mistake from Kotlin: a Kotlin
engineer moving to Java often assumes `Stream.map` behaves like Kotlin's eager `List.map`, i.e.
that it already ran:

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

> [!IMPORTANT]
> A `Stream` is always lazy — there is no eager mode to opt out into. Reading unfamiliar Java for
> this risk means checking, at every `.map`/`.filter` call on a `Stream`, whether the chain is
> actually terminated somewhere, and treating any side effect inside the lambda as running at that
> terminal call site, not at the line where the lambda is written.

**Follow-up:** "How do you avoid this in review?" Keep side effects out of `map`/`filter` lambdas —
they should be pure transforms. If a side effect genuinely belongs in the pipeline, make the
terminal operation obvious right next to the declaration, so nobody has to scroll to find out
whether the pipeline is ever actually consumed.

**Pitfall at this level:** assuming a `Stream.map()` lambda's side effect has already executed —
correct instinct for Kotlin's plain `List.map`, wrong for every Java `Stream`, which is always
lazy with no exception.

## Cross-language comparison

See the cross-language cheat sheet article for how Kotlin, Swift, Dart and TypeScript each answer
the same two questions — or switch the language tab above to read this same topic in another
language directly.

## Pitfalls & trade-offs

- **Mid:** building a `Stream` pipeline and never calling a terminal operation on it — the whole
  pipeline silently never runs, with no compiler warning.
- **Mid:** calling a terminal operation on a `Stream` a second time — `IllegalStateException` at
  runtime, a state eager collections in other languages can't get into.
- **Senior:** assuming a `Stream.map()` lambda's side effect has already executed at the line
  where it's written — it runs at the terminal call, or never, if the stream is never terminated.
