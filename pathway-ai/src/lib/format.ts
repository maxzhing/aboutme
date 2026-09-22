export function currency(n?: number, opts: { cents?: boolean } = {}): string {
  if (n === undefined || n === null || Number.isNaN(n)) return '—';
  return n.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: opts.cents ? 2 : 0,
  });
}

export function compactCurrency(n?: number): string {
  if (n === undefined || n === null || Number.isNaN(n)) return '—';
  if (Math.abs(n) >= 1000) return `$${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k`;
  return `$${n}`;
}

export function number(n?: number): string {
  if (n === undefined || n === null || Number.isNaN(n)) return '—';
  return n.toLocaleString('en-US');
}

export function percent(n?: number, digits = 0): string {
  if (n === undefined || n === null || Number.isNaN(n)) return '—';
  return `${n.toFixed(digits)}%`;
}

export function minutesLabel(mins?: number): string {
  if (!mins) return '—';
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h} hr ${m} min` : `${h} hr`;
}

export function secondsLabel(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || name;
}

export function pluralize(n: number, one: string, many = `${one}s`): string {
  return n === 1 ? one : many;
}

export function countLabel(n: number, one: string, many = `${one}s`): string {
  return `${n.toLocaleString('en-US')} ${pluralize(n, one, many)}`;
}

/** Oxford-comma list. */
export function listJoin(items: string[], conj = 'and'): string {
  const clean = items.filter(Boolean);
  if (!clean.length) return '';
  if (clean.length === 1) return clean[0];
  // Some catalog names contain the conjunction ("Geometry and Trigonometry"),
  // and "A and B and C" is unreadable — fall back to a comma in that case.
  const collides = clean.some((i) => new RegExp(`\\b${conj}\\b`, 'i').test(i));
  if (clean.length === 2) return collides ? `${clean[0]}, ${clean[1]}` : `${clean[0]} ${conj} ${clean[1]}`;
  return `${clean.slice(0, -1).join(', ')}, ${collides ? '' : `${conj} `}${clean[clean.length - 1]}`;
}

export function titleCase(s: string): string {
  return s.replace(/\w\S*/g, (w) => w[0].toUpperCase() + w.slice(1).toLowerCase());
}

/** `application-planning` → `Application planning`. */
export function humanizeKey(s: string): string {
  const spaced = s.replace(/[-_]/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2');
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export function round(n: number, digits = 0): number {
  const f = 10 ** digits;
  return Math.round(n * f) / f;
}

/** SAT scores round to the nearest 10. */
export function roundSat(n: number): number {
  return clamp(Math.round(n / 10) * 10, 400, 1600);
}

export function roundSatSection(n: number): number {
  return clamp(Math.round(n / 10) * 10, 200, 800);
}

export function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export function truncate(s: string, max: number): string {
  return s.length <= max ? s : `${s.slice(0, max - 1).trimEnd()}…`;
}

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function wordCount(s: string): number {
  return s.trim() ? s.trim().split(/\s+/).length : 0;
}

/** Deduplicate while keeping order. */
export function uniq<T>(items: readonly T[]): T[] {
  return Array.from(new Set(items));
}

export function groupBy<T, K extends string | number>(items: readonly T[], key: (item: T) => K): Record<K, T[]> {
  const out = {} as Record<K, T[]>;
  for (const item of items) {
    const k = key(item);
    (out[k] ||= []).push(item);
  }
  return out;
}

export function sum(items: readonly number[]): number {
  return items.reduce((a, b) => a + b, 0);
}

export function average(items: readonly number[]): number {
  return items.length ? sum(items) / items.length : 0;
}

export function sortBy<T>(items: readonly T[], ...keys: ((item: T) => number | string)[]): T[] {
  return items.slice().sort((a, b) => {
    for (const k of keys) {
      const av = k(a);
      const bv = k(b);
      if (av < bv) return -1;
      if (av > bv) return 1;
    }
    return 0;
  });
}
