import { files } from './files.js';
import { api } from '../server/routes/api.js';
import { config } from './config.js';
import { logger } from '../server/util/log.js';

const log = logger('net');

/**
 * The transport.
 *
 * In the hosted build the frontend talks to an HTTP API. Here there is no
 * server, so `fetch('/api/...')` is answered in-page by the very same route
 * handlers, given an Express-shaped request and response. The frontend does not
 * know the difference, which is the point: one implementation of the product,
 * two ways of reaching it.
 */

const TEXT_MIMES = new Set([
  'text/plain', 'text/markdown', 'text/csv', 'text/html',
  'application/json', 'application/x-latex', 'text/x-tex',
]);
const IMAGE_MIMES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);
const MAX_UPLOAD_BYTES = 12 * 1024 * 1024;

function kindFor(mime, name) {
  if (mime === 'application/pdf' || name.toLowerCase().endsWith('.pdf')) return 'pdf';
  if (IMAGE_MIMES.has(mime)) return 'image';
  if (TEXT_MIMES.has(mime) || /\.(txt|md|csv|json|tex|html?)$/i.test(name)) return 'text';
  return null;
}

const toBase64 = (buffer) => {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
};

/** Read a FormData upload into the records the store keeps. */
async function readUpload(form) {
  const accepted = [];
  let warning = null;
  for (const entry of form.getAll('files')) {
    if (!(entry instanceof File)) continue;
    const kind = kindFor(entry.type, entry.name || '');
    if (!kind) {
      warning ||= `Unsupported file type: ${entry.name} (${entry.type || 'unknown'}). Upload a PDF, image, or text file.`;
      continue;
    }
    if (entry.size > MAX_UPLOAD_BYTES) {
      warning ||= `${entry.name} is larger than ${Math.round(MAX_UPLOAD_BYTES / 1048576)} MB.`;
      continue;
    }
    const record = {
      name: String(entry.name || 'upload').slice(0, 120),
      mime: entry.type || 'application/octet-stream',
      bytes: entry.size,
      kind,
    };
    if (kind === 'text') record.text = (await entry.text()).slice(0, 400000);
    else record.data = toBase64(await entry.arrayBuffer());
    accepted.push(record);
  }
  return { accepted, warning };
}

/** An Express-shaped response that resolves into a real Response object. */
function makeResponse(resolve) {
  const encoder = new TextEncoder();
  const closeHandlers = [];
  let controller = null;
  let statusCode = 200;
  let extraHeaders = {};
  let settled = false;
  let ended = false;

  const res = {
    headersSent: false,
    get writableEnded() {
      return ended;
    },
    status(code) {
      statusCode = code;
      return res;
    },
    setHeader(key, value) {
      extraHeaders[key] = value;
      return res;
    },
    json(body) {
      if (settled) return res;
      settled = true;
      ended = true;
      res.headersSent = true;
      resolve(
        new Response(JSON.stringify(body ?? {}), {
          status: statusCode,
          headers: { 'content-type': 'application/json; charset=utf-8', ...extraHeaders },
        }),
      );
      return res;
    },
    writeHead(code, headers = {}) {
      if (settled) return res;
      settled = true;
      statusCode = code;
      res.headersSent = true;
      const stream = new ReadableStream({
        start(c) {
          controller = c;
        },
        cancel() {
          ended = true;
          for (const handler of closeHandlers) handler();
        },
      });
      resolve(new Response(stream, { status: statusCode, headers: { ...headers, ...extraHeaders } }));
      return res;
    },
    flushHeaders() {
      return res;
    },
    write(chunk) {
      if (ended || !controller) return false;
      try {
        controller.enqueue(encoder.encode(chunk));
      } catch {
        ended = true;
      }
      return true;
    },
    end() {
      if (ended) return res;
      ended = true;
      try {
        controller?.close();
      } catch {
        /* already closed by the reader */
      }
      for (const handler of closeHandlers) handler();
      return res;
    },
    on(event, handler) {
      if (event === 'close') closeHandlers.push(handler);
      return res;
    },
  };
  return res;
}

function makeRequest({ method, url, headers, body, form }) {
  const routePath = url.pathname.replace(/^\/api/, '') || '/';
  return {
    method,
    path: routePath,
    routePath,
    originalUrl: url.pathname + url.search,
    query: Object.fromEntries(url.searchParams.entries()),
    headers,
    body,
    files: form?.accepted,
    uploadWarning: form?.warning ?? null,
    params: {},
    get: (name) => headers[String(name).toLowerCase()] ?? undefined,
  };
}

/** Answer one /api request with the same handlers the server mounts. */
export async function handleApiRequest(request) {
  const url = new URL(request.url, 'http://axiom.local');
  const headers = Object.fromEntries([...request.headers].map(([k, v]) => [k.toLowerCase(), v]));

  let body;
  let form;
  const contentType = headers['content-type'] || '';
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    if (contentType.includes('multipart/form-data') || request.__formData) {
      form = await readUpload(request.__formData ?? (await request.formData()));
    } else {
      body = await request.json().catch(() => ({}));
    }
  }

  const req = makeRequest({ method: request.method, url, headers, body, form });

  let settle;
  const response = new Promise((resolve) => {
    settle = resolve;
  });
  const res = makeResponse(settle);

  (async () => {
    try {
      if (await files.handle(req, res)) return;
      if (await api.handle(req, res)) return;
      res.status(404).json({ error: `No such endpoint: ${req.method} /api${req.path}` });
    } catch (err) {
      const status = err?.status >= 400 && err?.status < 600 ? err.status : 500;
      if (status >= 500) log.error(`${req.method} ${req.path} failed: ${err?.message}`, err?.stack);
      if (res.headersSent) {
        // A stream was already open: report the failure inside it, as the
        // server's stream wrapper would.
        res.write(
          `event: error\ndata: ${JSON.stringify({
            message: err?.message || 'Something went wrong.',
            status,
            retryable: Boolean(err?.retryable),
          })}\n\n`,
        );
        res.end();
        return;
      }
      res.status(status).json({ error: err?.message || 'Internal error', retryable: Boolean(err?.retryable) });
    }
  })();

  return response;
}

/** Route /api/* to the in-page handlers; leave every other request alone. */
export function installTransport() {
  const nativeFetch = globalThis.fetch.bind(globalThis);

  globalThis.fetch = async (input, init = {}) => {
    const raw = typeof input === 'string' ? input : input?.url ?? String(input);
    const path = raw.startsWith('/') ? raw : null;
    if (!path || !path.startsWith('/api')) return nativeFetch(input, init);

    const request = new Request(`http://axiom.local${path}`, {
      method: init.method || 'GET',
      headers: init.headers || {},
      // FormData cannot survive Request construction here without a boundary
      // round trip, so it is handed over directly.
      body: init.body instanceof FormData ? undefined : init.body,
      signal: init.signal,
    });
    if (init.body instanceof FormData) request.__formData = init.body;
    return handleApiRequest(request);
  };

  log.info(`transport installed — model ${config.model}`);
}
