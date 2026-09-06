---
id: ui-mid-android
title: Compose State, the Four States & Accessible Lists (Mid, Android)
description: Compose state and UDF, loading/empty/error/content as four first-class states, list performance, TalkBack accessibility, and theming a design system.
tags: [android, compose, ui, accessibility, mid]
lang: en
status: complete
domain: 03-ui-and-interaction-engineering
band: M
platform: android
level: Mid
sidebar_position: 1
prerequisites: [fundamentals-type-system-and-null-safety, fundamentals-oop-and-solid-in-practice, platform-process-lifecycle-and-death, platform-background-work-and-scheduling, platform-permissions-and-entry-points]
outcomes:
  - "Ship a screen whose four states are all reachable in a test, and which is operable end to end with TalkBack"
counterpart: ui-mid-ios
resources:
  - title: "Thinking in Compose — state and UDF"
    url: "https://developer.android.com/develop/ui/compose/mental-model"
    date: "2025-04-01"
  - title: "Lists and grids — keys and performance"
    url: "https://developer.android.com/develop/ui/compose/lists"
    date: "2025-04-01"
  - title: "Accessibility in Compose"
    url: "https://developer.android.com/develop/ui/compose/accessibility"
    date: "2025-04-01"
  - title: "Predictive back gesture"
    url: "https://developer.android.com/guide/navigation/custom-back/predictive-back-gesture"
    date: "2024-11-01"
---

# Compose State, the Four States & Accessible Lists

> **Outcome.** Ship a screen whose four states — loading, empty, error, content — are all
> reachable in a test, and which a TalkBack user can operate end to end without sighted help.

## 1. Compose state, `remember`, and unidirectional data flow

`remember` survives recomposition but not configuration change or process death; state hoisted
into a `ViewModel` survives both. The UDF shape that keeps a screen predictable: state flows
down, events flow up, and a composable never mutates state it doesn't own.

```kotlin
@Composable
fun ProfileScreen(viewModel: ProfileViewModel = viewModel()) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    ProfileContent(state = uiState, onRetry = viewModel::retry)
}

@Composable
fun ProfileContent(state: ProfileUiState, onRetry: () -> Unit) {
    // Stateless: reads state, emits events. Every dependency is a parameter,
    // which is what makes this composable previewable and testable in isolation.
}
```

`rememberUpdatedState` solves a specific, real bug: a long-lived effect (`LaunchedEffect`)
captures whatever lambda was current when it started, not the latest one passed on recomposition.

```kotlin
@Composable
fun TimeoutBanner(onTimeout: () -> Unit) {
    val currentOnTimeout by rememberUpdatedState(onTimeout)
    LaunchedEffect(Unit) {
        delay(5000)
        currentOnTimeout() // always the latest lambda, without restarting the delay
    }
}
```

## 2. Four states, never three

```kotlin
sealed interface ProfileUiState {
    data object Loading : ProfileUiState
    data object Empty : ProfileUiState
    data class Error(val message: String) : ProfileUiState
    data class Content(val profile: UserProfile) : ProfileUiState
}
```

> [!IMPORTANT]
> "Empty" is not a special case of "content" — a screen with a genuinely empty result (a search
> with no matches, a list with nothing in it yet) needs its own explicit state with its own copy
> and its own recovery action, or it silently renders as either a blank screen (looks broken) or
> a loading spinner that never resolves (looks stuck). A screen with only loading/error/content
> has an empty state; it just hasn't been designed yet, and a reviewer should be able to ask "what
> does this render for zero results" and get an actual answer.

## 3. Lists: keys and scroll performance

```kotlin
LazyColumn {
    items(
        items = users,
        key = { user -> user.id } // WITHOUT this, Compose keys by position — reordering
                                   // or inserting an item recomposes and re-measures
                                   // every item after the change point, not just the
                                   // one that actually moved.
    ) { user ->
        UserRow(user)
    }
}
```

## 4. Accessibility: labels, touch targets, TalkBack traversal

```kotlin
IconButton(
    onClick = onDelete,
    modifier = Modifier
        .size(48.dp) // minimum recommended touch target — smaller is a real usability
                      // and accessibility failure, not just a style nitpick
        .semantics { contentDescription = "Delete ${user.displayName}" },
) {
    Icon(Icons.Default.Delete, contentDescription = null) // described by the parent instead
}
```

> [!WARNING]
> An icon-only button with no `contentDescription` reads to TalkBack as "button" — useless.
> Testing "does this screen work" without turning on TalkBack (Settings → Accessibility) and
> navigating it with swipe gestures alone leaves this class of bug entirely unfound; it is not
> visible in a sighted manual test pass at all.

## 5. Theming and consuming a design system

```kotlin
@Composable
fun AppTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = if (isSystemInDarkTheme()) AppDarkColors else AppLightColors,
        typography = AppTypography,
        content = content,
    )
}

// Consuming: read tokens from the theme, never hardcode a raw color/dp value in a screen.
Text(text = "Total", color = MaterialTheme.colorScheme.onSurface, style = MaterialTheme.typography.titleMedium)
```

## Platform UI standards worth building in from the start

- **Predictive back**: registering for the system's predictive-back callback lets the OS show a
  live preview of the destination during the gesture — a real, user-visible difference from an
  abrupt navigation pop, and a required target behaviour on current Android versions rather than
  an optional polish item.
- **Edge-to-edge display**: drawing under the system status/navigation bars is the default on
  current Android versions; a screen not designed for it clips content or shows an unstyled
  system bar, which reads as an unfinished, dated-looking app.
- **Configuration-change preservation**: scroll position and active input text should survive
  rotation and multi-window resize without visible reset — the direct, checkable proof that
  state hoisting (section 1) was actually done correctly for this screen.

## Pitfalls & trade-offs

- **Collapsing empty into a special case of content or loading.** Covered above — it needs its
  own state, its own copy, and its own test.
- **A `LazyColumn` with no `key`.** Silent performance cost that only shows up once the list is
  reordered or mutated, not on first render — profile it with the recomposition counter rather
  than assuming a static test list would have caught it.
- **An icon button with no accessible label.** Invisible in a sighted click-through test; only a
  TalkBack pass or an automated accessibility check catches it before a real user does.
- **Reaching for a raw color or dp value instead of a theme token.** Works today, breaks the
  moment the design system's palette or spacing scale changes and this screen was never wired
  to follow it.
- **Shipping without testing predictive back or edge-to-edge explicitly.** Both are easy to
  get "mostly right" by accident and wrong specifically at the edges — the status bar overlap,
  the abrupt (non-predictive) pop — which a casual pass rarely exercises.
