---
id: fundamentals-generics-typescript
title: Generics & Variance in TypeScript — Structural Typing on Top, Full Erasure Underneath
description: Why TypeScript generics are a compile-time-only label over structural typing, full erasure with no workaround since it compiles to JS, and the opt-in explicit out/in variance added in 4.7.
tags: [generics, variance, type-erasure, typescript, mid, senior]
lang: en
status: complete
domain: 01-programming-fundamentals
platform: shared
band: X
level: Mid
sidebar_position: 6
topic: generics
leaf: TypeScript
prerequisites: []
outcomes:
  - "Explain why TypeScript generics are fully erased at runtime with no workaround"
  - "Use explicit out/in variance annotations (4.7+) for cases structural inference can't resolve"
resources:
  - title: "Variance Annotations for Type Parameters — TypeScript 4.7"
    url: "https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-7.html#optional-variance-annotations-for-type-parameters"
    date: "2025-05-01"
---

# Generics & Variance in TypeScript — Structural Typing on Top, Full Erasure Underneath

A generic type is a promise: "this works for any `T`, and I won't peek at what `T` actually is."
Variance is the finer promise underneath that one: does this type only ever *produce* a `T`, only
ever *consume* a `T`, or both? TypeScript's generics sit entirely on top of structural typing, and
none of it survives compilation to JavaScript.

## Mid {concept=generics/type-erasure}

**Interview question: "What does a generic type actually guarantee, and where does that guarantee
break?"**

**TypeScript generics sit on top of structural typing: `T` isn't a runtime tag, it's a
compile-time label the type checker uses to relate parameter and return shapes.**

```typescript
// TypeScript — generics sit on top of structural typing: T isn't a runtime tag,
// it's a compile-time label the type checker uses to relate parameter and return shapes.
class Box<T> { constructor(public value: T) {} }
function firstMatch<T>(items: T[], predicate: (item: T) => boolean): T | undefined {
  return items.find(predicate);
}
```

TypeScript's compile-to-JS step erases every type completely — there is no runtime trace of `T` at
all, not even the class-based erasure the JVM does. Like Java, **TypeScript has no workaround** for
this; Kotlin's `reified` trick has no TypeScript equivalent because there's no compiled artifact
left at runtime to specialize.

**Follow-up an interviewer asks next:** "So how do you get a runtime type check in TypeScript at
all?" You can't check "is this a `T`" generically — the idiomatic workaround is a runtime type
guard function (`function isUser(x: unknown): x is User`) written by hand for the specific type you
need to check, which is a manual, per-type answer, not a generic mechanism.

**Pitfall at this level:** writing a generic function and assuming `typeof item === "T"` or similar
could ever work — there is no `T` left at runtime to compare against; only a hand-written type
guard for a concrete type works.

## Senior {concept=generics/variance-declaration}

**Interview question: "How does TypeScript's structural variance differ from Kotlin's
declaration-site variance?"**

**Variance is inferred from structural shape for most TypeScript generics; explicit `in`/`out`
(4.7+) is for cases the inference can't resolve on its own, or to state intent.**

```typescript
// TypeScript — variance is inferred from structural shape for most generics; explicit
// in/out (4.7+) is for cases the inference can't resolve on its own, or to state intent.
interface Producer<out T> { produce(): T; }
interface Consumer<in T> { consume(item: T): void; }
```

> [!NOTE]
> Three languages in this guide independently converged on the literal keywords `in`/`out` for the
> same concept: Kotlin (default, required), Dart 2.x+ (opt-in), and TypeScript 4.7+ (opt-in).
> TypeScript adding the exact same keywords years after Kotlin, without coordinating, is worth
> having ready as a fact — it means the concept transfers even where each language discovered the
> syntax independently.

**Follow-up:** "Since TypeScript infers variance structurally most of the time, when do you
actually need the explicit annotation?" When structural inference produces a type error for a use
you know is actually safe (structural inference over a complex generic can be overly conservative),
or when the variance is a deliberate part of the type's public contract and you want the compiler
to enforce it even if a future refactor would otherwise silently narrow it.

**Pitfall at this level:** relying entirely on structural inference for a public library's generic
API — inference is a compiler implementation detail that can change between TypeScript versions;
an explicit `in`/`out` annotation on a published API's type parameters is a more stable contract.

## Cross-language comparison

See the cross-language cheat sheet article for how Kotlin, Java, Swift and Dart each answer the
same two questions — or switch the language tab above to read this same topic in another language
directly.

## Pitfalls & trade-offs

- **Mid:** assuming any generic runtime type check (`typeof item === "T"`) could work — there is no
  `T` left at runtime; only a hand-written type guard for a concrete type works.
- **Senior:** relying entirely on structural variance inference for a published library's generic
  API — an explicit `in`/`out` annotation is a more stable, intentional contract than an inferred
  implementation detail.
