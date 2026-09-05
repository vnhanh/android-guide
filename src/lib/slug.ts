/**
 * Shared heading-slug algorithm. Used by the markdown loader (to build each
 * article's table of contents) and by DocViewer (to give rendered <h2>/<h3>
 * elements the same id) so the two never drift apart.
 */
export function slugifyHeading(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}
