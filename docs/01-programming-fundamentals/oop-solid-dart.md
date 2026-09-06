---
id: fundamentals-oop-solid-dart
title: OOP & SOLID in Dart — Repository Design, Liskov & Named-Parameter Clarity
description: SRP and DIP worked through a Dart profile repository using abstract classes as interfaces, a Liskov violation code review actually catches, and Dart's curly-brace named parameters as the boolean-blindness fix.
tags: [oop, solid, api-design, dart, mid, senior, lead]
lang: en
status: complete
domain: 01-programming-fundamentals
platform: shared
band: X
level: Mid
sidebar_position: 8
topic: oop-solid
leaf: Dart
prerequisites: []
outcomes:
  - "Write a Dart repository that depends on an abstract class rather than a concrete network/database class, and explain what that buys a test"
  - "Find a Liskov violation by reading a subtype's method body, and redesign a signature using named parameters"
resources:
  - title: "SOLID — Wikipedia"
    url: "https://en.wikipedia.org/wiki/SOLID"
    date: "2025-01-01"
---

# OOP & SOLID in Dart — Repository Design, Liskov & Named-Parameter Clarity

SOLID isn't a checklist to satisfy before a PR is "done," it's a set of answers to "why did this
change take three days instead of one." Each letter names one specific way a design makes change
expensive. This article grounds all five principles in one worked example — a profile repository
that can source data from the network or a local cache.

## Mid {concept=oop-solid/srp-dip}

**Interview question: "Why does the code depend on an abstract class instead of the concrete
network/database class?"**

Because that's the whole mechanism behind two of the five principles at once. **Single
Responsibility**: the repository's only job is deciding whether profile data comes from cache or
network. **Dependency Inversion**: the repository depends on abstractions for its network and
cache dependencies, not the concrete network/database client.

**Dart has no separate `interface` keyword** — an `abstract class` plays that role, and any class
implicitly satisfies it by implementing the same methods.

```dart
// SRP + DIP: abstract classes stand in for interfaces; the repository is handed its
// dependencies rather than constructing a concrete network/database client itself.
abstract class UserApi {
  Future<UserProfileDto> fetchProfile(String userId);
}
abstract class UserDao {
  Future<UserProfileEntity?> find(String userId);
  Future<void> insert(UserProfileEntity entity);
}

class UserProfileRepository {
  final UserApi remote;
  final UserDao local;
  UserProfileRepository(this.remote, this.local);

  Future<UserProfile> getProfile(String userId) async {
    final cached = await local.find(userId);
    if (cached != null) return cached.toDomain();
    final fresh = await remote.fetchProfile(userId);
    await local.insert(fresh.toEntity());
    return fresh.toDomain();
  }
}
```

**Follow-up an interviewer asks next:** "What does this actually buy you, concretely?" A unit test
for `getProfile` that never touches a real network or database — a fake `UserApi`/`UserDao`
returning canned data in memory, running in milliseconds, with no test server and no flaky CI step.

**Pitfall at this level:** writing the abstract class after the concrete class, as a thin wrapper
around whatever the concrete class already does, rather than designing it around what the *caller*
needs.

## Senior {concept=oop-solid/liskov-api-design}

**Interview question: "What's actually wrong with a subtype that throws on a method its parent
promised to handle?"**

It breaks Liskov substitution: a subtype must honour its parent's contract, not just match its
method signatures. A subclass that throws, returns a sentinel, or silently no-ops on a method its
supertype's contract promised to handle compiles and passes any naive type check — the bug is
invisible until a caller trusts the parent type's contract, usually in production.

**Dart's curly-brace named parameters are the natural boolean-blindness fix** — unlike Java, Dart
doesn't need a Builder to get named, self-describing arguments:

```dart
// WEAK: positional booleans are a guessing game at the call site.
void loadImage(BuildContext context, bool cache, bool retry) { ... }

// BETTER: named parameters make every argument self-describing, with defaults.
void loadImage(BuildContext context, {bool useCache = true, bool retryOnFailure = true}) { ... }
loadImage(context, useCache: true, retryOnFailure: false);
```

The same failure shows up in a return type, not just parameters: a nullable return conflating two
different reasons for failure gives the caller no way to react differently to them — a Dart 3
sealed class (see the Error Handling and Pattern Matching articles) is the fix.

**Two more SOLID letters round this out.** **Open/Closed** means adding a new case shouldn't
require editing every `if`/`switch` that already handles the existing cases — the repository
example already shows the mechanism: adding a third data source means writing a new class
implementing `UserApi` or `UserDao`, not editing `UserProfileRepository`'s existing logic.
**Interface Segregation** says a caller should never be forced to depend on methods it doesn't
use — a fat `UserRepository` abstract class with a dozen methods forces a fake written for one
test to implement eleven methods it will never call; splitting it along the lines callers actually
use fixes this.

**Follow-up:** "Since Dart's named parameters are so easy to add, is there ever a reason not to use
them for everything?" Named parameters add call-site verbosity for genuinely simple, single-purpose
functions where positional args are unambiguous (`Point(x, y)`) — reserve named parameters for
where the ambiguity (multiple same-typed parameters, especially booleans) actually exists.

**Pitfall at this level:** applying Open/Closed by adding speculative extension points ("just in
case") for variation that never actually shows up — the principle earns its keep when a second
real implementation appears, not preemptively.

## Lead {concept=oop-solid/team-enforcement}

**Interview question: "How do you make sure a whole team designs APIs the rest of the team can't
misuse, not just the engineers who already internalized this?"**

Concretely, in order of how mechanically enforceable each one is: (1) a **lint rule**
(`avoid_positional_boolean_parameters` in the Dart/Flutter lint set) flagging a function with a
positional `bool` parameter — turns "please use named parameters" into a build failure instead of
a review comment someone might skip. (2) A **codebase convention, written down and checked in
review**, requiring named parameters once a function crosses roughly two same-typed parameters.
(3) An **API review checklist item** specifically for anything crossing a module or team boundary:
does every `bool` read unambiguously at the call site, does every "might not find it" return type
distinguish its failure reasons, does every subtype actually honor its supertype's contract. (4)
For a genuinely new public interface at a module boundary, an **architecture decision record**
requirement, so the trade-off is recorded once instead of re-litigated in every consuming team's
Slack thread.

This is the depth angle for OOP and API design specifically — see the Tech Lead Roadmap article
for how this connects to the wider breadth a Tech Lead needs.

## Cross-language comparison

See the cross-language cheat sheet article for how Kotlin, Java, Swift and TypeScript each answer
the same two questions — or switch the language tab above to read this same topic in another
language directly.

## Pitfalls & trade-offs

- **Mid:** designing the abstract class as a thin wrapper around one existing concrete class
  instead of around what callers actually need.
- **Mid:** treating "it compiles" as proof a subtype is substitutable — a Liskov violation compiles
  and passes any naive type check; it only fails once a caller trusts the parent type's contract.
- **Senior:** a public API signature that lets a consumer misuse it silently — a positional `bool`
  parameter, or a nullable return conflating two different failure reasons.
- **Lead:** writing an API-design convention as a checklist item nobody enforces mechanically.
