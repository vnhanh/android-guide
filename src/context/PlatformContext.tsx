import React, { createContext, useContext, useState } from 'react';
import { Platform } from '../types';

interface PlatformContextType {
  platform: Platform;
  setPlatform: (platform: Platform) => void;
  cyclePlatform: () => void;
}

const PlatformContext = createContext<PlatformContextType | undefined>(undefined);

const ORDER: Platform[] = ['android', 'ios', 'shared'];

/**
 * Persists the reader's platform preference the same way I18nContext persists
 * language — localStorage-backed, read once on mount. Used by the matrix and
 * domain-stub views to pick which platform's band unit to show by default;
 * it is a preference, not a filter lock, so every view still lets the reader
 * see the other platform.
 */
export const PlatformProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [platform, setPlatformState] = useState<Platform>(() => {
    const saved = localStorage.getItem('platform') as Platform | null;
    return saved && ORDER.includes(saved) ? saved : 'android';
  });

  const setPlatform = (next: Platform) => {
    localStorage.setItem('platform', next);
    setPlatformState(next);
  };

  const cyclePlatform = () => {
    const idx = ORDER.indexOf(platform);
    setPlatform(ORDER[(idx + 1) % ORDER.length]);
  };

  return (
    <PlatformContext.Provider value={{ platform, setPlatform, cyclePlatform }}>
      {children}
    </PlatformContext.Provider>
  );
};

export const usePlatform = () => {
  const context = useContext(PlatformContext);
  if (!context) throw new Error('usePlatform must be used within PlatformProvider');
  return context;
};
