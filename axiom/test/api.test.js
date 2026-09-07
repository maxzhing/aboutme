import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { isolateEnv, listen, json, sse, CORRECT, WRONG } from './helpers.js';

isolateEnv();

const { createApp } = await import('../server/index.js');
const { closeDb } = await import('../server/db.js');

let server;

before(async () => {
  server = await listen(createApp());
});
after(async () => {
  await server.close();
  closeDb();
});

describe('service', () => {
  test('health reports the configured provider', async () => {
    const { data } = await json(server, '/api/health');
    assert.equal(data.ok, true);
    assert.equal(data.provider, 'mock');
    assert.equal(data.qualityControl, true);
  });

  test('a bare learning request is rejected', async () => {
    const { status } = await json(server, '/api/learn/start', { method: 'POST', body: { request: '  ' } });
    assert.equal(status, 400);
  });

  test('unknown resource kinds are rejected', async () => {
    const { status } = await json(server, '/api/generate', { method: 'POST', body: { kind: 'nonsense', topic: 'x' } });
    assert.equal(status, 400);
  });
});

describe('the teaching loop', () => {
  let sessionId;

  test('a request is routed into a session with a plan and an opening turn', async () => {
    const stream = await sse(server, '/api/learn/start', { request: 'Teach me quadratic equations' });
    assert.ok(stream.names().includes('session'), 'a session should be opened');
    assert.ok(stream.names().includes('turn'), 'the first tutor turn should stream');

    const { session, route } = stream.first('session');
    sessionId = session.id;
    assert.ok(route.concepts.length, 'the topic must be decomposed into concepts');
    assert.ok(session.plan.intent, 'the routed intent is stored on the session');
    assert.ok(session.state.conceptIds.length, 'concepts are tracked from the start');

    const { turn } = stream.first('turn');
    assert.ok(turn.say, 'the tutor says something');
    assert.ok(turn.activity?.question, 'the opening turn puts the learner to work');

    // Partial frames must arrive before the final turn — that is the streaming contract.
    assert.ok(stream.all('partial').length >= 1, 'the turn should stream progressively');
  });

  test('answering the open question grades it and moves the learner model', async () => {
    const stream = await sse(server, `/api/sessions/${sessionId}/turn`, { input: CORRECT });
    const evaluation = stream.first('evaluation');
    assert.ok(evaluation, 'the answer must be graded before the tutor replies');
    assert.equal(evaluation.grade.verdict, 'correct');
    assert.ok(evaluation.concept.name);
    assert.ok(evaluation.next.difficulty >= 1);

    const { data } = await json(server, '/api/concepts');
    const concept = data.concepts.find((c) => c.name === evaluation.concept.name);
    assert.ok(concept.attempts >= 1, 'the attempt is recorded against the concept');
    assert.ok(concept.next_review_at, 'a review is scheduled after the first attempt');
  });

  test('a wrong answer is logged as a misconception and lowers the next difficulty', async () => {
    const before = await json(server, '/api/concepts');
    const beforeAbility = before.data.concepts[0].ability;

    const stream = await sse(server, `/api/sessions/${sessionId}/turn`, { input: WRONG });
    const evaluation = stream.first('evaluation');
    assert.equal(evaluation.grade.verdict, 'incorrect');
    assert.equal(evaluation.grade.error_type, 'conceptual');
    assert.ok(evaluation.next.difficulty <= 5);

    const { data } = await json(server, '/api/dashboard');
    assert.ok(data.misconceptions.length >= 1, 'the misconception is stored for later');

    const after = await json(server, '/api/concepts');
    assert.ok(after.data.concepts[0].ability <= beforeAbility + 0.001, 'ability must not rise on a wrong answer');
  });

  test('the "I am stuck" directives run without an answer', async () => {
    const stream = await sse(server, `/api/sessions/${sessionId}/turn`, { input: '', directive: 'hint' });
    assert.ok(stream.first('turn').turn.say);
  });

  test('"make it harder" is accepted as a directive', async () => {
    const stream = await sse(server, `/api/sessions/${sessionId}/turn`, { input: '', directive: 'harder' });
    assert.ok(stream.first('turn').turn);
  });

  test('the session transcript is replayable', async () => {
    const { data } = await json(server, `/api/sessions/${sessionId}`);
    assert.ok(data.messages.length >= 6, 'both sides of every turn are stored');
    assert.ok(data.messages.some((m) => m.role === 'tutor' && m.body.say));
  });

  test('another learner cannot read the session', async () => {
    const { status } = await json(server, `/api/sessions/${sessionId}`, { learner: 'someone-else' });
    assert.equal(status, 404);
  });
});

describe('resource generation', () => {
  let worksheetId;

  test('a worksheet is generated, quality-checked and stored', async () => {
    const stream = await sse(server, '/api/generate', {
      kind: 'worksheet',
      topic: 'Cellular respiration',
      subject: 'Biology',
      count: 6,
      difficulty: 3,
      types: ['multiple_choice'],
    });
    const { resource } = stream.first('resource');
    worksheetId = resource.id;

    assert.equal(resource.kind, 'worksheet');
    assert.equal(resource.payload.questions.length, 6, 'the requested number of questions is produced');
    assert.ok(resource.payload.quality, 'the quality report is attached');
    assert.equal(resource.payload.quality.checked, 6);
    for (const question of resource.payload.questions) {
      assert.ok(question.prompt, 'every question has a prompt');
      assert.ok(question.solution, 'every question has a worked solution');
      const keys = question.choices.map((c) => c.key);
      assert.ok(keys.includes(question.answer), 'the answer key names a real option');
    }
    assert.ok(new Set(resource.payload.questions.map((q) => q.id)).size === 6, 'ids are unique');
  });

  test('submitting the worksheet grades every answer and analyses the result', async () => {
    const { data } = await json(server, `/api/resources/${worksheetId}`);
    const questions = data.resource.payload.questions;
    const answers = {};
    questions.forEach((q, i) => {
      answers[q.id] = i < 2 ? CORRECT : WRONG;
    });

    const stream = await sse(server, `/api/resources/${worksheetId}/submit`, { answers });
    const graded = stream.first('graded');
    assert.equal(graded.results.length, questions.length);
    assert.ok(graded.maxScore > 0);
    assert.ok(graded.analysis.byConcept.length >= 1);
    assert.ok(graded.analysis.headline);
    assert.equal(graded.remediation.available, true, 'wrong answers make remediation available');

    const stored = await json(server, `/api/resources/${worksheetId}`);
    assert.equal(stored.data.resource.status, 'graded');
    assert.ok(stored.data.resource.payload.submission, 'the submission is kept so it can be reopened');
  });

  test('remediation targets exactly what was missed', async () => {
    const stream = await sse(server, `/api/resources/${worksheetId}/remediate`, {});
    const { resource } = stream.first('resource');
    assert.equal(resource.kind, 'practice_set');
    assert.ok(resource.payload.questions.length >= 3);
    assert.equal(resource.session_id, null);
  });

  test('a lesson carries objectives, blocks and checkpoint questions', async () => {
    const stream = await sse(server, '/api/generate', { kind: 'lesson', topic: "Newton's laws", subject: 'Physics' });
    const { resource } = stream.first('resource');
    assert.ok(resource.payload.objectives.length);
    assert.ok(resource.payload.blocks.length);
    assert.ok(resource.payload.checks.length, 'a lesson must make the learner do something');
    assert.ok(resource.payload.summary);
  });

  test('a study plan spans the requested number of days', async () => {
    const stream = await sse(server, '/api/generate', {
      kind: 'plan', topic: 'Mechanics', subject: 'Physics', days: 3, minutes: 45,
    });
    const { resource } = stream.first('resource');
    assert.equal(resource.payload.days.length, 3);
    for (const day of resource.payload.days) assert.ok(day.activities.length);
  });

  test('a flashcard deck honours the requested card count', async () => {
    const stream = await sse(server, '/api/generate', { kind: 'flashcards', topic: 'Spanish irregular verbs', count: 5 });
    const { resource } = stream.first('resource');
    assert.equal(resource.payload.cards.length, 5);
    for (const card of resource.payload.cards) {
      assert.ok(card.front && card.back);
    }
  });

  test('generation streams partial frames so the page can render as it writes', async () => {
    const stream = await sse(server, '/api/generate', { kind: 'quiz', topic: 'Photosynthesis', count: 3 });
    assert.ok(stream.all('partial').length >= 1);
    assert.ok(stream.names().includes('done'));
  });
});

describe('the learner model', () => {
  test('the dashboard reflects everything that happened', async () => {
    const { data } = await json(server, '/api/dashboard');
    assert.ok(data.subjects.length >= 1);
    assert.ok(data.recentWork.length >= 3);
    assert.ok(data.continueLearning.length >= 1);
    assert.ok(data.stats.attempts > 0);
    assert.ok(data.activity.length > 0, 'events are logged for the activity feed');
  });

  test('weak concepts surface with a stated gap', async () => {
    const { data } = await json(server, '/api/dashboard');
    if (data.weakAreas.length) {
      assert.ok(data.weakAreas[0].gap, 'a weak concept explains what is still missing');
    }
  });

  test('the review queue is populated by scheduling', async () => {
    const { data } = await json(server, '/api/review/queue');
    assert.ok(data.upcoming.length >= 1, 'concepts are scheduled for later review');
  });

  test('insights are returned without falling over on thin data', async () => {
    const { data } = await json(server, '/api/insights');
    assert.ok('headline' in data);
    assert.ok(Array.isArray(data.local));
  });

  test('a fresh learner starts empty', async () => {
    const { data } = await json(server, '/api/dashboard', { learner: 'brand-new' });
    assert.equal(data.subjects.length, 0);
    assert.equal(data.stats.attempts, 0);
  });

  test('learners are isolated from one another', async () => {
    const mine = await json(server, '/api/resources');
    const theirs = await json(server, '/api/resources', { learner: 'brand-new' });
    assert.ok(mine.data.resources.length > 0);
    assert.equal(theirs.data.resources.length, 0);
  });
});

describe('single answer grading', () => {
  test('a multiple-choice answer is graded deterministically', async () => {
    const question = {
      id: 'q1', type: 'multiple_choice', concept: 'Momentum', difficulty: 3, points: 1,
      prompt: 'Which is conserved?', context: '', units: '', accepted: [], tolerance: null, rubric: [], hints: [],
      choices: [{ key: 'A', text: 'Speed' }, { key: 'B', text: 'Momentum' }],
      answer: 'B', solution: 'Momentum is conserved.', evidence: 'recall', estimated_seconds: 30,
    };
    const right = await json(server, '/api/answers/grade', { method: 'POST', body: { question, answer: 'B' } });
    assert.equal(right.data.grade.verdict, 'correct');
    assert.equal(right.data.grade.score, 1);

    const wrong = await json(server, '/api/answers/grade', { method: 'POST', body: { question, answer: 'A' } });
    assert.equal(wrong.data.grade.verdict, 'incorrect');
    assert.equal(wrong.data.grade.score, 0);
  });

  test('grading requires a question', async () => {
    const { status } = await json(server, '/api/answers/grade', { method: 'POST', body: { answer: 'B' } });
    assert.equal(status, 400);
  });
});
