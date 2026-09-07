import { config } from '../config.js';
import { createAnthropicProvider, LLMError } from './anthropic.js';
import { createMockProvider } from './mock.js';

let provider;

export function llm() {
  if (provider) return provider;
  provider = config.provider === 'mock' ? createMockProvider() : createAnthropicProvider();
  return provider;
}

/** Reset between tests. */
export function resetProvider() {
  provider = undefined;
}

export { LLMError };
