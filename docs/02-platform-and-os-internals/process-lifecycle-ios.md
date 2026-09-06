---
id: platform-process-lifecycle-ios
title: Process Lifecycle & Death on iOS — Scene States & Jetsam's Hard Ceiling
description: Why there's no reliable termination callback to wait for on iOS, and how Jetsam's hard per-app memory ceiling differs structurally from Android's graduated Low Memory Killer.
tags: [lifecycle, process-death, ios, mid, senior]
lang: en
status: complete
domain: 02-platform-and-os-internals
platform: shared
band: X
level: Mid
sidebar_position: 1
topic: process-lifecycle
leaf: iOS
prerequisites: []
outcomes:
  - "Explain why persistence has to happen on sceneDidEnterBackground, not a termination callback"
  - "Diagnose whether a field kill is Jetsam's hard ceiling working correctly, or a genuine bug"
resources:
  - title: "Managing your app's life cycle"
    url: "https://developer.apple.com/documentation/uikit/managing-your-app-s-life-cycle"
    date: "2025-06-01"
---

# Process Lifecycle & Death on iOS — Scene States & Jetsam's Hard Ceiling

Rotate a phone and the screen redraws instantly with everything intact. Leave the app backgrounded
for twenty minutes and come back to find it restarted from scratch, scroll position gone. To the
user these look like the same kind of interruption. iOS gives you no reliable signal to tell them
apart in advance.

## Mid {concept=process-lifecycle/config-vs-death}

**Interview question: "How does iOS's lifecycle differ from a simple destroy-and-recreate model,
and when do you actually persist state?"**

**There's no single "destroy and recreate this screen" event** — instead the app, and each scene
on multi-window iPad, moves through `notRunning`, `inactive`, `active`, `background`, and
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

**Follow-up an interviewer asks next:** "If the process died right now and the user came back in
five minutes, what would they be upset to lose?" That question is the actual design tool — it
separates a draft comment or an in-progress form (must be persisted) from a re-fetchable list of
search results (fine to reload).

**Pitfall at this level:** waiting on a termination callback that has no reliable firing
guarantee — persist proactively on `sceneDidEnterBackground` instead of on termination.

## Senior {concept=process-lifecycle/kill-diagnosis}

**Interview question: "Why was this process actually killed — and is it a bug?"**

**Jetsam is the direct analogue of Android's LMK, with one structural difference that matters more
than any naming difference: Jetsam enforces a hard, per-app memory limit that varies by device
model, and crossing it is an instant kill** — a graduated response is not on offer, and it can
happen even while the rest of the system isn't under any general memory pressure. There's no API to
raise that limit; the only lever is using less memory, and the one signal you get to react in
advance is `UIApplication.didReceiveMemoryWarningNotification`, where releasing caches (image
caches, prefetched data) is the entire playbook.

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

> [!IMPORTANT]
> A kill is not automatically a bug. Before treating one as a regression, check the priority signal
> — recent memory footprint against the device's Jetsam ceiling — only a kill that contradicts
> that signal (a well-under-limit footprint dying anyway) is worth escalating as a genuine problem.

**Follow-up:** "So what do you actually change once you've confirmed it's not a bug?" Reduce peak
memory footprint proactively — release caches on the memory-warning notification before Jetsam's
ceiling, not after — since there's no limit to negotiate with, unlike Android where you can at
least influence process priority.

**Pitfall at this level:** treating a Jetsam kill as inherently a crash to fix, instead of first
checking the app's own memory footprint against the device's ceiling — chasing a "memory leak"
that is actually correct OS behavior against an over-ceiling process wastes a debugging cycle that
instrumentation would have shortcut.

## Cross-platform comparison

See the cross-platform comparison table in the Android or Flutter version of this topic (switch
the platform tab above) for how the LMK's graduated, priority-based response differs structurally
from Jetsam's hard ceiling.

## Pitfalls & trade-offs

- **Mid:** waiting on a termination callback that has no reliable firing guarantee — persist
  proactively on `sceneDidEnterBackground` instead.
- **Senior:** assuming a field-reported kill is a bug before checking the app's memory footprint
  against the device's Jetsam ceiling — a kill that matches the signal is the OS working as
  designed.
- **Senior:** releasing caches only after `didReceiveMemoryWarningNotification` fires repeatedly,
  rather than proactively keeping peak footprint well under the ceiling — there's no negotiation
  once Jetsam's hard limit is crossed.
