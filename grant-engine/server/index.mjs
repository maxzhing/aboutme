/**
 * HTTP server: static dashboard + JSON/SSE API.
 *
 * No framework, no dependencies. Routes are small and explicit so the request
 * surface is easy to audit.
 */

import http from 'node:http';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { config, ROOT, capabilityReport, degradedReasons } from './lib/config.mjs';
import { getStore } from './lib/store.mjs';
import { runSearch, STAGES } from './engine/pipeline.mjs';
import { normalizeProfile, missingProfileFields, APPLICANT_TYPES, ORGANIZATION_STATUSES, FUNDING_PURPOSES, US_STATES } from './engine/profile.mjs';
import { applyAnswer } from './engine/followups.mjs';
import { buildApplicationPacket } from './engine/assistant.mjs';
import { sweepProfile, startAlertSweeper } from './engine/alerts.mjs';
import { WEIGHTS, COMPONENT_LABELS } from './engine/score.mjs';
import { DEADLINE_FILTERS } from './engine/deadline.mjs';
import { CONFIDENCE_MEANING } from './engine/confidence.mjs';

const store = getStore();
const PUBLIC_DIR = path.join(ROOT, 'public');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

const MAX_BODY_BYTES = 1_000_000;

function json(response, status, payload) {
  const body = JSON.stringify(payload);
  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(body),
    'cache-control': 'no-store',
  });
  response.end(body);
}

async function readBody(request) {
  const chunks = [];
  let total = 0;
  for await (const chunk of request) {
    total += chunk.length;
    if (total > MAX_BODY_BYTES) throw new Error('Request body too large');
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new Error('Request body was not valid JSON');
  }
}

async function serveStatic(request, response, pathname) {
  const relative = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  const filePath = path.join(PUBLIC_DIR, relative);
  // Prevent traversal outside the public directory.
  if (!filePath.startsWith(PUBLIC_DIR + path.sep) && filePath !== path.join(PUBLIC_DIR, 'index.html')) {
    return json(response, 403, { error: 'Forbidden' });
  }
  try {
    const stat = await fsp.stat(filePath);
    if (!stat.isFile()) throw new Error('not a file');
    const body = await fsp.readFile(filePath);
    response.writeHead(200, {
      'content-type': MIME[path.extname(filePath)] || 'application/octet-stream',
      'content-length': body.length,
      'cache-control': relative === 'index.html' ? 'no-cache' : 'public, max-age=300',
    });
    response.end(body);
  } catch {
    json(response, 404, { error: 'Not found' });
  }
}

/** Server-sent events channel for a streaming search. */
function openStream(response) {
  response.writeHead(200, {
    'content-type': 'text/event-stream; charset=utf-8',
    'cache-control': 'no-cache, no-transform',
    connection: 'keep-alive',
    'x-accel-buffering': 'no',
  });
  const send = (event, data) => {
    response.write(`event: ${event}\n`);
    response.write(`data: ${JSON.stringify(data)}\n\n`);
  };
  const heartbeat = setInterval(() => response.write(': keepalive\n\n'), 15_000);
  heartbeat.unref?.();
  return {
    send,
    close() {
      clearInterval(heartbeat);
      response.end();
    },
  };
}

const routes = [];
const route = (method, pattern, handler) => routes.push({ method, pattern, handler });

// ------------------------------------------------------------------ metadata

route('GET', /^\/api\/capabilities$/, async (request, response) => {
  json(response, 200, {
    capabilities: capabilityReport(),
    degraded: degradedReasons(),
    stages: STAGES,
    scoreWeights: Object.entries(WEIGHTS).map(([key, weight]) => ({ key, label: COMPONENT_LABELS[key], weight })),
    deadlineFilters: Object.entries(DEADLINE_FILTERS).map(([key, filter]) => ({ key, label: filter.label })),
    confidenceMeanings: CONFIDENCE_MEANING,
    vocabulary: {
      applicantTypes: APPLICANT_TYPES,
      organizationStatuses: ORGANIZATION_STATUSES,
      fundingPurposes: FUNDING_PURPOSES,
      states: US_STATES,
    },
  });
});

// -------------------------------------------------------------------- search

route('POST', /^\/api\/profile\/parse$/, async (request, response) => {
  const body = await readBody(request);
  const profile = normalizeProfile(body.profile || body);
  json(response, 200, { profile, missing: missingProfileFields(profile) });
});

route('POST', /^\/api\/search$/, async (request, response) => {
  const body = await readBody(request);
  const run = await runSearch(body, { store });
  json(response, 200, run);
});

route('POST', /^\/api\/search\/stream$/, async (request, response) => {
  const body = await readBody(request);
  const stream = openStream(response);
  const controller = new AbortController();
  request.on('close', () => controller.abort());

  try {
    stream.send('stages', { stages: STAGES });
    const run = await runSearch(body, {
      store,
      signal: controller.signal,
      onStage: (event) => stream.send('stage', event),
    });
    stream.send('result', run);
  } catch (error) {
    stream.send('error', { message: error.message });
  } finally {
    stream.close();
  }
});

route('GET', /^\/api\/runs\/([^/]+)$/, async (request, response, match) => {
  const run = store.runs.get(decodeURIComponent(match[1]));
  if (!run) return json(response, 404, { error: 'Run not found' });
  json(response, 200, run);
});

/** Answer a follow-up question and immediately re-run with the new information. */
route('POST', /^\/api\/search\/answer$/, async (request, response) => {
  const body = await readBody(request);
  const previous = store.runs.get(body.runId);
  if (!previous) return json(response, 404, { error: 'Run not found' });

  let profile = previous.profile;
  for (const answer of body.answers || []) {
    profile = applyAnswer(profile, answer.questionId, answer.field, answer.value);
  }
  const run = await runSearch({ profile, sort: body.sort }, { store });
  run.previousRunId = previous.id;
  store.runs.put({ id: run.id, ...run });
  json(response, 200, run);
});

// ---------------------------------------------------------------- assistant

route('POST', /^\/api\/assistant$/, async (request, response) => {
  const body = await readBody(request);
  const run = store.runs.get(body.runId);
  if (!run) return json(response, 404, { error: 'Run not found' });
  const result = run.results.find((entry) => entry.id === body.grantId);
  if (!result) return json(response, 404, { error: 'Grant not found in that run' });
  json(response, 200, buildApplicationPacket(result, run.profile));
});

// ------------------------------------------------------------ saved profiles

route('GET', /^\/api\/profiles$/, async (request, response) => {
  json(response, 200, { profiles: store.profiles.all() });
});

route('POST', /^\/api\/profiles$/, async (request, response) => {
  const body = await readBody(request);
  const profile = normalizeProfile(body.profile || {});
  const saved = store.profiles.put({
    id: body.id || `profile:${randomUUID()}`,
    name: String(body.name || 'My funding profile').slice(0, 120),
    profile,
    alertsEnabled: body.alertsEnabled !== false,
    seenGrantIds: body.seenGrantIds || [],
    lastSnapshot: [],
    lastSweptAt: null,
  });
  json(response, 200, { profile: saved });
});

route('DELETE', /^\/api\/profiles\/([^/]+)$/, async (request, response, match) => {
  json(response, 200, { deleted: store.profiles.delete(decodeURIComponent(match[1])) });
});

route('POST', /^\/api\/profiles\/([^/]+)\/sweep$/, async (request, response, match) => {
  const profile = store.profiles.get(decodeURIComponent(match[1]));
  if (!profile) return json(response, 404, { error: 'Profile not found' });
  const { alerts, run } = await sweepProfile(profile, { store });
  json(response, 200, { alerts, runId: run.id, counts: run.counts });
});

// -------------------------------------------------------------------- alerts

route('GET', /^\/api\/alerts$/, async (request, response) => {
  const alerts = store.alerts.all().sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  json(response, 200, { alerts, unread: alerts.filter((alert) => !alert.read).length });
});

route('POST', /^\/api\/alerts\/read$/, async (request, response) => {
  const body = await readBody(request);
  for (const id of body.ids || []) store.alerts.patch(id, { read: true });
  json(response, 200, { ok: true });
});

// --------------------------------------------------------------- saved grants

route('GET', /^\/api\/saved$/, async (request, response) => {
  json(response, 200, { saved: store.saved.all() });
});

route('POST', /^\/api\/saved$/, async (request, response) => {
  const body = await readBody(request);
  if (!body.grantId) return json(response, 400, { error: 'grantId is required' });
  const saved = store.saved.put({
    id: `saved:${body.grantId}`,
    grantId: body.grantId,
    runId: body.runId || null,
    grantName: body.grantName || null,
    funder: body.funder || null,
    deadline: body.deadline || null,
    score: body.score ?? null,
    eligibility: body.eligibility || null,
    applicationUrl: body.applicationUrl || null,
    note: body.note || '',
  });
  json(response, 200, { saved });
});

route('DELETE', /^\/api\/saved\/([^/]+)$/, async (request, response, match) => {
  json(response, 200, { deleted: store.saved.delete(decodeURIComponent(match[1])) });
});

// ------------------------------------------------------------------- tracker

const TRACKER_STAGES = ['considering', 'preparing', 'drafting', 'submitted', 'awarded', 'declined'];

route('GET', /^\/api\/tracker$/, async (request, response) => {
  json(response, 200, { entries: store.tracker.all(), stages: TRACKER_STAGES });
});

route('POST', /^\/api\/tracker$/, async (request, response) => {
  const body = await readBody(request);
  if (!body.grantId) return json(response, 400, { error: 'grantId is required' });
  const entry = store.tracker.put({
    id: `track:${body.grantId}`,
    grantId: body.grantId,
    grantName: body.grantName || null,
    funder: body.funder || null,
    deadline: body.deadline || null,
    applicationUrl: body.applicationUrl || null,
    stage: TRACKER_STAGES.includes(body.stage) ? body.stage : 'considering',
    checklist: Array.isArray(body.checklist) ? body.checklist : [],
    notes: body.notes || '',
  });
  json(response, 200, { entry });
});

route('DELETE', /^\/api\/tracker\/([^/]+)$/, async (request, response, match) => {
  json(response, 200, { deleted: store.tracker.delete(decodeURIComponent(match[1])) });
});

// -------------------------------------------------------------------- server

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host || 'localhost'}`);
  const pathname = decodeURIComponent(url.pathname);

  if (request.method === 'OPTIONS') {
    response.writeHead(204, { allow: 'GET,POST,DELETE,OPTIONS' });
    return response.end();
  }

  for (const entry of routes) {
    if (entry.method !== request.method) continue;
    const match = entry.pattern.exec(pathname);
    if (!match) continue;
    try {
      return await entry.handler(request, response, match, url);
    } catch (error) {
      console.error(`[server] ${request.method} ${pathname} failed:`, error);
      if (!response.headersSent) return json(response, 500, { error: error.message });
      return response.end();
    }
  }

  if (request.method === 'GET') return serveStatic(request, response, pathname);
  json(response, 404, { error: 'Not found' });
});

if (!fs.existsSync(PUBLIC_DIR)) fs.mkdirSync(PUBLIC_DIR, { recursive: true });

server.listen(config.port, config.host, () => {
  const report = capabilityReport();
  console.log(`\n  Grant Match Engine  →  http://localhost:${config.port}\n`);
  for (const capability of Object.values(report)) {
    console.log(`  ${capability.available ? '✓' : '✗'} ${capability.name}`);
    if (!capability.available) console.log(`      ${capability.note}`);
  }
  console.log('');
  startAlertSweeper({ store });
});

const shutdown = async () => {
  await store.flushAll().catch(() => {});
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 3000).unref();
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

export { server, store };
