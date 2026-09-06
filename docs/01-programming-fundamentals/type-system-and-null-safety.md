---
id: fundamentals-type-system-and-null-safety
title: Type Systems & Null Safety, Across Five Languages
description: How Kotlin, Java, Swift, Dart and TypeScript each represent "this value might not exist" — and the one place every one of them breaks down, framed as interview prep.
tags: [null-safety, optionals, type-system, kotlin, java, swift, dart, typescript, mid, senior, lead]
lang: en
status: complete
domain: 01-programming-fundamentals
platform: shared
band: X
level: Mid
sidebar_position: 1
prerequisites: []
outcomes:
  - "Explain, per language, the exact mechanism that turns a missing-value bug from a runtime crash into a compile error"
  - "Find the specific boundary in a codebase where that mechanism stops being checked, before it causes an incident"
  - "State the team-level contract that keeps a nullable API boundary honest end to end"
resources:
  - title: "Null safety — Kotlin documentation"
    url: "https://kotlinlang.org/docs/null-safety.html"
    date: "2025-03-01"
  - title: "Optional chaining — The Swift Programming Language"
    url: "https://docs.swift.org/swift-book/documentation/the-swift-programming-language/optionalchaining/"
    date: "2025-06-01"
  - title: "Sound null safety — Dart documentation"
    url: "https://dart.dev/null-safety"
    date: "2025-04-01"
  - title: "TypeScript strictNullChecks"
    url: "https://www.typescriptlang.org/tsconfig/#strictNullChecks"
    date: "2025-05-01"
---

# Type Systems & Null Safety, Across Five Languages

A missing value — no name entered yet, no network response yet, no cached record yet — is not a
bug. Treating it as if it can't happen is. Every language in this guide gives you a way to make
"this might be absent" part of the type itself, so the compiler forces you to handle it instead of
trusting yourself to remember. This article is that mechanism, per language, plus the one thing
every version of it has in common: it is a **compile-time-only promise**, and every language has a
boundary where that promise stops being checked.

The running example throughout: fetching a `UserProfile` (`id`, `displayName`, `avatarUrl`) from a
network call or a local cache, where `avatarUrl` genuinely may not exist.

## Mid

**Interview question: "How does the language stop you from crashing on a missing value?"**

The honest answer names the mechanism, not an adjective. Each language below encodes absence
directly in the type, so a missing check is a compile error, not a 2am page.

```kotlin
// Kotlin — nullability is part of the type: String vs String?
fun render(name: String) = "Hello, $name"          // can never be null — enforced at the call site
fun render(name: String?) = "Hello, ${name ?: "guest"}"  // must handle the null case
```

```java
// Java — nothing in the type says a value can be absent. @Nullable is a hint, not a check;
// Optional<T> is the closest the language gets to Kotlin/Swift's guarantee, but only if you use it.
Optional<String> displayName = Optional.ofNullable(profile.getDisplayName());
String greeting = "Hello, " + displayName.orElse("guest");
```

```swift
// Swift — Optional<T> (T?) is a real, distinct type. Force-unwrap (!) asserts certainty;
// wrong once and it's a crash, not a bug report.
func render(name: String?) -> String { "Hello, \(name ?? "guest")" }
guard let name = user.displayName else { return }   // unwrap-or-exit; `name` is String from here on
```

```dart
// Dart — sound null safety: String vs String?, enforced by the compiler, not just the analyzer.
String render(String? name) => 'Hello, ${name ?? "guest"}';
final String safeName = user.displayName ?? 'guest';
```

```typescript
// TypeScript — with strictNullChecks on, string and string | undefined are different types.
function render(name: string | undefined): string {
  return `Hello, ${name ?? 'guest'}`;
}
const safeName = user.displayName?.trim() ?? 'guest';   // ?. short-circuits to undefined, not a throw
```

**Follow-up an interviewer asks next:** "What happens if you skip the check?" Kotlin, Swift and
Dart (in sound mode) refuse to compile. Java compiles fine and throws `NullPointerException` at
the first dereference — `@Nullable` is documentation, not enforcement. TypeScript compiles fine
*unless* `strictNullChecks` is on in `tsconfig.json` — a project running without it gets none of
this, silently.

**Pitfall at this level:** treating `Optional<T>` (Java), `!` (Swift), or a non-null assertion
(`!!` in Kotlin, `!` in Dart) as a permanent fix rather than a claim you're making about the data —
a claim that needs to stay true as the code around it changes.

## Senior

**Interview question: "Where does null safety actually break down?"**

At a **boundary the type checker didn't see through** — every language has one, and "this
language never has null bugs" is the wrong answer in every single case.

**Kotlin at a Java (or unannotated-library) boundary.** A value from Java arrives as a *platform
type*, written `String!` in tooling, which is not checked at all:

```kotlin
// JAVA: public String getDisplayName(int userId) { ... } // may return null, unannotated
val name: String = legacyApi.getDisplayName(userId)   // COMPILES — can NPE at runtime anyway
```

The defensive idiom: re-assert the real nullability immediately, rather than trust the platform
type — `val name: String? = legacyApi.getDisplayName(userId)`.

**Swift decoding JSON.** `Codable` will happily decode a field as non-optional if your model says
so — and crash the decode (not a graceful failure, a thrown error you must have anticipated) the
first time the backend actually omits it. The type system only protects you once the shape is
declared correctly.

**Dart's unsound interop edge.** Sound null safety holds everywhere *within* a fully migrated,
sound codebase — but a `dynamic` value from a platform channel, `json_serializable` without
codegen validation, or an un-migrated legacy package can still hand you a null where the type says
there isn't one; it surfaces as a runtime type error, not a compile error.

**TypeScript at the network edge.** `strictNullChecks` protects code *you wrote* — it says
nothing about the shape of a `fetch()` response. `const data: UserProfile = await res.json()` is a
lie the compiler is happy to believe; nothing validates the JSON actually matches the type.

> [!IMPORTANT]
> The Senior-level insight is the same shape in all five languages: **compile-time null safety is
> a guarantee about code the compiler can see, not about the world**. Reading unfamiliar code for
> null-safety risk means finding every place data enters from outside that guarantee — an
> unannotated dependency, a JSON payload, a platform channel, a `fetch()` call — and checking
> whether anyone re-validated the assumption there.

**Follow-up:** "So how do you actually close that gap?" Runtime validation at the boundary —
`Optional.ofNullable` at the Java call site re-declared honestly, a `Codable` model with truly
optional fields matching the backend's actual contract, a runtime schema validator (`zod`, `io-ts`)
at the TypeScript network boundary instead of a bare type assertion.

## Lead

**Interview question: "How do you keep a nullable API contract honest across a whole team, not
just in the code you personally review?"**

Naming the mechanism, in order of strength: (1) a shared schema — OpenAPI, protobuf, or a
generated client — so the mobile model's nullability is generated from the same source of truth
the backend enforces, not retyped by hand and allowed to drift; (2) a contract test that fails CI
the day the backend actually starts/stops sending a field, rather than a mobile engineer finding
out from a crash report; (3) short of that, a lint rule banning an un-re-asserted platform type
(Kotlin `detekt`) or a raw `as Type` cast on network response (TypeScript), so the boundary
discipline above isn't optional per-engineer.

This is the depth angle for null safety specifically — see the Tech Lead Roadmap article for how
"API contracts across a backend/mobile boundary" fits the wider breadth a Tech Lead needs beyond
this one topic.

## Cross-language comparison table

| | Kotlin | Java | Swift | Dart | TypeScript |
|---|---|---|---|---|---|
| Absence in the type | `String?` | not encoded (`Optional<T>` opt-in) | `Optional<T>` / `String?` | `String?` | `string` or `undefined` (needs `strictNullChecks`) |
| Enforcement | compiler | none — advisory only | compiler | compiler (sound mode) | compiler, opt-in per project |
| "I'm sure" escape hatch | `!!` | (implicit — no safety to escape) | `!` (force unwrap) | `!` (null assertion) | `!` (non-null assertion), `as T` |
| Where it silently stops | Java/unannotated boundary (`String!`) | always | force-unwrapped decode of untrusted JSON | `dynamic`/unmigrated interop | any un-validated `fetch()`/`any` |

## Pitfalls & trade-offs

- **Mid:** treating the unwrap operator (`!!`, `!`) as a fix rather than a claim that must stay
  true as the code changes around it.
- **Mid → Senior:** believing "this language doesn't have null bugs" without having checked its
  specific boundary — every language in this table has exactly one.
- **Senior:** re-declaring a platform type's real nullability once, at the boundary, and then
  trusting the compiler for everything downstream — correct, but only if that boundary is the
  *only* place data enters from outside the type system.
- **Lead:** writing a nullability convention as a wiki page with no CI-blocking mechanism behind
  it — the same failure mode this domain's idiom-standard article (see the OOP & SOLID and
  Language Idioms articles) names generally: a rule nobody can enforce mechanically decays the
  first time someone is in a hurry.
