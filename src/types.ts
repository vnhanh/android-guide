export type Level = 'Mid' | 'Senior' | 'Lead';
export type Theme = 'dark' | 'light' | 'system';
export type Language = 'vi' | 'en';
export type Platform = 'android' | 'ios' | 'shared';
/** 'X' = not banded at the file/navigation level — used by domains (e.g. 01) whose
 * Mid/Senior/Lead split lives inside the article as labeled sections instead of as
 * separate per-band files. */
export type Band = 'M' | 'S' | 'L' | 'X';
export type Track = 'core-craft' | 'production' | 'systems' | 'leadership';
export type ContentStatus = 'complete' | 'pending';

/**
 * restructure-v2 (plan/restructure-v2.md §1) — the leaf axis a domain declares.
 * 'language': Java/Kotlin/Swift/Dart/TypeScript. 'platform': Android/iOS/Flutter.
 * 'none': flowing Middle→Senior→Lead sections, no leaf split.
 */
export type DomainAxis = 'language' | 'platform' | 'none';
export type LanguageLeaf = 'Java' | 'Kotlin' | 'Swift' | 'Dart' | 'TypeScript';
export type PlatformLeaf = 'Android' | 'iOS' | 'Flutter';

export interface TocItem {
  id: string;
  title: string;
  level: number; // 2 for h2, 3 for h3
  /** restructure-v2 §3 — the level badge this heading carries, when it is a
   * literal "Mid" / "Senior" / "Lead" H2 (the existing band=X convention) or
   * an explicit `{level=...}` heading tag. Undefined for headings with no tag. */
  levelTag?: Level;
  /** restructure-v2 §4 — `{concept=<id>}` heading tag, stripped from the
   * displayed title. Powers the auto-generated "Also in" cross-links. */
  concept?: string;
}

/** restructure-v2 §3 — one Middle/Senior/Lead-tagged span of a continuous
 * article, computed from its top-level (H2) headings. A domain axis='none'
 * or band='X' article can carry more than one; a normal single-band article
 * carries exactly one, covering its whole body. */
export interface LevelSection {
  level: Level;
  id: string; // heading anchor id to scroll/link to
  title: string;
}

/** restructure-v2 §4 — one `{concept=...}` heading, indexed at build time so
 * every other heading sharing the same concept id can be auto-linked as
 * "Also in: <leaf>" without any hand-maintained cross-reference. */
export interface ConceptEntry {
  concept: string;
  docId: string;
  headingId: string;
  title: string;
}

export interface ResourceLink {
  title: string;
  url: string;
  date: string;
}

export interface FigureAsset {
  path: string;
  alt: string;
  caption: string;
}

export interface SampleLink {
  repo: string;
  tag: string;
}

export interface DocItem {
  id: string;
  title: string;
  titleEn: string;
  description: string;
  descriptionEn: string;

  /** The `docs/` directory the article lives in — always a numbered domain slug. */
  category: string; // e.g. '04-concurrency-and-asynchrony'
  categoryTitle: string;
  categoryTitleEn: string;

  sidebar_position: number;
  tags: string[];
  level: Level;
  readingTime: string;

  /**
   * New domain x band x platform taxonomy (plan/framework.md, plan/domains.md).
   * All optional because the 14 existing articles have not been re-filed yet
   * (that is Phase 2 work) — the loader and every consumer must tolerate
   * these being absent rather than requiring Phase 2 to land first.
   */
  track?: Track;
  domain?: string; // e.g. '04-concurrency-and-asynchrony'
  band?: Band;
  platform?: Platform;
  counterpart?: string; // id of the paired platform article
  prerequisites: string[]; // article ids
  outcomes: string[];
  resources: ResourceLink[];
  figures?: FigureAsset[];
  demo?: string; // route/slug of an interactive demo
  samples?: SampleLink[];

  /** Per-language completeness, independent of which slot is being rendered. */
  langStatus: { en: ContentStatus; vi: ContentStatus };

  content: string; // Vietnamese slot (Markdown)
  contentEn: string; // English slot (Markdown)
  toc: TocItem[];

  /** restructure-v2 §3 — Middle/Senior/Lead spans found in this article's body
   * (English slot). Empty when the article has no recognisable level heading,
   * in which case the whole article is treated as a single `level`-badged unit. */
  levelSections: LevelSection[];
}

/** restructure-v2 §1 — per-domain leaf-axis declaration. Lives in
 * `src/data/domainAxes.ts`, keyed by the domain slug (`framework.ts` DOMAINS[].slug). */
export interface DomainAxisDef {
  axis: DomainAxis;
  /** Only set when axis !== 'none'. */
  leaves?: (LanguageLeaf | PlatformLeaf)[];
  /** True only where Lead content is genuinely leaf-specific (restructure-v2 §1).
   * Defaults to false — Lead stays a single flowing node. */
  leadLeaves?: boolean;
}

