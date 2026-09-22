import type { Difficulty, ErrorPattern, PracticeQuestion, QuestionAttempt } from '@/domain/types';
import { ALL_QUESTIONS, QUESTION_BY_ID, SAT_QUESTIONS } from '@/data/questions';
import { AP_COURSE_BY_ID } from '@/data/ap';
import { average, clamp, countLabel, listJoin, percent } from '@/lib/format';
import { seededRandom } from '@/lib/id';
import type { EngineContext } from './context';

/* ==========================================================================
   Adaptive practice, weakness tracking and error patterns
   Sections 16, 19, 20. Everything here is computed from real attempt records —
   the app never claims a pattern it cannot point at attempts for.
   ========================================================================== */

export interface TopicStat {
  key: string;
  label: string;
  attempted: number;
  correct: number;
  accuracy: number;
  /** Median seconds, which is more robust than mean for timing. */
  medianSec: number;
  /** Target time from the questions themselves. */
  targetSec: number;
  band: 'strong' | 'solid' | 'shaky' | 'weak' | 'untested';
}

function bandFor(accuracy: number, attempted: number): TopicStat['band'] {
  if (attempted < 2) return 'untested';
  if (accuracy >= 85) return 'strong';
  if (accuracy >= 70) return 'solid';
  if (accuracy >= 55) return 'shaky';
  return 'weak';
}

function median(values: number[]): number {
  if (!values.length) return 0;
  const sorted = values.slice().sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

export function topicStats(
  attempts: QuestionAttempt[],
  groupBy: (q: PracticeQuestion) => string | undefined,
  labelFor: (key: string) => string = (k) => k,
): TopicStat[] {
  const buckets = new Map<string, { attempts: QuestionAttempt[]; targets: number[] }>();
  for (const attempt of attempts) {
    const q = QUESTION_BY_ID.get(attempt.questionId);
    if (!q) continue;
    const key = groupBy(q);
    if (!key) continue;
    const bucket = buckets.get(key) ?? { attempts: [], targets: [] };
    bucket.attempts.push(attempt);
    bucket.targets.push(q.timeTargetSec);
    buckets.set(key, bucket);
  }
  return Array.from(buckets.entries())
    .map(([key, { attempts: list, targets }]) => {
      const graded = list.filter((a) => a.correct !== null);
      const correct = graded.filter((a) => a.correct).length;
      const accuracy = graded.length ? Math.round((correct / graded.length) * 100) : 0;
      return {
        key,
        label: labelFor(key),
        attempted: list.length,
        correct,
        accuracy,
        medianSec: median(list.map((a) => a.elapsedSec)),
        targetSec: Math.round(average(targets)),
        band: bandFor(accuracy, graded.length),
      };
    })
    .sort((a, b) => a.accuracy - b.accuracy);
}

export function satStats(ctx: EngineContext) {
  const attempts = ctx.account.attempts.filter((a) => a.exam === 'SAT');
  return {
    byDomain: topicStats(attempts, (q) => q.domain),
    bySkill: topicStats(attempts, (q) => q.skill),
    byDifficulty: topicStats(attempts, (q) => q.difficulty, (k) => k.charAt(0).toUpperCase() + k.slice(1)),
    bySection: topicStats(
      attempts,
      (q) => q.satSection,
      (k) => (k === 'math' ? 'Math' : 'Reading & Writing'),
    ),
    total: attempts.length,
    accuracy: attempts.length
      ? Math.round((attempts.filter((a) => a.correct).length / attempts.filter((a) => a.correct !== null).length) * 100)
      : 0,
  };
}

export function apStats(ctx: EngineContext, courseId?: string) {
  const attempts = ctx.account.attempts.filter((a) => {
    if (a.exam !== 'AP') return false;
    if (!courseId) return true;
    return QUESTION_BY_ID.get(a.questionId)?.courseId === courseId;
  });
  return {
    byUnit: topicStats(
      attempts,
      (q) => q.unitId,
      (unitId) => {
        for (const course of AP_COURSE_BY_ID.values()) {
          const unit = course.units.find((u) => u.id === unitId);
          if (unit) return `Unit ${unit.number}: ${unit.title}`;
        }
        return unitId;
      },
    ),
    byCourse: topicStats(attempts, (q) => q.courseId, (id) => AP_COURSE_BY_ID.get(id)?.name ?? id),
    byConcept: topicStats(attempts, (q) => q.concept),
    total: attempts.length,
  };
}

/* -------------------------------------------------------------------------
   Error patterns — claims must be backed by specific attempts
   ---------------------------------------------------------------------- */

export function errorPatterns(ctx: EngineContext, scope: 'SAT' | 'AP' = 'SAT'): ErrorPattern[] {
  const attempts = ctx.account.attempts.filter((a) => a.exam === scope && a.correct === false);
  const patterns: ErrorPattern[] = [];

  // 1. Repeated commonError text across missed questions.
  const byError = new Map<string, QuestionAttempt[]>();
  for (const a of attempts) {
    const q = QUESTION_BY_ID.get(a.questionId);
    if (!q?.commonError) continue;
    byError.set(q.commonError, [...(byError.get(q.commonError) ?? []), a]);
  }
  for (const [error, list] of byError) {
    if (list.length < 2) continue;
    patterns.push({
      id: `err-${error.slice(0, 24)}`,
      statement: error,
      scope,
      evidenceAttemptIds: list.map((a) => a.id),
      confidence: list.length >= 4 ? 'high' : 'medium',
    });
  }

  // 2. Timing: accurate but slow on a specific domain.
  const domains = topicStats(ctx.account.attempts.filter((a) => a.exam === scope), (q) => q.domain);
  for (const d of domains) {
    if (d.attempted < 3) continue;
    if (d.accuracy >= 70 && d.medianSec > d.targetSec * 1.3) {
      patterns.push({
        id: `slow-${d.key}`,
        statement: `You understand ${d.label} but spend about ${Math.round(d.medianSec / d.targetSec * 100 - 100)}% longer than the target time on it. On a timed test that costs you questions elsewhere.`,
        scope: d.label,
        evidenceAttemptIds: ctx.account.attempts
          .filter((a) => QUESTION_BY_ID.get(a.questionId)?.domain === d.key)
          .map((a) => a.id),
        confidence: d.attempted >= 6 ? 'high' : 'medium',
      });
    }
    if (d.accuracy < 55 && d.medianSec < d.targetSec * 0.7 && d.attempted >= 3) {
      patterns.push({
        id: `fast-${d.key}`,
        statement: `On ${d.label} you answer faster than the target time but get most of them wrong. That usually means you are recognising the topic and not reading the question.`,
        scope: d.label,
        evidenceAttemptIds: ctx.account.attempts
          .filter((a) => QUESTION_BY_ID.get(a.questionId)?.domain === d.key)
          .map((a) => a.id),
        confidence: 'medium',
      });
    }
  }

  // 3. Repeated misses on the same concept, even when the wording differs.
  const byConcept = new Map<string, QuestionAttempt[]>();
  for (const a of attempts) {
    const q = QUESTION_BY_ID.get(a.questionId);
    if (!q) continue;
    byConcept.set(q.concept, [...(byConcept.get(q.concept) ?? []), a]);
  }
  for (const [concept, list] of byConcept) {
    if (list.length < 2) continue;
    if (patterns.some((p) => p.statement.toLowerCase().includes(concept.toLowerCase()))) continue;
    patterns.push({
      id: `concept-${concept.slice(0, 24)}`,
      statement: `${concept} has come up ${list.length} times and you have missed it every time. This is a concept gap rather than a careless-error problem — worth re-learning rather than re-practising.`,
      scope: concept,
      evidenceAttemptIds: list.map((a) => a.id),
      confidence: list.length >= 3 ? 'high' : 'medium',
    });
  }

  // 4. Difficulty cliff: fine on easy and medium, falls apart on hard.
  const byDifficulty = topicStats(ctx.account.attempts.filter((a) => a.exam === scope), (q) => q.difficulty);
  const easy = byDifficulty.find((d) => d.key === 'easy');
  const medium = byDifficulty.find((d) => d.key === 'medium');
  const hard = byDifficulty.find((d) => d.key === 'hard');
  if (hard && hard.attempted >= 3 && (easy || medium)) {
    const baseline = Math.max(easy?.accuracy ?? 0, medium?.accuracy ?? 0);
    if (baseline - hard.accuracy >= 30) {
      patterns.push({
        id: 'difficulty-cliff',
        statement: `You are at ${percent(baseline)} on easier questions but ${percent(hard.accuracy)} on hard ones. That gap usually means the underlying skill is there and the multi-step versions are what break down — practise fewer, harder questions rather than more of the same.`,
        scope,
        evidenceAttemptIds: ctx.account.attempts
          .filter((a) => QUESTION_BY_ID.get(a.questionId)?.difficulty === 'hard')
          .map((a) => a.id),
        confidence: hard.attempted >= 6 ? 'high' : 'medium',
      });
    }
  }

  // 5. Hint dependence.
  const graded = ctx.account.attempts.filter((a) => a.exam === scope && a.correct !== null);
  const withHint = graded.filter((a) => a.usedHint);
  if (graded.length >= 10 && withHint.length / graded.length > 0.4) {
    patterns.push({
      id: 'hint-dependence',
      statement: `You use the hint on ${percent((withHint.length / graded.length) * 100)} of questions. Try one full attempt before opening it — the hint is more useful after you are stuck for a reason.`,
      scope,
      evidenceAttemptIds: withHint.map((a) => a.id),
      confidence: 'medium',
    });
  }

  return patterns.slice(0, 6);
}

/* -------------------------------------------------------------------------
   Adaptive question selection
   ---------------------------------------------------------------------- */

export interface SelectOptions {
  exam: 'SAT' | 'AP';
  courseId?: string;
  unitId?: string;
  section?: 'math' | 'reading-writing';
  domains?: string[];
  difficulties?: Difficulty[];
  count: number;
  /** 'adaptive' targets weak areas; 'review' revisits misses; 'new' avoids seen items. */
  strategy?: 'adaptive' | 'review' | 'new' | 'mixed';
  /** Target total minutes, used by the timed drills. */
  minutes?: number;
}

export function selectQuestions(ctx: EngineContext, options: SelectOptions): PracticeQuestion[] {
  const { exam, courseId, unitId, section, domains, difficulties, strategy = 'adaptive' } = options;
  const attempts = ctx.account.attempts;
  const attemptsByQuestion = new Map<string, QuestionAttempt[]>();
  for (const a of attempts) attemptsByQuestion.set(a.questionId, [...(attemptsByQuestion.get(a.questionId) ?? []), a]);

  const pool = (exam === 'SAT' ? SAT_QUESTIONS : ALL_QUESTIONS.filter((q) => q.exam === 'AP')).filter((q) => {
    if (exam === 'AP' && courseId && q.courseId !== courseId) return false;
    if (unitId && q.unitId !== unitId) return false;
    if (section && q.satSection !== section) return false;
    if (domains?.length && !domains.includes(q.domain)) return false;
    if (difficulties?.length && !difficulties.includes(q.difficulty)) return false;
    return true;
  });

  // Accuracy per domain drives adaptive weighting.
  const domainAccuracy = new Map<string, number>();
  for (const stat of topicStats(attempts.filter((a) => a.exam === exam), (q) => q.domain)) {
    domainAccuracy.set(stat.key, stat.accuracy);
  }

  const rand = seededRandom(`${ctx.profile.id}:${strategy}:${attempts.length}`);

  const scored = pool.map((q) => {
    const prior = attemptsByQuestion.get(q.id) ?? [];
    const lastAttempt = prior[prior.length - 1];
    let weight = 1;

    switch (strategy) {
      case 'review':
        weight = lastAttempt?.correct === false ? 6 : lastAttempt ? 0.4 : 0.2;
        break;
      case 'new':
        weight = prior.length ? 0.05 : 4;
        break;
      case 'mixed':
        weight = prior.length ? 1 : 2;
        break;
      default: {
        // Adaptive: favour weak domains and unseen items, avoid immediate repeats.
        const acc = domainAccuracy.get(q.domain);
        const weakness = acc === undefined ? 1.6 : clamp((100 - acc) / 40, 0.3, 2.6);
        const novelty = prior.length === 0 ? 2 : lastAttempt?.correct ? 0.35 : 1.6;
        // Step difficulty toward the student's edge rather than always hardest.
        const difficultyFit =
          acc === undefined
            ? q.difficulty === 'medium' ? 1.4 : 1
            : acc >= 80
              ? q.difficulty === 'hard' ? 1.8 : q.difficulty === 'medium' ? 1 : 0.4
              : acc >= 60
                ? q.difficulty === 'medium' ? 1.7 : 1
                : q.difficulty === 'easy' ? 1.7 : q.difficulty === 'medium' ? 1.1 : 0.5;
        weight = weakness * novelty * difficultyFit;
      }
    }
    return { q, weight: weight * (0.85 + rand() * 0.3) };
  });

  scored.sort((a, b) => b.weight - a.weight);

  // Time-budgeted selection when minutes are specified.
  if (options.minutes) {
    const budget = options.minutes * 60;
    const out: PracticeQuestion[] = [];
    let used = 0;
    for (const { q } of scored) {
      if (used + q.timeTargetSec > budget * 1.08) continue;
      out.push(q);
      used += q.timeTargetSec;
      if (used >= budget * 0.92) break;
    }
    return out.length ? out : scored.slice(0, Math.max(1, options.count)).map((s) => s.q);
  }

  // Keep domain variety in the top of the list rather than 10 of one skill.
  const out: PracticeQuestion[] = [];
  const perDomain = new Map<string, number>();
  const maxPerDomain = Math.max(2, Math.ceil(options.count / 3));
  for (const { q } of scored) {
    const used = perDomain.get(q.domain) ?? 0;
    if (used >= maxPerDomain && out.length < options.count) continue;
    out.push(q);
    perDomain.set(q.domain, used + 1);
    if (out.length >= options.count) break;
  }
  if (out.length < options.count) {
    for (const { q } of scored) {
      if (out.includes(q)) continue;
      out.push(q);
      if (out.length >= options.count) break;
    }
  }
  return out;
}

/* -------------------------------------------------------------------------
   SAT score projection — explicitly not a prediction of a real test result
   ---------------------------------------------------------------------- */

export interface ScoreProjection {
  mathAccuracy?: number;
  verbalAccuracy?: number;
  note: string;
  caveat: string;
  trend?: { from: number; to: number; delta: number; span: string };
}

export function satProjection(ctx: EngineContext): ScoreProjection {
  const stats = satStats(ctx);
  const math = stats.bySection.find((s) => s.key === 'math');
  const verbal = stats.bySection.find((s) => s.key === 'reading-writing');
  const scores = ctx.account.satScores;

  let trend: ScoreProjection['trend'];
  if (scores.length >= 2) {
    const first = scores[0];
    const last = scores[scores.length - 1];
    trend = {
      from: first.total,
      to: last.total,
      delta: last.total - first.total,
      span: `${countLabel(scores.length, 'practice test')} between ${first.date} and ${last.date}`,
    };
  }

  const parts: string[] = [];
  if (math?.attempted) parts.push(`${percent(math.accuracy)} on ${countLabel(math.attempted, 'Math question')}`);
  if (verbal?.attempted) parts.push(`${percent(verbal.accuracy)} on ${countLabel(verbal.attempted, 'Reading & Writing question')}`);

  return {
    mathAccuracy: math?.accuracy,
    verbalAccuracy: verbal?.accuracy,
    note: parts.length ? `You are currently at ${listJoin(parts)} in this question bank.` : 'Answer some practice questions to see where you stand.',
    caveat:
      'Practice accuracy in this bank is not a score prediction. Only a full, timed, official practice test gives a number worth acting on, and even that does not guarantee a real test result.',
    trend,
  };
}
