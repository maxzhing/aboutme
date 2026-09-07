/**
 * Helpers for writing course blueprints by hand.
 *
 * Everything in `curriculum/` is transcribed from the published course
 * framework for a real exam — unit titles, unit exam weightings, exam
 * structure. Where the awarding body publishes a weight as a range (AP does,
 * for almost every course) the blueprint stores the midpoint as the working
 * weight and keeps the published range alongside it, so the interface can show
 * the learner what was actually published rather than a number we invented.
 */

/** A concept: the smallest thing mastery is tracked against. */
export const c = (name, difficulty, criticality = 'important', prerequisites = []) => ({
  name,
  difficulty,
  criticality,
  prerequisites,
});

/** A unit. `weight` is either a number or a published `[min, max]` range. */
export function u(idx, title, weight, hours, summary, concepts, traps = []) {
  const range = Array.isArray(weight) ? weight : null;
  const percent = range ? (range[0] + range[1]) / 2 : weight;
  return {
    idx,
    title,
    summary,
    exam_weight_percent: Number(percent.toFixed(2)),
    published_weight: range ? `${range[0]}-${range[1]}%` : `${weight}%`,
    hours,
    concepts,
    exam_traps: traps.map(([trap, fix]) => ({ trap, fix })),
  };
}

/**
 * AP score bands.
 *
 * College Board does not publish the raw-score cutoffs; they are re-set each
 * year from the actual score distribution. These are the composite percentages
 * that have historically landed on each score for this exam, and they are
 * labelled as approximate wherever the learner sees them.
 */
export const apBands = ([five, four, three, two]) => [
  { score: 5, min_percent: five, meaning: 'Extremely well qualified' },
  { score: 4, min_percent: four, meaning: 'Well qualified' },
  { score: 3, min_percent: three, meaning: 'Qualified' },
  { score: 2, min_percent: two, meaning: 'Possibly qualified' },
  { score: 1, min_percent: 0, meaning: 'No recommendation' },
];

/**
 * Assemble a blueprint.
 *
 * Published weights are ranges, and the midpoints of a set of ranges do not
 * add to 100 — AP Chemistry's midpoints add to 89, because its ranges are
 * asymmetric and the real paper sits near the top of each one. The readiness
 * model needs weights that partition the paper, so the working weight is the
 * midpoint scaled to sum to 100, and `published_weight` keeps the range as
 * transcribed so the interface can show a learner what was actually published.
 */
export function course(spec) {
  const blueprint = {
    ...spec,
    source: spec.source || 'College Board course and exam description',
    verified: true,
  };

  const raw = blueprint.units.reduce((sum, unit) => sum + unit.exam_weight_percent, 0);
  for (const unit of blueprint.units) {
    unit.midpoint_weight = unit.exam_weight_percent;
    unit.exam_weight_percent = Number(((unit.exam_weight_percent * 100) / raw).toFixed(2));
  }
  blueprint.weight_total = Number(
    blueprint.units.reduce((sum, unit) => sum + unit.exam_weight_percent, 0).toFixed(2),
  );
  return blueprint;
}
