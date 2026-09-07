import { expectedScore } from './difficulty.js';

/**
 * Exam readiness.
 *
 * The question this answers is not "how much have you done" but "if you sat the
 * exam today, what would you score, and what is the shortest path to the score
 * you want". Everything here is derived from demonstrated performance:
 *
 *   1. Per concept, estimate the probability of getting an exam-level item on
 *      that concept right, from the learner's ability estimate against the
 *      difficulty the exam actually asks at.
 *   2. Roll concepts up to a unit, weighted by how central each concept is.
 *   3. Roll units up to a paper, weighted by the exam blueprint — a unit worth
 *      4% of the paper cannot move your score much however shaky it is.
 *   4. Attach a confidence interval driven by how much evidence exists, so a
 *      prediction from three attempts is not dressed up as a measurement.
 *   5. Rank units by *marginal points available*, which is what tells a learner
 *      where the next hour actually goes.
 */

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/** How much a concept counts toward its unit. */
const CRITICALITY_WEIGHT = { core: 1, important: 0.65, peripheral: 0.3 };

/** What an untaught concept scores: a blind guess on a multiple-choice paper. */
const UNTAUGHT_FLOOR = 0.15;

/** The difficulty an exam actually asks at when the blueprint does not say. */
const DEFAULT_EXAM_DIFFICULTY = 3.5;

/**
 * Probability this learner answers an exam-level item on `concept` correctly.
 * With no attempts, the mastery level alone gives a weak prior; with attempts,
 * the ability estimate carries it.
 */
export function conceptExpectation(concept, examDifficulty = DEFAULT_EXAM_DIFFICULTY) {
  if (!concept) return { p: UNTAUGHT_FLOOR, confidence: 0, attempts: 0 };

  const attempts = concept.attempts ?? 0;
  // Confidence saturates: three attempts is a signal, twelve is a measurement.
  const confidence = 1 - Math.exp(-attempts / 4);

  // Introduced-but-untested sits a little above a blind guess, not much.
  const prior = clamp(UNTAUGHT_FLOOR + 0.06 * clamp(concept.mastery_level ?? 0, 0, 5), 0, 1);
  if (attempts === 0) return { p: prior, confidence: 0, attempts: 0 };

  const modelled = expectedScore(concept.ability ?? 2, examDifficulty);
  const observed = clamp((concept.correct ?? 0) / attempts, 0, 1);
  // Blend the ability model with raw accuracy, trusting accuracy more as
  // attempts accumulate.
  const blend = clamp(attempts / (attempts + 5), 0, 0.8);
  let p = clamp(modelled * (1 - blend) + observed * blend, UNTAUGHT_FLOOR, 0.99);

  // Demonstrated failure must never project better than never having tried.
  // Two things lag a run of wrong answers: the ability estimate, which moves in
  // steps, and the mastery level, which counts an attempt as exposure. Without
  // this guard a learner who has just got four questions wrong out-projects the
  // same learner who has never seen the concept — evidence of not knowing
  // something reading as progress. Accuracy below the guess rate caps the
  // projection at the guess rate, whatever the model would otherwise say.
  if (observed < UNTAUGHT_FLOOR) p = Math.min(p, UNTAUGHT_FLOOR);

  return { p, confidence, attempts };
}

/** Roll a unit's concepts up into one expected accuracy. */
export function unitReadiness(unit, conceptLookup, examDifficulty = DEFAULT_EXAM_DIFFICULTY) {
  const concepts = unit.concepts || [];
  let weighted = 0;
  let confidenceWeighted = 0;
  let total = 0;
  const detail = [];

  for (const spec of concepts) {
    const weight = CRITICALITY_WEIGHT[spec.criticality] ?? CRITICALITY_WEIGHT.important;
    const tracked = conceptLookup(spec.name);
    const { p, confidence, attempts } = conceptExpectation(tracked, spec.difficulty || examDifficulty);
    weighted += weight * p;
    confidenceWeighted += weight * confidence;
    total += weight;
    detail.push({
      name: spec.name,
      criticality: spec.criticality || 'important',
      mastery_level: tracked?.mastery_level ?? 0,
      attempts,
      expected: p,
      confidence,
      weight,
    });
  }

  const expected = total ? weighted / total : UNTAUGHT_FLOOR;
  const confidence = total ? confidenceWeighted / total : 0;
  return {
    idx: unit.idx,
    title: unit.title,
    exam_weight: Number(unit.exam_weight_percent) || 0,
    hours: Number(unit.hours) || 0,
    expected,
    confidence,
    concepts: detail.sort((a, b) => a.expected - b.expected),
    // Marginal points on the whole paper still available in this unit.
    points_available: ((Number(unit.exam_weight_percent) || 0) / 100) * (1 - expected) * 100,
  };
}

/** Turn a raw percentage into the exam's own score, using its published bands. */
export function bandFor(percent, bands = []) {
  const ordered = [...bands].sort((a, b) => b.min_percent - a.min_percent);
  for (const band of ordered) {
    if (percent * 100 >= band.min_percent) return band;
  }
  return ordered.at(-1) || { score: 1, min_percent: 0, meaning: '' };
}

/**
 * Full readiness for a course.
 *
 * `examResults` are real practice papers. When they exist the model is
 * calibrated against them — a prediction that disagrees with what the learner
 * actually scored last week should move toward reality, not defend itself.
 */
export function courseReadiness({ blueprint, conceptLookup, examResults = [], now = new Date() }) {
  const units = (blueprint.units || []).map((unit) => unitReadiness(unit, conceptLookup));
  const bands = blueprint.score_bands || [];

  const weightTotal = units.reduce((sum, u) => sum + u.exam_weight, 0) || 1;
  const modelledPercent = units.reduce((sum, u) => sum + u.exam_weight * u.expected, 0) / weightTotal;
  const confidence = units.reduce((sum, u) => sum + u.exam_weight * u.confidence, 0) / weightTotal;

  // Calibration: blend toward the most recent real paper, weighted by how
  // fresh it is. A paper sat today counts for more than one sat a month ago.
  let percent = modelledPercent;
  let calibratedOn = null;
  if (examResults.length) {
    const latest = examResults[0];
    const ageDays = (now.getTime() - new Date(latest.created_at).getTime()) / 86400000;
    const freshness = clamp(1 - ageDays / 21, 0, 1);
    const pull = 0.55 * freshness;
    percent = modelledPercent * (1 - pull) + latest.percent * pull;
    calibratedOn = { at: latest.created_at, percent: latest.percent, weight: pull };
  }

  // The interval is honest about thin evidence rather than hiding it.
  const margin = clamp(0.045 + (1 - confidence) * 0.17, 0.03, 0.22);
  const band = bandFor(percent, bands);
  const low = bandFor(clamp(percent - margin, 0, 1), bands);
  const high = bandFor(clamp(percent + margin, 0, 1), bands);

  const leverage = units
    .map((unit) => ({
      idx: unit.idx,
      title: unit.title,
      exam_weight: unit.exam_weight,
      expected: unit.expected,
      points_available: unit.points_available,
      weakest: unit.concepts.slice(0, 3).map((c) => c.name),
    }))
    .sort((a, b) => b.points_available - a.points_available);

  return {
    percent,
    modelled_percent: modelledPercent,
    confidence,
    margin,
    score: band.score,
    band,
    range: { low: low.score, high: high.score },
    calibrated_on: calibratedOn,
    units,
    leverage,
    bands,
  };
}

/**
 * The shortest path to a target score: take units in order of points available
 * until the projected total clears the target band's threshold.
 */
export function pathToScore(readiness, targetScore) {
  const target = readiness.bands.find((b) => b.score === targetScore);
  if (!target) return { reachable: false, gap: 0, units: [], targetPercent: null };

  const targetPercent = target.min_percent / 100;
  const gap = targetPercent - readiness.percent;
  if (gap <= 0) {
    return { reachable: true, alreadyThere: true, gap: 0, units: [], targetPercent };
  }

  // Getting a unit from where it is to strong-but-not-perfect is realistic;
  // assuming everyone reaches 100% on everything is not.
  const ACHIEVABLE = 0.9;
  const picked = [];
  let gained = 0;

  for (const unit of readiness.leverage) {
    if (gained >= gap) break;
    const headroom = (unit.exam_weight / 100) * Math.max(0, ACHIEVABLE - unit.expected);
    if (headroom <= 0.0005) continue;
    picked.push({ ...unit, gain: headroom });
    gained += headroom;
  }

  return {
    reachable: gained >= gap,
    alreadyThere: false,
    gap,
    gain: gained,
    units: picked,
    targetPercent,
  };
}

/**
 * Whether there is enough time left to get there, given how much of the course
 * is still genuinely unlearned.
 */
export function pacing(readiness, { examDate, minutesPerDay = 60, now = new Date() }) {
  const hoursRemaining = readiness.units.reduce(
    (sum, unit) => sum + (unit.hours || 2) * Math.max(0, 0.9 - unit.expected),
    0,
  );
  if (!examDate) {
    return { hoursRemaining, daysLeft: null, hoursPerDayNeeded: null, status: 'no_deadline' };
  }

  const daysLeft = Math.max(0, Math.ceil((new Date(examDate).getTime() - now.getTime()) / 86400000));
  const hoursPerDayNeeded = daysLeft > 0 ? hoursRemaining / daysLeft : Infinity;
  const available = minutesPerDay / 60;

  let status = 'on_track';
  if (daysLeft === 0) status = 'out_of_time';
  else if (hoursPerDayNeeded > available * 1.6) status = 'behind';
  else if (hoursPerDayNeeded > available) status = 'tight';

  return { hoursRemaining, daysLeft, hoursPerDayNeeded, available, status };
}

/**
 * The single most useful thing to do next.
 *
 * Order matters: forgetting old material costs more than not yet knowing new
 * material, and an unmeasured learner close to their exam needs a real paper
 * before any more targeted practice is worth planning.
 */
export function nextBestAction({ readiness, pace, dueCount, examTaken, targetScore = 5 }) {
  if (dueCount >= 3) {
    return {
      kind: 'review',
      title: `Clear ${dueCount} concepts before they decay`,
      why: 'Losing what you already had costs more marks than anything you have not learned yet.',
      resource: 'review',
    };
  }

  if (!examTaken && pace.daysLeft != null && pace.daysLeft <= 21) {
    return {
      kind: 'exam',
      title: 'Sit a full practice paper',
      why: `With ${pace.daysLeft} days left, the prediction needs calibrating against a real paper under real conditions.`,
      resource: 'exam',
    };
  }

  const target = readiness.bands.find((b) => b.score === targetScore);
  if (target && readiness.percent * 100 >= target.min_percent && !readiness.units.some((u) => u.expected < 0.75)) {
    return {
      kind: 'maintain',
      title: 'Hold the line with mixed retrieval',
      why: `You are already projecting a ${readiness.score}. Interleaved review protects it better than new content.`,
      resource: 'review',
    };
  }

  const unit = readiness.leverage[0];
  if (!unit) {
    return { kind: 'learn', title: 'Start the first unit', why: 'Nothing is underway yet.', resource: 'lesson' };
  }

  const untouched = readiness.units.find((u) => u.idx === unit.idx)?.concepts.every((c) => c.attempts === 0);
  return {
    kind: untouched ? 'learn' : unit.expected < 0.6 ? 'practice' : 'master',
    title: untouched
      ? `Learn ${unit.title}`
      : unit.expected < 0.6
        ? `Drill ${unit.title}`
        : `Prove ${unit.title}`,
    why:
      `${unit.title} is ${unit.exam_weight}% of the paper and you are projecting ` +
      `${Math.round(unit.expected * 100)}% on it — worth about ` +
      `${unit.points_available.toFixed(1)} marks of the total, more than anything else on the table.`,
    unit: unit.title,
    concepts: unit.weakest,
    resource: untouched ? 'lesson' : unit.expected < 0.6 ? 'practice_set' : 'mastery_check',
  };
}

export { CRITICALITY_WEIGHT, UNTAUGHT_FLOOR, DEFAULT_EXAM_DIFFICULTY };
