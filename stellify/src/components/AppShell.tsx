'use client';
import { hasOfficial } from '@/data/questions';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Flame, Menu, Moon, Search, Settings, Sparkles, Sun, X } from 'lucide-react';
import { MotionConfig } from 'framer-motion';
import { Suspense, useEffect, useId, useState } from 'react';
import { useStore } from '@/lib/store';
import { useLevel, useStreak } from '@/lib/hooks';
import { BRAND } from '@/lib/taxonomy';
import { NAV } from './nav';
import { Pet } from './Pet';
import { Toasts } from './Toasts';
import { SearchModal } from './SearchBox';
import { cn } from './ui';

export function Logo({ size = 30 }: { size?: number }) {
  const id = `lg${useId().replace(/:/g, '')}`;
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" role="img" aria-label={`${BRAND.name} logo`}>
      <defs><linearGradient id={id} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#8B6EFF" /><stop offset="1" stopColor="#2F8BFF" /></linearGradient></defs>
      <rect width="40" height="40" rx="11" fill={`url(#${id})`} />
      <path d="M20 7 L23.2 16.8 L33 20 L23.2 23.2 L20 33 L16.8 23.2 L7 20 L16.8 16.8 Z" fill="#fff" />
      <path d="M8 30 C14 36 26 36 32 30" fill="none" stroke="#fff" strokeOpacity="0.55" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

const FOCUS_ROUTES = ['/mocks/run', '/onboarding'];

export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname() ?? '/';
  const hydrated = useStore((s) => s.hydrated);
  const theme = useStore((s) => s.settings.theme);
  const reduced = useStore((s) => s.settings.reducedMotion);
  const setSettings = useStore((s) => s.setSettings);
  const coins = useStore((s) => s.pet.coins);
  const equipped = useStore((s) => s.pet.equipped);
  const level = useLevel();
  const streak = useStreak();
  const [menu, setMenu] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    if (!hydrated) return;
    const dark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.toggle('dark', dark);
    document.documentElement.classList.toggle('reduce-motion', reduced);
    try { localStorage.setItem('stellify-theme', theme); } catch { /* storage unavailable */ }
  }, [theme, reduced, hydrated]);
  useEffect(() => { setMenu(false); }, [path]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setSearchOpen(true); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const clean = path.replace(/\/$/, '') || '/';
  const focus = FOCUS_ROUTES.some((r) => clean.startsWith(r));
  const isDark = theme === 'dark';

  if (!hydrated) {
    return (
      <div className="grid min-h-screen place-items-center" aria-busy="true">
        <div className="flex flex-col items-center gap-3 text-center">
          <Pet mood="idle" size={120} still />
          <div className="flex items-center gap-2 font-display text-xl font-bold"><Logo />{BRAND.name}</div>
          <p className="text-sm text-muted">Loading your progress…</p>
        </div>
      </div>
    );
  }

  const nav = (
    <nav aria-label="Main" className="flex h-full flex-col gap-4 overflow-y-auto px-3 pb-4">
      {NAV.map((g) => (
        <div key={g.group}>
          <div className="px-2 pb-1 text-[11px] font-bold uppercase tracking-widest text-faint">{g.group}</div>
          <ul className="space-y-0.5">
            {g.items.map((it) => {
              const active = it.href === '/' ? clean === '/' : clean === it.href || (it.href !== '/learn' && it.href !== '/practice' && clean.startsWith(it.href + '/'));
              return (
                <li key={it.href}>
                  <Link href={it.href} aria-current={active ? 'page' : undefined}
                    className={cn('flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm font-medium transition-colors', active ? 'bg-brand/15 text-ink ring-1 ring-brand/30' : 'text-muted hover:bg-raised hover:text-ink')}>
                    <it.icon size={17} className={active ? 'text-brand' : undefined} aria-hidden />{it.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
      <div className="mt-auto border-t border-line pt-3">
        <Link href="/settings" aria-current={clean === '/settings' ? 'page' : undefined} className={cn('flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm font-medium', clean === '/settings' ? 'bg-brand/15 text-ink' : 'text-muted hover:bg-raised hover:text-ink')}>
          <Settings size={17} aria-hidden />Settings &amp; account
        </Link>
      </div>
    </nav>
  );

  return (
    <MotionConfig reducedMotion={reduced ? 'always' : 'user'}>
      <div className="min-h-screen lg:flex">
        {!focus && (
          <aside className="no-print sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-line bg-surface/60 lg:flex">
            <Link href="/" className="flex items-center gap-2.5 px-5 py-4 font-display text-lg font-bold"><Logo />{BRAND.name}</Link>
            {nav}
          </aside>
        )}
        {menu && !focus && (
          <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation menu">
            <div className="absolute inset-0 bg-black/60" onClick={() => setMenu(false)} />
            <div className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col border-r border-line bg-surface">
              <div className="flex items-center justify-between px-4 py-3">
                <span className="flex items-center gap-2 font-display text-lg font-bold"><Logo />{BRAND.name}</span>
                <button className="btn-quiet !p-2" onClick={() => setMenu(false)} aria-label="Close menu"><X size={18} /></button>
              </div>
              {nav}
            </div>
          </div>
        )}
        <div className="min-w-0 flex-1">
          {!focus && (
            <div className="no-print sticky top-0 z-30 flex items-center gap-2 border-b border-line bg-bg/85 px-3 py-2.5 backdrop-blur sm:px-6">
              <button className="btn-quiet !p-2 lg:hidden" onClick={() => setMenu(true)} aria-label="Open menu"><Menu size={20} /></button>
              <Link href="/" className="flex items-center gap-2 font-display font-bold lg:hidden"><Logo size={26} /><span className="hidden sm:inline">{BRAND.name}</span></Link>
              <button onClick={() => setSearchOpen(true)} className="ml-1 flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2 text-left text-sm text-faint hover:text-muted sm:max-w-md" aria-label="Search">
                <Search size={15} /><span className="truncate">Search lessons, questions, rules…</span><kbd className="ml-auto hidden rounded border border-line px-1.5 text-[10px] sm:block">Ctrl K</kbd>
              </button>
              <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
                <Link href="/calendar" className="chip !py-1" title={`Current streak: ${streak.current} day${streak.current === 1 ? '' : 's'}`}><Flame size={14} className="text-warn" /><span className="font-bold text-ink">{streak.current}</span><span className="sr-only">day streak</span></Link>
                <Link href="/rewards" className="chip !py-1" title="Stardust (earned by studying)"><Sparkles size={14} className="text-gold" /><span className="font-bold text-ink">{coins}</span><span className="sr-only">Stardust</span></Link>
                <Link href="/pet" className="hidden items-center gap-1.5 rounded-full border border-line bg-raised py-0.5 pl-1 pr-2.5 text-xs font-semibold sm:flex" title="Your companion">
                  <Pet size={26} level={level.level} equipped={equipped} still />Lv {level.level}
                </Link>
                <button className="btn-quiet !p-2" onClick={() => setSettings({ theme: isDark ? 'light' : 'dark' })} aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}>{isDark ? <Sun size={18} /> : <Moon size={18} />}</button>
              </div>
            </div>
          )}
          <main id="main" className={cn('mx-auto w-full', focus ? 'max-w-6xl p-3 sm:p-6' : 'max-w-6xl px-3 py-6 sm:px-6')}>
            <Suspense fallback={<div className="py-20 text-center text-sm text-muted">Loading…</div>}>{children}</Suspense>
          </main>
          {!focus && <footer className="no-print mx-auto max-w-6xl px-6 pb-8 pt-2 text-xs leading-relaxed text-faint">{BRAND.disclaimer} {hasOfficial && 'Exception: questions labelled Official are College Board questions from your own practice file, included in this personal copy for your study only. '}Passages are written for practice; the researchers, studies and data they describe are illustrative.</footer>}
        </div>
      </div>
      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
      <Toasts />
    </MotionConfig>
  );
}
