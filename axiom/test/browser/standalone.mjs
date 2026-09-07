/**
 * Drives the single-file build in Chromium, opened straight off disk as a
 * `file://` URL — the way someone actually uses it.
 *
 * The Anthropic API is intercepted and answered by the same deterministic
 * provider the server tests use, re-encoded as the Messages API's own SSE
 * protocol. That means this exercises the real browser client: the streaming
 * parser, the transport shim, the localStorage store, the routers, and the
 * whole UI, without a key and without network access.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

process.env.AXIOM_LOG_LEVEL = 'silent';
const { createMockProvider } = await import('../../server/llm/mock.js');

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..', '..');
const file = `file://${path.join(root, 'axiom.html')}`;
const outDir = process.argv[2] || '/tmp/axiom-standalone';
fs.mkdirSync(outDir, { recursive: true });

const mock = createMockProvider();
const openaiCalls = [];
const results = [];
const errors = [];
let failed = 0;

function check(name, condition, detail = '') {
  results.push({ name, ok: Boolean(condition) });
  if (!condition) failed++;
  console.log(`${condition ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
}

const sse = (event, data) => `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;

/** Re-encode a mock completion as the chat-completions streaming protocol. */
async function fakeOpenAI(route) {
  const request = route.request();

  // The key check is a free GET; answer it the way the real endpoint would.
  if (request.method() === 'GET') {
    if (!/^Bearer sk-/.test(request.headers().authorization || '')) {
      return route.fulfill({ status: 401, body: JSON.stringify({ error: { message: 'invalid key' } }) });
    }
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ object: 'list', data: [{ id: 'gpt-5.6-terra', object: 'model' }] }),
    });
  }

  const body = request.postDataJSON() || {};
  if (!/^Bearer sk-/.test(request.headers().authorization || '')) {
    return route.fulfill({ status: 401, body: JSON.stringify({ error: { message: 'invalid key' } }) });
  }
  openaiCalls.push(body);

  let schema = body.response_format?.json_schema?.schema;
  if (!schema && body.response_format?.type === 'json_object') {
    const match = /<schema>\n([\s\S]*?)\n<\/schema>/.exec(body.messages[0].content);
    if (match) schema = JSON.parse(match[1]);
  }
  const { text } = await mock.run({
    system: [{ text: body.messages[0].content }],
    messages: body.messages.slice(1),
    schema,
    label: 'browser-openai',
  });

  const chunk = (data) => `data: ${JSON.stringify(data)}\n\n`;
  let stream = chunk({ id: 'c', model: body.model, choices: [{ index: 0, delta: { role: 'assistant' }, finish_reason: null }] });
  for (let i = 0; i < text.length; i += 220) {
    stream += chunk({ id: 'c', model: body.model, choices: [{ index: 0, delta: { content: text.slice(i, i + 220) }, finish_reason: null }] });
  }
  stream += chunk({ id: 'c', model: body.model, choices: [{ index: 0, delta: {}, finish_reason: 'stop' }] });
  stream += chunk({ id: 'c', model: body.model, choices: [], usage: { prompt_tokens: 90, completion_tokens: 700 } });
  stream += 'data: [DONE]\n\n';
  return route.fulfill({ status: 200, contentType: 'text/event-stream; charset=utf-8', body: stream });
}

/** Re-encode a mock completion as the Messages API's streaming protocol. */
async function fakeUpstream(route) {
  const request = route.request();
  const body = request.postDataJSON() || {};

  if (!request.headers()['anthropic-dangerous-direct-browser-access']) {
    return route.fulfill({ status: 400, body: JSON.stringify({ error: { message: 'missing browser header' } }) });
  }
  if (!request.headers()['x-api-key']) {
    return route.fulfill({ status: 401, body: JSON.stringify({ error: { message: 'no key' } }) });
  }

  // The key-verification probe: one token, no schema, not streamed.
  if (!body.stream) {
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'msg_probe',
        type: 'message',
        role: 'assistant',
        model: body.model,
        content: [{ type: 'text', text: 'ok' }],
        stop_reason: 'max_tokens',
        usage: { input_tokens: 8, output_tokens: 1 },
      }),
    });
  }

  const schema = body.output_config?.format?.schema;
  const { text } = await mock.run({
    system: (body.system || []).map((b) => ({ text: b.text })),
    messages: body.messages,
    schema,
    label: 'browser-test',
  });

  // Chunk it, so the streaming JSON repair path is exercised rather than
  // handed one complete document.
  let stream = sse('message_start', {
    type: 'message_start',
    message: { id: 'msg_1', model: body.model, usage: { input_tokens: 120 } },
  });
  stream += sse('content_block_start', { type: 'content_block_start', index: 0, content_block: { type: 'text', text: '' } });
  for (let i = 0; i < text.length; i += 220) {
    stream += sse('content_block_delta', {
      type: 'content_block_delta',
      index: 0,
      delta: { type: 'text_delta', text: text.slice(i, i + 220) },
    });
  }
  stream += sse('content_block_stop', { type: 'content_block_stop', index: 0 });
  stream += sse('message_delta', {
    type: 'message_delta',
    delta: { stop_reason: 'end_turn' },
    usage: { output_tokens: 900 },
  });
  stream += sse('message_stop', { type: 'message_stop' });

  return route.fulfill({ status: 200, contentType: 'text/event-stream; charset=utf-8', body: stream });
}

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
});
const page = await browser.newPage({ viewport: { width: 1440, height: 940 } });
page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
let expectRejection = false;
page.on('console', (msg) => {
  if (msg.type() !== 'error') return;
  if (/favicon|fonts\.g|cdn\.jsdelivr|net::ERR/.test(msg.text())) return;
  // Warnings are routed to console.error by the logger. The strict-mode
  // fallback notice is the app working as designed, and is asserted elsewhere.
  if (/\bWARN\b/.test(msg.text())) return;
  // The bad-key check deliberately provokes a 401; that is the assertion, not a fault.
  if (expectRejection && /401/.test(msg.text())) return;
  errors.push(`console: ${msg.text()}`);
});
await page.route('https://api.anthropic.com/**', fakeUpstream);
await page.route('https://api.openai.com/**', fakeOpenAI);

const shot = (name) => page.screenshot({ path: `${outDir}/${name}.png`, fullPage: false });

try {
  /* -------------------------------------------------------------- the gate */
  await page.goto(file);
  await page.waitForSelector('.gate-panel', { timeout: 20000 });
  check('the file opens straight off disk with no server', page.url().startsWith('file://'));
  check('it asks for a key before anything else', await page.locator('.gate-panel h1').isVisible());
  check(
    'it says where the key is stored',
    (await page.locator('.gate-notes').innerText()).includes('api.anthropic.com'),
  );
  check(
    'it points at the console rather than promising a key',
    (await page.locator('.gate-notes a').first().getAttribute('href')).includes('console.anthropic.com'),
  );
  check('both providers are offered before anything is typed', (await page.locator('.provider-tabs button').count()) === 2);
  await shot('01-gate');

  // Switching provider on the gate must change what is being asked for.
  await page.click('.provider-tabs button:nth-child(2)');
  check('picking OpenAI asks for an OpenAI key', (await page.locator('.gate-form label').last().innerText()).includes('OpenAI'));
  check(
    'and points at the OpenAI console',
    (await page.locator('.gate-notes a').first().getAttribute('href')).includes('platform.openai.com'),
  );
  check(
    'and names the host the key will actually be sent to',
    (await page.locator('.gate-notes').innerText()).includes('api.openai.com'),
  );
  await shot('01b-gate-openai');
  await page.click('.provider-tabs button:nth-child(1)');

  /* --------------------------------------------------------- key rejection */
  expectRejection = true;
  await page.route('https://api.anthropic.com/**', (route) =>
    route.fulfill({ status: 401, body: JSON.stringify({ error: { message: 'invalid' } }) }),
  );
  await page.fill('.gate-form input', 'sk-ant-not-a-real-key');
  await page.click('.gate-form .btn');
  await page.waitForFunction(() => /rejected/i.test(document.querySelector('.gate-form p')?.textContent || ''), null, {
    timeout: 10000,
  });
  check('a bad key is rejected before the app loads', true);
  check('the app did not start on a bad key', (await page.locator('.shell').count()) === 0);

  /* --------------------------------------------------------- key acceptance */
  await page.unroute('https://api.anthropic.com/**');
  expectRejection = false;
  await page.route('https://api.anthropic.com/**', fakeUpstream);
  await page.fill('.gate-form input', 'sk-ant-test-key');
  await page.click('.gate-form .btn');
  await page.waitForSelector('.home .hero h1', { timeout: 20000 });
  check('a good key starts the app', await page.locator('.home .hero h1').isVisible());
  check('the key is kept in this browser only', await page.evaluate(() => !!localStorage.getItem('axiom:anthropic-key')));
  await shot('02-home');

  /* --------------------------------------------------------------- a session */
  await page.fill('.ask textarea', 'Teach me quadratic equations');
  await page.click('.ask-bar .btn.primary');
  await page.waitForSelector('.turn.tutor .prose', { timeout: 40000 });
  check('the tutor teaches, with no server involved', await page.locator('.turn.tutor').first().isVisible());
  await page.waitForSelector('.question', { timeout: 40000 });
  check('the turn ends with something to do', await page.locator('.question').first().isVisible());
  await shot('03-session');

  const choices = page.locator('.question .choice');
  if (await choices.count()) await choices.nth(1).click();
  else await page.fill('.question input.input, .question textarea', 'CORRECT');
  await page.click('.question .btn.primary');
  await page.waitForSelector('.turn .chip', { timeout: 40000 });
  check('answering is graded and the model updates', (await page.locator('.turn').count()) >= 3);

  /* ------------------------------------------------------- make a worksheet */
  await page.goto(`${file}#/studio`);
  await page.waitForSelector('.page-title', { timeout: 20000 });
  await page.fill('input.input[placeholder="e.g. cellular respiration"]', 'Cellular respiration');
  await page.click('.page.wide .btn.primary');
  await page.waitForSelector('.question', { timeout: 60000 });
  const questionCount = await page.locator('.question').count();
  check('a worksheet is generated in-page', questionCount >= 3, `${questionCount} questions`);
  await shot('03b-worksheet');

  const stored = await page.evaluate(async () => {
    const res = await fetch('/api/resources', { headers: { 'x-learner-id': 'me' } });
    return (await res.json()).resources.length;
  });
  check('and lands in the library', stored >= 1, `${stored} resources`);

  /* -------------------------------------------------------- your own material */
  const upload = await page.evaluate(async () => {
    const form = new FormData();
    form.append('files', new File(['Photosynthesis converts light energy into chemical energy.'], 'notes.txt', { type: 'text/plain' }), 'notes.txt');
    const res = await fetch('/api/sources', { method: 'POST', headers: { 'x-learner-id': 'me' }, body: form });
    return res.json();
  });
  check('a document can be attached with no server to upload to', upload.sources?.length === 1, JSON.stringify(upload).slice(0, 120));
  const rejected = await page.evaluate(async () => {
    const form = new FormData();
    form.append('files', new File([new Uint8Array(8)], 'thing.exe', { type: 'application/x-msdownload' }), 'thing.exe');
    const res = await fetch('/api/sources', { method: 'POST', headers: { 'x-learner-id': 'me' }, body: form });
    return { status: res.status, body: await res.json() };
  });
  check('and an unsupported one is refused with a reason', rejected.status === 400 && /Unsupported/.test(rejected.body.error || ''));

  /* ---------------------------------------------------------------- a course */
  await page.goto(`${file}#/courses`);
  await page.waitForSelector('.page-title', { timeout: 20000 });
  await shot('04-courses');
  const catalogue = await page.evaluate(async () => {
    const res = await fetch('/api/curriculum', { headers: { 'x-learner-id': 'me' } });
    return res.json();
  });
  check('the verified curriculum library is served in-page', catalogue.courses.length >= 12, `${catalogue.courses?.length} courses`);
  check(
    'the library carries real unit counts',
    catalogue.courses.every((c) => c.units >= 4 && c.concepts >= 30),
  );

  const course = await page.evaluate(async () => {
    const res = await fetch('/api/courses', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-learner-id': 'me' },
      body: JSON.stringify({ request: 'AP Biology', subject: 'Biology' }),
    });
    const text = await res.text();
    const events = text.split('\n\n').filter(Boolean);
    const payload = events
      .map((block) => {
        const data = block.split('\n').find((l) => l.startsWith('data:'));
        const name = block.split('\n').find((l) => l.startsWith('event:'));
        return { name: name?.slice(6).trim(), data: data ? JSON.parse(data.slice(5)) : null };
      })
      .find((e) => e.name === 'course');
    return payload?.data?.snapshot;
  });
  check('asking for AP Biology builds the real syllabus', course?.course?.title === 'AP Biology', course?.course?.title);
  check('with the published unit count', course?.units?.length === 8, `${course?.units?.length} units`);
  check(
    'and unit weights that partition the paper',
    Math.abs(course.units.reduce((s, u) => s + u.exam_weight, 0) - 100) < 1,
  );
  check('a blank learner is projected at the bottom band', course.readiness.score === 1, `score ${course.readiness.score}`);

  await page.goto(`${file}#/course/${course.course.id}`);
  await page.waitForSelector('.page-title', { timeout: 20000 });
  await page.waitForTimeout(600);
  const courseText = await page.locator('body').innerText();
  check('the course view renders the real course', courseText.includes('AP Biology'));
  check('and says the syllabus is transcribed, not invented', courseText.includes('Verified syllabus'));
  check('the real units are named', courseText.includes('Cellular Energetics') && courseText.includes('Natural Selection'));
  await shot('05-course');

  /* ---------------------------------------------------- the course picker */
  await page.goto(`${file}#/courses`);
  await page.waitForSelector('.page-title', { timeout: 20000 });
  await page.click('.page .btn.primary');
  await page.waitForSelector('.modal .chip', { timeout: 15000 });
  check('the picker offers the transcribed courses by name', (await page.locator('.modal button.chip').count()) >= 12);
  await page.fill('.modal input.input', 'AP Chemistry');
  await page.waitForFunction(
    () => /Verified syllabus/.test(document.querySelector('.modal .field p.tiny')?.textContent || ''),
    null,
    { timeout: 8000 },
  );
  check('typing a known course says the weightings are published', true);
  await page.fill('.modal input.input', 'GCSE Latin');
  await page.waitForFunction(
    () => /No published framework/.test(document.querySelector('.modal .field p.tiny')?.textContent || ''),
    null,
    { timeout: 8000 },
  );
  check('and an unknown one says it will be mapped by the model', true);
  await shot('07-picker');
  await page.keyboard.press('Escape');

  /* --------------------------------------------------------------- settings */
  await page.goto(`${file}#/settings`);
  await page.waitForSelector('.page-title', { timeout: 20000 });
  const settingsText = await page.locator('body').innerText();
  check('settings offers key management in this build', settingsText.includes('Anthropic API key'));
  check('settings explains where the data lives', settingsText.includes('this browser'));
  check('settings reports the runtime honestly', settingsText.includes('Runs in this browser'));
  check('settings prices the model choice', settingsText.includes('per million tokens'));
  const switched = await page.evaluate(() => {
    window.axiomLocal.setModel('claude-haiku-4-5');
    return window.axiomLocal.getModel();
  });
  check('the model can be changed to a cheaper one', switched === 'claude-haiku-4-5', switched);
  // Provider line-ups move faster than a file can, so a typed id is accepted —
  // but an empty one is not, because that would silently unset the model.
  const typed = await page.evaluate(() => {
    window.axiomLocal.setModel('claude-opus-4-8');
    return window.axiomLocal.getModel();
  });
  check('an unlisted but real model id can be typed in', typed === 'claude-opus-4-8', typed);
  const refused = await page.evaluate(() => window.axiomLocal.setModel('   '));
  check('but an empty one is refused', refused === false);
  await page.evaluate(() => window.axiomLocal.setModel('claude-opus-5'));
  await shot('06-settings');

  /* ------------------------------------------------------------- durability */
  await page.reload();
  await page.waitForSelector('.gate-panel, .home .hero h1, .page-title', { timeout: 20000 });
  const persisted = await page.evaluate(async () => {
    const res = await fetch('/api/courses', { headers: { 'x-learner-id': 'me' } });
    const body = await res.json();
    return body.courses.length;
  });
  check('work survives a reload', persisted >= 1, `${persisted} courses after reload`);
  check('and the key survives too, so it does not ask again', (await page.locator('.gate-panel').count()) === 0);

  /* --------------------------------------------------------- running on OpenAI */
  await page.goto(`${file}#/settings`);
  await page.waitForSelector('.provider-tabs', { timeout: 20000 });
  await page.click('.card .provider-tabs button:nth-child(2)');
  await page.waitForFunction(() => /OpenAI API key/.test(document.body.innerText), null, { timeout: 10000 });
  check('settings can switch provider after setup', true);
  check(
    'and the model list becomes the other provider’s',
    (await page.locator('.card select.select').first().innerText()).includes('GPT'),
  );
  check(
    'the endpoint is editable, so a compatible API can be used',
    (await page.locator('.card input.input').count()) >= 2,
  );

  await page.fill('.card input[type="password"]', 'sk-openai-test-key');
  await page.click('.card .btn.primary');
  await page.waitForFunction(
    () => /Key works|rejected|Could not reach/.test(document.body.innerText),
    null,
    { timeout: 15000 },
  );
  const verdict = await page.locator('body').innerText();
  check('an OpenAI key is verified against the real endpoint', verdict.includes('Key works'), verdict.match(/Key works|rejected|Could not reach[^.]*/)?.[0]);
  await shot('08-openai-settings');

  // The card must tell the truth immediately after a key is verified, not on
  // the next navigation: stale "No API key" is how someone concludes it broke.
  const engine = await page.locator('.card').first().innerText();
  check('the engine card reports connected as soon as the key lands', engine.includes('Connected'), engine.split('\n')[2]);
  check('and names the host it will actually call', engine.includes('api.openai.com'));
  check('and shows the OpenAI model, not the one from before the switch', /gpt/i.test(engine) && !engine.includes('claude-opus-5'));

  const health = await page.evaluate(async () => {
    const res = await fetch('/api/health', { headers: { 'x-learner-id': 'me' } });
    return res.json();
  });
  check('the app reports it is running on OpenAI', health.provider === 'openai', health.provider);
  check('with an OpenAI model', /gpt/i.test(health.model), health.model);
  check('and counts itself ready', health.llmReady === true);

  await page.goto(`${file}#/`);
  await page.waitForSelector('.ask textarea', { timeout: 20000 });
  await page.fill('.ask textarea', 'Teach me the quadratic formula');
  await page.click('.ask-bar .btn.primary');
  await page.waitForSelector('.turn.tutor .prose', { timeout: 40000 });
  check('a lesson streams from OpenAI, in the browser, with no server', await page.locator('.turn.tutor').first().isVisible());
  await page.waitForSelector('.question', { timeout: 40000 });
  check('and still ends the turn with something to do', await page.locator('.question').first().isVisible());
  await shot('09-openai-session');

  const shapes = await page.evaluate(() => window.__openaiSeen ?? null);
  check(
    'the OpenAI requests were real chat-completions calls',
    openaiCalls.length > 0 && openaiCalls.every((b) => b.stream === true && b.max_completion_tokens > 0),
    `${openaiCalls.length} calls`,
  );
  check(
    'a deep teaching schema took the JSON-mode fallback rather than failing',
    openaiCalls.some((b) => b.response_format?.type === 'json_object'),
  );
  check(
    'and a small schema kept strict mode',
    openaiCalls.some((b) => b.response_format?.type === 'json_schema' && b.response_format.json_schema.strict === true),
  );

  // Back to Claude, and the key that was saved earlier must still be there.
  await page.goto(`${file}#/settings`);
  await page.waitForSelector('.provider-tabs', { timeout: 20000 });
  await page.click('.card .provider-tabs button:nth-child(1)');
  await page.waitForFunction(() => /Anthropic API key/.test(document.body.innerText), null, { timeout: 10000 });
  const keptKey = await page.evaluate(() => window.axiomLocal.getKey('anthropic'));
  check('switching back does not lose the other key', keptKey === 'sk-ant-test-key', keptKey ? 'kept' : 'lost');

  /* ------------------------------------------------------------------ export */
  const backup = await page.evaluate(() => window.axiomLocal.storageSummary());
  check('the storage meter reports real usage', /course/.test(backup) && /KB|MB/.test(backup), backup);
} catch (err) {
  check(`test run completed`, false, err.message);
  await shot('99-failure');
} finally {
  check('no uncaught page errors', errors.length === 0, errors.slice(0, 3).join(' | '));
  await browser.close();
}

console.log(`\n${results.filter((r) => r.ok).length}/${results.length} checks passed`);
console.log(`screenshots: ${outDir}`);
process.exit(failed ? 1 : 0);
