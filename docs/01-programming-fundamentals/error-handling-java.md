---
id: fundamentals-error-handling-java
title: Error Handling in Java — Checked Exceptions & Why They Get Misused at Scale
description: Java's compiler-enforced checked exceptions, why they historically decay into empty catches or pushed-up throws declarations, and the team contract that keeps failures from being silently swallowed.
tags: [error-handling, exceptions, result-type, java, mid, senior, lead]
lang: en
status: complete
domain: 01-programming-fundamentals
platform: shared
band: X
level: Mid
sidebar_position: 5
topic: error-handling
leaf: Java
prerequisites: []
outcomes:
  - "Name the mechanism that forces a Java caller to handle a checked failure vs an unchecked one"
  - "Explain why checked exceptions tend to decay into empty catches or pushed-up throws at scale"
resources:
  - title: "Exceptions (The Java Tutorials)"
    url: "https://docs.oracle.com/javase/tutorial/essential/exceptions/"
    date: "2025-02-01"
---

# Error Handling in Java — Checked Exceptions & Why They Get Misused at Scale

Every operation that touches the network, a file, or user input can fail, and every language gives
you two fundamentally different ways to say so. One is a fire alarm: it interrupts whatever you
were doing and you cannot walk past it pretending you didn't hear it — that's an exception. Java is
the only language in this guide with a compiler-enforced version of that fire alarm.

## Mid {concept=error-handling/checked-vs-unchecked}

**Interview question: "When does Java force you to handle a failure, and when can you ignore
it?"**

**Java's checked exceptions are the single most Java-specific mechanism in this whole topic.** A
method declaring `throws IOException` forces every caller, at every call site, to either catch it
or declare it themselves — enforced by the compiler, not a convention.

```java
// The compiler will not let this compile without a catch or a `throws IOException` on readConfig.
void readConfig() throws IOException {
    Files.readString(Path.of("config.json"));
}
```

Unchecked exceptions (`RuntimeException` and its subclasses, like `NullPointerException`) carry no
such obligation — they can propagate silently, with no compiler involvement at all.

**Follow-up an interviewer asks next:** "So what happens to a checked exception in practice?" The
widely-held opinion — and the reason Kotlin's own designers left checked exceptions out of Kotlin
entirely — is that at scale they get handled exactly one of two ways, neither of which is what the
mechanism intended: an empty `catch` block that swallows the error and pretends nothing happened,
or a `throws` declaration added purely to satisfy the compiler and pushed up the call stack until
some far-away caller inherits an obligation it has no context to act on.

**Pitfall at this level:** treating a checked `throws` declaration on a method as proof the caller
actually handles the failure meaningfully — it only proves the compiler is satisfied; the actual
handling could still be an empty `catch` block.

## Senior {concept=error-handling/expected-failure}

**Interview question: "When do you reach for a typed Result instead of throwing, in Java?"**

Throwing is right for the same-flow case: call it, handle it, move on. A typed Result earns its
place when a failure is *expected* — not exceptional — and the caller needs to store it, compare
it, or handle it later than the call site.

Java has **no strong built-in convention here** — unlike Kotlin's sealed interface, Swift's enum,
or Dart's sealed class, Java historically has neither a language-level Result type nor
compiler-enforced exhaustiveness over one. The idiomatic options are a hand-rolled sealed hierarchy
using Java's `sealed` classes/interfaces (Java 17+) with pattern-matching `switch` (Java 21+), or
falling back to checked exceptions for the same purpose — which reintroduces the decay problem from
the Mid section.

```java
// Java 17+ sealed interface, pattern-matched with a Java 21+ switch expression
sealed interface FetchResult<T> permits Success, NotFound, NetworkError {}
record Success<T>(T value) implements FetchResult<T> {}
record NotFound<T>(String id) implements FetchResult<T> {}
record NetworkError<T>(Throwable cause) implements FetchResult<T> {}
```

**Follow-up:** "So four other languages (Kotlin, Swift, Dart, TypeScript) all land on roughly the
same Result shape — why did Java historically lag here?" Sealed types and pattern-matching `switch`
only landed in mainstream Java relatively recently (17 and 21 respectively); a lot of existing Java
code still relies on checked exceptions or ad-hoc nullable returns for exactly the case a sealed
Result would model better.

**Pitfall at this level:** reaching for a checked exception to model an expected, named failure
mode (like "not found" vs "network error") instead of a sealed hierarchy — checked exceptions carry
the decay risk from the Mid section; a sealed Result forces exhaustive `switch` handling with no
such escape hatch.

## Lead {concept=error-handling/team-contract}

**Interview question: "How do you decide, as a team, which failures are exceptions and which are
Result cases — and how do you make sure nobody silently swallows one?"**

Naming the mechanism, in order: (1) a written convention — for example, "network and parse
failures the user can act on (retry, fix input, see a message) are Result cases; programmer errors
and truly unrecoverable states (a violated invariant, an impossible branch) are exceptions" — so
the choice isn't re-litigated per pull request; (2) a static analysis rule banning an empty `catch`
block (Checkstyle, SpotBugs, Error Prone all ship this) so "swallowed or rethrown with no context"
stops being a matter of individual discipline; (3) tying this to observability: a swallowed
exception is invisible to crash reporting, which is the actual reason a silent `catch` is dangerous
rather than merely untidy — the failure still happened, but nothing downstream ever finds out.

This is the depth angle for error handling specifically — see the Tech Lead Roadmap article for
how this connects to the wider breadth a Tech Lead needs.

## Cross-language comparison

See the cross-language cheat sheet article for how Kotlin, Swift, Dart and TypeScript each answer
the same two questions — or switch the language tab above to read this same topic in another
language directly.

## Pitfalls & trade-offs

- **Mid:** assuming "the compiler didn't complain" means the code can't fail — true for checked
  exceptions, false for every unchecked path.
- **Mid:** an empty `catch` block, or a `throws` added only to satisfy the compiler — the two
  outcomes checked exceptions were meant to prevent and, at scale, the two things they actually
  produce.
- **Senior:** reaching for a checked exception to model an expected, named failure mode instead of
  a sealed hierarchy with exhaustive `switch` handling.
- **Lead:** a "which failures are exceptions vs Result cases" convention that lives only as a wiki
  page, with no static analysis rule enforcing the empty-catch ban mechanically.
