---
id: fundamentals-oop-solid-java
title: OOP & SOLID in Java — Repository Design, Liskov & the Boolean-Parameter Trap
description: SRP and DIP worked through a Java profile repository, a Liskov violation code review actually catches, and why Java's lack of named arguments makes the Builder pattern the idiomatic fix for boolean-blindness.
tags: [oop, solid, api-design, java, mid, senior, lead]
lang: en
status: complete
domain: 01-programming-fundamentals
platform: shared
band: X
level: Mid
sidebar_position: 8
topic: oop-solid
leaf: Java
prerequisites: []
outcomes:
  - "Write a Java repository that depends on an interface rather than a concrete network/database class, and explain what that buys a test"
  - "Find a Liskov violation by reading a subtype's method body, and redesign a signature so the misuse becomes a compile error"
resources:
  - title: "SOLID — Wikipedia"
    url: "https://en.wikipedia.org/wiki/SOLID"
    date: "2025-01-01"
---

# OOP & SOLID in Java — Repository Design, Liskov & the Boolean-Parameter Trap

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
dependencies, not the concrete Retrofit-equivalent or JDBC class.

Java has no `suspend`/coroutines, so the signature below is shown synchronous for clarity — real
code on a background-thread-averse UI would return `CompletableFuture<UserProfile>` or take a
callback instead; that concurrency choice is this guide's domain 04, not this article.

```java
// SRP + DIP: the repository's only job is deciding where profile data comes from;
// it depends on interfaces, not a concrete Retrofit/JDBC-style class.
interface UserApi {
    UserProfileDto fetchProfile(String userId); // real code: CompletableFuture<UserProfileDto>, or a callback
}
interface UserDao {
    UserProfileEntity find(String userId); // null if not cached
    void insert(UserProfileEntity entity);
}

class UserProfileRepository {
    private final UserApi remote;
    private final UserDao local;

    UserProfileRepository(UserApi remote, UserDao local) {
        this.remote = remote;
        this.local = local;
    }

    UserProfile getProfile(String userId) {
        UserProfileEntity cached = local.find(userId);
        if (cached != null) return cached.toDomain();
        UserProfileDto fresh = remote.fetchProfile(userId);
        local.insert(fresh.toEntity());
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
method signatures. A subclass that throws, returns a sentinel, or silently no-ops on a method its
supertype's contract promised to handle compiles and passes any naive type check — the bug is
invisible until a caller trusts the parent type's contract, usually in production.

**Java's version of the boolean-blindness fix is different from Kotlin's, precisely because Java
has no named arguments.** Two adjacent `Boolean` parameters are a guessing game at any call site,
and there's no language feature to label them — the idiomatic fix is a **Builder**:

```java
// WEAK: no named arguments in Java — a call site like loadImage(ctx, true, true)
// gives the reader zero information about which Boolean means what.
void loadImage(Context context, boolean cache, boolean retry) { ... }

// BETTER: a Builder makes every value self-describing at the call site.
class ImageLoadOptions {
    private boolean useCache = true;
    private boolean retryOnFailure = true;
    static class Builder {
        private final ImageLoadOptions opts = new ImageLoadOptions();
        Builder useCache(boolean v) { opts.useCache = v; return this; }
        Builder retryOnFailure(boolean v) { opts.retryOnFailure = v; return this; }
        ImageLoadOptions build() { return opts; }
    }
}
loadImage(context, new ImageLoadOptions.Builder().useCache(true).retryOnFailure(false).build());
```

The same failure shows up in a return type, not just parameters: a `null` return conflating two
different reasons for failure gives the caller no way to react differently to them — a sealed
interface (Java 17+, see the Error Handling and Pattern Matching articles) is the fix.

**Two more SOLID letters round this out.** **Open/Closed** means adding a new case shouldn't
require editing every `if`/`switch` that already handles the existing cases — the repository
example already shows the mechanism: adding a third data source means writing a new class
implementing `UserApi` or `UserDao`, not editing `UserProfileRepository`'s existing logic.
**Interface Segregation** says a caller should never be forced to depend on methods it doesn't
use — a fat `UserRepository` interface with a dozen methods forces a fake written for one test to
implement eleven methods it will never call; splitting it along the lines callers actually use
fixes this.

**Follow-up:** "Is a Builder always the right fix, or does it have its own cost?" It adds real
boilerplate for a small options set — for two or three booleans, a well-named overloaded
constructor or static factory method (`ImageLoadOptions.cachedWithRetry()`) can be clearer and
cheaper than a full Builder; reserve the Builder for options sets that genuinely grow over time.

**Pitfall at this level:** applying Open/Closed by adding speculative extension points ("just in
case") for variation that never actually shows up — the principle earns its keep when a second
real implementation appears, not preemptively.

## Lead {concept=oop-solid/team-enforcement}

**Interview question: "How do you make sure a whole team designs APIs the rest of the team can't
misuse, not just the engineers who already internalized this?"**

Concretely, in order of how mechanically enforceable each one is: (1) a **static analysis rule**
(Checkstyle, Error Prone) flagging a method with two or more adjacent `boolean` parameters — turns
"please use a Builder or named factory" into a build failure instead of a review comment someone
might skip. (2) A **codebase convention, written down and checked in review**, requiring a Builder
or options object once a method crosses roughly two same-typed parameters. (3) An **API review
checklist item** specifically for anything crossing a module or team boundary: does every `boolean`
read unambiguously at the call site, does every "might not find it" return type distinguish its
failure reasons, does every subtype actually honor its supertype's contract. (4) For a genuinely
new public interface at a module boundary, an **architecture decision record** requirement, so the
trade-off is recorded once instead of re-litigated in every consuming team's Slack thread.

This is the depth angle for OOP and API design specifically — see the Tech Lead Roadmap article
for how this connects to the wider breadth a Tech Lead needs.

## Cross-language comparison

See the cross-language cheat sheet article for how Kotlin, Swift, Dart and TypeScript each answer
the same two questions — or switch the language tab above to read this same topic in another
language directly.

## Pitfalls & trade-offs

- **Mid:** designing the interface as a thin wrapper around one existing concrete class instead of
  around what callers actually need.
- **Mid:** treating "it compiles" as proof a subtype is substitutable — a Liskov violation compiles
  and passes any naive type check; it only fails once a caller trusts the parent type's contract.
- **Senior:** two adjacent `boolean` parameters with no Builder or named factory to disambiguate
  them — a guessing game at every call site, with no language-level fix available in Java.
- **Senior:** reaching for a full Builder on a two- or three-option method where a well-named
  overload or static factory would be clearer and cheaper.
- **Lead:** writing an API-design convention as a checklist item nobody enforces mechanically.
