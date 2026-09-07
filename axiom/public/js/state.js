/** Tiny shared store — deliberately not a framework. */
export const state = {
  health: null,
  dashboard: null,
  pendingStart: null,
  sessions: [],
  lastResource: null,
};

const listeners = new Set();

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function update(patch) {
  Object.assign(state, patch);
  for (const fn of listeners) fn(state);
}
