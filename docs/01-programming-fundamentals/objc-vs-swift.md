---
id: fundamentals-mid-ios-objc-vs-swift
title: Objective-C vs Swift — Differences, Pros and Cons (Mid, iOS)
description: What actually changes between Objective-C and Swift — the type system, message dispatch vs static dispatch, memory rules and interop — plus an honest list of what Objective-C still does better.
tags: [ios, swift, objective-c, interview, mid]
lang: en
status: complete
domain: 01-programming-fundamentals
band: M
platform: ios
level: Mid
sidebar_position: 13
prerequisites: [fundamentals-type-system-and-null-safety, fundamentals-memory-management]
outcomes:
  - "Explain the Objective-C/Swift difference in terms of dispatch and type-system guarantees, and name three things Objective-C still does better"
counterpart: fundamentals-mid-android-java-vs-kotlin
resources:
  - title: "The Swift Programming Language — Optional Chaining"
    url: "https://docs.swift.org/swift-book/documentation/the-swift-programming-language/optionalchaining/"
    date: "2025-09-01"
  - title: "Migrating Your Objective-C Code to Swift — Apple Developer"
    url: "https://developer.apple.com/documentation/swift/migrating-your-objective-c-code-to-swift"
    date: "2025-06-01"
  - title: "Automatic Reference Counting — The Swift Programming Language"
    url: "https://docs.swift.org/swift-book/documentation/the-swift-programming-language/automaticreferencecounting/"
    date: "2025-09-01"
  - title: "Concurrency — The Swift Programming Language"
    url: "https://docs.swift.org/swift-book/documentation/the-swift-programming-language/concurrency/"
    date: "2025-09-01"
---

# Objective-C vs Swift — Differences, Pros and Cons

> **Outcome.** Explain the Objective-C/Swift difference in terms of dispatch and type-system
> guarantees, and name three things Objective-C still does better.

## 1. The one-paragraph answer

Objective-C is C plus a Smalltalk-style dynamic object system: objects communicate by **runtime
message sending**, types are loose, and almost everything about a class can be inspected or
rewritten while the app runs. Swift is a **statically typed, compiled language** whose design
goal is the opposite — push errors to compile time, dispatch statically where possible, and make
value types the default. The trade is precisely that: Swift buys safety and performance with the
dynamism Objective-C gives you, and Objective-C's remaining advantages all come from that same
dynamism.

## 2. The differences that matter

### Dispatch — messages vs static calls

This is the root difference; most others follow from it.

```objc
// Objective-C: resolved by the runtime at call time.
[myObject doSomething];        // if myObject is nil, this is a no-op — no crash
```

```swift
// Swift: resolved at compile time (static or vtable dispatch) unless you opt into
// dynamism with @objc/dynamic.
myObject.doSomething()         // myObject cannot be nil unless its type is Optional
```

Sending a message to `nil` in Objective-C silently does nothing and returns zero. That is
forgiving in the moment and a genuinely hard bug to find later, because the failure is a *missing
effect*, not a crash with a stack trace. Swift makes absence explicit in the type, so the
compiler forces you to handle it.

### Type system and nullability

| | Objective-C | Swift |
|---|---|---|
| Absence | any object may be `nil`; `nullable`/`nonnull` annotations are advisory | `Optional<T>` is a distinct type; the compiler enforces unwrapping |
| Generics | lightweight, erased, compiler-hint only (`NSArray<NSString *> *`) | real generics with constraints, checked and specialised |
| Value types | structs are C structs; objects are always reference types | `struct`/`enum` are first-class value types with methods, protocols, generics |
| Enums | integer constants | sum types with associated values, exhaustively checked in `switch` |
| Errors | `NSError **` out-parameter, ignorable | `throws`/`try`, unignorable at the call site |

### Memory management

Both use ARC — this is *not* a difference in mechanism, and claiming Swift "has garbage
collection" is a common wrong answer. What differs: Objective-C exposes the retain/release
machinery (and lets you drop to manual retain/release or bridge with `__bridge` casts), while in
Swift ARC is closed. Retain cycles are a live risk in both, solved the same way (`weak`/
`unowned`). Swift additionally sidesteps the problem for anything modelled as a `struct` or
`enum`, since value types are not reference counted at all.

### Concurrency

Objective-C's concurrency story is GCD and `NSOperation` with completion blocks — correct but
unchecked; nothing stops you touching UI off the main thread. Swift has `async`/`await`,
structured concurrency with `Task`/`TaskGroup`, actors for isolated mutable state, `@MainActor`
for main-thread enforcement, and — under strict concurrency checking — **compile-time data-race
detection** via `Sendable`. This is the largest post-2021 gap between the two.

### Syntax and ergonomics

Objective-C needs paired `.h`/`.m` files, `#import`, and named-argument message syntax
(`[obj setValue:x forKey:y]`). Swift has one file per type, modules instead of headers, type
inference, string interpolation, and protocol extensions with default implementations. This is
the least important difference technically and the one candidates spend the most time on.

## 3. Pros and cons, honestly

**Swift's advantages**

- Nullability, exhaustiveness and error handling enforced by the compiler.
- Value semantics by default — fewer shared-mutable-state bugs.
- Static dispatch and generic specialisation, so it is generally faster than message sending.
- The only language for SwiftUI, Swift Data, Swift Concurrency, and every new Apple framework.
- Far less code for the same behaviour; a smaller surface to get wrong.

**Where Objective-C is still genuinely better**

- **Runtime dynamism.** Method swizzling, `class_addMethod`, `NSInvocation`, KVO,
  `respondsToSelector:` — the whole introspection surface. Analytics, mocking, hot-patching and
  crash-reporting SDKs depend on it, and Swift only offers it through `@objc dynamic`, which
  opts back into the Objective-C runtime.
- **C and C++ interop.** Objective-C *is* C; it compiles C and Objective-C++ inline with no
  bridging. Swift's C interop is good and its C++ interop is improving, but it is a mapping
  layer, not the same language.
- **Compile times and ABI maturity.** Objective-C compiles faster on large codebases, and
  Objective-C headers are stable in ways Swift's module interfaces historically were not.
- **It's already there.** Millions of lines of shipping code, and Apple's own older frameworks
  are Objective-C underneath. Rewriting working Objective-C for its own sake is a cost with no
  user-visible benefit.

**Swift's costs, named plainly**

- Slower compilation and, historically, source-breaking language evolution.
- The strict-concurrency migration is real work on an existing codebase, not a free upgrade.
- Bridging boundaries (`NSArray` ↔ `Array`, `id` ↔ `Any`) add cost and can lose type
  information.

## 4. So which, in 2026?

**Swift for anything new**, without hesitation — new frameworks are Swift-only, hiring is
Swift-first, and the safety argument is decisive. **Keep Objective-C where it works**, and let
the two coexist: they interoperate in the same target through a bridging header (Objective-C →
Swift) and a generated interface header (Swift → Objective-C). Migrate a file when you are
changing it anyway, starting with leaf types and model code, not with the runtime-dynamic
machinery — that part is where the Objective-C advantage is real.

> [!TIP]
> **The interview trap** is answering "Swift is modern and safe, Objective-C is old." A strong
> answer names *message dispatch vs static dispatch* as the root cause, then shows you know
> where Objective-C still wins — runtime dynamism and C/C++ interop — because that is what
> decides real migration plans.

## Pitfalls & trade-offs

- **Saying Swift changed the memory model.** Both use ARC. What changed is that value types
  aren't reference counted, and the machinery is no longer exposed.
- **Assuming `nil`-messaging safety carries over.** Objective-C tolerates `nil` receivers;
  Swift's `!` force-unwrap crashes. Ported code that relied on the former silently is a common
  source of new crashes.
- **Rewriting the dynamic parts first.** Swizzling-based and KVO-based code is exactly the code
  with no clean Swift equivalent. Migrate models and view code first; leave that until last, or
  never.
