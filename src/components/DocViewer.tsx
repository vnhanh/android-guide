import React, { useState } from 'react';
import { Copy, Check, ChevronLeft, ChevronRight, BookOpen, Clock, Tag, Award, AlertCircle, Info, Lightbulb, AlertTriangle, ShieldAlert, Languages } from 'lucide-react';
import { DocItem } from '../types';
import { docsRegistry } from '../data/docsRegistry';
import { useI18n } from '../context/I18nContext';

interface DocViewerProps {
  doc: DocItem;
  onSelectDoc: (docId: string) => void;
  onNavigateHome: () => void;
}

export const DocViewer: React.FC<DocViewerProps> = ({ doc, onSelectDoc, onNavigateHome }) => {
  const { lang, t } = useI18n();
  const [copiedCodeIndex, setCopiedCodeIndex] = useState<number | null>(null);

  const handleCopyCode = (codeText: string, index: number) => {
    navigator.clipboard.writeText(codeText);
    setCopiedCodeIndex(index);
    setTimeout(() => setCopiedCodeIndex(null), 2000);
  };

  // Find previous and next articles in the same category or overall registry
  const sortedDocs = [...docsRegistry].sort((a, b) => {
    if (a.category !== b.category) return a.category.localeCompare(b.category);
    return a.sidebar_position - b.sidebar_position;
  });

  const currentIndex = sortedDocs.findIndex(d => d.id === doc.id);
  const prevDoc = currentIndex > 0 ? sortedDocs[currentIndex - 1] : null;
  const nextDoc = currentIndex < sortedDocs.length - 1 ? sortedDocs[currentIndex + 1] : null;

  // Custom parser to format GFM Callouts and Code Blocks nicely
  const renderFormattedMarkdown = (markdownText: string) => {
    const lines = markdownText.trim().split('\n');
    const elements: React.ReactNode[] = [];

    let inCodeBlock = false;
    let codeLanguage = '';
    let codeLines: string[] = [];
    let codeBlockCount = 0;

    let inTable = false;
    let tableRows: string[][] = [];

    const flushTable = (keyIndex: number) => {
      if (tableRows.length === 0) return;
      const headers = tableRows[0];
      const body = tableRows.slice(2); // Skip separator row

      elements.push(
        <div key={`table-${keyIndex}`} className="my-6 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 font-bold">
                {headers.map((h, i) => (
                  <th key={i} className="p-3 border-r border-slate-200 dark:border-slate-800 last:border-r-0">
                    {h.trim()}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {body.map((row, rIdx) => (
                <tr key={rIdx} className="border-b border-slate-200/60 dark:border-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition">
                  {row.map((cell, cIdx) => (
                    <td key={cIdx} className="p-3 border-r border-slate-200/60 dark:border-slate-800/60 last:border-r-0 text-slate-700 dark:text-slate-300">
                      {cell.trim()}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      tableRows = [];
      inTable = false;
    };

    lines.forEach((line, idx) => {
      // Handle code block toggle
      if (line.startsWith('```')) {
        if (inCodeBlock) {
          // Flush code block
          const codeText = codeLines.join('\n');
          const blockIdx = codeBlockCount++;
          elements.push(
            <div key={`code-${idx}`} className="my-6 rounded-xl overflow-hidden border border-slate-800 bg-[#0d1117] shadow-xl text-xs font-mono">
              <div className="flex items-center justify-between px-4 py-2 bg-[#161b22] border-b border-slate-800/80 text-slate-400">
                <span className="font-semibold uppercase tracking-wider text-[11px] text-cyan-400">
                  {codeLanguage || 'CODE'}
                </span>
                <button
                  onClick={() => handleCopyCode(codeText, blockIdx)}
                  className="flex items-center gap-1.5 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] transition"
                >
                  {copiedCodeIndex === blockIdx ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">{t('doc.copied')}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>{t('doc.copyCode')}</span>
                    </>
                  )}
                </button>
              </div>
              <pre className="p-4 overflow-x-auto text-slate-200 leading-relaxed font-mono">
                <code>{codeText}</code>
              </pre>
            </div>
          );
          codeLines = [];
          inCodeBlock = false;
          codeLanguage = '';
        } else {
          inCodeBlock = true;
          codeLanguage = line.replace('```', '').trim();
        }
        return;
      }

      if (inCodeBlock) {
        codeLines.push(line);
        return;
      }

      // Handle Markdown Tables
      if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
        inTable = true;
        const cells = line.trim().slice(1, -1).split('|');
        tableRows.push(cells);
        return;
      } else if (inTable) {
        flushTable(idx);
      }

      // GFM Callout Blocks (> [!NOTE], > [!TIP], > [!IMPORTANT], > [!WARNING])
      if (line.startsWith('> [!')) {
        const calloutType = line.match(/> \[!(NOTE|TIP|IMPORTANT|WARNING)\]/i)?.[1]?.toUpperCase();
        let borderClass = 'border-blue-500 bg-blue-500/10 text-blue-900 dark:text-blue-200';
        let icon = <Info className="w-4 h-4 text-blue-500 shrink-0" />;

        if (calloutType === 'TIP') {
          borderClass = 'border-emerald-500 bg-emerald-500/10 text-emerald-900 dark:text-emerald-200';
          icon = <Lightbulb className="w-4 h-4 text-emerald-500 shrink-0" />;
        } else if (calloutType === 'IMPORTANT') {
          borderClass = 'border-amber-500 bg-amber-500/10 text-amber-900 dark:text-amber-200';
          icon = <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />;
        } else if (calloutType === 'WARNING') {
          borderClass = 'border-rose-500 bg-rose-500/10 text-rose-900 dark:text-rose-200';
          icon = <ShieldAlert className="w-4 h-4 text-rose-500 shrink-0" />;
        }

        elements.push(
          <div key={`callout-${idx}`} className={`my-4 p-4 rounded-xl border-l-4 ${borderClass} shadow-sm text-xs sm:text-sm flex items-start gap-3`}>
            {icon}
            <div className="font-medium leading-relaxed">{calloutType}</div>
          </div>
        );
        return;
      }

      // Headings
      if (line.startsWith('# ')) {
        const text = line.replace('# ', '').trim();
        elements.push(
          <h1 key={`h1-${idx}`} className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight mt-6 mb-4">
            {text}
          </h1>
        );
      } else if (line.startsWith('## ')) {
        const text = line.replace('## ', '').trim();
        const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        elements.push(
          <h2 id={id} key={`h2-${idx}`} className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight mt-10 mb-4 pb-2 border-b border-slate-200 dark:border-slate-800">
            {text}
          </h2>
        );
      } else if (line.startsWith('### ')) {
        const text = line.replace('### ', '').trim();
        const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        elements.push(
          <h3 id={id} key={`h3-${idx}`} className="text-lg font-bold text-slate-800 dark:text-slate-100 mt-6 mb-3">
            {text}
          </h3>
        );
      } else if (line.startsWith('- ') || line.startsWith('* ')) {
        elements.push(
          <li key={`li-${idx}`} className="ml-5 list-disc text-sm text-slate-700 dark:text-slate-300 my-1 leading-relaxed">
            {line.substring(2)}
          </li>
        );
      } else if (line.trim() !== '') {
        elements.push(
          <p key={`p-${idx}`} className="text-sm sm:text-base text-slate-700 dark:text-slate-300 my-3 leading-relaxed">
            {line}
          </p>
        );
      }
    });

    return elements;
  };

  // Phase 0.5: fall back on empty-after-trim, not on falsy — a whitespace-only
  // string is truthy and used to render as a silent blank page (finding 05).
  // When the active language genuinely has no content, say so honestly rather
  // than quietly substituting the other language's prose.
  const activeContent = lang === 'vi' ? doc.content : doc.contentEn;
  const isTranslated = activeContent.trim().length > 0;
  const contentText = isTranslated ? activeContent : '';

  return (
    <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-8 py-8 lg:py-12 min-w-0">
      {/* Breadcrumb Navigation Header */}
      <nav className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-6">
        <button onClick={onNavigateHome} className="hover:text-cyan-500 transition">
          {t('nav.home')}
        </button>
        <span>/</span>
        <span className="font-semibold text-slate-700 dark:text-slate-300">{doc.categoryTitle}</span>
        <span>/</span>
        <span className="truncate text-slate-400">{doc.title}</span>
      </nav>

      {/* Doc Title & Metadata Header */}
      <header className="mb-8 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div className="flex flex-wrap items-center gap-2.5 mb-3">
          <span className="px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 font-mono text-xs font-semibold border border-cyan-500/20">
            {doc.categoryTitle}
          </span>
          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
            doc.level === 'Lead'
              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
              : doc.level === 'Senior'
              ? 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20'
              : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
          }`}>
            Level: {doc.level}
          </span>
          <span className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 font-mono">
            <Clock className="w-3.5 h-3.5" />
            {doc.readingTime}
          </span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          {lang === 'vi' ? doc.title : doc.titleEn}
        </h1>

        <p className="mt-3 text-base text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
          {lang === 'vi' ? doc.description : doc.descriptionEn}
        </p>

        {/* Tags */}
        <div className="mt-4 flex flex-wrap gap-1.5">
          {doc.tags.map(tag => (
            <span key={tag} className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[11px] font-mono">
              #{tag}
            </span>
          ))}
        </div>
      </header>

      {/* Main Formatted Article Content */}
      {isTranslated ? (
        <article className="prose dark:prose-invert max-w-none">
          {renderFormattedMarkdown(contentText)}
        </article>
      ) : (
        <div className="my-6 p-6 rounded-xl border-l-4 border-amber-500 bg-amber-500/10 text-amber-900 dark:text-amber-200 flex items-start gap-3">
          <Languages className="w-5 h-5 shrink-0 mt-0.5 text-amber-500" />
          <div className="text-sm leading-relaxed">
            <p className="font-semibold mb-1">
              {lang === 'vi' ? 'Chưa có bản dịch tiếng Việt' : 'Not translated yet'}
            </p>
            <p className="text-amber-800/90 dark:text-amber-200/80">
              {lang === 'vi'
                ? 'Bài viết này hiện chỉ có ở tiếng Anh. Hãy chuyển ngôn ngữ để đọc nội dung đầy đủ.'
                : 'This article currently only exists in another language slot. Switch the language toggle to read it, or check back once the translation pass (Phase 6) lands.'}
            </p>
          </div>
        </div>
      )}

      {/* Previous / Next Article Navigation Footer */}
      <footer className="mt-14 pt-8 border-t border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-4">
        {prevDoc ? (
          <button
            onClick={() => onSelectDoc(prevDoc.id)}
            className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-cyan-500/50 dark:hover:border-cyan-500/50 text-left transition group"
          >
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
              <ChevronLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
              <span>{t('doc.prev')}</span>
            </div>
            <div className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-cyan-500 transition-colors line-clamp-1">
              {lang === 'vi' ? prevDoc.title : prevDoc.titleEn}
            </div>
          </button>
        ) : <div />}

        {nextDoc ? (
          <button
            onClick={() => onSelectDoc(nextDoc.id)}
            className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-cyan-500/50 dark:hover:border-cyan-500/50 text-right transition group"
          >
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-end gap-1">
              <span>{t('doc.next')}</span>
              <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
            <div className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-cyan-500 transition-colors line-clamp-1">
              {lang === 'vi' ? nextDoc.title : nextDoc.titleEn}
            </div>
          </button>
        ) : <div />}
      </footer>
    </main>
  );
};
