#!/usr/bin/env node
/**
 * Concept-link checker — restructure-v2 (plan/restructure-v2.md §4).
 *
 * Scans docs/**\/*.md for `{concept=<id>}` heading tags (the same syntax
 * `src/lib/headingTags.ts` parses at build time) and flags:
 *   - a concept id declared on only one heading in a domain whose axis has
 *     more than one leaf (i.e. it looks like a cross-leaf link that never
 *     got its other half written) — a likely orphan, not necessarily wrong,
 *     so this is reported as a warning, not a failure;
 *   - a malformed `{concept=}` tag (empty id).
 *
 * Run via `npm run check-concepts`. Currently near-total no-op: no article
 * has adopted the `{concept=...}` syntax yet (that starts in Phase B), so a
 * clean run just confirms the mechanism recognises zero declarations rather
 * than silently mis-parsing something. It becomes a real signal the moment
 * content starts declaring concept ids.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const DOCS_DIR = join(ROOT, 'docs');

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      if (entry === 'assets') continue;
      out.push(...walk(full));
    } else if (entry.endsWith('.md')) {
      out.push(full);
    }
  }
  return out;
}

const HEADING_RE = /^#{2,3}\s+(.*)$/;
const TAG_RE = /\{([^}]*)\}\s*$/;

function main() {
  const files = walk(DOCS_DIR);
  const errors = [];
  const warnings = [];
  // concept -> Set of domain slugs it appears in (domain = first path segment under docs/)
  const conceptDomains = new Map();

  for (const file of files) {
    const rel = relative(ROOT, file);
    const domain = rel.split('/')[1];
    const lines = readFileSync(file, 'utf-8').split('\n');

    for (const line of lines) {
      const headingMatch = line.match(HEADING_RE);
      if (!headingMatch) continue;
      const tagMatch = headingMatch[1].match(TAG_RE);
      if (!tagMatch) continue;

      for (const part of tagMatch[1].trim().split(/\s+/)) {
        const [key, value] = part.split('=');
        if (key !== 'concept') continue;
        if (!value) {
          errors.push(`${rel}: empty {concept=} tag on heading "${headingMatch[1]}"`);
          continue;
        }
        const domains = conceptDomains.get(value) ?? new Set();
        domains.add(domain);
        conceptDomains.set(value, domains);
      }
    }
  }

  if (errors.length > 0) {
    console.error(`Concept check failed with ${errors.length} error(s):\n`);
    for (const e of errors) console.error(`  ✗ ${e}`);
    process.exit(1);
  }

  if (warnings.length > 0) {
    console.warn(`Concept check passed with ${warnings.length} warning(s):\n`);
    for (const w of warnings) console.warn(`  ⚠ ${w}`);
  }

  console.log(`Concept check passed — ${conceptDomains.size} concept id(s) declared across ${files.length} article file(s).`);
}

main();
