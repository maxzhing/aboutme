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
  'duplicate|m-area-n3|m-area-n22': { on: '2026-11-21', note: 'Same box shape, but n22 must first solve a cubic from the volume to get the side; n3 gives the dimensions.' },
  'duplicate|m-equiv-n23|m-equiv-n30': { on: '2026-11-21', note: 'Both match coefficients, but one is a cubic with two unknowns and the other a quadratic; different work and answers.' },
  'duplicate|m-ineq-n4|m-ineq-n17': { on: '2026-11-21', note: 'Same College Board template (one point in, one out), different inequalities, directions and bounds on k.' },
  'duplicate|m-ineq-n4|m-ineq-n20': { on: '2026-11-21', note: 'Same College Board template (one point in, one out), different inequalities; n20 bounds k from a strict inequality.' },
  'duplicate|m-lin1-n10|m-lin1-n19': { on: '2026-11-21', note: 'Both are infinitely-many-solutions items, but n19 has fractions on both sides and asks for a product; different setup.' },
  'duplicate|m-nleq-n19|m-nleq-n34': { on: '2026-11-21', note: 'Both use a zero discriminant, but n19 is a line-parabola system and n34 a single quadratic with k on the x^2 term.' },
  'duplicate|m-prob-03|m-prob-n22': { on: '2026-11-21', note: 'Shared marble wording only: n22 is a conditional probability (given at least one red), not a plain both-red question.' },
  'duplicate|m-prob-n12|m-prob-n22': { on: '2026-11-21', note: 'Shared drawing wording only: n22 is a conditional probability (given at least one red), n12 a plain both-red question.' },
  'duplicate|m-sys-01|m-sys-n20': { on: '2026-11-21', note: 'Only the standard stem wording is shared; n20 is a system in 1/x and 1/y solved by substitution.' },
  'duplicate|m-sys-06|m-sys-n20': { on: '2026-11-21', note: 'Both ask for x + y, but n20 is a system in 1/x and 1/y solved by substitution; different method.' },
  'duplicate|m-sys-05|m-nleq-n19': { on: '2026-11-21', note: 'Shared wording only: a linear no-solution system vs a line tangent to a parabola.' },
};
