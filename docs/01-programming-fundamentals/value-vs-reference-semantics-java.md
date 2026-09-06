---
id: fundamentals-value-vs-reference-semantics-java
title: Value vs Reference Semantics in Java — Records Are Still References
description: Why Java has no user-facing value type even with records, what that means for mutation visibility across two variables, and the shallow-copy trap in a manual copy constructor.
tags: [value-semantics, reference-semantics, mutability, java, mid, senior]
lang: en
status: complete
domain: 01-programming-fundamentals
platform: shared
band: X
level: Mid
sidebar_position: 2
topic: value-vs-reference-semantics
leaf: Java
prerequisites: []
outcomes:
  - "Predict whether a mutation through one Java reference is visible through another"
  - "Name the shallow-copy trap in a manual copy constructor and how to avoid it"
resources:
  - title: "Classes (The Java Tutorials)"
    url: "https://docs.oracle.com/javase/tutorial/java/javaOO/classes.html"
    date: "2025-02-01"
---

# Value vs Reference Semantics in Java — Records Are Still References

Handing someone a photocopy of a document and handing them your only key open onto two different
worlds: mark up the photocopy and the original is untouched; hand over the key and whatever they
do with it happens to the one door it opens. Every assignment, field store and argument pass in
Java is the reference move — there is no user-facing value type at all.

## Mid {concept=value-semantics/default-kind}

**Interview question: "If you copy or reassign this value, do you get an independent copy?"**

**In Java, every user-defined type is a reference type.** No structs; records (Java 16+) are still
reference types under the hood, just with generated `equals()`/`hashCode()` — not a value-type
copy on assignment. Only the eight primitives (`int`, `boolean`, `double`, and so on) are true
value types.

```java
// Java — identical shape to any reference type. No structs; records don't change this.
class Counter { int value = 0; }
Counter c1 = new Counter();
Counter c2 = c1;   // SAME INSTANCE
c2.value = 10;
c1.value;          // 10
```

**Follow-up an interviewer asks next:** "Does a `record` change any of this?" No — a `record`
gives you generated `equals()`/`hashCode()`/`toString()` for structural comparison, but assigning
one `record` reference to another variable still shares the same instance; a record's fields are
final, which prevents mutation entirely, but that's immutability, not value-type copy semantics.

**Pitfall at this level:** assuming a `record`'s structural `equals()` means it copies on
assignment like a value type — it doesn't; two variables holding the same record reference are
still the same object, just one that happens to be immutable.

## Senior {concept=value-semantics/shallow-copy}

**Interview question: "Does a hand-written copy constructor give you a real independent copy?"**

**This is the shallow-copy trap, and it's the strongest cross-language insight in this topic: the
same failure shape shows up, under a different name, in Kotlin, Swift and TypeScript.**

```java
// Java — a manual copy constructor is shallow unless you deliberately deep-copy each field.
class Cart {
    List<String> items;
    Cart(Cart other) { this.items = other.items; }   // SAME list reference — not a copy
}
Cart a = new Cart(); a.items = new ArrayList<>(List.of("apple"));
Cart b = new Cart(a);
b.items.add("banana");
a.items;   // ["apple", "banana"] — a saw the mutation too
```

A copy constructor that assigns a mutable field directly (`this.items = other.items;`) copies the
reference, not the underlying list — both instances end up pointing at the same mutable object.

**Follow-up:** "So how do you actually avoid the shallow-copy trap?" Copy the mutable field
explicitly inside the constructor (`this.items = new ArrayList<>(other.items);`), or prefer an
immutable collection (`List.copyOf(...)`) so there's nothing left to mutate through either
reference.

**Pitfall at this level:** writing a copy constructor that assigns every field directly without
checking which ones are mutable reference types — the field-by-field assignment looks like a copy
but silently shares every reference-typed field.

## Cross-language comparison

See the cross-language cheat sheet article for how Kotlin, Swift, Dart and TypeScript each answer
the same two questions — or switch the language tab above to read this same topic in another
language directly.

## Pitfalls & trade-offs

- **Mid:** assuming a `record`'s structural `equals()` implies value-type copy semantics — it
  doesn't; a record reference is still shared on assignment, just immutable once created.
- **Senior:** writing a copy constructor that assigns a mutable field directly instead of copying
  it — the same shallow-copy trap that shows up as Kotlin's `data class.copy()` and TypeScript's
  object spread.
