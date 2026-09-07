import { errorSeverity, needsReteach } from './errors.js';

export const MASTERY_LABELS = [
  'Not introduced',
  'Introduced',
  'Developing',
  'Competent',
  'Strong',
  'Mastered',
];

/**
 * The five things a learner has to be able to do before we are willing to call
 * a concept mastered. Reading a lesson only ever earns `introduced`.
 */
export const EVIDENCE_KINDS = ['recall', 'explain', 'solve', 'apply', 'transfer'];

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/** Map a question to the kind of evidence a correct answer provides. */
export function evidenceKindFor(question = {}) {
  const explicit = question.evidence;
  if (EVIDENCE_KINDS.includes(explicit)) return explicit;
  switch (question.type) {
    case 'flashcard':
    case 'fill_blank':
      return 'recall';
    case 'short_answer':
    case 'free_response':
    case 'essay':
      return question.transfer ? 'transfer' : 'explain';
    case 'numeric':
    case 'multi_step':
    case 'coding':
      return 'solve';
    case 'application':
    case 'scenario':
      return 'apply';
    case 'multiple_choice':
      return question.conceptual ? 'explain' : 'recall';
    default:
      return 'solve';
  }
}

/**
 * Fold one graded attempt into a concept's evidence + continuous mastery score.
 * `attempt`: { ratio 0..1, difficulty 1..5, errorType, evidence }
 */
export function applyEvidence(concept, attempt) {
  const evidence = { ...(concept.evidence || {}) };
  const kind = attempt.evidence || 'solve';
  const prior = evidence[kind] || { correct: 0, attempts: 0, bestDifficulty: 0 };
  const isCorrect = attempt.ratio >= 0.8;

  evidence[kind] = {
    correct: prior.correct + (isCorrect ? 1 : 0),
    attempts: prior.attempts + 1,
    bestDifficulty: isCorrect ? Math.max(prior.bestDifficulty, attempt.difficulty) : prior.bestDifficulty,
  };

  // Difficulty-weighted EWMA: a hard question moves the estimate more.
  const weight = clamp(0.18 + 0.07 * (attempt.difficulty - 1), 0.18, 0.46);
  const target = clamp(attempt.ratio * (0.72 + 0.07 * attempt.difficulty), 0, 1);
  const blended = (concept.mastery_score ?? 0) * (1 - weight) + target * weight;
  // The penalty is applied after blending, so a broken mental model costs more
  // than an arithmetic slip even when both scored zero.
  const penalty = attempt.ratio >= 0.8 ? 0 : errorSeverity(attempt.errorType) * 0.25;
  const score = clamp(blended - penalty, 0, 1);

  const attempts = (concept.attempts ?? 0) + 1;
  const correct = (concept.correct ?? 0) + (isCorrect ? 1 : 0);
  const streak = isCorrect ? (concept.streak ?? 0) + 1 : 0;

  return { ...concept, evidence, mastery_score: score, attempts, correct, streak };
}

/** Count evidence kinds demonstrated at or above a difficulty floor. */
function demonstrated(evidence = {}, minDifficulty = 1) {
  return EVIDENCE_KINDS.filter((k) => {
    const e = evidence[k];
    return e && e.correct > 0 && e.bestDifficulty >= minDifficulty;
  });
}

/**
 * Derive the discrete 0..5 mastery level. Deliberately conservative: level 5
 * requires breadth of evidence, hard items, and retention over time.
 */
export function computeMasteryLevel(concept, { retentionOk = false, masteryCheckPassed = false } = {}) {
  const attempts = concept.attempts ?? 0;
  const score = concept.mastery_score ?? 0;
  const introduced = concept.mastery_level >= 1 || attempts > 0;
  if (!introduced) return 0;
  if (attempts === 0) return 1;

  const accuracy = attempts ? (concept.correct ?? 0) / attempts : 0;
  const kinds = demonstrated(concept.evidence);
  const hardKinds = demonstrated(concept.evidence, 4);
  const canSolve = kinds.includes('solve') || kinds.includes('recall');
  const canApply = kinds.includes('apply') || kinds.includes('transfer');
  const canExplain = kinds.includes('explain');

  if (
    (masteryCheckPassed || (retentionOk && attempts >= 6)) &&
    score >= 0.82 &&
    accuracy >= 0.8 &&
    canSolve &&
    canApply &&
    (canExplain || kinds.includes('transfer')) &&
    hardKinds.length >= 1
  ) {
    return 5;
  }
  if (score >= 0.7 && accuracy >= 0.72 && attempts >= 4 && canSolve && (canApply || canExplain)) return 4;
  if (score >= 0.55 && accuracy >= 0.6 && attempts >= 3 && canSolve) return 3;
  if (score >= 0.3 || accuracy >= 0.4) return 2;
  return 1;
}

/** Human-readable reason the learner is not yet at the next level. */
export function masteryGap(concept) {
  const evidence = concept.evidence || {};
  const missing = EVIDENCE_KINDS.filter((k) => !(evidence[k] && evidence[k].correct > 0));
  const level = concept.mastery_level ?? 0;
  if (level >= 5) return 'Mastered — retention checks only from here.';
  if (level === 0) return 'Not started.';
  const parts = [];
  if (missing.includes('solve')) parts.push('solve a problem unaided');
  if (missing.includes('explain')) parts.push('explain it in your own words');
  if (missing.includes('apply')) parts.push('apply it in an unfamiliar context');
  if (missing.includes('transfer')) parts.push('transfer it to a different problem type');
  if (!parts.length) return 'Needs a harder item and a delayed retention check.';
  return `Still to demonstrate: ${parts.join(', ')}.`;
}

export { needsReteach };
