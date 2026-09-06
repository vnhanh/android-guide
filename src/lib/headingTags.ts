/**
 * restructure-v2 (plan/restructure-v2.md §3-4) — heading metadata shared by
 * the markdown loader (`loadDocs.ts`, builds the TOC + concept index at build
 * time) and `DocViewer` (renders the same heading at read time). Keeping the
 * parsing in one place is what keeps a heading's id, level badge and concept
 * link consistent between the two passes — the same contract `slug.ts`
 * already keeps for plain anchor ids.
 *
 * Two independent tags, either or both optional, written as a trailing
 * `{...}` on a heading line:
 *
 *   ## Nullable types {level=middle concept=null-safety/declaration}
 *
 * Plus one convention that needs no explicit tag at all: an H2 whose full
 * text is exactly "Mid" / "Senior" / "Lead" (case-insensitive) — the existing
 * band=X article convention (see docs/01-programming-fundamentals/*.md) — is
 * treated as starting that level's section, same as an explicit `{level=...}`.
 */
import { Level } from '../types';

export interface HeadingMeta {
  /** Heading text with any `{...}` tag suffix removed. */
  title: string;
  levelTag?: Level;
  concept?: string;
}

const TAG_RE = /\{([^}]*)\}\s*$/;
const LEVEL_WORD: Record<string, Level> = {
  mid: 'Mid',
  middle: 'Mid',
  senior: 'Senior',
  lead: 'Lead',
};

export function parseHeadingMeta(rawText: string): HeadingMeta {
  const text = rawText.trim();
  const tagMatch = text.match(TAG_RE);

  let title = text;
  let levelTag: Level | undefined;
  let concept: string | undefined;

  if (tagMatch) {
    title = text.slice(0, tagMatch.index).trim();
    for (const part of tagMatch[1].trim().split(/\s+/)) {
      const [key, value] = part.split('=');
      if (key === 'level' && value && LEVEL_WORD[value.toLowerCase()]) {
        levelTag = LEVEL_WORD[value.toLowerCase()];
      } else if (key === 'concept' && value) {
        concept = value;
      }
    }
  }

  // The bare "## Mid" / "## Senior" / "## Lead" convention — only applies when
  // no explicit {level=...} tag already won above.
  if (!levelTag) {
    const bare = LEVEL_WORD[title.toLowerCase()];
    if (bare) levelTag = bare;
  }

  return { title, levelTag, concept };
}
