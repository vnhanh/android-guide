# Restructure v2 — Domain → Level → Leaf, with seamless flow

Supersedes the navigation and file-layout decisions in `README.md` / `phases.md`.
The 21-domain taxonomy, the level definitions and the competency matrix in
`framework.md` all survive unchanged — this plan changes *how content is cut and
navigated*, not what the domains are.

Deliberately not detailed. Each phase gets its own detail pass when it starts.

---

## 1. The target shape

```
DOMAIN
  Middle
    <leaf>  <leaf>  <leaf> …
  Senior
    <leaf>  <leaf>  <leaf> …
  Lead
    (leaves only where Lead content is genuinely leaf-specific)
  Interview Questions
```

Each domain declares its own **leaf axis**. There are exactly three shapes:

| Axis | Leaves | Example domains |
| :--- | :--- | :--- |
| `language` | Java · Kotlin · Swift · Dart · TypeScript | 01 Programming fundamentals |
| `platform` | Android · iOS · Flutter | 02 Platform & OS internals |
| `none` | — flowing sections, Middle→Senior→Lead in one read | 21 AI & LLM, leadership domains |

The axis lives in the domain's own metadata, so adding a domain never touches
the viewer. A `none` domain renders Sections instead of Level rows; its level
progression is carried by inline tags (§3).

**Lead splits only where it earns it.** Most Lead content is standards, migration
cost and team direction — not language-specific. A domain declares
`leadLeaves: true` only when Lead genuinely differs per leaf; otherwise Lead is a
single flowing node.

---

## 2. Leaves are tabs, not dead ends

A leaf is a **persistent tab on the topic page**, not a separate silo. Pick Kotlin
once and every topic page in every language-axis domain opens on Kotlin.

- Sidebar rows for leaves exist (they match the target shape above) but selecting
  one sets the global leaf tab and opens the topic — it does not fork the reader
  into a parallel site.
- The current header **"Switch platform (Android / iOS / Shared)" button is removed**,
  along with `PlatformContext`. It is replaced by the leaf tab, which lives on the
  content where the reader can see what it affects.

---

## 3. Level is a tag on content, not a wall

This is the core UX rule. Knowledge is written A→Z; level is metadata on it.

- A topic page is **one continuous document**. Sections carry a level tag rendered
  as a visible badge: `Middle` / `Senior` / `Lead`.
- A topic appears under **every** level node whose tag it contains. The link deep-links
  to that level's first section — it never opens a truncated page.
- A global level control (`All` by default, plus Middle / Senior / Lead) **collapses**
  higher-level sections behind a "show Senior depth" affordance. It never hides them
  and never breaks the reading order.
- Nothing gets fragmented to satisfy the tree. If a concept runs Middle→Lead, it is
  written once, in full, and tagged along the way.

**Prev/next flow** at the page footer walks a reader continuously:
Middle → Senior → Lead → Interview within a domain, then into the next domain.
Domain landing pages show a progress indicator.

---

## 4. Concept IDs and "also in" links

Sections declare a concept id. Any section in another leaf declaring the same id is
auto-linked as *Also in: Swift · Dart*. No hand-maintained cross-references.

```markdown
## Nullable types {level=middle concept=null-safety/declaration}
```

- Generated concept index at build time; `scripts/check-concepts.mjs` fails CI on an
  orphan concept (declared in exactly one leaf where the axis has siblings) or a
  concept id that no longer resolves.
- Works identically on the platform axis (Android WorkManager ↔ iOS BGTaskScheduler).

---

## 5. Interview questions

One `Interview Questions` node per domain, tabbed by level.

- **≥ 8 leaf-agnostic questions per level** — the floor, non-negotiable.
- Plus leaf-specific extras that swap with the active leaf tab, only where the answer
  actually differs by language or platform.
- Answers collapsed by default, so the page works as a self-quiz.
- Each question links back to the section that teaches it — a wrong answer has a
  one-click route to the fix.

Floor across the site: 21 domains × 3 levels × 8 ≈ **500 questions**, before leaf extras.

---

## 6. File layout

```
docs/01-programming-fundamentals/
  domain.yml                    # axis, leaves, leadLeaves, order, title en/vi
  _overview.en.md  _overview.vi.md
  null-safety/
    topic.yml                   # order, levels touched, prerequisites
    kotlin.en.md   kotlin.vi.md
    java.en.md     java.vi.md
    swift.en.md    …
  interview.en.md  interview.vi.md
```

**Bilingual is part of the definition of done.** Sibling `.en.md` / `.vi.md` files with
per-language `status`, as `phases.md` Phase 0 already specifies. A domain is not
complete until both slots are filled; `pending` renders an honest banner, never silent
English fallback.

**Duplication escape hatch.** 13 topics × 5 leaves × 2 languages is 130 files for domain 01
alone. Where a leaf's treatment is genuinely identical to another's, it declares
`sameAs: kotlin` and renders the sibling's content plus a short delta note, instead of a
copied article. Expect this to cut the real file count substantially on the language axis.

---

## 7. Phases

**Phase A — Structure and viewer, no new content.**
Schema (`domain.yml`, `topic.yml`, heading attributes), loader, sidebar tree, leaf tabs,
level badges + collapse control, concept index and auto-links, prev/next flow, interview
renderer, domain landing pages. Remove the platform button and `PlatformContext`. Stub
every one of the 21 domains so navigation is browsable end to end. Prune legacy:
delete empty `01-android/` and `02-architecture-and-principles/`, fold
`00-tech-lead-roadmap/roadmap.md` into the site landing page. Extend CI checks.

**Phase B — Domains 01 and 02 together.**
Both leaf shapes at once, since the viewer must carry both anyway. Split the 13
cross-language principle articles and the 5 cross-platform internals articles into leaf
files, EN + VI, with concepts wired and interviews written. This is the pass that proves
the format; expect the schema to move under it.

**Phase C — Domain 21, AI & LLM.**
The `none` shape. Smallest domain, validates flowing sections and the level-tag-only
progression.

**Phase D onward — the remaining 18 domains, one at a time, each complete before the next.**
Order follows `framework.md`'s authoring queue, not the reading graph.

---

## 8. Per-domain definition of done

1. `domain.yml` declares axis, leaves and Lead treatment.
2. Every topic exists for every leaf — real content or an explicit `sameAs` delta.
3. Every section carries a level tag; the domain's content spans Middle → Lead with no gap.
4. Concepts declared and resolving; `check-concepts` green.
5. ≥ 8 questions per level, answers written, each linked to its teaching section.
6. EN and VI both `complete`.
7. Prev/next chain walks the whole domain and hands off to the next one.
8. `check-links` and `check-contract` green.
