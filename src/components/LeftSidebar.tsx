import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Filter, CheckCircle2, Layers, HelpCircle } from 'lucide-react';
import { docsRegistry } from '../data/docsRegistry';
import { DOMAINS } from '../data/framework';
import { useI18n } from '../context/I18nContext';
import { Level } from '../types';

const LEVELS: Level[] = ['Mid', 'Senior', 'Lead'];
const BAND_TO_LEVEL: Record<string, Level> = { M: 'Mid', S: 'Senior', L: 'Lead' };

interface LeftSidebarProps {
  activeDocId: string;
  onSelectDoc: (docId: string, anchor?: string) => void;
  onOpenInterview: (domainSlug: string) => void;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

/**
 * restructure-v2 (plan/restructure-v2.md §1, §3) — Domain → Level → article
 * tree, plus an "Interview Questions" row per domain. A band=X article (the
 * existing "principle-list" convention: one continuous file with internal
 * "## Mid" / "## Senior" / "## Lead" headings — see `docs/01-programming-fundamentals/`)
 * appears under every level its body actually reaches, deep-linking straight
 * to that section rather than opening a truncated page — level here is a tag
 * on continuous content, not a wall between separate pages.
 */
export const LeftSidebar: React.FC<LeftSidebarProps> = ({
  activeDocId,
  onSelectDoc,
  onOpenInterview,
  isOpenMobile = false,
  onCloseMobile
}) => {
  const { lang, t } = useI18n();
  const [filterText, setFilterText] = useState('');
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});

  const toggleCategory = (catId: string) => {
    setCollapsedCategories(prev => ({ ...prev, [catId]: !prev[catId] }));
  };

  const matchesFilter = (title: string, description: string, tags: string[]) => {
    if (!filterText.trim()) return true;
    const q = filterText.toLowerCase();
    return title.toLowerCase().includes(q) || description.toLowerCase().includes(q) || tags.some(tag => tag.toLowerCase().includes(q));
  };

  const selectAndClose = (docId: string, anchor?: string) => {
    onSelectDoc(docId, anchor);
    if (onCloseMobile) onCloseMobile();
  };

  const contentNode = (
    <aside className="w-full h-full flex flex-col bg-slate-50/50 dark:bg-[#0b0f19]/90 border-r border-slate-200/80 dark:border-slate-800/80 text-slate-800 dark:text-slate-200">
      {/* Sidebar Filter Input */}
      <div className="p-3.5 border-b border-slate-200/80 dark:border-slate-800/80">
        <div className="relative">
          <Filter className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={filterText}
            onChange={e => setFilterText(e.target.value)}
            placeholder="Filter documentation..."
            className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs focus:outline-none focus:border-cyan-500 dark:focus:border-cyan-500 text-slate-800 dark:text-slate-200 placeholder-slate-400"
          />
        </div>
      </div>

      {/* Domain -> Level -> article tree, band-ordered within each level */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6 scrollbar-thin">
        {DOMAINS.map(domain => {
          const domainDocs = docsRegistry
            .filter(d => d.domain === domain.slug)
            .filter(d => matchesFilter(lang === 'vi' ? d.title : d.titleEn, lang === 'vi' ? d.description : d.descriptionEn, d.tags));

          if (filterText.trim() && domainDocs.length === 0) return null;

          const isCollapsed = collapsedCategories[domain.slug];

          // For each level: a band=X doc (principle-list layout, e.g. domain 01)
          // qualifies via its internal levelSections; every other doc qualifies
          // by a direct band -> level match (a doc without a band defaults to Mid).
          type LevelItem = { doc: typeof domainDocs[number]; anchor: string | undefined };
          const docsForLevel = (level: Level): LevelItem[] =>
            domainDocs
              .map((doc): LevelItem | null => {
                if (doc.band === 'X') {
                  const section = doc.levelSections.find(s => s.level === level);
                  return section ? { doc, anchor: section.id } : null;
                }
                const docLevel = doc.band ? BAND_TO_LEVEL[doc.band] : 'Mid';
                return docLevel === level ? { doc, anchor: undefined } : null;
              })
              .filter((x): x is LevelItem => x !== null)
              .sort((a, b) => a.doc.sidebar_position - b.doc.sidebar_position);

          return (
            <div key={domain.slug} className="space-y-1">
              <button
                onClick={() => toggleCategory(domain.slug)}
                className="w-full flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-slate-200/50 dark:hover:bg-slate-800/50 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 transition"
              >
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-cyan-500" />
                  <span>{domain.name}</span>
                </div>
                {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {!isCollapsed && (
                <div className="mt-1 space-y-3 pl-2 border-l border-slate-200 dark:border-slate-800 ml-3">
                  {LEVELS.map(level => {
                    const items = docsForLevel(level);
                    if (items.length === 0) return null;
                    return (
                      <div key={level}>
                        <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-600">
                          {level}
                        </div>
                        <div className="space-y-0.5">
                          {items.map(({ doc, anchor }) => {
                            const isActive = doc.id === activeDocId;
                            return (
                              <button
                                key={`${doc.id}-${level}`}
                                onClick={() => selectAndClose(doc.id, anchor)}
                                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition flex items-center justify-between group ${
                                  isActive
                                    ? 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 font-semibold border-r-2 border-cyan-500'
                                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200'
                                }`}
                              >
                                <span className="truncate pr-2">
                                  {doc.band && doc.band !== 'X' && doc.platform && doc.platform !== 'shared' ? `${doc.platform} · ` : ''}
                                  {lang === 'vi' ? doc.title : doc.titleEn}
                                </span>
                                {isActive && <CheckCircle2 className="w-3.5 h-3.5 text-cyan-500 shrink-0" />}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}

                  {!filterText.trim() && (
                    <button
                      onClick={() => { onOpenInterview(domain.slug); if (onCloseMobile) onCloseMobile(); }}
                      className="w-full text-left px-3 py-2 rounded-lg text-xs font-semibold text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 transition flex items-center gap-1.5"
                    >
                      <HelpCircle className="w-3.5 h-3.5" />
                      <span>Interview Questions</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <div className="hidden lg:block w-72 shrink-0 h-[calc(100vh-4rem)] sticky top-16">
        {contentNode}
      </div>

      {/* Mobile Slide-Over Drawer */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
            onClick={onCloseMobile}
          />
          <div className="relative w-80 max-w-full bg-slate-50 dark:bg-[#0b0f19] h-full shadow-2xl flex flex-col z-10">
            {contentNode}
          </div>
        </div>
      )}
    </>
  );
};
