/**
 * HTTP transport: talks to a running Grant Match Engine server.
 *
 * The search call consumes the server's SSE stream so the interface can show
 * real research stages as they happen, then resolves with the finished run.
 */

async function api(base, path, options = {}) {
  const response = await fetch(`${base}${path}`, {
    headers: { 'content-type': 'application/json' },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || `Request failed (${response.status})`);
  return payload;
}

/** Parse one `event:`/`data:` frame out of the SSE stream. */
function parseFrame(frame) {
  const eventLine = frame.split('\n').find((line) => line.startsWith('event: '));
  const dataLine = frame.split('\n').find((line) => line.startsWith('data: '));
  if (!eventLine || !dataLine) return null;
  try {
    return { event: eventLine.slice(7).trim(), data: JSON.parse(dataLine.slice(6)) };
  } catch {
    return null;
  }
}

/**
 * Build a transport for an engine at `base`.
 *
 * `base` is '' for the app the engine itself serves, or an absolute origin such
 * as http://localhost:8787 when a page opened from a file connects to a running
 * engine.
 */
export function createServerTransport(base = '') {
  const origin = base.replace(/\/+$/, '');
  return {
  mode: 'server',
  origin,

  /** What this transport can actually do, so the interface never offers more. */
  features: { alerts: true, alertsNote: null },

  capabilities: () => api(origin, '/api/capabilities'),

  async search(profile, sort, onStage = () => {}, signal) {
    const response = await fetch(`${origin}/api/search/stream`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ profile, sort }),
      signal,
    });
    if (!response.body) throw new Error('Streaming is not supported by this browser.');

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let run = null;
    let failure = null;

    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const frames = buffer.split('\n\n');
      buffer = frames.pop() ?? '';
      for (const frame of frames) {
        const parsed = parseFrame(frame);
        if (!parsed) continue;
        if (parsed.event === 'stage') onStage(parsed.data);
        if (parsed.event === 'result') run = parsed.data;
        if (parsed.event === 'error') failure = parsed.data.message;
      }
    }

    if (failure) throw new Error(failure);
    if (!run) throw new Error('The server closed the stream without returning results.');
    return run;
  },

  answer: (runId, answers, sort) => api(origin, '/api/search/answer', { method: 'POST', body: { runId, answers, sort } }),
  assistant: (runId, grantId) => api(origin, '/api/assistant', { method: 'POST', body: { runId, grantId } }),

  saved: {
    list: () => api(origin, '/api/saved'),
    add: (payload) => api(origin, '/api/saved', { method: 'POST', body: payload }),
    remove: (id) => api(origin, `/api/saved/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  },

  tracker: {
    list: () => api(origin, '/api/tracker'),
    put: (entry) => api(origin, '/api/tracker', { method: 'POST', body: entry }),
    remove: (id) => api(origin, `/api/tracker/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  },

  alerts: {
    list: () => api(origin, '/api/alerts'),
    markRead: (ids) => api(origin, '/api/alerts/read', { method: 'POST', body: { ids } }),
  },

  profiles: {
    list: () => api(origin, '/api/profiles'),
    save: (payload) => api(origin, '/api/profiles', { method: 'POST', body: payload }),
    sweep: (id) => api(origin, `/api/profiles/${encodeURIComponent(id)}/sweep`, { method: 'POST' }),
    },
  };
}

/** The engine serving this page. */
export const serverTransport = createServerTransport('');
