import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { isolateEnv, listen, json, sse, CORRECT, WRONG } from './helpers.js';

isolateEnv();

const { createApp } = await import('../server/index.js');
const { closeDb } = await import('../server/db.js');

let server;
let courseId;

before(async () => {
  server = await listen(createApp());
});
after(async () => {
  await server.close();
  closeDb();
});

const future = new Date(Date.now() + 120 * 86400000).toISOString().slice(0, 10);

describe('building a course', () => {
  test('a course is decomposed into weighted units and every concept is tracked', async () => {
    const stream = await sse(server, '/api/courses', {
      request: 'AP Physics 1',
      subject: 'Physics',
      examDate: future,
    });
    const { snapshot } = stream.first('course');
    courseId = snapshot.course.id;

    assert.ok(snapshot.units.length >= 2, 'the course has units');
    const weights = snapshot.units.reduce((sum, u) => sum + u.exam_weight, 0);
    assert.ok(Math.abs(weights - 100) < 1, `unit weights must total 100, got ${weights}`);
    assert.ok(snapshot.readiness.bands.length >= 2, 'the exam’s score bands are stored');

    // Every syllabus concept becomes trackable immediately, not just the ones
    // the learner happens to ask about.
    const { data } = await json(server, '/api/concepts');
    const syllabus = snapshot.units.flatMap((u) => u.concepts.map((c) => c.name.toLowerCase()));
    const tracked = new Set(data.concepts.map((c) => c.name.toLowerCase()));
    assert.ok(syllabus.every((name) => tracked.has(name)), 'the whole syllabus is registered up front');
  });

  test('a fresh learner projects the bottom band with an honest interval', async () => {
    const { data } = await json(server, `/api/courses/${courseId}`);
    assert.equal(data.readiness.score, data.readiness.bands.at(-1).score);
    assert.equal(data.readiness.confidence, 0);
    assert.ok(data.readiness.margin > 0.15, 'no evidence must widen the interval');
  });

  test('the path to the target names units and the gap in points', async () => {
    const { data } = await json(server, `/api/courses/${courseId}`);
    assert.ok(data.path.units.length >= 1);
    assert.ok(data.path.gap > 0);
    assert.ok(data.targetScore >= 2, 'the target defaults to the top band');
  });

  test('pacing is computed against the real exam date', async () => {
    const { data } = await json(server, `/api/courses/${courseId}`);
    assert.ok(data.pace.daysLeft > 100, `expected a distant exam, got ${data.pace.daysLeft} days`);
    assert.ok(data.pace.hoursPerDayNeeded > 0);
    assert.ok(['on_track', 'tight', 'behind'].includes(data.pace.status));
  });

  test('the next action is justified in marks, not vibes', async () => {
    const { data } = await json(server, `/api/courses/${courseId}`);
    assert.ok(data.action.title);
    assert.ok(data.action.why.length > 20);
  });
});

describe('learning moves the prediction', () => {
  test('demonstrated performance on the heaviest unit raises the projected score', async () => {
    const before = await json(server, `/api/courses/${courseId}`);
    const heaviest = before.data.readiness.leverage[0];
    const unit = before.data.units.find((u) => u.title === heaviest.title);
    assert.ok(unit, 'the leverage ranking points at a real unit');

    // Answer several hard questions correctly on that unit's concepts.
    for (const concept of unit.concepts.slice(0, 3)) {
      for (let attempt = 0; attempt < 4; attempt++) {
        await json(server, '/api/answers/grade', {
          method: 'POST',
          body: {
            question: {
              id: `q${attempt}`,
              type: 'multiple_choice',
              concept: concept.name,
              difficulty: 4,
              points: 1,
              prompt: 'An exam-level question.',
              context: '',
              units: '',
              accepted: [],
              tolerance: null,
              rubric: [],
              hints: [],
              choices: [{ key: 'A', text: 'wrong' }, { key: 'B', text: 'right' }],
              answer: 'B',
              solution: 'B is right because of the definition.',
              evidence: 'solve',
              estimated_seconds: 60,
            },
            answer: 'B',
            subject: 'Physics',
          },
        });
      }
    }

    const after = await json(server, `/api/courses/${courseId}`);
    assert.ok(
      after.data.readiness.percent > before.data.readiness.percent,
      `projection should rise: ${before.data.readiness.percent} → ${after.data.readiness.percent}`,
    );
    assert.ok(after.data.readiness.confidence > before.data.readiness.confidence, 'evidence raises confidence');
    assert.ok(after.data.readiness.margin < before.data.readiness.margin, 'evidence narrows the interval');
    assert.ok(after.data.path.gap < before.data.path.gap, 'the gap to the target shrinks');

    // The unit just proved should fall down the leverage ranking.
    const rank = after.data.readiness.leverage.findIndex((u) => u.title === heaviest.title);
    assert.ok(rank > 0 || after.data.readiness.leverage.length === 1, 'a proved unit stops being the top priority');
  });

  test('wrong answers on a unit lower the projection', async () => {
    const before = await json(server, `/api/courses/${courseId}`);
    const target = before.data.units.at(-1);
    for (const concept of target.concepts.slice(0, 2)) {
      for (let attempt = 0; attempt < 4; attempt++) {
        await json(server, '/api/answers/grade', {
          method: 'POST',
          body: {
            question: {
              id: 'qx', type: 'multiple_choice', concept: concept.name, difficulty: 4, points: 1,
              prompt: 'An exam-level question.', context: '', units: '', accepted: [], tolerance: null,
              rubric: [], hints: [],
              choices: [{ key: 'A', text: 'wrong' }, { key: 'B', text: 'right' }],
              answer: 'B', solution: 'B is right.', evidence: 'solve', estimated_seconds: 60,
            },
            answer: 'A',
            subject: 'Physics',
          },
        });
      }
    }
    const after = await json(server, `/api/courses/${courseId}`);
    const beforeUnit = before.data.units.find((u) => u.title === target.title);
    const afterUnit = after.data.units.find((u) => u.title === target.title);
    assert.ok(afterUnit.expected < beforeUnit.expected + 0.001, 'failing a unit must not raise its projection');
  });
});

describe('practice papers', () => {
  let examId;

  test('a paper is generated to the course blueprint', async () => {
    const stream = await sse(server, `/api/courses/${courseId}/exam`, {});
    const { resource } = stream.first('resource');
    examId = resource.id;
    assert.equal(resource.kind, 'test');
    assert.ok(resource.payload.questions.length >= 5);
    assert.equal(resource.payload.course_id, courseId, 'the paper is bound to its course');
  });

  test('sitting the paper calibrates the prediction against the real result', async () => {
    const { data } = await json(server, `/api/resources/${examId}`);
    const questions = data.resource.payload.questions;
    const answers = {};
    questions.forEach((q, i) => {
      answers[q.id] = i % 2 === 0 ? CORRECT : WRONG;
    });

    const stream = await sse(server, `/api/resources/${examId}/submit`, { answers });
    const graded = stream.first('graded');
    assert.ok(graded.exam, 'a course paper reports an exam outcome');
    assert.equal(graded.exam.courseId, courseId);
    assert.ok(graded.exam.percent >= 0 && graded.exam.percent <= 1);
    assert.ok(Object.keys(graded.exam.byUnit).length >= 1, 'the paper is scored by unit');

    const after = await json(server, `/api/courses/${courseId}`);
    assert.ok(after.data.readiness.calibrated_on, 'the prediction is now calibrated on a real paper');
    assert.equal(after.data.history.length, 1, 'the result is kept for the score history');
  });
});

describe('course guardrails', () => {
  test('a nameless course is rejected', async () => {
    const { status } = await json(server, '/api/courses', { method: 'POST', body: { request: '  ' } });
    assert.equal(status, 400);
  });

  test('another learner cannot read the course', async () => {
    const { status } = await json(server, `/api/courses/${courseId}`, { learner: 'someone-else' });
    assert.equal(status, 404);
  });

  test('the target score and daily budget are adjustable', async () => {
    const { data } = await json(server, `/api/courses/${courseId}`, {
      method: 'PATCH',
      body: { targetScore: 4, minutesPerDay: 120 },
    });
    assert.equal(data.targetScore, 4);
    assert.equal(data.course.state.minutesPerDay, 120);
  });
});
