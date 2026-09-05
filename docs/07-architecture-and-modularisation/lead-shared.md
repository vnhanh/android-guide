---
id: architecture-lead
title: Architectural Direction & Enforcing It in CI (Lead, Android + iOS)
description: Architectural direction and the guardrails that keep it, enforcing dependency rules in CI, sequencing evolution against the roadmap, and when not to re-architect.
tags: [android, ios, architecture, lead, ci]
lang: en
status: complete
domain: 07-architecture-and-modularisation
band: L
platform: shared
level: Lead
sidebar_position: 3
prerequisites: [architecture-senior]
outcomes:
  - "Ship one architectural rule as an automated check, and say what it would have caught in the last six months of history"
resources:
  - title: "ArchUnit / Konsist — architecture testing"
    url: "https://docs.konsist.lemonappdev.com/"
    date: "2025-01-01"
  - title: "Gradle dependency analysis plugin"
    url: "https://github.com/autonomousapps/dependency-analysis-gradle-plugin"
    date: "2024-11-01"
  - title: "Swift access control"
    url: "https://docs.swift.org/swift-book/documentation/the-swift-programming-language/accesscontrol/"
    date: "2025-06-01"
---

# Architectural Direction & Enforcing It in CI

> **Outcome.** Ship one architectural rule as an automated, CI-blocking check, and state
> precisely what it would have caught in the last six months of the codebase's actual history —
> not what it might theoretically catch, what it *would have*.

## Why a socially-enforced rule decays in a quarter

The Mid and Senior articles in this domain named real rules — no framework type in the domain
layer, a module boundary predicted and measured, a scoped rather than singleton DI binding. Every
one of those is enforceable by review today and, without a mechanical check, forgotten by review
within a quarter — not from bad faith, but because reviewer attention is a limited resource that
correctly prioritises the PR's actual logic over re-deriving an architectural rule from memory
on every review. The Lead-level job is picking which of these rules is worth the cost of
automating, and actually automating it.

## Enforcing dependency rules in CI — a worked example

```kotlin
// Konsist test — runs as part of the normal test suite, fails the build on violation.
class ArchitectureTest {
    @Test
    fun `domain layer does not depend on framework types`() {
        Konsist.scopeFromProject()
            .files
            .filter { it.path.contains("/domain/") }
            .assertFalse { file ->
                file.hasImport { it.name.startsWith("android.") } ||
                file.hasImport { it.name.startsWith("androidx.") } ||
                file.hasImport { it.name.contains("retrofit2") } ||
                file.hasImport { it.name.contains("androidx.room") }
            }
    }

    @Test
    fun `feature modules do not depend on other feature impl modules`() {
        Konsist.scopeFromProject()
            .files
            .filter { it.path.contains("/feature/") && it.path.contains(":impl") }
            .assertFalse { file ->
                file.imports.any { it.name.contains(":feature:") && !it.name.contains(":api") }
            }
    }
}
```

```swift
// Swift has no equivalent architecture-testing library as mature as Konsist/ArchUnit;
// the nearest mechanical enforcement is access control itself plus a lint rule
// flagging a forbidden import, checked by a custom SwiftLint rule or a small script
// run in CI against `swift package show-dependencies --format json`.
```

> [!IMPORTANT]
> "What would this have caught in the last six months" is answered by running the new check
> against the git history, not by describing it hypothetically: `git log` through the last two
> quarters' merged PRs, checking out each one, and running the new architecture test against
> it names the exact violations — real PR numbers, real authors, real dates — the rule would
> have blocked. This is the evidence that turns "I think this rule matters" into "this rule
> would have caught these three specific incidents," which is what gets a new CI gate approved
> without a debate about whether it is worth the friction.

## Sequencing evolution against the product roadmap

An architectural change competes for the same engineering time as feature work, and the
Lead-level job is sequencing it so it doesn't silently lose that competition every sprint:

```markdown
## Modularisation roadmap — Q1-Q2

- Q1 sprint 1-2: extract :core:shared-ui (ADR-014) — low risk, unblocks nothing else,
  scheduled opportunistically alongside feature work touching that area.
- Q1 sprint 3-4: :feature:checkout api/impl split — HIGH priority, gates the payments
  team's parallel workstream starting Q2; sequenced explicitly ahead of their start date,
  not left to compete with unrelated feature work in Q2.
- Q2: architecture test suite (this article) — lands once the Q1 splits exist to test
  against; sequencing it before the splits would test a graph that's about to change.
```

## When *not* to re-architect

The counter-skill to shipping architectural rules is refusing a rewrite that cannot be
sequenced — the same judgement domain 15's Lead article applies to technical debt generally,
specific here to "should we re-architect this."

> [!WARNING]
> A proposal to re-architect a working system is worth refusing, or at minimum sequencing
> behind a strangler-pattern migration (domain 15), when it cannot state: what ships throughout
> the migration (a big-bang cutover with no incremental value is a red flag), what the rollback
> path is if it's wrong halfway through, and what specifically is measurably wrong with the
> current architecture today — as opposed to "it could be cleaner," which is true of nearly
> every system and justifies nothing on its own.

## Pitfalls & trade-offs

- **A rule enforced only by review, forever.** Covered above — this is the exact failure mode
  the CI-blocking check this article's outcome asks for exists to remove.
- **Proposing a CI gate with no evidence of what it would have caught.** "This seems like good
  practice" loses to "this would have caught PRs #341, #398 and #455" every time it's actually
  tested against the argument.
- **Sequencing an architectural change with no relationship to the roadmap it will compete
  against.** It loses that competition silently, sprint after sprint, without a chosen date.
- **Approving a rewrite with no incremental delivery plan and no rollback path.** The two
  questions in the "when not to re-architect" section above are the minimum bar, not an
  exhaustive one — a proposal that can't answer either is not ready to approve regardless of how
  compelling the underlying architectural case is.
