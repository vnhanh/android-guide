---
id: testing-senior
title: Designing for Testability, the Layer Decision & Halving a Flake Rate (Senior, Android + iOS)
description: Designing for testability, choosing unit/integration/UI, test infrastructure and screenshot tests, measuring and fixing flake, and testing offline and error paths.
tags: [android, ios, testing, flake, senior]
lang: en
status: complete
domain: 08-testing-and-quality-engineering
band: S
platform: shared
level: Senior
sidebar_position: 2
prerequisites: [testing-mid]
outcomes:
  - "Take a flake rate you have measured and halve it, without deleting the tests"
resources:
  - title: "Robolectric"
    url: "https://robolectric.org/"
    date: "2025-01-01"
  - title: "Snapshot/screenshot testing on iOS"
    url: "https://github.com/pointfreeco/swift-snapshot-testing"
    date: "2024-11-01"
  - title: "Eliminating flaky tests"
    url: "https://testing.googleblog.com/2016/05/flaky-tests-at-google-and-how-we.html"
    date: "2016-05-01"
---

# Designing for Testability, the Layer Decision & Halving a Flake Rate

> **Outcome.** Take a flake rate you have actually measured and halve it — through root-cause
> fixes, not by deleting or quarantining the tests into permanent silence.

## 1. Designing for testability — a design skill in a testing hat

```kotlin
// Hard to test: the ViewModel constructs its own dependency directly — a test
// cannot substitute a fake without a framework like Robolectric plus real Retrofit.
class ProfileViewModel : ViewModel() {
    private val repository = UserRepositoryImpl(RetrofitClient.api, RoomDb.get().userDao())
}

// Testable: the dependency is injected — the SAME change that domain 07's Mid article
// makes for architecture reasons is what makes this trivially fake-able in a test.
class ProfileViewModel(private val repository: UserRepository) : ViewModel()
```

The overlap with domain 07 is not a coincidence — a codebase designed against clean
architecture boundaries is, almost as a side effect, a codebase that's cheap to test; the two
skills reinforce each other rather than competing for effort.

## 2. The layer decision: unit, integration, or UI

```
Unit:        ProfileViewModel + FakeUserRepository — fast, no framework, runs on the JVM/host.
Integration: ProfileViewModel + REAL Room database (in-memory) — catches a query that's
             wrong in a way a fake repository can't reveal, still reasonably fast.
UI:          Full screen rendered, real navigation — catches wiring bugs neither layer
             below can see, slowest and most brittle, reserved for critical flows
             (domain 08's Mid article).
```

> [!IMPORTANT]
> The layer decision is a cost/confidence trade, not a hierarchy where "more UI tests is
> better." A bug in a SQL query is caught cheaply by an integration test against a real
> in-memory database; writing a full UI test to catch the same bug is paying the slowest layer's
> cost for confidence a cheaper layer already provides.

## 3. Test infrastructure: fixtures, builders, screenshot tests

```kotlin
// A builder with sensible defaults — every test constructs only the fields it cares
// about, instead of every test repeating a full, verbose object literal.
fun testUser(
    id: String = "1",
    displayName: String = "Test User",
    isActive: Boolean = true,
) = UserProfile(id, displayName, isActive)

@Test fun `inactive user is not shown in the active list`() {
    val users = listOf(testUser(isActive = true), testUser(id = "2", isActive = false))
    assertEquals(1, filterActive(users).size)
}
```

```kotlin
// Screenshot/snapshot tests catch a class of regression unit tests structurally
// cannot — a layout that visually breaks with no logic error underneath it.
@Test
fun profileScreen_darkMode_matchesSnapshot() {
    paparazzi.snapshot { ProfileScreen(testUser(), isDarkMode = true) }
}
```

## 4. Flake: measuring, quarantining, fixing

```markdown
## Flake measurement — CI test run history, last 30 days

Overall flake rate: 4.2% of CI runs have at least one test fail-then-pass on rerun.
Top offender: `ProfileScreenTest.testAvatarLoads` — flaky in 60% of its failures,
root cause TBD — this is where root-cause effort should go first, not spread evenly
across every occasionally-flaky test.

## Root cause, this specific test
Race between the avatar image load callback and the test's assertion — the test
asserts immediately after triggering the load instead of awaiting the actual
callback, the exact "sleeping instead of awaiting" mistake from domain 08's Mid
article, just harder to see because it's an image callback, not a coroutine.

## Fix
Replace the fixed-delay wait with an IdlingResource that blocks the test until the
image-loading callback actually completes — deterministic, not timing-dependent.
```

> [!WARNING]
> Quarantining a flaky test (marking it non-blocking, silencing its failures) without a tracked
> follow-up is deleting it in slow motion — it stops giving signal immediately and, unlike an
> outright deletion, nobody notices it's stopped mattering. Quarantine is acceptable only as a
> temporary state with a ticket and an owner, exactly like the `@Ignore` rule from domain 08's
> Mid article, applied to flake specifically.

## 5. Testing offline and error paths — where the bugs live

```kotlin
@Test
fun `profile screen shows offline message when network is unavailable`() = runTest {
    val repository = FakeUserRepository().apply { shouldThrowNetworkError = true }
    val viewModel = ProfileViewModel(repository)
    viewModel.loadProfile("123")
    advanceUntilIdle()
    assertEquals(ProfileUiState.Error("No connection"), viewModel.uiState.value)
}
```

> [!NOTE]
> The happy path is the path most manual testing already covers by default — it's what a demo
> exercises. Offline behaviour, a 500 response, a malformed server payload: these are exactly
> the paths a fake repository configured to fail makes cheap to test and easy for manual QA to
> miss entirely, which is why they're disproportionately where field bugs actually live.

## Halving a measured flake rate

The outcome's actual bar: start from the measured number (4.2% above, say), root-cause the
highest-volume offender the way `testAvatarLoads` was diagnosed, fix it without deleting or
permanently quarantining it, re-measure over the next comparable window, and confirm the
overall rate dropped — by roughly half, not merely "some tests got fixed."

## Pitfalls & trade-offs

- **A codebase where testability is only ever "someone else's problem" until a test needs
  writing.** Designing for it up front (dependency injection, clean boundaries) is far cheaper
  than retrofitting testability onto code that was never structured for it.
- **Reaching for a UI test where an integration or unit test would have caught the same bug
  cheaper.** The layer decision is a cost trade, covered above — pick the cheapest layer that
  actually provides the needed confidence.
- **Quarantining a flaky test with no tracked follow-up.** Functionally identical to silently
  deleting it, and worse for visibility — nobody notices coverage that's still nominally there.
- **Fixing flake by spreading effort evenly instead of targeting the highest-volume offender
  first.** The measured data (a specific test failing in 60% of the suite's flaky runs) should
  drive where root-cause effort actually goes.
- **Testing only the happy path.** Offline and error paths are cheap to test with a
  fake configured to fail, and disproportionately where real field bugs live.
