---
id: fundamentals-memory-management-swift
title: Memory Management in Swift — ARC, Retain Cycles & weak vs unowned
description: Why Swift is the odd one out with reference counting instead of traced GC, how to spot a retain cycle by reading the source, and the real difference between weak and unowned.
tags: [memory-management, arc, retain-cycles, swift, mid, senior, lead]
lang: en
status: complete
domain: 01-programming-fundamentals
platform: shared
band: X
level: Mid
sidebar_position: 9
topic: memory-management
leaf: Swift
prerequisites: []
outcomes:
  - "Explain what actually determines when a Swift object gets deallocated"
  - "Find a retain cycle by reading source code alone, and choose correctly between weak and unowned"
resources:
  - title: "Automatic Reference Counting — The Swift Programming Language"
    url: "https://docs.swift.org/swift-book/documentation/the-swift-programming-language/automaticreferencecounting/"
    date: "2025-06-01"
---

# Memory Management in Swift — ARC, Retain Cycles & weak vs unowned

Two mental models cover every mainstream mobile language. Swift's is a desk that hands out books
on the honor system: whoever borrows one must return it themselves, the desk never re-checks
whether anyone still wants it, and two people who each promise to return the other's book first
will just hold both forever — that's **reference counting**, and the stuck pair is a retain cycle.

## Mid {concept=memory-management/model}

**Interview question: "In Swift, what actually determines when an object gets freed?"**

```swift
// Swift and Objective-C — reference counting (ARC). Every strong reference
// increments a count; the object is deallocated the instant that count hits
// zero. Deterministic, no pause — and no safety net if two objects hold each
// other, because neither count ever reaches zero on its own.
```

Four of the five languages in this guide answer "what determines lifetime" with "reachable from a
root" (traced GC). Swift answers it differently: "reference count." That single split is the
organizing idea for this whole topic.

**Follow-up an interviewer asks next:** "So ARC means no leaks, right, since there's no GC pause to
worry about?" Wrong the other direction from the traced-GC pitfall: ARC has zero tolerance for a
cycle — two objects holding strong references to each other keep each other's count above zero
forever, with nothing to break the deadlock automatically the way a tracing collector would.

**Pitfall at this level:** assuming deterministic deallocation (no GC pause) means ARC can't leak —
a retain cycle leaks permanently, with no collector ever coming along to notice and fix it.

## Senior {concept=memory-management/leak-pattern}

**Interview question: "Find the leak by reading the code, not by waiting for a profiler."**

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
least one direction must be `weak` or `unowned`. **Those two keywords are different lifetime
claims, not interchangeable syntax:**

```swift
// weak: the referenced object CAN legitimately become nil before this one does.
// Must be Optional; automatically becomes nil on deallocation.
class Pet { weak var owner: Owner? }

// unowned: the referenced object is guaranteed to outlive this one, or this one
// is meaningless without it. Not Optional — accessing it after deallocation crashes.
class CreditCard { unowned let customer: Customer }
```

Closures capture strongly by default, which makes a class property holding a closure that captures
`self`, stored on `self`, the single most common real-world retain cycle:

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

**Follow-up:** "How does this compare to Kotlin/Java's memory model?" Kotlin, Java, Dart and
TypeScript/JavaScript are all traced-GC languages, sharing a completely different leak shape (a
longer-lived holder keeping a shorter-lived object reachable) and a completely different fix
(detach on teardown). Swift is the genuine odd one out: no collector, no roots, just reference
counts.

**Pitfall at this level:** assuming `weak` and `unowned` are interchangeable syntax. They state
different lifetime guarantees; `unowned` on a reference that can outlive its owner is a crash
waiting for the one path where the assumption breaks, not a style preference.

## Lead {concept=memory-management/team-mechanism}

**Interview question: "How do you catch a leak pattern like this before it ships, across a whole
team, not just when someone happens to profile the right screen?"**

Naming the mechanism, in order of how automatically it runs: a lint rule (SwiftLint has patterns
that flag a likely-strong `self` capture in a closure stored as a property) catches the pattern
before a human ever looks. Short of a lint rule, a code-review convention that is actually
checkable: every closure stored on `self` gets an explicit capture-list review comment, so a
reviewer rejects the diff on sight rather than trusting the author remembered `[weak self]`. For a
critical, high-traffic screen where a leak would degrade the whole app's memory footprint, Xcode's
Memory Graph Debugger run as part of a QA pass, or a CI-gated memory benchmark, catches it
automatically rather than relying on someone manually opening the profiler.

This is the depth angle for memory management specifically — see the Tech Lead Roadmap article for
how this connects to the wider breadth a Tech Lead needs.

## Cross-language comparison

See the cross-language cheat sheet article for how Kotlin, Java, Dart and TypeScript each answer
the same two questions — or switch the language tab above to read this same topic in another
language directly.

## Pitfalls & trade-offs

- **Mid:** assuming deterministic deallocation means ARC can't leak — a retain cycle leaks
  permanently, with nothing ever coming along to notice and fix it.
- **Senior:** assuming `weak` and `unowned` are interchangeable — `unowned` on a reference that can
  outlive its owner is a crash waiting to happen, not a style choice.
- **Senior:** a closure stored on `self` that captures `self` strongly — the single most common
  real-world retain cycle, worth grepping for by name during review.
- **Lead:** relying on manual profiling alone for a high-traffic screen — a profiler catches a
  cycle only if someone happens to look at the right screen at the right time.
