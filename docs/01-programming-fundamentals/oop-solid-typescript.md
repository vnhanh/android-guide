---
id: fundamentals-oop-solid-typescript
title: OOP & SOLID in TypeScript — Repository Design, Liskov & the Options-Object Pattern
description: SRP and DIP worked through a TypeScript profile repository, a Liskov violation code review actually catches, and the options-object pattern that's the idiomatic boolean-blindness fix.
tags: [oop, solid, api-design, typescript, mid, senior, lead]
lang: en
status: complete
domain: 01-programming-fundamentals
platform: shared
band: X
level: Mid
sidebar_position: 8
topic: oop-solid
leaf: TypeScript
prerequisites: []
outcomes:
  - "Write a TypeScript repository that depends on an interface rather than a concrete network/database class, and explain what that buys a test"
  - "Find a Liskov violation by reading a subtype's method body, and redesign a signature using an options object"
resources:
  - title: "SOLID — Wikipedia"
    url: "https://en.wikipedia.org/wiki/SOLID"
    date: "2025-01-01"
---

# OOP & SOLID in TypeScript — Repository Design, Liskov & the Options-Object Pattern

SOLID isn't a checklist to satisfy before a PR is "done," it's a set of answers to "why did this
change take three days instead of one." Each letter names one specific way a design makes change
expensive. This article grounds all five principles in one worked example — a profile repository
that can source data from the network or a local cache.

## Mid {concept=oop-solid/srp-dip}

**Interview question: "Why does the code depend on an interface instead of the concrete
network/database class?"**

Because that's the whole mechanism behind two of the five principles at once. **Single
Responsibility**: the repository's only job is deciding whether profile data comes from cache or
network. **Dependency Inversion**: the repository depends on interfaces for its network and cache
dependencies, not a concrete client class.

```typescript
// SRP + DIP: interfaces stand in for the network/database types; the repository is
// constructed with them instead of reaching for a concrete client itself.
interface UserApi {
  fetchProfile(userId: string): Promise<UserProfileDto>;
}
interface UserDao {
  find(userId: string): Promise<UserProfileEntity | undefined>;
  insert(entity: UserProfileEntity): Promise<void>;
}

class UserProfileRepository {
  constructor(private remote: UserApi, private local: UserDao) {}

  async getProfile(userId: string): Promise<UserProfile> {
    const cached = await this.local.find(userId);
    if (cached) return cached.toDomain();
    const fresh = await this.remote.fetchProfile(userId);
    await this.local.insert(fresh.toEntity());
    return fresh.toDomain();
  }
}
```

**Follow-up an interviewer asks next:** "What does this actually buy you, concretely?" A unit test
for `getProfile` that never touches a real network or database — a fake `UserApi`/`UserDao`
returning canned data in memory, running in milliseconds, with no test server and no flaky CI step.

**Pitfall at this level:** writing the interface after the concrete class, as a thin wrapper around
whatever the concrete class already does, rather than designing it around what the *caller* needs.

## Senior {concept=oop-solid/liskov-api-design}

**Interview question: "What's actually wrong with a subtype that throws on a method its parent
promised to handle?"**

It breaks Liskov substitution: a subtype must honour its parent's contract, not just match its
method signatures — a class implementing an interface it can't fully honor and throwing, returning
a sentinel, or silently no-oping compiles and passes any naive type check.

**TypeScript's fix for boolean-blindness is the options-object pattern** — since the language has
no named-argument syntax at all, an object literal with named properties is the idiomatic
substitute:

```typescript
// WEAK: positional booleans give the reader zero information at the call site.
function loadImage(url: string, cache: boolean, retry: boolean) { ... }

// BETTER: an options object makes every value self-describing, with defaults via destructuring.
interface ImageLoadOptions {
  useCache?: boolean;
  retryOnFailure?: boolean;
}
function loadImage(url: string, { useCache = true, retryOnFailure = true }: ImageLoadOptions = {}) { ... }
loadImage(url, { useCache: true, retryOnFailure: false });
```

The same failure shows up in a return type, not just parameters: a value that's `undefined` for
two different reasons gives the caller no way to react differently to them — a discriminated union
(see the Error Handling and Pattern Matching articles) is the fix.

**Two more SOLID letters round this out.** **Open/Closed** means adding a new case shouldn't
require editing every `if`/`switch` that already handles the existing cases — the repository
example already shows the mechanism: adding a third data source means writing a new class
implementing `UserApi` or `UserDao`, not editing `UserProfileRepository`'s existing logic.
**Interface Segregation** says a caller should never be forced to depend on methods it doesn't
use — a fat `UserRepository` interface with a dozen methods forces a fake written for one test to
implement eleven methods it will never call; splitting it along the lines callers actually use
fixes this.

**Follow-up:** "Is the options-object pattern always worth it over plain positional parameters?"
For one or two parameters with an unambiguous order, positional is clearer and less verbose —
reserve the options object for where the ambiguity (multiple same-typed parameters, especially
booleans) actually exists, or where the parameter list is expected to grow.

**Pitfall at this level:** applying Open/Closed by adding speculative extension points ("just in
case") for variation that never actually shows up — the principle earns its keep when a second
real implementation appears, not preemptively.

## Lead {concept=oop-solid/team-enforcement}

**Interview question: "How do you make sure a whole team designs APIs the rest of the team can't
misuse, not just the engineers who already internalized this?"**

Concretely, in order of how mechanically enforceable each one is: (1) a **lint rule** (an ESLint
rule flagging more than one or two positional parameters of the same primitive type) — turns
"please use an options object" into a build failure instead of a review comment someone might
skip. (2) A **codebase convention, written down and checked in review**, requiring an options
object once a function crosses roughly two same-typed parameters. (3) An **API review checklist
item** specifically for anything crossing a module or team boundary: does every `boolean` read
unambiguously at the call site, does every "might not find it" return type distinguish its failure
reasons, does every subtype actually honor its supertype's contract. (4) For a genuinely new public
interface at a module boundary, an **architecture decision record** requirement, so the trade-off
is recorded once instead of re-litigated in every consuming team's Slack thread.

This is the depth angle for OOP and API design specifically — see the Tech Lead Roadmap article
for how this connects to the wider breadth a Tech Lead needs.

## Cross-language comparison

See the cross-language cheat sheet article for how Kotlin, Java, Swift and Dart each answer the
same two questions — or switch the language tab above to read this same topic in another language
directly.

## Pitfalls & trade-offs

- **Mid:** designing the interface as a thin wrapper around one existing concrete class instead of
  around what callers actually need.
- **Mid:** treating "it compiles" as proof a subtype is substitutable — a Liskov violation compiles
  and passes any naive type check; it only fails once a caller trusts the parent type's contract.
- **Senior:** a public API signature that lets a consumer misuse it silently — positional boolean
  parameters, or an `undefined` return conflating two different failure reasons.
- **Lead:** writing an API-design convention as a checklist item nobody enforces mechanically.
