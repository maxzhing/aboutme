import type { RawQuestion } from '@/lib/types';
import { MATH_ALG_1 } from './math-alg-1';
import { MATH_ALG_2 } from './math-alg-2';
import { MATH_ADV_1 } from './math-adv-1';
import { MATH_ADV_2 } from './math-adv-2';
import { MATH_ADV_3 } from './math-adv-3';
import { MATH_PSDA } from './math-psda';
import { MATH_GEO } from './math-geo';

/** Every authored question. Add new batch files here; nothing else needs to change. */
export const ALL_RAW: RawQuestion[] = [
  ...MATH_ALG_1,
  ...MATH_ALG_2,
  ...MATH_ADV_1,
  ...MATH_ADV_2,
  ...MATH_ADV_3,
  ...MATH_PSDA,
  ...MATH_GEO,
];
