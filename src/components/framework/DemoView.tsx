import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { DEMOS } from '../../demos';

interface DemoViewProps {
  slug: string;
  onBack: () => void;
}

export const DemoView: React.FC<DemoViewProps> = ({ slug, onBack }) => {
  const Demo = DEMOS[slug];

  return (
    <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-8 py-10">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-cyan-500 transition mb-6"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Back to article</span>
      </button>

      {Demo ? (
        <Demo />
      ) : (
        <p className="text-sm text-slate-500 dark:text-slate-400">Unknown demo "{slug}".</p>
      )}
    </main>
  );
};
