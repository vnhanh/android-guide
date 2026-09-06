import React from 'react';
import { Copy, Check } from 'lucide-react';

export interface ComparisonTabItem {
  label?: string;
  lang: string;
  code: string;
}

interface ComparisonTabsProps {
  items: ComparisonTabItem[];
  renderInline: (text: string, keyBase: string) => React.ReactNode;
  preferredLang: string | null;
  onSelectLang: (lang: string) => void;
  copiedCodeIndex: number | null;
  onCopyCode: (codeText: string, index: number) => void;
  baseCodeIndex: number;
  copyLabel: string;
  copiedLabel: string;
}

/**
 * Renders a run of consecutive per-language/per-platform code blocks (detected by
 * groupComparisonBlocks in DocViewer.tsx) as an interactive tab switcher instead of
 * a stack of blocks. preferredLang is lifted to the DocViewer so picking a language
 * in one comparison group switches every other group on the same article that has
 * a matching tab.
 */
export const ComparisonTabs: React.FC<ComparisonTabsProps> = ({
  items,
  renderInline,
  preferredLang,
  onSelectLang,
  copiedCodeIndex,
  onCopyCode,
  baseCodeIndex,
  copyLabel,
  copiedLabel,
}) => {
  const matchIndex = items.findIndex(item => item.lang.toLowerCase() === preferredLang);
  const [localIndex, setLocalIndex] = React.useState(0);
  const activeIndex = matchIndex >= 0 ? matchIndex : localIndex;
  const active = items[activeIndex];
  const codeIndex = baseCodeIndex + activeIndex;

  return (
    <div className="my-6 rounded-xl overflow-hidden border border-slate-800 bg-[#0d1117] shadow-xl text-xs font-mono">
      <div className="flex items-center justify-between border-b border-slate-800/80 bg-[#161b22]">
        <div className="flex items-center overflow-x-auto scrollbar-thin">
          {items.map((item, i) => (
            <button
              key={item.lang}
              onClick={() => {
                setLocalIndex(i);
                onSelectLang(item.lang.toLowerCase());
              }}
              className={`px-4 py-2 font-semibold uppercase tracking-wider text-[11px] whitespace-nowrap transition border-b-2 ${
                i === activeIndex
                  ? 'text-cyan-400 border-cyan-400'
                  : 'text-slate-400 border-transparent hover:text-slate-200'
              }`}
            >
              {item.lang || 'CODE'}
            </button>
          ))}
        </div>
        <button
          onClick={() => onCopyCode(active.code, codeIndex)}
          className="flex items-center gap-1.5 px-2 py-1 mr-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] transition shrink-0"
        >
          {copiedCodeIndex === codeIndex ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400">{copiedLabel}</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>{copyLabel}</span>
            </>
          )}
        </button>
      </div>
      {active.label && (
        <div className="px-4 pt-3 text-slate-300 text-[13px] leading-relaxed font-sans">
          {renderInline(active.label, `tab-label-${activeIndex}`)}
        </div>
      )}
      <pre className="p-4 overflow-x-auto text-slate-200 leading-relaxed font-mono">
        <code>{active.code}</code>
      </pre>
    </div>
  );
};
