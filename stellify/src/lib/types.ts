/**
 * Core domain types. These mirror the Postgres schema in supabase/schema.sql so the
 * local-first store and the optional cloud database stay structurally identical.
 */

export type Section = 'math' | 'rw';
export type Difficulty = 'medium' | 'hard' | 'very-hard' | 'elite';
export type QuestionType = 'mcq' | 'spr';

export type DomainId =
  | 'alg' | 'adv' | 'psda' | 'geo' // Math
  | 'ii' | 'cs' | 'eoi' | 'sec'; // Reading & Writing

export type SkillId =
  | 'lin1' | 'linf' | 'lin2' | 'sys' | 'ineq'
  | 'equiv' | 'nleq' | 'nlf'
  | 'ratio' | 'pct' | 'data1' | 'data2' | 'prob' | 'infer' | 'claims'
  | 'area' | 'lines' | 'trig' | 'circ'
  | 'cid' | 'coet' | 'coeq' | 'inf'
  | 'wic' | 'tsp' | 'ctc'
  | 'tra' | 'syn'
  | 'bnd' | 'fss';

export type Figure =
  | { kind: 'table'; title?: string; headers: string[]; rows: (string | number)[][]; note?: string }
  | { kind: 'bar'; title?: string; xLabel?: string; yLabel?: string; categories: string[]; series: { name: string; values: number[] }[] }
  | { kind: 'line'; title?: string; xLabel?: string; yLabel?: string; x: (string | number)[]; series: { name: string; values: number[] }[] }
  | { kind: 'scatter'; title?: string; xLabel?: string; yLabel?: string; points: [number, number][]; fit?: { m: number; b: number } };

/** Compact authoring format used in src/data/questions/*.ts */
export interface RawQuestion {
  id: string;
  skill: SkillId;
  /** Subskill / granular topic tag, e.g. "Nonessential clauses" */
  sub: string;
  /** M medium · H hard · V very hard · E beyond SAT (deliberately harder than the real test) */
  d: 'M' | 'H' | 'V' | 'E';
  passage?: string;
  /** Bulleted research notes for Rhetorical Synthesis questions */
  notes?: string[];
  figure?: Figure;
  stem: string;
  /** Exactly four choices for multiple choice; omitted for student-produced response */
  choices?: string[];
  /** Index of the correct choice (mcq) or list of accepted answers (spr), e.g. ['7/2', '3.5'] */
  answer: number | string[];
  /** Step-by-step solution */
  steps: string[];
  /**
   * mcq: one rationale per choice, same order as `choices` (the correct one says why it works).
   * spr: common wrong answers, each starting with the wrong value and why it is wrong.
   */
  why: string[];
  concept: string;
  strategy: string;
  trap: string;
  remember: string;
  /** Desmos / calculator approach (math only, where it is genuinely useful) */
  desmos?: string;
  /** Alternate solution method */
  alt?: string;
  /** Estimated solving time in seconds (defaults by section and difficulty) */
  time?: number;
  /** Independent machine verification of the keyed answer (math). Must return true. */
  check?: () => boolean;
}

export interface Question extends Omit<RawQuestion, 'd' | 'time'> {
  section: Section;
  domain: DomainId;
  difficulty: Difficulty;
  type: QuestionType;
  time: number;
  hints: [string, string, string];
  source: string;
  license: string;
  validation: 'validated' | 'unvalidated';
  created: string;
}

export type PracticeMode =
  | 'smart' | 'bank' | 'hard' | 'timed' | 'daily' | 'speed' | 'arena'
  | 'mistakes' | 'review' | 'diagnostic' | 'mock' | 'lesson' | 'tutor' | 'mission';

export interface Attempt {
  id: string;
  qid: string;
  at: number;
  /** choice index as a string for mcq, raw text for spr, null when skipped/abandoned */
  answer: string | null;
  correct: boolean;
  ms: number;
  hints: number;
  mode: PracticeMode;
  sessionId: string;
  abandoned?: boolean;
}

export type ErrorCategory =
  | 'concept' | 'calculation' | 'misread' | 'grammar' | 'inference' | 'time' | 'careless' | 'strategy';

export interface Mistake {
  qid: string;
  firstAt: number;
  lastAt: number;
  /** number of times this question was answered incorrectly */
  count: number;
  answers: (string | null)[];
  lastMs: number;
  category: ErrorCategory;
  categoryBy: 'auto' | 'student';
  status: 'unresolved' | 'resolved';
  resolvedAt?: number;
  /** original question re-answered correctly, without hints, after the last miss */
  redoCorrect: boolean;
  /** other same-skill questions answered correctly after the last miss */
  relatedCorrect: string[];
}

export interface SrsCard {
  due: number; // epoch ms
  interval: number; // days
  ease: number;
  reps: number;
  lapses: number;
}

export interface Profile {
  name?: string;
  currentScore?: number;
  targetScore: number;
  examDate?: string; // yyyy-mm-dd
  dailyMinutes: number;
  strongest?: Section | 'unsure';
  weakest?: Section | 'unsure';
  onboardedAt?: number;
  diagnosticAt?: number;
  restDays: number[]; // 0=Sun … 6=Sat
}

export type PetSlot = 'hat' | 'face' | 'neck' | 'back' | 'habitat' | 'effect';

export interface PetState {
  name: string;
  xp: number;
  coins: number;
  happiness: number; // 0–100
  lastCare: number;
  owned: string[];
  equipped: Partial<Record<PetSlot, string>>;
  lastEvent?: { kind: string; at: number; text: string };
}

export interface DayActivity {
  ms: number;
  questions: number;
  correct: number;
  xp: number;
  lessons: number;
}

export interface PlanTask {
  id: string;
  kind: 'lesson' | 'practice' | 'mistakes' | 'review' | 'timed' | 'mock' | 'mixed' | 'vocab' | 'diagnostic' | 'desmos';
  title: string;
  detail?: string;
  skill?: SkillId;
  section?: Section;
  minutes: number;
  href: string;
  done?: boolean;
}

export interface PlanDay {
  date: string; // yyyy-mm-dd
  week: number;
  phase: string;
  rest: boolean;
  focus: string;
  tasks: PlanTask[];
}

export interface StudyPlan {
  createdAt: number;
  startDate: string;
  days: PlanDay[];
  basis: string;
}

export interface MockModuleResult {
  section: Section;
  module: 1 | 2;
  route?: 'upper' | 'lower';
  qids: string[];
  answers: Record<string, string | null>;
  flagged: string[];
  msUsed: number;
  msAllowed: number;
  perQuestionMs: Record<string, number>;
}

export interface ScoreRange { low: number; high: number; mid: number }

export interface MockAttempt {
  id: string;
  formId: string;
  startedAt: number;
  completedAt?: number;
  modules: MockModuleResult[];
  scores?: { rw: ScoreRange; math: ScoreRange; total: ScoreRange };
  /** in-progress pointer */
  cursor?: { stage: number; index: number; msLeft: number; breakMsLeft?: number };
  kind: 'full' | 'section-rw' | 'section-math';
}

export interface Note {
  id: string;
  title: string;
  body: string;
  topic?: string;
  qid?: string;
  kind: 'note' | 'strategy' | 'formula' | 'lesson';
  createdAt: number;
  updatedAt: number;
}

export interface TutorMessage {
  role: 'student' | 'tutor';
  text: string;
  at: number;
  source?: 'offline' | 'gemini';
  mode?: string;
}

export interface TutorThread {
  id: string;
  title: string;
  qid?: string;
  messages: TutorMessage[];
  updatedAt: number;
}

export interface ArenaRecord {
  best: number;
  bestAt: number;
  history: { score: number; correct: number; total: number; ms: number; at: number }[];
}

export interface QuestionReport {
  qid: string;
  reason: string;
  detail: string;
  at: number;
}

export interface Settings {
  theme: 'dark' | 'light' | 'system';
  reducedMotion: boolean;
  showTimer: boolean;
  aiEnabled: boolean;
  aiConsent: boolean;
  /** optional, student-supplied free Gemini key; stored only on this device */
  geminiKey?: string;
  geminiModel?: string;
  shareIncludeMistakes: boolean;
  /** 'high' keeps medium questions out of smart practice */
  challenge: 'standard' | 'high';
}

export interface AppState {
  version: number;
  profile: Profile;
  attempts: Attempt[];
  mistakes: Record<string, Mistake>;
  srs: Record<string, SrsCard>;
  vocabSrs: Record<string, SrsCard>;
  pet: PetState;
  achievements: Record<string, number>;
  activity: Record<string, DayActivity>;
  lessonsDone: Record<string, number>;
  plan?: StudyPlan;
  planDone: Record<string, number>;
  mocks: MockAttempt[];
  activeMock?: MockAttempt;
  saved: string[];
  notes: Note[];
  reports: QuestionReport[];
  daily: Record<string, { qid: string; correct: boolean; ms: number }>;
  arena: Record<string, ArenaRecord>;
  tutor: TutorThread[];
  settings: Settings;
  seenLevel: number;
}
