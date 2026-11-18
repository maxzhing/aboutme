import type { SkillId } from '../types';
import { shuffle } from '../util';
import type { Candidate, MathSpec, RemixLevel, RemixMode } from './types';

/**
 * Deterministic Math generators. Each family builds ONE mathematical model per question (the values, the
 * relationship, the answer) and derives the stem, the choices, every distractor (each from a named
 * misconception), the worked steps and the three hints from that model. The validator then re-solves the
 * question from its spec, independently of the values computed here.
 */
type R = () => number;
const ri = (r: R, lo: number, hi: number) => lo + Math.floor(r() * (hi - lo + 1));
const nz = (r: R, lo: number, hi: number) => { let v = 0; while (v === 0) v = ri(r, lo, hi); return v; };
const pk = <T,>(r: R, xs: readonly T[]) => xs[Math.floor(r() * xs.length)];
const gcd = (a: number, b: number): number => (b === 0 ? Math.abs(a) : gcd(b, a % b));
const isInt = (v: number) => Math.abs(v - Math.round(v)) < 1e-9;

/** A number as SAT-style math text: integers, simple fractions, else decimals. */
export function fmt(v: number): string {
  if (isInt(v)) return String(Math.round(v));
  for (let d = 2; d <= 24; d++) if (isInt(v * d)) { const n = Math.round(v * d), g = gcd(n, d); return `${n < 0 ? '-' : ''}\\frac{${Math.abs(n) / g}}{${d / g}}`; }
  return String(Math.round(v * 1000) / 1000);
}
const M = (s: string) => `$${s}$`;
/** decimals for money, percents and multipliers (as the SAT writes them) */
export const dec = (v: number) => (isInt(v) ? String(Math.round(v)) : String(Math.round(v * 10000) / 10000));
/** Plain-text parts of explanations must not show raw LaTeX: \frac{a}{b} → a/b, \sqrt{n} → √n, \pi → π. */
export function cleanProse(t: string): string {
  return t.split('$').map((seg, i) => (i % 2 ? seg : seg.replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, '$1/$2').replace(/\\sqrt\{([^{}]+)\}/g, '√$1').replace(/\\pi/g, 'π'))).join('$');
}
/** "3x + 5", "-x - 2", "4y" from coefficient/variable pairs */
function poly(terms: [number, string][]): string {
  let out = '';
  for (const [c, v] of terms) {
    if (c === 0) continue;
    const a = Math.abs(c), body = v && a === 1 ? v : `${fmt(a)}${v}`;
    out += out ? ` ${c < 0 ? '-' : '+'} ${body}` : `${c < 0 ? '-' : ''}${body}`;
  }
  return out || '0';
}
/** the same terms as a machine expression */
const ex = (terms: [number, string][]) => terms.filter(([c]) => c !== 0).map(([c, v]) => `(${c})${v ? `*${v}` : ''}`).join('+') || '0';

interface Opt { v: number; why: string; tex?: string; e?: string }
/** Four numeric choices in ascending order (as the SAT lists them). Null if any two coincide. */
function mcNum(key: Opt, ds: Opt[], unit = '', opts: { ints?: boolean; dec?: boolean } = {}): { choices: string[]; answer: number; why: string[]; choiceExprs: string[] } | null {
  const pool: Opt[] = [];
  // counts of things are whole numbers: a fractional distractor would be implausible, so use nearby slips instead
  const usable: Opt[] = opts.ints ? [...ds.filter((d) => isInt(d.v) && d.v > 0), ...[1, -1, 2, -2].map((k) => ({ v: key.v + k, why: 'A nearby value from an arithmetic slip.' } as Opt)).filter((d) => d.v > 0)] : ds;
  for (const d of usable) if (Number.isFinite(d.v) && !pool.some((p) => Math.abs(p.v - d.v) < 1e-9) && Math.abs(d.v - key.v) > 1e-9) pool.push(opts.dec && !d.tex ? { ...d, tex: dec(d.v), e: dec(d.v) } : d);
  if (opts.dec && !key.tex) key = { ...key, tex: dec(key.v) };
  if (pool.length < 3 || !Number.isFinite(key.v)) return null;
  // a distractor that can only be shown rounded is shown, and checked, at its rounded value
  const shown = pool.map((d) => (d.e || d.tex || /\\frac|^-?\d+$/.test(fmt(d.v)) ? d : { ...d, v: Number(fmt(d.v)) }));
  if (shown.some((d) => Math.abs(d.v - key.v) < 1e-9) || new Set(shown.slice(0, 3).map((d) => d.v.toFixed(6))).size < 3) return null;
  const all = [key, ...shown.slice(0, 3)].sort((a, b) => a.v - b.v);
  return {
    choices: all.map((o) => `${M(o.tex ?? fmt(o.v))}${unit ? ` ${unit}` : ''}`),
    answer: all.indexOf(key),
    why: all.map((o) => (o === key ? `Correct. ${o.why}` : o.why)),
    choiceExprs: all.map((o) => o.e ?? (/^-?\d+(\.\d+)?$/.test(fmt(o.v)) ? fmt(o.v) : String(o.v))),
  };
}
/** Four text choices in random order. */
function mcText(r: R, key: { t: string; why: string }, ds: { t: string; why: string }[]) {
  const all = shuffle([key, ...ds.slice(0, 3)], r);
  return { choices: all.map((o) => o.t), answer: all.indexOf(key), why: all.map((o) => (o === key ? `Correct. ${o.why}` : o.why)), order: all };
}

type Base = Pick<Candidate, 'skill' | 'level' | 'mode' | 'family'>;
function out(b: Base, o: Omit<Candidate, keyof Base | 'remember' | 'strategy'> & { remember?: string; strategy?: string }): Candidate {
  const c = { ...b, remember: o.remember ?? o.concept, strategy: o.strategy ?? o.hints[1], ...o };
  return { ...c, why: c.why.map(cleanProse), steps: c.steps.map(cleanProse), hints: c.hints.map(cleanProse) as [string, string, string], concept: cleanProse(c.concept), trap: cleanProse(c.trap), differs: cleanProse(c.differs) };
}
const stepLines = (lines: string[]) => lines.map((l, i) => `Step ${i + 1}: ${M(l)}`).join('\n');
const STEP_CHOICES = ['Step 1', 'Step 2', 'Step 3', 'Step 4'];

// ───────────────────────── linear equations ─────────────────────────
const PLANS = [
  { svc: 'A gym', fee: 'membership fee', unit: 'month', units: 'months', per: 'per month' },
  { svc: 'A bike-rental shop', fee: 'flat fee', unit: 'hour', units: 'hours', per: 'per hour' },
  { svc: 'A taxi company', fee: 'pickup charge', unit: 'mile', units: 'miles', per: 'per mile' },
  { svc: 'A print shop', fee: 'setup fee', unit: 'poster', units: 'posters', per: 'per poster' },
  { svc: 'A music-streaming service', fee: 'one-time activation fee', unit: 'month', units: 'months', per: 'per month' },
  { svc: 'A cloud-storage plan', fee: 'sign-up fee', unit: 'month', units: 'months', per: 'per month' },
] as const;

function linear(r: R, level: RemixLevel, mode: RemixMode, skill: SkillId): Candidate | null {
  const b0: Base = { skill, level, mode, family: 'linear' };
  const big = level >= 4;
  const x0 = nz(r, big ? -12 : 1, big ? 15 : 9), a = ri(r, 2, level >= 3 ? 9 : 6), b = nz(r, -20, 20), c = a * x0 + b;
  const eqTex = `${poly([[a, 'x'], [b, '']])} = ${c}`, eqEx = `${ex([[a, 'x'], [b, '']])}=${c}`;
  const solveSteps = [`Subtract ${fmt(b)} from both sides: ${M(`${poly([[a, 'x']])} = ${fmt(c - b)}`)}.`, `Divide both sides by ${a}: ${M(`x = ${fmt(x0)}`)}.`];
  const hintsSolve: [string, string, string] = [`This is a linear equation: undo the operations on x in reverse order.`, `First remove the constant ${fmt(b)} from the side with x.`, `After that you have ${M(`${a}x = ${fmt(c - b)}`)}; one more operation isolates x.`];
  switch (mode) {
    case 'number': {
      if (level >= 3) { // variables on both sides
        const d = ri(r, 1, a - 1), e = c - d * x0 + ri(r, 0, 0);
        const L = `${poly([[a, 'x'], [b, '']])} = ${poly([[d, 'x'], [e, '']])}`;
        const mc = mcNum({ v: x0, why: `${a - d}x = ${fmt(e - b)}, so x = ${fmt(x0)}.` }, [
          { v: (e - b) / (a + d), why: `Adding ${d}x instead of subtracting it gives ${a + d}x on the left.` },
          { v: (e + b) / (a - d), why: `Moving ${fmt(b)} without changing its sign.` },
          { v: e - b, why: `Forgetting to divide by ${a - d}, the coefficient left on x.` },
          { v: x0 + 1, why: 'An arithmetic slip in the last step.' },
        ]);
        if (!mc) return null;
        return out(b0, { sub: 'Variables on both sides', stem: `What value of ${M('x')} satisfies the equation ${M(L)}?`, ...mc, spec: { t: 'solve', eq: `${ex([[a, 'x'], [b, '']])}=${ex([[d, 'x'], [e, '']])}`, choiceExprs: mc.choiceExprs },
          steps: [`Collect x on one side: subtract ${M(`${d}x`)} from both sides to get ${M(`${poly([[a - d, 'x'], [b, '']])} = ${e}`)}.`, `Subtract ${fmt(b)}: ${M(`${a - d}x = ${fmt(e - b)}`)}.`, `Divide by ${a - d}: ${M(`x = ${fmt(x0)}`)}.`],
          concept: 'Solve a linear equation by collecting the variable terms on one side and the constants on the other.', trap: 'Adding a term instead of subtracting it when moving it across the equals sign.',
          hints: ['Get every x term on one side of the equation first.', `Subtract ${M(`${d}x`)} from both sides.`, `You should reach ${M(`${a - d}x = ${fmt(e - b)}`)}; finish from there.`], differs: 'New numbers, and x now appears on both sides.' });
      }
      const mc = mcNum({ v: x0, why: `${a}x = ${fmt(c - b)}, so x = ${fmt(x0)}.` }, [
        { v: (c + b) / a, why: `Adding ${fmt(b)} instead of subtracting it.` },
        { v: c - b, why: `Stopping at ${a}x = ${fmt(c - b)} without dividing by ${a}.` },
        { v: c / a - b, why: `Dividing by ${a} before removing ${fmt(b)}.` },
        { v: (c - b) * a, why: `Multiplying by ${a} instead of dividing.` },
      ]);
      if (!mc) return null;
      return out(b0, { sub: 'One-variable linear equations', stem: `What value of ${M('x')} satisfies the equation ${M(eqTex)}?`, ...mc, spec: { t: 'solve', eq: eqEx, choiceExprs: mc.choiceExprs }, steps: solveSteps,
        concept: 'Undo addition or subtraction first, then multiplication or division.', trap: 'Dividing before removing the constant, or forgetting to divide at all.', hints: hintsSolve, differs: 'Same kind of equation, new numbers.' });
    }
    case 'context': {
      const p = pk(r, PLANS), n = ri(r, 2, level >= 4 ? 36 : 12), rate = ri(r, 3, level >= 3 ? 45 : 20), fee = ri(r, 2, 12) * 5, total = rate * n + fee;
      const mc = mcNum({ v: n, why: `${rate}n + ${fee} = ${total}, so ${rate}n = ${total - fee} and n = ${n}.` }, [
        { v: total / rate, why: `Ignoring the ${p.fee} and dividing the whole total by ${rate}.` },
        { v: (total + fee) / rate, why: `Adding the ${p.fee} instead of subtracting it.` },
        { v: total - fee, why: `Subtracting the fee but forgetting to divide by the rate.` },
        { v: n + 1, why: 'Counting one extra period.' },
      ], p.units, { ints: true });
      if (!mc) return null;
      return out(b0, { sub: 'Linear equations in context', stem: `${p.svc} charges a ${p.fee} of $${fee} plus $${rate} ${p.per}. A customer was charged a total of $${total}. For how many ${p.units} was the customer charged?`, ...mc,
        spec: { t: 'solve', eq: `${rate}*x+${fee}=${total}`, choiceExprs: mc.choiceExprs },
        steps: [`Let n be the number of ${p.units}: ${M(`${rate}n + ${fee} = ${total}`)}.`, `Subtract the fee: ${M(`${rate}n = ${total - fee}`)}.`, `Divide by ${rate}: ${M(`n = ${n}`)}.`],
        concept: 'A fixed fee plus a constant rate is a linear model: total = rate × count + fee.', trap: 'Forgetting the fixed fee and dividing the whole total by the rate.',
        hints: ['Write one equation: total cost = (rate × number of periods) + fixed fee.', `Take the ${p.fee} away from the total first.`, `What is left, $${total - fee}, comes only from the ${p.per} charge.`], differs: 'The same equation, now hidden inside a real-world pricing plan.' });
    }
    case 'representation': {
      const m = ri(r, 2, 6) * (level >= 4 && r() < 0.5 ? -1 : 1), k = nz(r, -9, 12), xs = [-2, 0, 1, 3].map((v) => v + ri(r, 0, 1)), target = m * x0 + k;
      if (xs.includes(x0)) return null;
      const mc = mcNum({ v: x0, why: `From the table, f(x) = ${poly([[m, 'x'], [k, '']])}; setting it equal to ${target} gives x = ${fmt(x0)}.` }, [
        { v: (target + k) / m, why: 'Using the intercept with the wrong sign.' },
        { v: target / m, why: `Ignoring the starting value f(0) = ${k}.` },
        { v: (target - k) / (m + 1), why: 'Reading the slope one too large from the table.' },
        { v: target, why: 'Giving the output value instead of the input.' },
      ]);
      if (!mc) return null;
      return out(b0, { sub: 'Linear functions from tables', figure: { kind: 'table', title: `Values of the linear function f`, headers: ['x', 'f(x)'], rows: xs.map((x) => [x, m * x + k]) }, figureFns: [`${m}*x+(${k})`],
        stem: `The table shows several values of the linear function ${M('f')}. For what value of ${M('x')} is ${M(`f(x) = ${target}`)}?`, ...mc,
        spec: { t: 'solve', eq: `${m}*x+(${k})=${target}`, choiceExprs: mc.choiceExprs },
        steps: [`The slope is the change in f(x) over the change in x between any two rows: ${m}.`, `Using a row, the y-intercept is ${k}, so ${M(`f(x) = ${poly([[m, 'x'], [k, '']])}`)}.`, `Solve ${M(`${poly([[m, 'x'], [k, '']])} = ${target}`)}: ${M(`x = ${fmt(x0)}`)}.`],
        concept: 'A table of a linear function determines its equation: slope from differences, intercept from any row.', trap: 'Answering with the output value, or forgetting the intercept.',
        hints: ['Find how much f(x) changes when x increases by 1.', 'Use the slope and one row to write f(x) = mx + b.', `Then solve f(x) = ${target} as an equation.`], differs: 'The equation is now hidden in a table of values.' });
    }
    case 'reverse': {
      const eqs = [
        { tex: eqTex, e: eqEx, why: `Substituting x = ${fmt(x0)}: ${a}(${fmt(x0)}) + (${fmt(b)}) = ${c}. True.` },
        { tex: `${poly([[a, 'x'], [-b, '']])} = ${c}`, e: `${ex([[a, 'x'], [-b, '']])}=${c}`, why: `The constant has the wrong sign: x = ${fmt((c + b) / a)}.` },
        { tex: `${poly([[a, 'x'], [b, '']])} = ${c + a}`, e: `${ex([[a, 'x'], [b, '']])}=${c + a}`, why: `Its solution is ${fmt(x0 + 1)}, one more than ${fmt(x0)}.` },
        { tex: `${poly([[a + 1, 'x'], [b, '']])} = ${c}`, e: `${ex([[a + 1, 'x'], [b, '']])}=${c}`, why: `Its solution is ${fmt((c - b) / (a + 1))}.` },
      ];
      const mc = mcText(r, { t: M(eqs[0].tex), why: eqs[0].why }, eqs.slice(1).map((q) => ({ t: M(q.tex), why: q.why })));
      const choiceEqs = mc.order.map((o) => eqs.find((q) => M(q.tex) === o.t)!.e);
      return out(b0, { sub: 'Working backward from a solution', stem: `Which equation has ${M(`x = ${fmt(x0)}`)} as its solution?`, choices: mc.choices, answer: mc.answer, why: mc.why,
        spec: { t: 'pick', choiceEqs, test: { kind: 'root', x: x0 } }, steps: ['A number is a solution if substituting it makes the equation true.', `Substitute x = ${fmt(x0)} into each equation; only one balances.`],
        concept: 'A solution is a value that makes both sides equal; checking by substitution works in every direction.', trap: 'Choosing an equation that merely "looks like" it has the right numbers.',
        hints: ['You do not need to solve every equation from scratch.', `Plug x = ${fmt(x0)} into each choice.`, 'Compare the two sides; the solution makes them exactly equal.'], differs: 'Instead of finding x, you start from x and work backward.' });
    }
    case 'reasoning': {
      // four steps; the first wrong one is chosen at random and every later step follows from it
      const err = ri(r, 1, 4);
      const C1 = err === 1 ? c + b : c - b;                 // step 1: move the constant (error: wrong sign)
      const V2 = err === 2 ? C1 - a : C1 / a;               // step 2: undo the coefficient (error: subtract instead of divide)
      const V3 = err === 3 ? V2 + 1 : V2;                   // step 3: simplify (error: arithmetic slip)
      const V4 = err === 4 ? -V3 : V3;                      // step 4: final answer (error: sign dropped)
      if ((err === 2 && Math.abs(V2 - x0) < 1e-9) || (err === 4 && V3 === 0)) return null;
      const shown = [`${a}x = ${C1}`, err === 2 ? `x = ${C1} - ${a}` : `x = \\frac{${C1}}{${a}}`, `x = ${fmt(V3)}`, `x = ${fmt(V4)}`];
      const lines = [eqEx, `${a}*x=${C1}`, `x=${V2}`, `x=${V3}`, `x=${V4}`];
      return out(b0, { sub: 'Finding an error in a solution', passage: `A student solved ${M(eqTex)} as shown.\n${stepLines(shown)}`,
        stem: 'In which step does the student first make an error?', choices: [...STEP_CHOICES], answer: err - 1,
        why: STEP_CHOICES.map((s, i) => (i === err - 1 ? `Correct. ${['Moving the constant across the equals sign must change its sign.', `To undo multiplication by ${a}, divide by ${a}; do not subtract.`, 'The simplified value does not equal the fraction in Step 2.', 'The final answer changes the sign of the value in Step 3.'][err - 1]}` : i < err - 1 ? `${s} is correct: it keeps the same solution as the original equation.` : `${s} only follows from the earlier mistake.`)),
        spec: { t: 'steps', lines },
        steps: [`Each correct step keeps the same solution, x = ${fmt(x0)}.`, `Check the steps in order; Step ${err} is the first whose solution is no longer ${fmt(x0)}.`],
        concept: 'Every legal step keeps the solution the same. Find the first step that changes it.', trap: 'Blaming a later step that only repeats an earlier mistake.',
        hints: [`First solve ${M(eqTex)} yourself.`, 'Check each step: does it still have your solution?', 'The first step that stops matching is the error.'], differs: 'You judge someone else\'s reasoning instead of solving.' });
    }
    case 'challenge': {
      const k = ri(r, 2, 4), mAdd = nz(r, -9, 9), ask = `${k * a}*x+${k * b}+(${mAdd})`, val = k * c + mAdd;
      const mc = mcNum({ v: val, why: `${poly([[k * a, 'x'], [k * b, '']])} is ${k} times ${poly([[a, 'x'], [b, '']])} = ${c}, so it equals ${k * c}; then ${mAdd < 0 ? 'subtract' : 'add'} ${Math.abs(mAdd)}.` }, [
        { v: x0, why: 'This is the value of x, not of the expression asked for.' },
        { v: k * c, why: `Forgetting the ${fmt(mAdd)} at the end.` },
        { v: c + mAdd, why: `Not multiplying by ${k}.` },
        { v: k * a * x0 + mAdd, why: `Dropping the ${k * b} term.` },
      ]);
      if (!mc) return null;
      return out(b0, { sub: 'Using structure in linear expressions', stem: `If ${M(eqTex)}, what is the value of ${M(poly([[k * a, 'x'], [k * b + mAdd, '']]))}?`, ...mc, spec: { t: 'solve', eq: eqEx, ask, choiceExprs: mc.choiceExprs },
        steps: [`Notice ${M(poly([[k * a, 'x'], [k * b, '']]))} = ${k}(${M(poly([[a, 'x'], [b, '']]))}) = ${k}(${c}) = ${k * c}.`, `So ${M(poly([[k * a, 'x'], [k * b + mAdd, '']]))} = ${k * c} ${mAdd < 0 ? '-' : '+'} ${Math.abs(mAdd)} = ${val}.`],
        concept: 'Look for the given expression inside the one you need; you may not need x at all.', trap: 'Stopping after finding x, or answering with x itself.',
        hints: ['Compare the expression you need with the left side of the equation.', `Is it a multiple of ${M(poly([[a, 'x'], [b, '']]))}?`, `Write it as ${k}(${M(poly([[a, 'x'], [b, '']]))}) plus a constant.`], differs: 'Harder: asks for an expression, rewarding structure over brute force.' });
    }
  }
}

// ───────────────────────── slope and linear functions ─────────────────────────
function slope(r: R, level: RemixLevel, mode: RemixMode, skill: SkillId): Candidate | null {
  const b0: Base = { skill, level, mode, family: 'slope' };
  const m = nz(r, level >= 3 ? -6 : 1, 6), bb = nz(r, -10, 10), x1 = ri(r, -4, 2), x2 = x1 + ri(r, 1, 4), y1 = m * x1 + bb, y2 = m * x2 + bb;
  const lineTex = `y = ${poly([[m, 'x'], [bb, '']])}`;
  switch (mode) {
    case 'number': {
      const mc = mcNum({ v: m, why: `(${y2} - (${y1})) / (${x2} - (${x1})) = ${fmt(y2 - y1)}/${x2 - x1} = ${fmt(m)}.` }, [
        { v: 1 / m, why: 'Run over rise: the differences are upside down.' },
        { v: -m, why: 'Subtracting the coordinates in opposite orders flips the sign.' },
        { v: (y2 + y1) / (x2 + x1 || 1), why: 'Adding the coordinates instead of subtracting them.' },
        { v: y2 - y1, why: 'Using only the change in y.' },
      ]);
      if (!mc) return null;
      return out(b0, { sub: 'Slope from two points', stem: `A line in the ${M('xy')}-plane passes through the points ${M(`(${x1}, ${y1})`)} and ${M(`(${x2}, ${y2})`)}. What is the slope of the line?`, ...mc,
        spec: { t: 'eval', expr: `(${y2}-(${y1}))/(${x2}-(${x1}))`, choiceExprs: mc.choiceExprs }, steps: [`Slope = change in y ÷ change in x = (${y2} − (${y1})) ÷ (${x2} − (${x1})).`, `= ${fmt(y2 - y1)} ÷ ${x2 - x1} = ${fmt(m)}.`],
        concept: 'Slope is rise over run: (y₂ − y₁) / (x₂ − x₁), subtracting in the same order on top and bottom.', trap: 'Putting the x-difference on top, or subtracting in opposite orders.',
        hints: ['Slope measures how much y changes for each 1 unit of x.', 'Find the change in y and the change in x between the two points.', 'Divide the change in y by the change in x, keeping the same order.'], differs: 'New points, same idea.' });
    }
    case 'context': {
      const start = ri(r, 20, 60) * 10, rate = ri(r, 2, 12) * 5 * (r() < 0.5 ? -1 : 1), t1 = ri(r, 1, 3), t2 = t1 + ri(r, 2, 5), v1 = start + rate * t1, v2 = start + rate * t2;
      const ask = r() < 0.5 ? 'rate' : 'start';
      const thing = rate < 0 ? { what: 'A water tank is drained at a constant rate.', q: 'gallons of water in the tank', u: 'gallons' } : { what: 'A savings account grows by the same amount each week.', q: 'dollars in the account', u: 'dollars' };
      const unit = rate < 0 ? 'hours' : 'weeks';
      const key = ask === 'rate' ? rate : start;
      const mc = mcNum({ v: key, why: ask === 'rate' ? `(${v2} − ${v1}) ÷ (${t2} − ${t1}) = ${rate}.` : `The rate is ${rate} per ${unit.slice(0, -1)}; going back ${t1} ${unit} from ${v1} gives ${start}.` }, ask === 'rate' ? [
        { v: -rate, why: 'The sign is backward: is the amount going up or down?' },
        { v: (v2 - v1) / t2, why: `Dividing by ${t2} instead of by the elapsed time ${t2 - t1}.` },
        { v: v2 - v1, why: 'This is the total change, not the change per unit of time.' },
        { v: v1 / t1, why: 'Dividing a single reading by its time ignores the starting amount.' },
      ] : [
        { v: v1, why: `This is the amount after ${t1} ${unit}, not at the start.` },
        { v: v1 + rate * t1, why: 'Moving the wrong way in time.' },
        { v: v2 - v1, why: 'This is the change between readings.' },
        { v: start + rate, why: 'Off by one time step.' },
      ]);
      if (!mc) return null;
      return out(b0, { sub: 'Linear models in context', stem: `${thing.what} After ${t1} ${unit} there are ${v1} ${thing.q}, and after ${t2} ${unit} there are ${v2}. ${ask === 'rate' ? `A negative rate means a decrease. By how many ${thing.u} per ${unit.slice(0, -1)} does the amount change?` : `How many ${thing.q} were there at the start (at time 0)?`}`, ...mc,
        spec: { t: 'eval', expr: ask === 'rate' ? `(${v2}-${v1})/(${t2}-${t1})` : `${v1}-((${v2}-${v1})/(${t2}-${t1}))*${t1}`, choiceExprs: mc.choiceExprs },
        steps: [`Rate = (${v2} − ${v1}) ÷ (${t2} − ${t1}) = ${rate} per ${unit.slice(0, -1)}.`, ...(ask === 'start' ? [`Start = ${v1} − (${rate})(${t1}) = ${start}.`] : [])],
        concept: 'In a linear model, the slope is the constant rate of change and the y-intercept is the starting value.', trap: 'Dividing by the wrong amount of time, or mixing up the start with a later reading.',
        hints: ['Treat the two readings as two points (time, amount).', 'The rate is the change in amount divided by the change in time.', ask === 'rate' ? 'Check the sign: is the amount growing or shrinking?' : 'Walk back from the first reading to time 0 using the rate.'], differs: 'The same slope idea, now a rate in a real situation.' });
    }
    case 'representation': {
      const xs = [0, 1, 2, 3].map((v) => v * ri(r, 1, 2) + x1);
      const choices = [
        { t: M(lineTex), e: `y=${m}*x+(${bb})`, why: 'Every row of the table satisfies it.' },
        { t: M(`y = ${poly([[bb, 'x'], [m, '']])}`), e: `y=${bb}*x+(${m})`, why: 'Slope and intercept are swapped.' },
        { t: M(`y = ${poly([[m, 'x'], [-bb, '']])}`), e: `y=${m}*x+(${-bb})`, why: 'The intercept has the wrong sign.' },
        { t: M(`y = ${poly([[-m, 'x'], [bb, '']])}`), e: `y=${-m}*x+(${bb})`, why: 'The slope has the wrong sign.' },
      ];
      if (bb === m || bb === -m) return null;
      const mc = mcText(r, { t: choices[0].t, why: choices[0].why }, choices.slice(1).map((c) => ({ t: c.t, why: c.why })));
      return out(b0, { sub: 'Equations from tables', figure: { kind: 'table', title: 'Selected points on a line', headers: ['x', 'y'], rows: xs.map((x) => [x, m * x + bb]) }, figureFns: [`${m}*x+(${bb})`],
        stem: 'The table shows several points on a line. Which equation represents the line?', choices: mc.choices, answer: mc.answer, why: mc.why,
        spec: { t: 'pick', choiceEqs: mc.order.map((o) => choices.find((c) => c.t === o.t)!.e), test: { kind: 'points', pts: xs.map((x) => [x, m * x + bb] as [number, number]) } },
        steps: [`Slope: y changes by ${fmt(m * (xs[1] - xs[0]))} when x changes by ${xs[1] - xs[0]}, so m = ${fmt(m)}.`, `Intercept: ${xs[0]} → ${m * xs[0] + bb}, so b = ${m * xs[0] + bb} − (${fmt(m)})(${xs[0]}) = ${bb}.`],
        concept: 'A table of a line gives its slope (from differences) and intercept (from any point).', trap: 'Swapping the roles of slope and intercept.',
        hints: ['Use two rows to find the slope.', 'Then use one row to solve for the intercept.', 'Check your equation against a third row.'], differs: 'The line is given as a table instead of two points.' });
    }
    case 'reverse': {
      const mc = mcNum({ v: bb, why: `${y1} = ${fmt(m)}(${x1}) + b, so b = ${bb}.` }, [
        { v: y1 + m * x1, why: 'Adding m·x instead of subtracting it.' },
        { v: m * x1 - y1, why: 'Subtracting in the wrong order.' },
        { v: y1, why: 'The y-coordinate of the point is not the intercept unless x = 0.' },
        { v: bb + m, why: 'Off by one slope step.' },
      ]);
      if (!mc || x1 === 0) return null;
      return out(b0, { sub: 'Finding the intercept', stem: `A line has slope ${M(fmt(m))} and passes through the point ${M(`(${x1}, ${y1})`)}. What is the ${M('y')}-intercept of the line?`, ...mc,
        spec: { t: 'eval', expr: `${y1}-(${m})*(${x1})`, choiceExprs: mc.choiceExprs }, steps: [`Use y = mx + b with the point: ${y1} = ${fmt(m)}(${x1}) + b.`, `b = ${y1} − (${fmt(m * x1)}) = ${bb}.`],
        concept: 'Knowing a slope and one point determines the whole line.', trap: 'Using the point\'s y-value as the intercept.',
        hints: ['Write y = mx + b with the known slope.', 'Substitute the point for x and y.', 'Solve the result for b.'], differs: 'You build the line backward from its slope and a point.' });
    }
    case 'reasoning': {
      const wrong = r() < 0.5;
      const shift = (name: string, v: number) => (v === 0 ? name : `${name} ${v < 0 ? '+' : '-'} ${Math.abs(v)}`);
      const s2 = wrong ? `y = ${poly([[m, 'x'], [bb + m, '']])}` : `${shift('y', y1)} = ${fmt(m)}(${shift('x', x1)})`;
      const eqs = [`y=${m}*x+(${bb})`, wrong ? `y=${m}*x+(${bb + m})` : `y-(${y1})=${m}*(x-(${x1}))`];
      const options = [[0, 1], [0], [1], []];
      const labels = ['Both students are correct.', 'Only Student A is correct.', 'Only Student B is correct.', 'Neither student is correct.'];
      const correct = wrong ? 1 : 0;
      return out(b0, { sub: 'Comparing solution methods', passage: `Two students wrote an equation for the line through ${M(`(${x1}, ${y1})`)} and ${M(`(${x2}, ${y2})`)}.\nStudent A: ${M(lineTex)}\nStudent B: ${M(s2)}`,
        stem: 'Which statement about the two equations is true?', choices: labels, answer: correct,
        why: labels.map((_, i) => (i === correct ? `Correct. ${wrong ? `Student B's line misses the points: substituting x = ${x1} gives ${y1 + m}, not ${y1}.` : 'Both equations describe the same line; point-slope and slope-intercept forms are equivalent.'}` : `False. Student A's equation works for both points, and Student B's ${wrong ? 'does not' : 'does too'}.`)),
        spec: { t: 'pickset', eqs, pts: [[x1, y1], [x2, y2]], options },
        steps: ['Substitute both points into each equation.', wrong ? 'Student A\'s equation works for both points; Student B\'s does not.' : 'Both equations work for both points, so both are correct.'],
        concept: 'Equations in different forms can describe the same line; test them with the points.', trap: 'Deciding an equation is wrong just because it is in a different form.',
        hints: ['Do not judge by appearance; test each equation.', 'Plug in both given points.', 'An equation is correct only if both points satisfy it.'], differs: 'You judge two methods instead of computing one.' });
    }
    case 'challenge': {
      const mm = pk(r, [1, -1, 2, -2, 3, -3, 1 / 2, -1 / 2] as const), mp = -1 / mm, px = (Math.abs(mm) >= 1 ? Math.abs(mm) : 1) * nz(r, -3, 3), py = ri(r, -6, 8), bk = py - mp * px;
      const mc = mcNum({ v: bk, why: `Perpendicular slope is ${fmt(mp)}; ${py} = ${fmt(mp)}(${px}) + b gives b = ${fmt(bk)}.` }, [
        { v: py - mm * px, why: 'Using the same slope (that line would be parallel, not perpendicular).' },
        { v: py + mp * px, why: 'Adding instead of subtracting when solving for b.' },
        { v: py + mm * px, why: 'Using the negative slope without taking the reciprocal.' },
        { v: py, why: 'This is the y-value of the point, not the intercept.' },
      ]);
      if (!mc) return null;
      return out(b0, { sub: 'Perpendicular lines', stem: `Line ${M('k')} is perpendicular to the line ${M(`y = ${poly([[mm, 'x'], [bb, '']])}`)} and passes through ${M(`(${px}, ${py})`)}. What is the ${M('y')}-intercept of line ${M('k')}?`, ...mc,
        spec: { t: 'eval', expr: `${py}-(${-1}/(${mm}))*(${px})`, choiceExprs: mc.choiceExprs },
        steps: [`Perpendicular slopes are negative reciprocals: ${fmt(mm)} → ${fmt(mp)}.`, `${py} = ${fmt(mp)}(${px}) + b, so b = ${fmt(bk)}.`],
        concept: 'Perpendicular lines have slopes whose product is −1.', trap: 'Changing only the sign, or only taking the reciprocal.',
        hints: ['What is the slope of a line perpendicular to this one?', 'Negate it AND take the reciprocal.', 'Use the new slope with the point to find b.'], differs: 'Harder: two linked steps (perpendicular slope, then the intercept).' });
    }
  }
}

// ───────────────────────── systems ─────────────────────────
function system(r: R, level: RemixLevel, mode: RemixMode, skill: SkillId): Candidate | null {
  const b0: Base = { skill, level, mode, family: 'system' };
  const x0 = nz(r, -6, 9), y0 = nz(r, -6, 9), a = nz(r, 1, 5), b = nz(r, -5, 5), d = nz(r, 1, 6), e = nz(r, -6, 6);
  if (a * e - b * d === 0 || a === b || x0 === y0) return null;
  const c = a * x0 + b * y0, f = d * x0 + e * y0;
  const E1 = `${poly([[a, 'x'], [b, 'y']])} = ${c}`, E2 = `${poly([[d, 'x'], [e, 'y']])} = ${f}`;
  const e1 = `${a}*x+(${b})*y=${c}`, e2 = `${d}*x+(${e})*y=${f}`;
  const sysHints: [string, string, string] = ['Use elimination or substitution to get one equation in one variable.', 'Multiply one equation so a variable cancels when you add or subtract.', 'Solve for one variable, then substitute back.'];
  switch (mode) {
    case 'number': case 'challenge': {
      const ask = mode === 'challenge' ? 'x+y' : pk(r, ['x', 'y'] as const), val = ask === 'x' ? x0 : ask === 'y' ? y0 : x0 + y0;
      const mc = mcNum({ v: val, why: `The solution is (${x0}, ${y0}).` }, [
        { v: ask === 'x' ? y0 : x0, why: 'This is the value of the other variable.' },
        { v: ask === 'x+y' ? x0 - y0 : -val, why: ask === 'x+y' ? 'This is x − y.' : 'Sign error during elimination.' },
        { v: val + 1, why: 'Arithmetic slip when substituting back.' },
        { v: ask === 'x+y' ? x0 * y0 : val + 2, why: ask === 'x+y' ? 'This is xy.' : 'Arithmetic slip.' },
      ]);
      if (!mc) return null;
      const lvl5 = mode === 'challenge' && level >= 4;
      return out(b0, { sub: lvl5 ? 'Systems: a combined quantity' : 'Solving systems of linear equations', stem: `${M(E1)}\n${M(E2)}\nIf ${M('(x, y)')} is the solution to the system of equations above, what is the value of ${M(ask)}?`, ...mc,
        spec: { t: 'system', eqs: [e1, e2], ask, choiceExprs: mc.choiceExprs }, steps: ['Eliminate one variable by combining multiples of the equations.', `The solution is x = ${x0}, y = ${y0}${ask === 'x+y' ? `, so x + y = ${x0 + y0}` : ''}.`],
        concept: 'A system of two linear equations is solved by eliminating one variable.', trap: 'Reporting the other variable, or making a sign error while eliminating.', hints: sysHints,
        differs: mode === 'challenge' ? 'Harder: you need a combination of the variables, so both must be found accurately.' : 'A new system with new coefficients.' });
    }
    case 'context': {
      const A = ri(r, 8, 16), S = ri(r, 3, A - 2), na = ri(r, 20, 90), ns = ri(r, 20, 90), N = na + ns, T = A * na + S * ns;
      const mc = mcNum({ v: ns, why: `x + y = ${N} and ${A}x + ${S}y = ${T} give x = ${na}, y = ${ns}.` }, [
        { v: na, why: 'This is the number of adult tickets.' },
        { v: Math.round(T / (A + S)), why: 'Dividing the revenue by the sum of the prices does not split the tickets.' },
        { v: N - Math.round(T / A), why: 'Assuming every ticket was an adult ticket.' },
        { v: ns + 1, why: 'Arithmetic slip.' },
      ]);
      if (!mc) return null;
      return out(b0, { sub: 'Systems in context', stem: `A theater sold ${N} tickets for one show. Adult tickets cost $${A} and student tickets cost $${S}, and ticket sales totaled $${T}. How many student tickets were sold?`, ...mc,
        spec: { t: 'system', eqs: [`x+y=${N}`, `${A}*x+${S}*y=${T}`], ask: 'y', choiceExprs: mc.choiceExprs },
        steps: [`Let x be adult tickets and y student tickets: x + y = ${N} and ${A}x + ${S}y = ${T}.`, `Multiply the first by ${A} and subtract: ${A - S}y = ${A * N - T}, so y = ${ns}.`],
        concept: 'Two facts about two unknowns (a count and a total value) make a system.', trap: 'Answering with the other unknown.', hints: ['Name the two unknowns and write one equation for the count and one for the money.', `Multiply the count equation by ${A} to eliminate x.`, 'Solve for y, the student tickets.'], differs: 'The system is hidden in a ticket-sales story.' });
    }
    case 'representation': {
      const m1 = nz(r, -4, 4), m2 = nz(r, -4, 4), xs = ri(r, -3, 6);
      if (m1 === m2) return null;
      const k1 = nz(r, -8, 8), k2 = k1 + (m1 - m2) * xs;
      const rows = [xs - 2, xs - 1, xs + 1, xs + 2];
      const mc = mcNum({ v: xs, why: `f(x) = g(x) when ${poly([[m1, 'x'], [k1, '']])} = ${poly([[m2, 'x'], [k2, '']])}, which is x = ${xs}.` }, [
        { v: m1 * xs + k1, why: 'This is the shared output value, not the input.' },
        { v: xs + 1, why: 'The functions are close here but not equal.' },
        { v: xs - 1, why: 'The functions are close here but not equal.' },
        { v: -xs, why: 'Sign error when solving.' },
      ]);
      if (!mc) return null;
      return out(b0, { sub: 'Systems from tables', figure: { kind: 'table', title: 'Values of the linear functions f and g', headers: ['x', 'f(x)', 'g(x)'], rows: rows.map((x) => [x, m1 * x + k1, m2 * x + k2]) }, figureFns: [`${m1}*x+(${k1})`, `${m2}*x+(${k2})`],
        stem: `The table shows values of the linear functions ${M('f')} and ${M('g')}. For what value of ${M('x')} is ${M('f(x) = g(x)')}?`, ...mc,
        spec: { t: 'solve', eq: `${m1}*x+(${k1})=${m2}*x+(${k2})`, choiceExprs: mc.choiceExprs },
        steps: [`From the table, f changes by ${m1} and g by ${m2} per unit of x.`, `Write both functions and solve f(x) = g(x): x = ${xs}.`],
        concept: 'Where two functions are equal is the solution of a system; the x value may not be listed in the table.', trap: 'Picking a listed x value where the functions are merely close.',
        hints: ['Find each function\'s rate of change from the table.', 'Write both functions as equations.', 'Set them equal and solve.'], differs: 'The two equations are now two columns of a table.' });
    }
    case 'reverse': {
      const opts = [
        { t: `${M(E1)} and ${M(E2)}`, e: `${e1};${e2}`, why: `Both equations are true at (${x0}, ${y0}).` },
        { t: `${M(E1)} and ${M(`${poly([[d, 'x'], [e, 'y']])} = ${f + 1}`)}`, e: `${e1};${d}*x+(${e})*y=${f + 1}`, why: 'The second equation fails at this point.' },
        { t: `${M(`${poly([[a, 'x'], [-b, 'y']])} = ${c}`)} and ${M(E2)}`, e: `${a}*x+(${-b})*y=${c};${e2}`, why: 'The first equation has the wrong sign on y.' },
        { t: `${M(`${poly([[b, 'x'], [a, 'y']])} = ${c}`)} and ${M(E2)}`, e: `${b}*x+(${a})*y=${c};${e2}`, why: 'The coefficients of x and y are swapped.' },
      ];
      const mc = mcText(r, opts[0], opts.slice(1));
      return out(b0, { sub: 'Building a system from its solution', stem: `Which system of equations has ${M(`(${x0}, ${y0})`)} as its only solution?`, choices: mc.order.map((o) => o.t), answer: mc.answer, why: mc.why,
        spec: { t: 'pick', choiceEqs: mc.order.map((o) => opts.find((q) => q.t === o.t)!.e), test: { kind: 'sys', x: x0, y: y0 } },
        steps: ['A point is a solution of a system if it makes every equation true.', `Substitute (${x0}, ${y0}) into each pair; only one pair works.`],
        concept: 'Check a proposed solution by substituting it into every equation.', trap: 'Checking only the first equation.', hints: ['Substitute the point into each equation.', 'A system needs BOTH equations to be true.', 'Eliminate any pair where one equation fails.'], differs: 'You start from the solution and find the system.' });
    }
    case 'reasoning': {
      const p = x0 + (r() < 0.5 ? 0 : 1), q = y0;
      const labels = ['It satisfies both equations, so it is the solution.', 'It satisfies only the first equation, so it is not a solution.', 'It satisfies only the second equation, so it is not a solution.', 'It satisfies neither equation, so it is not a solution.'];
      const sat = [a * p + b * q === c, d * p + e * q === f];
      const correct = sat[0] && sat[1] ? 0 : sat[0] ? 1 : sat[1] ? 2 : 3;
      return out(b0, { sub: 'Judging a proposed solution', passage: `A student claims that ${M(`(${p}, ${q})`)} is the solution to the system\n${M(E1)}\n${M(E2)}`, stem: 'Which statement about the student\'s claim is true?', choices: labels, answer: correct,
        why: labels.map((l, i) => (i === correct ? `Correct. Substituting gives ${a * p + b * q} for the first equation (needs ${c}) and ${d * p + e * q} for the second (needs ${f}).` : 'Substitute the point into each equation and compare.')),
        spec: { t: 'pickset', eqs: [e1, e2], pts: [[p, q]], options: [[0, 1], [0], [1], []] },
        steps: [`First equation: ${a}(${p}) + (${b})(${q}) = ${a * p + b * q}.`, `Second equation: ${d}(${p}) + (${e})(${q}) = ${d * p + e * q}.`],
        concept: 'A solution must satisfy every equation in the system.', trap: 'Accepting a point that satisfies only one equation.', hints: ['Do not solve the system; just test the claim.', 'Substitute the point into each equation.', 'Compare each result with the right side.'], differs: 'You evaluate a claim instead of solving.' });
    }
  }
}

// ───────────────────────── percentages and ratios ─────────────────────────
function percent(r: R, level: RemixLevel, mode: RemixMode, skill: SkillId): Candidate | null {
  const b0: Base = { skill, level, mode, family: 'percent' };
  const p = pk(r, level >= 3 ? [12, 15, 18, 24, 35, 40, 60, 75] : [10, 20, 25, 50]), base = ri(r, 2, 40) * (level >= 3 ? 20 : 10);
  if (skill === 'ratio' && (mode === 'number' || mode === 'context')) {
    const u = ri(r, 2, 9), v = ri(r, 2, 9), k = ri(r, 2, level >= 3 ? 12 : 6);
    if (u === v) return null;
    const ctxs = [{ a: 'cups of flour', b: 'cups of sugar', what: 'A recipe uses' }, { a: 'blue tiles', b: 'white tiles', what: 'A mosaic uses' }, { a: 'liters of water', b: 'liters of juice concentrate', what: 'A drink mix uses' }];
    const cx = pk(r, ctxs);
    const mc = mcNum({ v: v * k, why: `${u * k} is ${k} times ${u}, so the other amount is ${k} × ${v} = ${v * k}.` }, [
      { v: u * k + (v - u), why: 'Adding the difference instead of scaling.' }, { v: (u * k * u) / v, why: 'The ratio is upside down.' }, { v: v * k + v, why: 'Scaling by one too many.' }, { v: u * k, why: 'Repeating the given amount.' }], '', { dec: true });
    if (!mc) return null;
    return out(b0, { sub: 'Proportions', stem: mode === 'number' ? `If ${M(`\\frac{${u}}{${v}} = \\frac{${u * k}}{x}`)}, what is the value of ${M('x')}?` : `${cx.what} ${u} ${cx.a} for every ${v} ${cx.b}. How many ${cx.b} are needed with ${u * k} ${cx.a}?`, ...mc,
      spec: mode === 'number' ? { t: 'solve', eq: `${u}/${v}=${u * k}/x`, choiceExprs: mc.choiceExprs } : { t: 'eval', expr: `${u * k}*${v}/${u}`, choiceExprs: mc.choiceExprs },
      steps: [`The scale factor is ${u * k} ÷ ${u} = ${k}.`, `Multiply the other part by the same factor: ${v} × ${k} = ${v * k}.`],
      concept: 'In a proportion, both parts of a ratio are multiplied by the same factor.', trap: 'Adding the same amount to both parts instead of multiplying.', hints: ['Find the factor that turns the known part into the given amount.', `Divide ${u * k} by ${u}.`, 'Multiply the other part by that factor.'], differs: mode === 'number' ? 'New proportion, same idea.' : 'The proportion is now a real mix.' });
  }
  switch (mode) {
    case 'number': {
      const inc = r() < 0.5, val = base * (1 + (inc ? p : -p) / 100);
      const mc = mcNum({ v: val, why: `${base} × ${dec(1 + (inc ? p : -p) / 100)} = ${dec(val)}.` }, [
        { v: base * p / 100, why: `This is the ${p}% change itself, not the new amount.` }, { v: base * (1 + (inc ? -p : p) / 100), why: `This ${inc ? 'decreases' : 'increases'} instead.` },
        { v: base + (inc ? p : -p), why: `Adding ${p} instead of ${p}%.` }, { v: base * (inc ? p : 100 - p), why: 'Forgetting to divide by 100.' }], '', { dec: true });
      if (!mc) return null;
      return out(b0, { sub: 'Percent change', stem: `What number is ${p}% ${inc ? 'greater' : 'less'} than ${base}?`, ...mc, spec: { t: 'eval', expr: `${base}*(1+(${inc ? p : -p})/100)`, choiceExprs: mc.choiceExprs },
        steps: [`${p}% ${inc ? 'more' : 'less'} means multiplying by ${dec(1 + (inc ? p : -p) / 100)}.`, `${base} × ${dec(1 + (inc ? p : -p) / 100)} = ${dec(val)}.`],
        concept: 'A percent increase of p% multiplies by (1 + p/100); a decrease multiplies by (1 − p/100).', trap: 'Giving the size of the change instead of the new amount.', hints: ['Turn the percent change into a single multiplier.', `${inc ? 'Add' : 'Subtract'} ${p}% to or from 100%.`, `Multiply ${base} by that multiplier.`], differs: 'New numbers for the same percent idea.' });
    }
    case 'context': {
      const price = base + ri(r, 0, 9) * 0 , d = p, sale = price * (1 - d / 100);
      const mc = mcNum({ v: sale, why: `${price} × ${dec(1 - d / 100)} = ${dec(sale)}.` }, [
        { v: price * d / 100, why: 'This is the discount, not the sale price.' }, { v: price - d, why: `Subtracting ${d} dollars instead of ${d}%.` },
        { v: price * (1 + d / 100), why: 'Adding the percent instead of subtracting it.' }, { v: price * (1 - d / 100) - 1, why: 'Arithmetic slip.' }], 'dollars', { dec: true });
      if (!mc) return null;
      return out(b0, { sub: 'Percent in context', stem: `A jacket regularly sells for $${price}. During a sale, its price is reduced by ${d}%. What is the sale price, in dollars?`, ...mc, spec: { t: 'eval', expr: `${price}*(1-${d}/100)`, choiceExprs: mc.choiceExprs },
        steps: [`A ${d}% discount leaves ${100 - d}% of the price.`, `${price} × ${dec((100 - d) / 100)} = ${dec(sale)} dollars.`],
        concept: 'After a p% discount, you pay (100 − p)% of the original price.', trap: 'Reporting the discount amount as the sale price.', hints: ['What percent of the price is left after the discount?', `100% − ${d}%.`, `Take that percent of $${price}.`], differs: 'The percent change is now a store discount.' });
    }
    case 'representation': {
      const names = ['Notebook', 'Backpack', 'Calculator'], befores = names.map(() => ri(r, 2, 20) * 10), pct = names.map(() => pk(r, [10, 20, 25, 30, 40, 50]));
      const i = ri(r, 0, 2), after = befores.map((b, j) => b * (1 + pct[j] / 100));
      const mc = mcNum({ v: pct[i], why: `(${dec(after[i])} − ${befores[i]}) ÷ ${befores[i]} = ${dec(pct[i] / 100)} = ${pct[i]}%.` }, [
        { v: after[i] - befores[i], why: 'This is the dollar change, not the percent.' }, { v: Math.round(((after[i] - befores[i]) / after[i]) * 1000) / 10, why: 'Dividing by the new price instead of the original.' },
        { v: pct[i] + 10, why: 'Arithmetic slip.' }, { v: pct[(i + 1) % 3] === pct[i] ? pct[i] + 5 : pct[(i + 1) % 3], why: 'This is a different item\'s change.' }], '', { dec: true });
      if (!mc) return null;
      return out(b0, { sub: 'Percent change from a table', figure: { kind: 'table', title: 'Prices before and after an increase (dollars)', headers: ['Item', 'Before', 'After'], rows: names.map((n, j) => [n, befores[j], after[j]]) },
        stem: `Based on the table, by what percent did the price of the ${names[i].toLowerCase()} increase?`, ...mc, spec: { t: 'eval', expr: `(${after[i]}-${befores[i]})/${befores[i]}*100`, choiceExprs: mc.choiceExprs },
        steps: [`Change: ${dec(after[i])} − ${befores[i]} = ${dec(after[i] - befores[i])}.`, `Divide by the ORIGINAL price: ${dec(after[i] - befores[i])} ÷ ${befores[i]} = ${pct[i]}%.`],
        concept: 'Percent change = change ÷ original value × 100.', trap: 'Dividing by the new value instead of the original.', hints: ['Find the change in price for that item.', 'Compare the change with the price BEFORE the increase.', 'Turn the result into a percent.'], differs: 'The numbers come from a table, and you find the percent itself.' });
    }
    case 'reverse': {
      const orig = base, now = orig * (1 + p / 100);
      const mc = mcNum({ v: orig, why: `${dec(now)} ÷ ${dec(1 + p / 100)} = ${orig}.` }, [
        { v: now * (1 - p / 100), why: `Taking ${p}% off the new price does not undo a ${p}% increase.` }, { v: now - p, why: `Subtracting ${p} instead of undoing ${p}%.` },
        { v: now / (1 - p / 100), why: 'Dividing by the wrong multiplier.' }, { v: orig + 1, why: 'Arithmetic slip.' }], 'dollars', { dec: true });
      if (!mc) return null;
      return out(b0, { sub: 'Finding the original amount', stem: `After a ${p}% increase, the price of a concert ticket is $${dec(now)}. What was the price, in dollars, before the increase?`, ...mc, spec: { t: 'eval', expr: `${now}/(1+${p}/100)`, choiceExprs: mc.choiceExprs },
        steps: [`New price = original × ${dec(1 + p / 100)}.`, `Original = ${dec(now)} ÷ ${dec(1 + p / 100)} = ${orig}.`],
        concept: 'Undo a percent increase by DIVIDING by its multiplier.', trap: 'Subtracting the same percent from the new amount.', hints: ['Write: new = original × (1 + rate).', 'You know the new amount; the original is the unknown.', `Divide by ${dec(1 + p / 100)}, do not multiply by ${dec(1 - p / 100)}.`], differs: 'You work backward from the result to the original.' });
    }
    case 'reasoning': {
      const q = pk(r, [10, 15, 20, 25].filter((v) => v !== p) as number[]), up = 1 + p / 100, down = 1 - q / 100;
      const opts = [
        { t: M(`${dec(up)}(${dec(down)})x`), e: `y=${up}*${down}*x`, why: `Each change multiplies the current price: ×${dec(up)}, then ×${dec(down)}.` },
        { t: M(`(${dec(up)} - ${dec(q / 100)})x`), e: `y=(${up}-${q / 100})*x`, why: 'Subtracting the second percent from the first multiplier ignores that it applies to the NEW price.' },
        { t: M(`x + ${dec(p / 100)} - ${dec(q / 100)}`), e: `y=x+${p / 100}-${q / 100}`, why: 'Adding decimals to the price itself mixes percents with dollars.' },
        { t: M(`${dec(up + down - 1)}x`), e: `y=${up + down - 1}*x`, why: 'Combining the two changes by adding them is not the same as applying one after the other.' },
      ];
      if (Math.abs(up * down - (up + down - 1)) < 1e-9) return null;
      const mc = mcText(r, opts[0], opts.slice(1));
      return out(b0, { sub: 'Modeling successive percent changes', stem: `A store increases the price of an item by ${p}% and later decreases the new price by ${q}%. If ${M('x')} is the original price, which expression gives the final price?`, choices: mc.order.map((o) => o.t), answer: mc.answer, why: mc.why,
        spec: { t: 'pick', choiceEqs: mc.order.map((o) => opts.find((q2) => q2.t === o.t)!.e), test: { kind: 'points', pts: [[100, 100 * up * down], [40, 40 * up * down]] } },
        steps: [`The increase multiplies by ${dec(up)}.`, `The decrease multiplies that result by ${dec(down)}, so the final price is ${dec(up)}(${dec(down)})x.`],
        concept: 'Successive percent changes multiply; they do not add.', trap: 'Adding or subtracting the percents.', hints: ['Write each change as a multiplier.', 'The second change applies to the already-changed price.', 'Multiply the multipliers.'], differs: 'You choose a model instead of computing a number.' });
    }
    case 'challenge': {
      const q = pk(r, [10, 20, 25]), final = base * (1 + p / 100) * (1 - q / 100);
      const mc = mcNum({ v: base, why: `${dec(final)} ÷ (${dec(1 + p / 100)} × ${dec(1 - q / 100)}) = ${base}.` }, [
        { v: final / (1 + (p - q) / 100), why: 'Combining the two percents into one net change.' }, { v: final * (1 - p / 100) * (1 + q / 100), why: 'Reversing each change by its opposite percent.' },
        { v: final - p + q, why: 'Treating percents as dollar amounts.' }, { v: final, why: 'This is the final amount, not the original.' }], '', { dec: true });
      if (!mc) return null;
      return out(b0, { sub: 'Successive percent changes', stem: `A town's population increased by ${p}% one decade and then decreased by ${q}% the next. At the end, the population was ${dec(final)}. What was the population at the start?`, ...mc,
        spec: { t: 'eval', expr: `${final}/((1+${p}/100)*(1-${q}/100))`, choiceExprs: mc.choiceExprs },
        steps: [`Final = start × ${dec(1 + p / 100)} × ${dec(1 - q / 100)} = start × ${dec((1 + p / 100) * (1 - q / 100))}.`, `Start = ${dec(final)} ÷ ${dec((1 + p / 100) * (1 - q / 100))} = ${base}.`],
        concept: 'Successive changes multiply; undo them by dividing by the product.', trap: 'Netting the percents (+p − q) into one change.', hints: ['Write each change as a multiplier.', 'Multiply them to get the overall factor.', 'Divide the final population by that factor.'], differs: 'Harder: two changes in a row, worked backward.' });
    }
  }
}

// ───────────────────────── quadratics ─────────────────────────
function quadratic(r: R, level: RemixLevel, mode: RemixMode, skill: SkillId): Candidate | null {
  const b0: Base = { skill, level, mode, family: 'quadratic' };
  const p = ri(r, 1, 9), n = -ri(r, 1, 9);   // roots p > 0, n < 0
  if (p === -n) return null;
  const B = -(p + n), C = p * n, qTex = `x^2 ${B < 0 ? '-' : '+'} ${Math.abs(B) === 1 ? '' : Math.abs(B)}x ${C < 0 ? '-' : '+'} ${Math.abs(C)} = 0`.replace(/\+ 0x |- 0x /, '');
  const qEx = `x^2+(${B})*x+(${C})=0`;
  switch (mode) {
    case 'number': {
      const ask = level >= 3 ? 'sum' : 'positive';
      const mc = ask === 'positive'
        ? mcNum({ v: p, why: `x² ${B < 0 ? '−' : '+'} ${Math.abs(B)}x ${C < 0 ? '−' : '+'} ${Math.abs(C)} = (x − ${p})(x + ${-n}), so x = ${p} or x = ${n}.` }, [{ v: -p, why: 'The factor (x − ' + p + ') gives x = +' + p + ', not −' + p + '.' }, { v: n, why: 'This is the negative solution.' }, { v: -n, why: 'Sign error on the negative root.' }, { v: C, why: 'This is the constant term.' }])
        : mcNum({ v: p + n, why: `The solutions are ${p} and ${n}; their sum is ${p + n} (= −b/a).` }, [{ v: -(p + n), why: 'The sum of the roots is −b, not b.' }, { v: C, why: 'This is the product of the roots.' }, { v: p - n, why: 'This is the difference of the roots.' }, { v: p, why: 'This is only one root.' }]);
      if (!mc) return null;
      return out(b0, { sub: 'Solving quadratics by factoring', stem: ask === 'positive' ? `What is the positive solution to ${M(qTex)}?` : `What is the sum of the solutions to ${M(qTex)}?`, ...mc,
        spec: { t: 'solve', eq: qEx, root: ask, choiceExprs: mc.choiceExprs }, steps: [`Find two numbers with product ${C} and sum ${-B}: ${p} and ${n}.`, `(x − ${p})(x + ${-n}) = 0, so x = ${p} or x = ${n}.`],
        concept: 'Factor a quadratic into two binomials; each factor gives a solution.', trap: 'Taking the sign inside the factor as the solution\'s sign.', hints: [`Look for two numbers that multiply to ${C} and add to ${-B}.`, 'Write the quadratic as a product of two binomials.', 'Set each factor equal to zero.'], differs: ask === 'sum' ? 'New quadratic; asks for the sum of the roots.' : 'New quadratic, same factoring idea.' });
    }
    case 'context': {
      const w = ri(r, 3, 14), k = ri(r, 2, 9), A = w * (w + k);
      const mc = mcNum({ v: w, why: `w(w + ${k}) = ${A} gives w = ${w} (the negative root is not a length).` }, [{ v: w + k, why: 'This is the length, not the width.' }, { v: -(w + k), why: 'A width cannot be negative.' }, { v: A / k, why: 'Dividing the area by the difference is not how area works.' }, { v: Math.round(Math.sqrt(A) * 10) / 10, why: 'This would be the side of a square with that area.' }], 'meters');
      if (!mc) return null;
      return out(b0, { sub: 'Quadratics in context', stem: `A rectangular garden is ${k} meters longer than it is wide, and its area is ${A} square meters. What is the width of the garden, in meters?`, ...mc,
        spec: { t: 'solve', eq: `x*(x+${k})=${A}`, root: 'positive', choiceExprs: mc.choiceExprs }, steps: [`w(w + ${k}) = ${A}, so w² + ${k}w − ${A} = 0.`, `(w − ${w})(w + ${w + k}) = 0; the width is ${w} meters.`],
        concept: 'An area condition gives a quadratic; keep only the solution that makes sense.', trap: 'Reporting the length, or keeping a negative length.', hints: ['Write length in terms of width.', 'Area = width × length gives a quadratic.', 'Factor and keep the positive solution.'], differs: 'The quadratic comes from an area problem.' });
    }
    case 'representation': {
      const h = ri(r, -4, 5), kk = ri(r, -9, 9), a = pk(r, [1, 2, -1]), xs = [h - 2, h - 1, h, h + 1, h + 2].map((v) => v + 0);
      const shown = [xs[0], xs[1], xs[3], xs[4]];
      const mc = mcNum({ v: h, why: `The table is symmetric about x = ${h}: f(${h - 1}) = f(${h + 1}) and f(${h - 2}) = f(${h + 2}).` }, [{ v: a * 1 + kk, why: 'This is an output value from the table.' }, { v: h + 1, why: 'The vertex is midway between equal outputs.' }, { v: h - 1, why: 'The vertex is midway between equal outputs.' }, { v: kk, why: 'This is the y-coordinate of the vertex.' }]);
      if (!mc) return null;
      return out(b0, { sub: 'Vertex from symmetry', figure: { kind: 'table', title: 'Values of the quadratic function f', headers: ['x', 'f(x)'], rows: shown.map((x) => [x, a * (x - h) ** 2 + kk]) }, figureFns: [`${a}*(x-(${h}))^2+(${kk})`],
        stem: `The table shows values of a quadratic function ${M('f')}. What is the ${M('x')}-coordinate of the vertex of the graph of ${M('y = f(x)')}?`, ...mc, spec: { t: 'eval', expr: `(${shown[0]}+${shown[3]})/2`, choiceExprs: mc.choiceExprs },
        steps: ['A parabola is symmetric about the vertical line through its vertex.', `Equal outputs at x = ${shown[0]} and x = ${shown[3]} put the axis halfway: x = ${h}.`],
        concept: 'Equal outputs of a quadratic sit symmetrically on either side of the vertex.', trap: 'Reading an output as the x-coordinate.', hints: ['Look for two x-values with the same f(x).', 'The axis of symmetry is halfway between them.', 'The vertex lies on that axis.'], differs: 'The quadratic is given as a table, and the question is about its graph.' });
    }
    case 'reverse': {
      const opts = [
        { t: M(`(x - ${p})(x + ${-n}) = 0`), e: `(x-${p})*(x+${-n})=0`, why: 'Its zeros are exactly the two given values.' },
        { t: M(`(x + ${p})(x - ${-n}) = 0`), e: `(x+${p})*(x-${-n})=0`, why: 'The signs are reversed: its solutions are the opposites.' },
        { t: M(`(x - ${p})(x - ${-n}) = 0`), e: `(x-${p})*(x-${-n})=0`, why: 'One root has the wrong sign.' },
        { t: M(`x^2 = ${p * -n}`), e: `x^2=${p * -n}`, why: 'Its solutions are ±√' + (p * -n) + ', not the given values.' },
      ];
      const mc = mcText(r, opts[0], opts.slice(1));
      return out(b0, { sub: 'Quadratics from their solutions', stem: `Which equation has exactly the solutions ${M(`x = ${p}`)} and ${M(`x = ${n}`)}?`, choices: mc.order.map((o) => o.t), answer: mc.answer, why: mc.why,
        spec: { t: 'pick', choiceEqs: mc.order.map((o) => opts.find((q) => q.t === o.t)!.e), test: { kind: 'roots', xs: [p, n] } },
        steps: ['A solution x = s comes from a factor (x − s).', `So the factors are (x − ${p}) and (x − (${n})) = (x + ${-n}).`],
        concept: 'Each solution s of a polynomial equation corresponds to a factor (x − s).', trap: 'Using (x + s) for the solution s.', hints: ['Which factor gives x = ' + p + ' when set to zero?', 'Do the same for the other solution.', 'Multiply those factors and set the product to 0.'], differs: 'You build the equation from its solutions.' });
    }
    case 'reasoning': {
      const errAt = pk(r, [2, 3]);
      const lines = errAt === 2
        ? [qEx, `x^2+(${B})*x=${-C}`, `(x+${p})*(x-${-n})=0`, `x+${p}=0`, `x=${-p}`]
        : [qEx, `x^2+(${B})*x=${-C}`, `(x-${p})*(x+${-n})=0`, `x-${p}=0`, `x=${p}`];
      const shown = errAt === 2
        ? [`x^2 ${B < 0 ? '-' : '+'} ${Math.abs(B)}x = ${-C}`, `(x + ${p})(x - ${-n}) = 0`, `x + ${p} = 0`, `x = ${-p}`]
        : [`x^2 ${B < 0 ? '-' : '+'} ${Math.abs(B)}x = ${-C}`, `(x - ${p})(x + ${-n}) = 0`, `x - ${p} = 0`, `x = ${p}`];
      return out(b0, { sub: 'Finding an error in factoring', passage: `A student solved ${M(qTex)} and wrote the following.\n${stepLines(shown)}`, stem: 'In which step does the student first make an error?', choices: [...STEP_CHOICES], answer: errAt - 1,
        why: STEP_CHOICES.map((s, i) => (i === errAt - 1 ? `Correct. ${errAt === 2 ? 'The factors have the wrong signs; they multiply back to a different quadratic.' : 'Setting only ONE factor to zero throws away the other solution.'}` : i < errAt - 1 ? `${s} keeps both solutions.` : `${s} only follows from the earlier error.`)),
        spec: { t: 'steps', lines }, steps: ['Every correct step keeps both solutions.', `Step ${errAt} is the first that changes the set of solutions.`],
        concept: 'A product is zero when EITHER factor is zero, so a quadratic usually has two solutions.', trap: 'Keeping one factor and losing a solution.', hints: [`Solve ${M(qTex)} yourself first.`, 'Check whether each step keeps BOTH solutions.', 'The first step that loses or changes a solution is the error.'], differs: 'You diagnose a solution instead of producing one.' });
    }
    case 'challenge': {
      const s = ri(r, 2, 9), c2 = s * s;
      const ks = [2 * s, s, c2, 2 * s + 2];
      const opts = ks.map((k, i) => ({ t: M(String(k)), e: `x^2+${k}*x+${c2}=0`, why: i === 0 ? `With k = ${2 * s}, x² + ${2 * s}x + ${c2} = (x + ${s})², which has exactly one solution.` : `With k = ${k}, the discriminant ${k}² − 4(${c2}) = ${k * k - 4 * c2} is ${k * k - 4 * c2 > 0 ? 'positive (two solutions)' : 'negative (no real solution)'}.` }));
      if (new Set(ks).size < 4) return null;
      const mc = mcText(r, opts[0], opts.slice(1));
      const sorted = [...mc.order].sort((x, y) => Number(x.t.replace(/\$/g, '')) - Number(y.t.replace(/\$/g, '')));
      return out(b0, { sub: 'Discriminant and number of solutions', stem: `For what positive value of ${M('k')} does the equation ${M(`x^2 + kx + ${c2} = 0`)} have exactly one real solution?`, choices: sorted.map((o) => o.t), answer: sorted.indexOf(mc.order[mc.answer]), why: sorted.map((o) => (o === mc.order[mc.answer] ? mc.why[mc.answer] : o.why)),
        spec: { t: 'pick', choiceEqs: sorted.map((o) => opts.find((q) => q.t === o.t)!.e), test: { kind: 'oneroot' } },
        steps: ['Exactly one real solution means the discriminant k² − 4ac equals 0.', `k² − 4(${c2}) = 0, so k = ${2 * s} (the positive value).`],
        concept: 'The discriminant b² − 4ac tells how many real solutions a quadratic has: positive two, zero one, negative none.', trap: 'Setting k equal to the constant or its square root.', hints: ['How many solutions does a perfect square trinomial have?', 'Use the discriminant: b² − 4ac = 0.', `Solve k² = 4 × ${c2}.`], differs: 'Harder: reason about the number of solutions instead of finding them.' });
    }
  }
}

// ───────────────────────── exponential functions ─────────────────────────
function exponential(r: R, level: RemixLevel, mode: RemixMode, skill: SkillId): Candidate | null {
  const b0: Base = { skill, level, mode, family: 'exponential' };
  const a = ri(r, 2, 9) * (level >= 3 ? 10 : 1), b = ri(r, 2, level >= 3 ? 4 : 3), k = ri(r, 2, 4);
  if (a === b) return null;
  switch (mode) {
    case 'number': {
      const mc = mcNum({ v: a * b ** k, why: `${a} × ${b}^${k} = ${a} × ${b ** k} = ${a * b ** k}.` }, [{ v: (a * b) ** k, why: `Multiplying ${a} by ${b} before raising to the power.` }, { v: a * b * k, why: 'Treating the exponent as multiplication.' }, { v: a + b ** k, why: 'Adding instead of multiplying.' }, { v: a * b ** (k - 1), why: 'One factor of ' + b + ' short.' }]);
      if (!mc) return null;
      return out(b0, { sub: 'Evaluating exponential functions', stem: `The function ${M('f')} is defined by ${M(`f(x) = ${a}(${b})^x`)}. What is the value of ${M(`f(${k})`)}?`, ...mc, spec: { t: 'eval', expr: `${a}*${b}^${k}`, choiceExprs: mc.choiceExprs },
        steps: [`Raise the base first: ${b}^${k} = ${b ** k}.`, `Then multiply: ${a} × ${b ** k} = ${a * b ** k}.`], concept: 'In a·bˣ, the exponent applies only to b; multiply by a afterward.', trap: 'Multiplying a by b before applying the exponent.',
        hints: ['Which part does the exponent apply to?', `Compute ${b}^${k} first.`, `Multiply that by ${a}.`], differs: 'New starting value, base and input.' });
    }
    case 'context': {
      const P0 = ri(r, 2, 9) * 1000, rate = pk(r, [10, 20, 50]), t = ri(r, 2, 3), val = P0 * (1 + rate / 100) ** t;
      const mc = mcNum({ v: val, why: `${P0} × ${fmt(1 + rate / 100)}^${t} = ${fmt(val)}.` }, [{ v: P0 * (1 + rate * t / 100), why: 'Adding the same amount each year is linear, not exponential, growth.' }, { v: P0 * (rate / 100) ** t, why: 'Using the rate instead of the growth factor.' }, { v: P0 * (1 + rate / 100) ** (t - 1), why: 'One year short.' }, { v: P0 + rate * t, why: 'Treating percents as people.' }]);
      if (!mc) return null;
      return out(b0, { sub: 'Exponential growth in context', stem: `A city's population of bicycles grows by ${rate}% each year. There are ${P0} bicycles now. If the trend continues, how many bicycles will there be in ${t} years?`, ...mc, spec: { t: 'eval', expr: `${P0}*(1+${rate}/100)^${t}`, choiceExprs: mc.choiceExprs },
        steps: [`Each year multiplies the count by ${fmt(1 + rate / 100)}.`, `After ${t} years: ${P0} × ${fmt(1 + rate / 100)}^${t} = ${fmt(val)}.`], concept: 'Growth by a fixed PERCENT is exponential: multiply by (1 + r) each period.', trap: 'Adding the same amount each year (linear growth).',
        hints: ['Is the same AMOUNT added each year, or the same PERCENT?', `Write the yearly growth factor: 1 + ${rate}%.`, `Apply it ${t} times.`], differs: 'Exponential growth in a real setting.' });
    }
    case 'representation': {
      const xs = [0, 1, 2, 3], opts = [
        { t: M(`y = ${a}(${b})^x`), e: `y=${a}*${b}^x`, why: `Starts at ${a} and multiplies by ${b} each step.` },
        { t: M(`y = ${b}(${a})^x`), e: `y=${b}*${a}^x`, why: 'Starting value and growth factor are swapped.' },
        { t: M(`y = ${a} + ${b}x`), e: `y=${a}+${b}*x`, why: 'A linear model adds the same amount; the table multiplies.' },
        { t: M(`y = ${a}x^${b}`), e: `y=${a}*x^${b}`, why: 'A power function gives 0 at x = 0, but the table gives ' + a + '.' },
      ];
      const mc = mcText(r, opts[0], opts.slice(1));
      return out(b0, { sub: 'Exponential models from tables', figure: { kind: 'table', title: 'Values of a function', headers: ['x', 'y'], rows: xs.map((x) => [x, a * b ** x]) }, figureFns: [`${a}*${b}^x`],
        stem: 'Which equation could define the relationship shown in the table?', choices: mc.order.map((o) => o.t), answer: mc.answer, why: mc.why,
        spec: { t: 'pick', choiceEqs: mc.order.map((o) => opts.find((q) => q.t === o.t)!.e), test: { kind: 'points', pts: xs.map((x) => [x, a * b ** x] as [number, number]) } },
        steps: [`At x = 0, y = ${a}: that is the starting value.`, `Each step multiplies y by ${b}, so y = ${a}(${b})^x.`], concept: 'Equal ratios between consecutive outputs mean exponential; equal differences mean linear.', trap: 'Seeing growth and choosing a linear model.',
        hints: ['Compare consecutive y-values: are you adding or multiplying?', 'Find y when x = 0.', 'Combine the starting value and the factor.'], differs: 'The function is given as a table.' });
    }
    case 'reverse': {
      const V = a * b ** k;
      const mc = mcNum({ v: a, why: `${V} = a × ${b}^${k} = a × ${b ** k}, so a = ${a}.` }, [{ v: V / (b * k), why: 'Dividing by b × k instead of b^k.' }, { v: V - b ** k, why: 'Subtracting instead of dividing.' }, { v: V / b, why: 'Dividing by b only once.' }, { v: V, why: 'This is f(' + k + '), not the starting value.' }]);
      if (!mc) return null;
      return out(b0, { sub: 'Finding the starting value', stem: `The function ${M('f')} is defined by ${M(`f(x) = a(${b})^x`)}, where ${M('a')} is a constant. If ${M(`f(${k}) = ${V}`)}, what is the value of ${M('a')}?`, ...mc, spec: { t: 'eval', expr: `${V}/${b}^${k}`, choiceExprs: mc.choiceExprs },
        steps: [`${V} = a(${b})^${k} = ${b ** k}a.`, `a = ${V} ÷ ${b ** k} = ${a}.`], concept: 'The constant a is the value at x = 0; divide a later value by the right power of b.', trap: 'Dividing by the base only once.', hints: [`Substitute x = ${k} into the function.`, `Compute ${b}^${k}.`, 'Divide to isolate a.'], differs: 'You recover the starting value from a later one.' });
    }
    case 'reasoning': {
      const rate = pk(r, [5, 8, 12, 20]), dec = r() < 0.5, base2 = dec ? 1 - rate / 100 : 1 + rate / 100;
      const opts = [
        { t: `It ${dec ? 'decreases' : 'increases'} by ${rate}% each year.`, tag: 'right', why: `The factor ${fmt(base2)} means ${dec ? 'keep' : 'have'} ${fmt(base2 * 100)}% of the previous year's value.` },
        { t: `It ${dec ? 'decreases' : 'increases'} by ${fmt(base2 * 100)}% each year.`, tag: 'factor', why: `${fmt(base2 * 100)}% is what remains or results, not the change.` },
        { t: `It ${dec ? 'decreases' : 'increases'} by ${rate} units each year.`, tag: 'linear', why: 'A fixed number of units each year would be linear.' },
        { t: `It ${dec ? 'increases' : 'decreases'} by ${rate}% each year.`, tag: 'reverse', why: `A factor ${dec ? 'below' : 'above'} 1 means ${dec ? 'decay' : 'growth'}.` },
      ];
      const mc = mcText(r, { t: opts[0].t, why: opts[0].why }, opts.slice(1).map((o) => ({ t: o.t, why: o.why })));
      return out(b0, { sub: 'Interpreting exponential models', stem: `The value of a machine, in dollars, ${M('t')} years after purchase is modeled by ${M(`V(t) = ${a * 100}(${fmt(base2)})^t`)}. Which statement best describes the value?`, choices: mc.choices, answer: mc.answer, why: mc.why,
        spec: { t: 'tags', kind: 'interpretation', tags: mc.order.map((o) => opts.find((x) => x.t === o.t)!.tag), want: 'right' },
        steps: [`The factor is ${fmt(base2)} = 1 ${dec ? '−' : '+'} ${fmt(rate / 100)}.`, `So the value ${dec ? 'falls' : 'rises'} by ${rate}% each year.`], concept: 'In a(1 ± r)ᵗ, r is the percent change per period; the factor shows growth (above 1) or decay (below 1).', trap: 'Reading the factor itself as the percent change.',
        hints: ['Is the factor greater or less than 1?', 'Write it as 1 plus or minus a rate.', 'That rate is the yearly percent change.'], differs: 'You interpret a model instead of computing.' });
    }
    case 'challenge': {
      const p1 = a * b, p3 = a * b ** 3;
      const mc = mcNum({ v: a, why: `f(3)/f(1) = b² = ${b * b}, so b = ${b} and f(0) = f(1)/b = ${a}.` }, [{ v: p1 - b, why: 'Subtracting the factor instead of dividing.' }, { v: (p3 - p1) / 2, why: 'Treating the change as linear.' }, { v: p1, why: 'This is f(1).' }, { v: p1 / (b * b), why: 'Dividing by b² instead of b.' }]);
      if (!mc) return null;
      return out(b0, { sub: 'Exponential functions from two points', stem: `For the exponential function ${M('f(x) = ab^x')}, where ${M('a')} and ${M('b')} are positive constants, ${M(`f(1) = ${p1}`)} and ${M(`f(3) = ${p3}`)}. What is the value of ${M('f(0)')}?`, ...mc,
        spec: { t: 'eval', expr: `${p1}/sqrt(${p3}/${p1})`, choiceExprs: mc.choiceExprs }, steps: [`f(3) ÷ f(1) = b² = ${p3 / p1}, so b = ${b}.`, `f(0) = f(1) ÷ b = ${p1} ÷ ${b} = ${a}.`],
        concept: 'Dividing two outputs of an exponential function cancels a and isolates a power of b.', trap: 'Treating the function as linear between the points.', hints: ['Divide f(3) by f(1). What cancels?', 'Solve for b.', 'Step back from f(1) to f(0) by dividing by b.'], differs: 'Harder: recover the model from two values, then use it.' });
    }
  }
}

// ───────────────────────── geometry: right triangles and circles ─────────────────────────
const TRIPLES: [number, number, number][] = [[3, 4, 5], [5, 12, 13], [8, 15, 17], [7, 24, 25], [6, 8, 10], [9, 12, 15], [20, 21, 29]];
function triangle(r: R, level: RemixLevel, mode: RemixMode, skill: SkillId): Candidate | null {
  const b0: Base = { skill, level, mode, family: 'triangle' };
  const [p, q, h] = pk(r, TRIPLES), s = level >= 4 ? ri(r, 1, 3) : 1, A = p * s, B = q * s, H = h * s;
  const pyth = 'In a right triangle, leg² + leg² = hypotenuse² (the Pythagorean theorem).';
  switch (mode) {
    case 'number': case 'context': {
      const ctx = mode === 'context';
      const mc = mcNum({ v: H, why: `√(${A}² + ${B}²) = √${A * A + B * B} = ${H}.` }, [{ v: A + B, why: 'Adding the legs; the hypotenuse is shorter than their sum.' }, { v: A * A + B * B, why: 'Forgetting the square root.' }, { v: Math.round(Math.sqrt(Math.abs(B * B - A * A)) * 100) / 100, why: 'Subtracting the squares instead of adding.' }, { v: H + 1, why: 'Arithmetic slip.' }], ctx ? 'feet' : '');
      if (!mc) return null;
      return out(b0, { sub: ctx ? 'Right triangles in context' : 'The Pythagorean theorem', stem: ctx ? `The bottom of a ladder is ${A} feet from a wall, and the top of the ladder touches the wall ${B} feet above the ground. How long is the ladder, in feet?` : `A right triangle has legs of lengths ${A} and ${B}. What is the length of the hypotenuse?`, ...mc,
        spec: { t: 'eval', expr: `sqrt(${A}^2+${B}^2)`, choiceExprs: mc.choiceExprs }, steps: [`${A}² + ${B}² = ${A * A} + ${B * B} = ${A * A + B * B}.`, `√${A * A + B * B} = ${H}.`], concept: pyth, trap: 'Forgetting the square root, or adding the legs.',
        hints: [ctx ? 'The wall, the ground and the ladder form a right triangle. Which side is the ladder?' : 'Which side is the hypotenuse?', 'Square both legs and add.', 'Take the square root of the total.'], differs: ctx ? 'The triangle is now a ladder against a wall.' : 'New side lengths.' });
    }
    case 'representation': {
      const x1 = ri(r, -5, 3), y1 = ri(r, -5, 3), x2 = x1 + A, y2 = y1 + B;
      const mc = mcNum({ v: H, why: `Δx = ${A}, Δy = ${B}, distance = √(${A}² + ${B}²) = ${H}.` }, [{ v: A + B, why: 'Adding the changes in x and y (a taxicab distance).' }, { v: A * A + B * B, why: 'Forgetting the square root.' }, { v: Math.abs(x2 + y2 - x1 - y1) + 1, why: 'Mixing up the coordinates.' }, { v: H - 1, why: 'Arithmetic slip.' }]);
      if (!mc) return null;
      return out(b0, { sub: 'Distance in the coordinate plane', stem: `What is the distance between the points ${M(`(${x1}, ${y1})`)} and ${M(`(${x2}, ${y2})`)} in the ${M('xy')}-plane?`, ...mc, spec: { t: 'eval', expr: `sqrt((${x2}-(${x1}))^2+(${y2}-(${y1}))^2)`, choiceExprs: mc.choiceExprs },
        steps: [`The horizontal and vertical changes, ${A} and ${B}, are the legs of a right triangle.`, `Distance = √(${A}² + ${B}²) = ${H}.`], concept: 'The distance formula is the Pythagorean theorem on a coordinate grid.', trap: 'Adding the changes in x and y.',
        hints: ['Sketch the two points and the right triangle between them.', 'Find the horizontal and vertical legs.', 'Use the Pythagorean theorem.'], differs: 'The triangle is drawn on a coordinate grid.' });
    }
    case 'reverse': {
      const mc = mcNum({ v: B, why: `√(${H}² − ${A}²) = √${H * H - A * A} = ${B}.` }, [{ v: Math.round(Math.sqrt(H * H + A * A) * 100) / 100, why: 'Adding the squares: the missing side is a leg, not the hypotenuse.' }, { v: H - A, why: 'Subtracting the lengths instead of their squares.' }, { v: H * H - A * A, why: 'Forgetting the square root.' }, { v: B + 2, why: 'Arithmetic slip.' }]);
      if (!mc) return null;
      return out(b0, { sub: 'Finding a missing leg', stem: `A right triangle has a hypotenuse of length ${H} and one leg of length ${A}. What is the length of the other leg?`, ...mc, spec: { t: 'eval', expr: `sqrt(${H}^2-${A}^2)`, choiceExprs: mc.choiceExprs },
        steps: [`${A}² + b² = ${H}², so b² = ${H * H} − ${A * A} = ${H * H - A * A}.`, `b = ${B}.`], concept: pyth, trap: 'Adding the squares when the unknown is a leg.', hints: ['Is the missing side a leg or the hypotenuse?', 'Subtract the known leg squared from the hypotenuse squared.', 'Take the square root.'], differs: 'You work backward from the hypotenuse to a leg.' });
    }
    case 'reasoning': {
      const sets: [number, number, number][] = [[A, B, H], [A, B, H + 1], [A + 1, B, H], [A, B + 1, H + 1]];
      const opts = sets.map(([u, v, w], i) => ({ t: M(`${u}, ${v}, ${w}`), e: `${u * u}+${v * v}=${w * w}`, why: i === 0 ? `${u}² + ${v}² = ${u * u + v * v} = ${w}².` : `${u}² + ${v}² = ${u * u + v * v}, but ${w}² = ${w * w}.` }));
      const mc = mcText(r, opts[0], opts.slice(1));
      return out(b0, { sub: 'Recognizing right triangles', stem: 'Which set of numbers could be the side lengths of a right triangle?', choices: mc.order.map((o) => o.t), answer: mc.answer, why: mc.why,
        spec: { t: 'pick', choiceEqs: mc.order.map((o) => opts.find((q) => q.t === o.t)!.e), test: { kind: 'root', x: 0 } },
        steps: ['A triangle is right exactly when the two shorter sides squared add to the longest side squared.', `Only ${A}, ${B}, ${H} passes.`], concept: 'The converse of the Pythagorean theorem identifies right triangles.', trap: 'Trusting numbers that are "close" to a familiar triple.',
        hints: ['Which side would be the hypotenuse in each set?', 'Square the two shorter sides and add.', 'Compare with the square of the longest side.'], differs: 'You test claims instead of computing one length.' });
    }
    case 'challenge': {
      const mc = mcNum({ v: A / H, e: `${A}/${H}`, tex: `\\frac{${A / gcd(A, H)}}{${H / gcd(A, H)}}`, why: `The hypotenuse is ${H}, and sin(B) = opposite ÷ hypotenuse = ${A}/${H}.` }, [{ v: B / H, e: `${B}/${H}`, tex: `\\frac{${B / gcd(B, H)}}{${H / gcd(B, H)}}`, why: 'This is the cosine of angle B (adjacent over hypotenuse).' }, { v: A / B, e: `${A}/${B}`, tex: `\\frac{${A / gcd(A, B)}}{${B / gcd(A, B)}}`, why: 'This is the tangent of angle B.' }, { v: H / A, e: `${H}/${A}`, tex: `\\frac{${H / gcd(A, H)}}{${A / gcd(A, H)}}`, why: 'This is upside down.' }, { v: B / A, e: `${B}/${A}`, tex: `\\frac{${B / gcd(A, B)}}{${A / gcd(A, B)}}`, why: 'This is adjacent over opposite.' }]);
      if (!mc) return null;
      return out(b0, { sub: 'Trigonometric ratios', stem: `In right triangle ${M('ABC')}, angle ${M('C')} is the right angle, ${M(`AC = ${A}`)}, and ${M(`BC = ${B}`)}. What is the value of ${M('\\sin B')}?`, ...mc, spec: { t: 'eval', expr: `${A}/sqrt(${A}^2+${B}^2)`, choiceExprs: mc.choiceExprs },
        steps: [`First find the hypotenuse: AB = √(${A}² + ${B}²) = ${H}.`, `The side opposite angle B is AC = ${A}, so sin B = ${A}/${H}.`], concept: 'SOH-CAH-TOA: sine is opposite over hypotenuse, measured from the angle in question.', trap: 'Using the side opposite the wrong angle.',
        hints: ['Find the missing hypotenuse first.', 'Which side is opposite angle B?', 'Sine = opposite ÷ hypotenuse.'], differs: 'Harder: two steps (find the hypotenuse, then a trig ratio).' });
    }
  }
}

function circle(r: R, level: RemixLevel, mode: RemixMode, skill: SkillId): Candidate | null {
  const b0: Base = { skill, level, mode, family: 'circle' };
  const rad = ri(r, 2, level >= 3 ? 15 : 9);
  const pi = (k: number) => ({ v: k * Math.PI, e: `${k}*pi`, tex: k === 1 ? '\\pi' : `${fmt(k)}\\pi` });
  switch (mode) {
    case 'number': case 'context': {
      const ctx = mode === 'context';
      const mc = mcNum({ ...pi(rad * rad), why: `πr² = π(${rad})² = ${rad * rad}π.` }, [{ ...pi(2 * rad), why: 'This is the circumference, 2πr.' }, { ...pi(2 * rad * rad), why: 'Doubling the radius squared.' }, { ...pi(rad), why: 'Forgetting to square the radius.' }, { ...pi(4 * rad * rad), why: 'Using the diameter in place of the radius.' }], ctx ? 'square meters' : '');
      if (!mc) return null;
      return out(b0, { sub: ctx ? 'Circle area in context' : 'Area of a circle', stem: ctx ? `A circular garden has a diameter of ${2 * rad} meters. What is the area of the garden, in square meters?` : `What is the area of a circle with radius ${rad}?`, ...mc, spec: { t: 'eval', expr: `pi*${ctx ? `(${2 * rad}/2)` : rad}^2`, choiceExprs: mc.choiceExprs },
        steps: [...(ctx ? [`The radius is half the diameter: ${rad} meters.`] : []), `Area = πr² = π(${rad}²) = ${rad * rad}π.`], concept: 'Area of a circle = πr²; circumference = 2πr.', trap: ctx ? 'Using the diameter as the radius.' : 'Mixing up area and circumference.',
        hints: [ctx ? 'The formula uses the radius. What is the radius here?' : 'Which formula gives area, not distance around?', 'Square the radius.', 'Multiply by π.'], differs: ctx ? 'A real garden, and you are given the diameter.' : 'A new radius.' });
    }
    case 'representation': {
      const h = ri(r, -6, 6), k = ri(r, -6, 6), D = -2 * h, E = -2 * k, F = h * h + k * k - rad * rad;
      const eqTex = `x^2 + y^2 ${D < 0 ? '-' : '+'} ${Math.abs(D)}x ${E < 0 ? '-' : '+'} ${Math.abs(E)}y ${F < 0 ? '-' : '+'} ${Math.abs(F)} = 0`.replace(/[+-] 0[xy] /g, '');
      const mc = mcNum({ v: rad, why: `Completing the squares gives (x ${h < 0 ? '+' : '−'} ${Math.abs(h)})² + (y ${k < 0 ? '+' : '−'} ${Math.abs(k)})² = ${rad * rad}, so r = ${rad}.` }, [{ v: rad * rad, why: 'This is r², the right side after completing the squares.' }, { v: Math.round(Math.sqrt(Math.abs(F)) * 100) / 100, why: 'Using the constant term before completing the squares.' }, { v: Math.round(Math.sqrt(rad * rad + h * h) * 100) / 100, why: 'Adding only one completed square.' }, { v: rad + 1, why: 'Arithmetic slip.' }]);
      if (!mc || h === 0 || k === 0) return null;
      return out(b0, { sub: 'Circle equations', stem: `The equation ${M(eqTex)} defines a circle in the ${M('xy')}-plane. What is the radius of the circle?`, ...mc,
        spec: { t: 'eval', expr: `sqrt((${D}/2)^2+(${E}/2)^2-(${F}))`, choiceExprs: mc.choiceExprs },
        steps: [`Group: (x² ${D < 0 ? '−' : '+'} ${Math.abs(D)}x) + (y² ${E < 0 ? '−' : '+'} ${Math.abs(E)}y) = ${-F}.`, `Complete each square by adding ${h * h} and ${k * k}: the right side becomes ${rad * rad}, so r = ${rad}.`], concept: 'Complete the square in x and in y to reach (x − h)² + (y − k)² = r².', trap: 'Reporting r² as the radius.',
        hints: ['Group the x terms and the y terms.', 'Complete the square for each, adding the same amounts to both sides.', 'The right side is r²; take its square root.'], differs: 'The circle is given as an expanded equation.' });
    }
    case 'reverse': {
      const mc = mcNum({ v: rad, why: `πr² = ${rad * rad}π, so r² = ${rad * rad} and r = ${rad}.` }, [{ v: rad * rad, why: 'This is r², not r.' }, { v: rad * rad / 2, why: 'Dividing by 2 instead of taking a square root.' }, { v: 2 * rad, why: 'This is the diameter.' }, { v: rad + 1, why: 'Arithmetic slip.' }]);
      if (!mc) return null;
      return out(b0, { sub: 'Radius from area', stem: `A circle has an area of ${M(`${rad * rad}\\pi`)} square inches. What is the radius of the circle, in inches?`, ...mc, spec: { t: 'solve', eq: `pi*x^2=${rad * rad}*pi`, root: 'positive', choiceExprs: mc.choiceExprs },
        steps: [`πr² = ${rad * rad}π, so r² = ${rad * rad}.`, `r = ${rad} (a radius is positive).`], concept: 'Undo the area formula: divide by π, then take the square root.', trap: 'Stopping at r², or reporting the diameter.', hints: ['Start from A = πr².', 'Divide both sides by π.', 'Take the square root.'], differs: 'You work backward from the area to the radius.' });
    }
    case 'reasoning': {
      const f = pk(r, [2, 3]);
      const mc = mcNum({ v: f * f, why: `Area scales with r², so multiplying r by ${f} multiplies the area by ${f}² = ${f * f}.` }, [{ v: f, why: 'That is how the circumference scales, not the area.' }, { v: 2 * f, why: 'Doubling the factor is not squaring it.' }, { v: f * f * f, why: 'Cubing applies to volume, not area.' }, { v: f + 1, why: 'Adding to the factor is not squaring it.' }]);
      if (!mc) return null;
      return out(b0, { sub: 'How area scales', stem: `The radius of a circle is multiplied by ${f}. The area of the new circle is how many times the area of the original circle?`, ...mc, spec: { t: 'eval', expr: `(pi*(${f}*${rad})^2)/(pi*${rad}^2)`, choiceExprs: mc.choiceExprs },
        steps: [`New area = π(${f}r)² = ${f * f}πr².`, `That is ${f * f} times the original.`], concept: 'Lengths scale by k, areas by k², volumes by k³.', trap: 'Assuming area grows by the same factor as the radius.', hints: ['Write the area with radius r, then with radius ' + f + 'r.', 'Square the new radius carefully.', 'Divide the new area by the old one.'], differs: 'You reason about scaling instead of computing one area.' });
    }
    case 'challenge': {
      const deg = pk(r, [30, 45, 60, 72, 90, 120, 135, 150]), sec = (deg / 360) * rad * rad;
      const mc = mcNum({ v: sec * Math.PI, e: `${sec}*pi`, tex: `${fmt(sec)}\\pi`, why: `${deg}/360 of the circle: ${deg}/360 × ${rad * rad}π = ${fmt(sec)}π.` }, [{ v: (deg / 360) * 2 * rad * Math.PI, e: `${(deg / 360) * 2 * rad}*pi`, tex: `${fmt((deg / 360) * 2 * rad)}\\pi`, why: 'This is the arc length, a fraction of the circumference.' }, { v: (deg / 180) * rad * rad * Math.PI, e: `${(deg / 180) * rad * rad}*pi`, tex: `${fmt((deg / 180) * rad * rad)}\\pi`, why: 'Dividing by 180 instead of 360.' }, { v: rad * rad * Math.PI, e: `${rad * rad}*pi`, tex: `${rad * rad}\\pi`, why: 'This is the whole circle.' }, { v: deg * rad * Math.PI / 360, e: `${deg * rad / 360}*pi`, tex: `${fmt(deg * rad / 360)}\\pi`, why: 'Forgetting to square the radius.' }]);
      if (!mc) return null;
      return out(b0, { sub: 'Sectors', stem: `A sector of a circle with radius ${rad} has a central angle of ${M(`${deg}^\\circ`)}. What is the area of the sector?`, ...mc, spec: { t: 'eval', expr: `${deg}/360*pi*${rad}^2`, choiceExprs: mc.choiceExprs },
        steps: [`The sector is ${deg}/360 of the circle.`, `Area = ${deg}/360 × π(${rad})² = ${fmt(sec)}π.`], concept: 'A sector is the same fraction of the area as its angle is of 360°.', trap: 'Using the circumference (arc length) instead of the area.',
        hints: ['What fraction of the full circle is the sector?', 'Find the area of the whole circle.', 'Multiply by that fraction.'], differs: 'Harder: a fraction of a circle, mixing angle and area.' });
    }
  }
}

// ───────────────────────── statistics and probability ─────────────────────────
function stats(r: R, level: RemixLevel, mode: RemixMode, skill: SkillId): Candidate | null {
  const b0: Base = { skill, level, mode, family: 'stats' };
  const n = ri(r, 5, level >= 3 ? 8 : 6), mean = ri(r, 6, 40), vals: number[] = [];
  for (let i = 0; i < n - 1; i++) vals.push(mean + ri(r, -9, 9));
  vals.push(mean * n - vals.reduce((t, v) => t + v, 0));
  if (vals[n - 1] <= 0 || new Set(vals).size < 3) return null;
  const sorted = [...vals].sort((a, b) => a - b), median = n % 2 ? sorted[(n - 1) / 2] : (sorted[n / 2 - 1] + sorted[n / 2]) / 2;
  const sum = vals.reduce((t, v) => t + v, 0);
  switch (mode) {
    case 'number': case 'context': {
      if (Math.abs(median - mean) < 1e-9) return null;
      const ctx = mode === 'context';
      const mc = mcNum({ v: mean, why: `Sum ${sum} ÷ ${n} values = ${mean}.` }, [{ v: median, why: 'This is the median, the middle value.' }, { v: sum / (n - 1), why: `Dividing by ${n - 1} instead of ${n}.` }, { v: sum, why: 'This is the sum.' }, { v: (sorted[0] + sorted[n - 1]) / 2, why: 'This is the midpoint of the range.' }]);
      if (!mc) return null;
      return out(b0, { sub: 'Mean', stem: ctx ? `A student recorded the number of minutes she practiced piano on ${n} days: ${vals.join(', ')}. What is the mean number of minutes per day?` : `What is the mean of the data set ${vals.join(', ')}?`, ...mc, spec: { t: 'eval', expr: `(${vals.join('+')})/${n}`, choiceExprs: mc.choiceExprs },
        steps: [`Add the values: ${sum}.`, `Divide by the number of values, ${n}: ${mean}.`], concept: 'Mean = sum of the values ÷ number of values.', trap: 'Confusing the mean with the median, or miscounting the values.',
        hints: ['Count how many values there are.', 'Add all the values.', 'Divide the total by the count.'], differs: ctx ? 'The data now describe a real situation.' : 'A new data set.' });
    }
    case 'representation': {
      const values = [ri(r, 1, 3), ri(r, 4, 5), ri(r, 6, 8)], counts = [ri(r, 1, 5), ri(r, 1, 5), ri(r, 1, 5)];
      const total = counts.reduce((t, c) => t + c, 0), s2 = values.reduce((t, v, i) => t + v * counts[i], 0);
      const mc = mcNum({ v: s2 / total, why: `Total = ${s2}, count = ${total}, mean = ${fmt(s2 / total)}.` }, [{ v: (values[0] + values[1] + values[2]) / 3, why: 'Averaging the three values ignores how often each occurs.' }, { v: s2 / 3, why: 'Dividing by the number of rows instead of the number of people.' }, { v: total / 3, why: 'This is the average count, not the average value.' }, { v: s2, why: 'This is the total.' }]);
      if (!mc) return null;
      return out(b0, { sub: 'Mean from a frequency table', figure: { kind: 'table', title: 'Books read last month', headers: ['Number of books', 'Number of students'], rows: values.map((v, i) => [v, counts[i]]) },
        stem: 'The table summarizes how many books each student in a club read last month. What is the mean number of books read per student?', ...mc, spec: { t: 'eval', expr: `(${values.map((v, i) => `${v}*${counts[i]}`).join('+')})/(${counts.join('+')})`, choiceExprs: mc.choiceExprs },
        steps: [`Total books: ${values.map((v, i) => `${v}×${counts[i]}`).join(' + ')} = ${s2}.`, `Students: ${total}. Mean = ${s2} ÷ ${total} = ${fmt(s2 / total)}.`], concept: 'In a frequency table, each value counts as many times as its frequency.', trap: 'Averaging the listed values without weighting them.',
        hints: ['Each row stands for several students.', 'Multiply each value by its count and add.', 'Divide by the total number of students.'], differs: 'The data are summarized in a frequency table.' });
    }
    case 'reverse': {
      const known = vals.slice(0, n - 1), last = vals[n - 1];
      const mc = mcNum({ v: last, why: `The total must be ${n} × ${mean} = ${mean * n}; ${mean * n} − ${known.reduce((t, v) => t + v, 0)} = ${last}.` }, [{ v: mean, why: 'The missing value need not equal the mean.' }, { v: mean * n - known.reduce((t, v) => t + v, 0) - mean, why: 'Subtracting the mean once more.' }, { v: known.reduce((t, v) => t + v, 0) / (n - 1), why: 'This is the mean of the other values.' }, { v: last + n, why: 'Arithmetic slip.' }]);
      if (!mc) return null;
      return out(b0, { sub: 'Missing value from a mean', stem: `The mean of ${n} numbers is ${mean}. ${n - 1} of the numbers are ${known.join(', ')}. What is the remaining number?`, ...mc, spec: { t: 'eval', expr: `${n}*${mean}-(${known.join('+')})`, choiceExprs: mc.choiceExprs },
        steps: [`The total of all ${n} numbers is ${n} × ${mean} = ${n * mean}.`, `Subtract the known total ${known.reduce((t, v) => t + v, 0)}: ${last}.`], concept: 'A mean tells you the total: mean × count.', trap: 'Assuming the missing value equals the mean.', hints: ['What total must the numbers add to?', 'Multiply the mean by the count.', 'Subtract the numbers you know.'], differs: 'You work backward from the mean.' });
    }
    case 'reasoning': {
      const k = ri(r, 5, 20);
      const mc = mcNum({ v: k / n, why: `The total grows by ${k}, so the mean grows by ${k} ÷ ${n} = ${fmt(k / n)}.` }, [{ v: k, why: 'The whole increase is shared across all the values.' }, { v: 0, why: 'The median would stay the same, but the mean changes.' }, { v: k / (n - 1), why: `Dividing by ${n - 1} instead of ${n}.` }, { v: 2 * k / n, why: 'Counting the change twice.' }]);
      if (!mc) return null;
      return out(b0, { sub: 'How changes affect the mean', stem: `The data set ${vals.join(', ')} has ${n} values. If the greatest value is increased by ${k}, by how much does the mean increase?`, ...mc, spec: { t: 'eval', expr: `((${vals.join('+')})+${k})/${n}-(${vals.join('+')})/${n}`, choiceExprs: mc.choiceExprs },
        steps: [`The sum increases by ${k}.`, `The mean increases by ${k} ÷ ${n} = ${fmt(k / n)}.`], concept: 'Changing one value changes the total by that amount; the mean changes by that amount divided by the count. The median depends only on the middle.', trap: 'Thinking the mean rises by the full amount.',
        hints: ['How does the sum change?', 'The mean is the sum divided by the count.', 'Divide the change in the sum by the count.'], differs: 'You reason about a change instead of computing a mean.' });
    }
    case 'challenge': {
      const n1 = ri(r, 10, 30), n2 = ri(r, 10, 30), m1 = ri(r, 60, 85), m2 = ri(r, 70, 95);
      if (m1 === m2 || (n1 * m1 + n2 * m2) % (n1 + n2) !== 0) return null;   // keep the combined mean a whole number
      const comb = (n1 * m1 + n2 * m2) / (n1 + n2);
      const mc = mcNum({ v: comb, why: `(${n1}×${m1} + ${n2}×${m2}) ÷ ${n1 + n2} = ${fmt(comb)}.` }, [{ v: (m1 + m2) / 2, why: 'Averaging the two means ignores that the groups are different sizes.' }, { v: (n1 * m2 + n2 * m1) / (n1 + n2), why: 'Pairing each mean with the other group\'s size.' }, { v: (n1 * m1 + n2 * m2) / 2, why: 'Dividing by 2 instead of the number of students.' }, { v: Math.max(m1, m2), why: 'The combined mean lies between the two means.' }]);
      if (!mc) return null;
      return out(b0, { sub: 'Combining groups', stem: `In one class, ${n1} students had a mean score of ${m1}. In another class, ${n2} students had a mean score of ${m2}. What is the mean score of all ${n1 + n2} students?`, ...mc, spec: { t: 'eval', expr: `(${n1}*${m1}+${n2}*${m2})/(${n1}+${n2})`, choiceExprs: mc.choiceExprs },
        steps: [`Total points: ${n1}×${m1} + ${n2}×${m2} = ${n1 * m1 + n2 * m2}.`, `Divide by ${n1 + n2} students: ${fmt(comb)}.`], concept: 'Combine groups by combining their totals, not by averaging their means.', trap: 'Averaging the two means when the groups differ in size.',
        hints: ['Turn each mean back into a total.', 'Add the totals and the counts.', 'Divide the combined total by the combined count.'], differs: 'Harder: two groups with different sizes.' });
    }
  }
}

function probability(r: R, level: RemixLevel, mode: RemixMode, skill: SkillId): Candidate | null {
  const b0: Base = { skill, level, mode, family: 'probability' };
  const g = [ri(r, 8, 30), ri(r, 8, 30), ri(r, 8, 30), ri(r, 8, 30)]; // [A&yes, A&no, B&yes, B&no]
  const rowA = g[0] + g[1], rowB = g[2] + g[3], yes = g[0] + g[2], tot = rowA + rowB;
  const fig = { kind: 'table' as const, title: 'Survey: do you play a musical instrument?', headers: ['Grade', 'Yes', 'No', 'Total'], rows: [['10th grade', g[0], g[1], rowA], ['11th grade', g[2], g[3], rowB], ['Total', yes, g[1] + g[3], tot]] };
  const F = (n: number, d: number) => ({ v: n / d, e: `${n}/${d}`, tex: `\\frac{${n / gcd(n, d)}}{${d / gcd(n, d)}}` });
  switch (mode) {
    case 'number': case 'context': case 'representation': {
      const cond = mode !== 'number';
      const key = cond ? F(g[2], yes) : F(yes, tot);
      const mc = mcNum({ ...key, why: cond ? `Of the ${yes} students who play, ${g[2]} are in 11th grade.` : `${yes} of the ${tot} students play an instrument.` }, cond
        ? [{ ...F(g[2], rowB), why: 'This is the probability of playing, given 11th grade (the condition is reversed).' }, { ...F(g[2], tot), why: 'This divides by everyone, not just those who play.' }, { ...F(g[0], yes), why: 'This is the 10th-grade share of players.' }, { ...F(rowB, tot), why: 'This is the share of 11th graders overall.' }]
        : [{ ...F(g[0], tot), why: 'This counts only the 10th graders who play.' }, { ...F(yes, g[1] + g[3]), why: 'This compares players to non-players.' }, { ...F(rowA, tot), why: 'This is the share of 10th graders.' }, { ...F(g[2], rowB), why: 'This is the share of 11th graders who play.' }]);
      if (!mc) return null;
      const figure = mode === 'representation' ? { kind: 'bar' as const, title: 'Survey: do you play a musical instrument?', xLabel: 'Grade', yLabel: 'Number of students', categories: ['10th grade', '11th grade'], series: [{ name: 'Yes', values: [g[0], g[2]] }, { name: 'No', values: [g[1], g[3]] }] } : fig;
      return out(b0, { sub: cond ? 'Conditional probability' : 'Probability from a two-way table', figure, stem: cond ? 'A student who plays an instrument is selected at random. What is the probability that the student is in 11th grade?' : 'A student from the survey is selected at random. What is the probability that the student plays an instrument?', ...mc,
        spec: { t: 'eval', expr: key.e, choiceExprs: mc.choiceExprs }, steps: cond ? ['The condition "plays an instrument" restricts the group to the Yes column.', `${g[2]} of those ${yes} students are in 11th grade: ${g[2]}/${yes}.`] : [`${yes} students play out of ${tot} surveyed.`, `Probability = ${yes}/${tot}.`],
        concept: cond ? 'For a conditional probability, divide by the total of the GIVEN group only.' : 'Probability = favorable outcomes ÷ total outcomes.', trap: cond ? 'Dividing by the wrong total (the reversed condition, or everyone).' : 'Using one row instead of the whole table.',
        hints: cond ? ['Which group are you choosing from? That is your denominator.', 'Find the total of the Yes column.', 'How many of them are 11th graders?'] : ['How many students were surveyed in all?', 'How many of them play an instrument?', 'Divide the number who play by the number surveyed.'], differs: cond ? 'Same table idea, now a conditional question.' : 'A new survey table.' });
    }
    case 'reverse': {
      const p = pk(r, [0.2, 0.25, 0.4, 0.6, 0.75]), N = pk(r, [20, 40, 60, 80]), k = p * N;
      const mc = mcNum({ v: k, why: `${fmt(p)} × ${N} = ${k}.` }, [{ v: N - k, why: 'This is the number that are NOT that color.' }, { v: p * 100, why: 'This is the probability as a percent.' }, { v: N / k, why: 'Dividing instead of multiplying.' }, { v: k + 1, why: 'Arithmetic slip.' }]);
      if (!mc) return null;
      return out(b0, { sub: 'Counts from a probability', stem: `A bag contains ${N} marbles. If one marble is chosen at random, the probability that it is blue is ${M(fmt(p))}. How many blue marbles are in the bag?`, ...mc, spec: { t: 'eval', expr: `${p}*${N}`, choiceExprs: mc.choiceExprs },
        steps: ['Probability = blue ÷ total.', `Blue = ${fmt(p)} × ${N} = ${k}.`], concept: 'A probability is a fraction of the total; multiply back to get the count.', trap: 'Counting the complement.', hints: ['Write probability = blue ÷ total.', `You know the probability and the total (${N}).`, 'Multiply to undo the division.'], differs: 'You work back from a probability to a count.' });
    }
    case 'reasoning': case 'challenge': {
      const red = ri(r, 3, 8), blue = ri(r, 3, 8), T = red + blue;
      const key = F(red * (red - 1), T * (T - 1));
      const mc = mcNum({ ...key, why: `${red}/${T} × ${red - 1}/${T - 1}: after one red is removed, ${red - 1} reds remain among ${T - 1}.` }, [{ ...F(red * red, T * T), why: 'This assumes the first marble was put back.' }, { ...F(red, T), why: 'This is the chance for one draw only.' }, { ...F(2 * red, T), why: 'Probabilities of successive events multiply, not add.' }, { ...F(red * (red - 1), T * T), why: 'The second draw has one fewer marble in total too.' }]);
      if (!mc) return null;
      return out(b0, { sub: 'Probability without replacement', stem: `A box contains ${red} red marbles and ${blue} blue marbles. Two marbles are drawn at random without replacement. What is the probability that both are red?`, ...mc, spec: { t: 'eval', expr: `(${red}/${T})*((${red}-1)/(${T}-1))`, choiceExprs: mc.choiceExprs },
        steps: [`First draw: ${red}/${T}.`, `Second draw, given the first was red: ${red - 1}/${T - 1}. Multiply: ${fmt(key.v)}.`], concept: 'For "and" with dependent events, multiply, updating the counts after each draw.', trap: 'Treating the draws as independent (with replacement).',
        hints: ['Find the chance the first marble is red.', 'How do the counts change before the second draw?', 'Multiply the two probabilities.'], differs: 'Harder: two dependent events in a row.' });
    }
  }
}

export type Family = (r: R, level: RemixLevel, mode: RemixMode, skill: SkillId) => Candidate | null;
/** Each SAT Math skill and the concept family that remixes it ("exact" when the family is the skill itself). */
export const MATH_FAMILIES: Partial<Record<SkillId, { family: Family; name: string; exact: boolean }>> = {
  lin1: { family: linear, name: 'linear equations', exact: true },
  equiv: { family: linear, name: 'linear expressions and structure', exact: false },
  ineq: { family: linear, name: 'linear equations (the closest family to inequalities)', exact: false },
  linf: { family: slope, name: 'linear functions', exact: true },
  lin2: { family: slope, name: 'lines in two variables', exact: true },
  data2: { family: slope, name: 'linear models', exact: false },
  sys: { family: system, name: 'systems of linear equations', exact: true },
  pct: { family: percent, name: 'percentages', exact: true },
  ratio: { family: percent, name: 'ratios and proportions', exact: true },
  infer: { family: percent, name: 'proportions and percents (the closest family to sampling)', exact: false },
  nleq: { family: quadratic, name: 'quadratic equations', exact: true },
  nlf: { family: exponential, name: 'exponential functions', exact: true },
  trig: { family: triangle, name: 'right triangles and trigonometry', exact: true },
  lines: { family: triangle, name: 'right triangles', exact: true },
  circ: { family: circle, name: 'circles', exact: true },
  area: { family: circle, name: 'area (circles)', exact: false },
  data1: { family: stats, name: 'one-variable data', exact: true },
  claims: { family: stats, name: 'statistics (the closest family to evaluating claims)', exact: false },
  prob: { family: probability, name: 'probability', exact: true },
};
