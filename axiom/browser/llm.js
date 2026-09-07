import { config } from './config.js';
import { createAnthropicProvider, LLMError } from './anthropic.js';
import { createOpenAIProvider } from '../server/llm/openai.js';
import { createMockProvider } from '../server/llm/mock.js';

/**
 * Browser replacement for server/llm/index.js.
 *
 * Anthropic needs a browser-specific client because the Node SDK does not run
 * here. OpenAI does not: `server/llm/openai.js` is plain fetch against one
 * endpoint and touches nothing Node-only, so the single-file build runs the
 * very same provider the server does.
 */
const PROVIDERS = {
  anthropic: createAnthropicProvider,
  openai: createOpenAIProvider,
  mock: createMockProvider,
};

let provider;
let providerName;

export function llm() {
  // The learner can switch provider from Settings mid-session, so the cached
  // instance is only good while the choice has not moved.
  if (provider && providerName === config.provider) return provider;
  providerName = config.provider;
  provider = (PROVIDERS[config.provider] || createAnthropicProvider)();
  return provider;
}

export function resetProvider() {
  provider = undefined;
  providerName = undefined;
}

export { LLMError };
