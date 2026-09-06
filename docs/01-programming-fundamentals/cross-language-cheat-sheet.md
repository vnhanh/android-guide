---
id: fundamentals-cross-language-cheat-sheet
title: Cross-Language Cheat Sheet — Programming Fundamentals
description: A pure quick-reference comparison table for every principle in this domain — Kotlin, Java, Swift, Dart, and TypeScript side by side, with no Mid/Senior/Lead split.
tags: [cheat-sheet, comparison, kotlin, java, swift, dart, typescript, reference]
lang: en
status: complete
domain: 01-programming-fundamentals
platform: shared
band: X
level: Mid
sidebar_position: 11
prerequisites: []
outcomes:
  - "Look up any of the ten principles in this domain and recall each language's answer in under 10 seconds, without re-reading the full article"
resources:
  - title: "Kotlin documentation"
    url: "https://kotlinlang.org/docs/home.html"
    date: "2025-03-01"
  - title: "The Swift Programming Language"
    url: "https://docs.swift.org/swift-book/"
    date: "2025-06-01"
---

# Cross-Language Cheat Sheet

This is the fast-reference companion to the ten principle articles in this domain. Read those
for the reasoning, the code, and the failure modes each design prevents — come back here when you
just need to jog your memory or do a quick cross-language lookup.

## Null safety

Whether "this might not have a value" is something the type system can see and enforce.

| | Kotlin | Java | Swift | Dart | TypeScript |
|---|---|---|---|---|---|
| Absence in the type | `String?` | opt-in `Optional<T>` | `String?` | `String?` (sound null safety) | `string or undefined` with strictNullChecks |
| Enforcement | compiler | none — advisory only | compiler | compiler (sound mode) | compiler, opt-in via strictNullChecks |
| Escape hatch | `!!` | none — Optional itself is the safety mechanism | `!` | `!` | `!` or `as T` |

## Value vs reference semantics

Whether assigning or passing a value copies it or shares one underlying instance.

| | Kotlin | Java | Swift | Dart | TypeScript |
|---|---|---|---|---|---|
| Default for user types | reference | reference | value, via struct | reference | reference |
| True value types | primitives only | primitives only | struct, enum, tuple | primitives | primitives only |
| Copy-on-write collections | no | no | yes | no | no |

## Data modeling — equality and copying

How much a language gives you for free when a type is defined mainly by the data it holds.

| | Kotlin | Java | Swift | Dart | TypeScript |
|---|---|---|---|---|---|
| Generated equality | data class | record (16+) | Equatable synthesis | hand-rolled, or the equatable package | none — write your own |
| Generated copy-with-change | copy() | none — hand-written | manual struct mutation | copyWith convention, often via freezed | object spread |

## Collections and functional operations

Whether chained operations like map and filter run immediately or only when the result is consumed.

| | Kotlin | Java | Swift | Dart | TypeScript |
|---|---|---|---|---|---|
| Default evaluation | eager | lazy — Stream | eager | lazy — Iterable | eager |
| Lazy opt-in | .asSequence() | N-A, already lazy | .lazy | N-A, already lazy | generators |

## Error handling

How a language distinguishes a bug or environment failure from an outcome the caller should plan for.

| | Kotlin | Java | Swift | Dart | TypeScript |
|---|---|---|---|---|---|
| Exceptional failure | unchecked exception | checked and unchecked | throws, try, catch | throw, try, catch | throw, try, catch |
| Expected-failure pattern | sealed Result | no strong convention | Result or sealed enum | sealed class (3.0+) | discriminated union |

## Generics and variance

How a generic type expresses "safe to widen" and what survives at runtime once generics are compiled away.

| | Kotlin | Java | Swift | Dart | TypeScript |
|---|---|---|---|---|---|
| Variance declaration | declaration-site out, in | use-site wildcards | protocols with associated types | declaration-site out, in — opt-in | declaration-site out, in (4.7+) |
| Runtime type info | erased, reified workaround | erased, no workaround | preserved via metatypes | partially preserved | fully erased |

## Pattern matching and sealed types

Whether a closed set of cases can be declared as closed, and whether the compiler checks you handled all of them.

| | Kotlin | Java | Swift | Dart | TypeScript |
|---|---|---|---|---|---|
| Closed-hierarchy keyword | sealed class or interface | sealed (17+) | enum with associated values | sealed class (3.0+) | none — convention only |
| Exhaustiveness enforcement | yes, when used as expression | yes (21+) | yes by default | yes | opt-in via assertNever |

## OOP and API design

The vocabulary for contracts between types, and how a call site expresses "these arguments, these defaults."

| | Kotlin | Java | Swift | Dart | TypeScript |
|---|---|---|---|---|---|
| Interface keyword | interface | interface | protocol | abstract class | interface |
| Named plus defaulted params | named args and defaults | no — needs Builder | labeled params and defaults | named params and defaults | object parameter with optional properties |

## Memory management

What reclaims memory, and how a language lets you deliberately break a reference to avoid a cycle or a leak.

| | Kotlin | Java | Swift | Dart | TypeScript |
|---|---|---|---|---|---|
| Memory model family | traced GC | traced GC | reference counting — ARC | traced GC | traced GC |
| Weak-reference escape hatch | WeakReference | WeakReference | weak, routine usage | WeakReference | WeakRef, WeakMap |

## Language idioms

The everyday moves that mark idiomatic code in each language.

| | Kotlin | Java | Swift | Dart | TypeScript |
|---|---|---|---|---|---|
| Extend a type you don't own | extension functions, safe | static utility class, no true extension | extensions, safe | extension methods, safe | prototype extension, discouraged |
| Fluent configure-and-return | scope functions | Builder pattern | method chaining | cascade operator .. | method chaining |

Each row here is argued for, with code and the failure mode it prevents, in this domain's ten
principle articles — this page is memorization, not persuasion.
