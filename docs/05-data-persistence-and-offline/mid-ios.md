---
id: data-mid-ios
title: Choosing a Persistence Layer, Migrations & HTTP Caching (Mid, iOS)
description: Choosing between SwiftData, Core Data and GRDB, migrations and the lightweight-migration cliff, Keychain vs UserDefaults, and URLCache.
tags: [ios, swiftdata, coredata, persistence, mid]
lang: en
status: complete
domain: 05-data-persistence-and-offline
band: M
platform: ios
level: Mid
sidebar_position: 2
prerequisites: [fundamentals-mid-ios, concurrency-mid-ios]
outcomes:
  - "Justify the persistence choice against the two rejected options"
counterpart: data-mid-android
resources:
  - title: "SwiftData"
    url: "https://developer.apple.com/documentation/swiftdata"
    date: "2025-06-01"
  - title: "Core Data — lightweight migrations"
    url: "https://developer.apple.com/documentation/coredata/using_lightweight_migration"
    date: "2024-09-01"
  - title: "GRDB.swift"
    url: "https://github.com/groue/GRDB.swift"
    date: "2025-02-01"
  - title: "URLCache"
    url: "https://developer.apple.com/documentation/foundation/urlcache"
    date: "2025-06-01"
---

# Choosing a Persistence Layer, Migrations & HTTP Caching

> **Outcome.** Justify a persistence choice against the two options rejected — not just state
> which was picked, but say specifically what each rejected option would have cost.

## 1. SwiftData vs Core Data vs GRDB, with reasons

```swift
// SwiftData: the modern default for a new app with straightforward model needs —
// least boilerplate, Swift-native macros, tightly coupled to SwiftUI's data flow.
@Model
final class UserProfile {
    @Attribute(.unique) var id: String
    var displayName: String
    init(id: String, displayName: String) { self.id = id; self.displayName = displayName }
}
```

```swift
// Core Data: chosen when the app needs something SwiftData doesn't yet cover well —
// complex migrations, NSFetchedResultsController-based UIKit lists, or an existing
// Core Data store this app must remain compatible with.
```

```swift
// GRDB: chosen when the team wants direct, reviewable SQL and full control over
// query plans and indices — common for apps with a heavy, hand-tuned query workload
// where an ORM's generated SQL is hard to reason about or optimize.
try dbQueue.write { db in
    try db.execute(sql: "INSERT INTO users (id, displayName) VALUES (?, ?)", arguments: [id, name])
}
```

```markdown
## Persistence choice: SwiftData for MobileApp's profile cache

Rejected: Core Data — its migration tooling is more mature, but this app has no
existing Core Data store to stay compatible with, and Core Data's larger boilerplate
buys nothing for this app's straightforward model shape.
Rejected: GRDB — full SQL control is valuable for a heavy, hand-tuned query workload;
this feature's queries are simple lookups by primary key, where GRDB's extra setup
and lost SwiftUI integration cost more than it returns.
Chosen: SwiftData — matches the model's actual complexity, and integrates directly
with the @Observable/SwiftUI data flow already used throughout this app (domain 03).
```

## 2. Migrations and the lightweight-migration cliff

```swift
// Lightweight migration: Core Data infers the mapping automatically for simple
// changes (adding an optional attribute, renaming with a mapping hint).
@objc(UserProfile)
class UserProfile: NSManagedObject {
    @NSManaged var id: String
    @NSManaged var email: String? // added attribute — Core Data infers this migration
}
```

> [!IMPORTANT]
> The "lightweight-migration cliff" is the point past which Core Data's automatic inference
> stops applying — splitting one entity into two, changing a relationship's cardinality, or any
> structural change beyond adding/removing/renaming a simple attribute requires a **custom
> mapping model**, hand-written and tested exactly like the Room migration test in this domain's
> Android article. Treating every future schema change as "probably lightweight" without
> checking against this specific list is how a migration silently fails or crashes in production
> for the first user whose data takes the untested path.

## 3. Keychain vs `UserDefaults`

```swift
// UserDefaults: ordinary settings and flags, not encrypted at rest by default —
// same security boundary as Android's DataStore.
UserDefaults.standard.set(true, forKey: "notifications_enabled")

// Keychain: the boundary for anything confidential — a token, a credential —
// backed by the Secure Enclave where available.
let query: [String: Any] = [
    kSecClass as String: kSecClassGenericPassword,
    kSecAttrAccount as String: "authToken",
    kSecValueData as String: tokenData,
]
SecItemAdd(query as CFDictionary, nil)
```

## 4. `URLCache` and HTTP-level caching

```swift
let cache = URLCache(memoryCapacity: 10 * 1024 * 1024, diskCapacity: 50 * 1024 * 1024)
let config = URLSessionConfiguration.default
config.urlCache = cache
config.requestCachePolicy = .useProtocolCachePolicy // honours the server's Cache-Control headers
```

`URLCache` caches at the HTTP layer, driven by the response's own `Cache-Control`/`ETag`
headers — a different, complementary mechanism to an app-level cache like the one this domain's
Android article builds by hand with a stated TTL; a well-configured server-side cache header can
remove the need for bespoke client-side cache logic entirely for read-mostly endpoints.

## Pitfalls & trade-offs

- **Picking a persistence layer by familiarity rather than by the actual model complexity and
  query needs.** The worked template above is the checkable version of the outcome — every
  rejected option needs a stated, specific reason.
- **Assuming every future schema change qualifies as a lightweight migration.** Covered above —
  check the specific list of what lightweight migration actually covers before assuming it, not
  after a crash report from production.
- **Storing a token in `UserDefaults`.** Identical boundary to Android's `DataStore` mistake —
  `UserDefaults` is not encrypted at rest by default; the Keychain exists for exactly this data.
- **Building an app-level HTTP cache by hand when the server already sends usable
  `Cache-Control` headers.** `URLCache` honouring protocol-level caching is often cheaper and
  more correct than reimplementing the same policy in application code.
