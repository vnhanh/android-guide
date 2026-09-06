---
id: platform-interview
title: Platform & OS Internals — Interview Questions
description: At least 8 questions per level on startup sequencing, process lifecycle, background work and permissions across Android, iOS and Flutter — leaf-agnostic, framed the way an interviewer actually asks them.
tags: [interview, startup, process-lifecycle, background-work, permissions, android, ios, flutter, mid, senior, lead]
lang: en
status: complete
domain: 02-platform-and-os-internals
platform: shared
band: X
level: Mid
sidebar_position: 99
kind: interview
prerequisites: []
outcomes:
  - "Answer, without notes, the core interview questions this domain's Mid, Senior and Lead articles each teach"
---

# Platform & OS Internals — Interview Questions

## Mid

Q: What's the difference between a cold, warm and hot start on Android?
A: Cold: the process doesn't exist yet, so Zygote forks it and Application.onCreate runs before the first Activity lifecycle. Warm: the process is alive but the Activity was destroyed, so only the Activity lifecycle runs. Hot: both the process and the Activity are alive, so only onResume runs.

Q: Why is a Flutter app's cold start typically slower than an equivalent native app's?
A: A Flutter app is a real native process underneath, so the full native cold-start sequence still runs — Flutter's engine initialization and first-frame rendering happen in addition to that, not instead of it, so the cost is additive.

Q: What does the Android watchdog-equivalent look like on iOS, and what does it protect against?
A: iOS has a watchdog that kills the app (0x8badf00d) if a lifecycle transition — launch, becoming active, backgrounding — doesn't complete within a fixed time budget, typically a handful of seconds; it turns a slow launch into a crash rather than a bad review.

Q: Name the two most common places blocking work accidentally ends up during startup, per platform.
A: Android: `Application.onCreate()`. iOS: `application(_:didFinishLaunchingWithOptions:)`. Both delay time-to-first-frame for every single cold start, not just the one being tested.

Q: What's wrong with profiling launch time only on your own development device?
A: A warm developer device with a warm cache measures a hot or warm start; the cold start on a low-end device with a cold disk cache is a different, much larger number, and it's the one your slowest users actually experience.

Q: What does "background execution" mean differently on Android versus iOS at a beginner level?
A: Android grants a process continued execution subject to Doze/App Standby restrictions and requires explicit APIs (WorkManager, foreground services) for guaranteed background work; iOS suspends an app almost immediately after backgrounding unless it explicitly requests limited background time or uses a background task API like BGTaskScheduler.

Q: What's the risk of requesting a runtime permission the user hasn't been told why the app needs?
A: The user is far more likely to deny it — and a denied permission at first ask is harder to recover from, since re-prompting typically requires the user to go into system settings manually on both platforms.

Q: Why does an app's process getting killed by the OS not always show up as a crash in your crash reporter?
A: A normal OS-initiated process death for memory pressure or backgrounding policy is often silent — no exception, no stack trace — so it can look like "the app just disappeared" in usage analytics without ever generating a crash report at all.

## Senior

Q: You have a 0x8badf00d crash report on iOS with no local reproduction. What are the three plausible causes, and how do you tell them apart?
A: Synchronous main-thread work during launch, a deadlock, or main-thread starvation from ordinary queued work — all three produce the identical code, so the distinguishing signal is the crashed thread's stack state at the moment of the kill, not the code itself.

Q: A launch-time regression shows up on one Android OEM's fleet but nowhere else. What's your first move?
A: Segment the metric by OEM and OS version before concluding anything about a code change's effect — vendor-customized Android can affect launch and background behavior unpredictably and undocumented, so an OEM-isolated regression is a data point about that vendor, not necessarily your code.

Q: What's "pre-main time" on iOS, and what's one lever that actually reduces it?
A: The time `dyld` spends loading the executable and every linked framework, resolving symbols, and running static initializers before `main()` even runs — fewer, larger dynamic frameworks load faster than many small ones, which is one concrete, measurable lever.

Q: Why can't you trust a single iOS OS version's watchdog behavior to hold across the whole fleet?
A: Watchdog time budgets, Jetsam limits and background execution heuristics have all changed across major iOS versions without being fully documented as such — a launch sequence that clears the budget on the QA OS version can miss it on a version actually in the field.

Q: How do you actually separate a Flutter app's native cold-start cost from its engine-init cost when diagnosing a regression?
A: The native platform's own diagnostics (Android vitals, dyld pre-main timing) still apply and should be checked first since the native phase runs unchanged; `flutter run --trace-startup` and the DevTools timeline isolate the Dart-VM-to-first-frame cost specifically, on top of that.

Q: What's the actual mechanism behind Android's Doze mode, and what does it mean for a background sync job?
A: Doze restricts network access, wakelocks, and job/alarm execution to periodic maintenance windows when the device is stationary and unplugged for a while — a background sync job not built on WorkManager (which understands Doze) can silently stop running for hours without any error surfacing.

Q: Why is "instrumentation over guessing" the right framing for diagnosing an OS-level app kill?
A: Because OS-level kill reasons (memory pressure, background time budget exceeded, watchdog) are indistinguishable from each other and from a user force-quit without platform-specific instrumentation (e.g. ActivityManager kill reason on Android, Xcode's Termination Reason on iOS) — guessing from symptoms alone reliably points at the wrong cause.

Q: What's the risk of re-requesting a previously-denied permission the same way you asked the first time?
A: The system often suppresses the native prompt entirely after a denial (especially a "don't ask again" or repeated denial), so re-asking the same way produces no dialog at all — the user has to be routed to system settings, which needs a different UI flow than the first ask.

## Lead

Q: How do you decide whether a platform-specific startup or lifecycle difference needs a shared abstraction, or should stay platform-specific code?
A: By the cost of the abstraction leaking — a shared abstraction over Android/iOS lifecycle differences that has to be overridden for every subtle platform difference anyway isn't saving anyone anything; it's worth it only when the platforms' actual behavior is close enough that the abstraction holds without constant escape hatches.

Q: A background-work reliability incident keeps recurring across app versions. What's the team-level fix, versus the one-off fix?
A: The one-off fix patches the specific job that failed; the team-level fix is a standard (e.g. "all background work goes through WorkManager/BGTaskScheduler, never a raw thread or timer") enforced by lint or code review checklist, so the next engineer can't reintroduce the same failure mode by choosing a different, unreliable primitive.

Q: How do you price the cost of an OS-level API deprecation (e.g. a background execution API being restricted) against migrating early versus waiting?
A: Migrating early costs engineering time now, on your own schedule; waiting risks a forced, urgent migration under a real deadline (an OS update breaking the old API in production) plus the accumulated cost of new code still being written against the deprecated pattern in the meantime — price both explicitly rather than defaulting to "later."

Q: How do you build a team-wide habit of segmenting platform-health metrics (crash rate, launch time, ANR rate) by OS version and device tier, rather than trusting the aggregate?
A: Make the segmented view the default dashboard, not an option someone has to remember to select — an aggregate number that looks fine can hide a severe regression on one segment, and the fix has to be a workflow default, not an individual habit that erodes under time pressure.

Q: When is it worth building custom instrumentation for platform-level diagnostics (kill reasons, watchdog causes) versus relying on what the OS or crash reporter gives you by default?
A: When the default tooling's ambiguity (e.g. every iOS watchdog kill reporting the identical code regardless of cause) is costing real diagnosis time on a recurring basis — the custom instrumentation only pays for itself once the volume of ambiguous incidents exceeds the cost of building and maintaining it.

Q: How do you evaluate whether to adopt a new OS capability (e.g. a new background execution API) team-wide immediately, versus waiting a release or two?
A: Minimum OS version support in your user base, the capability's actual reliability track record in its first release (new platform APIs are disproportionately buggy in their first cycle), and whether an existing pattern already covers the need adequately — "newest API" is not automatically "right API for this app's constraints."

Q: What's the actual organizational failure behind "we keep shipping launch-time regressions that only QA catches after the fact, if at all"?
A: No launch-time budget is enforced as a CI gate — without an automated threshold that fails a build exceeding it, launch time only degrades gradually and invisibly until a user-facing metric or an app store review calls it out, well after the responsible change has shipped.

Q: How do you decide when a cross-platform framework's (Flutter's) startup cost is an acceptable trade-off versus a blocker for a specific product?
A: By comparing it against the actual product requirement, not a generic benchmark — a content-browsing app tolerates an extra few hundred milliseconds of cold start far better than a camera or payment app where instant launch is part of the core value proposition; price the trade-off against the specific product, not framework reputation.
