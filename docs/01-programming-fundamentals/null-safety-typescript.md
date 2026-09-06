---
id: fundamentals-null-safety-typescript
title: Null Safety in TypeScript — strictNullChecks and the Network Boundary
description: How TypeScript's strictNullChecks encodes "this value might not exist" as a distinct type, why a bare fetch() response defeats it completely, and the team contract that keeps it honest.
tags: [null-safety, optionals, type-system, typescript, mid, senior, lead]
lang: en
status: complete
domain: 01-programming-fundamentals
platform: shared
band: X
level: Mid
sidebar_position: 1
topic: null-safety
leaf: TypeScript
prerequisites: []
outcomes:
  - "Explain the exact mechanism that turns a missing-value bug into a compile error in TypeScript"
  - "Find the fetch() network boundary where that mechanism stops being checked, before it causes an incident"
  - "State the team-level contract that keeps a nullable API boundary honest end to end"
resources:
  - title: "TypeScript strictNullChecks"
    url: "https://www.typescriptlang.org/tsconfig/#strictNullChecks"
    date: "2025-05-01"
---

# Null Safety in TypeScript — strictNullChecks and the Network Boundary

A missing value — no name entered yet, no network response yet, no cached record yet — is not a
bug. Treating it as if it can't happen is. TypeScript, with `strictNullChecks` on, makes "this
might be absent" part of the type itself, so the compiler forces you to handle it instead of
trusting yourself to remember. This article is that mechanism, plus the one thing every language
sharing this guide has in common: it is a **compile-time-only promise**, and TypeScript has a
boundary where that promise stops being checked completely.

The running example throughout: fetching a `UserProfile` (`id`, `displayName`, `avatarUrl`) from a
network call or a local cache, where `avatarUrl` genuinely may not exist.

## Mid {concept=null-safety/mechanism}

**Interview question: "How does TypeScript stop you from crashing on a missing value?"**

The honest answer names the mechanism, not an adjective. With `strictNullChecks` on, `string` and
`string | undefined` are different types — a missing check is a compile error:

```typescript
// TypeScript — with strictNullChecks on, string and string | undefined are different types.
function render(name: string | undefined): string {
  return `Hello, ${name ?? 'guest'}`;
}
const safeName = user.displayName?.trim() ?? 'guest';   // ?. short-circuits to undefined, not a throw
```

**Follow-up an interviewer asks next:** "What happens if you skip the check?" It compiles fine
*unless* `strictNullChecks` is on in `tsconfig.json` — a project running without it gets none of
this protection, silently, and every `string | undefined` collapses to a plain `string` the
compiler will happily let you dereference.

**Pitfall at this level:** treating the non-null assertion (`!`) or an `as T` cast as a permanent
fix rather than a claim you're making about the data — a claim that needs to stay true as the
code around it changes, and one the compiler stops checking entirely once you write it.

## Senior {concept=null-safety/boundary}

**Interview question: "Where does TypeScript's null safety actually break down?"**

At **the network edge** — `strictNullChecks` protects code *you wrote*; it says nothing about the
shape of a `fetch()` response:

```typescript
const data: UserProfile = await res.json();   // a lie the compiler is happy to believe
```

Nothing validates that the JSON actually matches the type. `res.json()` returns `any`, and
assigning `any` to a typed variable is accepted with zero runtime check — the type annotation is
a claim about the data, not evidence of it.

> [!IMPORTANT]
> The Senior-level insight: **compile-time null safety is a guarantee about code the compiler can
> see, not about the world**. Reading unfamiliar TypeScript for null-safety risk means finding
> every place data enters from outside that guarantee — every `fetch()` call, every `JSON.parse`,
> every `as T` cast — and checking whether anyone re-validated the assumption there.

**Follow-up:** "So how do you actually close that gap?" A runtime schema validator (`zod`, `io-ts`)
at the network boundary that actually inspects the parsed JSON against the expected shape, instead
of a bare type assertion — the validator throws or returns a typed error the moment the shape is
wrong, rather than letting a lie propagate silently into the rest of the app.

**Pitfall at this level:** writing `const data = (await res.json()) as UserProfile` and treating
the cast as validation — `as` performs no runtime check at all; it only silences the compiler.

## Lead {concept=null-safety/team-contract}

**Interview question: "How do you keep a nullable API contract honest across a whole team, not
just in the code you personally review?"**

Naming the mechanism, in order of strength: (1) a shared schema — OpenAPI, protobuf, or a
generated client — so the mobile model's nullability is generated from the same source of truth
the backend enforces, not retyped by hand and allowed to drift; (2) a contract test that fails CI
the day the backend actually starts/stops sending a field, rather than a mobile engineer finding
out from a crash report; (3) short of that, a lint rule banning a raw `as Type` cast on a network
response, requiring a runtime validator instead, so the boundary discipline above isn't optional
per-engineer.

This is the depth angle for null safety specifically — see the Tech Lead Roadmap article for how
"API contracts across a backend/mobile boundary" fits the wider breadth a Tech Lead needs beyond
this one topic.

## Cross-language comparison

See the cross-language cheat sheet article for how Kotlin, Java, Swift and Dart each answer the
same two questions — or switch the language tab above to read this same topic in another language
directly.

## Pitfalls & trade-offs

- **Mid:** treating a non-null assertion (`!`) or `as T` cast as a fix rather than a claim that
  must stay true as the code changes around it.
- **Mid → Senior:** believing `strictNullChecks` protects a codebase end to end without checking
  whether every network boundary validates its response shape at runtime.
- **Senior:** casting a `fetch()` response with `as UserProfile` and treating that as validation —
  it performs no runtime check at all.
- **Lead:** writing a nullability convention as a wiki page with no CI-blocking mechanism behind
  it — a rule nobody can enforce mechanically decays the first time someone is in a hurry.
