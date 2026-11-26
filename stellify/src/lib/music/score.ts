import type { Satb } from './theory';

/** Data types for notation shown in lessons (rendered by components/music/Staff). */
export type Tone = 'ok' | 'bad' | 'accent' | 'given' | 'muted';
export type ClefName = 'treble' | 'bass' | 'alto' | 'grand';
export interface StaffEvent {
  /** pitches like "F#4"; empty with rest = true for a rest */
  notes?: string[];
  dur?: 'w' | 'h' | 'q' | '8' | '16';
  dots?: number;
  rest?: boolean;
  /** Roman numeral or other text under the staff (figures like V65 are stacked) */
  label?: string;
  /** small text above the staff */
  above?: string;
  tone?: Tone;
  /** per-note colours, matched by spelling */
  noteTones?: Record<string, Tone>;
  /** beam this note to the next one */
  beam?: boolean;
  /** a bar line after this event */
  bar?: boolean;
  /** four-part chord on a grand staff (stems: S up, A down, T up, B down) */
  satb?: Satb;
  /** force stem direction */
  stem?: 'up' | 'down';
}
export interface StaffSpec { clef: ClefName; fifths?: number; time?: [number, number] | 'C' | 'cut'; events: StaffEvent[]; label: string }
/** something to hear: each step is a note or a chord */
export interface ListenSpec { steps: (string | number | (string | number)[])[]; beats?: number[]; tempo?: number; arpeggiate?: boolean; label?: string }
/** play what a staff shows */
export const listenOf = (s: StaffSpec, tempo = 80): ListenSpec => ({
  steps: s.events.map((e) => (e.rest ? [] : e.satb ? (['B', 'T', 'A', 'S'] as const).map((v) => e.satb![v]).filter((x): x is string => !!x) : e.notes ?? [])),
  beats: s.events.map((e) => { const b = ({ w: 4, h: 2, q: 1, '8': 0.5, '16': 0.25 } as Record<string, number>)[e.dur ?? 'q']; return e.dots ? b * 1.5 : b; }),
  tempo,
});
