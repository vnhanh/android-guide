---
id: data-senior-android
title: Offline-First Sync, Conflict Resolution & Durable Retry Queues (Senior, Android)
description: Repository pattern and single source of truth, optimistic UI on durable WorkManager queues, conflict resolution strategies, and sync engine design.
tags: [android, offline-first, sync, workmanager, senior]
lang: en
status: complete
domain: 05-data-persistence-and-offline
band: S
platform: android
level: Senior
sidebar_position: 3
topic: data-senior
leaf: Android
prerequisites: [data-mid-android]
outcomes:
  - "Build an offline-first flow and state its conflict rule in one sentence. If you cannot, you have not chosen one."
counterpart: data-senior-ios
resources:
  - title: "Guide to app architecture — offline-first"
    url: "https://developer.android.com/topic/architecture/data-layer/offline-first"
    date: "2025-03-01"
  - title: "WorkManager — guaranteed execution"
    url: "https://developer.android.com/develop/background-work/background-tasks/persistent"
    date: "2025-03-01"
  - title: "CRDTs — a comprehensive study"
    url: "https://crdt.tech/"
    date: "2024-01-01"
---

# Offline-First Sync, Conflict Resolution & Durable Retry Queues

> **Outcome.** Build an offline-first flow and state its conflict rule in one sentence. If you
> cannot state it in one sentence, the design has not actually chosen a conflict rule — it has
> deferred the choice to whichever code path happens to run last.

## 1. Repository pattern and single source of truth

```kotlin
// The database, not the network response, is the single source of truth the UI observes.
// A write always goes through the local database first — the UI updates from the DB emission,
// not from the network call's own response directly.
class TaskRepository(private val dao: TaskDao, private val api: TaskApi) {
    fun observeTasks(): Flow<List<Task>> = dao.observeAll().map { it.map(TaskEntity::toDomain) }

    suspend fun toggleComplete(taskId: String, completed: Boolean) {
        dao.updateCompleted(taskId, completed) // UI updates immediately, from this write
        workManager.enqueueUniqueWork(          // network sync is a durable, separate concern
            "sync-task-$taskId", ExistingWorkPolicy.REPLACE,
            OneTimeWorkRequestBuilder<SyncTaskWorker>().setInputData(workDataOf("taskId" to taskId)).build(),
        )
    }
}
```

## 2. Optimistic UI and durable retry queues on `WorkManager` {concept=data-senior/durable-retry-queue}

```markdown
## Worked case: optimistic UI + durable retry, task-completion toggle

Situation: toggling a task's completion felt slow — the UI waited for the network
round-trip before updating, and a poor connection made every tap feel unresponsive.

Action: the local database write happens synchronously on tap (the repository code
above) — the checkbox updates instantly, sourced from the DB, not from the pending
network call. The actual sync is enqueued as unique WorkManager work keyed by task ID,
so a rapid double-toggle correctly replaces the pending sync rather than racing two
network calls. If the sync ultimately fails (assume the device stayed offline), the
local row is marked `pendingSync = true` and WorkManager retries with backoff,
guaranteed to eventually run once connectivity returns and constraints are met —
this is `WorkManager`'s reliability guarantee doing the actual retry work here, not a
manual retry loop.

Result: perceived latency became zero for this interaction; the durable queue
(rather than a fire-and-forget network call with no retry) is what makes it safe to
update the UI optimistically at all — this is not a general licence to update instantly
without an actual delivery guarantee behind it.
```

> [!IMPORTANT]
> Optimistic UI is only honest when a durable retry mechanism backs it. Updating the UI
> immediately and firing an unguaranteed network call, with no retry queue, is optimistic UI
> without the durability that makes rolling back — or eventually succeeding — actually happen;
> a lost connection at the wrong moment silently diverges the local and server state forever.

## 3. Conflict resolution: LWW, version vectors, CRDTs, and when each is honest

```kotlin
// Last-Write-Wins: simplest, and honest ONLY when losing a concurrent edit silently
// is an acceptable, stated behaviour — a single-user "notes" field is often fine with this.
data class SyncableNote(val id: String, val text: String, val updatedAt: Instant)
fun resolve(local: SyncableNote, remote: SyncableNote) =
    if (local.updatedAt > remote.updatedAt) local else remote // the loser's edit is GONE
```

```kotlin
// Version vectors: detect that a conflict happened (both sides advanced from the same
// base version independently) without deciding a winner — honest about NOT resolving
// automatically; the conflict is surfaced for merge, not silently dropped.
data class VersionedNote(val id: String, val text: String, val versionVector: Map<String, Int>)
fun hasConflict(local: VersionedNote, remote: VersionedNote): Boolean =
    !dominates(local.versionVector, remote.versionVector) && !dominates(remote.versionVector, local.versionVector)
```

CRDTs (conflict-free replicated data types) go further: the data structure itself is designed so
concurrent edits merge deterministically with no lost data and no manual conflict UI — honest
for structures that actually fit the shape (a counter, a set of additions, certain list/text
structures), and dishonest as a blanket solution applied to a general-purpose object graph it
was never designed for.

| Strategy | What happens to a lost concurrent edit | Honest for |
| :--- | :--- | :--- |
| LWW | Silently discarded | Fields where losing a rare concurrent edit is genuinely acceptable |
| Version vectors | Detected, surfaced for manual/UI-level merge | Data where a human should decide, and conflicts are rare enough to review |
| CRDTs | Merged deterministically, nothing lost | Data structures that actually fit a CRDT shape (counters, grow-only sets, some text types) |

## 4. Sync engine design, and partial sync over a mutable set {concept=data-senior/sync-engine-design}

```kotlin
// Delta sync: request only what changed since the last successful sync cursor,
// not the entire dataset every time — essential once the dataset is large.
suspend fun syncTasks(lastSyncCursor: String?): SyncResult {
    val response = api.fetchTaskDeltas(since = lastSyncCursor)
    dao.applyDeltas(response.created, response.updated, response.deletedIds)
    return SyncResult(newCursor = response.cursor)
}
```

> [!WARNING]
> Paginating a delta sync over a **mutable** set — one where items can be added, updated, or
> deleted between pages — needs a cursor strategy that tolerates the set changing mid-sync (a
> timestamp- or version-based cursor, not a plain page-offset), or a page boundary can silently
> skip an item that moved position between requests, or double-apply one that didn't.

## Stating the conflict rule in one sentence

The outcome's actual test, applied to the worked task-completion example above: *"a task's
completion state uses last-write-wins by updated timestamp — a concurrent edit older than the
winning one is discarded, which is acceptable because this app has no notion of a completion
history a user would need to recover."* That sentence names the strategy, the field it applies
to, and *why* the acceptable-loss trade-off is actually acceptable for this specific data — a
design that can't produce this sentence has not chosen a conflict rule yet.

## Pitfalls & trade-offs

- **Optimistic UI with no durable retry behind it.** Covered above — without a guarantee like
  `WorkManager`'s, it's an update that can silently diverge from the server, not genuine
  optimism about a guaranteed-eventual outcome.
- **Applying CRDTs to a general object graph they weren't designed to merge.** A CRDT's
  guarantee is real only for the specific structures built for it — treating it as a universal
  fix produces confident-looking code with no actual conflict-freedom guarantee behind it.
- **A page-offset cursor over a set that mutates during sync.** Covered above — use a
  timestamp or version cursor for anything that can change mid-sync.
- **Building the whole sync design without ever writing the one-sentence conflict rule down.**
  The sentence is the artifact that proves the decision was actually made, not deferred to
  whichever write happens to land last in production.
