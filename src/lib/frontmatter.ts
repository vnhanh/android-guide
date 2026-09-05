/**
 * Small, dependency-free frontmatter parser.
 *
 * The frontmatter used across docs/**\/*.md is flat key/value pairs plus
 * simple bracketed arrays (`tags: [a, b, c]`) — never nested maps, block
 * scalars, or multi-line strings. A full YAML parser is not warranted for
 * that shape; this covers it in ~30 lines and has no dependency to keep
 * current with security patches.
 */
export interface ParsedMarkdown {
  data: Record<string, string | number | string[]>;
  body: string;
}

export function parseFrontmatter(raw: string): ParsedMarkdown {
  const normalized = raw.replace(/\r\n/g, '\n');
  const match = normalized.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) {
    return { data: {}, body: normalized.trim() };
  }

  const [, frontmatterBlock, body] = match;
  const data: Record<string, string | number | string[]> = {};

  frontmatterBlock.split('\n').forEach(line => {
    if (!line.trim() || line.trim().startsWith('#')) return;
    const idx = line.indexOf(':');
    if (idx === -1) return;

    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();

    if (value.startsWith('[') && value.endsWith(']')) {
      const inner = value.slice(1, -1).trim();
      data[key] = inner === ''
        ? []
        : inner.split(',').map(v => stripQuotes(v.trim()));
      return;
    }

    value = stripQuotes(value);

    if (/^-?\d+$/.test(value)) {
      data[key] = parseInt(value, 10);
      return;
    }

    data[key] = value;
  });

  return { data, body: body.trim() };
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
