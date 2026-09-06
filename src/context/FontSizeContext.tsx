import React, { createContext, useContext, useEffect, useState } from 'react';

export type FontScale = 'sm' | 'base' | 'lg' | 'xl';

const ORDER: FontScale[] = ['sm', 'base', 'lg', 'xl'];
const PX: Record<FontScale, string> = { sm: '14px', base: '16px', lg: '18px', xl: '20px' };
const LABEL: Record<FontScale, string> = { sm: 'S', base: 'M', lg: 'L', xl: 'XL' };

interface FontSizeContextType {
  scale: FontScale;
  label: string;
  increase: () => void;
  decrease: () => void;
  canIncrease: boolean;
  canDecrease: boolean;
}

const FontSizeContext = createContext<FontSizeContextType | undefined>(undefined);

/**
 * Persists a reader's font-size preference the same way PlatformContext persists
 * platform — localStorage-backed, applied by setting the root element's font-size
 * so Tailwind's rem-based text utilities scale proportionally site-wide (the same
 * mental model as browser zoom, not a per-component override).
 */
export const FontSizeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [scale, setScaleState] = useState<FontScale>(() => {
    const saved = localStorage.getItem('fontScale') as FontScale | null;
    return saved && ORDER.includes(saved) ? saved : 'base';
  });

  useEffect(() => {
    document.documentElement.style.fontSize = PX[scale];
    localStorage.setItem('fontScale', scale);
  }, [scale]);

  // Functional updates — reads the true latest state rather than the `scale`
  // captured at render time, so two rapid clicks (before a re-render lands)
  // both actually take effect instead of computing the same "next" value twice.
  const increase = () =>
    setScaleState(prev => {
      const i = ORDER.indexOf(prev);
      return i < ORDER.length - 1 ? ORDER[i + 1] : prev;
    });
  const decrease = () =>
    setScaleState(prev => {
      const i = ORDER.indexOf(prev);
      return i > 0 ? ORDER[i - 1] : prev;
    });

  const idx = ORDER.indexOf(scale);

  return (
    <FontSizeContext.Provider
      value={{
        scale,
        label: LABEL[scale],
        increase,
        decrease,
        canIncrease: idx < ORDER.length - 1,
        canDecrease: idx > 0,
      }}
    >
      {children}
    </FontSizeContext.Provider>
  );
};

export const useFontSize = () => {
  const context = useContext(FontSizeContext);
  if (!context) throw new Error('useFontSize must be used within FontSizeProvider');
  return context;
};
