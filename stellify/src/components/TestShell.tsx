'use client';
import Link from 'next/link';
import { createPortal } from 'react-dom';
import { Lock, Maximize, MonitorOff, ShieldCheck } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useStore } from '@/lib/store';
import { cn } from './ui';

type WakeLock = { release: () => Promise<void> };
const nav = () => navigator as Navigator & { keyboard?: { lock?: (keys: string[]) => Promise<void>; unlock?: () => void }; wakeLock?: { request: (t: 'screen') => Promise<WakeLock> } };

/**
 * Test-day shell for timed exams. Before the clock starts it asks permission to take over the
 * full screen; during the test it covers the rest of the app, keeps the screen awake, and counts
 * every time the student leaves full screen or switches away. A web page cannot truly lock a
 * device (only an installed app such as Bluebook can), so this is an honest best effort: leaving
 * is always possible, and always recorded in the report.
 */
export function TestShell({ title, official, children }: { title: string; official?: boolean; children: React.ReactNode }) {
  const update = useStore((s) => s.mockUpdate);
  const breaks = useStore((s) => s.activeMock?.breaks ?? 0);
  const [phase, setPhase] = useState<'gate' | 'run'>('gate');
  const [wantFs, setWantFs] = useState(false);
  const [out, setOut] = useState(false);
  const [note, setNote] = useState('');
  const wake = useRef<WakeLock | null>(null);
  const last = useRef(0);
  const supported = typeof document !== 'undefined' && !!document.documentElement.requestFullscreen;

  const goFull = useCallback(async () => {
    try {
      await document.documentElement.requestFullscreen({ navigationUI: 'hide' });
      try { await nav().keyboard?.lock?.(['Escape']); } catch { /* optional: makes Esc a press-and-hold */ }
      return true;
    } catch { return false; }
  }, []);
  const keepAwake = useCallback(async () => { try { wake.current = (await nav().wakeLock?.request('screen')) ?? null; } catch { /* optional */ } }, []);

  const start = async (full: boolean) => {
    let ok = false;
    if (full) { ok = await goFull(); if (!ok) setNote('This browser did not allow full screen, so the test is running in focus view instead.'); }
    setWantFs(ok); update({ locked: ok });
    void keepAwake();
    setPhase('run');
  };

  useEffect(() => {
    if (phase !== 'run') return;
    const count = () => { const now = Date.now(); if (now - last.current > 1500) { last.current = now; update({ addBreak: true }); } };
    const onFs = () => { if (wantFs && !document.fullscreenElement) { setOut(true); count(); } };
    const onVis = () => { if (document.hidden) count(); else void keepAwake(); };
    document.addEventListener('fullscreenchange', onFs);
    document.addEventListener('visibilitychange', onVis);
    return () => { document.removeEventListener('fullscreenchange', onFs); document.removeEventListener('visibilitychange', onVis); };
  }, [phase, wantFs, update, keepAwake]);

  // leaving the test (finished, saved, or navigated away) always gives the screen back
  useEffect(() => () => {
    try { nav().keyboard?.unlock?.(); } catch { /* ignore */ }
    try { void wake.current?.release(); } catch { /* ignore */ }
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
  }, []);

  const body = phase === 'gate' ? (
    <div className="grid min-h-full place-items-center p-4">
      <div className="card w-full max-w-xl p-6 sm:p-8" data-testid="lock-gate" role="dialog" aria-modal="true" aria-labelledby="lock-title">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-brand/15 text-brand"><Lock size={28} /></div>
        <h1 id="lock-title" className="mt-4 text-center text-2xl font-bold">Lock in for this test?</h1>
        <p className="mt-1 text-center text-sm text-muted">{title}</p>
        <ul className="mt-5 space-y-3 text-sm">
          <li className="flex gap-3"><Maximize size={18} className="mt-0.5 shrink-0 text-brand2" /><span><b>Full screen.</b> The test fills your whole screen, with no tabs, menus or notifications from this page in view. {supported ? 'Your browser will ask you to allow it.' : 'Your browser does not support this, so you will get the focus view instead.'}</span></li>
          <li className="flex gap-3"><ShieldCheck size={18} className="mt-0.5 shrink-0 text-brand2" /><span><b>Leaving is counted.</b> If you exit full screen or switch to another tab, the clock keeps running and your report shows how many times it happened.</span></li>
          <li className="flex gap-3"><MonitorOff size={18} className="mt-0.5 shrink-0 text-brand2" /><span><b>What it cannot do.</b> A web page is not allowed to lock your computer the way the Bluebook app does. You can always leave by holding <kbd className="rounded border border-line px-1 text-xs">Esc</kbd>. Staying in is up to you.</span></li>
        </ul>
        <p className="mt-4 text-center text-xs text-faint">The timer starts when you press one of these buttons.</p>
        <div className="mt-3 grid gap-2">
          <button type="button" className="btn-primary !py-3 text-base" onClick={() => start(true)} data-testid="lock-go" autoFocus><Lock size={18} />Allow full screen and start</button>
          <button type="button" className="btn-ghost" onClick={() => start(false)} data-testid="lock-skip">Start without full screen</button>
          <Link href="/mocks" className="btn-quiet justify-center text-sm">Not now</Link>
        </div>
      </div>
    </div>
  ) : (
    <div className="mx-auto max-w-6xl p-3 sm:p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="font-display text-sm font-bold">{title}{official && <span className="ml-2 rounded-full border border-gold/50 bg-gold/10 px-2 py-0.5 text-[11px] font-bold text-gold">Official College Board questions</span>}</span>
        <span className="flex items-center gap-2">
          {breaks > 0 && <span className="chip !border-warn text-warn" data-testid="break-count">Left the test {breaks}×</span>}
          <span className={cn('chip', wantFs && !out ? '!border-ok text-ok' : 'text-muted')} data-testid="lock-status">{wantFs && !out ? <><Lock size={12} />Locked in · hold Esc to leave</> : 'Focus view'}</span>
          {!wantFs && supported && <button type="button" className="btn-quiet !py-1 text-xs" onClick={async () => { if (await goFull()) { setWantFs(true); update({ locked: true }); } }}><Maximize size={13} />Go full screen</button>}
        </span>
      </div>
      {note && <p className="mb-3 rounded-xl border border-warn/40 bg-warn/10 p-3 text-sm" role="status">{note}</p>}
      {children}
      {out && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-bg/95 p-4 backdrop-blur" role="alertdialog" aria-modal="true" aria-labelledby="out-title" data-testid="lock-out">
          <div className="card w-full max-w-md p-6 text-center">
            <h2 id="out-title" className="text-xl font-bold">You left full screen</h2>
            <p className="mt-2 text-sm text-muted">The clock is still running, and this has been noted in your report ({breaks} so far). On test day you would not be able to leave at all.</p>
            <div className="mt-4 grid gap-2">
              <button type="button" className="btn-primary" autoFocus onClick={async () => { if (await goFull()) setOut(false); else { setWantFs(false); setOut(false); } }}><Lock size={16} />Return to full screen</button>
              <button type="button" className="btn-ghost" onClick={() => { setWantFs(false); setOut(false); update({ locked: false }); }}>Continue without full screen</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
  return createPortal(<div className="fixed inset-0 z-40 overflow-y-auto bg-bg" data-testid="test-shell">{body}</div>, document.body);
}
