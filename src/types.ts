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

export interface TocItem {
  id: string;
  title: string;
  level: number; // 2 for h2, 3 for h3
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
}

