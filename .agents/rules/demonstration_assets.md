# Demonstration Assets — Figures, Demos & Samples

This rule file governs the three kinds of non-prose evidence an article can carry. It is based
on the "Demonstration assets" section of `plan/README.md`; read that section for the full
rationale. It supersedes the `static/img/` line that used to be in
`.agents/rules/web_publishing_format.md`.

## Why this exists

The 14 pre-existing articles contain zero images, five Mermaid diagrams between them, and no
runnable sample. Meanwhile `plan/domains.md` writes outcomes as things you *show* — "show the
before-and-after scan", "halve a flake rate you have measured", "find the commit with `bisect`".
An outcome stated as evidence and delivered as prose is not assessable. This rule exists so that
does not happen 78 more times.

## The three kinds

| Kind | What it is | Lives in |
| :--- | :--- | :--- |
| **Figure** | Mermaid for anything structural. A raster capture only where the tool output *is* the evidence — Perfetto, a Gradle build scan, Instruments, Play Console, MetricKit. | `docs/<domain>/assets/<slug>/` |
| **Demo** | An interactive page in this site, for what a static image cannot carry — a recomposition counter, the matrix filter, a rollback decision tree. | `src/demos/<slug>.tsx`, routed |
| **Sample** | A runnable project. Gradle and Xcode builds have no business in a Vite repo's CI, so these live in companion repos — `…-samples-android`, `…-samples-ios`. | separate repo, linked **by tag** |

An article's frontmatter records what it carries: `figures: [{ path, alt, caption }]`,
`demo: <route-slug>`, `samples: [{ repo, tag }]` (see `src/types.ts`'s `DocItem`).

## The rules

- **Real captures only.** A screenshot of a profiler you did not run is a lie with a timestamp
  on it. If it was not measured, write the sentence instead.
- **Provenance in every raster caption** — tool and version, device or emulator, date. Undated
  tool screenshots go stale invisibly; that is how a guide ends up teaching a UI that shipped
  four years ago.
- **Alt text states the finding, not the filename.** `"Perfetto trace, 380 ms main-thread block
  during cold start"`, not `"perfetto.png"`.
- **Redact before committing.** Crash dashboards, Play Console and MetricKit captures are the
  most useful figures in Track B and the likeliest to carry an employer's package name, user
  counts or revenue. Capture a sample app, or crop and blur — and say in the caption which you
  did.
- **Samples pin to a tag, never a branch.** An article linking `main` is wrong the moment the
  sample improves. The tag goes in frontmatter (`samples[].tag`) beside the link.
- **Co-locate with the article; no global `static/img/`.** Phases 2-5 move and split articles
  constantly — `plan/gap-analysis.md` is a disposition table of precisely that — and a shared
  image dump turns every move into a broken-link hunt.
- **Budget.** SVG or WebP; 300 KB per figure, 1 MB per article. Over budget usually means the
  screenshot wanted to be a Mermaid diagram.

## When assets are required

Not on every article. They are required wherever the stated outcome is something the reader is
meant to *see* — which, across Track B, is most of it. This is distinct from Phase 6.3's
*evidence layer*, which is about promotion packets, not page assets.

## Companion sample repositories — status

`…-samples-android` and `…-samples-ios` do not exist yet. Creating them is explicitly **deferred**
past Phase 0/1 — see the status note in `CONTRIBUTING.md` and `plan/README.md`'s status board.
Nothing in Phase 0 or Phase 1 requires them; the first `samples[]` entry is not expected before
Phase 2's Domain 04 pilot.
