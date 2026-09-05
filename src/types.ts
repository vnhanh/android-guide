export type Level = 'Mid' | 'Senior' | 'Lead';
export type Theme = 'dark' | 'light' | 'system';
export type Language = 'vi' | 'en';
export type Platform = 'android' | 'ios' | 'shared';
export type Band = 'M' | 'S' | 'L';
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

  /** Legacy technology category, kept for the 14 not-yet-re-filed articles. */
  category: string; // '01-android' | '02-architecture-and-principles' | '03-ai-and-ux-leadership'
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

export interface Category {
  id: string;
  title: string;
  titleEn: string;
  description: string;
  descriptionEn: string;
  iconName: string;
  docCount: number;
}
