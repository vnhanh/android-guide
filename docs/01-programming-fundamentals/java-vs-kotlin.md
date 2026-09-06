---
id: fundamentals-mid-android-java-vs-kotlin
title: Java vs Kotlin, and Why Android Chose Kotlin (Mid, Android)
description: The concrete differences a Java developer meets on day one of Kotlin, why Google made Kotlin the default for Android, and what Kotlin does not fix — answered as an interview question, not a feature list.
tags: [android, kotlin, java, interview, mid]
lang: en
status: complete
domain: 01-programming-fundamentals
band: M
platform: android
level: Mid
sidebar_position: 12
prerequisites: [fundamentals-type-system-and-null-safety]
outcomes:
  - "Answer \"what's different between Java and Kotlin, and why Kotlin?\" in two minutes with concrete mechanisms, not adjectives"
counterpart: fundamentals-mid-ios-objc-vs-swift
resources:
  - title: "Kotlin for Android — Android Developers"
    url: "https://developer.android.com/kotlin"
    date: "2025-06-01"
  - title: "Null safety — Kotlin documentation"
    url: "https://kotlinlang.org/docs/null-safety.html"
    date: "2025-03-01"
  - title: "Calling Java from Kotlin — Kotlin documentation"
    url: "https://kotlinlang.org/docs/java-interop.html"
    date: "2025-03-01"
  - title: "Coroutines overview — Android Developers"
    url: "https://developer.android.com/kotlin/coroutines"
    date: "2025-06-01"
---

# Java vs Kotlin, and Why Android Chose Kotlin

> **Outcome.** Answer "what's different between Java and Kotlin, and why Kotlin?" in two
> minutes with concrete mechanisms, not adjectives.

## 1. The one-paragraph answer

Both languages compile to JVM bytecode and share the same runtime, the same standard library
underneath, and the same tooling — so this is not a platform choice, it is a language-ergonomics
and safety choice on one platform. Kotlin's substantive differences are **null safety in the
type system**, **coroutines as a first-class concurrency model**, and a set of language features
(data classes, sealed types, extension functions, properties) that remove boilerplate Java
requires. Google made Kotlin the Android default in 2019 because those three things eliminate
whole bug classes and code volume in exactly the areas Android apps spend their time:
lifecycle-scoped async work, immutable UI state, and nullable platform APIs.

## 2. The differences that actually matter

### Null safety — compile time vs runtime

Java's type system does not distinguish "a String" from "a String or null." Every dereference is
a potential `NullPointerException` discovered in production. Kotlin encodes it in the type:

```kotlin
var a: String = "value"
a = null            // compile error

var b: String? = "value"
b = null            // fine
b.length            // compile error — must handle the null case
b?.length           // null-safe call, evaluates to Int?
```

This is the single largest practical difference. It converts a runtime crash class into a
compile error.

### Concurrency — threads/callbacks vs coroutines

Java on Android means `Thread`, `Executor`, `AsyncTask` (deprecated), or an `RxJava` dependency,
and async code that nests as it grows. Kotlin has `suspend` functions and structured concurrency
built into the language: async code reads sequentially, cancellation propagates automatically
down a scope tree, and `viewModelScope`/`lifecycleScope` tie that tree to an Android lifecycle so
work stops when the screen goes away.

```kotlin
// Sequential to read, concurrent and cancellable underneath.
viewModelScope.launch {
    val user = repository.loadUser(id)      // suspends, does not block the main thread
    _state.value = UiState.Loaded(user)
}                                            // cancelled automatically when the ViewModel clears
```

### Boilerplate — the visible half

| Job | Java | Kotlin |
|---|---|---|
| Value type with `equals`/`hashCode`/`toString`/copy | ~40 lines, or Lombok, or a record with limits | `data class User(val id: String, val name: String)` |
| Closed type hierarchy, exhaustively handled | enum + visitor, or `instanceof` chains with no exhaustiveness check | `sealed interface` + `when` the compiler checks for exhaustiveness |
| Add a method to a type you don't own | static utility class | extension function |
| Field with getter/setter | field + two methods | `var name: String` |
| Optional/named arguments | overload explosion or a builder | default and named parameters |

### Semantics that differ, and will catch you

- **`val`/`var` vs `final`.** Kotlin makes immutability the shorter word, so it becomes the
  default in practice. Java's `final` is longer than not writing it.
- **Classes and methods are final by default** in Kotlin; you opt into inheritance with `open`.
  Java is the reverse. This is a deliberate design choice, not an oversight.
- **Checked exceptions do not exist** in Kotlin. Java's `throws` is not enforced across the
  boundary — a Java method declaring `throws IOException` compiles fine in Kotlin without a
  `try`.
- **No primitives in the source language.** `Int` is written like an object; the compiler still
  emits a JVM primitive where it can. `Int?` cannot be a primitive, so it boxes.

## 3. Why prefer Kotlin for Android specifically

1. **It is the platform default.** Since 2019 Android is "Kotlin-first": new Jetpack libraries
   ship Kotlin APIs (and some, like Compose, are Kotlin-only by construction — `@Composable`
   requires the Kotlin compiler plugin). Choosing Java in 2026 means using the platform's newest
   surfaces through a worse or absent binding.
2. **Jetpack Compose is not available from Java.** If the UI layer is Compose — which is the
   recommended toolkit — the language decision is already made.
3. **Coroutines match Android's problem shape.** Almost all Android async work is
   lifecycle-scoped and cancellable. Structured concurrency models exactly that; threads and
   callbacks do not.
4. **Interop is complete and incremental.** Kotlin and Java compile together in one module. A
   Java codebase migrates file by file, with no rewrite and no bridging layer — which is why the
   migration cost argument against Kotlin is weaker than it looks.
5. **The JVM constraint is unchanged.** Same bytecode, same GC, same profiler. Kotlin costs no
   runtime performance to speak of, and a small (~1–2 MB before shrinking) stdlib in APK size.

## 4. What Kotlin does not fix

Being honest about this is what separates a real answer from a sales pitch.

- **Null safety stops at the Java boundary.** A value from unannotated Java arrives as a
  *platform type* (`String!`) that the compiler does not check at all — you get the Java failure
  mode back, silently — the worked example is in this domain's Mid/Android unit, *Kotlin type
  system, collections & OOP/SOLID in practice*.
- **Compile times are generally longer** than the equivalent Java, particularly with kapt/KSP
  annotation processing.
- **Coroutines are a new bug surface**, not the absence of one: leaked scopes, wrong dispatcher,
  swallowed cancellation. Different bugs, not zero bugs.
- **It changes nothing about architecture.** A badly layered app is badly layered in either
  language.

> [!TIP]
> **The interview trap** is answering with adjectives — "Kotlin is more modern, concise and
> safe." Name the mechanism instead: nullability in the type system, structured concurrency with
> lifecycle-scoped cancellation, compiler-checked exhaustive `when`. Then name a limitation
> unprompted; it is the strongest signal that you have actually shipped in both.

## Pitfalls & trade-offs

- **Claiming Kotlin "eliminates NPEs."** It eliminates them inside Kotlin-only code. Platform
  types at a Java or unannotated-library boundary are unchecked, and `!!` reintroduces the crash
  on purpose.
- **Writing Kotlin as Java with different syntax.** Nullable fields everywhere, `!!` to silence
  the compiler, no data classes, callbacks instead of `suspend` — this gets the migration cost
  without any of the benefit.
- **Treating the choice as reversible per file but not per team.** Interop makes mixed codebases
  easy, but a permanently half-migrated codebase pays both languages' tooling costs at once.
