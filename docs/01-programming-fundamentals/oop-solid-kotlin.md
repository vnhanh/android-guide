---
id: fundamentals-oop-solid-kotlin
title: OOP & SOLID in Kotlin — Repository Design, Liskov & API Boolean-Blindness
description: SRP and DIP worked through a Kotlin profile repository, a Liskov violation code review actually catches, and the named-argument fix for boolean-blind and ambiguous-null API signatures.
tags: [oop, solid, api-design, kotlin, mid, senior, lead]
lang: en
status: complete
domain: 01-programming-fundamentals
platform: shared
band: X
level: Mid
sidebar_position: 8
topic: oop-solid
leaf: Kotlin
prerequisites: []
outcomes:
  - "Write a Kotlin repository that depends on an interface rather than a concrete network/database class, and explain what that buys a test"
  - "Find a Liskov violation by reading a subtype's method body, and redesign a signature so the misuse becomes a compile error"
resources:
  - title: "Api guidelines for Kotlin libraries"
    url: "https://kotlinlang.org/docs/jvm-api-guidelines-introduction.html"
    date: "2024-11-01"
---

# OOP & SOLID in Kotlin — Repository Design, Liskov & API Boolean-Blindness

SOLID isn't a checklist to satisfy before a PR is "done," it's a set of answers to "why did this
change take three days instead of one." Each letter names one specific way a design makes change
expensive. This article grounds all five principles in one worked example — a profile repository
that can source data from the network or a local cache.

## Mid {concept=oop-solid/srp-dip}

**Interview question: "Why does the code depend on an interface instead of the concrete
network/database class?"**

Because that's the whole mechanism behind two of the five principles at once. **Single
Responsibility**: the repository's only job is deciding whether profile data comes from cache or
network — it does not parse JSON, log analytics, or format anything for display. **Dependency
Inversion**: the repository depends on interfaces for its network and cache dependencies, not the
concrete Retrofit-equivalent or database class.

```kotlin
// SRP: this class does exactly one thing — decide where profile data comes from.
// It is not also parsing JSON, not also logging analytics, not also formatting for display.
class UserProfileRepository(
    private val remote: UserApi,
    private val local: UserDao,
) {
    suspend fun getProfile(userId: String): UserProfile {
        local.find(userId)?.let { return it.toDomain() }
        val fresh = remote.fetchProfile(userId)
        local.insert(fresh.toEntity())
        return fresh
    }
}

// DIP: the repository depends on interfaces (UserApi, UserDao), not concrete Retrofit/Room
// classes — a fake implementation can stand in for either in a test with no framework involved.
interface UserApi { suspend fun fetchProfile(userId: String): UserProfileDto }
interface UserDao { suspend fun find(userId: String): UserProfileEntity?; suspend fun insert(e: UserProfileEntity) }
```

**Follow-up an interviewer asks next:** "What does this actually buy you, concretely?" A unit test
for `getProfile` that never touches a real network or database — a fake `UserApi`/`UserDao`
returning canned data in memory, running in milliseconds, with no test server and no flaky CI step.

**Pitfall at this level:** writing the interface after the concrete class, as a thin wrapper around
whatever the concrete class already does, rather than designing it around what the *caller* needs.
An interface shaped by its one existing implementation still leaks that implementation's
assumptions.

## Senior {concept=oop-solid/liskov-api-design}

**Interview question: "What's actually wrong with a subtype that throws on a method its parent
promised to handle?"**

It breaks Liskov substitution: a subtype must honour its parent's contract, not just match its
method signatures.

```kotlin
// LSP violation, the kind code review actually catches: a subtype that narrows the contract
// its parent promised, breaking every caller that relied on the parent's guarantee.
open class PaymentProcessor {
    open fun charge(amountCents: Long) { /* always succeeds or throws PaymentError */ }
}

class ReadOnlyPaymentProcessor : PaymentProcessor() {
    override fun charge(amountCents: Long) {
        throw UnsupportedOperationException() // silently breaks every caller's assumption
    }
}
```

`ReadOnlyPaymentProcessor` is not a `PaymentProcessor` in any usable sense — a caller holding a
`PaymentProcessor` reference has no way to know charging will always fail.

The other half of Senior-level design is API surface a whole other team will consume without ever
reading its implementation — naming, for each public signature, the specific mistake a caller will
make, and shaping the signature so that mistake is a compile error instead of a silent bug.

```kotlin
// WEAK: a Boolean parameter with no name at the call site is a guessing game,
// and nothing stops a caller passing (context, true, true) with the arguments swapped.
fun loadImage(context: Context, cache: Boolean, retry: Boolean) { ... }

// BETTER: named, defaulted, and impossible to swap by position because each
// is its own type — the misuse this prevents is a silent argument-order bug.
data class ImageLoadOptions(
    val useCache: Boolean = true,
    val retryOnFailure: Boolean = true,
)
fun loadImage(context: Context, options: ImageLoadOptions = ImageLoadOptions()) { ... }
```

The same failure shows up in a return type, not just parameters: a nullable return conflating two
different reasons for failure gives the caller no way to react differently to them — a sealed
Result (see the Error Handling and Pattern Matching articles) is the fix.

**Two more SOLID letters round this out.** **Open/Closed** means adding a new case shouldn't
require editing every `if`/`when` that already handles the existing cases — the repository example
already shows the mechanism: adding a third data source means writing a new class implementing
`UserApi` or `UserDao`, not editing `UserProfileRepository`'s existing logic. **Interface
Segregation** says a caller should never be forced to depend on methods it doesn't use — a fat
`UserRepository` interface with a dozen methods forces a fake written for one test to implement
eleven methods it will never call; splitting it along the lines callers actually use fixes this.

**Follow-up:** "How would you redesign the `Boolean`-parameter example if you also needed to
support Java callers?" Kotlin's named-and-defaulted parameters don't survive across a Java
interop boundary the same way — a `@JvmOverloads` annotation generates overloads for Java, but the
options-object approach (`ImageLoadOptions`) is the version that stays clear from both languages.

**Pitfall at this level:** applying Open/Closed by adding speculative extension points ("just in
case") for variation that never actually shows up — the principle earns its keep when a second
real implementation appears, not preemptively.

## Lead {concept=oop-solid/team-enforcement}

**Interview question: "How do you make sure a whole team designs APIs the rest of the team can't
misuse, not just the engineers who already internalized this?"**

Concretely, in order of how mechanically enforceable each one is: (1) a **lint rule** — a Kotlin
`detekt` rule flagging a function with two or more adjacent `Boolean` parameters — turns "please
use named options" into a build failure instead of a review comment someone might skip. (2) A
**codebase convention, written down and checked in review**, requiring a named-and-defaulted
options object once a function crosses roughly two same-typed parameters. (3) An **API review
checklist item** specifically for anything crossing a module or team boundary: does every `Boolean`
read unambiguously at the call site, does every "might not find it" return type distinguish its
failure reasons, does every subtype actually honor its supertype's contract. (4) For a genuinely
new public interface at a module boundary, an **architecture decision record** requirement, so the
trade-off is recorded once instead of re-litigated in every consuming team's Slack thread.

This is the depth angle for OOP and API design specifically — see the Tech Lead Roadmap article
for how this connects to the wider breadth a Tech Lead needs.

## Cross-language comparison

See the cross-language cheat sheet article for how Java, Swift, Dart and TypeScript each answer
the same two questions — or switch the language tab above to read this same topic in another
language directly.

## Pitfalls & trade-offs

- **Mid:** designing the interface as a thin wrapper around one existing concrete class instead of
  around what callers actually need.
- **Mid:** treating "it compiles" as proof a subtype is substitutable — the Liskov violation above
  compiles and passes any naive type check; it only fails once a caller trusts the parent type's
  contract, usually in production.
- **Senior:** a public API signature that lets a consumer misuse it silently — two unlabelled
  Boolean parameters, or a nullable return conflating two different failure reasons.
- **Senior:** an Interface Segregation split taken too far — a dozen single-method interfaces for a
  type with one real implementation and one real caller adds indirection with no matching benefit.
- **Lead:** writing an API-design convention as a checklist item nobody enforces mechanically.
