# The 20 Domain Plans

The unit of delivery is the **band unit** — one domain, one level, one platform variant.
Each band unit ships as a *single article* containing the sections listed against it, not as
several files. That is deliberate: today's articles average ~50 lines and finding 09 called
them thin. A band unit at this shape is 2-4× longer, and it is the natural size, because a
level band is one coherent claim about what a reader can now do.

Every unit carries an **assessable outcome** — the thing a reader can do afterwards, written
so a reviewer, an interviewer or the reader can check it. If it cannot be checked, the unit
is not specified yet.

Legend: `M`/`S`/`L` = band · `[A]` Android `[i]` iOS `[~]` shared · **new** / *re-filed*

---

## Track A · Core craft

### 01 · Programming fundamentals — principle-based, cross-language, 11 units
Prereq: none, this is the root · Unlocks: 04, 07, 03 · Existing: fully re-filed onto a new shape (see below)

**This domain does not use the band-per-file shape the rest of this document describes.** Rather
than splitting Mid/Senior/Lead across separate Android/iOS articles, it ships one article per
*principle*, each covering Kotlin, Java, Swift, Dart and TypeScript/React Native side by side,
with its own internal `## Mid` / `## Senior` / `## Lead` sections (a Lead section only where a
genuine Lead-level angle exists for that principle) framed as interview prep throughout. This
generalizes the interview-prep voice the old `mid-android-java-vs-kotlin.md`/
`mid-ios-objc-vs-swift.md` articles already used (kept, lightly updated, as supplementary
"why this language" reads) to the whole domain. A companion page outside this domain's taxonomy,
`docs/00-tech-lead-roadmap/roadmap.md`, covers the system-level breadth (backend/frontend/mobile/
infra literacy, system design, technology evaluation, cross-team collaboration) a Tech Lead needs
beyond any single principle's depth — each `## Lead` section below points to it in prose.

| # | Article | Principle | Has `## Lead`? |
| :--- | :--- | :--- | :--- |
| 1 | `type-system-and-null-safety.md` | Null safety / optionals | yes |
| 2 | `value-vs-reference-semantics.md` | Struct/class, copy-on-write, mutability | no |
| 3 | `data-modeling-equality-and-immutability.md` | Value objects, generated equality, copy-with-change | no |
| 4 | `collections-and-functional-operations.md` | Eager vs lazy evaluation, map/filter/reduce | no |
| 5 | `error-handling-models.md` | Exceptions, typed Result, closed failure cases | yes |
| 6 | `generics-and-variance.md` | `in`/`out`, wildcards, protocols & generics | no |
| 7 | `pattern-matching-and-sealed-types.md` | Closed hierarchies, exhaustive matching | no |
| 8 | `oop-and-solid-in-practice.md` | OOP pillars, SOLID, API misuse-proofing | yes |
| 9 | `memory-management.md` | Traced GC vs ARC, what actually leaks | yes |
| 10 | `language-idioms-and-chaining.md` | Fluent chaining, extending types you don't own, idiom enforcement | yes |
| 11 | `cross-language-cheat-sheet.md` | Capstone: one comparison table per principle above, pure reference | n/a |

**Parity:** every principle article carries its own cross-language comparison table (the
`plan/domains.md`-wide convention below still applies, just per-article instead of per-domain);
`cross-language-cheat-sheet.md` is the single-page summary of all of them.
*Breaks:* stated per article rather than once for the whole domain — e.g. Kotlin null safety
evaporates at an unannotated Java boundary while Swift optionals are total; Java's `record` has no
generated copy-with-change the way Kotlin's `data class.copy()` does; three of five languages
(Kotlin, Dart, TypeScript) converged independently on the literal keywords `in`/`out` for variance
while Java uses use-site wildcards instead.

### 02 · Platform & OS internals — principle-based, cross-platform, 5 units
Prereq: 01 · Unlocks: 04, 09, 12 · Existing: fully re-filed onto the principle-first shape (see below)

Like domain 01, this domain does not use the band-per-file shape. It ships one article per
principle, each covering **Android, iOS and Flutter** side by side (platform, not programming
language, is the comparison axis here — this domain is about OS mechanisms), with internal
`## Mid`/`## Senior`/`## Lead` sections framed as interview prep.

| # | Article | Principle | Has `## Lead`? |
| :--- | :--- | :--- | :--- |
| 1 | `process-lifecycle-and-death.md` | Config change, process death/state restoration, suspension/termination, LMK/Jetsam priority, OEM divergence | no |
| 2 | `background-work-and-scheduling.md` | `WorkManager`/foreground-service/`BGTaskScheduler`/`workmanager`, Binder/XPC/`MethodChannel` boundary cost | no |
| 3 | `permissions-and-entry-points.md` | Runtime permissions and denial flows, the one-shot iOS permission problem, manifest/URL-scheme/Universal-Link entry-point surface | no |
| 4 | `startup-sequencing-and-diagnostics.md` | Cold/warm/hot start, `0x8badf00d` watchdog diagnosis, dyld/pre-`main`, Flutter engine-init/first-frame | no |
| 5 | `platform-support-policy.md` | Pricing minSdk/deployment-target/minimum-Flutter-version changes, the annual OS release as planned work, deprecation cadence | yes (Lead-only article) |

**Parity:** every principle article carries its own Android/iOS/Flutter comparison table instead
of one domain-wide table.
*Breaks:* stated per article — e.g. Android's LMK reasons about whole-system memory while iOS's
Jetsam enforces a hard per-app ceiling regardless of system pressure; `WorkManager` guarantees
eventual execution while `BGTaskScheduler` guarantees only an attempt might be made, and Flutter's
`workmanager` package inherits whichever guarantee the host platform actually has, which its
uniform API can hide from an engineer who has only tested on Android.

### 03 · UI & interaction engineering — fully split, 5 units
Prereq: 01 `M`, 02 `M` · Unlocks: 09, 07 · Existing: Compose state & adaptive UI (split), UX standards

| Unit | Sections | Outcome |
| :--- | :--- | :--- |
| `M` `[A]` *re-filed ×2* | Compose state, `remember`, `rememberUpdatedState`, UDF · loading/empty/error/content as four first-class states, never three · lists, keys, scroll performance · accessibility: labels, touch targets, TalkBack traversal · theming and consuming a design system | Ship a screen whose four states are all reachable in a test, and which is operable end to end with TalkBack |
| `M` `[i]` **new** | SwiftUI `@State`/`@Binding`/`@Observable` and where each belongs · the same four-state discipline · `List`, `LazyVStack`, stable identity · VoiceOver, Dynamic Type, the fixed-height-text failure · theming and tokens | Same, plus it survives Dynamic Type at the largest accessibility size without clipping |
| `S` `[A]` *re-filed* | Recomposition diagnosis and the stability contract — `@Immutable`, `@Stable`, the compiler report · adaptive UI: window size classes, list-detail, foldable postures · component APIs that survive a second consumer · motion and gesture quality · custom layout and drawing | Take a screen recomposing every frame, find the unstable parameter from the compiler report, prove the fix with recomposition counts |
| `S` `[i]` **new** | Invalidation diagnosis: identity, `Equatable`, `_printChanges()` · adaptive layout: size classes, split view, Stage Manager · `ViewModifier` and component API design · animation and gesture composition · the `Layout` protocol | Same outcome, with the honest caveat that SwiftUI gives far less instrumentation to prove it with |
| `L` `[~]` *re-filed* | UI architecture and design-system ownership across teams · the accessibility standard and the legal floor under it · arbitrating design ambition against cost with Design as a peer · when a custom component is cheaper than the platform one, and when that is a trap | Write the UI standard so a design review can be resolved by pointing at it rather than by seniority |

**Parity:** recomposition ↔ body re-evaluation · `@Immutable` ↔ `Equatable` conformance · window size classes ↔ size classes · TalkBack ↔ VoiceOver.
*Breaks:* Compose ships an explicit stability contract, a compiler report naming the unstable parameter, and live recomposition counts. SwiftUI has `_printChanges()` and inference. The measure-identify-prove loop is not available on iOS in the same form.

### 04 · Concurrency & asynchrony — fully split, 5 units — **PILOT**
Prereq: 01 `S`, 02 `M` · Unlocks: 05, 06, 09 · Existing: Coroutines & Flow, split across bands

| Unit | Sections | Outcome |
| :--- | :--- | :--- |
| `M` `[A]` *re-filed* | `suspend`, scopes, dispatchers — chosen deliberately · cancellation, and why cooperative means you can ignore it · `StateFlow` vs `SharedFlow` · lifecycle-aware collection and `repeatOnLifecycle` | Write a screen whose in-flight work stops when the screen goes away, and demonstrate it stopping |
| `M` `[i]` **new** | `async`/`await` and `Task` · cancellation as a flag you must check · `@MainActor` and UI confinement · `AsyncStream` and `@Observable` | Same, plus explain why a `Task` that never checks `isCancelled` keeps running after the view disappears |
| `S` `[A]` *re-filed ×2* | Structured concurrency: `Job` vs `SupervisorJob`, failure propagation · continuations and the suspend state machine · Flow operators: buffering, conflation, backpressure · diagnosing races, deadlocks, leaked scopes | Design the concurrency model for a screen with three concurrent sources and one cancellable write, and say what happens when each fails |
| `S` `[i]` **new** | Actors and actor reentrancy — the bug that surprises everyone once · `Sendable` and strict concurrency · `TaskGroup` and structured fan-out · diagnosing data races with Swift 6 diagnostics and TSan | Same design, and explain why an `await` inside an actor method does not hold the actor |
| `L` `[~]` **new** | App-wide threading contracts: which scope owns what · driving a strict-concurrency migration without stopping feature work · where blocking is permitted, and who says so | Write the threading contract and land a migration plan with a per-module sequence |

**Parity:** structured concurrency ↔ `Task`/`TaskGroup` hierarchy · `Dispatchers.Main` ↔ `@MainActor` · `SupervisorJob` ↔ `TaskGroup` + per-child `try?` · `StateFlow`/`SharedFlow` ↔ `AsyncStream`/`@Observable` · thread confinement by convention ↔ `Sendable` checking.
*Breaks:* Kotlin cancellation is a `CancellationException` propagating through suspension points whether you cooperate or not; Swift cancellation is a flag that does nothing unless read. `@MainActor` is compiler-enforced at the type level; Kotlin's equivalent is a runtime convention you can silently violate. Kotlin makes supervision a property of the *scope*; Swift makes it a property of how you consume each child's result.

### 05 · Data, persistence & offline — split M+S, shared L, 5 units
Prereq: 01 `M`, 04 `M` · Unlocks: 13 (the gate) · Existing: optimistic UI only

| Unit | Sections | Outcome |
| :--- | :--- | :--- |
| `M` `[A]` **new** | Room: entities, DAOs, migrations you have actually tested · DataStore and the secure key-value boundary · cache lifetime and invalidation · paging | Ship a schema migration with a test that would fail if the migration were wrong |
| `M` `[i]` **new** | Choosing between SwiftData, Core Data and GRDB, with reasons · migrations and the lightweight-migration cliff · Keychain vs `UserDefaults` · `URLCache` and HTTP-level caching | Same, plus justify the persistence choice against the two rejected options |
| `S` `[A]` *re-filed* | Repository pattern and single source of truth · optimistic UI and durable retry queues on `WorkManager` · conflict resolution: LWW, version vectors, CRDTs, and when each is honest · sync engine design · partial sync, deltas, pagination over a mutable set | Build an offline-first flow and state its conflict rule in one sentence. If you cannot, you have not chosen one. |
| `S` `[i]` **new** | The same four on `BGTaskScheduler` plus CloudKit or custom sync · why a durable queue is harder here — the OS may simply never run you | Same, plus a stated behaviour for the case where background execution never happens for days |
| `L` `[~]` **new** | Data and sync architecture ownership · stating consistency guarantees so Product can plan against them · source of truth per data class, device vs server · retention, minimisation and privacy with Legal | Write the consistency contract: what a user is promised about their data after a conflict, an offline period, and a reinstall |

**Parity:** Room ↔ SwiftData/GRDB · DataStore ↔ `UserDefaults` · `WorkManager` ↔ `BGTaskScheduler`.
*Breaks:* `WorkManager` guarantees eventual execution once constraints are met and survives reboot. `BGTaskScheduler` is best-effort, opaque, effectively untestable without forcing it. An offline queue designed on Android assumptions silently never drains on iOS — same diagram, two different reliability stories.

### 06 · Networking & API integration — shared + parity, 3 units
Prereq: 01 `M`, 04 `M` · Unlocks: 13, 10 · Existing: nothing

| Unit | Sections | Outcome |
| :--- | :--- | :--- |
| `M` `[~]` **new** | HTTP semantics that matter: idempotency, cache headers, status classes · serialisation and schema evolution — adding a field without shipping a crash · timeouts, error mapping, what the user sees on failure · pagination · auth and token refresh without a thundering herd | Handle a 401 mid-flight on three concurrent requests with exactly one refresh |
| `S` `[~]` **new** | Retry and backoff policy design, including what must never be retried · idempotency keys and request coalescing · TLS pinning, and the rotation plan without which pinning is an outage · per-request telemetry · negotiating an API contract instead of accepting one | Write the retry policy as a table — which errors, how many times, what backoff, which are terminal — and defend the terminal column |
| `L` `[~]` **new** | Protocol strategy: REST, gRPC or GraphQL, decided rather than inherited · versioning for clients that will never update · cross-team API governance · the un-updatable-client problem, which is the defining constraint of mobile | State the backward-compat policy: how long an app version is supported, what the server may never break, how that is enforced backend-side |

**Parity:** OkHttp/Retrofit ↔ `URLSession` · interceptors ↔ delegates and `URLProtocol` · network security config ↔ ATS.
*Breaks:* Android's network security config is declarative, auditable, reviewable in a diff. iOS pinning is hand-rolled in a delegate, where a mistake is invisible until certificates rotate.

### 07 · Architecture & modularisation — shared + parity, 3 units
Prereq: 01 `S`, 03 `M` · Unlocks: 13, 14, 15 · Existing: the deepest existing seam

| Unit | Sections | Outcome |
| :--- | :--- | :--- |
| `M` `[~]` *re-filed* | Clean Architecture boundaries and what each protects against · layering and DI · MVVM, MVI, UDF — what each buys and costs · keeping framework types out of domain code, and why that stops being pedantry at scale | Add a feature to an existing codebase without adding a single new architectural exception |
| `S` `[~]` *re-filed ×3* | The `:api`/`:impl` split and decoupled navigation · module graph design and its direct effect on build time · architecture trade-offs written as ADRs · incremental refactoring behind flags · DI at scale: scoping, graph coupling, KSP over KAPT | Propose a module boundary and predict its effect on incremental build time before implementing it — then check whether you were right |
| `L` `[~]` **new** | Architectural direction and the guardrails that keep it · enforcing dependency rules in CI, because socially-enforced rules decay in a quarter · sequencing evolution against the product roadmap · when *not* to re-architect | Ship one architectural rule as an automated check, and say what it would have caught in the last six months of history |

**Parity:** Gradle module graph ↔ SwiftPM targets/xcframeworks · Hilt/Dagger ↔ manual DI, Factory, swift-dependencies · `api` vs `implementation` ↔ `@_spi` and access control.
*Breaks:* Gradle enforces `:api`/`:impl` at compile time and the module graph is a queryable artifact. SwiftPM's visibility control is weaker and its nearest equivalent is an underscored attribute. Dagger validates the whole object graph at compile time; common iOS approaches validate at runtime, or not at all.

---

## Track B · Production engineering

### 08 · Testing & quality engineering — shared + parity, 3 units
Prereq: 01 `M`, 04 `M` · Unlocks: 07 `L`, 15 `S` · Existing: nothing (P0)

| Unit | Sections | Outcome |
| :--- | :--- | :--- |
| `M` `[~]` **new** | What to test, and the larger question of what not to · fakes over mocks, and why a mock-heavy suite locks in the implementation · testing async code without sleeping · one end-to-end test per critical flow · keeping the suite green, no silent `@Ignore` | Write a test that fails for the right reason — change the behaviour and watch it fail, before trusting it |
| `S` `[~]` **new** | Designing for testability, mostly a design skill in a testing hat · the layer decision: unit, integration or UI · test infrastructure: fixtures, builders, screenshot tests · flake — measuring, quarantining, fixing · testing offline and error paths, where the bugs live | Take a flake rate you have measured and halve it, without deleting the tests |
| `L` `[~]` **new** | Testing strategy and quality gates · coverage of risk rather than of lines · what blocks a merge vs a release · the suite as a budget: runtime and maintenance cost | Write the quality gate policy, including the answer to "the gate is red and the release is today" — decided in advance, not in the moment |

**Parity:** JUnit/Turbine/Espresso ↔ XCTest/Swift Testing/XCUITest · Robolectric ↔ *no equivalent*.
*Breaks:* Android runs a large share of platform-dependent tests on the JVM in seconds. iOS has no fast host-side simulation, so equivalents run in a simulator, an order of magnitude slower. This changes which testing pyramid is affordable — any shared strategy must account for it.

### 09 · Performance & efficiency — split M+S, shared L, 5 units
Prereq: 02 `S`, 03 `M` · Unlocks: 13, 11 `L` · Existing: the specimen worked in full

| Unit | Sections | Outcome |
| :--- | :--- | :--- |
| `M` `[A]` **new** | Frame budget and the rendering pipeline · profiler literacy: CPU, memory, energy · common leak patterns · reading a startup trace | Identify the cause of a janky screen with a profiler, in one sentence naming the frame-budget overrun |
| `M` `[i]` **new** | The render loop and hitch ratio · Instruments: Time Profiler, Allocations, Leaks · retain cycles and ARC leak patterns · reading a launch trace | Same, stated in hitch ratio rather than dropped frames — the two are not interchangeable |
| `S` `[A]` *re-filed ×3* | Perfetto traces and a repeatable root-cause method · startup: baseline profiles, deferred init, App Startup · micro vs macrobenchmark · app size and R8 shrinking · battery and background cost | Take an unexplained p95 cold-start regression to root cause from a trace, and prove the fix with a benchmark that would have caught it |
| `S` `[i]` **new** | `os_signpost` and custom instruments · launch: dyld, order files, deferred init · XCTest metrics and performance baselines · binary size and Swift metadata · energy log analysis | Same, noting Swift is already AOT-compiled so there is no baseline-profile lever — the equivalent is launch ordering |
| `L` `[~]` **new** | Setting budgets and SLOs · field monitoring strategy · CI regression gating · architectural constraints preventing systemic regressions · when a performance problem is not worth fixing | Write the performance budget: which metrics, which percentiles, measured where, enforced how, and what happens when a gate fails on a deadline |

**Parity:** frame drops ↔ hitch ratio · Perfetto ↔ Instruments · Vitals ↔ MetricKit · baseline profiles ↔ dyld order files · R8 shrinking ↔ Swift dead-code stripping.
*Breaks:* an Android cold-start number and an iOS launch-time number measure different intervals against different baselines and cannot be compared directly. Any cross-platform performance report must say which is which, or it is quietly wrong.

### 10 · Security & privacy — shared + parity, 3 units
Prereq: 01 `M`, 02 `S`, 06 `M` · Unlocks: 13, 14 `L` · Existing: permissions & IPC, JWT, R8 obfuscation

| Unit | Sections | Outcome |
| :--- | :--- | :--- |
| `M` `[~]` *re-filed* | Secrets: what never goes in a binary, and why the binary is public · Keystore and Keychain · permission requests and data minimisation · input validation · the OWASP mobile failures recognised in your own code | Audit your own feature against the OWASP mobile top ten and find at least one real issue |
| `S` `[~]` *re-filed ×3* | Threat-modelling a feature · auth flows and token lifetime, worked as a JWT specification · deep-link and exported-component abuse; the confused deputy · tamper/root/jailbreak detection and an honest account of its value · what obfuscation does and does not buy | Produce a threat model: assets, adversaries, entry points, and the mitigations you chose *not* to build, with reasons |
| `L` `[~]` **new** | Owning the security posture · third-party SDK vetting, the main way risk enters an app · privacy compliance: Play Data Safety, App Privacy, and the review behind them · pen-test remediation and triage · proportionality for this threat model | Run an SDK review that rejects something, and write down the criteria that made it a rejection rather than a judgement call |

**Parity:** Keystore ↔ Keychain + Secure Enclave · network security config ↔ ATS · R8 renaming ↔ *no equivalent*.
*Breaks:* there is no iOS counterpart to R8 identifier renaming. Android engineers overestimate what obfuscation buys on their own platform, then find it absent on the other — the right moment to notice neither was ever a security control.

### 11 · Build, release & CI/CD — split M+S, shared L, 5 units
Prereq: 01 `M` · Unlocks: 12, 09 `L`, 15 · Existing: Gradle optimisation, build pipeline

| Unit | Sections | Outcome |
| :--- | :--- | :--- |
| `M` `[A]` *re-filed* | Git as a working tool: small PRs, rebase, `bisect` · Gradle basics, variants, signing · reading a failing pipeline and fixing your own break · the build pipeline end to end, source to APK | Find the commit that introduced a regression with `bisect`, rather than reading the diff and guessing |
| `M` `[i]` **new** | The same Git material · Xcode project vs SwiftPM; schemes and configurations · code signing and provisioning — the thing that eats a week of a new iOS engineer's life · reading a failing pipeline | Resolve a signing failure from the error text, without deleting and regenerating everything |
| `S` `[A]` *re-filed* | Build-time optimisation against a measured baseline: caching, module graph, KSP · pipeline authoring · versioning and release trains · Play staged rollout, halting, hotfix path · feature flags | Cut incremental build time by a stated percentage and show the before-and-after scan |
| `S` `[i]` **new** | Build-time optimisation: module maps, whole-module optimisation, dependency hygiene · Xcode Cloud or Fastlane pipelines · TestFlight and phased release · hotfix and expedited review | Same, plus a rehearsed hotfix path with the expedited-review request already drafted |
| `L` `[~]` **new** | Delivery strategy: cadence, release train, rollback policy · flag hygiene and expiry — flags are debt with a timer · developer experience as a funded line item · CI cost owned by someone rather than nobody | Write the release policy including the rollback decision tree, and confirm it works on both stores — because it does not |

**Parity:** Play staged rollout ↔ App Store phased release · Gradle build cache ↔ derived data · App Bundle ↔ App Thinning.
*Breaks (load-bearing):* Play lets you halt a rollout and roll users back to the previous build. App Store phased release can be paused but **not rolled back** — the only forward path is a new build through review. A shared "we can always roll back" policy is false on iOS, and teams discover this during their first bad release.

### 12 · Observability & reliability — shared + parity, 3 units
Prereq: 02 `M`, 11 `M` · Unlocks: 13 (the least obvious edge) · Existing: metrics mentioned in passing, no article

| Unit | Sections | Outcome |
| :--- | :--- | :--- |
| `M` `[~]` **new** | Reading a crash report with symbols actually working · meaningful events and breadcrumbs rather than `Log.d("here")` · reproducing and filing a bug someone else can act on · reading the dashboards that already exist | Take a crash from the dashboard to a specific line, without a local reproduction |
| `S` `[~]` **new** | Instrumenting a feature so it can be diagnosed from the field · crash-cluster triage to root cause · owning crash-free sessions and ANR/hang rate for an area · alerting that does not cry wolf · structured logging, sampling, cost | Ship a feature you can debug from telemetry alone, and prove it by diagnosing a real field issue without a reproduction |
| `L` `[~]` **new** | Observability strategy and reliability targets · severity definitions and on-call for a mobile team, which is not backend on-call · incident command and stakeholder comms during the event · blameless postmortems, and action items that actually close | Run an incident end to end and produce a postmortem whose action items are still closed three months later |

**Parity:** Crashlytics/Vitals ↔ MetricKit/Xcode Organizer · ProGuard mapping ↔ dSYM · ANR ↔ watchdog termination.
*Breaks:* Vitals gives a fleet-wide ANR rate, near real time, with a store-visibility penalty for crossing the threshold. iOS hang rate is sampled, arrives days late, carries no store consequence. A reliability target phrased identically for both is measurable on one and aspirational on the other.

---

## Track C · Systems & judgement

### 13 · Mobile system design — shared + per-problem notes, 3 units
Prereq: **07 `S`, 06 `S`, 05 `S`, 09 `S`, 12 `S`** — the gate · Existing: promised in ARCHITECTURE.md, absent

| Unit | Sections | Outcome |
| :--- | :--- | :--- |
| `M` `[~]` **new** | The building blocks: layers, cache, sync, transport, auth · designing one feature end to end · naming failure modes before writing code | Draw a feature's data flow and list what happens at each point when the network is gone |
| `S` `[~]` **new** | The method: requirements → NFRs → high level → data model → protocol → failure modes → trade-offs · **worked: offline-first sync engine** · **worked: media upload/download pipeline** · **worked: real-time updates — polling, SSE, WebSocket, push** · **worked: auth and session across restarts, reinstalls, expiry** · presenting a design and defending it | Design one of the four from a blank page in 45 minutes, and answer "what if this component is down for an hour" for every box you drew |
| `L` `[~]` **new** | Framing NFRs before design starts — the highest-leverage thing a Lead does here · product-scale client architecture · designing across team boundaries · designing for a system that outlives its implementation | Write the NFRs before anyone designs, with numbers, so the design review argues about the numbers rather than about taste |

**Cross-platform:** no table — each worked problem carries its own "on iOS this differs because…" section, since divergences are problem-specific. The sync-engine problem bites hardest; see the `WorkManager` ↔ `BGTaskScheduler` break in domain 05.

### 14 · Technical decision making & trade-offs — agnostic, 3 units
Prereq: 07 `S`, 16 `M` · Unlocks: 15, 20 · Existing: the native vs cross-platform table

| Unit | Sections | Outcome |
| :--- | :--- | :--- |
| `M` **new** | Comparing two or three options and saying why, in writing · when to escalate rather than guess quietly | Put the rejected option in the PR description, with the reason |
| `S` *re-filed* | Writing an ADR still useful a year later · naming constraints, alternatives, reversibility, cost explicitly · deciding with incomplete data · revisiting a decision production disagreed with · native vs cross-platform, worked properly rather than as a table | Write an ADR someone who was not in the room can act on, and revisit one of your own with the outcome recorded |
| `L` **new** | How decisions get made here: who decides what, when an ADR is required · one-way doors vs reversible decisions, and spending caution accordingly · engineering economics: cost of delay, opportunity cost, build vs buy · SDK adoption as a decision with a price · deciding under genuine uncertainty, and saying so | Write the decision-rights document: which decisions a Lead makes, which the team makes, which need a stakeholder. Then follow it when it is inconvenient. |

### 15 · Technical debt & modernisation — agnostic, 3 units
Prereq: 07 `S`, 19 `S`, 18 `S` · Existing: monolith→multi-module playbook, risk matrix

| Unit | Sections | Outcome |
| :--- | :--- | :--- |
| `M` **new** | Leaving code better than found, at a scale that fits the PR · naming debt in a ticket rather than copying the pattern once more | File a debt ticket a stranger could pick up, including why it matters and roughly what it costs |
| `S` *re-filed* | The strangler pattern in practice · monolith to multi-module as a sequenced migration · migrating behind flags with a tested rollback path · shipping features throughout, the actual hard part · large-scale automated refactoring | Run a migration with no big-bang merge, abandonable at any point without leaving the codebase worse |
| `L` *re-filed* | Debt as a portfolio: inventory with quantified impact · funding an allocation per cycle and defending it when the quarter gets tight · the risk assessment matrix for review and merge decisions · refusing a rewrite that cannot be sequenced | Present the inventory to a non-engineer with impact in their units — build minutes, crash rate, velocity — and get the allocation funded |

### 21 · AI & LLM engineering — shared + per-problem notes, 7 units
Prereq: none (Mid), 13 `S` (Senior, for the system-design method the deep dives build on) · Existing: none — new domain

| Unit | Sections | Outcome |
| :--- | :--- | :--- |
| `M` **new** | Working AI into the ticket workflow at the right stages, proportional to how cheaply output can be verified · core concepts — tokens, context window, hallucination · tracking the field and evaluating a new model against your own eval set, not marketing benchmarks | Given a new ticket, name which stage of the workflow AI helps at, explain how the model turns a prompt into an answer, and name the eval you'd run before trusting a new model |
| `S` **new**, core + 4 per-problem notes | Core: the shape of a production LLM feature end to end. Per-problem: **backend proxy vs. client-held keys, key-pool load balancing & streaming** · **RAG pipeline & vector-store principles, evaluated at the system level** · **caching, client-side de-duplication & AI memory** · **LoRA fine-tuning, the ReAct agent loop & prompt-injection defence** | Design the server-side architecture for a new AI feature end to end, and name which per-problem note it depends on |
| `L` **new** | The org's AI usage/data-handling policy · AI backend architecture as a shared platform investment · fine-tune-vs-prompt and BYOK-vs-proxy as engineering economics per product line · vetting an AI vendor's data-use terms before a feature ships | Write the AI usage policy before an incident forces one into existence, and decide — with a stated reason — whether the next AI feature joins a shared platform |

**Cross-platform:** no parity table — this domain is server- and architecture-facing; a mobile SDK
divergence that actually matters (e.g. consuming SSE on Android vs iOS) is noted inline in the
relevant per-problem note rather than tracked as a platform split.

---

## Track D · Leadership, product & delivery

> **Format note.** Track A and B articles teach a mechanism. Track D articles cannot — there
> is no mechanism, only a situation and a judgement. Write these as **scenarios plus copyable
> artifacts**: a real ADR, a real risk register, a real postmortem, a real calibration
> conversation with what was said and why. A template someone can fill in beats three pages
> of prose they agree with and never use.

### 16 · Communication & technical writing — agnostic, 3 units
Prereq: none — root of the leadership spine · Unlocks: 14, 17, 18, 19, 20 — all of Track D · Existing: nothing

| Unit | Sections | Outcome |
| :--- | :--- | :--- |
| `M` **new** | PR descriptions, commit messages and bug reports that stand alone · asking a precise question, the highest-return skill at this level · reporting status and blockers before being asked | Write a PR description a reviewer can act on without opening the diff first |
| `S` **new** | The design doc or RFC that actually gets acted on · explaining a trade-off to a non-engineer without distorting it · documentation good enough that someone can take the system over · writing for asynchronous review across time zones | Write a design doc that gets a decision made in comments, without a meeting |
| `L` **new** | The technical narrative that aligns a team · running a design review so it converges rather than circles · persuading stakeholders in their language, not yours · delivering bad news early, accurately, with options attached | Tell a stakeholder a date is going to slip, before they ask, with two options and a recommendation |

### 17 · Code review & mentoring — agnostic, 3 units
Prereq: 16 `M`, 07 `M` · Existing: risk matrix, post-release 1-on-1 notes

| Unit | Sections | Outcome |
| :--- | :--- | :--- |
| `M` **new** | Specific, kind, actionable review comments · receiving review without defending · onboarding a newer teammate to their first merged PR | Leave a review comment that says what, why, and what instead — all three |
| `S` *re-filed* | Reviewing for design and risk rather than formatting · deliberate mentoring: goals, feedback, sponsorship · raising the baseline by leaving good examples in the codebase · handling an architectural violation under deadline — the risk matrix applied | Block a PR for a design reason and get agreement, without the author feeling overruled |
| `L` **new** | Growing seniors and future leads, different from mentoring mid-level engineers · review standards and culture · calibrating against a written ladder · delegating the interesting work instead of keeping it | Hand a senior engineer a problem you wanted to solve yourself, and let them solve it differently |

### 18 · Product & business acumen — agnostic, 3 units
Prereq: 16 `M` · Unlocks: 15 `L`, 09 `L`, 20 · Existing: UX prioritisation framework

| Unit | Sections | Outcome |
| :--- | :--- | :--- |
| `M` **new** | Who a ticket is for, and what done means to them · flagging requirement gaps before building rather than during QA | Find the ambiguity in a ticket and resolve it before writing code, at least once per sprint |
| `S` *re-filed* | Shaping requirements rather than consuming them · proposing the cheaper alternative that gets most of the value · knowing which metric your feature moves, and checking whether it did · UX prioritisation for engineers | Talk Product out of something, by offering a cheaper thing that serves the same goal |
| `L` **new** | Connecting technical strategy to business outcomes · arguing for platform investment in business language · trading scope, quality and time as a peer rather than as an estimator · reading the product roadmap for technical risk before it arrives | Get a quarter of platform work funded, with the case written in revenue, risk or cost rather than in engineering discomfort |

### 19 · Planning, estimation & risk — agnostic, 3 units
Prereq: 16 `M`, 14 `M` · Unlocks: 15 `L` · Existing: nothing — a leading cause of failed Lead transitions

| Unit | Sections | Outcome |
| :--- | :--- | :--- |
| `M` **new** | Breaking a feature into tasks · estimating your own work honestly, including the parts you dislike · raising slippage the day it becomes likely, not the day it is due | Give an estimate you meet or miss for a reason you can name afterwards |
| `S` **new** | Decomposing into a sequenced, parallelisable plan · de-risking spikes up front, timeboxed · estimating in ranges with assumptions written down · dependency mapping, including outside your team | Produce a plan where the riskiest unknown is resolved in week one, not week six |
| `L` **new** | Turning a fuzzy problem into a technical initiative with milestones · the risk register: mitigation, contingency, reviewed more than once · capacity planning across a quarter · defending a plan that slipped, without blaming or absorbing all of it | Run a quarter where the risks that materialised were on the register, and their mitigations had already started |

### 20 · Technical leadership & influence — agnostic, 3 units
Prereq: 16 `S`, 17 `S`, 18 `S` · Existing: nothing

| Unit | Sections | Outcome |
| :--- | :--- | :--- |
| `M` **new** | Owning your commitments, and saying early when you cannot meet one · contributing an opinion in a technical discussion without being asked | Disagree with a more senior engineer, in public, with a reason |
| `S` **new** | Driving consensus within your area · influence without authority, using evidence rather than seniority · resolving disagreement so it stays technical | Change a team decision by convincing people, and be able to state the strongest version of the view you argued against |
| `L` **new** | Setting and communicating technical vision · making the call when consensus fails, and owning it afterwards · managing up and across · organisational awareness: where the constraints actually sit · deciding under uncertainty without pretending to certainty | Make an unpopular technical call, explain it so the team can execute it wholeheartedly, and revisit it publicly if it turns out wrong |

---

## Where the work falls

| Track | Band units | Re-filed | To write | Parity tables |
| :--- | ---: | ---: | ---: | ---: |
| A · Core craft | 33 | 12 | 21 | 7 |
| B · Production | 19 | 7 | 12 | 5 |
| C · Systems | 9 | 3 | 6 | 1 |
| D · Leadership | 15 | 3 | 12 | 0 |
| **Total** | **78** | **25** | **53** | **13** |

"Re-filed" counts units inheriting at least one section from an existing article — most still
need substantial new writing around what they inherit. Nothing in the iOS column exists today.
