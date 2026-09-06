---
id: fundamentals-null-safety-dart
title: Null Safety in Dart — Sound, Except at the Interop Edge
description: How Dart's sound null safety enforces "this value might not exist" by the compiler, not just the analyzer, where the unsound interop edge breaks that guarantee, and the team contract that keeps it honest.
tags: [null-safety, optionals, type-system, dart, mid, senior, lead]
lang: en
status: complete
domain: 01-programming-fundamentals
platform: shared
band: X
level: Mid
sidebar_position: 1
topic: null-safety
leaf: Dart
prerequisites: []
outcomes:
  - "Explain the exact mechanism that turns a missing-value bug into a compile error in Dart"
  - "Find the unsound-interop boundary where that mechanism stops being checked, before it causes an incident"
  - "State the team-level contract that keeps a nullable API boundary honest end to end"
resources:
  - title: "Sound null safety — Dart documentation"
    url: "https://dart.dev/null-safety"
    date: "2025-04-01"
---

# Null Safety in Dart — Sound, Except at the Interop Edge

A missing value — no name entered yet, no network response yet, no cached record yet — is not a
bug. Treating it as if it can't happen is. Dart makes "this might be absent" part of the type
itself, so the compiler forces you to handle it instead of trusting yourself to remember. This
article is that mechanism, plus the one thing every language sharing this guide has in common: it
is a **compile-time-only promise**, and Dart has a boundary where that promise stops being
checked.

The running example throughout: fetching a `UserProfile` (`id`, `displayName`, `avatarUrl`) from a
network call or a local cache, where `avatarUrl` genuinely may not exist.

## Mid {concept=null-safety/mechanism}

**Interview question: "How does Dart stop you from crashing on a missing value?"**

The honest answer names the mechanism, not an adjective. Dart's **sound** null safety encodes
absence directly in the type — `String` and `String?` are different types, enforced by the
compiler itself, not just the analyzer:

```dart
// Dart — sound null safety: String vs String?, enforced by the compiler, not just the analyzer.
String render(String? name) => 'Hello, ${name ?? "guest"}';
final String safeName = user.displayName ?? 'guest';
```

**Follow-up an interviewer asks next:** "What happens if you skip the check?" In a fully migrated,
sound codebase, it refuses to compile — "sound" specifically means the guarantee holds all the way
through the compiled binary, not just during static analysis.

**Pitfall at this level:** treating the null-assertion operator (`!`) as a permanent fix rather
than a claim you're making about the data — a claim that needs to stay true as the code around it
changes.

## Senior {concept=null-safety/boundary}

**Interview question: "Where does Dart's null safety actually break down?"**

At **Dart's unsound interop edge.** Sound null safety holds everywhere *within* a fully migrated,
sound codebase — but a `dynamic` value from a platform channel, `json_serializable` output without
codegen validation, or an un-migrated legacy package can still hand you a null where the type says
there isn't one; it surfaces as a runtime type error, not a compile error:

```dart
// A platform channel result arrives as `dynamic` — the type system has no visibility here.
final dynamic result = await platform.invokeMethod('getDisplayName');
final String name = result as String;   // runtime type error if the native side actually returned null
```

> [!IMPORTANT]
> The Senior-level insight: **compile-time null safety is a guarantee about code the compiler can
> see, not about the world**. Reading unfamiliar Dart for null-safety risk means finding every
> place data enters from outside that guarantee — a platform channel, an un-migrated legacy
> package, JSON decoded into `dynamic` before being cast — and checking whether anyone
> re-validated the assumption there.

**Follow-up:** "So how do you actually close that gap?" Validate and cast a platform-channel or
`dynamic` value immediately at the boundary, with an explicit null check before the cast rather
than a bare `as String`, so the crash (if the assumption is wrong) happens at the boundary with a
clear cause, not three call frames later as a confusing type error.

**Pitfall at this level:** casting a `dynamic` platform-channel result directly to a non-nullable
type without an explicit null check first — the runtime type error this produces gives no hint
that the actual cause was a null value, not a type mismatch.

## Lead {concept=null-safety/team-contract}

**Interview question: "How do you keep a nullable API contract honest across a whole team, not
just in the code you personally review?"**

Naming the mechanism, in order of strength: (1) a shared schema — OpenAPI, protobuf, or a
generated client — so the mobile model's nullability is generated from the same source of truth
the backend enforces, not retyped by hand and allowed to drift; (2) a contract test that fails CI
the day the backend actually starts/stops sending a field, rather than a mobile engineer finding
out from a crash report; (3) short of that, a lint rule banning a bare `as Type` cast on a
`dynamic` value from a platform channel or unvalidated JSON, so the boundary discipline above
isn't optional per-engineer.

This is the depth angle for null safety specifically — see the Tech Lead Roadmap article for how
"API contracts across a backend/mobile boundary" fits the wider breadth a Tech Lead needs beyond
this one topic.

## Cross-language comparison

See the cross-language cheat sheet article for how Kotlin, Java, Swift and TypeScript each answer
the same two questions — or switch the language tab above to read this same topic in another
language directly.

## Pitfalls & trade-offs

- **Mid:** treating the null-assertion operator (`!`) as a fix rather than a claim that must stay
  true as the code changes around it.
- **Mid → Senior:** believing "Dart's sound null safety means no null bugs anywhere" without
  having checked the interop edge — platform channels and un-migrated packages sit outside
  soundness entirely.
- **Senior:** casting a `dynamic` platform-channel value straight to a non-nullable type without
  an explicit null check first.
- **Lead:** writing a nullability convention as a wiki page with no CI-blocking mechanism behind
  it — a rule nobody can enforce mechanically decays the first time someone is in a hurry.
