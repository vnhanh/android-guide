---
id: networking-interview
title: Networking & API Integration — Interview Questions
description: At least 8 questions per level on HTTP semantics, schema evolution, pagination, token refresh, retry/backoff design, idempotency, TLS pinning, and protocol/versioning strategy.
tags: [interview, http, rest, graphql, retry, tls-pinning, api-versioning, mid, senior, lead]
lang: en
status: complete
domain: 06-networking-and-api-integration
platform: shared
band: X
level: Mid
sidebar_position: 99
kind: interview
prerequisites: []
outcomes:
  - "Answer, without notes, the core interview questions this domain's Mid, Senior and Lead articles each teach"
---

# Networking & API Integration — Interview Questions

## Mid

Q: Why does the specific HTTP status code returned actually matter to how a client behaves, beyond "2xx good, other bad"?
A: A well-behaved client reacts differently to a 401 (re-authenticate), a 429 (back off and retry later, respecting Retry-After), and a 500 (retry with backoff) versus a 400 (don't retry, the request itself is malformed) — collapsing all non-2xx responses into one generic "error" handler means the client retries requests that will never succeed and gives up on ones that would have worked on retry.

Q: How do you add a new field to an API response without shipping a crash for users on an older app version?
A: Make the new field optional in the client's deserialization model (nullable, with a default) so an old client parsing a response with the new field simply ignores it, and a client not yet updated to expect the field doesn't fail deserialization when it's absent — schema evolution has to be additive and optional by default, not something that requires every client to update in lockstep.

Q: What's the difference between a network timeout and a server error, and why does a user need to see different messaging for each?
A: A timeout means the client gave up waiting with no confirmation of whether the server ever processed the request; a server error (5xx) means the server responded and explicitly failed — conflating them into one generic "something went wrong" message loses information a user could act on (retry now vs. this specific request may have partially succeeded).

Q: Why can't pagination be implemented correctly with just "give me the next N items" if the underlying dataset can change between requests?
A: Offset-based pagination breaks when items are inserted or removed between page requests — a user can see duplicate or skipped items as the underlying list shifts under them; cursor-based pagination (a stable pointer to "after this specific item") avoids this by anchoring to an item's position rather than a numeric offset that shifts.

Q: What's a "thundering herd" in the context of token refresh, and why does it happen?
A: When an access token expires and many concurrent in-flight requests all discover this simultaneously, each one naively triggers its own token refresh call — flooding the auth server with duplicate refresh requests for what should be a single refresh, and potentially invalidating tokens mid-flight for other requests if the refresh rotates the token.

Q: How do you actually prevent a token-refresh thundering herd?
A: Coalesce concurrent refresh attempts into a single in-flight refresh call that all waiting requests await the result of, rather than each request independently triggering its own refresh — the first request to notice the expired token starts the refresh, and every other request waiting on the same token reuses that one in-flight result.

Q: Why is "retry on any failure" not a safe default policy for every kind of request?
A: A non-idempotent request (like submitting a payment) retried blindly on a timeout can execute twice if the original request actually succeeded server-side but the response was lost — retry safety depends on whether the operation is safe to repeat, which is a property of the specific endpoint, not a blanket policy.

Q: What's the practical difference between REST and GraphQL that actually affects a mobile client's design, beyond syntax?
A: GraphQL lets a client request exactly the fields it needs in one request, avoiding both over-fetching (REST returning a large object when only two fields are needed) and under-fetching (REST requiring multiple round trips to assemble what one screen needs) — the trade-off is a more complex client-side query layer and server-side resolver design versus REST's simpler, more cacheable per-resource endpoints.

## Senior

Q: What does a real retry and backoff policy need to specify, beyond "retry 3 times"?
A: Which status codes and error types are retryable at all, the backoff strategy (exponential, with jitter to avoid synchronized retry storms across many clients), a maximum retry count or total time budget, and whether the operation being retried is safe to repeat (idempotent) — "retry 3 times" alone says nothing about any of these, which is exactly where a naive retry policy causes more harm than the failure it was trying to paper over.

Q: What's an idempotency key, and what specific problem does it solve that retry/backoff alone doesn't?
A: A client-generated unique identifier attached to a request so the server can recognize and safely ignore a duplicate submission of the same logical operation (e.g. a payment) even if the client retried it — retry/backoff alone tells the client when to retry; an idempotency key tells the server "this is the same request as before, not a new one," which is what actually makes retrying a non-idempotent-looking operation safe.

Q: What does request coalescing solve, and how is it different from an idempotency key?
A: Coalescing prevents multiple concurrent callers within the same client from independently issuing the same request at the same time (the token-refresh thundering herd is one instance of this); an idempotency key protects against the server executing the same logical operation twice even across genuinely separate request attempts (e.g. a retry after a lost response) — one is a client-side dedup, the other is a server-side safety net.

Q: Why is TLS pinning "an outage without a rotation plan," as opposed to just a security hardening measure?
A: Pinning ties the app to a specific certificate or public key; when that certificate needs to rotate (expiry, a CA change, a compromised key), any app version still pinned to the old certificate can no longer connect at all — without a plan to update pins ahead of the actual rotation and support overlapping valid pins during the transition, a routine certificate rotation becomes a hard outage for every unpatched client.

Q: What does per-request telemetry need to capture to actually be useful for diagnosing a production networking issue?
A: Enough context per request (endpoint, response code, latency, retry count, client app version) to distinguish "this specific endpoint is slow for everyone" from "this is isolated to one client version or one user cohort" — telemetry that only records aggregate success/failure rates without per-request dimensions can't answer either of those diagnostic questions.

Q: What does "negotiating an API contract instead of accepting one" actually look like in practice?
A: Proposing the actual shape a mobile client needs (which fields, what pagination model, what error shape) before the backend team finalizes an endpoint, rather than adapting the client to whatever the backend happened to build — this requires the mobile engineer to show up to API design with a concrete proposal, not just consume whatever's delivered.

Q: Why might a Senior engineer push back on a backend team's proposed endpoint shape, even if it technically returns the right data?
A: Because "returns the right data" doesn't account for the mobile-specific cost of the shape — an endpoint requiring three round trips to assemble one screen, or returning a deeply nested structure that's expensive to parse on a mobile device, is functionally correct but a poor fit for the actual client constraints, which is exactly the kind of cost a backend team without mobile context won't see on its own.

Q: How do you decide the actual backoff parameters (base delay, max retries, jitter range) for a retry policy, rather than picking arbitrary numbers?
A: Base them on the server's own documented or observed rate-limit and recovery behavior, and on the user-facing time budget for the operation (a background sync can tolerate minutes of backoff; a user-initiated action waiting on screen cannot) — arbitrary numbers copied from a different service's retry policy may not match either constraint.

## Lead

Q: What is "the un-updatable-client problem," and why is it the defining constraint of mobile API design specifically?
A: A meaningful fraction of a mobile app's user base will never update to the latest version, sometimes for years, unlike a web app where every user gets the latest deployed version on next page load — every API and protocol decision has to account for old client versions remaining in the field indefinitely, not just the currently-shipping version.

Q: How do you decide a protocol strategy (REST, GraphQL, gRPC) deliberately, rather than inheriting whatever a previous team chose?
A: Evaluate against the actual current needs — over-fetching/under-fetching cost for the app's real screen shapes, team familiarity and tooling maturity, caching behavior needed, and whether the un-updatable-client problem makes a migration cost prohibitive regardless of which protocol is theoretically better — "decided" means this evaluation is made explicit and revisited, not that the current choice must always change.

Q: What does a backward-compatibility policy need to state explicitly to actually be enforceable?
A: How long an app version is supported after release, exactly what the server may never break for a still-supported version (field removal, type changes, required-field additions), and the specific mechanism (contract tests, API versioning scheme) that catches a violation before it ships — a policy that only says "we maintain backward compatibility" gives a backend engineer no concrete constraint to check their change against.

Q: How do you actually enforce a backward-compat policy on the backend side, rather than relying on backend engineers remembering the rule?
A: A contract test suite that runs against the API for every supported client version's expected shape, failing CI if a change would break one of them — the same "named mechanism, not a wiki page" principle every other team standard in this guide relies on, applied specifically to API compatibility.

Q: How do you run cross-team API governance so mobile isn't just informed of API changes after the fact?
A: A required review step for any API change that affects a mobile-consumed endpoint, with mobile engineers as reviewers who can flag a compatibility or shape concern before the change ships, not a notification sent after the backend team has already deployed it.

Q: How do you decide the "supported client window" — how many past app versions the backend must keep working for?
A: Look at actual version-adoption data (what fraction of active users are on which app versions) and weigh the cost of maintaining old-version support against the fraction of users still affected — a fixed arbitrary window ("we support the last 2 years") ignores whether real users are still on versions that old.

Q: What's the actual risk of a protocol or API decision made without considering platform parity (Android vs iOS)?
A: A decision that works cleanly on one platform's HTTP stack or type system can be awkward or unsupported on the other's, leading to platform-specific workarounds that silently diverge in behavior — the same endpoint or protocol should behave identically from both platforms' perspective, and skipping that check surfaces as a platform-specific bug much later.

Q: How do you price a protocol migration (e.g. REST to GraphQL) against the un-updatable-client problem?
A: State the migration's engineering cost, the specific pain it resolves (over-fetching, multiple round trips), and how long both protocols would need to be supported in parallel given how long old app versions persist in the field — a migration that looks worthwhile in isolation can be far more expensive once the actual dual-support period required by real client adoption curves is priced in.
