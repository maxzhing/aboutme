import Anthropic from '@anthropic-ai/sdk';
import { config } from '../config.js';
import { logger } from '../util/log.js';
import { parsePartialJson } from './partial-json.js';

const log = logger('llm');

/** Bound concurrent upstream calls so a burst of tabs cannot trip rate limits. */
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

const gate = new Semaphore(Number(process.env.AXIOM_CONCURRENCY) || 6);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export class LLMError extends Error {
  constructor(message, { status, retryable, cause } = {}) {
    super(message);
    this.name = 'LLMError';
    this.status = status;
    this.retryable = Boolean(retryable);
    this.cause = cause;
  }
}

function classify(err) {
  if (err instanceof Anthropic.RateLimitError) {
    return new LLMError('The model is rate limited right now. Retrying shortly.', {
      status: 429,
      retryable: true,
      cause: err,
    });
  }
  if (err instanceof Anthropic.AuthenticationError) {
    return new LLMError('ANTHROPIC_API_KEY is missing or invalid.', { status: 401, cause: err });
  }
  if (err instanceof Anthropic.PermissionDeniedError) {
    return new LLMError('This API key is not permitted to use the configured model.', {
      status: 403,
      cause: err,
    });
  }
  if (err instanceof Anthropic.NotFoundError) {
    return new LLMError(`Model "${config.model}" was not found for this key.`, {
      status: 404,
      cause: err,
    });
  }
  if (err instanceof Anthropic.BadRequestError) {
    return new LLMError(`The model rejected the request: ${err.message}`, { status: 400, cause: err });
  }
  if (err instanceof Anthropic.APIConnectionError) {
    return new LLMError('Could not reach the model API.', { status: 502, retryable: true, cause: err });
  }
  if (err instanceof Anthropic.APIError) {
    return new LLMError(`Model API error ${err.status}: ${err.message}`, {
      status: err.status,
      retryable: err.status >= 500,
      cause: err,
    });
  }
  return new LLMError(err?.message || 'Unknown model error', { cause: err });
}

function retryDelay(attempt, err) {
  const header = err?.cause?.headers?.get?.('retry-after');
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

export function createAnthropicProvider() {
  const client = new Anthropic({
    apiKey: config.apiKey || undefined,
    baseURL: config.baseURL,
    maxRetries: 0, // retries are handled here so backoff is observable
    timeout: config.requestTimeoutMs,
  });

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

    const params = {
      model: config.model,
      max_tokens: maxTokens,
      system: normaliseSystem(system),
      messages,
      output_config: {
        effort,
        ...(schema ? { format: { type: 'json_schema', schema } } : {}),
      },
    };

    const started = Date.now();
    const stream = client.messages.stream(params, signal ? { signal } : undefined);

    let text = '';
    let lastPush = 0;
    let lastPartial;

    stream.on('text', (delta) => {
      text += delta;
      if (onText) onText(delta, text);
      if (!onPartial) return;
      const now = Date.now();
      if (now - lastPush < 55) return; // throttle re-parses of a growing document
      lastPush = now;
      const obj = parsePartialJson(text);
      if (obj !== undefined) {
        lastPartial = obj;
        onPartial(obj, text);
      }
    });

    const final = await stream.finalMessage();

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

    const usage = final.usage || {};
    log.debug(
      `${label} ok in ${Date.now() - started}ms · in=${usage.input_tokens ?? '?'} out=${usage.output_tokens ?? '?'} cached=${usage.cache_read_input_tokens ?? 0}`,
    );

    return { text, object, usage, stopReason: final.stop_reason, model: final.model };
  }

  async function run(opts) {
    if (!config.apiKey) {
      throw new LLMError(
        'No ANTHROPIC_API_KEY configured. Add one to axiom/.env and restart the server.',
        { status: 503 },
      );
    }
    await gate.acquire();
    try {
      let attempt = 0;
      for (;;) {
        try {
          return await once(opts);
        } catch (raw) {
          const err = raw instanceof LLMError ? raw : classify(raw);
          if (!err.retryable || attempt >= config.maxRetries) throw err;
          const wait = retryDelay(attempt, err);
          log.warn(`${opts.label || 'call'}: ${err.message} — retry ${attempt + 1}/${config.maxRetries} in ${Math.round(wait)}ms`);
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
