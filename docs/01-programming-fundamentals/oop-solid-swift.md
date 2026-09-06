---
id: fundamentals-oop-solid-swift
title: OOP & SOLID in Swift — Repository Design, Liskov & the API Design Guidelines
description: SRP and DIP worked through a Swift profile repository, a Liskov violation code review actually catches, and Swift's own naming discipline for a call site that reads as English.
tags: [oop, solid, api-design, swift, mid, senior, lead]
lang: en
status: complete
domain: 01-programming-fundamentals
platform: shared
band: X
level: Mid
sidebar_position: 8
topic: oop-solid
leaf: Swift
prerequisites: []
outcomes:
  - "Write a Swift repository that depends on a protocol rather than a concrete network/database class, and explain what that buys a test"
  - "Find a Liskov violation by reading a subtype's method body, and redesign a signature per the Swift API Design Guidelines"
resources:
  - title: "Swift API Design Guidelines"
    url: "https://www.swift.org/documentation/api-design-guidelines/"
    date: "2025-01-01"
---

# OOP & SOLID in Swift — Repository Design, Liskov & the API Design Guidelines

SOLID isn't a checklist to satisfy before a PR is "done," it's a set of answers to "why did this
change take three days instead of one." Each letter names one specific way a design makes change
expensive. This article grounds all five principles in one worked example — a profile repository
that can source data from the network or a local cache.

## Mid {concept=oop-solid/srp-dip}

**Interview question: "Why does the code depend on a protocol instead of the concrete
network/database class?"**

Because that's the whole mechanism behind two of the five principles at once. **Single
Responsibility**: the repository's only job is deciding whether profile data comes from cache or
network. **Dependency Inversion**: the repository depends on protocols for its network and cache
dependencies, not the concrete API/database types.

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

**Follow-up an interviewer asks next:** "What does this actually buy you, concretely?" A unit test
for `getProfile` that never touches a real network or database — a fake `UserAPI`/`UserStore`
returning canned data in memory, running in milliseconds, with no test server and no flaky CI step.

**Pitfall at this level:** writing the protocol after the concrete class, as a thin wrapper around
whatever the concrete class already does, rather than designing it around what the *caller* needs.

## Senior {concept=oop-solid/liskov-api-design}

**Interview question: "What's actually wrong with a subtype that throws on a method its parent
promised to handle?"**

It breaks Liskov substitution: a subtype must honour its parent's contract, not just match its
method signatures.

```swift
// LSP violation, same shape as any language: a subtype narrowing its parent's contract.
class PaymentProcessor {
    func charge(amountCents: Int) throws { /* always succeeds or throws */ }
}

final class ReadOnlyPaymentProcessor: PaymentProcessor {
    override func charge(amountCents: Int) throws {
        throw ProcessorError.unsupported // breaks every caller trusting the parent's contract
    }
}
```

**Swift's version of the same discipline adds a naming rule other languages don't state
separately: the Swift API Design Guidelines' central instruction is that a call should read as a
clear English phrase, not a checklist of positional arguments.**

```swift
// Guideline-following: reads as a sentence at the call site.
array.removeAll(where: { $0.isExpired })

// Not following: parameter names that don't complete the sentence the method name starts.
array.remove(withCondition: { $0.isExpired }) // "remove with condition" is not how English works

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

**Two more SOLID letters round this out.** **Open/Closed** means adding a new case shouldn't
require editing every `switch` that already handles the existing cases — the repository example
already shows the mechanism: adding a third data source means writing a new type conforming to
`UserAPI` or `UserStore`, not editing `UserProfileRepository`'s existing logic. **Interface
Segregation** says a caller should never be forced to depend on methods it doesn't use — a fat
`UserRepository` protocol with a dozen methods forces a fake written for one test to implement
eleven methods it will never call; splitting it along the lines callers actually use fixes this.

**Follow-up:** "Why does Swift call this out as a naming *guideline* rather than a language rule?"
Because it's about readability at the call site, not type safety — the compiler doesn't enforce
"reads like English," but the convention is strong enough across the ecosystem (Apple's own
frameworks, most popular libraries) that violating it is immediately conspicuous in review, the
same way a missed formatting convention would be.

**Pitfall at this level:** applying Open/Closed by adding speculative extension points ("just in
case") for variation that never actually shows up — the principle earns its keep when a second
real implementation appears, not preemptively.

## Lead {concept=oop-solid/team-enforcement}

**Interview question: "How do you make sure a whole team designs APIs the rest of the team can't
misuse, not just the engineers who already internalized this?"**

Concretely, in order of how mechanically enforceable each one is: (1) a **lint rule** (SwiftLint)
flagging a function with two or more adjacent `Bool` parameters — turns "please use labeled
parameters or an options type" into a build failure instead of a review comment someone might
skip. (2) A **codebase convention, written down and checked in review**, requiring a
named-and-defaulted options type once a function crosses roughly two same-typed parameters, and
applying the API Design Guidelines' call-site-reads-as-English rule consistently. (3) An **API
review checklist item** specifically for anything crossing a module or team boundary: does every
`Bool` read unambiguously at the call site, does every "might not find it" return type distinguish
its failure reasons, does every subtype actually honor its supertype's contract. (4) For a
genuinely new public interface at a module boundary, an **architecture decision record**
requirement, so the trade-off is recorded once instead of re-litigated in every consuming team's
Slack thread.

This is the depth angle for OOP and API design specifically — see the Tech Lead Roadmap article
for how this connects to the wider breadth a Tech Lead needs.

## Cross-language comparison

See the cross-language cheat sheet article for how Kotlin, Java, Dart and TypeScript each answer
the same two questions — or switch the language tab above to read this same topic in another
language directly.

## Pitfalls & trade-offs

- **Mid:** designing the protocol as a thin wrapper around one existing concrete class instead of
  around what callers actually need.
- **Mid:** treating "it compiles" as proof a subtype is substitutable — a Liskov violation compiles
  and passes any naive type check; it only fails once a caller trusts the parent type's contract.
- **Senior:** a public API signature that lets a consumer misuse it silently — two unlabelled
  `Bool` parameters, or a nullable return conflating two different failure reasons.
- **Senior:** a method name/parameter labels that don't read as a clear English phrase at the call
  site — the exact thing the Swift API Design Guidelines exist to prevent.
- **Lead:** writing an API-design convention as a checklist item nobody enforces mechanically.
