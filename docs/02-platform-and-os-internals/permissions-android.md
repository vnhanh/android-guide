---
id: platform-permissions-android
title: Permissions & Entry Points on Android — Three Real Outcomes & App Links vs Custom Schemes
description: Why a denied Android permission actually has three outcomes, not two, and why a bare custom URL scheme has no domain-ownership guarantee compared to App Links.
tags: [permissions, deep-links, entry-points, android, mid, senior]
lang: en
status: complete
domain: 02-platform-and-os-internals
platform: shared
band: X
level: Mid
sidebar_position: 3
topic: permissions-entry-points
leaf: Android
prerequisites: []
outcomes:
  - "Handle all three real outcomes of a permission request on Android, not just granted/denied"
  - "Read a manifest for its actual public entry-point surface, and prefer App Links over a bare custom scheme"
resources:
  - title: "Request runtime permissions"
    url: "https://developer.android.com/training/permissions/requesting"
    date: "2024-11-01"
---

# Permissions & Entry Points on Android — Three Real Outcomes & App Links vs Custom Schemes

Asking someone for something works differently depending on how many times you're allowed to ask.
Android will let you knock again and explain yourself first, as long as you're polite about it. And
every app has a front door with a sign on it (the screens you built on purpose) and, if you're not
careful, a back door nobody locked (an exported component that answers to anyone who knows the
address).

## Mid {concept=permissions-entry-points/outcomes}

**Interview question: "What happens after a user denies a permission — and does your code handle
all the real outcomes?"**

**The honest answer names three outcomes, not two.**

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

**Follow-up an interviewer asks next:** "Why can't the callback tell 'first request' apart from
'permanently denied'?" Both produce `shouldShowRequestPermissionRationale() == false` — the API
gives you no direct signal to distinguish them, so a common workaround is tracking "have I asked
before" in local storage rather than relying on the system alone.

**Pitfall at this level:** collapsing Android's three real outcomes — granted,
denied-with-rationale-still-available, and denied-permanently-or-first-time — into a single "user
said no" branch.

## Senior {concept=permissions-entry-points/entry-point-security}

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

Reading a manifest for risk means reading every `android:exported="true"` component as a public API
endpoint: what does its Intent extras trust without validating, and could a malicious app construct
the same Intent and reach it directly, bypassing whatever normal screen would otherwise lead there
first.

> [!IMPORTANT]
> A deep-link scheme without domain validation is a doorbell anyone can wire up to ring your app,
> not a proof of who's ringing it. Android's bare custom scheme (`myapp://`) has no domain-ownership
> guarantee — any other app can register the identical scheme, and the OS resolves the collision
> non-deterministically. App Links (the same intent-filter, validated against `assetlinks.json` on
> your domain) are the fix, giving that link a real, provable owner.

**Follow-up:** "So how do you actually close that gap?" Prefer App Links over a bare custom scheme,
and treat every exported component's extras as untrusted input — the same discipline as validating
any other external, attacker-reachable input.

**Pitfall at this level:** trusting a custom URL scheme (`myapp://`) as if it were domain-owned —
any other app can claim the same scheme, and the OS resolution is not something your app controls.

## Cross-platform comparison

See the cross-platform comparison table in the iOS or Flutter version of this topic (switch the
platform tab above) for how iOS's exactly-once permission model and Universal Links compare.

## Pitfalls & trade-offs

- **Mid:** collapsing Android's three permission outcomes (granted, denied-with-rationale,
  denied-permanently-or-first-time) into a single "denied" branch.
- **Senior:** treating a custom URL scheme as a security boundary when any app can register the
  same scheme and the OS resolves the collision non-deterministically.
