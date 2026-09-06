---
id: fundamentals-generics-and-variance
title: Generics & Variance, Across Five Languages
description: How Kotlin, Java, Swift, Dart and TypeScript express "works for any type" and the direction a generic parameter is allowed to flow, including why three of them landed on the same in/out keywords.
tags: [generics, variance, type-erasure, kotlin, java, swift, dart, typescript, mid, senior]
lang: en
status: complete
domain: 01-programming-fundamentals
platform: shared
band: X
level: Mid
sidebar_position: 6
prerequisites: []
outcomes:
  - "Explain what type erasure means for a generic function in each language, and which one language gives you a workaround"
  - "State whether a language declares variance on the type or at each call site, and design a producer/consumer-shaped generic API correctly in at least two of the five languages"
resources:
  - title: "Generics — Kotlin documentation"
    url: "https://kotlinlang.org/docs/generics.html"
    date: "2025-03-01"
  - title: "Generics — The Swift Programming Language"
    url: "https://docs.swift.org/swift-book/documentation/the-swift-programming-language/generics/"
    date: "2025-06-01"
---

# Generics & Variance, Across Five Languages

A generic type is a promise: "this works for any `T`, and I won't peek at what `T` actually is."
Variance is the finer promise underneath that one: does this type only ever *produce* a `T`
(like a delivery box labeled "contains at least apples," which you can safely treat as a box of
fruit), only ever *consume* a `T` (a bin labeled "can accept any fruit," which you can safely
treat as a bin that accepts apples), or both — in which case no substitution is safe. Every
language in this guide has generics. What differs, and what this article is actually about, is
where that produce/consume promise gets declared, whether the compiler can check it, and what
survives to runtime.

## Mid

**Interview question: "What does a generic type actually guarantee, and where does that
guarantee break?"**

The honest answer: a generic type guarantees compile-time substitutability for any type argument,
and nothing at all about what's still known at runtime — that second half is where every
language except one draws the same line.

```kotlin
// Kotlin — an unmarked generic parameter is invariant, and works the same as Java's:
// write once, use with any type argument.
class Box<T>(val value: T)
fun <T> firstOrNull(items: List<T>): T? = items.firstOrNull()
```

```java
// Java — identical shape, and the same erasure limitation Kotlin inherits from the JVM:
// at runtime, a List<String> and a List<Integer> are both just a List. The type argument
// is a compile-time-only fiction.
class Box<T> { T value; }
static <T> T firstOrNull(List<T> items) { return items.isEmpty() ? null : items.get(0); }
```

```swift
// Swift — same idea, checked by the compiler via constraints.
struct Box<T> { let value: T }
func firstMatch<T>(in items: [T], where predicate: (T) -> Bool) -> T? {
    for item in items where predicate(item) { return item }
    return nil
}
```

```dart
// Dart — straightforward, same shape again.
class Box<T> {
  final T value;
  Box(this.value);
}
```

```typescript
// TypeScript — generics sit on top of structural typing: T isn't a runtime tag,
// it's a compile-time label the type checker uses to relate parameter and return shapes.
class Box<T> { constructor(public value: T) {} }
function firstMatch<T>(items: T[], predicate: (item: T) => boolean): T | undefined {
  return items.find(predicate);
}
```

Type erasure is the shared limitation: the JVM (Java and Kotlin), and TypeScript's compile-to-JS
step, throw away the type argument once compilation finishes. A plain generic function cannot ask
"is this a `T`" or instantiate a `T` directly, because there is no `T` left to ask about at
runtime. Java has no workaround for this — it's a permanent limitation of the platform. Kotlin
does, and it's worth naming as a real, Kotlin-only capability rather than a minor syntax
convenience: `inline` plus `reified`.

```kotlin
inline fun <reified T> Gson.fromJson(json: String): T = fromJson(json, T::class.java)
// Ordinary generics can't do `T::class.java` — a plain generic function has no T at runtime
// to ask about. `reified` only exists on `inline` functions: because the function body is
// copied to each call site at compile time, the real type is known there, and `reified`
// lets the body use it as if erasure never happened. Java has nothing equivalent — this is
// a real, checkable difference in what the two languages let you express.
```

**Follow-up an interviewer asks next:** "So how does Java work around not having reified
generics?" It doesn't, not generically — the common workaround is passing a `Class<T>` token
explicitly as a parameter (`fromJson(json, User.class)`), which is exactly the boilerplate
`reified` exists to eliminate.

**Pitfall at this level:** assuming a generic function can do anything a non-generic one can, just
"for any type" — reflection, instantiation (`T()`), and runtime type checks (`is T`, `instanceof
T`) are all erasure casualties in Java and in ordinary (non-`reified`) Kotlin generics alike.

## Senior

**Interview question: "What's the difference between declaring variance on the type vs at each
call site?"**

This is the sharpest cross-language contrast in this article. Kotlin, Dart, and TypeScript let
you declare the produce/consume direction once, on the type's own declaration, and every use of
that type inherits it. Java has no such declaration — instead, a caller states the direction
separately at every single use, with a wildcard.

```kotlin
// Kotlin — declaration-site variance: stated once, on Producer/Consumer themselves.
interface Producer<out T> { fun produce(): T }   // out: only ever returns T
interface Consumer<in T> { fun consume(item: T) } // in: only ever accepts T as a parameter

fun feed(consumer: Consumer<Cat>) { consumer.consume(Cat()) }
feed(Consumer<Animal> { animal -> /* handles any Animal, including Cat */ }) // legal: in-variance
```

```java
// Java — use-site variance: there is no in/out on the interface declaration itself.
// Every caller who wants covariance or contravariance writes a wildcard at that call site.
interface Producer<T> { T produce(); }
interface Consumer<T> { void consume(T item); }

void printAll(List<? extends Animal> producers) { /* ? extends = producer position, like Kotlin's out */ }
void fillWithCats(List<? super Cat> consumers) { /* ? super = consumer position, like Kotlin's in */ }
```

The consequence: in Kotlin, `Producer<out T>` is decided once and every piece of code that uses
`Producer` agrees on it. In Java, the same interface can be used covariantly in one call and
invariantly in another — the direction is a property of the call site, not the type, so it has to
be re-stated (and can be gotten wrong) every time.

> [!NOTE]
> Three of these five languages independently converged on the literal keywords `in`/`out` for
> the same concept. Dart 2.x+ supports explicit variance modifiers on generic type parameters —
> `out`, `in`, and `inout` — as an opt-in feature, the same words Kotlin uses. TypeScript 4.7+
> added its own explicit `in`/`out` variance annotations on generic type parameters, on top of
> the structural, mostly-inferred variance it already had. Kotlin, Dart, and TypeScript arrived at
> the same vocabulary for the same idea without coordinating — that's a genuinely useful fact to
> have ready, not trivia: it means the concept, not just the keyword, is the part worth
> understanding once and reusing across all three.

```dart
// Dart — variance is inferred structurally most of the time; explicit out/in/inout
// is opt-in when you want the same declaration-site guarantee Kotlin gives you by default.
class Producer<out T> { T produce() => ...; }
```

```typescript
// TypeScript — variance is inferred from structural shape for most generics; explicit
// in/out (4.7+) is for cases the inference can't resolve on its own, or to state intent.
interface Producer<out T> { produce(): T; }
interface Consumer<in T> { consume(item: T): void; }
```

Runtime type information follows the same declaration-site/use-site split in spirit but is really
its own axis: Java and TypeScript erase it completely with no workaround; Kotlin can recover it
per call site via `reified`; Swift preserves it through metatypes; Dart's runtime is more
type-aware than the JVM's erasure model, though the honest answer is "partially — this is a
nuance worth double-checking against the current Dart version rather than stating as a hard
guarantee either way."

Swift adds a distinction none of the other four languages draw explicitly: a protocol-typed
parameter can be written as an existential or as a generic, and the two compile to different
dispatch mechanisms with different costs.

```swift
protocol DataSource { func fetch() -> [Item] }

// Existential (`any DataSource`): concrete type erased and boxed at runtime. Every call
// goes through a witness table — flexible (a heterogeneous array of `any DataSource` is
// legal), at the cost of dynamic dispatch and, for larger conforming types, a heap allocation.
func load(from source: any DataSource) -> [Item] { source.fetch() }

// Generic (`some DataSource`, or `<S: DataSource>`): concrete type fixed at compile time
// for a given call site. The compiler can specialize and often inline — no dispatch
// overhead, at the cost of not mixing different concrete types through the same call site.
func loadOpaque(from source: some DataSource) -> [Item] { source.fetch() }
```

Kotlin, Java, Dart, and TypeScript have no equivalent split — a protocol/interface-typed parameter
in those languages is uniformly dynamically dispatched, so there's no "generic vs existential"
choice to make; Swift is the outlier for having one at all.

Kotlin's `inline` carries its own, unrelated cost worth keeping in the same conversation, since it
is the mechanism `reified` rides on. A normal higher-order function allocates a `Function` object
for its lambda and pays a virtual call to invoke it; `inline` pastes the function's body (and its
lambda's body) directly at each call site instead — no allocation, no virtual call, but every call
site now gets its own copy of that body.

```kotlin
inline fun <T> measureAndLog(label: String, block: () -> T): T {
    val start = System.nanoTime()
    val result = block()
    Log.d("perf", "$label took ${(System.nanoTime() - start) / 1_000_000}ms")
    return result
}
```

> [!WARNING]
> `inline` is not free. Every call site's copy of the function body grows the compiled method
> size — for a large function called from many places, this can bloat the binary and, past a
> platform method-size limit, fail to compile at all. Reserve `inline` for small, hot-path, or
> `reified`-requiring functions; inlining a large function for a marginal allocation saving is the
> abstraction costing more than it buys.

## Cross-language comparison table

| | Kotlin | Java | Swift | Dart | TypeScript |
|---|---|---|---|---|---|
| Variance declaration | declaration-site `out`/`in` | use-site wildcards (`? extends`, `? super`) | protocols + `associatedtype`, no direct out/in on generics | declaration-site `out`/`in`/`inout` (opt-in) | declaration-site `out`/`in` (4.7+, opt-in) |
| Runtime type info | erased, reified via `inline` workaround | erased, no workaround | preserved via metatypes | partially preserved | fully erased, no workaround |
| Existential vs generic dispatch distinction | no direct equivalent | no direct equivalent | `some` vs `any` | no direct equivalent | no direct equivalent |

Swift is the outlier in that last row — it's the only one of the five with a language-level
choice between "erased and boxed" and "known and specialized" for protocol-typed parameters.

## Pitfalls & trade-offs

- **Mid: assuming a generic function can do anything a concrete one can.** Reflection,
  instantiation, and runtime type checks are all casualties of erasure in Java and in ordinary
  Kotlin generics — `reified` is the one language-level escape hatch among these five, and it
  only exists on `inline` functions.
- **Mid: reaching for `Class<T>` tokens in Java as if that's "the same as reified."** It's a
  manual workaround a caller must remember to pass, not a compiler-enforced guarantee — the
  gap `reified` closes doesn't exist in Java at all.
- **Senior: marking a Kotlin/Dart/TypeScript type `out` or `in` without checking every member
  honours the direction.** The compiler catches an outright violation, but a near-miss — a method
  that only *looks* like it only produces `T` — is worth an explicit second read before
  publishing the API.
- **Senior: forgetting Java's wildcard is a per-call-site choice, not a type-level guarantee.** A
  `List<T>` can be used covariantly in one method and invariantly in another; nothing about the
  interface itself prevents a caller from getting the wildcard wrong or omitting it.
- **Senior: reaching for Swift's `any` (existentials) as the default protocol-typed parameter.**
  It compiles and works, but pays a dispatch and sometimes allocation cost that `some`/generic
  dispatch avoids for the common case of a single, statically-known conforming type per call
  site.
- **Senior: inlining a large Kotlin function for a marginal allocation saving.** Method-size
  growth is a real cost, and it's per call site, so it multiplies with usage.
