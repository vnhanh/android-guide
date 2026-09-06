---
id: platform-startup-sequencing-android
title: Startup Sequencing on Android — Cold, Warm, Hot & the onCreate Tax
description: What makes an Android launch cold, warm or hot, why every synchronous Application.onCreate() initializer taxes every cold start, and the OEM-divergence confound in launch-time data.
tags: [startup, launch-time, android, mid, senior]
lang: en
status: complete
domain: 02-platform-and-os-internals
platform: shared
band: X
level: Mid
sidebar_position: 4
topic: startup-sequencing
leaf: Android
prerequisites: []
outcomes:
  - "Name what determines whether an Android launch is cold, warm or hot"
  - "Explain why a launch-time regression on one OEM's fleet is a data point, not noise"
resources:
  - title: "App startup time"
    url: "https://developer.android.com/topic/performance/vitals/launch-time"
    date: "2024-11-01"
---

# Startup Sequencing on Android — Cold, Warm, Hot & the onCreate Tax

Opening a shop is not one thing. Some mornings you unlock the door, turn on every light, count the
register, and set up the display from an empty building — that's a cold start. Some mornings the
shop is already lit and stocked, you just walk in and unlock the door — warm. Some mornings a
colleague already opened up and you're simply flipping the sign to "open" — hot. The customer
waiting outside experiences all three as "how long until I can walk in," but the cause of a slow
morning is completely different depending on which one it is. Android names all three explicitly,
and the fix for a slow cold start is not the fix for a slow hot start.

## Mid {concept=startup-sequencing/start-types}

**Interview question: "What determines whether a launch is fast or slow, before you've even
profiled it?"**

Before you open a profiler, the first fact you need is *which kind of start you're even measuring*
— the same tap on the icon can mean a completely different amount of work depending on what the OS
already had in memory.

**Android names three explicitly**, based on what state the process and the Activity were in:

```kotlin
// Cold start — the process doesn't exist yet.
// Zygote forks a new process, Application.onCreate() runs, then the first
// Activity's onCreate -> onStart -> onResume. Slowest, most instrumented.
class App : Application() {
    override fun onCreate() {
        super.onCreate()
        AnalyticsSdk.init(this)   // runs on EVERY cold start, before the first frame
    }
}
```

Every synchronous initializer in `Application.onCreate()` delays time-to-first-frame for every
cold start — `AnalyticsSdk.init(this)` above is worth auditing: does it really need to block
`onCreate`, or could it run after the first frame is on screen?

- **Warm start:** the process is already alive but the Activity was destroyed — only the Activity
  lifecycle runs, `Application.onCreate` is skipped entirely. Medium cost.
- **Hot start:** the process is alive and the Activity is still in memory — only `onResume` runs.
  Lowest cost, and the one most likely to feel instant.

**Follow-up an interviewer asks next:** "So what's the single most common mistake that makes a
launch look slow in profiling but not in normal use?" Profiling on a warm developer device with a
warm cache measures a hot or warm start; the cold start on a low-end device with a cold disk cache
is a different, much larger number, and it's the one your slowest users actually experience.

**Pitfall at this level:** putting blocking work — network calls, large synchronous disk reads,
heavyweight SDK initialization — in `Application.onCreate()`, where it delays every single cold
start, including for users on hardware nothing like your dev device.

## Senior {concept=startup-sequencing/diagnosis}

**Interview question: "A launch-time metric regressed on one part of your fleet but not another —
how do you even start?"**

**Android's launch measurements have a confound worth naming immediately:** vendor-customized
Android can affect launch behavior unpredictably and undocumented, varying by manufacturer and OS
version. A launch-time regression that only shows up on one OEM's fleet is a data point, not noise
to average away — the same instrumentation-over-guessing discipline the process-lifecycle article
covers for kills applies to launch-time numbers too.

Segment the metric by OEM and OS version before concluding anything about a code change's actual
effect on launch time; averaging across a fragmented fleet can hide a regression that is severe on
one segment and invisible everywhere else.

**Follow-up:** "If it's OEM-specific, is there anything you can actually do?" Not always fully —
but the segmentation itself tells you whether to keep investigating a code cause (regression
appears everywhere) or to treat it as a platform-variance data point to monitor rather than chase
(regression is isolated to one manufacturer's recent OS update).

**Pitfall at this level:** measuring launch time once against a QA device on a QA OS version and
trusting it — OEM divergence means the same build's launch behavior can differ meaningfully across
the real fleet in ways a single QA configuration will never surface.

## Cross-platform comparison

See the cross-platform comparison table in the iOS or Flutter version of this topic (switch the
platform tab above) for how the watchdog-kill mechanism and pre-main timing compare to Android's
process model.

## Pitfalls & trade-offs

- **Mid:** blocking work in `Application.onCreate()` delays time-to-first-frame for every single
  cold start, not just the one you were testing.
- **Mid:** profiling launch time only on a warm developer device and treating it as representative
  of a cold start on a low-end device in the field.
- **Senior:** measuring launch time once against a QA device on a QA OS version and trusting it —
  OEM divergence means the same build's launch behavior can differ meaningfully across the real
  fleet.
