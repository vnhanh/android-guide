---
id: monolith-to-multimodule-migration
title: Monolith to Multi-Module Migration Strategy
description: Step-by-step refactoring roadmap for legacy Android apps to maintain developer velocity while splitting feature modules.
sidebar_position: 8
tags: [Android, Modularization, Architecture, Refactoring]
level: Senior
lang: en
status: complete
---

# Monolith to Multi-Module Migration Strategy

## 🛣️ Step-by-Step Refactoring Roadmap

```
Phase 1: Core Infra      Phase 2: Navigation     Phase 3: Leaf Modules    Phase 4: API/Impl
┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│  Extract :core   │ ─► │ Break Navigation │ ─► │ Extract Isolated │ ─► │ Split Complex    │
│ (Utils/Theme/DB) │    │  Direct Coupling │    │  Feature Modules │    │ Features API/Impl│
└──────────────────┘    └──────────────────┘    └──────────────────┘    └──────────────────┘
```

### 1. Phase 1: Infrastructure Isolation (`:core`)
Extract foundational libraries (Network client, Database, Base UI Theme, Extensions) into isolated `:core:*` modules. Standardize dependencies using Gradle Version Catalogs (`libs.versions.toml`).

### 2. Phase 2: Navigation Abstraction (`:core:navigation`)
Implement dynamic feature contracts or type-safe routes in `:core:navigation`. Remove direct Activity/Fragment references between domain areas.

### 3. Phase 3: Leaf Module Migration
Extract small, independent user flows (e.g. Settings, About, Help) into leaf feature modules first. Leaf modules have zero dependents, making extraction low-risk.

### 4. Phase 4: Core Feature API / Impl Split
For large core features (Payment, Cart, Home), split into `:feature:cart:api` and `:feature:cart:impl`. This preserves rapid incremental compile times even as team size grows.
