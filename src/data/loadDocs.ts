import { parseFrontmatter } from '../lib/frontmatter';
import { slugifyHeading } from '../lib/slug';
import { parseHeadingMeta } from '../lib/headingTags';
import { ConceptEntry, ContentStatus, DocItem, Language, Level, LevelSection, TocItem } from '../types';

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

/**
 * Human-readable label for a `docs/<dir>/` directory, derived from the directory
 * name itself (`13-mobile-system-design` -> `Mobile system design`). Replaces the
 * old hand-maintained legacy-category table: every article now lives under a
 * numbered domain directory, so the directory name *is* the category name and a
 * second source of truth for it is not needed.
 */
function humaniseCategory(dir: string): string {
  const words = dir.replace(/^\d+-/, '').split('-');
  if (words.length === 0) return dir;
  const [first, ...rest] = words;
  return [first.charAt(0).toUpperCase() + first.slice(1), ...rest].join(' ');
}

function extractToc(body: string): TocItem[] {
  const toc: TocItem[] = [];
  body.split('\n').forEach(line => {
    if (line.startsWith('## ')) {
      const { title, levelTag, concept } = parseHeadingMeta(line.replace('## ', ''));
      toc.push({ id: slugifyHeading(title), title, level: 2, levelTag, concept });
    } else if (line.startsWith('### ')) {
      const { title, levelTag, concept } = parseHeadingMeta(line.replace('### ', ''));
      toc.push({ id: slugifyHeading(title), title, level: 3, levelTag, concept });
    }
  });
  return toc;
}

/** restructure-v2 §3 — the Mid/Senior/Lead spans an article's H2s declare,
 * via the bare "## Mid" convention or an explicit `{level=...}` tag. */
function extractLevelSections(toc: TocItem[]): LevelSection[] {
  return toc
    .filter(t => t.level === 2 && t.levelTag)
    .map(t => ({ level: t.levelTag as Level, id: t.id, title: t.title }));
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

  const categoryTitle = humaniseCategory(primary.category);

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

  const toc = extractToc((en ?? vi)?.body ?? '');

  return {
    id,
    title,
    titleEn: title,
    description,
    descriptionEn: description,
    category: primary.category,
    categoryTitle,
    categoryTitleEn: categoryTitle,
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
    toc,
    levelSections: extractLevelSections(toc),
  };
}

export const docsRegistry: DocItem[] = Array.from(filesById.entries())
  .map(([id, files]) => buildDoc(id, files))
  .sort((a, b) => {
    if (a.category !== b.category) return a.category.localeCompare(b.category);
    return a.sidebar_position - b.sidebar_position;
  });

export function findDoc(id: string): DocItem | undefined {
  return docsRegistry.find(d => d.id === id);
}

/**
 * restructure-v2 (plan/restructure-v2.md §4) — every `{concept=...}` heading
 * across the whole registry, grouped by concept id. Powers the "Also in"
 * auto-links on `DocViewer`; `scripts/check-concepts.mjs` flags an orphan
 * (declared in only one place where the axis has siblings) or a link that no
 * longer resolves. Empty until an article actually declares a concept id —
 * the mechanism ships in Phase A, the content lands per-domain from Phase B on.
 */
export const conceptIndex: Map<string, ConceptEntry[]> = (() => {
  const index = new Map<string, ConceptEntry[]>();
  for (const doc of docsRegistry) {
    for (const heading of doc.toc) {
      if (!heading.concept) continue;
      const entry: ConceptEntry = { concept: heading.concept, docId: doc.id, headingId: heading.id, title: doc.title };
      const existing = index.get(heading.concept) ?? [];
      existing.push(entry);
      index.set(heading.concept, existing);
    }
  }
  return index;
})();

export type { Language };
