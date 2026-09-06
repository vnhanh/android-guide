---
id: fundamentals-interview
title: Programming Fundamentals — Interview Questions
description: At least 8 questions per level on type systems, memory, generics, pattern matching and OOP across Java, Kotlin, Swift, Dart and TypeScript — leaf-agnostic, framed the way an interviewer actually asks them.
tags: [interview, null-safety, generics, memory-management, oop, pattern-matching, mid, senior, lead]
lang: en
status: complete
domain: 01-programming-fundamentals
platform: shared
band: X
level: Mid
sidebar_position: 99
kind: interview
prerequisites: []
outcomes:
  - "Answer, without notes, the core interview questions this domain's Mid, Senior and Lead articles each teach"
---

# Programming Fundamentals — Interview Questions

## Mid

Q: What's the difference between a language that has compile-time null safety and one that doesn't?
A: The former makes "this value might be absent" part of the type itself — a missing check is a compile error. The latter (Java without tooling) compiles a missing check fine and throws at runtime instead.

Q: What's the real difference between value semantics and reference semantics?
A: Value semantics means assigning or passing a value gives you an independent copy — mutating one doesn't affect the other. Reference semantics means you get another handle to the same underlying object — mutating through one is visible through the other.

Q: Why does giving a value object structural equality matter, and what's the shallow-copy trap?
A: Structural equality lets two separately-constructed objects with the same field values compare equal, which is what most business logic actually wants. The shallow-copy trap is copying an object but leaving a mutable nested field shared with the original, so mutating the "copy" mutates the original too.

Q: What does covariance mean for a generic type, in one sentence?
A: If `Cat` is a subtype of `Animal`, a covariant `Container<Cat>` is treated as a subtype of `Container<Animal>` — read-only producers are typically safe to make covariant; mutable containers usually aren't.

Q: When does a `map`/`filter` chain actually run — immediately, or only when consumed?
A: It depends on the language: eager collections (Kotlin `List`, Swift `Array`) run each step immediately and allocate an intermediate collection per step; lazy sequences (Kotlin `Sequence`, Swift `lazy`) defer all of it until a terminal operation actually consumes the result.

Q: What's the honest answer to "does this language have checked exceptions"?
A: Only Java does. Every other language in this guide uses unchecked exceptions or a result/error-value type — the compiler doesn't force you to declare or catch anything, so the discipline has to come from the API design, not the language.

Q: What does a sealed/closed type give you that a plain open class hierarchy doesn't?
A: The compiler can verify a `when`/`switch` over it is exhaustive — adding a new case without updating every place that switches on it becomes a compile error instead of a silent runtime gap.

Q: Name one SOLID principle and describe a concrete violation you'd flag in review.
A: The Single Responsibility Principle — a class that both parses a network response and persists it to disk has two reasons to change (API shape, storage format), so a change to either forces a review of code that has nothing to do with that change.

## Senior

Q: Every language's null safety has a boundary where it stops being checked. Name Kotlin's.
A: An unannotated Java (or unannotated-library) boundary — the value arrives as a platform type (`String!`) that isn't checked at all, so it compiles but can NPE at runtime; the fix is re-declaring the real nullability immediately at the boundary.

Q: What's the ARC retain-cycle risk in a Swift closure, and how do you avoid it?
A: A closure captures `self` strongly by default; if the object also holds a strong reference to the closure (e.g. as a stored callback), neither can ever be deallocated. Fix with `[weak self]` in the capture list.

Q: In Kotlin/JVM, what causes a memory leak that the garbage collector can't fix?
A: A live root — a static field, a registered listener never unregistered, a long-lived coroutine scope — still holding a strong reference to an object whose real lifecycle has ended. The GC can't collect anything still reachable from a root, no matter how "obviously unused" it looks.

Q: Why can `Codable` decoding crash in production even though the model compiled fine?
A: `Codable` will decode a field as non-optional if the model says so, and throw a decode error — not a graceful failure — the first time the actual backend response omits that field, because the type system only protects code the compiler can see, not the real network payload.

Q: What's the actual risk of using `Any`/`dynamic` at a language boundary (JNI, platform channel, reflection)?
A: The type system has zero visibility past that boundary — a value can arrive as the wrong type or null where the static type claims otherwise, and the failure surfaces as a runtime type error or crash far from the actual cause, not a compile error anywhere.

Q: When is variance actually unsafe to add to a generic container, and why?
A: When the container is mutable and covariant — a covariant `MutableContainer<Cat>` used as `MutableContainer<Animal>` would let you insert a `Dog`, silently violating the container's actual element type; this is why Java arrays are covariant-and-unsafe while Kotlin's read-only generics use `out` deliberately.

Q: What's the honest cost of `TypeScript`'s `strictNullChecks` at a network boundary?
A: It protects code you wrote — it says nothing about `fetch()`'s response. `res.json()` returns `any`, so `const data: UserProfile = await res.json()` is a claim the compiler accepts with zero runtime evidence; only a runtime schema validator actually checks it.

Q: Give an example of a Java `NullPointerException` root cause that isn't "someone forgot a null check."
A: A third-party library returning `null` from a method documented (but not annotated) as sometimes empty, discovered only when that specific code path runs in production — no annotation or `Optional` usage anywhere in the calling code would have caught it without reading that library's actual behavior.

## Lead

Q: How do you keep a nullable API contract honest across a whole team, not just code you personally review?
A: In order of strength: a shared schema (OpenAPI/protobuf) generating the mobile model so nullability isn't retyped by hand; a contract test that fails CI the day the backend's actual shape changes; and, short of that, a lint rule blocking an un-re-asserted platform type or unvalidated network cast.

Q: When is a toolchain/language migration (e.g. Java to Kotlin) actually worth the cost, versus not?
A: When the ongoing cost of the old toolchain (missing safety, slower iteration, hiring friction) demonstrably exceeds the one-time migration cost plus the risk of the migration itself — not just because the new tool is generally regarded as better; price both sides explicitly.

Q: How do you turn "the team agrees on this idiom" into something that actually holds under deadline pressure?
A: Move it from a wiki page to an enforced mechanism — a lint rule, a static analysis check, a CI gate — because a convention that depends on every engineer remembering it under pressure decays the first time someone is in a hurry.

Q: A senior engineer wants to adopt a new language feature (e.g. Kotlin context receivers, Swift macros) team-wide. What do you actually evaluate before saying yes?
A: Tooling maturity (IDE support, debugger behavior), the learning curve for the rest of the team, whether it's reversible if it doesn't work out, and whether the problem it solves is common enough in this codebase to be worth the new surface area — not just "does it work."

Q: How do you price the cost of *not* migrating off a legacy language/pattern, so it's comparable to the migration cost?
A: In the same units as the migration estimate — extra onboarding time per new hire, extra defect rate in the affected area, extra review time per PR touching it — so the trade-off is a number-to-number comparison, not a vibe.

Q: What's the actual failure mode of "we'll enforce this idiom through code review" as a long-term team standard?
A: Consistency depends entirely on which reviewer happens to be assigned and how much time pressure they're under that day — it silently degrades as the team grows past the size where every PR gets reviewed by someone who remembers the standard.

Q: How do you decide whether a cross-language inconsistency (e.g. Kotlin sound null safety vs Java's opt-in) is a real risk worth a mitigation, or an acceptable cost?
A: By naming the specific boundary where it breaks down (an unannotated Java dependency called from Kotlin) and asking whether that boundary is exercised by code that matters — a rarely-touched internal tool has a different risk profile than a payment-flow API surface.

Q: What's the team-level signal that a "we don't need static analysis, we're disciplined" argument is wrong?
A: Any incident, however small, whose root cause a static analysis rule would have caught at compile time — that's evidence the discipline argument has already failed once, and the mechanism argument doesn't depend on it working perfectly every time going forward.
