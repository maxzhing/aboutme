import type { CalcProblem } from './types';

/**
 * Hard, AP-exam-style multiple-choice questions, three per unit, added to the end of each unit's last lesson.
 * Original Stellify questions written in the style of the AP Calculus exam (not College Board items). Each wrong choice
 * is the result of a specific, common mistake, named in the solution. Every key has an independent numeric check().
 */
const r = String.raw;
const P = (id: string, q: string, choices: string[], answer: number, hint: string, solution: string[], check: () => boolean): CalcProblem => ({ id, level: 3, q, choices, answer, hint, solution, check });
const near = (a: number, b: number, tol = 1e-6) => Math.abs(a - b) < tol * Math.max(1, Math.abs(b));
const simpson = (f: (x: number) => number, a: number, b: number, n = 20000) => { const h = (b - a) / n; let s = f(a) + f(b); for (let i = 1; i < n; i++) s += f(a + i * h) * (i % 2 ? 4 : 2); return (s * h) / 3; };
const d = (f: (x: number) => number, x: number, h = 1e-5) => (f(x + h) - f(x - h)) / (2 * h);

export const EXAM_STYLE: Record<number, CalcProblem[]> = {
  1: [
    P('c1-x-1', r`$\displaystyle\lim_{x \to 0} \frac{\sqrt{9 + x} - 3}{x}$ is`, ['$0$', r`$\frac{1}{6}$`, r`$\frac{1}{3}$`, 'nonexistent'], 1, 'Multiply by the conjugate.',
      [r`Multiply top and bottom by $\sqrt{9 + x} + 3$: $\frac{x}{x(\sqrt{9 + x} + 3)} = \frac{1}{\sqrt{9 + x} + 3} \to \frac{1}{6}$.`, r`Trap: $\frac{1}{3}$ comes from forgetting that the conjugate adds two 3's.`], () => near((Math.sqrt(9 + 1e-7) - 3) / 1e-7, 1 / 6, 1e-4)),
    P('c1-x-2', r`$\displaystyle\lim_{x \to \infty} \frac{3x^2 - 5x}{7 - 2x^2}$ is`, [r`$-\frac{3}{2}$`, r`$\frac{3}{2}$`, r`$-\frac{5}{7}$`, r`$\infty$`], 0, 'Compare leading terms.',
      [r`Same degree: the limit is the ratio of leading coefficients, $\frac{3}{-2} = -\frac{3}{2}$.`, r`Trap: dropping the sign of $-2x^2$ gives $\frac{3}{2}$.`], () => near((3 * 1e8 ** 2 - 5 * 1e8) / (7 - 2 * 1e8 ** 2), -1.5, 1e-6)),
    P('c1-x-3', r`Let $f(x) = \dfrac{x^2 - 4}{x - 2}$ for $x \ne 2$ and $f(2) = k$. For what value of $k$ is $f$ continuous at $x = 2$?`, ['$0$', '$2$', '$4$', 'no value of $k$'], 2, 'Continuity: the limit must equal f(2).',
      [r`For $x \ne 2$, $f(x) = x + 2$, so $\lim_{x \to 2} f(x) = 4$. Continuity needs $k = 4$.`, r`Trap: "no value" comes from thinking a hole can never be filled.`], () => near((2.000001 ** 2 - 4) / (2.000001 - 2), 4, 1e-5)),
  ],
  2: [
    P('c2-x-1', r`$\displaystyle\lim_{h \to 0} \frac{(2 + h)^5 - 32}{h}$ is`, ['$0$', '$32$', '$80$', '$160$'], 2, 'This is a derivative in disguise.',
      [r`It is $f'(2)$ for $f(x) = x^5$: $5 \cdot 2^4 = 80$.`, r`Trap: 160 doubles the exponent rule ($5 \cdot 2^5$).`], () => near(((2 + 1e-6) ** 5 - 32) / 1e-6, 80, 1e-4)),
    P('c2-x-2', r`Let $f(x) = x^3 - 3x$. Using the line tangent to the graph of $f$ at $x = 2$, the approximate value of $f(2.1)$ is`, ['$2.0$', '$2.9$', '$3.0$', '$2.961$'], 1, 'Tangent line: f(2) + f′(2)(x − 2).',
      [r`$f(2) = 2$, $f'(x) = 3x^2 - 3$ so $f'(2) = 9$. $L(2.1) = 2 + 9(0.1) = 2.9$.`, r`Trap: 2.961 is the exact value $f(2.1)$, not the tangent-line approximation.`], () => near(2 + d((x) => x ** 3 - 3 * x, 2) * 0.1, 2.9, 1e-6)),
    P('c2-x-3', r`If $f(x) = e^x \sin x$, then $f'(0) =$`, ['$0$', '$1$', '$2$', '$-1$'], 1, 'Product rule.',
      [r`$f'(x) = e^x \sin x + e^x \cos x$, so $f'(0) = 0 + 1 = 1$.`, r`Trap: 0 keeps only the first product-rule term, $e^x \sin x$, which is 0 at $x = 0$.`], () => near(d((x) => Math.exp(x) * Math.sin(x), 0), 1, 1e-6)),
  ],
  3: [
    P('c3-x-1', r`If $x^2 + xy + y^2 = 7$, then $\dfrac{dy}{dx}$ at the point $(1, 2)$ is`, [r`$-\frac{4}{5}$`, r`$-\frac{5}{4}$`, r`$-\frac{1}{2}$`, r`$\frac{4}{5}$`], 0, 'Differentiate implicitly; the xy term needs the product rule.',
      [r`$2x + y + xy' + 2yy' = 0$, so $y' = -\frac{2x + y}{x + 2y}$. At $(1, 2)$: $-\frac{4}{5}$.`, r`Trap: $-\frac{1}{2}$ forgets the product rule on $xy$ ($2x + 2yy' = 0$).`], () => { const y = (x: number) => (-x + Math.sqrt(x * x - 4 * (x * x - 7))) / 2; return near(y(1), 2) && near(d(y, 1), -0.8, 1e-5); }),
    P('c3-x-2', r`$f$ is differentiable and invertible with $f(1) = 3$ and $f'(1) = -2$. If $g = f^{-1}$, then $g'(3) =$`, [r`$-2$`, r`$-\frac{1}{2}$`, r`$\frac{1}{3}$`, r`$\frac{1}{2}$`], 1, 'g′(f(a)) = 1 / f′(a).',
      [r`$g(3) = 1$, so $g'(3) = \frac{1}{f'(1)} = -\frac{1}{2}$.`, r`Trap: $\frac{1}{3}$ uses $\frac{1}{f(1)}$ instead of $\frac{1}{f'(1)}$.`], () => { const f = (x: number) => 3 - 2 * (x - 1); const g = (y: number) => 1 - (y - 3) / 2; return near(f(g(3.3)), 3.3) && near(d(g, 3), -0.5, 1e-6); }),
    P('c3-x-3', r`$\dfrac{d}{dx}\big[\ln(\cos x)\big]$ at $x = \frac{\pi}{4}$ is`, ['$-1$', '$1$', r`$\frac{\sqrt{2}}{2}$`, r`$-\sqrt{2}$`], 0, 'Chain rule: (ln u)′ = u′/u.',
      [r`$\frac{-\sin x}{\cos x} = -\tan x$; at $\frac{\pi}{4}$ that is $-1$.`, r`Trap: 1 drops the minus sign from $(\cos x)' = -\sin x$.`], () => near(d((x) => Math.log(Math.cos(x)), Math.PI / 4), -1, 1e-6)),
  ],
  4: [
    P('c4-x-1', r`$\displaystyle\lim_{x \to 0} \frac{1 - \cos(3x)}{x^2}$ is`, ['$0$', '$3$', r`$\frac{9}{2}$`, '$9$'], 2, "L'Hospital's rule, twice.",
      [r`$\frac{0}{0}$: differentiate: $\frac{3\sin 3x}{2x}$, still $\frac{0}{0}$; again: $\frac{9\cos 3x}{2} \to \frac{9}{2}$.`, r`Trap: 9 forgets the 2 from $(x^2)' = 2x$.`], () => near((1 - Math.cos(3e-4)) / 1e-8, 4.5, 1e-4)),
    P('c4-x-2', r`The radius of a circle increases at $2$ cm/s. How fast is the area increasing when the radius is $5$ cm?`, [r`$10\pi$ cm²/s`, r`$20\pi$ cm²/s`, r`$25\pi$ cm²/s`, r`$4\pi$ cm²/s`], 1, 'dA/dt = 2πr · dr/dt.',
      [r`$\frac{dA}{dt} = 2\pi r \frac{dr}{dt} = 2\pi(5)(2) = 20\pi$.`, r`Trap: $10\pi$ forgets the chain-rule factor $\frac{dr}{dt} = 2$.`], () => near(d((t) => Math.PI * (5 + 2 * t) ** 2, 0), 20 * Math.PI, 1e-6)),
    P('c4-x-3', r`A particle moves along a line with position $s(t) = t^3 - 6t^2 + 9t$ for $t \ge 0$. On which intervals is the particle's speed increasing?`, ['$(0, 1)$ only', '$(1, 2)$ and $(3, \\infty)$', '$(2, 3)$ only', '$(1, 3)$'], 1, 'Speed increases when velocity and acceleration have the same sign.',
      [r`$v = 3(t - 1)(t - 3)$, $a = 6t - 12$. Same sign on $(1, 2)$ (both negative) and $(3, \infty)$ (both positive).`, r`Trap: $(1, 3)$ is where the particle moves left, not where its speed increases.`], () => { const v = (t: number) => 3 * t * t - 12 * t + 9, a = (t: number) => 6 * t - 12; return v(1.5) * a(1.5) > 0 && v(4) * a(4) > 0 && v(0.5) * a(0.5) < 0 && v(2.5) * a(2.5) < 0; }),
  ],
  5: [
    P('c5-x-1', r`What is the absolute maximum value of $f(x) = x e^{-x}$ on $[0, \infty)$?`, ['$0$', r`$\frac{1}{e}$`, '$1$', r`$\frac{2}{e^2}$`], 1, 'Solve f′(x) = 0 and compare.',
      [r`$f'(x) = e^{-x}(1 - x) = 0$ at $x = 1$; $f$ rises then falls, so the maximum is $f(1) = \frac{1}{e}$.`, r`Trap: 1 reports the $x$-value, not the maximum value.`], () => { let m = -Infinity; for (let i = 0; i <= 100000; i++) { const x = i / 1000; m = Math.max(m, x * Math.exp(-x)); } return near(m, 1 / Math.E, 1e-6); }),
    P('c5-x-2', r`$f'(x) = (x - 1)^2(x + 2)$. Which statement about $f$ is true?`, ['relative minimum at $x = -2$ only', 'relative minimum at $x = 1$ only', 'relative minima at $x = -2$ and $x = 1$', 'no relative extrema'], 0, 'Where does f′ change sign?',
      [r`$(x - 1)^2 \ge 0$, so $f'$ has the sign of $x + 2$: negative then positive at $-2$ (a minimum), no change at $1$.`, r`Trap: treating every zero of $f'$ as an extremum.`], () => { const fp = (x: number) => (x - 1) ** 2 * (x + 2); return fp(-2.1) < 0 && fp(-1.9) > 0 && fp(0.9) > 0 && fp(1.1) > 0; }),
    P('c5-x-3', r`For $f(x) = x^3$ on $[0, 3]$, the value of $c$ guaranteed by the Mean Value Theorem is`, ['$1$', r`$\sqrt{3}$`, r`$\frac{3}{2}$`, '$3$'], 1, "Set f′(c) equal to the average rate of change.",
      [r`Average rate $= \frac{27 - 0}{3} = 9$. $3c^2 = 9$, so $c = \sqrt{3}$ (in $(0, 3)$).`, r`Trap: $\frac{3}{2}$ is the midpoint, which works only for quadratics.`], () => near(3 * 3 ** (2 / 2), 9, 1e-9) && near(3 * Math.sqrt(3) ** 2, (27 - 0) / 3, 1e-9)),
  ],
  6: [
    P('c6-x-1', r`$\displaystyle\int_0^2 |x - 1|\,dx =$`, ['$0$', '$1$', '$2$', r`$\frac{1}{2}$`], 1, 'Split at x = 1 or use geometry.',
      [r`Two triangles, each with base 1 and height 1: $\frac{1}{2} + \frac{1}{2} = 1$.`, r`Trap: 0 integrates $x - 1$ without the absolute value.`], () => near(simpson((x) => Math.abs(x - 1), 0, 2), 1, 1e-6)),
    P('c6-x-2', r`If $F(x) = \displaystyle\int_1^{x^2} \sqrt{t + 3}\,dt$, then $F'(1) =$`, ['$2$', '$4$', r`$\sqrt{2}$`, '$0$'], 1, 'FTC with the chain rule.',
      [r`$F'(x) = \sqrt{x^2 + 3} \cdot 2x$; $F'(1) = 2 \cdot 2 = 4$.`, r`Trap: 2 forgets the chain-rule factor $2x$.`], () => near(d((x) => simpson((t) => Math.sqrt(t + 3), 1, x * x, 2000), 1, 1e-4), 4, 1e-5)),
    P('c6-x-3', r`$\displaystyle\int_0^1 x e^{x^2}\,dx =$`, [r`$e - 1$`, r`$\frac{e - 1}{2}$`, r`$\frac{e}{2}$`, r`$2(e - 1)$`], 1, 'Substitute u = x².',
      [r`$u = x^2$, $du = 2x\,dx$: $\frac{1}{2}\int_0^1 e^u\,du = \frac{e - 1}{2}$.`, r`Trap: $e - 1$ forgets the $\frac{1}{2}$ from $du = 2x\,dx$.`], () => near(simpson((x) => x * Math.exp(x * x), 0, 1), (Math.E - 1) / 2, 1e-8)),
  ],
  7: [
    P('c7-x-1', r`$\dfrac{dy}{dx} = \dfrac{y}{2}$ and $y(0) = 4$. What is $y(2)$?`, ['$4e$', '$8$', r`$4e^2$`, '$4 + e$'], 0, 'Separate: dy/y = dx/2.',
      [r`$y = 4e^{x/2}$, so $y(2) = 4e$.`, r`Trap: $4e^2$ forgets the $\frac{1}{2}$ in the exponent.`], () => { let y = 4; const n = 200000; for (let i = 0; i < n; i++) y += (2 / n) * (y / 2); return near(y, 4 * Math.E, 1e-4); }),
    P('c7-x-2', r`Let $y$ satisfy $\dfrac{dy}{dx} = x + y$ with $y(0) = 1$. Euler's method with two steps of size $0.5$ gives the approximation for $y(1)$:`, ['$2.0$', '$2.5$', '$3.0$', r`$2e - 2$`], 1, 'Each step: y_new = y + Δx · slope at the old point.',
      [r`$y(0.5) \approx 1 + 0.5(0 + 1) = 1.5$; $y(1) \approx 1.5 + 0.5(0.5 + 1.5) = 2.5$.`, r`Trap: $2e - 2 \approx 3.44$ is the exact solution's value, not Euler's approximation.`], () => { let x = 0, y = 1; for (let i = 0; i < 2; i++) { y += 0.5 * (x + y); x += 0.5; } return near(y, 2.5, 1e-12); }),
    P('c7-x-3', r`A population satisfies $\dfrac{dP}{dt} = 0.2P\left(1 - \dfrac{P}{500}\right)$ with $P(0) = 100$. At what population is $P$ growing fastest?`, ['$100$', '$250$', '$500$', '$0.2$'], 1, 'Logistic growth is fastest at half the carrying capacity.',
      [r`$\frac{dP}{dt}$ is a downward parabola in $P$ with zeros at 0 and 500; its maximum is at $P = 250$.`, r`Trap: 500 is the carrying capacity, where growth stops.`], () => { const g = (p: number) => 0.2 * p * (1 - p / 500); return g(250) > g(249) && g(250) > g(251); }),
  ],
  8: [
    P('c8-x-1', r`The area of the region enclosed by $y = x^2$ and $y = 2x$ is`, [r`$\frac{4}{3}$`, r`$\frac{8}{3}$`, '$4$', r`$\frac{2}{3}$`], 0, 'Intersections first, then top minus bottom.',
      [r`They meet at $x = 0$ and $x = 2$; $\int_0^2 (2x - x^2)\,dx = 4 - \frac{8}{3} = \frac{4}{3}$.`, r`Trap: $\frac{8}{3}$ is $\int_0^2 x^2\,dx$, the area under the parabola alone.`], () => near(simpson((x) => 2 * x - x * x, 0, 2), 4 / 3, 1e-8)),
    P('c8-x-2', r`The region under $y = \sqrt{x}$ for $0 \le x \le 4$ is revolved about the $x$-axis. The volume is`, [r`$4\pi$`, r`$8\pi$`, r`$16\pi$`, r`$\frac{16}{3}\pi$`], 1, 'Disks: π∫(radius)² dx.',
      [r`$\pi\int_0^4 (\sqrt{x})^2\,dx = \pi\int_0^4 x\,dx = 8\pi$.`, r`Trap: $\frac{16}{3}\pi$ integrates $\sqrt{x}$ without squaring the radius.`], () => near(Math.PI * simpson((x) => x, 0, 4), 8 * Math.PI, 1e-8)),
    P('c8-x-3', r`The average value of $f(x) = \sin x$ on $[0, \pi]$ is`, ['$0$', '$2$', r`$\frac{2}{\pi}$`, r`$\frac{1}{2}$`], 2, 'Average value = (1/(b − a)) ∫ f.',
      [r`$\frac{1}{\pi}\int_0^\pi \sin x\,dx = \frac{2}{\pi}$.`, r`Trap: 2 is the integral itself, not divided by the length $\pi$.`], () => near(simpson(Math.sin, 0, Math.PI) / Math.PI, 2 / Math.PI, 1e-8)),
  ],
  9: [
    P('c9-x-1', r`A curve is given by $x = t^2$, $y = t^3$. What is $\dfrac{d^2y}{dx^2}$ at $t = 1$?`, [r`$\frac{3}{2}$`, r`$\frac{3}{4}$`, '$6$', '$3$'], 1, 'Differentiate dy/dx with respect to t, then divide by dx/dt.',
      [r`$\frac{dy}{dx} = \frac{3t^2}{2t} = \frac{3t}{2}$; $\frac{d^2y}{dx^2} = \frac{3/2}{2t} = \frac{3}{4t}$, which is $\frac{3}{4}$ at $t = 1$.`, r`Trap: $\frac{3}{2}$ forgets to divide by $\frac{dx}{dt}$ again.`], () => { const yOfX = (x: number) => x ** 1.5; return near((yOfX(1 + 1e-4) - 2 * yOfX(1) + yOfX(1 - 1e-4)) / 1e-8, 0.75, 1e-3); }),
    P('c9-x-2', r`The area enclosed by the polar curve $r = 2\sin\theta$ for $0 \le \theta \le \pi$ is`, [r`$\pi$`, r`$2\pi$`, r`$4\pi$`, '$2$'], 0, 'Area = ½∫ r² dθ.',
      [r`$\frac{1}{2}\int_0^\pi 4\sin^2\theta\,d\theta = \pi$ (a circle of radius 1).`, r`Trap: $2\pi$ forgets the $\frac{1}{2}$.`], () => near(0.5 * simpson((t) => 4 * Math.sin(t) ** 2, 0, Math.PI), Math.PI, 1e-8)),
    P('c9-x-3', r`A particle's position is $\langle t^2, 2t \rangle$. What is its speed at $t = 2$?`, ['$4$', r`$2\sqrt{5}$`, '$6$', r`$\sqrt{20} + 2$`], 1, 'Speed is the length of the velocity vector.',
      [r`Velocity $\langle 2t, 2 \rangle = \langle 4, 2 \rangle$; speed $= \sqrt{16 + 4} = 2\sqrt{5}$.`, r`Trap: 6 adds the components instead of taking the length.`], () => near(Math.hypot(4, 2), 2 * Math.sqrt(5), 1e-12)),
  ],
  10: [
    P('c10-x-1', r`$\displaystyle\sum_{n=1}^{\infty} \left(\frac{2}{3}\right)^n =$`, ['$3$', '$2$', r`$\frac{2}{3}$`, 'diverges'], 1, 'Geometric series: first term / (1 − ratio).',
      [r`First term $\frac{2}{3}$, ratio $\frac{2}{3}$: $\frac{2/3}{1/3} = 2$.`, r`Trap: 3 starts the sum at $n = 0$ (first term 1).`], () => { let s = 0; for (let n = 1; n < 200; n++) s += (2 / 3) ** n; return near(s, 2, 1e-10); }),
    P('c10-x-2', r`The interval of convergence of $\displaystyle\sum_{n=1}^{\infty} \frac{(x - 2)^n}{n \cdot 3^n}$ is`, ['$(-1, 5)$', '$[-1, 5)$', '$(-1, 5]$', '$[-1, 5]$'], 1, 'Ratio test for the radius, then test each endpoint.',
      [r`Radius 3, centered at 2. At $x = 5$: $\sum \frac{1}{n}$ diverges. At $x = -1$: $\sum \frac{(-1)^n}{n}$ converges (alternating). So $[-1, 5)$.`, r`Trap: $(-1, 5)$ skips the endpoint checks.`], () => { let alt = 0, harm = 0; for (let n = 1; n <= 200000; n++) { alt += (-1) ** n / n; harm += 1 / n; } return near(alt, -Math.log(2), 1e-4) && harm > 12; }),
    P('c10-x-3', r`The coefficient of $x^3$ in the Maclaurin series for $e^{2x}$ is`, [r`$\frac{1}{6}$`, r`$\frac{4}{3}$`, '$8$', r`$\frac{2}{3}$`], 1, 'Substitute 2x into the series for eᵘ.',
      [r`$\frac{(2x)^3}{3!} = \frac{8x^3}{6}$: the coefficient is $\frac{4}{3}$.`, r`Trap: $\frac{1}{6}$ is the coefficient for $e^x$, forgetting to cube the 2.`], () => near(2 ** 3 / 6, 4 / 3, 1e-12)),
  ],
};

/** The tutor layer's slow walk-through for each question above: plain words, one step at a time. */
export const EXAM_STYLE_WALK: Record<string, string[]> = {
  'c1-x-1': ['Plugging in 0 gives 0 over 0, so we need to rewrite the expression first.', 'Multiply the top and bottom by the conjugate, the square root of 9 plus x, plus 3. The top becomes x.', 'Cancel the x. What is left is 1 over the square root of 9 plus x, plus 3, which is 1 over 6 when x is 0.'],
  'c1-x-2': ['As x grows huge, only the highest powers matter: 3x squared on top, negative 2x squared on the bottom.', 'Both are degree 2, so the limit is the ratio of their coefficients.', 'Three over negative two is negative three halves. Keep the minus sign.'],
  'c1-x-3': ['Continuity at 2 needs the limit at 2 to equal the value f of 2, which is k.', 'For x not equal to 2, factor: x squared minus 4 is (x minus 2)(x plus 2), so f is x plus 2.', 'The limit at 2 is 4, so k must be 4 to fill the hole.'],
  'c2-x-1': ['The pattern f of (a plus h) minus f of a, over h, is the definition of a derivative.', 'Here f of x is x to the fifth and a is 2, because 2 to the fifth is 32.', 'The derivative 5x to the fourth at 2 is 5 times 16, which is 80.'],
  'c2-x-2': ['The tangent line at x equals 2 is f of 2 plus f prime of 2 times (x minus 2).', 'f of 2 is 8 minus 6, which is 2. f prime is 3x squared minus 3, so f prime of 2 is 9.', 'At x equals 2.1: 2 plus 9 times 0.1 is 2.9. That is the approximation, not the exact value.'],
  'c2-x-3': ['It is a product, so use the product rule: first times derivative of second, plus second times derivative of first.', 'That gives e to the x times sine x, plus e to the x times cosine x.', 'At 0: sine 0 is 0 and cosine 0 is 1, so the derivative is 0 plus 1, which is 1.'],
  'c3-x-1': ['Differentiate both sides with respect to x, treating y as a function of x.', 'The xy term needs the product rule: y plus x times y prime. The y squared term gives 2y times y prime.', 'Solve for y prime: negative (2x plus y) over (x plus 2y). At (1, 2) that is negative 4 over 5.'],
  'c3-x-2': ['If g is the inverse of f, then g of 3 is 1, because f of 1 is 3.', 'The derivative of an inverse is 1 over f prime, at the matching point.', 'So g prime of 3 is 1 over f prime of 1, which is 1 over negative 2: negative one half.'],
  'c3-x-3': ['The derivative of ln of u is u prime over u.', 'Here u is cosine x, and its derivative is negative sine x, so the derivative is negative tangent x.', 'Tangent of pi over 4 is 1, so the answer is negative 1.'],
  'c4-x-1': ['Plugging in 0 gives 0 over 0, so L\'Hospital\'s rule applies: differentiate top and bottom.', 'That gives 3 sine 3x over 2x, still 0 over 0, so differentiate again: 9 cosine 3x over 2.', 'At 0, cosine is 1, so the limit is 9 over 2.'],
  'c4-x-2': ['Area is pi r squared. Differentiate with respect to time t.', 'The chain rule gives dA by dt equals 2 pi r times dr by dt.', 'With r equal to 5 and dr by dt equal to 2: 2 pi times 5 times 2 is 20 pi square centimeters per second.'],
  'c4-x-3': ['Speed increases when velocity and acceleration point the same way, so compare their signs.', 'Velocity is 3(t minus 1)(t minus 3): positive, then negative between 1 and 3, then positive. Acceleration is 6t minus 12: negative before 2, positive after.', 'Same signs on (1, 2) and after 3. Those are the intervals.'],
  'c5-x-1': ['Find where the derivative is zero: e to the negative x times (1 minus x) is 0 only at x equals 1.', 'The derivative is positive before 1 and negative after, so x equals 1 is the highest point.', 'The maximum value is f of 1, which is 1 over e. The question asks for the value, not the x.'],
  'c5-x-2': ['Extrema happen only where f prime changes sign.', 'The squared factor is never negative, so the sign of f prime is the sign of x plus 2.', 'It changes from negative to positive only at negative 2: a relative minimum there, nothing at 1.'],
  'c5-x-3': ['The Mean Value Theorem says some c has f prime of c equal to the average rate of change.', 'The average rate is (27 minus 0) over 3, which is 9.', 'Set 3c squared equal to 9: c squared is 3, so c is the square root of 3, which is inside the interval.'],
  'c6-x-1': ['The graph of the absolute value of x minus 1 is a V with its point at x equals 1.', 'From 0 to 2 it makes two triangles, each with base 1 and height 1.', 'Each has area one half, so the total is 1.'],
  'c6-x-2': ['The Fundamental Theorem says the derivative of an integral up to u is the integrand at u, times u prime.', 'Here u is x squared, so F prime is the square root of (x squared plus 3) times 2x.', 'At x equals 1: the square root of 4, which is 2, times 2 is 4.'],
  'c6-x-3': ['Let u equal x squared. Then du is 2x dx, so x dx is one half du.', 'The limits stay 0 to 1 because 0 squared is 0 and 1 squared is 1.', 'One half the integral of e to the u from 0 to 1 is (e minus 1) over 2.'],
  'c7-x-1': ['Separate the variables: dy over y equals one half dx.', 'Integrate: ln y equals x over 2 plus C, so y equals A e to the x over 2. The start y of 0 equals 4 gives A equals 4.', 'At x equals 2: 4 e to the 1, which is 4e.'],
  'c7-x-2': ['Euler\'s method moves along the slope at the current point for one step.', 'First step: the slope at (0, 1) is 1, so y becomes 1 plus 0.5 times 1, which is 1.5.', 'Second step: the slope at (0.5, 1.5) is 2, so y becomes 1.5 plus 0.5 times 2, which is 2.5.'],
  'c7-x-3': ['The growth rate is 0.2 P times (1 minus P over 500): a parabola in P.', 'It is zero at P equals 0 and P equals 500, and opens downward.', 'A downward parabola peaks halfway between its zeros, at P equals 250.'],
  'c8-x-1': ['Find where the curves meet: x squared equals 2x at x equals 0 and x equals 2.', 'Between them, the line 2x is on top.', 'Integrate top minus bottom from 0 to 2: 4 minus 8 thirds, which is 4 thirds.'],
  'c8-x-2': ['Revolving around the x-axis makes disks with radius equal to the square root of x.', 'Each disk has area pi times the radius squared, which is pi x.', 'Integrate pi x from 0 to 4: pi times 16 over 2, which is 8 pi.'],
  'c8-x-3': ['Average value is the integral divided by the length of the interval.', 'The integral of sine from 0 to pi is 2.', 'Divide by the length pi: 2 over pi.'],
  'c9-x-1': ['First derivative: dy by dt over dx by dt, which is 3t squared over 2t, or 3t over 2.', 'For the second derivative, differentiate that with respect to t, then divide by dx by dt again.', 'That is 3 halves over 2t, which is 3 over 4t. At t equals 1: three quarters.'],
  'c9-x-2': ['Polar area is one half the integral of r squared.', 'r squared is 4 sine squared theta, and its integral from 0 to pi is 2 pi.', 'Half of 2 pi is pi. That makes sense: r equals 2 sine theta is a circle of radius 1.'],
  'c9-x-3': ['Velocity is the derivative of each coordinate: 2t and 2.', 'At t equals 2, velocity is 4 and 2.', 'Speed is its length: the square root of 16 plus 4, which is 2 root 5.'],
  'c10-x-1': ['It is geometric with ratio two thirds, which is less than 1, so it converges.', 'The first term, at n equals 1, is two thirds.', 'Sum equals first term over 1 minus ratio: two thirds over one third, which is 2.'],
  'c10-x-2': ['The ratio test gives the absolute value of x minus 2, over 3, less than 1: radius 3, from negative 1 to 5.', 'At x equals 5 the series is the harmonic series, which diverges.', 'At x equals negative 1 it alternates, with terms shrinking to 0, so it converges. Include negative 1, exclude 5.'],
  'c10-x-3': ['The series for e to the u is the sum of u to the n over n factorial.', 'Replace u with 2x. The x cubed term is (2x) cubed over 3 factorial.', 'That is 8 x cubed over 6, so the coefficient is 4 thirds.'],
};
