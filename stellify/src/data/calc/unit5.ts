import type { CalcLesson, CalcProblem } from './types';
import { d, d2, near } from './types';

const r = String.raw;
const P = (id: string, level: 1 | 2 | 3, q: string, answer: number | string[], hint: string, solution: string[], extra: Partial<CalcProblem> = {}): CalcProblem => ({ id, level, q, answer, hint, solution, ...extra });
/** largest and smallest value of f on [a, b] by dense sampling (for checks) */
const extremes = (f: (x: number) => number, a: number, b: number) => { let lo = Infinity, hi = -Infinity; for (let i = 0; i <= 20000; i++) { const y = f(a + ((b - a) * i) / 20000); lo = Math.min(lo, y); hi = Math.max(hi, y); } return { lo, hi }; };

/** Unit 5 · Analytical Applications of Differentiation. Original lessons and problems. */
export const UNIT5: CalcLesson[] = [
  {
    id: 'c5-1', unit: 5, n: 1, title: 'The Mean Value Theorem and critical points',
    intro: 'Today we meet the theorems that connect a function to its derivative. The Mean Value Theorem guarantees that somewhere, the instantaneous rate equals the average rate. The Extreme Value Theorem guarantees a maximum and minimum exist. And critical points tell us where to look for them.',
    goals: ['State and apply the Mean Value Theorem', 'Check its conditions', 'Find critical points', 'State the Extreme Value Theorem'],
    notes: [
      { k: 'rule', title: 'Mean Value Theorem (MVT)', t: r`If $f$ is continuous on $[a, b]$ and differentiable on $(a, b)$, then there is at least one $c$ in $(a, b)$ with $f'(c) = \dfrac{f(b) - f(a)}{b - a}$.` },
      { k: 'p', t: r`In words: at some moment, your speedometer reading equals your average speed for the whole trip. Geometrically, some tangent line is parallel to the secant line.` },
      { k: 'rule', title: 'Extreme Value Theorem (EVT)', t: r`If $f$ is continuous on a closed interval $[a, b]$, then $f$ has an absolute maximum and an absolute minimum on $[a, b]$.` },
      { k: 'rule', title: 'Critical point', t: r`$x = c$ is a critical point of $f$ if $c$ is in the domain and $f'(c) = 0$ or $f'(c)$ does not exist. Relative extrema can only happen at critical points.` },
      { k: 'warn', t: r`Before using the MVT on free response, state both conditions explicitly. A function like $|x|$ on $[-1, 1]$ fails differentiability, so the MVT does not apply.` },
      { k: 'tip', t: r`Table version: if $f$ is differentiable and $f(1) = 4$, $f(5) = 12$, then the MVT guarantees $f'(c) = \frac{12 - 4}{5 - 1} = 2$ for some $c$ in $(1, 5)$.` },
    ],
    examples: [
      { q: r`Find the value $c$ guaranteed by the MVT for $f(x) = x^2$ on $[1, 3]$.`, steps: [r`Average rate: $\frac{9 - 1}{2} = 4$.`, r`$f'(c) = 2c = 4$, so $c = 2$, which is in $(1, 3)$.`], a: '2' },
      { q: r`Find the critical points of $f(x) = x^{2/3}(x - 5)$.`, steps: [r`$f(x) = x^{5/3} - 5x^{2/3}$, $f'(x) = \frac{5}{3}x^{2/3} - \frac{10}{3}x^{-1/3} = \frac{5(x - 2)}{3x^{1/3}}$.`, r`$f' = 0$ at $x = 2$; $f'$ undefined at $x = 0$. Critical points: $0$ and $2$.`], a: '0 and 2' },
    ],
    practice: [
      P('c5-1-1', 2, r`Find the value of $c$ guaranteed by the MVT for $f(x) = x^3$ on $[0, 3]$ (three decimal places).`, ['1.732', 'sqrt(3)'], 'Average rate first, then solve 3c² = it.', [r`Average rate: $\frac{27 - 0}{3} = 9$.`, r`$3c^2 = 9$, $c = \sqrt{3} \approx 1.732$.`], { check: () => near(d((x) => x ** 3, Math.sqrt(3)), 9) }),
      P('c5-1-2', 1, r`Find the value of $c$ guaranteed by the MVT for $f(x) = x^2 - 4x$ on $[0, 5]$.`, ['2.5', '5/2'], "f'(c) = average rate.", [r`Average rate: $\frac{5 - 0}{5} = 1$.`, r`$2c - 4 = 1$, $c = 2.5$.`], { check: () => near(d((x) => x * x - 4 * x, 2.5), 1) }),
      P('c5-1-3', 1, r`Does the MVT apply to $f(x) = |x|$ on $[-1, 1]$?`, 1, 'Check both conditions.', [r`$f$ is continuous, but not differentiable at $x = 0$. The MVT does not apply (and indeed no slope equals the average rate 0).`], { choices: ['Yes', 'No, because f is not differentiable at x = 0', 'No, because f is not continuous', 'Yes, with c = 0'] }),
      P('c5-1-4', 1, r`How many critical points does $f(x) = x^3 - 3x^2$ have?`, ['2'], "Solve f'(x) = 0.", [r`$f'(x) = 3x^2 - 6x = 3x(x - 2) = 0$ at $x = 0$ and $x = 2$.`], { check: () => near(d((x) => x ** 3 - 3 * x * x, 0), 0) && near(d((x) => x ** 3 - 3 * x * x, 2), 0) }),
      P('c5-1-5', 2, r`$f$ is differentiable, $f(1) = 4$ and $f(5) = 12$. The MVT guarantees $f'(c) = k$ for some $c$ in $(1, 5)$. What is $k$?`, ['2'], 'Average rate over [1, 5].', [r`$\frac{12 - 4}{5 - 1} = 2$.`], { check: () => (12 - 4) / 4 === 2 }),
      P('c5-1-6', 3, r`Find the value of $c$ guaranteed by the MVT for $f(x) = \ln x$ on $[1, e]$ (three decimal places).`, ['1.718', 'e-1'], 'Average rate is 1/(e − 1).', [r`Average rate: $\frac{1 - 0}{e - 1} = \frac{1}{e - 1}$.`, r`$\frac{1}{c} = \frac{1}{e - 1}$, so $c = e - 1 \approx 1.718$.`], { check: () => near(d(Math.log, Math.E - 1), 1 / (Math.E - 1)) }),
    ],
    remember: ['MVT: continuous on [a, b] and differentiable on (a, b) ⇒ f′(c) = average rate.', 'EVT: continuous on a closed interval ⇒ absolute max and min exist.', "Critical points: f' = 0 or f' undefined."],
    checkIn: 'Write the two MVT conditions from memory. Next: using f′ to see where f rises and falls.',
  },
  {
    id: 'c5-2', unit: 5, n: 2, title: 'Increasing, decreasing and the first derivative test',
    intro: 'The sign of the derivative tells you everything about where a function rises and falls. Today you build sign charts, find relative maxima and minima, and learn the exact justification sentences the AP readers want.',
    goals: ['Find intervals of increase and decrease', 'Apply the first derivative test', 'Write correct justifications'],
    notes: [
      { k: 'rule', title: 'Increasing / decreasing', t: r`If $f'(x) > 0$ on an interval, $f$ is increasing there. If $f'(x) < 0$, $f$ is decreasing.` },
      { k: 'rule', title: 'First derivative test', t: r`At a critical point $c$: if $f'$ changes from $+$ to $-$, $f$ has a relative maximum; from $-$ to $+$, a relative minimum; no sign change, no extremum.` },
      { k: 'list', items: [r`1. Find $f'(x)$ and the critical points.`, r`2. Mark them on a number line.`, r`3. Test the sign of $f'$ in each interval.`, r`4. Read off increase/decrease and extrema.`] },
      { k: 'tip', t: r`Justification template: “$f$ has a relative maximum at $x = 2$ because $f'$ changes from positive to negative at $x = 2$.” Talk about $f'$, not about $f$.` },
      { k: 'warn', t: r`A critical point where $f'$ does not change sign (like $x^3$ at 0) is NOT an extremum.` },
    ],
    examples: [
      { q: r`Find the relative extrema of $f(x) = x^3 - 12x$.`, steps: [r`$f'(x) = 3x^2 - 12 = 3(x - 2)(x + 2)$.`, r`Sign of $f'$: $+$ on $(-\infty, -2)$, $-$ on $(-2, 2)$, $+$ on $(2, \infty)$.`, r`Relative max at $x = -2$, relative min at $x = 2$.`], a: 'max at −2, min at 2' },
      { q: r`Where is $f(x) = xe^{-x}$ increasing?`, steps: [r`$f'(x) = e^{-x}(1 - x)$. $e^{-x} > 0$ always.`, r`$f' > 0$ when $x < 1$: increasing on $(-\infty, 1)$.`], a: '(−∞, 1)' },
    ],
    practice: [
      P('c5-2-1', 1, r`At what $x$ does $f(x) = x^3 - 12x$ have a relative maximum?`, ['-2'], "f' changes from + to − there.", [r`$f' = 3(x - 2)(x + 2)$ changes from $+$ to $-$ at $x = -2$.`], { check: () => d((x) => x ** 3 - 12 * x, -2.1) > 0 && d((x) => x ** 3 - 12 * x, -1.9) < 0 }),
      P('c5-2-2', 1, r`At what $x$ does $f(x) = xe^{-x}$ have a relative maximum?`, ['1'], "f'(x) = e^(−x)(1 − x).", [r`$f'$ changes from $+$ to $-$ at $x = 1$.`], { check: () => d((x) => x * Math.exp(-x), 0.9) > 0 && d((x) => x * Math.exp(-x), 1.1) < 0 }),
      P('c5-2-3', 2, r`$f(x) = x^4 - 4x^3$. At what $x$ does $f$ have a relative minimum?`, ['3'], "Factor f'(x) = 4x²(x − 3).", [r`$f' = 4x^2(x - 3)$: negative on both sides of 0 (no extremum there), changes $-$ to $+$ at 3.`, r`Relative minimum at $x = 3$.`], { check: () => { const g = (x: number) => d((t) => t ** 4 - 4 * t ** 3, x); return g(-0.1) < 0 && g(0.1) < 0 && g(2.9) < 0 && g(3.1) > 0; } }),
      P('c5-2-4', 2, r`$f'(x) = (x - 1)^2(x + 2)$. How many relative extrema does $f$ have?`, ['1'], 'Where does f′ change sign?', [r`$(x - 1)^2 \ge 0$, so the sign of $f'$ is the sign of $x + 2$. It changes only at $x = -2$.`, r`One relative extremum (a minimum at $x = -2$).`], { check: () => { const fp = (x: number) => (x - 1) ** 2 * (x + 2); return fp(-3) < 0 && fp(-1) > 0 && fp(0.9) > 0 && fp(1.1) > 0; } }),
      P('c5-2-5', 1, r`$f'$ changes from positive to negative at $x = 4$. At $x = 4$, $f$ has…`, 0, 'Rising then falling.', [r`$f$ increases and then decreases: a relative maximum.`], { choices: ['a relative maximum', 'a relative minimum', 'a point of inflection', 'no extremum'] }),
      P('c5-2-6', 3, r`Find the critical point of $f(x) = x^2\ln x$ (three decimal places).`, ['0.607', '0.6065'], "f'(x) = x(2 ln x + 1).", [r`$f'(x) = 2x\ln x + x = x(2\ln x + 1)$.`, r`For $x > 0$: $\ln x = -\frac{1}{2}$, $x = e^{-1/2} \approx 0.607$.`], { check: () => Math.abs(d((x) => x * x * Math.log(x), Math.exp(-0.5))) < 1e-6 }),
    ],
    remember: ["f' > 0 → increasing; f' < 0 → decreasing.", "Max where f' goes + to −; min where − to +.", 'Justify with the sign change of f′.'],
    checkIn: 'Can you write the justification sentence without looking? Next: absolute extrema on closed intervals.',
  },
  {
    id: 'c5-3', unit: 5, n: 3, title: 'Absolute extrema: the candidates test',
    intro: 'Relative extrema are local bumps; absolute extrema are the very highest and lowest values on an interval. On a closed interval there is a beautifully simple method: list the candidates, evaluate, compare.',
    goals: ['Find absolute extrema on a closed interval', 'Include endpoints as candidates', 'Justify with the candidates test'],
    notes: [
      { k: 'rule', title: 'Candidates (closed interval) test', t: r`To find the absolute max and min of a continuous $f$ on $[a, b]$: evaluate $f$ at every critical point in $(a, b)$ and at both endpoints. The largest value is the absolute max; the smallest is the absolute min.` },
      { k: 'tip', t: r`Make a small table of $x$ and $f(x)$ for the candidates. On free response, that table IS the justification.` },
      { k: 'warn', t: r`Endpoints count! Many absolute extrema happen at an endpoint, where $f'$ need not be zero.` },
      { k: 'p', t: r`The question may ask for the $x$-value where the max occurs, or the maximum VALUE. Read carefully.` },
      { k: 'p', t: r`If the interval is open or infinite, use the first derivative test on the whole interval and check end behavior instead.` },
    ],
    examples: [
      { q: r`Find the absolute extrema of $f(x) = x^3 - 3x$ on $[0, 2]$.`, steps: [r`$f'(x) = 3x^2 - 3 = 0$ at $x = 1$ (and $-1$, outside).`, r`$f(0) = 0$, $f(1) = -2$, $f(2) = 2$.`, r`Absolute max $2$ at $x = 2$; absolute min $-2$ at $x = 1$.`], a: 'max 2, min −2' },
      { q: r`Absolute max of $f(x) = \sin x + \cos x$ on $[0, \pi]$.`, steps: [r`$f' = \cos x - \sin x = 0$ at $x = \frac{\pi}{4}$.`, r`$f(0) = 1$, $f(\frac{\pi}{4}) = \sqrt{2}$, $f(\pi) = -1$.`, r`Max $\sqrt{2}$.`], a: '√2' },
    ],
    practice: [
      P('c5-3-1', 1, r`Find the absolute maximum value of $f(x) = x^3 - 3x$ on $[-2, 3]$.`, ['18'], 'Candidates: −2, −1, 1, 3.', [r`$f(-2) = -2$, $f(-1) = 2$, $f(1) = -2$, $f(3) = 18$.`, r`Absolute max: $18$.`], { check: () => near(extremes((x) => x ** 3 - 3 * x, -2, 3).hi, 18) }),
      P('c5-3-2', 1, r`Find the absolute minimum value of $f(x) = x^3 - 3x$ on $[-2, 3]$.`, ['-2'], 'Same candidates.', [r`The smallest candidate value is $-2$ (at $x = -2$ and $x = 1$).`], { check: () => near(extremes((x) => x ** 3 - 3 * x, -2, 3).lo, -2) }),
      P('c5-3-3', 2, r`Find the absolute minimum value of $f(x) = x + \dfrac{4}{x}$ on $[1, 4]$.`, ['4'], "f'(x) = 1 − 4/x².", [r`$f' = 0$ at $x = 2$. $f(1) = 5$, $f(2) = 4$, $f(4) = 5$.`, r`Absolute min: $4$.`], { check: () => near(extremes((x) => x + 4 / x, 1, 4).lo, 4) }),
      P('c5-3-4', 2, r`Find the absolute maximum value of $f(x) = \sin x + \cos x$ on $[0, \pi]$ (three decimal places).`, ['1.414', 'sqrt(2)'], 'Critical point at π/4.', [r`$f(\frac{\pi}{4}) = \sqrt{2} \approx 1.414$ beats $f(0) = 1$ and $f(\pi) = -1$.`], { check: () => near(extremes((x) => Math.sin(x) + Math.cos(x), 0, Math.PI).hi, Math.SQRT2) }),
      P('c5-3-5', 2, r`Find the absolute maximum value of $f(x) = xe^{-x}$ on $[0, 3]$ (three decimal places).`, ['0.368', '1/e'], 'Critical point at x = 1.', [r`$f(0) = 0$, $f(1) = e^{-1} \approx 0.368$, $f(3) = 3e^{-3} \approx 0.149$.`], { check: () => near(extremes((x) => x * Math.exp(-x), 0, 3).hi, 1 / Math.E) }),
      P('c5-3-6', 3, r`For $f(x) = 2x^3 - 9x^2 + 12x$ on $[0, 3]$, find (absolute max) − (absolute min).`, ['9'], "f'(x) = 6(x − 1)(x − 2).", [r`$f(0) = 0$, $f(1) = 5$, $f(2) = 4$, $f(3) = 9$.`, r`Max 9, min 0, difference $9$.`], { check: () => { const e = extremes((x) => 2 * x ** 3 - 9 * x * x + 12 * x, 0, 3); return near(e.hi - e.lo, 9); } }),
    ],
    remember: ['Candidates: critical points inside + both endpoints.', 'Biggest value = absolute max; smallest = absolute min.', 'Answer the question asked: x-value or value.'],
    checkIn: 'Notice how often the endpoint won in these problems. Next: concavity and the second derivative.',
  },
  {
    id: 'c5-4', unit: 5, n: 4, title: 'Concavity and the second derivative test',
    intro: 'The first derivative tells you direction; the second derivative tells you the bend. Today you find where a graph is concave up or down, locate points of inflection, and use the second derivative as a shortcut to classify extrema.',
    goals: ['Determine concavity from f″', 'Find points of inflection', 'Apply the second derivative test'],
    notes: [
      { k: 'rule', title: 'Concavity', t: r`If $f''(x) > 0$, $f$ is concave up (holds water, slopes increasing). If $f''(x) < 0$, $f$ is concave down (slopes decreasing).` },
      { k: 'rule', title: 'Point of inflection', t: r`A point where $f$ is continuous and the concavity changes, which means $f''$ changes sign.` },
      { k: 'rule', title: 'Second derivative test', t: r`If $f'(c) = 0$ and $f''(c) > 0$, relative minimum. If $f'(c) = 0$ and $f''(c) < 0$, relative maximum. If $f''(c) = 0$, the test is inconclusive.` },
      { k: 'warn', t: r`$f''(c) = 0$ does not by itself make an inflection point: $x^4$ has $f''(0) = 0$ but is concave up on both sides. You need a sign change.` },
      { k: 'tip', t: r`Concave up ⇔ $f'$ increasing. So on a graph of $f'$, inflection points of $f$ are where $f'$ has its peaks and valleys.` },
    ],
    examples: [
      { q: r`Find the inflection point of $f(x) = x^3 - 6x^2$.`, steps: [r`$f''(x) = 6x - 12$.`, r`$f''$ changes sign at $x = 2$: inflection point at $x = 2$.`], a: 'x = 2' },
      { q: r`Classify the critical points of $f(x) = x^3 - 3x$ with the second derivative test.`, steps: [r`$f' = 0$ at $x = \pm 1$; $f'' = 6x$.`, r`$f''(1) = 6 > 0$: min. $f''(-1) = -6 < 0$: max.`], a: 'min at 1, max at −1' },
    ],
    practice: [
      P('c5-4-1', 1, r`At what $x$ does $f(x) = x^3 - 6x^2 + 5$ have a point of inflection?`, ['2'], "Where does f'' change sign?", [r`$f'' = 6x - 12$ changes sign at $x = 2$.`], { check: () => d2((x) => x ** 3 - 6 * x * x + 5, 1.9) < 0 && d2((x) => x ** 3 - 6 * x * x + 5, 2.1) > 0 }),
      P('c5-4-2', 2, r`How many points of inflection does $f(x) = x^4 - 6x^2$ have?`, ['2'], "f'' = 12x² − 12.", [r`$f'' = 12(x - 1)(x + 1)$ changes sign at $x = \pm 1$: two inflection points.`], { check: () => { const g = (x: number) => d2((t) => t ** 4 - 6 * t * t, x); return g(-1.1) > 0 && g(0) < 0 && g(1.1) > 0; } }),
      P('c5-4-3', 1, r`For $f(x) = x^3 - 3x$, the critical point $x = 1$ is…`, 1, "Check the sign of f''(1).", [r`$f''(x) = 6x$, $f''(1) = 6 > 0$: concave up, so a relative minimum.`], { choices: ['a relative maximum', 'a relative minimum', 'a point of inflection', 'inconclusive'] }),
      P('c5-4-4', 2, r`At what $x$ does $f(x) = xe^x$ have a point of inflection?`, ['-2'], "f''(x) = e^x(x + 2).", [r`$f' = e^x(x + 1)$, $f'' = e^x(x + 2)$.`, r`Sign change at $x = -2$.`], { check: () => d2((x) => x * Math.exp(x), -2.1) < 0 && d2((x) => x * Math.exp(x), -1.9) > 0 }),
      P('c5-4-5', 2, r`$f(x) = \ln(x^2 + 1)$ has inflection points at $x = \pm a$. What is $a$?`, ['1'], "f''(x) = 2(1 − x²)/(x² + 1)².", [r`$f'' = \frac{2(1 - x^2)}{(x^2 + 1)^2}$ changes sign at $x = \pm 1$.`], { check: () => d2((x) => Math.log(x * x + 1), 0.9) > 0 && d2((x) => Math.log(x * x + 1), 1.1) < 0 }),
      P('c5-4-6', 3, r`The derivative of $f$ is $f'(x) = x^2 - 4x$. At what $x$ does $f$ have a point of inflection?`, ['2'], "Differentiate f' to get f''.", [r`$f''(x) = 2x - 4$, which changes sign at $x = 2$.`], { check: () => near(d((x) => x * x - 4 * x, 2), 0) }),
    ],
    remember: ["f'' > 0 concave up; f'' < 0 concave down.", "Inflection: f'' changes sign (not just equals 0).", "2nd derivative test: f'' > 0 min, f'' < 0 max."],
    checkIn: 'Next lesson is all about reading graphs of f′ — the most common Unit 5 free-response task.',
  },
  {
    id: 'c5-5', unit: 5, n: 5, title: 'Connecting the graphs of f, f′ and f″',
    intro: 'On the exam you will often be given the graph or formula of f′, not f, and asked about f. Today we practice translating: what features of f′ tell you about increase, extrema, concavity and inflection of f.',
    goals: ['Read increase/decrease of f from f′', 'Find extrema of f from sign changes of f′', 'Find concavity and inflection of f from f′', 'Avoid confusing f with f′'],
    notes: [
      { k: 'list', items: [r`$f'$ above the axis → $f$ increasing; below → $f$ decreasing.`, r`$f'$ crosses the axis from above to below → $f$ has a relative max (below to above → min).`, r`$f'$ increasing (rising graph) → $f$ concave up; $f'$ decreasing → $f$ concave down.`, r`$f'$ has a peak or valley → $f$ has an inflection point.`] },
      { k: 'tip', t: r`Write “f′ graph” at the top of your scratch work so you never read the given graph as if it were $f$.` },
      { k: 'warn', t: r`$f'$ touching the axis without crossing (a double root) is NOT an extremum of $f$.` },
      { k: 'p', t: r`If you are given $f'$ as a formula, factor it: the factors and their powers tell you where the sign changes.` },
      { k: 'p', t: r`For values of $f$ itself, you need an integral (Unit 6): $f(b) = f(a) + \int_a^b f'(x)\,dx$.` },
    ],
    examples: [
      { q: r`$f'(x) = (x - 1)(x - 4)^2$. Where does $f$ have relative extrema?`, steps: [r`$(x - 4)^2 \ge 0$, so the sign of $f'$ is the sign of $x - 1$.`, r`$f'$ changes $-$ to $+$ at $x = 1$: relative min. No change at 4: no extremum.`], a: 'min at x = 1 only' },
      { q: r`$f'(x) = x^3 - 3x$. Where are the inflection points of $f$?`, steps: [r`$f''(x) = 3x^2 - 3$ changes sign at $x = \pm 1$.`, r`Inflection points of $f$ at $x = -1$ and $x = 1$.`], a: 'x = ±1' },
    ],
    practice: [
      P('c5-5-1', 2, r`$f'(x) = (x - 1)(x - 4)^2$. How many relative extrema does $f$ have?`, ['1'], 'Which factor controls the sign?', [r`Only $x - 1$ changes sign; the squared factor does not.`, r`One extremum, at $x = 1$.`], { check: () => { const fp = (x: number) => (x - 1) * (x - 4) ** 2; return fp(0.9) < 0 && fp(1.1) > 0 && fp(3.9) > 0 && fp(4.1) > 0; } }),
      P('c5-5-2', 1, r`$f'(x) = x^2 - 9$. On which interval is $f$ decreasing?`, 1, "Where is f' negative?", [r`$x^2 - 9 < 0$ for $-3 < x < 3$.`], { choices: [r`$(-\infty, -3)$`, r`$(-3, 3)$`, r`$(3, \infty)$`, r`$(0, \infty)$`] }),
      P('c5-5-3', 1, r`The graph of $f'$ is increasing on $(2, 5)$. On $(2, 5)$, $f$ is…`, 2, "f' increasing means f'' > 0.", [r`$f'$ increasing ⇔ $f'' > 0$ ⇔ $f$ concave up.`], { choices: ['increasing', 'decreasing', 'concave up', 'concave down'] }),
      P('c5-5-4', 2, r`$f'(x) = x^3 - 3x$. How many points of inflection does $f$ have?`, ['2'], "f'' = 3x² − 3.", [r`$f''$ changes sign at $x = \pm 1$: two inflection points.`], { check: () => d((x) => x ** 3 - 3 * x, -1.1) > 0 && d((x) => x ** 3 - 3 * x, 0) < 0 && d((x) => x ** 3 - 3 * x, 1.1) > 0 }),
      P('c5-5-5', 2, r`$f'(x) = e^x(x - 2)$. At what $x$ does $f$ have a relative minimum?`, ['2'], 'eˣ is always positive.', [r`The sign of $f'$ is the sign of $x - 2$: changes from $-$ to $+$ at $x = 2$.`], { check: () => Math.exp(1.9) * -0.1 < 0 && Math.exp(2.1) * 0.1 > 0 }),
      P('c5-5-6', 3, r`$f'(x) = \sin x$ for $0 < x < 2\pi$. At what $x$ does $f$ have a relative maximum? (three decimal places)`, ['3.142', 'pi'], "Where does sin x go from + to −?", [r`$\sin x > 0$ on $(0, \pi)$ and $< 0$ on $(\pi, 2\pi)$.`, r`Relative max of $f$ at $x = \pi \approx 3.142$.`], { check: () => Math.sin(Math.PI - 0.01) > 0 && Math.sin(Math.PI + 0.01) < 0 }),
    ],
    remember: ["f' sign → f increasing/decreasing.", "f' crosses the axis → extremum of f.", "f' rising/falling → f concave up/down; f' peak/valley → inflection of f."],
    checkIn: 'Last lesson of Unit 5 next: optimization, where everything comes together.',
  },
  {
    id: 'c5-6', unit: 5, n: 6, title: 'Optimization',
    intro: 'Optimization puts calculus to work: the largest area, the least material, the shortest distance. The calculus part is easy. The real skill is turning words into one function of one variable, with the right domain.',
    goals: ['Write the quantity to optimize as a function of one variable', 'Use a constraint to eliminate a variable', 'Find and justify the optimum'],
    notes: [
      { k: 'list', items: [r`1. Draw and label. Name the quantity to maximize or minimize.`, r`2. Write it as a formula (it may have two variables).`, r`3. Use the constraint to rewrite it in one variable.`, r`4. Find the domain from the context.`, r`5. Find critical points; justify with the candidates test or the first derivative test.`, r`6. Answer the question asked (dimensions? the value?).`] },
      { k: 'tip', t: r`The answer to “maximize area with fixed perimeter” is a square, and “two numbers with a fixed sum” peak when they are equal. Use these to sanity-check.` },
      { k: 'warn', t: r`If there is a single critical point, still justify that it is a max or min (sign change of the derivative). “It is the only critical point” alone is not enough.` },
      { k: 'p', t: r`For distance problems, minimize the SQUARE of the distance. It is smallest at the same point and avoids square roots.` },
      { k: 'formula', t: r`\text{Box from a square sheet: } V(x) = x(s - 2x)^2 \qquad \text{Cylinder: } V = \pi r^2 h,\; S = 2\pi r^2 + 2\pi r h` },
    ],
    examples: [
      { q: r`An open box is made from a 12 in × 12 in sheet by cutting $x$ in squares from the corners. Maximize the volume.`, steps: [r`$V(x) = x(12 - 2x)^2$, domain $0 < x < 6$.`, r`$V'(x) = (12 - 2x)(12 - 6x) = 0$ at $x = 2$ (and 6, excluded).`, r`$V' > 0$ for $x < 2$ and $< 0$ for $2 < x < 6$: max at $x = 2$, $V = 128$ in³.`], a: '128' },
      { q: r`Find the point on $y = \sqrt{x}$ closest to $(2, 0)$.`, steps: [r`$D^2 = (x - 2)^2 + x$.`, r`$\frac{d}{dx}D^2 = 2(x - 2) + 1 = 0$ at $x = 1.5$.`, r`Closest point $(1.5, \sqrt{1.5})$.`], a: 'x = 1.5' },
    ],
    practice: [
      P('c5-6-1', 1, r`Two positive numbers have a sum of 20. What is the largest possible product?`, ['100'], 'P = x(20 − x).', [r`$P' = 20 - 2x = 0$ at $x = 10$.`, r`$P = 10 \cdot 10 = 100$.`], { check: () => near(extremesMax((x) => x * (20 - x), 0, 20), 100) }),
      P('c5-6-2', 1, r`A rectangle has perimeter 40. What is its largest possible area?`, ['100'], 'A = x(20 − x).', [r`A square with side 10: area $100$.`], { check: () => near(extremesMax((x) => x * (20 - x), 0, 20), 100) }),
      P('c5-6-3', 2, r`An open box is made from a 12 × 12 sheet by cutting squares of side $x$ from the corners and folding. What is the maximum volume?`, ['128'], 'V = x(12 − 2x)².', [r`$V' = 0$ at $x = 2$; $V(2) = 2 \cdot 64 = 128$.`], { check: () => near(extremesMax((x) => x * (12 - 2 * x) ** 2, 0, 6), 128) }),
      P('c5-6-4', 2, r`What $x$-value gives the point on $y = \sqrt{x}$ closest to $(2, 0)$?`, ['1.5', '3/2'], 'Minimize D² = (x − 2)² + x.', [r`$2(x - 2) + 1 = 0$ gives $x = 1.5$.`], { check: () => near(d((x) => (x - 2) ** 2 + x, 1.5), 0) }),
      P('c5-6-5', 2, r`A farmer has 600 ft of fence to enclose a rectangular field along a river, with no fence needed on the river side. What is the largest area, in square feet?`, ['45000'], 'A = x(600 − 2x), x is the side perpendicular to the river.', [r`$A' = 600 - 4x = 0$ at $x = 150$.`, r`$A = 150 \cdot 300 = 45{,}000$ ft².`], { check: () => near(extremesMax((x) => x * (600 - 2 * x), 0, 300), 45000) }),
      P('c5-6-6', 3, r`A closed cylindrical can must hold $16\pi$ cubic inches. What radius minimizes the surface area?`, ['2'], 'h = 16/r²; S = 2πr² + 32π/r.', [r`$S' = 4\pi r - \frac{32\pi}{r^2} = 0$ gives $r^3 = 8$.`, r`$r = 2$ inches (then $h = 4$).`], { check: () => near(d((r) => 2 * Math.PI * r * r + (32 * Math.PI) / r, 2), 0) }),
    ],
    remember: ['One quantity, one variable, one domain.', 'Use the constraint to eliminate a variable.', 'Justify the optimum, then answer exactly what was asked.'],
    checkIn: 'That is Unit 5, one of the heaviest on the exam. Take the review, then Unit 6 turns everything around: integration.',
  },
];

function extremesMax(f: (x: number) => number, a: number, b: number) { return extremes(f, a, b).hi; }
