---
id: data-senior-ios
title: Offline-First Sync on BGTaskScheduler & CloudKit (Senior, iOS)
description: The same offline-first discipline on BGTaskScheduler plus CloudKit or custom sync, and why a durable queue is harder to trust on iOS.
tags: [ios, offline-first, sync, bgtaskscheduler, cloudkit, senior]
lang: en
status: complete
domain: 05-data-persistence-and-offline
band: S
platform: ios
level: Senior
sidebar_position: 4
prerequisites: [data-mid-ios]
outcomes:
  - "State a behaviour for the case where background execution never happens for days, not just for the common case where it does"
counterpart: data-senior-android
resources:
  - title: "BGTaskScheduler"
    url: "https://developer.apple.com/documentation/backgroundtasks/bgtaskscheduler"
    date: "2025-06-01"
  - title: "CloudKit"
    url: "https://developer.apple.com/documentation/cloudkit"
    date: "2025-06-01"
  - title: "Designing for offline-first — WWDC"
    url: "https://developer.apple.com/videos/play/wwdc2021/10018/"
    date: "2024-09-01"
---

# Offline-First Sync on BGTaskScheduler & CloudKit

> **Outcome.** Apply the same repository/single-source-of-truth and optimistic-UI discipline
> from the Android article, and state — explicitly, as a designed behaviour, not an
> afterthought — what happens when background sync simply never runs for days, because on this
> platform that is not a hypothetical edge case.

## 1. The same four, on `BGTaskScheduler`

```swift
// Same shape as the Android repository: the local store is the single source of
// truth; the UI reads from it, a background task is the durable-ish sync mechanism.
@Observable
final class TaskStore {
    func toggleComplete(taskId: String, completed: Bool) {
        localDatabase.updateCompleted(taskId, completed) // UI updates immediately
        pendingSyncIds.insert(taskId)                      // marked for the next sync attempt
        scheduleBackgroundSync()                           // best-effort, NOT guaranteed
    }
}

func scheduleBackgroundSync() {
    let request = BGProcessingTaskRequest(identifier: "com.example.app.sync")
    request.requiresNetworkConnectivity = true
    try? BGTaskScheduler.shared.submit(request)
}
```

## 2. Why a durable queue is genuinely harder here

`WorkManager`'s durability guarantee — eventual execution once constraints are met, surviving
reboot — has no equivalent strength on iOS. `BGTaskScheduler` submits a *request*; the system
decides whether, and when, to actually run it, based on usage patterns, battery, and system
load it does not expose to the app.

> [!IMPORTANT]
> This is this article's outcome, stated precisely: an offline-first design that assumes
> "background sync will run eventually, like `WorkManager`" is not offline-first on iOS, it is
> offline-and-hope. The honest design states what the app does if background sync **never
> fires for days** — because that is an observed real-world outcome for some users, not a
> theoretical worst case. Two real answers, chosen deliberately rather than left unstated:
> foreground sync on next app launch as the actual reliable path (background sync is a nice-to-
> have acceleration, not the guarantee), or a push-triggered silent notification prompting a
> sync attempt when the app is opened.

```swift
// Foreground sync on launch is the honest fallback path — it does not depend on
// BGTaskScheduler having run at all, and covers every user regardless of how
// favourably the system's background-execution heuristics treated this app.
func applicationDidBecomeActive() {
    Task { await taskStore.syncPendingChanges() }
}
```

## 3. CloudKit or custom sync

```swift
// CloudKit: Apple-managed sync across a user's devices, with built-in conflict
// detection (CKRecord's server change token) — a real option when the sync
// requirement is "this user's own data, across their own devices," and a poor fit
// for cross-user or server-authoritative data models CloudKit wasn't designed for.
let record = CKRecord(recordType: "Task")
record["title"] = task.title
record["completed"] = task.completed
database.save(record) { savedRecord, error in
    if let ckError = error as? CKError, ckError.code == .serverRecordChanged {
        // A genuine conflict — CloudKit surfaces it rather than silently picking a winner.
    }
}
```

For a server-authoritative model — data owned by a backend other clients and platforms also
write to — a custom sync engine (matching the Android article's delta/cursor approach) is the
correct fit; CloudKit's guarantees are specifically about this user's own iCloud-synced data,
not a shared backend.

## Stating the "days of no background execution" behaviour explicitly

The same one-sentence-conflict-rule discipline from the Android article, applied to the
background-execution gap specifically: *"if background sync has not run in the last 24 hours,
the next foreground launch performs a blocking sync-check before rendering cached data as
current, showing a 'last updated' timestamp rather than presenting stale data as fresh."* That
sentence is the artifact — a design with no stated answer for "it's been three days with no
background execution" has not actually designed for this platform's real background-execution
behaviour, only for its optimistic case.

## Pitfalls & trade-offs

- **Assuming `BGTaskScheduler` provides a `WorkManager`-equivalent durability guarantee.**
  Covered above — this is the single most expensive assumption an Android-trained team carries
  into an iOS sync design.
- **No stated behaviour for extended periods with zero background execution.** The outcome this
  article names directly — foreground-launch sync as the honest fallback, not an afterthought.
- **Reaching for CloudKit for a server-authoritative, cross-platform data model.** CloudKit's
  conflict handling and guarantees are scoped to a user's own iCloud data; a shared backend
  needs a custom sync engine that both platforms can implement against consistently.
- **Presenting cached data with no staleness indicator when background sync's actual freshness
  is unknown.** A "last updated" timestamp is cheap and turns a silent staleness risk into
  something the user can at least see and judge for themselves.
