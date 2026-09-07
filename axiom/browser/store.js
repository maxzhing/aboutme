import { id, slug as toSlug } from './ids.js';

/**
 * Browser replacement for server/store.js.
 *
 * Same exported surface, so every engine module above it runs unchanged; the
 * SQL is replaced by arrays held in memory and mirrored into localStorage.
 * Writes are debounced because the learning loop touches the store many times
 * per answer and serialising the whole database on each touch would show up as
 * jank in the middle of a lesson.
 */

const DB_KEY = 'axiom:db:v1';
const TABLES = [
  'learners', 'concepts', 'sessions', 'messages', 'resources', 'attempts',
  'misconceptions', 'goals', 'sources', 'events', 'courses', 'exam_results',
];

/** Rows that are safe to shed, in the order they should be shed, if storage fills. */
const PRUNE_ORDER = [
  ['events', 40],
  ['attempts', 200],
  ['messages', 400],
  ['sources', 6],
  ['resources', 40],
];

const now = () => new Date().toISOString();

function emptyDb() {
  return Object.fromEntries(TABLES.map((t) => [t, []]));
}

function load() {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (!raw) return emptyDb();
    const parsed = JSON.parse(raw);
    const db = emptyDb();
    for (const table of TABLES) if (Array.isArray(parsed[table])) db[table] = parsed[table];
    return db;
  } catch {
    return emptyDb();
  }
}

let db = load();
let timer = null;
let persistBlocked = false;

/** Everything the app knows, for export and for the storage meter. */
export const snapshotDb = () => db;
export const storageBlocked = () => persistBlocked;

export function replaceDb(next) {
  db = emptyDb();
  for (const table of TABLES) if (Array.isArray(next?.[table])) db[table] = next[table];
  flush();
  return db;
}

export function resetDb() {
  db = emptyDb();
  flush();
}

function flush() {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  for (let attempt = 0; attempt <= PRUNE_ORDER.length; attempt++) {
    try {
      localStorage.setItem(DB_KEY, JSON.stringify(db));
      persistBlocked = false;
      return true;
    } catch (err) {
      const quota = err?.name === 'QuotaExceededError' || err?.code === 22 || err?.code === 1014;
      if (!quota || attempt === PRUNE_ORDER.length) {
        // The app keeps working from memory; only durability is lost.
        persistBlocked = true;
        return false;
      }
      const [table, keep] = PRUNE_ORDER[attempt];
      db[table] = db[table].slice(-keep);
    }
  }
  return false;
}

function persist() {
  if (timer) return;
  timer = setTimeout(() => {
    timer = null;
    flush();
  }, 250);
}

if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', flush);
  window.addEventListener('beforeunload', flush);
}

/* ------------------------------------------------------------------- helpers */

const clone = (row) => (row ? JSON.parse(JSON.stringify(row)) : row);
const byLearner = (table, learnerId) => db[table].filter((r) => r.learner_id === learnerId);
const findById = (table, rowId) => db[table].find((r) => r.id === rowId);
const desc = (key) => (a, b) => String(b[key] || '').localeCompare(String(a[key] || ''));
const asc = (key) => (a, b) => String(a[key] || '').localeCompare(String(b[key] || ''));

function insert(table, row) {
  db[table].push(row);
  persist();
  return row;
}

/* ------------------------------------------------------------------ learners */

export function ensureLearner(learnerId = 'me') {
  const found = findById('learners', learnerId);
  if (found) return clone(found);
  const ts = now();
  return clone(
    insert('learners', {
      id: learnerId,
      display_name: 'Learner',
      prefs: {},
      created_at: ts,
      updated_at: ts,
    }),
  );
}

export function updateLearner(learnerId, patch) {
  ensureLearner(learnerId);
  const row = findById('learners', learnerId);
  row.prefs = { ...row.prefs, ...(patch.prefs || {}) };
  if (patch.display_name != null) row.display_name = patch.display_name;
  row.updated_at = now();
  persist();
  return clone(row);
}

/* ------------------------------------------------------------------ concepts */

const CONCEPT_DEFAULTS = {
  mastery_level: 0,
  mastery_score: 0,
  ability: 2,
  attempts: 0,
  correct: 0,
  streak: 0,
  evidence: {},
  last_seen_at: null,
  next_review_at: null,
  interval_days: 0,
  ease: 2.5,
  review_stage: 0,
};

/**
 * Concepts are identified by name, not by subject — see the note in
 * server/store.js. Subject is an attribute of a concept, not its identity.
 */
export function upsertConcept(learnerId, { name, subject = 'General', parentId = null }) {
  const wanted = toSlug(name);
  const lower = String(name).toLowerCase();
  const existing = byLearner('concepts', learnerId)
    .filter((c) => c.slug === wanted || c.name.toLowerCase() === lower)
    .sort((a, b) => (b.attempts ?? 0) - (a.attempts ?? 0))[0];

  if (existing) {
    if (subject !== 'General' && existing.subject === 'General') {
      existing.subject = subject;
      existing.updated_at = now();
      persist();
    }
    return clone(existing);
  }

  const ts = now();
  return clone(
    insert('concepts', {
      ...CONCEPT_DEFAULTS,
      id: id('cpt'),
      learner_id: learnerId,
      subject,
      name,
      slug: wanted,
      parent_id: parentId,
      created_at: ts,
      updated_at: ts,
    }),
  );
}

export const getConcept = (conceptId) => clone(findById('concepts', conceptId));

export const listConcepts = (learnerId) => byLearner('concepts', learnerId).sort(desc('updated_at')).map(clone);

export function saveConcept(concept) {
  const row = findById('concepts', concept.id);
  if (!row) return null;
  Object.assign(row, {
    mastery_level: concept.mastery_level,
    mastery_score: concept.mastery_score,
    ability: concept.ability,
    attempts: concept.attempts,
    correct: concept.correct,
    streak: concept.streak,
    evidence: concept.evidence || {},
    last_seen_at: concept.last_seen_at ?? null,
    next_review_at: concept.next_review_at ?? null,
    interval_days: concept.interval_days,
    ease: concept.ease,
    review_stage: concept.review_stage,
    subject: concept.subject,
    updated_at: now(),
  });
  persist();
  return clone(row);
}

export const dueConcepts = (learnerId, when = now()) =>
  byLearner('concepts', learnerId)
    .filter((c) => c.next_review_at && c.next_review_at <= when)
    .sort(asc('next_review_at'))
    .map(clone);

export const upcomingReviews = (learnerId, limit = 12) =>
  byLearner('concepts', learnerId)
    .filter((c) => c.next_review_at)
    .sort(asc('next_review_at'))
    .slice(0, limit)
    .map(clone);

export const weakConcepts = (learnerId, limit = 8) =>
  byLearner('concepts', learnerId)
    .filter((c) => c.attempts > 0 && c.mastery_level < 4)
    .sort((a, b) => a.correct / a.attempts - b.correct / b.attempts || b.attempts - a.attempts)
    .slice(0, limit)
    .map(clone);

/* ------------------------------------------------------------------ sessions */

export function createSession(learnerId, { title, mode = 'learn', subject, topic, plan = {}, state = {} }) {
  const ts = now();
  return clone(
    insert('sessions', {
      id: id('ses'),
      learner_id: learnerId,
      title,
      mode,
      subject: subject ?? null,
      topic: topic ?? null,
      plan,
      state,
      status: 'active',
      created_at: ts,
      updated_at: ts,
    }),
  );
}

export const getSession = (sessionId) => clone(findById('sessions', sessionId));

export function updateSession(sessionId, patch) {
  const row = findById('sessions', sessionId);
  if (!row) return null;
  Object.assign(row, {
    title: patch.title ?? row.title,
    mode: patch.mode ?? row.mode,
    subject: patch.subject ?? row.subject,
    topic: patch.topic ?? row.topic,
    plan: patch.plan ?? row.plan,
    state: patch.state ?? row.state,
    status: patch.status ?? row.status,
    updated_at: now(),
  });
  persist();
  return clone(row);
}

export const listSessions = (learnerId, limit = 20) =>
  byLearner('sessions', learnerId).sort(desc('updated_at')).slice(0, limit).map(clone);

/* ------------------------------------------------------------------ messages */

export function addMessage(sessionId, role, body) {
  return clone(
    insert('messages', { id: id('msg'), session_id: sessionId, role, body, created_at: now() }),
  );
}

export const listMessages = (sessionId, limit = 200) =>
  db.messages.filter((m) => m.session_id === sessionId).slice(0, limit).map(clone);

/* ----------------------------------------------------------------- resources */

export function saveResource(learnerId, resource) {
  const ts = now();
  const existing = resource.id ? findById('resources', resource.id) : null;
  if (existing) {
    Object.assign(existing, {
      title: resource.title,
      payload: resource.payload,
      status: resource.status || 'ready',
      score: resource.score ?? null,
      max_score: resource.max_score ?? null,
      difficulty: resource.difficulty ?? 3,
      updated_at: ts,
    });
    persist();
    return clone(existing);
  }
  return clone(
    insert('resources', {
      id: resource.id || id('res'),
      learner_id: learnerId,
      session_id: resource.session_id ?? null,
      kind: resource.kind,
      title: resource.title,
      subject: resource.subject ?? null,
      topic: resource.topic ?? null,
      difficulty: resource.difficulty ?? 3,
      payload: resource.payload,
      status: resource.status || 'ready',
      score: resource.score ?? null,
      max_score: resource.max_score ?? null,
      created_at: ts,
      updated_at: ts,
    }),
  );
}

export const getResource = (resourceId) => clone(findById('resources', resourceId));

const RESOURCE_SUMMARY = [
  'id', 'learner_id', 'session_id', 'kind', 'title', 'subject', 'topic',
  'difficulty', 'status', 'score', 'max_score', 'created_at', 'updated_at',
];

const pick = (row, keys) => Object.fromEntries(keys.map((k) => [k, row[k]]));

export const listResources = (learnerId, { limit = 30, kind } = {}) =>
  byLearner('resources', learnerId)
    .filter((r) => !kind || r.kind === kind)
    .sort(desc('created_at'))
    .slice(0, limit)
    .map((r) => pick(r, RESOURCE_SUMMARY));

export const listSessionResources = (sessionId) =>
  db.resources
    .filter((r) => r.session_id === sessionId)
    .sort(asc('created_at'))
    .map((r) => pick(r, ['id', 'kind', 'title', 'difficulty', 'status', 'score', 'max_score', 'created_at']));

/* ------------------------------------------------------------------ attempts */

export function recordAttempt(learnerId, attempt) {
  const attemptId = id('att');
  insert('attempts', {
    id: attemptId,
    learner_id: learnerId,
    resource_id: attempt.resource_id ?? null,
    session_id: attempt.session_id ?? null,
    question_id: attempt.question_id ?? null,
    concept_id: attempt.concept_id ?? null,
    concept_name: attempt.concept_name ?? null,
    prompt: attempt.prompt ?? null,
    answer: attempt.answer ?? null,
    verdict: attempt.verdict,
    score: attempt.score ?? 0,
    max_score: attempt.max_score ?? 1,
    difficulty: attempt.difficulty ?? 3,
    error_type: attempt.error_type ?? null,
    misconception: attempt.misconception ?? null,
    feedback: attempt.feedback ?? null,
    elapsed_ms: attempt.elapsed_ms ?? null,
    created_at: now(),
  });
  return attemptId;
}

export const recentAttempts = (learnerId, limit = 40) =>
  byLearner('attempts', learnerId).slice().reverse().slice(0, limit).map(clone);

export const conceptAttempts = (conceptId, limit = 20) =>
  db.attempts.filter((a) => a.concept_id === conceptId).slice().reverse().slice(0, limit).map(clone);

/* ------------------------------------------------------------- misconceptions */

export function noteMisconception(learnerId, { conceptId, label, detail, errorType }) {
  if (!label) return null;
  const existing = byLearner('misconceptions', learnerId).find(
    (m) => m.label === label && (m.concept_id ?? '') === (conceptId ?? ''),
  );
  const ts = now();
  if (existing) {
    existing.count += 1;
    existing.last_seen = ts;
    existing.resolved = 0;
    existing.detail = detail ?? existing.detail;
    persist();
    return existing.id;
  }
  const misconceptionId = id('mis');
  insert('misconceptions', {
    id: misconceptionId,
    learner_id: learnerId,
    concept_id: conceptId ?? null,
    label,
    detail: detail ?? null,
    error_type: errorType ?? null,
    count: 1,
    resolved: 0,
    first_seen: ts,
    last_seen: ts,
  });
  return misconceptionId;
}

export function resolveMisconceptions(learnerId, conceptId) {
  for (const m of byLearner('misconceptions', learnerId)) {
    if (m.concept_id === conceptId) m.resolved = 1;
  }
  persist();
}

export const listMisconceptions = (learnerId, { openOnly = true, limit = 20 } = {}) =>
  byLearner('misconceptions', learnerId)
    .filter((m) => !openOnly || !m.resolved)
    .sort((a, b) => b.count - a.count || String(b.last_seen).localeCompare(String(a.last_seen)))
    .slice(0, limit)
    .map(clone);

/* --------------------------------------------------------------------- goals */

export function saveGoal(learnerId, goal) {
  const ts = now();
  const existing = goal.id ? findById('goals', goal.id) : null;
  if (existing) {
    Object.assign(existing, {
      title: goal.title,
      detail: goal.detail ?? null,
      subject: goal.subject ?? null,
      target_date: goal.target_date ?? null,
      status: goal.status || 'active',
      roadmap: goal.roadmap ?? {},
      updated_at: ts,
    });
    persist();
    return clone(existing);
  }
  return clone(
    insert('goals', {
      id: goal.id || id('goal'),
      learner_id: learnerId,
      title: goal.title,
      detail: goal.detail ?? null,
      subject: goal.subject ?? null,
      target_date: goal.target_date ?? null,
      status: goal.status || 'active',
      roadmap: goal.roadmap ?? {},
      created_at: ts,
      updated_at: ts,
    }),
  );
}

export const listGoals = (learnerId) => byLearner('goals', learnerId).sort(desc('created_at')).map(clone);
export const getGoal = (goalId) => clone(findById('goals', goalId));

/* ------------------------------------------------------------------- sources */

export function saveSource(learnerId, source) {
  return clone(
    insert('sources', {
      id: id('src'),
      learner_id: learnerId,
      name: source.name,
      mime: source.mime,
      bytes: source.bytes,
      kind: source.kind,
      // In the browser there is no filesystem: binary sources are held inline
      // as base64 so they can go straight back up as a document block.
      path: null,
      data: source.data ?? null,
      text: source.text ?? null,
      summary: source.summary ?? null,
      created_at: now(),
    }),
  );
}

export const getSource = (sourceId) => clone(findById('sources', sourceId));

export const listSources = (learnerId) =>
  byLearner('sources', learnerId)
    .sort(desc('created_at'))
    .map((s) => pick(s, ['id', 'name', 'mime', 'bytes', 'kind', 'summary', 'created_at']));

export function updateSourceSummary(sourceId, summary) {
  const row = findById('sources', sourceId);
  if (row) {
    row.summary = summary;
    persist();
  }
}

export function deleteSource(learnerId, sourceId) {
  db.sources = db.sources.filter((s) => !(s.id === sourceId && s.learner_id === learnerId));
  persist();
}

/* -------------------------------------------------------------------- events */

export function logEvent(learnerId, kind, detail = {}) {
  insert('events', { id: id('evt'), learner_id: learnerId, kind, detail, created_at: now() });
}

export const listEvents = (learnerId, limit = 40) =>
  byLearner('events', learnerId).slice().reverse().slice(0, limit).map(clone);

/* ------------------------------------------------------------------ courses */

export function saveCourse(learnerId, course) {
  const ts = now();
  const existing = course.id ? findById('courses', course.id) : null;
  if (existing && existing.learner_id === learnerId) {
    Object.assign(existing, {
      title: course.title,
      exam: course.exam ?? null,
      subject: course.subject ?? null,
      level: course.level ?? null,
      exam_date: course.exam_date ?? null,
      blueprint: course.blueprint ?? {},
      state: course.state ?? {},
      status: course.status || 'active',
      updated_at: ts,
    });
    persist();
    return clone(existing);
  }
  return clone(
    insert('courses', {
      id: course.id || id('crs'),
      learner_id: learnerId,
      title: course.title,
      exam: course.exam ?? null,
      subject: course.subject ?? null,
      level: course.level ?? null,
      exam_date: course.exam_date ?? null,
      blueprint: course.blueprint ?? {},
      state: course.state ?? {},
      status: course.status || 'active',
      created_at: ts,
      updated_at: ts,
    }),
  );
}

export const getCourse = (courseId) => clone(findById('courses', courseId));

export const listCourses = (learnerId) =>
  byLearner('courses', learnerId).sort(desc('updated_at')).map(clone);

export function deleteCourse(learnerId, courseId) {
  db.courses = db.courses.filter((c) => !(c.id === courseId && c.learner_id === learnerId));
  persist();
}

export function recordExamResult(learnerId, result) {
  const resultId = id('exm');
  insert('exam_results', {
    id: resultId,
    learner_id: learnerId,
    course_id: result.course_id,
    resource_id: result.resource_id ?? null,
    percent: result.percent,
    score: result.score ?? null,
    by_unit: result.by_unit ?? {},
    created_at: now(),
  });
  return resultId;
}

export const listExamResults = (courseId, limit = 10) =>
  db.exam_results
    .filter((r) => r.course_id === courseId)
    .sort(desc('created_at'))
    .slice(0, limit)
    .map(clone);
