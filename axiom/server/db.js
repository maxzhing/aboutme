import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { config } from './config.js';
import { logger } from './util/log.js';

const log = logger('db');

const SCHEMA = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS learners (
  id           TEXT PRIMARY KEY,
  display_name TEXT NOT NULL DEFAULT 'Learner',
  prefs        TEXT NOT NULL DEFAULT '{}',
  created_at   TEXT NOT NULL,
  updated_at   TEXT NOT NULL
);

-- One row per concept the learner has ever touched. This is the spine of the
-- learner model: mastery, ability estimate and the spaced-review schedule all
-- live here.
CREATE TABLE IF NOT EXISTS concepts (
  id            TEXT PRIMARY KEY,
  learner_id    TEXT NOT NULL REFERENCES learners(id) ON DELETE CASCADE,
  subject       TEXT NOT NULL DEFAULT 'General',
  name          TEXT NOT NULL,
  slug          TEXT NOT NULL,
  parent_id     TEXT,
  mastery_level INTEGER NOT NULL DEFAULT 0,   -- 0..5
  mastery_score REAL    NOT NULL DEFAULT 0,   -- 0..1 continuous evidence score
  ability       REAL    NOT NULL DEFAULT 2.0, -- estimated difficulty they can handle (1..5)
  attempts      INTEGER NOT NULL DEFAULT 0,
  correct       INTEGER NOT NULL DEFAULT 0,
  streak        INTEGER NOT NULL DEFAULT 0,
  evidence      TEXT NOT NULL DEFAULT '{}',   -- {recall,explain,solve,apply,transfer}
  last_seen_at  TEXT,
  next_review_at TEXT,
  interval_days REAL NOT NULL DEFAULT 0,
  ease          REAL NOT NULL DEFAULT 2.3,
  review_stage  INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL,
  UNIQUE (learner_id, slug)
);
CREATE INDEX IF NOT EXISTS idx_concepts_review ON concepts(learner_id, next_review_at);

CREATE TABLE IF NOT EXISTS sessions (
  id           TEXT PRIMARY KEY,
  learner_id   TEXT NOT NULL REFERENCES learners(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  mode         TEXT NOT NULL DEFAULT 'learn',
  subject      TEXT,
  topic        TEXT,
  plan         TEXT NOT NULL DEFAULT '{}',    -- routed learning plan
  state        TEXT NOT NULL DEFAULT '{}',    -- phase, concept ids, counters
  status       TEXT NOT NULL DEFAULT 'active',
  created_at   TEXT NOT NULL,
  updated_at   TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_learner ON sessions(learner_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS messages (
  id         TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  role       TEXT NOT NULL,          -- user | tutor
  body       TEXT NOT NULL,          -- JSON turn payload
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id, created_at);

CREATE TABLE IF NOT EXISTS resources (
  id          TEXT PRIMARY KEY,
  learner_id  TEXT NOT NULL REFERENCES learners(id) ON DELETE CASCADE,
  session_id  TEXT,
  kind        TEXT NOT NULL,         -- lesson | worksheet | quiz | test | ...
  title       TEXT NOT NULL,
  subject     TEXT,
  topic       TEXT,
  difficulty  REAL NOT NULL DEFAULT 3,
  payload     TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'ready',  -- ready | submitted | graded
  score       REAL,
  max_score   REAL,
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_resources_learner ON resources(learner_id, created_at DESC);

CREATE TABLE IF NOT EXISTS attempts (
  id            TEXT PRIMARY KEY,
  learner_id    TEXT NOT NULL REFERENCES learners(id) ON DELETE CASCADE,
  resource_id   TEXT,
  session_id    TEXT,
  question_id   TEXT,
  concept_id    TEXT,
  concept_name  TEXT,
  prompt        TEXT,
  answer        TEXT,
  verdict       TEXT,                -- correct | partial | incorrect
  score         REAL NOT NULL DEFAULT 0,
  max_score     REAL NOT NULL DEFAULT 1,
  difficulty    REAL NOT NULL DEFAULT 3,
  error_type    TEXT,
  misconception TEXT,
  feedback      TEXT,
  elapsed_ms    INTEGER,
  created_at    TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_attempts_learner ON attempts(learner_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_attempts_concept ON attempts(concept_id, created_at DESC);

CREATE TABLE IF NOT EXISTS misconceptions (
  id          TEXT PRIMARY KEY,
  learner_id  TEXT NOT NULL REFERENCES learners(id) ON DELETE CASCADE,
  concept_id  TEXT,
  label       TEXT NOT NULL,
  detail      TEXT,
  error_type  TEXT,
  count       INTEGER NOT NULL DEFAULT 1,
  resolved    INTEGER NOT NULL DEFAULT 0,
  first_seen  TEXT NOT NULL,
  last_seen   TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_misconceptions_learner ON misconceptions(learner_id, resolved, count DESC);

CREATE TABLE IF NOT EXISTS goals (
  id          TEXT PRIMARY KEY,
  learner_id  TEXT NOT NULL REFERENCES learners(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  detail      TEXT,
  subject     TEXT,
  target_date TEXT,
  status      TEXT NOT NULL DEFAULT 'active',
  roadmap     TEXT NOT NULL DEFAULT '{}',
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sources (
  id          TEXT PRIMARY KEY,
  learner_id  TEXT NOT NULL REFERENCES learners(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  mime        TEXT NOT NULL,
  bytes       INTEGER NOT NULL,
  kind        TEXT NOT NULL,         -- pdf | image | text
  path        TEXT,
  text        TEXT,
  summary     TEXT,
  created_at  TEXT NOT NULL
);

-- A whole course the learner is working through, with the exam blueprint that
-- decides how much each unit is actually worth.
CREATE TABLE IF NOT EXISTS courses (
  id         TEXT PRIMARY KEY,
  learner_id TEXT NOT NULL REFERENCES learners(id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  exam       TEXT,
  subject    TEXT,
  level      TEXT,
  exam_date  TEXT,
  blueprint  TEXT NOT NULL DEFAULT '{}',
  state      TEXT NOT NULL DEFAULT '{}',
  status     TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_courses_learner ON courses(learner_id, updated_at DESC);

-- Full practice exams, kept so the readiness estimate can be calibrated
-- against what the learner actually scored rather than only what we modelled.
CREATE TABLE IF NOT EXISTS exam_results (
  id          TEXT PRIMARY KEY,
  learner_id  TEXT NOT NULL REFERENCES learners(id) ON DELETE CASCADE,
  course_id   TEXT NOT NULL,
  resource_id TEXT,
  percent     REAL NOT NULL,
  score       INTEGER,
  by_unit     TEXT NOT NULL DEFAULT '{}',
  created_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_exam_results ON exam_results(course_id, created_at DESC);

CREATE TABLE IF NOT EXISTS events (
  id         TEXT PRIMARY KEY,
  learner_id TEXT NOT NULL REFERENCES learners(id) ON DELETE CASCADE,
  kind       TEXT NOT NULL,
  detail     TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_events_learner ON events(learner_id, created_at DESC);
`;

let db;

export function getDb() {
  if (db) return db;
  const dir = path.dirname(config.dbPath);
  fs.mkdirSync(dir, { recursive: true });
  db = new DatabaseSync(config.dbPath);
  db.exec(SCHEMA);
  log.info(`sqlite ready at ${config.dbPath}`);
  return db;
}

export function closeDb() {
  if (db) {
    db.close();
    db = undefined;
  }
}

export const now = () => new Date().toISOString();

/** Run a parameterised statement. */
export function run(sql, params = {}) {
  return getDb().prepare(sql).run(params);
}
export function all(sql, params = {}) {
  return getDb().prepare(sql).all(params);
}
export function get(sql, params = {}) {
  return getDb().prepare(sql).get(params);
}

/** JSON helpers — sqlite stores documents as TEXT. */
export function readJson(value, fallback = {}) {
  if (value == null) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}
export const writeJson = (value) => JSON.stringify(value ?? null);
