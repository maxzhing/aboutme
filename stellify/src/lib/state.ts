import type { AppState } from './types';

export const STATE_VERSION = 1;

export const initialState = (): AppState => ({
  version: STATE_VERSION,
  profile: { targetScore: 1500, dailyMinutes: 45, restDays: [0] },
  attempts: [],
  mistakes: {},
  srs: {},
  vocabSrs: {},
  pet: { name: 'Lumi', xp: 0, coins: 0, happiness: 70, lastCare: 0, owned: ['habitat-nook'], equipped: { habitat: 'habitat-nook' } },
  achievements: {},
  activity: {},
  lessonsDone: {},
  lessonStars: {},
  quests: {},
  planDone: {},
  mocks: [],
  saved: [],
  notes: [],
  reports: [],
  daily: {},
  arena: {},
  tutor: [],
  settings: { theme: 'dark', reducedMotion: false, showTimer: true, aiEnabled: true, aiConsent: false, shareIncludeMistakes: false, challenge: 'high', sound: true },
  seenLevel: 1,
});
