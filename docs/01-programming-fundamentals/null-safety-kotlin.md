---
id: fundamentals-null-safety-kotlin
title: Null Safety in Kotlin — Nullability as Part of the Type
description: How Kotlin encodes "this value might not exist" directly in the type system, the platform-type boundary where that guarantee stops being checked, and the team contract that keeps it honest.
tags: [null-safety, optionals, type-system, kotlin, mid, senior, lead]
lang: en
status: complete
domain: 01-programming-fundamentals
platform: shared
band: X
level: Mid
sidebar_position: 1
topic: null-safety
leaf: Kotlin
prerequisites: []
outcomes:
  - "Explain the exact mechanism that turns a missing-value bug into a compile error in Kotlin"
  - "Find the platform-type boundary where that mechanism stops being checked, before it causes an incident"
  - "State the team-level contract that keeps a nullable API boundary honest end to end"
resources:
  - title: "Null safety — Kotlin documentation"
    url: "https://kotlinlang.org/docs/null-safety.html"
    date: "2025-03-01"
---

# Null Safety in Kotlin — Nullability as Part of the Type

A missing value — no name entered yet, no network response yet, no cached record yet — is not a
bug. Treating it as if it can't happen is. Kotlin makes "this might be absent" part of the type
itself, so the compiler forces you to handle it instead of trusting yourself to remember. This
article is that mechanism, plus the one thing every language sharing this guide has in common: it
is a **compile-time-only promise**, and Kotlin has a boundary where that promise stops being
checked.

The running example throughout: fetching a `UserProfile` (`id`, `displayName`, `avatarUrl`) from a
network call or a local cache, where `avatarUrl` genuinely may not exist.

## Mid {concept=null-safety/mechanism}

**Interview question: "How does Kotlin stop you from crashing on a missing value?"**

The honest answer names the mechanism, not an adjective. Nullability is part of the type:
`String` and `String?` are different types, so a missing check is a compile error, not a 2am page.

```kotlin
// Kotlin — nullability is part of the type: String vs String?
fun render(name: String) = "Hello, $name"          // can never be null — enforced at the call site
fun render(name: String?) = "Hello, ${name ?: "guest"}"  // must handle the null case
```

**Follow-up an interviewer asks next:** "What happens if you skip the check?" Kotlin refuses to
compile — there is no code path that reaches a dereference of a `String?` without either a null
check, an `?:` (elvis) fallback, or an explicit (and auditable) `!!` assertion.

**Pitfall at this level:** treating `!!` as a permanent fix rather than a claim you're making
about the data — a claim that needs to stay true as the code around it changes. Every `!!` is a
place worth asking "why am I so sure this can't be null here?" and writing that reason down.

## Senior {concept=null-safety/boundary}

**Interview question: "Where does Kotlin's null safety actually break down?"**

At a **boundary the type checker didn't see through** — specifically, a Java (or unannotated
library) boundary. A value from Java arrives as a *platform type*, written `String!` in tooling,
which is not checked at all:

```kotlin
// JAVA: public String getDisplayName(int userId) { ... } // may return null, unannotated
val name: String = legacyApi.getDisplayName(userId)   // COMPILES — can NPE at runtime anyway
```

The defensive idiom: re-assert the real nullability immediately, rather than trust the platform
type — `val name: String? = legacyApi.getDisplayName(userId)`. Once re-declared, the compiler
enforces the honest type for everything downstream of that line.

> [!IMPORTANT]
> The Senior-level insight: **compile-time null safety is a guarantee about code the compiler can
> see, not about the world**. Reading unfamiliar Kotlin for null-safety risk means finding every
> place data enters from outside that guarantee — an unannotated Java dependency, a JSON payload
> deserialized without validation, a JNI/platform-channel boundary — and checking whether anyone
> re-validated the assumption there.

**Follow-up:** "So how do you actually close that gap?" Re-declare the platform type's real
nullability once, at the boundary — `Optional`-style wrapping if the Java API already returns one,
or a `?`-typed re-assertion if it doesn't — so the honest type, not the erased platform type,
is what everything downstream of that call actually sees.

**Pitfall at this level:** re-declaring a platform type's real nullability once, at the boundary,
and then trusting the compiler for everything downstream — correct, but only if that boundary is
the *only* place data enters from outside the type system. A second unannotated dependency, or a
reflection-based framework, reopens the same hole silently.

## Lead {concept=null-safety/team-contract}

**Interview question: "How do you keep a nullable API contract honest across a whole team, not
just in the code you personally review?"**

Naming the mechanism, in order of strength: (1) a shared schema — OpenAPI, protobuf, or a
generated client — so the mobile model's nullability is generated from the same source of truth
the backend enforces, not retyped by hand and allowed to drift; (2) a contract test that fails CI
the day the backend actually starts/stops sending a field, rather than a mobile engineer finding
out from a crash report; (3) short of that, a lint rule (Kotlin `detekt`) banning an
un-re-asserted platform type at a Java boundary, so the boundary discipline above isn't optional
per-engineer.

This is the depth angle for null safety specifically — see the Tech Lead Roadmap article for how
"API contracts across a backend/mobile boundary" fits the wider breadth a Tech Lead needs beyond
this one topic.

## Cross-language comparison

See the cross-language cheat sheet article for how Java, Swift, Dart and TypeScript each answer
the same two questions — or switch the language tab above to read this same topic in another
language directly.

## Pitfalls & trade-offs

- **Mid:** treating `!!` as a fix rather than a claim that must stay true as the code changes
  around it.
- **Mid → Senior:** believing "Kotlin doesn't have null bugs" without having checked the
  unannotated-Java-boundary case — every codebase mixing Kotlin and Java has one.
- **Senior:** re-declaring a platform type's real nullability once, at the boundary, and then
  trusting the compiler for everything downstream — correct only if that boundary is the *only*
  place data enters from outside the type system.
- **Lead:** writing a nullability convention as a wiki page with no CI-blocking mechanism behind
  it — a rule nobody can enforce mechanically decays the first time someone is in a hurry.
