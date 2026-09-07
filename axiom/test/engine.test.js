import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { parsePartialJson } from '../server/llm/partial-json.js';
import { applyEvidence, computeMasteryLevel, evidenceKindFor, masteryGap } from '../server/engine/mastery.js';
import { updateAbility, nextDifficulty, recommendStrategy, expectedScore } from '../server/engine/difficulty.js';
import { scheduleReview, scheduleFirstReview, describeDue, reviewUrgency } from '../server/engine/review.js';
import { inspectQuestions, validate, coerce, normaliseQuestionIds } from '../server/engine/validate.js';
import { parseNumeric, deterministicVerdict, choiceKey } from '../server/util/answers.js';
import { errorSeverity, needsReteach } from '../server/engine/errors.js';

const baseConcept = {
  id: 'c1', name: 'Momentum', subject: 'Physics', mastery_level: 1, mastery_score: 0,
  ability: 2, attempts: 0, correct: 0, streak: 0, evidence: {}, ease: 2.3, review_stage: 0, interval_days: 0,
};

describe('partial JSON', () => {
  test('parses every prefix of a document', () => {
    const full = JSON.stringify({ say: 'Solve for x.\nThen check.', items: [{ q: 'a', a: 1 }], done: true });
    for (let i = 2; i <= full.length; i++) {
      assert.equal(typeof parsePartialJson(full.slice(0, i)), 'object', `failed at ${i}`);
    }
  });

  test('keeps a half-written string value so prose can stream', () => {
    assert.equal(parsePartialJson('{"say":"Momentum is conser').say, 'Momentum is conser');
  });

  test('drops a half-written key rather than corrupting the object', () => {
    assert.deepEqual(parsePartialJson('{"a":1,"bke'), { a: 1 });
  });
});

describe('mastery', () => {
  test('reading a lesson never reaches mastered', () => {
    assert.equal(computeMasteryLevel({ ...baseConcept, mastery_level: 1, attempts: 0 }), 1);
  });

  test('mastery requires breadth of evidence, hard items and retention', () => {
    let concept = { ...baseConcept };
    for (const kind of ['solve', 'solve', 'explain', 'apply', 'transfer', 'solve']) {
      concept = applyEvidence(concept, { ratio: 1, difficulty: 4, errorType: 'none', evidence: kind });
    }
    const withoutRetention = computeMasteryLevel(concept, { retentionOk: false });
    const withRetention = computeMasteryLevel(concept, { retentionOk: true });
    assert.ok(withoutRetention < 5, 'same-sitting performance must not reach mastered');
    assert.equal(withRetention, 5);
  });

  test('a wrong answer with a conceptual error costs more than a careless slip', () => {
    const conceptual = applyEvidence({ ...baseConcept, mastery_score: 0.6 }, { ratio: 0, difficulty: 3, errorType: 'conceptual', evidence: 'solve' });
    const careless = applyEvidence({ ...baseConcept, mastery_score: 0.6 }, { ratio: 0, difficulty: 3, errorType: 'careless', evidence: 'solve' });
    assert.ok(conceptual.mastery_score < careless.mastery_score);
  });

  test('evidence kind is derived from question shape', () => {
    assert.equal(evidenceKindFor({ type: 'numeric' }), 'solve');
    assert.equal(evidenceKindFor({ type: 'scenario' }), 'apply');
    assert.equal(evidenceKindFor({ type: 'short_answer', transfer: true }), 'transfer');
    assert.equal(evidenceKindFor({ type: 'fill_blank' }), 'recall');
  });

  test('the gap message names what is still missing', () => {
    const gap = masteryGap({ ...baseConcept, mastery_level: 3, evidence: { solve: { correct: 2, attempts: 2, bestDifficulty: 3 } } });
    assert.match(gap, /explain|apply|transfer/);
  });
});

describe('difficulty adaptation', () => {
  test('ability rises after beating a hard item and falls after failing an easy one', () => {
    const up = updateAbility({ ...baseConcept, ability: 3, attempts: 2 }, { ratio: 1, difficulty: 4 });
    const down = updateAbility({ ...baseConcept, ability: 3, attempts: 2 }, { ratio: 0, difficulty: 2 });
    assert.ok(up > 3);
    assert.ok(down < 3);
  });

  test('a streak pushes the next item above the ability estimate', () => {
    const steady = nextDifficulty({ ...baseConcept, ability: 3 }, { streak: 0 });
    const hot = nextDifficulty({ ...baseConcept, ability: 3 }, { streak: 3 });
    assert.ok(hot > steady);
  });

  test('a conceptual miss drops difficulty rather than nudging it', () => {
    const after = nextDifficulty({ ...baseConcept, ability: 3 }, { streak: 0, lastErrorType: 'conceptual' });
    assert.ok(after < 3);
  });

  test('expected score is monotone in the ability gap', () => {
    assert.ok(expectedScore(4, 2) > expectedScore(3, 2));
    assert.ok(expectedScore(2, 4) < 0.5);
  });

  test('repeated conceptual misses switch the teaching strategy', () => {
    const strategy = recommendStrategy([
      { score: 0, max_score: 1, error_type: 'conceptual' },
      { score: 0, max_score: 1, error_type: 'conceptual' },
      { score: 1, max_score: 1, error_type: 'none' },
    ]);
    assert.equal(strategy.strategy, 'switch_representation');
  });

  test('fast and wrong is treated differently from slow and right', () => {
    const rushing = recommendStrategy([
      { score: 0, max_score: 1, error_type: 'careless', elapsed_ms: 5000 },
      { score: 0, max_score: 1, error_type: 'misread', elapsed_ms: 8000 },
      { score: 1, max_score: 1, error_type: 'none', elapsed_ms: 6000 },
      { score: 0, max_score: 1, error_type: 'careless', elapsed_ms: 4000 },
    ]);
    assert.equal(rushing.strategy, 'slow_down');

    const slow = recommendStrategy(
      Array.from({ length: 6 }, () => ({ score: 1, max_score: 1, error_type: 'none', elapsed_ms: 200000 })),
    );
    assert.equal(slow.strategy, 'timed_practice');
  });
});

describe('spaced review', () => {
  test('the ladder expands on success and steps back on a lapse', () => {
    const good = scheduleReview({ ...baseConcept, review_stage: 2 }, 0.95);
    const bad = scheduleReview({ ...baseConcept, review_stage: 2 }, 0.2);
    assert.ok(good.interval_days > bad.interval_days);
    assert.equal(bad.review_stage, 1);
    assert.equal(good.review_stage, 3);
  });

  test('a first review is scheduled a day out', () => {
    const first = scheduleFirstReview(new Date('2026-01-01T00:00:00Z'));
    assert.equal(first.next_review_at.slice(0, 10), '2026-01-02');
  });

  test('overdue concepts report urgency and a readable due label', () => {
    const past = new Date(Date.now() - 3 * 86400000).toISOString();
    const concept = { ...baseConcept, next_review_at: past, interval_days: 1 };
    assert.ok(reviewUrgency(concept) > 0);
    assert.match(describeDue(concept), /overdue/);
  });
});

describe('quality inspection', () => {
  const good = {
    id: 'q1', type: 'multiple_choice', concept: 'Momentum', difficulty: 3, evidence: 'solve',
    context: '', prompt: 'Which quantity is conserved in a closed system?',
    choices: [{ key: 'A', text: 'Energy only' }, { key: 'B', text: 'Momentum' }, { key: 'C', text: 'Speed' }, { key: 'D', text: 'Mass flow' }],
    answer: 'B', accepted: [], tolerance: null, units: '', points: 1, rubric: [],
    solution: 'Momentum is conserved when no external force acts.', hints: ['Think about external forces.'],
    estimated_seconds: 60,
  };

  test('clean material passes', () => {
    assert.equal(inspectQuestions([good], { difficulty: 3 }).length, 0);
  });

  test('an answer key that matches no option is caught', () => {
    const problems = inspectQuestions([{ ...good, answer: 'F' }], { difficulty: 3 });
    assert.ok(problems.some((p) => p.issue === 'no_correct_choice'));
  });

  test('duplicate questions are caught', () => {
    const problems = inspectQuestions([good, { ...good, id: 'q2' }], { difficulty: 3 });
    assert.ok(problems.some((p) => p.issue === 'duplicate'));
  });

  test('a hint that gives away the answer is caught', () => {
    const problems = inspectQuestions(
      [{ ...good, type: 'short_answer', choices: [], answer: 'momentum', hints: ['The answer is momentum.'] }],
      { difficulty: 3 },
    );
    assert.ok(problems.some((p) => p.detail.includes('gives away')));
  });

  test('an unparseable numeric answer is caught', () => {
    const problems = inspectQuestions([{ ...good, type: 'numeric', choices: [], answer: 'quite fast' }], { difficulty: 3 });
    assert.ok(problems.some((p) => p.issue === 'wrong_answer'));
  });

  test('open-response questions must carry a rubric that sums correctly', () => {
    const problems = inspectQuestions(
      [{ ...good, type: 'free_response', choices: [], points: 6, rubric: [{ criterion: 'States the law', points: 2 }] }],
      { difficulty: 3 },
    );
    assert.ok(problems.some((p) => p.detail.includes('sums to')));
  });

  test('question ids are made unique', () => {
    const ids = normaliseQuestionIds([{ id: 'q1' }, { id: 'q1' }, {}]).map((q) => q.id);
    assert.equal(new Set(ids).size, 3);
  });
});

describe('schema validation', () => {
  const schema = {
    type: 'object',
    properties: { name: { type: 'string' }, n: { type: 'integer' }, tags: { type: 'array', items: { type: 'string' } } },
    required: ['name', 'n', 'tags'],
    additionalProperties: false,
  };

  test('missing fields are reported', () => {
    assert.ok(validate({ name: 'x' }, schema).length > 0);
  });

  test('coercion fills in a renderable shape', () => {
    const filled = coerce({ name: 'x' }, schema);
    assert.deepEqual(filled, { name: 'x', n: 0, tags: [] });
    assert.equal(validate(filled, schema).length, 0);
  });
});

describe('answer comparison', () => {
  test('numeric forms are parsed equivalently', () => {
    assert.equal(parseNumeric('3/4'), 0.75);
    assert.equal(parseNumeric('1.2e3'), 1200);
    assert.equal(parseNumeric('9.81 m/s^2'), 9.81);
    assert.equal(parseNumeric('$1,200'), 1200);
    assert.equal(parseNumeric('not a number'), null);
  });

  test('multiple choice resolves by key or by option text', () => {
    const q = { type: 'multiple_choice', answer: 'B', choices: [{ key: 'A', text: 'Energy' }, { key: 'B', text: 'Momentum' }] };
    assert.equal(deterministicVerdict(q, 'b'), true);
    assert.equal(deterministicVerdict(q, 'Momentum'), true);
    assert.equal(deterministicVerdict(q, 'A'), false);
    assert.equal(choiceKey('(b)', q.choices), 'B');
  });

  test('numeric answers respect tolerance', () => {
    const q = { type: 'numeric', answer: '9.8', tolerance: 0.05, accepted: [] };
    assert.equal(deterministicVerdict(q, '9.81'), true);
    assert.equal(deterministicVerdict(q, '10'), false);
  });

  test('free response is left for real judgement', () => {
    assert.equal(deterministicVerdict({ type: 'free_response', answer: 'x' }, 'some prose'), null);
  });
});

describe('error taxonomy', () => {
  test('a conceptual error triggers re-teaching and a slip does not', () => {
    assert.ok(needsReteach('conceptual'));
    assert.ok(needsReteach('prerequisite_gap'));
    assert.ok(!needsReteach('calculation'));
    assert.ok(errorSeverity('conceptual') > errorSeverity('careless'));
  });
});
