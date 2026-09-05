#!/usr/bin/env node
/**
 * Link checker — validates that every relative Markdown link and image
 * reference inside docs/**\/*.md resolves to a file that actually exists.
 * Intentionally does not check external (http/https) links — that needs a
 * network call per link and belongs in a separate, non-blocking job if ever
 * added; this one stays fast and deterministic for a required PR check.
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname, relative, resolve } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const DOCS_DIR = join(ROOT, 'docs');

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) out.push(...walk(full));
    else if (entry.endsWith('.md')) out.push(full);
  }
  return out;
}

const LINK_RE = /!?\[[^\]]*\]\(([^)]+)\)/g;

function main() {
  const files = walk(DOCS_DIR);
  const errors = [];

  for (const file of files) {
    const raw = readFileSync(file, 'utf-8');
    const dir = dirname(file);
    let match;
    while ((match = LINK_RE.exec(raw)) !== null) {
      let target = match[1].trim();
      // Strip an optional "title" suffix: (./foo.png "some title")
      target = target.split(' ')[0];
      if (!target || target.startsWith('http://') || target.startsWith('https://') || target.startsWith('#') || target.startsWith('mailto:')) {
        continue;
      }
      const resolved = resolve(dir, target);
      if (!existsSync(resolved)) {
        errors.push(`${relative(ROOT, file)}: broken link "${target}" -> ${relative(ROOT, resolved)}`);
      }
    }
  }

  if (errors.length > 0) {
    console.error(`Link check failed with ${errors.length} broken link(s):\n`);
    for (const e of errors) console.error(`  ✗ ${e}`);
    process.exit(1);
  }

  console.log(`Link check passed — ${files.length} article file(s) checked.`);
}

main();
