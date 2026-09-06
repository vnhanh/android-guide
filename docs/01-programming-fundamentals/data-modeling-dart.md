---
id: fundamentals-data-modeling-dart
title: Data Modeling in Dart — Hand-Rolled Equality vs equatable and freezed
description: Why Dart has no built-in data-class generation at all, and the real trade-off between hand-writing equals/hashCode/copyWith and adopting equatable or freezed.
tags: [data-modeling, equality, immutability, dart, mid, senior]
lang: en
status: complete
domain: 01-programming-fundamentals
platform: shared
band: X
level: Mid
sidebar_position: 3
topic: data-modeling
leaf: Dart
prerequisites: []
outcomes:
  - "Give a Dart value object structural equality and a copyWith operation, hand-rolled or via a package"
  - "Decide when freezed's codegen step is worth adopting over hand-rolling"
resources:
  - title: "freezed — pub.dev"
    url: "https://pub.dev/packages/freezed"
    date: "2025-04-01"
---

# Data Modeling in Dart — Hand-Rolled Equality vs equatable and freezed

Two identical twins are not the same person — but for most of what a program needs to do with a
`UserProfile`, that distinction is irrelevant. If two objects have the same `id`, the same
`displayName`, the same `avatarUrl`, you want `==` to say "equal." Dart gives you nothing for this
out of the box — every bit of it is a deliberate choice.

## Mid {concept=data-modeling/equality}

**Interview question: "How do you give a value object structural equality instead of default
reference equality in Dart?"**

**Dart has no built-in data-class generation at all.** The language itself gives you nothing —
idiomatic Dart either hand-writes `equals`/`hashCode`/`toString`/`copyWith` (the common naming
convention, mirroring Kotlin's `copy()` as `copyWith`), or reaches for a code-generation package.

```dart
class UserProfile {
  final String id;
  final String displayName;
  final String? avatarUrl;
  UserProfile(this.id, this.displayName, this.avatarUrl);

  @override
  bool operator ==(Object other) =>
      other is UserProfile && id == other.id && displayName == other.displayName;

  @override
  int get hashCode => Object.hash(id, displayName);
}
```

**Follow-up an interviewer asks next:** "What's the same classic bug from Java that applies here
too?" Overriding `==` without overriding `hashCode` to match — the same equals/hashCode contract
break, with the same consequence: two "equal" objects landing in different `HashSet` buckets.

**Pitfall at this level:** hand-writing `==` for a model with several fields and forgetting to
include one of them — the comparison silently treats two genuinely different objects as equal for
the field that was left out.

## Senior {concept=data-modeling/copy-gap}

**Interview question: "When do you reach for `equatable` or `freezed` instead of hand-rolling?"**

The two real options: **`equatable`**, which gives you structural equality only (you still write
your own `copyWith`), or **`freezed`**, which generates the full data-class experience —
`equals`, `hashCode`, `toString`, and `copyWith` — plus support for sealed unions. In practice,
`freezed` generates the same `equals`/`hashCode`/`copyWith` shape Kotlin gives natively; you're
choosing whether to accept the codegen step in exchange for not hand-writing that boilerplate per
model.

```dart
@freezed
class UserProfile with _$UserProfile {
  const factory UserProfile(String id, String displayName, String? avatarUrl) = _UserProfile;
}
// equals(), hashCode, toString(), and copyWith() are all generated
```

**Follow-up:** "So when do you reach for a codegen package versus hand-roll it?" Roughly: a
handful of simple models with few fields, hand-rolling is fine and keeps a dependency and a
build-step out of the project. Once a codebase has dozens of these models, or needs sealed unions
alongside them (`freezed`'s other selling point), the codegen step pays for itself in boilerplate
avoided and in one canonical place the equality/copy contract can't drift out of sync with the
fields.

**Pitfall at this level:** reaching for `freezed` reflexively on a handful of trivial models — the
build-step and generated-file overhead can cost more than the boilerplate it removes; the decision
should scale with how many models and how much they need (unions, nested equality), not be a
default.

## Cross-language comparison

See the cross-language cheat sheet article for how Kotlin, Java, Swift and TypeScript each answer
the same two questions — or switch the language tab above to read this same topic in another
language directly.

## Pitfalls & trade-offs

- **Mid:** overriding `==` without `hashCode` to match — the same Java-style equals/hashCode
  contract break, with the same consequence for `HashSet`/`HashMap` correctness.
- **Mid:** hand-writing `==` and forgetting to include a field — a silent, hard-to-spot correctness
  bug rather than a compile error.
- **Senior:** reaching for `freezed`'s codegen reflexively on a handful of trivial models — the
  build-step overhead should scale with actual model count and complexity, not be a default choice.
