import { compile, findRoots } from '../mathexpr';
import { SKILL } from '../taxonomy';
import type { RawQuestion } from '../types';
import { cbSpecChecks } from '@/data/questions/rules';
import type { Candidate, Check, MathSpec, RwSpec, Validation } from './types';

/**
 * The independent validator. It does not trust the generator's answer key: for math it re-solves the
 * problem from its spec (numeric root finding, Cramer's rule on parsed coefficients, substitution) and
 * counts how many choices are actually correct; for Reading & Writing it checks the tagged structure
 * (exactly one choice with the required role, a data statement that is true AND relevant, a sentence that
 * uses the required facts and nothing outside the notes, the one punctuation mark the structure allows),
 * plus the College Board item checks already used for the bank, clarity and originality.
 */
const TOL = 1e-6;
const near = (a: number, b: number) => Math.abs(a - b) <= TOL * Math.max(1, Math.abs(a), Math.abs(b));
const words = (s: string) => s.split(/\s+/).filter(Boolean);

/** Turns displayed math ("$-\frac{7}{2}$", "$12\sqrt{3}$", "45%", "$1,250") into an expression to evaluate. */
export function texToExpr(s: string): string {
  const seg = s.match(/\$([^$]+)\$/);
  if (seg) s = seg[1];
  let t = s.replace(/\$/g, '').replace(/\\left|\\right|\\,|\\!|\\;/g, '').replace(/−/g, '-').replace(/(\d),(\d{3})/g, '$1$2');
  t = t.replace(/\\[dt]?frac\{([^{}]+)\}\{([^{}]+)\}/g, '(($1)/($2))').replace(/\\sqrt\{([^{}]+)\}/g, 'sqrt($1)').replace(/\\pi/g, 'pi').replace(/\\cdot|\\times/g, '*');
  t = t.replace(/%/g, '').replace(/\b(dollars?|cm|meters?|m|km|minutes?|hours?|days?|years?|units?|feet|inches|miles?|liters?|grams?|kg|people|students|degrees)\b/g, '').trim();
  return t;
}
export function evalExpr(e: string, vars: Record<string, number> = {}): number {
  try { return compile(e).fn(vars); } catch { return NaN; }
}
const sides = (eq: string) => { const i = eq.indexOf('='); if (i < 0) throw new Error(`not an equation: ${eq}`); return [eq.slice(0, i), eq.slice(i + 1)] as const; };

/** All real roots of an equation in x on a wide window; `identity` if it holds everywhere. */
export function rootsOf(eq: string): { roots: number[]; identity: boolean } {
  const [l, r] = sides(eq);
  const L = compile(l), R = compile(r);
  const f = (x: number) => L.fn({ x }) - R.fn({ x });
  const probes = [-7.3, 0.37, 2.9, 11.1, 53.7];
  if (probes.every((x) => Math.abs(f(x)) < 1e-9)) return { roots: [], identity: true };
  const coarse = findRoots(f, -400, 400, 16000);
  // polish and snap near-integers / simple fractions
  const roots = coarse.map((x) => { const k = Math.round(x * 12) / 12; return Math.abs(f(k)) < 1e-9 ? k : x; });
  return { roots: [...new Set(roots.map((x) => Math.round(x * 1e9) / 1e9))], identity: false };
}
/** Unique solution of a 2×2 linear system in x, y, or why there is none. */
export function solveSystem(eqs: [string, string]): { x: number; y: number } | { none: 'parallel' | 'same' | 'nonlinear' } {
  const lin = eqs.map((eq) => {
    const [l, r] = sides(eq);
    const L = compile(l), R = compile(r);
    const F = (x: number, y: number) => L.fn({ x, y }) - R.fn({ x, y });
    const c0 = F(0, 0), a = F(1, 0) - c0, b = F(0, 1) - c0;
    const linear = [[2, 3], [-5, 7], [1.5, -4]].every(([x, y]) => Math.abs(F(x, y) - (a * x + b * y + c0)) < 1e-9);
    return { a, b, c: -c0, linear };
  });
  if (!lin.every((e) => e.linear)) return { none: 'nonlinear' };
  const [p, q] = lin;
  const det = p.a * q.b - q.a * p.b;
  if (Math.abs(det) < 1e-12) return { none: Math.abs(p.a * q.c - q.a * p.c) < 1e-9 && Math.abs(p.b * q.c - q.b * p.c) < 1e-9 ? 'same' : 'parallel' };
  return { x: (p.c * q.b - q.c * p.b) / det, y: (p.a * q.c - q.a * p.c) / det };
}

/** The value the question asks for, computed from the spec alone. */
function mathTruth(spec: MathSpec): { value?: number; correctChoice?: number[]; error?: string } {
  switch (spec.t) {
    case 'solve': {
      const { roots, identity } = rootsOf(spec.eq);
      if (identity) return { error: 'the equation is true for every x' };
      if (!roots.length) return { error: 'the equation has no real solution' };
      const pick = spec.root ?? 'only';
      let xs: number[];
      if (pick === 'only') { if (roots.length !== 1) return { error: `expected one solution, found ${roots.length}` }; xs = roots; }
      else if (pick === 'positive') xs = roots.filter((x) => x > 0);
      else if (pick === 'negative') xs = roots.filter((x) => x < 0);
      else if (pick === 'max') xs = [Math.max(...roots)];
      else if (pick === 'min') xs = [Math.min(...roots)];
      else xs = [];
      if (pick === 'sum') return { value: roots.reduce((t, x) => t + x, 0) };
      if (pick === 'product') return { value: roots.reduce((t, x) => t * x, 1) };
      if (xs.length !== 1) return { error: `"${pick}" picks ${xs.length} solutions, not one` };
      return { value: evalExpr(spec.ask ?? 'x', { x: xs[0] }) };
    }
    case 'system': {
      const s = solveSystem(spec.eqs);
      if ('none' in s) return { error: `the system has no unique solution (${s.none})` };
      return { value: evalExpr(spec.ask, s) };
    }
    case 'eval': return { value: evalExpr(spec.expr) };
    case 'pick': {
      const ok = spec.choiceEqs.map((eq) => {
        try {
          const t = spec.test;
          if (t.kind === 'root') { const [l, r] = sides(eq); return near(evalExpr(l, { x: t.x }), evalExpr(r, { x: t.x })); }
          if (t.kind === 'roots') { const r = rootsOf(eq); return !r.identity && r.roots.length === t.xs.length && t.xs.every((x) => r.roots.some((y) => near(x, y))); }
          if (t.kind === 'oneroot') { const r = rootsOf(eq); return !r.identity && r.roots.length === 1; }
          if (t.kind === 'points') { const [l, r] = sides(eq); return t.pts.every(([x, y]) => near(evalExpr(l, { x, y }), evalExpr(r, { x, y }))); }
          const parts = eq.split(';') as [string, string];
          const s = solveSystem(parts);
          if (t.kind === 'nosolution') return 'none' in s && s.none === 'parallel';
          return !('none' in s) && near(s.x, t.x) && near(s.y, t.y);
        } catch { return false; }
      });
      return { correctChoice: ok.flatMap((v, i) => (v ? [i] : [])) };
    }
    case 'pickset': {
      const sat = spec.eqs.map((eq, i) => { const [l, r] = sides(eq); return spec.pts.every(([x, y]) => near(evalExpr(l, { x, y }), evalExpr(r, { x, y }))) ? i : -1; }).filter((i) => i >= 0);
      const key = sat.join(',');
      return { correctChoice: spec.options.flatMap((o, i) => ([...o].sort().join(',') === key ? [i] : [])) };
    }
    case 'steps': {
      const sets = spec.lines.map((l) => { const r = rootsOf(l); return r.identity ? 'all' : r.roots.map((x) => x.toFixed(6)).join(','); });
      const bad = sets.findIndex((s, i) => i > 0 && s !== sets[0]);
      return bad < 1 ? { error: 'no step changes the solution, so there is no error to find' } : { correctChoice: [bad - 1] };
    }
  }
}

function rwTruth(spec: RwSpec): { correctChoice: number[]; error?: string } {
  switch (spec.t) {
    case 'tags': {
      const hits = spec.tags.flatMap((t, i) => (t === spec.want ? [i] : []));
      const clash = spec.avoid?.length ? spec.tags.filter((t) => spec.avoid!.includes(t) && t !== spec.want) : [];
      return { correctChoice: hits, error: new Set(spec.tags).size !== spec.tags.length ? 'two choices carry the same tag (overlap risk)' : clash.length ? `a distractor is too close to the key (${clash.join(', ')})` : undefined };
    }
    case 'data': {
      const by = new Map(spec.rows.map((r) => [r.name, r]));
      const truth = spec.stmts.map((s) => s.claims.every((c) => { const r = by.get(c.row); return !!r && (c.dir === 'up' ? r.b > r.a : r.b < r.a); }));
      return { correctChoice: spec.stmts.flatMap((s, i) => (truth[i] && s.relevant ? [i] : [])) };
    }
    case 'facts': {
      const tagOf = new Map(spec.notes.map((n) => [n.id, n.tag]));
      const outside = spec.choiceFacts.flat().filter((f) => !tagOf.has(f));
      const meets = spec.choiceFacts.map((fs) => spec.requires.every((t) => fs.some((f) => tagOf.get(f) === t)));
      return { correctChoice: meets.flatMap((v, i) => (v ? [i] : [])), error: outside.length ? `a choice uses information not in the notes (${outside.join(', ')})` : undefined };
    }
    case 'grammar': return { correctChoice: spec.options.flatMap((o, i) => (spec.valid.includes(o) ? [i] : [])) };
  }
}

/** Word 8-grams, for originality checks. */
export function grams(text: string, n = 8): Set<string> {
  const w = text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
  const out = new Set<string>();
  for (let i = 0; i + n <= w.length; i++) out.add(w.slice(i, i + n).join(' '));
  return out;
}
const jaccard = (a: Set<string>, b: Set<string>) => { if (!a.size || !b.size) return 0; let k = 0; for (const x of a) if (b.has(x)) k++; return k / (a.size + b.size - k); };

export interface ValidateContext {
  /** passage text of the question this one came from (must differ substantially) */
  originText?: string;
  /** 8-grams of every passage in the bank and any official material on this device (none may be copied) */
  corpus?: Set<string>;
  /** stems+choices of earlier variations from the same original (no duplicates) */
  previous?: string[];
  /** skills this candidate may test (the original's skill, or a sibling in the same domain for some modes) */
  allowedSkills?: string[];
}

export function validate(c: Candidate, ctx: ValidateContext = {}): Validation {
  const checks: Check[] = [];
  const add = (name: string, pass: boolean, detail?: string) => checks.push({ name, pass, detail });
  // 1–2. required fields and clarity
  const mcq = Array.isArray(c.choices);
  add('required fields', !!(c.stem && c.steps.length && c.concept && c.trap && c.hints.every((h) => h.trim().length > 10) && c.why.length && (mcq ? typeof c.answer === 'number' : Array.isArray(c.answer) && c.answer.length > 0)));
  if (mcq) {
    add('four distinct choices', c.choices!.length === 4 && new Set(c.choices!.map((x) => x.trim().toLowerCase())).size === 4);
    add('one rationale per choice', c.why.length === 4);
  }
  add('question is clear', c.stem.trim().endsWith('?') || /Which choice/.test(c.stem), c.stem.slice(0, 60));
  const text = `${c.passage ?? ''} ${(c.notes ?? []).join(' ')} ${c.stem}`;
  add('no unfilled template slots', !/\{[a-z][a-z_]+\}|undefined|NaN|Infinity/.test(`${text} ${(c.choices ?? []).join(' ')} ${c.steps.join(' ')}`));
  // 3. skill classification
  const section = SKILL[c.skill]?.section;
  add('skill classification', !!section && (!ctx.allowedSkills || ctx.allowedSkills.includes(c.skill)), c.skill);
  // 4–7. answer key, distractors, explanation
  let method: Validation['method'] = 'structural';
  if (c.figureFns && c.figure) {
    const f = c.figure;
    const rowsOk = f.kind === 'table' ? f.rows.every((row) => c.figureFns!.every((fn, k) => near(evalExpr(fn, { x: Number(row[0]) }), Number(row[k + 1]))))
      : f.kind === 'scatter' ? f.points.every(([x, y]) => near(evalExpr(c.figureFns![0], { x }), y)) && (!f.fit || near(evalExpr(c.figureFns![0], { x: 0 }), f.fit.b))
      : true;
    add('every table value or plotted point matches its function', rowsOk);
  }
  if ('t' in c.spec && ['solve', 'system', 'eval', 'pick', 'pickset', 'steps'].includes(c.spec.t)) {
    method = 'deterministic';
    const spec = c.spec as MathSpec;
    const truth = mathTruth(spec);
    add('problem is well posed', !truth.error, truth.error);
    if (!truth.error) {
      if (truth.value !== undefined) {
        add('answer is a finite number', Number.isFinite(truth.value), String(truth.value));
        if (mcq) {
          const exprs = (spec as { choiceExprs?: string[] }).choiceExprs ?? c.choices!.map(texToExpr);
          const vals = exprs.map((e) => evalExpr(e));
          const shown = c.choices!.map((ch) => evalExpr(texToExpr(ch)));
          add('every choice displays its own value', vals.every((v, i) => Number.isFinite(shown[i]) ? near(v, shown[i]) : true));
          const hits = vals.flatMap((v, i) => (near(v, truth.value!) ? [i] : []));
          add('exactly one choice is correct', hits.length === 1, `${hits.length} choices equal ${truth.value}`);
          add('answer key matches the solved value', hits[0] === c.answer, `key ${'ABCD'[c.answer as number]}, solved ${'ABCD'[hits[0]] ?? 'none'}`);
          add('distractors are wrong and distinct', new Set(vals.map((v) => v.toFixed(6))).size === 4);
        } else {
          const given = evalExpr(texToExpr((c.answer as string[])[0]));
          add('answer key matches the solved value', near(given, truth.value), `key ${(c.answer as string[])[0]}, solved ${truth.value}`);
        }
      } else {
        const hits = truth.correctChoice ?? [];
        add('exactly one choice is correct', hits.length === 1, `${hits.length} choices pass`);
        add('answer key matches the checked choice', hits[0] === c.answer);
      }
    }
    if (c.figure && c.figure.kind === 'table' && (spec as { t: string }).t !== 'steps' && 'rel' in (c as object)) { /* tables are checked by families via spec */ }
  } else {
    method = 'tags';
    const truth = rwTruth(c.spec as RwSpec);
    add('exactly one defensible answer', truth.correctChoice.length === 1 && !truth.error, truth.error ?? `${truth.correctChoice.length} choices qualify`);
    add('answer key matches the checked choice', truth.correctChoice[0] === c.answer);
    // College Board item checks (official stem wording, 25–150-word passage, no length clue, parallel choices)
    const raw = { id: 'gx-check', skill: c.skill, sub: c.sub, d: 'M', passage: c.passage, notes: c.notes, stem: c.stem, choices: c.choices, answer: c.answer, steps: c.steps, why: c.why, concept: c.concept, strategy: c.strategy, trap: c.trap, remember: c.remember } as RawQuestion;
    const cb = cbSpecChecks(raw);
    add('College Board item checks', cb.length === 0, cb.join('; '));
    if (c.choices) {
      const sets = c.choices.map((x) => new Set(x.toLowerCase().split(/\W+/).filter((w) => w.length > 2)));
      let maxSim = 0;
      for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) maxSim = Math.max(maxSim, jaccard(sets[i], sets[j]));
      add('choices do not overlap', section === 'math' || c.skill === 'bnd' || c.skill === 'fss' || c.skill === 'tra' || maxSim < 0.8, `max similarity ${Math.round(maxSim * 100)}%`);
    }
  }
  add('worked explanation present', c.steps.every((s) => s.trim().length > 3) && c.why.every((w) => w.trim().length > 3));
  // hints must not hand over the answer
  if (mcq) {
    const key = c.choices![c.answer as number];
    // a math key like "$5$" is short but still a giveaway; a short word like "is" is not
    add('hints do not reveal the answer', !c.hints.some((h) => h.includes(key) && (key.length > 3 || key.includes('$'))));
  }
  // 8. originality
  const mine = grams(`${c.passage ?? ''} ${(c.notes ?? []).join(' ')}`);
  const copied = ctx.corpus ? [...mine].filter((g) => ctx.corpus!.has(g)).length : 0;
  add('original wording (no 8-word run copied from the bank or official material)', copied === 0, copied ? `${copied} shared 8-word runs` : undefined);
  if (ctx.originText && words(ctx.originText).length > 20 && (c.passage || c.notes)) {
    const sim = jaccard(new Set(words(ctx.originText.toLowerCase())), new Set(words(`${c.passage ?? ''} ${(c.notes ?? []).join(' ')}`.toLowerCase())));
    add('a genuinely new passage (not the original with a few words swapped)', sim < 0.45, `${Math.round(sim * 100)}% word overlap with the original`);
  }
  if (ctx.previous) {
    const sig = `${c.stem}|${(c.choices ?? []).join('|')}|${c.passage ?? ''}`;
    add('not a duplicate of an earlier variation', !ctx.previous.includes(sig));
  }
  return { ok: checks.every((k) => k.pass), checks, method };
}
export const signature = (c: { stem: string; choices?: string[]; passage?: string }) => `${c.stem}|${(c.choices ?? []).join('|')}|${c.passage ?? ''}`;
