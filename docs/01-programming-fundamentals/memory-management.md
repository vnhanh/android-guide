---
id: fundamentals-memory-management
title: Memory Management, Across Five Languages
description: What keeps an object alive too long in each of five languages — traced garbage collection's GC-roots model versus Swift's reference counting — and how to catch a leak before it ships.
tags: [memory-management, garbage-collection, arc, retain-cycles, kotlin, java, swift, dart, typescript, mid, senior, lead]
lang: en
status: complete
domain: 01-programming-fundamentals
platform: shared
band: X
level: Mid
sidebar_position: 9
prerequisites: []
outcomes:
  - "State, per language, whether it uses traced garbage collection or reference counting, and why that answer groups four of the five languages together"
  - "Find a specific reference-lifetime bug by reading source code alone, in either the traced-GC or ARC family"
  - "Name the mechanism (lint rule, review convention, or tooling) that catches a specific leak pattern before it ships, not after"
resources:
  - title: "Automatic Reference Counting — The Swift Programming Language"
    url: "https://docs.swift.org/swift-book/documentation/the-swift-programming-language/automaticreferencecounting/"
    date: "2025-06-01"
  - title: "Shared mutable state and concurrency — Kotlin documentation"
    url: "https://kotlinlang.org/docs/shared-mutable-state-and-concurrency.html"
    date: "2024-11-01"
---

# Memory Management, Across Five Languages

Two mental models cover every mainstream mobile language. One is a librarian who walks the
shelves periodically, checks whether anyone can still reach a book from the front desk, the
reading room, or a bookmark in someone's pocket, and reshelves it the moment nobody can — that's
**traced garbage collection**. The other is a desk that hands out books on the honor system:
whoever borrows one must return it themselves, the desk never re-checks whether anyone still
wants it, and two people who each promise to return the other's book first will just hold both
forever — that's **reference counting**, and the stuck pair is a retain cycle. Kotlin, Java, Dart
and TypeScript are the librarian. Swift and Objective-C are the honor-system desk. Everything in
this article follows from picking the right one of those two models and then reading the code
for the specific pattern that breaks it.

## Mid

**Interview question: "In this language, what actually determines when an object gets freed?"**

```kotlin
// Kotlin and Java — traced GC. An object is freed once nothing reachable from a
// GC root (a thread's stack, a static field, a JNI reference) points to it anymore.
// You never call free(); you just stop holding a reference, eventually.
```

```dart
// Dart — also traced GC, generational, conceptually the same story as Kotlin/Java:
// reachability from a root, not manual bookkeeping, decides an object's lifetime.
```

```typescript
// TypeScript / JavaScript (including React Native) — traced GC too, via V8's
// generational collector. Same family, same underlying question: is anything
// still reachable from a root that points to this object?
```

```swift
// Swift and Objective-C — reference counting (ARC). Every strong reference
// increments a count; the object is deallocated the instant that count hits
// zero. Deterministic, no pause — and no safety net if two objects hold each
// other, because neither count ever reaches zero on its own.
```

Four of these five languages answer the question the same way: "reachable from a root." Swift
answers it differently: "reference count." That single split is the organizing idea for
everything below.

**Follow-up an interviewer asks next:** "So if it's garbage collected, it can't leak, right?"
Wrong, and this is the Mid-level pitfall worth naming precisely: a traced GC only frees an object
that is *unreachable*. An object that is still reachable — because something holds a reference to
it that nobody bothered to clear — is not garbage from the collector's point of view, even though
it is logically dead and nobody will ever use it again. "Garbage collected" describes the
mechanism, not an outcome; a reachable-but-logically-dead object is exactly what leaks, in every
language in this article, GC or not.

## Senior

**Interview question: "Find the leak by reading the code, not by waiting for a profiler."**

**Kotlin and Java: GC roots and the longer-lived holder.** An object becomes eligible for
collection only when it is unreachable from any GC root — a running thread's stack, a static
field, a JNI reference, among others. The Android-specific leak pattern worth naming precisely:
an object with a longer lifetime holding a reference to one with a shorter lifetime, which keeps
the shorter-lived object reachable long after it should have been collected.

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

The fix is always the same shape: make the shorter-lived side responsible for detaching itself,
or hold only a weak reference from the longer-lived side.

```kotlin
class ProfileActivity : Activity() {
    override fun onDestroy() {
        AnalyticsManager.setListener(null) // break the reference before this Activity dies
        super.onDestroy()
    }
}
```

**Swift: ARC and the retain cycle, read from the source.** Automatic Reference Counting
deallocates an object the instant its reference count reaches zero — no GC pause, but no
tolerance for a cycle either: two objects holding **strong** references to each other keep each
other's count above zero forever.

```swift
final class Owner {
    var pet: Pet?
}

final class Pet {
    var owner: Owner?   // STRONG reference back to Owner — this is the cycle
}

var owner: Owner? = Owner()
var pet: Pet? = Pet()
owner?.pet = pet
pet?.owner = owner
owner = nil   // Owner's refcount doesn't drop to zero — Pet still holds it
pet = nil     // Pet's refcount doesn't drop to zero either — Owner still holds it
// Both objects are now unreachable from anywhere else in the program, and neither
// is ever deallocated. This is precisely what the memory graph debugger would show
// as a cluster with no path to a root — but the source already told you.
```

The read-the-code version of finding this: for every pair of types that reference each other, at
least one direction must be `weak` or `unowned`. Those two keywords are different **lifetime
claims**, not interchangeable syntax:

```swift
// weak: the referenced object CAN legitimately become nil before this one does.
// Must be Optional; automatically becomes nil on deallocation.
class Pet { weak var owner: Owner? }

// unowned: the referenced object is guaranteed to outlive this one, or this one
// is meaningless without it. Not Optional — accessing it after deallocation crashes.
class CreditCard { unowned let customer: Customer }
```

Closures capture strongly by default, which makes a class property holding a closure that
captures `self`, stored on `self`, the single most common real-world retain cycle — the same
shape as the Owner/Pet example, with a closure standing in for one of the two objects.

```swift
final class ProfileViewModel {
    var onLoad: (() -> Void)?
    func setup() {
        onLoad = { self.reload() } // captures self strongly — self now indirectly
                                    // holds onLoad, which holds self. Cycle.
    }
}
// FIX: capture list.
// onLoad = { [weak self] in self?.reload() }
```

**Dart: the same GC-roots story, plus isolates.** Because Dart is also a traced-GC language, its
leak story reads like Kotlin/Java's, not Swift's: a static field, a global singleton, or a
long-lived object holding a reference to a widget or controller that should have gone away is the
same longer-lived-holds-shorter-lived pattern, and the same fix (detach on teardown, or hold a
weak reference) applies. The one Dart-specific wrinkle worth knowing: an `Isolate` runs with its
own heap and its own root set, so a long-lived isolate that holds a reference to something it
should have released — a port, a callback, a large object handed to it once and never cleared —
is the isolate-flavored version of the singleton-holds-Activity pattern, just scoped to that
isolate's own memory instead of the whole process.

**TypeScript/JavaScript: the event-emitter leak.** V8's generational GC puts TypeScript and
JavaScript (including React Native) in the same traced-GC family as Kotlin, Java and Dart, so the
React-Native-specific leak pattern is structurally the AnalyticsManager pattern again: an event
emitter or listener registry, which lives for the app's lifetime, holds a callback that closes
over a component instance which should have been garbage the moment the component unmounted.

```typescript
// LEAK: DeviceEventEmitter lives for the app's lifetime. The listener closure
// closes over `this` (the component instance), keeping it reachable long after unmount.
useEffect(() => {
  const subscription = DeviceEventEmitter.addListener('event', (payload) => {
    updateUi(payload); // closes over the component's state/props
  });
  // missing cleanup — the subscription, and everything it closed over, outlives the component
}, []);
```

```typescript
// FIX: remove the listener in the cleanup function — the same "detach on teardown"
// shape as ProfileActivity.onDestroy() above, just returned from useEffect instead
// of overridden as a lifecycle method (componentWillUnmount in a class component).
useEffect(() => {
  const subscription = DeviceEventEmitter.addListener('event', (payload) => {
    updateUi(payload);
  });
  return () => subscription.remove();
}, []);
```

> [!IMPORTANT]
> The central insight of this section is the grouping, not any single language's mechanics.
> Kotlin, Java and Dart are traced-GC languages and share the literal same leak shape — a
> longer-lived holder keeping a shorter-lived object reachable — and the literal same fix: detach
> on the shorter-lived side's teardown, or hold a weak reference from the longer-lived side.
> TypeScript/JavaScript's V8 engine is traced GC too, so the same shape and fix apply there, just
> phrased as "listener registered on mount, removed on unmount." Swift and Objective-C's ARC is
> the genuine odd one out: no collector, no roots, just reference counts — and its failure mode is
> a cycle, not a stale root. Learning "five memory models" is really learning two: traced GC (four
> languages) and reference counting (two).

JavaScript does have a weak-reference escape hatch for the rare case a strong map or registry
would otherwise hold something too long — `WeakRef` and `WeakMap`, both recent additions, used far
less often in practice than Swift's routine `weak`, because most JS leaks are fixed by removing a
listener rather than weakening a reference.

## Lead

**Interview question: "How do you catch a leak pattern like this before it ships, across a whole
team, not just when someone happens to profile the right screen?"**

Naming the mechanism, in order of how automatically it runs: a lint rule catches the pattern
before a human ever looks — Android lint and detekt both have rules that flag a `Context` or
`View` reference held past its expected lifetime, and an equivalent ESLint rule can flag a
`useEffect` with no cleanup return. Short of a lint rule, a code-review convention that is
actually checkable: every `addListener`, `setListener`, or `registerObserver` call must show its
paired removal in the same review, so a reviewer rejects the diff on sight rather than trusting
the author remembered. For a critical, high-traffic screen where a leak would degrade the whole
app's memory footprint, a CI-gated memory benchmark or a dedicated leak-detection tool — LeakCanary
on Android is the standard example — running automatically rather than relying on someone
manually opening the profiler. This is exactly the territory domain 09, Performance & Efficiency,
owns: performance budgets and CI regression gating are the mechanism that turns "we should watch
memory" into something that actually blocks a bad merge.

This is the depth angle for memory management specifically — see the Tech Lead Roadmap article
for how this connects to the wider breadth a Tech Lead needs.

## Cross-language comparison table

| | Kotlin | Java | Swift | Dart | TypeScript |
|---|---|---|---|---|---|
| Memory model family | traced GC | traced GC | reference counting (ARC) | traced GC | traced GC |
| What keeps something alive too long | reachable from a GC root via a longer-lived holder | same as Kotlin | a strong reference cycle | same as Kotlin or Java | a longer-lived listener or closure holding a reference |
| Weak-reference escape hatch | WeakReference (rare in app code) | WeakReference | weak (routine, expected usage) | WeakReference (rare) | WeakRef, WeakMap (rare, recent) |
| Typical real-world leak source | static or singleton holding a Context or View | same as Kotlin | closure capturing self stored on self | isolate holding a stale reference | event emitter or listener not removed on unmount |

## Pitfalls & trade-offs

- **Mid.** Assuming "garbage collected" means "can't leak." A reachable-but-logically-dead object
  is exactly what leaks — the collector only frees what's unreachable, and nothing checks whether
  a reference is still meaningful.
- **Mid → Senior.** Treating a leaked listener or callback as a one-off bug instead of a pattern.
  Any longer-lived-holds-shorter-lived reference gets the same fix every time: the shorter-lived
  side detaches itself, or the longer-lived side holds a weak reference.
- **Senior.** Assuming `weak` and `unowned` are interchangeable syntax in Swift. They state
  different lifetime guarantees; `unowned` on a reference that can outlive its owner is a crash
  waiting for the one path where the assumption breaks, not a style preference.
- **Senior.** A closure stored on `self` that captures `self` strongly, in Swift, or a listener
  registered on mount with no corresponding removal, in React Native — the same real-world cycle
  source in two different memory models, worth grepping for by name during review.
- **Lead.** Relying on manual profiling alone for a high-traffic screen. A profiler catches a leak
  only if someone happens to look at the right screen at the right time; a lint rule, a review
  convention, or a CI-gated benchmark catches it every time, before it ships.
