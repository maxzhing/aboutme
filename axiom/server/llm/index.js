import { config } from '../config.js';
import { createAnthropicProvider, LLMError } from './anthropic.js';
import { createOpenAIProvider } from './openai.js';
import { createMockProvider } from './mock.js';

const PROVIDERS = {
  anthropic: createAnthropicProvider,
  openai: createOpenAIProvider,
  mock: createMockProvider,
};

let provider;

export function llm() {
  if (provider) return provider;
  const create = PROVIDERS[config.provider];
  if (!create) {
    throw new Error(
      `Unknown AXIOM_LLM_PROVIDER "${config.provider}". Choose one of: ${Object.keys(PROVIDERS).join(', ')}.`,
    );
  }
  provider = create();
  return provider;
}

/** Reset between tests. */
export function resetProvider() {
  provider = undefined;
}

export { LLMError };
