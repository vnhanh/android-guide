# Restructuring Plan — Mid → Senior → Tech Lead

This directory is the executable plan for turning the *Senior & Tech Lead Mobile Developer
Guide* from a technology-organised document set into a career roadmap.

| File | What it is | When you need it |
| :--- | :--- | :--- |
| `README.md` | Run order, gates, definition of done, status board | Every session — start here |
| `framework.md` | Levels, 20 domains, the 60-cell competency matrix | Authoring reference — check the band before writing |
| `gap-analysis.md` | Disposition of all 14 existing articles | Phase 2, when re-filing existing material |
| `domains.md` | The 20 domain plans — band units, sections, outcomes, parity | Picking up any band unit |
| `phases.md` | Ordered task list per phase | Working through a phase |

Hosted copies of the full analysis (with diagrams):

- Roadmap & analysis — <https://claude.ai/code/artifact/55b17491-2c84-4ec5-953b-7781ec3c9db5>
- Twenty domain plans — <https://claude.ai/code/artifact/95a8516d-74ae-4e76-9b43-758871f4cc04>

---

## Authoring order is not reading order

This trips people up, so it is stated first.

**Reading order** is the prerequisite graph. A reader goes `01 → 02 → 04 → 05 → 13`, and the
site enforces it through the `prerequisites` field in each article's frontmatter.

**Authoring order** optimises for something else entirely: de-risking the format early, and
writing while the source material is still in your head. It deliberately does *not* start at
domain 01.

Both orders are correct. They just answer different questions. Never reorder the authoring
queue to match the reading graph — that would mean writing the pilot last.

---

## The three hard gates

Everything else is a preference. These are not.

```
Phase 0  ──────────────► must complete before ANY content is written
   │                     (dual source of truth + broken i18n compound with every article)
   ▼
Phase 1  ──────────────► must complete before Phases 2-5
   │                     (band definitions decide what each article is FOR;
   │                      writing first and classifying later reproduces finding 02)
   ▼
Phase 2 ──► Phase 3 ──► Phase 4 ──► Phase 5 ──► Phase 6
                │           ▲
                └───────────┘
                must complete before Phase 4
                (system design depends on observability + release engineering —
                 you cannot design a system you have never had to operate)
```

Phases 4 and 5 have no gate between them and may run in either order or interleave.

---

## Working agreement — git, CI and demonstration assets

None of this is content. All of it is foundation, all of it gets more expensive per article,
so it belongs in Phase 0 alongside everything else that compounds.

### Git

The repository today is one commit on `chore/init` with **no `.gitignore`** — `node_modules/`
and `dist/` are untracked and one `git add -A` away from being in history. Fix that first.

| Rule | Why |
| :--- | :--- |
| Branch per band unit — `docs/<domain>-<band>-<platform>`, e.g. `docs/04-concurrency-mid-ios`. Site code `feat/`, tooling `chore/`, fixes `fix/`. | The branch name is the matrix cell. |
| One band unit per PR. The definition of done below *is* the PR checklist. | A PR closing two units cannot be reviewed against a single cell. |
| Conventional Commits with the domain as scope — `docs(04): …`, `feat(site): …`, `chore(ci): …`. | Makes `git log --grep` a progress report against the status board. |
| Squash merge. | One commit per band unit on `main`; `bisect` over the site build stays meaningful. |
| `main` is always deployable. Nothing merges red. | It is what GitHub Pages serves. |

**The triplet has a git shape too.** Phase 2's unit of work is Android → iOS → parity table in
one pass. That is three chained PRs merged in that order — not one forty-file PR nobody
reviews, and not three PRs a month apart, which is the exact failure the triplet exists to
prevent.

### CI

`.github/workflows/deploy.yml` currently publishes on push to **both** `main` and
`chore/init`, into one `pages` concurrency group — two branches racing for the same
production URL. Nothing runs on a pull request at all.

    pr.yml       build · typecheck · contract check · link check   required on every PR
    deploy.yml   main only

The contract check is the piece worth building: frontmatter matches the schema, `counterpart`
is symmetric from both sides, every `prerequisites` entry resolves to an article that exists,
every article names the matrix cell it advances, and both language slots are declared. The
definition of done is only real if something enforces it — across 78 units, review will not.

### Demonstration assets

The fourteen existing articles contain **zero images**, five Mermaid diagrams between them, no
runnable sample, and no rule stating whether any of that is expected. Meanwhile the outcomes in
`domains.md` are written as things you *show*: "show the before-and-after scan", "halve a flake
rate you have measured", "find the commit with `bisect`". An outcome stated as evidence and
delivered as prose is not assessable.

Three kinds, deliberately distinct:

| Kind | What it is | Lives in |
| :--- | :--- | :--- |
| **Figure** | Mermaid for anything structural. A raster capture only where the tool output *is* the evidence — Perfetto, a Gradle build scan, Instruments, Play Console, MetricKit. | `docs/<domain>/assets/<slug>/` |
| **Demo** | An interactive page in this site, for what a static image cannot carry — a recomposition counter, the matrix filter, a rollback decision tree. | `src/demos/<slug>.tsx`, routed |
| **Sample** | A runnable project. Gradle and Xcode builds have no business in a Vite repo's CI, so these live in companion repos — `…-samples-android`, `…-samples-ios`. | separate repo, linked **by tag** |

The rules that keep them from rotting:

- **Real captures only.** A screenshot of a profiler you did not run is a lie with a timestamp
  on it. If it was not measured, write the sentence instead.
- **Provenance in every raster caption** — tool and version, device or emulator, date. Undated
  tool screenshots go stale invisibly; that is how a guide ends up teaching a UI that shipped
  four years ago.
- **Alt text states the finding, not the filename.** "Perfetto trace, 380 ms main-thread block
  during cold start", not "perfetto.png".
- **Redact before committing.** Crash dashboards, Play Console and MetricKit captures are the
  most useful figures in Track B and the likeliest to carry an employer's package name, user
  counts or revenue. Capture a sample app, or crop and blur — and say which you did.
- **Samples pin to a tag, never a branch.** An article linking `main` is wrong the moment the
  sample improves. The tag goes in frontmatter beside the link.
- **Co-locate with the article; no global `static/img/`.** Phases 2-5 move and split articles
  constantly — `gap-analysis.md` is a disposition table of precisely that — and a shared image
  dump turns every move into a broken-link hunt. This supersedes the `static/img/` line in
  `.agents/rules/web_publishing_format.md`.
- **Budget.** SVG or WebP; 300 KB per figure, 1 MB per article. Over budget usually means the
  screenshot wanted to be a Mermaid diagram.

Assets are **not** required on every article. They are required wherever the stated outcome is
something the reader is meant to see — which, across Track B, is most of it. Not to be confused
with Phase 6.3's *evidence layer*, which is about promotion packets, not page assets.

---

## Run order

Work top to bottom. Each line is one sitting's worth or less, except where marked.

### Phase 0 — Foundation `no new prose`

    0.1  Add the article contract (frontmatter schema) to CONTRIBUTING.md
    0.2  Write the build-time markdown loader: docs/**/*.md -> generated registry
    0.3  src/types.ts — Level becomes Mid|Senior|Lead; add track, domain, band,
         platform, counterpart, prerequisites[], outcomes[], resources[],
         figures[], demo, samples[]
    0.4  Extract inline content from docsRegistry.ts into docs/**/<slug>.en.md
         (~600 of 686 lines go away)
    0.5  DocViewer.tsx:209 — fall back on empty-after-trim, not on falsy;
         add the "not translated yet" banner
    0.6  LinearDashboard.tsx — level badges follow the Mid/Senior/Lead ramp
    0.7  Rewrite ARCHITECTURE.md to the domain x band x platform taxonomy
    0.8  Update .agents/rules/* to match
    0.9  Add .gitignore — node_modules/ and dist/ are untracked today
    0.10 Write the git working agreement into CONTRIBUTING.md; AGENTS.md already
         advertises "PR rules" that CONTRIBUTING.md does not contain
    0.11 Split CI: new pr.yml (build, typecheck, contract check, link check)
         required on every PR; deploy.yml triggers on main only — drop chore/init
    0.12 Write the contract checker pr.yml calls
    0.13 New .agents/rules/demonstration_assets.md — figures, demos, samples;
         supersede the static/img/ line in web_publishing_format.md
    0.14 Create the companion sample repos, or record the decision not to yet

    GATE: site builds; 14 articles render; registry contains zero inline prose;
          switching to Vietnamese shows the banner, not a blank page; a PR with
          deliberately broken frontmatter fails the contract check; a push to a
          branch other than main deploys nothing.

### Phase 1 — Framework `~8 pages, no domain content`

    1.1  /framework  — the level definitions page
    1.2  /matrix     — all 60 cells, filterable by track
    1.3  /mid /senior /lead — three level landing pages + self-assessment
    1.4  20 domain index stubs — band definitions, platform treatment,
         empty parity slot, links to whatever already exists
    1.5  Navigation: level -> domain -> article, plus a persistent platform switch
    1.6  Coverage indicators — honest per platform and per language
    1.7  Move the author profile to /about; drop the three old categories from nav

    GATE: all 78 band units have a URL, even when empty, and each states its
          own coverage honestly. The site is now usable while mostly empty.

### Phase 2 — Track A, core craft `re-file 12 · write ~31`

Unit of work is the **domain triplet**: Android article → iOS counterpart → parity table,
written in one pass. Splitting the triplet across months produces parity tables assembled
from memory, which defeats the point.

    2.1  Domain 04 — Concurrency          [PILOT — do this first]
         └─ carry one figure, one demo and one linked sample through it, so the
            asset pipeline is de-risked on the same article as the prose format
         └─ then STOP and review the format before continuing
    2.2  Domain 01 — Programming fundamentals
    2.3  Domain 02 — Platform & OS internals
    2.4  Domain 03 — UI & interaction
    2.5  Domain 07 — Architecture          (shared, no iOS split)
    2.6  Domain 05 — Data & offline
    2.7  Domain 06 — Networking            (shared, no iOS split)

    GATE: Mid band complete on both platforms — the entry point that does not
          exist today. 7 parity tables written.

Domain 04 goes first despite 01 preceding it in the reading graph. It has the richest
existing material, its parity table is already drafted, and it exercises every part of the
format at once. If the contract survives 04, it survives the rest; if it does not, better to
learn that where the source material is strongest.

### Phase 3 — Track B, production engineering `write ~21`

    3.1  Domain 12 — Observability & reliability   [gates Phase 4]
    3.2  Domain 08 — Testing & quality
    3.3  Domain 11 — Build, release & CI/CD        (split at Mid + Senior)
    3.4  Domain 09 — Performance & efficiency      (split at Mid + Senior)
    3.5  Domain 10 — Security & privacy

    GATE: every Senior band in Track B exists. The five prerequisites for
          system design are now satisfied.

### Phase 4 — Track C, systems & judgement `write ~9`

    4.1  Domain 14 — Decision making    [ADRs first: you need the artifact
                                         to write 13 and 15 properly]
    4.2  Domain 13 — System design      [4 worked problems — the largest single unit]
    4.3  Domain 15 — Technical debt

### Phase 5 — Track D, leadership `write ~14`

    5.1  Domain 16 — Communication & technical writing
         [root of the leadership spine; every other D domain depends on it]
    5.2  Domain 17 — Code review & mentoring
    5.3  Domain 18 — Product & business acumen
    5.4  Domain 19 — Planning, estimation & risk
    5.5  Domain 20 — Technical leadership & influence

    GATE: 78/78 band units.

### Phase 6 — Resources, assessment, translation `cross-cutting`

    6.1  Resource layer — 3-5 vetted sources per band unit, dated, with a review interval
    6.2  Self-assessment mapping answers to the matrix
    6.3  Evidence layer — what demonstrating each cell looks like in a review,
         an interview, or a promotion packet (absorbs the existing STAR cases)
    6.4  Translation pass — close every `pending` language slot

---

## Definition of done — one band unit

A band unit is finished when all of these are true. Not before.

- [ ] Frontmatter complete: `domain`, `band`, `platform`, `prerequisites`, `outcomes`, `lang`
- [ ] `counterpart` set, and the opposite article sets it back (platform-specific units only)
- [ ] Every section listed for it in `domains.md` is present
- [ ] The assessable outcome is stated, and is something a reviewer could actually check
- [ ] It advances at least one named cell of the matrix in `framework.md`
- [ ] Pitfalls and trade-offs sections are real, not placeholders
- [ ] 3-5 resources, each dated
- [ ] One language slot is `complete`; the other is honestly marked `pending`
- [ ] Where the outcome is something the reader must see, a figure, demo or sample
      delivers it — real capture, provenance in the caption, alt text that states the
      finding, and any linked sample pinned to a tag rather than a branch
- [ ] Landed as its own squash-merged PR whose description names the matrix cell
- [ ] `pr.yml` green, contract check included

**The rule that keeps this from drifting back into a technology checklist:** an article that
cannot name the matrix cell it advances does not get written. None of the current 14 articles
were ever asked to pass this test.

---

## Status board

Tick as band units land. 78 total.

| Phase | Scope | Units | Done | State |
| :--- | :--- | ---: | ---: | :--- |
| 0 | Foundation | — | — | not started |
| 1 | Framework | 8 pages | 0 | blocked by 0 |
| 2 | Track A · core craft | 33 | 0 | blocked by 1 |
| 3 | Track B · production | 19 | 0 | blocked by 1 |
| 4 | Track C · systems | 9 | 0 | blocked by 3 |
| 5 | Track D · leadership | 15 | 0 | blocked by 1 |
| 6 | Resources & translation | — | — | blocked by 5 |

Existing material covers roughly 19 of the 78 slots, all Android, all effectively
single-language. iOS coverage today is zero.
