---
id: fundamentals-language-idioms-and-chaining
title: Language Idioms — Chaining & Extending Types You Don't Own, Across Five Languages
description: How Kotlin, Java, Swift, Dart and TypeScript each let you configure an object fluently or add behaviour to a type you didn't write — and why the same desire carries three different risk profiles depending on the language.
tags: [idioms, extension-functions, scope-functions, kotlin, java, swift, dart, typescript, mid, senior, lead]
lang: en
status: complete
domain: 01-programming-fundamentals
platform: shared
band: X
level: Mid
sidebar_position: 10
prerequisites: []
outcomes:
  - "Use the right scope function or extension mechanism to configure an object fluently or extend a type you don't own, in at least two of the five languages"
  - "State which of the five languages treats 'extend a type you don't own' as safe, which treats it as risky, and which has no direct mechanism at all"
  - "Write an idiom standard where every banned or required rule names its enforcement mechanism, and price a toolchain upgrade against its migration cost"
resources:
  - title: "Scope functions — Kotlin documentation"
    url: "https://kotlinlang.org/docs/scope-functions.html"
    date: "2025-03-01"
  - title: "Extensions — Dart documentation"
    url: "https://dart.dev/language/extension-methods"
    date: "2025-04-01"
  - title: "ktlint"
    url: "https://pinterest.github.io/ktlint/"
    date: "2025-01-01"
---

# Language Idioms: Chaining & Extending Types You Don't Own, Across Five Languages

Every language gives you a socially-acceptable way to do two closely related things: configure an
object fluently in one expression, and add a method to a type someone else wrote — a library class,
a platform type, a `String`. Think of it like adding a drawer to a piece of furniture you don't
own versus needing to build a whole new cabinet next to it just to hold one extra thing. Some
languages hand you a drawer kit built for exactly this (a real language feature, no downside).
Others make you build the cabinet (a static utility class). And at least one lets you literally
saw a hole in someone else's furniture, which works right up until two people do it to the same
dresser (prototype pollution). This article is that spectrum, per language, plus how a Tech Lead
turns "which idiom is normal here" into an enforced standard instead of a preference.

## Mid

**Interview question: "How does this language let you configure an object fluently, or add
behaviour to a type you didn't write?"**

**Kotlin** answers both halves with scope functions. `let`, `run`, `with`, `apply`, and `also` each
thread `this`/`it` through a lambda; the difference between them is the receiver name and the
return value, not behaviour.

```kotlin
// apply: configure an object, return the object itself — good for builder-style setup.
val request = Request.Builder().apply {
    url("https://api.example.com/profile")
    addHeader("Authorization", "Bearer $token")
}.build()

// let: transform a value, especially a nullable one, returning the transformed result.
val displayName: String = user?.let { "${it.firstName} ${it.lastName}" } ?: "Guest"
```

For "add a method to a type you don't own," Kotlin has extension functions — a real, checked
feature:

```kotlin
fun String.truncated(maxLength: Int): String =
    if (length <= maxLength) this else take(maxLength) + "…"
```

**Swift** has no direct scope-function equivalent, but `extension` covers the "add a method to a
type you don't own" half directly, including types you don't control like `String` or a UIKit
type:

```swift
extension String {
    func truncated(_ maxLength: Int) -> String {
        count <= maxLength ? self : String(prefix(maxLength)) + "…"
    }
}
```

`.map` and closures cover some of the same "transform and use the result inline" ground that
Kotlin's `let` covers, just without a dedicated keyword for it.

**Dart** has a dedicated operator for the fluent-configure half: the cascade `..`, which calls
multiple methods or sets multiple properties on the same object without repeating its name —
closest in spirit to Kotlin's `apply`, but a language operator rather than a function call.

```dart
final buffer = StringBuffer()
  ..write('Hello, ')
  ..write(user.displayName)
  ..write('!');
```

Dart also has extension methods, directly comparable to Kotlin's extension functions:

```dart
extension StringTruncation on String {
  String truncated(int maxLength) =>
      length <= maxLength ? this : '${substring(0, maxLength)}…';
}
```

**Java** has no scope-function equivalent and no extension-function equivalent either. The
idiomatic answer to "configure then return" is the Builder pattern — verbose, but explicit — or a
fluent setter chain that returns `this`:

```java
Request request = new Request.Builder()
    .url("https://api.example.com/profile")
    .addHeader("Authorization", "Bearer " + token)
    .build();
```

For "add a method to a type you don't own," Java's real, still-common idiom is a static utility
class — `Collections.sort(list)` rather than a `list.sort()` bolted on from outside:

```java
public final class StringUtils {
    private StringUtils() {}
    public static String truncated(String value, int maxLength) {
        return value.length() <= maxLength ? value : value.substring(0, maxLength) + "…";
    }
}
```

**TypeScript** treats method chaining as idiomatic wherever an API is designed for it — each
method returns `this` or a new wrapped value, the pattern behind array methods and most fluent
builders:

```typescript
const result = [1, 2, 3, 4, 5]
  .filter((n) => n % 2 === 0)
  .map((n) => n * 10);
```

There's no built-in scope-function equivalent to Kotlin's `let`; a short-lived `const` plus
explicit statements is the idiomatic alternative. "Add a method to a type you don't own" is
technically possible via prototype extension:

```typescript
// Technically works. Discouraged — see the Senior section below.
String.prototype.truncated = function (maxLength: number): string {
  return this.length <= maxLength ? this.toString() : this.slice(0, maxLength) + '…';
};
```

**Follow-up an interviewer asks next:** "What goes wrong if you chain too much?" In every one of
these languages, the failure mode is the same shape: a chain long enough, or nested enough, that a
reviewer can no longer trace which receiver each step refers to.

> [!WARNING]
> Nested or chained scope functions are the most common Mid-level readability regression in
> Kotlin review. `a?.let { it.b }?.let { it.c }?.also { doSomething(it) }` compiles cleanly and
> reads like a puzzle — each `it` shadows the previous one, and a reviewer has to hold three
> levels of implicit naming in their head. The same regression shows up as a five-deep Dart
> cascade, a TypeScript chain mixing array transforms with side effects, or a Swift closure chain
> nesting `map`/`compactMap`. A named intermediate variable, or an early return, is very often the
> more readable choice even though it's "more lines."

## Senior

**Interview question: "When is 'extend a type you don't own' safe, and when is it actually
risky?"**

The same desire — add a method to a type someone else wrote — carries three genuinely different
risk profiles depending on the language, and the honest answer names which tier each language is
in, not just whether the feature exists.

**Safe: a real language feature, checked by the compiler.** Kotlin extension functions, Swift
`extension`, and Dart extension methods are all resolved at compile time, scoped to the file or
module that imports them, and cannot silently collide with another extension of the same name
without the compiler telling you. There is no downside to reaching for one — it's the intended
mechanism, not a workaround.

**Risky: a runtime patch with no scoping.** JavaScript/TypeScript's prototype extension mutates a
shared, global object at runtime. `String.prototype.truncated = ...` is visible to every piece of
code that touches a string anywhere in the process, including a future language feature that picks
the same method name, or another library doing the exact same thing with a slightly different
implementation. Neither collision is a compile error — it's a silent override, discovered at
runtime if at all. This is a real difference from Kotlin/Swift/Dart, where extension functions are
the sanctioned, safe version of the same idea, and JavaScript's prototype extension is the unsafe,
discouraged version of it.

**Unavailable: worked around with a static utility class.** Java simply has no extension
mechanism. `StringUtils.truncated(value, maxLength)` is not a lesser version of an extension
function — it's the entire idiom, and it's genuinely fine; it just means the call site reads
`StringUtils.truncated(value, n)` instead of `value.truncated(n)`, and every engineer who has
worked in Java recognizes the pattern instantly.

> [!IMPORTANT]
> The cross-language insight worth stating out loud: the same feature request — "let me add a
> method to a type I don't own" — is a zero-cost language feature in Kotlin, Swift, and Dart; a
> real but genuinely risky pattern in JavaScript/TypeScript; and simply not offered in Java, where
> the community answer is a static utility class instead. Knowing which tier your language is in
> changes whether you reach for the idiom by default or reserve it for a deliberate, reviewed
> decision.

**Follow-up:** "So when would you actually use prototype extension in JavaScript?" Almost never in
application code — it's the kind of thing a well-known library (a polyfill, for instance) does
deliberately and documents loudly, precisely because an application doing it quietly is the
scenario that breaks another dependency six months later.

## Lead

> **Outcome.** Write the idiom standard for your codebase, and name the enforcement mechanism
> behind every rule in it. A rule with no mechanism is a preference, not a standard — and a
> preference decays the first time someone is in a hurry.

### Why "allowed, banned, reason recorded" beats a style guide

A style guide that says "prefer composition over inheritance" or "keep functions small" states a
value nobody disagrees with and enforces nothing. The Senior-level insight above — which idiom is
safe by default and which is a deliberate, reviewed exception — is exactly the kind of judgement
individual engineers make well in isolation and inconsistently across a team. The Lead-level
artifact is the document that turns those individual judgements into one answer, with a reason
attached, and a way to catch a violation before it merges rather than in the next review that
happens to notice.

### The idiom standard — a worked shape

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
- JavaScript/TypeScript prototype extension (`String.prototype.x = ...`) anywhere outside a
  reviewed polyfill file. Reason: the exact risk from the Senior section above — a silent,
  global, unscoped collision with another library or a future language feature.
  Enforced by: ESLint rule `no-extend-native`, CI-blocking.

## Discouraged, not banned
- Nested scope-function chains beyond two levels (Kotlin) / more than one closure-based
  transformation chained inline (Swift) / a cascade beyond four or five calls (Dart) / a mixed
  array-transform-and-side-effect chain (TypeScript). Reason: readability cost documented in
  domain 01's Mid articles; not mechanically bannable without false positives, so this is a
  review-comment norm, not a lint rule. Enforced by: code review convention, not CI.
```

The same "named mechanism, not a wiki page" principle generalizes past Kotlin and Swift without
needing five parallel worked examples: a Java shop bans `Collections.unmodifiableList` misuse or a
raw-type generic with a Checkstyle rule; a Dart team enforces its cascade-length and null-assertion
rules through `dart analyze` plus a custom lint in `analysis_options.yaml`; a TypeScript team bans
prototype extension and unchecked `as` casts through an ESLint rule set that fails CI. The
mechanism differs by toolchain; the requirement that every rule name one does not.

### Making a ban stick — the mechanism is the point

The table above deliberately names a mechanism for every enforced rule, because the failure mode
this article exists to prevent is a standard that lives only in a wiki page and a shared
understanding that erodes within a quarter as the team changes. Three mechanisms, in order of
strength:

1. **A compiler flag or language feature.** `explicitApi()`, Swift's strict concurrency mode.
   Strongest: the rule cannot be violated even accidentally, because the code doesn't compile.
2. **A CI-blocking lint rule.** `detekt`, `ktlint`, `SwiftLint`, Checkstyle/PMD for Java,
   `dart analyze` with a custom `analysis_options.yaml` rule, ESLint for TypeScript — custom
   rules where the built-in set doesn't cover a codebase-specific ban. Strong: violated code is
   caught before merge, not in review.
3. **A code review convention.** Reserved for judgement calls a lint rule cannot express without
   false positives — the "discouraged, not banned" chaining guidance above. Weakest: it depends
   on every reviewer remembering and enforcing it, which is exactly the failure mode a written
   mechanism is supposed to reduce, not eliminate entirely.

A rule that can only live at level 3 is worth including anyway — write it down, name that its
mechanism is review convention rather than tooling, and treat that honestly as its actual strength
rather than dressing it up as enforced when it is not.

### Pricing a toolchain upgrade against migration cost

The Lead-level decision is not "should we adopt Swift 6 / the newest Kotlin" — it is stating,
before starting, what the upgrade costs and what it buys, in the same units as any other technical
investment:

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

The same shape prices a Kotlin K2 compiler adoption, a Dart 3 sound-null-safety migration for a
legacy package, or a TypeScript `strict: true` flip on a codebase that shipped without it: state
the cost in engineer-days, state what bug class it closes, and cite the incidents it would have
prevented rather than arguing from principle alone.

This is the depth angle for language idioms specifically — see the Tech Lead Roadmap article for
how this connects to the wider breadth a Tech Lead needs.

## Cross-language comparison table

| | Kotlin | Java | Swift | Dart | TypeScript |
|---|---|---|---|---|---|
| Fluent configure-and-return idiom | Scope functions (`apply`, `also`) | Builder pattern or setter chain returning `this` | Method chaining returning `Self` | Cascade operator `..` | Method chaining returning `this` |
| Extend a type you don't own | Extension functions — safe | No true extension — static utility class | Extensions — safe | Extension methods — safe | Prototype extension — discouraged, risk of conflicts |
| Enforcement mechanism examples | detekt | Checkstyle or PMD | SwiftLint | `dart analyze` plus `analysis_options.yaml` | ESLint |

## Pitfalls & trade-offs

- **Mid.** Scope-function or chaining pileups that save keystrokes at the cost of a reviewer's
  working memory — if a reviewer has to trace which receiver each step in the chain refers to,
  the chain has already cost more than it saved, in any of the five languages.
- **Mid.** Treating a fluent chain as inherently more readable than the equivalent explicit
  statements — it's a net win only up to the point where the chain length exceeds what a reviewer
  can hold in their head in one pass.
- **Senior.** Reaching for JavaScript prototype extension out of habit from a Kotlin or Swift
  background, without accounting for the fact that it is the unsafe tier of the same idea, not an
  equivalent one.
- **Senior.** Dismissing Java's static-utility-class idiom as a lesser workaround rather than
  recognizing it as the real, still-common answer in a language with no extension mechanism at
  all.
- **Lead.** A standard with no enforcement column — every rule needs a named mechanism, or it's a
  preference that decays the first time someone is in a hurry.
- **Lead.** Banning something a lint rule cannot actually detect — a rule that sounds enforceable
  but isn't is worse than not writing it down, because it implies a mechanism that doesn't exist.
- **Lead.** Treating a toolchain upgrade as a binary yes/no instead of a priced decision — a
  number attached to both the migration cost and the incidents it would have prevented is what
  actually gets it scheduled.
