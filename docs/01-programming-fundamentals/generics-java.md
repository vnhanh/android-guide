---
id: fundamentals-generics-java
title: Generics & Variance in Java — Use-Site Wildcards & Erasure With No Workaround
description: Why Java states variance per call site with wildcards instead of once on the type, and why type erasure has no reified-style escape hatch in Java at all.
tags: [generics, variance, type-erasure, java, mid, senior]
lang: en
status: complete
domain: 01-programming-fundamentals
platform: shared
band: X
level: Mid
sidebar_position: 6
topic: generics
leaf: Java
prerequisites: []
outcomes:
  - "Explain what type erasure means for a Java generic method, and why there's no built-in workaround"
  - "Design a producer/consumer-shaped generic API using use-site wildcards (? extends, ? super)"
resources:
  - title: "Generics (The Java Tutorials)"
    url: "https://docs.oracle.com/javase/tutorial/java/generics/index.html"
    date: "2025-02-01"
---

# Generics & Variance in Java — Use-Site Wildcards & Erasure With No Workaround

A generic type is a promise: "this works for any `T`, and I won't peek at what `T` actually is."
Variance is the finer promise underneath that one: does this type only ever *produce* a `T`, only
ever *consume* a `T`, or both? Java makes the caller restate that direction at every single use.

## Mid {concept=generics/type-erasure}

**Interview question: "What does a generic type actually guarantee, and where does that guarantee
break?"**

A generic type guarantees compile-time substitutability for any type argument, and nothing about
what's still known at runtime.

```java
// Java — a plain generic class/method: write once, use with any type argument.
class Box<T> { T value; }
static <T> T firstOrNull(List<T> items) { return items.isEmpty() ? null : items.get(0); }
```

**Type erasure throws away the type argument once compilation finishes**: at runtime, a
`List<String>` and a `List<Integer>` are both just a `List`. Java has **no workaround for this** —
it's a permanent limitation of the platform, unlike Kotlin, which recovers the type per call site
via `inline`/`reified`.

**Follow-up an interviewer asks next:** "So how does Java work around not having reified
generics?" It doesn't, not generically — the common workaround is passing a `Class<T>` token
explicitly as a parameter (`fromJson(json, User.class)`), which is exactly the boilerplate Kotlin's
`reified` exists to eliminate.

**Pitfall at this level:** reaching for `Class<T>` tokens as if that's "the same as reified." It's a
manual workaround a caller must remember to pass, not a compiler-enforced guarantee — the gap
`reified` closes doesn't exist in Java at all.

## Senior {concept=generics/variance-declaration}

**Interview question: "What's the difference between declaring variance on the type vs at each
call site?"**

**This is the sharpest cross-language contrast in this topic. Java has no declaration-site
variance at all — instead, a caller states the direction separately at every single use, with a
wildcard.**

```java
// Java — use-site variance: there is no in/out on the interface declaration itself.
// Every caller who wants covariance or contravariance writes a wildcard at that call site.
interface Producer<T> { T produce(); }
interface Consumer<T> { void consume(T item); }

void printAll(List<? extends Animal> producers) { /* ? extends = producer position, like Kotlin's out */ }
void fillWithCats(List<? super Cat> consumers) { /* ? super = consumer position, like Kotlin's in */ }
```

The consequence: in Kotlin, `Producer<out T>` is decided once and every piece of code that uses
`Producer` agrees on it. In Java, the same interface can be used covariantly in one call and
invariantly in another — the direction is a property of the call site, not the type, so it has to
be re-stated (and can be gotten wrong) every time.

**Follow-up:** "Why did Java design it this way instead of Kotlin's declaration-site approach?"
Java's generics were retrofitted onto a language and standard library that already existed
(Java 5), so use-site wildcards let existing interfaces gain variance without redesigning their
declarations — a real historical constraint, not just a design preference.

**Pitfall at this level:** forgetting Java's wildcard is a per-call-site choice, not a type-level
guarantee. A `List<T>` can be used covariantly in one method and invariantly in another — nothing
about the interface itself prevents a caller from getting the wildcard wrong or omitting it.

## Cross-language comparison

See the cross-language cheat sheet article for how Kotlin, Swift, Dart and TypeScript each answer
the same two questions — or switch the language tab above to read this same topic in another
language directly.

## Pitfalls & trade-offs

- **Mid:** reaching for a `Class<T>` token as if that's "the same as reified" — it's a manual
  workaround, not a compiler-enforced guarantee.
- **Mid:** assuming a generic method can do anything a concrete one can — reflection,
  instantiation, and runtime type checks are all erasure casualties with no workaround in Java.
- **Senior:** forgetting Java's wildcard is a per-call-site choice, not a type-level guarantee — a
  caller can get it wrong or omit it with no help from the interface declaration itself.
