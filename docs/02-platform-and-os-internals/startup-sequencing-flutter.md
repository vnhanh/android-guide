---
id: platform-startup-sequencing-flutter
title: Startup Sequencing in Flutter — Additive Engine Init on Top of the Native Start
description: Why a Flutter app's cold start is genuinely slower than an equivalent native app's, what happens after the native sequence hands off to the Flutter engine, and how to actually measure it.
tags: [startup, launch-time, flutter, mid, senior]
lang: en
status: complete
domain: 02-platform-and-os-internals
platform: shared
band: X
level: Mid
sidebar_position: 4
topic: startup-sequencing
leaf: Flutter
prerequisites: []
outcomes:
  - "Explain why a Flutter app's cold start is additive on top of the native cold start, not a replacement for it"
  - "Name the tools that measure the Flutter-specific phase versus the native phase underneath it"
resources:
  - title: "Performance profiling for Flutter"
    url: "https://docs.flutter.dev/perf/ui-performance"
    date: "2025-04-01"
---

# Startup Sequencing in Flutter — Additive Engine Init on Top of the Native Start

Opening a shop is not one thing. Some mornings you unlock the door, turn on every light, count the
register, and set up the display from an empty building — that's a cold start. A Flutter app adds
a second round of setup on top of that: the store isn't just unlocked, the till and the signage
system inside it also need to boot before a customer can be served — extra time on top of the
unlock, not instead of it.

## Mid {concept=startup-sequencing/start-types}

**Interview question: "Why is a Flutter app's cold start typically slower than an equivalent
native app's?"**

**Flutter adds a phase on top of whichever native start is already happening.** A Flutter app is a
real Android process or a real iOS process underneath, so the Zygote-fork /
`Application.onCreate` sequence on Android, or the dyld / pre-main sequence on iOS, still happens
exactly as it would for a native app — Flutter's engine initialization (loading the Flutter/Dart
runtime) and rendering the first frame happen *in addition to* that, not instead of it. That is
the honest reason a Flutter app's cold start is genuinely slower in the general case than an
equivalent native app's: it is doing the native cold start's work, then doing more work.

**Follow-up an interviewer asks next:** "So what's the single most common mistake that makes a
launch look slow in profiling but not in normal use?" Profiling on a warm developer device with a
warm cache and a warm Flutter engine (already resident from a previous run) measures a much
cheaper start than the cold start a real user hits after a fresh install on a low-end device.

**Pitfall at this level:** blaming "Flutter is slow" for a cold-start regression without measuring
which phase actually grew — the native phase underneath (unrelated to Flutter at all) and the
Flutter engine-init phase are separate, separately measurable costs, and conflating them points
any fix effort at the wrong code.

## Senior {concept=startup-sequencing/diagnosis}

**Interview question: "How do you actually separate the native cold-start cost from the
Flutter-specific cost, on a real regression?"**

Because the native sequence still runs underneath, the native platform's own diagnostics still
apply and still matter first — an `Application.onCreate()` initializer or a
`didFinishLaunchingWithOptions` blocking call slows a Flutter app's launch exactly as it would slow
a native app's, and neither shows up in Flutter-specific tooling.

On top of that, Flutter's own instrumentation isolates the engine-init and first-frame phase
specifically: `flutter run --trace-startup` and the DevTools timeline report the
Dart-VM-to-first-frame cost in isolation, which is what to profile once the native phase
underneath has already been ruled out or fixed using the platform's own tools.

**Follow-up:** "If a regression only appears on Android, or only on iOS, what does that tell you?"
That the regression is almost certainly in the native phase for that platform, not the
Flutter-specific phase — Flutter's own engine-init cost doesn't differ by platform in a way that
would produce a single-platform regression on its own.

**Pitfall at this level:** profiling only with Flutter's own tooling and missing a regression that
is entirely in the native phase underneath — the native diagnostics (Android vitals, `dyld`
pre-main timing on iOS) are not optional just because the app is built with Flutter.

## Cross-platform comparison

See the cross-platform comparison table in the Android or iOS version of this topic (switch the
platform tab above) — Flutter's cold start is the sum of whichever native sequence applies plus
the engine-init phase described here.

## Pitfalls & trade-offs

- **Mid:** blaming "Flutter is slow" for a cold-start regression without first separating the
  native phase's cost from the Flutter engine-init phase's cost.
- **Mid:** profiling launch time only on a warm developer device, where the Flutter engine may
  already be resident from a previous run — not representative of a real user's fresh cold start.
- **Senior:** profiling only with Flutter-specific tooling (`flutter run --trace-startup`) and
  missing a regression that is entirely in the native phase underneath, invisible to that tool.
