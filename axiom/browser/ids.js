/** Browser replacement for server/util/ids.js — same ids, no node:crypto. */

const hex = (bytes) => Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');

export const uuid = () =>
  crypto.randomUUID
    ? crypto.randomUUID()
    : hex(crypto.getRandomValues(new Uint8Array(16))).replace(
        /^(.{8})(.{4})(.{4})(.{4})(.{12})$/,
        '$1-$2-$3-$4-$5',
      );

/** Short, URL-safe, sortable-ish id: <prefix>_<time36><rand>. */
export function id(prefix = 'x') {
  return `${prefix}_${Date.now().toString(36)}${hex(crypto.getRandomValues(new Uint8Array(4)))}`;
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
