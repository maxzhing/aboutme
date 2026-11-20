import type { RawQuestion } from '@/lib/types';
import { MATH_ALG_1 } from './math-alg-1';
import { MATH_ALG_2 } from './math-alg-2';
import { MATH_ADV_1 } from './math-adv-1';
import { MATH_ADV_2 } from './math-adv-2';
import { MATH_ADV_3 } from './math-adv-3';
import { MATH_PSDA } from './math-psda';
import { MATH_GEO } from './math-geo';
import { RW_II_1 } from './rw-ii-1';
import { RW_II_2 } from './rw-ii-2';
import { RW_CS_1 } from './rw-cs-1';
import { RW_CS_2 } from './rw-cs-2';
import { RW_EOI } from './rw-eoi';
import { RW_BREADTH } from './rw-breadth';
import { RW_SEC_1 } from './rw-sec-1';
import { RW_SEC_2 } from './rw-sec-2';
import { MATH_ELITE } from './math-elite';
import { RW_ELITE } from './rw-elite';
import { RW_PATTERN } from './rw-pattern';
import { MATH_COURSE_1 } from './math-course-1';
import { MATH_COURSE_2 } from './math-course-2';
import { RW_COURSE } from './rw-course';
import { RW_SPEC } from './rw-spec';
import { MATH_NEW_1 } from './math-new-1';
import { MATH_NEW_2 } from './math-new-2';
import { MATH_NEW_3 } from './math-new-3';
import { RW_NEW_1 } from './rw-new-1';
import { MATH_NEW_4 } from './math-new-4';
import { RW_NEW_2 } from './rw-new-2';
import { MATH_NEW_5 } from './math-new-5';
import { RW_NEW_3 } from './rw-new-3';
import { MATH_NEW_6 } from './math-new-6';
import { RW_NEW_4 } from './rw-new-4';
import { MATH_NEW_7 } from './math-new-7';

/** Question batches written after Practice Tests A and B were fixed (newest last). Add each new batch here. */
const NEW_BATCHES: RawQuestion[][] = [MATH_NEW_1, MATH_NEW_2, MATH_NEW_3, RW_NEW_1, MATH_NEW_4, RW_NEW_2, MATH_NEW_5, RW_NEW_3, MATH_NEW_6, RW_NEW_4, MATH_NEW_7];

/** Every authored question. Add new batch files here; nothing else needs to change. */
export const ALL_RAW: RawQuestion[] = [
  ...MATH_ALG_1,
  ...MATH_ALG_2,
  ...MATH_ADV_1,
  ...MATH_ADV_2,
  ...MATH_ADV_3,
  ...MATH_PSDA,
  ...MATH_GEO,
  ...RW_II_1,
  ...RW_II_2,
  ...RW_CS_1,
  ...RW_CS_2,
  ...RW_EOI,
  ...RW_BREADTH,
  ...RW_SEC_1,
  ...RW_SEC_2,
  ...MATH_ELITE,
  ...RW_ELITE,
  ...RW_PATTERN,
  ...MATH_COURSE_1,
  ...MATH_COURSE_2,
  ...RW_COURSE,
  ...RW_SPEC,
  // added from 2026-11-20 on, at the end so existing order (and everything seeded from it) is unchanged
  ...NEW_BATCHES.flat(),
];

/** Questions added after Practice Tests A and B were fixed: those forms leave them out, so retakes stay identical. */
export const ADDED_AFTER_FIXED_FORMS = new Set(NEW_BATCHES.flat().map((q) => q.id));
