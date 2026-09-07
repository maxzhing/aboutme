import { config } from '../config.js';
import { logger } from '../util/log.js';
import { parsePartialJson } from './partial-json.js';
import { adaptSchema, schemaInstruction } from './openai-schema.js';

const log = logger('llm:openai');

/**
 * OpenAI provider.
 *
 * Same contract as the Anthropic provider — `{ name, model, run }`, one
 * streamed call, structured output where the schema allows it, retries with
 * backoff, typed errors — so every engine module above it is unchanged.
 *
 * Written directly against `POST /chat/completions` with fetch rather than the
 * `openai` package, for three reasons: the surface needed here is one endpoint;
 * this project deliberately carries almost no dependencies and no build step;
 * and the same code then works against any OpenAI-compatible endpoint by
 * pointing `OPENAI_BASE_URL` somewhere else — Azure, a gateway, a local server.
 */

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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

async function httpError(res, model) {
  let detail = '';
  try {
    const body = await res.json();
    detail = body?.error?.message || body?.message || '';
  } catch {
    detail = (await res.text().catch(() => '')).slice(0, 400);
  }

  const opts = { status: res.status, headers: res.headers };
  switch (res.status) {
    case 401:
      return new LLMError('OPENAI_API_KEY is missing or invalid.', opts);
    case 403:
      return new LLMError('This API key is not permitted to use the configured model.', opts);
    case 404:
      return new LLMError(`Model "${model}" was not found for this key.`, opts);
    case 400:
      return new LLMError(`The model rejected the request: ${detail || 'bad request'}`, opts);
    case 429:
      // Out of credit and rate limited are the same status and are not the same
      // problem: one waits, the other never resolves on its own.
      if (/quota|billing|credit/i.test(detail)) {
        return new LLMError(`This account is out of API credit: ${detail}`, opts);
      }
      return new LLMError('The model is rate limited right now. Retrying shortly.', { ...opts, retryable: true });
    default:
      return new LLMError(`Model API error ${res.status}${detail ? `: ${detail}` : ''}`, {
        ...opts,
        retryable: res.status >= 500,
      });
  }
}

function retryDelay(attempt, err) {
  const header = err?.headers?.get?.('retry-after');
  const fromHeader = header ? Number(header) * 1000 : 0;
  const backoff = Math.min(16000, 900 * 2 ** attempt);
  return Math.max(fromHeader, backoff) + Math.random() * 350;
}

/* -------------------------------------------------------------- translation */

/**
 * Axiom speaks Anthropic content blocks everywhere. Translate them rather than
 * changing the engine, so neither provider is the odd one out.
 */
function translateContent(content) {
  if (typeof content === 'string') return content;

  const parts = [];
  for (const block of content || []) {
    if (block.type === 'text') {
      parts.push({ type: 'text', text: block.text });
    } else if (block.type === 'image' && block.source?.type === 'base64') {
      parts.push({
        type: 'image_url',
        image_url: { url: `data:${block.source.media_type};base64,${block.source.data}` },
      });
    } else if (block.type === 'document' && block.source?.type === 'base64') {
      parts.push({
        type: 'file',
        file: {
          filename: block.title || 'document.pdf',
          file_data: `data:${block.source.media_type};base64,${block.source.data}`,
        },
      });
    }
  }
  // A single text part is clearer as a plain string, and some compatible
  // endpoints only accept that form.
  if (parts.length === 1 && parts[0].type === 'text') return parts[0].text;
  return parts;
}

function translateSystem(system) {
  const blocks = Array.isArray(system) ? system : [{ text: String(system || '') }];
  return blocks
    .filter((b) => b.text && b.text.trim())
    .map((b) => b.text)
    .join('\n\n');
}

/* ------------------------------------------------------------------ streaming */

/** Read a chat-completions SSE body, feeding content deltas out as they land. */
async function readStream(res, onDelta) {
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  const final = { finishReason: null, usage: {}, model: null, refusal: null };

  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let boundary;
    while ((boundary = buffer.indexOf('\n\n')) !== -1) {
      const raw = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);

      for (const line of raw.split('\n')) {
        if (!line.startsWith('data:')) continue;
        const payload = line.slice(5).trim();
        if (!payload || payload === '[DONE]') continue;

        let event;
        try {
          event = JSON.parse(payload);
        } catch {
          continue;
        }

        if (event.error) {
          throw new LLMError(event.error.message || 'The model stream failed.', {
            status: 502,
            retryable: true,
          });
        }

        final.model = event.model || final.model;
        if (event.usage) Object.assign(final.usage, event.usage);

        const choice = event.choices?.[0];
        if (!choice) continue;
        if (choice.finish_reason) final.finishReason = choice.finish_reason;
        // A refusal arrives as its own delta field, not as content.
        if (choice.delta?.refusal) final.refusal = (final.refusal || '') + choice.delta.refusal;
        if (choice.delta?.content) onDelta(choice.delta.content);
      }
    }
  }

  return final;
}

/* ------------------------------------------------------------------ provider */

export function createOpenAIProvider() {
  const model = config.openaiModel;
  const baseURL = (config.openaiBaseURL || 'https://api.openai.com/v1').replace(/\/+$/, '');
  // Reported once, because "why is my worksheet occasionally malformed" should
  // be answerable from the log rather than from reading this file.
  let announced = false;

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

    const adapted = schema ? adaptSchema(schema) : null;
    const instruction = adapted && !adapted.strict ? schemaInstruction(adapted.schema) : null;

    if (adapted && !adapted.strict && !announced) {
      announced = true;
      log.warn(
        `${label}: schema too large for strict mode (${adapted.reasons.join('; ')}) — ` +
          'falling back to JSON mode. Output is validated and repaired downstream rather than guaranteed.',
      );
    }

    const body = {
      model,
      messages: [
        { role: 'system', content: [translateSystem(system), instruction].filter(Boolean).join('\n\n') },
        ...messages.map((m) => ({ role: m.role, content: translateContent(m.content) })),
      ],
      max_completion_tokens: maxTokens,
      stream: true,
      stream_options: { include_usage: true },
      ...(config.openaiEffort ? { reasoning_effort: effort } : {}),
      ...(adapted
        ? {
            response_format: adapted.strict
              ? { type: 'json_schema', json_schema: { name: label.replace(/[^a-zA-Z0-9_-]/g, '_'), strict: true, schema: adapted.schema } }
              : { type: 'json_object' },
          }
        : {}),
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), config.requestTimeoutMs);
    if (signal) signal.addEventListener('abort', () => controller.abort(), { once: true });

    const started = Date.now();
    let text = '';
    let lastPush = 0;
    let lastPartial;

    try {
      const res = await fetch(`${baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${config.openaiKey}`,
          ...(config.openaiOrg ? { 'openai-organization': config.openaiOrg } : {}),
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!res.ok) throw await httpError(res, model);
      if (!res.body) throw new LLMError('The model API returned no body.', { status: 502, retryable: true });

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

      if (final.refusal) {
        throw new LLMError(`The model declined this request: ${final.refusal}`, { status: 422 });
      }
      if (final.finishReason === 'length') {
        log.warn(`${label}: hit max_completion_tokens (${maxTokens}) — output may be truncated`);
      }
      if (final.finishReason === 'content_filter') {
        throw new LLMError('The provider’s content filter blocked this response.', { status: 422 });
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
        `${label} ok in ${Date.now() - started}ms · in=${usage.prompt_tokens ?? '?'} out=${usage.completion_tokens ?? '?'} cached=${usage.prompt_tokens_details?.cached_tokens ?? 0}`,
      );

      return {
        text,
        object,
        usage: {
          input_tokens: usage.prompt_tokens,
          output_tokens: usage.completion_tokens,
          cache_read_input_tokens: usage.prompt_tokens_details?.cached_tokens ?? 0,
        },
        stopReason: final.finishReason,
        model: final.model || model,
      };
    } catch (err) {
      if (err instanceof LLMError) throw err;
      if (err?.name === 'AbortError') {
        throw new LLMError('The request timed out.', { status: 504, retryable: true, cause: err });
      }
      throw new LLMError(`Could not reach ${baseURL}.`, { status: 502, retryable: true, cause: err });
    } finally {
      clearTimeout(timeout);
    }
  }

  async function run(opts) {
    if (!config.openaiKey) {
      throw new LLMError('No OPENAI_API_KEY configured. Add one to axiom/.env and restart the server.', {
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

  return { name: 'openai', model, run };
}
