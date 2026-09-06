---
id: networking-mid
title: HTTP Semantics, Schema Evolution & Token Refresh Without a Thundering Herd (Mid, Android + iOS)
description: Idempotency, cache headers and status classes, serialisation and schema evolution, timeouts and error mapping, pagination, and coordinated token refresh.
tags: [android, ios, networking, http, auth, mid]
lang: en
status: complete
domain: 06-networking-and-api-integration
band: M
platform: shared
level: Mid
sidebar_position: 1
prerequisites: [fundamentals-type-system-and-null-safety, fundamentals-oop-and-solid-in-practice, concurrency-mid-android, concurrency-mid-ios]
outcomes:
  - "Handle a 401 mid-flight on three concurrent requests with exactly one refresh"
resources:
  - title: "HTTP semantics — MDN"
    url: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Overview"
    date: "2025-01-01"
  - title: "OkHttp Authenticator"
    url: "https://square.github.io/okhttp/features/interceptors/"
    date: "2025-02-01"
  - title: "URLSession"
    url: "https://developer.apple.com/documentation/foundation/urlsession"
    date: "2025-06-01"
  - title: "Idempotency keys — Stripe API design"
    url: "https://stripe.com/docs/api/idempotent_requests"
    date: "2024-11-01"
---

# HTTP Semantics, Schema Evolution & Token Refresh Without a Thundering Herd

> **Outcome.** Handle a 401 arriving mid-flight on three concurrent requests with **exactly
> one** token refresh — not three, and not a race that leaves any request permanently stuck.

## 1. HTTP semantics that matter

```
GET, HEAD, PUT, DELETE  — idempotent: calling twice has the same effect as calling once.
                          Safe to retry automatically after a timeout or a dropped connection.
POST, PATCH             — NOT idempotent by default. Retrying blindly can double-submit
                          a payment or create a duplicate resource.
```

```
Cache-Control: max-age=300, must-revalidate   — cache for 5 minutes, then re-validate
ETag: "a1b2c3"                                 — a version tag; a conditional GET with
                                                 If-None-Match can get a cheap 304 back
```

```
2xx — success                    4xx — client error, the request itself is wrong
3xx — redirection                5xx — server error, the request might be fine, retry may help
```

> [!IMPORTANT]
> The idempotency distinction above is the one that actually matters for retry logic (domain
> 06's Senior article): retrying a `GET` blindly after a network blip is always safe; retrying a
> `POST` blindly can charge a card twice. Confusing the two is a correctness bug, not a
> performance nitpick.

## 2. Serialisation and schema evolution — adding a field without shipping a crash

```kotlin
// Adding a field to a response DTO must never crash an OLDER app version still running
// against a NEWER server response that includes fields it doesn't know about, and must
// never crash a NEWER app version against an OLDER server response missing a field it expects.
@Serializable
data class UserProfileDto(
    val id: String,
    val displayName: String,
    val avatarUrl: String? = null, // new field: nullable with a default — old servers
                                     // omitting it deserialize fine; new servers including
                                     // it are read fine by old app versions that ignore it
)
```

```swift
struct UserProfileDto: Decodable {
    let id: String
    let displayName: String
    let avatarUrl: String?  // Decodable naturally tolerates a missing optional key

    enum CodingKeys: String, CodingKey { case id, displayName, avatarUrl }
    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.decode(String.self, forKey: .id)
        displayName = try c.decode(String.self, forKey: .displayName)
        avatarUrl = try c.decodeIfPresent(String.self, forKey: .avatarUrl)
    }
}
```

> [!WARNING]
> A field added as **non-optional, no default** is the classic way this breaks: it deserializes
> fine against the server version that existed when the app shipped, and crashes every older app
> version the moment the server starts omitting or the app starts expecting a field the other
> side doesn't have yet — this is domain 06's version of the un-updatable-client problem this
> domain's Lead article names directly.

## 3. Timeouts, error mapping, and what the user sees on failure

```kotlin
val client = OkHttpClient.Builder()
    .connectTimeout(10, TimeUnit.SECONDS)
    .readTimeout(15, TimeUnit.SECONDS)
    .build()

sealed interface ApiError {
    data object NoConnection : ApiError
    data object Timeout : ApiError
    data class ServerError(val code: Int) : ApiError
    data class ClientError(val code: Int, val message: String) : ApiError
}

fun mapError(e: Exception): ApiError = when (e) {
    is UnknownHostException -> ApiError.NoConnection
    is SocketTimeoutException -> ApiError.Timeout
    else -> ApiError.ServerError(0)
}
```

> [!IMPORTANT]
> Every mapped error needs a stated, specific answer for what the user sees — "no connection"
> should suggest checking the network and offer a retry button; a 5xx should say the problem is
> on the server's side, not imply the user did something wrong; a 4xx validation error should
> show the specific field, not a generic "something went wrong." Collapsing all of these into
> one generic error screen is a common Mid-level shortcut that makes every failure equally
> unhelpful regardless of how different the actual causes and user actions should be.

## 4. Pagination

```kotlin
interface UserApi {
    @GET("users")
    suspend fun fetchUsers(@Query("cursor") cursor: String?, @Query("limit") limit: Int): PagedResponse<User>
}

data class PagedResponse<T>(val items: List<T>, val nextCursor: String?)
```

Cursor-based pagination (an opaque token naming "resume from here") is generally preferable to
offset-based (`?page=3`) for anything that can change between requests — an offset silently
skips or duplicates items when the underlying set is mutated mid-pagination, the same mutable-
set hazard domain 05's Senior article names for sync.

## 5. Auth and token refresh without a thundering herd

```kotlin
class TokenAuthenticator(private val tokenStore: TokenStore) : Authenticator {
    private val refreshMutex = Mutex()

    override fun authenticate(route: Route?, response: Response): Request? {
        // Runs synchronously on OkHttp's dispatcher thread per failed call, but the mutex
        // ensures only the FIRST of several concurrent 401s actually calls the refresh
        // endpoint — the other two block on the mutex, then reuse the token it fetched.
        val newToken = runBlocking {
            refreshMutex.withLock {
                val current = tokenStore.accessToken
                // Check-then-act inside the lock: if another caller already refreshed
                // while this one was waiting for the mutex, current is already fresh —
                // skip a second, redundant refresh call entirely.
                if (current != extractExpiredToken(response)) {
                    current // already refreshed by a concurrent caller; reuse it
                } else {
                    tokenStore.refreshAndStore() // the ONE actual network call
                }
            }
        }
        return response.request.newBuilder()
            .header("Authorization", "Bearer $newToken")
            .build()
    }
}
```

```swift
actor TokenRefresher {
    private var refreshTask: Task<String, Error>?

    // Concurrent callers all await the SAME Task if one is already in flight —
    // an actor's serial isolation plus a memoized Task is what collapses N
    // concurrent refresh attempts into exactly one network call.
    func validToken(currentlyExpired expiredToken: String) async throws -> String {
        if let existing = refreshTask { return try await existing.value }
        let task = Task { try await self.performRefresh() }
        refreshTask = task
        defer { refreshTask = nil }
        return try await task.value
    }
}
```

The outcome's test, stated precisely: three requests fail with 401 at nearly the same moment;
all three must end up authenticated with the refreshed token, and the refresh endpoint must be
called exactly once — not three times (a thundering herd hitting the auth server), and not
zero times for two of them (a request stuck retrying a token that was never actually refreshed).

## Pitfalls & trade-offs

- **Retrying a non-idempotent request blindly on timeout.** Covered above — a `POST` retried
  without an idempotency key (domain 06's Senior article) can double-submit.
- **A new response field added as non-optional with no default.** Breaks old app versions or
  old server versions the moment either side's timeline doesn't match the other's assumption.
- **Collapsing every error into one generic failure message.** Each mapped error category
  deserves a specific, actionable message — "no connection, retry" is not the same user action
  as "this field is invalid."
- **Offset-based pagination over a set that can mutate mid-pagination.** Same hazard as domain
  05's delta-sync pagination — a cursor tolerant of concurrent mutation avoids skipped or
  duplicated items.
- **A token-refresh implementation with no coordination across concurrent requests.** Without
  the mutex/actor pattern above, N concurrent 401s become N refresh calls — at best wasteful,
  at worst rate-limited or flagged as suspicious by the auth server itself.
