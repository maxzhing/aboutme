import type { Figure, SkillId } from '@/lib/types';

/**
 * Optional private question pack. The public build has none. A personal build made with
 * `node scripts/build.mjs --pack private/pack.json` inlines the questions from a file the student
 * owns (see scripts/make-pack.py). Pack questions are official College Board items: they are
 * labelled as such everywhere, used only for the student's own study, and never committed.
 */
export interface PackItem {
  id: string; skill: SkillId; d: 'M' | 'H'; cbDifficulty?: string; passage: string; figure?: Figure; stem: string;
  choices: string[]; answer: number; why: string[]; note?: string;
}
declare const __PACK__: PackItem[] | null | undefined;
export const PACK_RAW: PackItem[] = typeof __PACK__ !== 'undefined' && __PACK__ ? __PACK__ : [];
