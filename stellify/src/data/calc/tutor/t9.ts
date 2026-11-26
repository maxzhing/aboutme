import type { LessonTutor } from '../types';

const r = String.raw;

/** Tutor layer · Unit 9: parametric, vector and polar calculus. */
export const TUTOR9: Record<string, LessonTutor> = {
  'c9-1': {
    bigIdea: [
      r`Imagine a bug walking on a table. At each moment $t$ it has an $x$-position and a $y$-position. Instead of one equation $y = f(x)$, we describe its path with two: $x = x(t)$ and $y = y(t)$. That is a parametric curve, and $t$ (usually time) is the parameter.`,
      r`Parametric curves can do things ordinary graphs can’t: loop back, cross themselves, trace a circle. And they tell you when the bug was where, not just the shape of the path.`,
      r`Slope still means $\frac{dy}{dx}$: how much $y$ changes per change in $x$. Since both change with time, divide their rates: $\frac{dy}{dx} = \frac{dy/dt}{dx/dt}$. If $y$ isn’t changing but $x$ is, the tangent is horizontal; if $x$ isn’t changing but $y$ is, the tangent is vertical.`,
    ],
    picture: { title: 'A drone controlled by two sliders', t: r`A drone’s controller has a left-right slider and an up-down slider, and both move over time. The drone’s path is the parametric curve. Its climbing angle (slope) is how fast it rises divided by how fast it moves sideways.` },
    words: [
      { term: 'Parametric equations', means: r`$x = x(t)$, $y = y(t)$: both coordinates given as functions of a parameter $t$.` },
      { term: 'Parameter', means: r`The extra variable (often time $t$) that both coordinates depend on.` },
      { term: r`$\frac{dy}{dx}$ (parametric)`, means: r`$\frac{dy/dt}{dx/dt}$.` },
      { term: r`$\frac{d^2y}{dx^2}$ (parametric)`, means: r`$\frac{\frac{d}{dt}(dy/dx)}{dx/dt}$.` },
      { term: 'Horizontal / vertical tangent', means: r`$\frac{dy}{dt} = 0$ / $\frac{dx}{dt} = 0$ (the other rate nonzero).` },
    ],
    tools: [
      { name: 'Chain rule', refresher: r`$\frac{dy}{dt} = \frac{dy}{dx}\cdot\frac{dx}{dt}$, so $\frac{dy}{dx} = \frac{dy/dt}{dx/dt}$.`, lesson: 'c3-1' },
      { name: 'Trig derivatives', refresher: r`$(\cos t)' = -\sin t$, $(\sin t)' = \cos t$.`, lesson: 'c2-4' },
      { name: 'Second derivatives', refresher: 'The second derivative is the derivative of the first.', lesson: 'c3-5' },
    ],
    why: [
      [r`Both $x$ and $y$ depend on $t$, so compute each rate with respect to $t$ and divide; simplify the fraction.`, r`Plug in $t = 2$ only at the end.`],
      [r`The second derivative is “the derivative of $\frac{dy}{dx}$ with respect to $x$”. But $\frac{dy}{dx}$ is written in $t$, so differentiate in $t$ first…`, r`…then divide by $\frac{dx}{dt}$ to convert “per $t$” into “per $x$” (chain rule again).`],
    ],
    walk: {
      'c9-1-1': [r`$\frac{dx}{dt} = 2t$, $\frac{dy}{dt} = 3t^2$.`, r`$\frac{dy}{dx} = \frac{3t^2}{2t} = \frac{3t}{2}$.`, r`At $t = 2$: $\frac{6}{2} = 3$.`],
      'c9-1-2': [r`$\frac{dx}{dt} = -\sin t$, $\frac{dy}{dt} = \cos t$.`, r`$\frac{dy}{dx} = \frac{\cos t}{-\sin t} = -\cot t$.`, r`At $\frac{\pi}{4}$: $-1$. (The curve is the unit circle; at 45° the tangent slopes down.)`],
      'c9-1-3': [r`$\frac{dx}{dt} = 2$, $\frac{dy}{dt} = -\frac{1}{t^2}$.`, r`$\frac{dy}{dx} = \frac{-1/t^2}{2} = -\frac{1}{2t^2}$.`, r`At $t = 1$: $-\frac{1}{2}$.`],
      'c9-1-4': [r`From Problem 1, $\frac{dy}{dx} = \frac{3t}{2}$.`, r`Differentiate in $t$: $\frac{3}{2}$. Divide by $\frac{dx}{dt} = 2t$: $\frac{d^2y}{dx^2} = \frac{3}{4t}$.`, r`At $t = 1$: $\frac{3}{4}$.`],
      'c9-1-5': [r`Horizontal tangent: $\frac{dy}{dt} = 0$ while $\frac{dx}{dt} \ne 0$.`, r`$\frac{dy}{dt} = 3t^2 - 12 = 0$ gives $t^2 = 4$, so $t = 2$ (positive).`, r`Check $\frac{dx}{dt} = 2t = 4 \ne 0$ ✓. Answer $t = 2$.`],
      'c9-1-6': [r`Vertical tangent: $\frac{dx}{dt} = 0$ while $\frac{dy}{dt} \ne 0$.`, r`$\frac{dx}{dt} = 3t^2 - 3 = 0$ gives $t = 1$ (positive).`, r`Check $\frac{dy}{dt} = 2t = 2 \ne 0$ ✓. Answer $t = 1$.`],
    },
    teach: {
      plan: [r`Act out a parametric path: move a coin while calling out $x$ and $y$ at each second.`, r`Plot $x = t^2$, $y = t^3$ from a table of $t$ values.`, r`Derive $\frac{dy}{dx} = \frac{dy/dt}{dx/dt}$ from the chain rule.`, r`Find horizontal and vertical tangents.`, r`Show the second-derivative formula and its extra division.`],
      questions: [
        { q: 'Why divide the rates?', a: r`$\frac{dy}{dx}$ is change in $y$ per change in $x$. In a tiny time, $y$ changes by $\frac{dy}{dt}dt$ and $x$ by $\frac{dx}{dt}dt$; the $dt$’s cancel.` },
        { q: 'Why is the second derivative not (d²y/dt²)/(d²x/dt²)?', a: r`Because we need the rate of change of the slope with respect to $x$, not $t$. Differentiate the slope in $t$, then convert with $\frac{dx}{dt}$.` },
        { q: 'What if both dx/dt and dy/dt are 0?', a: 'Then the formula gives 0/0 and you need more analysis (the curve may have a cusp).' },
      ],
      keyPoints: ['dy/dx = (dy/dt)/(dx/dt).', 'Horizontal tangent: dy/dt = 0; vertical: dx/dt = 0.', 'd²y/dx² = [d/dt(dy/dx)] / (dx/dt).', 'Plug in t at the end.'],
    },
  },
  'c9-2': {
    bigIdea: [
      r`A moving object in the plane is described by a position vector $\vec r(t) = \langle x(t), y(t)\rangle$: an arrow from the origin to where the object is. Differentiate each coordinate and you get the velocity vector $\vec v(t) = \langle x'(t), y'(t)\rangle$, which points in the direction of motion.`,
      r`Speed is the length of the velocity arrow: $\sqrt{x'(t)^2 + y'(t)^2}$, by the Pythagorean theorem. The total distance traveled is the integral of speed over time, which is exactly the arc length of the path.`,
      r`Going backwards, if you know the velocity, integrate each coordinate separately to recover the position, using a starting point for each.`,
    ],
    picture: { title: 'A boat crossing a river', t: r`A boat moves 3 m/s across a river while the current pushes it 4 m/s downstream. Its velocity vector is $\langle 3, 4\rangle$, and its actual speed is $\sqrt{9 + 16} = 5$ m/s: the hypotenuse of the two motions.` },
    words: [
      { term: 'Position vector', means: r`$\vec r(t) = \langle x(t), y(t)\rangle$.` },
      { term: 'Velocity vector', means: r`$\vec v(t) = \langle x'(t), y'(t)\rangle$: direction and rate of motion.` },
      { term: 'Acceleration vector', means: r`$\vec a(t) = \langle x''(t), y''(t)\rangle$.` },
      { term: 'Speed', means: r`$|\vec v(t)| = \sqrt{x'^2 + y'^2}$, a number, never negative.` },
      { term: 'Distance traveled', means: r`$\int_a^b \sqrt{x'(t)^2 + y'(t)^2}\,dt$.` },
    ],
    tools: [
      { name: 'Pythagorean theorem', refresher: r`Length of $\langle a, b\rangle$ is $\sqrt{a^2 + b^2}$.` },
      { name: 'Arc length', refresher: 'Same idea as for y = f(x): add up tiny hypotenuses.', lesson: 'c8-5' },
      { name: 'Net change theorem', refresher: r`$x(b) = x(a) + \int_a^b x'(t)\,dt$.`, lesson: 'c6-3' },
    ],
    why: [
      [r`Differentiate each coordinate to get the velocity vector, then plug in $t = 2$.`, r`Speed is the length of that vector: $\sqrt{3^2 + 4^2}$.`],
      [r`Speed $= \sqrt{(-\sin t)^2 + (\cos t)^2}$, which the identity $\sin^2 + \cos^2 = 1$ makes 1.`, r`Constant speed 1 for $\pi$ units of time gives distance $\pi$: half the unit circle.`],
    ],
    walk: {
      'c9-2-1': [r`$x' = 3$, $y' = 4$, so the speed is $\sqrt{9 + 16} = 5$, constant.`, r`Distance $= \int_0^2 5\,dt$.`, r`$= 10$.`],
      'c9-2-2': [r`$x' = -\sin t$, $y' = \cos t$; speed $\sqrt{\sin^2 t + \cos^2 t} = 1$.`, r`Length $= \int_0^\pi 1\,dt = \pi$.`, r`$\approx 3.142$: half the circumference of a unit circle ($2\pi \div 2$).`],
      'c9-2-3': [r`$\vec v(t) = \langle 2t, 3\rangle$; at $t = 1$: $\langle 2, 3\rangle$.`, r`Speed $= \sqrt{4 + 9} = \sqrt{13}$.`, r`$\approx 3.606$.`],
      'c9-2-4': [r`$\vec v(t) = \langle 3, 2t\rangle$; at $t = 2$: $\langle 3, 4\rangle$.`, r`Speed $= \sqrt{9 + 16}$.`, r`$= 5$.`],
      'c9-2-5': [r`Net change: $x(2) = x(0) + \int_0^2 (2t - 3)\,dt$.`, r`$\int_0^2 (2t - 3)\,dt = [t^2 - 3t]_0^2 = 4 - 6 = -2$.`, r`$x(2) = 1 + (-2) = -1$.`],
      'c9-2-6': [r`$x' = 1$, $y' = \frac{2}{3}\cdot\frac{3}{2}t^{1/2} = \sqrt{t}$. Speed: $\sqrt{1 + t}$.`, r`Length $= \int_0^1 \sqrt{1 + t}\,dt = \left[\frac{2}{3}(1 + t)^{3/2}\right]_0^1$.`, r`$= \frac{2}{3}(2^{3/2} - 1) \approx \frac{2}{3}(1.828) \approx 1.219$.`],
    },
    teach: {
      plan: [r`Tell the boat story and draw the velocity vector $\langle 3, 4\rangle$.`, r`Define position, velocity and acceleration vectors.`, r`Compute speed with the Pythagorean theorem.`, r`Show distance as the integral of speed.`, r`Recover position from velocity with a starting point.`],
      questions: [
        { q: 'Is speed the same as velocity?', a: 'Velocity is a vector (direction and size); speed is just its size.' },
        { q: 'How is distance different from displacement here?', a: r`Displacement is the change in position vector; distance is $\int$ speed, the length of the actual path.` },
        { q: 'Do x and y need separate starting values?', a: 'Yes. Integrate each coordinate separately with its own initial value.' },
      ],
      keyPoints: ['v = ⟨x′, y′⟩, a = ⟨x″, y″⟩.', 'Speed = √(x′² + y′²).', 'Distance traveled = ∫ speed dt.', 'Position: start + ∫ velocity, per coordinate.'],
    },
  },
  'c9-3': {
    bigIdea: [
      r`Polar coordinates describe a point by distance and direction instead of “right and up”. $r$ is how far from the origin, and $\theta$ is the angle measured from the positive $x$-axis. It is like giving directions: “face 30° and walk 2 steps”.`,
      r`Curves like circles, flowers (roses), hearts (cardioids) and spirals have simple polar equations: $r = 2$, $r = \cos 2\theta$, $r = 1 + \cos\theta$, $r = \theta$.`,
      r`To find slopes, convert to $x$ and $y$: $x = r\cos\theta$, $y = r\sin\theta$, with $r$ depending on $\theta$. Now it is a parametric curve with parameter $\theta$, so $\frac{dy}{dx} = \frac{dy/d\theta}{dx/d\theta}$, using the product rule on each.`,
    ],
    picture: { title: 'A lighthouse beam', t: r`A lighthouse beam sweeps around (that is $\theta$), and a boat on the beam is some distance away (that is $r$). As the beam turns, the boat’s distance changes, tracing a polar curve.` },
    words: [
      { term: r`Polar coordinates $(r, \theta)$`, means: 'Distance from the origin and angle from the positive x-axis.' },
      { term: 'Conversion', means: r`$x = r\cos\theta$, $y = r\sin\theta$, $r^2 = x^2 + y^2$.` },
      { term: 'Rose / cardioid / limaçon', means: 'Families of polar curves: petals, heart shapes, and loops.' },
      { term: r`$\frac{dr}{d\theta}$`, means: 'How fast the distance from the origin changes as the angle turns.' },
    ],
    tools: [
      { name: 'Unit circle', refresher: r`$\cos\frac{\pi}{6} = \frac{\sqrt{3}}{2}$, $\sin\frac{\pi}{6} = \frac{1}{2}$, $\cot\frac{2\pi}{3} = -\frac{1}{\sqrt{3}}$.`, lesson: 'c0-8' },
      { name: 'Parametric slope', refresher: r`$\frac{dy}{dx} = \frac{dy/d\theta}{dx/d\theta}$.`, lesson: 'c9-1' },
      { name: 'Product rule and double angles', refresher: r`$2\sin\theta\cos\theta = \sin 2\theta$, $\cos^2\theta - \sin^2\theta = \cos 2\theta$.`, lesson: 'c2-5' },
    ],
    why: [
      [r`$y = \theta\sin\theta$ and $x = \theta\cos\theta$. The product rule gives the top: $\frac{dy}{d\theta} = \sin\theta + \theta\cos\theta$, which is 1 at $\frac{\pi}{2}$.`, r`The bottom: $\frac{dx}{d\theta} = \cos\theta - \theta\sin\theta = -\frac{\pi}{2}$. Divide.`],
      [r`Write $x$ and $y$ in terms of $\theta$ and simplify with double-angle identities, which makes differentiating easy.`, r`Divide the two derivatives; the ratio of sine to cosine of $2\theta$ is a tangent.`],
    ],
    walk: {
      'c9-3-1': [r`$y = r\sin\theta$.`, r`$= 2\sin\frac{\pi}{6} = 2 \cdot \frac{1}{2}$.`, r`$= 1$.`],
      'c9-3-2': [r`Parametrize: $x = \theta\cos\theta$, $y = \theta\sin\theta$.`, r`$\frac{dy}{d\theta} = \sin\theta + \theta\cos\theta$; at $\frac{\pi}{2}$: $1 + 0 = 1$.`, r`$\frac{dx}{d\theta} = \cos\theta - \theta\sin\theta$; at $\frac{\pi}{2}$: $0 - \frac{\pi}{2}$.`, r`$\frac{dy}{dx} = \frac{1}{-\pi/2} = -\frac{2}{\pi} \approx -0.637$.`],
      'c9-3-3': [r`$x = 2\cos\theta$, $y = 2\sin\theta$ (a circle of radius 2).`, r`$\frac{dy}{dx} = \frac{2\cos\theta}{-2\sin\theta} = -\cot\theta$.`, r`At $\frac{\pi}{4}$: $-1$.`],
      'c9-3-4': [r`$x = 2\sin\theta\cos\theta = \sin 2\theta$, $y = 2\sin^2\theta$.`, r`$\frac{dx}{d\theta} = 2\cos 2\theta$, $\frac{dy}{d\theta} = 4\sin\theta\cos\theta = 2\sin 2\theta$.`, r`$\frac{dy}{dx} = \tan 2\theta$; at $\frac{\pi}{8}$: $\tan\frac{\pi}{4} = 1$.`],
      'c9-3-5': [r`$x = 4\cos^2\theta$, $y = 4\sin\theta\cos\theta = 2\sin 2\theta$.`, r`$\frac{dx}{d\theta} = -8\cos\theta\sin\theta = -4\sin 2\theta$; $\frac{dy}{d\theta} = 4\cos 2\theta$.`, r`$\frac{dy}{dx} = -\cot 2\theta$. At $\frac{\pi}{3}$: $-\cot\frac{2\pi}{3} = -\left(-\frac{1}{\sqrt{3}}\right) = \frac{1}{\sqrt{3}} \approx 0.577$.`],
      'c9-3-6': [r`$r$ is the distance from the origin.`, r`$\frac{dr}{d\theta} < 0$ means that distance is shrinking.`, r`With $r > 0$, the point is moving closer to the origin: choice A.`],
    },
    teach: {
      plan: [r`Give directions in polar form (“face 30°, walk 2”) and plot points.`, r`Graph $r = 2$, $r = 2\sin\theta$, $r = 1 + \cos\theta$ from tables.`, r`Convert with $x = r\cos\theta$, $y = r\sin\theta$.`, r`Derive the polar slope using parametric thinking.`, r`Explain what the sign of $\frac{dr}{d\theta}$ means.`],
      questions: [
        { q: r`Is $\frac{dr}{d\theta}$ the slope?`, a: r`No. $\frac{dr}{d\theta}$ says how the distance from the origin changes. The slope is $\frac{dy}{dx}$, found by converting to $x$ and $y$.` },
        { q: 'Can r be negative?', a: 'Yes: a negative r means you walk backward, landing in the opposite direction from θ.' },
        { q: 'Why does r = 2 sin θ make a circle?', a: r`Multiply by $r$: $r^2 = 2r\sin\theta$, i.e. $x^2 + y^2 = 2y$, a circle of radius 1 centered at $(0, 1)$.` },
      ],
      keyPoints: ['x = r cos θ, y = r sin θ.', 'Polar slope: (dy/dθ)/(dx/dθ) with the product rule.', 'dr/dθ is not the slope; it measures distance change.', 'r > 0 and dr/dθ < 0: moving toward the origin.'],
    },
  },
  'c9-4': {
    bigIdea: [
      r`For ordinary graphs we added thin rectangles. For polar curves, the natural pieces are thin pie slices (sectors) fanning out from the origin. A slice with radius $r$ and a tiny angle $d\theta$ has area $\frac{1}{2}r^2\,d\theta$.`,
      r`Adding all the slices: $A = \frac{1}{2}\int_\alpha^\beta r^2\,d\theta$. The angles $\alpha$ and $\beta$ must sweep around the region exactly once; for a rose petal, that means from one place where $r = 0$ to the next.`,
      r`For the area between two polar curves, subtract slice areas: $\frac{1}{2}\int(R^2 - r^2)\,d\theta$, with $R$ the outer curve. Find where they meet by setting the $r$’s equal.`,
    ],
    picture: { title: 'Slicing a pizza', t: r`A pizza is made of skinny triangular slices meeting at the center. If the pizza were a strange shape, each slice would have its own radius $r$. Each slice’s area is about $\frac{1}{2}r^2 \times$ (its angle). Add all the slices for the whole pizza’s area.` },
    words: [
      { term: 'Sector', means: r`A pie-slice region; one with radius $r$ and angle $\theta$ has area $\frac{1}{2}r^2\theta$.` },
      { term: 'Polar area', means: r`$A = \frac{1}{2}\int_\alpha^\beta r(\theta)^2\,d\theta$.` },
      { term: 'Petal', means: r`One loop of a rose curve, between consecutive zeros of $r$.` },
      { term: 'Outer / inner curve', means: r`$R$: farther from the origin; $r$: closer.` },
    ],
    tools: [
      { name: 'Power-reducing identities', refresher: r`$\cos^2\theta = \frac{1 + \cos 2\theta}{2}$, $\sin^2\theta = \frac{1 - \cos 2\theta}{2}$.`, lesson: 'c0-8' },
      { name: 'Definite integrals of trig', refresher: r`$\int_0^{2\pi}\cos\theta\,d\theta = 0$.`, lesson: 'c6-2' },
      { name: 'Polar graphs', refresher: r`Know where $r = 0$ to find petal limits.`, lesson: 'c9-3' },
    ],
    why: [
      [r`A petal starts and ends where $r = 0$: $\cos 2\theta = 0$ at $\theta = \pm\frac{\pi}{4}$.`, r`Use $\cos^2 2\theta = \frac{1 + \cos 4\theta}{2}$; over $[-\frac{\pi}{4}, \frac{\pi}{4}]$ the cosine part integrates to 0, leaving $\frac{1}{2}\cdot\frac{\pi}{2} = \frac{\pi}{4}$, then times $\frac{1}{2}$.`],
      [r`Square the radius: $(1 + \cos\theta)^2 = 1 + 2\cos\theta + \cos^2\theta$. The cardioid closes after one full turn, $0$ to $2\pi$.`, r`Over a full turn, $\int\cos\theta = 0$ and $\int\cos^2\theta = \pi$; so $\frac{1}{2}(2\pi + 0 + \pi)$.`],
    ],
    walk: {
      'c9-4-1': [r`$r = 3$ is a circle, traced once for $0 \le \theta \le 2\pi$.`, r`$A = \frac{1}{2}\int_0^{2\pi} 9\,d\theta = \frac{1}{2}(9)(2\pi)$.`, r`$= 9\pi \approx 28.274$ (matches $\pi r^2$ ✓).`],
      'c9-4-2': [r`Petal between the zeros $\theta = \pm\frac{\pi}{4}$.`, r`$A = \frac{1}{2}\int_{-\pi/4}^{\pi/4}\cos^2 2\theta\,d\theta = \frac{1}{2}\int\frac{1 + \cos 4\theta}{2}d\theta$.`, r`The $\cos 4\theta$ part integrates to 0 over this range; $\frac{1}{2}\cdot\frac{1}{2}\cdot\frac{\pi}{2} = \frac{\pi}{8} \approx 0.393$.`],
      'c9-4-3': [r`$A = \frac{1}{2}\int_0^{2\pi}(1 + 2\cos\theta + \cos^2\theta)\,d\theta$.`, r`Pieces: $\int 1 = 2\pi$; $\int 2\cos\theta = 0$; $\int\cos^2\theta = \pi$.`, r`$\frac{1}{2}(2\pi + \pi) = \frac{3\pi}{2} \approx 4.712$.`],
      'c9-4-4': [r`$r = 2\sin\theta$ traces the circle once as $\theta$ goes from 0 to $\pi$.`, r`$A = \frac{1}{2}\int_0^\pi 4\sin^2\theta\,d\theta = 2\int_0^\pi \frac{1 - \cos 2\theta}{2}d\theta = \int_0^\pi (1 - \cos 2\theta)\,d\theta$.`, r`$= \pi - 0 = \pi \approx 3.142$ (a circle of radius 1 ✓).`],
      'c9-4-5': [r`$A = \frac{1}{2}\int_0^\pi \theta^2\,d\theta$.`, r`$= \frac{1}{2}\cdot\frac{\pi^3}{3}$.`, r`$= \frac{\pi^3}{6} \approx 5.168$.`],
      'c9-4-6': [r`Intersections: $3\sin\theta = 1 + \sin\theta$ gives $\sin\theta = \frac{1}{2}$: $\theta = \frac{\pi}{6}, \frac{5\pi}{6}$.`, r`Between them, $3\sin\theta$ is outer: $A = \frac{1}{2}\int_{\pi/6}^{5\pi/6}\left[9\sin^2\theta - (1 + \sin\theta)^2\right]d\theta$.`, r`Simplify the integrand: $8\sin^2\theta - 2\sin\theta - 1 = 3 - 4\cos 2\theta - 2\sin\theta$.`, r`Integrate: $2\pi + 2\sqrt{3} - 2\sqrt{3} = 2\pi$; times $\frac{1}{2}$ gives $\pi \approx 3.142$.`],
    },
    teach: {
      plan: [r`Derive the sector area $\frac{1}{2}r^2\theta$ from the full circle $\pi r^2$ (a fraction $\frac{\theta}{2\pi}$ of it).`, r`Build the polar area integral from thin slices.`, r`Do the circle $r = 3$ and check it with $\pi r^2$.`, r`Find petal limits from $r = 0$.`, r`Do the area between two polar curves.`],
      questions: [
        { q: 'Why ½r² instead of r?', a: 'Pie slices are triangles, not rectangles. A thin sector with radius r and angle dθ has area ½ r² dθ.' },
        { q: 'How do I choose the limits?', a: 'Pick angles that trace the region exactly once: for petals, between consecutive zeros of r; for closed curves, often one full turn.' },
        { q: 'Why must I subtract squares for two curves?', a: 'You subtract the AREAS of the slices, ½R² − ½r², not the radii.' },
      ],
      keyPoints: ['A = ½∫ r² dθ.', 'Choose limits that trace the region once.', 'Between curves: ½∫(R² − r²) dθ.', 'Use power-reducing identities for sin² and cos².'],
    },
  },
};
