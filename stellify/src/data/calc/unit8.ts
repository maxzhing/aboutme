import type { CalcLesson, CalcProblem } from './types';
import { d, integ, near } from './types';

const r = String.raw;
const P = (id: string, level: 1 | 2 | 3, q: string, answer: number | string[], hint: string, solution: string[], extra: Partial<CalcProblem> = {}): CalcProblem => ({ id, level, q, answer, hint, solution, ...extra });
const arc = (f: (x: number) => number, a: number, b: number) => integ((x) => Math.sqrt(1 + d(f, x) ** 2), a, b);

/** Unit 8 · Applications of Integration. Original lessons and problems. */
export const UNIT8: CalcLesson[] = [
  {
    id: 'c8-1', unit: 8, n: 1, title: 'Average value, motion and accumulation in context',
    intro: 'Integrals answer “how much in total” questions. Today: the average value of a function, the difference between displacement and total distance, and reading accumulation stories, the core of several free-response questions every year.',
    goals: ['Compute the average value of a function', 'Find displacement and total distance from velocity', 'Use the Mean Value Theorem for integrals', 'Set up accumulation problems with rates in and out'],
    notes: [
      { k: 'formula', t: r`f_{\text{avg}} = \frac{1}{b - a}\int_a^b f(x)\,dx` },
      { k: 'rule', title: 'Mean Value Theorem for integrals', t: r`If $f$ is continuous on $[a, b]$, some $c$ in $[a, b]$ has $f(c) = f_{\text{avg}}$.` },
      { k: 'rule', title: 'Displacement vs. distance', t: r`Displacement $= \int_a^b v(t)\,dt$ (can be negative). Total distance $= \int_a^b |v(t)|\,dt$: split where $v$ changes sign.` },
      { k: 'p', t: r`Position from velocity: $s(b) = s(a) + \int_a^b v(t)\,dt$. Velocity from acceleration works the same way.` },
      { k: 'tip', t: r`Rates in and out: amount at time $T$ = start $+ \int_0^T (\text{in} - \text{out})\,dt$. The amount is largest where in − out changes from positive to negative.` },
      { k: 'warn', t: r`“Average value of $f$” uses the integral. “Average rate of change of $f$” is $\frac{f(b) - f(a)}{b - a}$. Different questions.` },
    ],
    examples: [
      { q: r`Average value of $x^2$ on $[0, 3]$.`, steps: [r`$\frac{1}{3}\int_0^3 x^2\,dx = \frac{1}{3}(9)$.`, r`$= 3$.`], a: '3' },
      { q: r`$v(t) = t^2 - 4$ on $[0, 3]$. Total distance?`, steps: [r`$v < 0$ on $[0, 2)$, $v > 0$ on $(2, 3]$.`, r`$\int_0^2 (4 - t^2)\,dt + \int_2^3 (t^2 - 4)\,dt = \frac{16}{3} + \frac{7}{3} = \frac{23}{3}$.`], a: '23/3' },
    ],
    practice: [
      P('c8-1-1', 1, r`Average value of $f(x) = x^2$ on $[0, 3]$.`, ['3'], '(1/3)∫₀³ x² dx.', [r`$\frac{1}{3} \cdot 9 = 3$.`], { check: () => near(integ((x) => x * x, 0, 3) / 3, 3) }),
      P('c8-1-2', 1, r`Average value of $\sin x$ on $[0, \pi]$ (three decimal places).`, ['0.637', '2/pi'], '∫₀^π sin x = 2.', [r`$\frac{2}{\pi} \approx 0.637$.`], { check: () => near(integ(Math.sin, 0, Math.PI) / Math.PI, 2 / Math.PI) }),
      P('c8-1-3', 1, r`A particle has velocity $v(t) = 2t - 4$. Find its displacement from $t = 0$ to $t = 1$.`, ['-3'], '∫₀¹ v dt.', [r`$[t^2 - 4t]_0^1 = -3$.`], { check: () => near(integ((t) => 2 * t - 4, 0, 1), -3) }),
      P('c8-1-4', 2, r`$v(t) = t^2 - 4$ on $0 \le t \le 3$. Find the total distance traveled (three decimal places).`, ['7.667', '23/3'], 'Split at t = 2.', [r`$\frac{16}{3} + \frac{7}{3} = \frac{23}{3} \approx 7.667$.`], { check: () => near(integ((t) => Math.abs(t * t - 4), 0, 2) + integ((t) => Math.abs(t * t - 4), 2, 3), 23 / 3) }),
      P('c8-1-5', 1, r`$\int_2^7 f(x)\,dx = 50$. What is the average value of $f$ on $[2, 7]$?`, ['10'], 'Divide by the length.', [r`$\frac{50}{7 - 2} = 10$.`], { check: () => 50 / (7 - 2) === 10 }),
      P('c8-1-6', 3, r`Find the value $c$ in $[0, 2]$ guaranteed by the Mean Value Theorem for integrals for $f(x) = x^2$ (three decimal places).`, ['1.155', '2/sqrt(3)'], 'Average value first, then solve f(c) = average.', [r`$f_{\text{avg}} = \frac{1}{2}\cdot\frac{8}{3} = \frac{4}{3}$.`, r`$c^2 = \frac{4}{3}$, so $c = \frac{2}{\sqrt{3}} \approx 1.155$.`], { check: () => near((2 / Math.sqrt(3)) ** 2, integ((x) => x * x, 0, 2) / 2) && near(2 / Math.sqrt(3), 1.155, 1e-3) }),
    ],
    remember: ['Average value = (1/(b − a)) ∫ f.', 'Distance uses |v|: split where v changes sign.', 'Amount = start + ∫(in − out).'],
    checkIn: 'Context problems are worth many FRQ points; always include units. Next: area between curves.',
  },
  {
    id: 'c8-2', unit: 8, n: 2, title: 'Area between curves',
    intro: 'The area between two curves is the integral of top minus bottom. When the curves are easier to describe as functions of y, integrate right minus left instead. Finding the intersection points is usually the real work.',
    goals: ['Find intersection points as limits', 'Integrate top minus bottom', 'Integrate with respect to y when better', 'Handle curves that cross'],
    notes: [
      { k: 'formula', t: r`A = \int_a^b [\text{top}(x) - \text{bottom}(x)]\,dx \qquad A = \int_c^d [\text{right}(y) - \text{left}(y)]\,dy` },
      { k: 'list', items: [r`1. Sketch the region.`, r`2. Solve for intersections to get limits.`, r`3. Decide dx (vertical strips) or dy (horizontal strips).`, r`4. Integrate (top − bottom) or (right − left).`] },
      { k: 'tip', t: r`If the region's “top” changes partway through, either split the integral or switch to $dy$. Regions bounded by $x = y^2$ are almost always easier in $y$.` },
      { k: 'warn', t: r`If the curves cross inside the interval, top and bottom swap. Area uses $|f - g|$; split at each crossing.` },
      { k: 'p', t: r`On the calculator section, use the calculator to find intersections, store them, and integrate. Show the setup in writing.` },
    ],
    examples: [
      { q: r`Area between $y = x$ and $y = x^2$.`, steps: [r`Intersections: $x = 0, 1$. On $(0, 1)$, $x > x^2$.`, r`$\int_0^1 (x - x^2)\,dx = \frac{1}{2} - \frac{1}{3} = \frac{1}{6}$.`], a: '1/6' },
      { q: r`Area between $x = y^2$ and $x = y + 2$.`, steps: [r`$y^2 = y + 2$: $y = -1, 2$. Right curve: $x = y + 2$.`, r`$\int_{-1}^2 (y + 2 - y^2)\,dy = \frac{9}{2}$.`], a: '9/2' },
    ],
    practice: [
      P('c8-2-1', 1, r`Find the area between $y = x$ and $y = x^2$.`, ['1/6', '0.1667'], 'Intersections at 0 and 1.', [r`$\int_0^1 (x - x^2)\,dx = \frac{1}{6}$.`], { check: () => near(integ((x) => x - x * x, 0, 1), 1 / 6) }),
      P('c8-2-2', 1, r`Find the area between $y = 4 - x^2$ and the $x$-axis (three decimal places).`, ['10.667', '32/3'], 'Limits ±2.', [r`$\int_{-2}^2 (4 - x^2)\,dx = 16 - \frac{16}{3} = \frac{32}{3}$.`], { check: () => near(integ((x) => 4 - x * x, -2, 2), 32 / 3) }),
      P('c8-2-3', 1, r`Find the area between $y = 2x$ and $y = x^2$ (three decimal places).`, ['1.333', '4/3'], 'Intersections at 0 and 2.', [r`$\int_0^2 (2x - x^2)\,dx = 4 - \frac{8}{3} = \frac{4}{3}$.`], { check: () => near(integ((x) => 2 * x - x * x, 0, 2), 4 / 3) }),
      P('c8-2-4', 2, r`Find the area between $x = y^2$ and $x = y + 2$.`, ['4.5', '9/2'], 'Integrate in y: right − left.', [r`Limits $y = -1$ to $2$.`, r`$\left[\frac{y^2}{2} + 2y - \frac{y^3}{3}\right]_{-1}^2 = \frac{10}{3} + \frac{7}{6} = \frac{9}{2}$.`], { check: () => near(integ((y) => y + 2 - y * y, -1, 2), 4.5) }),
      P('c8-2-5', 2, r`Find the area between $y = \cos x$ and $y = \sin x$ for $0 \le x \le \frac{\pi}{4}$ (three decimal places).`, ['0.414', 'sqrt(2)-1'], 'cos x is on top here.', [r`$[\sin x + \cos x]_0^{\pi/4} = \sqrt{2} - 1 \approx 0.414$.`], { check: () => near(integ((x) => Math.cos(x) - Math.sin(x), 0, Math.PI / 4), Math.SQRT2 - 1) }),
      P('c8-2-6', 3, r`Find the total area enclosed by $y = x^3$ and $y = x$.`, ['1/2', '0.5'], 'They cross at −1, 0, 1; top and bottom swap at 0.', [r`On $[-1, 0]$, $x^3 \ge x$; on $[0, 1]$, $x \ge x^3$.`, r`By symmetry: $2\int_0^1 (x - x^3)\,dx = 2\left(\frac{1}{2} - \frac{1}{4}\right) = \frac{1}{2}$.`], { check: () => near(integ((x) => Math.abs(x ** 3 - x), -1, 0) + integ((x) => Math.abs(x - x ** 3), 0, 1), 0.5) }),
    ],
    remember: ['Area = ∫(top − bottom) dx or ∫(right − left) dy.', 'Intersections are the limits.', 'Split where curves cross.'],
    checkIn: 'Next: volumes with known cross sections, a step toward discs and washers.',
  },
  {
    id: 'c8-3', unit: 8, n: 3, title: 'Volumes with known cross sections',
    intro: 'Imagine a loaf of bread sliced perpendicular to the x-axis. If you know the area of each slice, the volume is the integral of the slice areas. The base region tells you the slice size; the shape (square, semicircle, triangle) tells you the area formula.',
    goals: ['Find the side length of a cross section from the base region', 'Use area formulas for common cross-section shapes', 'Set up and evaluate the volume integral'],
    notes: [
      { k: 'formula', t: r`V = \int_a^b A(x)\,dx` },
      { k: 'list', items: [r`Square with side $s$: $A = s^2$.`, r`Semicircle with diameter $s$: $A = \frac{\pi}{8}s^2$.`, r`Equilateral triangle with side $s$: $A = \frac{\sqrt{3}}{4}s^2$.`, r`Isosceles right triangle with leg $s$: $A = \frac{1}{2}s^2$.`, r`Rectangle with base $s$ and height $h$: $A = sh$.`] },
      { k: 'p', t: r`The side length $s$ is the distance across the base at position $x$: top curve minus bottom curve.` },
      { k: 'tip', t: r`Cross sections perpendicular to the $y$-axis: use $s(y)$ = right minus left and integrate $dy$.` },
      { k: 'warn', t: r`Semicircles: $s$ is the diameter, so the radius is $\frac{s}{2}$ and the area is $\frac{1}{2}\pi\left(\frac{s}{2}\right)^2 = \frac{\pi}{8}s^2$.` },
    ],
    examples: [
      { q: r`The base is the region under $y = \sqrt{x}$ on $[0, 4]$. Cross sections perpendicular to the $x$-axis are squares. Volume?`, steps: [r`$s = \sqrt{x}$, $A = x$.`, r`$\int_0^4 x\,dx = 8$.`], a: '8' },
      { q: r`Same idea with base under $y = 1 - x^2$ (above the $x$-axis) and equilateral triangle cross sections.`, steps: [r`$A = \frac{\sqrt{3}}{4}(1 - x^2)^2$.`, r`$\frac{\sqrt{3}}{4}\int_{-1}^1 (1 - x^2)^2\,dx = \frac{\sqrt{3}}{4}\cdot\frac{16}{15} = \frac{4\sqrt{3}}{15}$.`], a: '4√3/15' },
    ],
    practice: [
      P('c8-3-1', 1, r`Base: under $y = \sqrt{x}$ on $[0, 4]$. Cross sections perpendicular to the $x$-axis are squares. Find the volume.`, ['8'], 'A = (√x)² = x.', [r`$\int_0^4 x\,dx = 8$.`], { check: () => near(integ((x) => Math.sqrt(x) ** 2, 0, 4), 8) }),
      P('c8-3-2', 2, r`Base: between $y = 2\sqrt{x}$ and the $x$-axis on $[0, 2]$. Cross sections perpendicular to the $x$-axis are semicircles. Find the volume (three decimal places).`, ['3.142', 'pi'], 'A = (π/8)s² with s = 2√x.', [r`$A = \frac{\pi}{8}(4x) = \frac{\pi x}{2}$.`, r`$\int_0^2 \frac{\pi x}{2}\,dx = \pi$.`], { check: () => near(integ((x) => (Math.PI / 8) * (2 * Math.sqrt(x)) ** 2, 0, 2), Math.PI) }),
      P('c8-3-3', 1, r`Base: the triangle under $y = x$ on $[0, 2]$. Square cross sections perpendicular to the $x$-axis. Volume? (three decimal places)`, ['2.667', '8/3'], 's = x.', [r`$\int_0^2 x^2\,dx = \frac{8}{3}$.`], { check: () => near(integ((x) => x * x, 0, 2), 8 / 3) }),
      P('c8-3-4', 2, r`Base: under $y = 4 - x^2$, above the $x$-axis. Square cross sections perpendicular to the $x$-axis. Volume? (three decimal places)`, ['34.133', '512/15'], '∫₋₂² (4 − x²)² dx.', [r`$2\int_0^2 (16 - 8x^2 + x^4)\,dx = 2\left(32 - \frac{64}{3} + \frac{32}{5}\right) = \frac{512}{15}$.`], { check: () => near(integ((x) => (4 - x * x) ** 2, -2, 2), 512 / 15) }),
      P('c8-3-5', 2, r`Base: under $y = 1 - x^2$, above the $x$-axis. Cross sections perpendicular to the $x$-axis are equilateral triangles. Volume? (four decimal places)`, ['0.4619'], 'A = (√3/4)s².', [r`$\frac{\sqrt{3}}{4}\cdot\frac{16}{15} = \frac{4\sqrt{3}}{15} \approx 0.4619$.`], { check: () => near(integ((x) => (Math.sqrt(3) / 4) * (1 - x * x) ** 2, -1, 1), (4 * Math.sqrt(3)) / 15) }),
      P('c8-3-6', 3, r`Base: under $y = e^{-x}$ on $[0, 1]$. Square cross sections perpendicular to the $x$-axis. Volume? (three decimal places)`, ['0.432'], '∫₀¹ e^(−2x) dx.', [r`$\left[-\frac{e^{-2x}}{2}\right]_0^1 = \frac{1 - e^{-2}}{2} \approx 0.432$.`], { check: () => near(integ((x) => Math.exp(-2 * x), 0, 1), (1 - Math.exp(-2)) / 2) }),
    ],
    remember: ['V = ∫ A(x) dx.', 's = top − bottom across the base.', 'Semicircle: (π/8)s²; equilateral: (√3/4)s².'],
    checkIn: 'Next: solids of revolution, where the cross sections are circles and washers.',
  },
  {
    id: 'c8-4', unit: 8, n: 4, title: 'Volumes of revolution: discs and washers',
    intro: 'Spin a region around a line and you get a solid whose slices are discs (or discs with holes: washers). The radius is the distance from the axis to the curve. Getting the radius right, especially around lines other than the axes, is the whole game.',
    goals: ['Use the disc method', 'Use the washer method', 'Revolve around the y-axis and other horizontal or vertical lines', 'Write the radius as a distance'],
    notes: [
      { k: 'formula', t: r`\text{Disc: } V = \pi\int_a^b R(x)^2\,dx \qquad \text{Washer: } V = \pi\int_a^b \left[R(x)^2 - r(x)^2\right]dx` },
      { k: 'p', t: r`$R$ is the outer radius (axis to far curve), $r$ the inner radius (axis to near curve). Both are distances, so they are positive.` },
      { k: 'rule', title: 'Other axes', t: r`About $y = k$: radius $= |f(x) - k|$. About $x = h$: integrate in $y$ with radius $= |g(y) - h|$.` },
      { k: 'tip', t: r`Slices are perpendicular to the axis of rotation. Horizontal axis → $dx$; vertical axis → $dy$.` },
      { k: 'warn', t: r`$\pi\int (R - r)^2 \ne \pi\int (R^2 - r^2)$. Square each radius separately.` },
    ],
    examples: [
      { q: r`Revolve the region under $y = \sqrt{x}$ on $[0, 4]$ about the $x$-axis.`, steps: [r`$R = \sqrt{x}$.`, r`$\pi\int_0^4 x\,dx = 8\pi$.`], a: '8π' },
      { q: r`Revolve the region between $y = x$ and $y = x^2$ about the $x$-axis.`, steps: [r`$R = x$, $r = x^2$.`, r`$\pi\int_0^1 (x^2 - x^4)\,dx = \pi\left(\frac{1}{3} - \frac{1}{5}\right) = \frac{2\pi}{15}$.`], a: '2π/15' },
    ],
    practice: [
      P('c8-4-1', 1, r`Revolve the region under $y = \sqrt{x}$, $0 \le x \le 4$, about the $x$-axis. Volume? (three decimal places)`, ['25.133', '8pi'], 'R = √x.', [r`$\pi\int_0^4 x\,dx = 8\pi \approx 25.133$.`], { check: () => near(Math.PI * integ((x) => x, 0, 4), 8 * Math.PI) }),
      P('c8-4-2', 1, r`Revolve the region under $y = x^2$, $0 \le x \le 1$, about the $x$-axis (three decimal places).`, ['0.628', 'pi/5'], 'R = x².', [r`$\pi\int_0^1 x^4\,dx = \frac{\pi}{5} \approx 0.628$.`], { check: () => near(Math.PI * integ((x) => x ** 4, 0, 1), Math.PI / 5) }),
      P('c8-4-3', 2, r`Revolve the region between $y = x$ and $y = x^2$ about the $x$-axis (three decimal places).`, ['0.419', '2pi/15'], 'Washer: R = x, r = x².', [r`$\pi\int_0^1 (x^2 - x^4)\,dx = \frac{2\pi}{15} \approx 0.419$.`], { check: () => near(Math.PI * integ((x) => x * x - x ** 4, 0, 1), (2 * Math.PI) / 15) }),
      P('c8-4-4', 2, r`The region bounded by $y = x^2$, $y = 1$ and $x = 0$ (with $x \ge 0$) is revolved about the $y$-axis. Volume? (three decimal places)`, ['1.571', 'pi/2'], 'Discs in y: radius x = √y.', [r`$\pi\int_0^1 (\sqrt{y})^2\,dy = \pi\int_0^1 y\,dy = \frac{\pi}{2}$.`], { check: () => near(Math.PI * integ((y) => y, 0, 1), Math.PI / 2) }),
      P('c8-4-5', 3, r`The region between $y = x^2$ and $y = 1$ is revolved about the line $y = 1$. Volume? (three decimal places)`, ['3.351', '16pi/15'], 'Radius = 1 − x², x from −1 to 1.', [r`$\pi\int_{-1}^1 (1 - x^2)^2\,dx = \pi\cdot\frac{16}{15} \approx 3.351$.`], { check: () => near(Math.PI * integ((x) => (1 - x * x) ** 2, -1, 1), (16 * Math.PI) / 15) }),
      P('c8-4-6', 2, r`Revolve the region under $y = e^x$, $0 \le x \le 1$, about the $x$-axis (three decimal places).`, ['10.036'], 'π∫ e^(2x) dx.', [r`$\pi\left[\frac{e^{2x}}{2}\right]_0^1 = \frac{\pi(e^2 - 1)}{2} \approx 10.036$.`], { check: () => near(Math.PI * integ((x) => Math.exp(2 * x), 0, 1), (Math.PI * (Math.E ** 2 - 1)) / 2) }),
    ],
    remember: ['Disc: π∫R². Washer: π∫(R² − r²).', 'Radius = distance from the axis.', 'Square each radius separately.'],
    checkIn: 'Last lesson of Unit 8: arc length (BC).',
  },
  {
    id: 'c8-5', unit: 8, n: 5, title: 'Arc length',
    intro: 'How long is a curve? Zoom in and every small piece looks like the hypotenuse of a tiny right triangle with legs dx and dy. Add up the hypotenuses and you get the arc length formula. On the exam, most arc length integrals are done on the calculator, but some are built to work out by hand.',
    goals: ['Derive and apply the arc length formula', 'Simplify 1 + (f′)² when it is a perfect square', 'Set up arc length for calculator evaluation'],
    notes: [
      { k: 'formula', t: r`L = \int_a^b \sqrt{1 + \left[f'(x)\right]^2}\,dx` },
      { k: 'p', t: r`It comes from $\sqrt{dx^2 + dy^2} = \sqrt{1 + \left(\frac{dy}{dx}\right)^2}\,dx$, the Pythagorean theorem on a tiny piece.` },
      { k: 'tip', t: r`Hand-computable arc lengths are designed so that $1 + (f')^2$ is a perfect square, like $\left(\frac{x^2}{2} + \frac{1}{2x^2}\right)^2$.` },
      { k: 'p', t: r`In terms of $y$: $L = \int_c^d \sqrt{1 + \left[g'(y)\right]^2}\,dy$ for $x = g(y)$.` },
      { k: 'warn', t: r`The square is on the derivative, not the function: $\sqrt{1 + f'(x)^2}$, not $\sqrt{1 + f(x)^2}$.` },
    ],
    examples: [
      { q: r`Length of $y = \frac{2}{3}x^{3/2}$ from $x = 0$ to $x = 3$.`, steps: [r`$y' = x^{1/2}$, so $1 + (y')^2 = 1 + x$.`, r`$\int_0^3 \sqrt{1 + x}\,dx = \frac{2}{3}(4^{3/2} - 1) = \frac{14}{3}$.`], a: '14/3' },
      { q: r`Length of $y = \ln(\cos x)$ on $[0, \frac{\pi}{4}]$.`, steps: [r`$y' = -\tan x$; $1 + \tan^2 x = \sec^2 x$.`, r`$\int_0^{\pi/4} \sec x\,dx = \ln(\sqrt{2} + 1) \approx 0.881$.`], a: 'ln(√2 + 1)' },
    ],
    practice: [
      P('c8-5-1', 1, r`Length of $y = \frac{2}{3}x^{3/2}$ from $x = 0$ to $x = 3$ (three decimal places).`, ['4.667', '14/3'], '1 + (y′)² = 1 + x.', [r`$\frac{2}{3}(8 - 1) = \frac{14}{3}$.`], { check: () => near(arc((x) => (2 / 3) * Math.max(x, 0) ** 1.5, 0.0001, 3) + 0.0001, 14 / 3, 1e-3) }),
      P('c8-5-2', 1, r`Length of $y = 3x$ from $x = 0$ to $x = 4$ (three decimal places).`, ['12.649', '4sqrt(10)'], 'Constant integrand √10.', [r`$\int_0^4 \sqrt{10}\,dx = 4\sqrt{10} \approx 12.649$.`], { check: () => near(arc((x) => 3 * x, 0, 4), 4 * Math.sqrt(10)) }),
      P('c8-5-3', 2, r`Length of $y = x^2$ from $x = 0$ to $x = 1$ (three decimal places, calculator).`, ['1.479'], '∫₀¹ √(1 + 4x²) dx.', [r`$\int_0^1 \sqrt{1 + 4x^2}\,dx \approx 1.479$.`], { check: () => near(integ((x) => Math.sqrt(1 + 4 * x * x), 0, 1), 1.479, 1e-3) }),
      P('c8-5-4', 2, r`Length of $y = \ln(\cos x)$ for $0 \le x \le \frac{\pi}{4}$ (three decimal places).`, ['0.881'], '1 + tan² x = sec² x.', [r`$\int_0^{\pi/4}\sec x\,dx = \ln(\sec x + \tan x)\Big|_0^{\pi/4} = \ln(\sqrt{2} + 1) \approx 0.881$.`], { check: () => near(arc((x) => Math.log(Math.cos(x)), 0, Math.PI / 4), Math.log(Math.SQRT2 + 1)) }),
      P('c8-5-5', 1, r`Which integral gives the length of $y = f(x)$ from $x = a$ to $x = b$?`, 2, 'Pythagorean theorem on dx and dy.', [r`$L = \int_a^b \sqrt{1 + [f'(x)]^2}\,dx$.`], { choices: [r`$\int_a^b \sqrt{1 + f(x)^2}\,dx$`, r`$\int_a^b (1 + f'(x))\,dx$`, r`$\int_a^b \sqrt{1 + [f'(x)]^2}\,dx$`, r`$\pi\int_a^b f(x)^2\,dx$`] }),
      P('c8-5-6', 3, r`Length of $y = \frac{x^3}{6} + \frac{1}{2x}$ from $x = 1$ to $x = 2$ (four decimal places).`, ['1.4167', '17/12'], '1 + (y′)² is a perfect square.', [r`$y' = \frac{x^2}{2} - \frac{1}{2x^2}$, and $1 + (y')^2 = \left(\frac{x^2}{2} + \frac{1}{2x^2}\right)^2$.`, r`$\int_1^2 \left(\frac{x^2}{2} + \frac{1}{2x^2}\right)dx = \left[\frac{x^3}{6} - \frac{1}{2x}\right]_1^2 = \frac{17}{12}$.`], { check: () => near(arc((x) => x ** 3 / 6 + 1 / (2 * x), 1, 2), 17 / 12) }),
    ],
    remember: ['L = ∫√(1 + (f′)²) dx.', 'By hand: look for a perfect square.', 'Square the derivative, not the function.'],
    checkIn: 'Unit 8 complete. Take the review. Unit 9 brings parametric and polar curves (BC only).',
  },
];
