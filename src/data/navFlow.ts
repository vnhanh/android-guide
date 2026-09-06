/**
 * restructure-v2 (plan/restructure-v2.md §3) — the site-wide reading flow.
 * Walks every domain in `framework.ts`'s authoring/DOMAINS order, each
 * domain's own articles band-ordered (Mid → Senior → Lead), then an
 * "Interview Questions" stop, before moving into the next domain. This is
 * what the prev/next footer on a doc page and on the interview page both
 * read from, so a reader can walk Middle → Senior → Lead → Interview → next
 * domain without ever hunting for the next thing to read.
 */
import { docsRegistry } from './loadDocs';
import { DOMAINS } from './framework';

const BAND_ORDER: Record<string, number> = { M: 0, S: 1, L: 2, X: 0 };

export type FlowStop =
  | { kind: 'doc'; docId: string; domain: string }
  | { kind: 'interview'; domain: string };

let cachedFlow: FlowStop[] | null = null;

export function getFlowSequence(): FlowStop[] {
  if (cachedFlow) return cachedFlow;

  const flow: FlowStop[] = [];
  for (const domain of DOMAINS) {
    const docs = docsRegistry
      .filter(d => d.domain === domain.slug && d.kind !== 'interview')
      .sort((a, b) =>
        (BAND_ORDER[a.band ?? 'M'] ?? 0) - (BAND_ORDER[b.band ?? 'M'] ?? 0) ||
        a.sidebar_position - b.sidebar_position
      );
    for (const doc of docs) flow.push({ kind: 'doc', docId: doc.id, domain: domain.slug });
    flow.push({ kind: 'interview', domain: domain.slug });
  }
  cachedFlow = flow;
  return flow;
}

function stopKey(stop: FlowStop): string {
  return stop.kind === 'doc' ? `doc:${stop.docId}` : `interview:${stop.domain}`;
}

export function getFlowNeighbors(current: FlowStop): { prev: FlowStop | null; next: FlowStop | null } {
  const flow = getFlowSequence();
  const idx = flow.findIndex(s => stopKey(s) === stopKey(current));
  if (idx === -1) return { prev: null, next: null };
  return {
    prev: idx > 0 ? flow[idx - 1] : null,
    next: idx < flow.length - 1 ? flow[idx + 1] : null,
  };
}

export function getDocFlowNeighbors(docId: string) {
  const doc = docsRegistry.find(d => d.id === docId);
  if (!doc || !doc.domain) return { prev: null, next: null };
  return getFlowNeighbors({ kind: 'doc', docId, domain: doc.domain });
}

export function getInterviewFlowNeighbors(domainSlug: string) {
  return getFlowNeighbors({ kind: 'interview', domain: domainSlug });
}
