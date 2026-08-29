/**
 * HTTP surface: the API contract the dashboard depends on, including the SSE
 * stream, saved profiles, the tracker and alert sweeps.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { startFixtureServer } from './fixtures/server.mjs';

const fixture = await startFixtureServer();
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gme-api-'));

process.env.DATA_DIR = dataDir;
process.env.PORT = '0';
process.env.GRANTS_GOV_SEARCH_URL = `${fixture.origin}/api/search2`;
process.env.GRANTS_GOV_FETCH_URL = `${fixture.origin}/api/fetchOpportunity`;
process.env.SEARXNG_URL = fixture.origin;
process.env.FETCH_PER_HOST_DELAY_MS = '0';
process.env.ALERTS_ENABLED = 'false';
process.env.NO_PROXY = '*';
process.env.no_proxy = '*';

const { server } = await import('../server/index.mjs');
await new Promise((resolve) => (server.listening ? resolve() : server.once('listening', resolve)));
const base = `http://127.0.0.1:${server.address().port}`;

test.after(async () => {
  server.close();
  await fixture.close();
  fs.rmSync(dataDir, { recursive: true, force: true });
});

const get = async (path) => {
  const response = await fetch(`${base}${path}`);
  return { status: response.status, body: await response.json() };
};
const post = async (path, body) => {
  const response = await fetch(`${base}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { status: response.status, body: await response.json() };
};

const DESCRIPTION = "I'm a high school student interested in robotics. I want funding to start a "
  + 'STEM outreach program for younger students in Maryland and need about $5,000.';

test('the dashboard is served', async () => {
  const response = await fetch(`${base}/`);
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type'), /text\/html/);
  const html = await response.text();
  assert.match(html, /Grant Match Engine/);
});

test('static paths cannot escape the public directory', async () => {
  const response = await fetch(`${base}/../server/lib/config.mjs`, { redirect: 'manual' });
  assert.ok(response.status === 403 || response.status === 404, `traversal returned ${response.status}`);
});

test('capabilities describe what this deployment can see, including score weights', async () => {
  const { body } = await get('/api/capabilities');
  assert.equal(body.capabilities.federalPrimarySource.available, true);
  assert.equal(body.stages.length, 11);
  const total = body.scoreWeights.reduce((sum, entry) => sum + entry.weight, 0);
  assert.ok(Math.abs(total - 1) < 1e-9);
  assert.ok(body.vocabulary.applicantTypes.includes('student'));
  assert.ok(Object.keys(body.vocabulary.states).includes('MD'));
});

test('a description is parsed into structured criteria without inventing anything', async () => {
  const { body } = await post('/api/profile/parse', { rawDescription: DESCRIPTION });
  assert.equal(body.profile.applicantType, 'student');
  assert.equal(body.profile.state, 'MD');
  assert.equal(body.profile.fundingNeeded, 5000);
  assert.equal(body.profile.age, null);
  assert.ok(body.missing.some((entry) => entry.key === 'age'));
});

test('a search returns results, exclusions with reasons, and an honest capability report', async () => {
  const { status, body } = await post('/api/search', { profile: { rawDescription: DESCRIPTION } });
  assert.equal(status, 200);
  assert.ok(body.results.length >= 1);
  assert.ok(body.excluded.length >= 1);
  for (const entry of body.excluded) assert.ok(entry.reasons.length >= 1, 'every exclusion needs a reason');
  assert.ok(body.capabilities);
  assert.ok(Array.isArray(body.degraded));
  assert.ok(body.id.startsWith('run:'));
});

test('the streaming endpoint emits ordered stage events then the result', async () => {
  const response = await fetch(`${base}/api/search/stream`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ profile: { rawDescription: DESCRIPTION } }),
  });
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type'), /text\/event-stream/);

  const text = await response.text();
  const events = [...text.matchAll(/event: (\w+)\ndata: (.+)/g)].map((match) => ({ event: match[1], data: JSON.parse(match[2]) }));

  assert.equal(events[0].event, 'stages');
  assert.ok(events.some((entry) => entry.event === 'stage' && entry.data.key === 'profile'));
  assert.ok(events.some((entry) => entry.event === 'stage' && entry.data.key === 'finalize'));
  const final = events.at(-1);
  assert.equal(final.event, 'result');
  assert.ok(final.data.results);
  assert.ok(events.every((entry) => entry.event !== 'error'));
});

test('answering a follow-up re-runs the search and links back to the previous run', async () => {
  const first = await post('/api/search', { profile: { rawDescription: DESCRIPTION } });
  const question = first.body.followUps[0];
  assert.ok(question, 'the fixture set should raise at least one question');

  const second = await post('/api/search/answer', {
    runId: first.body.id,
    answers: [{ questionId: 'age', field: 'age', value: 16 }],
  });
  assert.equal(second.status, 200);
  assert.equal(second.body.previousRunId, first.body.id);
  assert.equal(second.body.profile.age, 16);
});

test('an unknown run id is a 404, not a fabricated answer', async () => {
  assert.equal((await get('/api/runs/run:nope')).status, 404);
  assert.equal((await post('/api/assistant', { runId: 'run:nope', grantId: 'x' })).status, 404);
});

test('the application assistant builds a packet for a grant in a run', async () => {
  const search = await post('/api/search', { profile: { rawDescription: DESCRIPTION } });
  const grantId = search.body.results[0].id;
  const { status, body } = await post('/api/assistant', { runId: search.body.id, grantId });
  assert.equal(status, 200);
  assert.equal(body.grantId, grantId);
  assert.ok(body.eligibilityChecklist.length > 0);
  assert.ok(body.proposalOutline.length > 0);
  assert.ok(body.sources.length > 0);
});

test('grants can be saved, listed and removed', async () => {
  await post('/api/saved', { grantId: 'web:test', grantName: 'Test Grant', score: 80 });
  const listed = await get('/api/saved');
  assert.equal(listed.body.saved.length, 1);
  assert.equal(listed.body.saved[0].grantName, 'Test Grant');

  const response = await fetch(`${base}/api/saved/${encodeURIComponent('saved:web:test')}`, { method: 'DELETE' });
  assert.equal((await response.json()).deleted, true);
  assert.equal((await get('/api/saved')).body.saved.length, 0);
});

test('saving requires a grant id', async () => {
  assert.equal((await post('/api/saved', { grantName: 'No id' })).status, 400);
});

test('the tracker records a stage and a checklist', async () => {
  await post('/api/tracker', { grantId: 'web:t1', grantName: 'Tracked', stage: 'drafting', checklist: [{ item: 'EIN letter', done: false }] });
  const { body } = await get('/api/tracker');
  assert.equal(body.entries[0].stage, 'drafting');
  assert.ok(body.stages.includes('submitted'));

  await post('/api/tracker', { grantId: 'web:t1', grantName: 'Tracked', stage: 'not-a-stage' });
  const updated = await get('/api/tracker');
  assert.equal(updated.body.entries[0].stage, 'considering', 'an invalid stage falls back rather than being stored');
});

test('a profile can be saved and swept on demand, producing alerts', async () => {
  const saved = await post('/api/profiles', { name: 'Robotics student', profile: { rawDescription: DESCRIPTION } });
  assert.ok(saved.body.profile.id.startsWith('profile:'));
  assert.equal(saved.body.profile.alertsEnabled, true);

  const sweep = await post(`/api/profiles/${encodeURIComponent(saved.body.profile.id)}/sweep`, {});
  assert.equal(sweep.status, 200);
  assert.ok(sweep.body.counts.returned >= 1);

  const alerts = await get('/api/alerts');
  assert.ok(Array.isArray(alerts.body.alerts));
  for (const alert of alerts.body.alerts) {
    assert.ok(alert.message.length > 10);
    assert.ok(alert.kind);
  }

  // A second sweep over unchanged data must not re-alert on the same grants.
  const before = (await get('/api/alerts')).body.alerts.length;
  await post(`/api/profiles/${encodeURIComponent(saved.body.profile.id)}/sweep`, {});
  const after = (await get('/api/alerts')).body.alerts.length;
  assert.equal(after, before, 'a repeat sweep with no change must be silent');
});

test('alerts can be marked read', async () => {
  const { body } = await get('/api/alerts');
  if (body.alerts.length === 0) return;
  await post('/api/alerts/read', { ids: body.alerts.map((alert) => alert.id) });
  assert.equal((await get('/api/alerts')).body.unread, 0);
});

test('malformed JSON is rejected with a clear error, not a crash', async () => {
  const response = await fetch(`${base}/api/search`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{ not json',
  });
  assert.equal(response.status, 500);
  assert.match((await response.json()).error, /valid JSON/);
});

test('unknown API routes 404', async () => {
  assert.equal((await get('/api/does-not-exist')).status, 404);
});
