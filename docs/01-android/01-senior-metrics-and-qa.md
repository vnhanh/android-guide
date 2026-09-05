---
id: senior-metrics-and-qa
title: Senior Mobile Architect Introduction & Core Metrics Q&A
description: Executive summary of 7+ years Android experience, startup optimization, ANR resolution, and technical interview strategies.
sidebar_position: 1
tags: [Android, Architecture, Interview, Performance, Mentoring]
level: Senior
lang: en
status: complete
---

# Senior Mobile Architect Introduction & Core Metrics Q&A

> The author-profile introduction that used to open this article now lives on the **About**
> page (Phase 1.7 — see `plan/phases.md`). This article keeps the interview Q&A case studies.

## 🎯 Executive Interview Q&A Cases (Senior/Lead Level)

### Case 1: Complex ANR & Memory Leak Resolution
> [!IMPORTANT]
> **Scenario**: App encountered an **ANR rate of ~0.8%** on Android Vitals and memory leaks during user navigation between complex feature flows.

#### Root Cause Analysis
A singleton manager retained strong listener registrations from `View`/`Activity` contexts without proper unregistration during lifecycle destruction.

#### Resolution Strategy
1. **Diagnosis**: Used **LeakCanary** alongside **Android Studio Memory Profiler** heap dumps to isolate the exact GC Root path.
2. **Refactoring**: Converted legacy callback/listener interfaces to reactive `StateFlow` / `SharedFlow` streams.
3. **Lifecycle Binding**: Replaced standard `lifecycleScope.launch` calls with lifecycle-aware flow collection:
```kotlin
viewLifecycleOwner.lifecycleScope.launch {
    viewLifecycleOwner.repeatOnLifecycle(Lifecycle.State.STARTED) {
        viewModel.uiState.collect { state ->
            // Safely update UI
        }
    }
}
```

---

### Case 2: 15% Startup Time Optimization Engineering

> [!TIP]
> **Measurement Toolkit**:
> - **Android Vitals**: Real User Monitoring (RUM) cold/warm startup metrics.
> - **Macrobenchmark Library**: Automated CI/CD benchmarking on actual hardware devices.
> - **Firebase Performance Monitoring**: Custom traces spanning from `Application.onCreate()` to first frame interaction.

#### Technical Execution
1. **Baseline Profiles**: Generated compilation profile rules for critical user paths to enable Ahead-Of-Time (AOT) compilation via R8/Dex2oat.
2. **App Startup Library**: Consolidated third-party SDK initializations (Analytics, Crashlytics, Gleap) into deferred content providers.
3. **Lazy & Defer Initialization**: Offloaded non-critical initializations off the Main Thread using background coroutine dispatchers (`Dispatchers.IO`).

---

> Case 3 (Hilt DI in multi-module architecture) has been re-filed into
> [`architecture-senior`](../07-architecture-and-modularisation/senior-shared.md) per
> `plan/gap-analysis.md`. Cases 1, 2, 4 and 5 still await re-filing into domains 09 (Senior,
> ×2), 14 (Lead) and 17 (Lead) — this article stays until all four land.

---

### Case 4: Native vs. Cross-Platform Architectural Decision Framework

| Criterion | Native (Kotlin / Compose) | Cross-Platform (Flutter / React Native) |
| :--- | :--- | :--- |
| **Primary Use Case** | Ultra-high performance, complex graphics, deep hardware integration | Rapid PoC / MVP, Go-To-Market speed, CRUD/E-commerce apps |
| **Platform APIs** | Direct access to latest Android/iOS OS APIs (Bluetooth LE, Widgets, WorkManager) | Bridge / Platform channel overhead |
| **Stability Target** | Mission-critical apps requiring >99.75% crash-free stability | Unified UI & codebase with fast release cycles |

---

### Case 5: Handling Architectural Violations Under Tight Deadlines

1. **Risk Assessment**: Classify non-compliant code. High-risk (memory leaks, crashes, performance degradation) requires immediate 1-on-1 refactoring before merge.
2. **Technical Debt Tracking**: For safe code with minor convention flaws, merge to meet deadline and immediately file a Tech Debt ticket on Linear/Jira.
3. **Post-Release Mentoring**: Conduct post-mortem 1-on-1 code reviews to explain structural principles and prevent recurring anti-patterns.
