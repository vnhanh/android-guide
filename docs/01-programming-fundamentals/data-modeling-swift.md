---
id: fundamentals-data-modeling-swift
title: Data Modeling in Swift — Equatable Synthesis & Copy-with-Change for Free
description: How a Swift struct conforming to Equatable gets synthesized structural equality, and why copy-with-change needs no copy() method at all thanks to value semantics.
tags: [data-modeling, equality, immutability, swift, mid, senior]
lang: en
status: complete
domain: 01-programming-fundamentals
platform: shared
band: X
level: Mid
sidebar_position: 3
topic: data-modeling
leaf: Swift
prerequisites: []
outcomes:
  - "Give a Swift value object structural equality via Equatable synthesis"
  - "Explain why Swift needs no copy() method for copy-with-change, and where that stops being true"
resources:
  - title: "Equatable — Swift documentation"
    url: "https://developer.apple.com/documentation/swift/equatable"
    date: "2025-06-01"
---

# Data Modeling in Swift — Equatable Synthesis & Copy-with-Change for Free

Two identical twins are not the same person — but for most of what a program needs to do with a
`UserProfile`, that distinction is irrelevant. If two objects have the same `id`, the same
`displayName`, the same `avatarUrl`, you want `==` to say "equal." Swift gives you this almost for
free, and copy-with-change without needing a method at all.

## Mid {concept=data-modeling/equality}

**Interview question: "How do you give a value object structural equality instead of default
reference equality?"**

A `struct` conforming to `Equatable` gets `==` compared field-by-field — and the compiler
synthesizes that conformance automatically when every stored property is itself `Equatable`, so
for most simple models you only have to write `: Equatable` and nothing else.

```swift
struct UserProfile: Equatable {
    let id: String
    let displayName: String
    let avatarUrl: String?
}

let a = UserProfile(id: "1", displayName: "Alex", avatarUrl: nil)
let b = UserProfile(id: "1", displayName: "Alex", avatarUrl: nil)
a == b // true — synthesized structural equality
```

**Follow-up an interviewer asks next:** "When does the compiler *not* synthesize `Equatable` for
you?" When any stored property isn't itself `Equatable` — a closure, or a type from a library that
doesn't conform — in which case you have to implement `==` by hand for the properties that do
matter to equality.

**Pitfall at this level:** adding a stored property to an `Equatable` struct and assuming the
generated `==` "just includes it" correctly — it does, automatically, which is exactly why adding
a property that *shouldn't* affect equality (a cache field, a UI-only flag) needs a hand-written
`==` instead of relying on synthesis.

## Senior {concept=data-modeling/copy-gap}

**Interview question: "How do you do copy-with-change in Swift, if there's no `copy()` method?"**

**Swift's copy-with-change is cheaper syntax than every other language here, but only because of
value semantics.** There's no `copy()` method on a Swift struct at all — because a struct is a
value type, "copy with one field changed" is just a variable mutation on a local copy:

```swift
var renamed = a
renamed.displayName = "Alexandra" // `a` is untouched — `renamed` is an independent value
```

This only works because assignment (`var renamed = a`) already produces an independent value for a
struct — see the Value vs Reference Semantics article for why that's true and where it stops being
true (a `class`-typed property inside the struct rides along as a shared reference, not a copy).

By contrast, Kotlin's `data class` needs an explicit generated `copy()` method precisely because
Kotlin classes are reference types by default — Swift's struct never needed the method because the
language's assignment semantics already do the work.

**Follow-up:** "So is there ever a reason to write an explicit copy-with-change method in Swift
anyway?" Yes — once a struct nests a `class` property, plain field mutation on a local copy no
longer produces a truly independent value for that property; a deliberate method that deep-copies
the nested reference is the honest fix, the same shape as the shallow-copy trap covered in the
Value vs Reference Semantics article.

**Pitfall at this level:** assuming "it's a struct, so copy-with-change is always just a local
mutation" once any property is a `class` — the struct's own fields copy fine, but a nested
reference type doesn't, silently reintroducing shared mutable state.

## Cross-language comparison

See the cross-language cheat sheet article for how Kotlin, Java, Dart and TypeScript each answer
the same two questions — or switch the language tab above to read this same topic in another
language directly.

## Pitfalls & trade-offs

- **Mid:** relying on `Equatable` synthesis after adding a property that shouldn't affect equality
  (a cache field, a UI-only flag) — synthesis includes every stored property automatically, so a
  hand-written `==` is needed once that stops being what you want.
- **Senior:** assuming plain field mutation on a local copy is always a true copy-with-change once
  the struct nests a `class` property — the nested reference is shared, not duplicated, the same
  shallow-copy trap covered for other languages in this topic.
