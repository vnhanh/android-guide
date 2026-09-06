---
id: platform-process-lifecycle-and-death
title: Process Lifecycle & Death, Across Android, iOS & Flutter
description: Why a rotated screen and a backgrounded process getting killed look identical to the user but demand a different mechanism underneath, on Android, iOS and Flutter.
tags: [lifecycle, process-death, android, ios, flutter, mid, senior]
lang: en
status: complete
domain: 02-platform-and-os-internals
platform: shared
band: X
level: Mid
sidebar_position: 1
prerequisites: []
outcomes:
  - "Explain why the same persistence mechanism handles both configuration change and process death, and what belongs in it vs what doesn't, on Android, iOS or Flutter"
  - "Diagnose whether a field kill is the OS behaving correctly against a low-priority signal, or a genuine bug, and name the structural difference between Android's and iOS's memory-pressure killers"
resources:
  - title: "Understand the activity lifecycle"
    url: "https://developer.android.com/guide/components/activities/activity-lifecycle"
    date: "2025-02-01"
  - title: "Managing your app's life cycle"
    url: "https://developer.apple.com/documentation/uikit/managing-your-app-s-life-cycle"
    date: "2025-06-01"
  - title: "WidgetsBindingObserver class — Flutter API"
    url: "https://api.flutter.dev/flutter/widgets/WidgetsBindingObserver-class.html"
    date: "2025-05-01"
---

# Process Lifecycle & Death, Across Android, iOS & Flutter

Rotate a phone and the screen redraws instantly with everything intact. Leave the app backgrounded
for twenty minutes and come back to find it restarted from scratch, scroll position gone. To the
user these look like the same kind of interruption — the app "went away and came back." To the
system they are completely different events, and treating them as the same bug is how state gets
lost in production. A configuration change is a hotel checkout: same room, you're asked to step
into the hallway for a minute while housekeeping resets it, and you walk back into the same key,
same floor. Process death is the building itself being torn down while you were out for lunch —
nothing personal, the city needed the space, and whoever put you back has to rebuild the room from
whatever notes you left at the front desk. This article covers the mechanism that generates both
events and the one piece of code that has to answer for both: what to persist, and why the same
answer works whether the cause was a rotation or a kill.

## Mid

**Interview question: "What's the difference between a configuration change and process death, and
why does the same `onSaveInstanceState`-style mechanism handle both?"**

A configuration change (rotation, locale switch, theme switch) destroys and recreates the current
screen's controller object on purpose, in place, while the process keeps running. Process death
ends the whole process while it's backgrounded, for a reason that has nothing to do with what's on
screen — the OS needed the memory back. Both events wipe in-memory UI state. Both are answered by
persisting a small amount of state right before the wipe and restoring it right after. That's the
whole reason one mechanism covers two apparently unrelated events: from the state-restoration
code's point of view, "my in-memory state is about to disappear and I don't get advance warning
about which cause it is" is the only fact that matters.

**Android.** The system destroys and recreates the `Activity` on configuration change by default.
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

**iOS.** There's no single "destroy and recreate this screen" event — instead the app, and each
scene on multi-window iPad, moves through `notRunning`, `inactive`, `active`, `background`, and
`suspended`. `sceneDidBecomeActive` is the rough equivalent of `onResume`; `sceneWillResignActive`
is the rough equivalent of `onPause` — save anything that can't be lost if the scene is suspended
next. `sceneDidEnterBackground` means no longer visible and possibly suspended shortly after, with
no reliable "still running but stopped" window to delay in. Suspension freezes the process in
memory without killing it — instant resume, nothing lost. Termination actually ends the process,
silently, with no reliable delegate callback to catch it. From the user's seat these look
identical, which is exactly why you can't wait for a termination callback that may never fire.

```swift
class DraftSceneDelegate: UIResponder, UIWindowSceneDelegate {
    func sceneDidEnterBackground(_ scene: UIScene) {
        // Persist here, not in a termination callback — termination gives no reliable signal.
        let draft = DraftState(text: currentDraftText)
        try? DraftStore.shared.save(draft) // small struct encoded to disk
    }
}
```

**Flutter.** `WidgetsBindingObserver`'s `didChangeAppLifecycleState(AppLifecycleState state)` is
the one callback that sits on top of both platforms' lifecycles — `resumed`, `inactive`, `paused`,
`detached`, and `hidden` (Flutter 3.13+) map onto whichever native states actually fired underneath.
For persisting state across either cause, `RestorationMixin` and `RestorationProperty` are the API
surface a Flutter engineer writes against; under the hood they write into Android's
`onSaveInstanceState` Bundle or iOS's state-restoration archive depending on platform, but the
Dart-level code is the same either way.

```dart
class DraftPage extends StatefulWidget {
  @override
  State<DraftPage> createState() => _DraftPageState();
}

class _DraftPageState extends State<DraftPage> with RestorationMixin, WidgetsBindingObserver {
  final RestorableTextEditingController _draft = RestorableTextEditingController();

  @override
  String get restorationId => 'draft_page';

  @override
  void restoreState(RestorationBucket? oldBucket, bool initialRestore) {
    registerForRestoration(_draft, 'draft_text'); // backed by Bundle or restoration archive
  }
}
```

**Follow-up an interviewer asks next:** "If the process died right now and the user came back in
five minutes, what would they be upset to lose?" That question is the actual design tool — it
separates a draft comment or an in-progress form (must be persisted) from a re-fetchable list of
search results (fine to reload). It also explains the size limit on Android's Bundle path: roughly
1MB total, `TransactionTooLargeException` past it, which only makes sense once you accept the
Bundle is for a small unsaved-input snapshot, not a cache.

**Pitfall at this level:** persisting everything on general principle, or persisting nothing
because "the user probably won't background the app mid-task." Both are guesses. Ask the five-
minute question per screen instead of applying one policy everywhere.

## Senior

**Interview question: "Why was this process actually killed — and is it a bug?"**

**Android.** A `Service` is not a background thread by default — it runs on the main looper unless
you explicitly offload work — its real function is telling the LMK (Low Memory Killer) how
important this process is to keep alive. A foreground service, the kind holding a visible
notification, lands in the `fg-service` priority bucket and is rarely killed. A bound service is
elevated only while a client is actually bound to it. A plain background service isn't allowed to
start at all on API 26+; that work has to move to WorkManager. Independent of Doze mode, every app
also sits in a standby bucket — `Active`, `Working Set`, `Frequent`, `Rare`, `Restricted` — driven
by usage recency and frequency, and that bucket throttles how often WorkManager or JobScheduler
jobs actually run no matter what the job requested. Put together: a field report of "the app got
killed" may be the LMK doing exactly what it's designed to do to a low-priority process sitting in
a restricted standby bucket during Doze — not a leak, not a regression. Check the process's
priority signal and standby bucket before chasing a memory leak that isn't there. Vendor-customized
Android adds a wrinkle on top of all this: OEM battery managers layered on stock AOSP can kill or
restrict more aggressively than Doze and standby buckets alone would predict, undocumented, and
varying by vendor and OS version — the practical mitigation is instrumenting the app so a "killed
while a foreground service should have kept it alive" event reaches telemetry, rather than
discovering the pattern from a support ticket weeks later.

**iOS.** Jetsam is the direct analogue of the LMK, with one structural difference that matters more
than any naming difference: Jetsam enforces a hard, per-app memory limit that varies by device
model, and crossing it is an instant kill — a graduated response is not on offer, and it can happen
even while the rest of the system isn't under any general memory pressure. There's no API to raise
that limit; the only lever is using less memory, and the one signal you get to react in advance is
`UIApplication.didReceiveMemoryWarningNotification`, where releasing caches (image caches,
prefetched data) is the entire playbook.

```swift
NotificationCenter.default.addObserver(
    forName: UIApplication.didReceiveMemoryWarningNotification, object: nil, queue: .main
) { _ in
    ImageCache.shared.removeAll() // the only lever before Jetsam's hard ceiling hits
}
```

That is the structural difference to name out loud in an interview: Android's LMK reasons about
whole-system memory and demotes a process's priority accordingly, a graduated response; iOS
additionally enforces a fixed per-app ceiling regardless of what the rest of the system is doing —
crossing it kills you even if no other app is under pressure.

**Flutter.** `WidgetsBindingObserver.didHaveMemoryPressure()` fires on both platforms' low-memory
signals — Android's `onTrimMemory`/LMK pressure and iOS's memory-warning notification/Jetsam
pressure alike — as one unified callback. What it does not do is change the underlying kill
mechanics: a Flutter app's engine and Dart VM run inside the same OS process as any native app, so
everything above about the LMK's graduated priority model and Jetsam's hard ceiling applies to a
Flutter app exactly as written. There is no Flutter-specific escape from either killer — only a
single place, `didHaveMemoryPressure`, to react to whichever one just fired.

> [!IMPORTANT]
> The Senior-level insight is the same shape on all three platforms: a kill is not automatically a
> bug. Before treating one as a regression, check the priority signal (Android: service type,
> standby bucket, Doze state; iOS: recent memory footprint against the device's Jetsam ceiling) —
> only a kill that contradicts that signal (a foreground service dying anyway, a well-under-limit
> footprint dying anyway) is worth escalating as a genuine problem, and OEM divergence on Android
> means that escalation needs its own telemetry rather than a support-ticket guess.

**Follow-up:** "So what do you actually change once you've confirmed it's not a bug?" On Android,
correct the priority signal — promote genuinely user-visible ongoing work to a foreground service,
move background work off a plain `Service` and onto WorkManager, and instrument standby-bucket
transitions rather than guessing. On iOS, reduce peak memory footprint proactively (release caches
on the memory-warning notification before Jetsam's ceiling, not after) since there's no limit to
negotiate with. On Flutter, react to `didHaveMemoryPressure` the same way you would to the native
signal it's standing in for — it doesn't buy you a different mechanism, only a shared entry point.

**Senior pitfall:** treating an LMK or Jetsam kill as inherently a crash to fix, instead of first
checking whether the process's own priority signal predicted it — chasing a "memory leak" that is
actually correct OS behavior against a low-priority or over-ceiling process wastes a debugging
cycle that instrumentation would have shortcut.

## Cross-platform comparison table

| | Android | iOS | Flutter |
|---|---|---|---|
| Killed while backgrounded | LMK, priority-signal-based (service type, standby bucket, Doze), graduated response | Jetsam, hard per-app memory ceiling by device model, instant kill on crossing it | Same OS mechanism underneath (LMK or Jetsam) — Flutter has no override |
| State-preserving mechanism | `onSaveInstanceState` Bundle, persisted to disk before a kill | Proactive disk write on `sceneDidEnterBackground` — no reliable termination callback to wait for | `RestorationMixin` or restoration properties, backed by whichever native mechanism runs underneath |
| Unified lifecycle callback | Activity lifecycle methods (`onCreate`, `onSaveInstanceState`, ...) | Scene delegate methods (`sceneDidBecomeActive`, `sceneWillResignActive`, ...) | `didChangeAppLifecycleState` |

## Pitfalls & trade-offs

- **Mid:** applying one blanket persistence policy — save everything, or save nothing — instead of
  asking the five-minute question per screen to decide what actually belongs in the small
  Bundle-or-disk snapshot.
- **Mid:** waiting on an iOS termination callback that has no reliable firing guarantee — persist
  proactively on `sceneDidEnterBackground` instead of on termination.
- **Senior:** assuming a field-reported kill is a bug before checking the process's own priority
  signal — Android's standby bucket and service type, or iOS's memory footprint against the
  device's Jetsam ceiling — a kill that matches the signal is the OS working as designed.
- **Senior:** forgetting Android's OEM battery-manager divergence when reasoning purely from stock
  Doze and standby-bucket behavior — a vendor-customized device can kill more aggressively than
  either predicts, and the only reliable fix is telemetry on the app side, not a documentation
  search.
