---
id: fundamentals-error-handling-typescript
title: Error Handling in TypeScript — Throw Anything, Promise Rejection as a Separate Channel
description: Why TypeScript's type signatures never declare what a function might throw, the discriminated-union Result convention, and the Promise-rejection channel that trips up beginners.
tags: [error-handling, exceptions, result-type, typescript, mid, senior, lead]
lang: en
status: complete
domain: 01-programming-fundamentals
platform: shared
band: X
level: Mid
sidebar_position: 5
topic: error-handling
leaf: TypeScript
prerequisites: []
outcomes:
  - "Name the mechanism (or lack of one) that governs whether a TypeScript caller handles a failure"
  - "Explain the difference between a synchronous throw and a Promise rejection, and why conflating them is the most common beginner mistake"
resources:
  - title: "Error handling — MDN"
    url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Control_flow_and_error_handling"
    date: "2025-05-01"
---

# Error Handling in TypeScript — Throw Anything, Promise Rejection as a Separate Channel

Every operation that touches the network, a file, or user input can fail, and every language gives
you two fundamentally different ways to say so. One is a fire alarm: it interrupts whatever you
were doing and you cannot walk past it pretending you didn't hear it — that's an exception.
TypeScript's type system says nothing about which alarms exist at all, and adds a second, separate
alarm system for async code.

## Mid {concept=error-handling/checked-vs-unchecked}

**Interview question: "When does TypeScript force you to handle a failure, and when can you ignore
it?"**

**TypeScript/JavaScript uses `try`/`catch`/`throw`, with "throw anything" freedom** — and no
compiler-level obligation to catch. Nothing in a function's type signature declares what it might
throw; that information lives only in documentation, if anywhere.

```typescript
function parseAge(input: string): number {
  const age = Number(input);
  if (Number.isNaN(age)) throw new Error(`not a number: ${input}`);
  return age;
}
```

**Follow-up an interviewer asks next:** "What's the actual risk of 'anything can be thrown'?"
`throw "oops"` and `throw 42` are both legal — the thrown value isn't required to be an `Error`
instance, so a `catch` block that assumes `err.message` exists can itself throw on a value that
never had one.

**Pitfall at this level:** writing a `catch` block that assumes the caught value is an `Error`
instance — TypeScript's type system gives `catch (err: unknown)` by default in strict mode
specifically because it can't guarantee that.

## Senior {concept=error-handling/expected-failure}

**Interview question: "When do you reach for a typed Result instead of throwing, and what's the
Promise-rejection gotcha?"**

**TypeScript has no built-in Result type**, but the idiomatic hand-rolled equivalent is a
discriminated union — the same case-per-outcome shape Kotlin, Swift and Dart converge on, this time
distinguished by a literal `ok` field instead of a class hierarchy:

```typescript
type FetchResult<T> =
  | { ok: true; value: T }
  | { ok: false; reason: "not-found"; id: string }
  | { ok: false; reason: "network-error"; cause: unknown };
```

**TypeScript/JavaScript also has a failure channel none of the other languages in this guide have
in quite this shape: Promise rejection.** An `async` function's failure travels through `.catch()`
or a `try/catch` wrapped around `await` — genuinely separate from a synchronous `throw`, and the
single most common place beginners get tripped up, because an unhandled rejection does not surface
the same way an uncaught synchronous throw does.

```typescript
fetch("/api/user").catch((err) => console.error("request failed:", err));
// vs
try {
  await fetch("/api/user");
} catch (err) {
  console.error("request failed:", err);
}
```

**Follow-up:** "So why does TypeScript, unlike Kotlin's `when` or Dart's `switch`, never enforce
exhaustiveness over a discriminated union?" It can, actually — a `switch` with no `default` case
combined with a `never`-typed exhaustiveness check at the end catches a missed case at compile
time; it's opt-in syntax rather than automatic, which is the real gap compared to Kotlin/Dart's
native sealed-type exhaustiveness.

**Pitfall at this level:** conflating a synchronous `throw` with a Promise rejection — a `try/catch`
around the wrong part of the code silently misses one or the other, and an unhandled Promise
rejection can crash a Node process or fail silently in the browser depending on the runtime.

## Lead {concept=error-handling/team-contract}

**Interview question: "How do you decide, as a team, which failures are exceptions and which are
Result cases — and how do you make sure nobody silently swallows one?"**

Naming the mechanism, in order: (1) a written convention — for example, "network and parse
failures the user can act on (retry, fix input, see a message) are Result cases; programmer errors
and truly unrecoverable states (a violated invariant, an impossible branch) are exceptions" — so
the choice isn't re-litigated per pull request; (2) a lint rule — ESLint's `no-empty` for empty
`catch` blocks, plus a rule requiring every Promise to have a `.catch()` or be awaited inside a
`try` — so "swallowed or rethrown with no context" stops being a matter of individual discipline;
(3) tying this to observability: a swallowed exception, or an unhandled Promise rejection, is
invisible to crash/error reporting, which is the actual reason it's dangerous rather than merely
untidy — the failure still happened, but nothing downstream ever finds out.

This is the depth angle for error handling specifically — see the Tech Lead Roadmap article for
how this connects to the wider breadth a Tech Lead needs.

## Cross-language comparison

See the cross-language cheat sheet article for how Kotlin, Java, Swift and Dart each answer the
same two questions — or switch the language tab above to read this same topic in another language
directly.

## Pitfalls & trade-offs

- **Mid:** writing a `catch` block that assumes the thrown value is an `Error` instance — anything
  can be thrown in JS/TS.
- **Senior:** conflating a synchronous `throw` with a Promise rejection — a `try/catch` around the
  wrong part of the code silently misses one or the other.
- **Lead:** a "which failures are exceptions vs Result cases" convention that lives only as a wiki
  page, with no lint rule enforcing the empty-catch/unhandled-rejection ban mechanically.
