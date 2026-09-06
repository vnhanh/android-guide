import React from 'react';
import { BookOpen, ArrowLeft, Layers } from 'lucide-react';
import { getDomain, filedArticlesForDomain } from '../../data/framework';
import { docsRegistry } from '../../data/docsRegistry';
import { Band, Platform } from '../../types';

interface DomainViewProps {
  slug: string;
  onSelectDoc: (docId: string) => void;
  onBackToMatrix: () => void;
}

export const DomainView: React.FC<DomainViewProps> = ({ slug, onSelectDoc, onBackToMatrix }) => {
  const domain = getDomain(slug);

  if (!domain) {
    return (
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-8 py-14 text-center">
        <p className="text-slate-500 dark:text-slate-400">Unknown domain "{slug}".</p>
      </main>
    );
  }

  const filed = filedArticlesForDomain(slug);
  const findFiled = (band: Band, platform: Platform) =>
    filed.find(d => d.band === band && d.platform === platform);

  const linkedArticles = domain.existingArticleIds
    .map(id => docsRegistry.find(d => d.id === id))
    .filter(Boolean) as typeof docsRegistry;

  return (
    <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-8 py-10 lg:py-14">
      <button
        onClick={onBackToMatrix}
        className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-cyan-500 transition mb-6"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Back to matrix</span>
      </button>

      <header className="mb-10">
        <div className="flex items-center gap-2 mb-3">
          <span className="font-mono text-sm text-slate-400">{domain.num}</span>
          <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
            Track {domain.track}
          </span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">{domain.name}</h1>
        <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
          Platform treatment: <span className="font-semibold text-slate-700 dark:text-slate-300">{domain.platformTreatment}</span>
        </p>
        {filed.length === 0 ? (
          <div className="mt-4 p-3 rounded-lg border border-amber-500/20 bg-amber-500/5 text-xs text-amber-800 dark:text-amber-300">
            Stub page (Phase 1). Band-unit articles for this domain have not been written yet —
            that is Phase 2 onward. See <code className="px-1 rounded bg-black/5 dark:bg-white/10">plan/domains.md</code> for
            the full section-by-section plan.
          </div>
        ) : (
          <div className="mt-4 p-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 text-xs text-emerald-800 dark:text-emerald-300">
            {filed.length} band-unit {filed.length === 1 ? 'article' : 'articles'} filed against this domain so far.
          </div>
        )}
      </header>

      {/* Band definitions */}
      <section className="mb-10 grid grid-cols-1 gap-4">
        {(['mid', 'senior', 'lead'] as const).map(band => {
          const label = band === 'mid' ? 'Mid' : band === 'senior' ? 'Senior' : 'Lead';
          const bandCode = (band === 'mid' ? 'M' : band === 'senior' ? 'S' : 'L') as Band;
          const styles = {
            mid: { box: 'border-emerald-500/20 bg-emerald-500/5', text: 'text-emerald-600 dark:text-emerald-400' },
            senior: { box: 'border-cyan-500/20 bg-cyan-500/5', text: 'text-cyan-600 dark:text-cyan-400' },
            lead: { box: 'border-amber-500/20 bg-amber-500/5', text: 'text-amber-600 dark:text-amber-400' },
          }[band];

          const platforms: { platform: Platform; label: string }[] =
            bandCode === 'L' || findFiled(bandCode, 'shared')
              ? [{ platform: 'shared', label: 'Shared' }]
              : [{ platform: 'android', label: 'Android' }, { platform: 'ios', label: 'iOS' }];

          return (
            <div key={band} className={`p-4 rounded-xl border ${styles.box}`}>
              <div className={`text-xs font-bold uppercase tracking-wider mb-1.5 ${styles.text}`}>{label}</div>
              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{domain.matrix[band]}</p>
              <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
                {platforms.map(({ platform, label: platformLabel }) => {
                  const article = findFiled(bandCode, platform);
                  return article ? (
                    <button
                      key={platform}
                      onClick={() => onSelectDoc(article.id)}
                      className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30 font-semibold hover:bg-cyan-500/20 transition"
                    >
                      {platformLabel} · {article.langStatus.en === 'complete' ? 'written' : 'pending'}
                    </button>
                  ) : (
                    <span
                      key={platform}
                      className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                    >
                      {platformLabel} · not yet written
                    </span>
                  );
                })}
              </div>
            </div>
          );
        })}
      </section>

      {/* Parity placeholder */}
      {(domain.platformTreatment.includes('parity') || domain.platformTreatment.includes('split')) && (
        <section className="mb-10">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-500" />
            Parity table
          </h2>
          {domain.parity ? (
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm">
              <p className="text-slate-700 dark:text-slate-300"><span className="font-semibold">Maps:</span> {domain.parity}</p>
              {domain.breaks && (
                <p className="mt-2 text-slate-600 dark:text-slate-400"><span className="font-semibold text-rose-500">Breaks:</span> {domain.breaks}</p>
              )}
            </div>
          ) : (
            <div className="p-4 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-sm text-slate-400">
              Empty — parity table not yet drafted for this domain.
            </div>
          )}
        </section>
      )}

      {/* Linked legacy articles */}
      <section>
        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-cyan-500" />
          Existing material touching this domain
        </h2>
        {linkedArticles.length === 0 ? (
          <p className="text-sm text-slate-400">None of the 14 pre-existing articles cover this domain yet.</p>
        ) : (
          <div className="space-y-2">
            {linkedArticles.map(doc => (
              <button
                key={doc.id}
                onClick={() => onSelectDoc(doc.id)}
                className="w-full text-left p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-cyan-500/40 transition flex items-center justify-between"
              >
                <div>
                  <div className="font-semibold text-sm text-slate-900 dark:text-white">{doc.title}</div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    Level: {doc.level} · {doc.langStatus.en === 'complete' ? 'English complete' : 'English pending'} ·{' '}
                    {doc.langStatus.vi === 'complete' ? 'Vietnamese complete' : 'Vietnamese pending'}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
        <p className="mt-3 text-[11px] text-slate-400">
          Linked as-is per <code className="px-1 rounded bg-slate-100 dark:bg-slate-800">plan/gap-analysis.md</code> —
          re-filing this content onto the domain/band/platform schema is Phase 2, not done here.
        </p>
      </section>
    </main>
  );
};
