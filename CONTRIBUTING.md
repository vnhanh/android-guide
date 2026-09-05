# Contributing

This document specifies the article contract, the definition of done, and the git/PR working
agreement for the **Senior & Tech Lead Mobile Developer Guide**. It applies equally to human
authors and AI agents. The full rationale lives in `plan/README.md`; this file is the checklist
you actually work against.

---

## The article contract (frontmatter schema)

Every file under `docs/**/*.md` must start with YAML frontmatter. Two tiers apply.

### Base fields — required on every article, always

```yaml
---
id: topic-unique-id          # kebab-case, unique across the whole corpus
title: "Article title"
description: "1-2 sentence summary, used for SEO/meta and card subtitles."
tags: [android, concurrency, senior]
lang: en                     # en | vi — which language slot this file fills
status: complete             # complete | pending
---
```

A legacy article that has not yet been re-filed onto the domain taxonomy (see below) is valid
with just these fields plus `level` and `sidebar_position`, its old ordering key.

### Taxonomy fields — required once an article is filed against a domain

```yaml
domain: 04-concurrency-and-asynchrony   # see plan/framework.md for the 20 domain slugs
band: M                                  # M | S | L  (Mid | Senior | Lead)
platform: android                        # android | ios | shared
level: Mid                               # Mid | Senior | Lead — mirrors band, human-readable
prerequisites: [oop-and-solid-principles]  # article ids the reader should already know
outcomes:
  - "Write a screen whose in-flight work stops when the screen goes away, and demonstrate it stopping"
counterpart: concurrency-mid-ios         # platform-specific units only — must point back
resources:
  - title: "Kotlin coroutines guide"
    url: "https://kotlinlang.org/docs/coroutines-guide.html"
    date: "2025-01-01"
demo: concurrency-recomposition-counter  # optional — a routed interactive demo slug
samples:
  - repo: "https://github.com/org/guide-samples-android"
    tag: "v1.0.0"
---
```

`Staff` is not a valid `level`/`band` value. It is retired from the ladder — see
`plan/framework.md` → "Levels" for why, and mark genuinely out-of-scope topics `beyond` in prose
rather than inventing a band for them.

`figures` (see `.agents/rules/demonstration_assets.md`) follows the same shape:
`figures: [{ path, alt, caption }]`, each `path` relative to `docs/<domain>/assets/<slug>/`.

The full field list lives in `src/types.ts`'s `DocItem` — the frontmatter schema and that type
must always agree; if you add a field to one, add it to the other in the same change.

---

## Content standards

- **Language headers on every snippet**: `kotlin`, `swift`, `typescript`, etc. No unlabeled code
  fences.
- **No dummy placeholders.** Fully typed, valid code — see `.agents/rules/mobile_stacks.md` for
  per-stack idiom requirements (Kotlin 2.x, Swift 6 strict concurrency, etc).
- **GFM callouts** (`> [!NOTE]`, `> [!TIP]`, `> [!IMPORTANT]`, `> [!WARNING]`) and Mermaid
  diagrams (` ```mermaid `) per `.agents/rules/web_publishing_format.md`.
- **Track D format shift**: communication/mentoring/product/planning/leadership articles resist
  the Deep Dive / Code / Pitfalls template — write scenarios and copyable artifacts instead (a
  real ADR, a real risk register). See `plan/phases.md` → Phase 5.

---

## Definition of done — one band unit

Not done until every box is true:

- [ ] Frontmatter complete: `domain`, `band`, `platform`, `prerequisites`, `outcomes`, `lang`
- [ ] `counterpart` set, and the opposite article sets it back (platform-specific units only)
- [ ] Every section listed for it in `plan/domains.md` is present
- [ ] The assessable outcome is stated, and is something a reviewer could actually check
- [ ] It advances at least one named cell of the matrix in `plan/framework.md`
- [ ] Pitfalls and trade-offs sections are real, not placeholders
- [ ] 3-5 resources, each dated
- [ ] One language slot is `complete`; the other is honestly marked `pending`
- [ ] Where the outcome is something the reader must see, a figure, demo or sample delivers it —
      real capture, provenance in the caption, alt text that states the finding, and any linked
      sample pinned to a tag rather than a branch
- [ ] Landed as its own squash-merged PR whose description names the matrix cell
- [ ] `pr.yml` green, contract check included

An article that cannot name the matrix cell it advances does not get written.

---

## Git & PR working agreement

| Rule | Why |
| :--- | :--- |
| Branch per band unit — `docs/<domain>-<band>-<platform>`, e.g. `docs/04-concurrency-mid-ios`. Site/tooling code uses `feat/`, `chore/`, `fix/`. | The branch name is the matrix cell. |
| One band unit per PR. The definition of done above *is* the PR checklist. | A PR closing two units cannot be reviewed against a single cell. |
| Conventional Commits with the domain as scope — `docs(04): …`, `feat(site): …`, `chore(ci): …`. | Makes `git log --grep` a progress report against `plan/README.md`'s status board. |
| Squash merge. | One commit per band unit on `main`; `bisect` over the site build stays meaningful. |
| `main` is always deployable. Nothing merges red. | It is what GitHub Pages serves — `.github/workflows/deploy.yml` publishes from `main` only. |

**The triplet has a git shape too.** Phase 2's unit of work is Android → iOS → parity table in
one pass: three chained PRs merged in that order, not one forty-file PR nobody reviews and not
three PRs a month apart.

### CI

- `pr.yml` — required on every PR: install, `npm run build`, `npm run lint`, a link check, and
  `npm run check-contract` (`scripts/check-contract.mjs`).
- `deploy.yml` — publishes on push to `main` only.

The contract checker validates: base frontmatter fields present on every article; and, for any
article that has been filed against the domain taxonomy, that every `prerequisites` entry
resolves to an existing article id, that `counterpart` is symmetric, and that both language
slots are accounted for. See `scripts/check-contract.mjs`.

---

## Companion sample repositories — deferred

`plan/README.md` task 0.14 calls for deciding whether to create `…-samples-android` and
`…-samples-ios` now, or explicitly defer that decision. **Decision: deferred.** No companion
sample repos are created as part of Phase 0/1. Rationale: a Gradle or Xcode build has no
business in this Vite repo's CI, and the first article that actually needs a linked sample is
Domain 04's Phase 2 pilot — creating empty companion repos now would sit unused for at least one
phase and risk drifting out of sync with whatever CI/tag convention Phase 2 settles on. Revisit
this at the start of Phase 2 (see `plan/phases.md` → Phase 2, "pilot carries the assets too").
