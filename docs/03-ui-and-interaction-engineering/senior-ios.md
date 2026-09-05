---
id: ui-senior-ios
title: Invalidation Diagnosis, Adaptive Layout & the Layout Protocol (Senior, iOS)
description: Diagnosing invalidation with identity, Equatable and _printChanges(), adaptive layout with size classes and Stage Manager, ViewModifier API design, and the Layout protocol.
tags: [ios, swiftui, layout, senior]
lang: en
status: complete
domain: 03-ui-and-interaction-engineering
band: S
platform: ios
level: Senior
sidebar_position: 4
prerequisites: [ui-mid-ios]
outcomes:
  - "Diagnose an over-invalidating view from _printChanges() and identity, and state honestly what SwiftUI cannot prove the way Compose can"
counterpart: ui-senior-android
resources:
  - title: "Reducing view updates"
    url: "https://developer.apple.com/documentation/swiftui/reducing-view-updates"
    date: "2025-06-01"
  - title: "Layout protocol"
    url: "https://developer.apple.com/documentation/swiftui/layout"
    date: "2025-06-01"
  - title: "Building layouts with stack views and Stage Manager"
    url: "https://developer.apple.com/documentation/swiftui/adjusting-the-size-of-a-view-using-geometryreader"
    date: "2024-09-01"
  - title: "ViewModifier"
    url: "https://developer.apple.com/documentation/swiftui/viewmodifier"
    date: "2025-06-01"
---

# Invalidation Diagnosis, Adaptive Layout & the Layout Protocol

> **Outcome.** Diagnose a view whose `body` re-evaluates far more often than it should, using
> `_printChanges()` and identity — and be honest, in the same breath, about what SwiftUI simply
> does not expose the way Compose's compiler report does.

## 1. Invalidation diagnosis: identity, `Equatable`, `_printChanges()`

SwiftUI re-evaluates a view's `body` when the data it reads changes, determined by structural
identity and `Equatable` comparison where applicable — there is no compiler report naming which
property caused it. The available diagnostic:

```swift
struct ProfileCard: View {
    let profile: UserProfile
    var body: some View {
        Self._printChanges() // logs which property changed and triggered this re-evaluation
        return HStack { /* ... */ }
    }
}
```

```
ProfileCard: _profile changed.
```

> [!IMPORTANT]
> This is the honest caveat this article's outcome names explicitly: `_printChanges()` tells you
> *that* a property changed and *which* one — it does not tell you, the way Compose's compiler
> report does, whether a type is structurally capable of being compared cheaply, or point at an
> inline closure as the specific unstable culprit. Diagnosing an over-invalidating SwiftUI view
> is closer to correlating `_printChanges()` output against a hypothesis than reading a report
> that states the answer directly.

A `struct` view without `Equatable` conformance is always considered "possibly changed" by
SwiftUI's default diffing when passed as a parameter through certain paths (notably explicit
`equatable()` usage or `EquatableView` wrapping) — conforming it lets SwiftUI skip re-rendering
when the value is unchanged by its own definition of equality:

```swift
struct UserProfile: Equatable {
    let id: String
    let displayName: String
    let avatarURL: URL?
}
```

## 2. Adaptive layout: size classes, split view, Stage Manager

```swift
struct AdaptiveRootView: View {
    @Environment(\.horizontalSizeClass) private var horizontalSizeClass

    var body: some View {
        if horizontalSizeClass == .compact {
            NavigationStack { ContentList() }
        } else {
            NavigationSplitView {
                ContentList()
            } detail: {
                ContentDetail()
            }
        }
    }
}
```

Stage Manager on iPadOS adds a further wrinkle beyond size class alone: a window can be resized
by the user to an arbitrary size within Stage Manager's multi-window mode, so a layout that only
switches at the two or three fixed size-class breakpoints can land on an awkward intermediate
width Stage Manager users specifically create — testing at freely-resized widths, not just the
canonical size-class breakpoints, is the practical mitigation.

## 3. `ViewModifier` and component API design

```swift
struct CardStyle: ViewModifier {
    func body(content: Content) -> some View {
        content
            .padding()
            .background(Color.appSurface)
            .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}

extension View {
    func cardStyle() -> some View { modifier(CardStyle()) }
}

// Consuming: reads like a built-in modifier, composes with any other modifier chain.
ProfileHeader(profile: profile).cardStyle()
```

The same second-consumer test from the Android article applies here: a `ViewModifier` or
component API that only the first screen's exact layout needs — a hardcoded navigation action
buried inside it, fixed spacing with no override — will not survive a second, different consumer
without being edited.

## 4. Animation and gesture composition

```swift
withAnimation(.spring(response: 0.35, dampingFraction: 0.7)) {
    isExpanded.toggle()
}

// Composed gestures: SwiftUI's gesture modifiers combine declaratively rather than
// requiring manual coordination of touch state across multiple recognizers.
DragGesture()
    .onChanged { value in offset = value.translation }
    .onEnded { _ in withAnimation(.spring()) { offset = .zero } }
```

## 5. The `Layout` protocol

Analogous to Compose's custom `Layout` — warranted when no combination of `HStack`/`VStack`/
`ZStack` expresses the needed measurement relationship:

```swift
struct EqualWidthHStack: Layout {
    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let maxWidth = subviews.map { $0.sizeThatFits(.unspecified).width }.max() ?? 0
        let height = subviews.map { $0.sizeThatFits(.unspecified).height }.max() ?? 0
        return CGSize(width: maxWidth * CGFloat(subviews.count), height: height)
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        let maxWidth = subviews.map { $0.sizeThatFits(.unspecified).width }.max() ?? 0
        for (index, subview) in subviews.enumerated() {
            let x = bounds.minX + maxWidth * CGFloat(index)
            subview.place(at: CGPoint(x: x, y: bounds.minY), proposal: proposal)
        }
    }
}
```

## Pitfalls & trade-offs

- **Expecting `_printChanges()` to name a culprit the way Compose's compiler report does.**
  Covered above — the honest limitation is part of this article's outcome, not an omission.
- **A view without `Equatable` where cheap re-render skipping would matter.** An easy, low-risk
  addition once identified, but it must be identified first — it is not the default assumption
  to reach for on every view.
- **Designing a layout against size-class breakpoints alone, ignoring Stage Manager's freely
  resizable windows.** Test at arbitrary intermediate widths, not just the two or three
  canonical breakpoints.
- **A `ViewModifier` or component that only its first call site could use.** Same second-consumer
  test as the Android article — apply it before, not after, a second screen needs it.
- **Reaching for `Layout` before checking whether stacks already express the same relationship.**
  Same trade-off as Compose's custom `Layout` — real power, real ongoing maintenance cost.
