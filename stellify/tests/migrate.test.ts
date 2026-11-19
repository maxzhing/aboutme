import { describe, expect, it } from 'vitest';
import { migrate, CURRENT_VERSION } from '../src/lib/migrate';
import { weekRhythm } from '../src/lib/engine/streak';

/** A version-1 save as the previous release wrote it (trimmed to the fields that matter). */
const V1 = {
  version: 1,
  profile: { targetScore: 1450, dailyMinutes: 40, restDays: [0], examDate: '2026-12-05' },
  attempts: [{ id: 'a1', qid: 'm-lin1-01', at: 1_700_000_000_000, answer: '1', correct: true, ms: 40000, hints: 0, mode: 'bank', sessionId: 's1' }],
  mistakes: {}, srs: { 'm-lin1-01': { due: 1, interval: 2, ease: 2.3, reps: 1, lapses: 0 } }, vocabSrs: {},
  lessonStars: { lin1: 3 }, chapters: { 'lin1-1': { best: 3, total: 3, at: 1, passedAt: 1 } },
  settings: { theme: 'dark', reducedMotion: false, showTimer: true, aiEnabled: true, aiConsent: false, shareIncludeMistakes: false, challenge: 'high', sound: true },
  notes: [{ id: 'n1', title: 'Mine', body: 'keep me', kind: 'note' }],
  futureField: { kept: true },
};

describe('saved-progress migration', () => {
  it('upgrades v1 to the current version and keeps every existing field', () => {
    const out = migrate(structuredClone(V1), 1) as unknown as typeof V1 & Record<string, unknown>;
    expect(out.version).toBe(CURRENT_VERSION);
    expect(out.attempts).toEqual(V1.attempts);
    expect(out.srs).toEqual(V1.srs);
    expect(out.lessonStars).toEqual({ lin1: 3 });
    expect(out.chapters).toEqual(V1.chapters);
    expect(out.notes).toEqual(V1.notes);
    expect(out.settings).toEqual(V1.settings); // a saved dark theme stays dark
    expect(out.futureField).toEqual({ kept: true });
  });
  it('adds the Path, test-day, prediction and consent records, with collection consent off', () => {
    const out = migrate(structuredClone(V1), 1);
    expect(out.path).toEqual({ stars: {}, sets: [], worked: {}, retained: {} });
    expect(out.testDay).toEqual({ ticks: {} });
    expect(out.predictions).toEqual([]);
    expect(out.research).toEqual({ consent: false });
  });
  it('is idempotent on current data and never overwrites existing Path progress', () => {
    const once = migrate(structuredClone(V1), 1);
    once.path!.stars = { lin1: { 1: 5 } };
    const twice = migrate(structuredClone(once), CURRENT_VERSION);
    expect(twice.path!.stars).toEqual({ lin1: { 1: 5 } });
    expect(migrate(structuredClone({ ...V1, version: 2, path: once.path }), 1).path!.stars).toEqual({ lin1: { 1: 5 } });
  });
  it('treats a missing version as v1 (old exports)', () => {
    const { version: _v, ...noVersion } = V1;
    void _v;
    expect(migrate(noVersion, Number.NaN).version).toBe(CURRENT_VERSION);
  });
});

describe('weekly rhythm', () => {
  it('counts study days Monday to Sunday against planned days', () => {
    const act = { '2026-11-16': { questions: 3, correct: 2, ms: 1, lessons: 0, xp: 0 }, '2026-11-18': { questions: 0, correct: 0, ms: 0, lessons: 1, xp: 0 }, '2026-11-15': { questions: 9, correct: 9, ms: 1, lessons: 0, xp: 0 } };
    const r = weekRhythm(act as never, [0], '2026-11-19');
    expect(r.monday).toBe('2026-11-16');
    expect(r.done).toBe(2);
    expect(r.planned).toBe(6);
  });
});
