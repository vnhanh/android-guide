---
id: networking-lead
title: Protocol Strategy & the Backward-Compat Policy (Lead, Android + iOS)
description: Protocol strategy decided rather than inherited, versioning for clients that will never update, cross-team API governance, and the un-updatable-client problem.
tags: [android, ios, lead, api-governance, versioning]
lang: en
status: complete
domain: 06-networking-and-api-integration
band: L
platform: shared
level: Lead
sidebar_position: 3
prerequisites: [networking-senior]
outcomes:
  - "State the backward-compat policy: how long an app version is supported, what the server may never break, how that is enforced backend-side"
resources:
  - title: "gRPC — when and why"
    url: "https://grpc.io/docs/what-is-grpc/introduction/"
    date: "2024-11-01"
  - title: "GraphQL — a query language for APIs"
    url: "https://graphql.org/learn/"
    date: "2024-11-01"
  - title: "Network security configuration (Android)"
    url: "https://developer.android.com/privacy-and-security/security-config"
    date: "2025-03-01"
  - title: "App Transport Security (iOS)"
    url: "https://developer.apple.com/documentation/security/preventing-insecure-network-connections"
    date: "2025-06-01"
---

# Protocol Strategy & the Backward-Compat Policy

> **Outcome.** State the backward-compat policy: how long an app version is supported after
> release, what the server may never break for a supported version, and exactly how that
> guarantee is enforced on the backend — not merely hoped for.

## The un-updatable-client problem — the defining constraint of mobile

A backend service the team owns can be redeployed the moment a breaking change is ready. A
mobile client cannot — some real, non-trivial fraction of the install base will still be running
a two-year-old version a year from now, by choice or because the device can no longer run a
newer OS the current app requires. Every API decision in this domain's Mid and Senior articles
(optional fields with defaults, negotiated contracts, versioned pagination) exists in service of
one constraint this article makes explicit and load-bearing: **the server must keep working for
clients it can no longer talk to about changing.**

## Protocol strategy, decided rather than inherited

```markdown
## Protocol decision: REST for MobileApp's public API

Rejected: gRPC — excellent for internal service-to-service calls with high throughput
and code-generated strict schemas; poor fit here because it needs a proxy layer for
browser/web clients this API also serves, and the team has no existing gRPC tooling
or on-call familiarity, which is a real cost for a small mobile-focused team to absorb.
Rejected: GraphQL — solves over-fetching well for a client with many independent
consumers each needing a different data shape, which describes this team's admin
dashboard but not the mobile client's small number of well-known screens; the added
schema-governance overhead isn't paid back by a benefit this app actually needs yet.
Chosen: REST — matches the team's existing tooling, is directly cacheable at the
HTTP layer (domain 06 Mid's Cache-Control discussion), and every consuming client
already speaks it.
```

The point of writing this down is the same as domain 05's persistence-choice template: a
decision inherited from whatever the last team happened to use is not the same as one made with
the alternatives actually weighed against this app's specific constraints.

## Versioning for clients that will never update

```
URL versioning:    /v1/users/{id}   /v2/users/{id}
Header versioning: Accept: application/vnd.example.v2+json
```

> [!IMPORTANT]
> Either scheme works; what matters is the policy behind it. A `v1` endpoint must keep behaving
> exactly as documented for as long as any supported client version depends on it — "supported"
> defined by the backward-compat policy below, not by whenever the backend team would prefer to
> delete the old code path. Deleting `v1` before the last client version depending on it has
> aged out of support is not a versioning bug, it's breaking the actual promise versioning exists
> to make.

## Cross-team API governance

```markdown
## API governance — MobileApp

- A breaking change to any endpoint version currently within its supported window
  requires sign-off from a mobile platform lead, not just the backend team shipping it —
  the backend team cannot see client-side usage data that would reveal the actual blast
  radius of a change.
- New endpoints follow the contract-negotiation template from domain 06's Senior
  article before implementation begins, not after a mobile team discovers the shape
  doesn't fit during integration.
- A deprecation is announced with a stated sunset date at least one full backward-compat
  window (see below) before removal — never as a surprise breaking change in a release.
```

## The backward-compat policy — the outcome, stated

```markdown
# Backward-compatibility policy — MobileApp

## Supported client window
App versions released in the last 18 months are supported — chosen from this app's
measured version-adoption curve (Play Console / App Store Connect), where >95% of
active users are on a version released within that window.

## What the server may never break, for a supported version
- Any field present in a v1 response as of this policy's adoption date remains present
  with the same type and meaning — new fields are additive only (domain 06 Mid).
- An endpoint's error-code enum only grows; an existing code's meaning never changes.
- Authentication flow (domain 06 Mid's token refresh) remains compatible for the
  full supported window — no silent auth-flow change without a new API version.

## Enforcement, backend-side
- A contract test suite (consumer-driven contract tests, one per supported client
  version still in the window) runs in the backend's own CI — a change breaking any
  of them fails the build before it ships, not after a mobile crash-rate spike.
- Sunset dates for any deprecated version are tracked in the API governance doc above
  and gate removal automatically — no manual "is anyone still using v1" check that
  can be skipped under deadline pressure.
```

## Parity — HTTP stacks across platforms

**Maps:** OkHttp/Retrofit ↔ `URLSession` · interceptors ↔ delegates and `URLProtocol` · network
security config ↔ App Transport Security (ATS).

**Breaks:** Android's network security configuration is a declarative XML file, reviewable in a
diff, auditable by anyone reading the manifest — pinning, cleartext policy, and per-domain
overrides are all visible in one place without reading imperative code. iOS's equivalent, ATS,
covers default-secure baseline policy declaratively in `Info.plist`, but certificate **pinning**
specifically is not a declarative ATS feature — it is hand-rolled in a `URLSessionDelegate`'s
trust-evaluation callback (domain 06's Senior article), where a mistake in the comparison logic
is invisible in code review the way a misconfigured XML value is not, and only surfaces in
production when a certificate actually rotates.

## Pitfalls & trade-offs

- **A protocol chosen by precedent rather than by this app's actual constraints.** The worked
  template above is the checkable artifact — every rejected option needs a specific, stated
  reason tied to this app, not a general preference.
- **A supported-client window with no data behind it.** "Support the last two versions" is a
  guess; the actual adoption curve from the app stores is the number a policy should be built on.
- **A backward-compat policy with no backend-side enforcement mechanism.** A policy enforced
  only by hoping the backend team remembers is the same failure mode domain 01's Lead article
  names for an idiom standard with no lint rule — consumer-driven contract tests in CI are the
  mechanism that makes this one stick.
- **Treating iOS's hand-rolled pinning code as equivalently auditable to Android's declarative
  config.** It is not — a pinning mistake in a `URLSessionDelegate` needs a specific code review
  focus and, ideally, its own test asserting an untrusted certificate is actually rejected,
  precisely because nothing declarative catches a mistake there the way an XML diff would.
