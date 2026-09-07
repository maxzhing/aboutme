import { PROMPTS } from './prompt-data.js';

/**
 * Browser replacement for server/prompts.js. The prompt files are the same
 * markdown, inlined at build time instead of read from disk.
 */
export function loadPrompt(name) {
  const text = PROMPTS[name];
  if (text === undefined) throw new Error(`Unknown prompt: ${name}`);
  return text;
}

/** Fill `${var}` placeholders. Missing values render as an empty string. */
export function renderPrompt(name, vars = {}) {
  return loadPrompt(name)
    .replace(/\$\{(\w+)\}/g, (_, key) => {
      const value = vars[key];
      if (value == null) return '';
      return typeof value === 'string' ? value : JSON.stringify(value);
    })
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export const systemPrompt = () => loadPrompt('system');
