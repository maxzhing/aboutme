import type { AppState } from './types';
import { emptyPath } from './path/stars';

/**
 * Saved-progress migrations. Each step upgrades one schema version and keeps everything it does not know
 * about, so a student's progress survives every update. Used when the app loads saved state and when a
 * backup file is imported (an older export upgrades the same way). Tested in tests/migrate.test.ts.
 *
 *   v1 → v2: adds the Path (stars, set results, worked-example ladders, retention checks), the test-day
 *            checklist, Predict-First rows and the research-consent record (off by default).
 */
export const CURRENT_VERSION = 2;

type Loose = Partial<AppState> & Record<string, unknown>;
const STEPS: Record<number, (s: Loose) => Loose> = {
  1: (s) => ({
    ...s,
    path: s.path ?? emptyPath(),
    testDay: s.testDay ?? { ticks: {} },
    predictions: s.predictions ?? [],
    research: s.research ?? { consent: false },
    version: 2,
  }),
};

export function migrate(persisted: unknown, fromVersion: number): AppState {
  let s = { ...((persisted ?? {}) as Loose) };
  let v = Number.isFinite(fromVersion) && fromVersion >= 1 ? fromVersion : 1;
  while (v < CURRENT_VERSION) {
    const step = STEPS[v];
    if (!step) throw new Error(`No migration from saved-data version ${v}`);
    s = step(s);
    v++;
  }
  return { ...s, version: CURRENT_VERSION } as AppState;
}
