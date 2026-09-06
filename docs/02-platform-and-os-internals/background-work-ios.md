---
id: platform-background-work-ios
title: Background Work & Scheduling on iOS — BGTaskScheduler's Best-Effort Contract & Extension Budgets
description: Why BGTaskScheduler only guarantees an attempt might be made, not that it will run, and why an app extension's Jetsam budget is often an order of magnitude smaller than the host app's.
tags: [background-work, bgtaskscheduler, ios, mid, senior]
lang: en
status: complete
domain: 02-platform-and-os-internals
platform: shared
band: X
level: Mid
sidebar_position: 2
topic: background-work
leaf: iOS
prerequisites: []
outcomes:
  - "Explain why BGTaskScheduler is best-effort, not guaranteed, and reschedule correctly"
  - "Name the fix for a large payload crossing an XPC/extension boundary"
resources:
  - title: "BGTaskScheduler"
    url: "https://developer.apple.com/documentation/backgroundtasks/bgtaskscheduler"
    date: "2025-06-01"
---

# Background Work & Scheduling on iOS — BGTaskScheduler's Best-Effort Contract & Extension Budgets

Asking for background work is really asking one of three different favors, and mixing them up is
where most of the bugs in this article start. On iOS, the honest question is never "will this
run," it's "might this run, and how do I make sure I've done the useful part before it's cut off."

## Mid {concept=background-work/mechanism-choice}

**Interview question: "How does BGTaskScheduler actually behave, and what do you have to do
differently because of it?"**

**`BGTaskScheduler` registers a background task the system runs entirely at its own discretion.**

```swift
func scheduleAppRefresh() {
    let request = BGAppRefreshTaskRequest(identifier: "com.example.app.refresh")
    request.earliestBeginDate = Date(timeIntervalSinceNow: 15 * 60)
    try? BGTaskScheduler.shared.submit(request)
}

func handleAppRefresh(task: BGAppRefreshTask) {
    // Reschedule for next time BEFORE this task's own work even starts —
    // there's no guarantee this invocation gets to finish.
    scheduleAppRefresh()
    let operation = RefreshOperation()
    task.expirationHandler = { operation.cancel() }
    operation.completionBlock = { task.setTaskCompleted(success: !operation.isCancelled) }
    operation.start()
}
```

**Not "later, guaranteed," but "maybe, if conditions look favorable."** The simulator can force a
background task to run on demand, a debugger command that exists specifically because otherwise
nobody could test this path at all. A real device instead weighs battery level, how recently and
how often the user opens the app, and system-wide load, and can go days without running the task
even once. **There is no Android equivalent to this uncertainty:** `WorkManager` guarantees
eventual execution once its constraints are met; `BGTaskScheduler` guarantees only that an attempt
*might* be made.

**Follow-up an interviewer asks next:** "Why reschedule before the current task's work even
starts?" Because the current invocation might be cut off by its `expirationHandler` before
completing — if rescheduling happened only at the end, a cut-off invocation would silently mean no
future attempt is ever scheduled either.

**Pitfall at this level:** rescheduling the next `BGAppRefreshTaskRequest` only after the current
task's work completes — if the current invocation is cut off first, no future attempt gets
scheduled at all.

## Senior {concept=background-work/ipc-boundary}

**Interview question: "Your background work needs to hand data across an extension boundary — what
actually breaks at scale?"**

**An app extension — a share extension, a widget, a notification service extension — runs as its
own process with its own, often much smaller, Jetsam memory limit.**

```swift
// A notification service extension has roughly 24MB before Jetsam kills it
// (device-dependent) — decoding a large image to build a rich notification
// can exceed this budget on its own.
class NotificationService: UNNotificationServiceExtension {
    override func didReceive(_ request: UNNotificationRequest,
                              withContentHandler contentHandler: @escaping (UNNotificationContent) -> Void) {
        // Downscale BEFORE decoding fully into memory — the extension's budget assumes it.
    }
}
```

An iOS extension's budget is separate and often far smaller than the host app's: a widget's limit
is typically tens of megabytes, an order of magnitude below the host app's. Code shared between an
app and its extension via XPC or an app group container has to be written against the extension's
budget, not the host app's — the same function that runs fine as part of background work in the
main app can crash the moment it's reused inside a notification service extension handed the same
payload.

**Follow-up:** "So how do you actually verify this before it ships?" Load-test the extension with a
payload representative of the worst real case, not the demo case — a large photo attached to a
push notification is exactly the kind of thing that passes review small and fails in the field once
a user's actual image is bigger than the test fixture.

**Pitfall at this level:** reusing app-scoped code inside an iOS extension without checking its
memory budget — a function that behaves fine in the host app can single-handedly exceed a
notification service extension's entire Jetsam limit.

## Cross-platform comparison

See the cross-platform comparison table in the Android or Flutter version of this topic (switch
the platform tab above) for how WorkManager's guaranteed execution and Binder's transaction limit
differ from BGTaskScheduler and extension memory budgets.

## Pitfalls & trade-offs

- **Mid:** rescheduling the next background task only after the current one's work completes,
  instead of before it starts — a cut-off invocation then leaves no future attempt scheduled.
- **Senior:** reusing app-scoped code inside an iOS extension without checking its memory budget —
  a function fine in the host app can exceed the extension's entire Jetsam limit on its own.
