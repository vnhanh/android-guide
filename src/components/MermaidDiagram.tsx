import React, { useEffect, useRef, useState } from 'react';
import { useTheme } from '../context/ThemeContext';

let idCounter = 0;

/**
 * Renders a ```mermaid fenced block as an actual diagram. Previously these
 * fell through DocViewer's generic code-block renderer and showed as raw
 * Mermaid source text — none of the 5 pre-existing diagrams ever rendered as
 * diagrams. Fixed here because domain 04's pilot articles are the first to
 * lean on Mermaid as the "Figure" demonstration asset
 * (.agents/rules/demonstration_assets.md) and a figure that renders as text
 * is not a figure.
 */
export const MermaidDiagram: React.FC<{ chart: string }> = ({ chart }) => {
  const { isDark } = useTheme();
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string>('');
  const idRef = useRef(`mermaid-diagram-${idCounter++}`);

  useEffect(() => {
    let cancelled = false;

    // Dynamically imported so the (large) mermaid bundle only loads for
    // articles that actually embed a diagram, instead of bloating every
    // page's main chunk.
    import('mermaid').then(({ default: mermaid }) => {
      if (cancelled) return;
      mermaid.initialize({
        startOnLoad: false,
        theme: isDark ? 'dark' : 'default',
        securityLevel: 'strict',
      });

      mermaid
        .render(idRef.current, chart)
        .then(({ svg: rendered }) => {
          if (!cancelled) {
            setSvg(rendered);
            setError('');
          }
        })
        .catch(err => {
          if (!cancelled) setError(err instanceof Error ? err.message : String(err));
        });
    });

    return () => {
      cancelled = true;
    };
  }, [chart, isDark]);

  if (error) {
    return (
      <div className="my-6 p-4 rounded-xl border border-rose-500/30 bg-rose-500/5 text-xs text-rose-700 dark:text-rose-300">
        Diagram failed to render: {error}
      </div>
    );
  }

  return (
    <div
      className="my-6 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-x-auto flex justify-center"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
};
