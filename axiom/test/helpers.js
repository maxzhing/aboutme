import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

/** Every test run gets its own database so runs cannot bleed into each other. */
export function isolateEnv() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'axiom-test-'));
  process.env.AXIOM_LLM_PROVIDER = 'mock';
  process.env.AXIOM_ALLOW_MOCK = '1';
  process.env.AXIOM_DB = path.join(dir, 'test.db');
  process.env.AXIOM_UPLOADS = path.join(dir, 'uploads');
  process.env.AXIOM_LOG_LEVEL = 'silent';
  return dir;
}

export async function listen(app) {
  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const { port } = server.address();
  return {
    port,
    url: (p) => `http://127.0.0.1:${port}${p}`,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}

export async function json(server, path_, { method = 'GET', body, learner = 'test' } = {}) {
  const res = await fetch(server.url(path_), {
    method,
    headers: { 'content-type': 'application/json', 'x-learner-id': learner },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

/** POST an SSE endpoint and collect every event by name. */
export async function sse(server, path_, body, { learner = 'test' } = {}) {
  const res = await fetch(server.url(path_), {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-learner-id': learner },
    body: JSON.stringify(body ?? {}),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status}: ${text}`);
  }

  const events = [];
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let boundary;
    while ((boundary = buffer.indexOf('\n\n')) !== -1) {
      const raw = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);
      if (raw.startsWith(':')) continue;
      let event = 'message';
      const lines = [];
      for (const line of raw.split('\n')) {
        if (line.startsWith('event:')) event = line.slice(6).trim();
        else if (line.startsWith('data:')) lines.push(line.slice(5).trim());
      }
      if (lines.length) events.push({ event, data: JSON.parse(lines.join('\n')) });
    }
  }

  return {
    events,
    first: (name) => events.find((e) => e.event === name)?.data,
    all: (name) => events.filter((e) => e.event === name).map((e) => e.data),
    names: () => events.map((e) => e.event),
  };
}

export const CORRECT = 'CORRECT — conservation of momentum gives 12 m/s.';
export const WRONG = 'INCORRECT — I added the speeds without signs.';
