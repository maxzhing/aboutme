/**
 * Continuous ability estimate on the same 1..5 scale the generator uses for
 * question difficulty, updated Elo-style after every graded attempt.
 */
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/** Probability this learner answers an item of `difficulty` correctly. */
export function expectedScore(ability, difficulty) {
  return 1 / (1 + Math.exp(-1.15 * (ability - difficulty)));
}

/** Learning rate: move fast while we know little, slowly once the estimate settles. */
function learningRate(attempts) {
  return clamp(0.85 - 0.06 * attempts, 0.18, 0.85);
}

export function updateAbility(concept, { ratio, difficulty }) {
  const ability = concept.ability ?? 2;
  const expected = expectedScore(ability, difficulty);
  const k = learningRate(concept.attempts ?? 0);
  return clamp(ability + k * (ratio - expected), 1, 5);
}

/**
 * Choose the difficulty of the next item. Slightly above the ability estimate —
 * the desirable-difficulty zone — nudged by the current streak.
 */
export function nextDifficulty(concept, { streak = 0, lastErrorType = null } = {}) {
  const ability = concept?.ability ?? 2;
  let target = ability + 0.35;
  if (streak >= 3) target += 0.7;
  else if (streak === 2) target += 0.35;
  if (lastErrorType && ['conceptual', 'prerequisite_gap'].includes(lastErrorType)) target -= 1.0;
  else if (lastErrorType && lastErrorType !== 'none') target -= 0.4;
  return clamp(Math.round(target * 2) / 2, 1, 5);
}

/**
 * Read the recent attempt history and recommend how teaching should change.
 * This is what stops the tutor from repeating a strategy that is not working.
 */
export function recommendStrategy(recent = []) {
  const items = recent.slice(0, 8);
  if (!items.length) return { strategy: 'diagnose', reason: 'No performance data yet.' };

  const scored = items.map((a) => ({
    ok: (a.score ?? 0) / (a.max_score || 1) >= 0.8,
    ms: a.elapsed_ms ?? null,
    type: a.error_type,
  }));
  const wrong = scored.filter((s) => !s.ok);
  const accuracy = 1 - wrong.length / scored.length;
  const timed = scored.filter((s) => s.ms != null);
  const medianMs = timed.length
    ? timed.map((s) => s.ms).sort((a, b) => a - b)[Math.floor(timed.length / 2)]
    : null;

  const counts = {};
  for (const s of wrong) counts[s.type || 'conceptual'] = (counts[s.type || 'conceptual'] || 0) + 1;
  const [dominantType, dominantCount] = Object.entries(counts).sort((a, b) => b[1] - a[1])[0] || [];

  if (dominantCount >= 2 && ['conceptual', 'prerequisite_gap'].includes(dominantType)) {
    return {
      strategy: 'switch_representation',
      reason: `${dominantCount} recent misses share the same broken model (${dominantType}). Repeating the explanation will not fix it — change representation and re-teach from the prerequisite.`,
    };
  }
  if (dominantCount >= 2 && dominantType === 'transfer') {
    return {
      strategy: 'vary_surface',
      reason: 'They can do the familiar wording and not the unfamiliar one. Vary the surface story, hold the concept fixed.',
    };
  }
  if (accuracy >= 0.85 && medianMs != null && medianMs > 150000) {
    return {
      strategy: 'timed_practice',
      reason: 'Accurate but slow. Introduce a time constraint to build fluency.',
    };
  }
  if (accuracy < 0.5 && medianMs != null && medianMs < 25000) {
    return {
      strategy: 'slow_down',
      reason: 'Fast and wrong — answering before reasoning. Require a written justification before the answer.',
    };
  }
  if (accuracy >= 0.85) {
    return { strategy: 'advance', reason: 'Consistently correct. Raise difficulty or move to the next concept.' };
  }
  if (accuracy <= 0.4) {
    return { strategy: 'scaffold', reason: 'Struggling. Simplify, scaffold the steps, and rebuild confidence.' };
  }
  return { strategy: 'practice', reason: 'Mixed results. Keep practising at a similar level with targeted feedback.' };
}
