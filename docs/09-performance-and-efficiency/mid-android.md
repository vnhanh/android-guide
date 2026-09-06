---
id: performance-mid-android
title: Frame Budget, Profiler Literacy & Reading a Startup Trace (Mid, Android)
description: The rendering pipeline and frame budget, CPU/memory/energy profiler literacy, common leak patterns with LeakCanary, and reading a startup trace.
tags: [android, performance, profiling, memory-leaks, mid]
lang: en
status: complete
domain: 09-performance-and-efficiency
band: M
platform: android
level: Mid
sidebar_position: 1
prerequisites: [platform-process-lifecycle-and-death, platform-startup-sequencing-and-diagnostics, ui-mid-android]
outcomes:
  - "Identify the cause of a janky screen with a profiler, in one sentence naming the frame-budget overrun"
counterpart: performance-mid-ios
resources:
  - title: "Android Studio Profiler overview"
    url: "https://developer.android.com/studio/profile"
    date: "2025-03-01"
  - title: "Jetpack Macrobenchmark: understanding jank"
    url: "https://developer.android.com/topic/performance/vitals/render"
    date: "2025-01-01"
  - title: "LeakCanary"
    url: "https://square.github.io/leakcanary/"
    date: "2024-06-01"
---

# Frame Budget, Profiler Literacy & Reading a Startup Trace

> **Outcome.** Identify the cause of a janky screen with a profiler, in one sentence naming the
> frame-budget overrun — not "the list feels slow," but "measure() on row 40 takes 22ms against
> a 16ms budget."

## 1. Frame budget and the rendering pipeline

```
A frame at 60Hz has 16.6ms to go from "state changed" to "pixels on screen." At
120Hz that budget is 8.3ms. Missing it once is a dropped frame; missing it
repeatedly is jank a user names without being asked.

Per-frame pipeline, in order:
Input → Measure → Layout → Draw (recordCanvas ops) → Sync → RenderThread → GPU
```

```kotlin
// The most common way a Compose screen blows the budget: recomposition scope is
// too wide, so an unrelated state change re-measures/re-lays-out a whole screen.
@Composable
fun ProfileScreen(viewModel: ProfileViewModel) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    // BAD: every field read here widens this composable's recomposition scope to
    // the entire state object — an unrelated field changing recomposes everything.
    Column {
        Header(state.title)
        ExpensiveChart(state.chartData)   // recomposes even when only title changed
    }
}
```

> [!TIP]
> Layout Inspector's "recomposition counts" overlay names which composables re-ran on a given
> frame. A composable recomposing every frame with no visible reason is almost always reading
> more state than it renders — narrow what it reads, not what it renders.

## 2. Profiler literacy: CPU, memory, energy

```
Android Studio Profiler, three lenses on the same janky screen:

CPU Profiler (System Trace): shows the actual per-frame timeline — which thread
was busy, for how long, during the dropped frame. This is where "frame budget
overrun" gets a name: a specific method occupying a specific slice of a specific
frame.

Memory Profiler: heap size over time, and allocation count per action. A sawtooth
that never returns to baseline after GC is a leak; frequent small-object churn
during scroll is the "jank from GC pauses" pattern, not a leak.

Energy Profiler: attributes battery draw to CPU, network, GPS, wakelocks. A
screen holding a wakelock or polling location after the user has navigated away
is the single most common energy complaint in the field.
```

> [!IMPORTANT]
> Profile a **release-configured, unplugged, physical device** build whenever the numbers will
> inform a decision. A debug build disables R8 and runs with debugging hooks active; profiling
> it and then citing the number in a ticket measures the tooling, not the app users run.

## 3. Common leak patterns

```kotlin
// LEAK: the singleton outlives the Activity it holds a reference to.
object AnalyticsManager {
    private var listener: ((Event) -> Unit)? = null
    fun register(l: (Event) -> Unit) { listener = l }   // never unregistered
}

class ProfileActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        AnalyticsManager.register { event -> updateUi(event) }  // captures `this`
    }
}
```

```kotlin
// FIX: bind the collection to a lifecycle scope that cancels automatically, and
// stop treating "listener" as a manually-managed resource at all.
viewLifecycleOwner.lifecycleScope.launch {
    viewLifecycleOwner.repeatOnLifecycle(Lifecycle.State.STARTED) {
        viewModel.uiState.collect { state -> render(state) }
    }
}
```

```
LeakCanary's heap-dump report names the retaining path directly:

┬───
│ GC Root: System class
│
├─ com.example.AnalyticsManager class
│    Leaking: NO (it's a static field, expected to be retained)
│    ↓ static AnalyticsManager.listener
│                              ~~~~~~~~
├─ com.example.ProfileActivity$onCreate$1 instance
│    Leaking: YES (ProfileActivity#this0 is not null and Activity#mDestroyed is true)
```

That path — `static field → lambda → Activity#this0, mDestroyed=true` — is the pattern to
recognize, not just this specific example: a long-lived holder (singleton, static field, a
background thread) keeping a strong reference to something that has a `Context` or `View`
attached, past that thing's lifecycle end.

> [!WARNING]
> `lifecycleScope.launch` alone does **not** cancel on `onStop`/`onPause` — it cancels on
> destroy. A collector started in `onCreate` with plain `lifecycleScope.launch` keeps collecting
> (and keeping the emitter's chain warm) while the screen is stopped. `repeatOnLifecycle` is the
> mechanism that actually starts/stops with the lifecycle state, not just with destruction.

## 4. Reading a startup trace

```
System Trace (Perfetto, captured via Android Studio Profiler's "System Trace"),
reading order for a cold-start trace:

1. Find the app process's first thread creation — this is t=0 for "cold start."
2. Find Application.onCreate's slice — its width is fixed init cost, on the main
   thread, before anything else can run.
3. Find the first frame drawn (look for "Choreographer#doFrame" reaching the
   Activity's content) — the gap between t=0 and this is total cold-start time.
4. Anything wide inside that gap that ISN'T layout/draw — a synchronous network
   call, a database open, a large JSON parse — is deferrable work incorrectly
   running on the critical path.
```

> [!TIP]
> The habit to build now, before domain 09's Senior article's tooling: name the widest
> non-rendering slice on the critical path, in the trace, out loud — "SDK X's `init()` call
> is 340ms of the 900ms cold start" is a claim a teammate can check against the same trace;
> "startup feels slow" is not.

## Pitfalls & trade-offs

- **Profiling a debug build and citing the number as representative.** R8 shrinking and
  debug-only hooks change the numbers enough to invalidate the comparison.
- **A composable reading more state than it renders, widening its recomposition scope.** The
  single most common Compose-specific cause of a dropped frame that has nothing to do with
  actual layout complexity.
- **Treating every memory sawtooth as a leak.** GC-driven allocation churn during scroll looks
  similar at a glance; the distinguishing signal is whether the baseline after GC keeps rising
  across repeated actions, not whether a single graph has peaks.
- **`lifecycleScope.launch` without `repeatOnLifecycle`.** Keeps collecting through
  `onStop`, which both wastes work and keeps upstream emitters warm longer than needed.
- **Reading "startup feels slow" as a diagnosis instead of a symptom.** The trace names the
  actual wide slice; anything short of that is a guess dressed as a finding.
