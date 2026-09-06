---
id: platform-process-lifecycle-flutter
title: Process Lifecycle & Death in Flutter — One Callback Over Two Native Kill Mechanisms
description: How WidgetsBindingObserver and RestorationMixin unify Android's and iOS's lifecycle and kill signals into one Dart-level API, with no escape from either platform's underlying kill mechanics.
tags: [lifecycle, process-death, flutter, mid, senior]
lang: en
status: complete
domain: 02-platform-and-os-internals
platform: shared
band: X
level: Mid
sidebar_position: 1
topic: process-lifecycle
leaf: Flutter
prerequisites: []
outcomes:
  - "Use RestorationMixin to persist state across configuration change or process death on either platform"
  - "Explain why didHaveMemoryPressure doesn't change the underlying kill mechanics on either platform"
resources:
  - title: "WidgetsBindingObserver class — Flutter API"
    url: "https://api.flutter.dev/flutter/widgets/WidgetsBindingObserver-class.html"
    date: "2025-05-01"
---

# Process Lifecycle & Death in Flutter — One Callback Over Two Native Kill Mechanisms

Rotate a phone and the screen redraws instantly with everything intact. Leave the app backgrounded
for twenty minutes and come back to find it restarted from scratch, scroll position gone. To the
user these look like the same kind of interruption. Flutter gives you one unified callback over
whichever native mechanism actually fired underneath.

## Mid {concept=process-lifecycle/config-vs-death}

**Interview question: "How does Flutter unify Android's and iOS's different lifecycle models?"**

**`WidgetsBindingObserver`'s `didChangeAppLifecycleState(AppLifecycleState state)` is the one
callback that sits on top of both platforms' lifecycles** — `resumed`, `inactive`, `paused`,
`detached`, and `hidden` (Flutter 3.13+) map onto whichever native states actually fired
underneath. For persisting state across either cause, `RestorationMixin` and
`RestorationProperty` are the API surface a Flutter engineer writes against; under the hood they
write into Android's `onSaveInstanceState` Bundle or iOS's state-restoration archive depending on
platform, but the Dart-level code is the same either way.

```dart
class DraftPage extends StatefulWidget {
  @override
  State<DraftPage> createState() => _DraftPageState();
}

class _DraftPageState extends State<DraftPage> with RestorationMixin, WidgetsBindingObserver {
  final RestorableTextEditingController _draft = RestorableTextEditingController();

  @override
  String get restorationId => 'draft_page';

  @override
  void restoreState(RestorationBucket? oldBucket, bool initialRestore) {
    registerForRestoration(_draft, 'draft_text'); // backed by Bundle or restoration archive
  }
}
```

**Follow-up an interviewer asks next:** "If the process died right now and the user came back in
five minutes, what would they be upset to lose?" That question is the actual design tool — it
separates a draft comment or an in-progress form (must be persisted) from a re-fetchable list of
search results (fine to reload), the same discipline as either native platform.

**Pitfall at this level:** assuming `RestorationMixin` is a Flutter-native mechanism that avoids
platform size limits — it's still backed by Android's roughly-1MB Bundle path on that platform, so
the same "small snapshot, not a cache" discipline applies.

## Senior {concept=process-lifecycle/kill-diagnosis}

**Interview question: "Why was this process actually killed — and is it a bug?"**

**`WidgetsBindingObserver.didHaveMemoryPressure()` fires on both platforms' low-memory signals** —
Android's `onTrimMemory`/LMK pressure and iOS's memory-warning notification/Jetsam pressure alike —
as one unified callback. **What it does not do is change the underlying kill mechanics**: a
Flutter app's engine and Dart VM run inside the same OS process as any native app, so Android's
LMK graduated-priority model and iOS's Jetsam hard ceiling both apply to a Flutter app exactly as
written. There is no Flutter-specific escape from either killer — only a single place,
`didHaveMemoryPressure`, to react to whichever one just fired.

> [!IMPORTANT]
> A kill is not automatically a bug on either platform, and Flutter doesn't change that. Before
> treating one as a regression, check the native priority signal underneath — Android's service
> type, standby bucket, Doze state; iOS's memory footprint against the device's Jetsam ceiling.

**Follow-up:** "So what do you actually change once you've confirmed it's not a bug?" React to
`didHaveMemoryPressure` the same way you would to the native signal it's standing in for — it
doesn't buy you a different mechanism, only a shared entry point. On Android underneath, that still
means correcting the priority signal (foreground service, WorkManager); on iOS underneath, that
still means reducing peak memory footprint proactively.

**Pitfall at this level:** treating `didHaveMemoryPressure` as a Flutter-specific mitigation that
somehow avoids either platform's real kill mechanics — it's a shared entry point into the same two
native mechanisms, not a third, gentler one.

## Cross-platform comparison

See the cross-platform comparison table in the Android or iOS version of this topic (switch the
platform tab above) for the structural difference between the LMK's graduated response and
Jetsam's hard ceiling — both apply to a Flutter app unchanged.

## Pitfalls & trade-offs

- **Mid:** assuming `RestorationMixin` avoids Android's roughly-1MB Bundle size limit — it's still
  backed by the same platform mechanism underneath.
- **Senior:** treating `didHaveMemoryPressure` as a Flutter-specific mitigation — it's a shared
  entry point into the same LMK/Jetsam mechanics every native app is subject to, not an escape from
  them.
