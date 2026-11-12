import type { RawQuestion } from '@/lib/types';
import { MATH_ALG_1 } from './math-alg-1';
import { MATH_ALG_2 } from './math-alg-2';
import { MATH_ADV_1 } from './math-adv-1';

/** Every authored question. Add new batch files here; nothing else needs to change. */
export const ALL_RAW: RawQuestion[] = [
  ...MATH_ALG_1,
  ...MATH_ALG_2,
  ...MATH_ADV_1,
];
