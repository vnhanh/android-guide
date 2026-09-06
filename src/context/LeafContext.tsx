import React, { createContext, useContext, useState } from 'react';
import { LanguageLeaf, PlatformLeaf } from '../types';
import { LANGUAGE_LEAVES, PLATFORM_LEAVES } from '../data/domainAxes';

interface LeafContextType {
  languageLeaf: LanguageLeaf;
  setLanguageLeaf: (leaf: LanguageLeaf) => void;
  platformLeaf: PlatformLeaf;
  setPlatformLeaf: (leaf: PlatformLeaf) => void;
}

const LeafContext = createContext<LeafContextType | undefined>(undefined);

/**
 * restructure-v2 (plan/restructure-v2.md §2) — "leaves are tabs, not dead
 * ends". Replaces `PlatformContext`: instead of one global Android/iOS/Shared
 * switch in the header, each leaf axis (language, platform) keeps its own
 * persisted preference, read wherever a domain declares that axis
 * (`src/data/domainAxes.ts`) and rendered as a tab bar on the content itself
 * — pick Kotlin once, every language-axis domain opens on Kotlin.
 */
export const LeafProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [languageLeaf, setLanguageLeafState] = useState<LanguageLeaf>(() => {
    const saved = localStorage.getItem('leaf.language') as LanguageLeaf | null;
    return saved && LANGUAGE_LEAVES.includes(saved) ? saved : 'Kotlin';
  });
  const [platformLeaf, setPlatformLeafState] = useState<PlatformLeaf>(() => {
    const saved = localStorage.getItem('leaf.platform') as PlatformLeaf | null;
    return saved && PLATFORM_LEAVES.includes(saved) ? saved : 'Android';
  });

  const setLanguageLeaf = (leaf: LanguageLeaf) => {
    localStorage.setItem('leaf.language', leaf);
    setLanguageLeafState(leaf);
  };
  const setPlatformLeaf = (leaf: PlatformLeaf) => {
    localStorage.setItem('leaf.platform', leaf);
    setPlatformLeafState(leaf);
  };

  return (
    <LeafContext.Provider value={{ languageLeaf, setLanguageLeaf, platformLeaf, setPlatformLeaf }}>
      {children}
    </LeafContext.Provider>
  );
};

export function useLeaf() {
  const ctx = useContext(LeafContext);
  if (!ctx) throw new Error('useLeaf must be used within a LeafProvider');
  return ctx;
}
