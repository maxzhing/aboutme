import type { LessonTutor } from '../types';

const r = String.raw;

/** Tutor layer · Unit 3: chain rule, implicit and inverse functions. */
export const TUTOR3: Record<string, LessonTutor> = {
  'c3-1': {
    bigIdea: [
      r`Many functions are built like Russian nesting dolls: one function inside another. $(3x^2 + 1)^5$ is “something to the 5th power”, and the something is $3x^2 + 1$. The chain rule tells us how to differentiate these nested functions.`,
      r`Think of gears. If gear A turns 3 times as fast as gear B, and gear B turns 2 times as fast as gear C, then A turns $3 \times 2 = 6$ times as fast as C. Rates of change multiply through a chain. That is all the chain rule says.`,
      r`The recipe: differentiate the outside function, leaving the inside alone, then multiply by the derivative of the inside. For $(3x^2 + 1)^5$: the outside “( )$^5$” gives $5(3x^2 + 1)^4$, and the inside $3x^2 + 1$ gives $6x$. Multiply: $30x(3x^2 + 1)^4$.`,
    ],
    picture: { title: 'Gears turning gears', t: r`A bike pedal turns the front gear, which turns the chain, which turns the back wheel. How fast the wheel spins compared with your pedaling is the product of each stage’s ratio. The chain rule multiplies stage ratios the same way.` },
    words: [
      { term: 'Composite function', means: r`A function inside another, like $f(g(x))$.` },
      { term: 'Outside / inside function', means: r`In $\sin(x^2)$, sine is the outside function and $x^2$ is the inside.` },
      { term: 'Chain rule', means: r`$\frac{d}{dx}f(g(x)) = f'(g(x)) \cdot g'(x)$.` },
      { term: r`$\frac{dy}{du} \cdot \frac{du}{dx}$`, means: r`The chain rule in Leibniz notation: rates multiply through the middle variable $u$.` },
    ],
    tools: [
      { name: 'Composition', refresher: r`$f(g(x))$: run $g$ first, then $f$.`, lesson: 'c0-3' },
      { name: 'Basic derivatives', refresher: r`Power rule, $e^x$, $\ln x$, $\sin x$, $\cos x$.`, lesson: 'c2-4' },
      { name: 'Unit circle', refresher: r`$\cos\pi = -1$, $\sin\frac{\pi}{4} = \cos\frac{\pi}{4} = \frac{\sqrt{2}}{2}$.`, lesson: 'c0-8' },
    ],
    why: [
      [r`Identify the layers first: the last operation performed is “raise to the 5th”, so that is the outside; what is being raised is the inside.`, r`Differentiate the outside with the inside left untouched ($5u^4$), then multiply by the inside’s derivative ($6x$). Forgetting the $6x$ is the number-one chain-rule mistake.`],
      [r`The exponent is not just $x$ but $\sin x$, so $e^{\sin x}$ is a composition: $e^{(\ldots)}$ outside, $\sin x$ inside.`, r`$e^u$ differentiates to itself, then multiply by the inside’s derivative $\cos x$.`],
    ],
    walk: {
      'c3-1-1': [r`Layers: outside is “( )$^3$”, inside is $2x + 1$.`, r`Outside derivative: $3(2x + 1)^2$. Inside derivative: $2$.`, r`$f'(x) = 3(2x + 1)^2 \cdot 2 = 6(2x + 1)^2$.`, r`At 1: $6 \cdot 3^2 = 54$.`],
      'c3-1-2': [r`Outside: sine. Inside: $x^2$.`, r`$f'(x) = \cos(x^2) \cdot 2x$.`, r`At $x = \sqrt{\pi}$: $x^2 = \pi$, so $\cos\pi \cdot 2\sqrt{\pi} = -2\sqrt{\pi}$.`, r`$\sqrt{\pi} \approx 1.7725$, so the answer is $\approx -3.545$.`],
      'c3-1-3': [r`Outside: $e^{(\ldots)}$. Inside: $3x$ with derivative 3.`, r`$f'(x) = e^{3x} \cdot 3$.`, r`At 0: $3e^0 = 3$.`],
      'c3-1-4': [r`Outside: $\ln(\ldots)$, whose derivative is $\frac{1}{\ldots}$. Inside: $x^2 + 1$, derivative $2x$.`, r`$f'(x) = \frac{1}{x^2 + 1} \cdot 2x = \frac{2x}{x^2 + 1}$.`, r`At 1: $\frac{2}{2} = 1$.`],
      'c3-1-5': [r`Chain rule: $h'(x) = f'(g(x)) \cdot g'(x)$.`, r`At $x = 1$: the inside value is $g(1) = 2$, so we need $f'$ at 2, not at 1.`, r`$h'(1) = f'(2) \cdot g'(1) = 4 \cdot (-1) = -4$.`],
      'c3-1-6': [r`Three layers: square root of $(1 + (\cos x)^2)$, which contains $\cos x$.`, r`Root layer: $\frac{1}{2\sqrt{1 + \cos^2 x}}$. Square layer: $2\cos x$. Cosine layer: $-\sin x$. Multiply all three.`, r`$f'(x) = \frac{-\sin x\cos x}{\sqrt{1 + \cos^2 x}}$.`, r`At $\frac{\pi}{4}$: $\sin\cos = \frac{1}{2}$ and $\cos^2 = \frac{1}{2}$, so $\frac{-1/2}{\sqrt{3/2}} \approx -0.408$.`],
    },
    teach: {
      plan: [r`Use the gears story to show that rates multiply.`, r`Practice naming the outside and inside of several functions before differentiating anything.`, r`State the recipe: derivative of outside (inside untouched) × derivative of inside.`, r`Work $(3x^2 + 1)^5$ and $e^{\sin x}$.`, r`Do a table problem $f(g(x))$ and stress plugging $g(1)$ into $f'$.`],
      questions: [
        { q: 'How do I know which part is the outside?', a: r`Ask: if I computed this with a calculator, what would I do LAST? That last operation is the outside. For $(3x^2 + 1)^5$, you would raise to the 5th last.` },
        { q: 'What if there are three layers?', a: 'Keep going: multiply the derivatives of every layer, from the outside in.' },
        { q: r`Why is $\frac{d}{dx}e^{3x}$ not just $e^{3x}$?`, a: r`Because the exponent is $3x$, not $x$. Its derivative 3 comes out as the chain-rule factor: $3e^{3x}$.` },
      ],
      keyPoints: ['Identify outside and inside functions.', 'd/dx f(g(x)) = f′(g(x)) · g′(x).', 'Never forget to multiply by the inside’s derivative.', 'With tables: evaluate f′ at g(a), not at a.'],
    },
  },
  'c3-2': {
    bigIdea: [
      r`Some curves are not written as “$y = $ something”. The circle $x^2 + y^2 = 25$ mixes $x$ and $y$ together, and solving for $y$ is messy (it gives two halves). Implicit differentiation finds the slope anyway.`,
      r`The trick: treat $y$ as a hidden function of $x$ and differentiate both sides of the equation with respect to $x$. Every time you differentiate something with $y$ in it, the chain rule adds a factor $\frac{dy}{dx}$, because $y$ depends on $x$.`,
      r`After that, it is just algebra: gather the $\frac{dy}{dx}$ terms on one side, factor it out, and divide. The answer usually involves both $x$ and $y$, which is fine: plug in the point you care about.`,
    ],
    picture: { title: 'A shadow on the ground', t: r`Imagine $y$ as your shadow, which moves whenever you ($x$) move. Whenever you measure how fast something involving the shadow changes, you must account for how fast the shadow itself moves: that is the extra $\frac{dy}{dx}$ factor.` },
    words: [
      { term: 'Implicit equation', means: r`An equation relating $x$ and $y$ that is not solved for $y$, like $x^2 + y^2 = 25$.` },
      { term: 'Implicit differentiation', means: r`Differentiating both sides with respect to $x$, treating $y$ as a function of $x$.` },
      { term: r`$\frac{dy}{dx}$`, means: r`The derivative of $y$ with respect to $x$: the slope of the curve.` },
      { term: r`$\frac{d^2y}{dx^2}$`, means: 'The second derivative: the derivative of dy/dx.' },
    ],
    tools: [
      { name: 'Chain rule', refresher: r`$\frac{d}{dx}y^2 = 2y\frac{dy}{dx}$ because $y$ is a function of $x$.`, lesson: 'c3-1' },
      { name: 'Product rule', refresher: r`$\frac{d}{dx}(xy) = y + x\frac{dy}{dx}$.`, lesson: 'c2-5' },
      { name: 'Solving equations', refresher: r`Collect terms, factor out $\frac{dy}{dx}$, divide.`, lesson: 'c0-2' },
    ],
    why: [
      [r`Differentiate each term with respect to $x$. $x^2$ gives $2x$ as usual, but $y^2$ needs the chain rule, so it gives $2y\frac{dy}{dx}$. The constant 25 gives 0.`, r`Solve for $\frac{dy}{dx}$ like any equation: move $2x$ over and divide by $2y$.`, r`The formula contains $x$ and $y$; at a specific point we substitute both.`],
      [r`$xy$ is a product, so it needs the product rule; $y^2$ needs the chain rule.`, r`Collect the terms that contain $\frac{dy}{dx}$ and factor it out.`, r`Divide to isolate it.`],
    ],
    walk: {
      'c3-2-1': [r`From the example: differentiating $x^2 + y^2 = 25$ gives $\frac{dy}{dx} = -\frac{x}{y}$.`, r`Plug in $(-3, 4)$: $-\frac{-3}{4}$.`, r`$= \frac{3}{4}$. Positive makes sense: on the upper-left part of the circle, the curve rises as you move right.`],
      'c3-2-2': [r`Differentiate both sides: $3x^2 + 3y^2\frac{dy}{dx} = 0$ (the chain rule adds $\frac{dy}{dx}$ to the $y^3$ term).`, r`Solve: $\frac{dy}{dx} = -\frac{3x^2}{3y^2} = -\frac{x^2}{y^2}$.`, r`At $(1, 2)$: $-\frac{1}{4}$.`],
      'c3-2-3': [r`Product rule on $xy$: $1 \cdot y + x\frac{dy}{dx} = 0$ (the right side 6 is constant).`, r`Solve: $x\frac{dy}{dx} = -y$, so $\frac{dy}{dx} = -\frac{y}{x}$.`, r`At $(2, 3)$: $-\frac{3}{2}$.`],
      'c3-2-4': [r`Term by term: $x^2 \to 2x$; $xy \to y + x\frac{dy}{dx}$; $y^2 \to 2y\frac{dy}{dx}$; $7 \to 0$.`, r`$2x + y + (x + 2y)\frac{dy}{dx} = 0$.`, r`$\frac{dy}{dx} = -\frac{2x + y}{x + 2y}$.`, r`At $(1, 2)$: $-\frac{2 + 2}{1 + 4} = -\frac{4}{5}$.`],
      'c3-2-5': [r`Differentiate both sides: $\cos y \cdot \frac{dy}{dx} = 1$.`, r`So $\frac{dy}{dx} = \frac{1}{\cos y}$.`, r`At $y = \frac{\pi}{6}$: $\cos\frac{\pi}{6} = \frac{\sqrt{3}}{2}$, so $\frac{2}{\sqrt{3}} \approx 1.155$.`],
      'c3-2-6': [r`Start from $y' = -\frac{x}{y}$ and differentiate again with the quotient rule (remember $y$ depends on $x$): $y'' = -\frac{1 \cdot y - x \cdot y'}{y^2}$.`, r`At $(3, 4)$ we know $y' = -\frac{3}{4}$.`, r`Top: $4 - 3\left(-\frac{3}{4}\right) = 4 + \frac{9}{4} = \frac{25}{4}$. So $y'' = -\frac{25/4}{16} = -\frac{25}{64}$.`, r`Negative: the top of the circle is concave down. ✓`],
    },
    teach: {
      plan: [r`Draw the circle $x^2 + y^2 = 25$ and ask for the slope at $(3, 4)$. Show that solving for $y$ is awkward.`, r`Explain why $\frac{d}{dx}y^2 = 2y\frac{dy}{dx}$ (chain rule with the shadow story).`, r`Differentiate the circle equation together and solve for $\frac{dy}{dx}$.`, r`Do $xy + y^2 = 6$ to practice the product rule with $y$.`, r`Check the circle answer geometrically: the tangent is perpendicular to the radius.`],
      questions: [
        { q: r`Why does $x^2$ give just $2x$ but $y^2$ gives $2y\frac{dy}{dx}$?`, a: r`We differentiate with respect to $x$. The derivative of $x$ with respect to $x$ is 1, so it is invisible. For $y$, the chain rule brings in $\frac{dy}{dx}$.` },
        { q: 'Is it OK that the answer has y in it?', a: 'Yes. On curves like circles, the slope depends on which point you are at, and two points can share the same x. So the formula needs y too.' },
        { q: 'When is the tangent horizontal or vertical?', a: r`Horizontal when the top of $\frac{dy}{dx}$ is 0; vertical when the bottom is 0 (and the top is not).` },
      ],
      keyPoints: ['Differentiate both sides with respect to x.', 'Every y term picks up a dy/dx (chain rule).', 'Use the product rule on terms like xy.', 'Collect dy/dx terms, factor, and divide.'],
    },
  },
  'c3-3': {
    bigIdea: [
      r`An inverse function undoes a function: if $f$ takes 1 to 4, then $f^{-1}$ takes 4 back to 1. On a graph, the inverse is the mirror image of $f$ across the line $y = x$, because every point $(a, b)$ swaps to $(b, a)$.`,
      r`Mirroring swaps rise and run, so slopes become reciprocals. If $f$ has slope 5 at the point $(1, 4)$, then $f^{-1}$ has slope $\frac{1}{5}$ at the mirrored point $(4, 1)$.`,
      r`The formula: $(f^{-1})'(b) = \frac{1}{f'(a)}$ where $f(a) = b$. The hardest part is not the formula, it is finding the matching $a$: the input to $f$ that produces $b$.`,
    ],
    picture: { title: 'Exchange rates', t: r`If 1 dollar buys 5 pesos, then 1 peso buys $\frac{1}{5}$ of a dollar. Converting back is the inverse, and the rate becomes the reciprocal. Derivatives of inverse functions work the same way.` },
    words: [
      { term: r`Inverse function $f^{-1}$`, means: r`The function that undoes $f$: if $f(a) = b$ then $f^{-1}(b) = a$.` },
      { term: 'Reflection across y = x', means: r`Swapping every point $(a, b)$ to $(b, a)$; this turns the graph of $f$ into the graph of $f^{-1}$.` },
      { term: 'Reciprocal', means: r`$\frac{1}{\text{number}}$; slopes of inverses are reciprocals at matching points.` },
    ],
    tools: [
      { name: 'Slope and rise/run', refresher: 'Swapping x and y swaps rise and run, so the slope flips.', lesson: 'c0-4' },
      { name: 'Derivative rules', refresher: r`Power rule, $e^{2x}$ via chain rule, $\cos x$.`, lesson: 'c3-1' },
      { name: 'Solving equations by inspection', refresher: r`To solve $x^3 + x = 2$, try small whole numbers like 0, 1, −1.` },
    ],
    why: [
      [r`We need the $x$-value that $f$ sends to 2. Trying small numbers: $f(1) = 1 + 1 = 2$. So the matching point is $(1, 2)$ on $f$ and $(2, 1)$ on $g$.`, r`Slope of $f$ at the matching point.`, r`Inverse slopes are reciprocals: flip 4 to $\frac{1}{4}$.`],
      [r`$(f^{-1})'(7)$ is about the point where the OUTPUT of $f$ is 7. The table says $f(3) = 7$.`, r`So use $f'(3)$, not $f'(7)$, and take the reciprocal.`],
    ],
    walk: {
      'c3-3-1': [r`Find $a$ with $f(a) = 4$: try $a = 1$: $1 + 2 + 1 = 4$ ✓.`, r`$f'(x) = 3x^2 + 2$, so $f'(1) = 5$.`, r`$g'(4) = \frac{1}{f'(1)} = \frac{1}{5}$.`],
      'c3-3-2': [r`We need $g'(7)$, so find where $f$ outputs 7: $f(3) = 7$.`, r`Use $f'(3) = 2$ (ignore $f'(7)$, which is about a different point).`, r`$g'(7) = \frac{1}{2}$.`],
      'c3-3-3': [r`Find $a$ with $e^{2a} + a = 1$: try $a = 0$: $1 + 0 = 1$ ✓.`, r`$f'(x) = 2e^{2x} + 1$ (chain rule on $e^{2x}$), so $f'(0) = 3$.`, r`$g'(1) = \frac{1}{3}$.`],
      'c3-3-4': [r`Find $a$ with $a^5 + a^3 + a = 3$: try $a = 1$: $1 + 1 + 1 = 3$ ✓.`, r`$f'(x) = 5x^4 + 3x^2 + 1$, so $f'(1) = 9$.`, r`$g'(3) = \frac{1}{9}$.`],
      'c3-3-5': [r`$f(2) = 5$ means the inverse sends 5 back to 2.`, r`$(f^{-1})'(5) = \frac{1}{f'(2)}$.`, r`$= \frac{1}{4}$: choice A.`],
      'c3-3-6': [r`Find $a$ with $2a + \cos a = 1$: try $a = 0$: $0 + 1 = 1$ ✓.`, r`$f'(x) = 2 - \sin x$, so $f'(0) = 2$.`, r`$g'(1) = \frac{1}{2}$.`],
    },
    teach: {
      plan: [r`Graph a function and its inverse, with the mirror line $y = x$.`, r`Pick a point and its mirror image, and show that rise and run swap, so slopes are reciprocals.`, r`Write the formula and emphasize: first find $a$ with $f(a) = b$.`, r`Practice finding $a$ by trying small numbers.`, r`Do a table problem with a distractor value.`],
      questions: [
        { q: r`Is $f^{-1}(x)$ the same as $\frac{1}{f(x)}$?`, a: r`No. $f^{-1}$ undoes $f$; $\frac{1}{f(x)}$ is the reciprocal of the output. The $-1$ here is notation, not an exponent.` },
        { q: 'Why do I evaluate f′ at a and not at b?', a: r`Because the point $(b, a)$ on the inverse is the mirror of $(a, b)$ on $f$. The slope there comes from $f$’s slope at $(a, b)$, which is $f'(a)$.` },
        { q: 'What if I can’t find a by guessing?', a: r`On the AP exam, $a$ is designed to be a nice number (0, 1, 2…) or it is given in a table. Otherwise a calculator can solve $f(a) = b$.` },
      ],
      keyPoints: ['The inverse is the reflection across y = x.', '(f⁻¹)′(b) = 1/f′(a), where f(a) = b.', 'Find a first: the input of f that gives b.', 'Slopes of inverses at matching points are reciprocals.'],
    },
  },
  'c3-4': {
    bigIdea: [
      r`Inverse trig functions answer the reverse question: “what angle has this sine?”. $\arcsin\frac{1}{2} = \frac{\pi}{6}$ because $\sin\frac{\pi}{6} = \frac{1}{2}$. Their derivatives are surprising: no trig functions at all, just algebra with square roots.`,
      r`The three to know: $(\arcsin x)' = \frac{1}{\sqrt{1 - x^2}}$, $(\arccos x)' = -\frac{1}{\sqrt{1 - x^2}}$, and $(\arctan x)' = \frac{1}{1 + x^2}$. They come from implicit differentiation of $\sin y = x$ and its cousins.`,
      r`With the chain rule, replace $x$ by the inside $u$ and multiply by $u'$: $(\arctan 2x)' = \frac{2}{1 + 4x^2}$. These derivatives are important later because they make some integrals possible.`,
    ],
    picture: { title: 'A ramp angle finder', t: r`If a ramp rises 1 foot for every 1 foot forward, what is its angle? $\arctan 1 = \frac{\pi}{4} = 45^\circ$. The inverse tangent turns a slope into an angle; its derivative tells you how fast the angle changes as the slope changes.` },
    words: [
      { term: r`$\arcsin x$ ($\sin^{-1} x$)`, means: r`The angle between $-\frac{\pi}{2}$ and $\frac{\pi}{2}$ whose sine is $x$.` },
      { term: r`$\arccos x$`, means: r`The angle between 0 and $\pi$ whose cosine is $x$.` },
      { term: r`$\arctan x$`, means: r`The angle between $-\frac{\pi}{2}$ and $\frac{\pi}{2}$ whose tangent is $x$.` },
    ],
    tools: [
      { name: 'Inverse functions', refresher: 'Inverses undo each other; slopes are reciprocals.', lesson: 'c3-3' },
      { name: 'Implicit differentiation', refresher: r`From $\sin y = x$: $\cos y\,y' = 1$, so $y' = \frac{1}{\cos y} = \frac{1}{\sqrt{1 - x^2}}$.`, lesson: 'c3-2' },
      { name: 'Chain and product rules', refresher: r`$(\arctan u)' = \frac{u'}{1 + u^2}$.`, lesson: 'c3-1' },
    ],
    why: [
      [r`It is $\arctan$ of $2x$, not of $x$, so the chain rule applies with inside $u = 2x$.`, r`Use $\frac{1}{1 + u^2}$ with $u = 2x$, so $u^2 = 4x^2$, then multiply by $u' = 2$.`],
      [r`Plug 0 into $\frac{1}{\sqrt{1 - x^2}}$; the slope of $\arcsin$ at the origin is exactly 1, matching $\sin$’s slope 1 there (inverses mirror each other across $y = x$).`],
    ],
    walk: {
      'c3-4-1': [r`$(\arctan x)' = \frac{1}{1 + x^2}$.`, r`At 1: $\frac{1}{1 + 1}$.`, r`$= \frac{1}{2}$.`],
      'c3-4-2': [r`$(\arcsin x)' = \frac{1}{\sqrt{1 - x^2}}$.`, r`At $\frac{1}{2}$: $1 - \frac{1}{4} = \frac{3}{4}$, and $\sqrt{\frac{3}{4}} = \frac{\sqrt{3}}{2}$.`, r`$\frac{1}{\sqrt{3}/2} = \frac{2}{\sqrt{3}} \approx 1.155$.`],
      'c3-4-3': [r`Chain rule with $u = 3x$, $u' = 3$.`, r`$f'(x) = \frac{3}{1 + (3x)^2} = \frac{3}{1 + 9x^2}$.`, r`At 0: $\frac{3}{1} = 3$.`],
      'c3-4-4': [r`$(\arccos x)' = -\frac{1}{\sqrt{1 - x^2}}$.`, r`At 0: $-\frac{1}{\sqrt{1}}$.`, r`$= -1$. Arccos decreases, so a negative slope makes sense.`],
      'c3-4-5': [r`Product of $x$ and $\arctan x$: $f'(x) = 1 \cdot \arctan x + x \cdot \frac{1}{1 + x^2}$.`, r`At 1: $\arctan 1 = \frac{\pi}{4}$ and $\frac{1}{1 + 1} = \frac{1}{2}$.`, r`$\frac{\pi}{4} + \frac{1}{2} \approx 0.785 + 0.5 = 1.285$.`],
      'c3-4-6': [r`Chain rule with $u = \sqrt{x}$, $u' = \frac{1}{2\sqrt{x}}$.`, r`$f'(x) = \frac{1}{\sqrt{1 - (\sqrt{x})^2}} \cdot \frac{1}{2\sqrt{x}} = \frac{1}{\sqrt{1 - x}} \cdot \frac{1}{2\sqrt{x}}$.`, r`At $\frac{1}{4}$: $\frac{1}{\sqrt{3/4}} \cdot \frac{1}{2 \cdot \frac{1}{2}} = \frac{2}{\sqrt{3}} \cdot 1 \approx 1.155$.`],
    },
    teach: {
      plan: [r`Review what $\arcsin$ means with $\arcsin\frac{1}{2} = \frac{\pi}{6}$.`, r`Derive $(\arcsin x)'$ with implicit differentiation of $\sin y = x$ and a right triangle.`, r`State the three formulas and point out arccos is just the negative of arcsin’s.`, r`Practice with the chain rule.`, r`Mention that $\frac{1}{1 + x^2}$ will be important for integrals later.`],
      questions: [
        { q: r`Why does $\arcsin x$ only work for $-1 \le x \le 1$?`, a: r`Because sine never goes outside $[-1, 1]$; no angle has a sine of 2. The derivative also breaks there: $\sqrt{1 - x^2}$ would be 0 or imaginary.` },
        { q: r`Is $\sin^{-1} x$ the same as $\frac{1}{\sin x}$?`, a: r`No. $\sin^{-1}x$ means arcsine (the inverse). $\frac{1}{\sin x}$ is cosecant.` },
        { q: 'Where do these formulas come from?', a: r`From implicit differentiation: $\sin y = x$ gives $y' = \frac{1}{\cos y}$, and $\cos y = \sqrt{1 - \sin^2 y} = \sqrt{1 - x^2}$.` },
      ],
      keyPoints: ['(arcsin x)′ = 1/√(1 − x²).', '(arccos x)′ = −1/√(1 − x²).', '(arctan x)′ = 1/(1 + x²).', 'With the chain rule, multiply by the inside’s derivative.'],
    },
  },
  'c3-5': {
    bigIdea: [
      r`You can take a derivative of a derivative. The second derivative $f''$ tells you how the slope itself is changing. For motion: position $s$, then velocity $s'$ (how fast position changes), then acceleration $s''$ (how fast velocity changes). The third derivative even has a name: jerk.`,
      r`By now you have a whole toolbox: power rule, product rule, quotient rule, chain rule, and the special derivatives. The real skill is choosing the right tool. Look at the LAST operation in the function: a product → product rule; a quotient → quotient rule (or rewrite); a function of a function → chain rule.`,
      r`Often you need several rules at once, nested inside each other. Go one layer at a time and write each step. Simplifying the first derivative before taking the second saves a lot of work.`,
    ],
    picture: { title: 'Driving a car', t: r`Your odometer reading is position. The speedometer is the first derivative. Pressing the gas pedal changes the speedometer reading: that is acceleration, the second derivative. A jolty, jerky ride is a big third derivative.` },
    words: [
      { term: r`Second derivative $f''$`, means: 'The derivative of the derivative: the rate of change of the slope.' },
      { term: 'Acceleration', means: r`The derivative of velocity, so the second derivative of position: $a(t) = s''(t)$.` },
      { term: r`$f'''$ and $f^{(n)}$`, means: r`Third derivative, and $n$-th derivative.` },
      { term: 'Main operation', means: 'The last operation performed when evaluating; it decides which derivative rule to use first.' },
    ],
    tools: [
      { name: 'Product and quotient rules', refresher: r`$(fg)' = f'g + fg'$; $(f/g)' = (f'g - fg')/g^2$.`, lesson: 'c2-5' },
      { name: 'Chain rule', refresher: r`Outside derivative × inside derivative.`, lesson: 'c3-1' },
      { name: 'Trig and log derivatives', refresher: r`$(\ln u)' = \frac{u'}{u}$; $(\sin u)' = u'\cos u$.`, lesson: 'c2-4' },
    ],
    why: [
      [r`$xe^{2x}$ is a product, so the product rule; $e^{2x}$ needs the chain rule (factor 2). Factoring out $e^{2x}$ makes the next derivative easier.`, r`Now differentiate $e^{2x}(1 + 2x)$, again a product. Combine like terms at the end.`],
      [r`The function is $\ln$ of something, so the chain rule: $\frac{1}{\text{inside}}$ times the inside’s derivative.`, r`$\frac{\cos x}{\sin x}$ is the definition of $\cot x$, a nice clean answer.`],
    ],
    walk: {
      'c3-5-1': [r`First derivative with the power rule: $f'(x) = 4x^3 - 6x$.`, r`Differentiate again: $f''(x) = 12x^2 - 6$.`, r`At 1: $12 - 6 = 6$.`],
      'c3-5-2': [r`Chain rule: $f'(x) = e^{-x^2} \cdot (-2x) = -2xe^{-x^2}$.`, r`Product rule on $-2x \cdot e^{-x^2}$: $f''(x) = -2e^{-x^2} + (-2x)(-2x)e^{-x^2} = (-2 + 4x^2)e^{-x^2}$.`, r`At 0: $(-2 + 0) \cdot 1 = -2$.`],
      'c3-5-3': [r`Acceleration is the second derivative of position.`, r`$s'(t) = 3t^2 - 12t + 9$ (velocity); $s''(t) = 6t - 12$ (acceleration).`, r`At $t = 3$: $18 - 12 = 6$.`],
      'c3-5-4': [r`Chain rule on $\ln(\text{inside})$: $\frac{1}{\cos x} \cdot (-\sin x)$.`, r`$= -\frac{\sin x}{\cos x} = -\tan x$.`, r`At $\frac{\pi}{4}$: $-1$.`],
      'c3-5-5': [r`$f'(x) = 2\cos 2x$ (chain rule: factor 2).`, r`$f''(x) = 2 \cdot (-\sin 2x) \cdot 2 = -4\sin 2x$.`, r`$f'''(x) = -4\cos 2x \cdot 2 = -8\cos 2x$. At 0: $-8$.`],
      'c3-5-6': [r`It is a quotient; top $x$ (derivative 1), bottom $\sqrt{x^2 + 1}$ (derivative $\frac{x}{\sqrt{x^2 + 1}}$ by the chain rule).`, r`$f'(x) = \frac{\sqrt{x^2 + 1} - x \cdot \frac{x}{\sqrt{x^2 + 1}}}{x^2 + 1}$.`, r`Multiply top and bottom by $\sqrt{x^2 + 1}$: $\frac{(x^2 + 1) - x^2}{(x^2 + 1)^{3/2}} = \frac{1}{(x^2 + 1)^{3/2}}$.`, r`At 1: $\frac{1}{2^{3/2}} \approx 0.354$.`],
    },
    teach: {
      plan: [r`Explain position → velocity → acceleration with a car.`, r`Take a few second derivatives of polynomials.`, r`Show how to choose a rule by finding the main operation, with 4–5 quick examples.`, r`Work $xe^{2x}$ twice, factoring after the first derivative.`, r`Have your student narrate which rule they use at each layer.`],
      questions: [
        { q: 'What does the second derivative tell me about a graph?', a: 'Whether the graph is bending up (positive, like a cup) or down (negative, like a cap). This is concavity, coming in Unit 5.' },
        { q: 'How do I decide which rule to use first?', a: 'Look at the last operation you would do if you evaluated the function. Product → product rule; quotient → quotient rule; function of a function → chain rule.' },
        { q: 'Should I simplify before differentiating again?', a: 'Yes, whenever you can. A factored, simplified first derivative makes the second derivative much easier.' },
      ],
      keyPoints: ['f″ is the derivative of f′; acceleration = s″.', 'Choose a rule from the main (last) operation.', 'Combine rules layer by layer.', 'Simplify before differentiating again.'],
    },
  },
};
