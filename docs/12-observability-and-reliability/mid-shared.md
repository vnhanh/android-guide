---
id: observability-mid
title: Reading a Crash Report, Breadcrumbs & the Dashboards That Already Exist (Mid, Android + iOS)
description: Reading a crash report with symbols actually working, meaningful breadcrumbs instead of Log.d, filing an actionable bug, and reading existing dashboards.
tags: [android, ios, observability, crash-reporting, mid]
lang: en
status: complete
domain: 12-observability-and-reliability
band: M
platform: shared
level: Mid
sidebar_position: 1
prerequisites: [platform-process-lifecycle-and-death, platform-background-work-and-scheduling, platform-permissions-and-entry-points, release-mid-android]
outcomes:
  - "Take a crash from the dashboard to a specific line, without a local reproduction"
resources:
  - title: "Firebase Crashlytics"
    url: "https://firebase.google.com/docs/crashlytics"
    date: "2025-03-01"
  - title: "Understanding crash reports (iOS)"
    url: "https://developer.apple.com/documentation/xcode/understanding-the-structure-of-a-crash-report"
    date: "2025-06-01"
  - title: "ProGuard/R8 mapping files"
    url: "https://developer.android.com/build/shrink-code#retracing"
    date: "2024-11-01"
  - title: "Structured logging basics"
    url: "https://developer.android.com/topic/performance/vitals"
    date: "2024-11-01"
---

# Reading a Crash Report, Breadcrumbs & the Dashboards That Already Exist

> **Outcome.** Take a crash from the dashboard to a specific line of code, without a local
> reproduction — because for most field crashes, a reproduction is not available, and the
> report itself has to be enough.

## 1. Reading a crash report with symbols actually working

A crash report's stack trace is only readable if the crash reporting tool can **re-symbolicate**
it — map an obfuscated method name or a memory address back to real source. This depends on a
mapping artifact being uploaded at build time, matched to the exact build that crashed.

```kotlin
// build.gradle.kts — R8/ProGuard obfuscates release builds; the mapping.txt this
// produces is what re-symbolicates a crash back to real class/method names.
android {
    buildTypes {
        release {
            isMinifyEnabled = true
            // The Crashlytics Gradle plugin uploads mapping.txt automatically per build —
            // verify this actually happened for the build that crashed, not just that
            // the plugin is configured; a missing upload for one build variant is the
            // single most common reason a crash report shows unreadable method names.
        }
    }
}
```

```
# Retracing manually if a mapping wasn't auto-uploaded:
retrace mapping.txt obfuscated_stacktrace.txt
```

```
// iOS: a crash report needs the dSYM matching the exact build number and architecture
// that crashed — Xcode Organizer or Crashlytics symbolicates automatically IF the dSYM
// was uploaded; a missing dSYM for one specific build/architecture combination is the
// direct iOS analogue of a missing mapping.txt.
```

> [!IMPORTANT]
> Before concluding a crash is "unreproducible" or its stack trace "makes no sense," confirm the
> mapping/dSYM for that exact build actually uploaded. An unsymbolicated crash report full of
> single-letter method names is not a mystery crash — it's a build-pipeline gap, and the fix is
> uploading the missing artifact and re-processing, not debugging the symptom by guesswork.

## 2. Meaningful events and breadcrumbs, not `Log.d("here")`

```kotlin
// USELESS once this crashes in production: a log statement that only exists on a
// device connected to a debugger the field crash will never have.
Log.d("Debug", "here")

// USEFUL: a breadcrumb the crash reporter attaches to the NEXT crash report, giving
// the state leading up to it even with zero access to the device itself.
FirebaseCrashlytics.getInstance().log("Profile screen: loadProfile started, userId=$userId")
FirebaseCrashlytics.getInstance().setCustomKey("cache_state", if (isCached) "hit" else "miss")
```

```swift
Crashlytics.crashlytics().log("Profile screen: loadProfile started, userId=\(userId)")
Crashlytics.crashlytics().setCustomValue(isCached, forKey: "cache_hit")
```

> [!NOTE]
> The distinguishing question for a good breadcrumb: would this line still be useful read from a
> crash report six months from now, on a device you will never have access to? "here" answers no
> to both. "loadProfile started, cache miss" answers yes to both — it names a specific state
> transition, not just a location.

## 3. Reproducing and filing a bug someone else can act on

```markdown
## Bug: Crash on profile screen after backgrounding during load

Crash report: [link to Crashlytics/Organizer issue]
Stack trace top frame: ProfileViewModel.kt:47, NullPointerException on `repository`
Breadcrumbs leading up to it: "loadProfile started" (no matching "loadProfile
completed" before the crash) — suggests the screen was backgrounded mid-load and
the ViewModel's repository reference was cleared before the callback returned.
Affected version/device segment: 3.2% of sessions on app v4.1.0, concentrated on
API 33 devices per the Crashlytics device breakdown.
Repro attempt: not reproduced locally after 20 minutes on 3 device configurations —
filed from the report evidence above, not from a local repro.
```

A bug report built entirely from dashboard evidence — stack trace, breadcrumbs, affected
segment — is checkable and actionable by someone who has never seen the crash happen, which is
the actual bar this outcome sets: most field crashes are never locally reproduced at all, and
the report has to carry the diagnostic weight a repro normally would.

## 4. Reading the dashboards that already exist

```
Android Vitals / Play Console: crash-free sessions, ANR rate, by device/OS-version segment.
Crashlytics: crash clusters grouped by stack signature, breadcrumb trails per report.
iOS: Xcode Organizer (crash reports, symbolicated automatically for App Store builds),
     MetricKit (hang rate, launch time — sampled, arrives with a multi-day delay).
```

> [!IMPORTANT]
> Reading these dashboards for signal, not just for the top-line number: a crash-free-sessions
> percentage that looks fine in aggregate can hide a cluster concentrated on one OS version or
> one device tier — segment before concluding "stable," the same habit domain 02's Senior
> article applies to field kills.

## Pitfalls & trade-offs

- **Concluding a crash is unreproducible before checking whether it's actually
  unsymbolicated.** Covered above — a missing mapping/dSYM upload masquerades as a mystery crash.
- **A log statement useful only on a connected debugger.** `Log.d("here")` tells a future
  reader, reading a field crash report, nothing — a breadcrumb naming a specific state does.
- **Filing a bug with no dashboard evidence attached because there's no local repro.** The
  evidence in the report — stack trace, breadcrumbs, affected segment — is the substitute for a
  repro, not a lesser version of a bug report; most field crashes never get one at all.
- **Reading only the aggregate crash-free-sessions number.** A healthy-looking top-line metric
  can hide a serious problem concentrated in one segment — always check the breakdown before
  concluding stability is actually fine.
