/**
 * Error taxonomy. What the tutor does next depends far more on *why* an answer
 * was wrong than on the fact that it was wrong: a slipped minus sign should not
 * trigger a re-teach, and a broken mental model should not be answered with
 * "try another one".
 */
export const ERROR_TYPES = {
  conceptual: {
    label: 'Conceptual misunderstanding',
    severity: 1.0,
    response: 'reteach',
    guidance:
      'The mental model itself is wrong. Name the specific false belief, contrast it with the correct idea, show a worked example that makes the difference visible, then re-test the same idea in a new surface form.',
  },
  prerequisite_gap: {
    label: 'Prerequisite gap',
    severity: 1.0,
    response: 'backtrack',
    guidance:
      'A skill needed *before* this one is missing. Drop down to the prerequisite, fix it quickly, then return to the target concept.',
  },
  procedure: {
    label: 'Procedure error',
    severity: 0.7,
    response: 'drill_steps',
    guidance:
      'The idea is understood but the method broke down at a specific step. Isolate that step and drill it, not the whole concept.',
  },
  reasoning: {
    label: 'Reasoning error',
    severity: 0.8,
    response: 'reason_aloud',
    guidance:
      'The inference chain is faulty. Ask the learner to justify each step out loud before computing anything.',
  },
  transfer: {
    label: 'Transfer failure',
    severity: 0.6,
    response: 'vary_surface',
    guidance:
      'They can do the familiar version and not the unfamiliar one. Keep the concept fixed and vary the surface story until it stops mattering.',
  },
  vocabulary: {
    label: 'Vocabulary / notation gap',
    severity: 0.5,
    response: 'define',
    guidance: 'A term or symbol was not understood. Define it precisely, then re-ask.',
  },
  memory: {
    label: 'Memory failure',
    severity: 0.5,
    response: 'retrieval_practice',
    guidance: 'It was known and is now gone. Use retrieval practice and tighten the review interval.',
  },
  misread: {
    label: 'Misread the question',
    severity: 0.25,
    response: 'reread',
    guidance:
      'The work was sound but aimed at the wrong target. Point at the words that were skipped; do not re-teach.',
  },
  calculation: {
    label: 'Calculation error',
    severity: 0.25,
    response: 'spot_fix',
    guidance:
      'Arithmetic or algebra slip only. Point at the exact line, have them fix it, and move on — no re-teaching.',
  },
  careless: {
    label: 'Careless mistake',
    severity: 0.2,
    response: 'spot_fix',
    guidance: 'Point it out in one line and continue at the same difficulty.',
  },
  incomplete: {
    label: 'Incomplete answer',
    severity: 0.4,
    response: 'push_further',
    guidance: 'The start is right but it stops short. Ask for the missing part specifically.',
  },
  none: {
    label: 'No error',
    severity: 0,
    response: 'advance',
    guidance: 'Correct. Raise difficulty or move to the next concept.',
  },
};

export const ERROR_KEYS = Object.keys(ERROR_TYPES);

export const errorInfo = (key) => ERROR_TYPES[key] || ERROR_TYPES.conceptual;

/** How much a given error type should damage the mastery estimate (0..1). */
export const errorSeverity = (key) => errorInfo(key).severity;

/** Whether the mistake justifies stopping and re-teaching rather than pressing on. */
export const needsReteach = (key) => ['reteach', 'backtrack'].includes(errorInfo(key).response);
