import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { Explanation, FitDimension, RecommendationPriority } from '@/domain/types';
import { Icon, type IconName } from './Icon';
import { Badge, Button, Card } from './primitives';
import { BAND_LABEL, BAND_TONE, PRIORITY_LABEL, PRIORITY_TONE } from '@/domain/engine/explain';
import { ProgressRing } from '@/components/charts';

/* ==========================================================================
   Feature-level shared pieces used across many screens.
   ========================================================================== */

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  children,
  back,
}: {
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
  /** Breadcrumb back to the parent index, for detail pages. */
  back?: { to: string; label: string };
}) {
  return (
    <header className="page-head">
      {back ? (
        <Link to={back.to} className="backlink no-print">
          <Icon name="chevron-left" size={13} />
          {back.label}
        </Link>
      ) : null}
      <div className="row between g-4 wrap items-end">
        <div className="grow" style={{ minWidth: 0 }}>
          {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
          <h1 className="page-title mt-2">{title}</h1>
          {description ? <p className="page-sub">{description}</p> : null}
        </div>
        {actions ? <div className="row g-2 wrap no-print">{actions}</div> : null}
      </div>
      {children}
    </header>
  );
}

export function SectionHeader({
  title,
  description,
  action,
  id,
  className = '',
}: {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  id?: string;
  className?: string;
}) {
  return (
    <div className={`section-head ${className}`}>
      <div>
        <h2 className="section-title" id={id}>
          {title}
        </h2>
        {description ? <p className="t-sm subtle mt-1" style={{ maxWidth: '68ch' }}>{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

/* --------------------------------------------------- Explanation disclosure */

export function ExplainCard({ explanation, label = 'Why this?' }: { explanation: Explanation; label?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="explain">
      <button type="button" className="explain-trigger" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <Icon name="sparkles" size={13} />
        {label}
        <Icon name={open ? 'chevron-down' : 'chevron-right'} size={13} className="ml-auto" />
      </button>
      {open ? (
        <div className="explain-body">
          <div className="explain-row">
            <span className="explain-key">Why this</span>
            <span>{explanation.whyThis}</span>
          </div>
          {explanation.whyNow ? (
            <div className="explain-row">
              <span className="explain-key">Why now</span>
              <span>{explanation.whyNow}</span>
            </div>
          ) : null}
          {explanation.connection ? (
            <div className="explain-row">
              <span className="explain-key">Connection</span>
              <span>{explanation.connection}</span>
            </div>
          ) : null}
          {explanation.requires ? (
            <div className="explain-row">
              <span className="explain-key">Requires</span>
              <span>{explanation.requires}</span>
            </div>
          ) : null}
          {explanation.alternatives.length ? (
            <div className="explain-row">
              <span className="explain-key">Alternatives</span>
              <span>{explanation.alternatives.join(' · ')}</span>
            </div>
          ) : null}
          {explanation.uncertainty ? (
            <div className="explain-row">
              <span className="explain-key">Not known</span>
              <span>{explanation.uncertainty}</span>
            </div>
          ) : null}
          {explanation.evidence.length ? (
            <div className="explain-row">
              <span className="explain-key">From your profile</span>
              <span>{explanation.evidence.join(' · ')}</span>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------ Fit dimensions */

export function FitBadge({ band }: { band: FitDimension['band'] }) {
  return <Badge tone={BAND_TONE[band]}>{BAND_LABEL[band]}</Badge>;
}

export function PriorityBadge({ priority }: { priority: RecommendationPriority }) {
  return <Badge tone={PRIORITY_TONE[priority]}>{PRIORITY_LABEL[priority]}</Badge>;
}

export function FitDimensionGrid({ dimensions, compact }: { dimensions: FitDimension[]; compact?: boolean }) {
  const toneVar: Record<string, string> = {
    academic: 'var(--series-1)',
    personal: 'var(--series-2)',
    opportunity: 'var(--series-4)',
    financial: 'var(--series-3)',
  };
  return (
    <div className="fitgrid">
      {dimensions.map((d) => (
        <div className="fitcell" key={d.key}>
          <ProgressRing
            value={d.score}
            size={compact ? 46 : 58}
            stroke={compact ? 5 : 6}
            tone={toneVar[d.key]}
            label={String(Math.round(d.score))}
            ariaLabel={`${d.label}: ${Math.round(d.score)} out of 100, ${BAND_LABEL[d.band]}`}
          />
          <span className="fitcell-label">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

export function FitDimensionDetail({ dimension }: { dimension: FitDimension }) {
  return (
    <Card pad="md">
      <div className="row between g-3 items-start">
        <div>
          <h3 className="t-md w-600" style={{ fontFamily: 'var(--font-sans)' }}>
            {dimension.label}
          </h3>
          <div className="row g-2 mt-2">
            <FitBadge band={dimension.band} />
            <span className="t-xs faint mono">{Math.round(dimension.score)}/100</span>
          </div>
        </div>
        <ProgressRing value={dimension.score} size={52} stroke={5} ariaLabel={`${dimension.label} ${Math.round(dimension.score)} of 100`} />
      </div>
      {dimension.reasons.length ? (
        <ul className="col g-2 mt-4">
          {dimension.reasons.map((r, i) => (
            <li key={i} className="row-top g-2 t-sm">
              <Icon name="check" size={14} className="c-ok shrink-0" style={{ marginTop: 3 }} />
              <span>{r}</span>
            </li>
          ))}
        </ul>
      ) : null}
      {dimension.gaps.length ? (
        <ul className="col g-2 mt-3">
          {dimension.gaps.map((g, i) => (
            <li key={i} className="row-top g-2 t-sm muted">
              <Icon name="alert" size={14} className="c-warn shrink-0" style={{ marginTop: 3 }} />
              <span>{g}</span>
            </li>
          ))}
        </ul>
      ) : null}
      {dimension.unknowns.length ? (
        <ul className="col g-2 mt-3">
          {dimension.unknowns.map((u, i) => (
            <li key={i} className="row-top g-2 t-xs subtle">
              <Icon name="help" size={13} className="shrink-0" style={{ marginTop: 2 }} />
              <span>{u}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </Card>
  );
}

/* ---------------------------------------------------------------- List rows */

export function DataRow({ label, value, note }: { label: string; value: ReactNode; note?: ReactNode }) {
  return (
    <div className="seg-row">
      <span className="t-sm subtle" style={{ minWidth: 150 }}>
        {label}
      </span>
      <span className="grow t-sm">{value ?? '—'}</span>
      {note ? <span className="t-2xs faint">{note}</span> : null}
    </div>
  );
}

export function Stat({ label, value, tone }: { label: string; value: ReactNode; tone?: string }) {
  return (
    <div className="col g-1">
      <span className="stat-label">{label}</span>
      <span className={`t-lg w-600 mono${tone ? ` ${tone}` : ''}`}>{value}</span>
    </div>
  );
}

/* --------------------------------------------------------------- Nav cards */

export function NavCard({
  to,
  icon,
  title,
  description,
  meta,
}: {
  to: string;
  icon: IconName;
  title: string;
  description: string;
  meta?: ReactNode;
}) {
  return (
    <Link to={to} className="card card-pad card-hover card-link">
      <div className="row between g-3 items-start">
        <span className="empty-art" style={{ width: 34, height: 34, borderRadius: 'var(--r-md)' }}>
          <Icon name={icon} size={17} />
        </span>
        {meta}
      </div>
      <h3 className="t-md w-600 mt-4" style={{ fontFamily: 'var(--font-sans)' }}>
        {title}
      </h3>
      <p className="t-sm subtle mt-2">{description}</p>
    </Link>
  );
}

/* --------------------------------------------------------------- Feedback UI */

export function FeedbackButtons({
  onFeedback,
  compact,
}: {
  onFeedback: (kind: 'not-interested' | 'too-expensive' | 'too-far' | 'too-time-consuming' | 'already-doing') => void;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const options = [
    { kind: 'not-interested' as const, label: 'Not interested' },
    { kind: 'too-expensive' as const, label: 'Too expensive' },
    { kind: 'too-far' as const, label: 'Too far' },
    { kind: 'too-time-consuming' as const, label: 'Too much time' },
    { kind: 'already-doing' as const, label: 'Already doing this' },
  ];
  if (!open) {
    return (
      <Button size={compact ? 'xs' : 'sm'} variant="ghost" icon="x" onClick={() => setOpen(true)}>
        Not for me
      </Button>
    );
  }
  return (
    <div className="tag-list">
      {options.map((o) => (
        <button
          key={o.kind}
          type="button"
          className="chip chip-sm"
          onClick={() => {
            onFeedback(o.kind);
            setOpen(false);
          }}
        >
          {o.label}
        </button>
      ))}
      <button type="button" className="chip chip-sm" onClick={() => setOpen(false)}>
        Cancel
      </button>
    </div>
  );
}

/* ------------------------------------------------------------- Timeline row */

export function TimelineItem({
  title,
  meta,
  state = 'default',
  children,
}: {
  title: ReactNode;
  meta?: ReactNode;
  state?: 'default' | 'now' | 'done' | 'late' | 'warn';
  children?: ReactNode;
}) {
  return (
    <li className="tl-item">
      <span className={`tl-dot${state !== 'default' ? ` is-${state}` : ''}`} aria-hidden="true" />
      <div className="row between g-3 wrap">
        <span className="t-sm w-600">{title}</span>
        {meta}
      </div>
      {children ? <div className="mt-2">{children}</div> : null}
    </li>
  );
}
