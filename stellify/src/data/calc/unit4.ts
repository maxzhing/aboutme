import type { CalcLesson, CalcProblem } from './types';
import { d, d2, near } from './types';

const r = String.raw;
const P = (id: string, level: 1 | 2 | 3, q: string, answer: number | string[], hint: string, solution: string[], extra: Partial<CalcProblem> = {}): CalcProblem => ({ id, level, q, answer, hint, solution, ...extra });

/** Unit 4 · Contextual Applications of Differentiation. Original lessons and problems. */
export const UNIT4: CalcLesson[] = [
  {
    id: 'c4-1', unit: 4, n: 1, title: 'Derivatives in context and straight-line motion',
    intro: 'A derivative is a rate, and rates have units and meanings. Today you learn to say what a derivative means in a real sentence, and you master motion along a line: velocity, acceleration, speed, and when a particle speeds up. Free-response questions ask about this every single year.',
    goals: ['Interpret a derivative with units in context', 'Find velocity and acceleration from position', 'Decide when a particle is at rest, moving left or right, or changing direction', 'Decide when a particle is speeding up or slowing down'],
    notes: [
      { k: 'p', t: r`If $V(t)$ is volume in liters and $t$ is in minutes, then $V'(5) = -3$ means: at $t = 5$ minutes, the volume is decreasing at 3 liters per minute. Always give the time, the quantity, the direction and the units.` },
      { k: 'formula', t: r`v(t) = s'(t) \qquad a(t) = v'(t) = s''(t) \qquad \text{speed} = |v(t)|` },
      { k: 'list', items: [r`At rest: $v(t) = 0$.`, r`Moving right (or up): $v(t) > 0$; moving left: $v(t) < 0$.`, r`Changes direction: $v$ changes sign (not just touches 0).`, r`Speeding up: $v$ and $a$ have the SAME sign. Slowing down: opposite signs.`] },
      { k: 'tip', t: r`Make a sign chart of $v(t)$ by finding where $v = 0$ and testing a point in each interval. Most motion questions can be read straight off that chart.` },
      { k: 'warn', t: r`“Speeding up” does not mean “acceleration is positive.” A particle moving left ($v < 0$) with $a < 0$ is speeding up.` },
    ],
    examples: [
      { q: r`$s(t) = t^3 - 6t^2 + 9t$. When is the particle at rest, and when does it move left?`, steps: [r`$v(t) = 3t^2 - 12t + 9 = 3(t - 1)(t - 3)$.`, r`At rest at $t = 1$ and $t = 3$.`, r`$v < 0$ between them: the particle moves left for $1 < t < 3$.`], a: 'rest at t = 1, 3; left on (1, 3)' },
      { q: r`At $t = 2$ for the same particle, is it speeding up or slowing down?`, steps: [r`$v(2) = 12 - 24 + 9 = -3 < 0$. $a(t) = 6t - 12$, so $a(2) = 0$.`, r`At exactly $t = 2$ it is neither; just after, $a > 0$ while $v < 0$, so it slows down.`], a: 'neither at t = 2' },
    ],
    practice: [
      P('c4-1-1', 1, r`$V(t)$ is the volume of water, in liters, in a tank $t$ minutes after noon, and $V'(5) = -3$. What does this mean?`, 2, 'Time, quantity, direction, units.', [r`$V'(5)$ is the rate of change of volume at $t = 5$: the volume is decreasing at 3 liters per minute at 12:05.`], { choices: ['The tank holds 3 liters at 12:05.', 'The tank lost 3 liters during the first 5 minutes.', 'At 12:05 the volume of water is decreasing at 3 liters per minute.', 'It takes 5 minutes to drain 3 liters.'] }),
      P('c4-1-2', 1, r`$s(t) = t^2 - 4t + 3$. Find the velocity at $t = 5$.`, ['6'], 'v = s′.', [r`$v(t) = 2t - 4$, so $v(5) = 6$.`], { check: () => near(d((t) => t * t - 4 * t + 3, 5), 6) }),
      P('c4-1-3', 1, r`For $s(t) = t^2 - 4t + 3$, at what time is the particle at rest?`, ['2'], 'Set v = 0.', [r`$2t - 4 = 0$, so $t = 2$.`], { check: () => near(d((t) => t * t - 4 * t + 3, 2), 0) }),
      P('c4-1-4', 2, r`A particle has velocity $v(t) = t^2 - 5t + 4$. At $t = 2$ the particle is…`, 0, 'Compare the signs of v(2) and a(2).', [r`$v(2) = 4 - 10 + 4 = -2$ and $a(t) = 2t - 5$, so $a(2) = -1$.`, r`Same sign: the particle is speeding up.`], { choices: ['speeding up', 'slowing down', 'at rest', 'moving right'] }),
      P('c4-1-5', 2, r`$s(t) = 2t^3 - 15t^2 + 36t$. How many times does the particle change direction for $0 < t < 10$?`, ['2'], 'Factor v(t) and look for sign changes.', [r`$v(t) = 6t^2 - 30t + 36 = 6(t - 2)(t - 3)$.`, r`$v$ changes sign at $t = 2$ and $t = 3$: two changes of direction.`], { check: () => { const v = (t: number) => 6 * (t - 2) * (t - 3); return v(1) > 0 && v(2.5) < 0 && v(4) > 0; } }),
      P('c4-1-6', 3, r`$s(t) = \sin(\pi t)$. Find the acceleration at $t = \frac{1}{2}$ to three decimal places.`, ['-9.870'], 'Differentiate twice; the chain rule gives a factor of π each time.', [r`$a(t) = -\pi^2\sin(\pi t)$.`, r`$a(\frac{1}{2}) = -\pi^2 \approx -9.870$.`], { check: () => near(d2((t) => Math.sin(Math.PI * t), 0.5), -(Math.PI ** 2), 1e-3) }),
    ],
    remember: ['Interpret: at time t, quantity is increasing/decreasing at rate with units.', 'Speeding up ⇔ v and a have the same sign.', 'Direction changes only where v changes sign.'],
    checkIn: 'Practice writing the full interpretation sentence for problem 1 in your own words. Next: related rates.',
  },
  {
    id: 'c4-2', unit: 4, n: 2, title: 'Related rates',
    intro: 'Related rates questions describe several quantities changing at once: a ladder sliding, a balloon inflating, a tank filling. If you know how fast one changes, the chain rule tells you how fast the others change. The method is always the same five steps.',
    goals: ['Set up an equation linking the quantities', 'Differentiate with respect to time', 'Substitute values only after differentiating', 'Handle cones, ladders, circles and distances'],
    notes: [
      { k: 'list', items: [r`1. Draw a picture and name every changing quantity with a variable.`, r`2. Write down the given rate(s) and the rate you want, with signs (decreasing → negative).`, r`3. Write an equation relating the variables (geometry, Pythagorean theorem, similar triangles).`, r`4. Differentiate both sides with respect to $t$ (every variable gets a $\frac{d}{dt}$).`, r`5. Substitute the values at the instant asked, then solve.`] },
      { k: 'warn', t: r`Never plug in a value that changes (like the current radius) before you differentiate. Constants only may be substituted early.` },
      { k: 'tip', t: r`Cones: use similar triangles to remove one variable before differentiating. If a tank has radius 3 and height 6, then $r = \frac{h}{2}$ at every water level.` },
      { k: 'formula', t: r`A = \pi r^2 \;\Rightarrow\; \frac{dA}{dt} = 2\pi r\frac{dr}{dt} \qquad V = \tfrac{4}{3}\pi r^3 \;\Rightarrow\; \frac{dV}{dt} = 4\pi r^2\frac{dr}{dt}` },
      { k: 'p', t: r`Units check every answer: if volume is in cm³ and time in seconds, $\frac{dV}{dt}$ is in cm³ per second. A rate that should be shrinking must come out negative; if it does not, recheck the sign of a given rate.` },
    ],
    examples: [
      { q: r`A 10 ft ladder slides away from a wall at 1 ft/s. How fast does the top slide down when the bottom is 6 ft from the wall?`, steps: [r`$x^2 + y^2 = 100$, $\frac{dx}{dt} = 1$.`, r`$2x\frac{dx}{dt} + 2y\frac{dy}{dt} = 0$.`, r`At $x = 6$, $y = 8$: $6(1) + 8\frac{dy}{dt} = 0$, so $\frac{dy}{dt} = -\frac{3}{4}$ ft/s.`], a: '3/4 ft/s downward' },
      { q: r`A circle’s radius grows at 2 cm/s. How fast is the area growing when $r = 5$?`, steps: [r`$\frac{dA}{dt} = 2\pi r\frac{dr}{dt} = 2\pi(5)(2)$.`, r`$= 20\pi \approx 62.8$ cm²/s.`], a: '20π' },
    ],
    practice: [
      P('c4-2-1', 1, r`The radius of a circle increases at 2 cm/s. How fast is the area increasing when $r = 5$ cm? (three decimal places)`, ['62.832', '20pi'], 'dA/dt = 2πr dr/dt.', [r`$2\pi(5)(2) = 20\pi \approx 62.832$ cm²/s.`], { check: () => near(2 * Math.PI * 5 * 2, 62.832, 1e-4) }),
      P('c4-2-2', 2, r`A spherical balloon’s radius grows at 0.5 cm/s. How fast is its volume growing when $r = 3$ cm? (three decimal places)`, ['56.549', '18pi'], 'dV/dt = 4πr² dr/dt.', [r`$4\pi(9)(0.5) = 18\pi \approx 56.549$ cm³/s.`], { check: () => near(4 * Math.PI * 9 * 0.5, 18 * Math.PI) }),
      P('c4-2-3', 2, r`A 13 ft ladder leans on a wall. The bottom slides away at 2 ft/s. How fast is the top moving when the bottom is 5 ft from the wall? (negative means downward)`, ['-5/6', '-0.833'], 'x² + y² = 169; find y first.', [r`At $x = 5$, $y = 12$.`, r`$2x x' + 2y y' = 0$: $5(2) + 12y' = 0$.`, r`$y' = -\frac{5}{6}$ ft/s.`], { check: () => near((-5 * 2) / 12, -5 / 6) }),
      P('c4-2-4', 1, r`The edge of a cube grows at 0.1 cm/s. How fast is the volume growing when the edge is 4 cm?`, ['4.8'], 'V = s³.', [r`$\frac{dV}{dt} = 3s^2\frac{ds}{dt} = 3(16)(0.1) = 4.8$ cm³/s.`], { check: () => near(3 * 16 * 0.1, 4.8) }),
      P('c4-2-5', 3, r`Water pours at 9 ft³/min into an inverted cone with top radius 3 ft and height 6 ft. How fast is the water level rising when it is 3 ft deep? (three decimal places)`, ['1.273', '4/pi'], 'Similar triangles: r = h/2, so V = πh³/12.', [r`$V = \frac{1}{3}\pi\left(\frac{h}{2}\right)^2 h = \frac{\pi h^3}{12}$.`, r`$\frac{dV}{dt} = \frac{\pi h^2}{4}\frac{dh}{dt}$: $9 = \frac{9\pi}{4}\frac{dh}{dt}$.`, r`$\frac{dh}{dt} = \frac{4}{\pi} \approx 1.273$ ft/min.`], { check: () => near(9 / ((Math.PI * 9) / 4), 4 / Math.PI) }),
      P('c4-2-6', 2, r`Two cars leave the same point at the same time, one driving north at 40 mph and the other east at 30 mph. How fast is the distance between them increasing after 2 hours, in mph?`, ['50'], 'D² = x² + y².', [r`At $t = 2$: $x = 60$, $y = 80$, $D = 100$.`, r`$DD' = xx' + yy'$: $100D' = 60(30) + 80(40) = 5000$.`, r`$D' = 50$ mph.`], { check: () => near((60 * 30 + 80 * 40) / 100, 50) }),
    ],
    remember: ['Picture → variables → equation → d/dt → substitute.', 'Never substitute changing values before differentiating.', 'Cones: similar triangles first.'],
    checkIn: 'The cone problem is the hardest common type. If you got it, you are in good shape. Next: tangent line approximations.',
  },
  {
    id: 'c4-3', unit: 4, n: 3, title: 'Local linearity and linear approximation',
    intro: 'Zoom in far enough on a differentiable curve and it looks like a straight line. That line, the tangent line, gives quick and accurate estimates of function values. You will also learn to tell whether the estimate is too big or too small.',
    goals: ['Write the linearization of a function at a point', 'Use it to approximate values', 'Decide whether the approximation is an over- or underestimate'],
    notes: [
      { k: 'formula', t: r`L(x) = f(a) + f'(a)(x - a) \qquad f(x) \approx L(x) \text{ for } x \text{ near } a` },
      { k: 'p', t: r`Pick $a$ close to the value you want, where $f(a)$ and $f'(a)$ are easy. For $\sqrt{9.2}$, use $a = 9$.` },
      { k: 'rule', title: 'Over or under?', t: r`If $f$ is concave up near $a$ ($f'' > 0$), the tangent line lies below the curve: the approximation is an UNDERestimate. If concave down ($f'' < 0$), it is an OVERestimate.` },
      { k: 'tip', t: r`AP questions often give only $f(a)$ and $f'(a)$ in a table. You do not need a formula: $f(a + \Delta x) \approx f(a) + f'(a)\Delta x$.` },
      { k: 'warn', t: r`Linear approximations are only good NEAR $a$. Far away, the error can be large.` },
    ],
    examples: [
      { q: r`Approximate $\sqrt{4.1}$.`, steps: [r`$f(x) = \sqrt{x}$, $a = 4$: $f(4) = 2$, $f'(4) = \frac{1}{4}$.`, r`$L(4.1) = 2 + \frac{1}{4}(0.1) = 2.025$.`, r`$\sqrt{x}$ is concave down, so this is a slight overestimate.`], a: '2.025' },
      { q: r`$f(2) = 5$ and $f'(2) = -3$. Estimate $f(2.1)$.`, steps: [r`$f(2.1) \approx 5 + (-3)(0.1) = 4.7$.`], a: '4.7' },
    ],
    practice: [
      P('c4-3-1', 1, r`Use the tangent line at $x = 9$ to approximate $\sqrt{9.2}$ (three decimal places).`, ['3.033'], "f(9) = 3, f'(9) = 1/6.", [r`$L(9.2) = 3 + \frac{1}{6}(0.2) \approx 3.033$.`], { check: () => near(3 + 0.2 / 6, 3.0333, 1e-3) }),
      P('c4-3-2', 1, r`$f(2) = 5$ and $f'(2) = -3$. Use a linear approximation to estimate $f(2.1)$.`, ['4.7'], 'f(a) + f′(a)Δx.', [r`$5 - 3(0.1) = 4.7$.`], { check: () => near(5 - 0.3, 4.7) }),
      P('c4-3-3', 1, r`Use the tangent line to $\ln x$ at $x = 1$ to approximate $\ln(1.05)$.`, ['0.05'], 'ln 1 = 0 and the slope there is 1.', [r`$L(x) = 0 + 1(x - 1)$, so $L(1.05) = 0.05$.`], { check: () => Math.abs(Math.log(1.05) - 0.05) < 0.002 }),
      P('c4-3-4', 2, r`Use a linear approximation at $x = 2$ to estimate $(2.01)^4$.`, ['16.32'], "f(2) = 16, f'(2) = 32.", [r`$16 + 32(0.01) = 16.32$.`], { check: () => near(16 + 32 * 0.01, 16.32) && Math.abs(2.01 ** 4 - 16.32) < 0.01 }),
      P('c4-3-5', 2, r`If $f'' > 0$ near $x = a$, the tangent line approximation at $a$ gives…`, 0, 'Where is the tangent line relative to a concave-up curve?', [r`A concave-up curve lies above its tangent lines, so the tangent line value is too small: an underestimate.`], { choices: ['an underestimate', 'an overestimate', 'the exact value', 'no information'] }),
      P('c4-3-6', 3, r`Use a linear approximation at $x = 8$ to estimate $\sqrt[3]{8.3}$ (three decimal places).`, ['2.025'], "f'(x) = (1/3)x^(−2/3); at 8 it is 1/12.", [r`$f(8) = 2$, $f'(8) = \frac{1}{3 \cdot 4} = \frac{1}{12}$.`, r`$2 + \frac{0.3}{12} = 2.025$.`], { check: () => near(2 + d(Math.cbrt, 8) * 0.3, 2.025) }),
    ],
    remember: ["L(x) = f(a) + f'(a)(x − a).", 'Concave up → underestimate; concave down → overestimate.', 'Choose a nearby point with easy values.'],
    checkIn: 'Linearization connects to Unit 7 (Euler’s method) and Unit 10 (Taylor polynomials). Next: L’Hôpital’s rule.',
  },
  {
    id: 'c4-4', unit: 4, n: 4, title: 'L’Hôpital’s rule',
    intro: 'Remember all the algebra we did for 0/0 limits in Unit 1? L’Hôpital’s rule does many of those in one step, using derivatives. It also handles limits algebra cannot, like comparing x² with eˣ. You must check the form first, every time.',
    goals: ['Apply L’Hôpital’s rule to 0/0 and ∞/∞ forms', 'Apply it repeatedly when needed', 'Rewrite 0·∞ and 1^∞ forms so it applies', 'Justify its use on free response'],
    notes: [
      { k: 'rule', title: 'L’Hôpital’s rule', t: r`If $\lim f(x) = \lim g(x) = 0$, or both are $\pm\infty$, then $\lim \dfrac{f(x)}{g(x)} = \lim \dfrac{f'(x)}{g'(x)}$, provided the right side exists.` },
      { k: 'warn', t: r`Differentiate the top and bottom SEPARATELY. This is not the quotient rule. And it only applies to $\frac{0}{0}$ or $\frac{\infty}{\infty}$: using it elsewhere gives wrong answers.` },
      { k: 'p', t: r`If you still get $\frac{0}{0}$ after one round, apply the rule again.` },
      { k: 'list', items: [r`$0 \cdot \infty$: rewrite $x\ln x$ as $\frac{\ln x}{1/x}$.`, r`$1^\infty$, $0^0$, $\infty^0$: take $\ln$ of the expression, find that limit, then exponentiate.`] },
      { k: 'tip', t: r`On free response, write “this limit has the form $\frac{0}{0}$” (with the limits shown) before using the rule. Graders look for it.` },
    ],
    examples: [
      { q: r`$\lim\limits_{x \to 0} \dfrac{\sin 3x}{x}$`, steps: [r`Form $\frac{0}{0}$.`, r`L’Hôpital: $\lim \frac{3\cos 3x}{1} = 3$.`], a: '3' },
      { q: r`$\lim\limits_{x \to \infty} \dfrac{x^2}{e^x}$`, steps: [r`Form $\frac{\infty}{\infty}$: $\lim \frac{2x}{e^x}$, still $\frac{\infty}{\infty}$.`, r`Again: $\lim \frac{2}{e^x} = 0$.`], a: '0' },
    ],
    practice: [
      P('c4-4-1', 2, r`$\lim\limits_{x \to 0} \dfrac{e^x - 1 - x}{x^2}$`, ['1/2', '0.5'], 'Apply the rule twice.', [r`$\frac{0}{0}$: $\lim \frac{e^x - 1}{2x}$, still $\frac{0}{0}$.`, r`$\lim \frac{e^x}{2} = \frac{1}{2}$.`], { check: () => near((Math.exp(1e-3) - 1 - 1e-3) / 1e-6, 0.5, 1e-3) }),
      P('c4-4-2', 2, r`$\lim\limits_{x \to \infty} \dfrac{\ln x}{\sqrt{x}}$`, ['0'], '∞/∞: differentiate top and bottom.', [r`$\lim \frac{1/x}{1/(2\sqrt{x})} = \lim \frac{2}{\sqrt{x}} = 0$.`], { check: () => Math.log(1e12) / 1e6 < 1e-4 }),
      P('c4-4-3', 2, r`$\lim\limits_{x \to 0} \dfrac{1 - \cos 2x}{x^2}$`, ['2'], 'Two rounds of the rule.', [r`$\lim \frac{2\sin 2x}{2x} = \lim \frac{\sin 2x}{x}$.`, r`Again: $\lim \frac{2\cos 2x}{1} = 2$.`], { check: () => near((1 - Math.cos(2e-3)) / 1e-6, 2, 1e-3) }),
      P('c4-4-4', 1, r`$\lim\limits_{x \to 1} \dfrac{\ln x}{x - 1}$`, ['1'], '0/0 at x = 1.', [r`$\lim \frac{1/x}{1} = 1$.`], { check: () => near(Math.log(1 + 1e-6) / 1e-6, 1) }),
      P('c4-4-5', 2, r`$\lim\limits_{x \to 0^+} x\ln x$`, ['0'], 'Rewrite as ln x / (1/x).', [r`$\frac{\ln x}{1/x}$ has form $\frac{-\infty}{\infty}$.`, r`$\lim \frac{1/x}{-1/x^2} = \lim(-x) = 0$.`], { check: () => Math.abs(1e-8 * Math.log(1e-8)) < 1e-6 }),
      P('c4-4-6', 3, r`$\lim\limits_{x \to \infty} \left(1 + \frac{3}{x}\right)^x$, to three decimal places.`, ['20.086', 'e^3'], 'Take ln: x ln(1 + 3/x), a 0·∞ form.', [r`$\ln y = \frac{\ln(1 + 3/x)}{1/x} \to$ (L’Hôpital) $\frac{3}{1 + 3/x} \to 3$.`, r`So $y \to e^3 \approx 20.086$.`], { check: () => near((1 + 3 / 1e7) ** 1e7, Math.exp(3), 1e-4) }),
    ],
    remember: ['Check the form: only 0/0 or ∞/∞.', 'Top and bottom separately; not the quotient rule.', '1^∞ and 0·∞: rewrite (use ln) first.'],
    checkIn: 'Unit 4 done. Take the review. Unit 5 is one of the heaviest on the exam: extrema, concavity and optimization.',
  },
];
