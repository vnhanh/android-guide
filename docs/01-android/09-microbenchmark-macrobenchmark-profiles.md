---
id: microbenchmark-macrobenchmark-profiles
title: Microbenchmark, Macrobenchmark & Compilation Profiles
description: Comparative guide to micro vs macrobenchmarking, Baseline Profiles, and Startup Profiles for Android app performance optimization.
sidebar_position: 9
tags: [Android, Benchmarking, Performance, Baseline Profiles]
level: Lead
lang: en
status: complete
---

# Microbenchmark, Macrobenchmark & Compilation Profiles

## 📊 1. Microbenchmark vs. Macrobenchmark

| Dimension | Microbenchmark (`androidx.benchmark`) | Macrobenchmark (`androidx.benchmark.macro`) |
| :--- | :--- | :--- |
| **Scope** | Code-level algorithms, JSON parsing, string manipulations | Full End-to-End user journeys, App Launch, UI Scroll Jank |
| **Environment** | In-process (runs inside test runner process) | Out-of-process (drives app via UiAutomator) |
| **Metrics** | CPU cycles, memory allocations per function call | Frame rendering time (Jank), Cold/Warm Startup latency |

---

## ⚡ 2. Baseline Profiles vs. Startup Profiles

```kotlin
// Macrobenchmark test generating Baseline Profiles
@OptIn(ExperimentalBaselineProfilesApi::class)
@RunWith(AndroidJUnit4::class)
class BaselineProfileGenerator {
    @get:Rule
    val rule = BaselineProfileRule()

    @Test
    def generate() = rule.collect(
        packageName = "com.example.app",
        profileBlock = {
            startActivityAndWait()
            // Drive critical user journey flows
            scrollFeed()
        }
    )
}
```

- **Baseline Profiles**: Optimizes code paths executed during app startup **and** key user journeys by embedding AOT compilation rules into the APK/AAB bundle.
- **Startup Profiles**: Strictly targets code paths required from process creation (`Application.onCreate()`) to the drawing of the first interactive UI frame.
