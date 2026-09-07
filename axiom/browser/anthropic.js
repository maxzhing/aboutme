import { config } from './config.js';
import { logger } from '../server/util/log.js';
import { parsePartialJson } from '../server/llm/partial-json.js';

const log = logger('llm');

/**
 * Browser replacement for server/llm/anthropic.js.
 *
 * Same surface — { name, model, run } and LLMError — implemented directly on
 * fetch instead of the Node SDK, because there is no server in this build. The
 * `anthropic-dangerous-direct-browser-access` header is what makes the API
 * answer a cross-origin request from a page; it is the supported way to call
 * the API with a key the person using the page owns.
 */

const API_VERSION = '2023-06-01';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Bound concurrent upstream calls so a burst of panels cannot trip rate limits. */
class Semaphore {
  constructor(limit) {
    this.limit = limit;
    this.active = 0;
    this.queue = [];
  }
  async acquire() {
    if (this.active < this.limit) {
      this.active++;
      return;
    }
    await new Promise((resolve) => this.queue.push(resolve));
    this.active++;
  }
  release() {
    this.active--;
    const next = this.queue.shift();
    if (next) next();
  }
}

const gate = new Semaphore(config.concurrency || 4);

export class LLMError extends Error {
  constructor(message, { status, retryable, cause, headers } = {}) {
    super(message);
    this.name = 'LLMError';
    this.status = status;
    this.retryable = Boolean(retryable);
    this.cause = cause;
    this.headers = headers;
  }
}

/** Turn an HTTP failure into the same shape the server provider produces. */
async function httpError(res) {
  let detail = '';
  try {
    const body = await res.json();
    detail = body?.error?.message || body?.message || '';
  } catch {
    detail = await res.text().catch(() => '');
  }

  const opts = { status: res.status, headers: res.headers };
  switch (res.status) {
    case 401:
      return new LLMError('That API key was rejected. Check it, or paste a new one.', opts);
    case 403:
      return new LLMError('This API key is not permitted to use the configured model.', opts);
    case 404:
      return new LLMError(`Model "${config.model}" was not found for this key.`, opts);
    case 400:
      return new LLMError(`The model rejected the request: ${detail || 'bad request'}`, opts);
    case 429:
      return new LLMError('The model is rate limited right now. Retrying shortly.', {
        ...opts,
        retryable: true,
      });
    case 529:
      return new LLMError('The model is overloaded. Retrying shortly.', { ...opts, retryable: true });
    default:
      return new LLMError(
        `Model API error ${res.status}${detail ? `: ${detail}` : ''}`,
        { ...opts, retryable: res.status >= 500 },
      );
  }
}

function retryDelay(attempt, err) {
  const header = err?.headers?.get?.('retry-after');
  const fromHeader = header ? Number(header) * 1000 : 0;
  const backoff = Math.min(16000, 900 * 2 ** attempt);
  const jitter = Math.random() * 350;
  return Math.max(fromHeader, backoff) + jitter;
}

function normaliseSystem(system) {
  const blocks = Array.isArray(system) ? system : [{ text: String(system || '') }];
  return blocks
    .filter((b) => b.text && b.text.trim())
    .map((b, i, arr) => ({
      type: 'text',
      text: b.text,
      // Cache the stable prefix (everything but the final, per-request block).
      ...(b.cache || (i < arr.length - 1 && arr.length > 1 && b.cache !== false)
        ? { cache_control: { type: 'ephemeral' } }
        : {}),
    }));
}

/** Read a Messages API SSE body, feeding text deltas out as they land. */
async function readStream(res, onDelta) {
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  const final = { stop_reason: null, stop_details: null, usage: {}, model: config.model };

  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let boundary;
    while ((boundary = buffer.indexOf('\n\n')) !== -1) {
      const raw = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);
      if (!raw.trim() || raw.startsWith(':')) continue;

      const dataLines = [];
      for (const line of raw.split('\n')) {
        if (line.startsWith('data:')) dataLines.push(line.slice(5).trim());
      }
      if (!dataLines.length) continue;

      let event;
      try {
        event = JSON.parse(dataLines.join('\n'));
      } catch {
        continue;
      }

      switch (event.type) {
        case 'message_start':
          final.model = event.message?.model || final.model;
          Object.assign(final.usage, event.message?.usage || {});
          break;
        case 'content_block_delta':
          // Thinking deltas are not part of the answer and must not be parsed
          // as if they were the JSON document being built.
          if (event.delta?.type === 'text_delta') onDelta(event.delta.text || '');
          break;
        case 'message_delta':
          if (event.delta?.stop_reason) final.stop_reason = event.delta.stop_reason;
          if (event.delta?.stop_details) final.stop_details = event.delta.stop_details;
          Object.assign(final.usage, event.usage || {});
          break;
        case 'error':
          throw new LLMError(event.error?.message || 'The model stream failed.', {
            status: 502,
            retryable: true,
          });
        default:
          break;
      }
    }
  }

  return final;
}

export function createAnthropicProvider() {
  /**
   * One streamed request. Returns { text, object, usage, stopReason }.
   * When `schema` is given the model is constrained to that JSON schema and the
   * partially-received document is handed to `onPartial` as it arrives.
   */
  async function once(opts) {
    const {
      system,
      messages,
      schema,
      effort = 'high',
      maxTokens = 16000,
      onPartial,
      onText,
      signal,
      label = 'call',
    } = opts;

    const body = {
      model: config.model,
      max_tokens: maxTokens,
      system: normaliseSystem(system),
      messages,
      stream: true,
      output_config: {
        effort,
        ...(schema ? { format: { type: 'json_schema', schema } } : {}),
      },
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), config.requestTimeoutMs);
    if (signal) signal.addEventListener('abort', () => controller.abort(), { once: true });

    const started = Date.now();
    let text = '';
    let lastPush = 0;
    let lastPartial;

    try {
      const res = await fetch(`${config.baseURL}/v1/messages`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': config.apiKey,
          'anthropic-version': API_VERSION,
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!res.ok) throw await httpError(res);
      if (!res.body) throw new LLMError('This browser cannot stream responses.', { status: 500 });

      const final = await readStream(res, (delta) => {
        text += delta;
        if (onText) onText(delta, text);
        if (!onPartial) return;
        const at = Date.now();
        if (at - lastPush < 55) return; // throttle re-parses of a growing document
        lastPush = at;
        const obj = parsePartialJson(text);
        if (obj !== undefined) {
          lastPartial = obj;
          onPartial(obj, text);
        }
      });

      if (final.stop_reason === 'refusal') {
        throw new LLMError(
          `The model declined this request${final.stop_details?.category ? ` (${final.stop_details.category})` : ''}.`,
          { status: 422 },
        );
      }
      if (final.stop_reason === 'max_tokens') {
        log.warn(`${label}: hit max_tokens (${maxTokens}) — output may be truncated`);
      }

      let object;
      if (schema) {
        try {
          object = JSON.parse(text);
        } catch {
          object = parsePartialJson(text);
          if (object === undefined) {
            throw new LLMError('The model returned malformed JSON.', { status: 502, retryable: true });
          }
          log.warn(`${label}: repaired truncated JSON`);
        }
        if (onPartial && object !== lastPartial) onPartial(object, text);
      }

      log.debug(
        `${label} ok in ${Date.now() - started}ms · in=${final.usage.input_tokens ?? '?'} out=${final.usage.output_tokens ?? '?'} cached=${final.usage.cache_read_input_tokens ?? 0}`,
      );

      return { text, object, usage: final.usage, stopReason: final.stop_reason, model: final.model };
    } catch (err) {
      if (err instanceof LLMError) throw err;
      if (err?.name === 'AbortError') {
        throw new LLMError('The request timed out.', { status: 504, retryable: true, cause: err });
      }
      // A TypeError from fetch here is a network or CORS failure, not a bug in
      // the request: say so rather than surfacing "Failed to fetch".
      throw new LLMError('Could not reach the model API. Check your connection.', {
        status: 502,
        retryable: true,
        cause: err,
      });
    } finally {
      clearTimeout(timeout);
    }
  }

  async function run(opts) {
    if (!config.apiKey) {
      throw new LLMError('No API key yet. Add one to start — Axiom keeps it in this browser only.', {
        status: 503,
      });
    }
    await gate.acquire();
    try {
      let attempt = 0;
      for (;;) {
        try {
          return await once(opts);
        } catch (err) {
          if (!err.retryable || attempt >= config.maxRetries) throw err;
          const wait = retryDelay(attempt, err);
          log.warn(
            `${opts.label || 'call'}: ${err.message} — retry ${attempt + 1}/${config.maxRetries} in ${Math.round(wait)}ms`,
          );
          await sleep(wait);
          attempt++;
        }
      }
    } finally {
      gate.release();
    }
  }

  return { name: 'anthropic', model: config.model, run };
}
