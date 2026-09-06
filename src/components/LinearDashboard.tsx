import React from 'react';
import { Search, Sparkles, ArrowRight, Grid3x3, Layers, CheckCircle2, Circle } from 'lucide-react';
import { docsRegistry } from '../data/docsRegistry';
import { DOMAINS, isDomainFiled } from '../data/framework';
import { useI18n } from '../context/I18nContext';
import { DocItem, Level } from '../types';

interface LinearDashboardProps {
  onSelectDoc: (docId: string) => void;
  onOpenSearch: () => void;
  onOpenFramework: () => void;
  onOpenMatrix: () => void;
  onOpenLevel: (level: Level) => void;
  onOpenDomain: (slug: string) => void;
}

const LEVELS: { level: Level; blurb: string }[] = [
  { level: 'Mid', blurb: 'Independently implement, debug, test and maintain production features.' },
  { level: 'Senior', blurb: 'Own complex technical problems and raise the effectiveness of others.' },
  { level: 'Lead', blurb: "Set a team's technical direction; optimise product and engineering as a whole." },
];

export const LinearDashboard: React.FC<LinearDashboardProps> = ({
  onSelectDoc,
  onOpenSearch,
  onOpenFramework,
  onOpenMatrix,
  onOpenLevel,
  onOpenDomain,
}) => {
  const { lang, t } = useI18n();


  const coveredCount = DOMAINS.filter(d => isDomainFiled(d.slug)).length;

  const popularDocs = [
    docsRegistry.find(d => d.id === 'code-review-senior'),
    docsRegistry.find(d => d.id === 'architecture-senior'),
    docsRegistry.find(d => d.id === 'apk-compilation-and-r8-proguard'),
    docsRegistry.find(d => d.id === 'concurrency-mid-android'),
    docsRegistry.find(d => d.id === 'release-senior-android'),
    docsRegistry.find(d => d.id === 'fundamentals-type-system-and-null-safety'),
    docsRegistry.find(d => d.id === 'tech-lead-roadmap'),
  ].filter(Boolean) as DocItem[];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0b0f19] text-slate-900 dark:text-slate-100 transition-colors">
      {/* Linear.app Style Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-16 lg:pt-20 lg:pb-24 border-b border-slate-200/80 dark:border-slate-800/80">
        {/* Background Mesh Gradient */}
        <div className="absolute inset-0 bg-grid-slate-900/[0.04] dark:bg-grid-slate-100/[0.03] bg-[bottom_1px_center]" />
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-to-tr from-cyan-500/20 via-indigo-500/20 to-purple-500/10 blur-[100px] pointer-events-none rounded-full" />

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {/* Version Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-600 dark:text-cyan-400 text-xs font-semibold tracking-wide mb-6 backdrop-blur-sm">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{t('hero.badge')}</span>
          </div>

          {/* Hero Main Heading */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white max-w-4xl mx-auto leading-[1.15]">
            Senior & Tech Lead{' '}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500">
              Mobile Developer Guide
            </span>
          </h1>

          {/* Hero Subtitle */}
          <p className="mt-6 text-lg sm:text-xl text-slate-600 dark:text-slate-300 max-w-3xl mx-auto font-normal leading-relaxed">
            {t('hero.subtitle')}
          </p>

          {/* Where are you now? */}
          <div className="mt-9 max-w-2xl mx-auto">
            <button
              onClick={onOpenSearch}
              className="w-full flex items-center justify-between px-5 py-4 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-900/5 hover:border-cyan-500/50 dark:hover:border-cyan-500/50 transition-all group text-left"
            >
              <div className="flex items-center gap-3.5 text-slate-400 dark:text-slate-500 group-hover:text-cyan-500 transition-colors">
                <Search className="w-5 h-5" />
                <span className="text-sm sm:text-base text-slate-500 dark:text-slate-400">
                  {t('hero.searchPlaceholder')}
                </span>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-500 dark:text-slate-400">
                <span>{t('nav.searchShortcut')}</span>
              </div>
            </button>
          </div>

          {/* Coverage banner — honest, not flattering */}
          <div className="mt-8 max-w-2xl mx-auto p-3 rounded-xl bg-white/60 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800/80 text-xs text-slate-500 dark:text-slate-400">
            <span className="font-semibold text-slate-700 dark:text-slate-300">{coveredCount} / {DOMAINS.length}</span> domains
            have band-unit articles written against them.
          </div>
        </div>
      </section>

      {/* Where are you now? — level cards, the primary entry point */}
      <section className="py-16 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-14">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Where are you now?</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Levels are defined by scope of ownership, not years of experience. Pick one to see a self-assessment.
              </p>
            </div>
            <button
              onClick={onOpenFramework}
              className="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-cyan-600 dark:text-cyan-400 hover:underline shrink-0"
            >
              <span>Full framework</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            {LEVELS.map(({ level, blurb }) => (
              <button
                key={level}
                onClick={() => onOpenLevel(level)}
                className="group relative p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-cyan-500/50 dark:hover:border-cyan-500/50 transition-all duration-200 shadow-sm hover:shadow-xl hover:shadow-cyan-500/5 text-left flex flex-col justify-between"
              >
                <div>
                  <div className="text-sm font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400 mb-2">{level}</div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{blurb}</p>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center gap-1 text-xs font-semibold text-slate-500 dark:text-slate-400 group-hover:text-cyan-500 transition-colors">
                  <span>Self-assessment</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </button>
            ))}
          </div>

          <button
            onClick={onOpenMatrix}
            className="w-full flex items-center justify-center gap-2 p-4 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 text-sm font-semibold text-slate-500 dark:text-slate-400 hover:border-cyan-500/50 hover:text-cyan-600 dark:hover:text-cyan-400 transition"
          >
            <Grid3x3 className="w-4 h-4" />
            <span>Or browse all {DOMAINS.length} domains × Mid/Senior/Lead in the full matrix</span>
          </button>
        </div>

        {/* Domain grid with honest coverage indicators */}
        <div className="mb-14">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                <Layers className="w-5 h-5 text-cyan-500" />
                {DOMAINS.length} domains
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Organised by competency, not technology stack. Coverage shown per domain, not flattered.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {DOMAINS.map(domain => {
              const covered = isDomainFiled(domain.slug);
              return (
                <button
                  key={domain.slug}
                  onClick={() => onOpenDomain(domain.slug)}
                  className="text-left p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-cyan-500/50 transition"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-[11px] text-slate-400">{domain.num}</span>
                    {covered ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    ) : (
                      <Circle className="w-3.5 h-3.5 text-slate-300 dark:text-slate-700" />
                    )}
                  </div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white leading-tight">{domain.name}</div>
                  <div className="text-[11px] text-slate-400 mt-1">{domain.platformTreatment}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Popular Guides & Quick Start Grid */}
        <div>
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                {t('dashboard.quickStartTitle')}
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Direct access to high-priority senior architectural cases and interview topics.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {popularDocs.map(doc => (
              <button
                key={doc.id}
                onClick={() => onSelectDoc(doc.id)}
                className="group text-left p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-cyan-500/50 dark:hover:border-cyan-500/50 transition-all duration-200 shadow-sm hover:shadow-md flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-md bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 font-semibold border border-cyan-500/20">
                      {doc.categoryTitle}
                    </span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${
                      doc.level === 'Lead'
                        ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                        : doc.level === 'Senior'
                        ? 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20'
                        : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                    }`}>
                      {doc.level}
                    </span>
                  </div>

                  <h4 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-cyan-500 dark:group-hover:text-cyan-400 transition-colors line-clamp-2">
                    {lang === 'vi' ? doc.title : doc.titleEn}
                  </h4>

                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 line-clamp-2 leading-relaxed">
                    {lang === 'vi' ? doc.description : doc.descriptionEn}
                  </p>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                  <span className="font-mono">{doc.readingTime} read</span>
                  <span className="flex items-center gap-1 font-semibold text-cyan-600 dark:text-cyan-400 group-hover:translate-x-0.5 transition-transform">
                    Read guide →
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};
