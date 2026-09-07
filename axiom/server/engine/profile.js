import {
  ensureLearner,
  listConcepts,
  listMisconceptions,
  recentAttempts,
  dueConcepts,
  listGoals,
  listSessions,
} from '../store.js';
import { MASTERY_LABELS, masteryGap } from './mastery.js';
import { describeDue } from './review.js';
import { recommendStrategy } from './difficulty.js';

const short = (s, n = 160) => (s && s.length > n ? `${s.slice(0, n - 1)}…` : s || '');

/**
 * The learner model, assembled for the model's context window.
 *
 * Deliberately narrow: learning state only. No personal details, no contact
 * information, nothing that is not evidence about what they can currently do.
 */
export function buildProfile(learnerId) {
  const learner = ensureLearner(learnerId);
  const concepts = listConcepts(learnerId);
  const attempts = recentAttempts(learnerId, 40);
  const misconceptions = listMisconceptions(learnerId, { openOnly: true, limit: 12 });
  const due = dueConcepts(learnerId);
  const goals = listGoals(learnerId).filter((g) => g.status === 'active');
  const sessions = listSessions(learnerId, 5);

  const bucket = (min, max) =>
    concepts.filter((c) => c.mastery_level >= min && c.mastery_level <= max);

  const subjects = [...new Set(concepts.map((c) => c.subject))];
  const strategy = recommendStrategy(attempts);

  const errorCounts = {};
  for (const a of attempts) {
    if (a.error_type && a.error_type !== 'none') {
      errorCounts[a.error_type] = (errorCounts[a.error_type] || 0) + 1;
    }
  }

  return {
    learner,
    concepts,
    subjects,
    mastered: bucket(5, 5),
    strong: bucket(4, 4),
    developing: bucket(2, 3),
    weak: concepts.filter((c) => c.attempts > 0 && c.mastery_level <= 2),
    misconceptions,
    due,
    goals,
    sessions,
    attempts,
    strategy,
    errorCounts,
    stats: {
      concepts: concepts.length,
      attempts: attempts.length,
      accuracy: attempts.length
        ? attempts.filter((a) => (a.score ?? 0) / (a.max_score || 1) >= 0.8).length / attempts.length
        : null,
      studyMinutes: Math.round(
        attempts.reduce((sum, a) => sum + (a.elapsed_ms || 0), 0) / 60000,
      ),
    },
  };
}

/** Serialise the learner model into the block the prompts inject. */
export function profileContext(profile, { focusConcepts = [] } = {}) {
  if (!profile) return '';
  const lines = [];
  const {
    concepts, misconceptions, due, goals, strategy, attempts, errorCounts, stats,
  } = profile;

  if (!concepts.length && !attempts.length) {
    return [
      '<learner_model>',
      'This is a new learner. Nothing is known about them yet — assume nothing about their',
      'level beyond what their request implies, and prefer a short diagnostic over a guess.',
      '</learner_model>',
    ].join('\n');
  }

  lines.push('<learner_model>');
  lines.push(
    `Overall: ${stats.concepts} concepts tracked, ${stats.attempts} recent attempts, ` +
      `${stats.accuracy == null ? 'no accuracy data' : `${Math.round(stats.accuracy * 100)}% recent accuracy`}.`,
  );

  const focus = new Set(focusConcepts.map((c) => String(c).toLowerCase()));
  const relevant = concepts
    .slice()
    .sort((a, b) => {
      const af = focus.has(a.name.toLowerCase()) ? 1 : 0;
      const bf = focus.has(b.name.toLowerCase()) ? 1 : 0;
      if (af !== bf) return bf - af;
      return new Date(b.updated_at) - new Date(a.updated_at);
    })
    .slice(0, 18);

  if (relevant.length) {
    lines.push('\nConcept state (level 0-5, ability = difficulty they can currently handle):');
    for (const c of relevant) {
      const acc = c.attempts ? `${Math.round((c.correct / c.attempts) * 100)}% of ${c.attempts}` : 'untested';
      lines.push(
        `- ${c.name} [${c.subject}] — ${c.mastery_level}/5 ${MASTERY_LABELS[c.mastery_level]}, ` +
          `ability ${c.ability.toFixed(1)}, ${acc}. ${masteryGap(c)}`,
      );
    }
  }

  if (misconceptions.length) {
    lines.push('\nOpen misconceptions (repeat these back only when relevant, and fix them):');
    for (const m of misconceptions.slice(0, 8)) {
      lines.push(`- "${m.label}"${m.count > 1 ? ` (seen ${m.count}×)` : ''}${m.detail ? ` — ${short(m.detail, 140)}` : ''}`);
    }
  }

  const topErrors = Object.entries(errorCounts).sort((a, b) => b[1] - a[1]).slice(0, 3);
  if (topErrors.length) {
    lines.push(
      `\nRecent error profile: ${topErrors.map(([k, v]) => `${k} ×${v}`).join(', ')}.`,
    );
  }

  if (attempts.length) {
    lines.push('\nMost recent attempts (newest first):');
    for (const a of attempts.slice(0, 6)) {
      const ratio = (a.score ?? 0) / (a.max_score || 1);
      lines.push(
        `- ${a.concept_name || 'unknown concept'} · ${ratio >= 0.8 ? 'correct' : ratio > 0 ? 'partial' : 'wrong'}` +
          `${a.error_type && a.error_type !== 'none' ? ` (${a.error_type})` : ''}` +
          `${a.misconception ? ` — ${short(a.misconception, 100)}` : ''}`,
      );
    }
  }

  if (due.length) {
    lines.push(
      `\nDue for review: ${due.slice(0, 6).map((c) => `${c.name} (${describeDue(c)})`).join(', ')}.`,
    );
  }

  if (goals.length) {
    lines.push(
      `\nActive goals: ${goals.map((g) => `${g.title}${g.target_date ? ` by ${g.target_date}` : ''}`).join('; ')}.`,
    );
  }

  if (strategy?.strategy && strategy.strategy !== 'diagnose') {
    lines.push(`\nRecommended teaching adjustment: ${strategy.strategy} — ${strategy.reason}`);
  }

  lines.push('</learner_model>');
  return lines.join('\n');
}

export function conceptContext(profile, names = []) {
  const wanted = names.map((n) => String(n).toLowerCase());
  return profile.concepts.filter((c) => wanted.includes(c.name.toLowerCase()));
}
