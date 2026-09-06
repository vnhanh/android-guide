---
id: ui-mid-ios
title: SwiftUI State, the Four States & Dynamic Type (Mid, iOS)
description: @State/@Binding/@Observable and where each belongs, the four-state discipline, List identity, VoiceOver, and surviving Dynamic Type at the largest size.
tags: [ios, swiftui, accessibility, mid]
lang: en
status: complete
domain: 03-ui-and-interaction-engineering
band: M
platform: ios
level: Mid
sidebar_position: 2
topic: ui-mid
leaf: iOS
prerequisites: [fundamentals-null-safety-kotlin, fundamentals-oop-solid-kotlin, platform-process-lifecycle-ios, platform-background-work-ios, platform-permissions-ios]
outcomes:
  - "Ship a screen whose four states are all reachable in a test, and which survives Dynamic Type at the largest accessibility size without clipping"
counterpart: ui-mid-android
resources:
  - title: "Managing model data in your app"
    url: "https://developer.apple.com/documentation/swiftui/managing-model-data-in-your-app"
    date: "2025-06-01"
  - title: "Supporting Dynamic Type"
    url: "https://developer.apple.com/documentation/swiftui/text/dynamictypesize(_:)"
    date: "2025-06-01"
  - title: "VoiceOver — Accessibility"
    url: "https://developer.apple.com/accessibility/voiceover/"
    date: "2024-09-01"
  - title: "ScrollView and List identity"
    url: "https://developer.apple.com/documentation/swiftui/list"
    date: "2025-06-01"
---

# SwiftUI State, the Four States & Dynamic Type

> **Outcome.** Ship a screen whose four states — loading, empty, error, content — are all
> reachable in a test, and which survives Dynamic Type at the largest accessibility text size
> without clipped or truncated content.

## 1. `@State`, `@Binding`, `@Observable` — where each belongs {concept=ui-mid/state-management}

```swift
@Observable
final class ProfileViewModel {
    private(set) var state: ProfileUiState = .loading // owned, shared across the view hierarchy
}

struct ProfileScreen: View {
    let viewModel: ProfileViewModel // reads @Observable state; SwiftUI tracks property access

    var body: some View {
        ProfileContent(state: viewModel.state)
    }
}

struct SearchField: View {
    @State private var query = ""       // owned locally, this view's own transient UI state
    @Binding var isEditing: Bool         // owned by a PARENT, this view only reads/writes through it

    var body: some View {
        TextField("Search", text: $query, onEditingChanged: { isEditing = $0 })
    }
}
```

> [!NOTE]
> The rule that keeps this simple: `@State` is for state that belongs to *this* view and dies
> with it (a text field's draft text, an expanded/collapsed flag). `@Binding` is for state a
> parent owns that this view needs to read and write. `@Observable` is for state that outlives
> any single view and is shared — a view model, a repository-backed model. Reaching for
> `@Observable` for a view's own transient toggle works but pays an unnecessary indirection; the
> reverse mistake — `@State` for something a parent screen actually needs to react to — is the
> one that produces a bug, not just a style nit.

## 2. Four states, never three {concept=ui-mid/four-states}

```swift
enum ProfileUiState {
    case loading
    case empty
    case error(String)
    case content(UserProfile)
}

struct ProfileContent: View {
    let state: ProfileUiState
    var body: some View {
        switch state {
        case .loading: ProgressView()
        case .empty: ContentUnavailableView("No profile yet", systemImage: "person.slash")
        case .error(let message): ContentUnavailableView(message, systemImage: "exclamationmark.triangle")
        case .content(let profile): ProfileDetailView(profile: profile)
        }
    }
}
```

`switch` over the enum is exhaustive — adding a fifth case without handling it is a compile
error, which is the concrete enforcement mechanism behind "never three states": the type system
will not let a developer forget one, the way an `if`/`else if` chain silently would.

## 3. `List`, `LazyVStack`, and stable identity {concept=ui-mid/list-identity}

```swift
List(users) { user in         // User must conform to Identifiable, or pass id: \.id explicitly
    UserRow(user: user)
}
```

> [!WARNING]
> `List`/`LazyVStack` without a stable, unique identity per row — using array index as identity,
> or an `Identifiable` conformance keyed on a mutable field — causes SwiftUI to lose track of
> which view corresponds to which data on reorder or mutation, producing visible glitches
> (wrong row animating, state attached to the wrong row) that only appear once the list actually
> changes, not on first render.

## 4. VoiceOver, Dynamic Type, and the fixed-height-text failure {concept=ui-mid/accessibility}

```swift
Text("Delete")
    .accessibilityLabel("Delete \(user.displayName)") // read what VoiceOver announces, not
                                                        // just what's visually printed
```

```swift
// THE FAILURE: a fixed-height container clips text at the largest Dynamic Type size,
// which a sighted developer testing at the default text size will never see.
VStack {
    Text(title).frame(height: 20) // clips instead of growing at accessibility text sizes
}

// FIX: let the container size to its content; use minimumScaleFactor only as a last resort.
VStack {
    Text(title) // no fixed height — grows with the text
}
```

> [!IMPORTANT]
> This article's outcome is specific and checkable for exactly this reason: build and run with
> Settings → Accessibility → Display & Text Size → Larger Text set to its maximum, on every
> screen shipped. A screen that looks fine at the default size and clips or truncates at the
> largest size has not actually been tested for this outcome — it has been tested at one
> arbitrary point on a continuum the OS explicitly supports scaling across.

## 5. Theming and tokens {concept=ui-mid/theming}

```swift
extension Color {
    static let appPrimary = Color("AppPrimary")     // asset-catalog-backed, adapts to light/dark
    static let appOnSurface = Color("AppOnSurface")
}

Text("Total")
    .foregroundStyle(Color.appOnSurface)
    .font(.title2) // semantic text style — scales with Dynamic Type automatically,
                    // unlike a fixed .system(size: 20) point value
```

## Pitfalls & trade-offs

- **Reaching for `@Observable` for a view's own local, transient state.** Not wrong, just an
  unnecessary indirection; reserve it for state that genuinely outlives one view.
- **Collapsing empty into a special case of loading or content.** Same failure as the Android
  article — it needs its own case, its own copy, its own recovery affordance.
- **Keying a `List` by array index or a mutable field.** Covered above — the bug only appears
  once the list changes, which is exactly the case a static first-render test misses.
- **A fixed-height text container.** The single most common Dynamic Type failure, and invisible
  at the default text size — test at the largest accessibility size explicitly, every time.
- **A hardcoded point-size font instead of a semantic text style.** Works at the default size,
  silently stops scaling with the user's chosen text size — which defeats the accessibility
  setting entirely without any visible error during development.
