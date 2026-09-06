---
id: security-mid
title: Secrets, Keystore/Keychain & the OWASP Failures Hiding in Your Own Code (Mid, Android + iOS)
description: What never goes in a binary, Keystore/Keychain, permission requests and data minimisation, input validation, and recognising the OWASP mobile top ten in your own feature.
tags: [android, ios, security, privacy, owasp, mid]
lang: en
status: complete
domain: 10-security-and-privacy
band: M
platform: shared
level: Mid
sidebar_position: 1
prerequisites: [fundamentals-null-safety-kotlin, fundamentals-oop-solid-kotlin, platform-process-lifecycle-android, platform-startup-sequencing-android, networking-mid]
outcomes:
  - "Audit your own feature against the OWASP mobile top ten and find at least one real issue"
resources:
  - title: "OWASP Mobile Top 10"
    url: "https://owasp.org/www-project-mobile-top-10/"
    date: "2024-01-01"
  - title: "Android Keystore system"
    url: "https://developer.android.com/privacy-and-security/keystore"
    date: "2025-03-01"
  - title: "Keychain services (iOS)"
    url: "https://developer.apple.com/documentation/security/keychain-services"
    date: "2025-06-01"
  - title: "App permissions best practices"
    url: "https://developer.android.com/training/permissions/usage-notes"
    date: "2024-11-01"
---

# Secrets, Keystore/Keychain & the OWASP Failures Hiding in Your Own Code

> **Outcome.** Audit your own feature against the OWASP mobile top ten and find at least one
> real issue — not a hypothetical one from a checklist, an actual line of code in something you
> shipped.

## 1. Secrets: what never goes in a binary, and why the binary is public

An APK or IPA is not a black box. Anyone who installs the app can unzip it, decompile it, and
read every string constant that shipped inside it — R8/ProGuard renaming classes and methods
(domain 09's Senior article covers the shrinking side) does nothing to hide a string literal.

```kotlin
// WRONG: this API key is in the APK the moment it ships, findable with `strings`
// on the decompiled classes.dex or even the raw APK zip, no reverse-engineering skill required.
const val PAYMENT_API_KEY = "sk_live_51H8x..."
```

```kotlin
// A secret that must be present on-device belongs behind a backend the app calls,
// or is provisioned per-session from a server the app authenticates to first —
// never a compile-time constant, an asset file, or a build config field.
class PaymentService(private val backendClient: BackendClient) {
    suspend fun createCharge(amount: Long): ChargeResult =
        backendClient.post("/charges", body = ChargeRequest(amount)) // key lives server-side
}
```

> [!WARNING]
> "It's in `BuildConfig`, not hardcoded in a string" is not a mitigation — `BuildConfig` fields
> and `Info.plist` entries are compiled into the binary exactly like a string literal. The only
> real fix is not shipping the secret to the device at all.

## 2. Keystore and Keychain

Anything that genuinely must live on-device — an encryption key, a session token you want
protected even if the device's filesystem is read (a rooted or jailbroken device, a backup
extraction) — goes into the platform's hardware-backed secure storage, not `SharedPreferences`
or `UserDefaults` in plaintext.

```kotlin
// Android: a key generated inside the Keystore never leaves it in exportable form —
// operations happen inside secure hardware, the raw key material is not readable
// even by the app process itself.
val keyGenerator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore")
keyGenerator.init(
    KeyGenParameterSpec.Builder("session_key", KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT)
        .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
        .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
        .build()
)
val key = keyGenerator.generateKey()
```

```swift
// iOS: the Keychain, backed by the Secure Enclave on supported devices, is the
// equivalent — a token stored here survives app reinstalls only if explicitly
// configured to, and is not readable from a plain file-system dump.
let query: [String: Any] = [
    kSecClass as String: kSecClassGenericPassword,
    kSecAttrAccount as String: "sessionToken",
    kSecValueData as String: tokenData,
    kSecAttrAccessible as String: kSecAttrAccessibleWhenUnlockedThisDeviceOnly,
]
SecItemAdd(query as CFDictionary, nil)
```

> [!NOTE]
> `SharedPreferences` and `UserDefaults` are not encrypted by default. A session token or refresh
> token stored there is readable by anything with file-system access to the app's sandbox on a
> rooted/jailbroken device — Keystore/Keychain is the difference between "protected by hardware"
> and "protected by hoping nobody roots the phone."

## 3. Permission requests and data minimisation

```kotlin
// WRONG: requesting broad access "in case we need it later" — every unused
// permission is attack surface and a line item on the Play Data Safety form
// (domain 10's Lead article) that has to be justified to a reviewer or a user.
val permissions = arrayOf(
    Manifest.permission.ACCESS_FINE_LOCATION,
    Manifest.permission.READ_CONTACTS,
    Manifest.permission.CAMERA,
)

// RIGHT: request only what the feature in front of the user right now needs,
// at the point it's needed — not all up front at first launch.
fun requestLocationForNearbyStores(activity: Activity) {
    if (ContextCompat.checkSelfPermission(activity, Manifest.permission.ACCESS_COARSE_LOCATION)
        != PackageManager.PERMISSION_GRANTED) {
        ActivityCompat.requestPermissions(
            activity, arrayOf(Manifest.permission.ACCESS_COARSE_LOCATION), REQUEST_CODE
        )
    }
    // Coarse, not fine — "nearby stores" doesn't need precise location.
}
```

> [!IMPORTANT]
> Data minimisation is not only a compliance requirement, it's a security property: data you
> never collect cannot leak in a breach, cannot be subpoenaed, and cannot be the thing a
> confused-deputy bug (domain 10's Senior article) exposes to the wrong caller. The cheapest
> mitigation for a category of risk is not collecting the data at all.

## 4. Input validation

```kotlin
// WRONG: trusting a deep-link parameter or a server response field to already
// be well-formed just because it came from "your own" backend or a link you
// generated — an attacker controls the actual bytes that arrive at runtime.
fun openProfile(userId: String) {
    val url = "https://api.example.com/users/$userId" // unvalidated — path injection if userId
                                                        // contains "../" or similar
    fetch(url)
}

// RIGHT: validate shape and range at the boundary, before the value is used
// for anything — a navigation decision, a query, a file path.
fun openProfile(userId: String) {
    require(userId.matches(Regex("^[a-zA-Z0-9_-]{1,64}$"))) { "Invalid user id" }
    fetch("https://api.example.com/users/$userId")
}
```

## 5. The OWASP mobile top ten, recognised in your own code

```
M1 Improper credential usage       — a token stored in plaintext, or reused past its lifetime
M2 Inadequate supply chain security — an unvetted third-party SDK (domain 10 Lead)
M3 Insecure auth/authz              — trusting a client-side role check with no server enforcement
M4 Insufficient input/output validation — section 4 above
M5 Insecure communication           — no TLS pinning, or accepting any certificate
M6 Inadequate privacy controls      — collecting more than the feature needs (section 3)
M7 Insufficient binary protections  — a hardcoded secret (section 1)
M8 Security misconfiguration        — exported components with no caller validation (domain 10 Senior)
M9 Insecure data storage            — SharedPreferences/UserDefaults for a token (section 2)
M10 Insufficient cryptography       — home-rolled encryption instead of platform APIs
```

> [!IMPORTANT]
> The assessable version of this article's outcome is not reciting this list — it's opening a
> feature you shipped and finding which row it actually matches. A believable audit finds real
> M6 or M9 issues far more often than it finds M10; most mobile security defects are mundane
> storage and permission mistakes, not novel cryptographic attacks.

## Pitfalls & trade-offs

- **Treating `BuildConfig`/`Info.plist` as a hiding place for secrets.** Covered above — both
  compile straight into the binary; the only fix is not shipping the secret to the device.
- **Storing a token in `SharedPreferences`/`UserDefaults` because Keystore/Keychain felt like
  more ceremony.** The ceremony is the point — it's the difference between "protected by
  hardware" and "protected by nobody looking."
- **Requesting every permission a feature might conceivably need someday.** Each one is
  attack surface now and a Play Data Safety line item later (domain 10's Lead article).
- **Validating input only against "does it look normal," not the boundary case an attacker
  actually sends.** A deep-link parameter or server field is attacker-controlled the moment
  it's untrusted input, regardless of who usually sends it.
- **Auditing against OWASP by reading the list, not by opening real code.** The outcome
  explicitly requires a real issue in your own feature, not a paraphrase of the checklist.
