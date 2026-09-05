# Web Publishing Format & MDX Rules

This rule file specifies guidelines for formatting markdown content for web hosting and static site generators.

---

## 📄 1. Frontmatter Requirements

Every published page in `docs/` must start with a valid YAML header:

```yaml
---
id: string
title: string
description: string
tags: [array, of, tags]
level: Mid | Senior | Lead
lang: en | vi
status: complete | pending
sidebar_position: number       # legacy articles only; new band units order via prerequisites
# Once an article is filed against the domain taxonomy (see ARCHITECTURE.md), also set:
domain: string                 # e.g. 04-concurrency-and-asynchrony
band: M | S | L
platform: android | ios | shared
prerequisites: [array, of, article, ids]
outcomes: [array, of, assessable, outcome, statements]
counterpart: other-article-id  # platform-specific units only, must be symmetric
---
```

- **id**: Kebab-case unique slug identifier.
- **title**: Clear, descriptive page title without quotes unless necessary.
- **description**: 1-2 sentence concise summary optimized for web SEO and meta tags.
- **level**: `Mid | Senior | Lead`. `Staff` is retired from the ladder — see
  `plan/framework.md` → "Levels" for the correction and why.
- **lang** / **status**: which language slot this file fills, and whether it is done. The full
  article contract (required vs. conditional fields, and what the contract checker enforces) is
  in `CONTRIBUTING.md`.
- **domain** / **band** / **platform** / **prerequisites** / **outcomes** / **counterpart**: only
  required once an article has been re-filed onto the domain x band x platform taxonomy
  (Phase 2+). Legacy articles that haven't been re-filed yet may omit them.

---

## 🎨 2. Web Visual Elements

- **Alert Callouts**: Use GFM Callout syntax:
  - `> [!NOTE]` - Conceptual nuances and OS background.
  - `> [!TIP]` - Performance gains, best practices, profiling shortcuts.
  - `> [!IMPORTANT]` - Critical constraints, memory limits, thread requirements.
  - `> [!WARNING]` - Security risks, memory leaks, breaking API changes.
- **Diagrams**: Use standard Mermaid fenced blocks (` ```mermaid `) with explicit node quotes to prevent rendering errors.
- **Tables**: Ensure markdown tables are formatted cleanly with alignment pipes for web typography readability.

---

## 🖼️ 3. Asset & File References

> **Superseded.** The `static/img/` convention below is replaced by the co-located
> `docs/<domain>/assets/<slug>/` convention in `.agents/rules/demonstration_assets.md`
> (Phase 0.13 / `plan/README.md` → "Demonstration assets"). Phases 2-5 move and split articles
> constantly, and a shared global image dump turns every move into a broken-link hunt. Read
> `demonstration_assets.md` before adding a figure, demo, or sample to any article.

- ~~Keep static images and diagrams in `static/img/` or `assets/`.~~
- Reference images using standard GFM syntax: `![Alt Text describing the finding](./assets/<slug>/<file>)`.
- Keep link paths clean and relative to the article's own file.
