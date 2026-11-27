/** Trap tags (the reasoning error behind each wrong choice) for Reading and Writing questions rewritten to the standard. */
import type { TrapCode } from '../distractors';
import { COET_LIT } from './coet-lit';
import { COET_RESEARCH } from './coet-research';

export const STD_TAGS: Record<string, (TrapCode | null)[]> = Object.fromEntries([...COET_RESEARCH, ...COET_LIT].map((q) => [q.id, q.tags]));

/** Subject areas (the College Board's four) for rewritten passages; these replace any earlier hand tag. */
export const STD_GENRES: Record<string, 'literature' | 'history-social' | 'humanities' | 'science'> = {
  // Command of Evidence: Textual, research passages
  'r-coet-01': 'science', 'r-coet-03': 'history-social', 'r-coet-04': 'history-social', 'r-coet-06': 'science',
  'r-coet-07': 'humanities', 'r-coet-08': 'history-social', 'r-coet-10': 'science', 'r-x-coet-01': 'science',
  'r-cb-coet-01': 'science', 'r-cb-coet-02': 'history-social', 'r-cb-coet-04': 'science', 'r-coet-n1': 'history-social',
  'r-coet-n3': 'science', 'r-coet-n5': 'science', 'r-coet-n6': 'history-social', 'r-coet-n8': 'science',
  'r-coet-n10': 'science', 'r-coet-n12': 'history-social', 'r-coet-n14': 'science', 'r-coet-n15': 'history-social',
  'r-coet-n17': 'science', 'r-coet-n18': 'science', 'r-coet-n19': 'humanities', 'r-coet-n20': 'humanities',
  'r-coet-n21': 'history-social', 'r-coet-n22': 'history-social', 'r-coet-n23': 'history-social', 'r-coet-n27': 'history-social',
  // Command of Evidence: Textual, quotation passages
  'r-coet-02': 'humanities', 'r-coet-05': 'literature', 'r-coet-09': 'literature', 'r-br-coet-01': 'literature',
  'r-cb-coet-03': 'history-social', 'r-c-coet-01': 'humanities', 'r-c-coet-02': 'history-social', 'r-coet-n2': 'literature',
  'r-coet-n4': 'literature', 'r-coet-n7': 'literature', 'r-coet-n9': 'literature', 'r-coet-n11': 'literature',
  'r-coet-n13': 'literature', 'r-coet-n16': 'history-social', 'r-coet-n24': 'literature', 'r-coet-n25': 'literature',
  'r-coet-n26': 'literature',
};
