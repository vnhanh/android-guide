---
id: fundamentals-value-vs-reference-semantics-dart
title: Value vs Reference Semantics in Dart — const Canonicalization vs Copying
description: Why Dart has no user-facing value type, how const canonicalization removes mutation instead of copying, and the shallow-copy trap in a manual copy constructor.
tags: [value-semantics, reference-semantics, mutability, dart, mid, senior]
lang: en
status: complete
domain: 01-programming-fundamentals
platform: shared
band: X
level: Mid
sidebar_position: 2
topic: value-vs-reference-semantics
leaf: Dart
prerequisites: []
outcomes:
  - "Predict whether a mutation through one Dart reference is visible through another"
  - "Explain how const canonicalization differs from copy-on-assignment, and why it solves the same class of bug through the opposite mechanism"
resources:
  - title: "Classes — Dart documentation"
    url: "https://dart.dev/language/classes"
    date: "2025-04-01"
---

# Value vs Reference Semantics in Dart — const Canonicalization vs Copying

Handing someone a photocopy of a document and handing them your only key open onto two different
worlds: mark up the photocopy and the original is untouched; hand over the key and whatever they
do with it happens to the one door it opens. Dart only hands out the key — but it has a second
mechanism that removes the risk a different way.

## Mid {concept=value-semantics/default-kind}

**Interview question: "If you copy or reassign this value, do you get an independent copy?"**

**In Dart, every user-defined type is a reference type by default.** No structs — a `class`
behaves the same way every time: assigning shares the same instance. Only the primitives (`int`,
`double`, `bool`, and so on) are true value types.

```dart
// Dart — all user-defined types are reference types by default.
class Counter { int value = 0; }
final c1 = Counter();
final c2 = c1;     // SAME INSTANCE
c2.value = 10;
c1.value;          // 10
```

**Follow-up an interviewer asks next:** "Is there any way to get value-type copy behavior for a
user-defined type in Dart?" Not automatically for a mutable class — the closest is calling a copy
constructor yourself, which copies the fields you asked for and nothing deeper (see Senior). Dart's
other tool for this problem, `const`, works completely differently — it doesn't copy at all.

**Pitfall at this level:** assuming a `final` field on a class gives you value semantics — `final`
only prevents reassigning the *reference itself*; the object it points to can still be mutated
through any other reference to the same instance.

## Senior {concept=value-semantics/shallow-copy}

**Interview question: "What does `const` actually give you that a normal instance doesn't?"**

**Dart's `const` canonicalization is a different mechanism aimed at a different problem than
copying.** A `const` constructor doesn't give you copy-on-assignment — it deduplicates: two
`const` expressions with the same arguments produce the *identical instance*, and that instance is
deeply immutable, so there's nothing to accidentally mutate through the "other" reference because
neither reference can mutate it at all.

```dart
const p1 = Point(1, 2);
const p2 = Point(1, 2);
identical(p1, p2);   // true — same canonical instance, not a copy
```

Contrast that explicitly with Swift: a Swift struct gives you an independent copy that you're then
free to mutate independently; a Dart `const` object gives you a shared instance that no one can
mutate at all. Same goal — remove shared-mutable-state bugs — two different mechanisms.

**The shallow-copy trap still applies to any ordinary (non-const) Dart object you copy by hand —
the same failure shape that shows up in Kotlin, Swift and TypeScript.**

```dart
// Dart — a manual copy is shallow unless every mutable field is deep-copied explicitly.
class Cart { List<String> items; Cart(this.items); }
final a = Cart(['apple']);
final b = Cart(a.items);   // SAME list reference — not a copy
b.items.add('banana');
a.items;   // ['apple', 'banana'] — a saw the mutation too
```

**Follow-up:** "So how do you actually avoid the shallow-copy trap?" Copy the mutable field
explicitly (`Cart(List.from(a.items))`), prefer an unmodifiable list where the field never needs to
change, or reach for `const` when the whole object should be immutable rather than defensively
copied.

**Pitfall at this level:** treating a hand-written copy constructor as a deep copy without checking
whether any field is itself a mutable reference type.

## Cross-language comparison

See the cross-language cheat sheet article for how Kotlin, Java, Swift and TypeScript each answer
the same two questions — or switch the language tab above to read this same topic in another
language directly.

## Pitfalls & trade-offs

- **Mid:** assuming a `final` field gives value semantics — it only locks the reference, not the
  object it points to.
- **Senior:** confusing `const` canonicalization with copy-on-assignment — `const` removes mutation
  entirely by sharing one deeply-immutable instance, the opposite mechanism from Swift's
  copy-and-free value semantics, aimed at the same class of bug.
- **Senior:** writing a manual copy constructor that assigns a mutable field directly instead of
  copying it — the same shallow-copy trap as Kotlin's `data class.copy()`.
