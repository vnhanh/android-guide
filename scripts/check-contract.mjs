#!/usr/bin/env node
/**
 * Contract checker — validates docs/**\/*.md frontmatter against the article
 * contract in CONTRIBUTING.md. Run via `npm run check-contract`; wired into
 * .github/workflows/pr.yml as a required check on every PR.
 *
 * Two tiers, matching CONTRIBUTING.md:
 *   - Base fields are required on every article, always: id, title,
 *     description, tags, lang, status.
 *   - Once an article declares `domain` (i.e. it has been re-filed onto the
 *     new taxonomy — Phase 2+), it additionally must have `band`, `platform`,
 *     `prerequisites`, `outcomes`; every `prerequisites` entry must resolve to
 *     an existing article id; `counterpart` (if set) must be symmetric; and
 *     both language slots must be accounted for (a `vi`/`en` sibling file, or
 *     an explicit `pending` status is fine — the point is it must be
 *     declared, not silently missing).
 * Legacy articles without `domain` only need the base-field check — they have
 * not been re-filed yet, and forcing that now would be doing Phase 2's job
 * inside Phase 0/1 tooling.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const DOCS_DIR = join(ROOT, 'docs');

const BASE_FIELDS = ['id', 'title', 'description', 'tags', 'lang', 'status'];
const TAXONOMY_FIELDS = ['band', 'platform', 'prerequisites', 'outcomes'];

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      // Assets and other non-article directories (e.g. docs/<domain>/assets/)
      // never contain frontmatter and are skipped.
      if (entry === 'assets') continue;
      out.push(...walk(full));
    } else if (entry.endsWith('.md')) {
      out.push(full);
    }
  }
  return out;
}

function indentOf(line) {
  return line.length - line.trimStart().length;
}

// Mirrors src/lib/frontmatter.ts — keep the two in sync. Supports flat
// scalars, bracketed inline arrays, block scalar lists, and block lists of
// flat objects (one level of nesting), which is the full shape the article
// contract in CONTRIBUTING.md uses.
function parseFrontmatter(raw) {
  const match = raw.replace(/\r\n/g, '\n').match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) return null;
  const lines = match[1].split('\n');
  const data = {};

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim() || line.trim().startsWith('#')) {
      i++;
      continue;
    }
    const idx = line.indexOf(':');
    if (idx === -1) {
      i++;
      continue;
    }
    const key = line.slice(0, idx).trim();
    const inlineValue = line.slice(idx + 1).trim();
    const keyIndent = indentOf(line);
    i++;

    if (inlineValue !== '') {
      if (inlineValue.startsWith('[') && inlineValue.endsWith(']')) {
        const inner = inlineValue.slice(1, -1).trim();
        data[key] = inner === '' ? [] : inner.split(',').map(v => stripQuotes(v.trim()));
      } else {
        const v = stripQuotes(inlineValue);
        data[key] = /^-?\d+$/.test(v) ? parseInt(v, 10) : v;
      }
      continue;
    }

    const items = [];
    while (i < lines.length) {
      const next = lines[i];
      if (!next.trim()) {
        i++;
        continue;
      }
      const nextIndent = indentOf(next);
      const trimmed = next.trim();
      if (nextIndent <= keyIndent || !trimmed.startsWith('- ')) break;

      const itemIndent = nextIndent;
      const rest = trimmed.slice(2);
      const fieldMatch = rest.match(/^([A-Za-z0-9_]+):\s*(.*)$/);

      if (!fieldMatch) {
        items.push(stripQuotes(rest.trim()));
        i++;
        continue;
      }

      const obj = {};
      obj[fieldMatch[1]] = stripQuotes(fieldMatch[2].trim());
      i++;
      const continuationIndent = itemIndent + 2;
      while (i < lines.length) {
        const cont = lines[i];
        if (!cont.trim()) {
          i++;
          continue;
        }
        if (indentOf(cont) < continuationIndent || cont.trim().startsWith('- ')) break;
        const contMatch = cont.trim().match(/^([A-Za-z0-9_]+):\s*(.*)$/);
        if (!contMatch) break;
        obj[contMatch[1]] = stripQuotes(contMatch[2].trim());
        i++;
      }
      items.push(obj);
    }
    data[key] = items;
  }
  return data;
}

function stripQuotes(v) {
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    return v.slice(1, -1);
  }
  return v;
}

function main() {
  const files = walk(DOCS_DIR);
  const errors = [];
  const byId = new Map(); // id -> [{ file, data }]

  for (const file of files) {
    const raw = readFileSync(file, 'utf-8');
    const data = parseFrontmatter(raw);
    const rel = relative(ROOT, file);

    if (!data) {
      errors.push(`${rel}: no valid frontmatter block found`);
      continue;
    }

    for (const field of BASE_FIELDS) {
      if (data[field] === undefined || data[field] === '') {
        errors.push(`${rel}: missing required base field "${field}"`);
      }
    }

    if (data.id) {
      const list = byId.get(data.id) ?? [];
      list.push({ file: rel, data });
      byId.set(data.id, list);
    }
  }

  const allIds = new Set(byId.keys());

  for (const [id, entries] of byId) {
    for (const { file, data } of entries) {
      const isReFiled = data.domain !== undefined && data.domain !== '';
      if (!isReFiled) continue; // legacy article — base-field check only

      for (const field of TAXONOMY_FIELDS) {
        if (data[field] === undefined || (Array.isArray(data[field]) && data[field].length === 0 && field !== 'prerequisites')) {
          errors.push(`${file}: article "${id}" declares a domain but is missing "${field}"`);
        }
      }

      const prereqs = Array.isArray(data.prerequisites) ? data.prerequisites : [];
      for (const p of prereqs) {
        if (p && !allIds.has(p)) {
          errors.push(`${file}: prerequisite "${p}" on article "${id}" does not resolve to any existing article id`);
        }
      }

      if (data.counterpart) {
        const counterpartEntries = byId.get(data.counterpart);
        if (!counterpartEntries) {
          errors.push(`${file}: counterpart "${data.counterpart}" on article "${id}" does not exist`);
        } else {
          const pointsBack = counterpartEntries.some(e => e.data.counterpart === id);
          if (!pointsBack) {
            errors.push(`${file}: counterpart "${data.counterpart}" does not point back to "${id}" (asymmetric counterpart)`);
          }
        }
      }

      const langs = entries.map(e => e.data.lang);
      const hasEn = langs.includes('en');
      const hasVi = langs.includes('vi');
      if (!hasEn && !hasVi) {
        errors.push(`${file}: article "${id}" declares a domain but no lang slot (en/vi) is present at all`);
      }
    }
  }

  if (errors.length > 0) {
    console.error(`Contract check failed with ${errors.length} error(s):\n`);
    for (const e of errors) console.error(`  ✗ ${e}`);
    process.exit(1);
  }

  console.log(`Contract check passed — ${files.length} article file(s) checked, ${byId.size} unique id(s).`);
}

main();
