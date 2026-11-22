import type { SkillId } from '@/lib/types';
import type { Tone } from '@/data/visual-lessons';

/**
 * Video lessons are short narrated, animated explainers played in the browser: each sentence of narration is one
 * "beat", and each beat reveals the next piece of the picture. They are not recorded video files, so they cost a few
 * kilobytes instead of megabytes, work offline and keep the single-file app small.
 *
 * Narration (`say`) is plain spoken English: it is read aloud by the browser's voice and shown as captions, so it
 * holds no LaTeX. Math lives in the pictures, where `$...$` is typeset.
 */
export type Pt = [number, number];
export type PlotItem = { at?: number; tone?: Tone } & (
  | { t: 'fn'; f: (x: number) => number; dash?: boolean; label?: string; from?: number; to?: number }
  | { t: 'pt'; x: number; y: number; label?: string }
  | { t: 'seg'; a: Pt; b: Pt; dash?: boolean; label?: string }
  | { t: 'poly'; pts: Pt[]; fill?: boolean }
  | { t: 'circle'; c: Pt; r: number; fill?: boolean }
  | { t: 'shade'; f: (x: number) => number; side: 'above' | 'below' }
  | { t: 'text'; x: number; y: number; s: string; size?: number }
  | { t: 'bar'; x: number; h: number; w?: number; label?: string }
  | { t: 'arc'; c: Pt; r: number; from: number; to: number; label?: string }
);

export type Scene =
  /** A big headline card: the hook or a section break. */
  | { k: 'title'; title: string; sub?: string; say: string[] }
  /** Lines of work, one per beat; `note` explains the move. */
  | { k: 'lines'; head?: string; rows: [string, string?][]; say: string[] }
  /** A passage with marked parts: `{{text|tone|label}}`; the n-th mark lights up on beat n + 1. */
  | { k: 'passage'; head?: string; text: string; say: string[] }
  /** A question: beat 0 reads it, each later beat crosses out `cross[i]`, the beat after the last reveals the answer. */
  | { k: 'choices'; stem: string; passage?: string; choices: string[]; answer: number; cross: number[]; notes: string[]; say: string[] }
  /** A coordinate picture; each item appears on beat `at` (default 0). `axes: false` for geometry. */
  | { k: 'plot'; head?: string; win: [number, number, number, number]; axes?: boolean; square?: boolean; items: PlotItem[]; caption?: string[]; say: string[] }
  /** A table; `lit[b]` lists the [row, column] cells lit on beat b, and `note[b]` is shown under it. */
  | { k: 'table'; head?: string; headers: string[]; rows: (string | number)[][]; lit: [number, number][][]; note?: string[]; say: string[] }
  /** Tiles, one per beat. */
  | { k: 'tiles'; head?: string; items: [string, string][]; say: string[] }
  /** The trap next to the fix: beat 0 shows the trap, beat 1 the fix. */
  | { k: 'versus'; head?: string; bad: string; good: string; badLabel?: string; goodLabel?: string; say: string[] }
  /** Pause and try: the video stops until the student answers. */
  | { k: 'quiz'; q: string; passage?: string; choices: string[]; answer: number; why: string; say: string[]
      /** spoken in the rendered video after a short countdown: the answer and why, in plain words */
      reveal: string }
  /** The takeaways, one per beat. */
  | { k: 'recap'; points: string[]; say: string[] };

export interface Video { skill: SkillId; title: string; hook: string; scenes: Scene[] }

/**
 * The rendered video's timeline: every narration sentence, plus, for each pause-and-try question, a silent countdown
 * (the moment the app pauses the video for the student's answer) and the spoken reveal.
 */
export interface Shot { scene: number; b: number; say: string; phase: 'say' | 'countdown' | 'reveal' }
export const COUNTDOWN_SECONDS = 5;
export const shotsOf = (v: Video): Shot[] => v.scenes.flatMap((s, scene) => [
  ...s.say.map((say, b) => ({ scene, b, say, phase: 'say' as const })),
  ...(s.k === 'quiz' ? [{ scene, b: s.say.length - 1, say: '', phase: 'countdown' as const }, { scene, b: s.say.length - 1, say: s.reveal, phase: 'reveal' as const }] : []),
]);

/** Written by scripts/videos/render.mjs: where each shot starts in the rendered file, in seconds. */
export interface VideoTiming { duration: number; starts: number[] }
