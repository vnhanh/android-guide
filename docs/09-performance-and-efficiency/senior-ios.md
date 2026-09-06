---
id: performance-senior-ios
title: os_signpost, Launch Ordering & Binary Size (Senior, iOS)
description: os_signpost and custom instruments, launch optimisation via dyld and order files, XCTest performance baselines, binary size and Swift metadata, and energy log analysis.
tags: [ios, signpost, dyld, binary-size, xctest-metrics, senior]
lang: en
status: complete
domain: 09-performance-and-efficiency
band: S
platform: ios
level: Senior
sidebar_position: 4
prerequisites: [performance-mid-ios]
outcomes:
  - "Take an unexplained regression to root cause from a trace, noting Swift is already AOT-compiled so there is no baseline-profile lever — the equivalent is launch ordering"
counterpart: performance-senior-android
resources:
  - title: "os_signpost"
    url: "https://developer.apple.com/documentation/os/logging/recording_performance_data"
    date: "2024-10-01"
  - title: "Reducing your app's launch time"
    url: "https://developer.apple.com/documentation/xcode/reducing-your-app-s-launch-time"
    date: "2025-05-01"
  - title: "XCTMetric and performance tests"
    url: "https://developer.apple.com/documentation/xctest/performance_tests"
    date: "2024-09-01"
  - title: "MetricKit"
    url: "https://developer.apple.com/documentation/metrickit"
    date: "2025-02-01"
---

# os_signpost, Launch Ordering & Binary Size

> **Outcome.** Take an unexplained regression to root cause from a trace, noting explicitly that
> Swift is already ahead-of-time compiled — so Android's baseline-profile lever has no iOS
> equivalent — and stating instead which launch-ordering change (dyld binding order, order
> files) is doing the equivalent work.

## 1. `os_signpost` and custom instruments

```swift
import os.signpost

let log = OSLog(subsystem: "com.example.app", category: "FeedLoad")

func loadFeed() {
    let id = OSSignpostID(log: log)
    os_signpost(.begin, log: log, name: "LoadFeed", signpostID: id)
    defer { os_signpost(.end, log: log, name: "LoadFeed", signpostID: id) }
    // ... the work being measured
}
```

```
A signpost marks a named interval directly in Instruments' timeline, at the
exact call site — the direct analogue of a Perfetto trace event, but authored
in-app rather than only observed from outside. A custom Instruments template
(Instruments → File → New → from the os_signpost points category) turns a set
of signposts into a reusable, shareable measurement tool for a specific
regression class, rather than a one-off Time Profiler session re-derived by
hand each time.
```

> [!TIP]
> Signpost the SUSPECT before profiling generally, not after. A named interval around "the SDK
> init call everyone suspects" turns Time Profiler's general-purpose call tree into a targeted
> before/after comparison — the same discipline as naming the widest slice in a Perfetto trace,
> just authored proactively instead of found retroactively.

## 2. Launch: dyld, order files, deferred init

```
Cold launch's real phases, in order — and where Swift's AOT compilation removes
a lever Android has:

1. dyld loads the binary and every dynamic library/framework it links, resolves
   symbols, runs static initializers — "pre-main time." Swift code is already
   compiled to native machine code at build time (no interpreter warm-up, no
   JIT, no AOT-vs-JIT choice at all) — there is NO equivalent of a Baseline
   Profile to generate here, because there's no interpreted/JIT phase to
   short-circuit. The lever that exists instead is ORDER: which symbols dyld
   has to resolve, and in what order they're laid out in the binary.
2. `application(_:didFinishLaunchingWithOptions:)` runs your init code.
3. First frame commits.
```

```
# An order file (a plain list of symbol names, one per line, in the desired
# link order) tells the linker to lay out functions in the binary in the order
# they're actually called during launch, so dyld's page-ins during launch are
# sequential reads instead of scattered ones across the binary.
_OBJC_CLASS_$_AppDelegate
-[AppDelegate application:didFinishLaunchingWithOptions:]
_OBJC_CLASS_$_FeedViewController
...
```

```
// Linked via Xcode build setting: ORDER_FILE = $(SRCROOT)/Launch.order
```

> [!IMPORTANT]
> This is the direct answer to this article's outcome statement. Android's Senior article
> reaches for a Baseline Profile because ART has an interpret/JIT phase a profile can bypass.
> Swift has no such phase — the code is already native. The equivalent-in-effect lever is launch
> ORDERING: an order file reduces page-ins and symbol-resolution scatter during dyld's pass,
> which is the iOS-shaped version of "make the critical path cheaper to execute," not "make it
> compile faster," because it was never interpreted to begin with.
```

```swift
// Deferred init: same principle as Android — anything not needed for the
// first frame moves off the synchronous launch path.
func application(_ application: UIApplication,
                  didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
    configureEssentials() // only what the first screen needs
    DispatchQueue.main.async {
        self.configureSecondarySDKs() // after the first frame is already up
    }
    return true
}
```

## 3. XCTest metrics and performance baselines

```swift
import XCTest

final class LaunchPerformanceTests: XCTestCase {
    func testColdLaunch() throws {
        let app = XCUIApplication()
        let options = XCTMeasureOptions()
        options.iterationCount = 10
        measure(metrics: [XCTApplicationLaunchMetric()], options: options) {
            app.launch()
        }
    }
}
```

```
XCTest performance tests store a BASELINE per metric, per device/configuration,
in the test target. A subsequent run compares against that stored baseline and
FAILS the test if the new run regresses beyond a configured tolerance — set the
baseline (Xcode's test navigator → the metric's disclosure triangle → "Set
Baseline") once a good run is established, and the test becomes CI's regression
gate the same way a Macrobenchmark assertion does on Android.
```

> [!IMPORTANT]
> A baseline set once and never revisited silently drifts — legitimate work (a new required
> SDK, a design that needs one more frame of setup) will regress the metric for a real reason,
> and the test should be re-baselined deliberately at that point, not have its tolerance widened
> quietly to make it pass.

## 4. Binary size and Swift metadata

```
Swift binaries carry TYPE METADATA — runtime-reflectable descriptors for every
generic, every protocol conformance, every struct/enum layout — that Objective-C
binaries didn't need to the same degree. This is the direct cost side of Swift's
generics and protocol system, and it is where iOS binary size work concentrates
that has no close Android analogue (R8's obfuscation renames symbols; it isn't
stripping a runtime type-reflection system that doesn't exist on the JVM).
```

```bash
# Link-time dead code stripping — the closest analogue to R8's tree-shaking,
# though it strips at the linker/whole-module level rather than R8's
# call-graph-reachability analysis.
# Build setting: DEAD_CODE_STRIPPING = YES (default), plus:
# SWIFT_COMPILATION_MODE = wholemodule for Release, enabling cross-file
# optimization that can eliminate more dead code than per-file compilation sees.
```

```bash
# App Thinning / binary size report — Xcode Organizer → App Sizes, or:
xcrun bitcode_strip # (legacy) — modern equivalent: inspect via
# Xcode → Product → Archive → Distribute App → App Store Connect,
# "App Size Report" tab, which attributes size per slice (device/OS variant).
```

> [!WARNING]
> Reducing generic and protocol-existential use IS a real binary-size lever on iOS, in a way
> that has no direct Android equivalent — every generic specialization and every existential
> container can add metadata. This is not a reason to avoid generics; it is a reason to know
> that "make it generic for reuse" is not size-neutral the way it usually is on the JVM.

## 5. Energy log analysis

```
Instruments' Energy Log instrument attributes battery draw to CPU, networking,
GPU, and location — the same three-way split Android's Energy Profiler makes.
The iOS-specific thing to check first: BACKGROUND APP REFRESH and silent push
handling running heavier work than their budget allows, since the OS enforces
(and will throttle/kill) processes that overspend their background execution
time, unlike a wakelock which Android lets an app hold indefinitely if the app
doesn't release it.
```

## Pitfalls & trade-offs

- **Reaching for "the baseline-profile equivalent" on iOS and finding nothing, then giving up
  on the startup lever entirely.** The equivalent-in-effect is launch ordering (order files),
  not compilation hints — see the boxed note above.
- **A performance baseline set once and left untouched as the app legitimately grows.** Silent
  drift either direction — an unexamined regression passing, or real necessary growth failing
  a stale gate — re-baseline deliberately, not by widening tolerance to make red go green.
- **Adding generics/protocol existentials freely, assuming size-neutrality the JVM would give.**
  Swift's runtime metadata makes this a real, measurable binary-size cost on iOS specifically.
- **Profiling energy cost without checking Background App Refresh first.** The OS's own
  background-execution throttling is the most common iOS-specific energy story, distinct from
  Android's "wakelock held too long" pattern.
- **Treating a signpost as optional instrumentation added only when a bug shows up.** Signposts
  authored around the current suspect before profiling turn a general Time Profiler session
  into a targeted one.
