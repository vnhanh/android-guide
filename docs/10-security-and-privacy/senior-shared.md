---
id: security-senior
title: Threat Modelling, JWT Auth Flows, Confused Deputy & What Obfuscation Actually Buys (Senior, Android + iOS)
description: Threat-modelling a feature, auth flows and token lifetime as a JWT specification, deep-link/exported-component abuse and the confused deputy, tamper/root detection, and ProGuard/R8 obfuscation limits.
tags: [android, ios, security, threat-modeling, jwt, obfuscation, senior]
lang: en
status: complete
domain: 10-security-and-privacy
band: S
platform: shared
level: Senior
sidebar_position: 2
prerequisites: [security-mid]
outcomes:
  - "Produce a threat model: assets, adversaries, entry points, and the mitigations you chose not to build, with reasons"
resources:
  - title: "OWASP Mobile Application Security Testing Guide — threat modeling"
    url: "https://mas.owasp.org/MASTG/"
    date: "2025-01-01"
  - title: "RFC 7519 — JSON Web Token"
    url: "https://datatracker.ietf.org/doc/html/rfc7519"
    date: "2015-05-01"
  - title: "Android App Links verification"
    url: "https://developer.android.com/training/app-links/verify-android-applinks"
    date: "2024-11-01"
  - title: "R8 shrinking and obfuscation"
    url: "https://developer.android.com/build/shrink-code"
    date: "2024-11-01"
---

# Threat Modelling, JWT Auth Flows, Confused Deputy & What Obfuscation Actually Buys

> **Outcome.** Produce a threat model for a real feature: its assets, its adversaries, its
> entry points, and — the part most threat models skip — the mitigations you deliberately chose
> **not** to build, with the reasoning written down.

## 1. Threat-modelling a feature

A threat model answers four questions, in order, and is only useful written down where someone
else can check it:

```markdown
## Threat model: profile photo upload

Assets: the uploaded photo, the user's auth token used to authorize the upload,
the pre-signed upload URL.
Adversaries: another app on the same device (IPC/deep-link abuse), a network
observer on public wifi, a malicious server response if the CDN is compromised.
Entry points: the exported activity that receives the upload intent, the
network call to request a pre-signed URL, the deep link that opens this screen
directly from a push notification.
Mitigations chosen: validate the calling package on the exported activity
(section 3), TLS with certificate validation on the network call (domain 06 Senior),
short-lived pre-signed URLs (5 minutes) rather than a long-lived credential.
Mitigations chosen NOT to build, and why: client-side image content scanning —
the backend already scans on ingest, and duplicating it doubles cost for a
control an attacker can bypass client-side anyway (see section 4 on tamper
detection's honest limits).
```

> [!IMPORTANT]
> The mitigations-not-built section is the part that separates a real threat model from a
> checklist copy-paste. Every control has a cost; stating why a plausible control was rejected
> is what makes the model defensible in a review rather than merely long.

## 2. Auth flows and token lifetime, worked as a JWT specification

A JSON Web Token is three dot-separated, base64url-encoded parts: `Header.Payload.Signature`.

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwiZXhwIjoxNzM1Njg5NjAwfQ.signature
```

```json
// Header — signing algorithm and token type
{ "alg": "HS256", "typ": "JWT" }

// Payload — claims: subject, expiry, and whatever the app actually needs to check
{ "sub": "1234567890", "exp": 1735689600, "roles": ["user"] }
```

The signature is computed over the encoded header and payload with a secret (or private key for
`RS256`) the client never holds — this is why validating a JWT client-side proves only that the
token has the shape of a JWT, not that it is trustworthy; trust comes from the signature, and
the client has no way to verify an `HS256` signature without the shared secret, which must never
ship in the app (section 1 of domain 10's Mid article).

```kotlin
// A worked token-lifetime policy: short-lived access token, longer-lived refresh
// token, refresh coordinated so three concurrent 401s trigger exactly one refresh
// call (domain 06 Mid's networking article covers the coalescing mechanics).
data class TokenPolicy(
    val accessTokenTtl: Duration = 15.minutes,   // short — limits the blast radius of a leak
    val refreshTokenTtl: Duration = 30.days,     // longer — but revocable server-side
    val refreshTokenRotates: Boolean = true,     // each refresh issues a new refresh token,
                                                   // invalidating the old one — a stolen refresh
                                                   // token used once is detectable and revocable
)
```

> [!WARNING]
> A long-lived access token used directly (no refresh flow at all) removes the main lever you
> have to limit a leaked token's usefulness: expiry. The access-token TTL is a deliberate
> trade-off between "user re-authenticates less often" and "a leaked token stays valid for less
> time" — stating that trade-off explicitly is part of the threat model, not an implementation
> detail beneath it.

## 3. Deep-link and exported-component abuse; the confused deputy

Android's deep-link surface has three forms, each with a different trust boundary:

```
Custom Scheme (myapp://profile)   — any app can register and claim the same scheme;
                                     no verification the link came from where it claims.
App Links (https://myapp.com/...) — cryptographically verified via Digital Asset Links
                                     (assetlinks.json hosted on the domain); opens directly,
                                     no disambiguation dialog, no scheme-hijacking risk.
Deferred deep links                — preserve link-click intent across a Play Store
                                     install-then-launch; the deferred payload itself
                                     still needs the same validation as any other input.
```

A **confused deputy** is any exported component that performs a privileged action on behalf of
whoever called it, without checking whether that caller was entitled to ask for it:

```kotlin
// WRONG: this exported activity deletes a user's saved payment method on request —
// ANY app on the device can send this intent; the activity is "confused" into acting
// as a deputy for an attacker with no authority to request the deletion.
class DeletePaymentMethodActivity : Activity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val methodId = intent.getStringExtra("method_id")
        paymentRepository.delete(methodId) // no caller check at all
    }
}
```

```kotlin
// RIGHT: validate the calling package's signature before performing any
// privileged action triggered by an external intent.
class DeletePaymentMethodActivity : Activity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val callingPackage = callingActivity?.packageName
        if (callingPackage == null || !isSignedWithTrustedCertificate(callingPackage)) {
            finish(); return
        }
        val methodId = intent.getStringExtra("method_id")
        paymentRepository.delete(methodId)
    }
}
```

```swift
// iOS: Universal Links carry the same App-Links-style domain verification
// (apple-app-site-association hosted on the domain); a custom URL scheme has the
// same scheme-hijacking exposure as Android's Custom Scheme — any app can
// register the same scheme and no verification confirms the caller's identity.
```

> [!IMPORTANT]
> The confused-deputy pattern generalises past deep links: any exported component, content
> provider, or broadcast receiver that performs a privileged action based only on the intent's
> contents — never checking who sent it — is the same bug. Treat every exported surface as
> attacker-reachable, because on a device with other installed apps, it is.

## 4. Tamper, root and jailbreak detection — an honest account of its value

```kotlin
// A root-detection check can be defeated by any attacker willing to patch the
// check itself out of the APK — it raises the bar for casual tampering, it does
// not stop a motivated one. Ship it as ONE signal feeding a risk decision
// (e.g., disable a high-value feature on a rooted device), never as the only
// control protecting something that actually matters.
fun isLikelyRooted(): Boolean =
    File("/system/app/Superuser.apk").exists() ||
    Runtime.getRuntime().exec(arrayOf("which", "su")).waitFor() == 0
```

> [!WARNING]
> The honest framing: root/jailbreak detection is a speed bump, not a wall. It deters casual
> tampering and can inform a risk-based decision (step up authentication, disable a sensitive
> feature) — it cannot be the sole control protecting something an attacker is actually
> motivated to bypass, because the detection code itself runs on a device the attacker controls.

## 5. What obfuscation does and does not buy

R8 (Android's default shrinker/obfuscator) renames classes, methods and fields to short,
meaningless identifiers, and strips code the shrinker proves is unreachable:

```proguard
# Preserve line numbers and source-file attributes so a crash reporter can still
# re-symbolicate an obfuscated stack trace back to real source (domain 12 Mid) —
# obfuscation and diagnosability are not actually in tension if configured right.
-renamesourcefileattribute SourceFile
-keepattributes SourceFile,LineNumberTable

# Keep classes reflection-based SDKs need by exact name, or they crash at runtime
# looking for a class R8 renamed or removed.
-keepclassmembers class * implements java.io.Serializable {
    static final long serialVersionUID;
    private static final java.io.ObjectStreamField[] serialPersistentFields;
    !static !transient <fields>;
}
-keepclassmembers class * {
    @com.google.gson.annotations.SerializedName <fields>;
}
```

What this buys: slower, more annoying reverse engineering — a decompiled `a.b.c.d()` takes real
effort to map back to `PaymentValidator.validateCard()`. What it does **not** buy: any actual
security boundary. Renamed identifiers do not protect a hardcoded secret (still a plain string
in the renamed class), do not stop dynamic instrumentation (Frida attaches to running code
regardless of identifier names), and do not constitute encryption of anything.

> [!IMPORTANT]
> **The load-bearing platform break in this domain:** there is no iOS counterpart to R8
> identifier renaming. Swift's compiler already strips debug symbols from a release build and
> performs its own dead-code stripping, but nothing in the standard toolchain renames identifiers
> the way R8 does. Android engineers who treat obfuscation as a security control on Android carry
> that same (already-overstated) assumption to iOS, where the equivalent lever does not exist at
> all — which is usually the moment to notice that obfuscation was never a security control on
> either platform, only a cost multiplier for reverse engineering.

## Pitfalls & trade-offs

- **Skipping the "mitigations chosen not to build" section of the threat model.** Covered
  above — this is the section that proves the model was reasoned about, not copy-pasted.
- **Validating a JWT's shape client-side and treating that as trust.** Trust comes from the
  signature, verified server-side with a secret the client never holds.
- **An exported component that acts on an intent's contents without checking the caller.**
  The confused-deputy pattern, covered in section 3 — treat every exported surface as
  attacker-reachable.
- **Root/jailbreak detection presented as a hard security boundary.** It is a speed bump and a
  risk signal; the detection code runs on hardware the attacker controls.
- **Stating "we use ProGuard/R8" as a security control in a threat model or a pen-test
  response.** It raises the cost of reverse engineering; it protects nothing that matters if
  that is the only stated mitigation, and it has no iOS equivalent to fall back on at all.
