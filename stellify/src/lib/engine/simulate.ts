import type { MockAttempt, Question, Section } from '../types';
import { rng } from '../util';
import { advanceMock, scoreMock, startMock } from './mock';
import { thetaToScore } from './scoring';

/**
 * A simulation study of the timed tests' routing and scoring, run through the app's real engine
 * (startMock → Module 1 → routing → Module 2 → scoreMock).
 *
 * Simulated students have a known true ability θ, so their true section score (on Stellify's scale,
 * 500 + 100θ) is known. Their answers are generated from a DIFFERENT model than the one the app scores
 * with: every question gets its own randomly perturbed difficulty, discrimination and guessing rate. If
 * routing and scoring only worked when the world matched the app's own assumptions, this would show it.
 *
 * What this can show: whether routing sends students the right way, how far estimates land from the
 * truth, and whether "80% ranges" contain the truth about 80% of the time, under realistic mismatch.
 * What it cannot show: how Stellify's scale lines up with real SAT scores. That needs real students.
 */
const B_LABEL: Record<Question['difficulty'], number> = { medium: 0, hard: 1.1, 'very-hard': 2.2, elite: 3.1 };

export interface TrueItem { a: number; b: number; c: number }
/** The "real world" for one run: per-question parameters that differ from the app's fixed assumptions. */
export function trueItems(bank: Question[], seed: string, spread = 0.45): Map<string, TrueItem> {
  const r = rng(seed);
  const normal = () => { const u = Math.max(1e-9, r()), v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  return new Map(bank.map((q) => [q.id, { b: B_LABEL[q.difficulty] + spread * normal(), a: 0.7 + r(), c: q.type === 'mcq' ? 0.12 + 0.16 * r() : 0.05 * r() }]));
}

const respond = (q: Question, right: boolean): string => (q.type === 'mcq' ? String(right ? q.answer : ((q.answer as number) + 1) % 4) : right ? (q.answer as string[])[0] : '99999');

export interface SimStudent { theta: number; trueScore: number; route: 'upper' | 'lower'; low: number; mid: number; high: number }

/** One simulated student takes one section of a form; returns where routing sent them and the reported range. */
export function simulateSection(formId: string, section: Section, theta: number, bank: Question[], items: Map<string, TrueItem>, r: () => number, id: string): SimStudent | null {
  const getQ = (qid: string) => bank.find((q) => q.id === qid);
  const kind = section === 'rw' ? 'section-rw' : 'section-math';
  let mock: MockAttempt = startMock(id, formId, kind, bank, 0, new Set());
  const answer = (m: MockAttempt) => {
    const mod = m.modules[m.modules.length - 1];
    for (const qid of mod.qids) {
      const q = getQ(qid)!, t = items.get(qid)!;
      const p = t.c + (1 - t.c) / (1 + Math.exp(-t.a * (theta - t.b)));
      mod.answers[qid] = respond(q, r() < p);
    }
  };
  for (let guard = 0; guard < 6; guard++) {
    answer(mock);
    const next = advanceMock(mock, bank, getQ, new Set());
    mock = next.mock;
    if (next.finished) break;
  }
  const sc = scoreMock(mock, getQ)[section];
  if (!sc) return null;
  const route = mock.modules.find((m) => m.module === 2)?.route === 'upper' ? 'upper' : 'lower';
  return { theta, trueScore: thetaToScore(theta), route, ...sc };
}

export interface SimReport {
  formId: string; section: Section; n: number;
  /** share routed to the harder Module 2, by true-score band */
  upperByBand: { band: string; n: number; upper: number }[];
  /** clearly strong students (true ≥ 650) sent to the easier module, and clearly weak ones (≤ 450) sent to the harder one */
  misrouted: { strongLower: number; weakUpper: number };
  rmse: number; bias: number; r: number;
  /** share of students whose true score fell inside the reported 80% range */
  coverage: number; meanWidth: number;
}

export function simulationStudy(formId: string, section: Section, bank: Question[], n = 300, seed = 'stellify-sim-v1'): SimReport {
  const items = trueItems(bank, `${seed}|items`);
  const r = rng(`${seed}|${formId}|${section}`);
  const out: SimStudent[] = [];
  for (let i = 0; i < n; i++) {
    const theta = -2.4 + (5.2 * (i + r())) / n; // spread evenly from about 260 to 780
    const s = simulateSection(formId, section, theta, bank, items, r, `sim-${i}`);
    if (s) out.push(s);
  }
  const bands: [string, number, number][] = [['under 450', 0, 450], ['450–549', 450, 550], ['550–649', 550, 650], ['650+', 650, 9999]];
  const err = out.map((s) => s.mid - s.trueScore);
  const mean = (xs: number[]) => xs.reduce((t, x) => t + x, 0) / xs.length;
  const mt = mean(out.map((s) => s.trueScore)), mm = mean(out.map((s) => s.mid));
  const cov = out.reduce((t, s) => t + (s.trueScore - mt) * (s.mid - mm), 0);
  const vt = out.reduce((t, s) => t + (s.trueScore - mt) ** 2, 0), vm = out.reduce((t, s) => t + (s.mid - mm) ** 2, 0);
  return {
    formId, section, n: out.length,
    upperByBand: bands.map(([band, lo, hi]) => { const xs = out.filter((s) => s.trueScore >= lo && s.trueScore < hi); return { band, n: xs.length, upper: xs.length ? xs.filter((s) => s.route === 'upper').length / xs.length : 0 }; }),
    misrouted: {
      strongLower: out.filter((s) => s.trueScore >= 650 && s.route === 'lower').length / Math.max(1, out.filter((s) => s.trueScore >= 650).length),
      weakUpper: out.filter((s) => s.trueScore <= 450 && s.route === 'upper').length / Math.max(1, out.filter((s) => s.trueScore <= 450).length),
    },
    rmse: Math.sqrt(mean(err.map((e) => e * e))), bias: mean(err), r: cov / Math.sqrt(vt * vm),
    coverage: out.filter((s) => s.trueScore >= s.low && s.trueScore <= s.high).length / out.length,
    meanWidth: mean(out.map((s) => s.high - s.low)),
  };
}
