import { describe, expect, it } from 'vitest';
import { getQuestion, QUESTIONS, setExtraResolver } from '@/data/questions';
import { generate, MAX_CHAIN } from '@/lib/remix/engine';
import * as RX from '@/lib/remix/store';
import { emptyRemix, type RemixQuestion } from '@/lib/remix/types';
import { remixSummary } from '@/lib/remix/analytics';
import { computeSkillStats } from '@/lib/engine/mastery';
import { sectionStatus } from '@/lib/engine/scoring';
import { overview } from '@/lib/engine/analytics';
import { initialState } from '@/lib/state';
import { evaluateLine, toRadians } from '@/components/Calculators';
import { nearDuplicates } from '@/components/RemixReview';
import type { Attempt } from '@/lib/types';
import { DAY } from '@/lib/util';

const lin = QUESTIONS.find((q) => q.skill === 'lin1')!;
const NOW = 1_800_000_000_000;
function make(n: number, chainId = 'c1', origin = lin): RemixQuestion[] {
  const out: RemixQuestion[] = [];
  for (let i = 0; i < n; i++) {
    const r = generate({ parent: origin, originId: origin.id, chainId, mode: 'number', level: 3, seed: `int-${chainId}-${i}`, now: NOW + i, previous: out.map((q) => `${q.stem}|${(q.choices ?? []).join('|')}|${q.passage ?? ''}`) });
    if (!r.ok) throw new Error(r.reason);
    out.push(r.question);
  }
  return out;
}
const att = (qid: string, correct: boolean, at: number): Attempt => ({ id: `${qid}-${at}`, qid, at, answer: '0', correct, ms: 30000, hints: 0, mode: 'remix', sessionId: 's' });

describe('Remix state', () => {
  it('adds items to a chain and caps the chain length', () => {
    let st = emptyRemix();
    const qs = make(MAX_CHAIN + 1);
    for (const q of qs.slice(0, MAX_CHAIN)) { const r = RX.addItem(st, q, NOW); expect(r.ok).toBe(true); st = r.state; }
    expect(st.chains.c1.steps).toHaveLength(MAX_CHAIN);
    const over = RX.addItem(st, qs[MAX_CHAIN], NOW);
    expect(over.ok).toBe(false);
    expect(over.reason).toMatch(String(MAX_CHAIN));
  });
  it('prunes old unsaved chains but keeps saved chains and anything the student still refers to', () => {
    let st = emptyRemix();
    const keepRef = make(1, 'ref')[0];
    st = RX.addItem(st, keepRef, NOW).state;
    st = RX.setChainSaved(RX.addItem(st, make(1, 'saved')[0], NOW + 1).state, 'saved', true);
    for (let i = 0; i < RX.KEEP_CHAINS + 5; i++) st = RX.addItem(st, make(1, `x${i}`)[0], NOW + 100 + i).state;
    const pruned = RX.prune(st, new Set([keepRef.id]));
    expect(Object.keys(pruned.chains).length).toBeLessThanOrEqual(RX.KEEP_CHAINS + 2);
    expect(pruned.chains.saved).toBeTruthy();
    expect(pruned.items[keepRef.id]).toBeTruthy();
    // every surviving chain step resolves to an item
    for (const c of Object.values(pruned.chains)) for (const s of c.steps) expect(pruned.items[s]).toBeTruthy();
  });
  it('records a reviewer decision without changing the question', () => {
    const q = make(1)[0];
    const st = RX.review(RX.addItem(emptyRemix(), q, NOW).state, q.id, 'rejected', 'distractor B is defensible', ['More than one answer'], NOW);
    expect(st.items[q.id].remix.status).toBe('rejected');
    expect(st.items[q.id].remix.review).toEqual({ at: NOW, note: 'distractor B is defensible', flags: ['More than one answer'] });
    expect(st.items[q.id].stem).toBe(q.stem);
    expect(st.items[q.id].choices).toEqual(q.choices);
  });
  it('survives export and import: valid data round-trips, malformed data is dropped', () => {
    const q = make(1)[0];
    const st = RX.addItem(emptyRemix(), q, NOW).state;
    expect(RX.sanitize(JSON.parse(JSON.stringify(st)))).toEqual(st);
    expect(RX.sanitize(undefined)).toEqual(emptyRemix());
    expect(RX.sanitize({ v: 2, items: {} })).toEqual(emptyRemix());
    const bad = RX.sanitize({ v: 1, items: { 'gx-1': { id: 'gx-1' }, [q.id]: q }, chains: { c1: { id: 'c1', originId: lin.id, steps: ['gx-1', q.id] } } });
    expect(Object.keys(bad.items)).toEqual([q.id]);
    expect(bad.chains.c1.steps).toEqual([q.id]);
  });
  it('deleting a chain keeps items still referenced elsewhere', () => {
    const [a, b] = make(2);
    const st = RX.addItem(RX.addItem(emptyRemix(), a, NOW).state, b, NOW).state;
    const after = RX.deleteChain(st, 'c1', new Set([a.id]));
    expect(after.chains.c1).toBeUndefined();
    expect(Object.keys(after.items)).toEqual([a.id]);
  });
});

describe('Remix and the rest of Stellify', () => {
  const qs = make(4);
  const items = Object.fromEntries(qs.map((q) => [q.id, q]));
  setExtraResolver((id) => items[id]);
  it('generated questions resolve by id like bank questions', () => {
    expect(getQuestion(qs[0].id)).toBe(qs[0]);
    expect(getQuestion(lin.id)).toBe(lin);
    expect(getQuestion('gx-missing')).toBeUndefined();
  });
  it('mastery counts at most one remix per original per day', () => {
    const day = [att(qs[0].id, true, NOW), att(qs[1].id, true, NOW + 1000), att(qs[2].id, true, NOW + 2000)];
    expect(computeSkillStats('lin1', day, getQuestion).n).toBe(1);
    const twoDays = [...day, att(qs[3].id, true, NOW + DAY)];
    expect(computeSkillStats('lin1', twoDays, getQuestion).n).toBe(2);
  });
  it('a rejected remix stops counting toward mastery', () => {
    const rej = { ...qs[0], remix: { ...qs[0].remix, status: 'rejected' as const } };
    expect(computeSkillStats('lin1', [att(rej.id, true, NOW)], (id) => (id === rej.id ? rej : getQuestion(id))).n).toBe(0);
  });
  it('remixes never feed score estimates or bank accuracy', () => {
    const attempts = qs.map((q, i) => att(q.id, true, NOW + i));
    expect(sectionStatus('math', attempts, getQuestion).n).toBe(0);
    expect(overview({ ...initialState(), attempts }, getQuestion).total).toBe(0);
  });
  it('remix analytics count only the student\'s own answers', () => {
    const attempts = [att(lin.id, false, NOW - 5000), att(qs[0].id, true, NOW), att(qs[0].id, false, NOW + 10), att(qs[1].id, false, NOW + 20)];
    const r = remixSummary(attempts, getQuestion);
    expect(r).toMatchObject({ n: 2, correct: 1, pct: 50, originals: 1, afterMiss: { n: 1, fixed: 1 } });
    expect(r.byMode).toEqual([{ mode: 'number', name: 'Number Remix', n: 2, pct: 50 }]);
  });
  it('flags near-duplicate variations of the same original', () => {
    const copy = { ...qs[0], id: 'gx-copy' };
    expect(nearDuplicates([qs[0], copy]).get(qs[0].id)).toEqual(['gx-copy']);
    expect(nearDuplicates([qs[0], qs[1]]).size).toBeLessThanOrEqual(2);
  });
});

describe('Built-in scientific calculator', () => {
  it('evaluates arithmetic, powers, roots and constants', () => {
    expect(evaluateLine('3^2 + sqrt(16)', 0, true).value).toBe(13);
    expect(evaluateLine('2(3+4)', 0, true).value).toBe(14);
    expect(evaluateLine('√16', 0, true).value).toBe(4);
    expect(evaluateLine('ans * 2', 21, true).value).toBe(42);
    expect(evaluateLine('pi', 0, true).value).toBeCloseTo(Math.PI);
  });
  it('works in degrees or radians', () => {
    expect(evaluateLine('sin(30)', 0, true).value).toBeCloseTo(0.5);
    expect(evaluateLine('cos(60) + sin(90)', 0, true).value).toBeCloseTo(1.5);
    expect(evaluateLine('sin(pi/2)', 0, false).value).toBeCloseTo(1);
    expect(toRadians('sin(30+60)')).toBe('sin((pi/180)*(30+60))');
  });
  it('reports errors instead of crashing', () => {
    expect(evaluateLine('1/0', 0, true).error).toBeTruthy();
    expect(evaluateLine('2 +', 0, true).error).toBeTruthy();
    expect(evaluateLine('x + 1', 0, true).error).toMatch(/Unknown/);
  });
});
