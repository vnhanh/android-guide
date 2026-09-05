import React, { useMemo, useState } from 'react';
import { Target, ListChecks } from 'lucide-react';
import { DOMAINS, LEVEL_GOALS, LEARNING_WEIGHT, TRACKS, TrackId } from '../../data/framework';
import { Level } from '../../types';

interface LevelViewProps {
  level: Level;
  onOpenDomain: (slug: string) => void;
}

const cellKey = (level: Level) => (level === 'Mid' ? 'mid' : level === 'Senior' ? 'senior' : 'lead') as 'mid' | 'senior' | 'lead';

export const LevelView: React.FC<LevelViewProps> = ({ level, onOpenDomain }) => {
  const key = cellKey(level);
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  // Domains ranked by how much learning-attention weight their track gets at this level.
  const rankedDomains = useMemo(() => {
    return [...DOMAINS].sort((a, b) => LEARNING_WEIGHT[b.track][level] - LEARNING_WEIGHT[a.track][level]);
  }, [level]);

  const toggle = (id: string) => setChecked(prev => ({ ...prev, [id]: !prev[id] }));
  const checkedCount = Object.values(checked).filter(Boolean).length;

  return (
    <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-8 py-10 lg:py-14">
      <header className="mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-600 dark:text-cyan-400 text-xs font-semibold mb-4">
          <Target className="w-3.5 h-3.5" />
          <span>Level landing</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">{level}</h1>
        <p className="mt-3 text-base text-slate-700 dark:text-slate-300 max-w-2xl leading-relaxed font-medium">
          &ldquo;{LEVEL_GOALS[level]}&rdquo;
        </p>
        {level === 'Lead' && (
          <p className="mt-3 text-sm text-amber-700 dark:text-amber-400 max-w-2xl leading-relaxed">
            Tech Lead is a role change, not a skill increment — roughly half of Track D has no
            counterpart at Senior level.
          </p>
        )}
      </header>

      {/* Domains ranked by attention weight at this level */}
      <section className="mb-12">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-1">Where to spend attention</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
          Domains ordered by their track's learning-attention weight at {level} level — a signal, not a schedule.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {rankedDomains.map(domain => (
            <button
              key={domain.slug}
              onClick={() => onOpenDomain(domain.slug)}
              className="text-left p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-cyan-500/50 transition"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-mono text-slate-400">{domain.num} · Track {domain.track}</span>
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                  {LEARNING_WEIGHT[domain.track][level]}% weight
                </span>
              </div>
              <div className="font-bold text-sm text-slate-900 dark:text-white">{domain.name}</div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">{domain.matrix[key]}</p>
            </button>
          ))}
        </div>
      </section>

      {/* Honest self-assessment checklist */}
      <section>
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <ListChecks className="w-5 h-5 text-cyan-500" />
            Self-assessment
          </h2>
          <span className="text-xs font-mono text-slate-400">{checkedCount} / {DOMAINS.length}</span>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
          Derived directly from this level's matrix cell in each domain. Check what you can
          honestly do today — unchecked isn't a failure, it's the reading list.
        </p>
        <div className="space-y-2">
          {DOMAINS.map(domain => (
            <label
              key={domain.slug}
              className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 cursor-pointer hover:border-cyan-500/30 transition"
            >
              <input
                type="checkbox"
                checked={!!checked[domain.slug]}
                onChange={() => toggle(domain.slug)}
                className="mt-0.5 accent-cyan-500"
              />
              <span className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                <span className="font-semibold text-slate-900 dark:text-white">{domain.name}:</span>{' '}
                {domain.matrix[key]}
              </span>
            </label>
          ))}
        </div>
      </section>
    </main>
  );
};
