import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { listen, json, sse, CORRECT } from './helpers.js';

/**
 * The whole learning loop, running on the OpenAI provider.
 *
 * The provider unit tests prove the request shape; this proves the product
 * works on top of it — routing, the tutor turn, generation, grading, the
 * mastery update — because a provider that satisfies its own tests and still
 * cannot carry a lesson would be a provider in name only.
 *
 * The upstream is a stub speaking chat-completions, with its content produced
 * by the same deterministic generator the rest of the suite uses. What is
 * genuinely exercised is everything between Axiom and the wire.
 */

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'axiom-openai-'));

const seen = [];
const frame = (data) => `data: ${JSON.stringify(data)}\n\n`;

// The generator is imported lazily: config.js reads the environment the first
// time anything pulls it in, so every AXIOM_/OPENAI_ variable has to be set
// before the first import of any server module.
let mock;

const upstream = http.createServer((req, res) => {
  let raw = '';
  req.on('data', (chunk) => {
    raw += chunk;
  });
  req.on('end', async () => {
    const body = JSON.parse(raw || '{}');
    seen.push(body);

    // Recover the schema from whichever way the provider asked for it.
    let schema = body.response_format?.json_schema?.schema;
    if (!schema && body.response_format?.type === 'json_object') {
      const match = /<schema>\n([\s\S]*?)\n<\/schema>/.exec(body.messages[0].content);
      if (match) schema = JSON.parse(match[1]);
    }

    const { text } = await mock.run({
      system: [{ text: body.messages[0].content }],
      messages: body.messages.slice(1),
      schema,
      label: 'openai-integration',
    });

    res.writeHead(200, { 'content-type': 'text/event-stream' });
    res.write(frame({ id: 'c', model: body.model, choices: [{ index: 0, delta: { role: 'assistant' }, finish_reason: null }] }));
    for (let i = 0; i < text.length; i += 400) {
      res.write(frame({ id: 'c', model: body.model, choices: [{ index: 0, delta: { content: text.slice(i, i + 400) }, finish_reason: null }] }));
    }
    res.write(frame({ id: 'c', model: body.model, choices: [{ index: 0, delta: {}, finish_reason: 'stop' }] }));
    res.write(frame({ id: 'c', model: body.model, choices: [], usage: { prompt_tokens: 100, completion_tokens: 900 } }));
    res.write('data: [DONE]\n\n');
    res.end();
  });
});

await new Promise((resolve) => upstream.listen(0, '127.0.0.1', resolve));

process.env.AXIOM_LLM_PROVIDER = 'openai';
process.env.OPENAI_API_KEY = 'sk-openai-stub';
process.env.OPENAI_BASE_URL = `http://127.0.0.1:${upstream.address().port}/v1`;
process.env.AXIOM_OPENAI_MODEL = 'gpt-stub';
process.env.AXIOM_DB = path.join(dir, 'openai.db');
process.env.AXIOM_UPLOADS = path.join(dir, 'uploads');
process.env.AXIOM_LOG_LEVEL = 'silent';

const { createApp } = await import('../server/index.js');
const { createMockProvider } = await import('../server/llm/mock.js');
const { closeDb } = await import('../server/db.js');
mock = createMockProvider();

let server;

before(async () => {
  server = await listen(createApp());
});

after(async () => {
  await server.close();
  closeDb();
  await new Promise((resolve) => upstream.close(resolve));
});

describe('the product running on OpenAI', () => {
  test('health reports the OpenAI provider and its model', async () => {
    const { data } = await json(server, '/api/health');
    assert.equal(data.provider, 'openai');
    assert.equal(data.model, 'gpt-stub');
    assert.equal(data.llmReady, true, 'an OPENAI_API_KEY must count as ready');
  });

  test('a session starts, routes, and teaches', async () => {
    const stream = await sse(server, '/api/learn/start', { request: 'Teach me projectile motion' });
    const session = stream.first('session');
    assert.ok(session?.session?.id, 'a session is created');
    const turn = stream.first('turn');
    assert.ok(turn?.turn?.say?.length > 0, 'the tutor says something');
    assert.ok(stream.names().includes('done'));
  });

  test('a worksheet is generated, submitted and graded', async () => {
    const made = await sse(server, '/api/generate', {
      kind: 'worksheet',
      topic: 'projectile motion',
      subject: 'Physics',
      count: 4,
      difficulty: 3,
      types: ['multiple_choice'],
    });
    const { resource } = made.first('resource');
    assert.ok(resource?.id, 'the worksheet is saved');
    const questions = resource.payload.questions;
    assert.ok(questions.length >= 1, 'it has questions');

    const answers = Object.fromEntries(questions.map((q) => [q.id, CORRECT]));
    const submitted = await sse(server, `/api/resources/${resource.id}/submit`, { answers });
    const graded = submitted.first('graded');
    assert.ok(graded, 'the submission is graded');
    assert.equal(graded.results.length, questions.length, 'every answer is marked');
    assert.ok(graded.maxScore > 0);
    assert.ok(graded.analysis.byConcept.length >= 1, 'and analysed concept by concept');
  });

  test('grading folds into the mastery model', async () => {
    const { data } = await json(server, '/api/concepts');
    assert.ok(data.concepts.length > 0, 'concepts were registered from the work done');
    assert.ok(data.concepts.some((c) => c.attempts > 0), 'and attempts were recorded against them');
  });

  test('a course is built and projected', async () => {
    const stream = await sse(server, '/api/courses', { request: 'AP Biology', subject: 'Biology' });
    const snapshot = stream.first('course')?.snapshot;
    assert.equal(snapshot?.course?.title, 'AP Biology');
    assert.equal(snapshot.units.length, 8, 'the verified syllabus is used whichever provider is configured');
    assert.ok(snapshot.readiness.score >= 1);
  });

  test('both request shapes were actually used against the upstream', async () => {
    const strict = seen.filter((b) => b.response_format?.type === 'json_schema');
    const jsonMode = seen.filter((b) => b.response_format?.type === 'json_object');
    assert.ok(strict.length > 0, 'the small schemas took the strict path');
    assert.ok(jsonMode.length > 0, 'the deep ones took the JSON-mode fallback');
    for (const body of seen) {
      assert.equal(body.stream, true, 'every call streams');
      assert.ok(body.max_completion_tokens > 0, 'every call bounds its output');
    }
  });
});
