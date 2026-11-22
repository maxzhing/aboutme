'use client';
import { create } from 'zustand';
import { CHEST, dailyQuests } from './engine/quests';
import { passed } from './course';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';
import { del, get, set } from 'idb-keyval';
import type { Mark } from './highlight';
import type { AppState, ErrorCategory, MockAttempt, Note, PetSlot, Profile, Question, QuestionReport, Settings, TutorMessage } from './types';
import { initialState, STATE_VERSION } from './state';
import { migrate } from './migrate';
import { emptyPath, keepStars, retentionFrom, scoreSet } from './path/stars';
import { skillStars } from './path/next';
import { engineInput } from './path/input';
import type { PathSetKind, PathSetResult, Section, SkillId } from './types';
import { getQuestion, OFFICIAL, QUESTIONS, setExtraResolver } from '@/data/questions';
import * as RX from './remix/store';
import { emptyRemix, type RemixQuestion, type ReviewStatus } from './remix/types';
import { applyAttempt, grant, resolveMistake, unlockAchievements, type AttemptInput, type GameEvent } from './engine/attempt';
import { generatePlan } from './engine/plan';
import { advanceMock, formName, REAL_SAT, REMIX, scoreMock, stagesFor, startMock as buildMock } from './engine/mock';
import { analyzeTest, planFromTest } from './engine/testPlan';
import { remixForms } from './fullTest/assemble';
import { FULL_FORM, FULL_TESTS } from './fullTest/registry';

/** Full practice tests the student has not completed yet (their questions are saved for those tests). */
const untakenTests = (s: { mocks: MockAttempt[] }) => new Set(FULL_TESTS.map((t) => t.id).filter((id) => !s.mocks.some((m) => m.completedAt && m.formId === FULL_FORM + id)));
import { schedule } from './engine/srs';
import { dailyBackup, safetyBackup } from './backup';
import { XP_REWARD } from './engine/xp';
import { collectionOf, eggOf, rollSpecies, speciesById, totalLessons } from './engine/companions';
import { SHOP_ITEM } from '@/data/shop';
import { SKILLS } from './taxonomy';
import { clamp, dateKey, uid } from './util';

/** IndexedDB first (roomy, offline-friendly); falls back to localStorage, then to memory. */
const mem = new Map<string, string>();
/**
 * True once a save had to fall back to memory (private browsing, storage blocked by the browser or a school policy,
 * or a full disk). Progress then lasts only until the tab closes, so the app says so instead of losing it silently.
 */
let volatile = false;
export const storageIsVolatile = () => volatile;
const markVolatile = () => { if (!volatile) { volatile = true; try { window.dispatchEvent(new Event('stellify:storage-volatile')); } catch { /* no window */ } } };
const idbStorage: StateStorage = {
  getItem: async (k) => {
    try { const v = await get<string>(k); if (v != null) return v; } catch { /* fall through */ }
    try { return localStorage.getItem(k); } catch { return mem.get(k) ?? null; }
  },
  setItem: async (k, v) => {
    try { await set(k, v); return; } catch { /* fall through */ }
    try { localStorage.setItem(k, v); } catch { mem.set(k, v); markVolatile(); }
  },
  removeItem: async (k) => {
    try { await del(k); } catch { /* ignore */ }
    try { localStorage.removeItem(k); } catch { mem.delete(k); }
  },
};

export const STORAGE_KEY = 'stellify-state-v1';
const KEY_SESSION = 'stellify-ai-key';
const sessionKey = (st?: Partial<Settings>) => { if (!st?.keySessionOnly) return {}; try { const k = sessionStorage.getItem(KEY_SESSION); return k ? { geminiKey: k } : {}; } catch { return {}; } };

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
  calcAnswer: (pid: string, correct: boolean) => void;
  calcFinish: (lessonId: string, score: number, total: number) => void;
  setCalcExam: (date: string | undefined, course?: string) => void;
  /** record a finished Calculus BC test attempt */
  calcTest: (examId: string, score: number, total: number) => void;
  /** record a finished guided free-response workout */
  calcFrq: (id: string, firstTry: number, total: number) => void;
  setCalcTeach: (lessonId: string, text: string) => void;
  makePlan: () => void;
  togglePlanTask: (id: string) => void;
  saveNote: (n: Partial<Note> & { title: string; body: string }) => string;
  deleteNote: (id: string) => void;
  report: (r: Omit<QuestionReport, 'at'>) => void;
  buy: (itemId: string) => boolean;
  equip: (slot: PetSlot, itemId: string | undefined) => void;
  renamePet: (name: string) => void;
  /** hatch the current egg if it is ready; returns the new companion's species id */
  hatchEgg: () => string | null;
  /** make another hatched companion the active one */
  setCompanion: (id: string) => void;
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
  /** replaces the study plan with one built from a completed test's results */
  adoptTestPlan: (mockId: string) => void;
  finishDiagnostic: () => void;
  importState: (s: AppState) => void;
  resetAll: () => void;
  markLevelSeen: (level: number) => void;
  /** replaces the highlights of one block of question text (or one page image) */
  setMarks: (key: string, marks: Mark[]) => void;
  /** clears every highlight whose key starts with this prefix */
  clearMarks: (prefix: string) => void;
  reviewFlag: (key: string, note: string | null) => void;
  /** Remix Studio */
  remixNewChain: (originId: string) => string;
  remixAdd: (q: RemixQuestion) => { ok: boolean; reason?: string };
  remixReview: (id: string, status: ReviewStatus, note: string, flags: string[]) => void;
  remixSaveChain: (id: string, saved: boolean) => void;
  remixDeleteChain: (id: string) => void;
  /** Path: keep every star the evidence now supports (never removes one) */
  syncPath: () => void;
  /** Path: record a finished set and update stars and retention checks */
  recordPathSet: (kind: PathSetKind, meta: { section: Section; skill?: SkillId }, rows: { qid: string; correct: boolean; hints: number }[]) => PathSetResult;
  /** Worked Examples: mark a problem family's ladder finished */
  finishWorked: (familyId: string) => void;
  /** Test-day checklist */
  tickTestDay: (id: string, on: boolean) => void;
  setTestDaySchools: (schools: import('./types').SchoolEntry[]) => void;
  /** Predict-First: one prediction and the student's own grade of it */
  addPrediction: (row: import('./types').PredictionRow) => void;
  /** research consent (collection itself is switched off in this build) */
  setResearchConsent: (consent: boolean) => void;
}

export type Store = AppState & Actions;
/** generated questions something still points at (never pruned) */
const remixRefs = (s: AppState) => new Set([...s.saved, ...Object.keys(s.mistakes), ...Object.keys(s.srs)].filter((id) => id.startsWith('gx-')));
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
        finishChapter: (id, correct, total) => { apply((s) => {
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
        }); getState().syncPath(); },
        calcAnswer: (pid, correct) => {
          const c = getState().calc ?? { done: {}, answers: {} };
          const prev = c.answers[pid];
          // the first answer is what counts; later tries are practice
          setState({ calc: { ...c, answers: { ...c.answers, [pid]: { correct: prev ? prev.correct : correct, at: Date.now(), tries: (prev?.tries ?? 0) + 1 } } } });
        },
        calcFinish: (lessonId, score, total) => apply((s) => {
          const now = Date.now();
          const c = s.calc ?? { done: {}, answers: {} };
          const first = !c.done[lessonId];
          const best = c.done[lessonId] && c.done[lessonId].score / c.done[lessonId].total >= score / total ? c.done[lessonId] : { at: now, score, total };
          const k = dateKey(now);
          const day = s.activity[k] ?? { ms: 0, questions: 0, correct: 0, xp: 0, lessons: 0 };
          const st: AppState = { ...s, calc: { ...c, done: { ...c.done, [lessonId]: best } }, activity: first ? { ...s.activity, [k]: { ...day, lessons: day.lessons + 1, ms: day.ms + 25 * 60_000 } } : s.activity };
          const g = first ? grant(st, 60, now, 'AP lesson finished') : { state: st, events: [] };
          return { state: g.state, events: g.events };
        }),
        setCalcExam: (date, course = 'calc') => {
          const c = getState().calc ?? { done: {}, answers: {} };
          if (course === 'calc') setState({ calc: { ...c, examDate: date } });
          else { const dates = { ...(c.examDates ?? {}) }; if (date) dates[course] = date; else delete dates[course]; setState({ calc: { ...c, examDates: dates } }); }
        },
        calcTest: (examId, score, total) => {
          const c = getState().calc ?? { done: {}, answers: {} };
          const tests = { ...(c.tests ?? {}) };
          tests[examId] = [...(tests[examId] ?? []), { at: Date.now(), score, total }];
          setState({ calc: { ...c, tests } });
        },
        calcFrq: (id, firstTry, total) => {
          const c = getState().calc ?? { done: {}, answers: {} };
          const prev = c.frq?.[id];
          const keep = prev && prev.firstTry / prev.total >= firstTry / total ? prev : { at: Date.now(), firstTry, total };
          setState({ calc: { ...c, frq: { ...(c.frq ?? {}), [id]: keep } } });
        },
        setCalcTeach: (lessonId, text) => { const c = getState().calc ?? { done: {}, answers: {} }; setState({ calc: { ...c, teach: { ...(c.teach ?? {}), [lessonId]: text } } }); },
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
        renamePet: (name) => { const p = getState().pet; const n = name.trim().slice(0, 16) || speciesById(p.species)?.name || ''; setState({ pet: { ...p, name: n, collection: collectionOf(p).map((c) => (c.id === p.species ? { ...c, name: n } : c)) } }); },
        hatchEgg: () => {
          const s = getState();
          const e = eggOf(s);
          if (!e?.ready) return null;
          const col = collectionOf(s.pet);
          const sp = rollSpecies(col.map((c) => c.id));
          const first = !s.pet.species;
          const collection = [...col, { id: sp.id, at: Date.now(), name: sp.name }];
          const name = first ? (s.pet.name && s.pet.name !== 'Lumi' ? s.pet.name : sp.name) : s.pet.name;
          setState({ pet: { ...s.pet, species: first ? sp.id : s.pet.species, name, collection: first ? collection.map((c) => (c.id === sp.id ? { ...c, name } : c)) : collection, egg: { xp0: s.pet.xp, lessons0: totalLessons(s), pattern: collection.length % 4 }, happiness: clamp(s.pet.happiness + 10, 0, 100), lastEvent: { kind: 'hatch', at: Date.now(), text: `${sp.name} the ${sp.kind} hatched!` } } });
          return sp.id;
        },
        setCompanion: (id) => {
          const p = getState().pet;
          const col = collectionOf(p);
          const next = col.find((c) => c.id === id);
          if (!next || id === p.species) return;
          const saved = col.map((c) => (c.id === p.species ? { ...c, name: p.name } : c));
          setState({ pet: { ...p, species: id, name: next.name ?? speciesById(id)?.name ?? '', collection: saved } });
        },
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
          setState({ activeMock: buildMock(uid(), formId, kind, QUESTIONS, Date.now(), seen, OFFICIAL, { untakenTests: untakenTests(getState()) }) });
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
          const r = advanceMock(m, QUESTIONS, getQ, seen, OFFICIAL, { untakenTests: untakenTests(getState()) });
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
        adoptTestPlan: (mockId) => {
          const s = getState();
          const m = s.mocks.find((x) => x.id === mockId);
          if (!m) return;
          const report = analyzeTest(m, getQ, m.scores ? { rw: m.scores.rw.mid ? m.scores.rw : null, math: m.scores.math.mid ? m.scores.math : null } : undefined);
          const solved = new Set(s.attempts.filter((a) => a.correct).map((a) => a.qid));
          const untaken = FULL_TESTS.filter((t) => untakenTests(s).has(t.id) && FULL_FORM + t.id !== m.formId);
          const remix = remixForms(OFFICIAL, QUESTIONS).map((f) => REMIX + f.n).find((id) => id !== m.formId && !s.mocks.some((x) => x.formId === id && x.completedAt));
          const next = untaken.length ? { href: '/mocks', title: `Full test: ${untaken[0].name} (official)` }
            : remix ? { href: '/mocks', title: `Full test: ${formName(remix)}` }
            : OFFICIAL.length ? { href: '/mocks', title: `Full test: ${formName(REAL_SAT)}` } : { href: '/mocks', title: 'Full-length mock exam' };
          setState({ plan: planFromTest(report, s.profile, OFFICIAL, solved, next, formName(m.formId), Date.now()), planDone: {} });
        },
        finishDiagnostic: () => apply((s) => {
          const now = Date.now();
          // a retake moves the time forward, so today's plan is rebuilt from the new results (XP only the first time)
          if (s.profile.diagnosticAt) return { state: { ...s, profile: { ...s.profile, diagnosticAt: now } } };
          let st: AppState = { ...s, profile: { ...s.profile, diagnosticAt: now } };
          const g = grant(st, XP_REWARD.diagnostic, now, 'Completed the placement check');
          st = { ...g.state };
          const a = post(st, now);
          return { state: a.state, events: [...g.events, ...a.events] };
        }),
        importState: (raw) => { void safetyBackup(pure(getState()), 'restoring a backup'); const s = migrate(raw, raw?.version ?? 1); setState({ ...initialState(), ...s, remix: RX.sanitize(s.remix), version: STATE_VERSION }); },
        resetAll: () => { void safetyBackup(pure(getState()), 'deleting all data'); setState({ ...initialState(), events: [] }); },
        markLevelSeen: (level) => setState({ seenLevel: level }),
        setMarks: (key, marks) => {
          const all = { ...(getState().highlights ?? {}) };
          if (marks.length) all[key] = { at: Date.now(), marks }; else delete all[key];
          // keep the most recent 600 blocks so storage stays small
          const keys = Object.keys(all);
          if (keys.length > 600) for (const k of keys.sort((a, b) => all[a].at - all[b].at).slice(0, keys.length - 600)) delete all[k];
          setState({ highlights: all });
        },
        reviewFlag: (key, note) => { const r = { ...(getState().qcReviewed ?? {}) }; if (note === null) delete r[key]; else r[key] = { at: Date.now(), note }; setState({ qcReviewed: r }); },
        remixNewChain: (originId) => { const r = RX.newChain(getState().remix ?? emptyRemix(), originId, Date.now()); setState({ remix: RX.prune(r.state, remixRefs(getState())) }); return r.id; },
        remixAdd: (q) => { const r = RX.addItem(getState().remix ?? emptyRemix(), q, Date.now()); if (r.ok) setState({ remix: r.state }); return { ok: r.ok, reason: r.reason }; },
        remixReview: (id, status, note, flags) => setState({ remix: RX.review(getState().remix ?? emptyRemix(), id, status, note, flags, Date.now()) }),
        remixSaveChain: (id, saved) => setState({ remix: RX.setChainSaved(getState().remix ?? emptyRemix(), id, saved) }),
        remixDeleteChain: (id) => setState({ remix: RX.deleteChain(getState().remix ?? emptyRemix(), id, remixRefs(getState())) }),
        syncPath: () => {
          const st = pure(getState()), now = Date.now();
          const input = engineInput(st, now);
          const path = st.path ?? emptyPath();
          const stars = { ...path.stars };
          let changed = false;
          for (const k of SKILLS) {
            const kept = keepStars(stars[k.id], skillStars(input, k.id), now);
            if (JSON.stringify(kept) !== JSON.stringify(stars[k.id] ?? {})) { stars[k.id] = kept; changed = true; }
          }
          if (changed) setState({ path: { ...path, stars } });
        },
        recordPathSet: (kind, meta, rows) => {
          const st = pure(getState()), now = Date.now();
          const path = st.path ?? emptyPath();
          const withSkill = rows.map((r) => ({ ...r, skill: getQ(r.qid)?.skill ?? meta.skill ?? 'lin1' })) as { qid: string; correct: boolean; hints: number; skill: SkillId }[];
          const result = scoreSet(kind, withSkill, { section: meta.section, skill: meta.skill, at: now, previous: path.sets });
          const retained = { ...path.retained };
          if (kind === 'gauntlet') for (const k of retentionFrom(withSkill, path.stars, now)) retained[k] = retained[k] ?? now;
          setState({ path: { ...path, sets: [...path.sets, result].slice(-400), retained } });
          getState().syncPath();
          return result;
        },
        finishWorked: (familyId) => {
          const path = getState().path ?? emptyPath();
          if (!path.worked[familyId]) { setState({ path: { ...path, worked: { ...path.worked, [familyId]: Date.now() } } }); getState().syncPath(); }
        },
        tickTestDay: (id, on) => { const t = { ...(getState().testDay?.ticks ?? {}) }; if (on) t[id] = Date.now(); else delete t[id]; setState({ testDay: { ...(getState().testDay ?? { ticks: {} }), ticks: t } }); },
        setTestDaySchools: (schools) => setState({ testDay: { ...(getState().testDay ?? { ticks: {} }), schools } }),
        addPrediction: (row) => setState({ predictions: [...(getState().predictions ?? []), row].slice(-2000) }),
        setResearchConsent: (consent) => setState({ research: { ...(getState().research ?? { consent: false }), consent, at: Date.now(), sessionId: consent ? (getState().research?.sessionId ?? uid()) : undefined } }),
        clearMarks: (prefix) => setState({ highlights: Object.fromEntries(Object.entries(getState().highlights ?? {}).filter(([k]) => !k.startsWith(prefix))) }),
      };
    },
    {
      name: STORAGE_KEY,
      version: STATE_VERSION,
      // older saved progress is upgraded, never dropped (lib/migrate.ts)
      migrate: (persisted, from) => migrate(persisted, from) as unknown as Store,
      storage: createJSONStorage(() => idbStorage),
      // a key marked session-only lives in sessionStorage (gone when the tab closes), never in the saved state
      partialize: (s) => {
        const p = pure(s);
        if (!p.settings.keySessionOnly) return p as unknown as Store;
        try { if (p.settings.geminiKey) sessionStorage.setItem(KEY_SESSION, p.settings.geminiKey); else sessionStorage.removeItem(KEY_SESSION); } catch { /* unavailable */ }
        return { ...p, settings: { ...p.settings, geminiKey: undefined } } as unknown as Store;
      },
      merge: (persisted, current) => ({ ...current, ...initialState(), ...(persisted as Partial<AppState>), settings: { ...initialState().settings, ...((persisted as Partial<AppState>)?.settings ?? {}), ...sessionKey((persisted as Partial<AppState>)?.settings) }, profile: { ...initialState().profile, ...((persisted as Partial<AppState>)?.profile ?? {}) }, pet: { ...initialState().pet, ...((persisted as Partial<AppState>)?.pet ?? {}) }, remix: RX.sanitize((persisted as Partial<AppState>)?.remix) }),
      onRehydrateStorage: () => () => { useStore.setState({ hydrated: true }); void dailyBackup(pure(useStore.getState())); },
    },
  ),
);

let lastAuto = 0;
let askedPersist = false;
useStore.subscribe((s, prev) => {
  if (!s.hydrated || s.attempts === prev.attempts) return;
  // once there is real progress to lose, ask the browser not to clear this site's storage on its own (Safari can
  // clear it after 7 days without a visit). Browsers decide; most grant it silently or ignore it.
  if (!askedPersist && s.attempts.length >= 10) {
    askedPersist = true;
    try { void navigator.storage?.persisted?.().then((ok) => { if (!ok) void navigator.storage.persist?.(); }).catch(() => {}); } catch { /* unsupported */ }
  }
  const now = Date.now();
  if (now - lastAuto < 120_000) return;
  lastAuto = now;
  void dailyBackup(pure(s), now);
});

/** Plain snapshot of the student's data (for export, sharing and cloud sync). */
export const snapshot = (): AppState => pure(useStore.getState());

// generated Remix Studio questions resolve by id everywhere (review, Mistake Bucket, saved questions, analytics)
setExtraResolver((id) => (id.startsWith('gx-') ? useStore.getState().remix?.items[id] : undefined));
