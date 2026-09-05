import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Smartphone, Building2, Sparkles, Filter, CheckCircle2 } from 'lucide-react';
import { categories, docsRegistry } from '../data/docsRegistry';
import { useI18n } from '../context/I18nContext';
import { DocItem } from '../types';

interface LeftSidebarProps {
  activeDocId: string;
  onSelectDoc: (docId: string) => void;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export const LeftSidebar: React.FC<LeftSidebarProps> = ({
  activeDocId,
  onSelectDoc,
  isOpenMobile = false,
  onCloseMobile
}) => {
  const { lang, t } = useI18n();
  const [filterText, setFilterText] = useState('');
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});

  const toggleCategory = (catId: string) => {
    setCollapsedCategories(prev => ({ ...prev, [catId]: !prev[catId] }));
  };

  const getCategoryIcon = (iconName: string) => {
    switch (iconName) {
      case 'Smartphone':
        return <Smartphone className="w-4 h-4 text-cyan-500" />;
      case 'Building2':
        return <Building2 className="w-4 h-4 text-indigo-500" />;
      case 'Sparkles':
        return <Sparkles className="w-4 h-4 text-emerald-500" />;
      default:
        return <Smartphone className="w-4 h-4 text-cyan-500" />;
    }
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

      {/* Categories & Docs Tree */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6 scrollbar-thin">
        {categories.map(cat => {
          const catDocs = docsRegistry
            .filter(d => d.category === cat.id)
            .filter(d => {
              if (!filterText.trim()) return true;
              const q = filterText.toLowerCase();
              return (
                d.title.toLowerCase().includes(q) ||
                d.description.toLowerCase().includes(q) ||
                d.tags.some(tag => tag.toLowerCase().includes(q))
              );
            })
            .sort((a, b) => a.sidebar_position - b.sidebar_position);

          if (filterText.trim() && catDocs.length === 0) return null;

          const isCollapsed = collapsedCategories[cat.id];

          return (
            <div key={cat.id} className="space-y-1">
              {/* Category Header Button */}
              <button
                onClick={() => toggleCategory(cat.id)}
                className="w-full flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-slate-200/50 dark:hover:bg-slate-800/50 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 transition"
              >
                <div className="flex items-center gap-2">
                  {getCategoryIcon(cat.iconName)}
                  <span>{lang === 'vi' ? cat.title : cat.titleEn}</span>
                </div>
                {isCollapsed ? (
                  <ChevronRight className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </button>

              {/* Docs List */}
              {!isCollapsed && (
                <div className="mt-1 space-y-0.5 pl-2 border-l border-slate-200 dark:border-slate-800 ml-3">
                  {catDocs.map(doc => {
                    const isActive = doc.id === activeDocId;
                    return (
                      <button
                        key={doc.id}
                        onClick={() => {
                          onSelectDoc(doc.id);
                          if (onCloseMobile) onCloseMobile();
                        }}
                        className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition flex items-center justify-between group ${
                          isActive
                            ? 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 font-semibold border-r-2 border-cyan-500'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200'
                        }`}
                      >
                        <span className="truncate pr-2">{lang === 'vi' ? doc.title : doc.titleEn}</span>
                        {isActive && <CheckCircle2 className="w-3.5 h-3.5 text-cyan-500 shrink-0" />}
                      </button>
                    );
                  })}
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
