import type { CalcLesson, CalcProblem } from './types';
import { d, integ, near } from './types';

const r = String.raw;
const P = (id: string, level: 1 | 2 | 3, q: string, answer: number | string[], hint: string, solution: string[], extra: Partial<CalcProblem> = {}): CalcProblem => ({ id, level, q, answer, hint, solution, ...extra });
type F = (t: number) => number;
/** dy/dx for a parametric curve */
const pslope = (x: F, y: F, t: number) => d(y, t) / d(x, t);
/** dy/dx for a polar curve r(θ) */
const polarSlope = (rr: F, th: number) => pslope((t) => rr(t) * Math.cos(t), (t) => rr(t) * Math.sin(t), th);
const polarArea = (rr: F, a: number, b: number) => 0.5 * integ((t) => rr(t) ** 2, a, b);

/** Unit 9 · Parametric Equations, Polar Coordinates and Vector-Valued Functions (BC). Original lessons and problems. */
export const UNIT9: CalcLesson[] = [
  {
    id: 'c9-1', unit: 9, n: 1, title: 'Parametric curves and their derivatives',
    intro: 'A parametric curve gives x and y separately as functions of a third variable t, usually time. It can loop, cross itself and move in either direction, which a function y = f(x) cannot. Derivatives come straight from the chain rule.',
    goals: ['Find dy/dx for a parametric curve', 'Find horizontal and vertical tangents', 'Find d²y/dx² for a parametric curve', 'Write a tangent line at a given t'],
    notes: [
      { k: 'formula', t: r`\frac{dy}{dx} = \frac{dy/dt}{dx/dt} \qquad \frac{d^2y}{dx^2} = \frac{\frac{d}{dt}\left(\frac{dy}{dx}\right)}{dx/dt}` },
      { k: 'rule', title: 'Tangents', t: r`Horizontal tangent: $\frac{dy}{dt} = 0$ and $\frac{dx}{dt} \ne 0$. Vertical tangent: $\frac{dx}{dt} = 0$ and $\frac{dy}{dt} \ne 0$.` },
      { k: 'warn', t: r`For the second derivative, divide by $\frac{dx}{dt}$ again. $\frac{d^2y}{dx^2}$ is NOT $\frac{d^2y/dt^2}{d^2x/dt^2}$.` },
      { k: 'p', t: r`To write a tangent line at $t = t_0$: point $(x(t_0), y(t_0))$, slope $\frac{dy}{dx}$ at $t_0$.` },
      { k: 'tip', t: r`To eliminate the parameter, solve one equation for $t$ and substitute, or use $\cos^2 t + \sin^2 t = 1$ for trig curves.` },
    ],
    examples: [
      { q: r`$x = t^2$, $y = t^3$. Find $\frac{dy}{dx}$ at $t = 2$.`, steps: [r`$\frac{dy}{dx} = \frac{3t^2}{2t} = \frac{3t}{2}$.`, r`At $t = 2$: 3.`], a: '3' },
      { q: r`Same curve: $\frac{d^2y}{dx^2}$ at $t = 1$.`, steps: [r`$\frac{d}{dt}\left(\frac{3t}{2}\right) = \frac{3}{2}$.`, r`Divide by $\frac{dx}{dt} = 2t$: $\frac{3}{4t}$, which is $\frac{3}{4}$ at $t = 1$.`], a: '3/4' },
    ],
    practice: [
      P('c9-1-1', 1, r`$x = t^2$, $y = t^3$. Find $\frac{dy}{dx}$ at $t = 2$.`, ['3'], '(dy/dt)/(dx/dt).', [r`$\frac{3t}{2} = 3$ at $t = 2$.`], { check: () => near(pslope((t) => t * t, (t) => t ** 3, 2), 3) }),
      P('c9-1-2', 1, r`$x = \cos t$, $y = \sin t$. Find $\frac{dy}{dx}$ at $t = \frac{\pi}{4}$.`, ['-1'], 'dy/dx = cos t / (−sin t).', [r`$-\cot\frac{\pi}{4} = -1$.`], { check: () => near(pslope(Math.cos, Math.sin, Math.PI / 4), -1) }),
      P('c9-1-3', 1, r`$x = 2t$, $y = \frac{1}{t}$. Find $\frac{dy}{dx}$ at $t = 1$.`, ['-1/2', '-0.5'], 'dy/dt = −1/t².', [r`$\frac{-1/t^2}{2} = -\frac{1}{2}$.`], { check: () => near(pslope((t) => 2 * t, (t) => 1 / t, 1), -0.5) }),
      P('c9-1-4', 2, r`$x = t^2$, $y = t^3$. Find $\frac{d^2y}{dx^2}$ at $t = 1$.`, ['3/4', '0.75'], 'Differentiate 3t/2 in t, then divide by 2t.', [r`$\frac{3/2}{2t} = \frac{3}{4}$ at $t = 1$.`], { check: () => near(d((t) => pslope((s) => s * s, (s) => s ** 3, t), 1, 1e-3) / d((t) => t * t, 1), 0.75, 1e-3) }),
      P('c9-1-5', 2, r`$x = t^2 + 1$, $y = t^3 - 12t$. At what $t > 0$ is the tangent horizontal?`, ['2'], 'Set dy/dt = 0.', [r`$3t^2 - 12 = 0$, so $t = 2$; $\frac{dx}{dt} = 4 \ne 0$.`], { check: () => Math.abs(d((t) => t ** 3 - 12 * t, 2)) < 1e-6 && Math.abs(d((t) => t * t + 1, 2)) > 0 }),
      P('c9-1-6', 2, r`$x = t^3 - 3t$, $y = t^2$. At what $t > 0$ is the tangent vertical?`, ['1'], 'Set dx/dt = 0.', [r`$3t^2 - 3 = 0$, so $t = 1$; $\frac{dy}{dt} = 2 \ne 0$.`], { check: () => Math.abs(d((t) => t ** 3 - 3 * t, 1)) < 1e-6 && Math.abs(d((t) => t * t, 1)) > 1 }),
    ],
    remember: ['dy/dx = (dy/dt)/(dx/dt).', 'Horizontal: dy/dt = 0. Vertical: dx/dt = 0.', 'Second derivative: divide by dx/dt again.'],
    checkIn: 'Next: arc length of parametric curves and particles moving in the plane.',
  },
  {
    id: 'c9-2', unit: 9, n: 2, title: 'Parametric arc length and vector-valued motion',
    intro: 'A particle moving in the plane has a position vector ⟨x(t), y(t)⟩. Its velocity and acceleration are vectors too, its speed is the length of the velocity, and the distance it travels is the integral of speed. This is a guaranteed free-response topic on BC.',
    goals: ['Compute velocity, acceleration and speed vectors', 'Find arc length / distance traveled for a parametric path', 'Recover position from velocity with an initial condition'],
    notes: [
      { k: 'formula', t: r`\vec r(t) = \langle x(t), y(t)\rangle \qquad \vec v(t) = \langle x'(t), y'(t)\rangle \qquad \vec a(t) = \langle x''(t), y''(t)\rangle` },
      { k: 'formula', t: r`\text{speed} = |\vec v(t)| = \sqrt{x'(t)^2 + y'(t)^2} \qquad L = \int_a^b \sqrt{x'(t)^2 + y'(t)^2}\,dt` },
      { k: 'p', t: r`Position from velocity, one coordinate at a time: $x(b) = x(a) + \int_a^b x'(t)\,dt$, and the same for $y$.` },
      { k: 'tip', t: r`Total distance traveled is the arc length over the time interval. Displacement is the change in position vector.` },
      { k: 'warn', t: r`Speed is a number, velocity is a vector. “Is the speed increasing?” asks about $|\vec v|$, not about each component.` },
    ],
    examples: [
      { q: r`$\vec r(t) = \langle 3t, t^2\rangle$. Speed at $t = 2$?`, steps: [r`$\vec v = \langle 3, 2t\rangle = \langle 3, 4\rangle$.`, r`$|\vec v| = 5$.`], a: '5' },
      { q: r`Length of $x = \cos t$, $y = \sin t$ for $0 \le t \le \pi$.`, steps: [r`$\sqrt{\sin^2 t + \cos^2 t} = 1$.`, r`$\int_0^\pi 1\,dt = \pi$.`], a: 'π' },
    ],
    practice: [
      P('c9-2-1', 1, r`Length of the path $x = 3t$, $y = 4t$ for $0 \le t \le 2$.`, ['10'], 'Speed is constant.', [r`$\int_0^2 \sqrt{9 + 16}\,dt = 10$.`], { check: () => near(integ(() => Math.sqrt(9 + 16), 0, 2), 10) }),
      P('c9-2-2', 1, r`Length of $x = \cos t$, $y = \sin t$ for $0 \le t \le \pi$ (three decimal places).`, ['3.142', 'pi'], 'Speed is 1.', [r`$\int_0^\pi 1\,dt = \pi$.`], { check: () => near(integ((t) => Math.hypot(d(Math.cos, t), d(Math.sin, t)), 0, Math.PI), Math.PI) }),
      P('c9-2-3', 1, r`$\vec r(t) = \langle t^2, 3t\rangle$. Speed at $t = 1$ (three decimal places).`, ['3.606', 'sqrt(13)'], 'v = ⟨2t, 3⟩.', [r`$\sqrt{4 + 9} = \sqrt{13} \approx 3.606$.`], { check: () => near(Math.hypot(d((t) => t * t, 1), d((t) => 3 * t, 1)), Math.sqrt(13)) }),
      P('c9-2-4', 1, r`$\vec r(t) = \langle 3t, t^2\rangle$. Speed at $t = 2$.`, ['5'], 'v = ⟨3, 2t⟩.', [r`$|\langle 3, 4\rangle| = 5$.`], { check: () => near(Math.hypot(d((t) => 3 * t, 2), d((t) => t * t, 2)), 5) }),
      P('c9-2-5', 2, r`A particle has $x'(t) = 2t - 3$ and $x(0) = 1$. Find $x(2)$.`, ['-1'], 'x(2) = x(0) + ∫₀² x′.', [r`$1 + [t^2 - 3t]_0^2 = 1 - 2 = -1$.`], { check: () => near(1 + integ((t) => 2 * t - 3, 0, 2), -1) }),
      P('c9-2-6', 3, r`Length of $x = t$, $y = \frac{2}{3}t^{3/2}$ for $0 \le t \le 1$ (three decimal places).`, ['1.219'], 'Speed √(1 + t).', [r`$\int_0^1 \sqrt{1 + t}\,dt = \frac{2}{3}(2^{3/2} - 1) \approx 1.219$.`], { check: () => near(integ((t) => Math.sqrt(1 + t), 0, 1), (2 / 3) * (2 ** 1.5 - 1)) && near((2 / 3) * (2 ** 1.5 - 1), 1.219, 1e-3) }),
    ],
    remember: ['v = ⟨x′, y′⟩, speed = √(x′² + y′²).', 'Distance = ∫ speed dt.', 'Position: start + ∫ velocity, component by component.'],
    checkIn: 'Next: polar coordinates and slopes of polar curves.',
  },
  {
    id: 'c9-3', unit: 9, n: 3, title: 'Polar curves and their slopes',
    intro: 'Polar coordinates locate a point by its distance r from the origin and its angle θ. Curves like roses, cardioids and spirals are simple in polar form. To find slopes, convert to x and y with θ as the parameter, then use what you know about parametric curves.',
    goals: ['Convert between polar and rectangular coordinates', 'Find dy/dx for a polar curve', 'Interpret the sign of dr/dθ'],
    notes: [
      { k: 'formula', t: r`x = r\cos\theta \qquad y = r\sin\theta \qquad r^2 = x^2 + y^2 \qquad \tan\theta = \frac{y}{x}` },
      { k: 'formula', t: r`\frac{dy}{dx} = \frac{\frac{dr}{d\theta}\sin\theta + r\cos\theta}{\frac{dr}{d\theta}\cos\theta - r\sin\theta}` },
      { k: 'p', t: r`That formula is just $\frac{dy/d\theta}{dx/d\theta}$ with $x = r(\theta)\cos\theta$ and $y = r(\theta)\sin\theta$.` },
      { k: 'rule', title: 'Meaning of dr/dθ', t: r`If $r > 0$ and $\frac{dr}{d\theta} < 0$, the curve is moving closer to the origin; if $\frac{dr}{d\theta} > 0$, farther away.` },
      { k: 'list', items: [r`$r = a$: circle of radius $a$.`, r`$r = 2a\sin\theta$ or $2a\cos\theta$: circle of radius $a$ through the origin.`, r`$r = a(1 \pm \cos\theta)$: cardioid.`, r`$r = \cos(n\theta)$: rose with $n$ petals ($n$ odd) or $2n$ petals ($n$ even).`] },
    ],
    examples: [
      { q: r`$r = \theta$. Find $\frac{dy}{dx}$ at $\theta = \frac{\pi}{2}$.`, steps: [r`$\frac{dr}{d\theta} = 1$. Top: $1 \cdot 1 + \frac{\pi}{2}\cdot 0 = 1$.`, r`Bottom: $1 \cdot 0 - \frac{\pi}{2}\cdot 1 = -\frac{\pi}{2}$. Slope $-\frac{2}{\pi}$.`], a: '−2/π' },
      { q: r`$r = 2\sin\theta$. Find $\frac{dy}{dx}$ at $\theta = \frac{\pi}{8}$.`, steps: [r`$y = 2\sin^2\theta$, $x = 2\sin\theta\cos\theta = \sin 2\theta$.`, r`$\frac{dy}{dx} = \frac{2\sin 2\theta}{2\cos 2\theta} = \tan 2\theta = 1$ at $\theta = \frac{\pi}{8}$.`], a: '1' },
    ],
    practice: [
      P('c9-3-1', 1, r`The polar point $r = 2$, $\theta = \frac{\pi}{6}$ has what $y$-coordinate?`, ['1'], 'y = r sin θ.', [r`$2\sin\frac{\pi}{6} = 1$.`], { check: () => near(2 * Math.sin(Math.PI / 6), 1) }),
      P('c9-3-2', 2, r`$r = \theta$. Find $\frac{dy}{dx}$ at $\theta = \frac{\pi}{2}$ (three decimal places).`, ['-0.637', '-2/pi'], 'Use the polar slope formula with dr/dθ = 1.', [r`$\frac{1}{-\pi/2} = -\frac{2}{\pi} \approx -0.637$.`], { check: () => near(polarSlope((t) => t, Math.PI / 2), -2 / Math.PI) }),
      P('c9-3-3', 1, r`$r = 2$. Find $\frac{dy}{dx}$ at $\theta = \frac{\pi}{4}$.`, ['-1'], 'dr/dθ = 0.', [r`$\frac{2\cos\theta}{-2\sin\theta} = -\cot\frac{\pi}{4} = -1$.`], { check: () => near(polarSlope(() => 2, Math.PI / 4), -1) }),
      P('c9-3-4', 2, r`$r = 2\sin\theta$. Find $\frac{dy}{dx}$ at $\theta = \frac{\pi}{8}$.`, ['1'], 'It simplifies to tan 2θ.', [r`$\tan\frac{\pi}{4} = 1$.`], { check: () => near(polarSlope((t) => 2 * Math.sin(t), Math.PI / 8), 1) }),
      P('c9-3-5', 3, r`$r = 4\cos\theta$. Find $\frac{dy}{dx}$ at $\theta = \frac{\pi}{3}$ (three decimal places).`, ['0.577', '1/sqrt(3)'], 'It simplifies to −cot 2θ.', [r`$y = 2\sin 2\theta$, $x = 4\cos^2\theta$: $\frac{dy}{dx} = \frac{4\cos 2\theta}{-4\sin 2\theta} = -\cot 2\theta$.`, r`$-\cot\frac{2\pi}{3} = \frac{1}{\sqrt{3}} \approx 0.577$.`], { check: () => near(polarSlope((t) => 4 * Math.cos(t), Math.PI / 3), 1 / Math.sqrt(3)) }),
      P('c9-3-6', 2, r`On an interval where $r > 0$ and $\frac{dr}{d\theta} < 0$, the polar curve is…`, 0, 'r is the distance from the origin.', [r`$r$ is decreasing and positive, so the point is getting closer to the origin.`], { choices: ['moving closer to the origin', 'moving farther from the origin', 'passing through the origin', 'tracing a circle'] }),
    ],
    remember: ['x = r cos θ, y = r sin θ.', 'Polar slope = (dy/dθ)/(dx/dθ).', 'r > 0, dr/dθ < 0 ⇒ approaching the origin.'],
    checkIn: 'Last lesson of Unit 9: areas of polar regions.',
  },
  {
    id: 'c9-4', unit: 9, n: 4, title: 'Area in polar coordinates',
    intro: 'Polar areas are built from thin pie slices instead of rectangles. A slice with radius r and angle dθ has area ½r²dθ. Add them up and you can find the area of a rose petal, a cardioid, or the region between two polar curves.',
    goals: ['Find the area enclosed by a polar curve', 'Choose θ limits that trace the region exactly once', 'Find the area between two polar curves'],
    notes: [
      { k: 'formula', t: r`A = \frac{1}{2}\int_\alpha^\beta r(\theta)^2\,d\theta` },
      { k: 'formula', t: r`A = \frac{1}{2}\int_\alpha^\beta \left[R(\theta)^2 - r(\theta)^2\right]d\theta` },
      { k: 'p', t: r`The second formula is the area between two curves: $R$ is the outer curve and $r$ the inner one. Choose $\alpha$ and $\beta$ so the region is traced exactly once. For one petal of $r = \cos 2\theta$, $r = 0$ at $\theta = \pm\frac{\pi}{4}$.` },
      { k: 'tip', t: r`Use $\sin^2\theta = \frac{1 - \cos 2\theta}{2}$ and $\cos^2\theta = \frac{1 + \cos 2\theta}{2}$ for hand integration.` },
      { k: 'warn', t: r`Intersection points: solve $r_1(\theta) = r_2(\theta)$, but also check the origin, which can be on both curves at different angles.` },
    ],
    examples: [
      { q: r`Area of one petal of $r = \cos 2\theta$.`, steps: [r`Petal from $-\frac{\pi}{4}$ to $\frac{\pi}{4}$.`, r`$\frac{1}{2}\int_{-\pi/4}^{\pi/4}\cos^2 2\theta\,d\theta = \frac{1}{2}\cdot\frac{\pi}{4} = \frac{\pi}{8}$.`], a: 'π/8' },
      { q: r`Area inside the cardioid $r = 1 + \cos\theta$.`, steps: [r`$\frac{1}{2}\int_0^{2\pi}(1 + 2\cos\theta + \cos^2\theta)\,d\theta$.`, r`$= \frac{1}{2}(2\pi + 0 + \pi) = \frac{3\pi}{2}$.`], a: '3π/2' },
    ],
    practice: [
      P('c9-4-1', 1, r`Area inside $r = 3$ (three decimal places).`, ['28.274', '9pi'], '½∫₀^{2π} 9 dθ.', [r`$9\pi \approx 28.274$.`], { check: () => near(polarArea(() => 3, 0, 2 * Math.PI), 9 * Math.PI) }),
      P('c9-4-2', 2, r`Area of one petal of $r = \cos 2\theta$ (three decimal places).`, ['0.393', 'pi/8'], 'Limits ±π/4.', [r`$\frac{\pi}{8} \approx 0.393$.`], { check: () => near(polarArea((t) => Math.cos(2 * t), -Math.PI / 4, Math.PI / 4), Math.PI / 8) }),
      P('c9-4-3', 2, r`Area inside $r = 1 + \cos\theta$ (three decimal places).`, ['4.712', '3pi/2'], 'Expand the square and use the cos² identity.', [r`$\frac{3\pi}{2} \approx 4.712$.`], { check: () => near(polarArea((t) => 1 + Math.cos(t), 0, 2 * Math.PI), 1.5 * Math.PI) }),
      P('c9-4-4', 1, r`Area inside $r = 2\sin\theta$ (three decimal places).`, ['3.142', 'pi'], 'Traced once for 0 ≤ θ ≤ π; it is a circle of radius 1.', [r`$\frac{1}{2}\int_0^\pi 4\sin^2\theta\,d\theta = \pi$.`], { check: () => near(polarArea((t) => 2 * Math.sin(t), 0, Math.PI), Math.PI) }),
      P('c9-4-5', 2, r`Area swept by $r = \theta$ for $0 \le \theta \le \pi$ (three decimal places).`, ['5.168', 'pi^3/6'], '½∫θ² dθ.', [r`$\frac{1}{2}\cdot\frac{\pi^3}{3} = \frac{\pi^3}{6} \approx 5.168$.`], { check: () => near(polarArea((t) => t, 0, Math.PI), Math.PI ** 3 / 6) }),
      P('c9-4-6', 3, r`Area inside $r = 3\sin\theta$ and outside $r = 1 + \sin\theta$ (three decimal places).`, ['3.142', 'pi'], 'They meet where sin θ = 1/2.', [r`Limits $\frac{\pi}{6}$ to $\frac{5\pi}{6}$.`, r`$\frac{1}{2}\int_{\pi/6}^{5\pi/6}\left[9\sin^2\theta - (1 + \sin\theta)^2\right]d\theta = \frac{1}{2}(2\pi + 2\sqrt{3} - 2\sqrt{3}) = \pi$.`], { check: () => near(0.5 * integ((t) => (3 * Math.sin(t)) ** 2 - (1 + Math.sin(t)) ** 2, Math.PI / 6, (5 * Math.PI) / 6), Math.PI) }),
    ],
    remember: ['A = ½∫r² dθ.', 'Between curves: ½∫(R² − r²) dθ.', 'Pick limits that trace the region once.'],
    checkIn: 'Unit 9 complete. Take the review. The last unit, series, is the biggest piece of the BC exam.',
  },
];
