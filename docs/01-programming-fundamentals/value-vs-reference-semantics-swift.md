---
id: fundamentals-value-vs-reference-semantics-swift
title: Value vs Reference Semantics in Swift — Struct, Class & Copy-on-Write
description: Why a Swift struct copies on assignment while a class shares, how copy-on-write keeps Array/Dictionary/Set cheap, and the shallow-copy trap when a struct nests a class.
tags: [value-semantics, reference-semantics, mutability, copy-on-write, swift, mid, senior]
lang: en
status: complete
domain: 01-programming-fundamentals
platform: shared
band: X
level: Mid
sidebar_position: 2
topic: value-vs-reference-semantics
leaf: Swift
prerequisites: []
outcomes:
  - "Predict whether a mutation through one Swift reference is visible through another, for both struct and class"
  - "Explain why Swift's copy-on-write collections don't pay a full-copy cost on every mutation, and name the one case where the shallow-copy trap still applies"
resources:
  - title: "Structures and classes — The Swift Programming Language"
    url: "https://docs.swift.org/swift-book/documentation/the-swift-programming-language/classesandstructures/"
    date: "2025-06-01"
---

# Value vs Reference Semantics in Swift — Struct, Class & Copy-on-Write

Handing someone a photocopy of a document and handing them your only key open onto two different
worlds: mark up the photocopy and the original is untouched; hand over the key and whatever they
do with it happens to the one door it opens. Swift is the one language in this guide that gives
you both moves as a deliberate per-type choice.

## Mid {concept=value-semantics/default-kind}

**Interview question: "If you copy or reassign this value, do you get an independent copy?"**

`struct` is a value type: assigning copies. `class` is a reference type: assigning shares.

```swift
// Swift — struct is a value type: assigning copies. class is a reference type: assigning shares.
struct Point { var x: Int; var y: Int }
var a = Point(x: 0, y: 0)
var b = a          // COPY — b is an independent value
b.x = 10
a.x                 // still 0 — mutating b never touched a

final class Counter { var value = 0 }
let c1 = Counter()
let c2 = c1         // SAME INSTANCE — c2 is another reference to c1's object
c2.value = 10
c1.value            // 10 — c1 and c2 point at the same object
```

**Follow-up an interviewer asks next:** "How do you decide which one to reach for?" Default to
`struct` — value semantics remove a whole category of shared-mutable-state bugs for free. Reach
for `class` only as a deliberate choice: identity matters (two instances with the same values
should still be distinguishable), or copying is genuinely expensive and shared mutation is
actually intended.

**Pitfall at this level:** an engineer coming from Kotlin, Java, or Dart usually assumes "it's an
object, so mutating it through one reference should be visible through another" — which is exactly
backwards for a Swift `struct`. The instinct that's correct in most other languages is the one
that misreads Swift.

## Senior {concept=value-semantics/shallow-copy}

**Interview question: "Your Swift `Array` is a struct — doesn't that mean every append is an
expensive full copy?"**

No, because of **copy-on-write (COW)**. Swift's standard collections (`Array`, `Dictionary`, `Set`)
are structs, but internally they share a single storage buffer across every holder until one of
them actually mutates it — only then does that holder get its own copy.

```swift
var original = [1, 2, 3]
var copy = original       // no copy yet — both share the same buffer internally
copy.append(4)             // mutation triggers the actual copy, now they diverge
original                   // [1, 2, 3] — untouched
```

Given two variables holding the same array, the answer to "does mutating one affect the other" is
always "no, they diverge on first mutation" — a specific, statable fact. (What makes a Swift
`class` instance itself safe to share across concurrent mutators is a separate topic — ARC and
retain cycles are covered in the Memory Management article, not here.)

**This is also where the shallow-copy trap appears — the strongest cross-language insight in this
topic, the same failure shape under a different name in Kotlin and TypeScript too.**

```swift
// Swift — a struct's own stored properties are copied, but a class property nested inside
// is a reference, and that reference is what gets "copied" — i.e., shared.
final class Basket { var items: [String] = [] }
struct Cart { var basket: Basket }
var a = Cart(basket: Basket())
var b = a                  // struct copied, but b.basket is the SAME Basket instance as a.basket
b.basket.items.append("banana")
a.basket.items              // ["banana"] — a saw the mutation too
```

**Follow-up:** "So how do you actually avoid the shallow-copy trap?" Avoid nesting a `class`
property inside a `struct` you intend to treat as a value; when a genuinely mutable reference does
need to live inside a value type, copy it explicitly on mutation, or make the nested type itself a
`struct`.

**Pitfall at this level:** believing copy-on-write means *every* nested value inside a struct is
safe from the shallow-copy trap — COW protects the collection's own storage, not a `class`
property sitting next to it in the same struct.

## Cross-language comparison

See the cross-language cheat sheet article for how Kotlin, Java, Dart and TypeScript each answer
the same two questions — or switch the language tab above to read this same topic in another
language directly.

## Pitfalls & trade-offs

- **Mid:** assuming "it's an object, so a mutation through one reference is visible through
  another" — backwards for a Swift `struct`, even though it's correct in most other languages.
- **Mid:** reaching for a Swift `class` out of habit when a `struct` expresses the intent better —
  a `class` should be a deliberate choice, not a default carried over from another language.
- **Senior:** believing copy-on-write collections protect every nested value in a struct — COW
  protects the collection's own storage, not a `class` property sitting next to it.
- **Senior:** treating a struct's field-by-field copy as a deep copy without checking whether any
  property is itself a `class` — the same shallow-copy trap as Kotlin's `data class.copy()`.
