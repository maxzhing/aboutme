import type { CalcLesson, CalcProblem } from './types';
import { d, d2, near } from './types';

const r = String.raw;
const P = (id: string, level: 1 | 2 | 3, q: string, answer: number | string[], hint: string, solution: string[], extra: Partial<CalcProblem> = {}): CalcProblem => ({ id, level, q, answer, hint, solution, ...extra });

/** Unit 3 · Differentiation: Composite, Implicit, and Inverse Functions. Original lessons and problems. */
export const UNIT3: CalcLesson[] = [
  {
    id: 'c3-1', unit: 3, n: 1, title: 'The chain rule',
    intro: 'The chain rule is the most important differentiation rule you will learn, because almost every real function is a function inside another function. Today you learn to peel functions like an onion: outside first, then multiply by the derivative of the inside.',
    goals: ['Recognize a composite function and name its inside and outside', 'Apply the chain rule in both notations', 'Combine the chain rule with other rules', 'Use tables of values for composite derivatives'],
    notes: [
      { k: 'rule', title: 'Chain rule', t: r`If $y = f(g(x))$, then $y' = f'(g(x)) \cdot g'(x)$. In Leibniz notation, with $u = g(x)$: $\frac{dy}{dx} = \frac{dy}{du} \cdot \frac{du}{dx}$.` },
      { k: 'p', t: r`Say it as “derivative of the outside, evaluated at the inside, times the derivative of the inside.” Leave the inside alone when you differentiate the outside.` },
      { k: 'list', items: [r`$\frac{d}{dx}[g(x)]^n = n[g(x)]^{n-1}g'(x)$`, r`$\frac{d}{dx}e^{g(x)} = e^{g(x)}g'(x)$`, r`$\frac{d}{dx}\ln g(x) = \frac{g'(x)}{g(x)}$`, r`$\frac{d}{dx}\sin g(x) = \cos g(x)\cdot g'(x)$`] },
      { k: 'tip', t: r`For several layers, keep multiplying: $\frac{d}{dx}\sin^3(2x) = 3\sin^2(2x) \cdot \cos(2x) \cdot 2$. One factor per layer.` },
      { k: 'warn', t: r`The most common mistake in all of calculus: forgetting to multiply by the derivative of the inside. $\frac{d}{dx}e^{3x}$ is $3e^{3x}$, not $e^{3x}$.` },
      { k: 'p', t: r`Table questions: for $h(x) = f(g(x))$, $h'(a) = f'(g(a))\,g'(a)$. Find $g(a)$ first, then look up $f'$ at THAT value.` },
    ],
    examples: [
      { q: r`Differentiate $y = (3x^2 + 1)^5$.`, steps: [r`Outside: $u^5$. Inside: $u = 3x^2 + 1$.`, r`$y' = 5(3x^2 + 1)^4 \cdot 6x = 30x(3x^2 + 1)^4$.`], a: '30x(3x² + 1)⁴' },
      { q: r`Differentiate $y = e^{\sin x}$.`, steps: [r`Outside: $e^u$. Inside: $\sin x$.`, r`$y' = e^{\sin x}\cos x$.`], a: 'cos x · e^(sin x)' },
    ],
    practice: [
      P('c3-1-1', 1, r`$f(x) = (2x + 1)^3$. Find $f'(1)$.`, ['54'], 'Outside cubed, inside 2x + 1.', [r`$f'(x) = 3(2x + 1)^2 \cdot 2$.`, r`$f'(1) = 3 \cdot 9 \cdot 2 = 54$.`], { check: () => near(d((x) => (2 * x + 1) ** 3, 1), 54) }),
      P('c3-1-2', 2, r`$f(x) = \sin(x^2)$. Find $f'(\sqrt{\pi})$ to three decimal places.`, ['-3.545'], 'Derivative of the outside at the inside, times 2x.', [r`$f'(x) = \cos(x^2) \cdot 2x$.`, r`$f'(\sqrt{\pi}) = \cos\pi \cdot 2\sqrt{\pi} = -2\sqrt{\pi} \approx -3.545$.`], { check: () => near(d((x) => Math.sin(x * x), Math.sqrt(Math.PI)), -2 * Math.sqrt(Math.PI)) }),
      P('c3-1-3', 1, r`$f(x) = e^{3x}$. Find $f'(0)$.`, ['3'], 'Inside is 3x.', [r`$f'(x) = 3e^{3x}$, so $f'(0) = 3$.`], { check: () => near(d((x) => Math.exp(3 * x), 0), 3) }),
      P('c3-1-4', 1, r`$f(x) = \ln(x^2 + 1)$. Find $f'(1)$.`, ['1'], 'Derivative of ln u is u′/u.', [r`$f'(x) = \frac{2x}{x^2 + 1}$.`, r`$f'(1) = \frac{2}{2} = 1$.`], { check: () => near(d((x) => Math.log(x * x + 1), 1), 1) }),
      P('c3-1-5', 2, r`$g(1) = 2$, $g'(1) = -1$, $f(2) = 3$, $f'(2) = 4$. If $h(x) = f(g(x))$, find $h'(1)$.`, ['-4'], 'h′(1) = f′(g(1)) · g′(1).', [r`$g(1) = 2$, so $h'(1) = f'(2) \cdot g'(1)$.`, r`$= 4 \cdot (-1) = -4$.`], { check: () => 4 * -1 === -4 }),
      P('c3-1-6', 3, r`$f(x) = \sqrt{1 + \cos^2 x}$. Find $f'\left(\frac{\pi}{4}\right)$ to three decimal places.`, ['-0.408'], 'Three layers: square root, then the square, then cosine.', [r`$f'(x) = \frac{1}{2\sqrt{1 + \cos^2 x}} \cdot 2\cos x \cdot (-\sin x) = \frac{-\sin x\cos x}{\sqrt{1 + \cos^2 x}}$.`, r`At $\frac{\pi}{4}$: $\frac{-1/2}{\sqrt{3/2}} \approx -0.408$.`], { check: () => near(d((x) => Math.sqrt(1 + Math.cos(x) ** 2), Math.PI / 4), -0.5 / Math.sqrt(1.5)) }),
    ],
    remember: ["(f(g(x)))' = f'(g(x)) · g'(x).", 'One factor for every layer.', 'Tables: find g(a) first, then f′ at that value.'],
    checkIn: 'Every problem from here on uses the chain rule. If you missed any, redo them tomorrow before continuing. Next: implicit differentiation.',
  },
  {
    id: 'c3-2', unit: 3, n: 2, title: 'Implicit differentiation',
    intro: 'Some curves, like circles, are not written as y = something. Implicit differentiation lets you find slopes anyway: differentiate both sides, treating y as a function of x, and solve for dy/dx. It is just the chain rule used on y.',
    goals: ['Differentiate equations in x and y implicitly', 'Find slopes of tangent lines at points on a curve', 'Find horizontal and vertical tangents', 'Find second derivatives implicitly'],
    notes: [
      { k: 'p', t: r`Treat $y$ as an unknown function of $x$. Every time you differentiate a term with $y$ in it, the chain rule attaches a factor of $\frac{dy}{dx}$: $\frac{d}{dx}y^2 = 2y\frac{dy}{dx}$.` },
      { k: 'list', items: [r`1. Differentiate both sides with respect to $x$.`, r`2. Use the product rule for terms like $xy$: $\frac{d}{dx}(xy) = y + x\frac{dy}{dx}$.`, r`3. Collect the $\frac{dy}{dx}$ terms on one side.`, r`4. Factor out $\frac{dy}{dx}$ and divide.`] },
      { k: 'tip', t: r`For the slope at a point, you may plug in $x$ and $y$ right after differentiating, before solving. That avoids messy algebra.` },
      { k: 'rule', title: 'Horizontal and vertical tangents', t: r`If $\frac{dy}{dx} = \frac{N}{D}$: horizontal tangent where $N = 0$ (and $D \ne 0$); vertical tangent where $D = 0$ (and $N \ne 0$). The point must also be on the curve.` },
      { k: 'warn', t: r`Do not forget $\frac{dy}{dx}$ on $y$ terms, and remember the derivative of a constant (like 25) is 0.` },
      { k: 'p', t: r`For $\frac{d^2y}{dx^2}$, differentiate $\frac{dy}{dx}$ again (quotient rule), then substitute the expression for $\frac{dy}{dx}$ and simplify with the original equation.` },
    ],
    examples: [
      { q: r`Find $\frac{dy}{dx}$ for $x^2 + y^2 = 25$, and the slope at $(3, 4)$.`, steps: [r`$2x + 2y\frac{dy}{dx} = 0$.`, r`$\frac{dy}{dx} = -\frac{x}{y}$.`, r`At $(3, 4)$: $-\frac{3}{4}$.`], a: '−3/4' },
      { q: r`Find $\frac{dy}{dx}$ for $xy + y^2 = 6$.`, steps: [r`Product rule: $y + x\frac{dy}{dx} + 2y\frac{dy}{dx} = 0$.`, r`$\frac{dy}{dx}(x + 2y) = -y$.`, r`$\frac{dy}{dx} = \frac{-y}{x + 2y}$.`], a: '−y/(x + 2y)' },
    ],
    practice: [
      P('c3-2-1', 1, r`For $x^2 + y^2 = 25$, find the slope of the tangent line at $(-3, 4)$.`, ['3/4', '0.75'], "dy/dx = −x/y.", [r`$\frac{dy}{dx} = -\frac{x}{y} = -\frac{-3}{4} = \frac{3}{4}$.`], { check: () => near(d((x) => Math.sqrt(25 - x * x), -3), 0.75) }),
      P('c3-2-2', 2, r`For $x^3 + y^3 = 9$, find $\frac{dy}{dx}$ at $(1, 2)$.`, ['-1/4', '-0.25'], 'Differentiate each cube.', [r`$3x^2 + 3y^2\frac{dy}{dx} = 0$, so $\frac{dy}{dx} = -\frac{x^2}{y^2}$.`, r`At $(1, 2)$: $-\frac{1}{4}$.`], { check: () => near(d((x) => Math.cbrt(9 - x ** 3), 1), -0.25) }),
      P('c3-2-3', 1, r`For $xy = 6$, find $\frac{dy}{dx}$ at $(2, 3)$.`, ['-3/2', '-1.5'], 'Product rule on xy.', [r`$y + x\frac{dy}{dx} = 0$, so $\frac{dy}{dx} = -\frac{y}{x} = -\frac{3}{2}$.`], { check: () => near(d((x) => 6 / x, 2), -1.5) }),
      P('c3-2-4', 2, r`For $x^2 + xy + y^2 = 7$, find $\frac{dy}{dx}$ at $(1, 2)$.`, ['-4/5', '-0.8'], 'Product rule on xy, chain rule on y².', [r`$2x + y + x\frac{dy}{dx} + 2y\frac{dy}{dx} = 0$.`, r`$\frac{dy}{dx} = -\frac{2x + y}{x + 2y} = -\frac{4}{5}$.`], { check: () => { const f = (x: number) => (-x + Math.sqrt(x * x - 4 * (x * x - 7))) / 2; return near(f(1), 2) && near(d(f, 1), -0.8); } }),
      P('c3-2-5', 2, r`For $\sin y = x$, find $\frac{dy}{dx}$ at $\left(\frac{1}{2}, \frac{\pi}{6}\right)$ to three decimal places.`, ['1.155'], 'cos y · dy/dx = 1.', [r`$\cos y\,\frac{dy}{dx} = 1$, so $\frac{dy}{dx} = \frac{1}{\cos y}$.`, r`$\frac{1}{\cos(\pi/6)} = \frac{2}{\sqrt{3}} \approx 1.155$.`], { check: () => near(d(Math.asin, 0.5), 2 / Math.sqrt(3)) }),
      P('c3-2-6', 3, r`For $x^2 + y^2 = 25$, find $\frac{d^2y}{dx^2}$ at $(3, 4)$.`, ['-25/64', '-0.390625'], 'Differentiate −x/y with the quotient rule, then use y′ = −3/4.', [r`$y'' = -\frac{y - xy'}{y^2}$.`, r`At $(3, 4)$ with $y' = -\frac{3}{4}$: $-\frac{4 + \frac{9}{4}}{16} = -\frac{25}{64}$.`], { check: () => near(d2((x) => Math.sqrt(25 - x * x), 3), -25 / 64, 1e-3) }),
    ],
    remember: ['Every y-term gets a dy/dx from the chain rule.', 'Collect dy/dx terms, factor, divide.', 'Horizontal tangent: top = 0. Vertical: bottom = 0.'],
    checkIn: 'Implicit differentiation is a free-response regular. If you can do problem 4 with your notes closed, move on to inverse functions.',
  },
  {
    id: 'c3-3', unit: 3, n: 3, title: 'Derivatives of inverse functions',
    intro: 'If you know a function’s derivative, you know its inverse’s derivative too: the slopes are reciprocals at matching points. The AP exam tests this almost every year, usually with a table. The only trap is matching the right points.',
    goals: ['Use (f⁻¹)′(a) = 1 / f′(f⁻¹(a))', 'Find the matching point on f', 'Answer table-based inverse derivative questions'],
    notes: [
      { k: 'rule', title: 'Derivative of an inverse', t: r`If $g = f^{-1}$ and $f(b) = a$, then $g'(a) = \dfrac{1}{f'(b)} = \dfrac{1}{f'(g(a))}$, provided $f'(b) \ne 0$.` },
      { k: 'p', t: r`Why: the graph of $f^{-1}$ is the graph of $f$ reflected over $y = x$. Reflection swaps rise and run, so slopes at matching points are reciprocals.` },
      { k: 'list', items: [r`1. You want $g'(a)$. Find $b$ with $f(b) = a$ (solve, or guess a small integer, or read the table).`, r`2. Compute $f'(b)$.`, r`3. Answer: $\frac{1}{f'(b)}$.`] },
      { k: 'warn', t: r`$g'(a)$ is NOT $\frac{1}{f'(a)}$. You need the $x$-value of $f$ that OUTPUTS $a$.` },
      { k: 'tip', t: r`On polynomial questions, the matching point is almost always a small integer like 0, 1 or −1. Try them first.` },
    ],
    examples: [
      { q: r`$f(x) = x^3 + x$ and $g = f^{-1}$. Find $g'(2)$.`, steps: [r`Find $b$ with $f(b) = 2$: $b = 1$.`, r`$f'(x) = 3x^2 + 1$, so $f'(1) = 4$.`, r`$g'(2) = \frac{1}{4}$.`], a: '1/4' },
      { q: r`$f(3) = 7$, $f'(3) = 2$, $f(7) = 10$, $f'(7) = 5$. Find $(f^{-1})'(7)$.`, steps: [r`$f(3) = 7$, so the matching point is $x = 3$.`, r`$(f^{-1})'(7) = \frac{1}{f'(3)} = \frac{1}{2}$. (The value $f'(7) = 5$ is a distractor.)`], a: '1/2' },
    ],
    practice: [
      P('c3-3-1', 1, r`$f(x) = x^3 + 2x + 1$ and $g = f^{-1}$. Find $g'(4)$.`, ['1/5', '0.2'], 'Which x gives f(x) = 4?', [r`$f(1) = 4$, and $f'(x) = 3x^2 + 2$, so $f'(1) = 5$.`, r`$g'(4) = \frac{1}{5}$.`], { check: () => { const f = (x: number) => x ** 3 + 2 * x + 1; return f(1) === 4 && near(1 / d(f, 1), 0.2); } }),
      P('c3-3-2', 2, r`$f(3) = 7$, $f'(3) = 2$, $f(7) = 10$, $f'(7) = 5$. If $g = f^{-1}$, find $g'(7)$.`, ['1/2', '0.5'], 'Find where f OUTPUTS 7.', [r`$f(3) = 7$, so $g'(7) = \frac{1}{f'(3)} = \frac{1}{2}$.`], { check: () => near(1 / 2, 0.5) }),
      P('c3-3-3', 2, r`$f(x) = e^{2x} + x$ and $g = f^{-1}$. Find $g'(1)$.`, ['1/3'], 'Try x = 0.', [r`$f(0) = 1$ and $f'(x) = 2e^{2x} + 1$, so $f'(0) = 3$.`, r`$g'(1) = \frac{1}{3}$.`], { check: () => { const f = (x: number) => Math.exp(2 * x) + x; return near(f(0), 1) && near(1 / d(f, 0), 1 / 3); } }),
      P('c3-3-4', 2, r`$f(x) = x^5 + x^3 + x$ and $g = f^{-1}$. Find $g'(3)$.`, ['1/9'], 'Try x = 1.', [r`$f(1) = 3$ and $f'(1) = 5 + 3 + 1 = 9$.`, r`$g'(3) = \frac{1}{9}$.`], { check: () => { const f = (x: number) => x ** 5 + x ** 3 + x; return f(1) === 3 && near(1 / d(f, 1), 1 / 9); } }),
      P('c3-3-5', 1, r`If $f(2) = 5$ and $f'(2) = 4$, what is $(f^{-1})'(5)$?`, 0, 'The matching point on f is x = 2.', [r`$(f^{-1})'(5) = \frac{1}{f'(2)} = \frac{1}{4}$.`], { choices: [r`$\frac{1}{4}$`, '4', r`$\frac{1}{5}$`, r`$-\frac{1}{4}$`] }),
      P('c3-3-6', 3, r`$f(x) = 2x + \cos x$ and $g = f^{-1}$. Find $g'(1)$.`, ['1/2', '0.5'], 'f(0) = 1.', [r`$f(0) = 0 + 1 = 1$; $f'(x) = 2 - \sin x$, so $f'(0) = 2$.`, r`$g'(1) = \frac{1}{2}$.`], { check: () => { const f = (x: number) => 2 * x + Math.cos(x); return near(f(0), 1) && near(1 / d(f, 0), 0.5); } }),
    ],
    remember: ["(f⁻¹)'(a) = 1 / f'(b), where f(b) = a.", 'Find the x that OUTPUTS a.', 'Ignore table values at the wrong point.'],
    checkIn: 'If you avoided the f′(7) distractor in problem 2, you have it. Next: inverse trig derivatives.',
  },
  {
    id: 'c3-4', unit: 3, n: 4, title: 'Derivatives of inverse trig functions',
    intro: 'Three new derivatives today: arcsine, arccosine and arctangent. They come straight from implicit differentiation, and they matter twice: here, and later in reverse as integrals. Learn the forms and their chain-rule versions.',
    goals: ['Know the derivatives of arcsin, arccos and arctan', 'Use them with the chain rule', 'See where they come from'],
    notes: [
      { k: 'formula', t: r`\frac{d}{dx}\arcsin x = \frac{1}{\sqrt{1 - x^2}} \qquad \frac{d}{dx}\arccos x = -\frac{1}{\sqrt{1 - x^2}} \qquad \frac{d}{dx}\arctan x = \frac{1}{1 + x^2}` },
      { k: 'p', t: r`Derivation of arcsine: if $y = \arcsin x$ then $\sin y = x$. Differentiate: $\cos y\,y' = 1$, so $y' = \frac{1}{\cos y} = \frac{1}{\sqrt{1 - \sin^2 y}} = \frac{1}{\sqrt{1 - x^2}}$.` },
      { k: 'p', t: r`With the chain rule: $\frac{d}{dx}\arctan(u) = \frac{u'}{1 + u^2}$ and $\frac{d}{dx}\arcsin(u) = \frac{u'}{\sqrt{1 - u^2}}$.` },
      { k: 'tip', t: r`Arccosine is just arcsine with a minus sign. If you remember arcsin and arctan, you have all three.` },
      { k: 'warn', t: r`$\arcsin x$ means the inverse function, not $\frac{1}{\sin x}$. Its domain is $[-1, 1]$.` },
    ],
    examples: [
      { q: r`Differentiate $y = \arctan(2x)$.`, steps: [r`$u = 2x$, $u' = 2$.`, r`$y' = \frac{2}{1 + 4x^2}$.`], a: '2/(1 + 4x²)' },
      { q: r`Find the slope of $y = \arcsin x$ at $x = 0$.`, steps: [r`$y' = \frac{1}{\sqrt{1 - 0}} = 1$.`], a: '1' },
    ],
    practice: [
      P('c3-4-1', 1, r`$f(x) = \arctan x$. Find $f'(1)$.`, ['1/2', '0.5'], '1/(1 + x²).', [r`$\frac{1}{1 + 1} = \frac{1}{2}$.`], { check: () => near(d(Math.atan, 1), 0.5) }),
      P('c3-4-2', 1, r`$f(x) = \arcsin x$. Find $f'\left(\frac{1}{2}\right)$ to three decimal places.`, ['1.155'], '1/√(1 − x²).', [r`$\frac{1}{\sqrt{3/4}} = \frac{2}{\sqrt{3}} \approx 1.155$.`], { check: () => near(d(Math.asin, 0.5), 2 / Math.sqrt(3)) }),
      P('c3-4-3', 1, r`$f(x) = \arctan(3x)$. Find $f'(0)$.`, ['3'], 'Chain rule: u′ = 3.', [r`$f'(x) = \frac{3}{1 + 9x^2}$, so $f'(0) = 3$.`], { check: () => near(d((x) => Math.atan(3 * x), 0), 3) }),
      P('c3-4-4', 1, r`$f(x) = \arccos x$. Find $f'(0)$.`, ['-1'], 'Same as arcsin but negative.', [r`$-\frac{1}{\sqrt{1 - 0}} = -1$.`], { check: () => near(d(Math.acos, 0), -1) }),
      P('c3-4-5', 2, r`$f(x) = x\arctan x$. Find $f'(1)$ to three decimal places.`, ['1.285'], 'Product rule.', [r`$f'(x) = \arctan x + \frac{x}{1 + x^2}$.`, r`$f'(1) = \frac{\pi}{4} + \frac{1}{2} \approx 1.285$.`], { check: () => near(d((x) => x * Math.atan(x), 1), Math.PI / 4 + 0.5) }),
      P('c3-4-6', 3, r`$f(x) = \arcsin(\sqrt{x})$. Find $f'\left(\frac{1}{4}\right)$ to three decimal places.`, ['1.155'], 'Chain rule with u = √x.', [r`$f'(x) = \frac{1}{\sqrt{1 - x}} \cdot \frac{1}{2\sqrt{x}}$.`, r`At $\frac{1}{4}$: $\frac{1}{\sqrt{3/4}} \cdot 1 = \frac{2}{\sqrt{3}} \approx 1.155$.`], { check: () => near(d((x) => Math.asin(Math.sqrt(x)), 0.25), 2 / Math.sqrt(3)) }),
    ],
    remember: ["(arcsin x)' = 1/√(1 − x²), (arccos x)' = −1/√(1 − x²).", "(arctan x)' = 1/(1 + x²).", 'Multiply by u′ for arcsin(u), arctan(u).'],
    checkIn: 'These three come back in Unit 6 as integrals. Write them on your formula sheet. Next: second derivatives and choosing a method.',
  },
  {
    id: 'c3-5', unit: 3, n: 5, title: 'Higher derivatives and choosing a method',
    intro: 'You now have every differentiation rule. Today we practice choosing the right one quickly, which is what the exam really tests, and we take derivatives of derivatives. Second derivatives will tell us about acceleration and about the shape of graphs in Unit 5.',
    goals: ['Find second and higher derivatives', 'Choose between power, product, quotient and chain rules quickly', 'Interpret the second derivative as acceleration'],
    notes: [
      { k: 'p', t: r`The second derivative is the derivative of the derivative: $f''(x)$, $\frac{d^2y}{dx^2}$. If $s(t)$ is position, $s'' = v' = a$, the acceleration.` },
      { k: 'list', items: [r`Sum of powers → power rule.`, r`Two functions multiplied → product rule.`, r`One function divided by another → quotient rule (or rewrite).`, r`Function inside a function → chain rule.`, r`Equation mixing $x$ and $y$ → implicit differentiation.`] },
      { k: 'tip', t: r`Simplify before differentiating: $\ln\left(\frac{x^2}{x + 1}\right) = 2\ln x - \ln(x + 1)$ is much easier than the chain rule on a quotient.` },
      { k: 'warn', t: r`When the first derivative is a product, the second derivative needs the product rule again. Work slowly and simplify between steps.` },
      { k: 'formula', t: r`\frac{d^2}{dx^2}\left(xe^{2x}\right) = \frac{d}{dx}\left[e^{2x}(1 + 2x)\right] = e^{2x}(4 + 4x)` },
    ],
    examples: [
      { q: r`Find $f''(x)$ for $f(x) = xe^{2x}$.`, steps: [r`$f'(x) = e^{2x} + 2xe^{2x} = e^{2x}(1 + 2x)$.`, r`$f''(x) = 2e^{2x}(1 + 2x) + 2e^{2x} = e^{2x}(4 + 4x)$.`], a: 'e^(2x)(4 + 4x)' },
      { q: r`Differentiate $y = \ln(\sin x)$.`, steps: [r`Chain rule: $\frac{\cos x}{\sin x}$.`, r`$y' = \cot x$.`], a: 'cot x' },
    ],
    practice: [
      P('c3-5-1', 1, r`$f(x) = x^4 - 3x^2$. Find $f''(1)$.`, ['6'], 'Differentiate twice.', [r`$f' = 4x^3 - 6x$, $f'' = 12x^2 - 6$.`, r`$f''(1) = 6$.`], { check: () => near(d2((x) => x ** 4 - 3 * x * x, 1), 6, 1e-3) }),
      P('c3-5-2', 2, r`$f(x) = e^{-x^2}$. Find $f''(0)$.`, ['-2'], "f' = −2x e^(−x²); use the product rule next.", [r`$f'(x) = -2xe^{-x^2}$.`, r`$f''(x) = (-2 + 4x^2)e^{-x^2}$, so $f''(0) = -2$.`], { check: () => near(d2((x) => Math.exp(-x * x), 0), -2, 1e-3) }),
      P('c3-5-3', 1, r`A particle has position $s(t) = t^3 - 6t^2 + 9t$. What is its acceleration at $t = 3$?`, ['6'], 'Acceleration is s″.', [r`$s'' = 6t - 12$.`, r`$s''(3) = 6$.`], { check: () => near(d2((t) => t ** 3 - 6 * t * t + 9 * t, 3), 6, 1e-3) }),
      P('c3-5-4', 2, r`$f(x) = \ln(\cos x)$. Find $f'\left(\frac{\pi}{4}\right)$.`, ['-1'], 'Chain rule gives −sin x / cos x.', [r`$f'(x) = \frac{-\sin x}{\cos x} = -\tan x$.`, r`$-\tan\frac{\pi}{4} = -1$.`], { check: () => near(d((x) => Math.log(Math.cos(x)), Math.PI / 4), -1) }),
      P('c3-5-5', 2, r`$f(x) = \sin(2x)$. Find $f'''(0)$.`, ['-8'], 'Each derivative multiplies by 2 and cycles sin → cos → −sin → −cos.', [r`$f' = 2\cos 2x$, $f'' = -4\sin 2x$, $f''' = -8\cos 2x$.`, r`$f'''(0) = -8$.`], { check: () => near(d((x) => -4 * Math.sin(2 * x), 0), -8) }),
      P('c3-5-6', 3, r`$f(x) = \dfrac{x}{\sqrt{x^2 + 1}}$. Find $f'(1)$ to three decimal places.`, ['0.354'], 'Quotient rule; simplify to 1/(x² + 1)^(3/2).', [r`$f'(x) = \frac{\sqrt{x^2 + 1} - \frac{x^2}{\sqrt{x^2 + 1}}}{x^2 + 1} = \frac{1}{(x^2 + 1)^{3/2}}$.`, r`$f'(1) = 2^{-3/2} \approx 0.354$.`], { check: () => near(d((x) => x / Math.sqrt(x * x + 1), 1), 2 ** -1.5) }),
    ],
    remember: ["s'' = acceleration; f'' tells concavity (Unit 5).", 'Pick the rule by the structure of the function.', 'Simplify (log rules, splitting fractions) before differentiating.'],
    checkIn: 'Unit 3 done. Take the review: if you score 80%, you have every differentiation skill the exam needs. Unit 4 uses them in real situations.',
  },
];
