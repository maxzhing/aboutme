const LEARNER_KEY = 'axiom:learner';

export function learnerId() {
  let value = localStorage.getItem(LEARNER_KEY);
  if (!value) {
    value = 'me';
    localStorage.setItem(LEARNER_KEY, value);
  }
  return value;
}

function headers(extra = {}) {
  return { 'x-learner-id': learnerId(), ...extra };
}

export class ApiError extends Error {
  constructor(message, status, retryable) {
    super(message);
    this.status = status;
    this.retryable = retryable;
  }
}

export async function get(path) {
  const res = await fetch(`/api${path}`, { headers: headers() });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(body.error || res.statusText, res.status, body.retryable);
  return body;
}

export async function post(path, data, method = 'POST') {
  const res = await fetch(`/api${path}`, {
    method,
    headers: headers({ 'content-type': 'application/json' }),
    body: JSON.stringify(data ?? {}),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(body.error || res.statusText, res.status, body.retryable);
  return body;
}

export const patch = (path, data) => post(path, data, 'PATCH');

export async function upload(files) {
  const form = new FormData();
  for (const file of files) form.append('files', file, file.name);
  const res = await fetch('/api/sources', { method: 'POST', headers: headers(), body: form });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(body.error || 'Upload failed', res.status);
  return body;
}

/**
 * POST that consumes a server-sent event stream.
 * `handlers` maps event names to callbacks; `error` events reject the promise.
 */
export function stream(path, data, handlers = {}) {
  const controller = new AbortController();

  const promise = (async () => {
    const res = await fetch(`/api${path}`, {
      method: 'POST',
      headers: headers({ 'content-type': 'application/json' }),
      body: JSON.stringify(data ?? {}),
      signal: controller.signal,
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new ApiError(body.error || res.statusText, res.status, body.retryable);
    }
    if (!res.body) throw new ApiError('Streaming is not supported by this browser.', 500);

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let failure = null;

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
        const dataLines = [];
        for (const line of raw.split('\n')) {
          if (line.startsWith('event:')) event = line.slice(6).trim();
          else if (line.startsWith('data:')) dataLines.push(line.slice(5).trim());
        }
        if (!dataLines.length) continue;

        let payload;
        try {
          payload = JSON.parse(dataLines.join('\n'));
        } catch {
          continue;
        }
        if (event === 'error') {
          failure = new ApiError(payload.message || 'Generation failed', payload.status, payload.retryable);
          handlers.error?.(failure);
          continue;
        }
        handlers[event]?.(payload);
      }
    }
    if (failure) throw failure;
  })();

  promise.abort = () => controller.abort();
  return promise;
}

export const api = {
  health: () => get('/health'),
  profile: () => get('/profile'),
  dashboard: () => get('/dashboard'),
  insights: (force) => get(`/insights${force ? '?force=1' : ''}`),
  concepts: () => get('/concepts'),
  history: () => get('/history'),
  sessions: () => get('/sessions'),
  session: (id) => get(`/sessions/${id}`),
  resources: (kind) => get(`/resources${kind ? `?kind=${kind}` : ''}`),
  resource: (id) => get(`/resources/${id}`),
  reviewQueue: () => get('/review/queue'),
  sources: () => get('/sources'),
  courses: () => get('/courses'),
  course: (id) => get(`/courses/${id}`),
  updateCourse: (id, data) => patch(`/courses/${id}`, data),
  createCourse: (data, handlers) => stream('/courses', data, handlers),
  courseNext: (id, handlers) => stream(`/courses/${id}/next`, {}, handlers),
  courseExam: (id, handlers) => stream(`/courses/${id}/exam`, {}, handlers),
  goals: () => get('/goals'),
  createGoal: (data) => post('/goals', data),
  updateGoal: (id, data) => patch(`/goals/${id}`, data),
  gradeAnswer: (data) => post('/answers/grade', data),
  analyzeSource: (id, note) => post(`/sources/${id}/analyze`, { note }),
  updateSession: (id, data) => patch(`/sessions/${id}`, data),
  start: (data, handlers) => stream('/learn/start', data, handlers),
  turn: (id, data, handlers) => stream(`/sessions/${id}/turn`, data, handlers),
  generate: (data, handlers) => stream('/generate', data, handlers),
  submit: (id, data, handlers) => stream(`/resources/${id}/submit`, data, handlers),
  remediate: (id, data, handlers) => stream(`/resources/${id}/remediate`, data, handlers),
  upload,
};
