---
id: security-lead
title: Owning the Security Posture, SDK Vetting & Privacy Compliance (Lead, Android + iOS)
description: Owning the security posture, third-party SDK vetting, privacy compliance (Play Data Safety / App Privacy) and the review behind it, pen-test remediation and triage, and proportionality for the threat model.
tags: [android, ios, security, privacy, lead, compliance]
lang: en
status: complete
domain: 10-security-and-privacy
band: L
platform: shared
level: Lead
sidebar_position: 3
prerequisites: [security-senior]
outcomes:
  - "Run an SDK review that rejects something, and write down the criteria that made it a rejection rather than a judgement call"
resources:
  - title: "Play Console — Data safety"
    url: "https://support.google.com/googleplay/android-developer/answer/10787469"
    date: "2025-03-01"
  - title: "App Privacy details on the App Store"
    url: "https://developer.apple.com/app-store/app-privacy-details/"
    date: "2025-06-01"
  - title: "OWASP Mobile Application Security Verification Standard (MASVS)"
    url: "https://mas.owasp.org/MASVS/"
    date: "2025-01-01"
---

# Owning the Security Posture, SDK Vetting & Privacy Compliance

> **Outcome.** Run a real third-party SDK review that rejects a candidate, and write down the
> criteria that made it a rejection — a documented bar someone else could apply consistently,
> not a judgement call made once and unrepeatable.

## 1. Owning the security posture

Owning a posture means the answer to "what's our current security exposure" is a maintained
document, not a conversation that starts from zero every time someone asks:

```markdown
# Security posture — MobileApp, reviewed quarterly

Threat models on file: checkout (2025-08), profile upload (2025-06), auth (2025-09).
Outstanding findings: 2 medium (pen-test, section 3), 0 high.
Third-party SDKs in the app: 14, last reviewed 2025-07 (section 2).
Last privacy-label audit: 2025-08, matches actual data collection (section 3).
Known gaps: no threat model yet for the new push-notification deep-link flow —
scheduled before that feature ships, not after.
```

> [!IMPORTANT]
> The document's value is in the "known gaps" line. A posture document with no acknowledged
> gaps is not thorough, it's undermaintained — a real one names what has not been reviewed yet
> as plainly as what has.

## 2. Third-party SDK vetting — the main way risk enters an app

Most mobile security incidents do not originate in first-party code; they arrive through a
dependency that had its own vulnerability, over-collected data, or was compromised upstream.

```markdown
## SDK review: AdNetworkX SDK v3.2

Permissions requested by the SDK: ACCESS_FINE_LOCATION, READ_PHONE_STATE — beyond
what an ad SDK needs to serve ads; flagged.
Data collected (per its own privacy disclosure): device ID, precise location,
installed-app list — installed-app list is a fingerprinting vector not disclosed
in its marketing docs, found only by reading the actual manifest/entitlements.
Network destinations: calls an undocumented third-party analytics endpoint not
named in its privacy policy.
Update cadence: last released 14 months ago — no active maintenance, so any
vulnerability found in it has no patch path.
Decision: REJECTED. Criteria that made it a rejection, not a judgement call:
(1) requests a permission with no feature justification, (2) collects data beyond
its disclosed purpose, (3) no maintenance cadence to patch a future CVE. Any one
of these three is sufficient grounds; this SDK hit all three.
```

> [!IMPORTANT]
> The assessable version of this outcome is the numbered criteria list, not the rejection
> itself. "We didn't like it" is a judgement call that doesn't generalise to the next SDK;
> "it failed criterion 2 of our stated bar" is a review someone else can run the same way.

## 3. Privacy compliance: Play Data Safety, App Privacy, and the review behind them

Both stores require a declared data-collection label, and both labels are only honest if
someone actually checked the declaration against what the code does:

```markdown
## Data-safety audit: does the label match the code?

Declared (Play Data Safety form): location (approximate), not shared with third parties.
Actual (grep for LocationManager/CLLocationManager usage + network destination audit):
  - Approximate location, collected for "nearby stores" (matches declaration).
  - BUT: a bundled analytics SDK (section 2) sends device ID to its own servers —
    not disclosed on the current form. This is a compliance gap, not just a
    security one, and needs the form corrected before the next submission.
```

> [!WARNING]
> A Data Safety / App Privacy label filled out from what the team *intends* to collect, never
> reconciled against what a third-party SDK actually sends over the network, is the single most
> common way these labels end up wrong — and a wrong label is a store-policy violation
> independent of whether the underlying collection itself was ever malicious.

## 4. Pen-test remediation and triage

```markdown
## Pen-test findings triage — MobileApp, 2025-Q3

HIGH: exported ContentProvider exposes user records with no permission check —
fix before next release, blocks ship (this is the confused-deputy pattern from
domain 10's Senior article, found by an external tester instead of caught in review).
MEDIUM: root-detection bypass via Frida hook — accepted risk, documented reason:
root detection was never the sole control on the feature it guards (domain 10
Senior's honest framing); the actual control (server-side transaction limits)
still holds. Tracked, not blocking.
LOW: verbose error message reveals internal package name — filed as tech debt,
next normal release cadence, not a security-blocking issue.
```

> [!IMPORTANT]
> Triage is a proportionality judgement stated in writing, same as the "accept, mitigate,
> escalate" call on any risk: not every finding blocks a release, and pretending every finding is
> equally urgent burns credibility with the team the same way a noisy alert (domain 12's Senior
> article) burns credibility with on-call. The finding that matters is the one triaged
> correctly and closed — not the one merely logged.

## 5. Proportionality for the threat model

```markdown
Not every feature needs the same depth of threat model. A internal admin tool used
by three employees on managed devices does not need the same rigor as a public
checkout flow handling payment tokens for a million users — applying the checkout
flow's full threat-modelling ceremony to the admin tool is security theatre that
crowds out reviewing the features that actually carry risk.
```

> [!IMPORTANT]
> Proportionality is itself the Lead-level judgement call this domain builds toward: deciding
> how much hardening a given feature deserves, given its actual blast radius, rather than
> applying a uniform maximum-security posture everywhere and running out of review time before
> reaching the features that matter most.

## Parity — hardening and compliance surfaces across platforms

**Maps:** Android Keystore ↔ iOS Keychain + Secure Enclave · Android network security config ↔
iOS App Transport Security (ATS) · Play Data Safety form ↔ App Privacy "nutrition label" · R8
identifier renaming ↔ *no equivalent*.

**Breaks (load-bearing):** there is no iOS counterpart to R8 identifier renaming (worked in
full in domain 10's Senior article). Android engineers who have come to rely on obfuscation as
part of their stated security posture overestimate what it buys even on Android — it raises the
cost of reverse engineering, it is not a security boundary — and then find the equivalent lever
entirely absent on iOS. The right posture treats it as a reverse-engineering cost multiplier on
both platforms, present on one and absent on the other, never as a control that appears in the
mitigations column of a threat model or a compliance document on either platform.

## Pitfalls & trade-offs

- **A posture document with no acknowledged gaps.** Covered above — that reads as
  undermaintained, not as thorough; a real gaps list is what makes the document trustworthy.
- **Rejecting an SDK on a judgement call with no stated criteria.** The criteria are the
  actual deliverable — a rejection nobody else can reproduce doesn't generalise to the next
  review.
- **A Data Safety / App Privacy label reconciled against intent instead of against what
  bundled third-party code actually sends over the network.** The gap between the two is where
  most compliance violations live, not in the first-party code the team wrote itself.
- **Treating every pen-test finding as equally urgent.** Proportional triage — accept,
  mitigate, or block-the-release — stated in writing is what keeps the team's trust in the
  process; treating every finding as a fire drill burns that trust the same way a noisy alert
  channel does.
- **Applying maximum threat-modelling ceremony uniformly instead of scaling it to actual
  blast radius.** The proportionality call is the point of Lead-level ownership here, not an
  afterthought once the "real" work is done.
