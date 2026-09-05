# Career Framework & Competency Matrix

Authoring reference. Before writing any band unit, check its cell here — the cell is the
claim the article has to make true.

## Levels

Defined by scope of ownership and blast radius, not by years or by how hard the technology is.

| | Mid | Senior | Tech Lead |
| :--- | :--- | :--- | :--- |
| Unit of ownership | A feature or ticket | A technical area | A team's technical direction |
| Time horizon | Days to a sprint | A release cycle | Quarters to years |
| Input received | A defined requirement | An ambiguous problem | An undefined situation |
| Decides | How to implement within existing patterns | Which approach, when to deviate | What the patterns are, and which problems get solved |
| Mistakes caught by | Code review | Design review, production metrics | Nobody — self-correction is the job |
| Blast radius | One feature, one release | One subsystem, quarters of rework | Team velocity, hiring, roadmap |
| Relationship to code | Writes most of the time | Writes the hard parts, reviews the rest | Writes least |

**Mid** — "I can independently implement, debug, test and maintain production features."
**Senior** — "I can own complex technical problems, make sound technical decisions, improve systems, and raise the effectiveness of other developers."
**Lead** — "I can provide technical direction for a team or multiple teams and make decisions that optimise the product and engineering system as a whole."

Two corrections to the old model:

- **`Staff` is retired from the ladder.** It is the IC branch running *parallel* to Tech Lead,
  not a rung above it. Use `Mid | Senior | Lead`; mark genuinely out-of-scope topics `beyond`.
- **Tech Lead is a role change, not a skill increment.** Roughly half of Track D has no
  counterpart at Senior level. Say this out loud on the Lead landing page.

## Domains

| # | Domain | Track | Platform treatment |
| ---: | :--- | :--- | :--- |
| 01 | Programming fundamentals | A · Core craft | fully split |
| 02 | Platform & OS internals | A | fully split |
| 03 | UI & interaction engineering | A | fully split |
| 04 | Concurrency & asynchrony | A | fully split |
| 05 | Data, persistence & offline | A | split M+S, shared L |
| 06 | Networking & API integration | A | shared + parity |
| 07 | Architecture & modularisation | A | shared + parity |
| 08 | Testing & quality engineering | B · Production | shared + parity |
| 09 | Performance & efficiency | B | split M+S, shared L |
| 10 | Security & privacy | B | shared + parity |
| 11 | Build, release & CI/CD | B | split M+S, shared L |
| 12 | Observability & reliability | B | shared + parity |
| 13 | Mobile system design | C · Systems | shared + per-problem notes |
| 14 | Technical decision making | C | agnostic |
| 15 | Technical debt & modernisation | C | agnostic |
| 16 | Communication & technical writing | D · Leadership | agnostic |
| 17 | Code review & mentoring | D | agnostic |
| 18 | Product & business acumen | D | agnostic |
| 19 | Planning, estimation & risk | D | agnostic |
| 20 | Technical leadership & influence | D | agnostic |

Learning-attention weight by track — a signal about where to spend deliberate effort, not a
target and not a time budget:

| Track | Mid | Senior | Lead |
| :--- | ---: | ---: | ---: |
| A · Core craft | ~60% | ~30% | ~10% |
| B · Production | ~25% | ~30% | ~20% |
| C · Systems | ~10% | ~25% | ~30% |
| D · Leadership | ~5% | ~15% | ~40% |

## The matrix

Mid cells describe implementation, Senior cells describe ownership, Lead cells describe
direction. Where a cell names a number it is a real production metric, because "know Android
performance" is not a standard.

### Track A · Core craft

| Domain | Mid — implements | Senior — owns | Lead — directs |
| :--- | :--- | :--- | :--- |
| 01 Programming fundamentals | Idiomatic Kotlin/Swift; nullability, value vs reference, generics, immutability. Reads unfamiliar code and predicts behaviour. | Reasons about object lifetime and memory model — ARC cycles, GC roots, captured `this`. Uses the type system to make illegal states unrepresentable. Designs APIs others consume. | Sets the language and idiom standard: what is allowed, what is banned, reason recorded. Evaluates toolchain upgrades against migration cost. |
| 02 Platform & OS internals | Lifecycle, config change, process death, permissions, background limits. Picks the right component for a job. | Process-priority model, Doze and buckets, IPC boundaries, cold-start sequencing. Debugs OS and OEM divergence from a trace. | Owns platform-support policy — minSdk/deployment target, device matrix — and turns each annual OS change into planned work before it is an emergency. |
| 03 UI & interaction | Screens with unidirectional state; loading/empty/error; accessibility labels and touch targets; supported size classes. | Diagnoses recomposition and layout-pass problems from a trace. Component APIs and a state model that survives beyond one screen. Owns design-system integration. | Defines UI architecture and design-system ownership across teams. Sets the accessibility standard. Arbitrates design ambition against cost as a peer. |
| 04 Concurrency | Coroutines/async-await correctly: right dispatcher, cancellation handled, lifecycle-aware collection, no UI work off the main thread. | Structured concurrency on non-trivial flows — fan-out/fan-in, debounce, retry, backpressure. Diagnoses races, deadlocks, leaked scopes. | App-wide threading contracts: which scope owns what, what must be `Sendable`/`@MainActor`, where blocking is permitted. Drives migrations. |
| 05 Data & offline | Local DB and secure key-value correctly. Writes and tests migrations. Understands cache lifetime and why invalidation is the hard half. | Local data model and caching policy for a feature. Offline-first with optimistic updates, a durable retry queue, one explicit conflict rule. | Owns data and sync architecture; states its consistency guarantees. Decides source of truth, device vs server. Sets retention rules with Legal. |
| 06 Networking | REST/GraphQL correctly: serialisation, timeouts, error mapping, pagination, token refresh without a thundering herd. | Designs the networking layer — retry/backoff, idempotency keys, coalescing, TLS pinning, telemetry. Negotiates API contracts rather than accepting them. | Owns contract strategy: protocol choice, versioning, backward-compat policy assuming old versions live for years. Runs API review across teams. |
| 07 Architecture | Applies the existing architecture correctly. Knows why each boundary exists; keeps framework types out of domain code. | Designs and evolves architecture for a complex feature. Module boundaries and `:api`/`:impl`. Executes large refactors incrementally, behind flags. | Defines direction and the guardrails that enforce it — dependency rules in CI, ADRs, a review gate. Sequences evolution. Decides when *not* to re-architect. |

### Track B · Production engineering

| Domain | Mid — implements | Senior — owns | Lead — directs |
| :--- | :--- | :--- | :--- |
| 08 Testing | Unit tests for own code; one end-to-end test per critical flow. Fakes over mocks. Does not merge red or silently `@Ignore`. | Designs testability into the code. Decides what to test at which layer and what not to test. Test infrastructure. Drives flake rate down as a tracked number. | Testing strategy and quality gates: what blocks a merge, what blocks a release, what coverage of *risk* means. Owns suite runtime and maintenance as a budget. |
| 09 Performance | Profilers to find common jank, memory and startup problems. Frame budget, overdraw, leak patterns. Fixes the obvious. | Complex regressions to root cause with system traces; benchmarks the fix; it stays fixed. Owns startup, scroll, battery, size for an area against stated numbers. | Performance budgets and SLOs, field monitoring, CI regression gating, architectural constraints that prevent systemic regressions. Decides when a problem is not worth fixing. |
| 10 Security | Never logs or hardcodes secrets. Keystore/Keychain, cert validation, correct permission requests, input validation. Recognises OWASP failures in own code. | Threat-models a feature: auth flows, token lifetime, deep-link and exported-component abuse, tamper detection and its real value. Reviews others' code for security defects. | Owns security posture and privacy compliance — data-collection review, SDK vetting, pen-test remediation. Decides how much hardening is proportionate. |
| 11 Build & release | Git well: small PRs, rebase, bisect. Build variants and signing. Reads a failing pipeline and fixes their own break. | Optimises build time against a measured baseline. Authors pipeline stages. Owns release mechanics — versioning, phased rollout, flags, submission, rehearsed hotfix path. | Delivery strategy: cadence, train, rollout and rollback policy, flag hygiene and expiry, developer experience as a funded line item. Build time and CI cost as budgets. |
| 12 Observability | Reads crash reports with deobfuscation working. Meaningful events and breadcrumbs. Files reproducible bug reports. | Instruments a feature for field diagnosis. Triages crash clusters to root cause. Owns crash-free and ANR/hang rates for an area, with dashboards they maintain. | Observability strategy and reliability targets. Owns incident management end to end — severity, on-call, comms during the event, blameless postmortem, action items that close. |

### Track C · Systems & judgement

| Domain | Mid — implements | Senior — owns | Lead — directs |
| :--- | :--- | :--- | :--- |
| 13 System design | Building blocks — layers, cache, sync, auth, transport. Designs one feature end to end, naming failure modes before coding. | Designs a complex subsystem from functional *and* non-functional requirements: offline, latency, battery, size. Presents and defends it under questioning. | Owns product-scale client architecture. Frames NFRs *before* design starts. Designs across team boundaries, for a system that outlives its implementation. |
| 14 Decision making | Compares two or three options and says why. Escalates when out of depth rather than guessing quietly. | Writes ADRs naming constraints, alternatives, reversibility, cost. Decides with incomplete information; revisits when production disagrees. | Establishes how decisions get made — who decides what, when an ADR is required. Makes the irreversible calls. Weighs cost of delay, opportunity cost, build vs buy. |
| 15 Technical debt | Leaves code better than found. Names debt in a ticket instead of copying the pattern once more. | Plans and executes large refactors behind flags, with a rollback path and a strangler sequence that keeps shipping features throughout. | Runs debt as a portfolio: inventory, impact in build time / crash rate / velocity, a funded allocation per cycle, and the discipline to refuse an unsequenceable rewrite. |

### Track D · Leadership, product & delivery

| Domain | Mid — implements | Senior — owns | Lead — directs |
| :--- | :--- | :--- | :--- |
| 16 Communication | PR descriptions, commits and bug reports that stand alone. Precise questions. Status and blockers without being chased. | Design docs and RFCs a reader can act on. Explains a trade-off to a non-engineer without distorting it. Documents systems well enough to hand over. | The technical narrative that aligns a team. Runs design reviews so they converge. Delivers bad news early, accurately, with options attached. |
| 17 Review & mentoring | Specific, kind, actionable reviews; receives them without defending. Helps a newer teammate to a first merged PR. | Reviews for design and risk, not formatting. Mentors deliberately — goals, feedback, sponsorship. Raises the baseline by leaving good examples. | Grows seniors and future leads. Sets review standards and culture. Calibrates against a written ladder. Delegates the interesting work instead of keeping it. |
| 18 Product acumen | Understands who a ticket is for and what done means. Flags requirement gaps before building, not during QA. | Shapes requirements rather than consuming them. Proposes the cheaper alternative that gets most of the value. Knows which metric the feature moves, and whether it did. | Connects technical strategy to business outcomes; argues for platform investment in the business's language. Trades scope, quality and time as a peer. |
| 19 Planning & risk | Breaks a feature into tasks; estimates own work honestly; raises slippage the day it becomes likely. | Decomposes into a sequenced, parallelisable plan with named risks and de-risking spikes up front. Estimates in ranges with written assumptions. | Turns fuzzy problems into technical initiatives with milestones and dependencies. Maintains a real risk register. Plans capacity across a quarter and defends a plan that slipped. |
| 20 Leadership & influence | Owns commitments and says so when one cannot be met. Contributes an opinion instead of waiting to be assigned. | Drives consensus in their area; influences without authority, using evidence rather than seniority. Keeps technical disagreement technical. | Sets and communicates technical vision; makes the call when consensus fails. Manages up and across. Knows where organisational constraints really sit. |

## Knowledge dependencies

Six spines. `M`/`S`/`L` mark where each node sits.

```
Concurrency   fundamentals(M) -> threading & lifecycle(M) -> coroutines/async-await(M)
              -> structured concurrency(S) -> concurrent feature architecture(S)
              -> race & deadlock diagnosis(S) -> app-wide threading contracts(L)

Architecture  OOP & SOLID(M) -> layering & DI(M) -> Clean Architecture boundaries(M)
              -> trade-offs & ADRs(S) -> modularisation(S) -> incremental refactoring(S)
              -> architecture governance(L) -> technical strategy(L)

Performance   rendering & memory model(M) -> profiler literacy(M)
              -> system-trace root cause(S) -> benchmarking & gating(S)
              -> field metrics & percentiles(S) -> budgets, SLOs & constraints(L)

Data          local storage & migrations(M) -> caching & invalidation(M)
              -> optimistic UI & retry queues(S) -> conflict resolution & sync(S)
              -> explicit consistency guarantees(S) -> data & sync architecture(L)

Delivery      git & PR hygiene(M) -> build system & variants(M) -> reading CI(M)
              -> pipeline authoring & build budgets(S) -> release engineering(S)
              -> observability & crash triage(S) -> incident management(L)
              -> delivery & DX strategy(L)

Leadership    clear written communication(M) -> code review as participant(M)
              -> design docs & RFCs(S) -> deliberate mentoring(S)
              -> facilitating design review(S) -> cross-team collaboration(S)
              -> stakeholder communication(L) -> setting technical direction(L)
```

### Cross-track gates

| This capability | Requires first | Why the edge exists |
| :--- | :--- | :--- |
| 13 System design `S` | 07 `S` · 06 `S` · 05 `S` · 09 `S` · 12 `S` | NFRs are only meaningful to someone who has paid for violating them in production |
| 15 Debt strategy `L` | 07 `S` · 19 `S` · 18 `S` | Debt cannot be prioritised without quantifying cost in business terms and sequencing repayment |
| 12 Incident management `L` | 12 `S` · 11 `S` · 16 `S` | Half of incident command is knowing the rollback options; the other half is telling people accurately mid-fire |
| 09 Performance strategy `L` | 09 `S` · 11 `S` · 18 `S` | A budget nobody enforces in CI is a wish; one nobody can justify commercially gets cut in the first crunch |
| 07 Architecture governance `L` | 07 `S` · 14 `S` · 20 `S` · 08 `S` | Rules neither automatically enforced nor socially agreed decay within a quarter |
| 17 Mentoring seniors `L` | 17 `S` · 16 `S` · 18 `S` | Senior engineers need scope and sponsorship, not answers. Giving them answers is the failure mode. |

**The least obvious edge:** observability and release engineering are prerequisites *for*
system design, not consequences *of* it. You cannot design a system you have never had to
operate. This is the edge the guide is missing entirely today.
