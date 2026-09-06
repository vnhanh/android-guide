/**
 * restructure-v2 (plan/restructure-v2.md §1) — per-domain leaf-axis declaration.
 *
 * Every domain declares exactly one axis:
 *   'language' — Java / Kotlin / Swift / Dart / TypeScript leaves
 *   'platform' — Android / iOS / Flutter leaves
 *   'none'     — flowing Middle → Senior → Lead sections, no leaf split
 *
 * This is the single place the sidebar tree, the leaf tab bar and the domain
 * landing page read to decide how a domain's Level rows render. Adding or
 * changing a domain's shape never touches the viewer — only this table.
 *
 * Phase A ships this mechanism proven on domains 01 and 02 (the two shapes
 * that already exist in `docs/`); every other domain defaults to 'none'
 * (flowing) until its own authoring phase (plan/restructure-v2.md §7) decides
 * otherwise — that is a per-domain content decision, not a viewer one.
 */
import { DomainAxisDef, LanguageLeaf, PlatformLeaf } from '../types';

export const LANGUAGE_LEAVES: LanguageLeaf[] = ['Java', 'Kotlin', 'Swift', 'Dart', 'TypeScript'];
export const PLATFORM_LEAVES: PlatformLeaf[] = ['Android', 'iOS', 'Flutter'];

export const DOMAIN_AXES: Record<string, DomainAxisDef> = {
  '01-programming-fundamentals': { axis: 'language', leaves: LANGUAGE_LEAVES, leadLeaves: false },
  '02-platform-and-os-internals': { axis: 'platform', leaves: PLATFORM_LEAVES, leadLeaves: false },
  // No Flutter content exists for this domain yet — only the two leaves that
  // actually have articles are declared, so the tab bar never shows a dead tab.
  '03-ui-and-interaction-engineering': { axis: 'platform', leaves: ['Android', 'iOS'], leadLeaves: false },
  '04-concurrency-and-asynchrony': { axis: 'platform', leaves: ['Android', 'iOS'], leadLeaves: false },
  '05-data-persistence-and-offline': { axis: 'platform', leaves: ['Android', 'iOS'], leadLeaves: false },
};

const DEFAULT_AXIS: DomainAxisDef = { axis: 'none' };

export function getDomainAxis(slug: string): DomainAxisDef {
  return DOMAIN_AXES[slug] ?? DEFAULT_AXIS;
}
