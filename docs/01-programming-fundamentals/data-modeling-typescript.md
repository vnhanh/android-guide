---
id: fundamentals-data-modeling-typescript
title: Data Modeling in TypeScript — Structural Types Aren't Structural Equality
description: The sharpest interview trap in cross-language data modeling — why === on two structurally-identical plain objects is false, and what to do about it.
tags: [data-modeling, equality, immutability, typescript, mid, senior]
lang: en
status: complete
domain: 01-programming-fundamentals
platform: shared
band: X
level: Mid
sidebar_position: 3
topic: data-modeling
leaf: TypeScript
prerequisites: []
outcomes:
  - "Explain why === on two structurally-identical plain objects is false in TypeScript"
  - "Name the idiomatic fix for both equality and copy-with-change on a plain-object model"
resources:
  - title: "Type Compatibility — TypeScript Handbook"
    url: "https://www.typescriptlang.org/docs/handbook/type-compatibility.html"
    date: "2025-05-01"
---

# Data Modeling in TypeScript — Structural Types Aren't Structural Equality

Two identical twins are not the same person — but for most of what a program needs to do with a
`UserProfile`, that distinction is irrelevant. If two objects have the same `id`, the same
`displayName`, the same `avatarUrl`, you want equality to say "equal." TypeScript's own type
system quietly primes you to expect this — and then doesn't deliver it at runtime.

## Mid {concept=data-modeling/equality}

**Interview question: "Does TypeScript give a plain object structural equality?"**

**This is the sharpest interview trap in cross-language data modeling.** There's no nominal
data-class concept in TypeScript at all — the idiomatic pattern is a `readonly`-field interface
plus object spread for "copy with a change":

```typescript
interface UserProfile {
  readonly id: string;
  readonly displayName: string;
  readonly avatarUrl: string | undefined;
}

const a: UserProfile = { id: "1", displayName: "Alex", avatarUrl: undefined };
const renamed = { ...a, displayName: "Alexandra" }; // copy with one field changed

const b: UserProfile = { id: "1", displayName: "Alex", avatarUrl: undefined };
a === b; // false — reference equality only, even though every field matches
```

`===` on two structurally-identical plain objects is `false`. TypeScript's structural *type*
checking (two differently-named types with the same shape are interchangeable to the compiler) has
nothing to do with structural *equality* at runtime — there is no built-in deep-equal. A JS/TS
engineer's instinct that "same shape means equal" is simply false at the language level.

**Follow-up an interviewer asks next:** "So how do you actually compare two objects for equality?"
Write your own field-by-field comparison, or import a deep-equal function (`lodash.isEqual`,
`fast-deep-equal`) — there is no shortcut the language gives you, unlike Kotlin's `data class` or
Swift's `Equatable` synthesis.

**Pitfall at this level:** trusting `===` (or a naive `JSON.stringify(a) === JSON.stringify(b)`,
which breaks on key order and doesn't handle `undefined` fields consistently) to mean "same data"
— closing the gap means writing your own comparison or importing a deep-equal function.

## Senior {concept=data-modeling/copy-gap}

**Interview question: "So when do you reach for a runtime validation/equality library versus
hand-roll it?"**

Once a codebase has enough of these plain-object models — especially ones compared for equality in
tests, memoization, or state-management diffing (React, Redux) — hand-writing a deep-equal
function per model stops paying for itself; a general-purpose deep-equal utility used consistently
across the codebase is the idiomatic fix, the same crossover Kotlin/Dart/Swift never have to make
because the language gives structural equality natively.

The same asymmetry applies to copy-with-change: object spread (`{...a, field: newValue}`) works
fine for flat models, but nested objects need either a deep-merge utility or an immutability
library (Immer) once the model has any real nesting — a bare spread only copies one level deep.

**Follow-up:** "Is this asymmetry a real cost, or just a style difference?" It's a real cost — a
JS/TS engineer moving from Kotlin or Swift genuinely loses a language guarantee here, not just a
convenience. The team-level answer is a consistent convention (a chosen deep-equal library, a
chosen deep-merge/Immer pattern) applied everywhere, rather than each engineer picking their own
per file.

**Pitfall at this level:** assuming a codebase's ad-hoc mix of `===`, `JSON.stringify` comparison,
and the occasional deep-equal import is "fine" because each individual instance happens to work —
the inconsistency itself is the risk once the codebase is large enough that no one remembers which
convention applies where.

## Cross-language comparison

See the cross-language cheat sheet article for how Kotlin, Java, Swift and Dart each answer the
same two questions — or switch the language tab above to read this same topic in another language
directly.

## Pitfalls & trade-offs

- **Mid:** trusting `===` on plain TypeScript objects to mean "same data" — it means "same
  reference," full stop; comparing two API responses for equality without a deep-equal function is
  a bug waiting for the first refetch.
- **Senior:** letting equality and copy-with-change conventions drift per-file (some `===`, some
  `JSON.stringify`, some a real deep-equal import) — the inconsistency itself becomes the risk at
  scale, not any one choice.
