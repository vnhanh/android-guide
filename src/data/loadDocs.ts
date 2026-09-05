import { parseFrontmatter } from '../lib/frontmatter';
import { slugifyHeading } from '../lib/slug';
import { Category, ContentStatus, DocItem, Language, Level, TocItem } from '../types';

/**
 * Build-time markdown loader — Phase 0.2 / 0.4.
 *
 * `docs/**\/*.md` is the only source of truth for article prose. This module
 * reads every file eagerly at build time (via Vite's `import.meta.glob`),
 * parses its frontmatter, and assembles the `DocItem[]` the rest of the app
 * consumes. Nothing here requires an article to have been re-filed onto the
 * new domain/band/platform taxonomy (that is Phase 2) — every new field is
 * optional and defaults sensibly when absent.
 *
 * Language convention: a file's frontmatter carries `lang: en | vi` and
 * `status: complete | pending`. Today every file is `lang: en`; a `vi`
 * counterpart is expected to eventually appear as a sibling file sharing the
 * same frontmatter `id`. Until it does, the `vi` slot is reported as
 * `pending` rather than silently falling back to English prose.
 */

const rawModules = import.meta.glob('/docs/**/*.md', {
  eager: true,
  query: '?raw',
  import: 'default',
}) as Record<string, string>;

const LEGACY_CATEGORY_TITLES: Record<string, { title: string; titleEn: string; description: string; descriptionEn: string; iconName: string }> = {
  '01-android': {
    title: 'Android Stack',
    titleEn: 'Android Stack',
    description: 'Kotlin 2.x, Jetpack Compose, Coroutines & Flow, Multi-Module Architecture, Gradle Profiling, Micro/Macrobenchmarks, R8/ProGuard.',
    descriptionEn: 'Kotlin 2.x, Jetpack Compose, Coroutines & Flow, Multi-Module Architecture, Gradle Profiling, Micro/Macrobenchmarks, R8/ProGuard.',
    iconName: 'Smartphone',
  },
  '02-architecture-and-principles': {
    title: 'Architecture & Principles',
    titleEn: 'Architecture & Principles',
    description: 'OOP 4 Pillars, SOLID Principles, Clean Architecture Enforcement, Code Review Risk Matrix & Tech Debt Mentorship.',
    descriptionEn: 'OOP 4 Pillars, SOLID Principles, Clean Architecture Enforcement, Code Review Risk Matrix & Tech Debt Mentorship.',
    iconName: 'Building2',
  },
  '03-ai-and-ux-leadership': {
    title: 'AI & Mobile UX Leadership',
    titleEn: 'AI & Mobile UX Leadership',
    description: 'On-device / edge AI notes and mobile UX prioritization frameworks. Slated to leave the primary ladder in Phase 2 (see plan/gap-analysis.md).',
    descriptionEn: 'On-device / edge AI notes and mobile UX prioritization frameworks. Slated to leave the primary ladder in Phase 2 (see plan/gap-analysis.md).',
    iconName: 'Sparkles',
  },
};

function extractToc(body: string): TocItem[] {
  const toc: TocItem[] = [];
  body.split('\n').forEach(line => {
    if (line.startsWith('## ')) {
      const text = line.replace('## ', '').trim();
      toc.push({ id: slugifyHeading(text), title: text, level: 2 });
    } else if (line.startsWith('### ')) {
      const text = line.replace('### ', '').trim();
      toc.push({ id: slugifyHeading(text), title: text, level: 3 });
    }
  });
  return toc;
}

function estimateReadingTime(body: string): string {
  const words = body.split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.round(words / 200));
  return `${minutes} min`;
}

interface RawArticleFile {
  path: string;
  category: string;
  sidebar_position: number;
  data: Record<string, string | number | string[] | Record<string, string>[]>;
  body: string;
}

const filesById = new Map<string, RawArticleFile[]>();

for (const [path, raw] of Object.entries(rawModules)) {
  const { data, body } = parseFrontmatter(raw);
  const id = String(data.id ?? '');
  if (!id) continue; // a file without a declared id cannot be filed; skip rather than crash the build

  // path shape: /docs/<category>/<NN-slug>.md
  const parts = path.split('/');
  const category = parts[2] ?? 'uncategorised';
  const filenameMatch = parts[3]?.match(/^(\d+)-/);
  const sidebar_position =
    typeof data.sidebar_position === 'number'
      ? data.sidebar_position
      : filenameMatch
      ? parseInt(filenameMatch[1], 10)
      : 0;

  const entry: RawArticleFile = { path, category, sidebar_position, data, body };
  const existing = filesById.get(id) ?? [];
  existing.push(entry);
  filesById.set(id, existing);
}

function buildDoc(id: string, files: RawArticleFile[]): DocItem {
  const en = files.find(f => (f.data.lang ?? 'en') === 'en');
  const vi = files.find(f => f.data.lang === 'vi');
  const primary = en ?? vi ?? files[0];

  const enStatus: ContentStatus = en && (en.data.status ?? 'complete') !== 'pending' && en.body.trim() !== ''
    ? 'complete'
    : 'pending';
  const viStatus: ContentStatus = vi && (vi.data.status ?? 'complete') !== 'pending' && vi.body.trim() !== ''
    ? 'complete'
    : 'pending';

  const legacyCategory = LEGACY_CATEGORY_TITLES[primary.category] ?? {
    title: primary.category,
    titleEn: primary.category,
    description: '',
    descriptionEn: '',
    iconName: 'Smartphone',
  };

  const tags = Array.isArray(primary.data.tags) ? (primary.data.tags as string[]) : [];
  const title = String(primary.data.title ?? id);
  const description = String(primary.data.description ?? '');
  const level = (primary.data.level as Level) ?? 'Mid';

  const prerequisites = Array.isArray(primary.data.prerequisites)
    ? (primary.data.prerequisites as string[])
    : [];
  const outcomes = Array.isArray(primary.data.outcomes) ? (primary.data.outcomes as string[]) : [];

  const domain = primary.data.domain ? String(primary.data.domain) : undefined;
  const band = primary.data.band ? (String(primary.data.band) as DocItem['band']) : undefined;
  const platform = primary.data.platform ? (String(primary.data.platform) as DocItem['platform']) : undefined;
  const track = primary.data.track ? (String(primary.data.track) as DocItem['track']) : undefined;
  const counterpart = primary.data.counterpart ? String(primary.data.counterpart) : undefined;
  const demo = primary.data.demo ? String(primary.data.demo) : undefined;

  const resources = Array.isArray(primary.data.resources)
    ? (primary.data.resources as Record<string, string>[]).map(r => ({
        title: r.title ?? '',
        url: r.url ?? '',
        date: r.date ?? '',
      }))
    : [];
  const figures = Array.isArray(primary.data.figures)
    ? (primary.data.figures as Record<string, string>[]).map(f => ({
        path: f.path ?? '',
        alt: f.alt ?? '',
        caption: f.caption ?? '',
      }))
    : undefined;
  const samples = Array.isArray(primary.data.samples)
    ? (primary.data.samples as Record<string, string>[]).map(s => ({
        repo: s.repo ?? '',
        tag: s.tag ?? '',
      }))
    : undefined;

  return {
    id,
    title,
    titleEn: title,
    description,
    descriptionEn: description,
    category: primary.category,
    categoryTitle: legacyCategory.title,
    categoryTitleEn: legacyCategory.titleEn,
    sidebar_position: primary.sidebar_position,
    tags,
    level,
    readingTime: estimateReadingTime((en ?? vi)?.body ?? ''),
    track,
    domain,
    band,
    platform,
    counterpart,
    prerequisites,
    outcomes,
    resources,
    figures,
    demo,
    samples,
    langStatus: { en: enStatus, vi: viStatus },
    content: viStatus === 'complete' ? (vi?.body ?? '') : '',
    contentEn: enStatus === 'complete' ? (en?.body ?? '') : '',
    toc: extractToc((en ?? vi)?.body ?? ''),
  };
}

export const docsRegistry: DocItem[] = Array.from(filesById.entries())
  .map(([id, files]) => buildDoc(id, files))
  .sort((a, b) => {
    if (a.category !== b.category) return a.category.localeCompare(b.category);
    return a.sidebar_position - b.sidebar_position;
  });

export const categories: Category[] = Object.entries(LEGACY_CATEGORY_TITLES).map(([id, meta]) => ({
  id,
  title: meta.title,
  titleEn: meta.titleEn,
  description: meta.description,
  descriptionEn: meta.descriptionEn,
  iconName: meta.iconName,
  docCount: docsRegistry.filter(d => d.category === id).length,
}));

export function findDoc(id: string): DocItem | undefined {
  return docsRegistry.find(d => d.id === id);
}

export type { Language };
