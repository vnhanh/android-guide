---
id: fundamentals-senior-android
title: Generics, Variance & the JVM Memory Model (Senior, Android)
description: Generics and variance, inline/reified and the cost of abstraction, the JVM memory model and GC roots, and designing an API other teams consume.
tags: [android, kotlin, generics, jvm, senior]
lang: en
status: complete
domain: 01-programming-fundamentals
band: S
platform: android
level: Senior
sidebar_position: 3
prerequisites: [fundamentals-mid-android]
outcomes:
  - "Design a library-quality API and justify each signature against how it will be misused"
counterpart: fundamentals-senior-ios
resources:
  - title: "Generics — Kotlin documentation"
    url: "https://kotlinlang.org/docs/generics.html"
    date: "2025-03-01"
  - title: "Inline functions — Kotlin documentation"
    url: "https://kotlinlang.org/docs/inline-functions.html"
    date: "2025-03-01"
  - title: "Java Memory Model and Kotlin"
    url: "https://kotlinlang.org/docs/shared-mutable-state-and-concurrency.html"
    date: "2024-11-01"
  - title: "Api guidelines for Kotlin libraries"
    url: "https://kotlinlang.org/docs/jvm-api-guidelines-introduction.html"
    date: "2024-11-01"
---

# Generics, Variance & the JVM Memory Model

> **Outcome.** Design a library-quality API and justify each signature choice against the
> specific way another team will misuse it — not against an abstract notion of "good design."

## 1. Generics & variance — `in`/`out` as a promise about direction

An unmarked generic parameter (`class Box<T>`) is invariant: `Box<Cat>` and `Box<Animal>` have no
subtype relationship, even if `Cat` is a subtype of `Animal`. `out` and `in` state a direction
the compiler then enforces:

```kotlin
// out T: this type only ever PRODUCES T (appears in return positions, never as a parameter).
// A Producer<Cat> can safely stand in wherever a Producer<Animal> is expected.
interface Producer<out T> {
    fun produce(): T
}

// in T: this type only ever CONSUMES T (appears in parameter positions, never as a return type).
// A Consumer<Animal> can safely stand in wherever a Consumer<Cat> is expected — it can handle
// anything at least as general as Cat.
interface Consumer<in T> {
    fun consume(item: T)
}

fun feed(consumer: Consumer<Cat>) { consumer.consume(Cat()) }
feed(Consumer<Animal> { animal -> /* handles any Animal, including Cat */ }) // legal: in-variance
```

> [!IMPORTANT]
> Variance is not a syntax choice, it's a correctness claim. Marking a type `out` when it
> actually has a method taking `T` as a parameter is a compile error — the compiler is enforcing
> that "produces T" and "consumes T" cannot both be true for the same variance annotation, because
> allowing both is exactly how a `ClassCastException` sneaks into supposedly type-safe code (the
> reason Java arrays, which are covariant with no such enforcement, can throw
> `ArrayStoreException` at runtime for a mistake Kotlin's generics reject at compile time).

## 2. `inline`, `reified`, and what abstraction costs

A normal higher-order function allocates a `Function` object for its lambda and pays a virtual
call to invoke it. `inline` tells the compiler to paste the function's body (and its lambda's
body) directly at the call site — no allocation, no virtual call, at the cost of larger compiled
bytecode per call site.

```kotlin
inline fun <T> measureAndLog(label: String, block: () -> T): T {
    val start = System.nanoTime()
    val result = block()
    Log.d("perf", "$label took ${(System.nanoTime() - start) / 1_000_000}ms")
    return result
}
```

`reified` only exists on `inline` functions, and solves a real JVM limitation: generic type
information is normally erased at runtime, so a plain generic function cannot ask "is this a
`T`" or instantiate a `T` directly. Because an `inline` function's body is copied to the call
site — where the real type is known — `reified` lets it use that type as if erasure never
happened:

```kotlin
inline fun <reified T> Gson.fromJson(json: String): T = fromJson(json, T::class.java)
// Ordinary generics can't do `T::class.java` — reified makes it legal by inlining the call.
```

> [!WARNING]
> `inline` is not free. Every call site gets its own copy of the function body, which grows the
> compiled method size — for a large function called from many places, this can bloat the APK
> and, past a JVM method-size limit, fail to compile at all. Reserve `inline` for small,
> hot-path, or `reified`-requiring functions; inlining a large function for a marginal
> allocation saving is the abstraction costing more than it buys.

## 3. The JVM memory model: lifetime, GC roots, and what actually leaks

An object becomes eligible for garbage collection when it is unreachable from any **GC root** —
a running thread's stack, a static field, or a JNI reference, among others. The Android-specific
leak pattern worth naming precisely: **an object with a longer lifetime holding a reference to
one with a shorter lifetime**, which keeps the shorter-lived object reachable long after it
should have been collected.

```kotlin
// LEAK: the singleton (process lifetime) holds a reference to the Activity
// (should live only as long as the screen is on screen).
object AnalyticsManager {
    private var listener: ((Event) -> Unit)? = null
    fun setListener(l: (Event) -> Unit) { listener = l }
}

class ProfileActivity : Activity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        // This lambda captures `this` implicitly — AnalyticsManager now holds
        // the Activity for as long as the process lives, long past onDestroy.
        AnalyticsManager.setListener { event -> updateUi(event) }
    }
}
```

The fix is always the same shape: make the shorter-lived side responsible for detaching itself,
or hold only a weak reference from the longer-lived side.

```kotlin
class ProfileActivity : Activity() {
    override fun onDestroy() {
        AnalyticsManager.setListener(null) // break the reference before this Activity dies
        super.onDestroy()
    }
}
```

## 4. Designing a library-quality API

The outcome this article checks for is not "write clean code" — it is naming, for each public
signature, the specific mistake a consuming team will make, and showing the signature that
makes that mistake impossible or a compile error rather than a runtime surprise.

```kotlin
// WEAK: a Boolean parameter with no name at the call site is a guessing game,
// and nothing stops a caller passing (context, true, true) with the arguments swapped.
fun loadImage(context: Context, cache: Boolean, retry: Boolean) { ... }

// BETTER: named, defaulted, and impossible to swap by position because each
// is its own type — the misuse this prevents is a silent argument-order bug.
data class ImageLoadOptions(
    val useCache: Boolean = true,
    val retryOnFailure: Boolean = true,
)
fun loadImage(context: Context, options: ImageLoadOptions = ImageLoadOptions()) { ... }
```

```kotlin
// WEAK: returns null for "not found" AND for "network error" — a caller cannot
// distinguish "retry" from "this genuinely doesn't exist" without extra state.
suspend fun fetchUser(id: String): User?

// BETTER: a sealed result names every outcome a caller must handle, and the
// compiler enforces exhaustive handling via `when`.
sealed interface FetchResult<out T> {
    data class Success<T>(val value: T) : FetchResult<T>
    data class NotFound(val id: String) : FetchResult<Nothing>
    data class NetworkError(val cause: Throwable) : FetchResult<Nothing>
}
suspend fun fetchUser(id: String): FetchResult<User>
```

## Pitfalls & trade-offs

- **Marking a type `out` or `in` without checking every member honours the direction.** The
  compiler catches an outright violation, but a near-miss — a method that only *looks* like it
  only produces `T` — is worth an explicit second read before publishing the API.
- **Inlining large functions for a marginal allocation saving.** Covered above: method-size
  growth is a real cost, and it is per call site, so it multiplies with usage.
- **Treating a leaked listener/callback as a one-off bug instead of a pattern.** Any
  longer-lived-holds-shorter-lived reference is the same fix every time: the shorter-lived side
  detaches itself, or the longer-lived side holds a weak reference.
- **A public API signature that lets a consumer misuse it silently.** Two unlabelled `Boolean`
  parameters, a nullable return that conflates two different failure reasons — both compile
  fine and both are reviewed away by naming the specific misuse each design prevents, per the
  worked examples above.
