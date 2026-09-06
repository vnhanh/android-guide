import React, { useState, useEffect } from 'react';
import { Header, AppView } from './components/Header';
import { LinearDashboard } from './components/LinearDashboard';
import { DocViewer } from './components/DocViewer';
import { LeftSidebar } from './components/LeftSidebar';
import { RightSidebarTOC } from './components/RightSidebarTOC';
import { SearchModal } from './components/SearchModal';
import { FrameworkView } from './components/framework/FrameworkView';
import { MatrixView } from './components/framework/MatrixView';
import { LevelView } from './components/framework/LevelView';
import { DomainView } from './components/framework/DomainView';
import { AboutView } from './components/framework/AboutView';
import { DemoView } from './components/framework/DemoView';
import { docsRegistry } from './data/docsRegistry';
import { Level } from './types';

export const AppContent: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>('home');
  const [activeDocId, setActiveDocId] = useState<string>('communication-mid');
  const [activeLevel, setActiveLevel] = useState<Level>('Mid');
  const [activeDomainSlug, setActiveDomainSlug] = useState<string>('');
  const [activeDemoSlug, setActiveDemoSlug] = useState<string>('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Global Cmd+K / Ctrl+K keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const goTo = (view: AppView) => {
    setCurrentView(view);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectDoc = (docId: string) => {
    setActiveDocId(docId);
    goTo('doc');
  };

  const handleNavigateHome = () => goTo('home');
  const handleOpenFramework = () => goTo('framework');
  const handleOpenMatrix = () => goTo('matrix');
  const handleOpenAbout = () => goTo('about');
  const handleOpenLevel = (level: Level) => {
    setActiveLevel(level);
    goTo('level');
  };
  const handleOpenDomain = (slug: string) => {
    setActiveDomainSlug(slug);
    goTo('domain');
  };
  const handleOpenDemo = (slug: string) => {
    setActiveDemoSlug(slug);
    goTo('demo');
  };

  const activeDoc = docsRegistry.find(d => d.id === activeDocId) || docsRegistry[0];

  const renderView = () => {
    switch (currentView) {
      case 'framework':
        return <FrameworkView onSelectLevel={handleOpenLevel} onOpenMatrix={handleOpenMatrix} />;
      case 'matrix':
        return <MatrixView onOpenDomain={handleOpenDomain} />;
      case 'level':
        return <LevelView level={activeLevel} onOpenDomain={handleOpenDomain} />;
      case 'domain':
        return <DomainView slug={activeDomainSlug} onSelectDoc={handleSelectDoc} onBackToMatrix={handleOpenMatrix} />;
      case 'about':
        return <AboutView />;
      case 'demo':
        return <DemoView slug={activeDemoSlug} onBack={() => goTo('doc')} />;
      case 'doc':
        return (
          /* React.dev Doc-Centric Three-Column Layout */
          <div className="flex-1 max-w-7xl w-full mx-auto flex items-start">
            <LeftSidebar
              activeDocId={activeDocId}
              onSelectDoc={handleSelectDoc}
              isOpenMobile={isMobileSidebarOpen}
              onCloseMobile={() => setIsMobileSidebarOpen(false)}
            />

            <DocViewer
              doc={activeDoc}
              onSelectDoc={handleSelectDoc}
              onNavigateHome={handleNavigateHome}
              onOpenDemo={handleOpenDemo}
            />

            <RightSidebarTOC toc={activeDoc.toc} />
          </div>
        );
      case 'home':
      default:
        return (
          <LinearDashboard
            onSelectDoc={handleSelectDoc}
            onOpenSearch={() => setIsSearchOpen(true)}
            onOpenFramework={handleOpenFramework}
            onOpenMatrix={handleOpenMatrix}
            onOpenLevel={handleOpenLevel}
            onOpenDomain={handleOpenDomain}
          />
        );
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#0b0f19] text-slate-900 dark:text-slate-100 transition-colors">
      <Header
        currentView={currentView}
        activeLevel={activeLevel}
        onNavigateHome={handleNavigateHome}
        onOpenSearch={() => setIsSearchOpen(true)}
        onToggleMobileSidebar={() => setIsMobileSidebarOpen(prev => !prev)}
        isMobileSidebarOpen={isMobileSidebarOpen}
        onOpenFramework={handleOpenFramework}
        onOpenMatrix={handleOpenMatrix}
        onOpenLevel={handleOpenLevel}
        onOpenAbout={handleOpenAbout}
      />

      {renderView()}

      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectDoc={handleSelectDoc}
      />
    </div>
  );
};
