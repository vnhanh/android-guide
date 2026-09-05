# Phase Detail

The ordered task list lives in `README.md`. This file records, per phase, *what changes and
why* — the justification you will want when a phase gets questioned or deferred.

---

## Phase 0 — Fix the foundation before adding to it

**Affected** `src/types.ts` · `src/data/docsRegistry.ts` · `src/components/DocViewer.tsx` · `src/components/LinearDashboard.tsx` · `ARCHITECTURE.md` · `CONTRIBUTING.md` · `.agents/rules/*` · `.github/workflows/*` · build config

**Add** A build-time loader reading `docs/**/*.md` frontmatter and generating the registry, so
Markdown becomes the only source of truth. Extend `DocItem` with `track`, `domain`, `band`,
`platform`, `counterpart`, `prerequisites[]`, `outcomes[]`, `resources[]`, `figures[]`, `demo`,
`samples[]`.

**Change** `Level` becomes `'Mid' | 'Senior' | 'Lead'`; `platform` is `'android' | 'ios' | 'shared'`.
Level badges follow the ramp. `ARCHITECTURE.md` is rewritten to describe the domain × band ×
platform taxonomy that will actually exist, replacing the six-category taxonomy it currently
promises and the repo does not have.

**Fix i18n** The toggle stays, so it has to work. Content moves to sibling files —
`<slug>.vi.md` and `<slug>.en.md` — with a per-language `status: complete | pending`.
`DocViewer.tsx:209` falls back on *empty after trim*, not on falsy, and renders an honest
banner when it does. Today's English prose migrates into the `en` slot, and `vi` is marked
`pending` rather than pretending to be filled.

**Remove** All inline `content` / `contentEn` template literals — roughly 600 of the
registry's 686 lines.

**Fix delivery** No `.gitignore` exists, so `node_modules/` and `dist/` sit untracked in the
working tree, one `git add -A` from entering history. `deploy.yml` publishes from both `main`
and `chore/init` into a single `pages` concurrency group — two branches racing for one
production URL — and no workflow runs on a pull request at all. Add the ignore file, move
deployment to `main` only, and add `pr.yml` running build, typecheck, link check and a new
contract checker. The working agreement — branch per band unit, one unit per PR, Conventional
Commits scoped by domain, squash merge — goes into `CONTRIBUTING.md`, which `AGENTS.md`
already advertises as containing "PR rules" it does not contain.

**Add demonstration assets as a contract** A new `.agents/rules/demonstration_assets.md`
defining the three kinds — figure, demo, sample — where each lives, and what makes one
acceptable: real captures only, provenance in the caption, alt text carrying the finding,
redaction before commit, samples pinned to a tag. Assets co-locate at
`docs/<domain>/assets/<slug>/`, superseding the `static/img/` line in
`web_publishing_format.md`. Companion sample repos get created now or explicitly deferred,
because a Gradle or Xcode build inside this Vite repo's CI is not a decision to discover
mid-Phase-3.

**Why** Findings 04 and 05 compound. Every article written before this lands is authored
twice and mistranslated once; with two platforms and two languages the multiplier is four,
not two. Cheap now, prohibitive at 78 articles. The delivery and asset rules compound the same
way and for the same reason: 78 band units means 78 PRs and several hundred figures, and a
convention retrofitted at unit 40 gets applied to the first 39 by hand, or not at all. The
definition of done is a checklist nobody can enforce by eye at that volume — the contract
checker is what makes it binding.

**Result** Same 14 articles, one source of truth, a working language toggle that tells the
truth about coverage, schema room for everything phases 1-6 need, a `main` that is the only
thing that deploys, and a written answer to "what does a figure, a demo or a sample have to
look like" before the first one is produced.

---

## Phase 1 — Ship the framework before the content

**Add** The career-framework page. The full progression matrix as a first-class, filterable
page. Three level landing pages, each stating the goal, the domains that matter most at that
level, and an honest self-assessment checklist. Twenty domain index pages — initially stubs
listing the three band definitions, the platform treatment, an empty parity table where one
is due, and whatever articles already exist.

**Add** Coverage indicators that do not flatter: each cell shows what exists per platform and
per language. An article that is Android-only, or English-only, says so on its own card
rather than looking finished.

**Change** Primary navigation becomes level → domain → article, with a secondary domain-first
view and a platform switch that persists the way the language toggle does. The dashboard
leads with "where are you now?" rather than a category grid.

**Remove** The three technology categories from navigation. The author profile moves to an
About page.

**Why** The matrix is the product. Once it exists, every gap is visible as an empty cell,
contribution becomes self-directing, and the site is useful even while most articles are
unwritten.

**Result** A working roadmap with honest coverage: 78 band units addressable, roughly 19
filled.

---

## Phase 2 — Track A, core craft, both platforms

**Unit of work** Not "all Android, then all iOS". The unit is the **domain triplet**: Android
article → iOS counterpart → parity table, written in one pass while the concept is loaded.
Writing the two platforms months apart produces parity tables assembled from memory, which is
exactly the failure the platform decision was meant to avoid.

**Move & split** Execute the disposition table in `gap-analysis.md`.

**Pilot carries the assets too** Domain 04 is where the prose format gets proven, so it is also
where the asset pipeline gets proven: one Mermaid figure, one raster capture with provenance,
one interactive demo, one sample repo linked by tag. Discovering at Domain 09 that a Perfetto
capture cannot be redacted, or that the sample repo has no CI, costs a phase. Discovering it in
the pilot costs an afternoon.

**Write · Android** Domains 05 and 06 from scratch. Mid bands for 01, 02, 03, 04, 07, which
currently have none. Lead bands for 02 and 07.

**Write · iOS** Domains 01-05 at Mid and Senior — Swift fundamentals and ARC, app lifecycle
and Jetsam, SwiftUI state and invalidation, Swift concurrency and `Sendable`, SwiftData/GRDB
and offline. Roughly 22 articles, none of which exist in any form today.

**Parity** Tables for 01-07. Domain 04 is already drafted and should be written first.

**Risk — read this before scheduling the phase.** This is the phase most likely to slip. The
repo's own profile describes seven years of Android against Swift 6 as an area currently
being learned, and the iOS half is 22 articles at a depth the Android side sets a high bar
for. Two honest options: sequence iOS one domain behind Android and accept a longer phase, or
bring in an iOS reviewer for the Senior bands. Shipping thinner iOS articles under the same
banner would undo the credibility the Android depth has earned.

**Result** Track A complete across three bands and two platforms. A Mid-level reader on
either platform has an unbroken path for the first time.

---

## Phase 3 — Track B, production engineering

**Write · shared** Testing (3 bands, from nothing). Observability and incident response
(3 bands, from nothing). Security Lead band. These carry a parity table rather than a split,
because the *method* is identical across platforms and only the tooling differs.

**Write · split** Performance and Build/release split at Mid and Senior: Perfetto,
Macrobenchmark, R8 and Play Console on one side; Instruments, MetricKit, `os_signpost`,
Xcode Cloud and App Store Connect on the other. Both Lead bands are shared — a performance
budget does not care which profiler produced the number.

**Parity** The most useful tables in the guide sit here: ANR ↔ watchdog termination,
Vitals ↔ MetricKit, Crashlytics deobfuscation ↔ dSYM symbolication, staged rollout ↔ phased
release. Each pair looks equivalent and behaves differently under pressure.

**Why** The largest genuine gap, and the one gating the most later work: five of the six
cross-track edges depend on a Senior band that lives in this track.

**Asset load** This is the figure-heavy phase — traces, build scans, Vitals and MetricKit
dashboards, symbolication output. It is also where redaction matters most, since these captures
come from real apps with real package names and user counts. Capture from a sample app wherever
the point survives it.

**Result** Tracks A and B complete. The Senior band becomes coherent, and the prerequisites
for system design are in place.

---

## Phase 4 — Track C, systems & judgement

**Write** Mobile system design as a worked method plus four worked problems — offline-first
sync, media pipeline, real-time updates, auth and session — each with requirements, design,
and stated trade-offs. ADR practice and engineering economics. Debt as a portfolio.

**Order note** Domain 14 goes before 13 and 15: you need the ADR artifact to write the other
two properly.

**Why** Only buildable once Track B exists. A design article written before the observability
article has nothing to point at when it claims a design is operable.

**Result** The Senior→Lead bridge exists as content rather than as an assertion.

---

## Phase 5 — Track D, leadership, product & delivery

**Write** Technical writing and design docs. Code review standards and deliberate mentoring,
built out from the existing risk matrix. Product and business acumen, built out from the UX
prioritisation fragment. Planning, estimation and risk. Influence, conflict resolution and
deciding under uncertainty.

**Format shift** This track resists the Deep Dive / Code / Pitfalls template. Use scenarios,
scripts and worked artifacts instead — a real ADR, a real risk register, a real postmortem,
a real ladder-calibration conversation. Templates people can copy beat prose people agree with.

**Order note** Domain 16 first — it is the root of the leadership spine and every other
Track D domain depends on it.

**Why** Last because it is hardest to write and least likely to be right first time. By this
point the site has an audience whose feedback can shape it.

**Result** All twenty domains covered. Seventy-eight band units filled.

---

## Phase 6 — Resources, assessment & evidence

**Add** A curated resource layer — 3-5 vetted sources per band unit, each with an added-on
date and a review interval, since almost none exist today. A self-assessment mapping answers
to the matrix and returning the reader's two weakest bands. An evidence layer: for each cell,
what a promotion packet or interview answer demonstrating it actually looks like, absorbing
the existing STAR case studies.

**Add** The translation pass. Both language slots are real by contract, but writing
bilingually from day one halves throughput on content still changing shape. Author each
article in one language through phases 2-5, mark the other `pending`, and close the gap here
once the structure has stopped moving. Track C and D read better authored in Vietnamese
first — the nuance is in the prose, not the terminology.

**Why** Resources and assessment are only meaningful once there is a structure to hang them
on. Done earlier they get re-filed twice.

**Result** The roadmap becomes usable for self-assessment and for interview and promotion
preparation — the original guide's strength, now attached to a ladder.
