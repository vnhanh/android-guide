---
id: platform-startup-sequencing-ios
title: Startup Sequencing on iOS — Pre-Main Time & Reading a 0x8badf00d Report
description: What dyld does before main() even runs, why an unresponsive launch shows up as a watchdog kill rather than a crash, and the three plausible causes behind every 0x8badf00d report.
tags: [startup, launch-time, watchdog, ios, mid, senior]
lang: en
status: complete
domain: 02-platform-and-os-internals
platform: shared
band: X
level: Mid
sidebar_position: 4
topic: startup-sequencing
leaf: iOS
prerequisites: []
outcomes:
  - "Name what determines whether an iOS launch is cold or warm, and what the watchdog does on top"
  - "Read an 0x8badf00d crash report and identify which of three plausible causes it is, from the thread state alone"
resources:
  - title: "Reducing your app's launch time"
    url: "https://developer.apple.com/documentation/xcode/reducing-your-app-s-launch-time"
    date: "2025-01-01"
---

# Startup Sequencing on iOS — Pre-Main Time & Reading a 0x8badf00d Report

Opening a shop is not one thing. Some mornings you unlock the door, turn on every light, count the
register, and set up the display from an empty building — that's a cold start. Some mornings the
shop is already lit and stocked, you just walk in and unlock the door — warm start; resuming a
suspended app is the iOS equivalent. The customer waiting outside experiences both as "how long
until I can walk in," but iOS adds something Android doesn't name the same way: a mechanism that
kills the app outright if a lifecycle transition doesn't finish fast enough.

## Mid {concept=startup-sequencing/start-types}

**Interview question: "What determines whether a launch is fast or slow, before you've even
profiled it?"**

Before you open a profiler, the first fact you need is *which kind of start you're even measuring*
— the same tap on the icon can mean a completely different amount of work depending on what the OS
already had in memory.

**iOS has the same cold/warm continuum conceptually** as Android — relaunching from nothing versus
resuming a suspended app — plus one thing worth knowing exists even before the Senior-level detail
below: a **watchdog timeout** that kills the app outright if a lifecycle transition doesn't finish
fast enough. At this level, just know it exists and that it turns a slow launch into a crash, not
a bad review.

**Follow-up an interviewer asks next:** "So what's the single most common mistake that makes a
launch look slow in profiling but not in normal use?" Profiling on a warm developer device with a
warm cache measures a warm start; the cold start on a low-end device with a cold disk cache is a
different, much larger number, and it's the one your slowest users actually experience.

**Pitfall at this level:** putting blocking work — network calls, large synchronous disk reads,
heavyweight SDK initialization — in `application(_:didFinishLaunchingWithOptions:)`, where it
delays every single cold start, including for users on hardware nothing like your dev device.

## Senior {concept=startup-sequencing/diagnosis}

**Interview question: "You have an 0x8badf00d crash report and no reproduction — what actually
happened?"**

The report showed up in your crash reporting system looking like a crash, but it isn't one — it's
iOS's watchdog killing the app for failing to respond to a lifecycle transition (launch, becoming
active, backgrounding) within a fixed time budget, typically a handful of seconds:

```text
Exception Type:  EXC_CRASH (SIGKILL)
Exception Codes: 0x8badf00d
Termination Reason: SPRINGBOARD 0x8badf00d
```

Read the code as Apple's own mnemonic: "ate bad food" — the watchdog killed this because it didn't
respond in time. Every 0x8badf00d report has exactly one of **three plausible causes**, and the
code itself never tells you which — the distinguishing signal is the thread state at the top of
the crashed thread's stack at the moment of the kill:

- **Synchronous work on the main thread during launch** — a blocking network call, a large
  synchronous disk read, done inside `application(_:didFinishLaunchingWithOptions:)`. The stack
  shows the main thread actively inside that call.
- **A deadlock** — the main thread blocked on a lock or `DispatchQueue.sync` that never returns.
  The stack shows the main thread suspended on a semaphore or lock primitive, not doing visible
  work.
- **Main-thread starvation** — ordinary, non-blocking application code, just too much of it queued
  ahead of the lifecycle callback. The stack shows normal app code running fine; the lifecycle
  callback is simply still waiting its turn in the run loop's queue.

All three produce the identical `0x8badf00d` code. Reading the crash report correctly means
reading the thread state, not the code.

**The other half of launch diagnostics is what happens before your code even runs.** `dyld` (the
dynamic linker) loads the executable and every linked framework, resolves symbols, and runs static
initializers before `main()` — "pre-main time," measurable via the `XCODE_LAUNCH_TIME` environment
variable or Instruments' App Launch template:

```text
Pre-main total: 380ms
  dylib loading:       210ms   (fewer, larger dynamic frameworks load faster than many small ones)
  rebase/binding:       90ms   (fewer dynamic symbols to resolve)
  static initializers:  80ms   (every top-level `let x = expensiveCall()` at file scope runs here)
```

> [!NOTE]
> iOS 15+ prewarming can start this process before the user even taps the icon, based on predicted
> usage. It's a system optimization the app has no control over — don't rely on it as a fixed part
> of any measured launch budget; a build without prewarming can look meaningfully slower for no
> code reason at all.

**And the watchdog budget itself isn't fixed across OS releases.** Watchdog time budgets, Jetsam
limits, and background execution heuristics have all changed across major iOS versions without
being fully documented as such. A launch sequence that clears the budget on the OS version used
for QA can miss it on an OS version actually in the field, in either direction — segment
crash-free-launch metrics by OS version, the same habit Android needs for OEM divergence.

**Follow-up:** "If you can't reproduce it locally, how do you even start narrowing which of the
three it is?" Cross-reference the crash volume against a recent release that added SDK
initialization, a lock, or a large data migration on the launch path, and check whether the
population is concentrated on specific OS versions or device tiers — the watchdog's three causes
usually correlate with a specific recent change, even without a local repro.

**Pitfall at this level:** treating every `0x8badf00d` report as "the app is deadlocking" and
chasing lock code, when the actual population is main-thread starvation from an unrelated recent
change that added work to the launch path without adding any blocking call at all.

## Cross-platform comparison

See the cross-platform comparison table in the Android or Flutter version of this topic (switch
the platform tab above) for how Android's process model and Flutter's additive engine-init phase
compare to the watchdog mechanism above.

## Pitfalls & trade-offs

- **Mid:** blocking work in `didFinishLaunchingWithOptions` delays time-to-first-frame for every
  single cold start, not just the one you were testing.
- **Mid:** profiling launch time only on a warm developer device and treating it as representative
  of a cold start on a low-end device in the field.
- **Senior:** treating `0x8badf00d`'s code alone as diagnostic — it's identical across all three
  causes; only the crashed thread's stack state distinguishes a blocking call, a deadlock, and
  main-thread starvation.
- **Senior:** measuring launch time once against a QA device on a QA OS version and trusting it —
  undocumented watchdog/Jetsam changes across iOS versions mean the same build's launch behavior
  can differ meaningfully across the real fleet.
