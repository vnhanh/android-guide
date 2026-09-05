---
id: fundamentals-senior-ios
title: ARC, Retain Cycles & Protocol-Oriented Design (Senior, iOS)
description: ARC and retain cycles, protocol-oriented design, existential vs generic dispatch, some vs any, and the Swift API Design Guidelines.
tags: [ios, swift, arc, protocols, senior]
lang: en
status: complete
domain: 01-programming-fundamentals
band: S
platform: ios
level: Senior
sidebar_position: 4
prerequisites: [fundamentals-mid-ios]
outcomes:
  - "Find a retain cycle by reading the code, not by waiting for the memory graph debugger"
counterpart: fundamentals-senior-android
resources:
  - title: "Automatic Reference Counting — The Swift Programming Language"
    url: "https://docs.swift.org/swift-book/documentation/the-swift-programming-language/automaticreferencecounting/"
    date: "2025-06-01"
  - title: "Existential any"
    url: "https://www.swift.org/blog/introducing-a-package-collection-format/"
    date: "2024-09-01"
  - title: "Swift API Design Guidelines"
    url: "https://www.swift.org/documentation/api-design-guidelines/"
    date: "2025-01-01"
  - title: "Protocol-oriented programming — WWDC"
    url: "https://developer.apple.com/videos/play/wwdc2015/408/"
    date: "2024-09-01"
---

# ARC, Retain Cycles & Protocol-Oriented Design

> **Outcome.** Find a retain cycle by reading the code — naming exactly which two references
> hold each other — rather than waiting for Xcode's memory graph debugger to show you a cluster
> of objects that never got deallocated.

## 1. ARC and the retain cycle, read from the source

Automatic Reference Counting deallocates an object the instant its reference count reaches
zero — no GC pause, but no tolerance for a cycle either: two objects holding **strong**
references to each other keep each other's count above zero forever.

```swift
final class Owner {
    var pet: Pet?
}

final class Pet {
    var owner: Owner?   // STRONG reference back to Owner — this is the cycle
}

var owner: Owner? = Owner()
var pet: Pet? = Pet()
owner?.pet = pet
pet?.owner = owner
owner = nil   // Owner's refcount doesn't drop to zero — Pet still holds it
pet = nil     // Pet's refcount doesn't drop to zero either — Owner still holds it
// Both objects are now unreachable from anywhere else in the program, and neither
// is ever deallocated. This is precisely what the memory graph debugger would show
// as a cluster with no path to a root — but the source already told you.
```

The read-the-code version of finding this: for every pair of types that reference each other,
**at least one direction must be `weak` or `unowned`**.

```swift
final class Pet {
    weak var owner: Owner?   // weak: doesn't add to Owner's refcount, breaks the cycle
}
```

`weak` vs `unowned` is a statement about lifetime, not just a syntax choice:

```swift
// weak: the referenced object CAN legitimately become nil before this one does.
// Must be Optional; automatically becomes nil on deallocation.
class Pet { weak var owner: Owner? }

// unowned: the referenced object is guaranteed to outlive this one, or this one
// is meaningless without it. Not Optional — accessing it after deallocation crashes.
class CreditCard { unowned let customer: Customer }
```

> [!IMPORTANT]
> Closures capture strongly by default, which is the second most common retain-cycle source
> after two classes referencing each other directly: a class property holding a closure that
> captures `self`, stored on `self`, is the same cycle shape with a closure standing in for one
> of the two objects.

```swift
final class ProfileViewModel {
    var onLoad: (() -> Void)?
    func setup() {
        onLoad = { self.reload() } // captures self strongly — self now indirectly
                                    // holds onLoad, which holds self. Cycle.
    }
}
// FIX: capture list.
// onLoad = { [weak self] in self?.reload() }
```

## 2. Protocol-oriented design: existential vs generic dispatch

A function parameter typed as a protocol can be written two ways, and they compile to different
dispatch mechanisms with different costs.

```swift
protocol DataSource {
    func fetch() -> [Item]
}

// Existential (`any DataSource`, or bare `DataSource` pre-Swift 5.7): the concrete
// type is erased and boxed. Every call is dispatched through a witness table at
// runtime — flexible (a heterogeneous array of `any DataSource` is legal), at the
// cost of a dynamic dispatch and, for larger conforming types, a heap allocation.
func load(from source: any DataSource) -> [Item] { source.fetch() }

// Generic (`some DataSource`, or a generic parameter `<S: DataSource>`): the concrete
// type is known and fixed at compile time for a given call site. The compiler can
// specialize and often inline the call — no dispatch overhead, at the cost of not
// being able to mix different concrete types through the same call site.
func load<S: DataSource>(from source: S) -> [Item] { source.fetch() }
func loadOpaque(from source: some DataSource) -> [Item] { source.fetch() }
```

> [!NOTE]
> `some` and `any` read similarly but answer different questions. `some P` means "a specific,
> fixed conforming type, decided by the implementation, that the caller doesn't need to name" —
> generic dispatch. `any P` means "any conforming type at all, decided per value, at runtime" —
> existential dispatch. Reach for `some`/generics by default; reach for `any` only when
> heterogeneity — genuinely mixed concrete types through one variable or collection — is the
> actual requirement, not a habit carried over from Kotlin's `interface`-typed parameters, which
> have no equivalent distinction (the JVM's dispatch is uniformly dynamic).

## 3. The Swift API Design Guidelines, applied

The guidelines' central instruction — read as a grammatical rule at call sites, not a style
preference — is that a call should read as a clear English phrase:

```swift
// Guideline-following: reads as a sentence at the call site.
array.removeAll(where: { $0.isExpired })
users.filter { $0.isActive }

// Not following: parameter names that don't complete the sentence the method name starts.
array.remove(withCondition: { $0.isExpired }) // "remove with condition" is not how English works
```

Applied to the same repository shape from the Mid-level article, worked as a Senior-level API a
consuming team must not be able to misuse:

```swift
// WEAK: a Bool with no label risk, and a nullable return conflating two failure reasons.
func fetchUser(id: String, cache: Bool) -> User?

// BETTER: named for readability at the call site, and an enum names every real outcome.
enum FetchResult<T> {
    case success(T)
    case notFound(id: String)
    case networkError(Error)
}
func fetchUser(id: String, usingCache: Bool = true) async -> FetchResult<User>
```

## Pitfalls & trade-offs

- **Assuming `weak` and `unowned` are interchangeable syntax choices.** They state different
  lifetime guarantees; `unowned` on a reference that *can* outlive its owner is a crash waiting
  for the one path where the assumption breaks, not a style preference.
- **A closure stored on `self` that captures `self` strongly.** The single most common
  retain-cycle source after direct class-to-class references — grep stored closures for a
  missing `[weak self]` the same way you'd grep for an unwrapped platform type in Kotlin.
- **Reaching for `any` (existentials) as the default protocol-typed parameter.** It compiles and
  works, but pays a dispatch and sometimes allocation cost that generic/`some` dispatch avoids
  for the common case of a single, statically-known conforming type per call site.
- **A public API whose parameter names don't read as English at the call site.** The Swift API
  Design Guidelines exist because this is checkable, not subjective — read the call site aloud.
