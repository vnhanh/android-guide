---
id: performance-mid-ios
title: The Render Loop, Instruments Literacy & Reading a Launch Trace (Mid, iOS)
description: The render loop and hitch ratio, Instruments Time Profiler/Allocations/Leaks, retain cycles and ARC leak patterns, and reading a launch trace.
tags: [ios, performance, instruments, retain-cycles, mid]
lang: en
status: complete
domain: 09-performance-and-efficiency
band: M
platform: ios
level: Mid
sidebar_position: 2
prerequisites: [platform-senior-ios, ui-mid-ios]
outcomes:
  - "Identify the cause of a janky screen with a profiler, stated in hitch ratio rather than dropped frames — the two are not interchangeable"
counterpart: performance-mid-android
resources:
  - title: "Instruments — Time Profiler"
    url: "https://developer.apple.com/documentation/xcode/analyzing-the-performance-of-your-app"
    date: "2025-04-01"
  - title: "Measuring hitches — WWDC"
    url: "https://developer.apple.com/videos/play/wwdc2023/10248/"
    date: "2023-06-01"
  - title: "Finding memory leaks with Instruments"
    url: "https://developer.apple.com/documentation/xcode/gathering-information-about-memory-use"
    date: "2025-01-01"
---

# The Render Loop, Instruments Literacy & Reading a Launch Trace

> **Outcome.** Identify the cause of a janky screen with a profiler, stated in **hitch ratio**
> rather than dropped frames — the two are not interchangeable, and reporting one as if it were
> the other is the specific mistake this article's outcome rules out.

## 1. The render loop and hitch ratio

```
UIKit/SwiftUI's render loop, per frame: the run loop wakes, layout and display
work run, CADisplayLink commits the result before the display's next refresh
deadline. ProMotion displays vary their refresh rate (up to 120Hz, as low as
10Hz) — the deadline itself is not fixed the way Android's 16.6ms is.

Because the deadline moves, Apple does not report "dropped frames" as the
primary number. It reports HITCH RATIO: hitched time (ms) per second of
scrolling/animating content, from Instruments' Animation Hitches instrument —
a duration-weighted measure that stays meaningful across variable refresh rates.
```

> [!IMPORTANT]
> "We dropped 3 frames" is an Android-shaped sentence that does not transplant cleanly to iOS —
> at 120Hz, 3 dropped frames is a different, smaller stall than at 60Hz, and ProMotion may not
> have even been running at a fixed rate during the measurement. State the iOS number as hitch
> ratio (ms hitched per second), not a frame count, or the two platforms' numbers will look
> comparable while measuring different things — the same trap this domain's Lead article names
> for cold-start vs launch-time.

## 2. Instruments: Time Profiler, Allocations, Leaks

```
Time Profiler: samples the call stack across all threads at a fixed interval,
building a weighted call tree. The heaviest branch under the main thread during
a hitch is the direct analogue of a wide slice in an Android system trace.

Allocations: every live allocation, by class, with a generation-comparison tool
("Mark Generation") to isolate exactly what a specific user action added to the
heap and never released — the fastest way to catch a per-action leak rather than
scrolling through the whole session's allocations.

Leaks: post-hoc scan for objects with no remaining references path from a root —
catches true unreachable leaks, but NOT retain cycles where two objects still
reference each other and are jointly unreachable except through each other; the
Memory Graph Debugger (Xcode's own tool, not an Instruments template) is what
actually visualizes a retain cycle's reference path.
```

> [!TIP]
> Xcode's Memory Graph Debugger (the "🔍" icon in the debug bar) is often the faster first stop
> for a suspected retain cycle specifically, because it draws the actual reference graph rather
> than requiring a Leaks recording session — reach for it before Instruments when the shape of
> the leak, not just its existence, is the open question.

## 3. Retain cycles and ARC leak patterns

```swift
// LEAK: the closure captures `self` strongly, and `self` holds the closure —
// a two-node retain cycle neither side can break on its own.
final class ProfileViewController: UIViewController {
    var onUpdate: (() -> Void)?

    override func viewDidLoad() {
        super.viewDidLoad()
        viewModel.onStateChanged = {
            self.render(viewModel.state)   // strong capture of self
        }
    }
}
```

```swift
// FIX: capture weakly, and treat the closure as not outliving the view
// controller it's attached to.
viewModel.onStateChanged = { [weak self] in
    guard let self else { return }
    self.render(viewModel.state)
}
```

```
Common ARC leak shapes to recognize by structure, not just by example:

1. Delegate stored `strong` instead of `weak` — the delegating object and its
   delegate retain each other for as long as either is reachable.
2. A closure stored as a property capturing `self` strongly, as above — most
   common in reactive/callback-style state observation.
3. `Timer.scheduledTimer` retaining its target strongly, firing forever because
   nothing ever calls `invalidate()` — the timer itself is the accidental root.
4. NotificationCenter observers registered without a matching `removeObserver`,
   most often on pre-iOS-9 API patterns still present in older codebases.
```

## 4. Reading a launch trace

```
App Launch instrument (Instruments' dedicated launch template), reading order:

1. Find "Pre-main time" — dyld loading and binding the binary and its dynamic
   libraries, before your code runs at all. Wide here means too many/too heavy
   dynamic frameworks, not application code.
2. Find `application(_:didFinishLaunchingWithOptions:)`'s span — first line of
   your own code that can be optimized.
3. Find the first frame committed for the initial view controller — the gap
   from process start to here is the number users perceive as "launch time."
4. Anything wide inside that gap that isn't layout — synchronous SDK init,
   a blocking disk read, main-thread network — is deferrable work incorrectly
   on the critical path, same shape as the Android trace-reading habit, applied
   to a differently-structured trace.
```

## Pitfalls & trade-offs

- **Reporting "dropped frames" for an iOS hitch instead of hitch ratio.** ProMotion's variable
  refresh rate makes a frame count meaningless without also stating which rate was active;
  hitch ratio stays comparable across devices and refresh rates.
- **Using Leaks to hunt a suspected retain cycle.** It finds unreachable objects, not cycles
  that stay mutually reachable — reach for the Memory Graph Debugger for cycle shape instead.
- **A delegate property declared `strong`.** The most common single-line cause of a retain
  cycle in UIKit-era code; `weak var delegate:` is the default for a reason.
- **A `Timer` with no matching `invalidate()`.** Keeps firing and keeps its target alive for as
  long as the run loop runs, independent of whether the screen holding it is still visible.
- **Treating "pre-main time" as application code's problem.** It's dyld and dynamic-library
  loading — the fix is fewer/lighter dynamic frameworks, not faster `didFinishLaunching` code.
