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
import { Backdrop, SoftFeel } from './Feel';
import { HighlightToolbar } from './Highlight';
import { cn } from './ui';

export function Logo({ size = 30 }: { size?: number }) {
  const id = `lg${useId().replace(/:/g, '')}`;
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" role="img" aria-label={`${BRAND.name} logo`}>
      <defs><linearGradient id={id} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#9070FF" /><stop offset=".55" stopColor="#5B5CF6" /><stop offset="1" stopColor="#2F8BFF" /></linearGradient></defs>
      <rect width="40" height="40" rx="11" fill={`url(#${id})`} />
      <path d="M20 7 L23.2 16.8 L33 20 L23.2 23.2 L20 33 L16.8 23.2 L7 20 L16.8 16.8 Z" fill="#fff" />
      <path d="M8 30 C14 36 26 36 32 30" fill="none" stroke="#fff" strokeOpacity="0.55" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

const FOCUS_ROUTES = ['/mocks/run', '/onboarding'];
/** Which area a route belongs to: each area has its own accent colour. */
export type Section = 'home' | 'learn' | 'practice' | 'ap' | 'performance' | 'companion' | 'tools' | 'settings';
const GROUP_SECTION: Record<string, Section> = { Home: 'home', Learn: 'learn', Practice: 'practice', 'AP Courses': 'ap', Performance: 'performance', Companion: 'companion', Tools: 'tools' };
export function sectionOf(path: string): Section {
  if (path === '/') return 'home';
  if (/^\/(settings|qc)\b/.test(path)) return 'settings';
  if (/^\/(calc|csa|micro|macro|stats)\b/.test(path)) return 'ap';
  if (/^\/(learn|grammar|hacks|desmos|diagnostic)\b/.test(path)) return 'learn';
  if (/^\/(practice|remix|official|daily|speed|arena)\b/.test(path)) return 'practice';
  if (/^\/(analytics|mistakes|mocks|calendar|report)\b/.test(path)) return 'performance';
  if (/^\/(pet|rewards|achievements)\b/.test(path)) return 'companion';
  if (/^\/(tutor|vocabulary|reference|notes|resources)\b/.test(path)) return 'tools';
  return 'home';
}
const courseOf = (path: string) => path.match(/^\/(calc|csa|micro|macro|stats)\b/)?.[1];
/** Lessons and chapters run full-screen, without the sidebar, like a test-day screen. */
const LESSON_FOCUS = /^\/learn\/[a-z0-9]+\/[a-z0-9]+-\d+$/;

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
  const quick = typeof window !== 'undefined' && /[?&]view=quick/.test(window.location.hash);
  const focus = FOCUS_ROUTES.some((r) => clean.startsWith(r)) || LESSON_FOCUS.test(clean) || (/^\/learn\/[a-z0-9]+$/.test(clean) && quick);
  const isDark = theme === 'dark';
  const section = sectionOf(clean);
  const course = courseOf(clean);

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
    <nav aria-label="Main" className="flex h-full flex-col gap-5 overflow-y-auto px-3 pb-4 pt-1">
      {NAV.map((g) => (
        <div key={g.group} data-section={GROUP_SECTION[g.group] ?? 'home'}>
          <div className="nav-group-label">{g.group}</div>
          <ul className="space-y-0.5">
            {g.items.map((it) => {
              const active = it.href === '/' ? clean === '/' : clean === it.href || (it.href !== '/learn' && it.href !== '/practice' && clean.startsWith(it.href + '/'));
              return (
                <li key={it.href} data-course={courseOf(it.href)}>
                  <Link href={it.href} aria-current={active ? 'page' : undefined} className="nav-item">
                    <span className="nav-icon"><it.icon size={15} aria-hidden /></span><span className="truncate">{it.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
      <div className="mt-auto border-t border-line/70 pt-3" data-section="settings">
        <Link href="/settings" aria-current={clean === '/settings' ? 'page' : undefined} className="nav-item">
          <span className="nav-icon"><Settings size={15} aria-hidden /></span>Settings &amp; account
        </Link>
      </div>
    </nav>
  );

  return (
    <MotionConfig reducedMotion={reduced ? 'always' : 'user'}>
      <Backdrop />
      <SoftFeel />
      <HighlightToolbar />
      <div className="min-h-screen lg:flex" data-section={section} data-course={course}>
        {!focus && (
          <aside className="sidebar no-print sticky top-0 hidden h-screen w-[264px] shrink-0 flex-col border-r border-line/70 backdrop-blur-xl lg:flex">
            <Link href="/" className="group flex items-center gap-3 px-5 pb-4 pt-5">
              <span className="transition-transform duration-500 group-hover:rotate-[8deg] group-hover:scale-105"><Logo size={36} /></span>
              <span className="min-w-0"><span className="block font-display text-[21px] font-bold leading-none tracking-tight">{BRAND.name}</span><span className="mt-1 block truncate text-[11px] text-faint">SAT &amp; AP study, offline</span></span>
            </Link>
            {nav}
          </aside>
        )}
        {menu && !focus && (
          <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation menu">
            <div className="modal-backdrop absolute inset-0 bg-[rgb(4_6_20/.6)] backdrop-blur-sm" onClick={() => setMenu(false)} />
            <div className="sidebar drawer-panel absolute inset-y-0 left-0 flex w-[290px] max-w-[86vw] flex-col border-r border-line bg-surface shadow-2xl">
              <div className="flex items-center justify-between px-4 py-3.5">
                <span className="flex items-center gap-2.5 font-display text-lg font-bold"><Logo />{BRAND.name}</span>
                <button className="btn-quiet !p-2" onClick={() => setMenu(false)} aria-label="Close menu"><X size={18} /></button>
              </div>
              {nav}
            </div>
          </div>
        )}
        <div className="min-w-0 flex-1">
          {!focus && (
            <div className="no-print sticky top-0 z-30 flex items-center gap-2 border-b border-line/50 bg-bg/65 px-3 py-2.5 backdrop-blur-xl sm:gap-3 sm:px-6">
              <button className="btn-quiet !min-h-0 !p-2 lg:hidden" onClick={() => setMenu(true)} aria-label="Open menu"><Menu size={20} /></button>
              <Link href="/" className="flex items-center gap-2 font-display font-bold lg:hidden"><Logo size={26} /><span className="hidden sm:inline">{BRAND.name}</span></Link>
              <button onClick={() => setSearchOpen(true)} className="searchbar ml-1" aria-label="Search">
                <Search size={15} className="shrink-0 text-accent" /><span className="truncate">Search lessons, questions, rules…</span><kbd className="ml-auto hidden rounded-md border border-line bg-raised/70 px-1.5 py-0.5 font-sans text-[10px] font-semibold text-faint sm:block">Ctrl K</kbd>
              </button>
              <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
                <div className="stat-cluster">
                  <Link href="/calendar" title={`Current streak: ${streak.current} day${streak.current === 1 ? '' : 's'}`}><Flame size={14} className="text-warn" /><span className="font-bold tabular-nums text-ink">{streak.current}</span><span className="sr-only">day streak</span></Link>
                  <Link href="/rewards" title="Stardust (earned by studying)"><Sparkles size={14} className="text-gold" /><span className="font-bold tabular-nums text-ink">{coins}</span><span className="sr-only">Stardust</span></Link>
                  <Link href="/pet" className="!hidden !py-0.5 !pl-1 sm:!flex" title="Your companion"><Pet size={24} level={level.level} equipped={equipped} still /><span className="text-ink">Lv {level.level}</span></Link>
                </div>
                <button className="grid h-9 w-9 place-items-center rounded-full border border-line/80 bg-surface/80 text-muted transition-colors hover:border-accent/40 hover:text-ink" onClick={() => setSettings({ theme: isDark ? 'light' : 'dark' })} aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}>{isDark ? <Sun size={17} /> : <Moon size={17} />}</button>
              </div>
            </div>
          )}
          <main id="main" className={cn('mx-auto w-full', focus ? 'max-w-6xl p-3 sm:p-6' : 'max-w-6xl px-3 py-7 sm:px-8 sm:py-9')}>
            <Suspense fallback={<div className="py-20 text-center text-sm text-muted">Loading…</div>}><div key={clean} className="page-enter">{children}</div></Suspense>
          </main>
          {!focus && <footer className="no-print mx-auto max-w-6xl border-t border-line/50 px-6 pb-8 pt-5 text-xs leading-relaxed text-faint">{BRAND.disclaimer} {hasOfficial() && 'Exception: questions labelled Official are real College Board questions that you added yourself, kept on this device for your own study. '}Passages are written for practice; the researchers, studies and data they describe are illustrative.</footer>}
        </div>
      </div>
      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
      <Toasts />
    </MotionConfig>
  );
}
