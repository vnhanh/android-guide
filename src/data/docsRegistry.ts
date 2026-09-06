/**
 * Phase 0.4: this file used to hold ~600 lines of inline `content`/`contentEn`
 * template literals — a second source of truth alongside docs/**\/*.md
 * (gap-analysis.md finding 04). It now only re-exports the registry the
 * build-time markdown loader generates from those files. Do not add inline
 * article prose back here; add or edit the corresponding docs/**\/*.md file
 * instead.
 */
export { docsRegistry, findDoc, conceptIndex } from './loadDocs';
