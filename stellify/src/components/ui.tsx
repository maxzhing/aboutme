'use client';
import Link from 'next/link';
import { clsx, type ClassValue } from 'clsx';
import { X } from 'lucide-react';
import { useEffect, useRef, type ReactNode } from 'react';

export const cn = (...a: ClassValue[]) => clsx(a);

export function Card({ className, children, as: Tag = 'section', ...rest }: { className?: string; children: ReactNode; as?: 'section' | 'div' | 'article' } & React.HTMLAttributes<HTMLElement>) {
  return <Tag className={cn('card p-5', className)} {...rest}>{children}</Tag>;
}

export function PageHeader({ title, subtitle, actions, eyebrow }: { title: string; subtitle?: ReactNode; actions?: ReactNode; eyebrow?: string }) {
  return (
    <header className="page-head mb-8 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow mb-3">{eyebrow}</p>}
        <h1 className="text-[32px] leading-[1.1] sm:text-[40px]">{title}</h1>
        {subtitle && <p className="mt-2.5 max-w-[68ch] text-[16px] leading-relaxed text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}

/** A few stars joined by faint lines: Stellify's decorative motif (purely visual). */
export function Constellation({ className }: { className?: string }) {
  return (
    <svg className={cn('constellation hidden md:block', className)} width="220" height="120" viewBox="0 0 220 120" aria-hidden fill="none">
      <path d="M12 86 L62 52 L108 70 L150 26 L206 44" stroke="currentColor" strokeOpacity=".35" strokeWidth="1" strokeDasharray="2 4" />
      {[[12, 86, 2], [62, 52, 3], [108, 70, 2], [150, 26, 3.6], [206, 44, 2.2]].map(([x, y, r]) => <circle key={x} cx={x} cy={y} r={r} fill="currentColor" />)}
      <path d="M150 14 v24 M138 26 h24" stroke="currentColor" strokeOpacity=".5" strokeWidth="1" strokeLinecap="round" />
    </svg>
  );
}

export function Progress({ value, className, tone = 'brand', label }: { value: number; className?: string; tone?: 'brand' | 'ok' | 'warn' | 'bad' | 'gold'; label?: string }) {
  const v = Math.max(0, Math.min(100, value));
  const bar = { brand: 'bg-accent', ok: 'bg-ok', warn: 'bg-warn', bad: 'bg-bad', gold: 'bg-gold' }[tone];
  return (
    <div className={cn('h-2 w-full overflow-hidden rounded-full bg-ink/[.07] dark:bg-white/[.07]', className)} role="progressbar" aria-valuenow={Math.round(v)} aria-valuemin={0} aria-valuemax={100} aria-label={label ?? 'Progress'}>
      <div className={cn('h-full rounded-full transition-[width] duration-700 ease-out', bar)} style={{ width: `${v}%` }} />
    </div>
  );
}

export function Ring({ value, size = 72, stroke = 7, children, label }: { value: number; size?: number; stroke?: number; children?: ReactNode; label?: string }) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r, v = Math.max(0, Math.min(100, value));
  return (
    <div className="relative inline-grid place-items-center" style={{ width: size, height: size }} role="img" aria-label={label ?? `${Math.round(v)} percent`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgb(var(--ink) / .08)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgb(var(--accent))" strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - v / 100)} style={{ transition: 'stroke-dashoffset .9s cubic-bezier(.2,.8,.2,1)' }} />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-sm font-bold">{children}</div>
    </div>
  );
}

export function Stat({ label, value, sub, icon }: { label: string; value: ReactNode; sub?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="metric">
      <div className="flex items-center justify-between gap-2 text-[11px] font-bold uppercase tracking-[0.08em] text-faint"><span>{label}</span>{icon && <span className="text-accent">{icon}</span>}</div>
      <div className="mt-2 font-display text-[26px] font-bold leading-none tabular-nums">{value}</div>
      {sub && <div className="mt-1.5 text-xs leading-snug text-muted">{sub}</div>}
    </div>
  );
}

export function Badge({ children, tone = 'default', className }: { children: ReactNode; tone?: 'default' | 'brand' | 'ok' | 'warn' | 'bad' | 'gold'; className?: string }) {
  const t = { default: 'border-line bg-raised text-muted', brand: 'border-brand/30 bg-brand/10 text-brand', ok: 'border-ok/30 bg-ok/10 text-ok', warn: 'border-warn/30 bg-warn/10 text-warn', bad: 'border-bad/30 bg-bad/10 text-bad', gold: 'border-gold/30 bg-gold/10 text-gold' }[tone];
  return <span className={cn('inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold', t, className)}>{children}</span>;
}

export function Tabs<T extends string>({ tabs, value, onChange, label }: { tabs: { id: T; label: string; count?: number }[]; value: T; onChange: (v: T) => void; label: string }) {
  return (
    <div role="tablist" aria-label={label} className="flex flex-wrap gap-1 rounded-2xl border border-line/80 bg-raised/70 p-1">
      {tabs.map((t) => (
        <button key={t.id} role="tab" aria-selected={value === t.id} onClick={() => onChange(t.id)}
          className={cn('rounded-xl px-3 py-1.5 text-sm font-semibold transition-colors', value === t.id ? 'bg-surface text-ink shadow-[0_1px_2px_rgb(var(--shadow)/.1),0_4px_12px_-6px_rgb(var(--accent)/.5)] ring-1 ring-accent/25' : 'text-muted hover:bg-surface/60 hover:text-ink')}>
          {t.label}{t.count !== undefined && <span className={cn('ml-1.5 rounded-full px-1.5 text-[11px] tabular-nums', value === t.id ? 'bg-accent/[.12] text-accent' : 'text-faint')}>{t.count}</span>}
        </button>
      ))}
    </div>
  );
}

export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); prev?.focus?.(); };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="modal-backdrop fixed inset-0 z-50 grid place-items-center bg-[rgb(4_6_20/.62)] p-3 backdrop-blur-md" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-label={title} className={cn('card card-glow modal-panel max-h-[90vh] w-full overflow-y-auto p-5 outline-none sm:p-6', wide ? 'max-w-3xl' : 'max-w-lg')}>
        <div className="-mx-5 -mt-5 mb-4 flex items-center justify-between gap-3 border-b border-line/70 px-5 py-3.5 sm:-mx-6 sm:-mt-6 sm:px-6">
          <h2 className="text-lg font-bold">{title}</h2>
          <button onClick={onClose} className="btn-quiet !p-2" aria-label="Close dialog"><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

/** `page`: the empty state is the whole page, so its title is the page's h1. */
export function Empty({ title, body, action, page }: { title: string; body: string; action?: { label: string; href: string }; page?: boolean }) {
  const H = page ? 'h1' : 'h3';
  return (
    <div className="card grid place-items-center gap-2 overflow-hidden p-10 text-center">
      <div className="relative mb-1 grid h-20 w-28 place-items-center text-accent" aria-hidden>
        <Constellation className="!static !z-0 !block !h-auto !w-28 !opacity-70" />
      </div>
      <H className="text-lg font-semibold">{title}</H>
      <p className="max-w-md text-sm text-muted">{body}</p>
      {action && <Link href={action.href} className="btn-primary mt-2">{action.label}</Link>}
    </div>
  );
}

export const toneForPct = (p: number): 'ok' | 'warn' | 'bad' => (p >= 75 ? 'ok' : p >= 50 ? 'warn' : 'bad');
