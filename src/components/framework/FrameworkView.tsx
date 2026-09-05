import React from 'react';
import { Layers, ArrowRight } from 'lucide-react';
import { LEVEL_OWNERSHIP, LEVEL_GOALS, TRACKS, LEARNING_WEIGHT } from '../../data/framework';
import { Level } from '../../types';

interface FrameworkViewProps {
  onSelectLevel: (level: Level) => void;
  onOpenMatrix: () => void;
}

const LEVELS: Level[] = ['Mid', 'Senior', 'Lead'];

export const FrameworkView: React.FC<FrameworkViewProps> = ({ onSelectLevel, onOpenMatrix }) => {
  return (
    <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-8 py-10 lg:py-14">
      <header className="mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-600 dark:text-cyan-400 text-xs font-semibold mb-4">
          <Layers className="w-3.5 h-3.5" />
          <span>Career framework</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          Mid → Senior → Tech Lead
        </h1>
        <p className="mt-3 text-base text-slate-600 dark:text-slate-400 max-w-2xl leading-relaxed">
          Levels are defined by scope of ownership and blast radius — not by years of experience,
          and not by how hard the technology is. <code className="text-xs px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800">Staff</code> is
          retired from this ladder: it was the IC branch running parallel to Tech Lead, never a rung above it.
        </p>
      </header>

      {/* Level goal statements */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-12">
        {LEVELS.map(level => (
          <button
            key={level}
            onClick={() => onSelectLevel(level)}
            className="text-left p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-cyan-500/50 dark:hover:border-cyan-500/50 shadow-sm hover:shadow-md transition group"
          >
            <div className="text-sm font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400 mb-2">{level}</div>
            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{LEVEL_GOALS[level]}</p>
            <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-slate-500 dark:text-slate-400 group-hover:text-cyan-500 transition-colors">
              <span>View {level} landing page</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>
        ))}
      </div>

      {/* Ownership table */}
      <section className="mb-12">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">What changes at each level</h2>
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 font-bold">
                <th className="p-3 border-r border-slate-200 dark:border-slate-800">Dimension</th>
                <th className="p-3 border-r border-slate-200 dark:border-slate-800">Mid</th>
                <th className="p-3 border-r border-slate-200 dark:border-slate-800">Senior</th>
                <th className="p-3">Lead</th>
              </tr>
            </thead>
            <tbody>
              {LEVEL_OWNERSHIP.map(row => (
                <tr key={row.dimension} className="border-b border-slate-200/60 dark:border-slate-800/60">
                  <td className="p-3 border-r border-slate-200/60 dark:border-slate-800/60 font-semibold text-slate-700 dark:text-slate-300">{row.dimension}</td>
                  <td className="p-3 border-r border-slate-200/60 dark:border-slate-800/60 text-slate-600 dark:text-slate-400">{row.mid}</td>
                  <td className="p-3 border-r border-slate-200/60 dark:border-slate-800/60 text-slate-600 dark:text-slate-400">{row.senior}</td>
                  <td className="p-3 text-slate-600 dark:text-slate-400">{row.lead}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
          Tech Lead is a role change, not a skill increment — roughly half of Track D has no counterpart at Senior level.
        </p>
      </section>

      {/* Learning-attention weight */}
      <section className="mb-12">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-1">Learning-attention weight by track</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">A signal about where to spend deliberate effort — not a target, not a time budget.</p>
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 font-bold">
                <th className="p-3 border-r border-slate-200 dark:border-slate-800">Track</th>
                <th className="p-3 border-r border-slate-200 dark:border-slate-800">Mid</th>
                <th className="p-3 border-r border-slate-200 dark:border-slate-800">Senior</th>
                <th className="p-3">Lead</th>
              </tr>
            </thead>
            <tbody>
              {(Object.keys(TRACKS) as (keyof typeof TRACKS)[]).map(trackId => (
                <tr key={trackId} className="border-b border-slate-200/60 dark:border-slate-800/60">
                  <td className="p-3 border-r border-slate-200/60 dark:border-slate-800/60 font-semibold text-slate-700 dark:text-slate-300">
                    {trackId} · {TRACKS[trackId].name}
                  </td>
                  <td className="p-3 border-r border-slate-200/60 dark:border-slate-800/60 text-slate-600 dark:text-slate-400">{LEARNING_WEIGHT[trackId].Mid}%</td>
                  <td className="p-3 border-r border-slate-200/60 dark:border-slate-800/60 text-slate-600 dark:text-slate-400">{LEARNING_WEIGHT[trackId].Senior}%</td>
                  <td className="p-3 text-slate-600 dark:text-slate-400">{LEARNING_WEIGHT[trackId].Lead}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <button
        onClick={onOpenMatrix}
        className="w-full sm:w-auto px-5 py-3 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-semibold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition"
      >
        <span>See the full 60-cell competency matrix</span>
        <ArrowRight className="w-4 h-4" />
      </button>
    </main>
  );
};
