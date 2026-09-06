---
id: fundamentals-memory-management-typescript
title: Memory Management in TypeScript — V8's Traced GC & the Event-Emitter Leak
description: Why TypeScript/JavaScript's V8 engine is traced GC in the same family as Kotlin/Java/Dart, the event-emitter leak pattern common in React Native, and WeakRef/WeakMap's narrow use case.
tags: [memory-management, garbage-collection, typescript, mid, senior, lead]
lang: en
status: complete
domain: 01-programming-fundamentals
platform: shared
band: X
level: Mid
sidebar_position: 9
topic: memory-management
leaf: TypeScript
prerequisites: []
outcomes:
  - "Explain what actually determines when a TypeScript/JavaScript object gets freed"
  - "Find a listener-not-removed-on-unmount leak by reading source code alone"
resources:
  - title: "Memory Management — MDN"
    url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Memory_management"
    date: "2025-05-01"
---

# Memory Management in TypeScript — V8's Traced GC & the Event-Emitter Leak

Two mental models cover every mainstream mobile language. One is a librarian who walks the shelves
periodically, checks whether anyone can still reach a book from the front desk, the reading room,
or a bookmark in someone's pocket, and reshelves it the moment nobody can — that's **traced garbage
collection**. TypeScript/JavaScript, via V8, is the librarian.

## Mid {concept=memory-management/model}

**Interview question: "In TypeScript, what actually determines when an object gets freed?"**

```typescript
// TypeScript / JavaScript (including React Native) — traced GC too, via V8's
// generational collector. Same family, same underlying question: is anything
// still reachable from a root that points to this object?
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

**The event-emitter leak.** V8's generational GC puts TypeScript and JavaScript (including React
Native) in the same traced-GC family as Kotlin, Java and Dart, so the React-Native-specific leak
pattern is structurally the same longer-lived-holds-shorter-lived shape: an event emitter or
listener registry, which lives for the app's lifetime, holds a callback that closes over a
component instance which should have been garbage the moment the component unmounted.

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
// shape as any other language's leak fix, just returned from useEffect instead
// of overridden as a lifecycle method (componentWillUnmount in a class component).
useEffect(() => {
  const subscription = DeviceEventEmitter.addListener('event', (payload) => {
    updateUi(payload);
  });
  return () => subscription.remove();
}, []);
```

JavaScript does have a weak-reference escape hatch for the rare case a strong map or registry would
otherwise hold something too long — `WeakRef` and `WeakMap`, both recent additions, used far less
often in practice than Swift's routine `weak`, because most JS leaks are fixed by removing a
listener rather than weakening a reference.

**Follow-up:** "How does this compare to Swift's memory model?" TypeScript/JavaScript, Kotlin, Java
and Dart are all traced-GC languages that share this literal same leak shape and fix — "listener
registered on mount, removed on unmount" is the same pattern as Kotlin's "detach in `onDestroy`."
Swift and Objective-C use reference counting (ARC) instead, with a completely different failure
mode: a retain cycle, not a stale root.

**Pitfall at this level:** reaching for `WeakRef`/`WeakMap` as the default fix for a suspected
leak — in almost every real case, the actual fix is removing the listener on cleanup, not
weakening the reference; weak references are the rare exception, not the routine tool they are in
Swift.

## Lead {concept=memory-management/team-mechanism}

**Interview question: "How do you catch a leak pattern like this before it ships, across a whole
team, not just when someone happens to profile the right screen?"**

Naming the mechanism, in order of how automatically it runs: an ESLint rule flagging a `useEffect`
with no cleanup return catches the pattern before a human ever looks. Short of a lint rule, a
code-review convention that is actually checkable: every `addListener`/`on()` call must show its
paired removal in the same review, so a reviewer rejects the diff on sight rather than trusting the
author remembered. For a critical, high-traffic screen where a leak would degrade the whole app's
memory footprint, a CI-gated memory benchmark, or React DevTools' profiler run as part of a QA
pass, catches it automatically rather than relying on someone manually opening the profiler.

This is the depth angle for memory management specifically — see the Tech Lead Roadmap article for
how this connects to the wider breadth a Tech Lead needs.

## Cross-language comparison

See the cross-language cheat sheet article for how Kotlin, Java, Swift and Dart each answer the
same two questions — or switch the language tab above to read this same topic in another language
directly.

## Pitfalls & trade-offs

- **Mid:** assuming "garbage collected" means "can't leak" — the collector only frees what's
  unreachable, and nothing checks whether a reference is still meaningful.
- **Senior:** a listener registered on mount with no corresponding removal — the same real-world
  leak source as any other traced-GC language, worth grepping for by name during review.
- **Senior:** reaching for `WeakRef`/`WeakMap` as a default leak fix — almost always the real fix
  is removing the listener, not weakening the reference.
- **Lead:** relying on manual profiling alone for a high-traffic screen — a profiler catches a leak
  only if someone happens to look at the right screen at the right time.
