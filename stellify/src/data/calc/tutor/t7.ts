import type { LessonTutor } from '../types';

const r = String.raw;

/** Tutor layer · Unit 7: differential equations. */
export const TUTOR7: Record<string, LessonTutor> = {
  'c7-1': {
    bigIdea: [
      r`Most equations you have solved have a number as the answer: $x = 5$. A differential equation (DE) is different: its answer is a whole function. It describes how something changes, like “the population grows at a rate proportional to its size”, and asks: what function behaves like that?`,
      r`For example, $\frac{dy}{dx} = 2y$ says: the slope at any point is twice the height there. The function $y = 5e^{2x}$ works, because its derivative $10e^{2x}$ is exactly twice itself. Checking a proposed solution is just differentiating and substituting.`,
      r`Even without solving, you can picture the solutions. At every point $(x, y)$ on a grid, the DE tells you the slope there, so draw a tiny line segment with that slope. The result is a slope field: a map of little arrows. Solution curves flow along the segments like boats following a current.`,
    ],
    picture: { title: 'Wind on a weather map', t: r`A weather map shows little arrows for wind direction at every city. Drop a balloon anywhere and it drifts along the arrows. A slope field is the same: each segment is the “wind direction” for $y$, and a solution curve is the path of a balloon released from one starting point.` },
    words: [
      { term: 'Differential equation', means: r`An equation involving a function and its derivatives, like $\frac{dy}{dx} = x + y$.` },
      { term: 'Solution', means: 'A function that makes the differential equation true.' },
      { term: 'General solution', means: r`The whole family of solutions, with a constant $C$.` },
      { term: 'Particular solution', means: r`The one solution passing through a given point (initial condition).` },
      { term: 'Slope field', means: 'Short segments showing the slope dy/dx at many points of the plane.' },
    ],
    tools: [
      { name: 'Derivatives of exponentials', refresher: r`$(Ce^{kx})' = kCe^{kx}$.`, lesson: 'c3-1' },
      { name: 'Slope as steepness', refresher: 'Positive slopes tilt up to the right, negative tilt down, zero is flat.', lesson: 'c0-4' },
      { name: 'Factoring quadratics', refresher: r`$k^2 - 2k - 3 = (k - 3)(k + 1)$.`, lesson: 'c0-5' },
    ],
    why: [
      [r`To test a solution, compute its derivative first: chain rule gives $5 \cdot 2e^{2x}$.`, r`Then compute the right side of the DE with the same function. Equal for every $x$ means it is a solution.`],
      [r`A slope field’s segment at a point uses that point’s $x$ and $y$ in the DE; that is all.`],
    ],
    walk: {
      'c7-1-1': [r`The DE gives the slope at any point: $\frac{dy}{dx} = x^2 + y$.`, r`At $(1, 2)$: $x = 1$, $y = 2$.`, r`Slope $= 1^2 + 2 = 3$. The little segment there tilts up steeply.`],
      'c7-1-2': [r`Test each choice: differentiate and compare with $2y$.`, r`A: $y = 5e^{2x}$, $y' = 10e^{2x}$, and $2y = 10e^{2x}$. Match ✓.`, r`B: $y' = e^x$ but $2y = 2e^x + 4$. ✗. C: $y' = 4x$ but $2y = 4x^2$. ✗. D: $y' = e^{2x} + 2xe^{2x}$, not $2xe^{2x}$. ✗. Answer: A.`],
      'c7-1-3': [r`Slope $= x - 2y$ at $(2, 2)$.`, r`$2 - 2(2) = 2 - 4$.`, r`$= -2$: the segment tilts down.`],
      'c7-1-4': [r`Horizontal segments mean slope 0.`, r`$x - y = 0$ means $y = x$.`, r`So every point on the line $y = x$ has a flat segment: choice B.`],
      'c7-1-5': [r`The initial condition says that at $x = 0$, $y = 4$.`, r`Plug in: $4 = Ce^{3 \cdot 0} = C \cdot 1$.`, r`$C = 4$, so the particular solution is $y = 4e^{3x}$.`],
      'c7-1-6': [r`Try $y = e^{kx}$: then $y' = ke^{kx}$ and $y'' = k^2e^{kx}$.`, r`Substitute: $k^2e^{kx} - 2ke^{kx} - 3e^{kx} = e^{kx}(k^2 - 2k - 3) = 0$.`, r`$e^{kx}$ is never 0, so $k^2 - 2k - 3 = (k - 3)(k + 1) = 0$.`, r`The positive value is $k = 3$.`],
    },
    teach: {
      plan: [r`Contrast an ordinary equation (answer: a number) with a differential equation (answer: a function).`, r`Verify that $y = 5e^{2x}$ solves $y' = 2y$ together.`, r`Draw a small slope field for $\frac{dy}{dx} = x - y$ on a 5×5 grid, computing slopes at each point.`, r`Sketch a solution curve through one point by following the segments.`, r`Discuss general vs particular solutions and the role of $C$.`],
      questions: [
        { q: 'How can an equation have a function as its answer?', a: 'Because it describes behavior (how y changes), and many quantities could behave that way. We look for the function whose derivative fits the description.' },
        { q: 'Why are there infinitely many solutions?', a: r`Different starting points give different curves in the slope field. The constant $C$ picks which one; an initial condition fixes $C$.` },
        { q: 'How do I match a slope field to its equation?', a: 'Check easy points: where the slopes are 0, whether slopes depend only on x (columns match) or only on y (rows match), and the sign of the slope in each region.' },
      ],
      keyPoints: ['A DE relates a function to its derivatives; its solutions are functions.', 'Verify by differentiating and substituting.', 'A slope field shows dy/dx at each point; solutions follow it.', 'An initial condition picks the particular solution.'],
    },
  },
  'c7-2': {
    bigIdea: [
      r`Some DEs can be solved exactly with a neat trick: separation of variables. If the equation can be written as (stuff with $y$) times $dy$ = (stuff with $x$) times $dx$, then each side can be integrated on its own.`,
      r`For $\frac{dy}{dx} = \frac{x}{y}$: multiply both sides by $y\,dx$ to get $y\,dy = x\,dx$. Now integrate: $\frac{y^2}{2} = \frac{x^2}{2} + C$. One equation, every $y$ on the left, every $x$ on the right, and we have found the family of solutions.`,
      r`Then use the initial condition to find $C$, and solve for $y$. It is like sorting laundry: put all the $y$-socks in one basket and all the $x$-socks in the other, then deal with each basket separately.`,
    ],
    picture: { title: 'Sorting laundry', t: r`Before you can fold, you sort: shirts here, socks there. Separation of variables sorts the equation: all $y$’s (with $dy$) on one side, all $x$’s (with $dx$) on the other. Once sorted, each side is easy to handle (integrate).` },
    words: [
      { term: 'Separable equation', means: r`A DE that can be written as $\frac{dy}{dx} = g(x)h(y)$.` },
      { term: 'Separation of variables', means: r`Rewriting as $\frac{1}{h(y)}dy = g(x)\,dx$ and integrating both sides.` },
      { term: 'Initial condition', means: r`A known point like $y(0) = 3$, used to find $C$.` },
      { term: 'Domain of a solution', means: 'The interval around the initial point where the particular solution is defined.' },
    ],
    tools: [
      { name: 'Antiderivatives', refresher: r`$\int y\,dy = \frac{y^2}{2}$, $\int y^{-2}dy = -\frac{1}{y}$, $\int\frac{dy}{1 + y} = \ln|1 + y|$.`, lesson: 'c6-4' },
      { name: 'Exponentials and logs', refresher: r`$\ln|y| = x + C$ means $y = Ae^x$.`, lesson: 'c0-7' },
      { name: 'Vertical asymptotes', refresher: r`$\frac{1}{2 - x}$ blows up at $x = 2$.`, lesson: 'c1-6' },
    ],
    why: [
      [r`Multiply both sides by $y\,dx$ to separate; then integrate each side, putting one $+C$ on the $x$ side.`, r`Plug in the initial condition right away, while the equation is simple, to find $C$.`, r`Solve for $y$; the initial value $y = 3 > 0$ tells us to take the positive square root.`],
      [r`Divide by $y^2$ and multiply by $dx$ to separate. $\int y^{-2}dy = -y^{-1}$.`, r`Plug in $x = 0$, $y = 1$: $-1 = 0 + C$.`, r`Solve for $y$: flip both sides of $-\frac{1}{y} = \frac{x^2}{2} - 1$ and simplify.`],
    ],
    walk: {
      'c7-2-1': [r`Separate: $\frac{dy}{y} = dx$. Integrate: $\ln|y| = x + C$.`, r`Exponentiate: $y = Ae^x$. Initial condition $y(0) = 3$ gives $A = 3$.`, r`$y(1) = 3e \approx 8.155$.`],
      'c7-2-2': [r`From the example: $y = \sqrt{x^2 + 9}$.`, r`At $x = 2$: $\sqrt{4 + 9} = \sqrt{13}$.`, r`$\approx 3.606$.`],
      'c7-2-3': [r`Separate: $y^{-2}dy = x\,dx$. Integrate: $-\frac{1}{y} = \frac{x^2}{2} + C$.`, r`$y(0) = 1$: $-1 = C$.`, r`At $x = 1$: $-\frac{1}{y} = \frac{1}{2} - 1 = -\frac{1}{2}$, so $y = 2$.`],
      'c7-2-4': [r`Separate: $\frac{dy}{1 + y} = dx$. Integrate: $\ln|1 + y| = x + C$.`, r`$y(0) = 0$: $\ln 1 = 0 = C$.`, r`So $1 + y = e^x$ and $y = e^x - 1$.`, r`$y(1) = e - 1 \approx 1.718$.`],
      'c7-2-5': [r`Separate: $\frac{dy}{y} = -\frac{1}{2}dt$. Integrate: $\ln|y| = -\frac{t}{2} + C$.`, r`So $y = Ae^{-t/2}$; $y(0) = 10$ gives $A = 10$.`, r`$y(2) = 10e^{-1} \approx 3.679$.`],
      'c7-2-6': [r`Separate: $y^{-2}dy = dx$. Integrate: $-\frac{1}{y} = x + C$.`, r`$y(0) = \frac{1}{2}$: $-2 = C$.`, r`$-\frac{1}{y} = x - 2$, so $y = \frac{1}{2 - x}$.`, r`The denominator is 0 at $x = 2$: vertical asymptote, $a = 2$.`],
    },
    teach: {
      plan: [r`Show $\frac{dy}{dx} = \frac{x}{y}$ and sort it: $y\,dy = x\,dx$.`, r`Integrate both sides, with one $+C$.`, r`Plug in the initial condition immediately.`, r`Solve for $y$ and choose the sign that matches the initial point.`, r`Do $\frac{dy}{dx} = y^2$ and show the solution can blow up.`],
      questions: [
        { q: 'Why only one +C?', a: 'Two constants (one per side) would combine into one anyway: C₂ − C₁ is just another constant.' },
        { q: 'When can I separate?', a: r`When the right side is a product of an $x$-part and a $y$-part. $\frac{dy}{dx} = x + y$ can’t be separated.` },
        { q: 'Why find C before solving for y?', a: 'It keeps the algebra simple and avoids mistakes with absolute values and exponentials.' },
      ],
      keyPoints: ['Separate: all y with dy, all x with dx.', 'Integrate both sides; one +C.', 'Use the initial condition right away to find C.', 'Solve for y and check its domain.'],
    },
  },
  'c7-3': {
    bigIdea: [
      r`Many things change at a rate proportional to how much there is. More bacteria make more babies; more money earns more interest; more radioactive atoms produce more decays. That is $\frac{dy}{dt} = ky$.`,
      r`Separating variables gives the solution once and for all: $y = y_0e^{kt}$, where $y_0$ is the starting amount. If $k > 0$ it is growth; if $k < 0$ it is decay. Every growth and decay problem is this one formula with different numbers.`,
      r`Newton’s law of cooling is a twist: a hot drink cools at a rate proportional to the DIFFERENCE between its temperature and the room’s. So the difference (not the temperature itself) decays exponentially toward 0, and the drink approaches room temperature.`,
    ],
    picture: { title: 'A snowball rolling downhill', t: r`A snowball picks up snow in proportion to its size: the bigger it is, the faster it grows. That feedback loop is exponential growth. Melting ice cubes do the opposite: less ice, slower melting, the signature of exponential decay.` },
    words: [
      { term: 'Exponential growth/decay', means: r`$y = y_0e^{kt}$, growth if $k > 0$, decay if $k < 0$.` },
      { term: r`Growth constant $k$`, means: r`The proportionality constant in $\frac{dy}{dt} = ky$.` },
      { term: 'Doubling time / half-life', means: 'The time for the amount to double / halve.' },
      { term: 'Newton’s law of cooling', means: r`$\frac{dT}{dt} = -k(T - A)$, $A$ = surrounding temperature.` },
      { term: 'Continuous compounding', means: r`Interest added every instant: $A = Pe^{rt}$.` },
    ],
    tools: [
      { name: 'Separation of variables', refresher: r`$\frac{dy}{y} = k\,dt$ gives $y = y_0e^{kt}$.`, lesson: 'c7-2' },
      { name: 'Exponents and logs', refresher: r`$e^{4k} = 4$ means $k = \frac{\ln 4}{4}$.`, lesson: 'c0-7' },
    ],
    why: [
      [r`Doubling every 3 hours means the number of doubling periods is $\frac{12}{3} = 4$.`, r`Each doubling multiplies by 2, so four doublings multiply by $2^4 = 16$.`],
      [r`Newton’s law says the gap from room temperature decays exponentially. The gap went from 80 to 40 in 10 minutes: it halves every 10 minutes.`, r`One more halving: gap 20, so the coffee is $20 + 20 = 40$ degrees.`],
    ],
    walk: {
      'c7-3-1': [r`Doubling time 3 hours; 12 hours contains $\frac{12}{3} = 4$ doublings.`, r`$100 \to 200 \to 400 \to 800 \to 1600$.`, r`$1600$ bacteria. (Same as $100e^{kt}$ with $k = \frac{\ln 2}{3}$.)`],
      'c7-3-2': [r`Half-life 5 years; 10 years is 2 half-lives.`, r`$40 \to 20 \to 10$.`, r`$10$ grams remain.`],
      'c7-3-3': [r`Continuous compounding: $A = Pe^{rt}$ with $P = 500$, $r = 0.03$, $t = 10$.`, r`$rt = 0.3$, $e^{0.3} \approx 1.349859$.`, r`$500 \times 1.349859 \approx 674.93$ dollars.`],
      'c7-3-4': [r`Gap from the room: starts at $100 - 20 = 80$; after 10 min it is $60 - 20 = 40$. It halves every 10 minutes.`, r`After 20 minutes the gap is 20.`, r`Temperature: $20 + 20 = 40$°F.`],
      'c7-3-5': [r`Quadrupling in 4 years: $P_0e^{4k} = 4P_0$, so $e^{4k} = 4$.`, r`Take ln: $4k = \ln 4$.`, r`$k = \frac{\ln 4}{4} \approx \frac{1.386}{4} \approx 0.347$.`],
      'c7-3-6': [r`Tripling: $e^{0.02t} = 3$.`, r`Take ln: $0.02t = \ln 3 \approx 1.0986$.`, r`$t = \frac{1.0986}{0.02} \approx 54.93$ years.`],
    },
    teach: {
      plan: [r`Give real examples of “rate proportional to amount”.`, r`Solve $\frac{dy}{dt} = ky$ by separation to get $y_0e^{kt}$.`, r`Show the doubling/half-life shortcut with powers of 2.`, r`Explain Newton’s cooling: the gap decays.`, r`Solve for time with logarithms.`],
      questions: [
        { q: 'How do I know a problem is exponential?', a: r`Look for phrases like “proportional to the amount”, “doubles every”, “half-life”, or “compounded continuously”.` },
        { q: 'Why does the coffee never reach room temperature exactly?', a: 'The gap keeps halving but never hits zero, just like 80, 40, 20, 10, 5, … never reaches 0.' },
        { q: 'How do I find k from a doubling time T?', a: r`Solve $e^{kT} = 2$: $k = \frac{\ln 2}{T}$.` },
      ],
      keyPoints: ['dy/dt = ky ⇒ y = y₀e^(kt).', 'k > 0 growth, k < 0 decay.', 'Cooling: the difference from room temperature decays exponentially.', 'Solve for time or k with logarithms.'],
    },
  },
  'c7-4': {
    bigIdea: [
      r`Many differential equations cannot be solved with formulas. Euler’s method approximates the solution by walking through the slope field in small straight steps.`,
      r`Start at the known point. The DE tells you the slope there. Walk a short horizontal distance $\Delta x$ along that slope (rise = slope × run). At your new point, ask the DE for the new slope, and walk again. Repeat until you reach the $x$ you want.`,
      r`It is exactly tangent-line approximation, done over and over. Small steps give better accuracy. If the true solution bends upward (concave up), the straight steps fall below it, so Euler underestimates; if it bends downward, Euler overestimates.`,
    ],
    picture: { title: 'Walking in fog with a compass', t: r`In thick fog you can only see the compass in your hand. You read the direction, walk 10 steps, read the compass again, walk 10 more. You trace roughly the right path, but each straight stretch drifts a little from the true curved trail.` },
    words: [
      { term: 'Euler’s method', means: r`Approximate solution: $y_{new} = y_{old} + \Delta x \cdot \frac{dy}{dx}\big|_{old}$.` },
      { term: r`Step size $\Delta x$ (or $h$)`, means: 'The horizontal distance of each step.' },
      { term: 'Underestimate / overestimate', means: 'Below / above the true value.' },
    ],
    tools: [
      { name: 'Linear approximation', refresher: r`$f(x + \Delta x) \approx f(x) + f'(x)\Delta x$.`, lesson: 'c4-3' },
      { name: 'Slope fields', refresher: 'The DE gives the slope at any point.', lesson: 'c7-1' },
      { name: 'Concavity', refresher: 'Concave up curves lie above their tangent lines.', lesson: 'c5-4' },
    ],
    why: [
      [r`The DE gives the slope at the starting point: $0 + 1 = 1$. Rise = slope × run $= 1 \times 0.1$.`, r`Now we are at a new point $(0.1, 1.1)$, so we ask the DE for a NEW slope there, and step again.`],
      [r`Slope at $(1, 2)$ is $xy = 2$; rise $= 2 \times 0.5 = 1$.`, r`New point $(1.5, 3)$, new slope $1.5 \times 3 = 4.5$; rise $= 4.5 \times 0.5 = 2.25$.`],
    ],
    walk: {
      'c7-4-1': [r`Start at $(0, 1)$. Slope there: $x + y = 0 + 1 = 1$.`, r`Step: $\Delta y = 1 \times 0.1 = 0.1$.`, r`$y(0.1) \approx 1 + 0.1 = 1.1$.`],
      'c7-4-2': [r`After step 1 we are at $(0.1, 1.1)$.`, r`Slope there: $0.1 + 1.1 = 1.2$; $\Delta y = 1.2 \times 0.1 = 0.12$.`, r`$y(0.2) \approx 1.1 + 0.12 = 1.22$.`],
      'c7-4-3': [r`Step 1 from $(0, 3)$: slope $y - x = 3$; $\Delta y = 3 \times 0.5 = 1.5$; new point $(0.5, 4.5)$.`, r`Step 2: slope $4.5 - 0.5 = 4$; $\Delta y = 4 \times 0.5 = 2$.`, r`$y(1) \approx 4.5 + 2 = 6.5$.`],
      'c7-4-4': [r`Step 1 from $(1, 2)$: slope $x^2 = 1$; $\Delta y = 0.5$; new point $(1.5, 2.5)$.`, r`Step 2: slope $1.5^2 = 2.25$; $\Delta y = 2.25 \times 0.5 = 1.125$.`, r`$y(2) \approx 2.5 + 1.125 = 3.625$.`],
      'c7-4-5': [r`Each Euler step follows a tangent-line direction.`, r`On a concave-up curve, tangent lines lie below the curve.`, r`So the steps fall below the true solution: an underestimate. Choice A.`],
      'c7-4-6': [r`Step 1 from $(1, 2)$: slope $1 \cdot 2 = 2$; $\Delta y = 1$; new point $(1.5, 3)$.`, r`Step 2: slope $1.5 \cdot 3 = 4.5$; $\Delta y = 2.25$.`, r`$y(2) \approx 3 + 2.25 = 5.25$.`],
    },
    teach: {
      plan: [r`Tell the fog-and-compass story.`, r`Draw a slope field and walk two straight steps from a starting point.`, r`Set up the table: $x$, $y$, slope, $\Delta y$, new $y$.`, r`Do the $\frac{dy}{dx} = x + y$ example together.`, r`Discuss over/underestimates using concavity.`],
      questions: [
        { q: 'Which point’s slope do I use for each step?', a: 'The slope at the start of the step, using the estimated point you are currently at.' },
        { q: 'How do I get a better estimate?', a: 'Use smaller steps (more of them). The errors shrink.' },
        { q: 'How many steps do I need?', a: r`Distance divided by step size: from $x = 1$ to $x = 2$ with $\Delta x = 0.5$ is 2 steps.` },
      ],
      keyPoints: ['New y = old y + Δx × slope at the old point.', 'Recompute the slope at every new point.', 'Keep a table: x, y, slope, Δy.', 'Concave up → underestimate; concave down → overestimate.'],
    },
  },
  'c7-5': {
    bigIdea: [
      r`Exponential growth can’t go on forever: food, space and resources run out. Logistic growth starts out nearly exponential, then slows down and levels off at a maximum population the environment can support: the carrying capacity $L$.`,
      r`The equation $\frac{dP}{dt} = kP\left(1 - \frac{P}{L}\right)$ captures that. When $P$ is small, the bracket is about 1 and growth looks exponential. As $P$ approaches $L$, the bracket approaches 0 and growth stops. Above $L$, the bracket is negative and the population shrinks back down.`,
      r`The graph is an S-shaped curve. The fastest growth happens exactly halfway, at $P = \frac{L}{2}$, where the S bends from concave up to concave down. Most AP questions are just reading $L$ and $\frac{L}{2}$ off the equation.`,
    ],
    picture: { title: 'A rumor in a school', t: r`A rumor spreads slowly at first (few people know), then explosively (many tellers, many listeners), then slowly again (almost everyone already knows). The number who know follows an S-curve, leveling off at the school’s population: the carrying capacity.` },
    words: [
      { term: 'Logistic equation', means: r`$\frac{dP}{dt} = kP\left(1 - \frac{P}{L}\right)$.` },
      { term: r`Carrying capacity $L$`, means: 'The population the environment can sustain; the long-run limit.' },
      { term: 'S-curve (sigmoid)', means: 'The shape of a logistic solution: slow, fast, then leveling off.' },
      { term: 'Inflection point', means: r`Where growth is fastest, at $P = \frac{L}{2}$.` },
    ],
    tools: [
      { name: 'Exponential growth', refresher: r`For small $P$, logistic growth looks like $\frac{dP}{dt} \approx kP$.`, lesson: 'c7-3' },
      { name: 'Maximizing a quadratic', refresher: r`$P(L - P)$ is a downward parabola with its top at $P = \frac{L}{2}$.`, lesson: 'c5-6' },
      { name: 'Solving exponential equations', refresher: r`$9e^{-0.5t} = 1$ gives $t = 2\ln 9$.`, lesson: 'c0-7' },
    ],
    why: [
      [r`Read the carrying capacity from the bracket: the population heads there.`, r`Growth is fastest at half the carrying capacity, where the parabola $P(1 - P/L)$ peaks.`],
      [r`Carrying capacity is where growth stops: set $\frac{dP}{dt} = 0$ (besides $P = 0$).`, r`$200 - P = 0$ gives $L = 200$.`],
    ],
    walk: {
      'c7-5-1': [r`Match the form $kP\left(1 - \frac{P}{L}\right)$: here $L = 500$.`, r`Starting at 50 (below $L$), the population grows toward $L$.`, r`The limit is $500$.`],
      'c7-5-2': [r`The growth rate $0.2P\left(1 - \frac{P}{500}\right)$ is a downward parabola in $P$, zero at 0 and 500.`, r`A parabola peaks halfway between its zeros.`, r`$P = 250$.`],
      'c7-5-3': [r`Starting above the carrying capacity: at $P = 600$, the bracket $1 - \frac{600}{500} < 0$, so $\frac{dP}{dt} < 0$.`, r`The population shrinks, slowing down as it nears 500.`, r`The limit is still $500$.`],
      'c7-5-4': [r`Set $\frac{dP}{dt} = 0$: $0.01P(200 - P) = 0$.`, r`$P = 0$ or $P = 200$.`, r`The carrying capacity is $200$.`],
      'c7-5-5': [r`$L = 100$, so growth is fastest at $P = 50$.`, r`Plug in: $0.4(50)\left(1 - \frac{50}{100}\right) = 20 \times 0.5$.`, r`Maximum rate: $10$ per unit time.`],
      'c7-5-6': [r`Set $\frac{1000}{1 + 9e^{-0.5t}} = 500$, so $1 + 9e^{-0.5t} = 2$.`, r`$9e^{-0.5t} = 1$, so $e^{-0.5t} = \frac{1}{9}$.`, r`$-0.5t = \ln\frac{1}{9} = -\ln 9$, so $t = 2\ln 9 \approx 4.394$.`],
    },
    teach: {
      plan: [r`Compare exponential and logistic growth graphs.`, r`Explain each part of $kP\left(1 - \frac{P}{L}\right)$.`, r`Show what happens below and above $L$.`, r`Find the fastest-growth point at $\frac{L}{2}$.`, r`Practice reading $L$ from both forms.`],
      questions: [
        { q: 'What if the equation is kP(L − P)?', a: 'Same idea: L is still where the growth stops. Only the constant in front looks different.' },
        { q: 'Why is growth fastest at L/2?', a: 'The rate is a downward parabola in P, zero at 0 and L; it peaks in the middle.' },
        { q: 'Can the population pass L?', a: 'Not if it starts below L. If it starts above, it decreases toward L.' },
      ],
      keyPoints: ['dP/dt = kP(1 − P/L); L is the carrying capacity.', 'P → L for any positive starting value.', 'Fastest growth at P = L/2 (inflection point).', 'Below L it grows; above L it shrinks.'],
    },
  },
};
