---
id: fundamentals-oop-and-solid-in-practice
title: OOP & SOLID in Practice, Across Five Languages
description: SRP, DIP and LSP worked against the same repository example in five languages, then library-quality API design and the team-level mechanisms that make good design the default.
tags: [oop, solid, api-design, kotlin, java, swift, dart, typescript, mid, senior, lead]
lang: en
status: complete
domain: 01-programming-fundamentals
platform: shared
band: X
level: Mid
sidebar_position: 8
prerequisites: []
outcomes:
  - "Write a repository that depends on an interface/protocol rather than a concrete network/database class, in any of the five languages, and explain what that buys a test"
  - "Find a Liskov violation by reading a subtype's method body, and redesign a public API signature so a specific stated misuse becomes a compile error instead of a silent bug"
  - "Name the review mechanism that stops the rest of the team from shipping the same API misuse once, let alone twice"
resources:
  - title: "SOLID — Wikipedia"
    url: "https://en.wikipedia.org/wiki/SOLID"
    date: "2025-01-01"
  - title: "Api guidelines for Kotlin libraries"
    url: "https://kotlinlang.org/docs/jvm-api-guidelines-introduction.html"
    date: "2024-11-01"
  - title: "Swift API Design Guidelines"
    url: "https://www.swift.org/documentation/api-design-guidelines/"
    date: "2025-01-01"
---

# OOP & SOLID in Practice, Across Five Languages

SOLID isn't a checklist to satisfy before a PR is "done," it's a set of answers to "why did this
change take three days instead of one." Each letter names one specific way a design makes change
expensive: a class doing two jobs means touching one breaks the other; a class depending on a
concrete type means testing it means running that concrete type for real; a subtype that lies
about what it can do means a caller's correct assumption becomes a production incident. This
article grounds all five principles in one worked example — a profile repository that can source
data from the network or a local cache — carried across Kotlin, Swift, Java, Dart, and
TypeScript, so the pattern reads as a language-independent shape rather than a Kotlin trick or a
Swift trick.

## Mid

**Interview question: "Why does the code depend on an interface/protocol instead of the concrete
network/database class?"**

Because that's the whole mechanism behind two of the five principles at once. **Single
Responsibility**: the repository's only job is deciding whether profile data comes from cache or
network — it does not parse JSON, log analytics, or format anything for display, so a change to
any of those never touches it. **Dependency Inversion**: the repository depends on an
interface/protocol for its network and cache dependencies, not the concrete Retrofit-equivalent
or database class — which is what makes the next paragraph possible at all. A fake implementing
the same interface can stand in for either dependency in a test, with no framework, no network
call, and no real database involved.

**Kotlin.**

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

**Swift.**

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

**Java.** Java has no `suspend`/coroutines, so the signature below is shown synchronous for
clarity — real code on a background-thread-averse UI would return `CompletableFuture<UserProfile>`
or take a callback instead; that concurrency choice is this guide's domain 04, not this article.

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

**Dart.** Dart has no separate `interface` keyword — an `abstract class` plays that role, and any
class implicitly satisfies it by implementing the same methods.

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

**TypeScript.**

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

**Follow-up an interviewer asks next:** "What does this actually buy you, concretely?" A unit
test for `getProfile` that never touches a real network or database — a fake `UserApi`/`UserDao`
returning canned data in memory, running in milliseconds, with no test server and no flaky CI
step. That is the entire payoff of DIP stated without abstraction: swap the implementation, keep
the test.

**Pitfall at this level:** writing the interface after the concrete class, as a thin wrapper
around whatever the concrete class already does, rather than designing it around what the
*caller* needs. An interface shaped by its one existing implementation still leaks that
implementation's assumptions — the abstraction hasn't actually decoupled anything yet.

## Senior

**Interview question: "What's actually wrong with a subtype that throws on a method its parent
promised to handle?"**

It breaks Liskov substitution: a subtype must honour its parent's contract, not just match its
method signatures. A caller holding a reference to the parent type has no way to know, from the
type alone, that this particular instance will always fail — the bug is invisible until it's in
production, because it compiles and passes any naive type check.

**Kotlin.**

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

**Swift.**

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

Java, Dart, and TypeScript all have the same shape available — a subclass (Java, Dart) or a class
implementing an interface it can't fully honor (TypeScript) that throws, returns a sentinel, or
silently no-ops on a method its supertype's contract promised to handle. The language changes;
the review judgment — "does every subtype actually honor what callers of the parent type are
entitled to assume" — does not.

Liskov violations are a design-time bug. The other half of Senior-level design is API surface a
whole other team will consume without ever reading its implementation — and the outcome that
matters there is naming, for each public signature, the specific mistake a caller will make, and
shaping the signature so that mistake is a compile error instead of a silent bug.

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
different reasons for failure gives the caller no way to react differently to them.

```kotlin
// WEAK: returns null for "not found" AND for "network error" — a caller cannot
// distinguish "retry" from "this genuinely doesn't exist" without extra state.
suspend fun fetchUser(id: String): User?

// BETTER: a sealed result names every outcome a caller must handle, and the
// compiler enforces exhaustive handling via `when`.
sealed interface FetchResult<out T> {
    data class Success<T>(val value: T) : FetchResult<T>
    data class NotFound(val id: String) : FetchResult<Nothing>
    data class NetworkError(val cause: Throwable) : FetchResult<Nothing>
}
suspend fun fetchUser(id: String): FetchResult<User>
```

Swift's version of the same discipline adds a naming rule the Kotlin example doesn't need to
state separately: the Swift API Design Guidelines' central instruction is that a call should read
as a clear English phrase, not a checklist of positional arguments.

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

Two more SOLID letters round this out, and both are mechanism-first rather than per-language code.
**Open/Closed** — a type should be open to extension but closed to modification — means adding a
new case shouldn't require editing every `if`/`switch` that already handles the existing cases.
The repository example already shows the mechanism: adding a third data source (say, a
disk-backed image cache) means writing a new class that implements `UserApi` or `UserDao`, not
editing `UserProfileRepository`'s existing logic. A codebase that needs `UserProfileRepository`
itself to change every time a new backend is added has an Open/Closed problem, not a "just add
another `if` branch" problem. **Interface Segregation** says a caller should never be forced to
depend on methods it doesn't use — a fat `UserRepository` interface with a dozen methods
(`getProfile`, `getSettings`, `getFriendsList`, `getBillingHistory`, …) forces a fake written for
one test to implement eleven methods it will never call, just to satisfy the compiler. Splitting
that interface along the lines callers actually use — a `ProfileReader`, a `SettingsReader`,
each with one or two methods — means a test faking profile lookups implements exactly one method,
and a change to billing logic can't possibly break a profile test's fake by changing an unrelated
method's signature.

## Lead

**Interview question: "How do you make sure a whole team designs APIs the rest of the team can't
misuse, not just the engineers who already internalized this?"**

The same enforcement-mechanism thinking this domain applies to language idioms generally, aimed
specifically at API surfaces: a rule that lives only in one senior engineer's head, or in a wiki
page nobody re-reads mid-sprint, decays the first time someone is in a hurry. Concretely, in order
of how mechanically enforceable each one is: (1) a **lint rule** where the language supports one —
a Kotlin `detekt` rule flagging a function with two or more adjacent `Boolean` parameters, an
ESLint rule flagging more than two positional parameters of the same primitive type — turns "please
use named options" into a build failure instead of a review comment someone might skip. (2) A
**codebase convention, written down and checked in review**, requiring a named-and-defaulted
options object (or Swift's labelled-parameter equivalent) once a function crosses roughly two
same-typed parameters, rather than leaving the threshold to individual judgment. (3) An **API
review checklist item** specifically for anything crossing a module or team boundary: does every
`Boolean` read unambiguously at the call site, does every "might not find it" return type
distinguish its failure reasons, does every subtype actually honor its supertype's contract. (4)
For a genuinely new public interface at a module boundary — not a one-off function, the shape of
thing other teams will build against for years — an **architecture decision record** requirement,
so the trade-off (why this shape, what misuse it forecloses, what it costs) is recorded once
instead of re-litigated in every consuming team's Slack thread. None of these replace engineers
understanding SOLID; they make correct API design the path of least resistance for the engineer
who hasn't internalized it yet, which is the only version of "the team designs good APIs" that
survives turnover.

This is the depth angle for OOP and API design specifically — see the Tech Lead Roadmap article
for how this connects to the wider breadth a Tech Lead needs.

## Cross-language comparison table

| | Kotlin | Java | Swift | Dart | TypeScript |
|---|---|---|---|---|---|
| Interface/protocol keyword | interface | interface | protocol | abstract class (or implicit interfaces) | interface |
| Constructor injection idiom | primary constructor params | constructor params | init(...) | constructor params | constructor params or factory function |
| Named+defaulted params to avoid boolean-blindness | named args + default values | no named args — needs a Builder or overloads | labeled params + default values | named params (curly-brace syntax) + defaults | object parameter with optional properties |

## Pitfalls & trade-offs

- **Mid:** designing the interface as a thin wrapper around one existing concrete class instead of
  around what callers actually need — DIP without a caller-first interface still leaves the
  abstraction leaking the original implementation's assumptions.
- **Mid:** treating "it compiles" as proof a subtype is substitutable — the Liskov violation above
  compiles and passes any naive type check; it only fails once a caller trusts the parent type's
  contract, usually in production.
- **Senior:** a public API signature that lets a consumer misuse it silently — two unlabelled
  Boolean parameters, or a nullable return conflating two different failure reasons — both compile
  fine and both get reviewed away only by naming, and then removing, the specific misuse each
  design invites.
- **Senior:** applying Open/Closed by adding speculative extension points ("just in case") for
  variation that never actually shows up — the principle earns its keep when a second real
  implementation appears, not preemptively.
- **Senior:** an Interface Segregation split taken too far — a dozen single-method interfaces for
  a type that only ever has one real implementation and one real caller adds indirection with no
  matching test-isolation benefit.
- **Lead:** writing an API-design convention as a checklist item nobody enforces mechanically — the
  same failure mode a lint rule or CI check exists to close, and the same reason the mechanism, not
  the rule's existence, is what should be reported on in a retro.
