---
id: fundamentals-data-modeling-java
title: Data Modeling in Java — From equals()/hashCode() Bugs to record
description: The classic equals()-without-hashCode() bug, how Java 16+ record finally generates structural equality for free, and the copy-with-change gap record still leaves open.
tags: [data-modeling, equality, immutability, java, mid, senior]
lang: en
status: complete
domain: 01-programming-fundamentals
platform: shared
band: X
level: Mid
sidebar_position: 3
topic: data-modeling
leaf: Java
prerequisites: []
outcomes:
  - "Explain the equals()/hashCode() contract bug and why record closes it"
  - "Name exactly what record doesn't give you for free, and the idiomatic fix"
resources:
  - title: "Records — Java documentation (JEP 395)"
    url: "https://openjdk.org/jeps/395"
    date: "2024-09-01"
---

# Data Modeling in Java — From equals()/hashCode() Bugs to record

Two identical twins are not the same person — but for most of what a program needs to do with a
`UserProfile`, that distinction is irrelevant. If two objects have the same `id`, the same
`displayName`, the same `avatarUrl`, you want `equals()` to say "equal." Java historically made
you earn that by hand, and getting it half-right is one of the oldest, most common bugs in the
language.

## Mid {concept=data-modeling/equality}

**Interview question: "How do you give a value object structural equality instead of Java's
default reference equality?"**

**Before `record` (Java 16+), giving a class structural equality meant hand-writing `equals()` and
`hashCode()` yourself — and the single most common mistake was overriding one without the other:**

```java
public class UserProfile {
    private final String id;
    private final String displayName;

    @Override
    public boolean equals(Object o) {
        if (!(o instanceof UserProfile)) return false;
        UserProfile other = (UserProfile) o;
        return id.equals(other.id) && displayName.equals(other.displayName);
    }
    // no hashCode() override — the bug
}
```

Two `UserProfile` instances that `equals()` now says are equal can still land in *different*
`HashMap`/`HashSet` buckets, because the default `hashCode()` is still identity-based. A `Set`
built from these objects can silently contain what looks like a duplicate. The rule that catches
this in review: if you override `equals()`, you must override `hashCode()` to match — equal
objects must produce equal hashes.

**Follow-up an interviewer asks next:** "Does `record` fix this?" Yes — `record` generates a
matched `equals()`/`hashCode()` pair for you, so the mismatch bug above becomes structurally
impossible for any type declared as a `record`.

**Pitfall at this level:** overriding `equals()` on a plain class without also overriding
`hashCode()` — the compiler doesn't require the pairing, so this compiles fine and fails silently
the first time the object is used as a map key or set element.

## Senior {concept=data-modeling/copy-gap}

**Interview question: "What does Java's `record` NOT give you that Kotlin's `data class` does?"**

Java 16+ `record` finally closes the `equals()`/`hashCode()` gap — it generates `equals()`,
`hashCode()`, and `toString()` for you:

```java
public record UserProfile(String id, String displayName, String avatarUrl) {}

var a = new UserProfile("1", "Alex", null);
var b = new UserProfile("1", "Alex", null);
a.equals(b); // true — structural equality, generated
```

But `record` has **no generated `copy()` equivalent.** There is no built-in "copy this record with
one field changed." You have to hand-write it yourself — commonly called a **wither** method — or
reach for a library that generates one:

```java
public record UserProfile(String id, String displayName, String avatarUrl) {
    public UserProfile withDisplayName(String newDisplayName) {
        return new UserProfile(id, newDisplayName, avatarUrl);
    }
}
```

This asymmetry — Kotlin gives you `copy()` for free, Java's `record` doesn't — is the single most
interesting cross-language fact in this topic. It means every `record` in a Java codebase either
carries a hand-written wither per mutable-looking field, or the team has adopted a library to
generate one; there's no language-level default either way, which is exactly the kind of judgment
call a Senior engineer is expected to make deliberately rather than by accident.

**Follow-up:** "So when do you reach for a wither-generating library versus hand-roll it?" A
handful of simple records with few fields, hand-rolling a wither is fine. Once a codebase has
dozens of records needing copy-with-change operations, the boilerplate cost of hand-writing every
wither starts to outweigh the cost of adopting a library or annotation processor that generates
them.

**Pitfall at this level:** assuming `record` gives you everything Kotlin's `data class` does — it
gives you equality and `toString()`, but never a copy-with-change operation; every `record` needs
a deliberate answer for that gap.

## Cross-language comparison

See the cross-language cheat sheet article for how Kotlin, Swift, Dart and TypeScript each answer
the same two questions — or switch the language tab above to read this same topic in another
language directly.

## Pitfalls & trade-offs

- **Mid:** overriding `equals()` without `hashCode()` — two objects that compare equal can still
  land in different `HashMap`/`HashSet` buckets, because the default `hashCode()` stays
  identity-based.
- **Senior:** assuming `record` gives you everything Kotlin's `data class` does — it gives you
  equality and `toString()`, but never a copy-with-change operation.
- **Senior:** hand-writing a wither for every record field-by-field as a codebase's model count
  grows — the boilerplate cost eventually exceeds adopting a generator, and the crossover point is
  worth naming explicitly rather than discovering by accumulated pain.
