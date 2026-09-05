---
id: fundamentals-mid-ios
title: Optionals, Value vs Reference Semantics & OOP/SOLID in Swift (Mid, iOS)
description: Optional unwrapping discipline, struct/class/COW, protocols and generics, and SOLID applied to real Swift mobile code.
tags: [ios, swift, oop, solid, mid]
lang: en
status: complete
domain: 01-programming-fundamentals
band: M
platform: ios
level: Mid
sidebar_position: 2
prerequisites: []
outcomes:
  - "Predict whether a mutation is visible to another holder of the same value, and say why"
counterpart: fundamentals-mid-android
resources:
  - title: "Optional chaining — The Swift Programming Language"
    url: "https://docs.swift.org/swift-book/documentation/the-swift-programming-language/optionalchaining/"
    date: "2025-06-01"
  - title: "Structures and classes — The Swift Programming Language"
    url: "https://docs.swift.org/swift-book/documentation/the-swift-programming-language/classesandstructures/"
    date: "2025-06-01"
  - title: "Generics — The Swift Programming Language"
    url: "https://docs.swift.org/swift-book/documentation/the-swift-programming-language/generics/"
    date: "2025-06-01"
  - title: "Error handling — The Swift Programming Language"
    url: "https://docs.swift.org/swift-book/documentation/the-swift-programming-language/errorhandling/"
    date: "2025-06-01"
---

# Optionals, Value vs Reference Semantics & OOP/SOLID in Swift

> **Outcome.** Predict whether a mutation made through one reference is visible to another
> holder of the same value, and say precisely why — the question every Kotlin-trained engineer
> gets wrong on their first Swift review.

## 1. Optionals & unwrapping discipline

Swift's `Optional<T>` (`T?`) is the direct analogue of Kotlin's nullable type — but unlike a
Kotlin platform type, **there is no escape hatch**: every value from Objective-C, a C API, or a
force-unwrap is still represented honestly as an optional or an explicit crash, never as an
unchecked type the compiler stops reasoning about.

```swift
func greet(name: String) -> String { "Hello, \(name)" }        // never optional — guaranteed
func greetOptional(name: String?) -> String {                  // must handle the nil case
    "Hello, \(name ?? "guest")"
}
```

The unwrapping idioms, ranked by how much they should be trusted:

```swift
// Force unwrap — asserts you are certain; wrong once and it's a crash, not a bug report.
let name = user.displayName!

// Optional binding — the default: handle both cases explicitly.
if let name = user.displayName {
    render(name)
}

// guard let — unwrap-or-exit-early; keeps the "happy path" at the outer indentation level.
func render(user: User) {
    guard let name = user.displayName else { return }
    // `name` is non-optional for the rest of the function
}

// Nil-coalescing — supply a default inline.
let name = user.displayName ?? "Guest"
```

> [!IMPORTANT]
> A force-unwrap (`!`) that reads clean in a demo is a crash waiting for the one time the
> assumption is wrong — a nil `displayName` on an account created before a required field was
> added, say. Reading unfamiliar Swift for risk means grepping for `!` on anything not
> immediately preceded by a `guard`/`if let` that just proved it safe.

## 2. Value vs reference: struct, class, and copy-on-write

This is the concept with no clean Kotlin equivalent, and the reason this article's outcome is
stated the way it is. A `struct` is a **value type**: assigning it, passing it to a function, or
storing it in another struct **copies** it. A `class` is a **reference type**: every holder
shares the same instance.

```swift
struct Point { var x: Int; var y: Int }
var a = Point(x: 0, y: 0)
var b = a          // COPY — b is an independent value
b.x = 10
a.x                 // still 0 — mutating b never touched a

final class Counter { var value = 0 }
let c1 = Counter()
let c2 = c1         // SAME INSTANCE — c2 is another reference to c1's object
c2.value = 10
c1.value            // 10 — c1 and c2 point at the same object
```

Swift's standard collections (`Array`, `Dictionary`, `Set`) are structs, but they use
**copy-on-write (COW)**: internally they share a storage buffer until one holder mutates it, at
which point that holder gets its own copy. This is why they behave like true value types
*without* the constant runtime cost of eager copying:

```swift
var original = [1, 2, 3]
var copy = original       // no copy yet — both share the same buffer internally
copy.append(4)             // mutation triggers the actual copy, now they diverge
original                   // [1, 2, 3] — untouched
```

> [!NOTE]
> This is the precise, checkable version of this article's outcome: given two variables holding
> the same array, predicting "does mutating one affect the other" requires knowing COW exists —
> the answer is always "no, they diverge on first mutation," which is a specific, statable fact,
> not "it depends" the way it genuinely does for two references to the same class instance.

## 3. Protocols & generics — Swift's shape for polymorphism

A `protocol` plays the role a Kotlin `interface` plays, with one addition worth knowing early:
protocol extensions can supply a default implementation, which every conforming type gets for
free unless it overrides it.

```swift
protocol Fetchable {
    associatedtype Response
    func fetch() async throws -> Response
}

extension Fetchable {
    // Default implementation — conforming types only need to implement `fetch()` itself.
    func fetchWithRetry(attempts: Int = 3) async throws -> Response {
        for attempt in 1...attempts {
            do { return try await fetch() }
            catch { if attempt == attempts { throw error } }
        }
        fatalError("unreachable")
    }
}
```

A generic function or type is written once and works across any type satisfying its
constraints, exactly as in Kotlin:

```swift
func firstMatch<T>(in items: [T], where predicate: (T) -> Bool) -> T? {
    for item in items where predicate(item) { return item }
    return nil
}
```

## 4. `throws` vs `Result` — two honest ways to fail

```swift
// throws — the error is part of the call, propagated with `try`/`await`.
func fetchProfile(id: String) async throws -> UserProfile { ... }

// Result — the error is part of the VALUE, useful when you need to store, pass around,
// or defer handling of a failure rather than propagate it immediately.
func fetchProfile(id: String, completion: @escaping (Result<UserProfile, FetchError>) -> Void) { ... }
```

`throws` is the default for anything called and handled in the same flow; `Result` earns its
place when the outcome needs to be stored, compared, or handled later than the call site — a
retry queue holding failed operations, for instance.

## 5. OOP & SOLID in Swift idiom

```swift
// SRP + DIP: the repository depends on protocols, not concrete API/DB types — a fake
// conforming to UserAPI/UserStore can stand in for either in a test.
protocol UserAPI { func fetchProfile(id: String) async throws -> UserProfileDTO }
protocol UserStore { func find(id: String) -> UserProfileEntity?; func insert(_ e: UserProfileEntity) }

final class UserProfileRepository {
    private let remote: UserAPI
    private let local: UserStore
    init(remote: UserAPI, local: UserStore) { self.remote = remote; self.local = local }

    func getProfile(id: String) async throws -> UserProfile {
        if let cached = local.find(id: id) { return cached.toDomain() }
        let fresh = try await remote.fetchProfile(id: id)
        local.insert(fresh.toEntity())
        return fresh.toDomain()
    }
}
```

```swift
// LSP violation, same shape as the Kotlin one: a subtype narrowing its parent's contract.
class PaymentProcessor {
    func charge(amountCents: Int) throws { /* always succeeds or throws */ }
}

final class ReadOnlyPaymentProcessor: PaymentProcessor {
    override func charge(amountCents: Int) throws {
        throw ProcessorError.unsupported // breaks every caller trusting the parent's contract
    }
}
```

## Pitfalls & trade-offs

- **Force-unwrapping on the assumption "this can't be nil here."** Covered above — the specific
  review habit this article's outcome is checking for is treating every `!` as a claim that
  needs justifying, not a shortcut.
- **Assuming a `struct` holding a `class` property is fully copied.** COW protects the struct's
  own stored properties, not a reference type nested inside it — a `struct` with a `class`
  property still shares that inner object across "copies," exactly like the Kotlin `data class`
  shallow-copy trap.
- **Reaching for a `class` out of habit when a `struct` expresses the intent better.** Value
  types remove a whole category of shared-mutable-state bugs for free; a `class` should be a
  deliberate choice (identity matters, or the type is large enough that copying is expensive),
  not the default because it's what other languages default to.
- **A subtype that throws on a method its parent promised to handle.** Same Liskov violation as
  the Kotlin example — the language differs, the review judgement does not.
