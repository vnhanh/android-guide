---
id: system-design-senior
title: The Method, Four Worked Problems & Defending a Design (Senior, Android + iOS)
description: Requirements through trade-offs as a repeatable method, worked in full for an offline-first sync engine, a media upload/download pipeline, real-time updates, and auth and session across restarts — each with its own on-iOS-this-differs section — then presenting a design and defending it.
tags: [system-design, offline-first, real-time, auth, media, senior]
lang: en
status: complete
domain: 13-mobile-system-design
band: S
platform: shared
level: Senior
sidebar_position: 2
prerequisites: [system-design-mid, performance-senior-android, performance-senior-ios, observability-senior]
outcomes:
  - "Design one of the four worked problems from a blank page in 45 minutes, and answer \"what if this component is down for an hour\" for every box drawn"
resources:
  - title: "Designing Data-Intensive Applications — Martin Kleppmann"
    url: "https://dataintensive.net/"
    date: "2017-03-01"
  - title: "WorkManager — guaranteed, deferrable background work"
    url: "https://developer.android.com/topic/libraries/architecture/workmanager"
    date: "2025-06-01"
  - title: "BGTaskScheduler"
    url: "https://developer.apple.com/documentation/backgroundtasks/bgtaskscheduler"
    date: "2025-06-01"
  - title: "Firebase Cloud Messaging overview"
    url: "https://firebase.google.com/docs/cloud-messaging"
    date: "2025-06-01"
  - title: "Apple Push Notification service (APNs)"
    url: "https://developer.apple.com/documentation/usernotifications/setting-up-a-remote-notification-server"
    date: "2025-06-01"
  - title: "OAuth 2.0 refresh token best practices"
    url: "https://datatracker.ietf.org/doc/html/draft-ietf-oauth-security-topics"
    date: "2024-11-01"
  - title: "Keychain services (iOS)"
    url: "https://developer.apple.com/documentation/security/keychain_services"
    date: "2025-06-01"
---

# The Method, Four Worked Problems & Defending a Design

> **Outcome.** Design one of the four worked problems below from a blank page in 45 minutes, and
> for every box on the resulting diagram, answer "what happens if this component is down for an
> hour" — not "it retries," the actual stated behaviour a user or an on-call engineer would see.

This is the largest single unit in the guide, and deliberately so: mobile system design is
learned by working problems in full, not by memorising a checklist. Section 1 gives the method
once. Sections 2 through 5 apply it in full, four times, to the four problems that come up most
often in an interview room and in a real roadmap. Section 6 closes with presenting and defending
whatever you designed.

## 1. The method

Seven steps, always in this order, because each depends on the one before it:

| Step | Question it answers | Skipping it costs you |
| :--- | :--- | :--- |
| **Requirements** | What must this do, for whom, and what is explicitly out of scope? | A design that solves a different problem than the one asked |
| **NFRs** | Latency, availability, consistency, scale, battery/data budget — with numbers | A design nobody can evaluate, because "fast" and "reliable" aren't checkable |
| **High-level design** | What are the major components and how does data move between them? | Diving into a data model before agreeing on the shape of the system |
| **Data model** | What is stored, where, and what is the source of truth? | A protocol that has nothing stable to synchronise |
| **Protocol** | How do client and server actually talk — wire format, endpoints, ordering? | A data model with no way to move it over the wire honestly |
| **Failure modes** | For every component, what happens when it's unavailable? | A design that only has a description for the happy path |
| **Trade-offs** | What did this design give up, and why was that the right call? | A design presented as if it had no cost, which nobody believes |

Two disciplines make this method work under time pressure rather than becoming seven boxes to
tick mechanically:

**NFRs get numbers, not adjectives.** "Low latency" is not an NFR; "p95 message delivery under
2s on a 4G connection" is. A number is falsifiable — a design either meets it or doesn't, and a
reviewer can push back on the number itself rather than on a vibe.

**Failure modes are enumerated per component, not asserted once for the whole system.** "The
system is resilient to network failure" names nothing. "If the sync queue's local database is
corrupted, the client re-derives it from the server on next full sync, at the cost of resending
any purely-local pending writes older than the last confirmed checkpoint" names something a
reviewer can evaluate and disagree with.

The four worked problems below apply exactly these seven steps. Each closes with its own
**"on iOS this differs because…"** section — per the plan for this domain, there is no single
cross-platform parity table here, because every divergence below is specific to the problem it
appears under, not a general Android/iOS fact worth tabulating once.

## 2. Worked problem: offline-first sync engine

### Requirements

Design the client-side sync engine for a note-taking app: users create, edit, and delete notes
offline; changes made on one device must appear on another device the same user is signed into,
without the user ever seeing a spinner block editing. Out of scope: real-time collaborative
editing of the same note by two users simultaneously (that is a CRDT-heavy problem in its own
right, not this one — naming it out of scope is itself part of the requirements step).

### NFRs

| NFR | Target |
| :--- | :--- |
| Write latency (local) | Under 50ms — the user must never wait on network to see their own edit |
| Sync latency (cross-device) | p95 under 10s while both devices are online and foregrounded |
| Availability of local editing | 100% — editing must never require network |
| Conflict rate tolerance | Design must degrade gracefully above 0.1% of syncs conflicting; it must not assume conflicts are rare enough to ignore |
| Data loss tolerance | Zero for confirmed-synced writes; explicitly bounded and stated for writes made during an offline period exceeding the retry window |

### High-level design

```
┌──────────┐     ┌───────────────┐     ┌────────────────┐     ┌────────┐
│    UI    │────▶│ Local store   │◀───▶│  Sync engine   │◀───▶│ Server │
│ (reads   │     │ (source of    │     │ (change queue, │     │ (source│
│  local)  │◀────│  truth)       │     │  conflict res.)│     │ of     │
└──────────┘     └───────────────┘     └────────────────┘     │ record)│
                                                                 └────────┘
```

The local store holds every note plus a per-note **version vector or last-write-timestamp**
(the conflict-resolution choice from domain 05, made explicit here rather than deferred) and a
**pending change log** — an append-only record of edits not yet confirmed by the server. The
sync engine's job is entirely mechanical: drain the pending change log against the server,
apply what the server sends back, and reconcile conflicts using the rule the design commits to.

### Data model

```
Note {
  id: UUID                // client-generated, stable across the note's life
  content: String
  updatedAt: HybridLogicalClock   // not wall-clock time — see Failure modes
  deviceId: UUID
  syncState: enum { synced, pending, conflicted }
}

ChangeLogEntry {
  noteId: UUID
  op: enum { create, update, delete }
  payload: NotePatch        // a diff, not a full copy, once notes exceed a size threshold
  localSeq: Int64           // monotonic per-device, used to replay in order after a crash
}
```

A hybrid logical clock rather than a wall-clock timestamp is the detail that separates a
design that works from one that silently loses data on a device with clock skew — a real,
common failure mode this specific data model has to account for, not a hypothetical.

### Protocol

A pull-push cycle over HTTPS, not a persistent connection — sync does not need the latency a
socket buys (Section 4 covers when it does):

1. **Push**: client sends its change log since the last confirmed checkpoint, batched.
2. Server applies each entry, using the same conflict rule the client uses, and returns, per
   entry, either `accepted` or `conflict` with the server's current version attached.
3. **Pull**: client requests all server changes since its last known server checkpoint.
4. Client applies pulled changes locally, then advances its checkpoint only after both push and
   pull for that cycle are durably applied — the checkpoint advance is the commit point, and it
   is atomic with the local writes it depends on, or a crash mid-cycle re-derives correctly.

### Failure modes

| Component down | Stated behaviour |
| :--- | :--- |
| Server unreachable | Client keeps editing locally; change log grows; UI shows a non-blocking "not synced" indicator, never a spinner that blocks input |
| Sync engine's local queue corrupted | Client falls back to a full re-pull from the server on next successful connection; any purely-local pending writes not yet in a completed push are lost — this loss is bounded and disclosed to the user, not silent |
| Conflict resolution disagreement (client and server clocks skewed) | Server is authoritative for the final resolution; client re-applies whatever the server returns, even if it contradicts the client's own tentative resolution |
| Background execution never runs (the sync engine simply doesn't wake up for days) | See the iOS section immediately below — this is the platform-specific case that breaks a naive port of the Android design |

### Trade-offs

- **Per-note version vectors over a single global sequence number** — costs more storage and
  more conflict-detection logic, buys correct detection of concurrent edits to *different* notes
  without false-positive conflicts, which a global sequence number would produce.
- **Diffs over full-content payloads once a note exceeds a size threshold** — costs
  diff/patch complexity, buys meaningfully lower sync bandwidth for long notes edited in small
  increments, which is the common case for this feature.
- **Server-authoritative conflict resolution over client-wins** — costs the client having to
  discard its own tentative resolution sometimes, buys a system where two devices converge to
  the *same* answer, which client-wins on both sides cannot guarantee.

### On iOS this differs because…

The Android design above leans on `WorkManager`'s durability guarantee: a queued sync job runs
once its constraints are met, and survives a reboot. There is no equivalent strength on iOS.
[`data-senior-ios`](../05-data-persistence-and-offline/senior-ios.md) documents the actual break:
`BGTaskScheduler` submits a *request* that the system may simply never honor, for days, with no
callback telling the app that happened. A sync engine designed against the Android assumption
and then "ported" by swapping `WorkManager` for `BGTaskScheduler` silently stops being
offline-first on iOS — it becomes offline-and-hoping.

The design has to state, explicitly, what happens during an extended period with zero background
execution: this problem's answer is that the change log keeps growing locally (bounded by a
retention policy that ages out the oldest *already-pushed-but-unconfirmed* entries, never
unconfirmed ones), and a full reconciliation runs unconditionally the next time the app is
foregrounded — the foreground path does not rely on background sync ever having run at all. That
single design decision is what makes "days of no background execution," which is an observed
real outcome on iOS rather than an edge case, survivable.

## 3. Worked problem: media upload/download pipeline

### Requirements

Design upload and download of user-generated photos and video for a social app: uploads must
survive the app being backgrounded or killed mid-upload; downloads must support resuming a large
video after a network drop without re-fetching bytes already received.

### NFRs

| NFR | Target |
| :--- | :--- |
| Upload success rate | 99.5% within 24 hours of the user tapping "post," including retries |
| Resumability | A dropped transfer resumes from the last confirmed byte, not from zero, for any transfer over 1MB |
| Foreground responsiveness | Starting an upload never blocks the UI thread, regardless of file size |
| Storage budget | Local cache of in-flight and recently-completed media capped and evictable under device storage pressure |

### High-level design

```
UI ─▶ Upload/download manager ─▶ Chunked transport ─▶ Object storage (server-side)
              │
              ▼
       Local media cache (chunks + manifest)
```

The manager is the layer that owns retry policy, chunk bookkeeping, and priority (a video the
user is actively watching downloads ahead of a background prefetch). It does not itself move
bytes — that is the chunked transport's job — which keeps retry/priority logic testable without
a real network.

### Data model

```
Transfer {
  id: UUID
  kind: enum { upload, download }
  localUri: String
  remoteKey: String?
  totalBytes: Int64
  chunkSize: Int64
  chunksCompleted: BitSet     // which chunks are durably written/sent
  state: enum { queued, inProgress, paused, completed, failed }
}
```

The `chunksCompleted` bitset, persisted alongside the transfer row, is what makes resumability a
property of the data model rather than a property of one lucky network stack that happened to
still have the connection open — a killed-and-relaunched app reads this row and resumes exactly
where it left off, including across a device reboot.

### Protocol

Chunked, resumable HTTP using range requests, the same underlying mechanism on both directions:

- **Upload**: client requests an upload session (server returns a session ID and chunk size);
  client `PUT`s chunks with a `Content-Range` header; server acknowledges each chunk
  independently; client marks the corresponding bit in `chunksCompleted` only after a
  chunk-level ack, not after the whole request returns.
- **Download**: client issues a `GET` with a `Range` header for the first unreceived chunk;
  on any interruption, the next attempt asks for `Range: bytes=<lastConfirmedByte>-`, so a
  10-minute video interrupted at minute 6 resumes at minute 6, not minute 0.

### Failure modes

| Component down | Stated behaviour |
| :--- | :--- |
| App killed mid-upload | On relaunch, the manager scans `Transfer` rows in `inProgress` state and resumes each from its last acked chunk — no user action required |
| Network drops mid-chunk | The in-flight chunk is retried with bounded backoff; already-acked chunks are never re-sent |
| Object storage rejects the session (quota, auth expiry) | Transfer moves to `failed` with a reason code the UI surfaces as an actionable retry, not a silent disappearance |
| Device storage pressure evicts the local cache mid-transfer | Upload: safe, since acked chunks already left the device — only the not-yet-acked tail needs the source file, which is checked before eviction proceeds. Download: resumable from the manifest, re-fetching evicted chunks |

### Trade-offs

- **Chunked transfer with per-chunk acks over a single large request** — costs protocol
  complexity and a chunk-tracking data model, buys resumability, which for large media over an
  unreliable mobile network is the difference between "usually works" and "measurably works."
- **A fixed chunk size over an adaptive one tuned to current network conditions** — costs some
  efficiency on a fast connection, buys a much simpler manager and a predictable memory
  footprint; adaptive chunking is a defensible upgrade, not a requirement for a correct design.
- **Persisting transfer state to the same local store as application data, rather than a
  separate transfer-only store** — costs some schema coupling, buys one crash-consistency
  story instead of two independently-committing stores that can disagree after a kill.

### On iOS this differs because…

Android's `WorkManager` can run a long-running upload/download as expedited or long-running
foreground work with a fairly predictable execution model. iOS instead needs
`URLSessionConfiguration.background`, which hands the transfer to the OS itself — the transfer
continues even if the app is suspended or killed outright, but the app process that started it
may not be the one that observes completion: iOS relaunches the app in the background (or wakes
it via `application(_:handleEventsForBackgroundURLSession:completionHandler:)`) to deliver the
result, on the OS's schedule, not the app's.

The practical consequence for the data model above: the `Transfer` row and its `chunksCompleted`
bitset must be durable *before* the app can assume it will be the one to observe the chunk ack,
since the delegate callback confirming a chunk may arrive after the app has been relaunched from
scratch. A design that keeps transfer progress only in memory — defensible on Android where the
same process that started the upload is overwhelmingly likely to be the one that finishes it —
loses that progress silently on iOS the first time the OS decides to suspend the app between
chunks, which for a large video over a slow connection is common, not rare.

## 4. Worked problem: real-time updates

### Requirements

Design how a client learns "new data exists" for a messaging feature: a new message must reach
an open, foregrounded app promptly, and reach a backgrounded or closed app at all, without
draining the battery of a device that keeps the app installed but rarely opens it.

### NFRs

| NFR | Target |
| :--- | :--- |
| Foreground delivery latency | p95 under 2s from server event to UI update |
| Backgrounded/closed delivery | Best-effort; delivered as a notification, not silently dropped |
| Battery cost, app unused | Near zero — a user who never opens the app must not pay a battery cost for a feature they don't use |
| Server fan-out cost | Bounded per-connection cost; must not require one persistent connection per idle client at platform scale |

### High-level design

Four mechanisms exist and the design has to pick, per state, not just once:

| Mechanism | When it's the right tool |
| :--- | :--- |
| **Polling** | Simple, low-value-per-update features; acceptable added latency; easiest to reason about failure modes for |
| **Long-lived connection (SSE or WebSocket)** | App is foregrounded and the feature genuinely needs sub-second updates |
| **Push (FCM / APNs)** | App is backgrounded or closed; the OS, not the app, owns wake-up |

A well-designed client uses a **connection while foregrounded, push while not**, with polling
reserved as the fallback when neither is available (a corporate network blocking WebSocket
upgrades, for instance) — not as the primary mechanism, because polling's latency-vs-battery
trade-off is strictly worse than the other two for this NFR set.

```
Foregrounded:  Client ◀──WebSocket/SSE──▶ Realtime gateway ◀── Message service
Backgrounded:  Message service ──▶ Push provider (FCM/APNs) ──▶ Client (woken by OS)
                                                                     │
                                                                     ▼
                                                         Client pulls full message
                                                         on wake (push payload is
                                                         a wake signal, not the data)
```

### Data model

```
PushWakeSignal {
  conversationId: UUID
  minSeq: Int64          // "there is at least one message after this seq you don't have"
}
```

The push payload deliberately carries a **cursor hint, not the message content** — payload size
limits on both push systems make "the notification itself" an unreliable place to put data that
must be durable, and a client that treats a missed/collapsed push as data loss has designed the
wrong contract. The client's real recovery mechanism is: on any wake (push-triggered or
foreground-open), reconcile against the server using the last known sequence number, regardless
of whether a push arrived to trigger it.

### Protocol

- **Connection path**: client opens a WebSocket (or SSE stream) on foreground; server pushes
  message events as they occur; client applies them directly to the local store.
- **Push path**: server, on a new message, sends a data-only push (no user-visible alert content
  for messages the app can render itself) carrying the `PushWakeSignal`; client, on receiving it,
  performs a delta pull for the affected conversation.
- **Reconciliation**: on every foreground transition, regardless of push or connection state,
  the client performs a cheap "what's my last known seq per conversation" check against the
  server — this is what makes the design correct even if every push in a session was dropped.

### Failure modes

| Component down | Stated behaviour |
| :--- | :--- |
| WebSocket/SSE connection drops | Client reconnects with backoff; on reconnect, requests anything missed since last-seen seq — the connection is an optimization, not the source of truth |
| Push provider (FCM/APNs) drops a notification | Undetectable by design (neither provider guarantees delivery) — the foreground reconciliation step is what bounds the damage, not a push-delivery guarantee that doesn't exist |
| Realtime gateway down, connections can't be established | Client falls back to polling at a conservative interval until the gateway recovers; this is the one case polling is load-bearing rather than a fallback of convenience |
| Message service down but gateway up | Gateway has nothing to push; client shows "connected, nothing new" rather than a false "offline" state — these are different states worth distinguishing in the UI |

### Trade-offs

- **Cursor-hint push payloads over full-content push** — costs an extra round trip on every
  wake, buys correctness under both providers' payload-size and delivery-guarantee limits.
- **A connection only while foregrounded, not held open in the background** — costs
  the connection-path latency advantage while backgrounded, buys a battery profile that doesn't
  penalize a user who isn't looking at the app; this is close to the only viable choice given the
  battery NFR, not a coin-flip.
- **Reconciliation on every foreground transition, even when a connection has "presumably" kept
  state current** — costs a redundant network call on the common case, buys correctness on the
  uncommon one (a missed push, a dropped connection event) at a cost cheap enough to always pay.

### On iOS this differs because…

FCM's data-only push can reliably run background code to perform the delta pull described above,
subject to Android's own background-execution limits. APNs' equivalent — a background
notification (`content-available: 1`) — is throttled far more aggressively by iOS, is not
guaranteed to be delivered at all under memory or battery pressure, and is capped at a small
number of wake opportunities per hour that the OS controls, not the app or the server.

The consequence for this design: the reconciliation-on-foreground step, which on Android is a
belt-and-suspenders correctness check, is the **primary** correctness mechanism on iOS — the
background delta-pull triggered by a silent push is a nice-to-have that measurably will not fire
for a meaningful fraction of pushes sent, not an edge case to shrug off. A design that presents
"the same real-time architecture on both platforms" without stating this is presenting an
Android design with an iOS label on it.

## 5. Worked problem: auth and session across restarts, reinstalls, expiry

### Requirements

Design session and token handling for a client so that a signed-in user stays signed in across
an app restart, a device reboot, and — where the platform's storage semantics allow it — an
app reinstall, while the server can independently expire or revoke a session at any time.

### NFRs

| NFR | Target |
| :--- | :--- |
| Silent session restoration | 100% of app launches with a valid refresh token restore the session without a visible login screen |
| Refresh latency under load | A 401 mid-flight on concurrent requests triggers exactly one refresh, not N — this is the thundering-herd case from domain 06 |
| Revocation propagation | A server-side revoke (e.g., "sign out all devices") takes effect on next request, not eventually |
| At-rest token protection | Tokens are unreadable from a filesystem dump on a rooted/jailbroken device |

### High-level design

```
App launch ─▶ Read token store ─▶ Token present? ──no──▶ Show sign-in
                                        │yes
                                        ▼
                              Attempt authenticated request
                                        │
                              401? ──no──▶ proceed normally
                                │yes
                                ▼
                   Single-flight refresh (all concurrent 401s
                   wait on the same in-flight refresh call)
                                │
                     success ──┴── failure (refresh token itself invalid)
                        │                        │
                   retry original          clear token store,
                   request(s)               show sign-in
```

The single-flight refresh — one refresh call regardless of how many requests hit a 401
simultaneously — is the piece a naive implementation gets wrong first, and it is exactly the
thundering-herd token-refresh problem worked in [`networking-mid`](../06-networking-and-api-integration/mid-shared.md);
this design reuses that solution rather than re-deriving it.

### Data model

```
SessionToken {
  accessToken: String        // short-lived, minutes, sent on every request
  refreshToken: String       // long-lived, sent only to the refresh endpoint
  expiresAt: Instant
  storage: SecureStore       // Keystore-backed / Keychain-backed, never plaintext
}
```

Both tokens live in the platform's hardware-backed secure storage, per
[`security-mid`](../10-security-and-privacy/mid-shared.md) — never in `SharedPreferences` or
`UserDefaults`, and never logged, including in crash reports.

### Protocol

- Access token sent as a bearer credential on every authenticated request.
- On a 401, the client calls the refresh endpoint with the refresh token; server returns a new
  access token (and, if rotating refresh tokens, a new refresh token — the design below assumes
  rotation, which is the safer default for this NFR set).
- Refresh-token rotation: each refresh invalidates the previous refresh token server-side. This
  bounds the blast radius of a leaked refresh token to one use, at the cost of the client having
  to durably persist the new refresh token before considering the refresh "complete" — a crash
  between receiving the new token and persisting it must not leave the client holding neither.

### Failure modes

| Component down | Stated behaviour |
| :--- | :--- |
| Refresh endpoint unreachable | Original request(s) fail with a distinguishable "couldn't verify session, will retry" state, not an immediate forced sign-out — a transient outage should not log a user out |
| Refresh token itself invalid (revoked or expired) | Client clears the token store and shows sign-in — this is the one case a forced sign-out is correct |
| Crash between receiving a rotated refresh token and persisting it | Client falls back to the old refresh token on relaunch; if the server has already invalidated it (rotation already consumed it), this presents as an invalid-refresh-token case above — an accepted, bounded, and stated cost of rotation, not a bug |
| Server-side "sign out all devices" | Next request's refresh attempt fails as an invalid refresh token; propagation is bounded by "next request," not immediate on devices with no pending request — stated explicitly rather than implied to be instant |

### Trade-offs

- **Rotating refresh tokens over static ones** — costs the crash-window failure mode above and
  extra persistence discipline, buys a bounded blast radius on a leaked refresh token, which for
  a long-lived credential is the trade worth making.
- **Single-flight refresh over "let every request refresh independently"** — costs
  coordination complexity (an in-flight-refresh future every concurrent request can await),
  buys exactly one refresh call under concurrent 401s instead of a thundering herd that can
  itself trigger rate-limiting or token-rotation races.
- **Distinguishing "refresh endpoint unreachable" from "refresh token invalid" as separate
  failure modes** — costs an extra error-classification step, buys not signing a user out for a
  transient network blip, which is the single most user-visible mistake this design can make.

### On iOS this differs because…

Android Keystore-backed keys, and anything encrypted with them, are deleted by the OS when the
app is uninstalled — there is no path to recovering them on reinstall; a signed-out state after
reinstall is the platform's guaranteed behaviour, not a design choice. iOS's Keychain does not
follow the same rule: Keychain entries are **not** automatically removed when an app is deleted,
so a naive design can leave a stale refresh token discoverable by a reinstalled copy of the app —
see [`security-mid`](../10-security-and-privacy/mid-shared.md)'s treatment of exactly this
persistence difference.

This changes what "signed out after reinstall" means as a stated behaviour rather than an
assumption inherited from Android: an iOS design has to *decide*, explicitly, whether a
reinstall should present as signed-in (because the Keychain entry survived) or force a fresh
sign-in — and if the latter is the product requirement, the client must actively clear its
Keychain entry on a detected fresh install (for example, via a first-launch flag in
`UserDefaults`, which *is* cleared on uninstall, checked against Keychain state on launch) rather
than relying on the platform to have done it, because on iOS the platform did not.

## 6. Presenting a design and defending it

A worked design is not finished until it survives being presented to people who did not build
it. Three habits separate a design that survives review from one that only survives being
written down:

**State the trade-off before someone finds it.** Every "Trade-offs" section above named what the
design gave up. Leading with that in a review — "we chose server-authoritative conflict
resolution, which means the client sometimes has to discard its own tentative resolution" —
reads as confidence. Waiting for a reviewer to find it and ask reads as a gap, even when it's the
same fact.

**Answer "what if this is down for an hour" for every box, live, not just the boxes that came up
in preparation.** This is this unit's outcome for a reason: it's the question that most reliably
separates a design that was actually reasoned through failure-mode-first from one that was
designed happy-path-first with failure modes added afterward as an appendix. A reviewer asking
about a box not covered in the prepared failure-modes table is not a gotcha — the method in
Section 1 is supposed to make that table exhaustive enough that no box is actually uncovered.

**Defend the NFR numbers, not just the architecture.** A reviewer pushing on "why p95 under 2s
and not under 500ms" is asking a legitimate design question, and the honest answer is usually a
cost trade-off ("500ms would require holding a connection open on a much larger fraction of
idle clients, at a battery and server cost this feature doesn't justify") — which is only
answerable because Section 1's NFRs were written as numbers in the first place, with the
reasoning behind each number kept in mind, not just the number itself memorized.

## Pitfalls & trade-offs

- **Presenting a design with no failure-modes section, or one written after the fact as a
  checklist.** The method in Section 1 exists so failure modes are derived from the same
  requirements and NFRs as everything else, not retrofitted once someone asks.
- **Treating the four worked problems' "on iOS this differs" sections as a parity table in
  disguise.** They aren't — each divergence here is specific to its problem (background
  execution, background transfer, push reliability, Keychain persistence) and does not
  generalize to a single "Android vs. iOS" rule worth memorizing independent of the problem.
- **NFRs stated as adjectives ("fast," "reliable," "scalable") in the room, even when they were
  written as numbers on paper.** A design review runs on what's said and drawn, not on what's in
  the document nobody is looking at during the conversation.
- **A data model designed before the protocol, with the protocol then forced to fit it.** Every
  worked problem above ordered data model before protocol deliberately — but the data model
  itself was shaped by the NFRs and high-level design that preceded it, not chosen first and
  worked backward from.
