---
id: performance-senior-android
title: Perfetto Root-Cause Method, Startup Optimisation & App Size (Senior, Android)
description: Perfetto traces with a repeatable root-cause method, baseline profiles/deferred init/App Startup, micro vs macrobenchmark, R8 shrinking and app size, and battery/background cost.
tags: [android, perfetto, baseline-profiles, r8, benchmarking, senior]
lang: en
status: complete
domain: 09-performance-and-efficiency
band: S
platform: android
level: Senior
sidebar_position: 3
prerequisites: [performance-mid-android]
outcomes:
  - "Take an unexplained p95 cold-start regression to root cause from a trace, and prove the fix with a benchmark that would have caught it"
counterpart: performance-senior-ios
resources:
  - title: "Perfetto"
    url: "https://perfetto.dev/docs/"
    date: "2025-02-01"
  - title: "Macrobenchmark — Baseline Profiles"
    url: "https://developer.android.com/topic/performance/baselineprofiles/overview"
    date: "2025-03-01"
  - title: "Microbenchmark"
    url: "https://developer.android.com/topic/performance/benchmarking/microbenchmark-overview"
    date: "2024-11-01"
  - title: "Shrink, obfuscate, and optimize your app (R8)"
    url: "https://developer.android.com/build/shrink-code"
    date: "2025-05-01"
  - title: "App Startup library"
    url: "https://developer.android.com/topic/libraries/app-startup"
    date: "2024-08-01"
---

# Perfetto Root-Cause Method, Startup Optimisation & App Size

> **Outcome.** Take an unexplained p95 cold-start regression to root cause from a trace, and
> prove the fix with a benchmark that would have caught it before it shipped — root cause
> without a regression-catching benchmark is a one-time fix; the benchmark is what makes it stay
> fixed.

## 1. Perfetto traces and a repeatable root-cause method

```bash
adb shell perfetto \
  -c - --txt \
  -o /data/misc/perfetto-traces/trace.pftrace \
  <<EOF
buffers: { size_kb: 65536 }
data_sources: { config { name: "linux.ftrace" ftrace_config { ftrace_events: "sched/sched_switch" ftrace_events: "power/suspend_resume" } } }
duration_ms: 15000
EOF
```

```
Repeatable root-cause method, applied the same way every time a regression is
reported without a known cause:

1. REPRODUCE with a fixed script (adb shell am start with a cold-start flag,
   a fixed device, airplane mode to remove network variance) — a trace of an
   unreproducible symptom cannot be trusted at the next step.
2. CAPTURE a trace of the reproduced regression AND a trace of a known-good
   build on the same device, same script — comparing two traces from different
   devices or conditions reintroduces the variance step 1 removed.
3. DIFF the two traces' critical path (Perfetto UI's "Slice" view, filtered to
   the main thread) for the widest slice present in the regressed trace and
   absent (or narrower) in the good one.
4. NAME the slice — a specific function, a specific SDK's init call, a specific
   ContentProvider — not "something in startup got slower."
5. FIX, then re-run the SAME script and re-diff to confirm the slice is gone,
   not just that a wall-clock number moved (see benchmark section below for
   making this check automatic).
```

> [!IMPORTANT]
> Step 4 is where most root-cause attempts stop short. "Cold start p95 regressed 180ms" is a
> symptom; "`FirebaseInitProvider.onCreate` grew from 40ms to 220ms because a new SDK's
> `ContentProvider` was added to the merged manifest and runs synchronously on the same
> process-init path" is a root cause — checkable against the trace by anyone, not just the
> person who found it.

## 2. Startup: baseline profiles, deferred init, App Startup

```
Baseline Profiles vs Startup Profiles — the two compilation-hint mechanisms,
easy to conflate:

Baseline Profiles: a list of classes/methods, generated from real user-journey
runs, embedded in the APK/AAB so ART can Ahead-Of-Time (AOT) compile just those
hot paths at install time instead of interpreting/JIT-warming them on first run.
Covers app startup AND any other journey profiled (e.g. first scroll of a feed).

Startup Profiles: narrower — strictly the code path from process creation
through the first interactive frame. Merged into the Baseline Profile at build
time; the distinction matters when deciding what to profile, not at runtime.
```

```kotlin
// Generating a Baseline Profile: a Macrobenchmark test that drives the actual
// critical journeys, run once (or in CI on a schedule) to produce the profile
// committed alongside the app module.
@RunWith(AndroidJUnit4::class)
class BaselineProfileGenerator {
    @get:Rule val rule = BaselineProfileRule()

    @Test
    fun startupAndScrollFeed() = rule.collect(
        packageName = "com.example.app",
        includeInStartupProfile = true,
    ) {
        pressHome(); startActivityAndWait()
        device.findObject(By.res("feed_list")).setGestureMargin(...)
        repeat(5) { device.findObject(By.res("feed_list")).fling(Direction.DOWN) }
    }
}
```

```kotlin
// App Startup: replaces N separate ContentProviders (each with fixed per-provider
// overhead on the process-init path) with ONE, and makes the initializer graph
// explicit instead of implicit in manifest-declaration order.
class AnalyticsInitializer : Initializer<Analytics> {
    override fun create(context: Context): Analytics = Analytics.init(context)
    override fun dependencies(): List<Class<out Initializer<*>>> = emptyList()
}
```

```kotlin
// Deferred init: anything not needed for the FIRST frame moves off the
// synchronous startup path entirely, dispatched after the frame is drawn.
class App : Application() {
    override fun onCreate() {
        super.onCreate()
        // Only what the first frame actually needs runs here, synchronously.
        Window.decorView.post {
            // Everything else — secondary SDKs, prefetching, cache warmup —
            // runs after the first frame is already on screen.
            initSecondarySdks()
        }
    }
}
```

> [!TIP]
> Deferred init trades startup time for a slightly later moment of full readiness — the correct
> trade for anything the first screen doesn't render or need. It is the wrong trade for
> anything the user can interact with in the first second (a deferred crash reporter means a
> crash in that window goes unrecorded); decide per-initializer, not as a blanket policy.

## 3. Micro vs macrobenchmark

| Dimension | Microbenchmark (`androidx.benchmark`) | Macrobenchmark (`androidx.benchmark.macro`) |
| :--- | :--- | :--- |
| **Scope** | A single function/algorithm — JSON parsing, a `Comparator`, a serializer | A full user journey — cold start, scroll jank, navigation |
| **Environment** | In-process, inside the test runner | Out-of-process, drives the real app via UiAutomator |
| **Metrics** | CPU cycles and allocations per call, averaged over thousands of iterations | Frame timing (jank), cold/warm/hot startup latency, trace sections |
| **When it catches a regression** | A specific function got slower in isolation | An end-to-end journey got slower, for any reason on its critical path |

```kotlin
// Microbenchmark: isolates ONE function's cost, immune to everything else
// happening in the app — the right tool when the suspect is a specific algorithm.
@RunWith(AndroidJUnit4::class)
class JsonParseBenchmark {
    @get:Rule val benchmarkRule = BenchmarkRule()

    @Test
    fun parseUserProfile() = benchmarkRule.measureRepeated {
        Json.decodeFromString<UserProfile>(sampleJson)
    }
}
```

```kotlin
// Macrobenchmark: measures the journey as a whole and CAN be wired into CI to
// fail a PR that regresses it — the mechanism that makes root cause "stay fixed."
@RunWith(AndroidJUnit4::class)
class StartupBenchmark {
    @get:Rule val rule = MacrobenchmarkRule()

    @Test
    fun coldStartup() = rule.measureRepeated(
        packageName = "com.example.app",
        metrics = listOf(StartupTimingMetric()),
        iterations = 10,
        startupMode = StartupMode.COLD,
    ) { pressHome(); startActivityAndWait() }
}
```

> [!IMPORTANT]
> This is the specific mechanism this article's outcome names: a `StartupBenchmark` committed
> alongside the fix, run in CI on every PR touching the startup path, with a regression
> threshold that fails the build. Root cause found once and never re-checked drifts back —
> the benchmark, not the fix, is what "would have caught it" refers to.

## 4. App size and R8 shrinking

```
R8 runs as four phases against the merged bytecode, in this order:

1. TREE SHAKING (shrinking): traces reachability from entry points declared in
   AndroidManifest.xml and any explicit -keep rule, then removes every class,
   method, and field nothing reaches — the largest single size win for most
   apps, and the phase a bad -keep rule silently defeats by keeping a whole
   package "just in case."
2. OPTIMIZATION: rewrites the surviving bytecode — inlining short methods,
   removing dead branches, unboxing enums where safe — improving both size and
   runtime speed, not just size.
3. OBFUSCATION: renames remaining classes/members to short, non-meaningful
   names (a.b.c) — a size win as a side effect of shorter symbol tables, plus
   the reverse-engineering friction domain 10 covers.
4. DESUGARING: rewrites modern Kotlin/Java 8+ constructs into bytecode the
   target minSdk's ART can run, independent of the size/obfuscation phases.
```

```bash
# App size analysis: measures what's ACTUALLY in the shipped AAB, split by type —
# the artifact that turns "the app got bigger" into a specific, attributable cause.
./gradlew :app:bundleRelease
# Android Studio → Build → Analyze APK/AAB, or:
bundletool build-apks --bundle=app-release.aab --output=app.apks
bundletool get-size total --apks=app.apks
```

> [!WARNING]
> A `-keep class com.example.thirdpartysdk.** { *; }` rule added to silence an obfuscation
> crash keeps that entire package unshrunk AND unobfuscated — the most common way a team
> "fixes" one crash and quietly gives back a large fraction of R8's size win. Keep the rule as
> narrow as the actual reflection/serialization surface requires, not the whole package.

## 5. Battery and background cost

```
Battery Historian / Energy Profiler attribution, in the order to check first:

1. Wakelocks held longer than the work they guard — the single most common
   field battery complaint, usually a background sync or location update that
   never releases.
2. WorkManager jobs with looser constraints than the work needs (no network-type
   constraint, no battery-not-low constraint) — runs more often than necessary.
3. Foreground services kept alive past their actual active window, each one
   pinning CPU wake and (depending on type) location/mic/camera cost the whole
   time it's alive, whether or not it's still doing useful work.
```

```kotlin
// Constraining a background job to the conditions that actually make it cheap
// to run, rather than "whenever the OS feels like it."
val constraints = Constraints.Builder()
    .setRequiredNetworkType(NetworkType.UNMETERED)
    .setRequiresBatteryNotLow(true)
    .build()
val request = PeriodicWorkRequestBuilder<SyncWorker>(1, TimeUnit.HOURS)
    .setConstraints(constraints)
    .build()
```

## Pitfalls & trade-offs

- **Reporting a wall-clock number moved without naming the slice that moved it.** Not root
  cause — see the method above; a fix without a named cause is a coincidence until proven
  otherwise.
- **Fixing a regression without adding the Macrobenchmark that would have caught it in CI.**
  The fix holds until the next unrelated change regresses the same path silently.
- **A broad `-keep` rule added to silence one obfuscation crash.** Gives back a large share of
  R8's size and reverse-engineering-friction win for the sake of one narrow reflection surface.
- **Deferring initialization for something the user can act on in the first second.** The
  startup-time win is real; so is the cost of a crash reporter or similar safety net that
  wasn't armed yet when it was needed.
- **A background job with looser constraints than its work needs.** Runs more than necessary
  and shows up directly as an avoidable battery cost in the field.
