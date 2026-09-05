---
id: jetpack-compose-and-adaptive-ui
title: Jetpack Compose State & Adaptive UI Architecture
description: Comprehensive guide to rememberUpdatedState, Window Size Classes, List-Detail foldable patterns, and responsive UI composition.
sidebar_position: 3
tags: [Android, Compose, UI, Adaptive Layouts, Foldables]
level: Senior
lang: en
status: complete
---

# Jetpack Compose State & Adaptive UI Architecture

## 🔄 1. Advanced State Management & `rememberUpdatedState`

When passing callbacks to long-lived Compose effects (`LaunchedEffect`), recompositions might pass new lambda references while the effect keeps referencing the stale initial lambda capture.

```kotlin
@Composable
fun ComposableWithCallback(onTimeout: () -> Unit) {
    // Captures the latest onTimeout lambda without restarting LaunchedEffect
    val currentOnTimeout by rememberUpdatedState(onTimeout)

    LaunchedEffect(Unit) {
        delay(5000)
        currentOnTimeout() // Invokes updated reference safely
    }
}
```

---

## 📱 2. Responsive & Adaptive UI Architecture

### Window Size Classes
To support phones, foldables, and tablets seamlessly, UI architecture should categorize window dimensions into standard breakpoints:

- **Compact**: Standard phones in portrait (< 600dp width).
- **Medium**: Foldables unfolded or mini tablets (600dp - 840dp width).
- **Expanded**: Tablets, desktop mode, large foldables (> 840dp width).

```kotlin
@Composable
fun MainAdaptiveApp(windowSizeClass: WindowSizeClass) {
    when (windowSizeClass.widthSizeClass) {
        WindowWidthSizeClass.Compact -> BottomNavLayout()
        WindowWidthSizeClass.Medium -> NavigationRailLayout()
        WindowWidthSizeClass.Expanded -> NavigationDrawerTwoPaneLayout()
    }
}
```

### List-Detail Pattern for Large Screens
```kotlin
@Composable
fun AdaptiveListDetailScreen(
    isExpanded: Boolean,
    items: List<Item>,
    selectedItem: Item?,
    onSelect: (Item) -> Unit
) {
    if (isExpanded) {
        Row(modifier = Modifier.fillMaxSize()) {
            ListPane(items = items, onSelect = onSelect, modifier = Modifier.weight(1f))
            DetailPane(item = selectedItem, modifier = Modifier.weight(2f))
        }
    } else {
        SinglePaneNavigation(items = items, selectedItem = selectedItem, onSelect = onSelect)
    }
}
```
