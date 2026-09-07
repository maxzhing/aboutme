import { randomUUID, randomBytes } from 'node:crypto';

export const uuid = () => randomUUID();

/** Short, URL-safe, sortable-ish id: <prefix>_<time36><rand>. */
export function id(prefix = 'x') {
  return `${prefix}_${Date.now().toString(36)}${randomBytes(4).toString('hex')}`;
}

export function slug(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_-]+/g, '-')
    .slice(0, 80) || 'concept';
}
