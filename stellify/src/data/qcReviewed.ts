/**
 * Quality-control flags a person has reviewed and decided to keep, with the reason. Keyed by
 * `kind|questionId|otherQuestionId`. Flags that pointed to real problems were fixed in the questions
 * instead (2026-11-18: m-c-circ-01 rewritten as a different reasoning challenge, the near-duplicate of
 * m-circ-03; m-c-infer-04 and m-c-claims-05 given distractors as long and careful as the key).
 */
export const QC_REVIEWED: Record<string, { on: string; note: string }> = {
  'duplicate|m-sys-01|m-sys-06': { on: '2026-11-18', note: 'Different systems and different questions; only the standard stem wording is shared.' },
  'duplicate|m-data1-05|m-x-data1-01': { on: '2026-11-18', note: 'Different questions about mean and median (effect of a change vs greatest possible value).' },
  'duplicate|m-trig-03|m-c-trig-01': { on: '2026-11-18', note: 'Related but different: height from a side vs perimeter from an altitude.' },
  'duplicate|m-circ-04|m-c-circ-03': { on: '2026-11-18', note: 'Sector angle in radians vs in degrees, with different numbers.' },
  'duplicate|m-circ-04|m-c-circ-04': { on: '2026-11-18', note: 'Sector area vs arc length.' },
  'similar-choices|r-cb-coet-02|': { on: '2026-11-18', note: 'Intentional: A and B differ only in which comparison they make (language vs shuffled text), which is exactly the skill tested.' },
};
