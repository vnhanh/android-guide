---
id: platform-mid-ios
title: App/Scene Lifecycle, Background Modes & the One-Shot Permission Problem (Mid, iOS)
description: App and scene lifecycle, background modes and BGTaskScheduler, suspension/termination/state restoration, permission prompts, and URL schemes vs Universal Links.
tags: [ios, lifecycle, background-modes, permissions, mid]
lang: en
status: complete
domain: 02-platform-and-os-internals
band: M
platform: ios
level: Mid
sidebar_position: 2
prerequisites: [fundamentals-mid-ios]
outcomes:
  - "Explain why a background refresh that works in the simulator may never run on a real device"
counterpart: platform-mid-android
resources:
  - title: "Managing your app's life cycle"
    url: "https://developer.apple.com/documentation/uikit/managing-your-app-s-life-cycle"
    date: "2025-06-01"
  - title: "BGTaskScheduler"
    url: "https://developer.apple.com/documentation/backgroundtasks/bgtaskscheduler"
    date: "2025-06-01"
  - title: "Requesting authorization for media capture"
    url: "https://developer.apple.com/documentation/avfoundation/requesting-authorization-to-capture-and-save-media"
    date: "2024-09-01"
  - title: "Universal Links"
    url: "https://developer.apple.com/ios/universal-links/"
    date: "2024-09-01"
---

# App/Scene Lifecycle, Background Modes & the One-Shot Permission Problem

> **Outcome.** Explain, precisely, why a background refresh task that fires reliably in the
> simulator may never run at all on a real device — a fact that surprises every
> Android-trained engineer exactly once.

## 1. App & scene lifecycle

An iOS app moves through a small set of states — `notRunning`, `inactive`, `active`,
`background`, `suspended` — and on a multi-window iPad app, each **scene** has its own lifecycle
nested inside the app's:

```swift
final class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    func sceneDidBecomeActive(_ scene: UIScene) {
        // Equivalent moment to Android's onResume — the scene is now receiving events.
    }

    func sceneWillResignActive(_ scene: UIScene) {
        // Equivalent to onPause — about to lose focus (an incoming call, Control Center).
        // Save anything that must not be lost if the app is suspended next.
    }

    func sceneDidEnterBackground(_ scene: UIScene) {
        // The scene is no longer visible. The process may be suspended (frozen, not
        // killed) very shortly after this — there is no reliable "onStop but still running"
        // window to rely on for further work.
    }
}
```

## 2. Suspension, termination and state restoration

**Suspension** freezes the process in memory without killing it — resuming is instant because
nothing was destroyed. **Termination** actually ends the process; the system does this silently,
without calling any delegate method reliably, whenever it needs the memory. From the user's
perspective these look identical — the app "was just there" — which is exactly why state
restoration cannot depend on a termination callback firing:

```swift
// Persist state proactively, on scene backgrounding — not on a termination
// callback, because there is no guaranteed termination callback to depend on.
func sceneDidEnterBackground(_ scene: UIScene) {
    let state = ProfileDraftState(text: currentDraftText)
    try? JSONEncoder().encode(state).write(to: draftStateURL)
}
```

## 3. Background modes and `BGTaskScheduler` — the fact that surprises Android engineers

`BGTaskScheduler` lets an app register a background task the system runs *at its own discretion*
— there is no guarantee of when, or whether, it runs at all:

```swift
func scheduleAppRefresh() {
    let request = BGAppRefreshTaskRequest(identifier: "com.example.app.refresh")
    request.earliestBeginDate = Date(timeIntervalSinceNow: 15 * 60)
    try? BGTaskScheduler.shared.submit(request)
}

func handleAppRefresh(task: BGAppRefreshTask) {
    // This runs when — and only when — iOS decides conditions are favorable:
    // sufficient battery, the app used recently enough, low system load.
    scheduleAppRefresh() // reschedule for next time before this task's work even starts
    let operation = RefreshOperation()
    task.expirationHandler = { operation.cancel() }
    operation.completionBlock = { task.setTaskCompleted(success: !operation.isCancelled) }
    operation.start()
}
```

> [!IMPORTANT]
> This is the article's outcome, stated precisely: the **simulator runs a background task on
> demand** (there is a debugger command to force it, specifically because otherwise nobody could
> test this at all) — a real device evaluates battery level, how recently and how often the user
> opens the app, and system-wide load, and can go days without running the task even once. A
> demo that "works" on a connected simulator has validated nothing about production behaviour.
> There is no Android equivalent to this uncertainty — `WorkManager` guarantees eventual
> execution once its constraints are met; `BGTaskScheduler` guarantees an attempt to run it
> *might* be made.

## 4. Permission prompts and the one-shot problem

iOS shows a system permission prompt **exactly once** per permission per install — there is no
"ask again with rationale" flow. Denying it, even accidentally, leaves exactly one path back:

```swift
func requestCameraAccess() async -> Bool {
    switch AVCaptureDevice.authorizationStatus(for: .video) {
    case .authorized:
        return true
    case .notDetermined:
        // The ONE opportunity to show the system prompt. Once this returns having
        // been denied, calling this again will not show the prompt a second time.
        return await AVCaptureDevice.requestAccess(for: .video)
    case .denied, .restricted:
        // The only remaining path is Settings — there is no in-app re-prompt.
        return false
    @unknown default:
        return false
    }
}
```

> [!WARNING]
> Because the system prompt only ever appears once, the pre-permission explanation screen —
> telling the user *why* the app wants camera access, before triggering the system dialog — is
> not a nicety here the way an Android rationale dialog (shown after a denial, with more
> chances) is. On iOS it is the only chance to influence the decision at all.

## 5. URL schemes vs Universal Links

A custom URL scheme (`myapp://profile/123`) is easy to set up but colliding and spoofable — any
app can register the same scheme, and the OS picks one non-deterministically. Universal Links
use ordinary `https://` URLs validated against a domain the app's team actually controls:

```swift
// Info.plist / Associated Domains capability declares:
// applinks:example.com
// The server hosts /.well-known/apple-app-site-association naming this app's Team ID + Bundle ID.

func application(_ application: UIApplication,
                  continue userActivity: NSUserActivity,
                  restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
    guard userActivity.activityType == NSUserActivityTypeBrowsingWeb,
          let url = userActivity.webpageURL else { return false }
    handleUniversalLink(url)
    return true
}
```

## Pitfalls & trade-offs

- **Trusting a background task's behaviour in the simulator as representative of production.**
  Covered above — this is the whole point of this article's outcome, and the single most
  expensive assumption to carry from Android's `WorkManager` guarantees.
- **Depending on a termination delegate callback to persist state.** There is no reliable one;
  persist proactively on backgrounding instead.
- **Skipping the pre-permission explanation screen.** With no re-prompt available, an
  accidental or under-informed denial is effectively permanent without a trip to Settings —
  the explanation has to do its job before the system dialog, not after.
- **Registering a custom URL scheme for anything security-sensitive** (an auth callback, a
  payment redirect). Schemes are not exclusive to one app; Universal Links, validated against a
  domain, are the only one of the two with any real ownership guarantee.
