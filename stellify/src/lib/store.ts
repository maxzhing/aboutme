'use client';
import { create } from 'zustand';
import { CHEST, dailyQuests } from './engine/quests';
import { passed } from './course';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';
import { del, get, set } from 'idb-keyval';
import type { AppState, ErrorCategory, MockAttempt, Note, PetSlot, Profile, Question, QuestionReport, Settings, TutorMessage } from './types';
import { initialState, STATE_VERSION } from './state';
import { getQuestion, OFFICIAL, QUESTIONS } from '@/data/questions';
import { applyAttempt, grant, resolveMistake, unlockAchievements, type AttemptInput, type GameEvent } from './engine/attempt';
import { generatePlan } from './engine/plan';
import { advanceMock, scoreMock, stagesFor, startMock as buildMock } from './engine/mock';
import { schedule } from './engine/srs';
import { XP_REWARD } from './engine/xp';
import { SHOP_ITEM } from '@/data/shop';
import { clamp, dateKey, uid } from './util';

/** IndexedDB first (roomy, offline-friendly); falls back to localStorage, then to memory. */
const mem = new Map<string, string>();
const idbStorage: StateStorage = {
  getItem: async (k) => {
    try { const v = await get<string>(k); if (v != null) return v; } catch { /* fall through */ }
    try { return localStorage.getItem(k); } catch { return mem.get(k) ?? null; }
  },
  setItem: async (k, v) => {
    try { await set(k, v); return; } catch { /* fall through */ }
    try { localStorage.setItem(k, v); } catch { mem.set(k, v); }
  },
  removeItem: async (k) => {
    try { await del(k); } catch { /* ignore */ }
    try { localStorage.removeItem(k); } catch { mem.delete(k); }
  },
};

export const STORAGE_KEY = 'stellify-state-v1';

interface Actions {
  hydrated: boolean;
  events: (GameEvent & { key: string })[];
  dismissEvent: (key: string) => void;
  answer: (input: AttemptInput) => { correct: boolean; events: GameEvent[] };
  setProfile: (p: Partial<Profile>) => void;
  setSettings: (p: Partial<Settings>) => void;
  setMistakeCategory: (qid: string, c: ErrorCategory) => void;
  resolve: (qid: string) => boolean;
  toggleSaved: (qid: string) => void;
  completeLesson: (skill: string) => void;
  setLessonStars: (skill: string, stars: number) => void;
  claimQuest: (id: string) => boolean;
  finishChapter: (id: string, correct: number, total: number) => void;
  logTrap: (trapId: string, qid: string) => void;
  makePlan: () => void;
  togglePlanTask: (id: string) => void;
  saveNote: (n: Partial<Note> & { title: string; body: string }) => string;
  deleteNote: (id: string) => void;
  report: (r: Omit<QuestionReport, 'at'>) => void;
  buy: (itemId: string) => boolean;
  equip: (slot: PetSlot, itemId: string | undefined) => void;
  renamePet: (name: string) => void;
  carePet: (kind: 'pet' | 'treat' | 'play') => boolean;
  recordDaily: (qid: string, correct: boolean, ms: number) => void;
  recordArena: (id: string, r: { score: number; correct: number; total: number; ms: number }) => boolean;
  reviewVocab: (word: string, knew: boolean) => void;
  awardXp: (xp: number, text: string) => void;
  tutorAppend: (threadId: string | null, msg: TutorMessage, meta?: { title?: string; qid?: string }) => string;
  tutorDelete: (id: string) => void;
  startMock: (formId: string, kind: MockAttempt['kind']) => void;
  mockUpdate: (patch: { answer?: [string, string | null]; flag?: string; index?: number; msLeft?: number; addMs?: [string, number]; breakMsLeft?: number; addBreak?: boolean; locked?: boolean }) => void;
  mockNext: () => { finished: boolean; id: string };
  abandonMock: () => void;
  finishDiagnostic: () => void;
  importState: (s: AppState) => void;
  resetAll: () => void;
  markLevelSeen: (level: number) => void;
}

export type Store = AppState & Actions;
const getQ = (id: string): Question | undefined => getQuestion(id);
const pure = (s: Store): AppState => {
  const { hydrated: _h, events: _e, ...rest } = s as Store & Record<string, unknown>;
  void _h; void _e;
  return Object.fromEntries(Object.entries(rest).filter(([, v]) => typeof v !== 'function')) as unknown as AppState;
};
/** Only moments worth interrupting for become pop-ups; reaching the first mastery step is not one of them. */
const withKeys = (events: GameEvent[]) => events.filter((e) => e.type !== 'mistake' && !(e.type === 'mastery' && e.level < 2)).map((e) => ({ ...e, key: uid() }));

export const useStore = create<Store>()(
  persist(
    (setState, getState) => {
      const apply = (fn: (s: AppState) => { state: AppState; events?: GameEvent[] }) => {
        const r = fn(pure(getState()));
        setState({ ...r.state, events: [...getState().events, ...withKeys(r.events ?? [])].slice(-3) });
        return r;
      };
      const post = (s: AppState, now: number) => unlockAchievements(s, getQ, now);
      return {
        ...initialState(),
        hydrated: false,
        events: [],
        dismissEvent: (key) => setState({ events: getState().events.filter((e) => e.key !== key) }),

        answer: (input) => {
          const r = applyAttempt(pure(getState()), input, Date.now(), getQ);
          setState({ ...r.state, events: [...getState().events, ...withKeys(r.events)].slice(-3) });
          return { correct: r.correct, events: r.events };
        },
        setProfile: (p) => setState({ profile: { ...getState().profile, ...p } }),
        setSettings: (p) => setState({ settings: { ...getState().settings, ...p } }),
        setMistakeCategory: (qid, c) => {
          const m = getState().mistakes[qid];
          if (m) setState({ mistakes: { ...getState().mistakes, [qid]: { ...m, category: c, categoryBy: 'student' } } });
        },
        resolve: (qid) => {
          let ok = false;
          apply((s) => { const r = resolveMistake(s, qid, Date.now(), getQ); ok = r.ok; return r; });
          return ok;
        },
        toggleSaved: (qid) => { const s = getState().saved; setState({ saved: s.includes(qid) ? s.filter((x) => x !== qid) : [...s, qid] }); },
        completeLesson: (skill) => apply((s) => {
          const now = Date.now();
          const first = !s.lessonsDone[skill];
          const k = dateKey(now);
          const day = s.activity[k] ?? { ms: 0, questions: 0, correct: 0, xp: 0, lessons: 0 };
          let st: AppState = { ...s, lessonsDone: { ...s.lessonsDone, [skill]: now }, activity: { ...s.activity, [k]: { ...day, lessons: day.lessons + 1, ms: day.ms + (first ? 8 * 60_000 : 0) } } };
          const g = first ? grant(st, XP_REWARD.lesson, now, 'Finished a lesson') : { state: st, events: [] };
          st = g.state;
          const a = post(st, now);
          return { state: a.state, events: [...g.events, ...a.events] };
        }),
        setLessonStars: (skill, stars) => { const cur = getState().lessonStars ?? {}; if ((cur[skill] ?? 0) < stars) setState({ lessonStars: { ...cur, [skill]: stars } }); },
        finishChapter: (id, correct, total) => apply((s) => {
          const now = Date.now();
          const prev = s.chapters?.[id];
          const ok = passed(correct, total);
          const first = ok && !prev?.passedAt;
          const better = !prev || correct / total > prev.best / prev.total;
          const k = dateKey(now);
          const day = s.activity[k] ?? { ms: 0, questions: 0, correct: 0, xp: 0, lessons: 0 };
          let st: AppState = { ...s, chapters: { ...s.chapters, [id]: { ...(better ? { best: correct, total } : { best: prev!.best, total: prev!.total }), at: now, passedAt: prev?.passedAt ?? (ok ? now : undefined) } },
            activity: first ? { ...s.activity, [k]: { ...day, lessons: day.lessons + 1 } } : s.activity };
          const g = first ? grant(st, 50, now, 'Chapter passed') : { state: st, events: [] };
          st = g.state;
          const a = post(st, now);
          return { state: a.state, events: [...g.events, ...a.events] };
        }),
        logTrap: (trapId, qid) => {
          const cur = getState().traps ?? {};
          const t = cur[trapId] ?? { n: 0, last: 0, qids: [] };
          if (t.qids.includes(qid)) return;
          setState({ traps: { ...cur, [trapId]: { n: t.n + 1, last: Date.now(), qids: [...t.qids, qid].slice(-20) } } });
        },
        claimQuest: (id) => {
          let ok = false;
          apply((s) => {
            const now = Date.now(), day = dateKey(now), claimed = s.quests?.[day] ?? [];
            const board = dailyQuests(s, getQ, now);
            const reward = id === CHEST.id ? (board.every((q) => claimed.includes(q.id)) ? CHEST.xp : 0) : board.find((q) => q.id === id && q.done)?.xp ?? 0;
            if (!reward || claimed.includes(id)) return { state: s };
            ok = true;
            const g = grant({ ...s, quests: { [day]: [...claimed, id] } }, reward, now, id === CHEST.id ? 'Daily chest opened' : 'Quest complete');
            const a = post(g.state, now);
            return { state: a.state, events: [...g.events, ...a.events] };
          });
          return ok;
        },
        makePlan: () => setState({ plan: generatePlan(pure(getState()), getQ, Date.now()), planDone: {} }),
        togglePlanTask: (id) => { const d = { ...getState().planDone }; if (d[id]) delete d[id]; else d[id] = Date.now(); setState({ planDone: d }); },
        saveNote: (n) => {
          const now = Date.now();
          const notes = [...getState().notes];
          const i = n.id ? notes.findIndex((x) => x.id === n.id) : -1;
          const id = n.id ?? uid();
          const note: Note = { kind: 'note', createdAt: now, ...(i >= 0 ? notes[i] : {}), ...n, id, updatedAt: now };
          if (i >= 0) notes[i] = note; else notes.unshift(note);
          setState({ notes });
          return id;
        },
        deleteNote: (id) => setState({ notes: getState().notes.filter((n) => n.id !== id) }),
        report: (r) => setState({ reports: [...getState().reports, { ...r, at: Date.now() }] }),
        buy: (itemId) => {
          const s = getState();
          const item = SHOP_ITEM[itemId];
          if (!item || s.pet.owned.includes(itemId) || s.pet.coins < item.price) return false;
          setState({ pet: { ...s.pet, coins: s.pet.coins - item.price, owned: [...s.pet.owned, itemId], equipped: { ...s.pet.equipped, [item.slot]: itemId }, happiness: clamp(s.pet.happiness + 5, 0, 100), lastEvent: { kind: 'shop', at: Date.now(), text: `New ${item.slot}: ${item.name}` } } });
          return true;
        },
        equip: (slot, itemId) => {
          const s = getState();
          if (itemId && !s.pet.owned.includes(itemId)) return;
          const equipped = { ...s.pet.equipped };
          if (itemId) equipped[slot] = itemId; else delete equipped[slot];
          setState({ pet: { ...s.pet, equipped } });
        },
        renamePet: (name) => setState({ pet: { ...getState().pet, name: name.trim().slice(0, 16) || 'Lumi' } }),
        carePet: (kind) => {
          const s = getState();
          const cost = kind === 'treat' ? 5 : 0;
          if (s.pet.coins < cost) return false;
          const gain = kind === 'treat' ? 12 : kind === 'play' ? 6 : 3;
          setState({ pet: { ...s.pet, coins: s.pet.coins - cost, happiness: clamp(s.pet.happiness + gain, 0, 100), lastCare: Date.now() } });
          return true;
        },
        recordDaily: (qid, correct, ms) => apply((s) => {
          const now = Date.now();
          const k = dateKey(now);
          if (s.daily[k]) return { state: s };
          let st: AppState = { ...s, daily: { ...s.daily, [k]: { qid, correct, ms } } };
          const g = grant(st, correct ? XP_REWARD.dailyBonus : 5, now, 'Daily challenge');
          st = g.state;
          const a = post(st, now);
          return { state: a.state, events: [...g.events, ...a.events] };
        }),
        recordArena: (id, r) => {
          const s = getState();
          const prev = s.arena[id];
          const best = !prev || r.score > prev.best;
          setState({ arena: { ...s.arena, [id]: { best: best ? r.score : prev.best, bestAt: best ? Date.now() : prev.bestAt, history: [...(prev?.history ?? []), { ...r, at: Date.now() }].slice(-30) } } });
          return best && !!prev;
        },
        reviewVocab: (word, knew) => apply((s) => {
          const now = Date.now();
          const st: AppState = { ...s, vocabSrs: { ...s.vocabSrs, [word]: schedule(s.vocabSrs[word], knew, knew, now) } };
          return post(st, now);
        }),
        awardXp: (xp, text) => apply((s) => { const now = Date.now(); const g = grant(s, xp, now, text); const a = post(g.state, now); return { state: a.state, events: [...g.events, ...a.events] }; }),
        tutorAppend: (threadId, msg, meta) => {
          const threads = [...getState().tutor];
          let id = threadId;
          let i = id ? threads.findIndex((t) => t.id === id) : -1;
          if (i < 0) { id = uid(); threads.unshift({ id, title: meta?.title ?? msg.text.slice(0, 48), qid: meta?.qid, messages: [], updatedAt: Date.now() }); i = 0; }
          threads[i] = { ...threads[i], messages: [...threads[i].messages, msg].slice(-80), updatedAt: Date.now() };
          setState({ tutor: threads.slice(0, 30) });
          return id!;
        },
        tutorDelete: (id) => setState({ tutor: getState().tutor.filter((t) => t.id !== id) }),

        startMock: (formId, kind) => {
          const seen = new Set(getState().attempts.map((a) => a.qid));
          setState({ activeMock: buildMock(uid(), formId, kind, QUESTIONS, Date.now(), seen, OFFICIAL) });
        },
        mockUpdate: (p) => {
          const m = getState().activeMock;
          if (!m?.cursor) return;
          const cursor = { ...m.cursor };
          const modules = [...m.modules];
          const cur = { ...modules[modules.length - 1] };
          if (p.answer) cur.answers = { ...cur.answers, [p.answer[0]]: p.answer[1] };
          if (p.flag) cur.flagged = cur.flagged.includes(p.flag) ? cur.flagged.filter((x) => x !== p.flag) : [...cur.flagged, p.flag];
          if (p.addMs) cur.perQuestionMs = { ...cur.perQuestionMs, [p.addMs[0]]: (cur.perQuestionMs[p.addMs[0]] ?? 0) + p.addMs[1] };
          if (p.index !== undefined) cursor.index = p.index;
          if (p.msLeft !== undefined) { cursor.msLeft = p.msLeft; cur.msUsed = cur.msAllowed - p.msLeft; }
          if (p.breakMsLeft !== undefined) cursor.breakMsLeft = p.breakMsLeft;
          if (stagesFor(m.kind)[cursor.stage] !== 'break') modules[modules.length - 1] = cur;
          setState({ activeMock: { ...m, modules, cursor, ...(p.addBreak ? { breaks: (m.breaks ?? 0) + 1 } : {}), ...(p.locked !== undefined ? { locked: p.locked } : {}) } });
        },
        mockNext: () => {
          const m = getState().activeMock;
          if (!m) return { finished: true, id: '' };
          const seen = new Set(getState().attempts.map((a) => a.qid));
          const r = advanceMock(m, QUESTIONS, getQ, seen, OFFICIAL);
          if (!r.finished) { setState({ activeMock: r.mock }); return { finished: false, id: m.id }; }
          const now = Date.now();
          const done: MockAttempt = { ...r.mock, completedAt: now };
          const sc = scoreMock(done, getQ);
          if (sc.rw || sc.math) done.scores = { rw: sc.rw ?? { low: 0, mid: 0, high: 0 }, math: sc.math ?? { low: 0, mid: 0, high: 0 }, total: sc.total ?? (sc.rw ?? sc.math)! };
          let st = pure(getState());
          const events: GameEvent[] = [];
          for (const mod of done.modules) for (const qid of mod.qids) {
            const a = applyAttempt(st, { qid, answer: mod.answers[qid] ?? null, ms: mod.perQuestionMs[qid] ?? 0, hints: 0, mode: 'mock', sessionId: done.id }, now, getQ);
            st = a.state;
            events.push(...a.events.filter((e) => e.type === 'achievement' || e.type === 'level' || e.type === 'mastery'));
          }
          st = { ...st, mocks: [...st.mocks, done], activeMock: undefined };
          const g = grant(st, done.kind === 'full' ? XP_REWARD.mockFull : XP_REWARD.mockSection, now, 'Completed a practice test');
          const a = post(g.state, now);
          setState({ ...a.state, activeMock: undefined, events: [...getState().events, ...withKeys([...events, ...g.events, ...a.events])].slice(-3) });
          return { finished: true, id: done.id };
        },
        abandonMock: () => setState({ activeMock: undefined }),
        finishDiagnostic: () => apply((s) => {
          const now = Date.now();
          if (s.profile.diagnosticAt) return { state: s };
          let st: AppState = { ...s, profile: { ...s.profile, diagnosticAt: now } };
          const g = grant(st, XP_REWARD.diagnostic, now, 'Completed the diagnostic');
          st = { ...g.state, plan: generatePlan(g.state, getQ, now), planDone: {} };
          const a = post(st, now);
          return { state: a.state, events: [...g.events, ...a.events] };
        }),
        importState: (s) => setState({ ...initialState(), ...s, version: STATE_VERSION }),
        resetAll: () => setState({ ...initialState(), events: [] }),
        markLevelSeen: (level) => setState({ seenLevel: level }),
      };
    },
    {
      name: STORAGE_KEY,
      version: STATE_VERSION,
      storage: createJSONStorage(() => idbStorage),
      partialize: (s) => pure(s) as unknown as Store,
      merge: (persisted, current) => ({ ...current, ...initialState(), ...(persisted as Partial<AppState>), settings: { ...initialState().settings, ...((persisted as Partial<AppState>)?.settings ?? {}) }, profile: { ...initialState().profile, ...((persisted as Partial<AppState>)?.profile ?? {}) }, pet: { ...initialState().pet, ...((persisted as Partial<AppState>)?.pet ?? {}) } }),
      onRehydrateStorage: () => () => { useStore.setState({ hydrated: true }); },
    },
  ),
);

/** Plain snapshot of the student's data (for export, sharing and cloud sync). */
export const snapshot = (): AppState => pure(useStore.getState());
