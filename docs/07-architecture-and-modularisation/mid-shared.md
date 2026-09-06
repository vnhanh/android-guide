---
id: architecture-mid
title: Clean Architecture Boundaries & What Each Pattern Buys (Mid, Android + iOS)
description: Clean Architecture boundaries and what each protects against, layering and DI, MVVM/MVI/UDF trade-offs, and keeping framework types out of domain code.
tags: [android, ios, architecture, clean-architecture, mid]
lang: en
status: complete
domain: 07-architecture-and-modularisation
band: M
platform: shared
level: Mid
sidebar_position: 1
prerequisites: [fundamentals-generics-kotlin, fundamentals-memory-management-kotlin, ui-mid-android, ui-mid-ios]
outcomes:
  - "Add a feature to an existing codebase without adding a single new architectural exception"
resources:
  - title: "Guide to app architecture"
    url: "https://developer.android.com/topic/architecture"
    date: "2025-04-01"
  - title: "The Clean Architecture — Robert C. Martin"
    url: "https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html"
    date: "2012-08-13"
  - title: "Data flow — SwiftUI architecture patterns"
    url: "https://developer.apple.com/documentation/swiftui/managing-model-data-in-your-app"
    date: "2025-06-01"
---

# Clean Architecture Boundaries & What Each Pattern Buys

> **Outcome.** Add a feature to an existing codebase without adding a single new architectural
> exception — no new place where a rule the rest of the codebase follows quietly stops applying.

## 1. Clean Architecture boundaries and what each protects against

The layering is a dependency direction rule, not a folder-naming convention: dependencies point
inward, toward the domain layer, never outward toward a framework.

```kotlin
// Domain layer: no Android import, no Retrofit, no Room. This is the part of the
// codebase that survives a framework migration untouched, because it never knew
// the framework existed.
interface UserRepository {
    suspend fun getProfile(userId: String): UserProfile
}

data class UserProfile(val id: String, val displayName: String)

// Data layer: knows about Retrofit/Room, translates framework types into domain types
// at the boundary. This is the ONLY place a network/database model is allowed to exist.
class UserRepositoryImpl(
    private val api: UserApi,        // Retrofit interface
    private val dao: UserDao,        // Room DAO
) : UserRepository {
    override suspend fun getProfile(userId: String): UserProfile {
        return dao.find(userId)?.toDomain() ?: api.fetchProfile(userId).toDomain()
    }
}
```

```swift
// Same boundary in Swift: the domain protocol has no Foundation networking type,
// no Core Data/SwiftData import — a repository conformance translates at the edge.
protocol UserRepository {
    func getProfile(id: String) async throws -> UserProfile
}

struct UserProfile { let id: String; let displayName: String }
```

Each layer protects against a specific, real cost:

| Layer | Protects against |
| :--- | :--- |
| Domain (entities, use cases) | Business rules coupled to a framework that will eventually change or be replaced |
| Data (repositories, data sources) | UI code reaching directly into a network/database client, making every screen a migration site |
| Presentation (ViewModel, View) | Business logic duplicated per-screen instead of owned in one testable place |

## 2. Layering and DI — how the boundary is actually enforced

The boundary above is a convention until something makes violating it either impossible or
immediately visible. Dependency injection is the mechanism: a `ViewModel` receives a
`UserRepository` **interface**, never a concrete `UserRepositoryImpl`, which is what makes a fake
repository possible in a test without touching any framework code.

```kotlin
class ProfileViewModel(
    private val repository: UserRepository, // interface — DI provides the real impl at runtime,
) : ViewModel() {                            // a fake impl in a test, with zero code changes here
    // ...
}
```

## 3. MVVM, MVI, UDF — what each buys and costs

```kotlin
// MVVM: ViewModel exposes state; the View renders it and calls methods for events.
// Buys: familiar, low ceremony. Costs: state can be mutated from multiple call sites
// inside the ViewModel with no single point enforcing "how did this change."
class ProfileViewModel : ViewModel() {
    var uiState by mutableStateOf(ProfileUiState.Loading)
        private set
    fun retry() { /* mutates uiState directly, from wherever this is called */ }
}

// MVI: a single reducer function is the ONLY place state changes — every event is a
// data class, dispatched through one entry point. Buys: every state transition is
// traceable to one function and one input event. Costs: more ceremony for simple screens.
sealed interface ProfileIntent { data object Retry : ProfileIntent }
class ProfileViewModel : ViewModel() {
    private val _uiState = MutableStateFlow<ProfileUiState>(ProfileUiState.Loading)
    val uiState: StateFlow<ProfileUiState> = _uiState.asStateFlow()
    fun onIntent(intent: ProfileIntent) {
        _uiState.update { current -> reduce(current, intent) } // the ONE place state changes
    }
}
```

UDF (unidirectional data flow) is the property both MVVM-done-well and MVI share: state flows
down to the View, events flow up to the ViewModel, and the View never mutates state directly —
MVI simply enforces UDF more strictly, at the cost of more boilerplate for a screen simple enough
not to need it.

## 4. Keeping framework types out of domain code

```kotlin
// VIOLATION: domain code now knows about Room's @Entity annotation and Retrofit's
// response wrapper — a Room or Retrofit migration touches domain logic, not just the
// data layer that should be the only place framework types live.
data class UserProfile(
    @PrimaryKey val id: String, // Room annotation leaking into the domain model
    val displayName: String,
)
```

> [!IMPORTANT]
> This "stops being pedantry at scale" the moment a second data source, or a framework
> migration, is on the table. On a single-screen prototype, a `@PrimaryKey` on the domain model
> costs nothing. On a codebase with 40 screens sharing that model, migrating from Room to
> SQLDelight — or from Retrofit to Ktor — becomes a domain-layer change instead of a
> contained data-layer one, and every one of those 40 screens is now a review surface for a
> migration that should never have touched them.

## Adding a feature without adding a new exception

The outcome this article checks for is specific: before merging a new feature, ask whether it
required breaking a rule the rest of the codebase follows — a domain type gaining a framework
annotation because "just this once," a ViewModel reaching past its repository interface straight
into a network client because the interface didn't have quite the right method yet. Either of
those is cheaper to fix by extending the existing boundary (add the method to the interface,
keep the annotation in the data layer) than to justify as a one-off — a codebase with five
"just this once" exceptions has, in practice, no rule left, just five special cases nobody
remembers the reason for.

## Pitfalls & trade-offs

- **A framework annotation or import leaking into the domain layer "just this once."** Covered
  above — the cost is invisible until a second data source or a framework migration arrives,
  which is exactly why it's easy to justify in the moment and expensive later.
- **Choosing MVI for a screen simple enough that MVVM's lower ceremony would have served it
  better.** MVI's single-reducer discipline is a real cost for a screen with one piece of state
  and one event — not every screen needs the strictest version of UDF available.
- **A `ViewModel` depending on a concrete implementation instead of an interface.** The
  difference is invisible until the first test tries to fake it and can't.
- **Treating this as a purity exercise instead of a cost/benefit call.** The layering exists to
  protect against specific, nameable costs (stated in the table above) — a rule justified by
  "clean architecture says so" rather than by the cost it prevents is the version that erodes
  under deadline pressure, because nobody can state what breaks if it's skipped.
