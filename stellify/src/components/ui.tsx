'use client';
import Link from 'next/link';
import { clsx, type ClassValue } from 'clsx';
import { X } from 'lucide-react';
import { useEffect, useId, useRef, type ReactNode } from 'react';

export const cn = (...a: ClassValue[]) => clsx(a);

export function Card({ className, children, as: Tag = 'section', ...rest }: { className?: string; children: ReactNode; as?: 'section' | 'div' | 'article' } & React.HTMLAttributes<HTMLElement>) {
  return <Tag className={cn('card p-5', className)} {...rest}>{children}</Tag>;
}

export function PageHeader({ title, subtitle, actions, eyebrow }: { title: string; subtitle?: ReactNode; actions?: ReactNode; eyebrow?: string }) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        {eyebrow && <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-brand2">{eyebrow}</p>}
        <h1 className="text-2xl font-bold sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 max-w-2xl text-sm text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}

export function Progress({ value, className, tone = 'brand', label }: { value: number; className?: string; tone?: 'brand' | 'ok' | 'warn' | 'bad' | 'gold'; label?: string }) {
  const v = Math.max(0, Math.min(100, value));
  const bar = { brand: 'bg-gradient-to-r from-brand to-brand2', ok: 'bg-ok', warn: 'bg-warn', bad: 'bg-bad', gold: 'bg-gold' }[tone];
  return (
    <div className={cn('h-2 w-full overflow-hidden rounded-full bg-raised', className)} role="progressbar" aria-valuenow={Math.round(v)} aria-valuemin={0} aria-valuemax={100} aria-label={label ?? 'Progress'}>
      <div className={cn('h-full rounded-full transition-[width] duration-500', bar)} style={{ width: `${v}%` }} />
    </div>
  );
}

export function Ring({ value, size = 72, stroke = 7, children, label }: { value: number; size?: number; stroke?: number; children?: ReactNode; label?: string }) {
  const gid = `rg${useId().replace(/:/g, '')}`;
  const r = (size - stroke) / 2, c = 2 * Math.PI * r, v = Math.max(0, Math.min(100, value));
  return (
    <div className="relative inline-grid place-items-center" style={{ width: size, height: size }} role="img" aria-label={label ?? `${Math.round(v)} percent`}>
      <svg width={size} height={size} className="-rotate-90">
        <defs><linearGradient id={gid} x1="0" x2="1"><stop offset="0" stopColor="rgb(var(--brand))" /><stop offset="1" stopColor="rgb(var(--brand2))" /></linearGradient></defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgb(var(--raised))" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={`url(#${gid})`} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - v / 100)} style={{ transition: 'stroke-dashoffset .6s' }} />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-sm font-bold">{children}</div>
    </div>
  );
}

export function Stat({ label, value, sub, icon }: { label: string; value: ReactNode; sub?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-faint"><span>{label}</span>{icon}</div>
      <div className="mt-1.5 font-display text-2xl font-bold">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-muted">{sub}</div>}
    </div>
  );
}

export function Badge({ children, tone = 'default', className }: { children: ReactNode; tone?: 'default' | 'brand' | 'ok' | 'warn' | 'bad' | 'gold'; className?: string }) {
  const t = { default: 'border-line bg-raised text-muted', brand: 'border-brand/30 bg-brand/10 text-brand', ok: 'border-ok/30 bg-ok/10 text-ok', warn: 'border-warn/30 bg-warn/10 text-warn', bad: 'border-bad/30 bg-bad/10 text-bad', gold: 'border-gold/30 bg-gold/10 text-gold' }[tone];
  return <span className={cn('inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold', t, className)}>{children}</span>;
}

export function Tabs<T extends string>({ tabs, value, onChange, label }: { tabs: { id: T; label: string; count?: number }[]; value: T; onChange: (v: T) => void; label: string }) {
  return (
    <div role="tablist" aria-label={label} className="flex flex-wrap gap-1 rounded-xl border border-line bg-raised p-1">
      {tabs.map((t) => (
        <button key={t.id} role="tab" aria-selected={value === t.id} onClick={() => onChange(t.id)}
          className={cn('rounded-lg px-3 py-1.5 text-sm font-medium transition-colors', value === t.id ? 'bg-surface text-ink shadow-card' : 'text-muted hover:text-ink')}>
          {t.label}{t.count !== undefined && <span className="ml-1.5 text-xs text-faint">{t.count}</span>}
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
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-3 backdrop-blur-sm" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-label={title} className={cn('card max-h-[90vh] w-full overflow-y-auto p-5 outline-none', wide ? 'max-w-3xl' : 'max-w-lg')}>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold">{title}</h2>
          <button onClick={onClose} className="btn-quiet !p-2" aria-label="Close dialog"><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Empty({ title, body, action }: { title: string; body: string; action?: { label: string; href: string } }) {
  return (
    <div className="card grid place-items-center gap-2 p-10 text-center">
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="max-w-md text-sm text-muted">{body}</p>
      {action && <Link href={action.href} className="btn-primary mt-2">{action.label}</Link>}
    </div>
  );
}

export const toneForPct = (p: number): 'ok' | 'warn' | 'bad' => (p >= 75 ? 'ok' : p >= 50 ? 'warn' : 'bad');
