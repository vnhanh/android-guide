---
id: ui-senior-android
title: Recomposition Diagnosis, the Stability Contract & Adaptive Layout (Senior, Android)
description: Diagnosing recomposition with the stability contract, window size classes and list-detail patterns, component API design, motion and gesture quality, and custom layout.
tags: [android, compose, recomposition, adaptive-ui, senior]
lang: en
status: complete
domain: 03-ui-and-interaction-engineering
band: S
platform: android
level: Senior
sidebar_position: 3
prerequisites: [ui-mid-android]
outcomes:
  - "Take a screen recomposing every frame, find the unstable parameter from the compiler report, prove the fix with recomposition counts"
counterpart: ui-senior-ios
resources:
  - title: "Jetpack Compose stability"
    url: "https://developer.android.com/develop/ui/compose/performance/stability"
    date: "2025-04-01"
  - title: "The Compose compiler report"
    url: "https://developer.android.com/develop/ui/compose/performance/stability/diagnose"
    date: "2025-04-01"
  - title: "Support different screen sizes — window size classes"
    url: "https://developer.android.com/develop/ui/compose/layouts/adaptive/use-window-size-classes"
    date: "2025-04-01"
  - title: "Custom layouts in Compose"
    url: "https://developer.android.com/develop/ui/compose/layouts/custom"
    date: "2024-11-01"
---

# Recomposition Diagnosis, the Stability Contract & Adaptive Layout

> **Outcome.** Take a screen that recomposes every frame, find the specific unstable parameter
> from the Compose compiler report, and prove the fix — not assert it — with a before-and-after
> recomposition count.

## 1. Recomposition diagnosis and the stability contract

Compose skips recomposing a composable whose inputs are all **stable** and **unchanged** — a
type is stable if the compiler can prove its public properties never change without notifying
Compose, or it's explicitly marked so.

```kotlin
// UNSTABLE by inference: a `var` property, or a type from a module the compiler
// can't inspect (a raw List, which is an interface — MutableList could be behind it).
data class ProfileUiState(
    var lastRefreshed: Long,     // var, not val — breaks stability inference
    val tags: List<String>,      // List is an INTERFACE — not provably immutable
)

// STABLE: val-only, and an immutable collection type the compiler can actually verify.
@Immutable
data class ProfileUiState(
    val lastRefreshed: Long,
    val tags: ImmutableList<String>, // from kotlinx.collections.immutable
)
```

The compiler report (`freeCompilerArgs += "-P", "...ComposeCompilerReportsDestination"`) names,
per composable, which parameters are stable and which are not — this is the artifact the
outcome asks for, not a guess from reading the code.

```
restartable skippable scheme("[androidx.compose.ui.UiComposable]") fun ProfileCard(
  stable state: ProfileUiState
  unstable onEdit: Function0<Unit>   // <-- this is the recomposition-every-frame culprit
)
```

> [!IMPORTANT]
> A lambda parameter is only stable if the compiler can prove it doesn't change across
> recompositions — a lambda created inline at the call site (`ProfileCard(state, onEdit = {
> viewModel.edit() })`) is a **new lambda instance every recomposition** of the caller, which
> Compose sees as "changed," forcing `ProfileCard` to recompose even though nothing it actually
> displays changed. Hoisting the lambda to a `remember`-backed reference, or passing a stable
> method reference, is the fix the compiler report is pointing at.

```kotlin
@Composable
fun ProfileScreen(viewModel: ProfileViewModel) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    // Stable across recomposition: same reference every time, unlike an inline lambda.
    ProfileCard(state = state, onEdit = viewModel::edit)
}
```

Proving the fix: enable Compose's recomposition-count layout inspector (or a debug overlay
counting `SideEffect` calls per composable) before and after, on the same interaction — the
outcome is checkable specifically because it is a number, not an impression that things "feel
smoother."

## 2. Adaptive UI: window size classes, list-detail, foldable postures

```kotlin
@Composable
fun MainAdaptiveApp(windowSizeClass: WindowSizeClass) {
    when (windowSizeClass.widthSizeClass) {
        WindowWidthSizeClass.Compact -> BottomNavLayout()
        WindowWidthSizeClass.Medium -> NavigationRailLayout()
        WindowWidthSizeClass.Expanded -> NavigationDrawerTwoPaneLayout()
    }
}

@Composable
fun AdaptiveListDetailScreen(isExpanded: Boolean, items: List<Item>, selectedItem: Item?, onSelect: (Item) -> Unit) {
    if (isExpanded) {
        Row(modifier = Modifier.fillMaxSize()) {
            ListPane(items, onSelect, Modifier.weight(1f))
            DetailPane(selectedItem, Modifier.weight(2f))
        }
    } else {
        SinglePaneNavigation(items, selectedItem, onSelect)
    }
}
```

A foldable's **posture** (flat, half-open/tabletop) is a further axis beyond width alone — a
half-open posture typically wants the fold treated as a natural split point (list above, detail
below, or vice versa) rather than the same two-pane layout a flat expanded tablet would use.

## 3. Component APIs that survive a second consumer

A component designed against exactly one call site tends to leak that call site's assumptions
into its API. The Senior-level test: could a second, different screen consume this without
modifying it?

```kotlin
// WEAK: hardcodes this screen's specific navigation action and exact spacing.
@Composable
fun ProfileHeader(profile: UserProfile) {
    Row(Modifier.padding(16.dp)) {
        Avatar(profile.avatarUrl)
        Text(profile.displayName)
        IconButton(onClick = { navController.navigate("edit") }) { Icon(Icons.Default.Edit, null) }
    }
}

// BETTER: no navigation dependency, spacing is a parameter with a sensible default,
// trailing content is a slot instead of a hardcoded button.
@Composable
fun ProfileHeader(
    profile: UserProfile,
    modifier: Modifier = Modifier,
    contentPadding: PaddingValues = PaddingValues(16.dp),
    trailingContent: @Composable () -> Unit = {},
) {
    Row(modifier.padding(contentPadding)) {
        Avatar(profile.avatarUrl)
        Text(profile.displayName)
        trailingContent()
    }
}
```

## 4. Motion, gesture quality, and custom layout

```kotlin
// A spring-based animation feels physically grounded; a fixed-duration tween
// often reads as mechanical for a drag-and-release interaction specifically.
val offsetX by animateFloatAsState(
    targetValue = if (isDragging) dragOffset else 0f,
    animationSpec = spring(dampingRatio = Spring.DampingRatioMediumBouncy),
)
```

A custom `Layout` is warranted when no combination of `Row`/`Column`/`Box` expresses the
measurement relationship needed — e.g. sizing several children to the width of the widest one,
which requires a two-pass measurement no stock layout composable performs:

```kotlin
@Composable
fun EqualWidthRow(content: @Composable () -> Unit) {
    Layout(content) { measurables, constraints ->
        val placeables = measurables.map { it.measure(constraints) }
        val maxWidth = placeables.maxOf { it.width }
        layout(maxWidth * placeables.size, placeables.maxOf { it.height }) {
            placeables.forEachIndexed { i, p -> p.placeRelative(x = maxWidth * i, y = 0) }
        }
    }
}
```

## Pitfalls & trade-offs

- **Trusting "it feels less janky" instead of the compiler report and a measured count.** The
  outcome is stated as a number for a reason — subjective smoothness is not reviewable evidence.
- **An inline lambda passed to a frequently-recomposing child.** Covered above — the single most
  common cause of an otherwise-stable composable recomposing anyway.
- **A component whose API only a demo call site could satisfy.** The second-consumer test above
  is cheap to run before merging and expensive to fix after three screens depend on the narrow
  version.
- **Treating a foldable's half-open posture as just a narrower expanded width.** It's a distinct
  layout decision point, not a point on the same width continuum as phone/tablet.
- **Reaching for a custom `Layout` before checking if a combination of stock composables already
  expresses the same measurement relationship.** Custom layout is real power at a real
  maintenance cost — worth it only when the stock building blocks genuinely cannot do it.
