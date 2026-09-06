---
id: ai-lead
title: Owning AI as a Portfolio — Usage Policy, Platform Investment & Vendor Risk (Lead)
description: Writing the org's AI data-handling policy before individual judgement calls fill the gap, treating AI backend architecture as a shared platform investment rather than a per-feature decision, making the fine-tune-vs-prompt and BYOK-vs-proxy calls as engineering economics, and vetting an AI vendor as a supply-chain dependency with its own data-use wrinkle.
tags: [ai, llm, leadership, governance, vendor-risk, lead]
lang: en
status: complete
domain: 21-ai-and-llm-engineering
band: L
platform: shared
level: Lead
sidebar_position: 3
prerequisites: [ai-senior]
outcomes:
  - "Write the org's AI usage and data-handling policy before a single incident forces one into existence, and decide — with a stated, defensible reason — whether the next AI feature gets its own bespoke integration or joins a shared platform"
resources:
  - title: "OWASP Top 10 for Large Language Model Applications"
    url: "https://owasp.org/www-project-top-10-for-large-language-model-applications/"
    date: "2025-01-01"
  - title: "NIST AI Risk Management Framework"
    url: "https://www.nist.gov/itl/ai-risk-management-framework"
    date: "2024-07-01"
  - title: "Documenting architecture decisions — Michael Nygard"
    url: "https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions"
    date: "2011-11-15"
---

# Owning AI as a Portfolio — Usage Policy, Platform Investment & Vendor Risk

> **Outcome.** Write the org's AI usage and data-handling policy before a single incident forces
> one into existence, and decide — with a stated, defensible reason — whether the next AI feature
> gets its own bespoke integration or joins a shared platform.

Everything in this domain's Mid and Senior units is a skill an individual engineer or a single
feature team applies. What changes at Lead is the unit of decision: not "is this feature's AI
integration well designed," but "does the org have a policy, a shared platform and a vendor
posture that make every feature's AI integration well designed by default, without each team
re-deriving domain 21 from scratch."

## 1. The AI usage and data-handling policy has to exist before it's needed

This domain's Mid unit named the risk plainly: pasting proprietary code, customer data or
credentials into a public AI tool is a data-handling decision, not a productivity shortcut. Left
unstated, that decision gets made anyway — differently, by every engineer, under time pressure,
with no consistent answer — and the first time it becomes visible is usually an incident, not a
policy review.

A Lead's job is writing the policy down before that happens: which tools are approved for which
data classifications, whether a given AI coding assistant's training-data policy is compatible
with the org's IP obligations, what "customer data" specifically covers in this context, and who
to ask when a new tool or use case isn't covered by the existing answer. This is not meaningfully
different in shape from any other security policy a Lead owns (domain 10) — it differs only in
how fast the tooling changes underneath it, which is why it needs an explicit owner and a review
cadence rather than a document written once and left to go stale.

## 2. AI backend architecture as a shared platform, not N bespoke integrations

This domain's Senior unit designs one feature's server-side AI architecture — the proxy, the key
pool, the cache, retrieval if the feature needs it. Left to individual feature teams, each one
builds its own version of all of it: its own proxy, its own key-management code, its own caching
layer, often at different quality levels and with different security postures.

The Lead-level call is whether that duplication is actually cheaper than a shared platform — one
proxy, one key pool with the load-balancing and rotation from the Senior unit already built in,
one caching layer, one evaluation harness for RAG features — that every feature team builds on top
of instead of rebuilding underneath. The economics are the same portfolio logic domain 15 applies
to technical debt: a shared platform costs real, funded investment up front and pays it back once
a second and third feature need the same pieces the first one already built; a purely
feature-by-feature approach never pays that cost explicitly, and instead pays it repeatedly, once
per feature, usually at lower quality each time because no single team owns getting it fully
right.

This does not mean every org needs a platform team on day one — for a single AI feature, building
it well within that feature's team is entirely reasonable. The judgement call is naming the
trigger for when that stops being true: a second feature request for the same capability is
usually the signal that the next unit of work should be "extract the shared piece," not "build a
second bespoke proxy."

## 3. Fine-tune vs. prompt, BYOK vs. proxy — as engineering economics, not defaults

Two decisions this domain's Senior units set up technically are, at Lead level, cost-of-delay and
build-vs-buy calls (domain 14's Lead unit), not technical defaults to apply uniformly everywhere:

- **Fine-tuning (LoRA) vs. staying on prompting and retrieval.** Fine-tuning earns its ongoing
  maintenance cost — a training pipeline, versioned adapters, re-training when the base model
  updates — when a task is narrow, high-volume, and prompting plus RAG genuinely can't hit the
  required accuracy or latency. For most features, a well-designed RAG pipeline against a strong
  general model is cheaper to build *and* to maintain than a fine-tuned model, because it has no
  training pipeline to keep running. Reach for fine-tuning as a stated response to a specific,
  measured shortfall in what prompting can do — not as a default "more sophisticated" option.
- **BYOK vs. a pooled proxy, per product line.** This domain's backend-architecture unit is
  explicit that BYOK's biggest cost is activation friction for a mainstream audience. That's a
  reason to default to a pooled proxy for a mainstream product — it is not a reason to rule BYOK
  out everywhere; a developer-tool product line with a technical audience that already holds
  provider accounts can legitimately make the opposite call. The Lead-level mistake is applying
  one answer as company policy across product lines with genuinely different users, rather than
  deciding it per product line the same way domain 14 asks every real architectural decision to
  be made — against the actual constraint, not a company-wide habit.

## 4. Vetting an AI vendor is supply-chain risk with an added wrinkle

An AI model provider is a third-party dependency like any other vendor domain 10 already asks a
Lead to vet — uptime, security posture, data-handling terms, what happens if they raise prices or
shut down a model version you depend on. The wrinkle specific to AI vendors: **data sent to a
model for inference may, depending on the provider and the account tier, be used for further model
training unless explicitly opted out** — a term that matters enormously for anything touching
customer data or IP, and one that's easy to miss because it's a data-use clause, not an uptime or
security clause, and it doesn't show up in the kind of security review checklist written before AI
vendors existed.

A Lead vetting a new AI vendor needs an explicit answer, in writing, to: does this account tier
train on our data by default, is there an enterprise tier or an explicit opt-out that changes
that, and does our data-handling policy (Section 1) permit this vendor for the data classification
the feature actually needs. This has to be resolved before a feature ships, not discovered during
a security review after it already has — a policy the org didn't check before commit is not a
policy, it's a hope.

## Pitfalls & trade-offs

- **Leaving the AI usage policy implicit until an incident writes it for you.** By the time a
  leaked credential or a customer-data exposure forces the conversation, the policy gets written
  under duress, usually more restrictive than a calmly-considered one would have been, and with
  no chance to get ahead of it.
- **Letting every feature team rebuild the proxy, key pool and cache from the Senior unit
  independently.** The duplicated cost is real even when no single instance of it is visibly
  broken — it shows up as inconsistent security posture and quality across features, not as one
  dramatic failure.
- **Treating fine-tuning as the "more serious" or "more advanced" option and reaching for it by
  default.** For most features it's the more expensive option to maintain, not the more
  sophisticated one — the right trigger is a measured shortfall prompting and retrieval can't
  close, not seniority signalling.
- **Applying one BYOK-vs-proxy answer company-wide.** The right call depends on the specific
  product line's audience and activation funnel, not on which pattern the backend team happens to
  prefer.
- **Reviewing an AI vendor with a security checklist written before AI vendors existed.** A
  checklist that covers uptime and access control but never asks whether the vendor trains on
  submitted data will pass a vendor that shouldn't pass, for a data classification the org can't
  actually accept.
