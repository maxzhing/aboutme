import { all, get, run, now, readJson, writeJson } from './db.js';
import { id, slug as toSlug } from './util/ids.js';

/* ------------------------------------------------------------------ learners */

export function ensureLearner(learnerId = 'me') {
  const found = get('SELECT * FROM learners WHERE id = :id', { id: learnerId });
  if (found) return hydrateLearner(found);
  const ts = now();
  run(
    `INSERT INTO learners (id, display_name, prefs, created_at, updated_at)
     VALUES (:id, :name, '{}', :ts, :ts)`,
    { id: learnerId, name: 'Learner', ts },
  );
  return hydrateLearner(get('SELECT * FROM learners WHERE id = :id', { id: learnerId }));
}

const hydrateLearner = (row) => ({ ...row, prefs: readJson(row.prefs) });

export function updateLearner(learnerId, patch) {
  const learner = ensureLearner(learnerId);
  const prefs = { ...learner.prefs, ...(patch.prefs || {}) };
  run(
    `UPDATE learners SET display_name = :name, prefs = :prefs, updated_at = :ts WHERE id = :id`,
    {
      id: learnerId,
      name: patch.display_name ?? learner.display_name,
      prefs: writeJson(prefs),
      ts: now(),
    },
  );
  return ensureLearner(learnerId);
}

/* ------------------------------------------------------------------ concepts */

const hydrateConcept = (row) => (row ? { ...row, evidence: readJson(row.evidence) } : row);

export function upsertConcept(learnerId, { name, subject = 'General', parentId = null }) {
  const slug = toSlug(`${subject}-${name}`);
  const existing = get('SELECT * FROM concepts WHERE learner_id = :l AND slug = :s', {
    l: learnerId,
    s: slug,
  });
  if (existing) return hydrateConcept(existing);
  const ts = now();
  const conceptId = id('cpt');
  run(
    `INSERT INTO concepts (id, learner_id, subject, name, slug, parent_id, evidence, created_at, updated_at)
     VALUES (:id, :l, :subject, :name, :slug, :parent, '{}', :ts, :ts)`,
    { id: conceptId, l: learnerId, subject, name, slug, parent: parentId, ts },
  );
  return hydrateConcept(get('SELECT * FROM concepts WHERE id = :id', { id: conceptId }));
}

export const getConcept = (conceptId) =>
  hydrateConcept(get('SELECT * FROM concepts WHERE id = :id', { id: conceptId }));

export const listConcepts = (learnerId) =>
  all('SELECT * FROM concepts WHERE learner_id = :l ORDER BY updated_at DESC', {
    l: learnerId,
  }).map(hydrateConcept);

export function saveConcept(concept) {
  run(
    `UPDATE concepts SET
       mastery_level = :mastery_level, mastery_score = :mastery_score, ability = :ability,
       attempts = :attempts, correct = :correct, streak = :streak, evidence = :evidence,
       last_seen_at = :last_seen_at, next_review_at = :next_review_at,
       interval_days = :interval_days, ease = :ease, review_stage = :review_stage,
       subject = :subject, updated_at = :ts
     WHERE id = :id`,
    {
      id: concept.id,
      mastery_level: concept.mastery_level,
      mastery_score: concept.mastery_score,
      ability: concept.ability,
      attempts: concept.attempts,
      correct: concept.correct,
      streak: concept.streak,
      evidence: writeJson(concept.evidence || {}),
      last_seen_at: concept.last_seen_at ?? null,
      next_review_at: concept.next_review_at ?? null,
      interval_days: concept.interval_days,
      ease: concept.ease,
      review_stage: concept.review_stage,
      subject: concept.subject,
      ts: now(),
    },
  );
  return getConcept(concept.id);
}

export const dueConcepts = (learnerId, when = now()) =>
  all(
    `SELECT * FROM concepts
     WHERE learner_id = :l AND next_review_at IS NOT NULL AND next_review_at <= :when
     ORDER BY next_review_at ASC`,
    { l: learnerId, when },
  ).map(hydrateConcept);

export const upcomingReviews = (learnerId, limit = 12) =>
  all(
    `SELECT * FROM concepts
     WHERE learner_id = :l AND next_review_at IS NOT NULL
     ORDER BY next_review_at ASC LIMIT :limit`,
    { l: learnerId, limit },
  ).map(hydrateConcept);

export const weakConcepts = (learnerId, limit = 8) =>
  all(
    `SELECT * FROM concepts
     WHERE learner_id = :l AND attempts > 0 AND mastery_level < 4
     ORDER BY (CAST(correct AS REAL) / attempts) ASC, attempts DESC
     LIMIT :limit`,
    { l: learnerId, limit },
  ).map(hydrateConcept);

/* ------------------------------------------------------------------ sessions */

const hydrateSession = (row) =>
  row ? { ...row, plan: readJson(row.plan), state: readJson(row.state) } : row;

export function createSession(learnerId, { title, mode = 'learn', subject, topic, plan = {}, state = {} }) {
  const ts = now();
  const sessionId = id('ses');
  run(
    `INSERT INTO sessions (id, learner_id, title, mode, subject, topic, plan, state, created_at, updated_at)
     VALUES (:id, :l, :title, :mode, :subject, :topic, :plan, :state, :ts, :ts)`,
    {
      id: sessionId,
      l: learnerId,
      title,
      mode,
      subject: subject ?? null,
      topic: topic ?? null,
      plan: writeJson(plan),
      state: writeJson(state),
      ts,
    },
  );
  return getSession(sessionId);
}

export const getSession = (sessionId) =>
  hydrateSession(get('SELECT * FROM sessions WHERE id = :id', { id: sessionId }));

export function updateSession(sessionId, patch) {
  const session = getSession(sessionId);
  if (!session) return null;
  run(
    `UPDATE sessions SET title = :title, mode = :mode, subject = :subject, topic = :topic,
       plan = :plan, state = :state, status = :status, updated_at = :ts WHERE id = :id`,
    {
      id: sessionId,
      title: patch.title ?? session.title,
      mode: patch.mode ?? session.mode,
      subject: patch.subject ?? session.subject,
      topic: patch.topic ?? session.topic,
      plan: writeJson(patch.plan ?? session.plan),
      state: writeJson(patch.state ?? session.state),
      status: patch.status ?? session.status,
      ts: now(),
    },
  );
  return getSession(sessionId);
}

export const listSessions = (learnerId, limit = 20) =>
  all(
    `SELECT * FROM sessions WHERE learner_id = :l ORDER BY updated_at DESC LIMIT :limit`,
    { l: learnerId, limit },
  ).map(hydrateSession);

/* ------------------------------------------------------------------ messages */

export function addMessage(sessionId, role, body) {
  const messageId = id('msg');
  run(
    `INSERT INTO messages (id, session_id, role, body, created_at)
     VALUES (:id, :s, :role, :body, :ts)`,
    { id: messageId, s: sessionId, role, body: writeJson(body), ts: now() },
  );
  return { id: messageId, session_id: sessionId, role, body, created_at: now() };
}

export const listMessages = (sessionId, limit = 200) =>
  all(
    `SELECT * FROM messages WHERE session_id = :s ORDER BY created_at ASC, rowid ASC LIMIT :limit`,
    { s: sessionId, limit },
  ).map((row) => ({ ...row, body: readJson(row.body) }));

/* ----------------------------------------------------------------- resources */

const hydrateResource = (row) => (row ? { ...row, payload: readJson(row.payload) } : row);

export function saveResource(learnerId, resource) {
  const ts = now();
  const resourceId = resource.id || id('res');
  const existing = resource.id ? get('SELECT id FROM resources WHERE id = :id', { id: resource.id }) : null;
  if (existing) {
    run(
      `UPDATE resources SET title = :title, payload = :payload, status = :status,
         score = :score, max_score = :max_score, difficulty = :difficulty, updated_at = :ts
       WHERE id = :id`,
      {
        id: resourceId,
        title: resource.title,
        payload: writeJson(resource.payload),
        status: resource.status || 'ready',
        score: resource.score ?? null,
        max_score: resource.max_score ?? null,
        difficulty: resource.difficulty ?? 3,
        ts,
      },
    );
  } else {
    run(
      `INSERT INTO resources (id, learner_id, session_id, kind, title, subject, topic, difficulty, payload, status, score, max_score, created_at, updated_at)
       VALUES (:id, :l, :s, :kind, :title, :subject, :topic, :difficulty, :payload, :status, :score, :max_score, :ts, :ts)`,
      {
        id: resourceId,
        l: learnerId,
        s: resource.session_id ?? null,
        kind: resource.kind,
        title: resource.title,
        subject: resource.subject ?? null,
        topic: resource.topic ?? null,
        difficulty: resource.difficulty ?? 3,
        payload: writeJson(resource.payload),
        status: resource.status || 'ready',
        score: resource.score ?? null,
        max_score: resource.max_score ?? null,
        ts,
      },
    );
  }
  return getResource(resourceId);
}

export const getResource = (resourceId) =>
  hydrateResource(get('SELECT * FROM resources WHERE id = :id', { id: resourceId }));

export const listResources = (learnerId, { limit = 30, kind } = {}) =>
  all(
    `SELECT id, learner_id, session_id, kind, title, subject, topic, difficulty, status, score, max_score, created_at, updated_at
     FROM resources WHERE learner_id = :l ${kind ? 'AND kind = :kind' : ''}
     ORDER BY created_at DESC LIMIT :limit`,
    kind ? { l: learnerId, kind, limit } : { l: learnerId, limit },
  );

export const listSessionResources = (sessionId) =>
  all(
    `SELECT id, kind, title, difficulty, status, score, max_score, created_at
     FROM resources WHERE session_id = :s ORDER BY created_at ASC`,
    { s: sessionId },
  );

/* ------------------------------------------------------------------ attempts */

export function recordAttempt(learnerId, attempt) {
  const attemptId = id('att');
  run(
    `INSERT INTO attempts (id, learner_id, resource_id, session_id, question_id, concept_id, concept_name,
       prompt, answer, verdict, score, max_score, difficulty, error_type, misconception, feedback, elapsed_ms, created_at)
     VALUES (:id, :l, :res, :ses, :q, :cpt, :cname, :prompt, :answer, :verdict, :score, :max, :diff,
       :error_type, :misconception, :feedback, :elapsed, :ts)`,
    {
      id: attemptId,
      l: learnerId,
      res: attempt.resource_id ?? null,
      ses: attempt.session_id ?? null,
      q: attempt.question_id ?? null,
      cpt: attempt.concept_id ?? null,
      cname: attempt.concept_name ?? null,
      prompt: attempt.prompt ?? null,
      answer: attempt.answer ?? null,
      verdict: attempt.verdict,
      score: attempt.score ?? 0,
      max: attempt.max_score ?? 1,
      diff: attempt.difficulty ?? 3,
      error_type: attempt.error_type ?? null,
      misconception: attempt.misconception ?? null,
      feedback: writeJson(attempt.feedback ?? null),
      elapsed: attempt.elapsed_ms ?? null,
      ts: now(),
    },
  );
  return attemptId;
}

export const recentAttempts = (learnerId, limit = 40) =>
  all(
    `SELECT * FROM attempts WHERE learner_id = :l ORDER BY created_at DESC, rowid DESC LIMIT :limit`,
    { l: learnerId, limit },
  ).map((row) => ({ ...row, feedback: readJson(row.feedback, null) }));

export const conceptAttempts = (conceptId, limit = 20) =>
  all(
    `SELECT * FROM attempts WHERE concept_id = :c ORDER BY created_at DESC, rowid DESC LIMIT :limit`,
    { c: conceptId, limit },
  ).map((row) => ({ ...row, feedback: readJson(row.feedback, null) }));

/* ------------------------------------------------------------- misconceptions */

export function noteMisconception(learnerId, { conceptId, label, detail, errorType }) {
  if (!label) return null;
  const existing = get(
    `SELECT * FROM misconceptions WHERE learner_id = :l AND label = :label AND IFNULL(concept_id,'') = IFNULL(:c,'')`,
    { l: learnerId, label, c: conceptId ?? null },
  );
  const ts = now();
  if (existing) {
    run(
      `UPDATE misconceptions SET count = count + 1, last_seen = :ts, resolved = 0, detail = :detail WHERE id = :id`,
      { id: existing.id, ts, detail: detail ?? existing.detail },
    );
    return existing.id;
  }
  const misconceptionId = id('mis');
  run(
    `INSERT INTO misconceptions (id, learner_id, concept_id, label, detail, error_type, first_seen, last_seen)
     VALUES (:id, :l, :c, :label, :detail, :et, :ts, :ts)`,
    { id: misconceptionId, l: learnerId, c: conceptId ?? null, label, detail: detail ?? null, et: errorType ?? null, ts },
  );
  return misconceptionId;
}

export function resolveMisconceptions(learnerId, conceptId) {
  run(`UPDATE misconceptions SET resolved = 1 WHERE learner_id = :l AND concept_id = :c`, {
    l: learnerId,
    c: conceptId,
  });
}

export const listMisconceptions = (learnerId, { openOnly = true, limit = 20 } = {}) =>
  all(
    `SELECT * FROM misconceptions WHERE learner_id = :l ${openOnly ? 'AND resolved = 0' : ''}
     ORDER BY count DESC, last_seen DESC LIMIT :limit`,
    { l: learnerId, limit },
  );

/* --------------------------------------------------------------------- goals */

const hydrateGoal = (row) => (row ? { ...row, roadmap: readJson(row.roadmap) } : row);

export function saveGoal(learnerId, goal) {
  const ts = now();
  const goalId = goal.id || id('goal');
  const existing = goal.id ? get('SELECT id FROM goals WHERE id = :id', { id: goal.id }) : null;
  if (existing) {
    run(
      `UPDATE goals SET title = :title, detail = :detail, subject = :subject, target_date = :td,
         status = :status, roadmap = :roadmap, updated_at = :ts WHERE id = :id`,
      {
        id: goalId,
        title: goal.title,
        detail: goal.detail ?? null,
        subject: goal.subject ?? null,
        td: goal.target_date ?? null,
        status: goal.status || 'active',
        roadmap: writeJson(goal.roadmap ?? {}),
        ts,
      },
    );
  } else {
    run(
      `INSERT INTO goals (id, learner_id, title, detail, subject, target_date, status, roadmap, created_at, updated_at)
       VALUES (:id, :l, :title, :detail, :subject, :td, :status, :roadmap, :ts, :ts)`,
      {
        id: goalId,
        l: learnerId,
        title: goal.title,
        detail: goal.detail ?? null,
        subject: goal.subject ?? null,
        td: goal.target_date ?? null,
        status: goal.status || 'active',
        roadmap: writeJson(goal.roadmap ?? {}),
        ts,
      },
    );
  }
  return hydrateGoal(get('SELECT * FROM goals WHERE id = :id', { id: goalId }));
}

export const listGoals = (learnerId) =>
  all(`SELECT * FROM goals WHERE learner_id = :l ORDER BY created_at DESC`, { l: learnerId }).map(
    hydrateGoal,
  );

export const getGoal = (goalId) => hydrateGoal(get('SELECT * FROM goals WHERE id = :id', { id: goalId }));

/* ------------------------------------------------------------------- sources */

export function saveSource(learnerId, source) {
  const sourceId = id('src');
  run(
    `INSERT INTO sources (id, learner_id, name, mime, bytes, kind, path, text, summary, created_at)
     VALUES (:id, :l, :name, :mime, :bytes, :kind, :path, :text, :summary, :ts)`,
    {
      id: sourceId,
      l: learnerId,
      name: source.name,
      mime: source.mime,
      bytes: source.bytes,
      kind: source.kind,
      path: source.path ?? null,
      text: source.text ?? null,
      summary: source.summary ?? null,
      ts: now(),
    },
  );
  return getSource(sourceId);
}

export const getSource = (sourceId) => get('SELECT * FROM sources WHERE id = :id', { id: sourceId });

export const listSources = (learnerId) =>
  all(
    `SELECT id, name, mime, bytes, kind, summary, created_at FROM sources
     WHERE learner_id = :l ORDER BY created_at DESC`,
    { l: learnerId },
  );

export function updateSourceSummary(sourceId, summary) {
  run('UPDATE sources SET summary = :s WHERE id = :id', { id: sourceId, s: summary });
}

/* -------------------------------------------------------------------- events */

export function logEvent(learnerId, kind, detail = {}) {
  run(
    `INSERT INTO events (id, learner_id, kind, detail, created_at) VALUES (:id, :l, :kind, :detail, :ts)`,
    { id: id('evt'), l: learnerId, kind, detail: writeJson(detail), ts: now() },
  );
}

export const listEvents = (learnerId, limit = 40) =>
  all(`SELECT * FROM events WHERE learner_id = :l ORDER BY created_at DESC LIMIT :limit`, {
    l: learnerId,
    limit,
  }).map((row) => ({ ...row, detail: readJson(row.detail) }));
