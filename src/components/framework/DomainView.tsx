import React from 'react';
import { BookOpen, ArrowLeft, Layers, HelpCircle } from 'lucide-react';
import { getDomain, filedArticlesForDomain } from '../../data/framework';
import { Band, Level, Platform } from '../../types';

interface DomainViewProps {
  slug: string;
  onSelectDoc: (docId: string, anchor?: string) => void;
  onBackToMatrix: () => void;
  onOpenInterview: (domainSlug: string) => void;
}

const LEVEL_ORDER: Level[] = ['Mid', 'Senior', 'Lead'];
const BAND_TO_LEVEL: Record<string, Level> = { M: 'Mid', S: 'Senior', L: 'Lead' };

export const DomainView: React.FC<DomainViewProps> = ({ slug, onSelectDoc, onBackToMatrix, onOpenInterview }) => {
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

  // The band grid below surfaces one article per band+platform cell. A domain may hold more
  // than that — a focused companion piece filed against a cell that already has its main unit —
  // so anything the grid does not link is listed separately rather than being unreachable.
  const extraArticles = filed.filter(d => findFiled(d.band as Band, d.platform as Platform)?.id !== d.id);

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

        {/* restructure-v2 §6 def-of-done, §7 — Middle/Senior/Lead + Interview
            progress, and the entry point into this domain's interview page. */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {LEVEL_ORDER.map(level => {
            const hasLevel = filed.some(d => (d.band === 'X' ? d.levelSections.some(s => s.level === level) : BAND_TO_LEVEL[d.band ?? 'M'] === level));
            return (
              <span
                key={level}
                className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide border ${
                  hasLevel
                    ? 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/30'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 border-slate-200 dark:border-slate-700'
                }`}
              >
                {level}
              </span>
            );
          })}
          <button
            onClick={() => onOpenInterview(slug)}
            className="ml-1 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide border bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30 hover:bg-amber-500/20 transition flex items-center gap-1"
          >
            <HelpCircle className="w-3 h-3" />
            <span>Interview Questions</span>
          </button>
        </div>
      </header>

      {domain.layout === 'principle-list' ? (
        <>
          {/* Principle-first domains (currently only 01): one article per principle, each with
              its own internal Mid/Senior/Lead sections — no band x platform grid to render. */}
          <section className="mb-10 space-y-2">
            {[...filed]
              .sort((a, b) => a.sidebar_position - b.sidebar_position)
              .map(doc => (
                <button
                  key={doc.id}
                  onClick={() => onSelectDoc(doc.id)}
                  className="w-full text-left p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-cyan-500/40 transition"
                >
                  <div className="font-semibold text-sm text-slate-900 dark:text-white">{doc.title}</div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{doc.description}</p>
                  {doc.outcomes[0] && (
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1.5">
                      <span className="font-semibold">Outcome:</span> {doc.outcomes[0]}
                    </p>
                  )}
                </button>
              ))}
          </section>

          <section className="mb-10 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border border-cyan-500/20 bg-cyan-500/5">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyan-500" />
                Cross-language cheat sheet
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                One comparison table per principle above, across Kotlin, Java, Swift, Dart and
                TypeScript — the quick-reference version once you've read the articles.
              </p>
              {filed.find(d => d.id === 'fundamentals-cross-language-cheat-sheet') && (
                <button
                  onClick={() => onSelectDoc('fundamentals-cross-language-cheat-sheet')}
                  className="mt-2 px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30 font-semibold text-[11px] hover:bg-cyan-500/20 transition"
                >
                  Open the cheat sheet
                </button>
              )}
            </div>
            <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-amber-500" />
                Tech Lead Roadmap
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Depth on one topic lives in each article's Lead section above. The breadth a Tech
                Lead needs across system design, technology evaluation and cross-team collaboration
                lives here.
              </p>
              <button
                onClick={() => onSelectDoc('tech-lead-roadmap')}
                className="mt-2 px-2 py-0.5 rounded bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30 font-semibold text-[11px] hover:bg-amber-500/20 transition"
              >
                Open the roadmap
              </button>
            </div>
          </section>
        </>
      ) : (
      <>
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

      {/* Companion articles filed against a cell the band grid already links */}
      {extraArticles.length > 0 && (
        <section>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-cyan-500" />
            Also in this domain
          </h2>
          <div className="space-y-2">
            {extraArticles.map(doc => (
              <button
                key={doc.id}
                onClick={() => onSelectDoc(doc.id)}
                className="w-full text-left p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-cyan-500/40 transition"
              >
                <div className="font-semibold text-sm text-slate-900 dark:text-white">{doc.title}</div>
                <div className="text-xs text-slate-400 mt-0.5">
                  {doc.band} · {doc.platform} · {doc.langStatus.en === 'complete' ? 'English complete' : 'English pending'} ·{' '}
                  {doc.langStatus.vi === 'complete' ? 'Vietnamese complete' : 'Vietnamese pending'}
                </div>
              </button>
            ))}
          </div>
        </section>
      )}
      </>
      )}
    </main>
  );
};
