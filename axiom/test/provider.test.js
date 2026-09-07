import { test, describe, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';

/**
 * Exercises the real Anthropic provider — the actual SDK, the actual streaming
 * parser, the actual retry logic — against a stub that speaks the Messages API
 * SSE protocol. This is the closest we can get to a live call without a key.
 */

const received = [];
let script = [];

function sseFrame(event, data) {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

/** Stream a JSON body back the way the Messages API does, in small chunks. */
function streamText(res, text, { chunk = 24 } = {}) {
  res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache' });
  res.write(
    sseFrame('message_start', {
      type: 'message_start',
      message: {
        id: 'msg_stub', type: 'message', role: 'assistant', model: 'claude-opus-5',
        content: [], stop_reason: null, stop_sequence: null,
        usage: { input_tokens: 42, output_tokens: 0, cache_read_input_tokens: 12 },
      },
    }),
  );
  res.write(sseFrame('content_block_start', { type: 'content_block_start', index: 0, content_block: { type: 'text', text: '' } }));
  for (let i = 0; i < text.length; i += chunk) {
    res.write(
      sseFrame('content_block_delta', {
        type: 'content_block_delta', index: 0,
        delta: { type: 'text_delta', text: text.slice(i, i + chunk) },
      }),
    );
  }
  res.write(sseFrame('content_block_stop', { type: 'content_block_stop', index: 0 }));
  res.write(
    sseFrame('message_delta', {
      type: 'message_delta',
      delta: { stop_reason: 'end_turn', stop_sequence: null },
      usage: { output_tokens: 128 },
    }),
  );
  res.write(sseFrame('message_stop', { type: 'message_stop' }));
  res.end();
}

const server = http.createServer((req, res) => {
  let body = '';
  req.on('data', (chunk) => {
    body += chunk;
  });
  req.on('end', () => {
    received.push({ path: req.url, headers: req.headers, body: JSON.parse(body || '{}') });
    const step = script.shift() || { kind: 'text', text: '{"ok":true}' };
    if (step.kind === 'status') {
      res.writeHead(step.status, { 'content-type': 'application/json', ...(step.headers || {}) });
      res.end(JSON.stringify({ type: 'error', error: { type: step.type || 'api_error', message: 'stub failure' } }));
      return;
    }
    if (step.kind === 'refusal') {
      res.writeHead(200, { 'content-type': 'text/event-stream' });
      res.write(sseFrame('message_start', {
        type: 'message_start',
        message: { id: 'm', type: 'message', role: 'assistant', model: 'claude-opus-5', content: [], stop_reason: null, usage: { input_tokens: 1, output_tokens: 0 } },
      }));
      res.write(sseFrame('message_delta', {
        type: 'message_delta',
        delta: { stop_reason: 'refusal', stop_sequence: null, stop_details: { type: 'refusal', category: 'cyber' } },
        usage: { output_tokens: 1 },
      }));
      res.write(sseFrame('message_stop', { type: 'message_stop' }));
      res.end();
      return;
    }
    streamText(res, step.text, { chunk: step.chunk ?? 24 });
  });
});

let provider;
let LLMError;

before(async () => {
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  process.env.ANTHROPIC_API_KEY = 'sk-ant-stub-key-for-tests';
  process.env.AXIOM_ANTHROPIC_BASE_URL = `http://127.0.0.1:${port}`;
  process.env.AXIOM_LLM_PROVIDER = 'anthropic';
  process.env.AXIOM_LOG_LEVEL = 'silent';
  process.env.AXIOM_MAX_RETRIES = '3';
  const mod = await import('../server/llm/anthropic.js');
  LLMError = mod.LLMError;
  provider = mod.createAnthropicProvider();
});

after(() => new Promise((resolve) => server.close(resolve)));

beforeEach(() => {
  received.length = 0;
  script = [];
});

const SCHEMA = {
  type: 'object',
  properties: { say: { type: 'string' }, difficulty: { type: 'number' } },
  required: ['say', 'difficulty'],
  additionalProperties: false,
};

describe('the live Anthropic path', () => {
  test('sends the model, effort and JSON-schema output format', async () => {
    script = [{ kind: 'text', text: JSON.stringify({ say: 'Hello', difficulty: 3 }) }];
    const result = await provider.run({
      system: [{ text: 'system prompt', cache: true }],
      messages: [{ role: 'user', content: 'teach me' }],
      schema: SCHEMA,
      effort: 'high',
      maxTokens: 4096,
      label: 'unit',
    });

    const request = received[0].body;
    assert.equal(request.model, 'claude-opus-5');
    assert.equal(request.max_tokens, 4096);
    assert.equal(request.stream, true, 'requests must stream');
    assert.equal(request.output_config.effort, 'high');
    assert.equal(request.output_config.format.type, 'json_schema');
    assert.deepEqual(request.output_config.format.schema, SCHEMA);
    assert.deepEqual(result.object, { say: 'Hello', difficulty: 3 });
    assert.equal(result.usage.cache_read_input_tokens, 12);
  });

  test('the API key travels in the header and never in the body', async () => {
    script = [{ kind: 'text', text: '{"say":"x","difficulty":1}' }];
    await provider.run({ system: 'sys', messages: [{ role: 'user', content: 'hi' }], schema: SCHEMA });
    assert.equal(received[0].headers['x-api-key'], 'sk-ant-stub-key-for-tests');
    assert.ok(!JSON.stringify(received[0].body).includes('sk-ant-'), 'the key must never be serialised into the body');
  });

  test('the stable system prefix is marked for caching', async () => {
    script = [{ kind: 'text', text: '{"say":"x","difficulty":1}' }];
    await provider.run({
      system: [{ text: 'stable pedagogy prompt', cache: true }, { text: 'volatile learner state', cache: false }],
      messages: [{ role: 'user', content: 'hi' }],
      schema: SCHEMA,
    });
    const [stable, volatile] = received[0].body.system;
    assert.deepEqual(stable.cache_control, { type: 'ephemeral' });
    assert.equal(volatile.cache_control, undefined, 'volatile context must sit after the breakpoint');
  });

  test('partial objects stream out before the response completes', async () => {
    const document = JSON.stringify({ say: 'Momentum is conserved when no external force acts on the system.', difficulty: 4 });
    script = [{ kind: 'text', text: document, chunk: 8 }];

    const partials = [];
    const result = await provider.run({
      system: 'sys',
      messages: [{ role: 'user', content: 'hi' }],
      schema: SCHEMA,
      onPartial: (obj) => partials.push(obj.say ?? ''),
    });

    assert.ok(partials.length >= 1, 'at least one partial frame should be emitted');
    assert.ok(partials.at(-1).length > 0);
    assert.equal(result.object.difficulty, 4);
    // Streamed prose only ever grows.
    for (let i = 1; i < partials.length; i++) {
      assert.ok(partials[i].length >= partials[i - 1].length, 'streamed text must not go backwards');
    }
  });

  test('a rate limit is retried with backoff and then succeeds', async () => {
    script = [
      { kind: 'status', status: 429, type: 'rate_limit_error', headers: { 'retry-after': '0' } },
      { kind: 'text', text: '{"say":"after retry","difficulty":2}' },
    ];
    const result = await provider.run({ system: 'sys', messages: [{ role: 'user', content: 'hi' }], schema: SCHEMA });
    assert.equal(received.length, 2, 'the request should have been retried once');
    assert.equal(result.object.say, 'after retry');
  });

  test('a server error is retried and gives up with a typed error', async () => {
    script = Array.from({ length: 6 }, () => ({ kind: 'status', status: 500 }));
    await assert.rejects(
      () => provider.run({ system: 'sys', messages: [{ role: 'user', content: 'hi' }], schema: SCHEMA }),
      (err) => {
        assert.ok(err instanceof LLMError);
        assert.equal(err.retryable, true);
        return true;
      },
    );
    assert.equal(received.length, 4, 'one attempt plus AXIOM_MAX_RETRIES');
  });

  test('a bad request is surfaced immediately rather than retried', async () => {
    script = [{ kind: 'status', status: 400, type: 'invalid_request_error' }];
    await assert.rejects(
      () => provider.run({ system: 'sys', messages: [{ role: 'user', content: 'hi' }], schema: SCHEMA }),
      (err) => err.status === 400 && err.retryable === false,
    );
    assert.equal(received.length, 1);
  });

  test('an authentication failure names the missing key', async () => {
    script = [{ kind: 'status', status: 401, type: 'authentication_error' }];
    await assert.rejects(
      () => provider.run({ system: 'sys', messages: [{ role: 'user', content: 'hi' }], schema: SCHEMA }),
      (err) => /ANTHROPIC_API_KEY/.test(err.message),
    );
  });

  test('a refusal is reported, not treated as content', async () => {
    script = [{ kind: 'refusal' }];
    await assert.rejects(
      () => provider.run({ system: 'sys', messages: [{ role: 'user', content: 'hi' }], schema: SCHEMA }),
      (err) => /declined/.test(err.message) && /cyber/.test(err.message),
    );
  });

  test('a truncated JSON response is repaired rather than thrown away', async () => {
    script = [{ kind: 'text', text: '{"say":"Momentum is conserved","difficulty":' }];
    const result = await provider.run({ system: 'sys', messages: [{ role: 'user', content: 'hi' }], schema: SCHEMA });
    assert.equal(result.object.say, 'Momentum is conserved');
  });

  test('document blocks are passed through for PDF material', async () => {
    script = [{ kind: 'text', text: '{"say":"x","difficulty":1}' }];
    await provider.run({
      system: 'sys',
      schema: SCHEMA,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: 'JVBERi0=' }, title: 'notes.pdf' },
            { type: 'text', text: 'teach me this' },
          ],
        },
      ],
    });
    const [doc] = received[0].body.messages[0].content;
    assert.equal(doc.type, 'document');
    assert.equal(doc.source.media_type, 'application/pdf');
  });
});
