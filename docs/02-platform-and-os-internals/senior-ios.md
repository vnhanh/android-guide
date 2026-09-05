---
id: platform-senior-ios
title: Jetsam, Watchdog Termination & Launch Sequencing (Senior, iOS)
description: Jetsam memory limits, watchdog termination in crash reports, XPC/extension budgets, dyld launch sequencing, and iOS version divergence.
tags: [ios, jetsam, watchdog, xpc, launch, senior]
lang: en
status: complete
domain: 02-platform-and-os-internals
band: S
platform: ios
level: Senior
sidebar_position: 4
prerequisites: [platform-mid-ios]
outcomes:
  - "Read an 0x8badf00d termination and say which of the three plausible causes it is"
counterpart: platform-senior-android
resources:
  - title: "Understanding crashes and crash logs"
    url: "https://developer.apple.com/documentation/xcode/understanding-the-structure-of-a-crash-report"
    date: "2025-06-01"
  - title: "App extension programming guide"
    url: "https://developer.apple.com/library/archive/documentation/General/Conceptual/ExtensibilityPG/"
    date: "2024-09-01"
  - title: "Reducing your app's launch time"
    url: "https://developer.apple.com/documentation/xcode/reducing-your-app-s-launch-time"
    date: "2025-01-01"
  - title: "Diagnosing memory, thread and crash issues early"
    url: "https://developer.apple.com/documentation/xcode/diagnosing-memory-thread-and-crash-issues-early"
    date: "2024-09-01"
---

# Jetsam, Watchdog Termination & Launch Sequencing

> **Outcome.** Read an `0x8badf00d` termination in a crash report and say, from the report
> alone, which of the three plausible causes it actually is.

## 1. Jetsam and hard per-app memory limits

Jetsam is iOS's memory-pressure killer — the direct analogue of Android's LMK, with one
structural difference worth stating precisely: Jetsam enforces a **hard, per-app memory limit**
that varies by device model, and crossing it is an instant kill, not a graduated pressure
response.

```swift
// There is no API to raise this limit. The only lever is using less memory:
// release caches on a memory-pressure notification, before Jetsam decides for you.
NotificationCenter.default.addObserver(
    forName: UIApplication.didReceiveMemoryWarningNotification,
    object: nil, queue: .main
) { _ in
    imageCache.removeAllObjects() // release what can be safely recomputed or re-fetched
}
```

> [!IMPORTANT]
> Android's LMK reasons about the *whole system's* available memory and kills the
> lowest-priority process to free some. Jetsam additionally enforces a **fixed ceiling per app**,
> independent of whether the rest of the system has memory free — an app can be killed for using
> too much memory itself, even while the device overall is not under pressure. A memory profile
> that would merely lower priority on Android can be an instant, unconditional kill on iOS.

## 2. Watchdog termination, and how it hides in crash reports

The watchdog kills an app that fails to respond to a lifecycle transition (launch, becoming
active, backgrounding) within a fixed time budget — typically a handful of seconds. Unlike a
Jetsam kill, this shows up **in the crash reporting system**, disguised as a crash:

```
Exception Type:  EXC_CRASH (SIGKILL)
Exception Codes: 0x8badf00d
Termination Reason: SPRINGBOARD 0x8badf00d
```

`0x8badf00d` reads, deliberately, as "ate bad food" — Apple's own mnemonic for "the watchdog
killed this because it didn't respond in time." The three plausible causes behind this exact
code, distinguishable by where the stack trace's main thread was blocked at the moment of kill:

1. **Synchronous work on the main thread during launch** (a blocking network call, a large
   synchronous disk read in `application(_:didFinishLaunchingWithOptions:)`) — the stack shows
   the main thread inside that call when the watchdog fired.
2. **A deadlock** — the main thread blocked waiting on a lock or a `DispatchQueue.sync` call
   that never returns — the stack shows the main thread suspended on a semaphore/lock primitive.
3. **Main-thread starvation from excessive work queued ahead of a lifecycle callback** — the
   stack shows the main thread mid-way through unrelated, non-blocking work that simply took
   too long in aggregate, with the lifecycle callback still waiting in the run loop's queue.

> [!NOTE]
> The distinguishing read is the **thread state at the top of the crashed thread's stack**: a
> call into a known-blocking API (cause 1), a lock/semaphore wait primitive (cause 2), or
> ordinary application code with no blocking call in sight, just a long call chain (cause 3).
> All three produce the identical `0x8badf00d` code — the code alone never tells you which.

## 3. XPC, extensions and their separate memory budgets

An app extension (a share extension, a widget, a notification service extension) runs as its
**own process** with its **own, often much smaller, Jetsam memory limit** — a widget's limit is
typically tens of megabytes, an order of magnitude below the host app's. Code shared between an
app and its extension via XPC or an app group container must be written against the extension's
budget, not the host app's.

```swift
// A notification service extension has ~24MB before Jetsam kills it (device-dependent) —
// decoding a large image to build a rich notification can exceed this on its own.
class NotificationService: UNNotificationServiceExtension {
    override func didReceive(_ request: UNNotificationRequest,
                              withContentHandler contentHandler: @escaping (UNNotificationContent) -> Void) {
        // Downscale before decoding fully into memory — the extension's budget assumes it.
    }
}
```

## 4. Launch sequencing: dyld, prewarming, and pre-`main` cost

Before `main()` runs at all, `dyld` (the dynamic linker) loads the executable and every linked
framework, resolves symbols, and runs static initializers — this is "pre-`main` time," and it is
measurable and optimizable independent of anything the app's own code does after launch:

```
# Measured via the XCODE_LAUNCH_TIME environment variable or Instruments' App Launch template
Total pre-main time:  380ms
  dylib loading:       210ms  — fewer, larger dynamic frameworks load faster than many small ones
  rebase/binding:       90ms  — reduced by fewer dynamic symbols to resolve
  static initializers:  80ms  — every top-level `let x = expensiveCall()` at file scope runs here
```

iOS 15+ **prewarming** can start this process before the user even taps the icon, based on
predicted usage — which is a system optimization the app has no control over and should not be
relied upon as a fixed part of any measured launch budget.

## 5. iOS version divergence

Watchdog time budgets, Jetsam limits, and background execution heuristics have all changed
across major iOS releases without being fully documented as such — a launch sequence within
budget on the OS version used for QA can miss it on an OS version in the field, in either
direction. Segmenting crash-free-launch metrics by OS version, the same way domain 02's Android
article segments field kills by manufacturer, is the equivalent diagnostic habit here.

## Pitfalls & trade-offs

- **Treating an `0x8badf00d` crash as a normal crash to fix with a null check.** It's a timeout,
  not a logic bug — the fix is removing blocking work from the path the watchdog is timing, not
  patching the specific line where the stack happened to be sitting.
- **Assuming an app extension has the host app's memory budget.** Covered above — this is a
  common cause of a widget or share extension that "works in the simulator" and gets killed
  silently on device.
- **Crediting prewarming as part of a reliable launch-time budget.** It's a bonus the system
  grants sometimes, not a guarantee to design a measured SLA around.
- **Comparing pre-`main` time across dramatically different OS versions without checking for a
  documented (or undocumented) change in dyld's own behaviour first.**
