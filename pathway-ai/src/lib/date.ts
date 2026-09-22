import type { ISODate, ISOTime } from '@/domain/types';

export function nowISO(): ISOTime {
  return new Date().toISOString();
}

export function todayISO(): ISODate {
  return toISODate(new Date());
}

export function toISODate(d: Date): ISODate {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Parses `YYYY-MM-DD` in local time (avoids the UTC off-by-one of `new Date(str)`). */
export function parseISODate(iso: ISODate): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function addDays(iso: ISODate, days: number): ISODate {
  const d = parseISODate(iso);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

export function addMonths(iso: ISODate, months: number): ISODate {
  const d = parseISODate(iso);
  d.setMonth(d.getMonth() + months);
  return toISODate(d);
}

export function daysBetween(from: ISODate, to: ISODate): number {
  const a = parseISODate(from).getTime();
  const b = parseISODate(to).getTime();
  return Math.round((b - a) / 86_400_000);
}

export function daysUntil(iso: ISODate, from: ISODate = todayISO()): number {
  return daysBetween(from, iso);
}

/** Sunday-anchored week start. */
export function startOfWeek(iso: ISODate = todayISO()): ISODate {
  const d = parseISODate(iso);
  d.setDate(d.getDate() - d.getDay());
  return toISODate(d);
}

export function startOfMonth(iso: ISODate = todayISO()): ISODate {
  const d = parseISODate(iso);
  d.setDate(1);
  return toISODate(d);
}

export function endOfMonth(iso: ISODate = todayISO()): ISODate {
  const d = parseISODate(iso);
  d.setMonth(d.getMonth() + 1, 0);
  return toISODate(d);
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const MONTHS_SHORT = MONTHS.map((m) => m.slice(0, 3));
export const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const DAY_ABBR = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const DAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export function monthName(monthIndex1Based: number): string {
  return MONTHS[Math.max(0, Math.min(11, monthIndex1Based - 1))];
}

export function formatDate(iso?: ISODate, style: 'short' | 'medium' | 'long' | 'day' = 'medium'): string {
  if (!iso) return 'Not set';
  const d = parseISODate(iso);
  if (Number.isNaN(d.getTime())) return 'Not set';
  const m = d.getMonth();
  const day = d.getDate();
  const y = d.getFullYear();
  switch (style) {
    case 'short':
      return `${MONTHS_SHORT[m]} ${day}`;
    case 'long':
      return `${MONTHS[m]} ${day}, ${y}`;
    case 'day':
      return `${DAY_ABBR[d.getDay()]}, ${MONTHS_SHORT[m]} ${day}`;
    default:
      return `${MONTHS_SHORT[m]} ${day}, ${y}`;
  }
}

export function formatDateTime(isoTime?: ISOTime): string {
  if (!isoTime) return '';
  const d = new Date(isoTime);
  if (Number.isNaN(d.getTime())) return '';
  const h = d.getHours();
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${MONTHS_SHORT[d.getMonth()]} ${d.getDate()}, ${h12}:${mm} ${ampm}`;
}

/** "in 24 days" / "3 days ago" / "today". */
export function relativeDays(days: number): string {
  if (days === 0) return 'today';
  if (days === 1) return 'tomorrow';
  if (days === -1) return 'yesterday';
  if (days > 0) return `in ${days} days`;
  return `${Math.abs(days)} days ago`;
}

export function timeAgo(isoTime?: ISOTime): string {
  if (!isoTime) return '';
  const diff = Date.now() - new Date(isoTime).getTime();
  const mins = Math.round(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(toISODate(new Date(isoTime)), 'short');
}

/** Academic year label, e.g. "2025–26". Rolls over in July. */
export function academicYearLabel(iso: ISODate = todayISO()): string {
  const d = parseISODate(iso);
  const start = d.getMonth() >= 6 ? d.getFullYear() : d.getFullYear() - 1;
  return `${start}–${String(start + 1).slice(2)}`;
}

/** Grade → graduation year, and back. Assumes a July rollover. */
export function gradeToGradYear(grade: number, iso: ISODate = todayISO()): number {
  const d = parseISODate(iso);
  const academicStart = d.getMonth() >= 6 ? d.getFullYear() : d.getFullYear() - 1;
  return academicStart + (12 - grade) + 1;
}

export function gradYearToGrade(gradYear: number, iso: ISODate = todayISO()): number {
  const d = parseISODate(iso);
  const academicStart = d.getMonth() >= 6 ? d.getFullYear() : d.getFullYear() - 1;
  return 12 - (gradYear - academicStart - 1);
}

/** Calendar grid for a month, padded to whole weeks. */
export function monthGrid(iso: ISODate): { date: ISODate; inMonth: boolean }[] {
  const first = parseISODate(startOfMonth(iso));
  const last = parseISODate(endOfMonth(iso));
  const cells: { date: ISODate; inMonth: boolean }[] = [];
  const cursor = new Date(first);
  cursor.setDate(cursor.getDate() - cursor.getDay());
  const end = new Date(last);
  end.setDate(end.getDate() + (6 - end.getDay()));
  while (cursor <= end) {
    cells.push({ date: toISODate(cursor), inMonth: cursor.getMonth() === first.getMonth() });
    cursor.setDate(cursor.getDate() + 1);
  }
  return cells;
}

/**
 * Next occurrence of a month (1–12) on or after today, as a date.
 * Catalog entries often publish "applications open in March" and no year.
 */
export function nextOccurrenceOfMonth(month: number, day = 15, from: ISODate = todayISO()): ISODate {
  const f = parseISODate(from);
  const candidate = new Date(f.getFullYear(), month - 1, day);
  if (candidate < f) candidate.setFullYear(candidate.getFullYear() + 1);
  return toISODate(candidate);
}
