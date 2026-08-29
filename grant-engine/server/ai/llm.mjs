/**
 * Anthropic Messages API adapter.
 *
 * The model is used for exactly two jobs:
 *   1. interpreting the applicant's own words into structured criteria, and
 *   2. reading funder pages and pointing at the spans that state each fact.
 *
 * It is never asked "what grants exist" or "is this person eligible" -- those
 * answers come from live sources and from deterministic code. Everything the
 * model returns about a funder page is re-checked against the downloaded text
 * by `groundFields()` before it can reach a user.
 */

import { config, hasLlm } from '../lib/config.mjs';
import { request, readCapped } from '../lib/http.mjs';

export class LlmUnavailableError extends Error {
  constructor(message = 'No language model is configured (ANTHROPIC_API_KEY is unset)') {
    super(message);
    this.name = 'LlmUnavailableError';
  }
}

export class LlmError extends Error {
  constructor(message) {
    super(message);
    this.name = 'LlmError';
  }
}

/** Shared preamble: the model's standing instructions about honesty. */
export const HONESTY_CONTRACT = `You are the research component of a grant-eligibility system that is audited for fabrication.

Absolute rules:
- Never state a fact that is not present in the text you were given. Not a deadline, not an award amount, not an eligibility rule, not a URL, not a funder name.
- If the text does not state something, return null for it. "null" is always a correct answer. A plausible guess is always a wrong answer.
- Do not use background knowledge about a funder, however confident you are. Only the supplied text counts.
- Every fact you report must be accompanied by a quote copied CHARACTER-FOR-CHARACTER from the supplied text. Quotes are automatically re-checked against the source; an invented or paraphrased quote destroys the fact and lowers the source's trust rating.
- Quotes must be at least a full clause (12+ characters) and must be contiguous. Never stitch together separated fragments.
- Respond with JSON only. No prose, no markdown fences, no commentary.`;

/**
 * Single completion returning parsed JSON.
 * `prefill` seeds the assistant turn so the model cannot open with prose.
 */
export async function jsonCall({ system, prompt, maxTokens, temperature = 0, retries = 2 }) {
  if (!hasLlm()) throw new LlmUnavailableError();

  const body = JSON.stringify({
    model: config.llm.model,
    max_tokens: maxTokens ?? config.llm.maxTokens,
    temperature,
    system: system ? `${HONESTY_CONTRACT}\n\n${system}` : HONESTY_CONTRACT,
    messages: [
      { role: 'user', content: prompt },
      { role: 'assistant', content: '{' },
    ],
  });

  const response = await request(`${config.llm.baseUrl}/v1/messages`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': config.llm.apiKey,
      'anthropic-version': '2023-06-01',
    },
    body,
    timeoutMs: config.llm.timeoutMs,
    retries,
    throttleHost: false,
  });

  const text = await readCapped(response, 4_000_000);
  if (!response.ok) throw new LlmError(`Model API returned HTTP ${response.status}: ${text.slice(0, 400)}`);

  let payload;
  try {
    payload = JSON.parse(text);
  } catch {
    throw new LlmError('Model API response was not valid JSON');
  }

  const completion = (payload.content || [])
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('');

  return parseJsonObject(`{${completion}`);
}

/**
 * Parse a JSON object out of model output, tolerating a trailing explanation or
 * an unterminated response caused by hitting the token cap.
 */
export function parseJsonObject(text) {
  const trimmed = String(text).trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    // fall through to brace balancing
  }
  const start = trimmed.indexOf('{');
  if (start === -1) throw new LlmError('Model returned no JSON object');

  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < trimmed.length; i += 1) {
    const char = trimmed[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') inString = true;
    else if (char === '{') depth += 1;
    else if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        try {
          return JSON.parse(trimmed.slice(start, i + 1));
        } catch (error) {
          throw new LlmError(`Model returned malformed JSON: ${error.message}`);
        }
      }
    }
  }
  throw new LlmError('Model returned a truncated JSON object');
}

export { hasLlm };
