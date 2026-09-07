import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { isolateEnv, listen, json, sse } from '../helpers.js';

/**
 * The scenarios from the product brief, run against the real model.
 *
 *   ANTHROPIC_API_KEY=sk-ant-... npm run test:live
 *
 * These cost real tokens and take real time, so they are opt-in and separate
 * from `npm test`. They assert on behaviour and structure — a lesson must
 * actually put the learner to work, a worksheet's answer keys must be valid,
 * adaptation must respond to failure — not on exact wording.
 */
const KEY = process.env.ANTHROPIC_API_KEY;
const skip = !KEY ? 'set ANTHROPIC_API_KEY to run the live suite' : false;

isolateEnv();
process.env.AXIOM_LLM_PROVIDER = 'anthropic';
delete process.env.AXIOM_ALLOW_MOCK;

const { createApp } = await import('../../server/index.js');
const { closeDb } = await import('../../server/db.js');

let server;
before(async () => {
  if (skip) return;
  server = await listen(createApp());
});
after(async () => {
  if (server) await server.close();
  closeDb();
});

const LEARNER = 'live-test';

describe('scenario 1 — "Teach me quadratic equations"', { skip }, () => {
  let sessionId;

  test('routes, diagnoses and puts the learner to work', async () => {
    const stream = await sse(server, '/api/learn/start', { request: 'Teach me quadratic equations' }, { learner: LEARNER });
    const { session, route } = stream.first('session');
    sessionId = session.id;

    assert.ok(route.concepts.length >= 2, 'the topic is decomposed into teachable concepts');
    assert.match(route.subject, /math/i);
    assert.ok(route.opening_note.length > 20);

    const { turn } = stream.first('turn');
    assert.ok(turn.say.length > 40, 'the tutor actually says something');
    assert.ok(turn.activity?.question, 'the opening turn must end with the learner doing something');
    assert.ok(turn.activity.question.prompt.length > 10);
    assert.ok(['diagnose', 'teach', 'probe', 'demonstrate'].includes(turn.intent));
    assert.ok(turn.say.length < 4000, 'the tutor does not dump a textbook');
  });

  test('a wrong answer is diagnosed rather than just marked', async () => {
    const stream = await sse(
      server,
      `/api/sessions/${sessionId}/turn`,
      { input: 'x = 5 because you just move the 25 across' },
      { learner: LEARNER },
    );
    const evaluation = stream.first('evaluation');
    assert.ok(evaluation, 'the answer is graded');
    assert.ok(evaluation.grade.error_type, 'the grade names an error type');
    if (evaluation.grade.verdict !== 'correct') {
      assert.ok(evaluation.grade.misconception.length > 5, 'a wrong answer must name the misconception');
      assert.equal(evaluation.grade.reveal_solution, false, 'the answer is not handed over on the first miss');
    }
    const { turn } = stream.first('turn');
    assert.ok(turn.say.length > 20);
  });
});

describe('scenario 2 — "I keep getting APUSH SAQs wrong"', { skip }, () => {
  test('teaches the format and produces a real SAQ to grade', async () => {
    const stream = await sse(
      server,
      '/api/learn/start',
      { request: 'I keep getting APUSH SAQs wrong' },
      { learner: LEARNER },
    );
    const { route } = stream.first('session');
    assert.match(`${route.subject} ${route.topic}`.toLowerCase(), /history|apush|us history/);
    const { turn } = stream.first('turn');
    assert.ok(turn.say.length > 40);
    assert.ok(turn.activity?.question || turn.blocks.length, 'it teaches or probes rather than sympathising');
  });
});

describe('scenario 3 — "Make me a 20-question biology worksheet"', { skip }, () => {
  let worksheetId;

  test('generates a worksheet whose answer keys are actually valid', async () => {
    const stream = await sse(
      server,
      '/api/generate',
      { kind: 'worksheet', topic: 'Cellular respiration', subject: 'Biology', count: 20, difficulty: 3, types: ['multiple_choice', 'short_answer'] },
      { learner: LEARNER },
    );
    const { resource } = stream.first('resource');
    worksheetId = resource.id;
    const questions = resource.payload.questions;

    assert.ok(questions.length >= 15, `expected ~20 questions, got ${questions.length}`);
    for (const q of questions) {
      assert.ok(q.prompt.length > 10, 'every question has a real prompt');
      assert.ok(q.solution.length > 20, 'every question has a worked solution');
      if (q.type === 'multiple_choice') {
        const keys = q.choices.map((c) => c.key.toUpperCase());
        assert.ok(keys.includes(q.answer.toUpperCase()), `answer key "${q.answer}" is not among ${keys}`);
        assert.equal(new Set(keys).size, keys.length, 'option keys are unique');
      }
    }
    const stems = questions.map((q) => q.prompt.slice(0, 60).toLowerCase());
    assert.equal(new Set(stems).size, stems.length, 'no duplicated questions');

    const difficulties = questions.map((q) => q.difficulty);
    const firstHalf = difficulties.slice(0, Math.floor(difficulties.length / 2));
    const secondHalf = difficulties.slice(Math.floor(difficulties.length / 2));
    const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
    assert.ok(mean(secondHalf) >= mean(firstHalf), 'difficulty must rise across the set');
  });

  test('grading the worksheet produces per-concept analysis and remediation', async () => {
    const { data } = await json(server, `/api/resources/${worksheetId}`, { learner: LEARNER });
    const questions = data.resource.payload.questions;
    const answers = {};
    questions.forEach((q, i) => {
      answers[q.id] = i % 3 === 0 ? String(q.answer) : 'I am not sure, maybe glycolysis happens in the mitochondria';
    });

    const stream = await sse(server, `/api/resources/${worksheetId}/submit`, { answers }, { learner: LEARNER });
    const graded = stream.first('graded');
    assert.equal(graded.results.length, questions.length);
    assert.ok(graded.analysis.byConcept.length >= 1);
    assert.ok(graded.remediation.available, 'wrong answers must unlock targeted remediation');

    const correctlyAnswered = questions.filter((_, i) => i % 3 === 0);
    const scored = correctlyAnswered.filter((q) => {
      const r = graded.results.find((x) => x.questionId === q.id);
      return r?.grade.verdict === 'correct';
    });
    assert.ok(scored.length / correctlyAnswered.length > 0.75, 'answers taken from the key must be graded correct');
  });

  test('remediation targets the concepts that were missed', async () => {
    const stream = await sse(server, `/api/resources/${worksheetId}/remediate`, {}, { learner: LEARNER });
    const { resource } = stream.first('resource');
    assert.ok(resource.payload.questions.length >= 3);
  });
});

describe('scenario 4 — "I have a physics test in three days"', { skip }, () => {
  test('produces a real day-by-day plan inside the time budget', async () => {
    const stream = await sse(
      server,
      '/api/generate',
      { kind: 'plan', topic: 'Kinematics and forces', subject: 'Physics', days: 3, minutes: 60, goal: 'Pass a physics test in three days' },
      { learner: LEARNER },
    );
    const { resource } = stream.first('resource');
    const plan = resource.payload;
    assert.equal(plan.days.length, 3);
    for (const day of plan.days) {
      assert.ok(day.activities.length >= 1, 'every day has work in it');
      const planned = day.activities.reduce((sum, a) => sum + (a.minutes || 0), 0);
      assert.ok(planned <= 90, `day ${day.day} plans ${planned} minutes against a 60 minute budget`);
    }
    const laterDays = plan.days.slice(1).flatMap((d) => d.activities.map((a) => a.type));
    assert.ok(
      laterDays.some((t) => ['review', 'practice_set', 'quiz', 'mastery_check', 'worksheet'].includes(t)),
      'later days must include retrieval, not only new content',
    );
  });
});

describe('scenario 5 — repeated failure changes the approach', { skip }, () => {
  test('the tutor stops repeating itself after the same mistake twice', async () => {
    const start = await sse(
      server,
      '/api/learn/start',
      { request: 'Teach me how to factor quadratics when the leading coefficient is not 1' },
      { learner: 'live-adapt' },
    );
    const sessionId = start.first('session').session.id;

    const says = [];
    for (const answer of [
      'I just factor it as (x + 3)(x + 4) and ignore the coefficient',
      'Still (x + 3)(x + 4), I ignore the number in front',
      'I think you still ignore the leading number',
    ]) {
      const turn = await sse(server, `/api/sessions/${sessionId}/turn`, { input: answer }, { learner: 'live-adapt' });
      says.push(turn.first('turn').turn);
    }

    assert.ok(says.every((t) => t.say.length > 20));
    const unique = new Set(says.map((t) => t.say.slice(0, 120)));
    assert.equal(unique.size, says.length, 'the tutor must not repeat the same explanation');
    assert.ok(
      says.some((t) => ['reteach', 'demonstrate', 'diagnose'].includes(t.intent) || t.strategy_note),
      'repeated failure should change the approach visibly',
    );

    const { data } = await json(server, '/api/dashboard', { learner: 'live-adapt' });
    assert.ok(data.misconceptions.length >= 1, 'the repeated misconception is recorded');
  });
});

describe('scenario 6 — "make it harder"', { skip }, () => {
  test('produces a genuinely harder item, not new numbers', async () => {
    const start = await sse(server, '/api/learn/start', { request: 'Practice momentum problems' }, { learner: 'live-harder' });
    const sessionId = start.first('session').session.id;
    const first = start.first('turn').turn;

    const harder = await sse(server, `/api/sessions/${sessionId}/turn`, { input: '', directive: 'harder' }, { learner: 'live-harder' });
    const next = harder.first('turn').turn;

    assert.ok(next.activity?.question, 'a harder activity is produced');
    if (first.activity?.question) {
      assert.ok(
        next.activity.question.difficulty > first.activity.question.difficulty ||
          next.activity.question.prompt.length > first.activity.question.prompt.length,
        'the follow-up must actually be harder',
      );
      assert.notEqual(next.activity.question.prompt, first.activity.question.prompt);
    }
  });
});

describe('quality control catches real defects', { skip }, () => {
  test('the quality report is attached and nothing broken ships', async () => {
    const stream = await sse(
      server,
      '/api/generate',
      { kind: 'quiz', topic: 'Logarithm rules', subject: 'Maths', count: 8, difficulty: 4 },
      { learner: LEARNER },
    );
    const { resource } = stream.first('resource');
    assert.ok(resource.payload.quality.ran, 'the independent quality pass ran');
    const { inspectQuestions } = await import('../../server/engine/validate.js');
    const remaining = inspectQuestions(resource.payload.questions, { difficulty: 4 }).filter((p) =>
      ['wrong_answer', 'no_correct_choice', 'multiple_correct'].includes(p.issue),
    );
    assert.equal(remaining.length, 0, `shipped with defects: ${JSON.stringify(remaining)}`);
  });
});
