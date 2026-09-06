---
id: fundamentals-pattern-matching-typescript
title: Pattern Matching in TypeScript — Discriminated Unions & the assertNever Idiom
description: How a discriminated union stands in for a sealed type in TypeScript, and the assertNever idiom that's the only way to get exhaustiveness checking without a dedicated keyword.
tags: [pattern-matching, sealed-types, exhaustiveness, typescript, mid, senior]
lang: en
status: complete
domain: 01-programming-fundamentals
platform: shared
band: X
level: Mid
sidebar_position: 7
topic: pattern-matching
leaf: TypeScript
prerequisites: []
outcomes:
  - "Model a closed set of UI states as a discriminated union"
  - "Use the assertNever idiom to get compile-time exhaustiveness checking with no dedicated keyword"
resources:
  - title: "Narrowing — TypeScript Handbook"
    url: "https://www.typescriptlang.org/docs/handbook/2/narrowing.html"
    date: "2025-05-01"
---

# Pattern Matching in TypeScript — Discriminated Unions & the assertNever Idiom

A multiple-choice question with exactly four options can be graded by a machine: check each box,
confirm one is filled, done. TypeScript has no dedicated closed-hierarchy keyword at all — the idea
survives here only as a well-known convention.

## Mid {concept=pattern-matching/exhaustive-match}

**Interview question: "How do you model 'this can be exactly one of N things' in TypeScript?"**

A discriminated union: several object shapes sharing a literal-typed `kind` field.

```typescript
type UiState<T> =
  | { kind: 'loading' }
  | { kind: 'empty' }
  | { kind: 'error'; message: string }
  | { kind: 'content'; data: T[] };

function describe<T>(state: UiState<T>): string {
  switch (state.kind) {
    case 'loading': return 'Loading…';
    case 'empty': return 'Nothing here yet';
    case 'error': return `Error: ${state.message}`;
    case 'content': return `Showing ${state.data.length} items`;
  }
}
```

**Follow-up an interviewer asks next:** "Is this actually closed, the way Kotlin's sealed type or
Swift's enum is?" No — nothing in the language stops another file from producing a value that
satisfies the type loosely without going through the intended constructors; "closed" here is a
convention the team agrees to follow, not something the compiler enforces at the type's boundary.

**Pitfall at this level:** treating a discriminated union as closed just because it looks that way —
a plain object literal built anywhere in the codebase, matching the shape loosely (e.g. missing the
`kind` discriminant's exact literal), can satisfy the type in ways the "closed set of constructors"
mental model doesn't account for.

## Senior {concept=pattern-matching/library-boundary}

**Interview question: "How do you get compile-time exhaustiveness checking with no dedicated
keyword for it?"**

**`assertNever`, an opt-in idiom, not a keyword.** Exhaustiveness checking exists, but only if you
opt in with a well-known pattern: a function typed to accept `never`, called from the `switch`'s
`default` branch. It only type-checks if every real case was already handled — add a new variant
to the union without adding a matching case, and the `default` branch's argument is no longer
`never`, so the build fails.

```typescript
function assertNever(x: never): never {
  throw new Error(`Unhandled case: ${JSON.stringify(x)}`);
}

function describe(state: UiState<Item>): string {
  switch (state.kind) {
    case 'loading': return 'Loading…';
    case 'empty': return 'Nothing here yet';
    case 'error': return `Error: ${state.message}`;
    case 'content': return `Showing ${state.data.length} items`;
    default: return assertNever(state); // fails to compile if a case was missed above
  }
}
```

> [!IMPORTANT]
> "Closed hierarchy + exhaustive matching" is one of the most-copied ideas in modern language
> design. TypeScript's version — real, but a convention rather than a keyword — shows the idea
> spreading even into a language that can't enforce closedness at the type's boundary itself. A
> team not using `assertNever` on its discriminated unions is choosing not to use a mechanism the
> language actually supports, even without a dedicated keyword.

**Follow-up:** "So what's the actual risk of skipping `assertNever`?" A new variant lands in the
union, and every `switch` over it that lacks the `assertNever` pattern silently falls through the
`default` (or has no `default` at all and does nothing) — the compiler gives you zero signal,
unlike every other language in this guide once you've opted into the idiom.

**Pitfall at this level:** writing a `switch` over a discriminated union with a `default` branch
that does something generic (returns a fallback string, logs a warning) instead of calling
`assertNever` — the generic default silences the exact signal exhaustiveness checking exists to
give you.

## Cross-language comparison

See the cross-language cheat sheet article for how Kotlin, Java, Swift and Dart each answer the
same two questions — or switch the language tab above to read this same topic in another language
directly.

## Pitfalls & trade-offs

- **Mid:** treating a discriminated union as closed just because it looks that way — nothing in the
  language stops a loosely-shaped value from satisfying the type without going through the intended
  constructors.
- **Senior:** writing a `switch`'s `default` branch to do something generic instead of calling
  `assertNever` — this silences the one signal TypeScript gives you for a missed case.
