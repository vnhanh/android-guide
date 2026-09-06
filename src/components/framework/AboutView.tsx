import React from 'react';
import { User } from 'lucide-react';

/**
 * Phase 1.7 — the author-profile introduction moved out of
 * `docs/01-android/01-senior-metrics-and-qa.md` (it used to be that article's
 * opening section — gap-analysis.md finding 11: "a personal CV is the first
 * article"). The Q&A case studies that used to share that article's page have
 * since all been re-filed onto the new taxonomy (domains 07, 09, 14, 17), and
 * the source file itself is now fully consumed and deleted.
 */
export const AboutView: React.FC = () => {
  return (
    <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-8 py-10 lg:py-14">
      <header className="mb-8 flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-md">
          <User className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">About</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Author profile</p>
        </div>
      </header>

      <article className="prose dark:prose-invert max-w-none text-sm sm:text-base leading-relaxed">
        <p>
          Hi everyone, my name is <strong>Hanh</strong>. I am a <strong>Senior Android Developer &amp; Mobile Architect</strong> with
          over 7 years of experience building scalable, high-performance mobile applications using <strong>Kotlin</strong> and <strong>Jetpack Compose</strong>.
        </p>

        <h2 className="text-lg font-bold mt-6 mb-2">Technical specialization &amp; core capabilities</h2>
        <ul className="list-disc ml-5 space-y-1.5 text-slate-700 dark:text-slate-300">
          <li><strong>Architecture</strong>: Clean Architecture, Multi-Module Layouts, Unidirectional Data Flow (UDF/MVI), Hilt Dependency Injection.</li>
          <li><strong>Asynchronous Execution</strong>: Coroutines, Structured Concurrency, Kotlin Flow, Reactive State Management.</li>
          <li><strong>Stability &amp; Performance</strong>: Firebase Crashlytics, Android Vitals (&gt;99.75% crash-free rate), Android Profiler, LeakCanary, JankStats, Macrobenchmark, Perfetto, Firebase Performance. Achieved up to 12%-15% app startup speed improvement.</li>
          <li><strong>Cross-Platform Experience</strong>: Hands-on proficiency with Flutter (Dart) and React Native (TypeScript), currently expanding into iOS with Swift 6.</li>
        </ul>

        <div className="mt-8 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-xs text-slate-500 dark:text-slate-400 not-prose">
          The interview Q&amp;A case studies that used to share this article's page have all been
          re-filed onto the matrix — reachable under Track A / C / D domains{' '}
          <span className="font-mono">07</span>, <span className="font-mono">09</span>,{' '}
          <span className="font-mono">14</span> and <span className="font-mono">17</span>.
        </div>
      </article>
    </main>
  );
};
