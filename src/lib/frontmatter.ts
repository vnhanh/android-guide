/**
 * Small, dependency-free frontmatter parser.
 *
 * The frontmatter used across docs/**\/*.md is a controlled YAML subset —
 * never full YAML — covering exactly the shapes the article contract in
 * CONTRIBUTING.md uses:
 *   - flat scalars: `key: value`
 *   - bracketed inline arrays of scalars: `key: [a, b, c]`
 *   - block list of scalars:
 *       key:
 *         - "value one"
 *         - "value two"
 *   - block list of flat objects (one level of nesting only):
 *       key:
 *         - field: value
 *           other: value
 *         - field: value
 * A full YAML parser is not warranted for that shape; this covers it and has
 * no dependency to keep current with security patches.
 */
export type FrontmatterValue = string | number | string[] | Record<string, string>[];

export interface ParsedMarkdown {
  data: Record<string, FrontmatterValue>;
  body: string;
}

function stripQuotes(value: string): string {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}

function coerceScalar(raw: string): string | number {
  const value = stripQuotes(raw.trim());
  return /^-?\d+$/.test(value) ? parseInt(value, 10) : value;
}

function indentOf(line: string): number {
  return line.length - line.trimStart().length;
}

export function parseFrontmatter(raw: string): ParsedMarkdown {
  const normalized = raw.replace(/\r\n/g, '\n');
  const match = normalized.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) {
    return { data: {}, body: normalized.trim() };
  }

  const [, frontmatterBlock, body] = match;
  const lines = frontmatterBlock.split('\n');
  const data: Record<string, FrontmatterValue> = {};

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
        data[key] = coerceScalar(inlineValue);
      }
      continue;
    }

    // Empty inline value — look ahead for a block list of greater indent.
    const items: (string | Record<string, string>)[] = [];
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
      const rest = trimmed.slice(2); // after "- "
      const fieldMatch = rest.match(/^([A-Za-z0-9_]+):\s*(.*)$/);

      if (!fieldMatch) {
        items.push(stripQuotes(rest.trim()));
        i++;
        continue;
      }

      // Object list item: first field is inline with the dash; subsequent
      // fields are on following lines indented past the dash's own column.
      const obj: Record<string, string> = {};
      obj[fieldMatch[1]] = stripQuotes(fieldMatch[2].trim());
      i++;
      const continuationIndent = itemIndent + 2; // column where "- " ends
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

    data[key] = items as FrontmatterValue;
  }

  return { data, body: body.trim() };
}
