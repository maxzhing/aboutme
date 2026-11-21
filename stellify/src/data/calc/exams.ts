import type { CalcProblem } from './types';
import { d, d2, euler, integ, lim, limInf, near, series } from './types';
import { TEST_U1, TEST_U2, TEST_U3, TEST_U4, TEST_U5 } from './exams-a';
import { TEST_U6, TEST_U7, TEST_U8, TEST_U9, TEST_U10 } from './exams-b';

/** A test problem: always hard, and marked as calculator or no-calculator like the AP exam’s two parts. */
export interface ExamProblem extends CalcProblem { calculator: boolean }

export interface CalcExam {
  id: string;
  kind: 'unit' | 'semester' | 'final';
  /** the unit a unit test covers */
  unit?: number;
  /** A = Units 1–5, B = Units 6–10 (the two halves of the year-long course) */
  semester?: 'A' | 'B';
  title: string;
  covers: string;
  minutes: number;
  problems: ExamProblem[];
}

const r = String.raw;
const E = (id: string, calculator: boolean, q: string, answer: number | string[], hint: string, solution: string[], extra: Partial<ExamProblem> = {}): ExamProblem => ({ id, level: 3, calculator, q, answer, hint, solution, ...extra });

const SEM_A: ExamProblem[] = [
  E('sa-1', false, r`Evaluate $\displaystyle\lim_{x\to 0}\frac{\sqrt{9 + x} - 3}{x}$.`, ['1/6', '0.167'], 'Multiply by the conjugate.', [r`$\frac{\sqrt{9 + x} - 3}{x}\cdot\frac{\sqrt{9 + x} + 3}{\sqrt{9 + x} + 3} = \frac{1}{\sqrt{9 + x} + 3}$.`, r`At $x = 0$: $\frac{1}{6}$.`], { check: () => near(lim((x) => (Math.sqrt(9 + x) - 3) / x, 0), 1 / 6, 1e-3) }),
  E('sa-2', false, r`Let $f(x) = \dfrac{2x^2 - 8}{x^2 - x - 2}$. Which statement about the discontinuities of $f$ is true?`, 3, 'Factor numerator and denominator; a common factor gives a hole.', [r`$f(x) = \frac{2(x - 2)(x + 2)}{(x - 2)(x + 1)}$.`, r`At $x = 2$ the factor cancels: a removable discontinuity. At $x = -1$ the denominator alone is zero: a vertical asymptote.`], { choices: [r`Vertical asymptotes at $x = 2$ and $x = -1$`, r`A removable discontinuity at $x = -1$ and a vertical asymptote at $x = 2$`, r`Only a vertical asymptote at $x = -1$; $f$ is continuous at $x = 2$`, r`A removable discontinuity at $x = 2$ and a vertical asymptote at $x = -1$`] }),
  E('sa-3', false, r`If $f(x) = \ln(\cos x)$, what is $f'\!\left(\frac{\pi}{4}\right)$?`, ['-1'], 'Chain rule: (1/cos x)(−sin x).', [r`$f'(x) = \frac{-\sin x}{\cos x} = -\tan x$.`, r`$f'\left(\frac{\pi}{4}\right) = -1$.`], { check: () => near(d((x) => Math.log(Math.cos(x)), Math.PI / 4), -1) }),
  E('sa-4', false, r`If $y = e^{3x}\sin x$, what is $\dfrac{dy}{dx}$ at $x = 0$?`, ['1'], 'Product rule.', [r`$y' = 3e^{3x}\sin x + e^{3x}\cos x$.`, r`At $x = 0$: $0 + 1 = 1$.`], { check: () => near(d((x) => Math.exp(3 * x) * Math.sin(x), 0), 1) }),
  E('sa-5', false, r`The point $(1, 2)$ lies on the curve $x^3 + y^3 = 9$. Use the line tangent to the curve at this point to approximate the $y$-coordinate of the point on the curve with $x = 1.1$.`, ['1.975'], 'Find dy/dx implicitly, then use the tangent line.', [r`$3x^2 + 3y^2y' = 0$ gives $y' = -\frac{x^2}{y^2} = -\frac{1}{4}$ at $(1, 2)$.`, r`$y \approx 2 - \frac{1}{4}(0.1) = 1.975$.`], { check: () => near(2 - 0.25 * 0.1, 1.975) && near(d((x) => Math.cbrt(9 - x ** 3), 1), -0.25) }),
  E('sa-6', false, r`Let $f(x) = e^x + x$ and let $g$ be the inverse of $f$. What is $g'(1)$?`, ['1/2', '0.5'], 'Find a with f(a) = 1; then g′(1) = 1/f′(a).', [r`$f(0) = 1$, so $g(1) = 0$.`, r`$f'(x) = e^x + 1$, $f'(0) = 2$, so $g'(1) = \frac{1}{2}$.`], { check: () => near(1 / d((x) => Math.exp(x) + x, 0), 0.5) }),
  E('sa-7', true, r`The radius of a sphere increases at 0.5 cm per second. How fast is its volume increasing, in cubic centimeters per second, when the radius is 3 cm? (Three decimal places.)`, ['56.549'], 'V = (4/3)πr³, so dV/dt = 4πr² dr/dt.', [r`$\frac{dV}{dt} = 4\pi(3)^2(0.5) = 18\pi$.`, r`$\approx 56.549$ cm³/s.`], { check: () => near(4 * Math.PI * 9 * 0.5, 18 * Math.PI) }),
  E('sa-8', false, r`Evaluate $\displaystyle\lim_{x\to 0}\frac{x - \sin x}{x - \tan x}$.`, ['-1/2', '-0.5'], "L'Hôpital's rule repeatedly, or compare the x³ terms of the series.", [r`$x - \sin x \approx \frac{x^3}{6}$ and $x - \tan x \approx -\frac{x^3}{3}$ near 0.`, r`The ratio approaches $\frac{1/6}{-1/3} = -\frac{1}{2}$.`], { check: () => near((0.01 - Math.sin(0.01)) / (0.01 - Math.tan(0.01)), -0.5, 1e-3) }),
  E('sa-9', false, r`Why does Rolle’s Theorem not guarantee a value $c$ in $(-1, 1)$ with $f'(c) = 0$ for $f(x) = |x|$ on $[-1, 1]$?`, 0, 'Check each hypothesis: continuous on [a, b], differentiable on (a, b), f(a) = f(b).', [r`$f$ is continuous on $[-1, 1]$ and $f(-1) = f(1) = 1$.`, r`But $f$ is not differentiable at $x = 0$ (a corner), so a hypothesis fails. Indeed $f'$ is never 0.`], { choices: ['f is not differentiable at x = 0', 'f is not continuous on [−1, 1]', 'f(−1) is not equal to f(1)', 'Rolle’s Theorem does apply; f′(0) = 0'] }),
  E('sa-10', false, r`What is the absolute minimum value of $f(x) = x^3 - 12x$ on $[-3, 5]$?`, ['-16'], 'Candidates test: critical points and endpoints.', [r`$f'(x) = 3x^2 - 12 = 0$ at $x = \pm 2$.`, r`$f(-3) = 9$, $f(-2) = 16$, $f(2) = -16$, $f(5) = 65$. The minimum is $-16$.`], { check: () => Math.min(...[-3, -2, 2, 5].map((x) => x ** 3 - 12 * x)) === -16 }),
  E('sa-11', true, r`What is the minimum distance from the point $(3, 0)$ to the curve $y = \sqrt{x}$? (Three decimal places.)`, ['1.658'], 'Minimize the squared distance (x − 3)² + x.', [r`$D^2 = (x - 3)^2 + x$; derivative $2(x - 3) + 1 = 0$ gives $x = 2.5$.`, r`$D = \sqrt{0.25 + 2.5} = \sqrt{2.75} \approx 1.658$.`], { check: () => near(d((x) => (x - 3) ** 2 + x, 2.5), 0) && near(Math.sqrt(2.75), 1.6583, 1e-4) }),
  E('sa-12', false, r`The derivative of $f$ is $f'(x) = x^2(x - 3)$. How many points of inflection does the graph of $f$ have?`, ['2'], 'Inflection points are where f″ changes sign.', [r`$f'(x) = x^3 - 3x^2$, so $f''(x) = 3x^2 - 6x = 3x(x - 2)$.`, r`$f''$ changes sign at $x = 0$ and $x = 2$: two inflection points.`], { check: () => { const f2 = (x: number) => 3 * x * x - 6 * x; return Math.sign(f2(-0.1)) !== Math.sign(f2(0.1)) && Math.sign(f2(1.9)) !== Math.sign(f2(2.1)); } }),
];

const SEM_B: ExamProblem[] = [
  E('sb-1', false, r`Evaluate $\displaystyle\int_0^{\pi/2}\sin^3x\cos x\,dx$.`, ['1/4', '0.25'], 'u = sin x.', [r`$\int_0^1u^3\,du = \frac{1}{4}$.`, r`So the integral is $\frac{1}{4}$.`], { check: () => near(integ((x) => Math.sin(x) ** 3 * Math.cos(x), 0, Math.PI / 2), 0.25) }),
  E('sb-2', false, r`Evaluate $\displaystyle\int_1^e\frac{(\ln x)^2}{x}\,dx$.`, ['1/3'], 'u = ln x.', [r`$u = \ln x$, $du = \frac{dx}{x}$: $\int_0^1u^2\,du$.`, r`$= \frac{1}{3}$.`], { check: () => near(integ((x) => Math.log(x) ** 2 / x, 1, Math.E), 1 / 3) }),
  E('sb-3', true, r`Evaluate $\displaystyle\int_0^1 xe^{2x}\,dx$. (Three decimal places.)`, ['2.097'], 'Parts: u = x, dv = e^(2x) dx.', [r`$\int xe^{2x}\,dx = \frac{xe^{2x}}{2} - \frac{e^{2x}}{4} = \frac{e^{2x}(2x - 1)}{4}$.`, r`From 0 to 1: $\frac{e^2}{4} + \frac{1}{4} = \frac{e^2 + 1}{4} \approx 2.097$.`], { check: () => near(integ((x) => x * Math.exp(2 * x), 0, 1), (Math.E ** 2 + 1) / 4) }),
  E('sb-4', false, r`Evaluate $\displaystyle\int_0^1\frac{3x + 5}{(x + 1)(x + 2)}\,dx$. (Three decimal places.)`, ['1.792'], 'Partial fractions A/(x + 1) + B/(x + 2).', [r`$3x + 5 = A(x + 2) + B(x + 1)$: $x = -1$ gives $A = 2$; $x = -2$ gives $B = 1$.`, r`$\left[2\ln(x + 1) + \ln(x + 2)\right]_0^1 = 2\ln 2 + \ln\frac{3}{2} \approx 1.792$.`], { check: () => near(integ((x) => (3 * x + 5) / ((x + 1) * (x + 2)), 0, 1), 2 * Math.log(2) + Math.log(1.5)) }),
  E('sb-5', false, r`Evaluate $\displaystyle\int_0^\infty e^{-2x}\,dx$.`, ['1/2', '0.5'], 'Integrate to b, then let b → ∞.', [r`$\int_0^be^{-2x}\,dx = \frac{1 - e^{-2b}}{2}$.`, r`As $b \to \infty$: $\frac{1}{2}$.`], { check: () => near(integ((x) => Math.exp(-2 * x), 0, 30), 0.5) }),
  E('sb-6', false, r`A population satisfies $\dfrac{dP}{dt} = \dfrac{P(10 - P)}{20}$ with $P(0) = 2$. What is $\displaystyle\lim_{t\to\infty}P(t)$?`, ['10'], 'Write it in logistic form and read the carrying capacity.', [r`$\frac{dP}{dt} = \frac{1}{2}P\left(1 - \frac{P}{10}\right)$, logistic with carrying capacity 10.`, r`Starting between 0 and 10, $P(t) \to 10$.`], { check: () => near(euler((t, P) => (P * (10 - P)) / 20, 0, 2, 0.01, 20000), 10, 1e-3) }),
  E('sb-7', false, r`What is the area of one petal of the polar curve $r = 2\sin(2\theta)$? (Three decimal places.)`, ['1.571'], 'One petal: 0 ≤ θ ≤ π/2.', [r`$A = \frac{1}{2}\int_0^{\pi/2}4\sin^2(2\theta)\,d\theta = \int_0^{\pi/2}(1 - \cos 4\theta)\,d\theta$.`, r`$= \frac{\pi}{2} \approx 1.571$.`], { check: () => near(0.5 * integ((t) => 4 * Math.sin(2 * t) ** 2, 0, Math.PI / 2), Math.PI / 2) }),
  E('sb-8', false, r`What is the length of the curve $x = t^2$, $y = \frac{2}{3}t^3$ for $0 \le t \le 1$? (Three decimal places.)`, ['1.219'], 'Speed = √(4t² + 4t⁴) = 2t√(1 + t²).', [r`$L = \int_0^12t\sqrt{1 + t^2}\,dt = \frac{2}{3}(1 + t^2)^{3/2}\Big|_0^1$.`, r`$= \frac{2}{3}\left(2\sqrt{2} - 1\right) \approx 1.219$.`], { check: () => near(integ((t) => Math.hypot(2 * t, 2 * t * t), 0, 1), (2 / 3) * (2 * Math.SQRT2 - 1)) }),
  E('sb-9', false, r`What is the coefficient of $x^3$ in the Maclaurin series for $f(x) = xe^x$?`, ['1/2', '0.5'], 'Multiply the series for eˣ by x.', [r`$xe^x = x\left(1 + x + \frac{x^2}{2!} + \cdots\right) = x + x^2 + \frac{x^3}{2} + \cdots$.`, r`The coefficient is $\frac{1}{2}$.`], { check: () => near(d2((x) => d((y) => y * Math.exp(y), x, 1e-4), 0, 1e-3) / 6, 0.5, 1e-2) }),
  E('sb-10', false, r`What is the radius of convergence of $\displaystyle\sum_{n=1}^\infty\frac{n\,x^n}{4^n}$?`, ['4'], 'Ratio test.', [r`$\left|\frac{a_{n+1}}{a_n}\right| = \frac{n + 1}{n}\cdot\frac{|x|}{4} \to \frac{|x|}{4}$.`, r`Converges when $|x| < 4$: the radius is 4.`], { check: () => near(limInf((n) => (n + 1) / n) / 4, 0.25) }),
  E('sb-11', false, r`Use the third-degree Maclaurin polynomial for $\sin x$ to approximate $\sin(0.2)$. (Three decimal places.)`, ['0.199'], 'P₃(x) = x − x³/6.', [r`$P_3(0.2) = 0.2 - \frac{0.008}{6} = 0.198\overline{6}$.`, r`$\approx 0.199$.`], { check: () => near(0.2 - 0.008 / 6, 0.19867, 1e-4) }),
  E('sb-12', true, r`The region under $y = e^x$ for $0 \le x \le 1$ is revolved about the $x$-axis. What is the volume of the solid? (Three decimal places.)`, ['10.036'], 'Discs: V = π ∫ e^(2x) dx.', [r`$V = \pi\int_0^1e^{2x}\,dx = \frac{\pi(e^2 - 1)}{2}$.`, r`$\approx 10.036$.`], { check: () => near(Math.PI * integ((x) => Math.exp(2 * x), 0, 1), (Math.PI * (Math.E ** 2 - 1)) / 2) }),
];

const FINAL_1: ExamProblem[] = [
  E('f1-1', false, r`Evaluate $\displaystyle\lim_{x\to\pi}\frac{\sin x}{x - \pi}$.`, ['-1'], 'This is the derivative of sin x at π.', [r`$\lim_{x\to\pi}\frac{\sin x - \sin\pi}{x - \pi} = \cos\pi$.`, r`$= -1$.`], { check: () => near(lim((x) => Math.sin(x) / (x - Math.PI), Math.PI), -1, 1e-3) }),
  E('f1-2', false, r`If $G(x) = \displaystyle\int_0^{\sin x}e^{t^2}\,dt$, what is $G'(0)$?`, ['1'], 'FTC with the chain rule.', [r`$G'(x) = e^{\sin^2x}\cos x$.`, r`$G'(0) = e^0\cdot 1 = 1$.`], { check: () => near(d((x) => integ((t) => Math.exp(t * t), 0, Math.sin(x)), 0, 1e-4), 1, 1e-3) }),
  E('f1-3', true, r`A particle has velocity $v(t) = e^t - 3$. What is its displacement from $t = 0$ to $t = 2$? (Three decimal places.)`, ['0.389'], 'Displacement = ∫ v dt (signed).', [r`$\int_0^2(e^t - 3)\,dt = (e^2 - 1) - 6$.`, r`$= e^2 - 7 \approx 0.389$.`], { check: () => near(integ((t) => Math.exp(t) - 3, 0, 2), Math.E ** 2 - 7) }),
  E('f1-4', false, r`For the curve $e^y + xy = e$, what is $\dfrac{dy}{dx}$ at the point $(0, 1)$? (Three decimal places.)`, ['-0.368'], 'Differentiate implicitly and substitute.', [r`$e^yy' + y + xy' = 0$. At $(0, 1)$: $ey' + 1 = 0$.`, r`$y' = -\frac{1}{e} \approx -0.368$.`], { check: () => near(-1 / Math.E, -0.36788, 1e-4) }),
  E('f1-5', false, r`Evaluate $\displaystyle\int_0^2 x\sqrt{4 - x^2}\,dx$.`, ['8/3', '2.667'], 'u = 4 − x².', [r`$u = 4 - x^2$, $du = -2x\,dx$: $\frac{1}{2}\int_0^4\sqrt{u}\,du$.`, r`$= \frac{1}{2}\cdot\frac{2}{3}\cdot 8 = \frac{8}{3}$.`], { check: () => near(integ((x) => x * Math.sqrt(4 - x * x), 0, 2, 40000), 8 / 3, 1e-4) }),
  E('f1-6', false, r`Use Euler's method with two steps of size $0.1$ to approximate $y(0.2)$ for $\dfrac{dy}{dx} = y - x$, $y(0) = 2$.`, ['2.41'], 'y_new = y + 0.1 · (y − x).', [r`Step 1: slope $2$, so $y(0.1) \approx 2.2$.`, r`Step 2: slope $2.2 - 0.1 = 2.1$, so $y(0.2) \approx 2.41$.`], { check: () => near(euler((x, y) => y - x, 0, 2, 0.1, 2), 2.41) }),
  E('f1-7', false, r`What is the sum $\displaystyle\sum_{n=1}^\infty\frac{n}{3^n}$?`, ['3/4', '0.75'], 'Differentiate the geometric series: Σ n xⁿ = x/(1 − x)².', [r`$\sum nx^n = \frac{x}{(1 - x)^2}$ for $|x| < 1$.`, r`With $x = \frac{1}{3}$: $\frac{1/3}{4/9} = \frac{3}{4}$.`], { check: () => near(series((n) => n / 3 ** n, 1, 80), 0.75) }),
  E('f1-8', false, r`The curve $x = t^3 - 3t$, $y = t^2$ has vertical tangent lines at two points. What is the positive $x$-coordinate of these points?`, ['2'], 'Vertical tangent: dx/dt = 0 while dy/dt ≠ 0.', [r`$\frac{dx}{dt} = 3t^2 - 3 = 0$ at $t = \pm 1$, where $\frac{dy}{dt} = \pm 2 \ne 0$.`, r`$t = -1$: $x = 2$; $t = 1$: $x = -2$. The positive one is 2.`], { check: () => (-1) ** 3 - 3 * -1 === 2 }),
  E('f1-9', false, r`What is the area between $y = \cos x$ and $y = \sin x$ from $x = 0$ to $x = \frac{\pi}{4}$? (Three decimal places.)`, ['0.414'], 'cos x ≥ sin x on [0, π/4].', [r`$\int_0^{\pi/4}(\cos x - \sin x)\,dx = [\sin x + \cos x]_0^{\pi/4}$.`, r`$= \sqrt{2} - 1 \approx 0.414$.`], { check: () => near(integ((x) => Math.cos(x) - Math.sin(x), 0, Math.PI / 4), Math.SQRT2 - 1) }),
  E('f1-10', false, r`A twice-differentiable function $f$ has $f'(2) = 0$ and $f''(x) > 0$ for all $x$. Which statement must be true?`, 1, 'Second derivative test.', [r`$f'(2) = 0$ and $f''(2) > 0$.`, r`So $f$ has a relative minimum at $x = 2$ (in fact the absolute minimum, since $f$ is concave up everywhere).`], { choices: ['f has a relative maximum at x = 2', 'f has a relative minimum at x = 2', 'f has a point of inflection at x = 2', 'f is decreasing for all x > 2'] }),
  E('f1-11', false, r`Which series diverges?`, 2, 'Limit comparison with the harmonic series.', [r`$\frac{n}{n^2 + 1}$ behaves like $\frac{1}{n}$, and $\lim\frac{n/(n^2 + 1)}{1/n} = 1$, so it diverges with $\sum\frac{1}{n}$.`, r`The others converge: a p-series with $p = 2$, an alternating series with decreasing terms, and a geometric series with $r = \frac{2}{3}$.`], { choices: [r`$\sum\frac{1}{n^2}$`, r`$\sum\frac{(-1)^n}{n}$`, r`$\sum\frac{n}{n^2 + 1}$`, r`$\sum\left(\frac{2}{3}\right)^n$`] }),
  E('f1-12', true, r`Evaluate $\displaystyle\lim_{n\to\infty}\left(1 + \frac{2}{n}\right)^n$. (Three decimal places.)`, ['7.389'], 'The limit (1 + a/n)ⁿ is eᵃ.', [r`With $a = 2$, the limit is $e^2$.`, r`$\approx 7.389$.`], { check: () => near((1 + 2 / 1e7) ** 1e7, Math.E ** 2, 1e-4) }),
];

const FINAL_2: ExamProblem[] = [
  E('f2-1', false, r`Evaluate $\displaystyle\lim_{x\to 0}\frac{e^x - 1 - x}{x^2}$.`, ['1/2', '0.5'], "L'Hôpital twice or the series for eˣ.", [r`$e^x - 1 - x = \frac{x^2}{2} + \frac{x^3}{6} + \cdots$.`, r`Divided by $x^2$, the limit is $\frac{1}{2}$.`], { check: () => near((Math.exp(1e-3) - 1 - 1e-3) / 1e-6, 0.5, 1e-3) }),
  E('f2-2', false, r`If $f(x) = \arctan(x^2)$, what is $f'(1)$?`, ['1'], 'd/dx arctan u = u′/(1 + u²).', [r`$f'(x) = \frac{2x}{1 + x^4}$.`, r`$f'(1) = \frac{2}{2} = 1$.`], { check: () => near(d((x) => Math.atan(x * x), 1), 1) }),
  E('f2-3', true, r`Water fills a cylindrical tank of radius 2 m, and the water level rises at 3 m per minute. At what rate, in cubic meters per minute, is the volume increasing? (Three decimal places.)`, ['37.699'], 'V = πr²h with r constant.', [r`$\frac{dV}{dt} = \pi(2)^2\frac{dh}{dt} = 4\pi(3)$.`, r`$= 12\pi \approx 37.699$.`], { check: () => near(4 * Math.PI * 3, 12 * Math.PI) }),
  E('f2-4', true, r`Evaluate $\displaystyle\int_1^4\frac{e^{\sqrt{x}}}{\sqrt{x}}\,dx$. (Three decimal places.)`, ['9.342'], 'u = √x, du = dx/(2√x).', [r`$\int\frac{e^{\sqrt{x}}}{\sqrt{x}}\,dx = 2e^{\sqrt{x}}$.`, r`From 1 to 4: $2(e^2 - e) \approx 9.342$.`], { check: () => near(integ((x) => Math.exp(Math.sqrt(x)) / Math.sqrt(x), 1, 4), 2 * (Math.E ** 2 - Math.E)) }),
  E('f2-5', true, r`What is the average value of $f(x) = \frac{1}{x}$ on $[1, e]$? (Three decimal places.)`, ['0.582'], 'Average = (1/(e − 1)) ∫₁ᵉ dx/x.', [r`$\int_1^e\frac{dx}{x} = 1$.`, r`Average $= \frac{1}{e - 1} \approx 0.582$.`], { check: () => near(integ((x) => 1 / x, 1, Math.E) / (Math.E - 1), 1 / (Math.E - 1)) }),
  E('f2-6', false, r`Let $y = f(x)$ solve $\dfrac{dy}{dx} = 2y$ with $f(0) = 5$. What is $f(\ln 3)$?`, ['45'], 'The solution is y = 5e^(2x).', [r`$y = 5e^{2x}$.`, r`$f(\ln 3) = 5e^{2\ln 3} = 5\cdot 9 = 45$.`], { check: () => near(5 * Math.exp(2 * Math.log(3)), 45) }),
  E('f2-7', true, r`What is the area of the region enclosed by the polar curve $r = \theta$ for $0 \le \theta \le \pi$ and the $x$-axis? (Three decimal places.)`, ['5.168'], 'A = ½ ∫ θ² dθ.', [r`$A = \frac{1}{2}\int_0^\pi\theta^2\,d\theta = \frac{\pi^3}{6}$.`, r`$\approx 5.168$.`], { check: () => near(0.5 * integ((t) => t * t, 0, Math.PI), Math.PI ** 3 / 6) }),
  E('f2-8', false, r`What is the sum $\displaystyle\sum_{n=0}^\infty\frac{(-1)^n\pi^{2n}}{(2n)!}$?`, ['-1'], 'Recognize the Maclaurin series for cos x.', [r`$\cos x = \sum\frac{(-1)^nx^{2n}}{(2n)!}$.`, r`At $x = \pi$: $\cos\pi = -1$.`], { check: () => { let s = 0, t = 1; for (let n = 0; n < 30; n++) { s += t; t *= -(Math.PI ** 2) / ((2 * n + 1) * (2 * n + 2)); } return near(s, -1); } }),
  E('f2-9', false, r`A differentiable function has $f(1) = 5$ and $f(4) = -1$. The Mean Value Theorem guarantees a value $c$ in $(1, 4)$ with $f'(c)$ equal to what number?`, ['-2'], 'f′(c) equals the average rate of change.', [r`$\frac{f(4) - f(1)}{4 - 1} = \frac{-6}{3}$.`, r`$= -2$.`], { check: () => (-1 - 5) / 3 === -2 }),
  E('f2-10', false, r`The region between $y = \sqrt{x}$ and $y = x$ is revolved about the $x$-axis. What is the volume of the solid? (Three decimal places.)`, ['0.524'], 'Washers: outer √x, inner x, on 0 ≤ x ≤ 1.', [r`$V = \pi\int_0^1(x - x^2)\,dx = \pi\left(\frac{1}{2} - \frac{1}{3}\right)$.`, r`$= \frac{\pi}{6} \approx 0.524$.`], { check: () => near(Math.PI * integ((x) => x - x * x, 0, 1), Math.PI / 6) }),
  E('f2-11', false, r`What is the interval of convergence of $\displaystyle\sum_{n=1}^\infty\frac{(2x)^n}{n^2}$?`, 1, 'Ratio test for the radius; test both endpoints (both give p-series with p = 2).', [r`$\frac{|2x|\,n^2}{(n + 1)^2} \to |2x| < 1$, so $|x| < \frac{1}{2}$.`, r`At $x = \pm\frac{1}{2}$ the terms are $\frac{(\pm 1)^n}{n^2}$, which converge absolutely. Interval $\left[-\frac{1}{2}, \frac{1}{2}\right]$.`], { choices: [r`$\left(-\frac{1}{2}, \frac{1}{2}\right)$`, r`$\left[-\frac{1}{2}, \frac{1}{2}\right]$`, r`$\left[-\frac{1}{2}, \frac{1}{2}\right)$`, r`$[-2, 2]$`] }),
  E('f2-12', false, r`Evaluate $\displaystyle\lim_{x\to\infty}\frac{\ln x}{\sqrt{x}}$.`, ['0'], "L'Hôpital: (1/x)/(1/(2√x)).", [r`$\frac{1/x}{1/(2\sqrt{x})} = \frac{2}{\sqrt{x}}$.`, r`$\to 0$.`], { check: () => Math.log(1e12) / 1e6 < 1e-4 }),
];

const unitTest = (unit: number, problems: ExamProblem[], title: string): CalcExam => ({ id: `unit-${unit}`, kind: 'unit', unit, semester: unit <= 5 ? 'A' : 'B', title: `Unit ${unit} test: ${title}`, covers: `Unit ${unit}`, minutes: 45, problems });

/** Every test, in the order a student takes them. */
export const CALC_EXAMS: CalcExam[] = [
  unitTest(1, TEST_U1, 'Limits and Continuity'),
  unitTest(2, TEST_U2, 'Derivatives'),
  unitTest(3, TEST_U3, 'Chain Rule, Implicit and Inverse'),
  unitTest(4, TEST_U4, 'Applications in Context'),
  unitTest(5, TEST_U5, 'Analytical Applications'),
  { id: 'semester-a', kind: 'semester', semester: 'A', title: 'Semester A exam', covers: 'Units 1–5', minutes: 90, problems: SEM_A },
  unitTest(6, TEST_U6, 'Integration'),
  unitTest(7, TEST_U7, 'Differential Equations'),
  unitTest(8, TEST_U8, 'Applications of Integration'),
  unitTest(9, TEST_U9, 'Parametric, Polar and Vector'),
  unitTest(10, TEST_U10, 'Series'),
  { id: 'semester-b', kind: 'semester', semester: 'B', title: 'Semester B exam', covers: 'Units 6–10', minutes: 90, problems: SEM_B },
  { id: 'final-1', kind: 'final', title: 'Cumulative final 1', covers: 'Units 1–10', minutes: 90, problems: FINAL_1 },
  { id: 'final-2', kind: 'final', title: 'Cumulative final 2', covers: 'Units 1–10', minutes: 90, problems: FINAL_2 },
];
export const CALC_EXAM: Record<string, CalcExam> = Object.fromEntries(CALC_EXAMS.map((e) => [e.id, e]));
/** a test counts as passed at 80%, the bar for moving on */
export const EXAM_PASS = 0.8;
