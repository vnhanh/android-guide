import React, { useMemo, useState } from 'react';
import { Grid3x3, CheckCircle2, Circle } from 'lucide-react';
import { DOMAINS, TRACKS, TrackId, isDomainFiled } from '../../data/framework';

interface MatrixViewProps {
  onOpenDomain: (slug: string) => void;
}

const TRACK_IDS: TrackId[] = ['A', 'B', 'C', 'D'];
const BAND_UNIT_COUNT = 81; // 78 across the original 20 domains + 3 shared-platform bands for domain 21

export const MatrixView: React.FC<MatrixViewProps> = ({ onOpenDomain }) => {
  const [trackFilter, setTrackFilter] = useState<TrackId | 'all'>('all');

  const rows = useMemo(
    () => DOMAINS.filter(d => trackFilter === 'all' || d.track === trackFilter),
    [trackFilter]
  );

  return (
    <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-10 lg:py-14">
      <header className="mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-600 dark:text-cyan-400 text-xs font-semibold mb-4">
          <Grid3x3 className="w-3.5 h-3.5" />
          <span>Competency matrix</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          {DOMAINS.length} domains × Mid / Senior / Lead
        </h1>
        <p className="mt-3 text-base text-slate-600 dark:text-slate-400 max-w-2xl leading-relaxed">
          {BAND_UNIT_COUNT} band units in total (some domains split Mid/Senior only, or share one Lead band across
          platforms). Mid cells describe implementation, Senior cells describe ownership, Lead
          cells describe direction.
        </p>
      </header>

      {/* Track filter */}
      <div className="flex flex-wrap gap-2 mb-8">
        <button
          onClick={() => setTrackFilter('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
            trackFilter === 'all'
              ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 border-transparent'
              : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          All tracks
        </button>
        {TRACK_IDS.map(id => (
          <button
            key={id}
            onClick={() => setTrackFilter(id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
              trackFilter === id
                ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 border-transparent'
                : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {id} · {TRACKS[id].name}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {rows.map(domain => {
          const covered = isDomainFiled(domain.slug);
          return (
            <button
              key={domain.slug}
              onClick={() => onOpenDomain(domain.slug)}
              className="w-full text-left p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-cyan-500/50 dark:hover:border-cyan-500/50 shadow-sm hover:shadow-md transition"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-slate-400">{domain.num}</span>
                  <h3 className="font-bold text-slate-900 dark:text-white">{domain.name}</h3>
                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                    Track {domain.track}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-semibold">
                  {covered ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="text-emerald-600 dark:text-emerald-400">Band-unit articles written</span>
                    </>
                  ) : (
                    <>
                      <Circle className="w-3.5 h-3.5 text-slate-300 dark:text-slate-700" />
                      <span className="text-slate-400 dark:text-slate-500">Not yet covered</span>
                    </>
                  )}
                </div>
              </div>
              <p className="text-[11px] text-slate-400 mb-3">{domain.platformTreatment}</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                  <div className="font-bold text-emerald-600 dark:text-emerald-400 mb-1">Mid</div>
                  <p className="text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-3">{domain.matrix.mid}</p>
                </div>
                <div className="p-3 rounded-lg bg-cyan-500/5 border border-cyan-500/10">
                  <div className="font-bold text-cyan-600 dark:text-cyan-400 mb-1">Senior</div>
                  <p className="text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-3">{domain.matrix.senior}</p>
                </div>
                <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/10">
                  <div className="font-bold text-amber-600 dark:text-amber-400 mb-1">Lead</div>
                  <p className="text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-3">{domain.matrix.lead}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </main>
  );
};
