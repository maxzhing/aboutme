import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './config.js';

const DIR = path.join(ROOT, 'server', 'prompts');
const cache = new Map();

export function loadPrompt(name) {
  if (cache.has(name) && process.env.NODE_ENV === 'production') return cache.get(name);
  const text = fs.readFileSync(path.join(DIR, `${name}.md`), 'utf8');
  cache.set(name, text);
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
