---
id: fundamentals-data-modeling-equality-and-immutability
title: Data Modeling — Equality, Copying & Immutability, Across Five Languages
description: How Kotlin, Java, Swift, Dart and TypeScript let you declare a value object with structural equality and a copy-with-changes operation, and exactly what each one leaves for you to build by hand.
tags: [data-modeling, equality, immutability, kotlin, java, swift, dart, typescript, mid, senior]
lang: en
status: complete
domain: 01-programming-fundamentals
platform: shared
band: X
level: Mid
sidebar_position: 3
prerequisites: []
outcomes:
  - "Give a value object structural equality and a copy-with-changes operation in any of the five languages, and name what the shallow-copy trap looks like in that language"
  - "Name exactly what Java's record and TypeScript's plain objects each fail to give you for free that Kotlin's data class does, and the idiomatic fix"
resources:
  - title: "Data classes — Kotlin documentation"
    url: "https://kotlinlang.org/docs/data-classes.html"
    date: "2025-03-01"
  - title: "Records — Java documentation (JEP 395)"
    url: "https://openjdk.org/jeps/395"
    date: "2024-09-01"
---

# Data Modeling: Equality, Copying & Immutability, Across Five Languages

Two identical twins are not the same person — but for most of what a program needs to do with a
`UserProfile`, that distinction is irrelevant. If two objects have the same `id`, the same
`displayName`, the same `avatarUrl`, you want `==` to say "equal," not "well, they're different
objects in memory, so no." That's **structural equality**: same shape, same values, equal —
regardless of identity. Every language in this guide gives you a way to declare a type as a value
object with structural equality, and most give you a way to produce "a changed copy" without
mutating the original. What differs sharply is how much of that you get for free, and what quietly
still isn't included.

This article is scoped narrowly: how to *declare* a value object with structural equality and a
copy-with-changes operation, and what the generated version does and doesn't cover. It does not
cover the deeper question of value types vs reference types, or Swift's copy-on-write semantics —
that's the Value vs Reference Semantics article's job.

## Mid

**Interview question: "How do you give a value object structural equality instead of Java's
default reference equality?"**

By default, `==` (or `.equals()`) on an object compares identity — two objects with identical
fields are "not equal" unless you say otherwise. Kotlin and Swift both have a clean, built-in
answer for opting a type into structural equality; Java historically didn't.

**Kotlin.** A `data class` generates `equals()`, `hashCode()`, `toString()`, and `copy()` from its
primary constructor properties.

```kotlin
data class UserProfile(val id: String, val displayName: String, val avatarUrl: String?)

val a = UserProfile("1", "Alex", null)
val b = UserProfile("1", "Alex", null)
a == b // true — structural equality, not the same reference

val renamed = a.copy(displayName = "Alexandra") // new instance, only displayName changed
```

**Swift.** A `struct` conforming to `Equatable` gets `==` compared field-by-field — and the
compiler synthesizes that conformance automatically when every stored property is itself
`Equatable`, so for most simple models you only have to write `: Equatable` and nothing else.

```swift
struct UserProfile: Equatable {
    let id: String
    let displayName: String
    let avatarUrl: String?
}

let a = UserProfile(id: "1", displayName: "Alex", avatarUrl: nil)
let b = UserProfile(id: "1", displayName: "Alex", avatarUrl: nil)
a == b // true — synthesized structural equality
```

**Java, the classic pitfall.** Before `record` (Java 16+), giving a class structural equality
meant hand-writing `equals()` and `hashCode()` yourself — and the single most common mistake was
overriding one without the other:

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

**Follow-up an interviewer asks next:** "What's the shallow-copy trap?" `copy()` (and its Swift
equivalent, a struct field reassignment) only copies the reference stored in each property — it
does not deep-copy what that reference points to.

> [!WARNING]
> A `data class` holding a mutable `List` (or any other mutable object) shares that reference
> after `copy()` — mutating the list through the copy mutates the original too, because both
> instances hold the same list reference. Prefer immutable properties (`List`, not `MutableList`)
> in a `data class` used as a value type; if a property genuinely needs to be mutable, `copy()`
> is not doing what its name implies for it.

## Senior

**Interview question: "What does Java's `record` NOT give you that Kotlin's `data class`
does?"**

Java 16+ `record` finally closes the gap from the section above — it generates `equals()`,
`hashCode()`, and `toString()` for you, the same as `data class`:

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
interesting cross-language fact in this article. It means every `record` in a Java codebase either
carries a hand-written wither per mutable-looking field, or the team has adopted a library to
generate one; there's no language-level default either way, which is exactly the kind of judgment
call a Senior engineer is expected to make deliberately rather than by accident.

**Swift's copy-with-change is cheaper syntax, but only because of value semantics.** There's no
`copy()` method on a Swift struct at all — because a struct is a value type, "copy with one field
changed" is just a variable mutation on a local copy:

```swift
var renamed = a
renamed.displayName = "Alexandra" // `a` is untouched — `renamed` is an independent value
```

This only works because assignment (`var renamed = a`) already produces an independent value for a
struct — see the Value vs Reference Semantics article for why that's true and where it stops being
true (e.g. a class-typed property inside the struct).

**Dart has no built-in data-class generation at all.** The language itself gives you nothing —
idiomatic Dart either hand-writes `equals`/`hashCode`/`toString`/`copyWith` (the common naming
convention, mirroring Kotlin's `copy()` as `copyWith`), or reaches for a code-generation package.
The two real options: `equatable`, which gives you structural equality only (you still write your
own `copyWith`), or `freezed`, which generates the full data-class experience — `equals`,
`hashCode`, `toString`, and `copyWith` — plus support for sealed unions. In practice: `freezed`
generates the same `equals`/`hashCode`/`copyWith` shape Kotlin gives natively; you're choosing
whether to accept the codegen step in exchange for not hand-writing that boilerplate per model.

**TypeScript's equality gotcha is the sharpest interview trap in this whole article.** There's no
nominal data-class concept in TypeScript at all — the idiomatic pattern is a `readonly`-field
interface plus object spread for "copy with a change":

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
checking (two differently-named types with the same shape are interchangeable to the compiler)
has nothing to do with structural *equality* at runtime — there is no built-in deep-equal. A
JS/TS engineer's instinct that "same shape means equal" is simply false at the language level;
closing the gap means writing your own field-by-field comparison or importing a deep-equal
function.

**Follow-up:** "So when do you reach for a codegen package versus hand-roll it?" Roughly: a
handful of simple models with few fields, hand-rolling (`copyWith`/wither/deep-equal) is fine and
keeps a dependency out of the build. Once a codebase has dozens of these models, or needs sealed
unions alongside them (`freezed`'s other selling point), the codegen step pays for itself in
boilerplate avoided and in one canonical place the equality/copy contract can't drift out of sync
with the fields.

## Cross-language comparison table

| | Kotlin | Java | Swift | Dart | TypeScript |
|---|---|---|---|---|---|
| Generated equality | `data class` | `record` (16+) | `Equatable` synthesis | hand-rolled or `equatable` package | none — write your own or a deep-equal lib |
| Generated copy-with-change | `copy()` | none — hand-written wither | manual struct field mutation | `copyWith` convention (`freezed`) | object spread |
| Default equality without opting in | reference | reference, same as Java | reference (struct opts in via `Equatable`) | reference | reference (`===`) |

## Pitfalls & trade-offs

- **Mid:** overriding `equals()` without `hashCode()` in Java — two objects that compare equal
  can still land in different `HashMap`/`HashSet` buckets, because the default `hashCode()` stays
  identity-based.
- **Mid:** a `data class` (or `Equatable` struct) holding a mutable collection — `copy()` and
  struct field mutation both only copy the reference, so two "independent" copies can still share
  and silently mutate the same underlying list.
- **Senior:** assuming Java's `record` gives you everything Kotlin's `data class` does — it gives
  you equality and `toString()`, but never a copy-with-change operation; every `record` needs a
  deliberate answer (hand-written wither or a library) for that gap.
- **Senior:** trusting `===` on plain TypeScript objects to mean "same data" — it means "same
  reference," full stop; comparing two API responses for equality without a deep-equal function
  is a bug waiting for the first refetch.
- **Senior:** reaching for a codegen package (`freezed`) reflexively on a handful of trivial
  models — the build-step and generated-file overhead can cost more than the boilerplate it
  removes; the decision should scale with how many models and how much they need (unions, nested
  equality), not be a default.
