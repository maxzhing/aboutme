import type { AnswerConfidence, SrsCard } from '../types';
import { DAY } from '../util';

/**
 * Review scheduling (SM-2 style) that listens to more than right or wrong:
 * - Confidence: right and sure pushes a card out fastest; right but unsure grows slowly; a lucky guess
 *   comes back in a day or two; wrong while SURE marks a likely misconception, which is reviewed first.
 * - Consistency: unless at least 70% of the last five answers were known (right and not guessed), the
 *   card stays on a short leash (at most 4 days) until it is answered right reliably.
 * - Hints: a right answer that needed hints counts as half a success.
 * Without a confidence answer it behaves like plain SM-2.
 */
export function schedule(card: SrsCard | undefined, correct: boolean, clean: boolean, now: number, confidence?: AnswerConfidence): SrsCard {
  const c: SrsCard = card ? { ...card } : { due: now, interval: 0, ease: 2.3, reps: 0, lapses: 0 };
  const mark = !correct ? (confidence === 'sure' ? 'X' : 'x') : confidence === 'guess' ? 'G' : confidence === 'unsure' ? 'U' : 'S';
  c.hist = `${c.hist ?? ''}${mark}`.slice(-6);
  if (!correct) {
    c.reps = 0; c.lapses += 1; c.interval = 1;
    c.ease = Math.max(1.3, c.ease - (confidence === 'sure' ? 0.3 : 0.2));
    if (confidence === 'sure') c.misconception = true;
  } else if (confidence === 'guess') {
    // right, but by luck: not evidence of knowing it
    c.reps = 0; c.interval = 2;
  } else {
    c.reps += 1;
    c.interval = c.reps === 1 ? 2 : c.reps === 2 ? 5 : Math.round(c.interval * c.ease);
    if (!clean) c.interval = Math.max(1, Math.round(c.interval / 2));
    else if (confidence === 'unsure') c.interval = Math.max(1, Math.round(c.interval * 0.6));
    else c.ease = Math.min(2.8, c.ease + 0.1);
    // a misconception clears only after two sure, right answers in a row
    if (c.misconception && c.hist.endsWith('SS')) c.misconception = false;
  }
  // consistency: unless at least 70% of the last five were known (right, not guessed), keep it close
  const last = c.hist.slice(-5);
  if (last.length >= 3 && [...last].filter((m) => m === 'S' || m === 'U').length < Math.ceil(last.length * 0.7)) c.interval = Math.min(c.interval, 4);
  c.interval = Math.min(c.interval, 60);
  c.due = now + c.interval * DAY;
  return c;
}

/** Cards due now, likely misconceptions first, then the most overdue relative to their interval. */
export const dueIds = (cards: Record<string, SrsCard>, now: number) =>
  Object.entries(cards).filter(([, c]) => c.due <= now)
    .sort((a, b) => Number(!!b[1].misconception) - Number(!!a[1].misconception) || (now - b[1].due) / Math.max(1, b[1].interval) - (now - a[1].due) / Math.max(1, a[1].interval))
    .map(([id]) => id);
