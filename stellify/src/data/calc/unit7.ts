import type { CalcLesson, CalcProblem } from './types';
import { euler, near, ode } from './types';

const r = String.raw;
const P = (id: string, level: 1 | 2 | 3, q: string, answer: number | string[], hint: string, solution: string[], extra: Partial<CalcProblem> = {}): CalcProblem => ({ id, level, q, answer, hint, solution, ...extra });

/** Unit 7 · Differential Equations. Original lessons and problems. */
export const UNIT7: CalcLesson[] = [
  {
    id: 'c7-1', unit: 7, n: 1, title: 'Differential equations and slope fields',
    intro: 'A differential equation describes how something changes instead of what it is. “The rate of growth is proportional to the size” is a differential equation. Today you learn to read one, check whether a function solves it, and sketch its solutions with a slope field, without solving anything.',
    goals: ['Read and write a differential equation from a description', 'Verify a proposed solution by substitution', 'Compute slopes for a slope field', 'Match a slope field to its equation'],
    notes: [
      { k: 'p', t: r`A differential equation (DE) relates a function to its derivatives, like $\frac{dy}{dx} = x + y$. A solution is a function that makes the equation true for every $x$ in an interval.` },
      { k: 'rule', title: 'Verifying a solution', t: r`Differentiate the proposed $y$, substitute $y$, $y'$ (and $y''$) into the equation, and check that both sides agree for all $x$.` },
      { k: 'p', t: r`A slope field draws a short segment with slope $\frac{dy}{dx}$ at each grid point. Solution curves follow the segments like iron filings following a magnet.` },
      { k: 'list', items: [r`If $\frac{dy}{dx}$ depends only on $x$, segments in each vertical column are parallel.`, r`If it depends only on $y$, segments in each horizontal row are parallel.`, r`Horizontal segments occur where $\frac{dy}{dx} = 0$: find those curves first.`] },
      { k: 'tip', t: r`To match a slope field, test a few easy points: slopes along the axes, where slopes are zero, and where they are positive or negative.` },
      { k: 'warn', t: r`A general solution has a constant $C$; an initial condition such as $y(0) = 4$ picks one particular solution.` },
    ],
    examples: [
      { q: r`Is $y = 5e^{2x}$ a solution of $y' = 2y$?`, steps: [r`$y' = 10e^{2x}$.`, r`$2y = 10e^{2x}$. They match, so yes.`], a: 'yes' },
      { q: r`For $\frac{dy}{dx} = x^2 + y$, what is the slope-field segment's slope at $(1, 2)$?`, steps: [r`Plug in: $1^2 + 2 = 3$.`], a: '3' },
    ],
    practice: [
      P('c7-1-1', 1, r`For $\frac{dy}{dx} = x^2 + y$, find the slope of the slope-field segment at $(1, 2)$.`, ['3'], 'Substitute x and y.', [r`$1 + 2 = 3$.`], { check: () => 1 ** 2 + 2 === 3 }),
      P('c7-1-2', 1, r`Which function is a solution of $y' = 2y$?`, 0, 'Differentiate each and compare with 2y.', [r`$y = 5e^{2x}$: $y' = 10e^{2x} = 2y$. The others fail the check.`], { choices: [r`$y = 5e^{2x}$`, r`$y = e^x + 2$`, r`$y = 2x^2$`, r`$y = xe^{2x}$`] }),
      P('c7-1-3', 1, r`For $\frac{dy}{dx} = x - 2y$, find the slope at $(2, 2)$.`, ['-2'], 'Substitute.', [r`$2 - 4 = -2$.`], { check: () => 2 - 2 * 2 === -2 }),
      P('c7-1-4', 2, r`For $\frac{dy}{dx} = x - y$, where are the slope-field segments horizontal?`, 1, 'Set dy/dx = 0.', [r`$x - y = 0$ means $y = x$: along the line $y = x$.`], { choices: [r`along the $x$-axis`, r`along the line $y = x$`, r`along the $y$-axis`, r`nowhere`] }),
      P('c7-1-5', 1, r`$y = Ce^{3x}$ solves $y' = 3y$. If $y(0) = 4$, find $C$.`, ['4'], 'Plug in x = 0.', [r`$4 = Ce^0 = C$.`], { check: () => near(ode((_x, y) => 3 * y, 0, 4, 1), 4 * Math.exp(3)) }),
      P('c7-1-6', 3, r`For which positive $k$ does $y = e^{kx}$ satisfy $y'' - 2y' - 3y = 0$?`, ['3'], 'Substitute: e^(kx)(k² − 2k − 3) = 0.', [r`$k^2 - 2k - 3 = 0$, so $(k - 3)(k + 1) = 0$.`, r`The positive root is $k = 3$.`], { check: () => 9 - 6 - 3 === 0 && 1 + 2 - 3 === 0 }),
    ],
    remember: ['A solution makes the DE true: differentiate and substitute.', 'Slope field: evaluate dy/dx at each point.', 'Zero slopes first, then signs.'],
    checkIn: 'Slope fields are quick points on the multiple choice. Next: actually solving DEs by separating variables.',
  },
  {
    id: 'c7-2', unit: 7, n: 2, title: 'Separation of variables',
    intro: 'Many DEs can be solved exactly: get every y on one side with dy, every x on the other with dx, integrate both sides, and use the initial condition. This is a guaranteed free-response topic, and graders look for each step.',
    goals: ['Separate variables and integrate both sides', 'Use an initial condition to find C', 'Solve for y explicitly', 'Notice the domain of a particular solution'],
    notes: [
      { k: 'list', items: [r`1. Write $\frac{dy}{dx} = g(x)h(y)$ as $\frac{1}{h(y)}\,dy = g(x)\,dx$.`, r`2. Integrate both sides; put one $+C$ on the $x$ side.`, r`3. Plug in the initial condition to find $C$ right away.`, r`4. Solve for $y$.`] },
      { k: 'warn', t: r`Find $C$ before you exponentiate or simplify. And separation requires a product: $\frac{dy}{dx} = x + y$ cannot be separated.` },
      { k: 'formula', t: r`\frac{dy}{dx} = ky \implies y = y_0 e^{kx}` },
      { k: 'tip', t: r`With $\ln|y| = \ldots$, the initial condition tells you the sign of $y$, so you can drop the absolute value.` },
      { k: 'p', t: r`A particular solution lives on the largest interval containing the initial point where it is defined. A solution like $y = \frac{1}{2 - x}$ blows up at $x = 2$.` },
    ],
    examples: [
      { q: r`$\frac{dy}{dx} = \frac{x}{y}$, $y(0) = 3$. Find $y$.`, steps: [r`$y\,dy = x\,dx$, so $\frac{y^2}{2} = \frac{x^2}{2} + C$.`, r`$y(0) = 3$: $\frac{9}{2} = C$.`, r`$y^2 = x^2 + 9$, and $y > 0$, so $y = \sqrt{x^2 + 9}$.`], a: 'y = √(x² + 9)' },
      { q: r`$\frac{dy}{dx} = xy^2$, $y(0) = 1$. Find $y$.`, steps: [r`$y^{-2}\,dy = x\,dx$: $-\frac{1}{y} = \frac{x^2}{2} + C$.`, r`$y(0) = 1$: $C = -1$.`, r`$y = \frac{1}{1 - x^2/2} = \frac{2}{2 - x^2}$.`], a: 'y = 2/(2 − x²)' },
    ],
    practice: [
      P('c7-2-1', 1, r`$\frac{dy}{dx} = y$, $y(0) = 3$. Find $y(1)$ (three decimal places).`, ['8.155', '3e'], 'y = 3eˣ.', [r`$y = 3e^x$, $y(1) = 3e \approx 8.155$.`], { check: () => near(ode((_x, y) => y, 0, 3, 1), 3 * Math.E) && near(3 * Math.E, 8.155, 1e-4) }),
      P('c7-2-2', 2, r`$\frac{dy}{dx} = \frac{x}{y}$, $y(0) = 3$. Find $y(2)$ (three decimal places).`, ['3.606', 'sqrt(13)'], 'y² = x² + 9.', [r`$y = \sqrt{x^2 + 9}$, $y(2) = \sqrt{13} \approx 3.606$.`], { check: () => near(ode((x, y) => x / y, 0, 3, 2), Math.sqrt(13)) }),
      P('c7-2-3', 2, r`$\frac{dy}{dx} = xy^2$, $y(0) = 1$. Find $y(1)$.`, ['2'], 'y = 2/(2 − x²).', [r`$-\frac{1}{y} = \frac{x^2}{2} - 1$.`, r`At $x = 1$: $-\frac{1}{y} = -\frac{1}{2}$, so $y = 2$.`], { check: () => near(ode((x, y) => x * y * y, 0, 1, 1), 2) }),
      P('c7-2-4', 2, r`$\frac{dy}{dx} = 1 + y$, $y(0) = 0$. Find $y(1)$ (three decimal places).`, ['1.718', 'e-1'], 'Separate: dy/(1 + y) = dx.', [r`$\ln|1 + y| = x + C$, $C = 0$.`, r`$y = e^x - 1$, $y(1) = e - 1 \approx 1.718$.`], { check: () => near(ode((_x, y) => 1 + y, 0, 0, 1), Math.E - 1) }),
      P('c7-2-5', 1, r`$\frac{dy}{dt} = -\frac{1}{2}y$, $y(0) = 10$. Find $y(2)$ (three decimal places).`, ['3.679', '10/e'], 'y = 10e^(−t/2).', [r`$y(2) = 10e^{-1} \approx 3.679$.`], { check: () => near(ode((_t, y) => -0.5 * y, 0, 10, 2), 10 / Math.E) }),
      P('c7-2-6', 3, r`$\frac{dy}{dx} = y^2$, $y(0) = \frac{1}{2}$. The particular solution has a vertical asymptote at $x = a > 0$. Find $a$.`, ['2'], 'Solve, then find where the denominator is 0.', [r`$-\frac{1}{y} = x + C$; $y(0) = \frac{1}{2}$ gives $C = -2$.`, r`$y = \frac{1}{2 - x}$, which blows up at $x = 2$.`], { check: () => near(ode((_x, y) => y * y, 0, 0.5, 1.9), 10, 1e-3) }),
    ],
    remember: ['Separate, integrate, +C, plug in, solve for y.', 'Find C immediately.', 'dy/dx = ky gives y = y₀e^(kx).'],
    checkIn: 'Do one separable problem every day this week; FRQ points come from showing the separation step. Next: exponential models.',
  },
  {
    id: 'c7-3', unit: 7, n: 3, title: 'Exponential growth and decay models',
    intro: 'When a quantity changes at a rate proportional to itself, it grows or decays exponentially: populations, money, radioactive material, and (with a shift) cooling coffee. One equation, many stories.',
    goals: ['Write dy/dt = ky from a description', 'Find k from doubling time or half-life', 'Use Newton’s law of cooling', 'Solve for time with logarithms'],
    notes: [
      { k: 'rule', title: 'Proportional change', t: r`$\frac{dy}{dt} = ky$ has solution $y = y_0e^{kt}$. Growth if $k > 0$, decay if $k < 0$.` },
      { k: 'formula', t: r`k = \frac{\ln 2}{T_{\text{double}}} \qquad k = -\frac{\ln 2}{T_{\text{half}}}` },
      { k: 'rule', title: 'Newton’s law of cooling', t: r`$\frac{dT}{dt} = -k(T - A)$, where $A$ is the room temperature. Solution: $T = A + (T_0 - A)e^{-kt}$.` },
      { k: 'tip', t: r`Doubling or halving in whole periods? Skip $k$: $y = y_0 \cdot 2^{t/T}$ or $y_0 \cdot \left(\frac{1}{2}\right)^{t/T}$.` },
      { k: 'p', t: r`Continuous compounding is the same model: $A = Pe^{rt}$ for rate $r$ per year.` },
    ],
    examples: [
      { q: r`A culture of 100 bacteria doubles every 3 hours. How many after 12 hours?`, steps: [r`12 hours is 4 doublings.`, r`$100 \cdot 2^4 = 1600$.`], a: '1600' },
      { q: r`Coffee at 100°F cools in a 20°F room and is 60°F after 10 minutes. Temperature at 20 minutes?`, steps: [r`The difference from the room halves every 10 minutes: $80 \to 40 \to 20$.`, r`$T(20) = 20 + 20 = 40$°F.`], a: '40' },
    ],
    practice: [
      P('c7-3-1', 1, r`A culture of 100 bacteria doubles every 3 hours. How many after 12 hours?`, ['1600'], '4 doubling periods.', [r`$100 \cdot 2^4 = 1600$.`], { check: () => near(ode((_t, y) => (Math.LN2 / 3) * y, 0, 100, 12), 1600) }),
      P('c7-3-2', 1, r`A 40 g sample has a half-life of 5 years. How many grams remain after 10 years?`, ['10'], 'Two half-lives.', [r`$40 \cdot \frac{1}{4} = 10$ g.`], { check: () => near(ode((_t, y) => (-Math.LN2 / 5) * y, 0, 40, 10), 10) }),
      P('c7-3-3', 2, r`\$500 is invested at 3% compounded continuously. What is it worth after 10 years (to the cent)?`, ['674.93'], 'A = Pe^(rt).', [r`$500e^{0.3} \approx 674.93$.`], { check: () => near(ode((_t, y) => 0.03 * y, 0, 500, 10), 674.93, 1e-5) }),
      P('c7-3-4', 2, r`Coffee at 100°F sits in a 20°F room and is 60°F after 10 minutes. Using Newton’s law of cooling, what is its temperature at 20 minutes?`, ['40'], 'The gap from 20°F halves every 10 minutes.', [r`$T - 20 = 80\left(\frac{1}{2}\right)^{t/10}$.`, r`$T(20) = 20 + 20 = 40$.`], { check: () => near(ode((_t, T) => -(Math.LN2 / 10) * (T - 20), 0, 100, 20), 40) }),
      P('c7-3-5', 2, r`A population quadruples every 4 years. Find $k$ in $P = P_0e^{kt}$ (three decimal places).`, ['0.347'], 'e^(4k) = 4.', [r`$k = \frac{\ln 4}{4} \approx 0.347$.`], { check: () => near(Math.exp(4 * (Math.log(4) / 4)), 4) && near(Math.log(4) / 4, 0.3466, 1e-3) }),
      P('c7-3-6', 3, r`How many years until money triples at 2% compounded continuously? (two decimal places)`, ['54.93'], 'e^(0.02t) = 3.', [r`$t = \frac{\ln 3}{0.02} \approx 54.93$ years.`], { check: () => near(ode((_t, y) => 0.02 * y, 0, 1, Math.log(3) / 0.02), 3) && near(Math.log(3) / 0.02, 54.93, 1e-4) }),
    ],
    remember: ['dy/dt = ky ⇒ y = y₀e^(kt).', 'k = ln 2 / doubling time.', 'Cooling: the gap T − A decays exponentially.'],
    checkIn: 'Next: Euler’s method, which approximates solutions you cannot find exactly (BC only).',
  },
  {
    id: 'c7-4', unit: 7, n: 4, title: 'Euler’s method',
    intro: 'Euler’s method walks along the slope field in small straight steps. At each point, use the slope from the DE to step forward by Δx. It is a tangent-line approximation repeated, and the AP exam asks for it in a neat table.',
    goals: ['Carry out Euler’s method with a given step size', 'Organize the work in a table', 'Decide whether Euler over- or underestimates'],
    notes: [
      { k: 'formula', t: r`x_{n+1} = x_n + \Delta x, \qquad y_{n+1} = y_n + \Delta x \cdot \frac{dy}{dx}\Big|_{(x_n,\,y_n)}` },
      { k: 'list', items: [r`Make a table with columns $x$, $y$, slope, $\Delta y = \text{slope} \cdot \Delta x$.`, r`The new $y$ is the old $y$ plus $\Delta y$.`, r`Number of steps $= \frac{\text{distance}}{\Delta x}$.`] },
      { k: 'rule', title: 'Over or under?', t: r`If the solution is concave up, the tangent steps lie below the curve: Euler underestimates. Concave down: Euler overestimates. Check the sign of $\frac{d^2y}{dx^2}$.` },
      { k: 'tip', t: r`Use the slope at the start of each step, from the current estimated point, not the true point.` },
      { k: 'warn', t: r`Smaller steps give better estimates, but each step's error builds on the last one.` },
    ],
    examples: [
      { q: r`$\frac{dy}{dx} = x + y$, $y(0) = 1$. Estimate $y(0.2)$ with two steps of 0.1.`, steps: [r`At $(0, 1)$: slope 1, $y \approx 1 + 0.1 = 1.1$.`, r`At $(0.1, 1.1)$: slope 1.2, $y \approx 1.1 + 0.12 = 1.22$.`], a: '1.22' },
      { q: r`$\frac{dy}{dx} = xy$, $y(1) = 2$. Estimate $y(2)$ with two steps of 0.5.`, steps: [r`At $(1, 2)$: slope 2, $y \approx 2 + 1 = 3$.`, r`At $(1.5, 3)$: slope 4.5, $y \approx 3 + 2.25 = 5.25$.`], a: '5.25' },
    ],
    practice: [
      P('c7-4-1', 1, r`$\frac{dy}{dx} = x + y$, $y(0) = 1$. One Euler step of 0.1 estimates $y(0.1) = $?`, ['1.1'], 'Slope at (0, 1) is 1.', [r`$1 + 0.1(1) = 1.1$.`], { check: () => near(euler((x, y) => x + y, 0, 1, 0.1, 1), 1.1) }),
      P('c7-4-2', 1, r`Same DE, two steps of 0.1: estimate $y(0.2)$.`, ['1.22'], 'Second slope at (0.1, 1.1).', [r`$1.1 + 0.1(1.2) = 1.22$.`], { check: () => near(euler((x, y) => x + y, 0, 1, 0.1, 2), 1.22) }),
      P('c7-4-3', 2, r`$\frac{dy}{dx} = y - x$, $y(0) = 3$. Estimate $y(1)$ with two steps of 0.5.`, ['6.5'], 'Slopes 3, then 4.', [r`$y(0.5) \approx 3 + 0.5(3) = 4.5$.`, r`Slope at $(0.5, 4.5)$ is 4: $y(1) \approx 4.5 + 2 = 6.5$.`], { check: () => near(euler((x, y) => y - x, 0, 3, 0.5, 2), 6.5) }),
      P('c7-4-4', 2, r`$\frac{dy}{dx} = x^2$, $y(1) = 2$. Estimate $y(2)$ with two steps of 0.5.`, ['3.625'], 'Slopes 1, then 2.25.', [r`$2 + 0.5(1) = 2.5$.`, r`$2.5 + 0.5(2.25) = 3.625$.`], { check: () => near(euler((x) => x * x, 1, 2, 0.5, 2), 3.625) }),
      P('c7-4-5', 2, r`A solution curve is concave up on the whole interval. An Euler estimate along it will be…`, 0, 'Tangent lines and concave-up curves.', [r`Tangent segments lie below a concave-up curve, so Euler underestimates.`], { choices: ['an underestimate', 'an overestimate', 'exact', 'impossible to say'] }),
      P('c7-4-6', 3, r`$\frac{dy}{dx} = xy$, $y(1) = 2$. Estimate $y(2)$ with two steps of 0.5.`, ['5.25'], 'Slope 2, then 4.5.', [r`$2 + 0.5(2) = 3$.`, r`$3 + 0.5(1.5 \cdot 3) = 5.25$.`], { check: () => near(euler((x, y) => x * y, 1, 2, 0.5, 2), 5.25) }),
    ],
    remember: ['New y = old y + Δx · slope at the old point.', 'Table: x, y, slope, Δy.', 'Concave up ⇒ Euler underestimates.'],
    checkIn: 'Last lesson of Unit 7: logistic growth, where populations level off.',
  },
  {
    id: 'c7-5', unit: 7, n: 5, title: 'Logistic models',
    intro: 'Real populations do not grow forever. Logistic growth starts out exponential and levels off at a carrying capacity. The AP exam rarely asks you to solve it, but it constantly asks what the equation tells you: the limit, and when growth is fastest.',
    goals: ['Recognize the logistic equation', 'Read off the carrying capacity', 'Find when the population grows fastest', 'Find long-run limits from any starting value'],
    notes: [
      { k: 'formula', t: r`\frac{dP}{dt} = kP\left(1 - \frac{P}{L}\right) \qquad \frac{dP}{dt} = kP(L - P)` },
      { k: 'rule', title: 'Carrying capacity', t: r`$L$ is the carrying capacity. If $P(0) > 0$, then $\lim\limits_{t \to \infty} P(t) = L$, whether $P$ starts above or below $L$.` },
      { k: 'rule', title: 'Fastest growth', t: r`$\frac{dP}{dt}$ is largest when $P = \frac{L}{2}$. That is where the graph of $P$ has its inflection point.` },
      { k: 'formula', t: r`P(t) = \frac{L}{1 + Ae^{-kt}}, \quad A = \frac{L - P_0}{P_0}` },
      { k: 'warn', t: r`Both forms above are logistic. In the form $kP(L - P)$, the growth constant is $kL$, not $k$. Always factor to see $L$ clearly.` },
    ],
    examples: [
      { q: r`$\frac{dP}{dt} = 0.2P\left(1 - \frac{P}{500}\right)$, $P(0) = 50$. Find $\lim\limits_{t \to \infty} P(t)$ and when $P$ grows fastest.`, steps: [r`Carrying capacity: 500, so the limit is 500.`, r`Fastest growth at $P = 250$.`], a: '500; P = 250' },
      { q: r`$\frac{dP}{dt} = 0.01P(200 - P)$. Carrying capacity?`, steps: [r`$\frac{dP}{dt} = 0$ when $P = 200$.`, r`$L = 200$.`], a: '200' },
    ],
    practice: [
      P('c7-5-1', 1, r`$\frac{dP}{dt} = 0.2P\left(1 - \frac{P}{500}\right)$, $P(0) = 50$. Find $\lim\limits_{t \to \infty} P(t)$.`, ['500'], 'Carrying capacity.', [r`$L = 500$.`], { check: () => near(ode((_t, p) => 0.2 * p * (1 - p / 500), 0, 50, 150), 500, 1e-3) }),
      P('c7-5-2', 1, r`For the same model, at what population is $P$ growing fastest?`, ['250'], 'Half the carrying capacity.', [r`$\frac{L}{2} = 250$.`], { check: () => { const g = (p: number) => 0.2 * p * (1 - p / 500); return g(250) > g(249) && g(250) > g(251); } }),
      P('c7-5-3', 2, r`Same model, but $P(0) = 600$. Find $\lim\limits_{t \to \infty} P(t)$.`, ['500'], 'Above L, the population decreases toward L.', [r`For $P > 500$, $\frac{dP}{dt} < 0$; $P$ falls to 500.`], { check: () => near(ode((_t, p) => 0.2 * p * (1 - p / 500), 0, 600, 150), 500, 1e-3) }),
      P('c7-5-4', 1, r`$\frac{dP}{dt} = 0.01P(200 - P)$. What is the carrying capacity?`, ['200'], 'Where is dP/dt = 0 (besides P = 0)?', [r`$L = 200$.`], { check: () => near(ode((_t, p) => 0.01 * p * (200 - p), 0, 10, 20), 200, 1e-3) }),
      P('c7-5-5', 2, r`$\frac{dP}{dt} = 0.4P\left(1 - \frac{P}{100}\right)$. What is the maximum rate of growth $\frac{dP}{dt}$?`, ['10'], 'Evaluate dP/dt at P = 50.', [r`$0.4(50)(0.5) = 10$.`], { check: () => { const g = (p: number) => 0.4 * p * (1 - p / 100); return near(g(50), 10) && g(50) >= g(49.9) && g(50) >= g(50.1); } }),
      P('c7-5-6', 3, r`$P(t) = \frac{1000}{1 + 9e^{-0.5t}}$. When does $P = 500$? (three decimal places)`, ['4.394'], 'Set the denominator equal to 2.', [r`$9e^{-0.5t} = 1$, so $t = 2\ln 9 \approx 4.394$.`], { check: () => near(ode((_t, p) => 0.5 * p * (1 - p / 1000), 0, 100, 2 * Math.log(9)), 500) }),
    ],
    remember: ['Logistic: kP(1 − P/L).', 'P → L for any positive start.', 'Fastest growth at P = L/2 (inflection point).'],
    checkIn: 'Unit 7 done. Take the review, then Unit 8 puts integrals to work on areas and volumes.',
  },
];
