import React, { useEffect, useState, useRef } from 'react';
import { Search, X, ArrowRight, Tag, BookOpen } from 'lucide-react';
import { docsRegistry } from '../data/docsRegistry';
import { useI18n } from '../context/I18nContext';
import { DocItem, Level } from '../types';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectDoc: (docId: string) => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({ isOpen, onClose, onSelectDoc }) => {
  const { lang, t } = useI18n();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  const filteredDocs = docsRegistry.filter(doc => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      doc.title.toLowerCase().includes(q) ||
      doc.description.toLowerCase().includes(q) ||
      doc.content.toLowerCase().includes(q) ||
      doc.contentEn.toLowerCase().includes(q) ||
      doc.tags.some(tag => tag.toLowerCase().includes(q))
    );
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % Math.max(1, filteredDocs.length));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + filteredDocs.length) % Math.max(1, filteredDocs.length));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredDocs[selectedIndex]) {
          onSelectDoc(filteredDocs[selectedIndex].id);
          onClose();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredDocs, selectedIndex, onSelectDoc, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden z-10 flex flex-col max-h-[80vh]">
        {/* Search Header Input */}
        <div className="p-4 border-b border-slate-200/80 dark:border-slate-800/80 flex items-center gap-3">
          <Search className="w-5 h-5 text-cyan-500 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder={t('hero.searchPlaceholder')}
            className="flex-1 bg-transparent text-slate-900 dark:text-white placeholder-slate-400 text-sm focus:outline-none"
          />
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filteredDocs.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">
              {t('search.noResults')}
            </div>
          ) : (
            filteredDocs.map((doc, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <button
                  key={doc.id}
                  onClick={() => {
                    onSelectDoc(doc.id);
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`w-full text-left p-3 rounded-xl transition flex items-center justify-between group ${
                    isSelected
                      ? 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30'
                      : 'text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex-1 min-w-0 pr-4">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-200/60 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                        {doc.categoryTitle}
                      </span>
                      <span className="text-[10px] font-semibold text-slate-400">
                        {doc.level}
                      </span>
                    </div>
                    <div className="font-bold text-sm truncate">
                      {lang === 'vi' ? doc.title : doc.titleEn}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                      {lang === 'vi' ? doc.description : doc.descriptionEn}
                    </p>
                  </div>
                  <ArrowRight className={`w-4 h-4 shrink-0 transition-transform ${
                    isSelected ? 'translate-x-0.5 text-cyan-500' : 'text-slate-400 opacity-0 group-hover:opacity-100'
                  }`} />
                </button>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div className="px-4 py-2.5 border-t border-slate-200/80 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50 text-[11px] text-slate-400 flex items-center justify-between">
          <span>{t('search.hint')}</span>
          <span className="font-mono">{filteredDocs.length} matches</span>
        </div>
      </div>
    </div>
  );
};
