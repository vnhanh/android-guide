---
id: fundamentals-mid-android
title: Kotlin Type System, Collections & OOP/SOLID in Practice (Mid, Android)
description: Null safety and where it stops being safe, collections vs sequences, data classes, and SOLID applied to real mobile code rather than analogy.
tags: [android, kotlin, oop, solid, mid]
lang: en
status: complete
domain: 01-programming-fundamentals
band: M
platform: android
level: Mid
sidebar_position: 1
prerequisites: []
outcomes:
  - "Read an unfamiliar Kotlin file and predict its behaviour — including nullability at a Java boundary — before running it"
counterpart: fundamentals-mid-ios
resources:
  - title: "Null safety — Kotlin documentation"
    url: "https://kotlinlang.org/docs/null-safety.html"
    date: "2025-03-01"
  - title: "Sequences — Kotlin documentation"
    url: "https://kotlinlang.org/docs/sequences.html"
    date: "2025-03-01"
  - title: "Data classes — Kotlin documentation"
    url: "https://kotlinlang.org/docs/data-classes.html"
    date: "2025-03-01"
  - title: "Scope functions — Kotlin documentation"
    url: "https://kotlinlang.org/docs/scope-functions.html"
    date: "2025-03-01"
---

# Kotlin Type System, Collections & OOP/SOLID in Practice

> **Outcome.** Read an unfamiliar Kotlin file and predict its behaviour — including nullability
> at a Java boundary — before running it.

## 1. Null safety, and where it stops being safe

Kotlin's type system distinguishes nullable (`String?`) from non-nullable (`String`) types at
compile time. Assigning `null` to a non-nullable type, or calling a member on a nullable type
without a check, is a compile error — the null-pointer-at-runtime bug class Java allows and
Kotlin refuses to.

```kotlin
fun greet(name: String) = "Hello, $name"   // name can never be null — enforced at the call site
fun greetOptional(name: String?) = "Hello, ${name ?: "guest"}" // must handle the null case
```

This safety **evaporates at a Java (or unannotated third-party) boundary**. A type coming from
Java code — or from a Kotlin library that hasn't annotated its nullability — arrives as a
**platform type**, written `String!` in tooling, which the compiler does not check at all:

```kotlin
// JAVA
public class LegacyUserApi {
    public String getDisplayName(int userId) { ... } // may return null; no annotation says so
}
```

```kotlin
// KOTLIN — calling it
val api = LegacyUserApi()
val name: String = api.getDisplayName(userId) // COMPILES — even though this can NPE at runtime
println(name.length) // the exact crash Kotlin's null safety exists to prevent
```

> [!IMPORTANT]
> Reading an unfamiliar Kotlin file for nullability risk means checking every call into Java,
> an unannotated Maven dependency, or a `@Nullable`-free interop surface — the compiler will not
> flag these, and a codebase that "never has NPEs because it's Kotlin" is a codebase that has not
> looked here yet.

The defensive idiom at such a boundary is to immediately re-assert the real nullability rather
than trust the platform type silently:

```kotlin
val name: String? = api.getDisplayName(userId) // state the real contract explicitly
val safeName = name ?: "Unknown user"
```

## 2. Collections vs sequences — when laziness is the correct default

`List`, `Map` and `Set` operators (`.map`, `.filter`, …) are **eager**: each operator allocates a
new intermediate collection immediately.

```kotlin
val result = users
    .filter { it.isActive }   // allocates a full intermediate List
    .map { it.displayName }   // allocates another full List
    .take(5)
```

For a short list this is fine and more readable than the alternative. For a large or
expensive-per-element pipeline, `.asSequence()` switches to lazy, single-pass evaluation —
elements flow through the whole chain one at a time, and `.take(5)` stops the upstream work
after the fifth match instead of processing everything first:

```kotlin
val result = users.asSequence()
    .filter { it.isActive }
    .map { it.displayName }
    .take(5)
    .toList() // materializes only the 5 elements actually needed
```

> [!TIP]
> The rule of thumb: reach for `Sequence` when the collection is large, the chain has several
> steps, or a short-circuiting operator (`take`, `first`, `any`) means most of the input never
> needs to be touched. For a handful of items or a single `.map`, plain collections are more
> readable and the eager allocations are noise, not a performance problem.

## 3. Data classes: equality, `copy`, and what they don't give you for free

A `data class` generates `equals()`, `hashCode()`, `toString()`, and `copy()` from its primary
constructor properties — structural equality instead of Java's default reference equality.

```kotlin
data class UserProfile(val id: String, val displayName: String, val avatarUrl: String?)

val a = UserProfile("1", "Alex", null)
val b = UserProfile("1", "Alex", null)
a == b // true — structural equality, not the same reference

val renamed = a.copy(displayName = "Alexandra") // new instance, only displayName changed
```

> [!WARNING]
> `copy()` performs a **shallow** copy. A `data class` holding a mutable `List` or another
> mutable object shares that reference after `copy()` — mutating it through the copy mutates the
> original too. Prefer immutable properties (`List`, not `MutableList`) in a `data class` used as
> a value type; if a property genuinely needs to be mutable, `copy()` is not doing what its name
> implies for it.

## 4. OOP & SOLID in real mobile code, not analogy

The four OOP pillars and SOLID read as abstractions until they are the reason a specific PR is
easy or painful to write. Worked against a real mobile shape — a repository that can source data
from the network or a local cache:

```kotlin
// SRP: this class does exactly one thing — decide where profile data comes from.
// It is not also parsing JSON, not also logging analytics, not also formatting for display.
class UserProfileRepository(
    private val remote: UserApi,
    private val local: UserDao,
) {
    suspend fun getProfile(userId: String): UserProfile {
        local.find(userId)?.let { return it.toDomain() }
        val fresh = remote.fetchProfile(userId)
        local.insert(fresh.toEntity())
        return fresh
    }
}

// DIP: the repository depends on interfaces (UserApi, UserDao), not concrete Retrofit/Room
// classes — a fake implementation can stand in for either in a test with no framework involved.
interface UserApi { suspend fun fetchProfile(userId: String): UserProfileDto }
interface UserDao { suspend fun find(userId: String): UserProfileEntity?; suspend fun insert(e: UserProfileEntity) }
```

```kotlin
// LSP violation, the kind code review actually catches: a subtype that narrows the contract
// its parent promised, breaking every caller that relied on the parent's guarantee.
open class PaymentProcessor {
    open fun charge(amountCents: Long) { /* always succeeds or throws PaymentError */ }
}

class ReadOnlyPaymentProcessor : PaymentProcessor() {
    override fun charge(amountCents: Long) {
        throw UnsupportedOperationException() // silently breaks every caller's assumption
    }
}
```

`ReadOnlyPaymentProcessor` is not a `PaymentProcessor` in any usable sense — a caller holding a
`PaymentProcessor` reference has no way to know charging will always fail, which is exactly the
bug Liskov substitution names: a subtype must honour its parent's contract, not just its
signature.

## 5. Scope functions — real readability gain, and its cost

`let`, `run`, `with`, `apply`, and `also` each thread `this`/`it` through a lambda; the
difference between them is the receiver name and the return value, not behaviour.

```kotlin
// apply: configure an object, return the object itself — good for builder-style setup.
val request = Request.Builder().apply {
    url("https://api.example.com/profile")
    addHeader("Authorization", "Bearer $token")
}.build()

// let: transform a value, especially a nullable one, returning the transformed result.
val displayName: String = user?.let { "${it.firstName} ${it.lastName}" } ?: "Guest"
```

> [!WARNING]
> Nested or chained scope functions are the most common Mid-level readability regression in
> Kotlin review. `a?.let { it.b }?.let { it.c }?.also { doSomething(it) }` compiles cleanly and
> reads like a puzzle — each `it` shadows the previous one, and a reviewer has to hold three
> levels of implicit naming in their head. A named intermediate variable, or an early return,
> is very often the more readable choice even though it's "more lines."

## Pitfalls & trade-offs

- **Trusting a platform type (`String!`) without re-asserting nullability.** Covered above —
  this is the single most common source of "how did this NPE, it's Kotlin" bugs.
- **Reaching for `Sequence` reflexively on small collections.** The lazy evaluation machinery has
  its own allocation and iterator overhead; for a short list processed once, eager collections
  are both simpler and faster.
- **A `data class` wrapping a `MutableList` or other mutable reference.** `copy()`'s shallow
  semantics silently share that reference between "copies" — a bug that only shows up once two
  call sites mutate what they each believe is their own data.
- **A subtype that throws on a method its parent promised to handle.** The Liskov violation
  above compiles and passes a naive type check; it fails the moment a caller trusts the parent
  type's contract, usually in production, rarely in the PR that introduced it.
- **Scope-function chains that save keystrokes at the cost of a reviewer's working memory.**
  If a reviewer has to trace which `it` belongs to which lambda, the chain has already cost more
  than it saved.
