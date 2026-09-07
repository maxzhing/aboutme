import { test, describe, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';

/**
 * Exercises the OpenAI provider — the real request builder, the real streaming
 * parser, the real retry logic, the real schema adapter — against a stub that
 * speaks the chat-completions SSE protocol.
 *
 * This matters more here than it does for Anthropic: api.openai.com cannot be
 * reached from the environment this was written in, so a stub that is faithful
 * to the documented wire format is the only verification available. Everything
 * asserted below is about the shape Axiom sends and how it handles what comes
 * back, which is exactly what a stub can prove.
 */

const received = [];
let script = [];

const frame = (data) => `data: ${JSON.stringify(data)}\n\n`;

function streamText(res, text, { chunk = 24, finish = 'stop' } = {}) {
  res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache' });
  res.write(frame({ id: 'chatcmpl-1', object: 'chat.completion.chunk', model: 'gpt-stub', choices: [{ index: 0, delta: { role: 'assistant' }, finish_reason: null }] }));
  for (let i = 0; i < text.length; i += chunk) {
    res.write(frame({ id: 'chatcmpl-1', model: 'gpt-stub', choices: [{ index: 0, delta: { content: text.slice(i, i + chunk) }, finish_reason: null }] }));
  }
  res.write(frame({ id: 'chatcmpl-1', model: 'gpt-stub', choices: [{ index: 0, delta: {}, finish_reason: finish }] }));
  res.write(frame({
    id: 'chatcmpl-1', model: 'gpt-stub', choices: [],
    usage: { prompt_tokens: 42, completion_tokens: 128, prompt_tokens_details: { cached_tokens: 12 } },
  }));
  res.write('data: [DONE]\n\n');
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
      res.end(JSON.stringify({ error: { message: step.message || 'stub failure', type: step.type || 'server_error' } }));
      return;
    }
    if (step.kind === 'refusal') {
      res.writeHead(200, { 'content-type': 'text/event-stream' });
      res.write(frame({ id: 'c', model: 'gpt-stub', choices: [{ index: 0, delta: { refusal: 'I cannot help with that.' }, finish_reason: null }] }));
      res.write(frame({ id: 'c', model: 'gpt-stub', choices: [{ index: 0, delta: {}, finish_reason: 'stop' }] }));
      res.write('data: [DONE]\n\n');
      res.end();
      return;
    }
    streamText(res, step.text, { chunk: step.chunk ?? 24, finish: step.finish });
  });
});

let provider;
let LLMError;

before(async () => {
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  process.env.OPENAI_API_KEY = 'sk-openai-stub-key-for-tests';
  process.env.OPENAI_BASE_URL = `http://127.0.0.1:${port}/v1`;
  process.env.AXIOM_LLM_PROVIDER = 'openai';
  process.env.AXIOM_OPENAI_MODEL = 'gpt-stub';
  process.env.AXIOM_LOG_LEVEL = 'silent';
  process.env.AXIOM_MAX_RETRIES = '3';
  const mod = await import('../server/llm/openai.js');
  LLMError = mod.LLMError;
  provider = mod.createOpenAIProvider();
});

after(() => new Promise((resolve) => server.close(resolve)));

beforeEach(() => {
  received.length = 0;
  script = [];
});

/** Small enough for strict mode. */
const SMALL = {
  type: 'object',
  properties: { say: { type: 'string' }, difficulty: { type: 'number', minimum: 1, maximum: 5 } },
  required: ['say', 'difficulty'],
  additionalProperties: false,
};

/** Seven levels deep, like a lesson. Too deep for strict mode. */
const DEEP = {
  type: 'object',
  additionalProperties: false,
  properties: {
    blocks: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          diagram: {
            type: 'object',
            additionalProperties: false,
            properties: {
              nodes: {
                type: 'array',
                items: {
                  type: 'object',
                  additionalProperties: false,
                  properties: { label: { type: 'string' } },
                  required: ['label'],
                },
              },
            },
            required: ['nodes'],
          },
        },
        required: ['diagram'],
      },
    },
  },
  required: ['blocks'],
};

describe('the OpenAI request', () => {
  test('sends the model, streaming, effort and a strict json_schema when it fits', async () => {
    script = [{ kind: 'text', text: JSON.stringify({ say: 'Hello', difficulty: 3 }) }];
    const result = await provider.run({
      system: [{ text: 'system prompt', cache: true }],
      messages: [{ role: 'user', content: 'teach me' }],
      schema: SMALL,
      effort: 'high',
      maxTokens: 4096,
      label: 'unit',
    });

    const request = received[0].body;
    assert.equal(received[0].path, '/v1/chat/completions');
    assert.equal(request.model, 'gpt-stub');
    assert.equal(request.stream, true, 'requests must stream');
    assert.equal(request.stream_options.include_usage, true, 'usage only arrives if asked for');
    assert.equal(request.max_completion_tokens, 4096, 'reasoning models take max_completion_tokens, not max_tokens');
    assert.equal(request.reasoning_effort, 'high');
    assert.equal(request.response_format.type, 'json_schema');
    assert.equal(request.response_format.json_schema.strict, true);
    assert.deepEqual(result.object, { say: 'Hello', difficulty: 3 });
  });

  test('strips the validation keywords strict mode rejects', async () => {
    script = [{ kind: 'text', text: '{"say":"x","difficulty":1}' }];
    await provider.run({ system: 'sys', messages: [{ role: 'user', content: 'hi' }], schema: SMALL });
    const sent = received[0].body.response_format.json_schema.schema;
    assert.equal(sent.properties.difficulty.minimum, undefined, 'minimum is rejected by strict mode');
    assert.equal(sent.properties.difficulty.maximum, undefined);
    assert.equal(sent.additionalProperties, false, 'strict mode requires closed objects');
    assert.deepEqual(sent.required, ['say', 'difficulty'], 'strict mode requires every property');
  });

  test('a schema too deep for strict mode falls back to JSON mode with the shape in the prompt', async () => {
    script = [{ kind: 'text', text: '{"blocks":[]}' }];
    const result = await provider.run({ system: 'sys', messages: [{ role: 'user', content: 'hi' }], schema: DEEP });
    const request = received[0].body;
    assert.equal(request.response_format.type, 'json_object', 'strict mode cannot carry this schema');
    const system = request.messages[0].content;
    assert.ok(system.includes('<schema>'), 'the schema must be stated in the prompt instead');
    assert.ok(system.includes('"blocks"'), 'and it must be the real schema');
    assert.deepEqual(result.object, { blocks: [] });
  });

  test('the system blocks are joined into one system message', async () => {
    script = [{ kind: 'text', text: '{"say":"x","difficulty":1}' }];
    await provider.run({
      system: [{ text: 'stable pedagogy prompt', cache: true }, { text: 'volatile learner state', cache: false }],
      messages: [{ role: 'user', content: 'hi' }],
      schema: SMALL,
    });
    const [system, user] = received[0].body.messages;
    assert.equal(system.role, 'system');
    assert.ok(system.content.startsWith('stable pedagogy prompt'), 'the cacheable prefix stays first');
    assert.ok(system.content.includes('volatile learner state'));
    assert.equal(user.role, 'user');
  });

  test('the API key travels in the header and never in the body', async () => {
    script = [{ kind: 'text', text: '{"say":"x","difficulty":1}' }];
    await provider.run({ system: 'sys', messages: [{ role: 'user', content: 'hi' }], schema: SMALL });
    assert.equal(received[0].headers.authorization, 'Bearer sk-openai-stub-key-for-tests');
    assert.ok(!JSON.stringify(received[0].body).includes('sk-openai-'), 'the key must never be serialised into the body');
  });
});

describe('translating Axiom’s content blocks', () => {
  test('images become data-URI image parts', async () => {
    script = [{ kind: 'text', text: '{"say":"x","difficulty":1}' }];
    await provider.run({
      system: 'sys',
      schema: SMALL,
      messages: [{ role: 'user', content: [
        { type: 'image', source: { type: 'base64', media_type: 'image/png', data: 'iVBOR' } },
        { type: 'text', text: 'what is this' },
      ] }],
    });
    const [image, text] = received[0].body.messages[1].content;
    assert.equal(image.type, 'image_url');
    assert.equal(image.image_url.url, 'data:image/png;base64,iVBOR');
    assert.equal(text.type, 'text');
  });

  test('PDFs become file parts carrying their filename', async () => {
    script = [{ kind: 'text', text: '{"say":"x","difficulty":1}' }];
    await provider.run({
      system: 'sys',
      schema: SMALL,
      messages: [{ role: 'user', content: [
        { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: 'JVBERi0=' }, title: 'notes.pdf' },
        { type: 'text', text: 'teach me this' },
      ] }],
    });
    const [doc] = received[0].body.messages[1].content;
    assert.equal(doc.type, 'file');
    assert.equal(doc.file.filename, 'notes.pdf');
    assert.ok(doc.file.file_data.startsWith('data:application/pdf;base64,'));
  });

  test('a lone text block is sent as a plain string', async () => {
    script = [{ kind: 'text', text: '{"say":"x","difficulty":1}' }];
    await provider.run({
      system: 'sys',
      schema: SMALL,
      messages: [{ role: 'user', content: [{ type: 'text', text: 'just words' }] }],
    });
    assert.equal(received[0].body.messages[1].content, 'just words');
  });
});

describe('streaming and failure', () => {
  test('partial objects stream out before the response completes', async () => {
    const document = JSON.stringify({ say: 'Momentum is conserved when no external force acts.', difficulty: 4 });
    script = [{ kind: 'text', text: document, chunk: 8 }];

    const partials = [];
    const result = await provider.run({
      system: 'sys',
      messages: [{ role: 'user', content: 'hi' }],
      schema: SMALL,
      onPartial: (obj) => partials.push(obj.say ?? ''),
    });

    assert.ok(partials.length >= 1, 'at least one partial frame should be emitted');
    assert.equal(result.object.difficulty, 4);
    for (let i = 1; i < partials.length; i++) {
      assert.ok(partials[i].length >= partials[i - 1].length, 'streamed text must not go backwards');
    }
  });

  test('usage is mapped onto the shape the rest of the app reads', async () => {
    script = [{ kind: 'text', text: '{"say":"x","difficulty":1}' }];
    const result = await provider.run({ system: 'sys', messages: [{ role: 'user', content: 'hi' }], schema: SMALL });
    assert.equal(result.usage.input_tokens, 42);
    assert.equal(result.usage.output_tokens, 128);
    assert.equal(result.usage.cache_read_input_tokens, 12);
  });

  test('a truncated JSON response is repaired rather than thrown away', async () => {
    script = [{ kind: 'text', text: '{"say":"Momentum is conserved","difficulty":', finish: 'length' }];
    const result = await provider.run({ system: 'sys', messages: [{ role: 'user', content: 'hi' }], schema: SMALL });
    assert.equal(result.object.say, 'Momentum is conserved');
  });

  test('a refusal is reported, not treated as content', async () => {
    script = [{ kind: 'refusal' }];
    await assert.rejects(
      () => provider.run({ system: 'sys', messages: [{ role: 'user', content: 'hi' }], schema: SMALL }),
      (err) => /declined/.test(err.message),
    );
  });

  test('a rate limit is retried with backoff and then succeeds', async () => {
    script = [
      { kind: 'status', status: 429, message: 'Rate limit reached', headers: { 'retry-after': '0' } },
      { kind: 'text', text: '{"say":"after retry","difficulty":2}' },
    ];
    const result = await provider.run({ system: 'sys', messages: [{ role: 'user', content: 'hi' }], schema: SMALL });
    assert.equal(received.length, 2, 'the request should have been retried once');
    assert.equal(result.object.say, 'after retry');
  });

  test('running out of credit is not retried as if it were a rate limit', async () => {
    script = [{ kind: 'status', status: 429, message: 'You exceeded your current quota, please check your plan and billing details.' }];
    await assert.rejects(
      () => provider.run({ system: 'sys', messages: [{ role: 'user', content: 'hi' }], schema: SMALL }),
      (err) => /out of API credit/.test(err.message) && err.retryable === false,
    );
    assert.equal(received.length, 1, 'waiting will not add credit to the account');
  });

  test('a server error is retried and gives up with a typed error', async () => {
    script = Array.from({ length: 6 }, () => ({ kind: 'status', status: 500 }));
    await assert.rejects(
      () => provider.run({ system: 'sys', messages: [{ role: 'user', content: 'hi' }], schema: SMALL }),
      (err) => {
        assert.ok(err instanceof LLMError);
        assert.equal(err.retryable, true);
        return true;
      },
    );
    assert.equal(received.length, 4, 'one attempt plus AXIOM_MAX_RETRIES');
  });

  test('a bad request is surfaced immediately rather than retried', async () => {
    script = [{ kind: 'status', status: 400, message: 'Invalid schema' }];
    await assert.rejects(
      () => provider.run({ system: 'sys', messages: [{ role: 'user', content: 'hi' }], schema: SMALL }),
      (err) => err.status === 400 && err.retryable === false && /Invalid schema/.test(err.message),
    );
    assert.equal(received.length, 1);
  });

  test('an authentication failure names the missing key', async () => {
    script = [{ kind: 'status', status: 401 }];
    await assert.rejects(
      () => provider.run({ system: 'sys', messages: [{ role: 'user', content: 'hi' }], schema: SMALL }),
      (err) => /OPENAI_API_KEY/.test(err.message),
    );
  });
});
