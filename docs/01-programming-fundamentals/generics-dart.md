---
id: fundamentals-generics-dart
title: Generics & Variance in Dart — Structural Inference Plus Opt-In out/in/inout
description: How Dart infers variance structurally most of the time, with an explicit out/in/inout opt-in for when you want Kotlin's declaration-site guarantee, and Dart's partially-preserved runtime type info.
tags: [generics, variance, type-erasure, dart, mid, senior]
lang: en
status: complete
domain: 01-programming-fundamentals
platform: shared
band: X
level: Mid
sidebar_position: 6
topic: generics
leaf: Dart
prerequisites: []
outcomes:
  - "Explain how Dart's generics differ from JVM-style type erasure"
  - "Design a producer-shaped generic API using Dart's opt-in declaration-site out variance"
resources:
  - title: "Generics — Dart documentation"
    url: "https://dart.dev/language/generics"
    date: "2025-04-01"
---

# Generics & Variance in Dart — Structural Inference Plus Opt-In out/in/inout

A generic type is a promise: "this works for any `T`, and I won't peek at what `T` actually is."
Variance is the finer promise underneath that one: does this type only ever *produce* a `T`, only
ever *consume* a `T`, or both? Dart infers this most of the time, with an explicit opt-in when
inference isn't enough.

## Mid {concept=generics/type-erasure}

**Interview question: "What does a generic type actually guarantee, and where does that guarantee
break?"**

A generic type guarantees compile-time substitutability for any type argument.

```dart
// Dart — straightforward generic class, same shape as any other language here.
class Box<T> {
  final T value;
  Box(this.value);
}
```

**Dart's runtime is more type-aware than the JVM's erasure model** — the honest answer is
"partially preserved, worth double-checking against the current Dart version rather than stating
as a hard guarantee either way," which puts Dart between Java/TypeScript's full erasure and
Swift's fully-preserved metatypes.

**Follow-up an interviewer asks next:** "Does that mean Dart never has an erasure-style
limitation?" No — it means the boundary is fuzzier and version-dependent rather than absolute; a
generic function still can't do everything a concrete one can (instantiating `T()` directly is
still not possible without passing a factory), so the caution from Java and Kotlin's Mid sections
still mostly applies.

**Pitfall at this level:** assuming Dart's more type-aware runtime means a generic function can
freely instantiate or reflect on `T` — it can't, in general; the type-awareness is about what the
runtime *knows*, not a general reflection capability.

## Senior {concept=generics/variance-declaration}

**Interview question: "How does Dart's variance system differ from Kotlin's or Java's?"**

**Dart's variance is inferred structurally most of the time**; explicit `out`/`in`/`inout` is
opt-in when you want the same declaration-site guarantee Kotlin gives you by default.

```dart
// Dart — variance is inferred structurally most of the time; explicit out/in/inout
// is opt-in when you want the same declaration-site guarantee Kotlin gives you by default.
class Producer<out T> { T produce() => ...; }
```

> [!NOTE]
> Three languages in this guide independently converged on the literal keywords `in`/`out` for the
> same concept: Kotlin (default, required), Dart 2.x+ (opt-in), and TypeScript 4.7+ (opt-in). Dart
> supporting the exact same keywords as Kotlin, without coordinating with it, is worth having ready
> as a fact — it means the concept transfers even where the syntax convention was independently
> discovered.

**Follow-up:** "When do you actually need the explicit annotation, if inference handles most
cases?" When the inferred variance would be too strict for a genuinely safe use (structural
inference can be conservative), or when you want the variance to be part of the type's documented
contract rather than an implementation detail a future refactor could silently narrow.

**Pitfall at this level:** relying on structural inference for a generic type's variance without
verifying it actually matches your intent — inference is usually conservative (defaulting toward
invariance when unsure), which can reject a use you know is safe until you add the explicit
annotation.

## Cross-language comparison

See the cross-language cheat sheet article for how Kotlin, Java, Swift and TypeScript each answer
the same two questions — or switch the language tab above to read this same topic in another
language directly.

## Pitfalls & trade-offs

- **Mid:** assuming Dart's more type-aware runtime means a generic function can freely instantiate
  or reflect on `T` — it generally can't, the same limitation as Java and ordinary Kotlin generics.
- **Senior:** relying on structural variance inference without checking it matches your actual
  intent — inference defaults toward invariance when unsure, which the explicit `out`/`in`
  annotation can override.
