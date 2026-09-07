/** Answer-shape helpers used to make deterministic calls before asking a model. */

const SUPERSCRIPTS = { '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9' };

export function normaliseText(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, ' ')
    .replace(/[.,;:!?]+$/g, '')
    .trim();
}

/**
 * Parse a numeric answer that may arrive as "3/4", "1.2e3", "−5", "12 m/s",
 * "$1,200", "2π" or "\\frac{1}{2}". Returns null when it is not a number.
 */
export function parseNumeric(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  let text = String(value ?? '').trim();
  if (!text) return null;

  text = text
    .replace(/[−–—]/g, '-')
    .replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]/g, (c) => `^${SUPERSCRIPTS[c]}`)
    .replace(/\\frac\{([^}]*)\}\{([^}]*)\}/g, '($1)/($2)')
    .replace(/\\times/g, '*')
    .replace(/\\pi|π/g, String(Math.PI))
    .replace(/\\sqrt\{([^}]*)\}/g, 'sqrt($1)')
    .replace(/[$,]/g, '')
    .replace(/\s+/g, '');

  // Plain numbers (including scientific notation) resolve before any unit stripping.
  const plain = Number(text);
  if (Number.isFinite(plain)) return plain;

  // Strip a trailing unit like "m/s" or "kg", but never an exponent suffix.
  const stripped = text.replace(/(?<=[0-9)])\s*[a-zA-Zµ°%][a-zA-Z/^0-9·⋅*]*$/, '');
  const direct = Number(stripped);
  if (Number.isFinite(direct)) return direct;
  text = stripped;

  if (!/^[-+*/^().0-9esqrt ]*$/i.test(text)) return null;
  try {
    // Constrained arithmetic only: digits, operators, parens and sqrt().
    const expression = text.replace(/\^/g, '**').replace(/sqrt/gi, 'Math.sqrt');
    if (!/^[-+*/().0-9\sMath.sqrt]*$/.test(expression)) return null;
    // eslint-disable-next-line no-new-func
    const result = Function(`"use strict"; return (${expression});`)();
    return Number.isFinite(result) ? result : null;
  } catch {
    return null;
  }
}

export function numericMatch(studentAnswer, correctAnswer, tolerance) {
  const student = parseNumeric(studentAnswer);
  const correct = parseNumeric(correctAnswer);
  if (student == null || correct == null) return null; // undecidable here
  const allowed = tolerance != null && Number.isFinite(Number(tolerance))
    ? Math.abs(Number(tolerance))
    : Math.max(1e-9, Math.abs(correct) * 0.005);
  return Math.abs(student - correct) <= allowed;
}

/** Resolve a multiple-choice submission to a canonical option key. */
export function choiceKey(answer, choices = []) {
  const raw = String(answer ?? '').trim();
  if (!raw) return null;
  const upper = raw.toUpperCase();
  const byKey = choices.find((c) => String(c.key).trim().toUpperCase() === upper);
  if (byKey) return String(byKey.key).trim().toUpperCase();
  const stripped = upper.replace(/^\(?([A-Z])[).:]?$/, '$1');
  const byStripped = choices.find((c) => String(c.key).trim().toUpperCase() === stripped);
  if (byStripped) return String(byStripped.key).trim().toUpperCase();
  const byText = choices.find((c) => normaliseText(c.text) === normaliseText(raw));
  return byText ? String(byText.key).trim().toUpperCase() : null;
}

/**
 * Decide correctness without a model where that is safe and exact.
 * Returns true/false, or null when judgement is genuinely required.
 */
export function deterministicVerdict(question, studentAnswer) {
  if (studentAnswer == null || String(studentAnswer).trim() === '') return null;

  if (question.type === 'multiple_choice' || question.type === 'true_false') {
    const submitted = choiceKey(studentAnswer, question.choices || []);
    const correct = choiceKey(question.answer, question.choices || []) || String(question.answer).trim().toUpperCase();
    if (!submitted) return null;
    return submitted === correct;
  }

  if (question.type === 'numeric') {
    const direct = numericMatch(studentAnswer, question.answer, question.tolerance);
    if (direct === true) return true;
    for (const alternative of question.accepted || []) {
      if (numericMatch(studentAnswer, alternative, question.tolerance) === true) return true;
    }
    return direct; // false or null
  }

  if (question.type === 'fill_blank' || question.type === 'short_answer') {
    const student = normaliseText(studentAnswer);
    const candidates = [question.answer, ...(question.accepted || [])].map(normaliseText);
    if (candidates.includes(student)) return true;
    return null; // a near-miss still deserves a real read
  }

  return null;
}
