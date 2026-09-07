import { config } from './config.js';
import { createAnthropicProvider, LLMError } from './anthropic.js';
import { createMockProvider } from '../server/llm/mock.js';

/**
 * Browser replacement for server/llm/index.js.
 *
 * The server build also offers OpenAI. This one deliberately does not: with no
 * server there is nothing to make the call except the page itself, and OpenAI
 * does not permit browser-origin requests to its API the way Anthropic's
 * `anthropic-dangerous-direct-browser-access` header does. Shipping the code
 * here would only produce a provider that fails on CORS for anyone who picked
 * it, so the single-file build offers what it can actually deliver.
 */
let provider;

export function llm() {
  if (provider) return provider;
  provider = config.provider === 'mock' ? createMockProvider() : createAnthropicProvider();
  return provider;
}

export function resetProvider() {
  provider = undefined;
}

export { LLMError };
