import React, { useEffect, useRef, useState } from 'react';
import { Play, Square, RotateCcw } from 'lucide-react';

/**
 * Domain 04 pilot demo (docs/04-concurrency-and-asynchrony/mid-android.md,
 * mid-ios.md). A static diagram cannot show *why* cancellation is cooperative
 * — you have to watch a loop keep running after "cancel" to feel it. This
 * simulates one work item every 120ms, standing in for a suspend point /
 * await boundary, and lets the viewer toggle whether that boundary checks
 * cancellation — the one line of difference between a screen that stops and
 * one that silently keeps working after the user has moved on.
 */

const TOTAL_TICKS = 40;
const TICK_MS = 120;

type Platform = 'kotlin' | 'swift';

const CODE: Record<Platform, { checks: string; noChecks: string }> = {
  kotlin: {
    checks: `for (i in 0 until 40) {\n    ensureActive() // throws if the Job was cancelled\n    process(i)\n}`,
    noChecks: `for (i in 0 until 40) {\n    process(i) // no suspension point, no check —\n}                // cancel() does nothing until this loop exits`,
  },
  swift: {
    checks: `for i in 0..<40 {\n    if Task.isCancelled { return } // must be read explicitly\n    process(i)\n}`,
    noChecks: `for i in 0..<40 {\n    process(i) // isCancelled is never read —\n}               // cancel() sets the flag, nothing reads it`,
  },
};

export const CooperativeCancellationDemo: React.FC = () => {
  const [platform, setPlatform] = useState<Platform>('kotlin');
  const [checksCancellation, setChecksCancellation] = useState(true);
  const [tick, setTick] = useState(0);
  const [running, setRunning] = useState(false);
  const [cancelledAt, setCancelledAt] = useState<number | null>(null);
  const cancelledRef = useRef(false);

  useEffect(() => {
    if (!running) return;
    if (tick >= TOTAL_TICKS) {
      setRunning(false);
      return;
    }
    if (cancelledRef.current && checksCancellation) {
      // The check happens at the next suspension point — the loop exits here.
      setRunning(false);
      return;
    }
    const timeout = setTimeout(() => setTick(t => t + 1), TICK_MS);
    return () => clearTimeout(timeout);
  }, [running, tick, checksCancellation]);

  const start = () => {
    setTick(0);
    setCancelledAt(null);
    cancelledRef.current = false;
    setRunning(true);
  };

  const cancel = () => {
    cancelledRef.current = true;
    setCancelledAt(tick);
  };

  const reset = () => {
    setRunning(false);
    setTick(0);
    setCancelledAt(null);
    cancelledRef.current = false;
  };

  const stoppedByCheck = cancelledAt !== null && checksCancellation && tick <= cancelledAt + 1 && !running && tick < TOTAL_TICKS;
  const ranPastCancellation = cancelledAt !== null && !checksCancellation;
  const progressPct = Math.round((tick / TOTAL_TICKS) * 100);

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Cooperative cancellation, live
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-xl">
            Start the simulated screen work, then tap Cancel — as if the user navigated away.
            Toggle whether the loop checks cancellation to see the two outcomes this domain's Mid
            articles are about.
          </p>
        </div>
        <div className="flex rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden text-xs font-semibold">
          {(['kotlin', 'swift'] as Platform[]).map(p => (
            <button
              key={p}
              onClick={() => setPlatform(p)}
              className={`px-3 py-1.5 transition ${
                platform === p
                  ? 'bg-cyan-500 text-white'
                  : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 hover:text-cyan-500'
              }`}
            >
              {p === 'kotlin' ? 'Kotlin' : 'Swift'}
            </button>
          ))}
        </div>
      </div>

      <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
            <input
              type="checkbox"
              checked={checksCancellation}
              onChange={e => setChecksCancellation(e.target.checked)}
              className="accent-cyan-500 w-4 h-4"
            />
            Loop checks cancellation at each step
          </label>
          <span className="text-xs font-mono text-slate-400">
            {tick} / {TOTAL_TICKS}
          </span>
        </div>

        <div className="h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden mb-4">
          <div
            className={`h-full transition-[width] duration-150 ${
              ranPastCancellation ? 'bg-rose-500' : 'bg-cyan-500'
            }`}
            style={{ width: `${progressPct}%` }}
          />
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={start}
            disabled={running}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500 text-white text-xs font-semibold disabled:opacity-40 hover:bg-cyan-600 transition"
          >
            <Play className="w-3.5 h-3.5" /> Start screen work
          </button>
          <button
            onClick={cancel}
            disabled={!running}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500 text-white text-xs font-semibold disabled:opacity-40 hover:bg-rose-600 transition"
          >
            <Square className="w-3.5 h-3.5" /> Cancel (screen dismissed)
          </button>
          <button
            onClick={reset}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold hover:border-cyan-500/50 transition"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reset
          </button>
        </div>

        {cancelledAt !== null && (
          <div
            className={`mb-4 p-3 rounded-lg text-xs leading-relaxed border-l-4 ${
              stoppedByCheck
                ? 'border-emerald-500 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200'
                : ranPastCancellation
                ? 'border-rose-500 bg-rose-500/10 text-rose-800 dark:text-rose-200'
                : 'border-slate-300 bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300'
            }`}
          >
            {stoppedByCheck && (
              <>Cancelled at step {cancelledAt}. The next check saw the flag and the loop exited — this is <code>ensureActive()</code> / <code>Task.checkCancellation()</code> doing its job.</>
            )}
            {ranPastCancellation && (
              <>Cancelled at step {cancelledAt}, but nothing ever checks the flag — the loop keeps running{tick < TOTAL_TICKS ? ' right now' : ` and only stopped because it reached step ${TOTAL_TICKS} on its own`}. On a real screen, this is work updating state nobody can see any more.</>
            )}
          </div>
        )}

        <pre className="rounded-lg bg-[#0d1117] text-slate-200 text-[11px] leading-relaxed p-3 overflow-x-auto font-mono">
          <code>{checksCancellation ? CODE[platform].checks : CODE[platform].noChecks}</code>
        </pre>
      </div>
    </div>
  );
};
