/**
 * A small, safe expression engine for the graphing demos (no eval, no dependencies).
 * Supports + - * / ^, implicit multiplication (2x, 3(x+1), xy), unary minus, parentheses,
 * sqrt abs sin cos tan ln log exp, constants pi and e, and single-letter variables.
 */
type Node =
  | { k: 'num'; v: number } | { k: 'var'; n: string }
  | { k: 'bin'; op: string; a: Node; b: Node } | { k: 'neg'; a: Node } | { k: 'fn'; n: string; a: Node };

const FNS: Record<string, (x: number) => number> = {
  sqrt: Math.sqrt, abs: Math.abs, sin: Math.sin, cos: Math.cos, tan: Math.tan,
  ln: Math.log, log: Math.log10, exp: Math.exp,
};
const FN_NAMES = Object.keys(FNS).sort((a, b) => b.length - a.length);

type Tok = { t: 'num'; v: number } | { t: 'id'; v: string } | { t: 'fn'; v: string } | { t: 'op'; v: string };

function lex(src: string): Tok[] {
  const s = src.replace(/\s+/g, '').replace(/−/g, '-').replace(/×|·/g, '*').replace(/÷/g, '/').replace(/π/g, 'pi');
  const out: Tok[] = [];
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (/[0-9.]/.test(c)) {
      let j = i;
      while (j < s.length && /[0-9.]/.test(s[j])) j++;
      const v = Number(s.slice(i, j));
      if (Number.isNaN(v)) throw new Error('Bad number');
      out.push({ t: 'num', v }); i = j; continue;
    }
    if (/[a-zA-Z]/.test(c)) {
      const rest = s.slice(i).toLowerCase();
      const fn = FN_NAMES.find((f) => rest.startsWith(f) && s[i + f.length] === '(');
      if (fn) { out.push({ t: 'fn', v: fn }); i += fn.length; continue; }
      if (rest.startsWith('pi')) { out.push({ t: 'num', v: Math.PI }); i += 2; continue; }
      out.push({ t: 'id', v: c }); i++; continue;
    }
    if ('+-*/^(),'.includes(c)) { out.push({ t: 'op', v: c }); i++; continue; }
    throw new Error(`Unexpected "${c}"`);
  }
  return out;
}

function parseTokens(toks: Tok[]): Node {
  let p = 0;
  const peek = () => toks[p];
  const isOp = (v: string) => peek()?.t === 'op' && (peek() as { v: string }).v === v;
  const startsAtom = () => { const t = peek(); return !!t && (t.t === 'num' || t.t === 'id' || t.t === 'fn' || (t.t === 'op' && t.v === '(')); };

  function expr(): Node {
    let a = term();
    while (isOp('+') || isOp('-')) { const op = (toks[p++] as { v: string }).v; a = { k: 'bin', op, a, b: term() }; }
    return a;
  }
  function term(): Node {
    let a = unary();
    for (;;) {
      if (isOp('*') || isOp('/')) { const op = (toks[p++] as { v: string }).v; a = { k: 'bin', op, a, b: unary() }; }
      else if (startsAtom()) a = { k: 'bin', op: '*', a, b: power() }; // implicit multiplication
      else return a;
    }
  }
  function unary(): Node {
    if (isOp('-')) { p++; return { k: 'neg', a: unary() }; }
    if (isOp('+')) { p++; return unary(); }
    return power();
  }
  function power(): Node {
    const base = atom();
    if (isOp('^')) { p++; return { k: 'bin', op: '^', a: base, b: unary() }; }
    return base;
  }
  function atom(): Node {
    const t = toks[p++];
    if (!t) throw new Error('Unexpected end');
    if (t.t === 'num') return { k: 'num', v: t.v };
    if (t.t === 'id') return t.v === 'e' ? { k: 'num', v: Math.E } : { k: 'var', n: t.v };
    if (t.t === 'fn') {
      if (!isOp('(')) throw new Error('Expected (');
      p++; const a = expr();
      if (!isOp(')')) throw new Error('Expected )');
      p++; return { k: 'fn', n: t.v, a };
    }
    if (t.t === 'op' && t.v === '(') { const a = expr(); if (!isOp(')')) throw new Error('Expected )'); p++; return a; }
    throw new Error('Unexpected token');
  }
  const out = expr();
  if (p < toks.length) throw new Error('Unexpected trailing input');
  return out;
}

function evalNode(n: Node, v: Record<string, number>): number {
  switch (n.k) {
    case 'num': return n.v;
    case 'var': return v[n.n] ?? NaN;
    case 'neg': return -evalNode(n.a, v);
    case 'fn': return FNS[n.n](evalNode(n.a, v));
    case 'bin': {
      const a = evalNode(n.a, v), b = evalNode(n.b, v);
      return n.op === '+' ? a + b : n.op === '-' ? a - b : n.op === '*' ? a * b : n.op === '/' ? a / b : Math.pow(a, b);
    }
  }
}
function vars(n: Node, acc = new Set<string>()): Set<string> {
  if (n.k === 'var') acc.add(n.n);
  else if (n.k === 'bin') { vars(n.a, acc); vars(n.b, acc); }
  else if (n.k === 'neg' || n.k === 'fn') vars(n.a, acc);
  return acc;
}

export interface Compiled { fn: (v: Record<string, number>) => number; vars: Set<string> }
export function compile(src: string): Compiled {
  const ast = parseTokens(lex(src));
  return { fn: (v) => evalNode(ast, v), vars: vars(ast) };
}

export type Relation =
  | { kind: 'explicit'; op: '=' | '<' | '>' | '<=' | '>='; f: (x: number, p: Record<string, number>) => number; params: string[]; domain?: [number, number] }
  | { kind: 'vertical'; c: (p: Record<string, number>) => number; params: string[] }
  | { kind: 'implicit'; F: (x: number, y: number, p: Record<string, number>) => number; params: string[] };

/** Parses "y = 2x + 1", "x^2 + y^2 = 25", "y > 2x - 1", "x = 3", "x^2 - 4 {0 <= x <= 5}". Throws on bad input. */
export function parseRelation(input: string): Relation {
  let src = input.trim();
  let domain: [number, number] | undefined;
  const dm = src.match(/\{([^}]*)\}\s*$/);
  if (dm) {
    src = src.slice(0, dm.index).trim();
    const d = dm[1].replace(/\s+/g, '').replace(/≤/g, '<=').replace(/≥/g, '>=');
    const both = d.match(/^(-?[\d.]+)<=?x<=?(-?[\d.]+)$/);
    const lo = d.match(/^x>=?(-?[\d.]+)$/), hi = d.match(/^x<=?(-?[\d.]+)$/);
    domain = both ? [Number(both[1]), Number(both[2])] : lo ? [Number(lo[1]), Infinity] : hi ? [-Infinity, Number(hi[1])] : undefined;
  }
  src = src.replace(/≤/g, '<=').replace(/≥/g, '>=');
  const m = src.match(/(<=|>=|=|<|>)/);
  if (!m) {
    const c = compile(src);
    if (c.vars.has('y')) throw new Error('Add "= ..." to make an equation');
    return { kind: 'explicit', op: '=', f: (x, p) => c.fn({ ...p, x }), params: [...c.vars].filter((v) => v !== 'x'), domain };
  }
  const op = m[1] as '=' | '<' | '>' | '<=' | '>=';
  const lhsS = src.slice(0, m.index).trim(), rhsS = src.slice(m.index! + op.length).trim();
  const L = compile(lhsS), R = compile(rhsS);
  const params = [...new Set([...L.vars, ...R.vars])].filter((v) => v !== 'x' && v !== 'y');
  const flip: Record<string, typeof op> = { '<': '>', '>': '<', '<=': '>=', '>=': '<=', '=': '=' };
  if (lhsS === 'y' && !R.vars.has('y')) return { kind: 'explicit', op, f: (x, p) => R.fn({ ...p, x }), params, domain };
  if (rhsS === 'y' && !L.vars.has('y')) return { kind: 'explicit', op: flip[op], f: (x, p) => L.fn({ ...p, x }), params, domain };
  if (op === '=' && lhsS === 'x' && !R.vars.has('x') && !R.vars.has('y')) return { kind: 'vertical', c: (p) => R.fn(p), params };
  if (op !== '=') throw new Error('Write inequalities with y alone on one side, e.g. y > 2x - 1');
  return { kind: 'implicit', F: (x, y, p) => L.fn({ ...p, x, y }) - R.fn({ ...p, x, y }), params };
}

/** Real roots of f on [lo, hi] by scanning for sign changes and bisecting. */
export function findRoots(f: (x: number) => number, lo: number, hi: number, n = 1200): number[] {
  const out: number[] = [];
  const push = (x: number) => { if (!out.some((y) => Math.abs(y - x) < (hi - lo) * 1e-4)) out.push(x); };
  let px = lo, py = f(lo);
  for (let i = 1; i <= n; i++) {
    const x = lo + ((hi - lo) * i) / n, y = f(x);
    if (Number.isFinite(py) && Number.isFinite(y)) {
      if (py === 0) push(px);
      else if (py * y < 0) {
        let a = px, b = x, fa = py;
        for (let k = 0; k < 60; k++) { const mid = (a + b) / 2, fm = f(mid); if (fa * fm <= 0) b = mid; else { a = mid; fa = fm; } }
        const r = (a + b) / 2;
        if (Math.abs(f(r)) < 1e-3 * Math.max(1, Math.abs(py), Math.abs(y))) push(r);
      } else if (Math.abs(y) < 1e-7 && Math.abs(py) > Math.abs(y)) {
        const nx = lo + ((hi - lo) * (i + 1)) / n; // tangent touch: local minimum of |f| near zero
        if (Math.abs(f(nx)) > Math.abs(y)) push(x);
      }
    }
    px = x; py = y;
  }
  return out.sort((a, b) => a - b);
}

/** Local extrema of f on [lo, hi] via sign changes of a numerical derivative. */
export function findExtrema(f: (x: number) => number, lo: number, hi: number): number[] {
  const h = (hi - lo) * 1e-5;
  return findRoots((x) => (f(x + h) - f(x - h)) / (2 * h), lo + h, hi - h, 800);
}

/** If F(x, y) is affine in y, returns the equivalent y = g(x); otherwise null. */
export function affineInY(F: (x: number, y: number) => number): ((x: number) => number) | null {
  for (const x of [-2.3, 0.7, 1.9, 4.1]) {
    const f0 = F(x, 0), f1 = F(x, 1), f2 = F(x, 2);
    if (![f0, f1, f2].every(Number.isFinite)) return null;
    if (Math.abs(f2 - 2 * f1 + f0) > 1e-9 || Math.abs(f1 - f0) < 1e-12) return null;
  }
  return (x) => -F(x, 0) / (F(x, 1) - F(x, 0));
}

// ── least-squares regression ──────────────────────────────────────────────────────────────
export function linearFit(pts: [number, number][]) {
  const n = pts.length, sx = pts.reduce((s, p) => s + p[0], 0), sy = pts.reduce((s, p) => s + p[1], 0);
  const sxx = pts.reduce((s, p) => s + p[0] * p[0], 0), sxy = pts.reduce((s, p) => s + p[0] * p[1], 0);
  const m = (n * sxy - sx * sy) / (n * sxx - sx * sx), b = (sy - m * sx) / n;
  return { m, b, f: (x: number) => m * x + b, label: `y = ${fmt(m)}x ${b < 0 ? '−' : '+'} ${fmt(Math.abs(b))}` };
}
export function expFit(pts: [number, number][]) {
  const lin = linearFit(pts.filter((p) => p[1] > 0).map((p) => [p[0], Math.log(p[1])] as [number, number]));
  const a = Math.exp(lin.b), b = Math.exp(lin.m);
  return { a, b, f: (x: number) => a * Math.pow(b, x), label: `y = ${fmt(a)}(${fmt(b)})^x` };
}
export function quadFit(pts: [number, number][]) {
  const S = (k: number) => pts.reduce((s, p) => s + p[0] ** k, 0), T = (k: number) => pts.reduce((s, p) => s + p[0] ** k * p[1], 0);
  const A = [[S(4), S(3), S(2)], [S(3), S(2), S(1)], [S(2), S(1), pts.length]], B = [T(2), T(1), T(0)];
  const det = (m: number[][]) => m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
  const D = det(A);
  const col = (i: number) => det(A.map((row, r) => row.map((v, c) => (c === i ? B[r] : v))));
  const [a, b, c] = [col(0) / D, col(1) / D, col(2) / D];
  return { a, b, c, f: (x: number) => a * x * x + b * x + c, label: `y = ${fmt(a)}x² ${b < 0 ? '−' : '+'} ${fmt(Math.abs(b))}x ${c < 0 ? '−' : '+'} ${fmt(Math.abs(c))}` };
}
export const fmt = (x: number) => { const r = Math.round(x * 1000) / 1000; return Object.is(r, -0) ? '0' : String(r); };
