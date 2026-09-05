---
id: multi-module-architecture-and-routing
title: Android Multi-Module Architecture & Decoupled Routing
description: Enterprise modularization using API/Implementation split (:api & :impl), Dynamic Feature Modules (DFM), and Type-Safe Routes.
sidebar_position: 6
tags: [Android, Architecture, Multi-Module, Gradle, Navigation]
level: Senior
lang: en
status: complete
---

# Android Multi-Module Architecture & Decoupled Routing

## 📐 1. Graph Hierarchy & `:api` vs `:impl` Split Pattern

```
                       ┌──────────────┐
                       │     :app     │
                       └──────┬───────┘
                              │
               ┌──────────────┴──────────────┐
               ▼                             ▼
       ┌──────────────┐              ┌──────────────┐
       │ :feature:a   │              │ :feature:b   │
       └──────┬───────┘              └──────┬───────┘
              │                             │
              └──────────────┬──────────────┘
                             ▼
                    ┌─────────────────┐
                    │ :core:navigation│
                    └─────────────────┘
```

- **`:feature:profile:api`**: Exposes lightweight interface contracts and navigation routes.
- **`:feature:profile:impl`**: Holds UI composables, ViewModels, and internal business logic. Other modules compile against `:api` without triggering recompilation when internal `:impl` code changes.

---

## 🚗 2. Decoupled Navigation Strategies Comparison

| Criteria | Interface Delegation | Type-Safe Routes (Nav 2.8+) | Deep Link URI Routing |
| :--- | :--- | :--- | :--- |
| **Type Safety** | High (Compile-time verified) | High (Kotlin `@Serializable` types) | Low (String URL parsing) |
| **Boilerplate** | Moderate (Requires contract interface) | Low (Minimal code required) | Low |
| **Decoupling** | Complete decoupling | Decoupled via shared `:core:nav` | Complete dynamic decoupling |
| **DFM Support** | Supported via Hilt entry points | Supported | Native platform support |

```kotlin
// Jetpack Navigation 2.8+ Type-Safe Route Definition in :core:navigation
@Serializable
data class ProfileRoute(val userId: String)

// Navigating from any feature without depending on :feature:profile:impl
navController.navigate(ProfileRoute(userId = "user_789"))
```
