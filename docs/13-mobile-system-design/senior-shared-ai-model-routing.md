---
id: ai-model-routing
title: AI Model Routing & Classifier Architecture (Senior, Android + iOS)
description: How an AI router evaluates prompt complexity with semantic routing and classifiers, then dispatches to the cheapest model that can answer — a cost/latency design problem, treated as one.
tags: [system-design, ai, llm, routing, senior]
lang: en
status: complete
domain: 13-mobile-system-design
band: S
platform: shared
level: Senior
sidebar_position: 4
prerequisites: [system-design-senior]
outcomes:
  - "Design a model-routing tier that keeps p95 latency and per-request cost inside a stated budget, and name what happens when the classifier is wrong"
---

# Enterprise AI Model Routing & Classifier Architecture

## 🤖 1. Dynamic AI Model Dispatch Mechanism

```mermaid
graph TD
    UserPrompt["Incoming User Prompt"] --> Router["AI Router System"]
    
    Router --> SemanticRoute["1. Semantic Routing (Domain Mapping)"]
    Router --> Classifier["2. Classifier (Difficulty Score 1-10)"]
    
    SemanticRoute & Classifier --> Decision{"Score & Domain"}
    
    Decision -- Difficulty 1-4 --> FastModel["Flash / Lightweight Model (Fast, low cost)"]
    Decision -- Difficulty 5-7 --> MidModel["Standard Pro Model"]
    Decision -- Difficulty 8-10 --> HeavyModel["Reasoning Model (Claude 3.5 / GPT-4o)"]
```

---

## 🛠️ 2. Core Routing Mechanics

1. **Semantic Routing**: Matches prompt embedding vectors against domain clusters (e.g. Code refactoring, UI layout, SQL query) to identify target model specialization.
2. **Classifier Scoring**: Evaluates prompt token length, reasoning steps required, and dependency constraints to assign a numeric difficulty tier.
3. **Cost & Latency Optimization**: Directs low-complexity queries to smaller, faster models to minimize API latency and token expenditure.
