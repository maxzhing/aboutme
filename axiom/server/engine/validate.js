/**
 * A small JSON-Schema validator (the subset the generation schemas use) plus
 * the semantic checks that actually matter for educational material.
 */

function typeOf(value) {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  if (Number.isInteger(value)) return 'integer';
  return typeof value;
}

function matchesType(value, type) {
  const actual = typeOf(value);
  if (type === 'number') return actual === 'number' || actual === 'integer';
  if (type === 'integer') return actual === 'integer';
  return actual === type;
}

export function validate(value, schema, path = '$') {
  const errors = [];
  if (!schema) return errors;

  if (schema.anyOf) {
    const ok = schema.anyOf.some((sub) => validate(value, sub, path).length === 0);
    if (!ok) errors.push(`${path}: does not match any allowed shape`);
    return errors;
  }

  const types = Array.isArray(schema.type) ? schema.type : schema.type ? [schema.type] : [];
  if (types.length && !types.some((t) => matchesType(value, t))) {
    errors.push(`${path}: expected ${types.join('|')}, got ${typeOf(value)}`);
    return errors;
  }

  if (schema.enum && !schema.enum.includes(value)) {
    errors.push(`${path}: "${value}" is not one of ${schema.enum.join(', ')}`);
  }
  if (typeof value === 'number') {
    if (schema.minimum != null && value < schema.minimum) errors.push(`${path}: below minimum`);
    if (schema.maximum != null && value > schema.maximum) errors.push(`${path}: above maximum`);
  }
  if (typeOf(value) === 'object' && schema.properties) {
    for (const key of schema.required || []) {
      if (!(key in value)) errors.push(`${path}.${key}: missing`);
    }
    for (const [key, sub] of Object.entries(schema.properties)) {
      if (key in value) errors.push(...validate(value[key], sub, `${path}.${key}`));
    }
  }
  if (Array.isArray(value) && schema.items) {
    value.forEach((item, i) => errors.push(...validate(item, schema.items, `${path}[${i}]`)));
  }
  return errors;
}

/** Fill in structurally missing pieces so one malformed field cannot break a render. */
export function coerce(value, schema) {
  if (!schema) return value;
  if (schema.anyOf) {
    for (const sub of schema.anyOf) {
      if (validate(value, sub).length === 0) return value;
    }
    const nullable = schema.anyOf.some((s) => s.type === 'null');
    if (nullable && (value == null || typeof value !== 'object')) return null;
    const objectBranch = schema.anyOf.find((s) => s.type === 'object');
    return objectBranch && value && typeof value === 'object' ? coerce(value, objectBranch) : null;
  }
  const types = Array.isArray(schema.type) ? schema.type : schema.type ? [schema.type] : [];

  if (types.includes('object')) {
    const out = value && typeof value === 'object' && !Array.isArray(value) ? { ...value } : {};
    for (const [key, sub] of Object.entries(schema.properties || {})) {
      out[key] = coerce(out[key], sub);
    }
    return out;
  }
  if (types.includes('array')) {
    const list = Array.isArray(value) ? value : [];
    return list.map((item) => coerce(item, schema.items));
  }
  if (types.includes('null') && value == null) return null;
  if (types.includes('string')) {
    if (typeof value === 'string') return value;
    if (value == null) return '';
    return String(value);
  }
  if (types.includes('number') || types.includes('integer')) {
    const n = Number(value);
    if (!Number.isFinite(n)) return schema.minimum ?? 0;
    return types.includes('integer') ? Math.round(n) : n;
  }
  if (types.includes('boolean')) return Boolean(value);
  return value;
}

/* --------------------------------------------------- educational inspection */

const normalise = (s) =>
  String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

/**
 * Deterministic defects we can catch without asking a model. These are cheap,
 * certain, and run on every generated question set before a learner sees it.
 */
export function inspectQuestions(questions = [], { difficulty = 3 } = {}) {
  const problems = [];
  const seen = new Map();

  questions.forEach((q, index) => {
    const at = q.id || `#${index + 1}`;
    if (!q.prompt || q.prompt.trim().length < 8) {
      problems.push({ question_id: at, issue: 'ambiguous', detail: 'Question prompt is missing or too short.' });
    }
    if (!q.solution || q.solution.trim().length < 8) {
      problems.push({ question_id: at, issue: 'bad_explanation', detail: 'No worked solution supplied.' });
    }
    if (!String(q.answer ?? '').trim()) {
      problems.push({ question_id: at, issue: 'wrong_answer', detail: 'Answer key is empty.' });
    }

    if (q.type === 'multiple_choice' || q.type === 'true_false') {
      const keys = (q.choices || []).map((c) => String(c.key || '').trim().toUpperCase());
      if (keys.length < 2) {
        problems.push({ question_id: at, issue: 'no_correct_choice', detail: 'Fewer than two options.' });
      }
      if (new Set(keys).size !== keys.length) {
        problems.push({ question_id: at, issue: 'duplicate', detail: 'Duplicate option keys.' });
      }
      const texts = (q.choices || []).map((c) => normalise(c.text));
      if (new Set(texts).size !== texts.length) {
        problems.push({ question_id: at, issue: 'duplicate', detail: 'Two options say the same thing.' });
      }
      const key = String(q.answer || '').trim().toUpperCase();
      if (!keys.includes(key)) {
        problems.push({
          question_id: at,
          issue: 'no_correct_choice',
          detail: `Answer key "${q.answer}" is not one of the options (${keys.join(', ')}).`,
        });
      }
    }

    if (q.type === 'numeric') {
      const value = Number(String(q.answer).replace(/[^0-9eE+\-.]/g, ''));
      if (!Number.isFinite(value)) {
        problems.push({ question_id: at, issue: 'wrong_answer', detail: 'Numeric answer does not parse as a number.' });
      }
    }

    if (['free_response', 'essay', 'proof', 'coding'].includes(q.type)) {
      const total = (q.rubric || []).reduce((sum, r) => sum + (Number(r.points) || 0), 0);
      if (!q.rubric?.length) {
        problems.push({ question_id: at, issue: 'bad_explanation', detail: 'Open-response question has no rubric.' });
      } else if (q.points && Math.abs(total - q.points) > 0.51) {
        problems.push({
          question_id: at,
          issue: 'bad_explanation',
          detail: `Rubric sums to ${total} but the question is worth ${q.points}.`,
        });
      }
    }

    const answerText = normalise(q.answer);
    if (answerText.length > 3) {
      for (const hint of q.hints || []) {
        if (normalise(hint).includes(answerText)) {
          problems.push({ question_id: at, issue: 'bad_explanation', detail: 'A hint gives away the answer.' });
          break;
        }
      }
    }

    if (q.difficulty < 1 || q.difficulty > 5) {
      problems.push({ question_id: at, issue: 'off_level', detail: 'Difficulty outside 1-5.' });
    } else if (Math.abs(q.difficulty - difficulty) > 2.5) {
      problems.push({
        question_id: at,
        issue: 'off_level',
        detail: `Difficulty ${q.difficulty} is far from the requested ${difficulty}.`,
      });
    }

    const stem = normalise(q.prompt).slice(0, 90);
    if (stem && seen.has(stem)) {
      problems.push({ question_id: at, issue: 'duplicate', detail: `Duplicates question ${seen.get(stem)}.` });
    } else if (stem) {
      seen.set(stem, at);
    }
  });

  return problems;
}

/** Ensure ids exist and are unique so the frontend can key on them. */
export function normaliseQuestionIds(questions = []) {
  const used = new Set();
  return questions.map((q, i) => {
    let candidate = String(q.id || '').trim() || `q${i + 1}`;
    while (used.has(candidate)) candidate = `${candidate}b`;
    used.add(candidate);
    return { ...q, id: candidate };
  });
}
