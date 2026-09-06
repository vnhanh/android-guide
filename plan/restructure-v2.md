# Restructure v2 — Domain → Level → Leaf, with seamless flow

Supersedes the navigation and file-layout decisions in `README.md` / `phases.md`.
The 21-domain taxonomy, the level definitions and the competency matrix in
`framework.md` all survive unchanged — this plan changes *how content is cut and
navigated*, not what the domains are.

Deliberately not detailed. Each phase gets its own detail pass when it starts.

---

## 0. Progress

**Phase A — done.** Schema (`DomainAxis`/`topic`/`leaf`/`kind` fields, `src/data/domainAxes.ts`),
loader (`levelSections`, `conceptIndex`), sidebar tree, leaf tab bar, level badges + collapse
control, `InterviewView`, `navFlow.ts` prev/next, `LeafContext` replacing the old platform button.
Legacy pruned (`01-android/`, `02-architecture-and-principles/` deleted). `scripts/check-concepts.mjs`
wired into CI. Shipped with one deliberate implementation simplification over §6 below — see there.

**Phase B — domains 01 and 02 — done.** Both leaf shapes proven: 01 (`language`, 5 leaves) and 02
(`platform`, 3 leaves), all 13 + 5 principle articles actually split into real per-leaf content,
concepts wired, 48 interview questions written.

**Domains 03, 04, 05 — done.** These turned out to be a second, much lighter shape: content
already existed as separate per-platform files (the pre-restructure "band × platform grid"
convention), just not wired into the `topic`/`leaf`/`domainAxes` system yet. Completing them was:
add `topic`/`leaf` frontmatter to existing files (no content rewrite), register the domain's axis,
add concept tags across genuinely matching headings, write `interview.md`. Confirms §1's three-shape
table holds without new viewer work.

**Domain 06 — done.** A third, lightest shape: content is genuinely platform-agnostic (`platform:
shared` throughout, `axis: 'none'`) — nothing to wire at all. Only `interview.md` was written.

**§7's phase plan is superseded by §9** — the domain-by-domain queue below classifies every
remaining domain by which of these three shapes it already is, rather than guessing per phase.

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

## 6. File layout — as shipped

The `domain.yml` / `topic.yml` / nested-folder layout originally sketched here was not built.
What shipped instead, deliberately simpler:

```
docs/01-programming-fundamentals/
  null-safety-kotlin.md   # frontmatter: topic: null-safety, leaf: Kotlin
  null-safety-java.md     # frontmatter: topic: null-safety, leaf: Java
  null-safety-swift.md    # …
  null-safety-dart.md
  null-safety-typescript.md
  interview.md            # frontmatter: kind: interview
```

Flat files, same directory every other article in the domain already lives in. `topic` groups
leaf siblings for the sidebar and the "Also in" concept links; `leaf` names which one; `kind:
interview` marks the one per-domain Interview Questions article. The domain's axis itself is
declared once, centrally, in `src/data/domainAxes.ts` — not per-file and not in a `domain.yml`
the loader would need to walk the filesystem to find.

**Bilingual was dropped from the shipped definition of done.** Every article, old and new, is
`lang: en` only; the `vi` slot renders its existing honest "not translated yet" banner. This is a
deliberate, acknowledged deviation from the original plan (and from `phases.md` Phase 0) — revisit
it as its own pass later rather than doubling every domain's authoring cost now. `sameAs` (the
duplication escape hatch for identical leaf treatments) was never needed in practice: every leaf
that got split (01, 02) had genuinely leaf-specific content worth writing.

---

## 7. Phases (historical — see §9 for what's actually left)

**Phase A — Structure and viewer, no new content.** Done, see §0.

**Phase B — Domains 01 and 02 together.** Done, see §0.

**Phase C — Domain 21, AI & LLM.** Folded into §9's queue below — domain 21 turned out to
already be the "already-shared" shape (like 06), so it doesn't need its own phase.

---

## 8. Per-domain definition of done — as shipped

1. Domain's axis (and leaves, and `leadLeaves`) declared once in `src/data/domainAxes.ts`.
2. If the axis is `language`/`platform`: every topic exists for every leaf as a real,
   leaf-specific article (`topic`/`leaf` frontmatter) — no `sameAs` shortcut has been needed yet.
3. Every leaf-split article's headings carry level tags (`## Mid`/`## Senior`/`## Lead`) and, where
   a genuine cross-leaf equivalence exists, a `{concept=...}` tag connecting it to its siblings.
4. `interview.md` exists with `kind: interview`, ≥ 8 questions per level, verified by
   counting the parsed Q/A pairs *before* running the check suite (a real miscount happened once —
   see domain 04's history — and the fix is checking early, not trusting the write).
5. `check-links`, `check-contract`, `check-concepts`, `tsc`, and `npm run build` all green.
6. Spot-checked live in the browser: leaf tab navigation (if any), "Also in" links (if any),
   sidebar dedup to one row per topic (if any), Interview page question counts, zero new console
   errors.
7. Bilingual (VI) is explicitly **not** part of this definition of done — see §6.

---

## 9. Remaining domains — classified, not phased

Every domain past 06 was surveyed directly (file list + `platform:` frontmatter values) rather
than guessed. Two shapes cover all of them — no domain needs the heavy Phase B-style content
split; that need was specific to 01/02's old "one article covering all languages/platforms"
convention, which no other domain used.

**Shape 1 — already platform-split, needs wiring only** (the 03/04/05 pattern: add `topic`/`leaf`
frontmatter to existing files, register the axis, tag matching concepts, write `interview.md` —
no content rewrite):

| Domain | Existing platform files |
| :--- | :--- |
| 09 Performance & efficiency | `mid-android`, `mid-ios`, `senior-android`, `senior-ios`, `lead-shared` |
| 11 Build, release & CI/CD | `mid-android`, `mid-ios`, `senior-android`, `senior-ios`, `lead-shared` |

**Shape 2 — already shared, needs only `interview.md`** (the 06 pattern: `axis: 'none'` default
already correct, nothing to wire):

| Domain | Note |
| :--- | :--- |
| 07 Architecture & modularisation | — |
| 08 Testing & quality engineering | — |
| 10 Security & privacy | — |
| 12 Observability & reliability | — |
| 13 Mobile system design | has a companion piece, `senior-shared-ai-model-routing.md` — leave as-is, not a leaf |
| 14 Technical decision making | has a companion piece, `senior-shared-native-vs-cross-platform.md` — leave as-is, not a leaf |
| 15 Technical debt & modernisation | — |
| 16 Communication & technical writing | — |
| 17 Code review & mentoring | — |
| 18 Product & business acumen | — |
| 19 Planning, estimation & risk | — |
| 20 Technical leadership & influence | — |
| 21 AI & LLM engineering | several `senior-shared-*` companion pieces (RAG, LLM backend, cost/latency, agents) — leave as-is; this is where §1's `none` shape (flowing sections) gets its real-content proof |

**Order**: no dependency between them — pick any order. Doing the two Shape-1 domains (09, 11)
before the Shape-2 batch keeps the leaf-wiring muscle memory fresh; doing them last works equally
well. Each domain is independent and fully committable on its own.
