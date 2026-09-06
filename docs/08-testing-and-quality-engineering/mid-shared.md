---
id: testing-mid
title: What to Test, Fakes Over Mocks & Testing Async Without Sleeping (Mid, Android + iOS)
description: What to test and what not to, fakes over mocks, testing async code without sleeping, one end-to-end test per critical flow, and keeping the suite green.
tags: [android, ios, testing, mid]
lang: en
status: complete
domain: 08-testing-and-quality-engineering
band: M
platform: shared
level: Mid
sidebar_position: 1
prerequisites: [fundamentals-type-system-and-null-safety, fundamentals-oop-and-solid-in-practice, concurrency-mid-android, concurrency-mid-ios]
outcomes:
  - "Write a test that fails for the right reason — change the behaviour and watch it fail, before trusting it"
resources:
  - title: "Turbine — testing Kotlin Flow"
    url: "https://github.com/cashapp/turbine"
    date: "2025-01-01"
  - title: "Swift Testing"
    url: "https://developer.apple.com/documentation/testing"
    date: "2025-06-01"
  - title: "Test doubles: fakes, mocks, stubs"
    url: "https://martinfowler.com/articles/mocksArentStubs.html"
    date: "2007-01-01"
---

# What to Test, Fakes Over Mocks & Testing Async Without Sleeping

> **Outcome.** Write a test that fails for the right reason — deliberately change the behaviour
> it covers and watch it fail — before trusting that it actually tests what it claims to.

## 1. What to test, and the larger question of what not to

```kotlin
// WORTH testing: business logic with branches a reader can get wrong — the actual
// conflict-resolution rule, the actual validation logic, the actual state transition.
fun canSubmitOrder(order: Order): Boolean =
    order.items.isNotEmpty() && order.total > BigDecimal.ZERO && order.shippingAddress != null

// NOT worth testing directly: a getter with no logic, or a third-party framework's
// own behaviour (verifying that Room actually persists a row is testing Room, not this app).
val displayName: String get() = "$firstName $lastName"
```

> [!IMPORTANT]
> "What not to test" is as much a design decision as "what to test." A test suite covering
> every trivial getter and every framework call is expensive to maintain and rarely catches a
> real bug — it catches refactors, which is the opposite of what a good test suite should do.
> Time spent testing logic-free code is time not spent on the branch that will actually break.

## 2. Fakes over mocks, and why a mock-heavy suite locks in the implementation

```kotlin
// MOCK: asserts on HOW the code under test calls its dependency — this test breaks
// the moment the implementation calls the repository differently, even if the
// OBSERVABLE BEHAVIOUR (the screen still shows the right thing) is unchanged.
@Test
fun `mock-heavy test — brittle`() {
    val repository = mock<UserRepository>()
    viewModel.loadProfile("123")
    verify(repository).getProfile("123") // couples the test to the exact call shape
}

// FAKE: a real, working, in-memory implementation of the interface — the test asserts
// on OBSERVABLE BEHAVIOUR (the resulting state), which survives an internal refactor
// of how the ViewModel happens to call the repository.
class FakeUserRepository : UserRepository {
    var profiles = mutableMapOf<String, UserProfile>()
    override suspend fun getProfile(id: String): UserProfile =
        profiles[id] ?: throw NoSuchElementException()
}

@Test
fun `fake-based test — survives an internal refactor`() {
    val repository = FakeUserRepository().apply { profiles["123"] = UserProfile("123", "Alex") }
    val viewModel = ProfileViewModel(repository)
    viewModel.loadProfile("123")
    assertEquals(ProfileUiState.Content(UserProfile("123", "Alex")), viewModel.uiState.value)
}
```

> [!WARNING]
> A suite that's mostly `verify()` calls against mocks is testing the implementation's shape,
> not its behaviour — it locks in exactly the internal structure the test was written against,
> and every internal refactor (even a correct, behaviour-preserving one) breaks tests that
> should have kept passing. A fake, once written, is reusable across every test that needs that
> dependency and tests what the code actually does, not how it happens to call something.

## 3. Testing async code without sleeping

```kotlin
// WRONG: sleeping a fixed duration is slow (always waits the full time) AND flaky
// (fails under system load if the operation takes even slightly longer than guessed).
@Test
fun `flaky — do not do this`() = runTest {
    viewModel.loadProfile("123")
    delay(500) // guessing how long the coroutine needs
    assertEquals(ProfileUiState.Content(profile), viewModel.uiState.value)
}

// RIGHT: runTest's virtual time advances coroutines deterministically with no real
// delay — this test runs instantly and never flakes on timing.
@Test
fun `deterministic — advances virtual time, no real delay`() = runTest {
    viewModel.loadProfile("123")
    advanceUntilIdle() // runs every pending coroutine to completion, in virtual time
    assertEquals(ProfileUiState.Content(profile), viewModel.uiState.value)
}
```

```swift
// Swift Testing / XCTest: await the actual async call directly rather than sleeping —
// the async/await model makes this the natural default, unlike a callback-based API
// where a fixed sleep used to be the common (wrong) workaround.
@Test func loadProfileSucceeds() async throws {
    let viewModel = ProfileViewModel(repository: FakeUserRepository(profiles: ["123": profile]))
    await viewModel.load(userId: "123")
    #expect(viewModel.state == .content(profile))
}
```

## 4. One end-to-end test per critical flow

A small number of true end-to-end tests (checkout, sign-in, the flows that would be a genuine
incident if broken) catch the integration bugs unit tests structurally cannot — a correct
`ViewModel` and a correct `Repository`, each unit-tested in isolation, can still fail together if
wired incorrectly. One per critical flow, not one per screen — end-to-end tests are the slowest
and most maintenance-expensive layer, reserved for what would actually hurt if it silently broke.

## 5. Keeping the suite green — no silent `@Ignore`

```kotlin
// A silently disabled test is a false "the suite is green" — worse than no test at all,
// because it looks like coverage that doesn't exist.
@Ignore("flaky, investigate later") // <- "later" rarely comes; this rots silently
@Test fun someFlakyTest() { ... }
```

> [!IMPORTANT]
> A disabled test needs a filed ticket and a review cadence, or it needs to be deleted — an
> `@Ignore` with a comment and no tracked follow-up is a test the suite is lying about having.
> Domain 08's Senior article covers fixing flake properly; this Mid-level rule is simpler: never
> let a disabled test become invisible.

## Proving the outcome

The checkable version of "write a test that fails for the right reason": after writing any test,
deliberately break the specific behaviour it claims to cover — flip the conditional, change the
expected value — and confirm the test actually fails. A test that still passes after the
behaviour it's meant to cover was broken was never testing that behaviour at all.

## Pitfalls & trade-offs

- **Testing trivial, logic-free code instead of the branches that can actually be wrong.**
  Covered above — this is time spent on coverage numbers, not on catching real bugs.
- **A mock-heavy suite that breaks on every internal refactor.** Covered above — fakes survive
  behaviour-preserving refactors; mocks asserting on call shape do not.
- **Sleeping a fixed duration to "wait for" async code.** Slow and flaky in exactly the ways
  virtual-time test schedulers exist to eliminate.
- **More than a handful of end-to-end tests, one per screen instead of one per critical flow.**
  The slowest, most brittle layer — reserve it for what would actually be an incident if broken.
- **A silently `@Ignore`d test with no tracked follow-up.** Worse than no test — it reports
  coverage that no longer exists.
