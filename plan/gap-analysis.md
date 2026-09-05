# Gap Analysis — disposition of existing content

Needed during Phase 2 and 3, when existing material is re-filed. Every one of the 14 current
articles is accounted for.

## Findings that drove the restructure

| # | Finding | Evidence | Severity |
| ---: | :--- | :--- | :--- |
| 01 | No Mid level exists | `Level = 'Senior' \| 'Lead' \| 'Staff'` — `src/types.ts:1` | critical |
| 02 | Level labels have no rubric | multi-module = Staff, Gradle = Lead, R8 = Senior, permissions = Lead | high |
| 03 | Organised by technology, not progression | categories: Android Stack, Architecture & Principles, AI & UX Leadership | high |
| 04 | Two sources of truth per article | same prose in `docs/**/*.md` and inline in `src/data/docsRegistry.ts` (686 lines) | high |
| 05 | English articles render nearly empty | `contentEn` is whitespace for 13/14 docs; `DocViewer.tsx:209` falls back only when falsy, and whitespace is truthy | critical |
| 06 | Documented taxonomy does not exist | `ARCHITECTURE.md` specifies 6 categories incl. iOS/RN/Flutter/System Design; repo has 3, and 12/14 docs are Android | high |
| 07 | Eleven domains have zero coverage | no article on testing, networking, persistence, offline sync, CI/CD, release, observability, incidents, planning, mentoring, product | critical |
| 08 | No prerequisite structure | ordering is a flat `sidebar_position` integer | high |
| 09 | Articles thin relative to ambition | 32-89 lines, ~50 median; one 46-line article covers three domains | medium |
| 10 | Essentially no external resources | 2 URLs in the entire corpus, both incidental | medium |
| 11 | A personal CV is the first article | `senior-metrics-and-qa` opens with author credentials | medium |
| 12 | Off-scope content in a top-level category | `ai-model-routing` is server-side LLM dispatch | medium |
| 13 | Vietnamese content is in English | both `content` and `contentEn` hold English prose; `lang` defaults to `vi` | low |

**Root cause:** the guide is organised around what the author knows, not around what a reader
is trying to become. Reorganising folders does not fix it — the unit of organisation has to
change from *topic* to *competency at a level of ownership*.

## Article disposition

| Existing article | Now | Action | Goes to |
| :--- | :--- | :--- | :--- |
| `senior-metrics-and-qa` | Senior | **split ×6** | Case 1 → 09 `S` · Case 2 → 09 `S` · Case 3 → 07 `S` · Case 4 → 14 `L` · Case 5 → 17 `L` · profile → `/about` |
| `android-components-and-os-internals` | Senior | **split ×2** | component choice → 02 `M` · LMK priority, Doze, buckets → 02 `S` |
| `jetpack-compose-and-adaptive-ui` | Senior | **split ×2** | state & `rememberUpdatedState` → 03 `M` · adaptive architecture, size classes → 03 `S` |
| `coroutines-and-flow-concurrency` | Senior | **split ×2** | `StateFlow`/`SharedFlow` → 04 `M` · `SupervisorJob`, continuations → 04 `S` |
| `security-permissions-and-ipc` | Lead | **re-level ↓** | permissions, deep-link types → 10 `M` · confused deputy, App Links → 10 `S` |
| `multi-module-architecture-and-routing` | Staff | **re-level ↓** | 07 `S`, plus a new Lead band for dependency-rule enforcement |
| `gradle-optimization-and-profiling` | Lead | **re-level ↓ + move** | 11 `S` |
| `monolith-to-multimodule-migration` | Staff | **move** | 15 `S`, plus a Lead band on sequencing and funding |
| `microbenchmark-macrobenchmark-profiles` | Lead | **re-level ↓** | 09 `S`, plus a CI-gating stub in 11 |
| `apk-compilation-and-r8-proguard` | Senior | **split ×3** | build pipeline → 11 `M` · shrinking & size → 09 `S` · keep rules & obfuscation → 10 `S` |
| `oop-and-solid-principles` | Senior | **re-level ↓** | 01 `M` |
| `clean-architecture-code-review` | Lead | **split ×3** | Clean Architecture → 07 `M` · risk matrix & debt → 17 `L` + 15 `L` · JWT spec → 10 `S` |
| `mobile-ux-prioritization` | Lead | **split ×3** | UI standards → 03 `M` · optimistic UI → 05 `S` · prioritisation framework → 18 `L` |
| `ai-model-routing` | Staff | **cut from ladder** | optional appendix, reframed as on-device / edge AI and AI-assisted development |

Only two articles survive with a re-level alone. Everything else splits or moves — because
most are organised by *tool*, and the roadmap is organised by *competency*.

## Categories to dissolve

- **`01-android`** → redistributes across domains 02, 03, 04, 07, 09, 10, 11, 15. Android
  remains the default platform of every example; it stops being a container.
- **`02-architecture-and-principles`** → splits into 01, 07, 10, 15, 17. "Principles" is not
  a location, it is a level band.
- **`03-ai-and-ux-leadership`** → UX content to 03 and 18; the AI article leaves the ladder.

## Missing topics by priority

| Priority | Missing area | Domain | Why it blocks progression |
| :--- | :--- | :--- | :--- |
| P0 | Testing & quality engineering | 08 | Zero coverage. Half the Mid-level definition is not credible without it. |
| P0 | Observability, crash analysis & incidents | 12 | Zero coverage, and a prerequisite for system design and every Lead reliability capability. |
| P0 | Data, persistence & offline-first sync | 05 | Zero coverage despite `ARCHITECTURE.md` promising a sync engine. The most-asked mobile design problem. |
| P0 | Networking & API contracts | 06 | Zero coverage. Backward compatibility for un-updatable clients is a Lead-only concern nobody writes down. |
| P0 | CI/CD & release engineering | 11 | Only build tuning exists. Phased rollout, flags, hotfix path and submission are absent. |
| P1 | Mobile system design | 13 | Promised in `ARCHITECTURE.md`, absent. The convergence point of Track A and the gate into Lead work. |
| P1 | Planning, estimation & risk | 19 | The most common reason a strong Senior fails as a Lead; least likely to be learned by reading code. |
| P1 | Product & business acumen | 18 | Without it, platform investment cannot be argued for and gets cut every time. |
| P1 | Technical writing, design docs & ADRs | 16 | ADRs are mandated by `.agents/rules/` and never explained. |
| P1 | Mentoring & the career ladder | 17 | Three bullets today. Growing others is the whole difference between a strong IC and a Lead. |
| P1 | iOS as a full second section | 01-05, 09, 11 | 39 iOS articles across seven platform-dependent domains, each paired to an Android counterpart. |
| P1 | Parity tables | 13 domains | The connective tissue between platform sections. Impossible to retrofit convincingly later. |
| P1 | Vietnamese content | all | The toggle stays, so both slots must be real. The corpus is untranslated, not bilingual. |
| P2 | Debugging methodology | 02, 12 | Named in the Mid goal statement. Bisection and hypothesis discipline are teachable and never taught. |
| P1 | Demonstration assets — figures, demos, runnable samples | all | Fourteen articles, zero images, five Mermaid diagrams, no sample. Outcomes written as "show the scan" are currently graded on prose. |
| P2 | Git & version-control workflow | 11 | Assumed everywhere, explained nowhere — and unenforced in this repo's own delivery until Phase 0.9-0.12. |
| P2 | Engineering economics | 14 | The vocabulary for arguing in front of people who do not care about Kotlin. |
| P2 | Accessibility as an engineering standard | 03 | Increasingly a legal requirement; cheapest as a standard, not a retrofit. |
| P2 | Third-party SDK governance | 10, 14 | How size, startup time, crashes and privacy violations enter an app. Nobody owns it by default. |
| P2 | Analytics, experimentation & feature flags | 11, 18 | Flag debt and A/B infrastructure are ongoing Lead responsibilities. |
| P3 | Curated resource layer | all | Two URLs exist today. Every band needs 3-5 vetted, dated sources. |
