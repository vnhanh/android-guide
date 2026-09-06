---
id: ai-mid
title: Working With AI Day-to-Day, Core Concepts & Reading the Field (Mid)
description: The workflow for using AI tools from the moment a ticket lands, the foundational concepts every engineer should have before touching an LLM, and how to track a fast-moving field without chasing every headline.
tags: [ai, llm, workflow, fundamentals, mid]
lang: en
status: complete
domain: 21-ai-and-llm-engineering
band: M
platform: shared
level: Mid
sidebar_position: 1
prerequisites: []
outcomes:
  - "Given a new ticket, name which stage of the workflow AI actually helps at and which it doesn't, explain in two sentences how the model you're using turns a prompt into an answer, and name the eval you'd run before trusting a new model on your own tasks"
resources:
  - title: "Anthropic — Claude Code overview"
    url: "https://docs.claude.com/en/docs/claude-code/overview"
    date: "2025-06-01"
  - title: "OpenAI — Prompt engineering guide"
    url: "https://platform.openai.com/docs/guides/prompt-engineering"
    date: "2025-03-01"
  - title: "Google — Introduction to large language models"
    url: "https://developers.google.com/machine-learning/resources/intro-llms"
    date: "2024-11-01"
  - title: "Chatbot Arena (LMArena) — community LLM leaderboard"
    url: "https://lmarena.ai/"
    date: "2025-08-01"
---

# Working With AI Day-to-Day, Core Concepts & Reading the Field

> **Outcome.** Given a new ticket, name which stage of the workflow AI actually helps at and
> which it doesn't, explain in two sentences how the model you're using turns a prompt into an
> answer, and name the eval you'd run before trusting a new model on your own tasks — not "it
> felt smarter," an actual check against your own work.

This is the entry point for domain 21. Everything downstream — backend architecture for LLM
features (Senior), RAG systems, cost and latency optimisation, agents and prompt security — takes
for granted that you already have a working relationship with AI tools as part of how you build
software, and a vocabulary for talking about the model underneath them. This unit is that
baseline.

## 1. What to do with AI from the moment a requirement lands

AI-assisted work is not one activity, it's several, and they don't all deserve the same amount of
trust. The workflow below is not "use AI for everything" — it's a map of where in a normal ticket
lifecycle an assistant earns its keep and where it's actively risky to lean on one.

| Stage | What AI is good at here | What still has to be you |
| :--- | :--- | :--- |
| **Clarifying the requirement** | Restating an ambiguous ticket back as a checklist, surfacing edge cases you didn't think to ask about | Deciding what "done" actually means — domain 18's territory, not the model's |
| **Exploring the codebase** | Finding where a symbol is used, summarising an unfamiliar module, tracing a call path across files | Verifying the summary against the actual code before you act on it — models miss recently-changed code and stale mental models |
| **Writing the implementation** | Boilerplate, a first draft of a function whose shape you already know, translating a well-specified algorithm into code | The design decision itself — an assistant will happily implement a bad design fluently and without objection |
| **Writing tests** | Enumerating edge cases from a spec, generating table-driven test scaffolding | Deciding which edge cases actually matter for this feature's risk profile |
| **Debugging** | Reading a stack trace and proposing hypotheses, searching for a known issue pattern | Reproducing the bug and confirming the real root cause — a model can be confidently wrong about causation |
| **Code review** | A first pass for style, obvious bugs, missing null checks | Judging design, risk and whether this is the right change at all — domain 17's territory |
| **Writing the PR description / docs** | A solid first draft from your diff and commit messages | Making sure it says why, not just what — see domain 16 |

The single most common mistake at Mid band is collapsing this table into "AI writes the code, I
review it." That inverts the actual risk profile: an assistant is most trustworthy on narrow,
verifiable tasks (boilerplate, test scaffolding, a summary you can check against the source) and
least trustworthy on the tasks that are hardest to verify by inspection (root cause, design,
"does this actually satisfy the requirement").

```
Requirement in ──▶ Clarify (you decide "done") ──▶ Explore/implement/test (AI assists, you verify)
                                                         │
                                                         ▼
                                    Review, ship, document (you own the judgement calls)
```

## 2. Benefits and costs, stated plainly

**What AI-assisted work actually buys you:**

- **Speed on narrow, well-specified tasks** — boilerplate, test scaffolding, a first-draft
  translation of a spec into code, a summary of an unfamiliar file.
- **Lower cost of exploring the unfamiliar** — a new codebase, an unfamiliar API, a language
  you don't use daily. The model won't always be right, but it lowers the cost of the first
  hypothesis.
- **A second pass that never gets tired** — a model reviewing a diff for null checks or missed
  edge cases doesn't skim the way a human does at 6pm on a Friday.

**What it costs if you don't manage it:**

- **Hallucination presented with full confidence.** A wrong answer from an LLM reads exactly
  like a right one — same tone, same fluency. This is the property that makes verification
  non-optional rather than a nice-to-have.
- **Skill atrophy on the exact skills that let you verify AI output.** If you stop debugging by
  hand, you lose the ability to tell when the model's hypothesis about a bug is wrong — the
  skill and the ability to check the tool degrade together.
- **IP and secrets leakage.** Pasting proprietary code, customer data, or credentials into a
  public model's web UI is a data-handling decision, not a productivity one — see your
  organisation's AI usage policy before you do it, and never paste a secret into any prompt,
  public or private.
- **Over-trust compounding across a chain of AI-assisted steps.** One unverified assumption
  early in a multi-step task (explore → implement → test, all AI-assisted) propagates silently
  through every step after it, and the failure surfaces far from its actual cause.

> [!IMPORTANT]
> The rule that resolves most of the judgement calls above: **use AI in proportion to how cheaply
> you can verify its output.** Boilerplate and test scaffolding are cheap to verify by reading.
> "Why is this crashing in production" and "is this the right design" are expensive or impossible
> to verify by reading alone — treat AI's answer there as a hypothesis, not a conclusion.

## 3. Core concepts: what's actually happening under the prompt

You don't need to be able to derive backpropagation to use these tools well, but every concept
below changes a decision you make daily, and "it's magic" is not a substitute for any of them.

| Term | What it means | Why it matters day to day |
| :--- | :--- | :--- |
| **Token** | The model's unit of text — roughly ¾ of a word in English, more per word in some other languages and in code with unusual identifiers | Cost and context-window budgets are counted in tokens, not characters or words — a prompt with a huge pasted file can silently blow the budget |
| **Context window** | The maximum number of tokens (prompt + conversation history + output) the model can attend to at once | Paste too much and the model may lose track of instructions given early in a long conversation — this is why very long sessions degrade even with no bug in the tool |
| **Parameters** | The learned weights of the model — roughly, its capacity | Larger isn't strictly better for your task; a smaller model fine-tuned or prompted well for a narrow job can beat a bigger general one on cost and latency |
| **Inference vs. training** | Training is where the weights are learned (expensive, done once by the model provider); inference is running the already-trained model on your prompt (what you pay for per call) | You are almost never training a foundation model yourself — you're either prompting one or, at most, fine-tuning a small adapter on top of one (domain 21's Senior unit on LoRA) |
| **Temperature** | A sampling parameter controlling how deterministic vs. varied the output is | Low temperature for code generation and structured output you'll parse; higher temperature for brainstorming, where variety is the point |
| **Hallucination** | The model generating a fluent, confident, and factually wrong statement — not a bug in the traditional sense, a property of how the model generates text | The reason verification is mandatory, not optional, for anything you didn't already know how to check |
| **System prompt vs. user prompt** | The system prompt sets standing instructions/persona for the whole session; the user prompt is the specific ask | Confusing the two is a common cause of an assistant "forgetting" an instruction — it was buried in a long user turn instead of stated as a standing rule |

At a mechanical level: a large language model is trained to predict the next token given everything
before it, over enormous text and code corpora, then further tuned (instruction-tuning, RLHF or
similar) to make that next-token prediction behave like a helpful response to a request rather
than a raw continuation of text. Every one of its answers — correct or hallucinated — comes out of
that same mechanism; there is no separate "fact-checking" step happening unless the tool
explicitly does retrieval or tool use (domain 21's Senior units cover both).

## 4. Tracking the field and evaluating a new model

New models and tools ship every few weeks. Chasing every release is a full-time job that isn't
yours, and switching tools on marketing claims alone is how teams end up with an unreliable,
constantly-changing toolchain. The workable process:

1. **Keep a small, real eval set of your own tasks** — five to twenty prompts drawn from things
   you actually asked a model to do last month (a real bug, a real refactor, a real doc draft),
   with a rough pass/fail bar you can judge yourself. This is the single highest-leverage thing
   in this section: it turns "does the new model seem better" from a vibe into a comparison.
2. **Read the model card and provider's own benchmark disclosures**, not just the headline
   number — a released benchmark score tells you what the model was tuned to be good at, and a
   provider's own numbers are marketing until you've reproduced them on your own task shape.
3. **Check public, cross-provider leaderboards** (Chatbot Arena/LMArena and similar) as a
   sanity check on relative ranking, understanding they measure general preference, not your
   specific workload — a model that wins broad human-preference voting can still lose on your
   narrow, code-heavy eval set.
4. **Re-run your eval set before switching**, and weigh the result against the switching cost —
   cost per token, latency, context-window size, and whether your existing tool integrations
   (IDE plugin, CI step, internal wrapper) already support it.
5. **Re-evaluate on a cadence, not on every release** — quarterly is reasonable for most teams;
   let the provider's release notes tell you when something is worth an off-cycle look (a
   material jump in a capability you actually use, a price change, a context-window increase
   that removes a limitation you'd been working around).

## Pitfalls & trade-offs

- **Treating fluent output as correct output.** Hallucination and correctness produce
  identical-looking prose — the tell is never in the tone, only in verification against a source
  you trust.
- **Skipping the verification step because the previous ten answers were right.** The failure
  mode doesn't announce itself; it looks exactly like every correct answer that came before it.
- **Chasing every new model release without an eval baseline.** Without your own small eval set,
  "this model feels better" is not a decision criterion a reviewer can check.
- **Pasting proprietary code, customer data, or credentials into a public tool.** This is a
  data-handling and IP decision, not a productivity shortcut — check your organisation's AI usage
  policy before you do it.
- **Collapsing "AI-assisted" into "AI writes it, I review it."** The highest-value use is on
  narrow, cheaply-verified tasks; the highest-risk use is unverified trust on design and root
  cause, which is exactly backwards from how most people default to using these tools.
