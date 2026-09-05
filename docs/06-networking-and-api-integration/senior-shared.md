---
id: networking-senior
title: Retry Policy, Idempotency Keys & TLS Pinning's Rotation Plan (Senior, Android + iOS)
description: Retry and backoff policy design, idempotency keys and request coalescing, TLS pinning and its rotation plan, per-request telemetry, and negotiating an API contract.
tags: [android, ios, networking, retry, tls, senior]
lang: en
status: complete
domain: 06-networking-and-api-integration
band: S
platform: shared
level: Senior
sidebar_position: 2
prerequisites: [networking-mid]
outcomes:
  - "Write the retry policy as a table — which errors, how many times, what backoff, which are terminal — and defend the terminal column"
resources:
  - title: "Retry pattern — exponential backoff and jitter"
    url: "https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/"
    date: "2024-11-01"
  - title: "OkHttp CertificatePinner"
    url: "https://square.github.io/okhttp/features/https/#certificate-pinning"
    date: "2025-02-01"
  - title: "URLSession server trust evaluation"
    url: "https://developer.apple.com/documentation/foundation/urlsessiondelegate/2890004-urlsession"
    date: "2025-06-01"
  - title: "Idempotency keys — Stripe API design"
    url: "https://stripe.com/docs/api/idempotent_requests"
    date: "2024-11-01"
---

# Retry Policy, Idempotency Keys & TLS Pinning's Rotation Plan

> **Outcome.** Write the retry policy as an explicit table — which errors, how many attempts,
> what backoff, which are terminal — and defend the terminal column specifically, because that
> is the column that hides the actual judgement calls.

## 1. Retry and backoff policy design, as a table

| Error | Retry? | Max attempts | Backoff | Terminal reason |
| :--- | :--- | :--- | :--- | :--- |
| Timeout / connection dropped | Yes | 3 | Exponential + jitter, 1s/2s/4s | After 3, surface "check your connection" |
| 429 Too Many Requests | Yes | Respect `Retry-After` header | As specified by server | Never retry more aggressively than the server asked |
| 5xx server error | Yes | 2 | Exponential, 2s/4s | Idempotent requests only — see below |
| 401 Unauthorized | Once, after refresh | 1 | None | A second 401 after a successful refresh means the credential itself is invalid, not expired — log out, don't loop |
| 400 / 422 validation error | **No** | 0 | N/A | The request is wrong; retrying an unchanged request produces the identical wrong result |
| Non-idempotent POST/PATCH, no idempotency key | **No** | 0 | N/A | Cannot safely retry without risking a duplicate side effect |

> [!IMPORTANT]
> The terminal column is where the actual engineering judgement lives — "retry forever" is easy
> to write and wrong for most of this table. A 400 is terminal because the request itself, not
> the network, is the problem; retrying an unchanged request produces the same 400 every time
> and only delays the user seeing the real, actionable error. Defending this column means being
> able to say, for each terminal row, what evidence rules out "maybe one more try would work."

## 2. Idempotency keys and request coalescing

```kotlin
// An idempotency key lets a non-idempotent POST be safely retried: the server recognizes
// a repeated key and returns the ORIGINAL result instead of executing the action again.
interface PaymentApi {
    @POST("payments")
    @Headers("Idempotency-Key: {key}")
    suspend fun submitPayment(@Body payment: PaymentRequest, @Header("Idempotency-Key") key: String): PaymentResult
}

fun submitPaymentWithRetry(payment: PaymentRequest) {
    val idempotencyKey = UUID.randomUUID().toString() // ONE key for all retry attempts
                                                          // of this specific submission
    retryWithBackoff { api.submitPayment(payment, idempotencyKey) }
}
```

Request coalescing — the same pattern as the token-refresh mutex in domain 06's Mid article,
applied more generally — collapses N simultaneous identical requests (three widgets all
requesting the same "current user" endpoint on screen load) into one actual network call whose
result is shared among all callers.

## 3. TLS pinning, and the rotation plan without which pinning is an outage

```kotlin
val certificatePinner = CertificatePinner.Builder()
    .add("api.example.com", "sha256/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=")
    .add("api.example.com", "sha256/BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB=") // backup pin
    .build()
```

```swift
func urlSession(_ session: URLSession, didReceive challenge: URLAuthenticationChallenge,
                 completionHandler: @escaping (URLSession.AuthChallengeDisposition, URLCredential?) -> Void) {
    // Hand-rolled server trust evaluation — comparing the presented certificate's
    // public key hash against the pinned value(s), same shape as OkHttp's CertificatePinner
    // but without a maintained library doing the comparison for you.
}
```

> [!WARNING]
> Pinning with only the current certificate's key, and no backup pin for the *next* certificate
> already generated and ready to deploy, turns a routine certificate rotation into an outage —
> every pinned app version stops trusting the server the instant the old certificate expires,
> with no way to push a fix except an app update, which itself takes days to reach most of the
> install base. The rotation plan — always pin at least two keys, the current and the next,
> well before the current one expires — is not optional hardening, it is what makes pinning
> survivable in production at all.

## 4. Per-request telemetry

```kotlin
class TelemetryInterceptor : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
        val start = System.nanoTime()
        val request = chain.request()
        val response = try {
            chain.proceed(request)
        } catch (e: IOException) {
            recordFailure(request.url.encodedPath, e)
            throw e
        }
        recordLatency(request.url.encodedPath, response.code, (System.nanoTime() - start) / 1_000_000)
        return response
    }
}
```

Per-request telemetry (path, status, latency, retry count) is what turns "the API feels slow" or
"users are seeing errors" into a specific endpoint, a specific status code, and a specific
percentile — the same measure-before-fixing discipline domain 09's performance articles apply to
rendering, applied here to the network layer.

## 5. Negotiating an API contract instead of accepting one

The Senior-level shift from the Mid article: rather than adapting client code to whatever shape
a backend team ships, propose the contract before it's built — a versioned field, a documented
error-code enum, an explicit pagination cursor format — and get it agreed before either side
writes code against an assumption the other side never confirmed.

```markdown
## API contract proposal: GET /users/{id}/profile

Error codes: PROFILE_NOT_FOUND, PROFILE_RESTRICTED (blocked by privacy settings) —
distinct codes because the client shows different UI for each, not a single generic 404.
Pagination: cursor-based (see domain 06 Mid), field name `nextCursor`, opaque string.
New fields: always added optional with a documented default — no field is ever added
as a required breaking change to an existing endpoint version (see domain 06's Lead
article on the un-updatable-client problem).
```

## Pitfalls & trade-offs

- **A retry policy with no terminal column defended.** "Retry everything a few times" is not a
  policy — the table above is the checkable artifact, and every terminal row needs a stated
  reason, not just a lower attempt count.
- **Retrying a non-idempotent request with no idempotency key.** Covered above — this is a
  correctness bug (a duplicate charge, a duplicate order), not a resilience nicety.
- **Pinning a single certificate with no backup pin for the next rotation.** Covered above —
  the single most common way TLS pinning turns into a self-inflicted outage.
- **Shipping telemetry with no per-request granularity.** An aggregate "API error rate" metric
  cannot tell you which endpoint, which status code, or which percentile is actually the
  problem — per-request data is what makes a regression traceable to a cause.
- **Accepting whatever shape a backend ships instead of proposing the contract first.** Costs
  more up-front coordination, saves a client-side adaptation layer and a breaking-change
  incident later — the trade domain 06's Senior-level negotiation habit is meant to make.
