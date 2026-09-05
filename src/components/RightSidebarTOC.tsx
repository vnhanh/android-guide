import React, { useEffect, useState } from 'react';
import { List, ChevronRight } from 'lucide-react';
import { TocItem } from '../types';
import { useI18n } from '../context/I18nContext';

interface RightSidebarTOCProps {
  toc: TocItem[];
}

export const RightSidebarTOC: React.FC<RightSidebarTOCProps> = ({ toc }) => {
  const { t } = useI18n();
  const [activeId, setActiveId] = useState<string>('');

  useEffect(() => {
    if (!toc || toc.length === 0) return;

    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        });
      },
      { rootMargin: '-80px 0px -60% 0px' }
    );

    toc.forEach(item => {
      const el = document.getElementById(item.id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [toc]);

  const scrollToHeading = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      const yOffset = -80; // Account for sticky header
      const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  if (!toc || toc.length === 0) return null;

  return (
    <aside className="hidden xl:block w-64 shrink-0 h-[calc(100vh-4rem)] sticky top-16 border-l border-slate-200/80 dark:border-slate-800/80 p-5 overflow-y-auto">
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4">
        <List className="w-4 h-4 text-cyan-500" />
        <span>{t('doc.onThisPage')}</span>
      </div>

      <nav className="space-y-1.5 text-xs">
        {toc.map(item => {
          const isActive = item.id === activeId;
          return (
            <button
              key={item.id}
              onClick={() => scrollToHeading(item.id)}
              className={`w-full text-left py-1 text-xs transition flex items-start gap-1.5 ${
                item.level === 3 ? 'pl-3' : ''
              } ${
                isActive
                  ? 'text-cyan-600 dark:text-cyan-400 font-semibold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {isActive && <ChevronRight className="w-3.5 h-3.5 shrink-0 text-cyan-500 mt-0.5" />}
              <span className="line-clamp-2">{item.title}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
};
