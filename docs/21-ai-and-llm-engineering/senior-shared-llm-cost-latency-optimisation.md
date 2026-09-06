---
id: ai-senior-cost-latency-optimisation
title: Cutting Cost and Latency — Caching, Client-Side De-Duplication & AI Memory (Senior)
description: The caching techniques that cut cost and latency for repeated questions, how a mobile client should handle repeated or rapid-fire prompts of its own, and how AI memory works at the conversation, project and machine level without blowing the context window.
tags: [ai, llm, caching, performance, memory, senior]
lang: en
status: complete
domain: 21-ai-and-llm-engineering
band: S
platform: shared
level: Senior
sidebar_position: 6
prerequisites: [ai-senior]
outcomes:
  - "Given a feature where users ask near-identical questions repeatedly, design the caching layers (server-side, semantic, provider-level) and the client-side request handling that together cut cost and latency, and state where each kind of AI memory lives and why it isn't all dumped into every prompt"
resources:
  - title: "Anthropic — Prompt caching"
    url: "https://docs.claude.com/en/docs/build-with-claude/prompt-caching"
    date: "2025-05-01"
  - title: "OpenAI — Prompt caching"
    url: "https://platform.openai.com/docs/guides/prompt-caching"
    date: "2024-10-01"
  - title: "Redis — Caching patterns"
    url: "https://redis.io/docs/latest/develop/use/patterns/"
    date: "2024-01-01"
---

# Cutting Cost and Latency — Caching, Client-Side De-Duplication & AI Memory

> **Outcome.** Given a feature where users ask near-identical questions repeatedly, design the
> caching layers (server-side, semantic, provider-level) and the client-side request handling
> that together cut cost and latency, and state where each kind of AI memory lives and why it
> isn't all dumped into every prompt.

This domain's core Senior unit named caching as, on most features, the single biggest cost and
latency lever available — bigger than model choice. This unit is the full technique set, plus the
client-side half of the problem and the related question of how AI "memory" is actually stored and
retrieved.

## 1. Techniques for repeated questions

Layer these from cheapest/coarsest to most nuanced — most production systems use several at once:

- **Exact-match response caching.** Hash the normalised prompt (and any parameters that affect
  the answer — model, temperature, retrieved context if any) as a cache key, store the full
  response in a fast store (Redis, a CDN edge cache), and return the cached response on a hit
  without calling the model at all. This is the single biggest lever for genuinely repeated
  questions — an FAQ-style feature, the same product question asked by many users — because it
  eliminates the model call entirely, not just part of its cost.
- **Semantic caching.** Exact-match misses "what's your refund policy" against a cached "how do I
  get a refund." Embed the incoming prompt (the same machinery this domain's RAG unit uses for
  retrieval) and look up cached prompts within a similarity threshold instead of requiring an
  exact string match — a strict superset of exact-match caching that catches paraphrases at the
  cost of an embedding lookup instead of a hash lookup.
- **Provider-level prompt caching.** Distinct from your own response cache: most providers let you
  mark a long, repeated *prefix* of the prompt — a system prompt, few-shot examples, a large
  retrieved-context block — as cacheable, so a later request reusing that same prefix is billed
  and served at a fraction of the cost and latency for the cached portion, even though the final
  question differs each time. This is the specific technique that makes RAG affordable at volume:
  the retrieved context is often the largest part of the prompt and is frequently reused across
  different users' questions about the same source material.
- **Model routing / cascading.** Route cheap, low-difficulty queries to a small, fast model and
  reserve the larger model for queries that actually need it — this domain's dedicated note on AI
  model routing and classifier architecture works this pattern in full.
- **Batching, shorter output limits and streaming** address latency from different angles: batching
  amortises fixed overhead for non-interactive requests, a tighter `max_tokens` bounds the worst
  case, and streaming (covered in this domain's backend-architecture unit) improves perceived
  rather than total latency — all worth doing, none of them a substitute for the caching layers
  above when the actual problem is repeated questions.

## 2. Handling repeated prompts on the mobile client itself

Server-side caching handles repetition *across* users; the client has its own repetition problem —
the same user, the same device, in a single session — that a server-side cache doesn't see at all
if it isn't designed to look for it:

- **Request coalescing.** If the same input is submitted while an identical request is still
  in-flight (a double-tap on "send," a "regenerate" tap before the first answer arrived), attach
  the second caller to the first request's in-flight result instead of firing a second call —
  this is both a cost saving and a correctness fix, since two identical in-flight requests can
  return in either order.
- **A small local cache keyed on the normalised input**, held in memory or on disk with a short
  TTL, so re-asking the same question moments later — a user backgrounding and returning to the
  app, a retry after a transient network blip — doesn't need a round trip at all.
- **Debounce or throttle on rapid-fire input**, for any feature that fires a request per
  keystroke or per small edit (an AI-assisted autocomplete or suggestion feature) — firing on
  every keystroke multiplies cost for no benefit, since only the final, settled input is ever
  actually useful to the user.
- **Cancelling stale in-flight requests when the input changes before the previous one
  returns.** Beyond the wasted cost, an uncancelled stale request racing a newer one can return
  second and silently overwrite the newer, correct answer on screen — a correctness bug, not just
  an efficiency one, and the same structured-concurrency discipline as any other cancellable async
  work on the client (domain 04).
- **Idempotency keys on retried requests.** A client-side retry after a timeout has no way to
  know whether the original request actually reached the server and was processed — attaching an
  idempotency key lets the backend recognise a retried request as the same one and return the
  original result instead of processing (and billing) it twice.

## 3. AI memory: conversation, project and machine level

"Memory" is not one mechanism — three distinct scopes exist, each solving a different problem,
and conflating them is a common source of both wasted context-window budget and stale information
leaking into the wrong conversation:

| Scope | Lifetime | What lives there | How it enters the prompt |
| :--- | :--- | :--- | :--- |
| **Conversation memory** | One session | The turn-by-turn chat history | Sent back verbatim each turn, up to the context-window limit; older turns get truncated or summarised once the window fills |
| **Project/workspace memory** | Persists across sessions, scoped to one project | Facts specific to this codebase or workspace — architecture, conventions, decisions already made | Loaded automatically at the start of a session working in that project, read from a curated file or store the team maintains |
| **Machine/user-level memory** | Persists across every project and session for a user or device | Durable facts about the user or their preferences that aren't specific to any one project | Retrieved selectively — usually via an embedding-similarity lookup over stored memory entries, not a flat dump — and injected only when relevant to the current request |

The reason none of these scopes simply concatenates its entire history into every prompt is the
same constraint that shapes RAG: the context window is finite and costly, and dumping everything
into it dilutes the model's attention on what actually matters for the current request, which
degrades answer quality even when it technically still fits. This is why machine-level memory in
particular is frequently implemented as its own small retrieval system — write concise, tagged
notes, then retrieve only the ones relevant to the current task by similarity, exactly mirroring
this domain's RAG unit rather than being a separate idea.

**Conversation memory's own scaling problem** deserves a specific mention: as a session grows,
naively resending the full history eventually exceeds the context window or becomes prohibitively
expensive even before it does. The standard mitigations are a sliding window (keep only the most
recent N turns verbatim) and periodic summarisation (collapse older turns into a condensed summary
that's kept in context in place of the verbatim exchange) — both trade some fidelity about the
early conversation for a bounded, predictable cost per turn as the session continues.

## Pitfalls & trade-offs

- **Treating provider-level prompt caching as a substitute for your own response cache, or vice
  versa.** They solve different problems — one avoids re-paying for a repeated prefix within a
  request that still needs a fresh model call, the other avoids the model call entirely for a
  genuinely repeated question — and a mature system usually needs both.
- **Semantic caching with too loose a similarity threshold.** Returning a cached answer for a
  question that's merely *similar*, not equivalent, produces a wrong answer that looks exactly
  as confident as a correct cached one — tune and evaluate the threshold the same way the RAG
  unit evaluates retrieval, not by eyeballing a few examples.
- **Firing a network request on every keystroke of an AI-assisted input field.** This is a purely
  client-side cost problem invisible to any server-side cache, and debouncing is nearly free to
  add compared to the cost it saves.
- **Forgetting to cancel a stale in-flight request when the input changes.** Beyond wasted spend,
  this is a real race condition — the stale response can arrive after the new one and overwrite
  it on screen.
- **Injecting all of a user's stored memory into every prompt "to be safe."** This is the memory
  equivalent of skipping retrieval and pasting an entire document store into the prompt — it costs
  context-window budget and dilutes relevance for exactly the reason RAG's retrieval step exists
  in the first place.
