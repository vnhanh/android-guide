import React, { useState } from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight, HelpCircle } from 'lucide-react';
import { getDomain } from '../../data/framework';
import { getInterviewFlowNeighbors } from '../../data/navFlow';
import { docsRegistry } from '../../data/docsRegistry';
import { Level } from '../../types';

interface InterviewViewProps {
  domainSlug: string;
  onBackToDomain: () => void;
  onSelectDoc: (docId: string) => void;
  onOpenInterview: (domainSlug: string) => void;
}

const LEVELS: Level[] = ['Mid', 'Senior', 'Lead'];

/**
 * restructure-v2 (plan/restructure-v2.md §5) — one Interview Questions node
 * per domain, tabbed by level. No domain has authored interview content yet
 * (that lands per-domain from Phase B on, alongside the rest of that domain's
 * rewrite) — this ships the renderer and the ≥8-per-level floor as a visible
 * target, so the shape is proven and browsable before any domain's questions
 * are written against it.
 */
export const InterviewView: React.FC<InterviewViewProps> = ({ domainSlug, onBackToDomain, onSelectDoc, onOpenInterview }) => {
  const [activeLevel, setActiveLevel] = useState<Level>('Mid');
  const domain = getDomain(domainSlug);
  const { prev, next } = getInterviewFlowNeighbors(domainSlug);

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
            className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition ${
              activeLevel === level
                ? 'bg-white dark:bg-slate-800 text-cyan-600 dark:text-cyan-400 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            {level}
          </button>
        ))}
      </div>

      {/* Not-yet-authored stub — every domain is browsable to this point today;
          questions get written per-domain starting Phase B (restructure-v2.md §7). */}
      <div className="p-6 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-sm text-slate-500 dark:text-slate-400">
        <p className="font-semibold text-slate-700 dark:text-slate-300 mb-1">
          {activeLevel} questions for {domain.name} haven't been authored yet.
        </p>
        <p>
          This page is wired end to end — level tabs, flow, and the ≥8-question floor — so
          writing them is the only thing left once this domain's rewrite starts.
        </p>
      </div>

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
