---
id: fundamentals-memory-management-kotlin
title: Memory Management in Kotlin — Traced GC, Roots & the Singleton-Holds-Activity Leak
description: Why Kotlin's traced garbage collector only frees what's unreachable, the singleton-holds-Activity leak pattern that catches this in practice, and the team mechanism that catches it before it ships.
tags: [memory-management, garbage-collection, kotlin, mid, senior, lead]
lang: en
status: complete
domain: 01-programming-fundamentals
platform: shared
band: X
level: Mid
sidebar_position: 9
topic: memory-management
leaf: Kotlin
prerequisites: []
outcomes:
  - "Explain what actually determines when a Kotlin object gets freed"
  - "Find a longer-lived-holds-shorter-lived leak by reading source code alone"
resources:
  - title: "Shared mutable state and concurrency — Kotlin documentation"
    url: "https://kotlinlang.org/docs/shared-mutable-state-and-concurrency.html"
    date: "2024-11-01"
---

# Memory Management in Kotlin — Traced GC, Roots & the Singleton-Holds-Activity Leak

Two mental models cover every mainstream mobile language. One is a librarian who walks the shelves
periodically, checks whether anyone can still reach a book from the front desk, the reading room,
or a bookmark in someone's pocket, and reshelves it the moment nobody can — that's **traced garbage
collection**. Kotlin is the librarian.

## Mid {concept=memory-management/model}

**Interview question: "In Kotlin, what actually determines when an object gets freed?"**

```kotlin
// Kotlin — traced GC. An object is freed once nothing reachable from a
// GC root (a thread's stack, a static field, a JNI reference) points to it anymore.
// You never call free(); you just stop holding a reference, eventually.
```

An object becomes eligible for collection only when it is unreachable from any GC root.

**Follow-up an interviewer asks next:** "So if it's garbage collected, it can't leak, right?"
Wrong, and this is the Mid-level pitfall worth naming precisely: a traced GC only frees an object
that is *unreachable*. An object that is still reachable — because something holds a reference to
it that nobody bothered to clear — is not garbage from the collector's point of view, even though
it is logically dead and nobody will ever use it again. "Garbage collected" describes the
mechanism, not an outcome; a reachable-but-logically-dead object is exactly what leaks.

**Pitfall at this level:** assuming "garbage collected" means "can't leak" — the collector only
frees what's unreachable, and nothing checks whether a reference is still meaningful.

## Senior {concept=memory-management/leak-pattern}

**Interview question: "Find the leak by reading the code, not by waiting for a profiler."**

**GC roots and the longer-lived holder.** The Android-specific leak pattern worth naming
precisely: an object with a longer lifetime holding a reference to one with a shorter lifetime,
which keeps the shorter-lived object reachable long after it should have been collected.

```kotlin
// LEAK: the singleton (process lifetime) holds a reference to the Activity
// (should live only as long as the screen is on screen).
object AnalyticsManager {
    private var listener: ((Event) -> Unit)? = null
    fun setListener(l: (Event) -> Unit) { listener = l }
}

class ProfileActivity : Activity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        // This lambda captures `this` implicitly — AnalyticsManager now holds
        // the Activity for as long as the process lives, long past onDestroy.
        AnalyticsManager.setListener { event -> updateUi(event) }
    }
}
```

The fix is always the same shape: make the shorter-lived side responsible for detaching itself, or
hold only a weak reference from the longer-lived side.

```kotlin
class ProfileActivity : Activity() {
    override fun onDestroy() {
        AnalyticsManager.setListener(null) // break the reference before this Activity dies
        super.onDestroy()
    }
}
```

**Follow-up:** "How does this compare to Swift's memory model?" Kotlin, Java, Dart and
TypeScript/JavaScript are all traced-GC languages that share this literal same leak shape and fix.
Swift and Objective-C use reference counting (ARC) instead — no roots, just reference counts, and
their failure mode is a retain cycle, not a stale root. Learning "five memory models" is really
learning two families.

**Pitfall at this level:** treating a leaked listener or callback as a one-off bug instead of a
pattern — any longer-lived-holds-shorter-lived reference gets the same fix every time.

## Lead {concept=memory-management/team-mechanism}

**Interview question: "How do you catch a leak pattern like this before it ships, across a whole
team, not just when someone happens to profile the right screen?"**

Naming the mechanism, in order of how automatically it runs: a lint rule catches the pattern
before a human ever looks — Android lint and `detekt` both have rules that flag a `Context` or
`View` reference held past its expected lifetime. Short of a lint rule, a code-review convention
that is actually checkable: every `addListener`, `setListener`, or `registerObserver` call must
show its paired removal in the same review, so a reviewer rejects the diff on sight rather than
trusting the author remembered. For a critical, high-traffic screen where a leak would degrade the
whole app's memory footprint, a CI-gated memory benchmark or a dedicated leak-detection tool —
LeakCanary is the standard example — running automatically rather than relying on someone manually
opening the profiler. This is exactly the territory domain 09, Performance & Efficiency, owns:
performance budgets and CI regression gating are the mechanism that turns "we should watch memory"
into something that actually blocks a bad merge.

This is the depth angle for memory management specifically — see the Tech Lead Roadmap article for
how this connects to the wider breadth a Tech Lead needs.

## Cross-language comparison

See the cross-language cheat sheet article for how Java, Swift, Dart and TypeScript each answer
the same two questions — or switch the language tab above to read this same topic in another
language directly.

## Pitfalls & trade-offs

- **Mid:** assuming "garbage collected" means "can't leak" — the collector only frees what's
  unreachable, and nothing checks whether a reference is still meaningful.
- **Senior:** treating a leaked listener or callback as a one-off bug instead of a pattern — the
  same longer-lived-holds-shorter-lived fix applies every time.
- **Lead:** relying on manual profiling alone for a high-traffic screen — a profiler catches a leak
  only if someone happens to look at the right screen at the right time.
