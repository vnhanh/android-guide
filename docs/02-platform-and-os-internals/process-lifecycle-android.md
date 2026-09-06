---
id: platform-process-lifecycle-android
title: Process Lifecycle & Death on Android — Bundle, ViewModel & the Low Memory Killer
description: Why the same onSaveInstanceState Bundle handles configuration change and process death, and how to tell whether a field-reported kill is the LMK working correctly or a genuine bug.
tags: [lifecycle, process-death, android, mid, senior]
lang: en
status: complete
domain: 02-platform-and-os-internals
platform: shared
band: X
level: Mid
sidebar_position: 1
topic: process-lifecycle
leaf: Android
prerequisites: []
outcomes:
  - "Explain why the same persistence mechanism handles both configuration change and process death, and what belongs in it vs what doesn't"
  - "Diagnose whether a field kill is the LMK behaving correctly against a low-priority signal, or a genuine bug"
resources:
  - title: "Understand the activity lifecycle"
    url: "https://developer.android.com/guide/components/activities/activity-lifecycle"
    date: "2025-02-01"
---

# Process Lifecycle & Death on Android — Bundle, ViewModel & the Low Memory Killer

Rotate a phone and the screen redraws instantly with everything intact. Leave the app backgrounded
for twenty minutes and come back to find it restarted from scratch, scroll position gone. To the
user these look like the same kind of interruption. To Android they are completely different
events, answered by the same mechanism.

## Mid {concept=process-lifecycle/config-vs-death}

**Interview question: "What's the difference between a configuration change and process death, and
why does the same `onSaveInstanceState`-style mechanism handle both?"**

A configuration change (rotation, locale switch, theme switch) destroys and recreates the current
screen's controller object on purpose, in place, while the process keeps running. Process death
ends the whole process while it's backgrounded, for a reason that has nothing to do with what's on
screen — the OS needed the memory back. Both events wipe in-memory UI state, and both are answered
by persisting a small amount of state right before the wipe and restoring it right after.

The system destroys and recreates the `Activity` on configuration change by default.
`onCreate(savedInstanceState: Bundle?)` receiving a non-null `Bundle` means the system recreated
this Activity after destroying a previous instance — not a first launch. The same `Bundle`, filled
in by `onSaveInstanceState`, is what the system persists to disk before killing the process too —
one mechanism, two triggers. `ViewModel` is the other half of the answer: it's retained across the
destroy/recreate cycle by design, which is why per-screen UI state belongs there and not in
Activity fields — it survives the config-change case for free and only needs the Bundle for the
process-death case.

```kotlin
class DraftActivity : AppCompatActivity() {
    private val viewModel: DraftViewModel by viewModels() // survives config change unaided

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        // non-null here means: recreated after this Activity's previous instance was destroyed
        val draftText = savedInstanceState?.getString(KEY_DRAFT) ?: viewModel.draftText
    }

    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        outState.putString(KEY_DRAFT, viewModel.draftText) // small, unsaved input only
    }
}
```

**Follow-up an interviewer asks next:** "If the process died right now and the user came back in
five minutes, what would they be upset to lose?" That question is the actual design tool — it
separates a draft comment or an in-progress form (must be persisted) from a re-fetchable list of
search results (fine to reload). It also explains the size limit on the Bundle path: roughly 1MB
total, `TransactionTooLargeException` past it, which only makes sense once you accept the Bundle is
for a small unsaved-input snapshot, not a cache.

**Pitfall at this level:** persisting everything on general principle, or persisting nothing
because "the user probably won't background the app mid-task." Both are guesses. Ask the
five-minute question per screen instead of applying one policy everywhere.

## Senior {concept=process-lifecycle/kill-diagnosis}

**Interview question: "Why was this process actually killed — and is it a bug?"**

A `Service` is not a background thread by default — it runs on the main looper unless you
explicitly offload work — its real function is telling the LMK (Low Memory Killer) how important
this process is to keep alive. A foreground service, the kind holding a visible notification,
lands in the `fg-service` priority bucket and is rarely killed. A bound service is elevated only
while a client is actually bound to it. A plain background service isn't allowed to start at all
on API 26+; that work has to move to WorkManager. Independent of Doze mode, every app also sits in
a standby bucket — `Active`, `Working Set`, `Frequent`, `Rare`, `Restricted` — driven by usage
recency and frequency, and that bucket throttles how often WorkManager or JobScheduler jobs
actually run no matter what the job requested.

Put together: a field report of "the app got killed" may be the LMK doing exactly what it's
designed to do to a low-priority process sitting in a restricted standby bucket during Doze — not
a leak, not a regression. Check the process's priority signal and standby bucket before chasing a
memory leak that isn't there.

Vendor-customized Android adds a wrinkle on top of all this: OEM battery managers layered on stock
AOSP can kill or restrict more aggressively than Doze and standby buckets alone would predict,
undocumented, and varying by vendor and OS version — the practical mitigation is instrumenting the
app so a "killed while a foreground service should have kept it alive" event reaches telemetry,
rather than discovering the pattern from a support ticket weeks later.

> [!IMPORTANT]
> A kill is not automatically a bug. Before treating one as a regression, check the priority signal
> — service type, standby bucket, Doze state — only a kill that contradicts that signal (a
> foreground service dying anyway) is worth escalating as a genuine problem, and OEM divergence
> means that escalation needs its own telemetry rather than a support-ticket guess.

**Follow-up:** "So what do you actually change once you've confirmed it's not a bug?" Correct the
priority signal — promote genuinely user-visible ongoing work to a foreground service, move
background work off a plain `Service` and onto WorkManager, and instrument standby-bucket
transitions rather than guessing.

**Pitfall at this level:** treating an LMK kill as inherently a crash to fix, instead of first
checking whether the process's own priority signal predicted it — chasing a "memory leak" that is
actually correct OS behavior against a low-priority process wastes a debugging cycle that
instrumentation would have shortcut.

## Cross-platform comparison

See the cross-platform comparison table in the iOS or Flutter version of this topic (switch the
platform tab above) for how Jetsam's hard per-app ceiling differs structurally from the LMK's
graduated, priority-based response.

## Pitfalls & trade-offs

- **Mid:** applying one blanket persistence policy — save everything, or save nothing — instead of
  asking the five-minute question per screen.
- **Senior:** assuming a field-reported kill is a bug before checking the process's own priority
  signal — a kill that matches the signal is the OS working as designed.
- **Senior:** forgetting Android's OEM battery-manager divergence when reasoning purely from stock
  Doze and standby-bucket behavior — a vendor-customized device can kill more aggressively than
  either predicts, and the only reliable fix is telemetry on the app side.
