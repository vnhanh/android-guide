---
id: platform-permissions-ios
title: Permissions & Entry Points on iOS — The Exactly-Once Prompt & Universal Links
description: Why iOS gives you exactly one permission prompt per install with no rationale round-trip, and why Universal Links close the domain-ownership gap a custom URL scheme leaves open.
tags: [permissions, deep-links, entry-points, ios, mid, senior]
lang: en
status: complete
domain: 02-platform-and-os-internals
platform: shared
band: X
level: Mid
sidebar_position: 3
topic: permissions-entry-points
leaf: iOS
prerequisites: []
outcomes:
  - "Handle the exactly-once permission prompt correctly, with no in-app re-prompt available"
  - "Prefer Universal Links over a custom URL scheme for a real domain-ownership guarantee"
resources:
  - title: "Universal Links"
    url: "https://developer.apple.com/ios/universal-links/"
    date: "2024-09-01"
---

# Permissions & Entry Points on iOS — The Exactly-Once Prompt & Universal Links

Asking someone for something works differently depending on how many times you're allowed to ask.
iOS gives you a single knock — answered once, remembered forever, and never asked again. And every
app has a front door with a sign on it (the screens you built on purpose) and, if you're not
careful, a back door nobody locked (a URL scheme that answers to anyone who knows the address).

## Mid {concept=permissions-entry-points/outcomes}

**Interview question: "What happens after a user denies a permission — and does your code handle
the real shape of it on iOS?"**

**The prompt appears exactly once per permission, per install. No rationale round-trip.**

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

**Follow-up an interviewer asks next:** "Since there's no rationale round-trip, when should you
actually show the system prompt?" Only after your own in-app explanation of why the permission is
needed — you get exactly one shot at the system dialog, so triggering it before the user
understands why is the single most common way to burn that one chance on a "no."

**Pitfall at this level:** calling `requestAccess` reflexively at screen load instead of after an
in-app explanation — since there's no rationale round-trip to fall back on, a premature ask that
gets denied has no second chance in-app, only a trip to Settings.

## Senior {concept=permissions-entry-points/entry-point-security}

**Interview question: "Is your app's entry-point surface actually secure, and does your deep-link
scheme have any real ownership guarantee?"**

Every claimed URL scheme is a door. The question is who else has a key.

**A custom URL scheme is easy to register and easy to spoof** — any other app can claim the same
scheme, and the OS picks one non-deterministically:

```swift
// myapp://profile/123 — collides with any other app that registers the same scheme
```

**Universal Links close that gap** with an ordinary `https://` URL validated against a domain the
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

> [!IMPORTANT]
> A deep-link scheme without domain validation is a doorbell anyone can wire up to ring your app,
> not a proof of who's ringing it.

**Follow-up:** "So how do you actually close that gap?" Prefer Universal Links over a custom
scheme wherever the flow can tolerate a real domain — the `apple-app-site-association` file is the
proof of ownership a bare custom scheme can never provide.

**Pitfall at this level:** trusting a custom URL scheme (`myapp://`) as if it were domain-owned, or
shipping a Universal Links handler without verifying the `apple-app-site-association` file is
actually reachable and correctly formed on the production domain.

## Cross-platform comparison

See the cross-platform comparison table in the Android or Flutter version of this topic (switch
the platform tab above) for how Android's multi-chance permission model and App Links compare.

## Pitfalls & trade-offs

- **Mid:** calling `requestAccess` before the user has any in-app context for why — burning the one
  system-prompt chance with no rationale round-trip to recover it.
- **Senior:** treating a custom URL scheme as a security boundary when any app can register the
  same scheme and the OS resolves the collision non-deterministically.
