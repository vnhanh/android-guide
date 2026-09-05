---
id: security-permissions-and-ipc
title: Android Security, Permissions Architecture & IPC Deep Links
description: Deep link handling (Custom Schemes, App Links), partial media access (Android 14+), dynamic permission levels, and IPC attack mitigations.
sidebar_position: 5
tags: [Android, Security, Deep Links, Permissions, IPC]
level: Lead
lang: en
status: complete
---

# Android Security, Permissions Architecture & IPC Deep Links

## 🔗 1. Deep Link Routing Architecture

### Deep Link Types
1. **Custom Scheme** (`myapp://profile`): Easy to implement, but vulnerable to intent hijacking by other apps.
2. **App Links / Universal Links** (`https://myapp.com/profile`): Cryptographically verified via Digital Asset Links (`assetlinks.json`). Opens app directly without disambiguation dialog.
3. **Deferred Deep Links**: Preserves initial link click state through app installation from Play Store before launching.

---

## 🛡️ 2. Android Permission Protection Levels

- **Normal**: Low risk (e.g., Internet). Granted automatically at install.
- **Dangerous / Runtime**: Grants access to private user data (Location, Camera, Contacts). Requires dynamic prompt at runtime.
- **Special / App Ops**: Elevated system permissions (`SYSTEM_ALERT_WINDOW`, `MANAGE_EXTERNAL_STORAGE`). Requires explicit user navigation to system settings.
- **Signature**: Reserved for apps signed with the same developer certificate.
- **Privileged / System**: Pre-installed system apps located in `/system/priv-app`.

---

## 🔒 3. Partial Media Access (Android 14+) & Confused Deputy Mitigation

> [!WARNING]
> **Android 14 (API 34)** introduces `READ_MEDIA_VISUAL_USER_SELECTED`. Apps requesting photo access must handle cases where users grant temporary access to a subset of photos rather than full library access.

### Confused Deputy Prevention in Exported Components
Exported components (`android:exported="true"`) accepting IPC Intents must validate caller signature:

```kotlin
val callingPackage = callingActivity?.packageName
if (!isSignedWithTrustedCertificate(callingPackage)) {
    throw SecurityException("Unauthorized IPC invocation target")
}
```
