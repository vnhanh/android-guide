---
id: ui-interview
title: UI & Interaction Engineering — Interview Questions
description: At least 8 questions per level on Compose/SwiftUI state, the four first-class UI states, recomposition and invalidation diagnosis, adaptive layout, and design-system ownership across Android and iOS.
tags: [interview, compose, swiftui, accessibility, recomposition, design-system, mid, senior, lead]
lang: en
status: complete
domain: 03-ui-and-interaction-engineering
platform: shared
band: X
level: Mid
sidebar_position: 99
kind: interview
prerequisites: []
outcomes:
  - "Answer, without notes, the core interview questions this domain's Mid, Senior and Lead articles each teach"
---

# UI & Interaction Engineering — Interview Questions

## Mid

Q: What are the "four first-class UI states" and why call them out explicitly instead of just handling data and errors ad hoc?
A: Loading, empty, error, and content — treating all four as first-class, reachable states (not just "data or an error") means a screen has a designed answer for each one instead of an accidental blank screen when data happens to be empty or slow.

Q: In Compose, what's the difference between state hoisted to a ViewModel and state kept local to a composable?
A: ViewModel-held state survives configuration changes and recomposition of the whole screen and is where anything the screen's logic needs to persist across those events belongs; purely local UI state (like whether a tooltip is expanded) that doesn't need to survive recomposition can stay in `remember` inside the composable.

Q: In SwiftUI, when do you reach for @State versus @Binding versus @Observable?
A: @State owns a value locally within one view; @Binding is a reference to state owned by a parent, letting a child both read and write it; @Observable (or the older ObservableObject) is for a reference-type model shared across multiple views that need to react to its changes.

Q: Why does list performance depend on stable keys/identity, in both Compose and SwiftUI?
A: Without a stable key/identity per item, the framework can't tell which items were reused versus newly created versus removed across a data update, so it falls back to recreating more of the list than necessary — visible as janky scrolling or lost per-item state (like scroll position or text field focus) on reorder.

Q: What does it mean for a screen to be "operable end to end with TalkBack" or VoiceOver, concretely?
A: Every interactive element has a meaningful accessible label, focus order follows a logical reading sequence, and every action reachable by touch is also reachable by the screen reader's navigation gestures — not just "the labels exist" but the whole flow is completable without sight.

Q: Why does Dynamic Type at the largest accessibility size expose bugs a normal-size test pass won't?
A: Layouts that assumed a fixed text size can clip, overlap, or truncate content that a sighted user with standard settings would never see broken — testing only at the default text size systematically misses the exact population that depends on larger text working correctly.

Q: What's the practical difference between "the app has a design system" and "the app has a component library"?
A: A component library is just reusable UI code; a design system additionally encodes the decisions behind it (spacing scale, color roles, when to use which component) so a new screen's design choices are mostly already made, not re-litigated per screen.

Q: Why is theming a design system harder than "just use the components," in practice?
A: A component built with hardcoded colors or spacing instead of theme tokens works fine until the app needs a second theme (dark mode, a white-label variant, a brand refresh), at which point every hardcoded value has to be found and fixed individually instead of the theme simply propagating.

## Senior

Q: You have a Compose screen recomposing every frame with no obvious cause — how do you actually diagnose it, not guess?
A: Read the Compose compiler report to find which parameter is marked unstable, then trace where that unstable type is constructed and passed down — a lambda capturing a var, a mutable collection type, or a class missing stability inference are the usual suspects, and the report names the specific parameter, not just "something is unstable."

Q: What's the SwiftUI equivalent diagnostic to Compose's recomposition counts, and what's the honest limitation compared to Compose?
A: `_printChanges()` on a view shows what triggered its last body re-evaluation, and Equatable conformance lets you control identity-based invalidation — but SwiftUI has no compiler-enforced stability contract the way Compose does, so diagnosis relies more on manual inspection and less on a report that names the exact unstable parameter.

Q: What's the actual difference between designing for "a phone" and designing for adaptive layout across window size classes?
A: A phone-only layout assumes one fixed width class; adaptive layout means the same screen's structure (single column vs list-detail, navigation placement) changes based on the available width, which on both platforms is now a routine case (foldables and split-screen on Android, iPad and Stage Manager on iOS), not an edge case.

Q: What makes a component API "survive a second consumer," and why is that the actual bar for calling a component reusable?
A: The first consumer's exact needs are baked into almost any component by default; a second, different consumer either fits cleanly through the existing API's real parameters (not a growing pile of one-off flags) or reveals that the component was never actually generalized, just extracted.

Q: When is building a custom layout (Compose's Layout, SwiftUI's Layout protocol) actually justified versus over-engineering?
A: When the arrangement genuinely can't be expressed by composing the standard layout primitives (Row/Column/Box or HStack/VStack/ZStack combinations) without significant hacks — reaching for a custom layout for something an existing primitive combination could express is solving a problem that doesn't exist yet.

Q: What's the actual cost of a gesture or motion implementation that "mostly works" but has quality issues (janky, non-interruptible, wrong easing)?
A: It reads as unpolished or broken to users even when functionally correct — motion and gesture quality are one of the few areas where "it technically works" and "it feels right" are genuinely different bars, and users notice the gap even without being able to articulate why.

Q: Why can't accessibility be fully verified by an automated test suite alone?
A: Automated checks catch structural issues (missing labels, contrast ratios) but can't verify that the actual interaction flow makes sense navigating by screen reader or switch control — a real assistive-technology pass by someone using the actual tool is the only way to catch a flow that technically has all its labels but doesn't work as an experience.

Q: How do you decide whether a recomposition/invalidation "fix" actually worked, rather than just looking different?
A: Measure it — recomposition counts before and after in Compose, `_printChanges()` output before and after in SwiftUI — a fix that "feels smoother" without a measured before/after could just as easily be a different problem being hidden, not solved.

## Lead

Q: How do you write a UI standard so a design review disagreement is resolved by pointing at it, not by whoever in the room has the most seniority?
A: Make the standard specific and citable — not "keep things consistent" but a named rule ("primary actions use this exact button style at this size") a Mid-level engineer can point to and hold their position in review with, the same way a Lead would cite it.

Q: What's the actual legal/business floor under an accessibility standard, beyond "it's the right thing to do"?
A: In many jurisdictions, digital accessibility is legally mandated for apps above a certain reach or in certain industries (ADA-adjacent requirements in the US, EN 301 549 in the EU, and similar standards elsewhere) — treating WCAG conformance as optional polish rather than a compliance floor understates the actual risk of skipping it.

Q: How do you arbitrate between a design team's ambition and an engineering team's delivery cost, without it becoming a recurring standoff?
A: Price the ambitious version's actual engineering cost explicitly and let the design and product stakeholders make an informed trade-off against that number, rather than the decision being made implicitly by whichever side has more organizational leverage in a given meeting.

Q: When is a custom component (instead of using or extending the platform/design-system default) actually the right call, versus a trap?
A: It's justified when the custom behavior is core to the product's actual differentiation and the cost of building and maintaining it (across future OS updates, accessibility, and platform behavior changes) is explicitly accepted; it's a trap when it's built for a one-off visual preference and now needs to be kept in sync with every future platform UI change no standard component would have required.

Q: How do you make a design-system contribution from any team actually get adopted, rather than each team building its own version of the same component?
A: A clear, low-friction contribution path (a request process for missing components, or an explicit "you can add it yourself under these guidelines") — teams reach for building their own version specifically when using the shared system feels slower or more restrictive than just doing it themselves.

Q: How do you know whether the design system itself has become the bottleneck, rather than the thing that speeds teams up?
A: Track how often teams work around it (custom one-off components appearing outside the system) versus how often they request additions to it — a rising rate of workarounds is the actual signal, not a subjective sense that "adoption feels lower."

Q: What's the mechanism that keeps an accessibility standard from decaying into "the one senior engineer who cares checks for it sometimes"?
A: A CI-enforced automated accessibility check (contrast, missing labels) for what's mechanically checkable, plus a required assistive-technology pass in the release checklist for what isn't — without both, the standard's actual enforcement depends entirely on which reviewer happens to be assigned.

Q: How do you price a "we should redesign this flow" proposal against its actual expected impact, rather than by design conviction alone?
A: State the current flow's measured problem (drop-off rate, support ticket volume, a specific usability metric) and the redesign's expected engineering cost, so the decision to proceed is a comparison of two numbers rather than a judgment call resting on whoever is most persuasive about the redesign's merits.
