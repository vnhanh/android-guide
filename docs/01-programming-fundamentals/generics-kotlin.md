---
id: fundamentals-generics-kotlin
title: Generics & Variance in Kotlin — Declaration-Site out/in & the reified Escape Hatch
description: How Kotlin declares variance once on the type itself instead of per call site, and the inline reified trick that's the one real workaround for JVM type erasure among these languages.
tags: [generics, variance, type-erasure, kotlin, mid, senior]
lang: en
status: complete
domain: 01-programming-fundamentals
platform: shared
band: X
level: Mid
sidebar_position: 6
topic: generics
leaf: Kotlin
prerequisites: []
outcomes:
  - "Explain what type erasure means for a Kotlin generic function, and the reified workaround"
  - "Design a producer/consumer-shaped generic API using declaration-site out/in variance"
resources:
  - title: "Generics — Kotlin documentation"
    url: "https://kotlinlang.org/docs/generics.html"
    date: "2025-03-01"
---

# Generics & Variance in Kotlin — Declaration-Site out/in & the reified Escape Hatch

A generic type is a promise: "this works for any `T`, and I won't peek at what `T` actually is."
Variance is the finer promise underneath that one: does this type only ever *produce* a `T`, only
ever *consume* a `T`, or both? Kotlin lets you declare that direction once, on the type itself.

## Mid {concept=generics/type-erasure}

**Interview question: "What does a generic type actually guarantee, and where does that guarantee
break?"**

A generic type guarantees compile-time substitutability for any type argument, and nothing about
what's still known at runtime.

```kotlin
// Kotlin — an unmarked generic parameter is invariant, and works the same as Java's:
// write once, use with any type argument.
class Box<T>(val value: T)
fun <T> firstOrNull(items: List<T>): T? = items.firstOrNull()
```

**Type erasure is a JVM-level limitation Kotlin inherits from Java**: at runtime, a `List<String>`
and a `List<Integer>` are both just a `List`. But Kotlin has a real, checkable workaround Java
lacks entirely: `inline` plus `reified`.

```kotlin
inline fun <reified T> Gson.fromJson(json: String): T = fromJson(json, T::class.java)
// Ordinary generics can't do `T::class.java` — a plain generic function has no T at runtime
// to ask about. `reified` only exists on `inline` functions: because the function body is
// copied to each call site at compile time, the real type is known there, and `reified`
// lets the body use it as if erasure never happened. Java has nothing equivalent — this is
// a real, checkable difference in what the two languages let you express.
```

**Follow-up an interviewer asks next:** "Does `reified` come free?" No — `reified` only exists on
`inline` functions, and `inline` has its own cost: the function body is pasted at every call site
instead of allocated as a callable object, which grows compiled method size per call site.

**Pitfall at this level:** assuming a generic function can do anything a non-generic one can, just
"for any type" — reflection, instantiation (`T()`), and runtime type checks (`is T`) are all
erasure casualties in ordinary (non-`reified`) Kotlin generics too.

## Senior {concept=generics/variance-declaration}

**Interview question: "What's the difference between declaring variance on the type vs at each
call site?"**

**Kotlin lets you declare the produce/consume direction once, on the type's own declaration, and
every use of that type inherits it** — the sharpest contrast with Java, which has no such
declaration at all.

```kotlin
// Kotlin — declaration-site variance: stated once, on Producer/Consumer themselves.
interface Producer<out T> { fun produce(): T }   // out: only ever returns T
interface Consumer<in T> { fun consume(item: T) } // in: only ever accepts T as a parameter

fun feed(consumer: Consumer<Cat>) { consumer.consume(Cat()) }
feed(Consumer<Animal> { animal -> /* handles any Animal, including Cat */ }) // legal: in-variance
```

`Producer<out T>` is decided once and every piece of code that uses `Producer` agrees on it —
contrast with Java, where the same interface can be used covariantly in one call and invariantly
in another, because the direction is a property of the call site there, not the type.

> [!NOTE]
> Three languages in this guide independently converged on the literal keywords `in`/`out` for the
> same concept — Kotlin, Dart (2.x+, opt-in), and TypeScript (4.7+, opt-in). That's a genuinely
> useful fact to have ready: it means the concept, not just the keyword, is worth understanding
> once and reusing across all three.

**Follow-up:** "How does `inline` (the mechanism `reified` rides on) actually cost you anything?"
A normal higher-order function allocates a `Function` object for its lambda and pays a virtual call
to invoke it; `inline` pastes the function's body directly at each call site instead — no
allocation, no virtual call, but every call site now gets its own copy of that body.

```kotlin
inline fun <T> measureAndLog(label: String, block: () -> T): T {
    val start = System.nanoTime()
    val result = block()
    Log.d("perf", "$label took ${(System.nanoTime() - start) / 1_000_000}ms")
    return result
}
```

> [!WARNING]
> `inline` is not free. Every call site's copy of the function body grows the compiled method
> size — for a large function called from many places, this can bloat the binary and, past a
> platform method-size limit, fail to compile at all. Reserve `inline` for small, hot-path, or
> `reified`-requiring functions.

**Pitfall at this level:** marking a Kotlin type `out` or `in` without checking every member
honours the direction — the compiler catches an outright violation, but a near-miss (a method that
only *looks* like it only produces `T`) is worth an explicit second read before publishing the API.

## Cross-language comparison

See the cross-language cheat sheet article for how Java, Swift, Dart and TypeScript each answer
the same two questions — or switch the language tab above to read this same topic in another
language directly.

## Pitfalls & trade-offs

- **Mid:** assuming a generic function can do anything a concrete one can — reflection,
  instantiation, and runtime type checks are all erasure casualties in ordinary (non-`reified`)
  Kotlin generics.
- **Senior:** marking a type `out` or `in` without checking every member honours the direction —
  the compiler catches an outright violation, but not a near-miss.
- **Senior:** inlining a large function for a marginal allocation saving — method-size growth is a
  real cost, and it's per call site, so it multiplies with usage.
