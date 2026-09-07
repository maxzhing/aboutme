/**
 * Spaced review. The stage ladder follows the classic expanding schedule
 * (learn → 1d → 3d → 7d → 14d → 30d) but each interval is scaled by an ease
 * factor that moves with demonstrated performance, so a shaky concept comes
 * back sooner and a solid one drifts further out.
 */
const LADDER = [0, 1, 3, 7, 14, 30, 60];

export const REVIEW_INTENT = [
  'Learn',
  'Quick review',
  'Practice',
  'Retrieval',
  'Mixed application',
  'Mastery check',
  'Retention check',
];

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const addDays = (from, days) => new Date(from.getTime() + days * 86400000);

/**
 * @param concept current concept row
 * @param quality 0..1 how well the last review/attempt went
 */
export function scheduleReview(concept, quality, at = new Date()) {
  const wasStage = concept.review_stage ?? 0;
  let ease = concept.ease ?? 2.3;

  if (quality >= 0.85) ease += 0.12;
  else if (quality >= 0.6) ease += 0.02;
  else if (quality >= 0.4) ease -= 0.15;
  else ease -= 0.32;
  ease = clamp(ease, 1.3, 3.0);

  let stage;
  if (quality < 0.5) stage = Math.max(0, wasStage - 1); // lapse: step back
  else if (quality < 0.75) stage = wasStage; // hold
  else stage = Math.min(LADDER.length - 1, wasStage + 1);

  const base = LADDER[stage] || 1;
  const days = stage === 0 ? 0.5 : clamp(base * (ease / 2.3), 0.5, 180);
  return {
    review_stage: stage,
    ease,
    interval_days: days,
    next_review_at: addDays(at, days).toISOString(),
    intent: REVIEW_INTENT[stage] || 'Retention check',
  };
}

/** First scheduling right after a concept is taught. */
export function scheduleFirstReview(at = new Date()) {
  return {
    review_stage: 1,
    ease: 2.3,
    interval_days: 1,
    next_review_at: addDays(at, 1).toISOString(),
    intent: 'Quick review',
  };
}

export function reviewUrgency(concept, at = new Date()) {
  if (!concept.next_review_at) return 0;
  const due = new Date(concept.next_review_at).getTime();
  const overdueDays = (at.getTime() - due) / 86400000;
  if (overdueDays < 0) return 0;
  const window = Math.max(1, concept.interval_days || 1);
  return clamp(overdueDays / window, 0, 3);
}

export function describeDue(concept, at = new Date()) {
  if (!concept.next_review_at) return null;
  const diffMs = new Date(concept.next_review_at).getTime() - at.getTime();
  const days = Math.round(diffMs / 86400000);
  if (diffMs <= 0) return days <= -1 ? `${Math.abs(days)}d overdue` : 'Due now';
  if (days === 0) return 'Due today';
  if (days === 1) return 'Due tomorrow';
  return `Due in ${days}d`;
}
