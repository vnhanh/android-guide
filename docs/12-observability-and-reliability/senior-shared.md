---
id: observability-senior
title: Instrumenting for Field Diagnosis, Crash Triage & Alerting That Doesn't Cry Wolf (Senior, Android + iOS)
description: Instrumenting a feature so it can be diagnosed from the field, crash-cluster triage to root cause, owning crash-free/ANR-hang rate, alerting design, and structured logging cost.
tags: [android, ios, observability, alerting, senior]
lang: en
status: complete
domain: 12-observability-and-reliability
band: S
platform: shared
level: Senior
sidebar_position: 2
prerequisites: [observability-mid]
outcomes:
  - "Ship a feature you can debug from telemetry alone, and prove it by diagnosing a real field issue without a reproduction"
resources:
  - title: "Crashlytics — velocity alerts"
    url: "https://firebase.google.com/docs/crashlytics/notifications"
    date: "2025-03-01"
  - title: "MetricKit"
    url: "https://developer.apple.com/documentation/metrickit"
    date: "2025-06-01"
  - title: "Structured logging — cost and sampling"
    url: "https://developer.android.com/topic/performance/vitals"
    date: "2024-11-01"
---

# Instrumenting for Field Diagnosis, Crash Triage & Alerting That Doesn't Cry Wolf

> **Outcome.** Ship a feature that can be debugged from telemetry alone, and prove that claim by
> actually diagnosing a real field issue in it without ever reproducing the issue locally.

## 1. Instrumenting a feature so it can be diagnosed from the field

```kotlin
class CheckoutViewModel(private val repository: OrderRepository) : ViewModel() {
    fun submitOrder(orderId: String) {
        viewModelScope.launch {
            Analytics.logEvent("checkout_submit_started", mapOf("order_id" to orderId))
            try {
                repository.submitOrder(orderId)
                Analytics.logEvent("checkout_submit_succeeded", mapOf("order_id" to orderId))
            } catch (e: Exception) {
                // The event AND the exception's specific type/message — the difference
                // between "checkout failed" (useless) and "checkout failed: 422 invalid
                // coupon code" (immediately actionable from the dashboard alone).
                Analytics.logEvent("checkout_submit_failed", mapOf(
                    "order_id" to orderId,
                    "error_type" to e::class.simpleName,
                    "error_message" to e.message,
                ))
                throw e
            }
        }
    }
}
```

> [!IMPORTANT]
> The bar for "instrumented well enough" is specific: given only the event stream for one
> `order_id`, could you state exactly where in the flow it failed and why, with no other
> information? If the answer requires guessing between three possible failure points the events
> don't distinguish, the instrumentation is incomplete, not merely sparse.

## 2. Crash-cluster triage to root cause

```
Crashlytics groups crashes by stack signature into clusters — triage starts with
volume (which cluster affects the most sessions) crossed with trend (is it growing,
introduced by a specific recent release) rather than working whichever crash report
happened to be looked at first.
```

```markdown
## Triage: NullPointerException in ProfileViewModel.kt:47

Volume: 3.2% of sessions on v4.1.0, 0.1% on v4.0.x — clearly introduced by v4.1.0,
not a longstanding issue.
Correlated change: v4.1.0's diff includes a refactor moving `repository` from a
constructor parameter to a lateinit var set in onCreate() — a lifecycle-timing
change is the prime suspect given the crash's breadcrumb trail (see domain 12 Mid).
Root cause: confirmed by reading the diff — onCreate() sets the field asynchronously
after a network call; a screen backgrounded and killed before that call returns
restarts with the field still uninitialized.
Fix: revert to constructor injection, or guard the field access — the KIND of fix
this domain's Mid article on lifecycle correctly names as the actual failure class.
```

## 3. Owning crash-free sessions and ANR/hang rate for an area

A Senior engineer owning an area's reliability means the crash-free-sessions and ANR/hang-rate
numbers for that area's screens are a metric they track continuously, not a number they
discover during an incident. Segmented by the same device/OS/version breakdown domain 12's Mid
article names, reviewed on a cadence, with a stated threshold for "this needs attention now."

## 4. Alerting that does not cry wolf

```markdown
## Alert: crash-free-sessions rate drop

BAD: alert on ANY drop below the historical average — triggers on ordinary day-to-day
noise, trains the on-call rotation to ignore it within two weeks.
BETTER: alert on a drop exceeding 2 standard deviations from the trailing 14-day
average, sustained for at least 3 consecutive hourly windows (not a single noisy
data point), segmented so a regression concentrated on one device tier isn't diluted
into invisibility by the aggregate.
```

> [!WARNING]
> An alert that fires on normal variance trains whoever is on call to mute it — by the time a
> real regression happens, the alert has already lost its credibility. The fix is a threshold
> and a sustain window derived from the metric's actual historical variance, not a round number
> that felt reasonable when the alert was first configured.

## 5. Structured logging, sampling, and cost

```kotlin
// Logging every event for every user is a real, ongoing infrastructure cost at scale.
// Sampling a fraction of sessions for high-volume, low-diagnostic-value events, while
// logging 100% of rare, high-value events (a checkout failure), is the honest trade-off.
Analytics.logEvent("screen_view", sampleRate = 0.1) // high volume, low per-event value
Analytics.logEvent("checkout_submit_failed", sampleRate = 1.0) // rare, high diagnostic value
```

## Proving the outcome: diagnosing a real field issue without a reproduction

The checkable version of this article's outcome is not "the feature has logging" — it is a
specific, real incident, worked from telemetry alone: the checkout-failure triage above (section
2), reconstructed entirely from the event stream and the release diff, with no device ever
reproducing the crash locally. That is the artifact that proves the instrumentation was actually
sufficient, not merely present.

## Pitfalls & trade-offs

- **Instrumentation that logs "something failed" without the specific error type/message.**
  The difference between actionable-from-the-dashboard and requiring a follow-up ticket to even
  ask "which error."
- **Triaging by whichever crash report was looked at first instead of by volume and trend.**
  Covered above — cross-referencing against the release history is what actually finds root
  cause fastest, not working reports in arrival order.
- **An alert threshold set to any deviation instead of derived from historical variance.**
  Covered above — this is the single most common cause of an ignored, muted alert channel.
- **Logging every event at 100% sampling regardless of diagnostic value.** A real, compounding
  cost for high-volume low-value events; sampling is the honest trade-off, not a corner cut.
