import React, { useEffect, useState } from 'react';
import { Copy, Check, ChevronLeft, ChevronRight, BookOpen, Clock, Tag, Award, AlertCircle, Info, Lightbulb, AlertTriangle, ShieldAlert, Languages, Target, PlaySquare, ExternalLink, Link2, HelpCircle } from 'lucide-react';
import { DocItem, Level } from '../types';
import { docsRegistry, conceptIndex, findDocByTopicLeaf } from '../data/docsRegistry';
import { getDomainAxis } from '../data/domainAxes';
import { getDocFlowNeighbors } from '../data/navFlow';
import { useI18n } from '../context/I18nContext';
import { useLeaf } from '../context/LeafContext';
import { slugifyHeading } from '../lib/slug';
import { parseHeadingMeta } from '../lib/headingTags';
import { MermaidDiagram } from './MermaidDiagram';
import { ComparisonTabs, ComparisonTabItem } from './ComparisonTabs';

interface DocViewerProps {
  doc: DocItem;
  /** restructure-v2 §3 — heading id to scroll to on mount (a Level-row link
   * from the sidebar into a band=X article's Mid/Senior/Lead section). */
  activeAnchor?: string;
  onSelectDoc: (docId: string, anchor?: string) => void;
  onNavigateHome: () => void;
  onOpenDemo?: (slug: string) => void;
  onOpenInterview?: (domainSlug: string) => void;
}

// ---- Block descriptors — the output of parsing, before any JSX is built ----
// Splitting parsing (text -> blocks) from rendering (blocks -> JSX) in two passes
// is what lets groupComparisonBlocks look ahead/behind across block boundaries to
// detect a run of per-language/per-platform code blocks, without the line-by-line
// parser needing to know anything about tab grouping itself.
type Block =
  | { type: 'h1'; text: string }
  | { type: 'h2'; text: string; levelTag?: Level; concept?: string }
  | { type: 'h3'; text: string; levelTag?: Level; concept?: string }
  | { type: 'p'; text: string }
  | { type: 'li'; text: string }
  | { type: 'oli'; text: string }
  | { type: 'table'; headers: string[]; rows: string[][] }
  | { type: 'callout'; kind: string; text: string }
  | { type: 'blockquote'; text: string }
  | { type: 'code'; lang: string; code: string }
  | { type: 'mermaid'; code: string };

interface TabGroupBlock {
  type: 'tabgroup';
  items: ComparisonTabItem[];
}

type RenderableBlock = Block | TabGroupBlock;

// Markdown paragraphs and list items are conventionally hard-wrapped across several
// physical lines with no blank line between them (a real newline only starts a new
// block after a blank line). This treats every non-blank line as its own block, so
// wrapped prose must be rejoined into one logical line per paragraph/list item first
// — everything inside a fenced code block, and every table, heading, blockquote or
// callout line, passes through untouched.
const mergeWrappedLines = (rawLines: string[]): string[] => {
  const out: string[] = [];
  let inFence = false;
  let buffer: string[] = [];

  const flush = () => {
    if (buffer.length > 0) {
      out.push(buffer.join(' '));
      buffer = [];
    }
  };

  for (const raw of rawLines) {
    const trimmed = raw.trim();

    if (trimmed.startsWith('```')) {
      flush();
      inFence = !inFence;
      out.push(raw);
      continue;
    }
    if (inFence) {
      out.push(raw);
      continue;
    }
    if (trimmed === '') {
      flush();
      out.push('');
      continue;
    }

    const isTableRow = trimmed.startsWith('|') && trimmed.endsWith('|');
    const isHeading = /^#{1,6}\s/.test(trimmed);
    const isBlockquote = trimmed.startsWith('>');
    const isListStart = /^(?:[-*]|\d+\.)\s/.test(trimmed);

    if (isTableRow || isHeading || isBlockquote) {
      flush();
      out.push(raw);
      continue;
    }
    if (isListStart) {
      flush();
      buffer = [trimmed];
      continue;
    }
    // Continuation of the paragraph or list item currently in the buffer.
    buffer.push(trimmed);
  }
  flush();
  return out;
};

// Pass 1: markdown text -> typed block descriptors. Structurally the same line-by-line
// scan the renderer used to do inline, just pushing descriptors instead of JSX.
const parseBlocks = (markdownText: string): Block[] => {
  const lines = mergeWrappedLines(markdownText.trim().split('\n'));
  const blocks: Block[] = [];

  let inCodeBlock = false;
  let codeLanguage = '';
  let codeLines: string[] = [];

  let inTable = false;
  let tableRows: string[][] = [];

  // GFM callouts (`> [!NOTE]` etc.) span multiple `>`-prefixed lines; a plain
  // `>` blockquote (no `[!TYPE]`) does too. Both are accumulated across
  // lines and flushed as one block once a non-`>` line ends them.
  let calloutType: string | null = null;
  let calloutLines: string[] = [];
  let blockquoteLines: string[] = [];

  const flushCallout = () => {
    if (!calloutType) return;
    blocks.push({ type: 'callout', kind: calloutType, text: calloutLines.join(' ').trim() });
    calloutType = null;
    calloutLines = [];
  };

  const flushBlockquote = () => {
    if (blockquoteLines.length === 0) return;
    blocks.push({ type: 'blockquote', text: blockquoteLines.join(' ').trim() });
    blockquoteLines = [];
  };

  const flushTable = () => {
    if (tableRows.length === 0) return;
    const headers = tableRows[0];
    const body = tableRows.slice(2); // Skip separator row
    blocks.push({ type: 'table', headers, rows: body });
    tableRows = [];
    inTable = false;
  };

  lines.forEach(line => {
    // Handle code block toggle
    if (line.startsWith('```')) {
      if (inCodeBlock) {
        const codeText = codeLines.join('\n');
        if (codeLanguage.toLowerCase() === 'mermaid') {
          blocks.push({ type: 'mermaid', code: codeText });
        } else {
          blocks.push({ type: 'code', lang: codeLanguage, code: codeText });
        }
        codeLines = [];
        inCodeBlock = false;
        codeLanguage = '';
      } else {
        inCodeBlock = true;
        codeLanguage = line.replace('```', '').trim();
      }
      return;
    }

    if (inCodeBlock) {
      codeLines.push(line);
      return;
    }

    // Handle Markdown Tables
    if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
      flushCallout();
      flushBlockquote();
      inTable = true;
      const cells = line.trim().slice(1, -1).split('|');
      tableRows.push(cells);
      return;
    } else if (inTable) {
      flushTable();
    }

    // GFM Callout Blocks (> [!NOTE], > [!TIP], > [!IMPORTANT], > [!WARNING]) —
    // the type line, plus every following `>`-prefixed line, until one ends it.
    const calloutStart = line.match(/^>\s*\[!(NOTE|TIP|IMPORTANT|WARNING)\]\s*(.*)$/i);
    if (calloutStart) {
      flushBlockquote();
      flushCallout(); // a new callout starting mid-file without a blank line first
      calloutType = calloutStart[1].toUpperCase();
      if (calloutStart[2].trim()) calloutLines.push(calloutStart[2].trim());
      return;
    }
    if (calloutType && line.trim().startsWith('>')) {
      calloutLines.push(line.replace(/^>\s?/, ''));
      return;
    }
    if (calloutType) flushCallout();

    // Plain blockquote — `> text` with no `[!TYPE]`, possibly spanning lines.
    if (line.trim().startsWith('>')) {
      blockquoteLines.push(line.replace(/^>\s?/, ''));
      return;
    }
    if (blockquoteLines.length > 0) flushBlockquote();

    // Headings
    if (line.startsWith('# ')) {
      blocks.push({ type: 'h1', text: line.replace('# ', '').trim() });
    } else if (line.startsWith('## ')) {
      const { title, levelTag, concept } = parseHeadingMeta(line.replace('## ', ''));
      blocks.push({ type: 'h2', text: title, levelTag, concept });
    } else if (line.startsWith('### ')) {
      const { title, levelTag, concept } = parseHeadingMeta(line.replace('### ', ''));
      blocks.push({ type: 'h3', text: title, levelTag, concept });
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      blocks.push({ type: 'li', text: line.substring(2) });
    } else if (/^\d+\.\s/.test(line)) {
      const match = line.match(/^(\d+)\.\s(.*)$/);
      blocks.push({ type: 'oli', text: match ? match[2] : line });
    } else if (line.trim() !== '') {
      blocks.push({ type: 'p', text: line });
    }
  });

  flushTable();
  flushCallout();
  flushBlockquote();

  return blocks;
};

// A "label" paragraph is the prose immediately introducing one language/platform's
// code sample (e.g. "**Kotlin** has no checked/unchecked distinction..." or a full
// multi-sentence explanation). These run anywhere from a short caption to several
// sentences, so length is not a reliable signal — the bold lead-in combined with
// strict adjacency to a same-run code block (no other block type interleaved,
// enforced by groupComparisonBlocks below) is what keeps this from ever grouping
// unrelated content.
const isLabelParagraph = (b: Block | undefined): b is Block & { type: 'p' } =>
  !!b && b.type === 'p' && b.text.trim().startsWith('**');

// Pass 2: group a run of 2+ consecutive per-language/per-platform code blocks (each
// optionally preceded by a short "**Kotlin.** ..." lead-in paragraph, with no other
// block type interleaved and no two blocks sharing the same language) into a single
// tabgroup, so the reader gets an interactive switcher instead of a stack of blocks.
// Everything else passes through unchanged — this never touches content that isn't a
// clean, unambiguous comparison run.
const groupComparisonBlocks = (blocks: Block[]): RenderableBlock[] => {
  const out: RenderableBlock[] = [];
  let i = 0;

  while (i < blocks.length) {
    const b = blocks[i];

    if (b.type === 'code') {
      let firstLabel: string | undefined;
      const prev = out[out.length - 1];
      if (isLabelParagraph(prev as Block | undefined)) {
        firstLabel = (prev as Block & { type: 'p' }).text;
        out.pop();
      }

      const items: ComparisonTabItem[] = [{ label: firstLabel, lang: b.lang, code: b.code }];
      const seenLangs = new Set([b.lang.toLowerCase()]);
      let j = i + 1;

      while (j < blocks.length) {
        let label: string | undefined;
        let k = j;
        if (isLabelParagraph(blocks[k])) {
          label = (blocks[k] as Block & { type: 'p' }).text;
          k++;
        }
        const candidate = blocks[k];
        if (candidate && candidate.type === 'code' && !seenLangs.has(candidate.lang.toLowerCase())) {
          items.push({ label, lang: candidate.lang, code: candidate.code });
          seenLangs.add(candidate.lang.toLowerCase());
          j = k + 1;
        } else {
          break;
        }
      }

      if (items.length >= 2) {
        out.push({ type: 'tabgroup', items });
        i = j;
        continue;
      }
      // Not actually a comparison run — restore the popped label (if any) and
      // fall through to render this single code block on its own, as before.
      if (firstLabel !== undefined) out.push({ type: 'p', text: firstLabel });
      out.push(b);
      i++;
      continue;
    }

    out.push(b);
    i++;
  }

  return out;
};

const LEVEL_ORDER: Level[] = ['Mid', 'Senior', 'Lead'];

// restructure-v2 §3 — the visible Mid/Senior/Lead tag on a heading, whether it
// came from the bare "## Mid" convention or an explicit {level=...} tag.
const LEVEL_BADGE_STYLE: Record<Level, string> = {
  Mid: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  Senior: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20',
  Lead: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
};

const LevelBadge: React.FC<{ level: Level }> = ({ level }) => (
  <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wide border ${LEVEL_BADGE_STYLE[level]}`}>
    {level}
  </span>
);

// restructure-v2 §4 — auto-generated cross-links for a `{concept=...}` heading:
// every other heading across the registry that declares the same concept id,
// with no hand-maintained cross-reference to keep in sync.
const AlsoInLinks: React.FC<{ concept: string; currentDocId: string; onSelectDoc: (docId: string, anchor?: string) => void }> = ({
  concept,
  currentDocId,
  onSelectDoc,
}) => {
  const entries = (conceptIndex.get(concept) ?? []).filter(e => e.docId !== currentDocId);
  if (entries.length === 0) return null;
  return (
    <div className="-mt-2 mb-4 flex flex-wrap items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
      <Link2 className="w-3.5 h-3.5 shrink-0" />
      <span className="font-semibold">Also in:</span>
      {entries.map((e, i) => (
        <button
          key={`${e.docId}-${e.headingId}`}
          onClick={() => onSelectDoc(e.docId, e.headingId)}
          className="text-cyan-600 dark:text-cyan-400 hover:underline"
        >
          {e.title}{i < entries.length - 1 ? ',' : ''}
        </button>
      ))}
    </div>
  );
};

export const DocViewer: React.FC<DocViewerProps> = ({ doc, activeAnchor, onSelectDoc, onNavigateHome, onOpenDemo, onOpenInterview }) => {
  const { lang, t } = useI18n();
  const { languageLeaf, setLanguageLeaf, platformLeaf, setPlatformLeaf } = useLeaf();
  const [copiedCodeIndex, setCopiedCodeIndex] = useState<number | null>(null);
  const [preferredLang, setPreferredLang] = useState<string | null>(null);
  const [levelFilter, setLevelFilter] = useState<'All' | Level>('All');

  const handleCopyCode = (codeText: string, index: number) => {
    navigator.clipboard.writeText(codeText);
    setCopiedCodeIndex(index);
    setTimeout(() => setCopiedCodeIndex(null), 2000);
  };

  // restructure-v2 §3 — the site-wide domain flow (Mid -> Senior -> Lead ->
  // Interview -> next domain) once this article is filed onto the new
  // taxonomy; a `domain`-less legacy article (only tech-lead-roadmap today)
  // falls back to the old whole-registry, category-ordered walk.
  const flowNeighbors = doc.domain ? getDocFlowNeighbors(doc.id) : null;
  const legacySortedDocs = doc.domain
    ? []
    : [...docsRegistry].sort((a, b) => {
        if (a.category !== b.category) return a.category.localeCompare(b.category);
        return a.sidebar_position - b.sidebar_position;
      });
  const legacyIndex = legacySortedDocs.findIndex(d => d.id === doc.id);
  const prevDoc = !doc.domain && legacyIndex > 0 ? legacySortedDocs[legacyIndex - 1] : null;
  const nextDoc = !doc.domain && legacyIndex < legacySortedDocs.length - 1 ? legacySortedDocs[legacyIndex + 1] : null;

  // restructure-v2 §2 — leaf tab bar. Inert (no per-leaf content split exists
  // yet outside the existing counterpart pairs) beyond setting the persisted
  // preference, except where an Android/iOS counterpart already exists — then
  // picking the other platform jumps straight to it.
  const domainAxis = doc.domain ? getDomainAxis(doc.domain) : { axis: 'none' as const };
  const counterpartDoc = doc.counterpart ? docsRegistry.find(d => d.id === doc.counterpart) : undefined;

  useEffect(() => {
    if (!activeAnchor) return;
    // Wait a tick for the markdown body to have rendered its headings.
    const raf = requestAnimationFrame(() => {
      document.getElementById(activeAnchor)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    return () => cancelAnimationFrame(raf);
  }, [activeAnchor, doc.id]);

  // Inline markdown — `code spans` and **bold** — inside otherwise-plain text.
  // Headings, paragraphs, list items, table cells, blockquotes and callout
  // bodies all route through this rather than rendering raw asterisks/backticks.
  const renderInline = (text: string, keyBase: string): React.ReactNode[] => {
    const nodes: React.ReactNode[] = [];
    const regex = /(`[^`]+`)|(\*\*[^*]+\*\*)|(\*[^*]+\*)/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    let i = 0;
    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) nodes.push(text.slice(lastIndex, match.index));
      const token = match[0];
      if (token.startsWith('`')) {
        nodes.push(
          <code key={`${keyBase}-c-${i}`} className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-cyan-700 dark:text-cyan-400 text-[0.85em] font-mono">
            {token.slice(1, -1)}
          </code>
        );
      } else if (token.startsWith('**')) {
        // Recurse so a code span nested inside **bold** (e.g. "**the `Foo` API**")
        // still renders as code instead of literal backticks.
        nodes.push(
          <strong key={`${keyBase}-b-${i}`} className="font-bold text-slate-900 dark:text-white">
            {renderInline(token.slice(2, -2), `${keyBase}-b-${i}`)}
          </strong>
        );
      } else {
        nodes.push(
          <em key={`${keyBase}-i-${i}`}>{renderInline(token.slice(1, -1), `${keyBase}-i-${i}`)}</em>
        );
      }
      i++;
      lastIndex = regex.lastIndex;
    }
    if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
    return nodes;
  };

  let codeBlockCount = 0; // shared, incrementing index across standalone blocks and tabgroup items

  const renderCodeBlock = (lang: string, code: string, key: string) => {
    const blockIdx = codeBlockCount++;
    return (
      <div key={key} className="my-6 rounded-xl overflow-hidden border border-slate-800 bg-[#0d1117] shadow-xl text-xs font-mono">
        <div className="flex items-center justify-between px-4 py-2 bg-[#161b22] border-b border-slate-800/80 text-slate-400">
          <span className="font-semibold uppercase tracking-wider text-[11px] text-cyan-400">
            {lang || 'CODE'}
          </span>
          <button
            onClick={() => handleCopyCode(code, blockIdx)}
            className="flex items-center gap-1.5 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] transition"
          >
            {copiedCodeIndex === blockIdx ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">{t('doc.copied')}</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>{t('doc.copyCode')}</span>
              </>
            )}
          </button>
        </div>
        <pre className="p-4 overflow-x-auto text-slate-200 leading-relaxed font-mono">
          <code>{code}</code>
        </pre>
      </div>
    );
  };

  const renderBlock = (block: RenderableBlock, idx: number): React.ReactNode => {
    const key = `b-${idx}`;
    switch (block.type) {
      case 'h1':
        return (
          <h1 key={key} className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight mt-6 mb-4">
            {renderInline(block.text, key)}
          </h1>
        );
      case 'h2': {
        const id = slugifyHeading(block.text);
        return (
          <React.Fragment key={key}>
            <h2 id={id} className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight mt-10 mb-4 pb-2 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2.5 flex-wrap">
              {renderInline(block.text, key)}
              {block.levelTag && <LevelBadge level={block.levelTag} />}
            </h2>
            {block.concept && <AlsoInLinks concept={block.concept} currentDocId={doc.id} onSelectDoc={onSelectDoc} />}
          </React.Fragment>
        );
      }
      case 'h3': {
        const id = slugifyHeading(block.text);
        return (
          <React.Fragment key={key}>
            <h3 id={id} className="text-lg font-bold text-slate-800 dark:text-slate-100 mt-6 mb-3 flex items-center gap-2 flex-wrap">
              {renderInline(block.text, key)}
              {block.levelTag && <LevelBadge level={block.levelTag} />}
            </h3>
            {block.concept && <AlsoInLinks concept={block.concept} currentDocId={doc.id} onSelectDoc={onSelectDoc} />}
          </React.Fragment>
        );
      }
      case 'li':
        return (
          <li key={key} className="ml-5 list-disc text-sm text-slate-700 dark:text-slate-300 my-1 leading-relaxed">
            {renderInline(block.text, key)}
          </li>
        );
      case 'oli':
        return (
          <li key={key} className="ml-5 list-decimal text-sm text-slate-700 dark:text-slate-300 my-1 leading-relaxed">
            {renderInline(block.text, key)}
          </li>
        );
      case 'p':
        return (
          <p key={key} className="text-sm sm:text-base text-slate-700 dark:text-slate-300 my-3 leading-relaxed">
            {renderInline(block.text, key)}
          </p>
        );
      case 'blockquote':
        return (
          <blockquote
            key={key}
            className="my-4 pl-4 border-l-4 border-slate-300 dark:border-slate-700 text-sm sm:text-base text-slate-600 dark:text-slate-400 italic leading-relaxed"
          >
            {renderInline(block.text, key)}
          </blockquote>
        );
      case 'callout': {
        let borderClass = 'border-blue-500 bg-blue-500/10 text-blue-900 dark:text-blue-200';
        let icon = <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />;
        if (block.kind === 'TIP') {
          borderClass = 'border-emerald-500 bg-emerald-500/10 text-emerald-900 dark:text-emerald-200';
          icon = <Lightbulb className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />;
        } else if (block.kind === 'IMPORTANT') {
          borderClass = 'border-amber-500 bg-amber-500/10 text-amber-900 dark:text-amber-200';
          icon = <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />;
        } else if (block.kind === 'WARNING') {
          borderClass = 'border-rose-500 bg-rose-500/10 text-rose-900 dark:text-rose-200';
          icon = <ShieldAlert className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />;
        }
        return (
          <div key={key} className={`my-4 p-4 rounded-xl border-l-4 ${borderClass} shadow-sm text-xs sm:text-sm flex items-start gap-3`}>
            {icon}
            <div className="leading-relaxed">
              <div className="font-bold uppercase tracking-wide text-[11px] mb-1">{block.kind}</div>
              {block.text && <div>{renderInline(block.text, key)}</div>}
            </div>
          </div>
        );
      }
      case 'table':
        return (
          <div key={key} className="my-6 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 font-bold">
                  {block.headers.map((h, i) => (
                    <th key={i} className="p-3 border-r border-slate-200 dark:border-slate-800 last:border-r-0">
                      {renderInline(h.trim(), `${key}-th-${i}`)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {block.rows.map((row, rIdx) => (
                  <tr key={rIdx} className="border-b border-slate-200/60 dark:border-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition">
                    {row.map((cell, cIdx) => (
                      <td key={cIdx} className="p-3 border-r border-slate-200/60 dark:border-slate-800/60 last:border-r-0 text-slate-700 dark:text-slate-300">
                        {renderInline(cell.trim(), `${key}-td-${rIdx}-${cIdx}`)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      case 'mermaid':
        return <MermaidDiagram key={key} chart={block.code} />;
      case 'code':
        return renderCodeBlock(block.lang, block.code, key);
      case 'tabgroup': {
        const baseCodeIndex = codeBlockCount;
        codeBlockCount += block.items.length;
        return (
          <ComparisonTabs
            key={key}
            items={block.items}
            renderInline={renderInline}
            preferredLang={preferredLang}
            onSelectLang={setPreferredLang}
            copiedCodeIndex={copiedCodeIndex}
            onCopyCode={handleCopyCode}
            baseCodeIndex={baseCodeIndex}
            copyLabel={t('doc.copyCode')}
            copiedLabel={t('doc.copied')}
          />
        );
      }
      default:
        return null;
    }
  };

  // restructure-v2 §3 — "level is a tag, never a wall": a band=X article's
  // Mid/Senior/Lead sections render as <details>, collapsed or open per the
  // level filter above, but every section stays in the DOM and reachable —
  // this only hides depth behind one click, it never removes it.
  const renderFormattedMarkdown = (markdownText: string) => {
    const blocks = groupComparisonBlocks(parseBlocks(markdownText));

    if (doc.levelSections.length === 0) {
      return blocks.map((block, idx) => renderBlock(block, idx));
    }

    type Segment = { level: Level | null; blocks: { block: RenderableBlock; idx: number }[] };
    const segments: Segment[] = [{ level: null, blocks: [] }];
    blocks.forEach((block, idx) => {
      const isLevelHeading = block.type === 'h2' && block.levelTag;
      if (isLevelHeading) {
        segments.push({ level: (block as Block & { type: 'h2' }).levelTag as Level, blocks: [] });
      }
      segments[segments.length - 1].blocks.push({ block, idx });
    });

    return segments.map((segment, sIdx) => {
      if (segment.level === null) {
        return segment.blocks.map(({ block, idx }) => renderBlock(block, idx));
      }
      const isOpen = levelFilter === 'All' || levelFilter === segment.level;
      const [headingEntry, ...restEntries] = segment.blocks;
      return (
        <details key={`segment-${sIdx}-${levelFilter}`} open={isOpen} className="group/section">
          <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden [&::marker]:hidden">
            {renderBlock(headingEntry.block, headingEntry.idx)}
          </summary>
          <div>{restEntries.map(({ block, idx }) => renderBlock(block, idx))}</div>
        </details>
      );
    });
  };

  // Phase 0.5: fall back on empty-after-trim, not on falsy — a whitespace-only
  // string is truthy and used to render as a silent blank page (finding 05).
  // When the active language genuinely has no content, say so honestly rather
  // than quietly substituting the other language's prose.
  const activeContent = lang === 'vi' ? doc.content : doc.contentEn;
  const isTranslated = activeContent.trim().length > 0;
  const contentText = isTranslated ? activeContent : '';

  return (
    <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-8 py-8 lg:py-12 min-w-0">
      {/* Breadcrumb Navigation Header */}
      <nav className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-6">
        <button onClick={onNavigateHome} className="hover:text-cyan-500 transition">
          {t('nav.home')}
        </button>
        <span>/</span>
        <span className="font-semibold text-slate-700 dark:text-slate-300">{doc.categoryTitle}</span>
        <span>/</span>
        <span className="truncate text-slate-400">{doc.title}</span>
      </nav>

      {/* Doc Title & Metadata Header */}
      <header className="mb-8 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div className="flex flex-wrap items-center gap-2.5 mb-3">
          <span className="px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 font-mono text-xs font-semibold border border-cyan-500/20">
            {doc.categoryTitle}
          </span>
          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
            doc.level === 'Lead'
              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
              : doc.level === 'Senior'
              ? 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20'
              : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
          }`}>
            Level: {doc.level}
          </span>
          <span className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 font-mono">
            <Clock className="w-3.5 h-3.5" />
            {doc.readingTime}
          </span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          {lang === 'vi' ? doc.title : doc.titleEn}
        </h1>

        <p className="mt-3 text-base text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
          {lang === 'vi' ? doc.description : doc.descriptionEn}
        </p>

        {/* Tags */}
        <div className="mt-4 flex flex-wrap gap-1.5">
          {doc.tags.map(tag => (
            <span key={tag} className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[11px] font-mono">
              #{tag}
            </span>
          ))}
        </div>
      </header>

      {/* restructure-v2 §3 — level filter. Only shown on a band=X article
          (one continuous file spanning Mid/Senior/Lead); collapses sections
          outside the chosen level, never removes them from the page. */}
      {doc.levelSections.length > 1 && (
        <div className="mb-6 flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Show depth:</span>
          <div className="flex gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            {(['All', ...LEVEL_ORDER] as const).map(opt => (
              <button
                key={opt}
                onClick={() => setLevelFilter(opt)}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition ${
                  levelFilter === opt
                    ? 'bg-white dark:bg-slate-800 text-cyan-600 dark:text-cyan-400 shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* restructure-v2 §2 — leaf tab. Persists the reader's language/platform
          preference across the whole site; where a platform counterpart article
          already exists, switching leaf jumps straight to it. */}
      {domainAxis.axis === 'platform' && (
        <div className="mb-6 flex gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-fit">
          {(domainAxis.leaves ?? []).map(leaf => {
            const sibling = doc.topic && doc.domain ? findDocByTopicLeaf(doc.domain, doc.topic, leaf) : undefined;
            return (
              <button
                key={leaf}
                onClick={() => {
                  setPlatformLeaf(leaf as typeof platformLeaf);
                  if (sibling) onSelectDoc(sibling.id);
                  else if (counterpartDoc && counterpartDoc.platform === leaf.toLowerCase()) onSelectDoc(counterpartDoc.id);
                }}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition ${
                  (doc.leaf ? doc.leaf === leaf : platformLeaf === leaf)
                    ? 'bg-white dark:bg-slate-800 text-cyan-600 dark:text-cyan-400 shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
              >
                {leaf}
              </button>
            );
          })}
        </div>
      )}
      {domainAxis.axis === 'language' && (
        <div className="mb-6 flex gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-fit flex-wrap">
          {(domainAxis.leaves ?? []).map(leaf => {
            const sibling = doc.topic && doc.domain ? findDocByTopicLeaf(doc.domain, doc.topic, leaf) : undefined;
            return (
              <button
                key={leaf}
                onClick={() => {
                  setLanguageLeaf(leaf as typeof languageLeaf);
                  if (sibling) onSelectDoc(sibling.id);
                }}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition ${
                  (doc.leaf ? doc.leaf === leaf : languageLeaf === leaf)
                    ? 'bg-white dark:bg-slate-800 text-cyan-600 dark:text-cyan-400 shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
              >
                {leaf}
              </button>
            );
          })}
        </div>
      )}

      {/* Assessable outcomes (plan/domains.md, CONTRIBUTING.md definition of done) */}
      {doc.outcomes.length > 0 && (
        <div className="mb-6 p-4 rounded-xl border border-cyan-500/20 bg-cyan-500/5">
          <div className="flex items-center gap-2 mb-2 text-xs font-bold uppercase tracking-wider text-cyan-700 dark:text-cyan-400">
            <Target className="w-3.5 h-3.5" />
            <span>Outcome{doc.outcomes.length > 1 ? 's' : ''}</span>
          </div>
          <ul className="space-y-1.5">
            {doc.outcomes.map((outcome, i) => (
              <li key={i} className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                {outcome}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Interactive demo (.agents/rules/demonstration_assets.md) */}
      {doc.demo && onOpenDemo && (
        <button
          onClick={() => onOpenDemo(doc.demo as string)}
          className="mb-6 w-full flex items-center justify-between gap-3 p-4 rounded-xl border border-dashed border-cyan-500/40 bg-white dark:bg-slate-900 hover:border-cyan-500 transition text-left"
        >
          <div className="flex items-center gap-3">
            <PlaySquare className="w-5 h-5 text-cyan-500 shrink-0" />
            <div>
              <div className="text-sm font-bold text-slate-900 dark:text-white">Open the interactive demo</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">See the outcome above, not just read about it</div>
            </div>
          </div>
          <ExternalLink className="w-4 h-4 text-slate-400" />
        </button>
      )}

      {/* Main Formatted Article Content */}
      {isTranslated ? (
        <article className="prose dark:prose-invert max-w-none">
          {renderFormattedMarkdown(contentText)}
        </article>
      ) : (
        <div className="my-6 p-6 rounded-xl border-l-4 border-amber-500 bg-amber-500/10 text-amber-900 dark:text-amber-200 flex items-start gap-3">
          <Languages className="w-5 h-5 shrink-0 mt-0.5 text-amber-500" />
          <div className="text-sm leading-relaxed">
            <p className="font-semibold mb-1">
              {lang === 'vi' ? 'Chưa có bản dịch tiếng Việt' : 'Not translated yet'}
            </p>
            <p className="text-amber-800/90 dark:text-amber-200/80">
              {lang === 'vi'
                ? 'Bài viết này hiện chỉ có ở tiếng Anh. Hãy chuyển ngôn ngữ để đọc nội dung đầy đủ.'
                : 'This article currently only exists in another language slot. Switch the language toggle to read it, or check back once the translation pass (Phase 6) lands.'}
            </p>
          </div>
        </div>
      )}

      {/* Dated resources (CONTRIBUTING.md definition of done: 3-5 resources, each dated) */}
      {doc.resources.length > 0 && (
        <section className="mt-10 pt-6 border-t border-slate-200 dark:border-slate-800">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-3">Resources</h2>
          <ul className="space-y-2">
            {doc.resources.map((r, i) => (
              <li key={i} className="text-sm flex items-baseline gap-2">
                <a
                  href={r.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-cyan-600 dark:text-cyan-400 hover:underline font-medium"
                >
                  {r.title}
                </a>
                <span className="text-xs text-slate-400 font-mono">{r.date}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Previous / Next flow footer — restructure-v2 §3: Mid -> Senior -> Lead
          -> Interview Questions -> next domain, when this article is filed on
          the new taxonomy; falls back to the legacy whole-registry walk when
          it isn't (only tech-lead-roadmap today). */}
      {(() => {
        const prevStop = flowNeighbors?.prev ?? null;
        const nextStop = flowNeighbors?.next ?? null;

        const prevLabel = prevStop
          ? prevStop.kind === 'doc'
            ? docsRegistry.find(d => d.id === prevStop.docId)?.titleEn
            : 'Interview Questions'
          : prevDoc
          ? (lang === 'vi' ? prevDoc.title : prevDoc.titleEn)
          : null;
        const nextLabel = nextStop
          ? nextStop.kind === 'doc'
            ? docsRegistry.find(d => d.id === nextStop.docId)?.titleEn
            : 'Interview Questions'
          : nextDoc
          ? (lang === 'vi' ? nextDoc.title : nextDoc.titleEn)
          : null;

        const goPrev = () => {
          if (prevStop) {
            prevStop.kind === 'doc' ? onSelectDoc(prevStop.docId) : onOpenInterview?.(prevStop.domain);
          } else if (prevDoc) onSelectDoc(prevDoc.id);
        };
        const goNext = () => {
          if (nextStop) {
            nextStop.kind === 'doc' ? onSelectDoc(nextStop.docId) : onOpenInterview?.(nextStop.domain);
          } else if (nextDoc) onSelectDoc(nextDoc.id);
        };

        return (
          <footer className="mt-14 pt-8 border-t border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {prevLabel ? (
              <button
                onClick={goPrev}
                className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-cyan-500/50 dark:hover:border-cyan-500/50 text-left transition group"
              >
                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <ChevronLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
                  <span>{t('doc.prev')}</span>
                </div>
                <div className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-cyan-500 transition-colors line-clamp-1 flex items-center gap-1.5">
                  {flowNeighbors?.prev?.kind === 'interview' && <HelpCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
                  {prevLabel}
                </div>
              </button>
            ) : <div />}

            {nextLabel ? (
              <button
                onClick={goNext}
                className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-cyan-500/50 dark:hover:border-cyan-500/50 text-right transition group"
              >
                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-end gap-1">
                  <span>{t('doc.next')}</span>
                  <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
                <div className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-cyan-500 transition-colors line-clamp-1 flex items-center justify-end gap-1.5">
                  {nextLabel}
                  {flowNeighbors?.next?.kind === 'interview' && <HelpCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
                </div>
              </button>
            ) : <div />}
          </footer>
        );
      })()}
    </main>
  );
};
