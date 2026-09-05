---
id: ui-lead
title: The UI Standard & Design-System Ownership (Lead, Android + iOS)
description: UI architecture and design-system ownership across teams, the accessibility standard and its legal floor, arbitrating design ambition against cost, and when a custom component is a trap.
tags: [android, ios, lead, design-system, accessibility]
lang: en
status: complete
domain: 03-ui-and-interaction-engineering
band: L
platform: shared
level: Lead
sidebar_position: 5
prerequisites: [ui-senior-android, ui-senior-ios]
outcomes:
  - "Write the UI standard so a design review can be resolved by pointing at it rather than by seniority"
resources:
  - title: "WCAG 2.2"
    url: "https://www.w3.org/TR/WCAG22/"
    date: "2025-01-01"
  - title: "Material Design 3 — foundations"
    url: "https://m3.material.io/foundations"
    date: "2025-01-01"
  - title: "Human Interface Guidelines"
    url: "https://developer.apple.com/design/human-interface-guidelines"
    date: "2025-06-01"
---

# The UI Standard & Design-System Ownership

> **Outcome.** Write the UI standard so a design review disagreement is resolved by pointing at
> a written rule, not by whoever in the room has the most seniority.

## Why "point at the standard" is the actual bar

A design review that resolves by seniority produces a decision that only holds while that
person is in the room — it teaches nothing to the team and repeats the same argument next
sprint with a different reviewer. A written standard, named and specific enough to cite, is what
lets a Mid-level engineer hold their own position in review by pointing at the same document a
Lead would cite. This is the direct organisational counterpart to the Senior-level "component
API that survives a second consumer" test — a standard is the API for design *decisions*.

## The standard — a worked shape

```markdown
# UI standard — MobileApp

## Design-system ownership
- Component tokens (color, spacing, typography scale) are owned by Design, versioned in
  the shared token repository, consumed by both platforms via generated Compose/SwiftUI
  token files — never hand-copied hex values. A screen with a hardcoded color is a lint
  failure, not a style nit (see domain 01's Lead article on enforcement mechanisms).
- New component proposals go through a joint Design+Engineering review before a second
  screen depends on them — the second-consumer test from this domain's Senior articles,
  applied at the design-system level instead of the single-component level.

## Accessibility standard
- WCAG 2.2 AA is the floor, not the target — required by law in several markets this app
  ships in (see the legal note below), and treated as a release-blocking check, not an
  aspiration.
- Every screen ships with the four-state test (domain 03 Mid) exercised under TalkBack/
  VoiceOver, and at the largest Dynamic Type / font-scale setting, before merge — not as a
  separate accessibility-team pass after the fact.
- Legal floor: this is not a design preference. Several jurisdictions this app operates in
  treat inaccessible core functionality as a legal compliance risk, not a UX quality
  question — cite the specific requirement (ADA Title III precedent in the US, EN 301 549
  in the EU) rather than "accessibility is good practice" when defending budget for it.

## Custom component vs platform default
- Default to the platform component (Material on Android, the equivalent SwiftUI/UIKit
  control on iOS) unless a named, specific requirement the platform component cannot meet
  is stated in the proposal.
- A custom component inherits NONE of the platform's free accessibility behaviour,
  Dynamic Type scaling, or OS-version compatibility — every one of those has to be
  re-implemented and re-tested by this team, forever, as the OS evolves. State this cost
  explicitly against the specific gap the platform component has, before approving.
```

## Arbitrating design ambition against cost, as a peer

The Lead-level negotiation is not "engineering says no to Design" — it is stating cost and trade-
off in terms Design can act on, the same discipline domain 01's Lead article applies to a
toolchain upgrade:

```markdown
## Design proposal: custom card-flip transition on the profile screen

Design's ask: a 3D flip animation on tap, matching a specific competitor app.
Cost: ~8 engineer-days on Android (custom Layout + matrix transform + testing across
API levels), ~5 on iOS (custom Layout + 3D transform), plus ongoing maintenance as each
platform's animation APIs evolve — this is new custom-component surface area per the
policy above, not a token or variant of an existing component.
Alternative offered: a 2D flip using a stock scale+fade transition, ~1 day per platform,
using existing animation primitives — preserves the "something changed on tap" feel
without the custom-component cost or its ongoing maintenance tax.
Decision: alternative accepted for this release; the full 3D version is filed as a
future proposal contingent on a specific measured engagement lift, not built speculatively.
```

## Pitfalls & trade-offs

- **A design-system token change made by hand-editing generated files.** Breaks the moment
  Design regenerates them; the token pipeline exists specifically so this can't drift silently.
- **Treating accessibility as a pre-release audit pass instead of part of the four-state test.**
  Bugs found at that stage are expensive to fix and late enough to threaten a ship date — the
  Mid-level articles' TalkBack/VoiceOver and Dynamic Type checks are meant to run continuously,
  not once at the end.
- **Approving a custom component without stating what platform-default gap it closes.** Every
  custom component is a standing liability against every future OS release — state the specific
  requirement it satisfies so the cost can be weighed against it honestly, not approved by
  default because the mockup looked good.
- **Arbitrating design ambition by saying no instead of pricing the alternative.** The worked
  example above offers a cheaper path to most of the same value — a flat "no" without an
  alternative reads as engineering blocking Design rather than engineering and Design solving
  the same problem together.
