---
id: fundamentals-data-modeling-kotlin
title: Data Modeling in Kotlin — data class Equality, Copying & the Shallow Trap
description: How Kotlin's data class generates structural equality and a copy-with-changes operation for free, and the shallow-copy trap when a property is itself mutable.
tags: [data-modeling, equality, immutability, kotlin, mid, senior]
lang: en
status: complete
domain: 01-programming-fundamentals
platform: shared
band: X
level: Mid
sidebar_position: 3
topic: data-modeling
leaf: Kotlin
prerequisites: []
outcomes:
  - "Give a Kotlin value object structural equality and a copy-with-changes operation, and name what the shallow-copy trap looks like"
resources:
  - title: "Data classes — Kotlin documentation"
    url: "https://kotlinlang.org/docs/data-classes.html"
    date: "2025-03-01"
---

# Data Modeling in Kotlin — data class Equality, Copying & the Shallow Trap

Two identical twins are not the same person — but for most of what a program needs to do with a
`UserProfile`, that distinction is irrelevant. If two objects have the same `id`, the same
`displayName`, the same `avatarUrl`, you want `==` to say "equal," not "well, they're different
objects in memory, so no." That's **structural equality**, and Kotlin's `data class` gives it to
you for free, along with a copy-with-changes operation.

## Mid {concept=data-modeling/equality}

**Interview question: "How do you give a value object structural equality instead of default
reference equality?"**

A `data class` generates `equals()`, `hashCode()`, `toString()`, and `copy()` from its primary
constructor properties.

```kotlin
data class UserProfile(val id: String, val displayName: String, val avatarUrl: String?)

val a = UserProfile("1", "Alex", null)
val b = UserProfile("1", "Alex", null)
a == b // true — structural equality, not the same reference

val renamed = a.copy(displayName = "Alexandra") // new instance, only displayName changed
```

**Follow-up an interviewer asks next:** "What's the shallow-copy trap?" `copy()` only copies the
reference stored in each property — it does not deep-copy what that reference points to.

> [!WARNING]
> A `data class` holding a mutable `List` (or any other mutable object) shares that reference
> after `copy()` — mutating the list through the copy mutates the original too, because both
> instances hold the same list reference. Prefer immutable properties (`List`, not `MutableList`)
> in a `data class` used as a value type; if a property genuinely needs to be mutable, `copy()` is
> not doing what its name implies for it.

**Pitfall at this level:** trusting `data class` equality on a type with a mutable property —
`equals()` compares current field values, so an object's equality can silently change after a
mutation, which is exactly why `HashMap`/`HashSet` keys should be immutable.

## Senior {concept=data-modeling/copy-gap}

**Interview question: "What does Java's `record` NOT give you that Kotlin's `data class` does?"**

Kotlin's `copy()` is the reference point every other language in this guide gets measured against.
Java 16+ `record` generates equality and `toString()` the same way — but has **no generated
`copy()` equivalent**, forcing a hand-written "wither" method per record. This asymmetry is the
single most interesting cross-language fact in this topic: it means every Java `record` either
carries a hand-written wither for each field that needs a copy-with-change, or the team has
adopted a library to generate one — there's no language-level default either way.

Dart has no built-in data-class generation at all — idiomatic Dart hand-writes
`equals`/`hashCode`/`toString`/`copyWith`, or reaches for a code-generation package (`freezed`)
that generates the exact same shape Kotlin gives natively. TypeScript has no nominal data-class
concept and no built-in deep equality at all — `===` on two structurally-identical plain objects
is `false`.

**Follow-up:** "So when do you reach for a codegen package versus hand-roll it, in a language that
doesn't have Kotlin's `data class` built in?" Roughly: a handful of simple models, hand-rolling is
fine and keeps a dependency out of the build. Once a codebase has dozens of these models, or needs
sealed unions alongside them, the codegen step pays for itself in boilerplate avoided and in one
canonical place the equality/copy contract can't drift out of sync with the fields.

**Pitfall at this level:** assuming every language in a polyglot codebase gives you Kotlin's
`data class` shape for free — Java's `record`, Dart's plain classes, and TypeScript's interfaces
all leave a real gap (usually the copy-with-change operation) that has to be filled deliberately.

## Cross-language comparison

See the cross-language cheat sheet article for how Java, Swift, Dart and TypeScript each answer
the same two questions — or switch the language tab above to read this same topic in another
language directly.

## Pitfalls & trade-offs

- **Mid:** a `data class` holding a mutable collection — `copy()` only copies the reference, so two
  "independent" copies can still share and silently mutate the same underlying list.
- **Mid:** using a `data class` with a mutable property as a `HashMap`/`HashSet` key — its
  `hashCode()` can change after mutation, breaking the map's internal invariants.
- **Senior:** assuming every other language in a polyglot codebase gives you `copy()` for free —
  Java's `record`, Dart's plain classes, and TypeScript's interfaces all require a deliberate,
  hand-written or codegen answer for the same operation.
