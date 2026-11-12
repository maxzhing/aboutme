import type { SrsCard } from '../types';
import { DAY } from '../util';

/** SM-2 style scheduling: correct answers push a card out at growing intervals; a miss resets it. */
export function schedule(card: SrsCard | undefined, correct: boolean, clean: boolean, now: number): SrsCard {
  const c: SrsCard = card ? { ...card } : { due: now, interval: 0, ease: 2.3, reps: 0, lapses: 0 };
  if (!correct) {
    c.reps = 0; c.lapses += 1; c.interval = 1; c.ease = Math.max(1.3, c.ease - 0.2);
  } else {
    c.reps += 1;
    c.interval = c.reps === 1 ? 2 : c.reps === 2 ? 5 : Math.round(c.interval * c.ease);
    if (!clean) c.interval = Math.max(1, Math.round(c.interval / 2));
    else c.ease = Math.min(2.8, c.ease + 0.1);
    c.interval = Math.min(c.interval, 60);
  }
  c.due = now + c.interval * DAY;
  return c;
}

export const dueIds = (cards: Record<string, SrsCard>, now: number) =>
  Object.entries(cards).filter(([, c]) => c.due <= now).sort((a, b) => a[1].due - b[1].due).map(([id]) => id);
