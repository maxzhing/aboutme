import type { LessonTutor } from '../types';

const r = String.raw;

/** Tutor layer · Unit 6 (lessons 1–4): accumulation and the Fundamental Theorem. */
export const TUTOR6A: Record<string, LessonTutor> = {
  'c6-1': {
    bigIdea: [
      r`Derivatives answer “how fast?”. Integrals answer the opposite question: “how much in total?”. If you know how fast water pours into a tank at every moment, how much water ends up in the tank?`,
      r`If the rate were constant, it would be easy: 5 gallons per minute for 3 minutes is 15 gallons. That is a rectangle on a graph: height 5 (rate), width 3 (time), area 15 (amount). So the total amount is the AREA under the rate graph.`,
      r`When the rate keeps changing, we approximate: chop time into short pieces, pretend the rate is constant on each piece, and add up the thin rectangles. That sum is a Riemann sum. Using trapezoids instead of rectangles (averaging the two ends) is usually more accurate. With more and thinner pieces, the estimate gets better and better.`,
    ],
    picture: { title: 'Filling a bathtub', t: r`Turn the faucet slowly open, then closed. Every few seconds you note the flow rate. Multiply each rate by the seconds it lasted and add them up: that is your estimate of the water in the tub. Each product is a thin rectangle under the flow-rate graph.` },
    words: [
      { term: 'Accumulation', means: 'The total amount built up from a rate over time.' },
      { term: 'Riemann sum', means: 'A sum of rectangle areas (height × width) that approximates the area under a curve.' },
      { term: r`$\Delta x$`, means: 'The width of each subinterval.' },
      { term: 'Left / right / midpoint sum', means: 'Rectangle heights taken from the left end, right end, or middle of each subinterval.' },
      { term: 'Trapezoidal rule', means: r`Uses trapezoids: average of the two end heights times the width.` },
    ],
    tools: [
      { name: 'Area of rectangles and trapezoids', refresher: r`Rectangle: base × height. Trapezoid: $\frac{h_1 + h_2}{2} \times$ width.` },
      { name: 'Evaluating functions', refresher: r`Heights come from plugging endpoints into $f$, like $f(1.5) = 2.25$.`, lesson: 'c0-3' },
      { name: 'Increasing functions and concavity', refresher: 'These decide whether an estimate is too big or too small.', lesson: 'c5-4' },
    ],
    why: [
      [r`Four equal pieces of $[0, 2]$ each have width $\frac{2}{4} = 0.5$. A left sum uses the height at the left end of each piece.`, r`Each rectangle’s area is $0.5 \times$ height; factor out the common width and add the heights $x^2$.`],
      [r`The table gives uneven gaps (2, 3 and 4 minutes), so each trapezoid uses its own width: average of the two end rates times that width.`, r`Add the three trapezoid areas; the units are (gal/min) × min = gallons.`],
    ],
    walk: {
      'c6-1-1': [r`Width: $\Delta x = \frac{2 - 0}{4} = 0.5$. Subintervals: $[0, 0.5], [0.5, 1], [1, 1.5], [1.5, 2]$.`, r`Left endpoints: $0, 0.5, 1, 1.5$. Heights $x^2$: $0, 0.25, 1, 2.25$.`, r`Sum of areas: $0.5(0 + 0.25 + 1 + 2.25) = 0.5 \times 3.5 = 1.75$.`],
      'c6-1-2': [r`Same width 0.5, but now right endpoints: $0.5, 1, 1.5, 2$.`, r`Heights: $0.25, 1, 2.25, 4$.`, r`$0.5(0.25 + 1 + 2.25 + 4) = 0.5 \times 7.5 = 3.75$.`],
      'c6-1-3': [r`Each trapezoid averages its left and right heights, so the trapezoid sum is the average of the left and right sums (for equal widths).`, r`$\frac{1.75 + 3.75}{2}$.`, r`$= 2.75$. (The exact answer is $\frac{8}{3} \approx 2.667$: the trapezoid is closest.)`],
      'c6-1-4': [r`Three trapezoids with widths $2 - 0 = 2$, $5 - 2 = 3$, $9 - 5 = 4$.`, r`Areas: $\frac{4 + 6}{2}(2) = 10$; $\frac{6 + 7}{2}(3) = 19.5$; $\frac{7 + 3}{2}(4) = 20$.`, r`Total: $10 + 19.5 + 20 = 49.5$ gallons.`],
      'c6-1-5': [r`Two equal pieces of $[1, 5]$: width $\frac{4}{2} = 2$; pieces $[1, 3]$ and $[3, 5]$.`, r`Midpoints: 2 and 4. Heights $\frac{1}{x}$: $\frac{1}{2}$ and $\frac{1}{4}$.`, r`$2\left(\frac{1}{2} + \frac{1}{4}\right) = 2 \times 0.75 = 1.5$.`],
      'c6-1-6': [r`For an increasing function, the left end of each piece is its lowest point.`, r`So each left rectangle fits under the curve, leaving a little gap.`, r`The sum is too small: an underestimate. Choice A.`],
    },
    teach: {
      plan: [r`Ask: if water flows at 5 gal/min for 3 min, how much? Draw the rectangle under the rate graph.`, r`Now make the rate change and ask how to estimate. Draw thin rectangles.`, r`Compute left and right sums for $x^2$ on $[0, 2]$ together.`, r`Show trapezoids and do a table problem with uneven widths.`, r`Discuss over- and underestimates with pictures.`],
      questions: [
        { q: 'Why is area the same as amount?', a: 'Because amount = rate × time, and on a rate-vs-time graph, height × width is exactly a rectangle’s area.' },
        { q: 'Which sum is most accurate?', a: 'Usually the trapezoidal or midpoint rule. More subintervals make every method better.' },
        { q: 'What if the table has uneven gaps?', a: 'Use each subinterval’s own width. Never assume equal widths unless they are.' },
      ],
      keyPoints: ['Area under a rate graph = total amount.', 'Riemann sums add rectangle areas (height × width).', 'Trapezoids average the two end heights.', 'Increasing f: left sums under, right sums over.'],
    },
  },
  'c6-2': {
    bigIdea: [
      r`If we use more and more, thinner and thinner rectangles, the Riemann sums settle on one exact number: the definite integral $\int_a^b f(x)\,dx$. The long S-shaped sign means “sum”, and $dx$ reminds us of the tiny widths.`,
      r`Adding infinitely many rectangles sounds impossible, but the Fundamental Theorem of Calculus (FTC) gives a shortcut: find a function $F$ whose derivative is $f$ (an antiderivative), then the integral is just $F(b) - F(a)$.`,
      r`Why? If $f$ is a rate, then $F$ is the amount, and the total change in amount from $a$ to $b$ is $F(b) - F(a)$. So areas can be computed by undoing derivatives. This connection between slopes and areas is the heart of all of calculus.`,
    ],
    picture: { title: 'An odometer', t: r`Your speedometer shows a rate (the function $f$). Your odometer shows the total distance (the antiderivative $F$). To find how far you drove from 2 pm to 4 pm, you don’t add up every speedometer reading: you just subtract the odometer readings, $F(4) - F(2)$.` },
    words: [
      { term: 'Definite integral', means: r`$\int_a^b f(x)\,dx$: the exact signed area between $f$ and the $x$-axis from $a$ to $b$.` },
      { term: 'Antiderivative', means: r`A function $F$ with $F' = f$.` },
      { term: 'Fundamental Theorem of Calculus', means: r`$\int_a^b f(x)\,dx = F(b) - F(a)$ when $F' = f$.` },
      { term: 'Signed area', means: 'Area above the axis counts positive, below counts negative.' },
      { term: 'Limits of integration', means: r`The numbers $a$ (bottom) and $b$ (top) of the interval.` },
    ],
    tools: [
      { name: 'Derivative rules backwards', refresher: r`Since $(x^3)' = 3x^2$, an antiderivative of $3x^2$ is $x^3$.`, lesson: 'c2-3' },
      { name: 'Riemann sums', refresher: 'The integral is the limit of these sums.', lesson: 'c6-1' },
      { name: 'Circle area', refresher: r`A circle of radius $r$ has area $\pi r^2$; a semicircle half that.` },
    ],
    why: [
      [r`We need a function whose derivative is $3x^2 + 1$. $(x^3)' = 3x^2$ and $(x)' = 1$, so $x^3 + x$ works.`, r`The FTC says: top value minus bottom value.`],
      [r`$y = \sqrt{9 - x^2}$ means $y^2 = 9 - x^2$, i.e. $x^2 + y^2 = 9$ with $y \ge 0$: the top half of a circle of radius 3. Geometry beats antiderivatives here.`, r`The integral is that area: half of $\pi \cdot 3^2$.`],
    ],
    walk: {
      'c6-2-1': [r`Antiderivative: $3x^2 \to x^3$ and $1 \to x$, so $F(x) = x^3 + x$.`, r`$F(2) = 8 + 2 = 10$; $F(0) = 0$.`, r`$\int_0^2 = 10 - 0 = 10$.`],
      'c6-2-2': [r`$\sqrt{x} = x^{1/2}$. Reverse power rule: raise the power by 1 and divide by the new power: $\frac{x^{3/2}}{3/2} = \frac{2}{3}x^{3/2}$.`, r`$F(4) = \frac{2}{3}(4)^{3/2} = \frac{2}{3}(8) = \frac{16}{3}$; $F(1) = \frac{2}{3}$.`, r`$\frac{16}{3} - \frac{2}{3} = \frac{14}{3} \approx 4.667$.`],
      'c6-2-3': [r`An antiderivative of $\sin x$ is $-\cos x$ (because $(-\cos x)' = \sin x$).`, r`$F(\pi) = -\cos\pi = 1$; $F(0) = -\cos 0 = -1$.`, r`$1 - (-1) = 2$. One arch of the sine curve has area exactly 2.`],
      'c6-2-4': [r`Integrals over touching intervals add: $\int_0^5 = \int_0^2 + \int_2^5$.`, r`$8 = 3 + \int_2^5 f$.`, r`$\int_2^5 f = 5$.`],
      'c6-2-5': [r`The graph of $\sqrt{9 - x^2}$ from $-3$ to 3 is the upper half of a circle of radius 3.`, r`Full circle area: $\pi(3)^2 = 9\pi$. Half: $\frac{9\pi}{2}$.`, r`$\frac{9\pi}{2} \approx 14.137$.`],
      'c6-2-6': [r`Antiderivative: $\frac{1}{x} \to \ln x$ and $2x \to x^2$, so $F(x) = \ln x + x^2$.`, r`$F(e) = 1 + e^2$; $F(1) = 0 + 1 = 1$.`, r`$(1 + e^2) - 1 = e^2 \approx 7.389$.`],
    },
    teach: {
      plan: [r`Show Riemann sums with more and more rectangles converging to one number.`, r`Introduce the integral notation and read each part aloud.`, r`Tell the odometer story to motivate $F(b) - F(a)$.`, r`Compute $\int_0^2 (3x^2 + 1)\,dx$ together and compare with the Riemann sums from last lesson.`, r`Show a geometry shortcut (semicircle) and an integral property (splitting intervals).`],
      questions: [
        { q: 'What if the area is below the x-axis?', a: 'The integral counts it as negative. To get the actual (positive) area, split the integral where f crosses the axis and use absolute values.' },
        { q: 'Why can I ignore the +C in a definite integral?', a: r`Because it cancels: $(F(b) + C) - (F(a) + C) = F(b) - F(a)$.` },
        { q: 'Is the integral always an area?', a: 'It is a signed area. In context, it is the total change: distance from velocity, water from flow rate, and so on.' },
      ],
      keyPoints: ['The definite integral is the limit of Riemann sums: signed area.', 'FTC: ∫ₐᵇ f(x) dx = F(b) − F(a) where F′ = f.', 'Integrals over adjacent intervals add.', 'Use geometry when the graph is made of simple shapes.'],
    },
  },
  'c6-3': {
    bigIdea: [
      r`Now let the upper limit of the integral move: $g(x) = \int_a^x f(t)\,dt$. As $x$ slides to the right, $g(x)$ measures the area collected so far. It is an accumulation function, like a running total.`,
      r`How fast does the running total grow? When you move $x$ a tiny bit, you add a thin sliver of area whose height is $f(x)$. So the rate of growth of $g$ is exactly $f(x)$: $g'(x) = f(x)$. This is FTC part 1, and it says integration and differentiation undo each other.`,
      r`A related idea, the net change theorem: the value at the end equals the value at the start plus the accumulated change: $f(b) = f(a) + \int_a^b f'(x)\,dx$. AP problems use this constantly: “The tank has 50 L at noon; water flows in at this rate; how much at 12:05?”.`,
    ],
    picture: { title: 'A paint roller', t: r`Roll paint along a wall from left to right. The painted area grows as you go, and how fast it grows depends on how tall the roller is at that moment. The growth rate of the painted area is the roller’s height: $g'(x) = f(x)$.` },
    words: [
      { term: 'Accumulation function', means: r`$g(x) = \int_a^x f(t)\,dt$: the area collected from $a$ up to $x$.` },
      { term: 'FTC part 1', means: r`$\frac{d}{dx}\int_a^x f(t)\,dt = f(x)$.` },
      { term: 'Dummy variable', means: r`The $t$ inside the integral; it is just a placeholder while $x$ is the real input.` },
      { term: 'Net change theorem', means: r`$f(b) = f(a) + \int_a^b f'(x)\,dx$.` },
    ],
    tools: [
      { name: 'FTC (evaluation)', refresher: r`$\int_a^b f = F(b) - F(a)$.`, lesson: 'c6-2' },
      { name: 'Chain rule', refresher: r`If the upper limit is $u(x)$, multiply by $u'(x)$.`, lesson: 'c3-1' },
      { name: 'Log rules', refresher: r`$\ln(3x) - \ln x = \ln 3$.`, lesson: 'c0-7' },
    ],
    why: [
      [r`The upper limit is $x$ and the lower limit is a constant, so FTC part 1 applies directly: the derivative is the integrand with $t$ replaced by $x$.`, r`Plug in 2.`],
      [r`We know where we start ($f(2) = 5$) and the rate of change; the total change from 2 to 4 is the integral of the rate.`, r`Evaluate the integral with $x^3$ as antiderivative and add the starting value.`],
    ],
    walk: {
      'c6-3-1': [r`FTC part 1: the derivative of $\int_1^x (t^3 + 1)\,dt$ is the integrand evaluated at $x$.`, r`$g'(x) = x^3 + 1$.`, r`$g'(2) = 8 + 1 = 9$.`],
      'c6-3-2': [r`The upper limit is $x^2$, not $x$, so FTC plus the chain rule: $\cos(\text{upper}) \times (\text{upper})'$.`, r`$\frac{d}{dx}\int_0^{x^2}\cos t\,dt = \cos(x^2) \cdot 2x$.`, r`At $x = 1$: $\cos 1 \cdot 2 \approx 0.5403 \times 2 = 1.081$.`],
      'c6-3-3': [r`Net change: $f(4) = f(2) + \int_2^4 f'(x)\,dx$.`, r`$\int_2^4 3x^2\,dx = [x^3]_2^4 = 64 - 8 = 56$.`, r`$f(4) = 5 + 56 = 61$.`],
      'c6-3-4': [r`FTC part 1: $g'(x) = e^{x^2}$. (We could never find an antiderivative of $e^{t^2}$ by hand, but we don’t need one!)`, r`$g'(1) = e^{1}$.`, r`$\approx 2.718$.`],
      'c6-3-5': [r`Amount at 5 = amount at 0 + water added from 0 to 5.`, r`Water added: $\int_0^5 (20 + 4t)\,dt = [20t + 2t^2]_0^5 = 100 + 50 = 150$ L.`, r`$50 + 150 = 200$ liters.`],
      'c6-3-6': [r`Evaluate the integral directly: $\int_x^{3x}\frac{1}{t}\,dt = \ln(3x) - \ln x$.`, r`Log rule: $\ln(3x) - \ln x = \ln\frac{3x}{x} = \ln 3$, a constant.`, r`The derivative of a constant is 0. (Check with FTC: upper gives $\frac{1}{3x} \cdot 3$, lower gives $-\frac{1}{x}$; they cancel.)`],
    },
    teach: {
      plan: [r`Draw $f$ and shade the area from $a$ to $x$; slide $x$ and watch the shaded area grow.`, r`Use the paint-roller story to explain $g'(x) = f(x)$.`, r`Do a basic FTC 1 problem and one with $x^2$ as the upper limit.`, r`Teach the net change theorem with the water tank.`, r`Point out that FTC 1 lets us differentiate integrals we can’t compute, like $\int e^{t^2}dt$.`],
      questions: [
        { q: r`Why use $t$ inside instead of $x$?`, a: r`Because $x$ is already the upper limit. $t$ is a placeholder that runs from $a$ to $x$.` },
        { q: 'What does the lower limit do?', a: r`It sets where the accumulation starts (and makes $g(a) = 0$). It doesn’t affect $g'$ when it is a constant.` },
        { q: 'How are FTC part 1 and part 2 related?', a: 'Part 1 says differentiating an accumulation gives back the rate. Part 2 says you can compute accumulations with antiderivatives. Same idea from two sides.' },
      ],
      keyPoints: ['g(x) = ∫ₐˣ f(t) dt accumulates area.', 'g′(x) = f(x) (FTC part 1).', 'Variable upper limit u(x): multiply by u′(x).', 'End value = start value + ∫ rate.'],
    },
  },
  'c6-4': {
    bigIdea: [
      r`To use the FTC you need antiderivatives, so we build a table by reading every derivative rule backwards. Since $(x^3)' = 3x^2$, the antiderivative of $x^2$ is $\frac{x^3}{3}$. Since $(\sin x)' = \cos x$, the antiderivative of $\cos x$ is $\sin x$. And so on.`,
      r`Every antiderivative comes with a “$+C$”. Why? Because $x^3$, $x^3 + 5$ and $x^3 - 100$ all have the same derivative. Adding a constant shifts the graph up or down without changing any slopes. So an indefinite integral $\int f(x)\,dx$ is a whole family of functions.`,
      r`To pick ONE member of the family, you need one extra fact, like $f(1) = 3$: an initial condition. Plug it in and solve for $C$. Also, rewrite before integrating: roots as powers, fractions split up, products multiplied out.`,
    ],
    picture: { title: 'Footprints in the snow', t: r`From someone’s footprints (their speed and direction at each step), you can retrace their exact path, but not where they started. Tell me one spot they passed through and I can place the whole path. That spot is the initial condition; the unknown starting place is $C$.` },
    words: [
      { term: 'Indefinite integral', means: r`$\int f(x)\,dx$: the family of all antiderivatives, $F(x) + C$.` },
      { term: r`$+C$`, means: 'The constant of integration: any constant, since constants have derivative 0.' },
      { term: 'Initial condition', means: r`A known value like $f(1) = 3$ that pins down $C$.` },
      { term: 'Reverse power rule', means: r`$\int x^n\,dx = \frac{x^{n+1}}{n + 1} + C$ for $n \ne -1$.` },
    ],
    tools: [
      { name: 'All derivative rules', refresher: r`$\sin \to \cos$, $\tan \to \sec^2$, $\ln x \to \frac{1}{x}$, $\arctan x \to \frac{1}{1 + x^2}$.`, lesson: 'c3-4' },
      { name: 'Exponent rewriting', refresher: r`$\frac{x^2 - 1}{\sqrt{x}} = x^{3/2} - x^{-1/2}$.`, lesson: 'c0-5' },
      { name: 'FTC', refresher: r`$\int_a^b f = F(b) - F(a)$.`, lesson: 'c6-2' },
    ],
    why: [
      [r`Reverse the power rule on each term: $6x^2 \to 2x^3$ and $-4 \to -4x$. Do not forget $+C$.`, r`The initial condition says the graph passes through $(1, 3)$, so plug in and solve for $C$.`, r`Write the one specific function.`],
      [r`$\frac{3}{x} \to 3\ln|x|$ (absolute value since $\ln$ needs positive inputs) and $e^x \to e^x$; add $+C$.`],
    ],
    walk: {
      'c6-4-1': [r`Antiderivative: $f(x) = 2x^3 - 4x + C$.`, r`Use $f(1) = 3$: $2 - 4 + C = 3$, so $C = 5$.`, r`$f(2) = 16 - 8 + 5 = 13$.`],
      'c6-4-2': [r`Antiderivative of $\frac{1}{x}$ is $\ln x$ (for $x > 0$).`, r`$\ln 2 - \ln 1 = \ln 2 - 0$.`, r`$\approx 0.693$.`],
      'c6-4-3': [r`$(\tan x)' = \sec^2 x$, so an antiderivative of $\sec^2 x$ is $\tan x$.`, r`$\tan\frac{\pi}{4} - \tan 0 = 1 - 0$.`, r`$= 1$.`],
      'c6-4-4': [r`$(\arctan x)' = \frac{1}{1 + x^2}$, so the antiderivative is $\arctan x$.`, r`$\arctan 1 - \arctan 0 = \frac{\pi}{4} - 0$.`, r`$\approx 0.785$.`],
      'c6-4-5': [r`Position = start + integral of velocity: $s(2) = s(0) + \int_0^2 v(t)\,dt$.`, r`$\int_0^2 (3t^2 - 2t)\,dt = [t^3 - t^2]_0^2 = 8 - 4 = 4$.`, r`$s(2) = 4 + 4 = 8$.`],
      'c6-4-6': [r`Rewrite: $\frac{x^2 - 1}{\sqrt{x}} = \frac{x^2}{x^{1/2}} - \frac{1}{x^{1/2}} = x^{3/2} - x^{-1/2}$.`, r`Antiderivative: $\frac{x^{5/2}}{5/2} - \frac{x^{1/2}}{1/2} = \frac{2}{5}x^{5/2} - 2x^{1/2}$.`, r`At 4: $\frac{2}{5}(32) - 2(2) = 12.8 - 4 = 8.8$. At 1: $\frac{2}{5} - 2 = -1.6$.`, r`$8.8 - (-1.6) = 10.4$.`],
    },
    teach: {
      plan: [r`Ask: what function has derivative $2x$? Then: is that the only one? Introduce $+C$.`, r`Build the antiderivative table together by reversing the derivative table.`, r`Teach the reverse power rule and check by differentiating.`, r`Solve an initial-value problem.`, r`Rewrite a messy fraction before integrating.`],
      questions: [
        { q: 'Why +C?', a: 'Because any constant disappears when you differentiate. So when going backwards, we can’t know which constant was there.' },
        { q: r`Why doesn’t the power rule work for $\frac{1}{x}$?`, a: r`With $n = -1$ you would divide by $n + 1 = 0$. Instead, $\int \frac{1}{x}dx = \ln|x| + C$.` },
        { q: 'How do I check my antiderivative?', a: 'Differentiate it. If you get the original function back, you are right.' },
      ],
      keyPoints: ['Antiderivatives reverse derivative rules.', '∫xⁿ dx = xⁿ⁺¹/(n + 1) + C, n ≠ −1; ∫1/x dx = ln|x| + C.', 'Always add +C to indefinite integrals.', 'Use an initial condition to find C.'],
    },
  },
};
