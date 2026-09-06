---
id: system-design-mid
title: The Building Blocks of a Mobile System Design (Mid, Android + iOS)
description: The layers a mobile client is actually made of — cache, sync, transport, auth — designing one feature end to end across them, and naming failure modes before writing the first line of code.
tags: [system-design, architecture, offline, mid]
lang: en
status: complete
domain: 13-mobile-system-design
band: M
platform: shared
level: Mid
sidebar_position: 1
prerequisites: [architecture-senior, networking-senior, data-senior-android, data-senior-ios]
outcomes:
  - "Draw a feature's data flow end to end and list what happens at each point on that diagram when the network is gone"
resources:
  - title: "Offline-first — a definition"
    url: "https://www.google.com/search?q=offline+first+pouchdb+manifesto"
    date: "2024-01-01"
  - title: "Designing data-heavy applications on mobile — a client's-eye view"
    url: "https://developer.android.com/topic/architecture"
    date: "2025-01-01"
  - title: "iOS app architecture — layering"
    url: "https://developer.apple.com/documentation/xcode/structuring-your-app-for-swiftui-previews"
    date: "2024-06-01"
---

# The Building Blocks of a Mobile System Design

> **Outcome.** Draw a feature's data flow end to end — every layer the data passes through,
> both directions — and, at each point on that diagram, state what happens when the network is
> gone. Not "it fails gracefully." What actually happens, at that box, in that state.

This unit is the vocabulary the rest of domain 13 assumes. It draws on four units you have
already done the work for — [architecture](../07-architecture-and-modularisation/senior-shared.md),
[networking](../06-networking-and-api-integration/senior-shared.md), and
[data persistence](../05-data-persistence-and-offline/senior-android.md) on both platforms — and
asks a different question of the same material: not "how does this layer work," but "how do the
layers fit together into one design, and what happens at the seams when something breaks."

System design at the Mid band is not yet about the four large worked problems the Senior unit
takes on. It is about being able to draw *one* feature's data flow without leaving out a layer,
and naming what breaks before a reviewer has to ask.

## 1. The building blocks: layers, cache, sync, transport, auth

Every mobile feature that touches a network is built from the same five layers, whether or not
the codebase names them explicitly:

| Layer | Job | What it looks like on Android | What it looks like on iOS |
| :--- | :--- | :--- | :--- |
| **UI / presentation** | Renders state, forwards intent | Compose + ViewModel | SwiftUI + `@Observable` view model |
| **Domain / use case** | Business rules, independent of storage or transport | plain Kotlin use-case classes | plain Swift types |
| **Cache / local store** | Single source of truth the UI actually reads from | Room + DataStore | SwiftData/Core Data/GRDB + Keychain |
| **Sync** | Reconciles local state with the server, in both directions | `WorkManager` + repository | `BGTaskScheduler` + repository |
| **Transport** | Moves bytes, handles retries, owns the wire format | OkHttp/Retrofit | `URLSession` |
| **Auth** | Proves who's asking, refreshes before it's asked again | token store + interceptor | token store + `URLProtocol`/delegate |

The layer that trips up a Mid-band design most often is **cache**. It's tempting to treat the
local store as a copy of the last server response — a cache in the CDN sense. In a
well-designed mobile client the local store is not a copy of the truth, it *is* the truth the UI
reads from; sync is the background process that keeps it honest against the server. This is the
repository pattern from domain 05, and it is the single idea that makes the rest of this unit's
"what happens when the network is gone" question answerable at all: if the UI reads the network
directly, the answer is "the screen breaks." If the UI reads the local store, the answer is a
design decision — stale data, a loading state, an explicit "last synced" timestamp — rather than
an accident.

```
UI  ──reads──▶  Local store (source of truth)  ◀──writes── Sync layer  ◀──▶  Transport  ◀──▶  Server
 │                                                              │
 └──intent (e.g. "send message")──────────────────────────────▶┘
```

**Auth** sits across this whole diagram rather than inside one box: the transport layer needs a
valid token on every request, the sync layer needs to keep working through a token refresh
without re-sending duplicate work, and the local store often needs to purge on sign-out. A design
that treats auth as "an interceptor that adds a header" has not yet designed auth — it has
designed the happy path of auth.

## 2. Designing one feature end to end

Take a concrete, small feature — a "send message" action in a chat-shaped screen — and walk it
through all five layers in both directions:

**Write path (user sends a message):**

1. UI calls a domain use case with the message text.
2. The use case writes the message to the local store immediately, in a `pending` state — this
   is what makes the UI feel instant, and it is optimistic UI from domain 05 applied here.
3. The UI re-renders from the local store and shows the message, greyed out or with a clock icon,
   before any network call has happened.
4. The sync layer picks up the pending row and hands it to transport.
5. Transport sends it, attaches the current auth token, and reports success or a specific
   failure back to sync.
6. Sync updates the local row's state to `sent` (success) or `failed` (a terminal error) or
   leaves it `pending` for retry (a transient error) — three outcomes, not one.

**Read path (a message arrives from someone else):**

1. Transport receives it, over whatever channel real-time updates use (polled, pushed, or
   streamed — domain 13's Senior unit works this choice in full).
2. Sync writes it into the local store.
3. The UI, still only reading from the local store, updates without any code path that knows a
   network event just happened.

The read path is the one Mid-band designs most often get wrong by skipping it entirely and
treating "send message" as write-only. A feature's data flow diagram is incomplete without both
directions drawn, because the failure modes on each are different — a failed write is retryable
by the user re-tapping a "retry" affordance; a *missed* read has no equivalent user action at
all, because the user does not know it happened.

## 3. Naming failure modes before writing code

The outcome for this unit is deliberately phrased as **naming**, not handling — before a line of
implementation exists, every box on the diagram above should have a stated answer for "the
network is gone right now":

| Layer | "Network is gone" behaviour, stated |
| :--- | :--- |
| UI | Shows cached content with a visible staleness indicator, not a spinner forever |
| Domain / use case | Returns the local result immediately; does not block on network |
| Cache / local store | Remains the read source; nothing here changes |
| Sync | Queues the write durably; does not drop it; does not retry unboundedly either |
| Transport | Fails fast on a bounded timeout; does not retry a non-idempotent request blindly |
| Auth | A held-but-expired token does not repeatedly trigger a failed refresh loop |

This table, filled in for the actual feature being designed, *is* the outcome for this unit — a
design review that can point at each box and say what happens there is reviewable in a way that
"handles offline gracefully" is not. It is also the direct input to the Senior unit's failure-modes
step, which does the same exercise at the scale of a full system rather than one feature.

## Pitfalls & trade-offs

- **Treating the network as the source of truth and the local store as a cache of it.** This is
  backwards for anything that needs to work offline even briefly — inverting it (local store as
  truth, sync as reconciliation) is the one architectural decision the rest of this unit assumes.
- **Designing the write path and skipping the read path.** A feature's failure modes are not
  symmetric between the two; a design that only walks through "what happens when I send" has not
  designed the feature, it has designed half of it.
- **"Handles offline gracefully" as a stated failure mode.** It names nothing checkable. The
  outcome for this unit is a table like the one above, filled in per layer, per feature — specific
  enough that a reviewer could disagree with one row.
- **Auth treated as a header-adding detail rather than a layer with its own failure modes.** A
  token refresh mid-flight, a refresh that itself fails, and a sign-out mid-sync are three
  separate cases a design should have an answer for, not one "auth works" assumption.
