---
id: fundamentals-lead
title: The Language & Idiom Standard (Lead, Android + iOS)
description: Writing the language and idiom standard — what is allowed, what is banned, and the enforcement mechanism behind each rule — and pricing a toolchain upgrade against migration cost.
tags: [android, ios, kotlin, swift, lead, standards]
lang: en
status: complete
domain: 01-programming-fundamentals
band: L
platform: shared
level: Lead
sidebar_position: 5
prerequisites: [fundamentals-senior-android, fundamentals-senior-ios]
outcomes:
  - "Write the idiom standard and name the enforcement mechanism for each rule. A rule with no mechanism is a preference."
resources:
  - title: "ktlint"
    url: "https://pinterest.github.io/ktlint/"
    date: "2025-01-01"
  - title: "SwiftLint"
    url: "https://github.com/realm/SwiftLint"
    date: "2025-01-01"
  - title: "Kotlin coding conventions"
    url: "https://kotlinlang.org/docs/coding-conventions.html"
    date: "2025-03-01"
---

# The Language & Idiom Standard

> **Outcome.** Write the idiom standard for your codebase, and name the enforcement mechanism
> behind every rule in it. A rule with no mechanism is a preference, not a standard — and a
> preference decays the first time someone is in a hurry.

## Why "allowed, banned, reason recorded" beats a style guide

A style guide that says "prefer composition over inheritance" or "keep functions small" states a
value nobody disagrees with and enforces nothing. The Senior-level articles in this domain
established two categories of judgement — variance and inlining decisions on Android, weak/
unowned and existential-vs-generic decisions on iOS — that individual engineers make well in
isolation and inconsistently across a team. The Lead-level artifact is the document that turns
those individual judgements into one answer, with a reason attached, and a way to catch a
violation before it merges rather than in the next review that happens to notice.

## The idiom standard — a worked shape

```markdown
# Kotlin/Swift idiom standard — MobileApp

## Allowed / required
- Sealed classes / enums for any state with a closed set of variants — required for all
  ViewModel UI-state types. Reason: exhaustive `when`/`switch` catches a missing case at
  compile time; a class hierarchy with a default branch does not.
  Enforced by: `detekt` rule `ExhaustiveWhenRequired` (custom), CI-blocking.
- `internal` visibility by default for anything not part of a module's declared `:api`.
  Reason: an `:api`-surface decision should be explicit, not the accidental default of
  Kotlin's public-by-default visibility. Enforced by: `explicitApi()` compiler flag, CI-blocking.

## Banned, with a reason
- `!!` (non-null assertion) outside test code. Reason: identical risk to a Swift force-unwrap
  with a worse failure message — a `NullPointerException` with no context. Prefer `checkNotNull`
  with a message, or restructure to avoid the assertion.
  Enforced by: `detekt` rule `UnsafeCallOnNullableType`, CI-blocking.
- `GlobalScope.launch`. Reason: unscoped, uncancellable work — the leak pattern domain 04's Mid
  articles are about. Enforced by: `detekt` custom rule banning the import, CI-blocking.
- Swift `!` (force unwrap, force try, force cast) outside test code. Reason: identical crash
  risk to `!!`. Enforced by: SwiftLint `force_unwrapping`/`force_try`/`force_cast` rules,
  CI-blocking.
- `@unchecked Sendable` without a linked, dated review comment. Reason: it turns off the
  compiler's strict-concurrency checking for that type with no record of why it was safe to.
  Enforced by: SwiftLint custom rule requiring a `// reviewed:` comment adjacent to the
  attribute, CI-blocking.

## Discouraged, not banned
- Nested scope-function chains beyond two levels (Kotlin) / more than one closure-based
  transformation chained inline (Swift). Reason: readability cost documented in domain 01's
  Mid articles; not mechanically bannable without false positives, so this is a review-comment
  norm, not a lint rule. Enforced by: code review convention, not CI.

## Toolchain upgrade policy
- Kotlin/Swift minor version bumps: adopted within one sprint of release, behind the existing
  CI suite as the safety net — no separate migration plan needed.
- Kotlin/Swift language-mode changes (e.g. Swift 6 strict concurrency by default): treated as
  a project per domain 04's Lead article ("Threading Contracts & Strict-Concurrency
  Migration"), sequenced module by module, never a single flag day.
```

## Making a ban stick — the mechanism is the point

The table above deliberately names a mechanism for every enforced rule, because the failure mode
this article exists to prevent is a standard that lives only in a wiki page and a shared
understanding that erodes within a quarter as the team changes. Three mechanisms, in order of
strength:

1. **A compiler flag or language feature.** `explicitApi()`, Swift's strict concurrency mode.
   Strongest: the rule cannot be violated even accidentally, because the code doesn't compile.
2. **A CI-blocking lint rule.** `detekt`, `ktlint`, `SwiftLint` — custom rules where the built-in
   set doesn't cover a codebase-specific ban (`GlobalScope.launch`, `@unchecked Sendable`
   without review). Strong: violated code is caught before merge, not in review.
3. **A code review convention.** Reserved for judgement calls a lint rule cannot express without
   false positives — the "discouraged, not banned" scope-function guidance above. Weakest: it
   depends on every reviewer remembering and enforcing it, which is exactly the failure mode a
   written mechanism is supposed to reduce, not eliminate entirely.

A rule that can only live at level 3 is worth including anyway — write it down, name that its
mechanism is review convention rather than tooling, and treat that honestly as its actual
strength rather than dressing it up as enforced when it is not.

## Pricing a toolchain upgrade against migration cost

The Lead-level decision is not "should we adopt Swift 6 / the newest Kotlin" — it is stating,
before starting, what the upgrade costs and what it buys, in the same units as any other
technical investment:

```markdown
## Toolchain upgrade — Swift 6 strict concurrency, proposed 2025-Q3

Cost: ~40 engineer-days, estimated from the report-only compiler pass across all modules
(see domain 04's Lead article for the module-by-module sequencing this cost assumes).
Buys: eliminates an entire class of data-race bugs at compile time; two production
incidents in the last 12 months (INC-0231, INC-0284) would have been compile errors
under strict checking, not field discoveries.
Alternative considered: stay on Swift 5 language mode indefinitely. Rejected — the
compiler-caught bug class recurs roughly quarterly at current scale, and the cost only
grows as the codebase does.
Decision: proceed, sequenced per the module order in the migration plan, no fixed
deadline — completion gates on each module's own PR landing, not a company-wide date.
```

## Pitfalls & trade-offs

- **A standard with no enforcement column.** Every rule in the worked example above states its
  mechanism; a rule that cannot state one honestly belongs in the "discouraged" tier, not the
  "banned" tier — mislabelling it erodes trust in the whole document the first time someone
  notices the "ban" was never actually enforced.
- **Banning something a lint rule cannot actually detect.** A rule that sounds enforceable but
  isn't (e.g. "no unnecessary abstraction") is worse than not writing it down — it implies a
  mechanism that doesn't exist.
- **Treating a toolchain upgrade as a binary yes/no instead of a priced decision.** "We should
  upgrade eventually" with no cost attached never loses to shipping features this sprint; a
  number attached to both the cost and the incidents it would have prevented is what actually
  gets it scheduled.
- **Writing the standard once and never revisiting it.** New language features (Kotlin K2,
  Swift's evolving concurrency model) regularly turn a "discouraged, review-only" rule into one
  a linter can finally enforce — a standard that hasn't changed in a year is a standard nobody
  has proposed strengthening, not necessarily a finished one.
