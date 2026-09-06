---
id: fundamentals-value-vs-reference-semantics-kotlin
title: Value vs Reference Semantics in Kotlin — Every User Type Is a Reference
description: Why Kotlin has no user-facing value type, what that means for mutation visibility across two variables, and the shallow-copy trap in data class.copy().
tags: [value-semantics, reference-semantics, mutability, kotlin, mid, senior]
lang: en
status: complete
domain: 01-programming-fundamentals
platform: shared
band: X
level: Mid
sidebar_position: 2
topic: value-vs-reference-semantics
leaf: Kotlin
prerequisites: []
outcomes:
  - "Predict whether a mutation through one Kotlin reference is visible through another"
  - "Name the shallow-copy trap in data class.copy() and how to avoid it"
resources:
  - title: "Classes — Kotlin documentation"
    url: "https://kotlinlang.org/docs/classes.html"
    date: "2025-03-01"
---

# Value vs Reference Semantics in Kotlin — Every User Type Is a Reference

Handing someone a photocopy of a document and handing them your only key open onto two different
worlds: mark up the photocopy and the original is untouched; hand over the key and whatever they
do with it happens to the one door it opens. Every assignment, function argument, and property
store in your code is one of these two moves — Kotlin gives you only one for any user-defined type.

## Mid {concept=value-semantics/default-kind}

**Interview question: "If you copy or reassign this value, do you get an independent copy?"**

**In Kotlin, every user-defined type is a reference type.** There is no user-facing "struct" — a
`class` or a `data class` behaves the same way: assigning shares the same instance, it never
copies. Only the JVM primitives (`Int`, `Boolean`, `Double`, and so on) are true value types, and
that distinction is invisible to the programmer — you never choose it, it just is.

```kotlin
// Kotlin — every user-defined type is a reference type. Assigning shares the same instance.
class Counter(var value: Int = 0)
val c1 = Counter()
val c2 = c1        // SAME INSTANCE — c2 is another reference to c1's object
c2.value = 10
c1.value           // 10
```

**Follow-up an interviewer asks next:** "Is there any way to get value-type copy behavior for a
user-defined type in Kotlin?" No — not automatically. The closest you get is calling
`data class.copy()` yourself, which copies the fields you asked for and nothing deeper — see the
Senior section for exactly where that stops being enough.

**Pitfall at this level:** assuming a `data class` behaves like a value type because it looks like
one (auto-generated `equals`/`copy`) — it is still a reference type; two `Counter` instances with
identical field values are still two distinct, independently-mutable objects unless you're
comparing them with `==` for structural equality, or explicitly calling `.copy()`.

## Senior {concept=value-semantics/shallow-copy}

**Interview question: "Does `data class.copy()` give you a real independent copy?"**

**This is the shallow-copy trap, and it's the strongest cross-language insight in this topic: the
same failure shape shows up, under a different name, in Swift, TypeScript, and here in Kotlin.**

```kotlin
// Kotlin — data class.copy() is shallow. The mutable/reference property escapes the "copy."
data class Cart(val items: MutableList<String>)
val a = Cart(mutableListOf("apple"))
val b = a.copy()          // new Cart instance, but items is the SAME list reference
b.items.add("banana")
a.items                    // ["apple", "banana"] — a saw the mutation too
```

`copy()` only copies the top-level fields of the data class itself — a nested mutable reference
(here, `MutableList<String>`) rides along unchanged, shared between the "original" and the "copy."

**Follow-up:** "So how do you actually avoid the shallow-copy trap?" Prefer immutable properties —
a Kotlin `List` rather than `MutableList` — so there's no mutable reference left to leak; when a
genuine deep copy is required, do it explicitly (copy the list itself inside `copy()`'s argument,
e.g. `a.copy(items = a.items.toMutableList())`) rather than trusting the shallow default to be
enough.

**Pitfall at this level:** treating `data class.copy()` as a deep copy without checking whether any
property is itself a mutable reference type — the fix is copying that property explicitly or
keeping it immutable, not avoiding `.copy()` altogether.

## Cross-language comparison

See the cross-language cheat sheet article for how Java, Swift, Dart and TypeScript each answer
the same two questions — or switch the language tab above to read this same topic in another
language directly.

## Pitfalls & trade-offs

- **Mid:** assuming a `data class`'s generated `equals`/`copy` makes it behave like a value type —
  it is still a reference type; identity and mutation still work exactly like a plain `class`.
- **Senior:** treating `data class.copy()` as a deep copy without checking whether any property is
  itself a reference type — the same trap that shows up as Swift's struct-holding-a-class and
  TypeScript's object spread.
