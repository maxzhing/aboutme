'use client';
import { hasOfficial } from '@/data/questions';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CalendarCheck, Keyboard, Menu, Moon, Search, Settings, Sparkles, Sun, X } from 'lucide-react';
import { MotionConfig } from 'framer-motion';
import { Suspense, useEffect, useState } from 'react';
import { storageIsVolatile, useStore } from '@/lib/store';
import { useWeekRhythm } from '@/lib/hooks';
import { BRAND } from '@/lib/taxonomy';
import { NAV } from './nav';
import { Toasts } from './Toasts';
import { SearchModal } from './SearchBox';
import { SoftFeel } from './Feel';
import { ShortcutSheet } from './Shortcuts';
import { HighlightToolbar } from './Highlight';
import { cn } from './ui';

export function Logo({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" role="img" aria-label={`${BRAND.name} logo`}>
      <rect width="40" height="40" rx="6" style={{ fill: 'rgb(var(--ink))' }} />
      <path d="M20 7 L23.5 16.2 L33.2 16.7 L25.6 22.8 L28.2 32.2 L20 26.8 L11.8 32.2 L14.4 22.8 L6.8 16.7 L16.5 16.2 Z" style={{ fill: 'rgb(var(--bg))' }} />
    </svg>
  );
}

const FOCUS_ROUTES = ['/mocks/run', '/onboarding'];
/** Which area a route belongs to: each area has its own accent colour. */
export type Section = 'home' | 'learn' | 'practice' | 'ap' | 'performance' | 'companion' | 'tools' | 'settings';
const GROUP_SECTION: Record<string, Section> = { Home: 'home', Learn: 'learn', Practice: 'practice', Challenges: 'practice', 'AP Courses': 'ap', Progress: 'performance', Performance: 'performance', Companion: 'companion', Tools: 'tools' };
export function sectionOf(path: string): Section {
  if (path === '/') return 'home';
  if (/^\/(settings|qc)\b/.test(path)) return 'settings';
  if (/^\/(calc|csa|micro|macro|stats|music)\b/.test(path)) return 'ap';
  if (/^\/(learn|grammar|hacks|desmos|diagnostic)\b/.test(path)) return 'learn';
  if (/^\/(practice|remix|official|daily|speed|arena)\b/.test(path)) return 'practice';
  if (/^\/(analytics|mistakes|mocks|calendar|report)\b/.test(path)) return 'performance';
  if (/^\/(pet|rewards|achievements)\b/.test(path)) return 'companion';
  if (/^\/(tutor|vocabulary|reference|notes|resources)\b/.test(path)) return 'tools';
  return 'home';
}
const courseOf = (path: string) => path.match(/^\/(calc|csa|micro|macro|stats|music)\b/)?.[1];
/** Lessons and chapters run full-screen, without the sidebar, like a test-day screen. */
const LESSON_FOCUS = /^\/learn\/[a-z0-9]+\/[a-z0-9]+-\d+$/;

export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname() ?? '/';
  const hydrated = useStore((s) => s.hydrated);
  const theme = useStore((s) => s.settings.theme);
  const reduced = useStore((s) => s.settings.reducedMotion);
  const setSettings = useStore((s) => s.setSettings);
  const coins = useStore((s) => s.pet.coins);
  const week = useWeekRhythm();
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
      <main className="mx-auto max-w-3xl px-4 py-10" aria-busy="true" aria-label="Loading your progress">
        <div className="flex items-center gap-2 font-display text-xl font-semibold"><Logo />{BRAND.name}</div>
        <p className="mt-2 text-sm text-muted">Loading your progress from this device…</p>
        <div className="mt-8 space-y-3" aria-hidden>{[70, 92, 84, 60].map((w) => <div key={w} className="h-4 rounded bg-raised" style={{ width: `${w}%` }} />)}</div>
      </main>
    );
  }

  const nav = (
    <nav aria-label="Main" className="flex h-full flex-col gap-5 overflow-y-auto px-3 pb-4 pt-1">
      {NAV.map((g) => {
        const isActive = (href: string) => href === '/' ? clean === '/' : href === '/path' ? clean.startsWith('/path') : href === '/learn' ? clean.startsWith('/learn') : clean === href || (href !== '/practice' && href !== '/desmos' && clean.startsWith(href + '/'));
        const list = (
          <ul className="space-y-0.5">
            {g.items.map((it) => (
              <li key={it.href} data-course={courseOf(it.href)}>
                <Link href={it.href} aria-current={isActive(it.href) ? 'page' : undefined} className="nav-item">
                  <span className="nav-icon"><it.icon size={15} aria-hidden /></span><span className="truncate">{it.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        );
        return (
          <div key={g.group} data-section={GROUP_SECTION[g.group] ?? 'home'}>
            {g.folded ? (
              <details open={g.items.some((it) => isActive(it.href)) || undefined} className="group/nav">
                <summary className="nav-group-label flex cursor-pointer list-none items-center justify-between rounded hover:text-ink">{g.group}<span aria-hidden className="text-[10px] transition-transform group-open/nav:rotate-90">▸</span></summary>
                {list}
              </details>
            ) : <><div className="nav-group-label">{g.group}</div>{list}</>}
          </div>
        );
      })}
      <div className="mt-auto border-t border-line/70 pt-3" data-section="settings">
        <Link href="/settings" aria-current={clean === '/settings' ? 'page' : undefined} className="nav-item">
          <span className="nav-icon"><Settings size={15} aria-hidden /></span>Settings &amp; account
        </Link>
      </div>
    </nav>
  );

  return (
    <MotionConfig reducedMotion={reduced ? 'always' : 'user'}>
      <SoftFeel />
      <ShortcutSheet />
      <HighlightToolbar />
      <div className="min-h-screen lg:flex" data-section={section} data-course={course}>
        {!focus && (
          <aside className="sidebar no-print sticky top-0 hidden h-screen w-[264px] shrink-0 flex-col border-r border-line lg:flex">
            <Link href="/" className="group flex items-center gap-3 px-5 pb-4 pt-5">
              <Logo size={34} />
              <span className="min-w-0"><span className="block font-display text-[22px] font-semibold leading-none">{BRAND.name}</span><span className="mt-1 block truncate text-[12px] text-faint">Free SAT &amp; AP study</span></span>
            </Link>
            {nav}
          </aside>
        )}
        {menu && !focus && (
          <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation menu">
            <div className="modal-backdrop absolute inset-0 bg-ink/40" onClick={() => setMenu(false)} />
            <div className="sidebar drawer-panel absolute inset-y-0 left-0 flex w-[290px] max-w-[86vw] flex-col border-r border-line bg-bg">
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
            <div className="no-print sticky top-0 z-30 flex items-center gap-2 border-b border-line bg-bg px-3 py-2 sm:gap-3 sm:px-6">
              <button className="btn-quiet !min-h-0 !p-2 lg:hidden" onClick={() => setMenu(true)} aria-label="Open menu"><Menu size={20} /></button>
              <Link href="/" className="flex items-center gap-2 font-display font-bold lg:hidden"><Logo size={26} /><span className="hidden sm:inline">{BRAND.name}</span></Link>
              <button onClick={() => setSearchOpen(true)} className="searchbar ml-1" aria-label="Search">
                <Search size={15} className="shrink-0 text-accent" /><span className="truncate">Search lessons, questions, rules…</span><kbd className="kbd ml-auto hidden sm:inline-grid">Ctrl K</kbd>
              </button>
              <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
                <div className="stat-cluster">
                  <Link href="/calendar" title="Study days this week, against your plan" data-testid="week-rhythm"><CalendarCheck size={15} aria-hidden /><span className="font-medium tabular-nums text-ink">{week.done}/{week.planned}</span><span className="sr-only">study days this week</span><span className="hidden text-faint sm:inline">this week</span></Link>
                  <Link href="/rewards" title="Stardust (earned by studying)"><Sparkles size={15} aria-hidden /><span className="font-medium tabular-nums text-ink">{coins}</span><span className="sr-only">Stardust</span></Link>
                </div>
                <button className="hidden h-10 w-10 place-items-center rounded-full border border-line bg-surface text-muted hover:border-ink/40 hover:text-ink sm:grid" onClick={() => window.dispatchEvent(new Event('stellify:shortcuts'))} aria-label="Keyboard shortcuts"><Keyboard size={17} /></button>
                <button className="grid h-10 w-10 place-items-center rounded-full border border-line bg-surface text-muted hover:border-ink/40 hover:text-ink" onClick={() => setSettings({ theme: isDark ? 'light' : 'dark' })} aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}>{isDark ? <Sun size={17} /> : <Moon size={17} />}</button>
              </div>
            </div>
          )}
          {!focus && <StorageWarning />}
          <main id="main" className={cn('mx-auto w-full', focus ? 'max-w-6xl p-3 sm:p-6' : 'max-w-6xl px-3 py-7 sm:px-8 sm:py-9')}>
            <Suspense fallback={<div className="py-20 text-center text-sm text-muted">Loading…</div>}><div key={clean} className="page-enter">{children}</div></Suspense>
          </main>
          {!focus && (
            <footer className="no-print mx-auto max-w-6xl border-t border-line px-6 pb-8 pt-5 text-[13px] leading-relaxed text-faint">
              <nav aria-label="About Stellify" className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-muted">
                {[['/about', 'About'], ['/methodology', 'Methodology'], ['/how-we-write', 'How we write and check questions'], ['/privacy', 'Privacy'], ['/changelog', 'Changelog']].map(([h, l]) => <Link key={h} href={h} className="underline-offset-4 hover:text-ink hover:underline">{l}</Link>)}
              </nav>
              {BRAND.disclaimer} {hasOfficial() && 'Exception: questions labelled Official are real College Board questions that you added yourself, kept on this device for your own study. '}Passages are written for practice; the researchers, studies and data they describe are illustrative.
            </footer>
          )}
        </div>
      </div>
      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
      <Toasts />
    </MotionConfig>
  );
}

/** Shown when the browser is not keeping saves, so a student is not surprised by lost progress. */
function StorageWarning() {
  const [on, setOn] = useState(storageIsVolatile);
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    const f = () => setOn(true);
    window.addEventListener('stellify:storage-volatile', f);
    return () => window.removeEventListener('stellify:storage-volatile', f);
  }, []);
  if (!on || hidden) return null;
  return (
    <div role="alert" className="no-print mx-3 mt-3 flex max-w-6xl items-start gap-3 rounded-xl border border-bad/40 bg-bad/10 px-4 py-3 text-sm text-ink sm:mx-8 xl:mx-auto">
      <p className="min-w-0 flex-1"><strong>This browser isn’t saving your progress.</strong> Private browsing, a full disk or a school setting is blocking storage, so what you do now is lost when this tab closes. Use a normal window, or <Link href="/settings" className="underline">export a backup</Link> before you leave.</p>
      <button className="btn-quiet !min-h-0 !p-1" onClick={() => setHidden(true)} aria-label="Hide this warning"><X size={16} /></button>
    </div>
  );
}
