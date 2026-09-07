import express from 'express';
import { config, hasLLM } from '../config.js';
import { streamHandler, throttle } from '../util/sse.js';
import { startSession, routeRequest } from '../engine/router.js';
import { runTutorTurn } from '../engine/tutor.js';
import { generateResource, RESOURCE_KINDS } from '../engine/generate.js';
import { evaluateAnswer, evaluateSubmission } from '../engine/evaluate.js';
import { generateInsights, localSignals, clearInsightCache } from '../engine/insights.js';
import { createCourse, courseSnapshot, listCoursesFor, generateExam, recordExam } from '../engine/course.js';
import { catalogue } from '../../curriculum/index.js';
import { buildProfile } from '../engine/profile.js';
import { MASTERY_LABELS, masteryGap } from '../engine/mastery.js';
import { describeDue } from '../engine/review.js';
import { llm } from '../llm/index.js';
import {
  ensureLearner,
  updateLearner,
  listSessions,
  getSession,
  listMessages,
  updateSession,
  listResources,
  getResource,
  saveResource,
  listSessionResources,
  listConcepts,
  weakConcepts,
  upcomingReviews,
  dueConcepts,
  listMisconceptions,
  listGoals,
  saveGoal,
  listEvents,
  listSources,
  recentAttempts,
  logEvent,
  getCourse,
  saveCourse,
  deleteCourse,
} from '../store.js';

export const api = express.Router();

api.use((req, res, next) => {
  req.learnerId = String(req.get('x-learner-id') || 'me').slice(0, 64);
  ensureLearner(req.learnerId);
  next();
});

const asyncRoute = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

/* --------------------------------------------------------------------- meta */

api.get('/health', (req, res) => {
  res.json({
    ok: true,
    provider: config.provider,
    runtime: config.runtime,
    model: llm().model,
    llmReady: hasLLM(),
    qualityControl: config.qualityControl,
  });
});

// The courses whose syllabus and exam weightings are transcribed rather than
// generated, so the interface can offer them by name.
api.get('/curriculum', (req, res) => res.json({ courses: catalogue() }));

api.get('/profile', (req, res) => {
  const profile = buildProfile(req.learnerId);
  res.json({
    learner: { id: profile.learner.id, name: profile.learner.display_name, prefs: profile.learner.prefs },
    stats: profile.stats,
    subjects: profile.subjects,
  });
});

api.patch('/profile', (req, res) => {
  const learner = updateLearner(req.learnerId, {
    display_name: req.body?.name,
    prefs: req.body?.prefs,
  });
  res.json({ learner: { id: learner.id, name: learner.display_name, prefs: learner.prefs } });
});

/* ------------------------------------------------------------------ sessions */

// Start a session: route the request, then stream the opening tutor turn.
api.post('/learn/start', (req, res) => {
  const { request, sourceIds = [] } = req.body || {};
  if (!request || !String(request).trim()) {
    return res.status(400).json({ error: 'Tell me what you want to learn.' });
  }
  return streamHandler(res, async (stream) => {
    stream.send('status', { stage: 'routing', message: 'Working out what you need…' });
    const { session, route } = await startSession({
      learnerId: req.learnerId,
      request: String(request).slice(0, 4000),
      sourceIds,
    });
    stream.send('session', { session, route });

    if (route.clarifying_question) {
      stream.send('clarify', { question: route.clarifying_question, session });
      return;
    }

    stream.send('status', { stage: 'teaching', message: 'Building your first move…' });
    const push = throttle((partial) => stream.send('partial', partial));
    const { turn } = await runTutorTurn({
      learnerId: req.learnerId,
      sessionId: session.id,
      input: String(request),
      onPartial: push,
    });
    stream.send('turn', { turn, session: getSession(session.id) });
    stream.send('done', { sessionId: session.id });
  });
});

api.post('/route', asyncRoute(async (req, res) => {
  const route = await routeRequest({ learnerId: req.learnerId, request: String(req.body?.request || '') });
  res.json({ route });
}));

api.get('/sessions', (req, res) => {
  const sessions = listSessions(req.learnerId, 30).map((s) => ({
    ...s,
    resources: listSessionResources(s.id),
  }));
  res.json({ sessions });
});

api.get('/sessions/:id', (req, res) => {
  const session = getSession(req.params.id);
  if (!session || session.learner_id !== req.learnerId) return res.status(404).json({ error: 'Session not found' });
  res.json({
    session,
    messages: listMessages(session.id),
    resources: listSessionResources(session.id),
  });
});

// One turn of the teaching loop.
api.post('/sessions/:id/turn', (req, res) => {
  const session = getSession(req.params.id);
  if (!session || session.learner_id !== req.learnerId) return res.status(404).json({ error: 'Session not found' });
  const { input = '', directive = null } = req.body || {};
  if (!String(input).trim() && !directive) return res.status(400).json({ error: 'Nothing to respond to.' });

  return streamHandler(res, async (stream) => {
    const push = throttle((partial) => stream.send('partial', partial));
    const { turn, evaluation } = await runTutorTurn({
      learnerId: req.learnerId,
      sessionId: session.id,
      input: String(input).slice(0, 8000),
      directive,
      onPartial: push,
      onEvaluation: (outcome) => stream.send('evaluation', serialiseOutcome(outcome)),
    });
    stream.send('turn', { turn, evaluation: evaluation ? serialiseOutcome(evaluation) : null, session: getSession(session.id) });
    stream.send('done', {});
  });
});

api.patch('/sessions/:id', (req, res) => {
  const session = getSession(req.params.id);
  if (!session || session.learner_id !== req.learnerId) return res.status(404).json({ error: 'Session not found' });
  const updated = updateSession(session.id, {
    mode: req.body?.mode,
    status: req.body?.status,
    state: req.body?.state ? { ...session.state, ...req.body.state } : undefined,
  });
  res.json({ session: updated });
});

function serialiseOutcome(outcome) {
  if (!outcome) return null;
  return {
    grade: outcome.grade,
    concept: {
      id: outcome.concept.id,
      name: outcome.concept.name,
      mastery_level: outcome.concept.mastery_level,
      mastery_label: MASTERY_LABELS[outcome.concept.mastery_level],
      ability: outcome.concept.ability,
      streak: outcome.concept.streak,
      next_review_at: outcome.concept.next_review_at,
      gap: masteryGap(outcome.concept),
    },
    next: outcome.next,
  };
}

/* ----------------------------------------------------------------- resources */

api.get('/resource-kinds', (req, res) => res.json({ kinds: Object.keys(RESOURCE_KINDS) }));

// The one generator behind every "make me a ..." in the product.
api.post('/generate', (req, res) => {
  const body = req.body || {};
  if (!RESOURCE_KINDS[body.kind]) return res.status(400).json({ error: `Unknown resource kind: ${body.kind}` });
  if (!body.topic) return res.status(400).json({ error: 'A topic is required.' });

  return streamHandler(res, async (stream) => {
    stream.send('status', { stage: 'generating', message: `Building your ${String(body.kind).replace(/_/g, ' ')}…` });
    const push = throttle((partial) => stream.send('partial', partial), 120);
    const resource = await generateResource({
      learnerId: req.learnerId,
      kind: body.kind,
      topic: String(body.topic).slice(0, 300),
      subject: body.subject || 'General',
      level: body.level || '',
      difficulty: body.difficulty,
      count: body.count,
      minutes: body.minutes,
      days: body.days,
      types: body.types,
      concepts: body.concepts || [],
      instructions: String(body.instructions || '').slice(0, 2000),
      sourceIds: body.sourceIds || [],
      sessionId: body.sessionId || null,
      examContext: body.examContext,
      goal: body.goal,
      onPartial: push,
    });
    clearInsightCache(req.learnerId);
    stream.send('resource', { resource });
    stream.send('done', { resourceId: resource.id });
  });
});

api.get('/resources', (req, res) => {
  res.json({ resources: listResources(req.learnerId, { limit: Number(req.query.limit) || 40, kind: req.query.kind }) });
});

api.get('/resources/:id', (req, res) => {
  const resource = getResource(req.params.id);
  if (!resource || resource.learner_id !== req.learnerId) return res.status(404).json({ error: 'Not found' });
  res.json({ resource });
});

// Submit a whole worksheet / quiz / test and get it graded and analysed.
api.post('/resources/:id/submit', (req, res) => {
  const resource = getResource(req.params.id);
  if (!resource || resource.learner_id !== req.learnerId) return res.status(404).json({ error: 'Not found' });

  return streamHandler(res, async (stream) => {
    const answers = req.body?.answers || {};
    const elapsed = req.body?.elapsed || {};
    const payload = resource.payload || {};
    const questions = payload.questions || payload.self_test || payload.checks || [];
    stream.send('status', { stage: 'grading', message: `Grading ${questions.length} answers…` });

    const graded = await evaluateSubmission({
      learnerId: req.learnerId,
      resource,
      answers,
      elapsed,
      sessionId: resource.session_id,
    });

    const results = graded.results.map((r) => ({
      questionId: r.questionId,
      skipped: Boolean(r.skipped),
      grade: r.grade,
      concept: r.concept
        ? {
            name: r.concept.name,
            mastery_level: r.concept.mastery_level,
            mastery_label: MASTERY_LABELS[r.concept.mastery_level],
            ability: r.concept.ability,
          }
        : null,
    }));

    const analysis = analyseSubmission(graded, questions);
    const missed = graded.results.filter((r) => (r.grade?.score || 0) < (r.grade?.max_score || 1) * 0.8);
    const remediation = missed.length
      ? {
          available: true,
          concepts: [...new Set(missed.map((r) => r.grade?.concept).filter(Boolean))],
          questionIds: missed.map((r) => r.questionId),
        }
      : { available: false };

    saveResource(req.learnerId, {
      ...resource,
      // The analysis is persisted with the submission so reopening a graded
      // paper shows the same breakdown rather than a bare score.
      payload: { ...payload, submission: { answers, results, analysis, remediation, at: new Date().toISOString() } },
      status: 'graded',
      score: graded.score,
      max_score: graded.maxScore,
    });
    // A paper generated from a course blueprint calibrates that course's
    // prediction against what the learner actually scored.
    let examOutcome = null;
    if (payload.course_id) {
      examOutcome = recordExam({
        learnerId: req.learnerId,
        courseId: payload.course_id,
        resource,
        results: graded.results,
      });
    }

    clearInsightCache(req.learnerId);
    logEvent(req.learnerId, 'resource_graded', {
      resourceId: resource.id,
      kind: resource.kind,
      score: graded.score,
      max: graded.maxScore,
    });

    stream.send('graded', {
      score: graded.score,
      maxScore: graded.maxScore,
      results,
      analysis,
      remediation,
      exam: examOutcome
        ? { ...examOutcome, courseId: payload.course_id, snapshot: courseSnapshot(req.learnerId, payload.course_id) }
        : null,
    });
    stream.send('done', {});
  });
});

function analyseSubmission(graded, questions) {
  const byConcept = new Map();
  const byError = {};
  for (const r of graded.results) {
    const concept = r.grade?.concept || 'Unknown';
    const entry = byConcept.get(concept) || { concept, correct: 0, total: 0 };
    entry.total++;
    if ((r.grade?.score || 0) >= (r.grade?.max_score || 1) * 0.8) entry.correct++;
    byConcept.set(concept, entry);
    const type = r.grade?.error_type;
    if (type && type !== 'none') byError[type] = (byError[type] || 0) + 1;
  }
  const weakest = [...byConcept.values()].filter((c) => c.correct < c.total).sort((a, b) => a.correct / a.total - b.correct / b.total);
  const dominantError = Object.entries(byError).sort((a, b) => b[1] - a[1])[0];
  return {
    byConcept: [...byConcept.values()],
    byError,
    weakest: weakest.slice(0, 3),
    headline: weakest.length
      ? `${weakest[0].concept} is where this went wrong — ${weakest[0].correct}/${weakest[0].total} correct.`
      : `Clean sweep: ${graded.score}/${graded.maxScore}.`,
    dominantError: dominantError ? { type: dominantError[0], count: dominantError[1] } : null,
    difficultyProfile: questions.map((q) => ({
      id: q.id,
      difficulty: q.difficulty,
      correct: (graded.results.find((r) => r.questionId === q.id)?.grade?.score || 0) >= (Number(q.points) || 1) * 0.8,
    })),
  };
}

// Targeted follow-up built from exactly what they got wrong.
api.post('/resources/:id/remediate', (req, res) => {
  const resource = getResource(req.params.id);
  if (!resource || resource.learner_id !== req.learnerId) return res.status(404).json({ error: 'Not found' });

  return streamHandler(res, async (stream) => {
    const submission = resource.payload?.submission;
    const questions = resource.payload?.questions || resource.payload?.self_test || [];
    const missed = (submission?.results || []).filter(
      (r) => (r.grade?.score || 0) < (r.grade?.max_score || 1) * 0.8,
    );
    if (!missed.length) {
      stream.send('error', { message: 'Nothing to remediate — everything was correct.' });
      return;
    }

    const detail = missed
      .map((r) => {
        const q = questions.find((x) => x.id === r.questionId);
        return `- Concept "${r.grade?.concept}": missed "${q?.prompt?.slice(0, 160)}" — ${r.grade?.error_type}${r.grade?.misconception ? `, because they ${r.grade.misconception}` : ''}`;
      })
      .join('\n');

    const concepts = [...new Set(missed.map((r) => r.grade?.concept).filter(Boolean))];
    stream.send('status', { stage: 'generating', message: `Targeting ${concepts.length} weak concept(s)…` });
    const push = throttle((partial) => stream.send('partial', partial), 120);

    const followUp = await generateResource({
      learnerId: req.learnerId,
      kind: 'practice_set',
      topic: resource.topic || resource.payload?.topic || concepts[0],
      subject: resource.subject || 'General',
      concepts,
      count: Math.min(8, Math.max(3, missed.length * 2)),
      difficulty: req.body?.difficulty,
      sessionId: resource.session_id,
      instructions: [
        'This is a REMEDIATION set built from a specific failed attempt.',
        'Target exactly these failures:',
        detail,
        '',
        'For each failed idea: start with one question that isolates the broken step at a slightly',
        'lower difficulty, then one at the original difficulty, then one that requires the same idea',
        'in a different surface form so a memorised fix cannot pass.',
      ].join('\n'),
      onPartial: push,
    });

    stream.send('resource', { resource: followUp });
    stream.send('done', { resourceId: followUp.id });
  });
});

/* -------------------------------------------------------------------- answers */

// Grade a single answer (tutor activities, per-question worksheet checks).
api.post('/answers/grade', asyncRoute(async (req, res) => {
  const { question, answer, sessionId = null, resourceId = null, attemptNumber = 1, elapsedMs = null, subject } = req.body || {};
  if (!question?.prompt) return res.status(400).json({ error: 'A question is required.' });
  const outcome = await evaluateAnswer({
    learnerId: req.learnerId,
    sessionId,
    resourceId,
    question,
    answer,
    attemptNumber,
    elapsedMs,
    subject: subject || 'General',
  });
  clearInsightCache(req.learnerId);
  res.json(serialiseOutcome(outcome));
}));

/* ------------------------------------------------------------------ dashboard */

api.get('/dashboard', (req, res) => {
  const learnerId = req.learnerId;
  const profile = buildProfile(learnerId);
  const concepts = listConcepts(learnerId);

  const bySubject = {};
  for (const c of concepts) {
    const bucket = (bySubject[c.subject] ||= { subject: c.subject, concepts: [], mastered: 0, total: 0, score: 0 });
    bucket.concepts.push({
      id: c.id,
      name: c.name,
      mastery_level: c.mastery_level,
      mastery_label: MASTERY_LABELS[c.mastery_level],
      ability: c.ability,
      attempts: c.attempts,
      accuracy: c.attempts ? c.correct / c.attempts : null,
      next_review_at: c.next_review_at,
      due: describeDue(c),
      gap: masteryGap(c),
    });
    bucket.total++;
    bucket.score += c.mastery_level;
    if (c.mastery_level >= 5) bucket.mastered++;
  }
  for (const bucket of Object.values(bySubject)) {
    bucket.average = bucket.total ? bucket.score / bucket.total : 0;
    bucket.concepts.sort((a, b) => a.mastery_level - b.mastery_level);
  }

  res.json({
    stats: profile.stats,
    continueLearning: listSessions(learnerId, 6).map((s) => ({
      id: s.id,
      title: s.title,
      mode: s.mode,
      topic: s.topic,
      phase: s.state?.phase,
      focus: s.state?.focusConcept,
      turns: s.state?.turnCount || 0,
      updated_at: s.updated_at,
      status: s.status,
    })),
    subjects: Object.values(bySubject).sort((a, b) => b.total - a.total),
    weakAreas: weakConcepts(learnerId, 8).map((c) => ({
      id: c.id,
      name: c.name,
      subject: c.subject,
      mastery_level: c.mastery_level,
      accuracy: c.attempts ? c.correct / c.attempts : null,
      attempts: c.attempts,
      gap: masteryGap(c),
    })),
    upcomingReviews: upcomingReviews(learnerId, 10).map((c) => ({
      id: c.id,
      name: c.name,
      subject: c.subject,
      due: describeDue(c),
      next_review_at: c.next_review_at,
      overdue: new Date(c.next_review_at) <= new Date(),
      mastery_level: c.mastery_level,
    })),
    dueNow: dueConcepts(learnerId).length,
    misconceptions: listMisconceptions(learnerId, { openOnly: true, limit: 8 }),
    recentWork: listResources(learnerId, { limit: 10 }),
    goals: listGoals(learnerId).map((g) => withProgress(learnerId, g)),
    signals: localSignals(profile),
    activity: listEvents(learnerId, 12),
  });
});

api.get('/insights', asyncRoute(async (req, res) => {
  res.json(await generateInsights(req.learnerId, { force: req.query.force === '1' }));
}));

api.get('/concepts', (req, res) => {
  res.json({
    concepts: listConcepts(req.learnerId).map((c) => ({
      ...c,
      mastery_label: MASTERY_LABELS[c.mastery_level],
      accuracy: c.attempts ? c.correct / c.attempts : null,
      due: describeDue(c),
      gap: masteryGap(c),
    })),
  });
});

api.get('/history', (req, res) => {
  res.json({ attempts: recentAttempts(req.learnerId, Number(req.query.limit) || 50) });
});

/* ---------------------------------------------------------------------- goals */

api.get('/goals', (req, res) => res.json({ goals: listGoals(req.learnerId).map((g) => withProgress(req.learnerId, g)) }));

/**
 * Progress against a goal is measured the same way as everything else: by
 * demonstrated mastery of the concepts the goal covers, never by activity count.
 */
function withProgress(learnerId, goal) {
  const names = (goal.roadmap?.concepts || []).map((n) => String(n).toLowerCase());
  const concepts = listConcepts(learnerId).filter((c) =>
    names.length ? names.includes(c.name.toLowerCase()) : c.subject === goal.subject,
  );
  const total = concepts.length;
  const earned = concepts.reduce((sum, c) => sum + c.mastery_level, 0);
  return {
    ...goal,
    progress: total ? earned / (total * 5) : 0,
    tracked: total,
    mastered: concepts.filter((c) => c.mastery_level >= 5).length,
  };
}

api.post('/goals', (req, res) => {
  const { title, subject, targetDate, detail } = req.body || {};
  if (!title) return res.status(400).json({ error: 'A goal needs a title.' });
  const goal = saveGoal(req.learnerId, { title, subject, target_date: targetDate, detail });
  res.json({ goal });
});

api.patch('/goals/:id', (req, res) => {
  const goal = listGoals(req.learnerId).find((g) => g.id === req.params.id);
  if (!goal) return res.status(404).json({ error: 'Not found' });
  const merged = saveGoal(req.learnerId, {
    ...goal,
    ...req.body,
    roadmap: req.body?.roadmap ? { ...goal.roadmap, ...req.body.roadmap } : goal.roadmap,
  });
  res.json({ goal: withProgress(req.learnerId, merged) });
});

/* --------------------------------------------------------------------- review */

api.get('/review/queue', (req, res) => {
  const due = dueConcepts(req.learnerId);
  res.json({
    due: due.map((c) => ({
      id: c.id,
      name: c.name,
      subject: c.subject,
      mastery_level: c.mastery_level,
      stage: c.review_stage,
      due: describeDue(c),
    })),
    upcoming: upcomingReviews(req.learnerId, 12).map((c) => ({
      id: c.id,
      name: c.name,
      subject: c.subject,
      due: describeDue(c),
      mastery_level: c.mastery_level,
    })),
  });
});

api.get('/sources', (req, res) => res.json({ sources: listSources(req.learnerId) }));

/* -------------------------------------------------------------------- courses */

api.get('/courses', (req, res) => res.json({ courses: listCoursesFor(req.learnerId) }));

// Build a whole course: the real syllabus, with the exam's own weighting.
api.post('/courses', (req, res) => {
  const { request, subject, level, examDate, instructions, sourceIds = [] } = req.body || {};
  if (!request || !String(request).trim()) {
    return res.status(400).json({ error: 'Name the course or exam you are preparing for.' });
  }
  return streamHandler(res, async (stream) => {
    stream.send('status', { stage: 'blueprint', message: 'Mapping the syllabus and its exam weighting…' });
    const push = throttle((partial) => stream.send('partial', partial), 140);
    const course = await createCourse({
      learnerId: req.learnerId,
      request: String(request).slice(0, 400),
      subject,
      level,
      examDate,
      instructions: String(instructions || '').slice(0, 1500),
      sourceIds,
      onPartial: push,
    });
    clearInsightCache(req.learnerId);
    stream.send('course', { snapshot: courseSnapshot(req.learnerId, course.id) });
    stream.send('done', { courseId: course.id });
  });
});

api.get('/courses/:id', (req, res) => {
  const snapshot = courseSnapshot(req.learnerId, req.params.id);
  if (!snapshot) return res.status(404).json({ error: 'Course not found' });
  res.json(snapshot);
});

api.patch('/courses/:id', (req, res) => {
  const course = getCourse(req.params.id);
  if (!course || course.learner_id !== req.learnerId) return res.status(404).json({ error: 'Course not found' });
  saveCourse(req.learnerId, {
    ...course,
    exam_date: req.body?.examDate !== undefined ? req.body.examDate : course.exam_date,
    state: {
      ...course.state,
      ...(req.body?.targetScore != null ? { targetScore: Number(req.body.targetScore) } : {}),
      ...(req.body?.minutesPerDay != null ? { minutesPerDay: Number(req.body.minutesPerDay) } : {}),
    },
  });
  res.json(courseSnapshot(req.learnerId, req.params.id));
});

api.delete('/courses/:id', (req, res) => {
  deleteCourse(req.learnerId, req.params.id);
  res.json({ ok: true });
});

// Build the next activity the readiness model says is worth the most marks.
api.post('/courses/:id/next', (req, res) => {
  const snapshot = courseSnapshot(req.learnerId, req.params.id);
  if (!snapshot) return res.status(404).json({ error: 'Course not found' });

  return streamHandler(res, async (stream) => {
    const action = snapshot.action;
    stream.send('action', { action });

    if (action.resource === 'exam') {
      stream.send('status', { stage: 'generating', message: 'Building a full practice paper to the exam blueprint…' });
      const push = throttle((partial) => stream.send('partial', partial), 140);
      const resource = await generateExam({ learnerId: req.learnerId, courseId: req.params.id, onPartial: push });
      stream.send('resource', { resource });
      stream.send('done', { resourceId: resource.id });
      return;
    }

    const unit = snapshot.readiness.leverage[0];
    stream.send('status', { stage: 'generating', message: action.title });
    const push = throttle((partial) => stream.send('partial', partial), 140);
    const resource = await generateResource({
      learnerId: req.learnerId,
      kind: action.resource === 'review' ? 'review' : action.resource,
      topic: action.unit || unit?.title || snapshot.course.title,
      subject: snapshot.course.subject,
      concepts: action.concepts?.length ? action.concepts : unit?.weakest || [],
      difficulty: action.kind === 'master' ? 4.5 : undefined,
      instructions:
        `This sits inside "${snapshot.course.title}". ${action.why} ` +
        'Pitch it at the level the real exam asks at, not at revision level.',
      onPartial: push,
    });
    clearInsightCache(req.learnerId);
    stream.send('resource', { resource });
    stream.send('done', { resourceId: resource.id });
  });
});

// A full mock paper built to the course blueprint.
api.post('/courses/:id/exam', (req, res) => {
  const snapshot = courseSnapshot(req.learnerId, req.params.id);
  if (!snapshot) return res.status(404).json({ error: 'Course not found' });

  return streamHandler(res, async (stream) => {
    stream.send('status', { stage: 'generating', message: 'Writing a paper to the real blueprint…' });
    const push = throttle((partial) => stream.send('partial', partial), 140);
    const resource = await generateExam({ learnerId: req.learnerId, courseId: req.params.id, onPartial: push });
    stream.send('resource', { resource });
    stream.send('done', { resourceId: resource.id });
  });
});
