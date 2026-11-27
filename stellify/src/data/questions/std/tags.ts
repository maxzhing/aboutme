/** Trap tags (the reasoning error behind each wrong choice) for Reading and Writing questions rewritten to the standard. */
import type { TrapCode } from '../distractors';
import { COET_LIT } from './coet-lit';
import { COET_RESEARCH } from './coet-research';
import { CID_STD } from './cid';
import { INF_STD } from './inf';
import { TSP_STD } from './tsp';
import { CTC_STD } from './ctc';
import { COEQ_STD } from './coeq';
import { WIC_STD } from './wic';

export const STD_TAGS: Record<string, (TrapCode | null)[]> = Object.fromEntries([
  ...[...COET_RESEARCH, ...COET_LIT, ...CID_STD, ...INF_STD, ...COEQ_STD, ...WIC_STD].map((q) => [q.id, q.tags] as const),
  ...[...TSP_STD, ...CTC_STD].filter((p) => p.tags).map((p) => [p.id, p.tags!] as const),
]);

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
  // Central Ideas and Details
  'r-cid-02': 'literature', 'r-cid-05': 'literature', 'r-cid-09': 'literature', 'r-inf-04': 'literature',
  'r-cb-cid-02': 'literature', 'r-cid-n2': 'literature', 'r-cid-n4': 'literature', 'r-cid-n6': 'literature',
  'r-cid-n12': 'literature', 'r-cid-n15': 'literature', 'r-cid-n18': 'literature', 'r-cid-n21': 'literature',
  'r-cid-n25': 'literature', 'r-cid-n26': 'literature', 'r-cid-n27': 'literature', 'r-cid-n28': 'literature',
  'r-cid-01': 'science', 'r-cid-04': 'science', 'r-cid-07': 'science', 'r-cid-10': 'science',
  'r-cb-cid-01': 'science', 'r-cb-cid-03': 'science', 'r-c-cid-01': 'science', 'r-s-cid-02': 'science',
  'r-cid-n1': 'science', 'r-cid-n3': 'science', 'r-cid-n7': 'science', 'r-cid-n8': 'science',
  'r-cid-n10': 'science', 'r-cid-n11': 'science', 'r-cid-n14': 'science', 'r-cid-n16': 'science',
  'r-cid-n17': 'science', 'r-cid-n19': 'science', 'r-cid-n22': 'science', 'r-cid-n23': 'science',
  'r-cid-03': 'history-social', 'r-cid-06': 'history-social', 'r-cid-08': 'history-social', 'r-s-cid-01': 'history-social',
  'r-cid-n5': 'history-social', 'r-cid-n9': 'history-social', 'r-cid-n20': 'history-social', 'r-cid-n24': 'history-social',
  'r-cid-n13': 'humanities',
  // Words in Context and Cross-Text Connections (subject areas the passages no longer signal on their own)
  'r-wic-03': 'humanities', 'r-wic-05': 'literature', 'r-wic-17': 'literature', 'r-wic-n35': 'history-social',
  'r-wic-n44': 'literature', 'r-wic-n45': 'history-social', 'r-wic-n48': 'history-social',
  'r-ctc-n19': 'literature',
  // Inferences
  'r-inf-01': 'science', 'r-inf-07': 'science', 'r-inf-11': 'science', 'r-cb-inf-01': 'science',
  'r-cb-inf-02': 'science', 'r-inf-n3': 'science', 'r-inf-n4': 'science', 'r-inf-n5': 'science',
  'r-inf-n6': 'science', 'r-inf-n7': 'science', 'r-inf-n12': 'science', 'r-inf-n14': 'science',
  'r-inf-n16': 'science', 'r-inf-n18': 'science', 'r-inf-n20': 'science', 'r-inf-n22': 'science',
  'r-inf-n24': 'science', 'r-inf-n26': 'science', 'r-inf-n29': 'science', 'r-inf-n31': 'science',
  'r-inf-n32': 'science', 'r-inf-n33': 'science', 'r-inf-n35': 'science', 'r-inf-n37': 'science',
  'r-inf-n39': 'science', 'r-inf-n41': 'science', 'r-inf-n42': 'science', 'r-inf-n43': 'science',
  'r-inf-n44': 'science', 'r-inf-n47': 'science', 'r-inf-02': 'history-social', 'r-inf-03': 'history-social',
  'r-inf-05': 'history-social', 'r-inf-06': 'history-social', 'r-inf-09': 'history-social', 'r-x-inf-01': 'history-social',
  'r-cb-inf-04': 'history-social', 'r-inf-n1': 'history-social', 'r-inf-n2': 'history-social', 'r-inf-n9': 'history-social',
  'r-inf-n11': 'history-social', 'r-inf-n15': 'history-social', 'r-inf-n17': 'history-social', 'r-inf-n21': 'history-social',
  'r-inf-n23': 'history-social', 'r-inf-n25': 'history-social', 'r-inf-n28': 'history-social', 'r-inf-n30': 'history-social',
  'r-inf-n34': 'history-social', 'r-inf-n36': 'history-social', 'r-inf-n38': 'history-social', 'r-inf-n40': 'history-social',
  'r-inf-n45': 'history-social', 'r-inf-n46': 'history-social', 'r-inf-08': 'humanities', 'r-inf-10': 'humanities',
  'r-x-inf-02': 'humanities', 'r-cb-inf-03': 'humanities', 'r-inf-n8': 'humanities', 'r-inf-n10': 'humanities',
  'r-inf-n13': 'humanities', 'r-inf-n19': 'humanities', 'r-inf-n27': 'humanities',
  // Command of Evidence: Quantitative
  'r-coeq-01': 'science', 'r-coeq-05': 'science', 'r-cb-coeq-01': 'science', 'r-cb-coeq-02': 'science',
  'r-c-coeq-02': 'science', 'r-coeq-n1': 'science', 'r-coeq-n2': 'science', 'r-coeq-n3': 'science',
  'r-coeq-n7': 'science', 'r-coeq-n9': 'science', 'r-coeq-n15': 'science', 'r-coeq-n17': 'science',
  'r-coeq-n20': 'science', 'r-coeq-n23': 'science', 'r-x-coeq-01': 'science', 'r-coeq-n21': 'science',
  'r-coeq-n28': 'science', 'r-coeq-02': 'history-social', 'r-coeq-03': 'history-social', 'r-coeq-04': 'history-social',
  'r-coeq-06': 'history-social', 'r-coeq-07': 'history-social', 'r-coeq-08': 'history-social', 'r-br-coeq-01': 'history-social',
  'r-cb-coeq-03': 'history-social', 'r-c-coeq-01': 'history-social', 'r-coeq-n5': 'history-social', 'r-coeq-n6': 'history-social',
  'r-coeq-n8': 'history-social', 'r-coeq-n10': 'history-social', 'r-coeq-n11': 'history-social', 'r-coeq-n12': 'history-social',
  'r-coeq-n13': 'history-social', 'r-coeq-n14': 'history-social', 'r-coeq-n16': 'history-social', 'r-coeq-n18': 'history-social',
  'r-coeq-n19': 'history-social', 'r-coeq-n22': 'history-social', 'r-coeq-n24': 'history-social', 'r-coeq-n25': 'history-social',
  'r-coeq-n26': 'history-social', 'r-coeq-n27': 'history-social', 'r-coeq-n4': 'humanities',
  // Transitions (passages rebuilt around real subjects, so several changed subject area)
  'r-tra-01': 'science', 'r-tra-02': 'science', 'r-tra-03': 'science', 'r-tra-04': 'science',
  'r-tra-05': 'history-social', 'r-tra-06': 'science', 'r-tra-07': 'science', 'r-tra-08': 'science',
  'r-tra-09': 'history-social', 'r-tra-10': 'history-social', 'r-tra-11': 'science', 'r-tra-12': 'history-social',
  'r-tra-13': 'science', 'r-tra-14': 'science', 'r-tra-15': 'history-social', 'r-tra-16': 'science',
  'r-br-tra-01': 'literature', 'r-br-tra-02': 'literature', 'r-br-tra-03': 'humanities', 'r-br-tra-04': 'science',
  'r-x-tra-01': 'science', 'r-x-tra-02': 'science', 'r-c-tra-01': 'science', 'r-s-tra-01': 'science',
  'r-s-tra-02': 'science', 'r-s-tra-03': 'science', 'r-s-tra-04': 'science', 'r-s-tra-05': 'humanities',
  'r-s-tra-06': 'science', 'r-tra-n3': 'science', 'r-tra-n4': 'science', 'r-tra-n5': 'science',
  'r-tra-n6': 'history-social', 'r-tra-n7': 'science', 'r-tra-n8': 'science', 'r-tra-n9': 'science',
  'r-tra-n10': 'history-social', 'r-tra-n11': 'science', 'r-tra-n12': 'science', 'r-tra-n13': 'science',
  'r-tra-n14': 'history-social', 'r-tra-n15': 'history-social', 'r-tra-n16': 'science', 'r-tra-n17': 'science',
  'r-tra-n18': 'science', 'r-tra-n19': 'science', 'r-tra-n20': 'science', 'r-tra-n21': 'science',
  'r-tra-n22': 'science', 'r-tra-n23': 'science', 'r-tra-n24': 'science', 'r-tra-n25': 'science',
  'r-tra-n26': 'science', 'r-tra-n27': 'science', 'r-tra-n28': 'history-social', 'r-tra-n29': 'history-social',
  'r-tra-n30': 'science', 'r-tra-n31': 'science', 'r-tra-n32': 'science', 'r-tra-n33': 'science',
  'r-tra-n34': 'science', 'r-tra-n35': 'science', 'r-tra-n36': 'science', 'r-tra-n37': 'science',
  'r-tra-n38': 'science', 'r-tra-n39': 'science', 'r-tra-n40': 'humanities', 'r-tra-n41': 'history-social',
  'r-tra-n42': 'science', 'r-tra-n43': 'science', 'r-tra-n44': 'science', 'r-tra-n45': 'history-social',
  'r-tra-n46': 'history-social', 'r-tra-n47': 'science', 'r-tra-n48': 'science', 'r-tra-n49': 'science',
  'r-tra-n50': 'science', 'r-tra-n51': 'history-social',
};
