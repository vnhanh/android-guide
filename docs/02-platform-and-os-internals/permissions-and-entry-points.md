---
id: platform-permissions-and-entry-points
title: Permissions & App Entry Points, Across Android, iOS & Flutter
description: How Android's multi-chance permission dialog, iOS's exactly-once prompt, and each platform's public entry points shape what a "denied" or "linked" state actually means in your code.
tags: [permissions, deep-links, entry-points, android, ios, flutter, mid, senior]
lang: en
status: complete
domain: 02-platform-and-os-internals
platform: shared
band: X
level: Mid
sidebar_position: 3
prerequisites: []
outcomes:
  - "Handle all the real outcomes of a permission request on Android or iOS, not just granted/denied, and name where Flutter's permission_handler can hide the platform difference"
  - "Read a manifest or URL-scheme configuration for its actual public entry-point surface, and state which deep-link mechanism on each platform has a real domain-ownership guarantee"
resources:
  - title: "Request runtime permissions"
    url: "https://developer.android.com/training/permissions/requesting"
    date: "2024-11-01"
  - title: "Universal Links"
    url: "https://developer.apple.com/ios/universal-links/"
    date: "2024-09-01"
  - title: "permission_handler | Flutter package"
    url: "https://pub.dev/packages/permission_handler"
    date: "2025-03-01"
---

# Permissions & App Entry Points, Across Android, iOS & Flutter

Asking someone for something works differently depending on how many times you're allowed to ask.
Android will let you knock again and explain yourself first, as long as you're polite about it.
iOS gives you a single knock — answered once, remembered forever, and never asked again. And every
app, on every platform, has a front door with a sign on it (the screens you built on purpose) and,
if you're not careful, a back door nobody locked (an exported component or a URL scheme that
answers to anyone who knows the address). This article covers both halves: what "denied" actually
means, and who else can walk in.

## Mid

**Interview question: "What happens after a user denies a permission — and does your code handle
all the real outcomes?"**

The honest answer names three outcomes on Android, not two, and a completely different shape on
iOS.

```kotlin
// Android — registerForActivityResult reports granted/denied, but denied is ambiguous by itself
val requestPermission = registerForActivityResult(
    ActivityResultContracts.RequestPermission()
) { isGranted: Boolean ->
    if (isGranted) {
        startCamera()
    } else if (shouldShowRequestPermissionRationale(Manifest.permission.CAMERA)) {
        // denied, but the system will show the prompt again — explain WHY before re-asking
        showRationaleThenRequestAgain()
    } else {
        // either permanently denied, or this was the very first request ever —
        // the callback alone cannot tell these apart, and the prompt will not reappear
        showGoToSettingsMessage()
    }
}
```

```swift
// iOS — the prompt appears exactly once per permission, per install. No rationale round-trip.
switch AVCaptureDevice.authorizationStatus(for: .video) {
case .authorized:
    startCamera()
case .notDetermined:
    // the one opportunity — this call shows the system prompt, once, ever
    let granted = await AVCaptureDevice.requestAccess(for: .video)
case .denied, .restricted:
    // no in-app re-prompt exists; Settings is the only remaining path
    showGoToSettingsMessage()
@unknown default:
    showGoToSettingsMessage()
}
```

```dart
// Flutter — permission_handler wraps both models behind one call shape
final status = await Permission.camera.request();
if (status.isGranted) {
    startCamera();
} else {
    showGoToSettingsMessage();
}
```

**Follow-up an interviewer asks next:** "Where does that Flutter snippet actually behave
differently per platform?" `Permission.camera.request()` calls into Android's multi-chance model
on Android and iOS's exactly-once model on iOS — the same three lines of Dart carry two different
real-world behaviors underneath. An engineer who only ever tests on Android can genuinely not
notice this until a real iOS device shows a permission that never prompts again, because the
package's uniform API is precisely what hides the asymmetry — the same pattern as `workmanager`
hiding the WorkManager/BGTaskScheduler asymmetry for background work.

**Pitfall at this level:** collapsing Android's three real outcomes — granted, denied-with-rationale-
still-available, and denied-permanently-or-first-time — into a single "user said no" branch; or
assuming `permission_handler`'s uniform API means the underlying platform behavior is uniform too.

## Senior

**Interview question: "Is your app's entry-point surface actually secure, and does your deep-link
scheme have any real ownership guarantee?"**

Every exported component and every claimed URL scheme is a door. The question is who else has a
key.

```xml
<!-- Android — every exported component is a public entry point, reachable by any other app -->
<activity android:name=".ProfileActivity" android:exported="true">
    <intent-filter>
        <action android:name="android.intent.action.VIEW" />
        <category android:name="android.intent.category.DEFAULT" />
        <category android:name="android.intent.category.BROWSABLE" />
        <data android:scheme="https" android:host="example.com" android:pathPrefix="/profile" />
    </intent-filter>
</activity>
```

Reading a manifest for risk means reading every `android:exported="true"` component as a public
API endpoint: what does its Intent extras trust without validating, and could a malicious app
construct the same Intent and reach it directly, bypassing whatever normal screen would otherwise
lead there first.

**Swift.** A custom URL scheme is easy to register and easy to spoof — any other app can claim
the same scheme, and the OS picks one non-deterministically:

```swift
// myapp://profile/123 — collides with any other app that registers the same scheme
```

Universal Links close that gap with an ordinary `https://` URL validated against a domain the
app's team actually controls:

```swift
// Associated Domains capability: applinks:example.com
// server hosts /.well-known/apple-app-site-association naming this app's Team ID + Bundle ID
func application(_ application: UIApplication, continue userActivity: NSUserActivity,
                  restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
    guard userActivity.activityType == NSUserActivityTypeBrowsingWeb,
          let url = userActivity.webpageURL else { return false }
    return handle(url)
}
```

**Flutter.** Deep linking still routes through the same native configuration underneath — an
`app_links` package or `go_router`'s built-in handling gives you the Dart-side API for receiving a
parsed link, but it does not replace declaring the entry point natively. An engineer who only ever
edits `main.dart` and never touches `AndroidManifest.xml`, `Info.plist`, or the Associated Domains
capability will find deep linking silently does nothing on a real build — the intent-filter and
the `apple-app-site-association` file are still the actual doors; Dart code only decides what
happens once something walks through one.

> [!IMPORTANT]
> The Senior-level insight is the same shape on every platform: a deep-link scheme without domain
> validation is a doorbell anyone can wire up to ring your app, not a proof of who's ringing it.

**Follow-up:** "So how do you actually close that gap?" On Android, prefer App Links (the same
intent-filter, validated against `assetlinks.json` on your domain) over a bare custom scheme, and
treat every exported component's extras as untrusted input. On iOS, prefer Universal Links over a
custom scheme wherever the flow can tolerate a real domain. On Flutter, verify the native
configuration exists and is correct on both platforms before trusting that the Dart-side router is
the whole story.

**Pitfall at this level:** trusting a custom URL scheme (`myapp://`) as if it were domain-owned,
or auditing only the Dart-side deep-link router while leaving an `android:exported="true"`
component or a missing Associated Domains capability unchecked underneath it.

## Cross-platform comparison table

| | Android | iOS | Flutter |
|---|---|---|---|
| Permission re-prompt chances | Multiple, with rationale available before a re-ask | Exactly one, ever, per permission per install | Inherits whichever platform's model runs underneath permission_handler |
| Deep-link ownership guarantee | App Links + assetlinks.json, domain-validated if configured | Universal Links + apple-app-site-association, domain-validated | Still requires the same native configuration on both platforms |
| Public entry-point surface | Exported components declared in the manifest | URL schemes plus Universal Link handlers | Same native surface underneath; Flutter adds no additional entry points of its own |

## Pitfalls & trade-offs

- **Mid:** collapsing Android's three permission outcomes (granted, denied-with-rationale,
  denied-permanently-or-first-time) into a single "denied" branch.
- **Mid:** assuming `permission_handler`'s one call shape means Android and iOS behave the same way
  underneath it — an iOS device is where that assumption breaks, not a code review.
- **Senior:** treating a custom URL scheme as a security boundary when any app can register the
  same scheme and the OS resolves the collision non-deterministically.
- **Senior:** reviewing only the Dart-side deep-link router in a Flutter app and never checking
  whether the native `AndroidManifest.xml` intent-filter or the iOS Associated Domains capability
  was actually configured — without it, the link silently does nothing.
