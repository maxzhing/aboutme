import { llm } from '../llm/index.js';
import { renderPrompt, systemPrompt } from '../prompts.js';
import { insightsSchema } from '../schemas/index.js';
import { coerce } from './validate.js';
import { buildProfile, profileContext } from './profile.js';
import { MASTERY_LABELS } from './mastery.js';
import { describeDue, reviewUrgency } from './review.js';
import { logger } from '../util/log.js';

const log = logger('insights');
const cache = new Map(); // learnerId -> { key, value, at }
const TTL_MS = 5 * 60 * 1000;

/**
 * Cheap, immediate signals computed from the learner model with no model call.
 * The dashboard renders these instantly; the generated analysis arrives after.
 */
export function localSignals(profile) {
  const signals = [];
  const due = profile.due.filter((c) => reviewUrgency(c) > 0);

  if (due.length) {
    signals.push({
      kind: 'review',
      title: `${due.length} concept${due.length > 1 ? 's' : ''} due for review`,
      detail: due.slice(0, 3).map((c) => `${c.name} (${describeDue(c)})`).join(', '),
      action: { label: 'Start review', kind: 'review', topic: due[0].name },
    });
  }

  const weakest = profile.concepts
    .filter((c) => c.attempts >= 2 && c.mastery_level <= 2)
    .sort((a, b) => a.correct / a.attempts - b.correct / b.attempts)[0];
  if (weakest) {
    signals.push({
      kind: 'weakness',
      title: `${weakest.name} is your weakest tracked concept`,
      detail: `${Math.round((weakest.correct / weakest.attempts) * 100)}% correct across ${weakest.attempts} attempts — ${MASTERY_LABELS[weakest.mastery_level].toLowerCase()}.`,
      action: { label: 'Fix this', kind: 'lesson', topic: weakest.name },
    });
  }

  const repeated = profile.misconceptions.filter((m) => m.count >= 2)[0];
  if (repeated) {
    signals.push({
      kind: 'misconception',
      title: `Same mistake ${repeated.count} times: "${repeated.label}"`,
      detail: 'Repeating practice at the same level will not clear this — it needs re-teaching.',
      action: { label: 'Re-teach it', kind: 'lesson', topic: repeated.label },
    });
  }

  const ready = profile.concepts.find((c) => c.mastery_level === 4 && c.streak >= 2);
  if (ready) {
    signals.push({
      kind: 'ready',
      title: `${ready.name} is close to mastered`,
      detail: 'One transfer problem at difficulty 4+ would settle it.',
      action: { label: 'Mastery check', kind: 'mastery_check', topic: ready.name },
    });
  }

  return signals;
}

/** Generated analysis of the learner's history. Cached briefly. */
export async function generateInsights(learnerId, { force = false } = {}) {
  const profile = buildProfile(learnerId);
  const key = `${profile.attempts.length}:${profile.attempts[0]?.id || 'none'}:${profile.misconceptions.length}`;
  const hit = cache.get(learnerId);
  if (!force && hit && hit.key === key && Date.now() - hit.at < TTL_MS) return hit.value;

  if (profile.attempts.length < 3) {
    const value = {
      headline:
        profile.attempts.length === 0
          ? 'No performance data yet — answer a few questions and the analysis starts here.'
          : 'Not enough attempts yet to see a pattern.',
      patterns: [],
      recommended: [],
      local: localSignals(profile),
    };
    cache.set(learnerId, { key, value, at: Date.now() });
    return value;
  }

  try {
    const { object } = await llm().run({
      label: 'insights',
      system: [{ text: systemPrompt(), cache: true }],
      messages: [
        {
          role: 'user',
          content: renderPrompt('insights', {
            learner_context: profileContext(profile),
            attempts: profile.attempts
              .slice(0, 25)
              .map(
                (a) =>
                  `${a.created_at.slice(0, 16)} · ${a.concept_name} · d${a.difficulty} · ${a.verdict}` +
                  `${a.error_type && a.error_type !== 'none' ? ` · ${a.error_type}` : ''}` +
                  `${a.misconception ? ` · "${a.misconception}"` : ''}` +
                  `${a.elapsed_ms ? ` · ${Math.round(a.elapsed_ms / 1000)}s` : ''}`,
              )
              .join('\n'),
            misconceptions: profile.misconceptions
              .map((m) => `${m.label} (×${m.count}, ${m.error_type || 'unclassified'})`)
              .join('\n') || '(none open)',
          }),
        },
      ],
      schema: insightsSchema,
      effort: 'medium',
      maxTokens: 4000,
    });
    const value = { ...coerce(object, insightsSchema), local: localSignals(profile) };
    cache.set(learnerId, { key, value, at: Date.now() });
    return value;
  } catch (err) {
    log.warn(`insight generation failed: ${err.message}`);
    return { headline: '', patterns: [], recommended: [], local: localSignals(profile), error: err.message };
  }
}

export function clearInsightCache(learnerId) {
  if (learnerId) cache.delete(learnerId);
  else cache.clear();
}
