import React from 'react';
import { Search, Moon, Sun, Globe, Menu, X, Layers, Sparkles, Github, Smartphone, Apple, Blend } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useI18n } from '../context/I18nContext';
import { usePlatform } from '../context/PlatformContext';

export type AppView = 'home' | 'doc' | 'framework' | 'matrix' | 'level' | 'domain' | 'about';

interface HeaderProps {
  currentView: AppView;
  activeLevel?: 'Mid' | 'Senior' | 'Lead';
  onNavigateHome: () => void;
  onOpenSearch: () => void;
  onToggleMobileSidebar?: () => void;
  isMobileSidebarOpen?: boolean;
  onOpenFramework: () => void;
  onOpenMatrix: () => void;
  onOpenLevel: (level: 'Mid' | 'Senior' | 'Lead') => void;
  onOpenAbout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  activeLevel,
  onNavigateHome,
  onOpenSearch,
  onToggleMobileSidebar,
  isMobileSidebarOpen = false,
  onOpenFramework,
  onOpenMatrix,
  onOpenLevel,
  onOpenAbout,
}) => {
  const { isDark, toggleTheme } = useTheme();
  const { lang, toggleLang, t } = useI18n();
  const { platform, cyclePlatform } = usePlatform();

  const platformIcon =
    platform === 'android' ? <Smartphone className="w-3.5 h-3.5" /> :
    platform === 'ios' ? <Apple className="w-3.5 h-3.5" /> :
    <Blend className="w-3.5 h-3.5" />;

  const navItemClass = (active: boolean) =>
    `px-2.5 py-1 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
      active
        ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
    }`;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-[#0b0f19]/80 backdrop-blur-md transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Left branding */}
        <div className="flex items-center gap-3">
          {currentView === 'doc' && onToggleMobileSidebar && (
            <button
              onClick={onToggleMobileSidebar}
              className="lg:hidden p-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              aria-label="Toggle Navigation"
            >
              {isMobileSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          )}

          <button
            onClick={onNavigateHome}
            className="flex items-center gap-2.5 group text-left focus:outline-none"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-md shadow-cyan-500/20 group-hover:scale-105 transition-transform">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-base tracking-tight text-slate-900 dark:text-white group-hover:text-cyan-500 dark:group-hover:text-cyan-400 transition-colors flex items-center gap-1.5">
                <span>Mobile Tech Lead</span>
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                  Guide
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block">
                Mid → Senior → Tech Lead roadmap
              </p>
            </div>
          </button>
        </div>

        {/* Middle: primary nav (level -> domain -> article) */}
        <nav className="flex-1 hidden lg:flex items-center justify-center gap-1">
          <button onClick={onOpenFramework} className={navItemClass(currentView === 'framework')}>Framework</button>
          <button onClick={onOpenMatrix} className={navItemClass(currentView === 'matrix' || currentView === 'domain')}>Matrix</button>
          <button onClick={() => onOpenLevel('Mid')} className={navItemClass(currentView === 'level' && activeLevel === 'Mid')}>Mid</button>
          <button onClick={() => onOpenLevel('Senior')} className={navItemClass(currentView === 'level' && activeLevel === 'Senior')}>Senior</button>
          <button onClick={() => onOpenLevel('Lead')} className={navItemClass(currentView === 'level' && activeLevel === 'Lead')}>Lead</button>
          <button onClick={onOpenAbout} className={navItemClass(currentView === 'about')}>About</button>
        </nav>

        {/* Right actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={onOpenSearch}
            className="p-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            aria-label="Search"
            title={t('nav.search')}
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Legacy home / browse link */}
          <button
            onClick={onNavigateHome}
            className={`hidden sm:flex px-3 py-1.5 rounded-lg text-xs font-semibold transition items-center gap-1.5 ${
              currentView === 'home' || currentView === 'doc'
                ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>{t('nav.home')}</span>
          </button>

          {/* Platform switch — persists like the language toggle */}
          <button
            onClick={cyclePlatform}
            className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-mono font-medium flex items-center gap-1.5 transition"
            title="Switch platform (Android / iOS / Shared)"
          >
            <span className="text-cyan-500">{platformIcon}</span>
            <span className="capitalize hidden sm:inline">{platform}</span>
          </button>

          {/* Language Toggle */}
          <button
            onClick={toggleLang}
            className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-mono font-medium flex items-center gap-1.5 transition"
            title="Switch Language"
          >
            <Globe className="w-3.5 h-3.5 text-cyan-500" />
            <span className="uppercase">{lang}</span>
          </button>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            title="Toggle Dark/Light Mode"
          >
            {isDark ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-slate-600" />
            )}
          </button>

          {/* Github Link */}
          <a
            href="https://github.com"
            target="_blank"
            rel="noreferrer"
            className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition hidden sm:flex"
            title="GitHub Repository"
          >
            <Github className="w-4 h-4" />
          </a>
        </div>
      </div>

      {/* Secondary nav row — mobile / narrow layouts */}
      <div className="lg:hidden flex items-center gap-1 px-4 pb-2 overflow-x-auto">
        <button onClick={onOpenFramework} className={navItemClass(currentView === 'framework')}>Framework</button>
        <button onClick={onOpenMatrix} className={navItemClass(currentView === 'matrix' || currentView === 'domain')}>Matrix</button>
        <button onClick={() => onOpenLevel('Mid')} className={navItemClass(currentView === 'level' && activeLevel === 'Mid')}>Mid</button>
        <button onClick={() => onOpenLevel('Senior')} className={navItemClass(currentView === 'level' && activeLevel === 'Senior')}>Senior</button>
        <button onClick={() => onOpenLevel('Lead')} className={navItemClass(currentView === 'level' && activeLevel === 'Lead')}>Lead</button>
        <button onClick={onOpenAbout} className={navItemClass(currentView === 'about')}>About</button>
      </div>
    </header>
  );
};
