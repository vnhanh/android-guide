---
id: concurrency-mid-android
title: Coroutines, Dispatchers & Lifecycle-Aware Flow (Mid, Android)
description: Choosing scopes and dispatchers deliberately, cooperating with cancellation, and collecting Flow only while the screen can see it.
tags: [android, kotlin, coroutines, flow, concurrency, mid]
lang: en
status: complete
domain: 04-concurrency-and-asynchrony
band: M
platform: android
level: Mid
sidebar_position: 1
prerequisites: [fundamentals-senior-android, platform-mid-android]
outcomes:
  - "Write a screen whose in-flight work stops when the screen goes away, and demonstrate it stopping"
counterpart: concurrency-mid-ios
resources:
  - title: "Coroutines guide — cancellation and timeouts"
    url: "https://kotlinlang.org/docs/cancellation-and-timeouts.html"
    date: "2025-03-01"
  - title: "StateFlow and SharedFlow"
    url: "https://kotlinlang.org/docs/flow.html#stateflow-and-sharedflow"
    date: "2025-03-01"
  - title: "Lifecycle-aware coroutines — repeatOnLifecycle"
    url: "https://developer.android.com/topic/libraries/architecture/coroutines#lifecycle-aware"
    date: "2024-11-01"
  - title: "Best practices for coroutines in Android"
    url: "https://developer.android.com/kotlin/coroutines/coroutines-best-practices"
    date: "2024-11-01"
demo: concurrency-cooperative-cancellation
---

# Coroutines, Dispatchers & Lifecycle-Aware Flow

> **Outcome.** By the end of this article you can write a screen whose in-flight work stops
> when the screen goes away, and you can prove it — with a log line, a test, or the demo below —
> rather than assert it in a PR description.

## 1. `suspend`, scopes and dispatchers — chosen, not defaulted

A `suspend fun` is a function that can pause without blocking the thread it started on. It
carries no thread by itself — the **scope** it runs in decides its lifetime, and the
**dispatcher** decides which thread pool executes it.

```kotlin
class UserProfileViewModel(
    private val repository: UserRepository,
) : ViewModel() {

    // viewModelScope is cancelled automatically when the ViewModel clears —
    // this is the scope decision: it owns exactly the work this screen needs.
    fun loadProfile(userId: String) {
        viewModelScope.launch {
            _uiState.value = ProfileUiState.Loading
            val profile = withContext(Dispatchers.IO) {
                // Dispatcher decision: this does blocking I/O (Room + Retrofit),
                // it must not run on Dispatchers.Main.
                repository.fetchProfile(userId)
            }
            _uiState.value = ProfileUiState.Content(profile)
        }
    }
}
```

The three dispatchers that matter in practice, and the question each answers:

| Dispatcher | Backed by | Use for |
| :--- | :--- | :--- |
| `Dispatchers.Main` | The Android main thread | Touching Views, Compose state, anything UI-adjacent |
| `Dispatchers.IO` | An elastic thread pool (~64 threads) | Blocking calls: disk, network clients that block, database drivers |
| `Dispatchers.Default` | A thread pool sized to CPU cores | CPU-bound work: sorting, parsing, image transforms |

> [!IMPORTANT]
> Picking `Dispatchers.IO` for CPU-bound work is a common Mid-level mistake. `IO` is *elastic* —
> it grows threads to avoid blocking each other — which is wrong for work that saturates a CPU
> core instead of waiting on it. Sorting a 50k-row list on `Dispatchers.IO` competes for CPU with
> everything else on that pool; `Dispatchers.Default` is sized for exactly this.

**Scope, not thread, is the unit you reason about.** `viewModelScope` is tied to the
`ViewModel`'s `onCleared()`. A scope built by hand — `CoroutineScope(SupervisorJob() +
Dispatchers.Default)` inside a singleton repository, for instance — lives as long as its creator
does, which for a singleton is the process. That is sometimes correct (a cache-warming job that
should outlive any one screen) and often an accidental leak (a `Job` nobody ever cancels).

## 2. Cancellation is cooperative — and that is not a caveat, it is the design

Calling `job.cancel()` does not stop a coroutine. It marks the `Job` cancelled and arranges for
the *next* suspension point inside it to throw a `CancellationException`. Between suspension
points, a coroutine runs exactly like any other code — cancellation has no way to interrupt it.

```kotlin
viewModelScope.launch {
    // Every function here is a suspension point: cancellation is checked
    // (deep inside coroutines machinery) when this call is entered.
    val page1 = repository.fetchPage(1)
    val page2 = repository.fetchPage(2) // never reached if cancelled after page1

    // A tight CPU loop is NOT a suspension point. If this loop doesn't call
    // yield() or check isActive, cancelling the job does nothing until it exits.
    var total = 0
    for (i in 0 until 50_000_000) {
        total += heavyCompute(i)
    }
}
```

The fix for the CPU-loop case is to cooperate explicitly:

```kotlin
var total = 0
for (i in 0 until 50_000_000) {
    ensureActive() // throws CancellationException if the job was cancelled
    total += heavyCompute(i)
}
```

> [!NOTE]
> "Cooperative" is the correct trade-off, not a workaround. A cancellation model that could
> interrupt code mid-instruction would leave shared mutable state half-updated at an
> unpredictable point — the exact bug class structured concurrency exists to remove. You pay for
> that safety by having to check in yourself inside anything that doesn't suspend on its own.

`try`/`finally` still runs on cancellation, which is how cleanup survives it:

```kotlin
viewModelScope.launch {
    val connection = openConnection()
    try {
        connection.stream().collect { emit(it) }
    } finally {
        connection.close() // runs even when this coroutine is cancelled mid-collect
    }
}
```

## 3. `StateFlow` vs `SharedFlow` vs cold `Flow`

These three cover almost every stream a screen needs, and picking the wrong one is a recurring
Mid-level review comment.

| Stream | Hot or cold | Replay | Fits |
| :--- | :--- | :--- | :--- |
| `StateFlow<T>` | Hot | Always 1 (current value) | UI state — there is always a "now", a late collector should see it immediately |
| `SharedFlow<T>` | Hot | Configurable, default 0 | One-off events — navigation, a snackbar, "show this once" |
| `Flow<T>` (cold) | Cold | None — restarts per collector | A database query or network stream created fresh for each screen that asks |

```kotlin
class ProfileViewModel(private val repository: UserRepository) : ViewModel() {
    private val _uiState = MutableStateFlow<ProfileUiState>(ProfileUiState.Loading)
    val uiState: StateFlow<ProfileUiState> = _uiState.asStateFlow()

    // Navigation is a one-off event, not state — a StateFlow would replay the
    // last navigation on every new collector (e.g. after a config change),
    // firing it twice. SharedFlow with replay = 0 is the correct fit.
    private val _navigateToEdit = MutableSharedFlow<String>()
    val navigateToEdit: SharedFlow<String> = _navigateToEdit.asSharedFlow()
}
```

> [!WARNING]
> A `StateFlow<Unit>` used to signal "something happened" is the tell that `SharedFlow` was the
> right type and `StateFlow` was reached for out of habit. If a late collector seeing the last
> emission again would be a bug, it is an event, not state.

## 4. Lifecycle-aware collection: `repeatOnLifecycle`

`viewModelScope.launch` alone does not stop collecting when the screen is merely backgrounded —
only when the `ViewModel` is destroyed. A `Flow` collected in `onCreate` (or a naive
`lifecycleScope.launch`) keeps running while the activity is stopped, which wastes work and, for
a `Flow` backed by a `Channel`, can drop or buffer events nobody is there to see.

```kotlin
class ProfileFragment : Fragment() {
    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        viewLifecycleOwner.lifecycleScope.launch {
            // Starts collecting when the lifecycle enters STARTED, cancels the
            // collection when it drops below STARTED (e.g. onStop), and
            // restarts it automatically the next time it re-enters STARTED.
            viewLifecycleOwner.repeatOnLifecycle(Lifecycle.State.STARTED) {
                viewModel.uiState.collect { state ->
                    render(state)
                }
            }
        }
    }
}
```

This is the mechanism behind this article's outcome: a screen that stops its own in-flight
collection the moment it is not visible, and picks back up without re-requesting from scratch
because the underlying `StateFlow` still holds the latest value.

## Pitfalls & trade-offs

- **`GlobalScope.launch`.** Nothing cancels it. It survives the screen, the `ViewModel`, and
  arguably the user's intent — reach for it never in application code; it exists for genuinely
  process-lifetime work, which is rare enough that a named, deliberately-scoped alternative is
  almost always better.
- **`lifecycleScope.launch` without `repeatOnLifecycle`.** Ties the coroutine to `onDestroy`,
  not to visibility — it keeps collecting a backgrounded screen's `Flow`, which is the leak this
  article's outcome is checking for.
- **Swallowing `CancellationException`.** A blanket `catch (e: Exception)` around suspend code
  also catches cancellation, which breaks structured concurrency — the parent no longer learns
  its child stopped for a reason, not a failure. Catch specific exceptions, or re-throw
  `CancellationException` explicitly.
- **`Dispatchers.IO` for CPU-bound work.** Covered above — it is the single most common
  dispatcher-choice mistake at this level.
- **Not testing the "screen goes away" path.** The stated outcome is "demonstrate it stopping" —
  a test that starts collection, moves the `TestLifecycleOwner` below `STARTED`, and asserts the
  collector job is no longer active is the artifact that makes this checkable, not a claim in a
  PR description.
