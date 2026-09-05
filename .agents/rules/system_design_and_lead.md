# System Design & Tech Lead Level Content Rules

This rule file governs the creation of Senior, Lead, and Mobile System Design content
(domains 13-15 in `plan/framework.md`; `Staff` is retired from the ladder).

---

## 🏗️ 1. Mobile System Design Articles

Mobile System Design guides must cover end-to-end client-side system architecture:

1. **Requirements Gathering**: Functional & Non-Functional requirements (e.g. offline availability, latency < 100ms, battery constraints, app size limit < 50MB).
2. **High-Level Architecture**: Diagram showing Client Layer, Local Storage / DB, Network / Protocol Engine, Sync Engine, and Backend Gateway.
3. **Data Model & Protocol Design**: Schemas for local persistence (Room/GRDB/WatermelonDB/Isar) and API payload structure (Protobuf/gRPC, GraphQL, REST).
4. **Offline & Synchronization Strategy**: Optimistic UI updates, conflict resolution (CRDTs / Version Vectors), retry queues, exponential backoff.
5. **Security & Obfuscation**: Keytar/Keystore/Keychain secure storage, SSL pinning, R8/ProGuard/Bitcode, tamper detection.

---

## 👩‍💼 2. Tech Lead & Engineering Management Articles

Tech Lead articles should provide actionable frameworks for senior engineering leadership:

- **Architectural Decision Records (ADRs)**: Standardized template for evaluating tech stack transitions (e.g., native to React Native/Flutter, or RxJava to Coroutines).
- **Mobile CI/CD & Release Engineering**: Pipelines for automated testing, Fastlane scripts, phased rollouts, feature flags (LaunchDarkly/Unleash), crash monitoring (Sentry/Firebase).
- **Code Review & Quality Gates**: Linting rules (ktlint, SwiftLint, ESLint), PR checklist standards, performance regression gates.
- **Team Mentorship**: Technical career ladders, candidate assessment frameworks, post-mortem blameless culture.
