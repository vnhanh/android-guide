---
id: platform-permissions-flutter
title: Permissions & Entry Points in Flutter — permission_handler's Hidden Asymmetry
description: Why permission_handler's one call shape hides two different platform behaviors underneath, and why deep linking still requires the same native manifest/plist configuration Dart code alone can't provide.
tags: [permissions, deep-links, entry-points, flutter, mid, senior]
lang: en
status: complete
domain: 02-platform-and-os-internals
platform: shared
band: X
level: Mid
sidebar_position: 3
topic: permissions-entry-points
leaf: Flutter
prerequisites: []
outcomes:
  - "Explain why permission_handler's uniform API hides a real platform asymmetry"
  - "Verify the native entry-point configuration a Flutter deep link still depends on"
resources:
  - title: "permission_handler | Flutter package"
    url: "https://pub.dev/packages/permission_handler"
    date: "2025-03-01"
---

# Permissions & Entry Points in Flutter — permission_handler's Hidden Asymmetry

Asking someone for something works differently depending on how many times you're allowed to ask.
Flutter's `permission_handler` package hides this difference behind one call shape — which is
exactly the trap, the same shape as `workmanager` hiding the background-work asymmetry.

## Mid {concept=permissions-entry-points/outcomes}

**Interview question: "Does permission_handler give you one consistent behavior across
platforms?"**

**`permission_handler` wraps both platforms' permission models behind one call shape:**

```dart
// Flutter — permission_handler wraps both models behind one call shape
final status = await Permission.camera.request();
if (status.isGranted) {
    startCamera();
} else {
    showGoToSettingsMessage();
}
```

**Where that snippet actually behaves differently per platform:** `Permission.camera.request()`
calls into Android's multi-chance model on Android and iOS's exactly-once model on iOS — the same
three lines of Dart carry two different real-world behaviors underneath. An engineer who only ever
tests on Android can genuinely not notice this until a real iOS device shows a permission that
never prompts again, because the package's uniform API is precisely what hides the asymmetry.

**Follow-up an interviewer asks next:** "So does that mean the `else` branch above is wrong?" Not
wrong, but incomplete — it collapses Android's three real outcomes (granted,
denied-with-rationale-still-available, denied-permanently-or-first-time) the same way a naive
native implementation would; the fix is the same on both sides, checking `status.isPermanentlyDenied`
separately before deciding whether an in-app re-ask or a Settings redirect is the right next step.

**Pitfall at this level:** assuming `permission_handler`'s uniform API means the underlying
platform behavior is uniform too — an iOS device is where that assumption breaks, not a code
review, since Android's multi-chance behavior will look correct in testing regardless.

## Senior {concept=permissions-entry-points/entry-point-security}

**Interview question: "Is your app's entry-point surface actually secure, and does your deep-link
scheme have any real ownership guarantee?"**

**Deep linking still routes through the same native configuration underneath** — an `app_links`
package or `go_router`'s built-in handling gives you the Dart-side API for receiving a parsed link,
but it does not replace declaring the entry point natively. An engineer who only ever edits
`main.dart` and never touches `AndroidManifest.xml`, `Info.plist`, or the Associated Domains
capability will find deep linking silently does nothing on a real build — the intent-filter and
the `apple-app-site-association` file are still the actual doors; Dart code only decides what
happens once something walks through one.

> [!IMPORTANT]
> A deep-link scheme without domain validation is a doorbell anyone can wire up to ring your app,
> not a proof of who's ringing it — and Flutter's Dart-side router doesn't change what validates
> the door itself, on either platform.

**Follow-up:** "So how do you actually verify this before it ships?" Verify the native
configuration exists and is correct on both platforms before trusting that the Dart-side router is
the whole story — App Links validated against `assetlinks.json` on Android, Universal Links
validated against `apple-app-site-association` on iOS, both configured natively regardless of how
the Dart side routes the result.

**Pitfall at this level:** auditing only the Dart-side deep-link router in a Flutter app and never
checking whether the native `AndroidManifest.xml` intent-filter or the iOS Associated Domains
capability was actually configured — without it, the link silently does nothing, and the Dart
router never even gets invoked.

## Cross-platform comparison

See the cross-platform comparison table in the Android or iOS version of this topic (switch the
platform tab above) for the concrete multi-chance vs exactly-once permission contract and each
platform's own deep-link ownership mechanism.

## Pitfalls & trade-offs

- **Mid:** assuming `permission_handler`'s one call shape means Android and iOS behave the same way
  underneath it.
- **Senior:** reviewing only the Dart-side deep-link router and never checking whether the native
  manifest/plist entry-point configuration was actually done — without it, the link does nothing.
