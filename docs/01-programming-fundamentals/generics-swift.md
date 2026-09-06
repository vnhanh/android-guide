---
id: fundamentals-generics-swift
title: Generics & Variance in Swift — Preserved Type Info & the any vs some Split
description: How Swift preserves runtime type info through metatypes unlike Java/TypeScript's erasure, and the existential-vs-generic dispatch choice (any vs some) none of the other four languages draw explicitly.
tags: [generics, variance, type-erasure, swift, mid, senior]
lang: en
status: complete
domain: 01-programming-fundamentals
platform: shared
band: X
level: Mid
sidebar_position: 6
topic: generics
leaf: Swift
prerequisites: []
outcomes:
  - "Explain how Swift preserves generic type information at runtime via metatypes"
  - "Choose between any (existential) and some/generic (specialized) for a protocol-typed parameter, and state the dispatch-cost trade-off"
resources:
  - title: "Generics — The Swift Programming Language"
    url: "https://docs.swift.org/swift-book/documentation/the-swift-programming-language/generics/"
    date: "2025-06-01"
---

# Generics & Variance in Swift — Preserved Type Info & the any vs some Split

A generic type is a promise: "this works for any `T`, and I won't peek at what `T` actually is."
Variance is the finer promise underneath that one: does this type only ever *produce* a `T`, only
ever *consume* a `T`, or both? Swift is the outlier among these languages in how much of that
promise survives to runtime.

## Mid {concept=generics/type-erasure}

**Interview question: "What does a generic type actually guarantee, and where does that guarantee
break?"**

A generic type guarantees compile-time substitutability for any type argument, checked by the
compiler via constraints.

```swift
// Swift — same idea as any generic, checked by the compiler via constraints.
struct Box<T> { let value: T }
func firstMatch<T>(in items: [T], where predicate: (T) -> Bool) -> T? {
    for item in items where predicate(item) { return item }
    return nil
}
```

**Unlike Java and TypeScript, Swift preserves runtime type information through metatypes** — a
generic function can ask "what concrete type is `T` here" without the reified-style workaround
Kotlin needs, because Swift never erases the type argument the way the JVM or a compile-to-JS step
does.

**Follow-up an interviewer asks next:** "So Swift never has an erasure problem at all?" Mostly
correct for plain generics — the place Swift *does* introduce a similar-feeling erasure is with
existentials (`any Protocol`), covered in the Senior section below, which is a different mechanism
with a different cost, not classic type erasure.

**Pitfall at this level:** assuming Swift's preserved type info means there's never a
performance trade-off with generics — the trade-off exists, it just shows up as the existential vs
generic dispatch choice rather than as an erasure limitation.

## Senior {concept=generics/existential-vs-generic}

**Interview question: "What's the difference between `any Protocol` and `some Protocol`, and why
does it matter?"**

**Swift adds a distinction none of the other four languages draw explicitly: a protocol-typed
parameter can be written as an existential or as a generic, and the two compile to different
dispatch mechanisms with different costs.**

```swift
protocol DataSource { func fetch() -> [Item] }

// Existential (`any DataSource`): concrete type erased and boxed at runtime. Every call
// goes through a witness table — flexible (a heterogeneous array of `any DataSource` is
// legal), at the cost of dynamic dispatch and, for larger conforming types, a heap allocation.
func load(from source: any DataSource) -> [Item] { source.fetch() }

// Generic (`some DataSource`, or `<S: DataSource>`): concrete type fixed at compile time
// for a given call site. The compiler can specialize and often inline — no dispatch
// overhead, at the cost of not mixing different concrete types through the same call site.
func loadOpaque(from source: some DataSource) -> [Item] { source.fetch() }
```

Kotlin, Java, Dart, and TypeScript have no equivalent split — a protocol/interface-typed parameter
in those languages is uniformly dynamically dispatched, so there's no "generic vs existential"
choice to make; Swift is the outlier for having one at all.

**Follow-up:** "So when do you actually reach for `any` instead of `some`?" When you genuinely need
a heterogeneous collection (an array mixing several different conforming types behind the same
protocol) or a stored property whose concrete type can vary at runtime — `some`/generic dispatch
requires the concrete type to be fixed for a given call site, which is incompatible with that use
case.

**Pitfall at this level:** reaching for `any` (existentials) as the default protocol-typed
parameter. It compiles and works, but pays a dispatch and sometimes allocation cost that
`some`/generic dispatch avoids for the common case of a single, statically-known conforming type
per call site.

## Cross-language comparison

See the cross-language cheat sheet article for how Kotlin, Java, Dart and TypeScript each answer
the same two questions — or switch the language tab above to read this same topic in another
language directly.

## Pitfalls & trade-offs

- **Mid:** assuming Swift's preserved type info means generics are free of any dispatch trade-off —
  the trade-off exists as the existential vs generic choice instead.
- **Senior:** reaching for `any` (existentials) as the default protocol-typed parameter — it pays a
  dispatch and sometimes allocation cost that `some`/generic dispatch avoids for the common,
  single-conforming-type case.
