---
id: fundamentals-value-vs-reference-semantics-typescript
title: Value vs Reference Semantics in TypeScript — Primitives Copy, Objects Share
description: Why TypeScript's primitives copy by value while every object and array shares by reference, and the shallow-copy trap hiding in an innocent-looking object spread.
tags: [value-semantics, reference-semantics, mutability, typescript, mid, senior]
lang: en
status: complete
domain: 01-programming-fundamentals
platform: shared
band: X
level: Mid
sidebar_position: 2
topic: value-vs-reference-semantics
leaf: TypeScript
prerequisites: []
outcomes:
  - "Predict whether a mutation through one TypeScript reference is visible through another"
  - "Name the shallow-copy trap in object spread and how to avoid it"
resources:
  - title: "Structural Typing — TypeScript Handbook"
    url: "https://www.typescriptlang.org/docs/handbook/type-compatibility.html"
    date: "2025-05-01"
---

# Value vs Reference Semantics in TypeScript — Primitives Copy, Objects Share

Handing someone a photocopy of a document and handing them your only key open onto two different
worlds: mark up the photocopy and the original is untouched; hand over the key and whatever they
do with it happens to the one door it opens. TypeScript (and the JavaScript underneath it) splits
cleanly along the primitive/object line, no class-vs-struct vocabulary needed.

## Mid {concept=value-semantics/default-kind}

**Interview question: "If you copy or reassign this value, do you get an independent copy?"**

**TypeScript/JavaScript split by kind, not by declaration:** primitives (`string`, `number`,
`boolean`) copy by value; objects and arrays are always reference types.

```typescript
// TypeScript — primitives copy by value, objects and arrays share by reference.
let x = 5;
let y = x;         // COPY — independent
y = 10;
x;                 // still 5

const obj1 = { value: 0 };
const obj2 = obj1; // SAME OBJECT — obj2 is another reference to obj1
obj2.value = 10;
obj1.value;        // 10
```

**Follow-up an interviewer asks next:** "Does `const` on `obj1` prevent this mutation?" No —
`const` only prevents *reassigning* the variable `obj1` itself; it says nothing about mutating the
object's properties. `obj1.value = 10` is legal even though `obj1` is `const`.

**Pitfall at this level:** treating `const` as if it made an object immutable — it only locks the
binding, not the object's contents. Freezing the object itself (`Object.freeze`) is a separate,
opt-in step.

## Senior {concept=value-semantics/shallow-copy}

**Interview question: "Does an object spread give you a real independent copy?"**

**This is the shallow-copy trap, and it's the strongest cross-language insight in this topic: the
same failure shape shows up, under a different name, in Kotlin and Swift.**

```typescript
// TypeScript — object spread is a SHALLOW copy. A nested object/array is shared, not duplicated.
const cart1 = { items: ['apple'] };
const cart2 = { ...cart1 };   // new top-level object, but items is the SAME array reference
cart2.items.push('banana');
cart1.items;                   // ['apple', 'banana'] — cart1 saw the mutation too
```

Object spread (`{...obj}`) only copies one level deep — a nested object or array rides along
unchanged, shared between the "original" and the "copy," exactly like Kotlin's `data class.copy()`
or a Swift struct nesting a class.

**Follow-up:** "So how do you actually avoid the shallow-copy trap?" Prefer `readonly` fields where
mutation isn't intended, so there's no mutable reference left to leak; when a genuine deep copy is
required, use `structuredClone()` (or a hand-written deep-copy function) rather than trusting a
shallow spread to be enough.

**Pitfall at this level:** using `{...obj}` or `[...arr]` as a general-purpose "clone" without
checking whether any property is itself an object or array — the spread only protects the
top-level shape, not anything nested inside it.

## Cross-language comparison

See the cross-language cheat sheet article for how Kotlin, Java, Swift and Dart each answer the
same two questions — or switch the language tab above to read this same topic in another language
directly.

## Pitfalls & trade-offs

- **Mid:** treating `const` as deep immutability — it only prevents reassigning the variable, not
  mutating the object's own properties.
- **Senior:** using object spread as a general-purpose deep clone — it only copies one level deep,
  the same shallow-copy trap that shows up as Kotlin's `data class.copy()` and a Swift struct
  nesting a class.
