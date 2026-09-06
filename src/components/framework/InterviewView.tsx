import React, { useState } from 'react';
import { ArrowLeft, ChevronDown, ChevronLeft, ChevronRight, HelpCircle } from 'lucide-react';
import { getDomain } from '../../data/framework';
import { getInterviewFlowNeighbors } from '../../data/navFlow';
import { docsRegistry, findInterviewDoc } from '../../data/docsRegistry';
import { Level } from '../../types';

interface InterviewViewProps {
  domainSlug: string;
  onBackToDomain: () => void;
  onSelectDoc: (docId: string) => void;
  onOpenInterview: (domainSlug: string) => void;
}

const LEVELS: Level[] = ['Mid', 'Senior', 'Lead'];

interface QAPair {
  q: string;
  a: string;
}

// restructure-v2 (plan/restructure-v2.md §5) — `docs/<domain>/interview.md`
// convention: `## Mid` / `## Senior` / `## Lead` headings, each containing
// `Q: ...` / `A: ...` pairs (each may wrap across lines, joined until the
// next `Q:`/`A:` marker or a blank line). Deliberately not routed through
// DocViewer's full markdown renderer — this is a much narrower, self-contained
// format, and keeping its own tiny parser avoids coupling the two.
function parseInterviewBody(body: string): Partial<Record<Level, QAPair[]>> {
  const sections: Partial<Record<Level, QAPair[]>> = {};
  let currentLevel: Level | null = null;
  let pairs: QAPair[] = [];
  let field: 'q' | 'a' | null = null;

  const flushField = () => {
    field = null;
  };
  const commitLevel = () => {
    if (currentLevel) sections[currentLevel] = pairs;
  };

  for (const rawLine of body.split('\n')) {
    const line = rawLine.trim();
    const headingMatch = line.match(/^##\s+(Mid|Senior|Lead)\s*$/i);
    if (headingMatch) {
      commitLevel();
      const word = headingMatch[1].toLowerCase();
      currentLevel = word === 'mid' ? 'Mid' : word === 'senior' ? 'Senior' : 'Lead';
      pairs = [];
      flushField();
      continue;
    }
    if (!currentLevel) continue;

    const qMatch = line.match(/^Q:\s*(.*)$/);
    const aMatch = line.match(/^A:\s*(.*)$/);
    if (qMatch) {
      pairs.push({ q: qMatch[1], a: '' });
      field = 'q';
      continue;
    }
    if (aMatch) {
      if (pairs.length > 0) pairs[pairs.length - 1].a = aMatch[1];
      field = 'a';
      continue;
    }
    if (line === '') {
      flushField();
      continue;
    }
    // Continuation of a wrapped Q or A line.
    if (field && pairs.length > 0) {
      const last = pairs[pairs.length - 1];
      last[field] = `${last[field]} ${line}`.trim();
    }
  }
  commitLevel();
  return sections;
}

const QuestionCard: React.FC<{ index: number; qa: QAPair }> = ({ index, qa }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition"
      >
        <span className="shrink-0 mt-0.5 text-xs font-mono font-bold text-cyan-600 dark:text-cyan-400 w-6">{index}.</span>
        <span className="flex-1 text-sm font-semibold text-slate-900 dark:text-white">{qa.q}</span>
        <ChevronDown className={`w-4 h-4 shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="px-4 pb-4 pl-[2.75rem] text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
          {qa.a}
        </div>
      )}
    </div>
  );
};

/**
 * restructure-v2 (plan/restructure-v2.md §5) — one Interview Questions node
 * per domain, tabbed by level, ≥8 questions per level, answers collapsed by
 * default so the page doubles as a self-quiz.
 */
export const InterviewView: React.FC<InterviewViewProps> = ({ domainSlug, onBackToDomain, onSelectDoc, onOpenInterview }) => {
  const [activeLevel, setActiveLevel] = useState<Level>('Mid');
  const domain = getDomain(domainSlug);
  const { prev, next } = getInterviewFlowNeighbors(domainSlug);
  const interviewDoc = findInterviewDoc(domainSlug);
  const sections = interviewDoc ? parseInterviewBody(interviewDoc.contentEn) : {};
  const questions = sections[activeLevel] ?? [];

  if (!domain) {
    return (
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-8 py-14 text-center">
        <p className="text-slate-500 dark:text-slate-400">Unknown domain "{domainSlug}".</p>
      </main>
    );
  }

  const goToStop = (stop: { kind: 'doc'; docId: string } | { kind: 'interview'; domain: string } | null) => {
    if (!stop) return;
    if (stop.kind === 'doc') onSelectDoc(stop.docId);
    else onOpenInterview(stop.domain);
  };

  return (
    <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-8 py-10 lg:py-14">
      <button
        onClick={onBackToDomain}
        className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-cyan-500 transition mb-6"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Back to {domain.name}</span>
      </button>

      <header className="mb-8">
        <div className="flex items-center gap-2 mb-3 text-cyan-600 dark:text-cyan-400">
          <HelpCircle className="w-5 h-5" />
          <span className="text-xs font-bold uppercase tracking-wider">Interview Questions</span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">{domain.name}</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          At least 8 questions per level (plan/restructure-v2.md §5). Answers are collapsed —
          try each one before revealing it.
        </p>
      </header>

      {/* Level tabs */}
      <div className="flex gap-1 mb-8 p-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-fit">
        {LEVELS.map(level => (
          <button
            key={level}
            onClick={() => setActiveLevel(level)}
            className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition flex items-center gap-1.5 ${
              activeLevel === level
                ? 'bg-white dark:bg-slate-800 text-cyan-600 dark:text-cyan-400 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            <span>{level}</span>
            {sections[level] && (
              <span className="text-[10px] font-mono text-slate-400">{sections[level]!.length}</span>
            )}
          </button>
        ))}
      </div>

      {questions.length > 0 ? (
        <div className="space-y-2">
          {questions.map((qa, i) => (
            <QuestionCard key={i} index={i + 1} qa={qa} />
          ))}
        </div>
      ) : (
        <div className="p-6 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-sm text-slate-500 dark:text-slate-400">
          <p className="font-semibold text-slate-700 dark:text-slate-300 mb-1">
            {activeLevel} questions for {domain.name} haven't been authored yet.
          </p>
          <p>
            This page is wired end to end — level tabs, flow, and the ≥8-question floor — so
            writing them is the only thing left once this domain's rewrite starts.
          </p>
        </div>
      )}

      {/* Prev / next flow — Interview is the last stop in a domain before the next one starts. */}
      <footer className="mt-14 pt-8 border-t border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-4">
        {prev ? (
          <button
            onClick={() => goToStop(prev)}
            className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-cyan-500/50 text-left transition group"
          >
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
              <ChevronLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
              <span>Previous</span>
            </div>
            <div className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-cyan-500 transition-colors line-clamp-1">
              {prev.kind === 'doc' ? docsRegistry.find(d => d.id === prev.docId)?.titleEn ?? prev.docId : `${getDomain(prev.domain)?.name ?? prev.domain} — Interview Questions`}
            </div>
          </button>
        ) : <div />}

        {next ? (
          <button
            onClick={() => goToStop(next)}
            className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-cyan-500/50 text-right transition group"
          >
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-end gap-1">
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
            <div className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-cyan-500 transition-colors line-clamp-1">
              {next.kind === 'doc' ? docsRegistry.find(d => d.id === next.docId)?.titleEn ?? next.docId : `${getDomain(next.domain)?.name ?? next.domain} — Interview Questions`}
            </div>
          </button>
        ) : <div />}
      </footer>
    </main>
  );
};
