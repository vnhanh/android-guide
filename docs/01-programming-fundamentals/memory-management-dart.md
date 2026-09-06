---
id: fundamentals-memory-management-dart
title: Memory Management in Dart — Traced GC Plus the Isolate Wrinkle
description: Why Dart's traced garbage collector shares Kotlin/Java's leak shape, and the isolate-specific wrinkle — a long-lived isolate holding a reference it should have released.
tags: [memory-management, garbage-collection, dart, mid, senior, lead]
lang: en
status: complete
domain: 01-programming-fundamentals
platform: shared
band: X
level: Mid
sidebar_position: 9
topic: memory-management
leaf: Dart
prerequisites: []
outcomes:
  - "Explain what actually determines when a Dart object gets freed"
  - "Find a longer-lived-holds-shorter-lived leak, including the isolate-scoped variant"
resources:
  - title: "Concurrency in Dart — Isolates"
    url: "https://dart.dev/language/concurrency"
    date: "2025-04-01"
---

# Memory Management in Dart — Traced GC Plus the Isolate Wrinkle

Two mental models cover every mainstream mobile language. One is a librarian who walks the shelves
periodically, checks whether anyone can still reach a book from the front desk, the reading room,
or a bookmark in someone's pocket, and reshelves it the moment nobody can — that's **traced garbage
collection**. Dart is the librarian, with one wrinkle: isolates each have their own shelf.

## Mid {concept=memory-management/model}

**Interview question: "In Dart, what actually determines when an object gets freed?"**

```dart
// Dart — also traced GC, generational, conceptually the same story as Kotlin/Java:
// reachability from a root, not manual bookkeeping, decides an object's lifetime.
```

An object becomes eligible for collection only when it is unreachable from any GC root.

**Follow-up an interviewer asks next:** "So if it's garbage collected, it can't leak, right?"
Wrong, and this is the Mid-level pitfall worth naming precisely: a traced GC only frees an object
that is *unreachable*. An object that is still reachable — because something holds a reference to
it that nobody bothered to clear — is not garbage from the collector's point of view.

**Pitfall at this level:** assuming "garbage collected" means "can't leak" — the collector only
frees what's unreachable, and nothing checks whether a reference is still meaningful.

## Senior {concept=memory-management/leak-pattern}

**Interview question: "Find the leak by reading the code, not by waiting for a profiler."**

**The same GC-roots story as Kotlin/Java, plus isolates.** A static field, a global singleton, or
a long-lived object holding a reference to a widget or controller that should have gone away is the
same longer-lived-holds-shorter-lived pattern, and the same fix (detach on teardown, or hold a
weak reference) applies.

```dart
// LEAK: a global singleton (app lifetime) holds a reference to a controller
// (should live only as long as its screen is mounted).
class AnalyticsManager {
  static final instance = AnalyticsManager._();
  AnalyticsManager._();
  void Function(Event)? listener;
}

class ProfilePageState extends State<ProfilePage> {
  @override
  void initState() {
    super.initState();
    // This closure captures `this` implicitly — AnalyticsManager now holds
    // the State for as long as the app runs, long past dispose().
    AnalyticsManager.instance.listener = (event) => updateUi(event);
  }

  @override
  void dispose() {
    AnalyticsManager.instance.listener = null; // break the reference before this State dies
    super.dispose();
  }
}
```

**The one Dart-specific wrinkle worth knowing: an `Isolate` runs with its own heap and its own root
set**, so a long-lived isolate that holds a reference to something it should have released — a
port, a callback, a large object handed to it once and never cleared — is the isolate-flavored
version of the singleton-holds-controller pattern, just scoped to that isolate's own memory instead
of the whole process.

**Follow-up:** "How does this compare to Swift's memory model?" Dart, Kotlin, Java, and
TypeScript/JavaScript are all traced-GC languages that share this literal same leak shape and fix.
Swift and Objective-C use reference counting (ARC) instead — no roots, just reference counts, and
their failure mode is a retain cycle, not a stale root.

**Pitfall at this level:** treating a leaked listener or callback as a one-off bug instead of a
pattern — including inside an isolate, where the same fix applies at a smaller scope.

## Lead {concept=memory-management/team-mechanism}

**Interview question: "How do you catch a leak pattern like this before it ships, across a whole
team, not just when someone happens to profile the right screen?"**

Naming the mechanism, in order of how automatically it runs: a lint rule catches the pattern before
a human ever looks — the Dart/Flutter lint set has rules that flag common `dispose()` omissions.
Short of a lint rule, a code-review convention that is actually checkable: every listener or
callback registration in `initState` must show its paired removal in `dispose`, so a reviewer
rejects the diff on sight rather than trusting the author remembered. For a critical, high-traffic
screen where a leak would degrade the whole app's memory footprint, DevTools' memory view run as
part of a QA pass, or a CI-gated memory benchmark, catches it automatically.

This is the depth angle for memory management specifically — see the Tech Lead Roadmap article for
how this connects to the wider breadth a Tech Lead needs.

## Cross-language comparison

See the cross-language cheat sheet article for how Kotlin, Java, Swift and TypeScript each answer
the same two questions — or switch the language tab above to read this same topic in another
language directly.

## Pitfalls & trade-offs

- **Mid:** assuming "garbage collected" means "can't leak" — the collector only frees what's
  unreachable, and nothing checks whether a reference is still meaningful.
- **Senior:** treating a leaked listener or callback as a one-off bug instead of a pattern —
  including the isolate-scoped variant, which is easy to overlook since it's out of the main
  isolate's view.
- **Lead:** relying on manual profiling alone for a high-traffic screen — a profiler catches a leak
  only if someone happens to look at the right screen at the right time.
