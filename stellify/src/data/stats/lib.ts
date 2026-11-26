/**
 * A small statistics library used only to verify AP Statistics answers independently (normal, t and
 * chi-square distributions, binomial and geometric probabilities, quartiles, regression). Methods:
 * erf via a high-precision rational approximation, the regularized incomplete beta function by
 * continued fraction (t), the regularized lower incomplete gamma by series and continued fraction
 * (chi-square), and inverses by bisection.
 */
export const sum = (a: number[]) => a.reduce((s, x) => s + x, 0);
export const mean = (a: number[]) => sum(a) / a.length;
/** sample standard deviation (n − 1) */
export const sd = (a: number[]) => { const m = mean(a); return Math.sqrt(sum(a.map((x) => (x - m) ** 2)) / (a.length - 1)); };
export const median = (a: number[]) => { const s = [...a].sort((x, y) => x - y), n = s.length; return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2; };
/** Q1 and Q3 as the AP course computes them: medians of the lower and upper halves (the median left out when n is odd). */
export function quartiles(a: number[]): [number, number] {
  const s = [...a].sort((x, y) => x - y), n = s.length, h = Math.floor(n / 2);
  return [median(s.slice(0, h)), median(s.slice(n % 2 ? h + 1 : h))];
}
export const round = (x: number, d: number) => Math.round(x * 10 ** d) / 10 ** d;
export const near = (a: number, b: number, tol = 1e-6) => Math.abs(a - b) <= tol;

// ─── normal ───
function erf(x: number): number {
  // W. J. Cody-style rational approximation (absolute error below 1.2e-7)
  const t = 1 / (1 + 0.5 * Math.abs(x));
  const y = 1 - t * Math.exp(-x * x - 1.26551223 + t * (1.00002368 + t * (0.37409196 + t * (0.09678418 + t * (-0.18628806 + t * (0.27886807 + t * (-1.13520398 + t * (1.48851587 + t * (-0.82215223 + t * 0.17087277)))))))));
  return x >= 0 ? y : -y;
}
export const normCdf = (z: number, mu = 0, sigma = 1) => 0.5 * (1 + erf((z - mu) / (sigma * Math.SQRT2)));
export const normBetween = (a: number, b: number, mu = 0, sigma = 1) => normCdf(b, mu, sigma) - normCdf(a, mu, sigma);
export function invNorm(p: number, mu = 0, sigma = 1): number {
  let lo = -10, hi = 10;
  for (let i = 0; i < 100; i++) { const m = (lo + hi) / 2; if (normCdf(m) < p) lo = m; else hi = m; }
  return mu + sigma * (lo + hi) / 2;
}

// ─── gamma and beta ───
export function lgamma(x: number): number {
  const c = [76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5];
  let y = x, tmp = x + 5.5;
  tmp -= (x + 0.5) * Math.log(tmp);
  let ser = 1.000000000190015;
  for (const k of c) ser += k / ++y;
  return -tmp + Math.log((2.5066282746310005 * ser) / x);
}
function betacf(a: number, b: number, x: number): number {
  const MAXIT = 300, EPS = 3e-14, FPMIN = 1e-300;
  let c = 1, d = 1 - ((a + b) * x) / (a + 1);
  if (Math.abs(d) < FPMIN) d = FPMIN;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= MAXIT; m++) {
    const m2 = 2 * m;
    let aa = (m * (b - m) * x) / ((a - 1 + m2) * (a + m2));
    d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN; c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN; d = 1 / d; h *= d * c;
    aa = (-(a + m) * (a + b + m) * x) / ((a + m2) * (a + 1 + m2));
    d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN; c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN; d = 1 / d;
    const del = d * c; h *= del;
    if (Math.abs(del - 1) < EPS) break;
  }
  return h;
}
/** regularized incomplete beta I_x(a, b) */
export function ibeta(x: number, a: number, b: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const bt = Math.exp(lgamma(a + b) - lgamma(a) - lgamma(b) + a * Math.log(x) + b * Math.log(1 - x));
  return x < (a + 1) / (a + b + 2) ? (bt * betacf(a, b, x)) / a : 1 - (bt * betacf(b, a, 1 - x)) / b;
}
/** regularized lower incomplete gamma P(a, x) */
export function gammp(a: number, x: number): number {
  if (x <= 0) return 0;
  if (x < a + 1) {
    let ap = a, del = 1 / a, s = del;
    for (let n = 0; n < 500; n++) { ap++; del *= x / ap; s += del; if (Math.abs(del) < Math.abs(s) * 1e-15) break; }
    return s * Math.exp(-x + a * Math.log(x) - lgamma(a));
  }
  let b = x + 1 - a, c = 1e300, d = 1 / b, h = d;
  for (let i = 1; i < 500; i++) {
    const an = -i * (i - a); b += 2;
    d = an * d + b; if (Math.abs(d) < 1e-300) d = 1e-300; c = b + an / c; if (Math.abs(c) < 1e-300) c = 1e-300; d = 1 / d;
    const del = d * c; h *= del; if (Math.abs(del - 1) < 1e-15) break;
  }
  return 1 - Math.exp(-x + a * Math.log(x) - lgamma(a)) * h;
}

// ─── t and chi-square ───
export function tCdf(t: number, df: number): number {
  const x = df / (df + t * t);
  const tail = 0.5 * ibeta(x, df / 2, 0.5);
  return t >= 0 ? 1 - tail : tail;
}
export function invT(p: number, df: number): number {
  let lo = -50, hi = 50;
  for (let i = 0; i < 120; i++) { const m = (lo + hi) / 2; if (tCdf(m, df) < p) lo = m; else hi = m; }
  return (lo + hi) / 2;
}
/** critical value t* for a central confidence level C (e.g. 0.95) */
export const tStar = (C: number, df: number) => invT(1 - (1 - C) / 2, df);
export const zStar = (C: number) => invNorm(1 - (1 - C) / 2);
export const chi2Cdf = (x: number, df: number) => gammp(df / 2, x / 2);

// ─── discrete ───
export function choose(n: number, k: number): number { let r = 1; for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i; return r; }
export const binomPdf = (n: number, p: number, k: number) => choose(n, k) * p ** k * (1 - p) ** (n - k);
export const binomCdf = (n: number, p: number, k: number) => { let s = 0; for (let i = 0; i <= k; i++) s += binomPdf(n, p, i); return s; };
export const geomPdf = (p: number, k: number) => (1 - p) ** (k - 1) * p;
export const geomCdf = (p: number, k: number) => 1 - (1 - p) ** k;

// ─── two variables ───
export function regression(x: number[], y: number[]) {
  const mx = mean(x), my = mean(y);
  const sxy = sum(x.map((xi, i) => (xi - mx) * (y[i] - my))), sxx = sum(x.map((xi) => (xi - mx) ** 2)), syy = sum(y.map((yi) => (yi - my) ** 2));
  const b = sxy / sxx, a = my - b * mx, r = sxy / Math.sqrt(sxx * syy);
  return { a, b, r, r2: r * r };
}

/** interquartile range, Q3 − Q1 (AP method) */
export const iqrOf = (a: number[]) => { const [q1, q3] = quartiles(a); return q3 - q1; };
