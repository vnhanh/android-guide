/**
 * Structured framework/matrix reference data for Phase 1's /framework, /matrix,
 * level-landing and domain-stub views. Transcribed from `plan/framework.md` and
 * `plan/domains.md` (the authoring reference) and `plan/gap-analysis.md` (the
 * disposition table mapping existing articles to domains). This is framework
 * *metadata*, not new domain-content prose — writing new band-unit articles is
 * explicitly Phase 2+ and out of scope here.
 */
import { Level } from '../types';
import { docsRegistry } from './loadDocs';

export interface OwnershipRow {
  dimension: string;
  mid: string;
  senior: string;
  lead: string;
}

export const LEVEL_OWNERSHIP: OwnershipRow[] = [
  { dimension: 'Unit of ownership', mid: 'A feature or ticket', senior: 'A technical area', lead: "A team's technical direction" },
  { dimension: 'Time horizon', mid: 'Days to a sprint', senior: 'A release cycle', lead: 'Quarters to years' },
  { dimension: 'Input received', mid: 'A defined requirement', senior: 'An ambiguous problem', lead: 'An undefined situation' },
  { dimension: 'Decides', mid: 'How to implement within existing patterns', senior: 'Which approach, when to deviate', lead: 'What the patterns are, and which problems get solved' },
  { dimension: 'Mistakes caught by', mid: 'Code review', senior: 'Design review, production metrics', lead: 'Nobody — self-correction is the job' },
  { dimension: 'Blast radius', mid: 'One feature, one release', senior: 'One subsystem, quarters of rework', lead: 'Team velocity, hiring, roadmap' },
  { dimension: 'Relationship to code', mid: 'Writes most of the time', senior: 'Writes the hard parts, reviews the rest', lead: 'Writes least' },
];

export const LEVEL_GOALS: Record<Level, string> = {
  Mid: 'I can independently implement, debug, test and maintain production features.',
  Senior: 'I can own complex technical problems, make sound technical decisions, improve systems, and raise the effectiveness of other developers.',
  Lead: 'I can provide technical direction for a team or multiple teams and make decisions that optimise the product and engineering system as a whole.',
};

export type TrackId = 'A' | 'B' | 'C' | 'D';

export const TRACKS: Record<TrackId, { name: string; description: string }> = {
  A: { name: 'Core craft', description: 'Programming fundamentals through architecture — the mechanisms of building mobile software.' },
  B: { name: 'Production engineering', description: 'Testing, performance, security, release, observability — what keeps software alive in the field.' },
  C: { name: 'Systems & judgement', description: 'System design, decision making, technical debt — synthesising A and B into judgement.' },
  D: { name: 'Leadership, product & delivery', description: 'Communication, mentoring, product acumen, planning, influence — the non-code half of Lead.' },
};

export const LEARNING_WEIGHT: Record<TrackId, { Mid: number; Senior: number; Lead: number }> = {
  A: { Mid: 60, Senior: 30, Lead: 10 },
  B: { Mid: 25, Senior: 30, Lead: 20 },
  C: { Mid: 10, Senior: 25, Lead: 30 },
  D: { Mid: 5, Senior: 15, Lead: 40 },
};

export interface DomainDef {
  num: string; // '01' .. '20'
  slug: string; // stub route id, e.g. '04-concurrency-and-asynchrony'
  name: string;
  track: TrackId;
  platformTreatment: string;
  matrix: { mid: string; senior: string; lead: string };
  parity?: string;
  breaks?: string;
  /** 'principle-list': the domain organizes by principle (one article each, with its own
   * internal Mid/Senior/Lead sections) instead of the Mid/Senior/Lead x Android/iOS grid.
   * Defaults to the grid when absent — every domain except 01 is unaffected. */
  layout?: 'principle-list';
}

export const DOMAINS: DomainDef[] = [
  {
    num: '01', slug: '01-programming-fundamentals', name: 'Programming fundamentals', track: 'A',
    platformTreatment: 'principle-based, cross-language',
    layout: 'principle-list',
    matrix: {
      mid: 'Reads unfamiliar Kotlin, Java, Swift, Dart or TypeScript and predicts its behaviour — nullability, value vs reference, generics, immutability, closed types.',
      senior: 'Reasons about object lifetime and memory model across languages — ARC cycles, GC roots, captured `this`/`self` — and designs APIs another team cannot misuse.',
      lead: 'Turns individual judgement (idiom choices, API shape) into an enforced team standard with a named mechanism, and prices a toolchain/migration decision against its cost.',
    },
    parity: 'One article per principle (null safety, value vs reference semantics, generics, error handling, pattern matching, OOP/SOLID, memory management, collections, idioms) — see the cross-language cheat sheet for the full comparison table across Kotlin, Java, Swift, Dart and TypeScript.',
    breaks: 'Each principle article states its own cross-language "breaks" where the parity is not exact (e.g. Kotlin null safety evaporates at an unannotated Java boundary; Swift optionals are total) rather than one domain-wide table.',
    // Re-filed onto the new principle-first structure — see docs/01-programming-fundamentals/
    // and plan/domains.md for the full mapping from the old level x platform articles.
  },
  {
    num: '02', slug: '02-platform-and-os-internals', name: 'Platform & OS internals', track: 'A',
    platformTreatment: 'principle-based, cross-platform',
    layout: 'principle-list',
    matrix: {
      mid: 'Reads lifecycle, process death, background work and permission flows correctly on Android, iOS or Flutter, and picks the right mechanism for a stated constraint.',
      senior: 'Reasons about process priority and memory-pressure killers, IPC/extension boundary costs, and diagnoses a field kill or a watchdog crash from a trace, on any of the three platforms.',
      lead: 'Owns platform-support policy — minSdk/deployment target/minimum Flutter version — and turns each annual OS change into planned work before it is an emergency.',
    },
    parity: 'One article per principle (process lifecycle & death, background work & scheduling, permissions & entry points, startup sequencing & diagnostics, platform-support policy) — each carries its own Android/iOS/Flutter comparison table.',
    breaks: 'Each principle article states its own cross-platform "breaks" where the parity is not exact (e.g. Android\'s LMK reasons about whole-system memory while iOS\'s Jetsam enforces a hard per-app ceiling regardless of system pressure) rather than one domain-wide table.',
    // Re-filed onto the principle-first structure — see docs/02-platform-and-os-internals/ and
    // plan/domains.md for the full mapping from the old level x platform articles.
  },
  {
    num: '03', slug: '03-ui-and-interaction-engineering', name: 'UI & interaction engineering', track: 'A',
    platformTreatment: 'fully split',
    matrix: {
      mid: 'Screens with unidirectional state; loading/empty/error; accessibility labels and touch targets; supported size classes.',
      senior: 'Diagnoses recomposition and layout-pass problems from a trace. Component APIs and a state model that survives beyond one screen. Owns design-system integration.',
      lead: 'Defines UI architecture and design-system ownership across teams. Sets the accessibility standard. Arbitrates design ambition against cost as a peer.',
    },
    parity: 'recomposition ↔ body re-evaluation · `@Immutable` ↔ `Equatable` conformance · window size classes ↔ size classes · TalkBack ↔ VoiceOver.',
    breaks: 'Compose ships an explicit stability contract and live recomposition counts; SwiftUI has `_printChanges()` and inference. The measure-identify-prove loop is not available on iOS in the same form.',
    // jetpack-compose-and-adaptive-ui fully re-filed across ui-mid-android/ui-senior-android.
    // mobile-ux-prioritization's "Key Mobile UX Standards" section is absorbed into
    // ui-mid-android; its other two sections still belong to domains 05 and 18 (see those
    // DomainDef entries) so the legacy file itself is trimmed, not deleted.
  },
  {
    num: '04', slug: '04-concurrency-and-asynchrony', name: 'Concurrency & asynchrony', track: 'A',
    platformTreatment: 'fully split — PILOT domain for Phase 2',
    matrix: {
      mid: 'Coroutines/async-await correctly: right dispatcher, cancellation handled, lifecycle-aware collection, no UI work off the main thread.',
      senior: 'Structured concurrency on non-trivial flows — fan-out/fan-in, debounce, retry, backpressure. Diagnoses races, deadlocks, leaked scopes.',
      lead: "App-wide threading contracts: which scope owns what, what must be `Sendable`/`@MainActor`, where blocking is permitted. Drives migrations.",
    },
    parity: 'structured concurrency ↔ `Task`/`TaskGroup` hierarchy · `Dispatchers.Main` ↔ `@MainActor` · `SupervisorJob` ↔ `TaskGroup` + per-child `try?` · `StateFlow`/`SharedFlow` ↔ `AsyncStream`/`@Observable`.',
    breaks: 'Kotlin cancellation propagates through suspension points whether you cooperate or not; Swift cancellation is a flag that does nothing unless read.',
    // The former legacy article (coroutines-and-flow-concurrency) has been re-filed: its
    // content now lives split across the band-unit articles under domain 04 (see
    // filedArticlesForDomain('04-concurrency-and-asynchrony')), not as "existing legacy
    // material" any more.
  },
  {
    num: '05', slug: '05-data-persistence-and-offline', name: 'Data, persistence & offline', track: 'A',
    platformTreatment: 'split M+S, shared L',
    matrix: {
      mid: 'Local DB and secure key-value correctly. Writes and tests migrations. Understands cache lifetime and why invalidation is the hard half.',
      senior: 'Local data model and caching policy for a feature. Offline-first with optimistic updates, a durable retry queue, one explicit conflict rule.',
      lead: 'Owns data and sync architecture; states its consistency guarantees. Decides source of truth, device vs server. Sets retention rules with Legal.',
    },
    parity: 'Room ↔ SwiftData/GRDB · DataStore ↔ `UserDefaults` · `WorkManager` ↔ `BGTaskScheduler`.',
    breaks: '`WorkManager` guarantees eventual execution once constraints are met and survives reboot. `BGTaskScheduler` is best-effort and effectively untestable — an offline queue designed on Android assumptions silently never drains on iOS.',
    // mobile-ux-prioritization's optimistic-UI section is now re-filed into
    // data-senior-android; its remaining section still belongs to domain 18.
  },
  {
    num: '06', slug: '06-networking-and-api-integration', name: 'Networking & API integration', track: 'A',
    platformTreatment: 'shared + parity',
    matrix: {
      mid: 'REST/GraphQL correctly: serialisation, timeouts, error mapping, pagination, token refresh without a thundering herd.',
      senior: 'Designs the networking layer — retry/backoff, idempotency keys, coalescing, TLS pinning, telemetry. Negotiates API contracts rather than accepting them.',
      lead: 'Owns contract strategy: protocol choice, versioning, backward-compat policy assuming old versions live for years. Runs API review across teams.',
    },
    parity: 'OkHttp/Retrofit ↔ `URLSession` · interceptors ↔ delegates and `URLProtocol` · network security config ↔ ATS.',
    breaks: "Android's network security config is declarative and reviewable in a diff. iOS pinning is hand-rolled in a delegate, where a mistake is invisible until certificates rotate.",
  },
  {
    num: '07', slug: '07-architecture-and-modularisation', name: 'Architecture & modularisation', track: 'A',
    platformTreatment: 'shared + parity',
    matrix: {
      mid: 'Applies the existing architecture correctly. Knows why each boundary exists; keeps framework types out of domain code.',
      senior: "Designs and evolves architecture for a complex feature. Module boundaries and `:api`/`:impl`. Executes large refactors incrementally, behind flags.",
      lead: 'Defines direction and the guardrails that enforce it — dependency rules in CI, ADRs, a review gate. Sequences evolution. Decides when *not* to re-architect.',
    },
    parity: 'Gradle module graph ↔ SwiftPM targets/xcframeworks · Hilt/Dagger ↔ manual DI, Factory, swift-dependencies.',
    breaks: 'Gradle enforces `:api`/`:impl` at compile time; SwiftPM visibility control is weaker. Dagger validates the whole object graph at compile time; common iOS approaches validate at runtime, or not at all.',
    // multi-module-architecture-and-routing fully re-filed into architecture-senior.
    // senior-metrics-and-qa's "Case 3" (Hilt DI at scale) absorbed into architecture-senior;
    // its other cases were re-filed into domains 09/14/17 and that file is now deleted.
    // clean-architecture-code-review's title doesn't match its actual content (a known thin/
    // mismatched legacy article, see gap-analysis.md finding 09) — nothing there to re-file
    // for this domain; architecture-mid was written fresh instead.
  },
  {
    num: '08', slug: '08-testing-and-quality-engineering', name: 'Testing & quality engineering', track: 'B',
    platformTreatment: 'shared + parity',
    matrix: {
      mid: 'Unit tests for own code; one end-to-end test per critical flow. Fakes over mocks. Does not merge red or silently `@Ignore`.',
      senior: 'Designs testability into the code. Decides what to test at which layer and what not to test. Test infrastructure. Drives flake rate down as a tracked number.',
      lead: 'Testing strategy and quality gates: what blocks a merge, what blocks a release, what coverage of *risk* means. Owns suite runtime and maintenance as a budget.',
    },
    parity: 'JUnit/Turbine/Espresso ↔ XCTest/Swift Testing/XCUITest · Robolectric ↔ *no equivalent*.',
    breaks: 'Android runs a large share of platform-dependent tests on the JVM in seconds. iOS has no fast host-side simulation — equivalents run in a simulator, an order of magnitude slower.',
  },
  {
    num: '09', slug: '09-performance-and-efficiency', name: 'Performance & efficiency', track: 'B',
    platformTreatment: 'split M+S, shared L',
    matrix: {
      mid: 'Profilers to find common jank, memory and startup problems. Frame budget, overdraw, leak patterns. Fixes the obvious.',
      senior: 'Complex regressions to root cause with system traces; benchmarks the fix; it stays fixed. Owns startup, scroll, battery, size for an area against stated numbers.',
      lead: 'Performance budgets and SLOs, field monitoring, CI regression gating, architectural constraints that prevent systemic regressions. Decides when a problem is not worth fixing.',
    },
    parity: 'frame drops ↔ hitch ratio · Perfetto ↔ Instruments · Vitals ↔ MetricKit · baseline profiles ↔ dyld order files.',
    breaks: 'An Android cold-start number and an iOS launch-time number measure different intervals against different baselines and cannot be compared directly.',
    // microbenchmark-macrobenchmark-profiles fully re-filed into performance-senior-android.
    // apk-compilation-and-r8-proguard's R8-shrinking section absorbed into
    // performance-senior-android; its ProGuard keep-rules/obfuscation section (section 3)
    // was absorbed into security-senior (domain 10) — that source file is now fully
    // consumed and deleted.
    // senior-metrics-and-qa's Cases 1 and 2 absorbed into performance-mid-android and
    // performance-senior-android; Cases 4 and 5 went to domains 14 and 17 respectively,
    // and that source file is now fully consumed and deleted.
  },
  {
    num: '10', slug: '10-security-and-privacy', name: 'Security & privacy', track: 'B',
    platformTreatment: 'shared + parity',
    matrix: {
      mid: 'Never logs or hardcodes secrets. Keystore/Keychain, cert validation, correct permission requests, input validation. Recognises OWASP failures in own code.',
      senior: 'Threat-models a feature: auth flows, token lifetime, deep-link and exported-component abuse, tamper detection and its real value. Reviews others’ code for security defects.',
      lead: 'Owns security posture and privacy compliance — data-collection review, SDK vetting, pen-test remediation. Decides how much hardening is proportionate.',
    },
    parity: 'Keystore ↔ Keychain + Secure Enclave · network security config ↔ ATS · R8 renaming ↔ *no equivalent*.',
    breaks: 'There is no iOS counterpart to R8 identifier renaming — Android engineers overestimate what obfuscation buys, then find it absent on iOS.',
    // security-permissions-and-ipc fully re-filed: permission requests/data minimisation and
    // deep-link types into security-mid; confused-deputy and App Links into security-senior.
    // That source file is now fully consumed and deleted.
    // apk-compilation-and-r8-proguard's remaining section (3, ProGuard keep rules &
    // obfuscation) absorbed into security-senior's obfuscation material — the file's other
    // two sections were already re-filed into domains 11 and 09 in the prior pass, so it is
    // now fully consumed and deleted.
    // clean-architecture-code-review's JWT specification section absorbed into
    // security-senior; its risk-matrix/tech-debt content went to domains 15 and 17
    // (see those DomainDef entries), and that file is now fully consumed and deleted.
  },
  {
    num: '11', slug: '11-build-release-and-cicd', name: 'Build, release & CI/CD', track: 'B',
    platformTreatment: 'split M+S, shared L',
    matrix: {
      mid: 'Git as a working tool: small PRs, rebase, `bisect`. Build variants and signing. Reads a failing pipeline and fixes their own break.',
      senior: 'Optimises build time against a measured baseline. Authors pipeline stages. Owns release mechanics — versioning, phased rollout, flags, submission, rehearsed hotfix path.',
      lead: 'Delivery strategy: cadence, train, rollout and rollback policy, flag hygiene and expiry, developer experience as a funded line item. Build time and CI cost as budgets.',
    },
    parity: 'Play staged rollout ↔ App Store phased release · Gradle build cache ↔ derived data · App Bundle ↔ App Thinning.',
    breaks: 'Play lets you halt a rollout and roll users back. App Store phased release can be paused but **not rolled back** — a shared "we can always roll back" policy is false on iOS.',
    // gradle-optimization-and-profiling fully re-filed into release-senior-android.
    // apk-compilation-and-r8-proguard's "build pipeline" section absorbed into
    // release-mid-android; its other two sections were absorbed into domains 09 and 10 in
    // subsequent passes, and that source file is now fully consumed and deleted.
    // microbenchmark-macrobenchmark-profiles' full content still belongs to domain 09 —
    // its "CI-gating stub" is addressed conceptually in release-senior-android's staged-
    // rollout section rather than by extracting text from that file.
  },
  {
    num: '12', slug: '12-observability-and-reliability', name: 'Observability & reliability', track: 'B',
    platformTreatment: 'shared + parity',
    matrix: {
      mid: "Reading a crash report with symbols actually working. Meaningful events and breadcrumbs rather than `Log.d(\"here\")`. Reproducing and filing a bug someone else can act on.",
      senior: 'Instrumenting a feature so it can be diagnosed from the field. Crash-cluster triage to root cause. Owning crash-free sessions and ANR/hang rate for an area.',
      lead: 'Observability strategy and reliability targets. Severity definitions and on-call. Incident command and stakeholder comms. Blameless postmortems with action items that close.',
    },
    parity: 'Crashlytics/Vitals ↔ MetricKit/Xcode Organizer · ProGuard mapping ↔ dSYM · ANR ↔ watchdog termination.',
    breaks: 'Vitals gives a fleet-wide ANR rate near real time with a store-visibility penalty. iOS hang rate is sampled, arrives days late, carries no store consequence.',
  },
  {
    num: '13', slug: '13-mobile-system-design', name: 'Mobile system design', track: 'C',
    platformTreatment: 'shared + per-problem notes',
    matrix: {
      mid: 'The building blocks: layers, cache, sync, transport, auth. Designing one feature end to end. Naming failure modes before writing code.',
      senior: 'The method: requirements → NFRs → high level → data model → protocol → failure modes → trade-offs. Four worked problems. Presenting and defending a design.',
      lead: 'Framing NFRs before design starts. Product-scale client architecture. Designing across team boundaries, for a system that outlives its implementation.',
    },
    breaks: 'Each worked problem carries its own "on iOS this differs because…" section rather than a single parity table — divergences here are problem-specific.',
  },
  {
    num: '14', slug: '14-technical-decision-making', name: 'Technical decision making & trade-offs', track: 'C',
    platformTreatment: 'agnostic',
    matrix: {
      mid: 'Comparing two or three options and saying why, in writing. Escalating rather than guessing quietly.',
      senior: 'Writing an ADR still useful a year later. Naming constraints, alternatives, reversibility, cost. Deciding with incomplete data. Native vs cross-platform, worked properly.',
      lead: 'How decisions get made: who decides what, when an ADR is required. One-way doors vs reversible decisions. Engineering economics: cost of delay, build vs buy.',
    },
    // senior-metrics-and-qa's "Case 4" (native vs. cross-platform) absorbed into
    // decisions-senior, expanded into a full worked decision rather than a table; its
    // remaining Case 5 went to domain 17's Senior unit, and that source file is now
    // fully consumed and deleted.
  },
  {
    num: '15', slug: '15-technical-debt-and-modernisation', name: 'Technical debt & modernisation', track: 'C',
    platformTreatment: 'agnostic',
    matrix: {
      mid: 'Leaving code better than found. Naming debt in a ticket rather than copying the pattern once more.',
      senior: 'The strangler pattern in practice. Monolith to multi-module as a sequenced migration behind flags with a tested rollback path.',
      lead: 'Debt as a portfolio: inventory with quantified impact, funding an allocation per cycle, refusing a rewrite that cannot be sequenced.',
    },
    // monolith-to-multimodule-migration fully re-filed into tech-debt-senior as the strangler
    // migration playbook, expanded with strangler-pattern framing, flag-based rollback, and
    // automated-refactoring material the source file didn't cover — that source file is now
    // fully consumed and deleted.
    // clean-architecture-code-review's risk-assessment matrix absorbed into tech-debt-lead as
    // its merge-time debt-classification tool; the same material was also re-filed into
    // domain 17's Senior unit for the review-culture treatment (how to deliver a block-merge
    // verdict), and that source file is now fully consumed and deleted.
  },
  {
    num: '21', slug: '21-ai-and-llm-engineering', name: 'AI & LLM engineering', track: 'C',
    platformTreatment: 'shared + per-problem notes',
    matrix: {
      mid: 'Working AI into the ticket workflow at the right stages, with verification proportional to how cheaply an answer can be checked. Core concepts — tokens, context window, hallucination. Reading the field without chasing every release.',
      senior: 'The shape of a production LLM feature: backend proxy over client-held keys, key-pool management and load balancing, RAG and vector retrieval, caching for cost and latency, and defending an agent loop against prompt injection.',
      lead: "The org's AI usage and data-handling policy. AI backend architecture as a shared platform investment, not N bespoke integrations. Fine-tune-vs-prompt and BYOK-vs-proxy as engineering economics per product line. Vetting an AI vendor's data-use terms before a feature ships.",
    },
    breaks: 'No client-platform parity table — this domain is server- and architecture-facing; where a mobile SDK choice actually matters (e.g. consuming SSE on Android vs iOS) it is noted inline in the relevant problem note rather than tracked as a platform split.',
  },
  {
    num: '16', slug: '16-communication-and-technical-writing', name: 'Communication & technical writing', track: 'D',
    platformTreatment: 'agnostic — root of the leadership spine',
    matrix: {
      mid: 'PR descriptions, commit messages and bug reports that stand alone. Asking a precise question. Reporting status and blockers before being asked.',
      senior: 'The design doc or RFC that actually gets acted on. Explaining a trade-off to a non-engineer without distorting it. Documenting systems well enough to hand over.',
      lead: 'The technical narrative that aligns a team. Running a design review so it converges. Delivering bad news early, accurately, with options attached.',
    },
  },
  {
    num: '17', slug: '17-code-review-and-mentoring', name: 'Code review & mentoring', track: 'D',
    platformTreatment: 'agnostic',
    matrix: {
      mid: 'Specific, kind, actionable review comments. Receiving review without defending. Onboarding a newer teammate to their first merged PR.',
      senior: 'Reviewing for design and risk rather than formatting. Deliberate mentoring: goals, feedback, sponsorship. Raising the baseline by leaving good examples.',
      lead: 'Growing seniors and future leads. Review standards and culture. Calibrating against a written ladder. Delegating the interesting work instead of keeping it.',
    },
    // senior-metrics-and-qa's "Case 5" (architectural violations under deadline pressure)
    // and clean-architecture-code-review's risk-assessment matrix are both re-filed into
    // code-review-senior, as the review-culture/delivery angle on the same matrix domain 15
    // uses as its classification tool — both source files are now fully consumed and deleted.
  },
  {
    num: '18', slug: '18-product-and-business-acumen', name: 'Product & business acumen', track: 'D',
    platformTreatment: 'agnostic',
    matrix: {
      mid: 'Understanding who a ticket is for and what done means. Flagging requirement gaps before building, not during QA.',
      senior: 'Shaping requirements rather than consuming them. Proposing the cheaper alternative that gets most of the value. Knowing which metric a feature moves.',
      lead: 'Connecting technical strategy to business outcomes. Arguing for platform investment in business language. Trading scope, quality and time as a peer.',
    },
    // mobile-ux-prioritization's remaining section ("Strategic UX Framework for Mobile Tech
    // Leads" — perceived performance, offline-first resilience, thumb-zone ergonomics) is now
    // fully re-filed into product-acumen-senior's "UX prioritisation for engineers" section,
    // not into a Lead unit here. gap-analysis.md and the source file's own banner both said
    // Lead; domains.md's section-by-section spec (the authoritative list once a domain has
    // one) lists this content under the Senior row as *re-filed*, and per the same precedent
    // set resolving domain 14's identical conflict, domains.md wins. The three points are
    // integrated as inputs to a Senior engineer's requirements-shaping and Product-negotiation
    // practice (proposing the cheaper alternative, backed by data) rather than pasted as a
    // standalone framework — that source file is now fully consumed and deleted.
  },
  {
    num: '19', slug: '19-planning-estimation-and-risk', name: 'Planning, estimation & risk', track: 'D',
    platformTreatment: 'agnostic',
    matrix: {
      mid: 'Breaking a feature into tasks. Estimating own work honestly. Raising slippage the day it becomes likely.',
      senior: 'Decomposing into a sequenced, parallelisable plan with named risks and de-risking spikes up front. Estimating in ranges with written assumptions.',
      lead: 'Turning fuzzy problems into technical initiatives with milestones and dependencies. Maintaining a real risk register. Planning capacity across a quarter.',
    },
  },
  {
    num: '20', slug: '20-technical-leadership-and-influence', name: 'Technical leadership & influence', track: 'D',
    platformTreatment: 'agnostic',
    matrix: {
      mid: 'Owning commitments and saying so when one cannot be met. Contributing an opinion instead of waiting to be assigned.',
      senior: 'Driving consensus in their area. Influencing without authority, using evidence rather than seniority. Keeping technical disagreement technical.',
      lead: 'Setting and communicating technical vision. Making the call when consensus fails. Managing up and across. Knowing where organisational constraints really sit.',
    },
  },
];

/** Articles the gap-analysis moves off the ladder entirely (kept, but not linked into any domain stub as coverage). */
export const OFF_LADDER_ARTICLE_IDS = ['ai-model-routing'];

export function getDomain(slug: string): DomainDef | undefined {
  return DOMAINS.find(d => d.slug === slug);
}

/** Band-unit articles actually filed against this domain. */
export function filedArticlesForDomain(slug: string) {
  return docsRegistry.filter(d => d.domain === slug);
}

/** True once at least one band-unit article has been filed against this domain — used for honest coverage indicators. */
export function isDomainFiled(slug: string): boolean {
  return docsRegistry.some(d => d.domain === slug);
}
