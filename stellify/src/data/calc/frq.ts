import { d, euler, integ, near, series } from './types';
import { FRQ_FORMULA, FRQ_FULL } from './frq-explain';

/**
 * Guided free-response workouts for AP Calculus BC. Each problem is a full multi-part free-response question,
 * worked one step at a time: the student enters every intermediate result and gets feedback before moving on,
 * then sees exactly what to write for full credit and the mistakes that usually cost points.
 * Original problems; every numeric step has an independent check().
 */
export interface FrqStep {
  /** what to work out in this step */
  prompt: string;
  /** accepted answers (numbers, fractions, or short words such as yes / no) */
  answer: string[];
  hint: string;
  /** shown after the step is answered, right or wrong; paragraphs separated by a blank line */
  explain: string;
  /** the formula this step uses (see formulas.ts): its anatomy is shown with the step */
  formula?: string;
  check?: () => boolean;
}
export interface FrqPart { label: string; q: string; steps: FrqStep[]; write: string; trap: string }
export interface Frq {
  id: string; units: number[]; title: string; calculator: boolean; setup: string; parts: FrqPart[];
  /** an official College Board question from the student's private pack (never in the public build) */
  official?: boolean;
  /** e.g. "AP Calculus BC 2023, Question 4" */
  source?: string;
  /** a figure drawn as inline SVG, or a table written in LaTeX inside setup */
  figure?: string;
}

const r = String.raw;
const S = (prompt: string, answer: string[], hint: string, explain: string, check?: () => boolean): FrqStep => ({ prompt, answer, hint, explain, check });
const YES = ['yes', 'y'], NO = ['no', 'n'];

const E = (t: number) => 8 + 2 * Math.sin(t / 2), L = (t: number) => 0.5 * t + 4;

const WORKOUTS: Frq[] = [
  { id: 'frq-1', units: [6, 8], title: 'Rate in, rate out: a water tank', calculator: true,
    setup: r`Water flows into a tank at $E(t) = 8 + 2\sin\left(\frac{t}{2}\right)$ gallons per hour and drains at $L(t) = 0.5t + 4$ gallons per hour, for $0 \le t \le 8$. At $t = 0$ the tank holds 50 gallons.`,
    parts: [
      { label: 'a', q: 'How many gallons of water enter the tank from t = 0 to t = 8?', steps: [
        S(r`Write the amount entering as a definite integral and evaluate it with your calculator. (Three decimal places.)`, ['70.615'], 'Amount = ∫₀⁸ E(t) dt.', r`$\int_0^8E(t)\,dt \approx 70.615$ gallons.`, () => near(integ(E, 0, 8), 70.6146, 1e-4)),
      ], write: r`Write the integral with its limits and units: $\int_0^8E(t)\,dt \approx 70.615$ gallons.`, trap: 'Giving a number without the integral that produced it. Readers award a point for the setup.' },
      { label: 'b', q: 'Is the amount of water in the tank increasing or decreasing at t = 6? Give a reason.', steps: [
        S(r`Find $E(6)$. (Three decimal places.)`, ['8.282'], 'Plug t = 6 into E.', r`$E(6) = 8 + 2\sin 3 \approx 8.282$.`, () => near(E(6), 8.28224, 1e-4)),
        S(r`Find $L(6)$.`, ['7'], 'Plug t = 6 into L.', r`$L(6) = 3 + 4 = 7$.`, () => L(6) === 7),
        S(r`Is the amount increasing at $t = 6$? (yes or no)`, YES, 'Compare the rate in with the rate out.', r`$E(6) - L(6) \approx 1.282 > 0$, so the amount is increasing.`),
      ], write: r`"$E(6) - L(6) \approx 1.282 > 0$, so the amount of water is increasing at $t = 6$." The comparison is the reason; a bare "increasing" earns nothing.`, trap: 'Looking only at E(6) > 0. Water can be flowing in while the total still falls.' },
      { label: 'c', q: 'How many gallons are in the tank at t = 8?', steps: [
        S(r`Evaluate $\int_0^8L(t)\,dt$.`, ['48'], 'Integrate 0.5t + 4 by hand or on the calculator.', r`$\left[\frac{t^2}{4} + 4t\right]_0^8 = 16 + 32 = 48$.`, () => near(integ(L, 0, 8), 48)),
        S(r`Find the amount at $t = 8$. (Three decimal places.)`, ['72.615'], 'Start + in − out.', r`$50 + 70.615 - 48 = 72.615$ gallons.`, () => near(50 + integ(E, 0, 8) - 48, 72.6146, 1e-4)),
      ], write: r`$A(8) = 50 + \int_0^8\left(E(t) - L(t)\right)dt \approx 72.615$ gallons. Show the initial amount in the expression.`, trap: 'Forgetting the 50 gallons that were already in the tank.' },
      { label: 'd', q: 'At what time is the amount of water in the tank greatest? Justify your answer.', steps: [
        S(r`Solve $E(t) = L(t)$ on $(0, 8)$ with your calculator. (Three decimal places.)`, ['6.861'], 'Candidates are where A′(t) = E(t) − L(t) = 0, plus the endpoints.', r`$E(t) - L(t) = 0$ at $t \approx 6.861$. Before it the difference is positive, after it negative.`, () => { const t = 6.86079; return Math.abs(E(t) - L(t)) < 1e-3; }),
        S(r`What is the amount at that time? (Three decimal places.)`, ['73.510'], 'A(t) = 50 + ∫₀ᵗ (E − L).', r`$A(6.861) \approx 73.510$, larger than $A(0) = 50$ and $A(8) \approx 72.615$.`, () => near(50 + integ((t) => E(t) - L(t), 0, 6.860787), 73.5099, 1e-4)),
      ], write: r`Candidates test: $A'(t) = E(t) - L(t) = 0$ at $t \approx 6.861$; compare $A(0) = 50$, $A(6.861) \approx 73.510$, $A(8) \approx 72.615$. The maximum is at $t \approx 6.861$ hours.`, trap: 'Stopping at A′(t) = 0 without comparing the endpoints, or without saying A′ changes from positive to negative.' },
    ] },
  { id: 'frq-2', units: [4, 8], title: 'Particle motion on a line', calculator: false,
    setup: r`A particle moves along the $x$-axis with velocity $v(t) = t^2 - 6t + 8$ for $0 \le t \le 5$. Its position at $t = 0$ is $x(0) = 1$.`,
    parts: [
      { label: 'a', q: 'At what times is the particle at rest?', steps: [
        S('Factor v(t). The smaller time when v(t) = 0 is:', ['2'], 'Two numbers with product 8 and sum −6.', r`$v(t) = (t - 2)(t - 4)$, zero at $t = 2$ …`, () => 4 - 12 + 8 === 0),
        S('The larger time when v(t) = 0 is:', ['4'], 'The other factor.', r`… and at $t = 4$.`, () => 16 - 24 + 8 === 0),
      ], write: r`$v(t) = (t - 2)(t - 4) = 0$ at $t = 2$ and $t = 4$.`, trap: 'Setting the position or the acceleration equal to 0 instead of the velocity.' },
      { label: 'b', q: 'Is the speed of the particle increasing or decreasing at t = 1? Give a reason.', steps: [
        S('Find v(1).', ['3'], 'Plug in.', r`$v(1) = 1 - 6 + 8 = 3$.`, () => 1 - 6 + 8 === 3),
        S('Find a(1), where a(t) = v′(t).', ['-4'], 'a(t) = 2t − 6.', r`$a(1) = -4$.`, () => near(d((t) => t * t - 6 * t + 8, 1), -4)),
        S('Is the speed increasing at t = 1? (yes or no)', NO, 'Speed increases only when v and a have the same sign.', r`$v(1) > 0$ and $a(1) < 0$ have opposite signs, so the speed is decreasing.`),
      ], write: r`"$v(1) = 3 > 0$ and $a(1) = -4 < 0$. Because they have opposite signs, the speed is decreasing." Name both signs.`, trap: 'Saying the speed decreases because a(1) < 0 alone. Negative acceleration speeds the particle up when v < 0.' },
      { label: 'c', q: 'Find the position of the particle at t = 5.', steps: [
        S(r`Evaluate $\int_0^5v(t)\,dt$. (Fraction or three decimals.)`, ['20/3', '6.667'], 'Antiderivative t³/3 − 3t² + 8t.', r`$\frac{125}{3} - 75 + 40 = \frac{20}{3}$.`, () => near(integ((t) => t * t - 6 * t + 8, 0, 5), 20 / 3)),
        S('Find x(5).', ['23/3', '7.667'], 'Position = initial position + displacement.', r`$x(5) = 1 + \frac{20}{3} = \frac{23}{3}$.`, () => near(1 + 20 / 3, 23 / 3)),
      ], write: r`$x(5) = x(0) + \int_0^5v(t)\,dt = 1 + \frac{20}{3} = \frac{23}{3}$.`, trap: 'Reporting the displacement 20/3 and forgetting x(0) = 1.' },
      { label: 'd', q: 'Find the total distance the particle travels from t = 0 to t = 5.', steps: [
        S(r`Distance on $[0, 2]$: $\int_0^2v(t)\,dt$.`, ['20/3', '6.667'], 'v ≥ 0 here.', r`$\frac{8}{3} - 12 + 16 = \frac{20}{3}$.`, () => near(integ((t) => t * t - 6 * t + 8, 0, 2), 20 / 3)),
        S(r`Distance on $[2, 4]$, where $v < 0$: $\left|\int_2^4v(t)\,dt\right|$.`, ['4/3', '1.333'], 'Take the absolute value of the integral.', r`$\int_2^4v\,dt = -\frac{4}{3}$, so the distance is $\frac{4}{3}$.`, () => near(integ((t) => t * t - 6 * t + 8, 2, 4), -4 / 3)),
        S('Total distance from t = 0 to t = 5.', ['28/3', '9.333'], 'Add the distance on [4, 5] as well (it is 4/3).', r`$\frac{20}{3} + \frac{4}{3} + \frac{4}{3} = \frac{28}{3}$.`, () => near(integ((t) => Math.abs(t * t - 6 * t + 8), 0, 5, 50000), 28 / 3, 1e-4)),
      ], write: r`Total distance $= \int_0^5|v(t)|\,dt = \frac{20}{3} + \frac{4}{3} + \frac{4}{3} = \frac{28}{3}$.`, trap: 'Integrating v instead of |v|. That gives displacement (20/3), not distance.' },
    ] },
  { id: 'frq-3', units: [2, 6, 5], title: 'A table of velocities', calculator: false,
    setup: r`A runner’s velocity $v(t)$, in feet per second, is differentiable. Selected values: $v(0) = 0$, $v(2) = 8$, $v(5) = 14$, $v(9) = 10$, $v(12) = 4$.`,
    parts: [
      { label: 'a', q: 'Estimate the runner’s acceleration at t = 3.5.', steps: [
        S(r`Use the values at $t = 2$ and $t = 5$ to estimate $v'(3.5)$.`, ['2'], 'Difference quotient over the interval containing 3.5.', r`$\frac{v(5) - v(2)}{5 - 2} = \frac{6}{3} = 2$ ft/s².`, () => (14 - 8) / 3 === 2),
      ], write: r`$v'(3.5) \approx \frac{v(5) - v(2)}{5 - 2} = 2$ ft/s². Show the quotient with the table values.`, trap: 'Using t = 0 and t = 12, which do not bracket 3.5 closely.' },
      { label: 'b', q: 'Use a trapezoidal sum with the four subintervals given by the table to approximate the integral of v from 0 to 12.', steps: [
        S('First two trapezoids (widths 2 and 3).', ['41'], 'width × (left + right) / 2 for each.', r`$2\cdot\frac{0 + 8}{2} + 3\cdot\frac{8 + 14}{2} = 8 + 33 = 41$.`, () => 8 + 33 === 41),
        S('Last two trapezoids (widths 4 and 3).', ['69'], 'Same formula.', r`$4\cdot\frac{14 + 10}{2} + 3\cdot\frac{10 + 4}{2} = 48 + 21 = 69$.`, () => 48 + 21 === 69),
        S('Trapezoidal approximation of the integral from 0 to 12.', ['110'], 'Add both pieces.', r`$41 + 69 = 110$ feet: the approximate distance run in 12 seconds.`, () => 41 + 69 === 110),
      ], write: r`Show every term: $2\cdot\frac{0 + 8}{2} + 3\cdot\frac{8 + 14}{2} + 4\cdot\frac{14 + 10}{2} + 3\cdot\frac{10 + 4}{2} = 110$ feet.`, trap: 'Using equal widths. The subintervals here have widths 2, 3, 4 and 3.' },
      { label: 'c', q: 'Must there be a time t in (5, 9) when the runner’s acceleration is −1 ft/s²? Justify.', steps: [
        S(r`Compute $\frac{v(9) - v(5)}{9 - 5}$.`, ['-1'], 'Average rate of change of v.', r`$\frac{10 - 14}{4} = -1$.`, () => (10 - 14) / 4 === -1),
        S('Must such a time exist? (yes or no)', YES, 'v is differentiable, so it is continuous: the Mean Value Theorem applies.', r`Yes, by the Mean Value Theorem.`),
      ], write: r`"$v$ is differentiable, hence continuous, on $[5, 9]$. By the Mean Value Theorem there is $c$ in $(5, 9)$ with $v'(c) = \frac{v(9) - v(5)}{9 - 5} = -1$." State the hypotheses.`, trap: 'Writing "MVT" without stating that v is continuous and differentiable.' },
    ] },
  { id: 'frq-4', units: [5, 6], title: 'Reading f from its derivative', calculator: false,
    setup: r`A function $f$ has derivative $f'(x) = x^2 - 4x + 3$ and $f(0) = 2$. Consider $0 \le x \le 4$.`,
    parts: [
      { label: 'a', q: 'At what value of x does f have a relative maximum? Justify.', steps: [
        S(r`Factor $f'$. The smaller zero is:`, ['1'], '(x − 1)(x − 3).', r`$f'(x) = (x - 1)(x - 3)$, zero at $x = 1$ and $x = 3$.`, () => 1 - 4 + 3 === 0),
        S('Where does f′ change from positive to negative?', ['1'], 'Test the signs on (0, 1), (1, 3), (3, 4).', r`$f' > 0$ on $(0, 1)$ and $f' < 0$ on $(1, 3)$: relative maximum at $x = 1$.`),
      ], write: r`"$f$ has a relative maximum at $x = 1$ because $f'$ changes from positive to negative there."`, trap: 'Saying "because f′(1) = 0". A zero of f′ alone does not make a maximum.' },
      { label: 'b', q: 'At what x does the graph of f have a point of inflection? Justify.', steps: [
        S(r`Solve $f''(x) = 0$.`, ['2'], 'f″(x) = 2x − 4.', r`$f''(x) = 2x - 4 = 0$ at $x = 2$, and $f''$ changes sign there.`, () => near(d((x) => x * x - 4 * x + 3, 2), 0)),
      ], write: r`"$f''(x) = 2x - 4$ changes sign at $x = 2$ (equivalently, $f'$ changes from decreasing to increasing), so there is a point of inflection at $x = 2$."`, trap: 'Not mentioning the sign change of f″.' },
      { label: 'c', q: 'Find the absolute maximum value of f on [0, 4].', steps: [
        S(r`$f(1) = 2 + \int_0^1f'(x)\,dx$. (Fraction or three decimals.)`, ['10/3', '3.333'], 'Antiderivative x³/3 − 2x² + 3x.', r`$2 + \frac{1}{3} - 2 + 3 = \frac{10}{3}$.`, () => near(2 + integ((x) => x * x - 4 * x + 3, 0, 1), 10 / 3)),
        S(r`$f(4) = 2 + \int_0^4f'(x)\,dx$.`, ['10/3', '3.333'], 'Same antiderivative from 0 to 4.', r`$2 + \frac{64}{3} - 32 + 12 = \frac{10}{3}$.`, () => near(2 + integ((x) => x * x - 4 * x + 3, 0, 4), 10 / 3)),
        S('The absolute maximum value of f on [0, 4].', ['10/3', '3.333'], 'Compare f(0) = 2, f(1), f(3) and f(4).', r`$f(0) = 2$, $f(1) = \frac{10}{3}$, $f(3) = 2$, $f(4) = \frac{10}{3}$. The maximum is $\frac{10}{3}$.`),
      ], write: r`Candidates test with every value shown: $f(0) = 2$, $f(1) = \frac{10}{3}$, $f(3) = 2$, $f(4) = \frac{10}{3}$. Absolute maximum $\frac{10}{3}$.`, trap: 'Checking only the critical points and missing the tie at the endpoint x = 4.' },
    ] },
  { id: 'frq-5', units: [7], title: 'A differential equation', calculator: false,
    setup: r`Let $y = f(x)$ be the solution to $\dfrac{dy}{dx} = (y - 1)x^2$ with $f(0) = 3$.`,
    parts: [
      { label: 'a', q: 'Find d²y/dx² at the point (1, 2). Is the solution curve through (1, 2) concave up there?', steps: [
        S(r`Find $\frac{dy}{dx}$ at $(1, 2)$.`, ['1'], 'Plug in.', r`$(2 - 1)(1) = 1$.`, () => (2 - 1) * 1 === 1),
        S(r`Find $\frac{d^2y}{dx^2} = 2x(y - 1) + x^2\frac{dy}{dx}$ at $(1, 2)$.`, ['3'], 'Product rule; y′ is the value from the previous step.', r`$2(1)(1) + (1)(1) = 3 > 0$: concave up.`, () => 2 * 1 * 1 + 1 * 1 === 3),
      ], write: r`$\frac{d^2y}{dx^2} = 2x(y - 1) + x^2\frac{dy}{dx}$; at $(1, 2)$ it equals 3 > 0, so concave up.`, trap: 'Forgetting that y depends on x, so the derivative of (y − 1) is dy/dx, not 0.' },
      { label: 'b', q: 'Use Euler’s method with two steps of size 0.5, starting at (0, 3), to approximate f(1).', steps: [
        S('Approximate f(0.5).', ['3'], 'Slope at (0, 3) is (3 − 1)(0) = 0.', r`$3 + 0.5(0) = 3$.`, () => near(euler((x, y) => (y - 1) * x * x, 0, 3, 0.5, 1), 3)),
        S('Approximate f(1).', ['3.25'], 'Slope at (0.5, 3) is 2(0.25) = 0.5.', r`$3 + 0.5(0.5) = 3.25$.`, () => near(euler((x, y) => (y - 1) * x * x, 0, 3, 0.5, 2), 3.25)),
      ], write: r`Show each step: $f(0.5) \approx 3 + 0.5\cdot 0 = 3$; $f(1) \approx 3 + 0.5\cdot 0.5 = 3.25$.`, trap: 'Using the slope at the new point instead of the old one.' },
      { label: 'c', q: 'Find the particular solution by separation of variables, then evaluate f(1).', steps: [
        S(r`After separating, $\ln|y - 1| = \frac{x^3}{3} + C$. Use $f(0) = 3$ to find $C$ (three decimals).`, ['0.693'], 'ln|3 − 1| = 0 + C.', r`$C = \ln 2 \approx 0.693$, so $y = 1 + 2e^{x^3/3}$.`, () => near(Math.log(2), 0.6931, 1e-3)),
        S('Evaluate f(1). (Three decimal places.)', ['3.791'], 'y = 1 + 2e^(x³/3).', r`$f(1) = 1 + 2e^{1/3} \approx 3.791$.`, () => near(1 + 2 * Math.exp(1 / 3), 3.7912, 1e-4)),
      ], write: r`$\frac{dy}{y - 1} = x^2\,dx$, $\ln|y - 1| = \frac{x^3}{3} + C$, $C = \ln 2$, $y = 1 + 2e^{x^3/3}$. Show the separation, the constant, and the solved form.`, trap: 'Dropping the constant of integration; the point it carries is lost and the answer is wrong.' },
    ] },
  { id: 'frq-6', units: [8], title: 'Area and volume', calculator: true,
    setup: r`Let $R$ be the region bounded by $y = 4 - x^2$ and $y = x + 2$.`,
    parts: [
      { label: 'a', q: 'Find the area of R.', steps: [
        S('The curves meet at x = −2 and at x = ?', ['1'], 'Solve 4 − x² = x + 2.', r`$x^2 + x - 2 = 0$ gives $x = -2$ and $x = 1$.`, () => 4 - 1 === 1 + 2),
        S(r`Area $= \int_{-2}^1\left[(4 - x^2) - (x + 2)\right]dx$.`, ['4.5', '9/2'], 'Top minus bottom.', r`$\left[2x - \frac{x^2}{2} - \frac{x^3}{3}\right]_{-2}^1 = 4.5$.`, () => near(integ((x) => 2 - x - x * x, -2, 1), 4.5)),
      ], write: r`Area $= \int_{-2}^1\left(2 - x - x^2\right)dx = 4.5$. Give the integrand and both limits.`, trap: 'Subtracting in the wrong order (bottom minus top) and reporting −4.5.' },
      { label: 'b', q: 'Find the volume when R is revolved about the x-axis.', steps: [
        S(r`Washers: $\pi\int_{-2}^1\left[(4 - x^2)^2 - (x + 2)^2\right]dx$. (Three decimal places.)`, ['67.858'], 'Outer radius 4 − x², inner radius x + 2.', r`$\approx 67.858$.`, () => near(Math.PI * integ((x) => (4 - x * x) ** 2 - (x + 2) ** 2, -2, 1), 67.8584, 1e-4)),
      ], write: r`$V = \pi\int_{-2}^1\left[(4 - x^2)^2 - (x + 2)^2\right]dx \approx 67.858$.`, trap: 'Squaring the difference (R − r)² instead of taking R² − r².' },
      { label: 'c', q: 'R is the base of a solid whose cross sections perpendicular to the x-axis are squares. Find its volume.', steps: [
        S(r`$\int_{-2}^1(2 - x - x^2)^2\,dx$. (Three decimal places.)`, ['8.1', '8.100'], 'Side of each square = top − bottom.', r`$= 8.1$.`, () => near(integ((x) => (2 - x - x * x) ** 2, -2, 1), 8.1)),
      ], write: r`$V = \int_{-2}^1\left(2 - x - x^2\right)^2dx = 8.1$.`, trap: 'Multiplying by π. Cross-section volumes use the area of the shape, here a square.' },
      { label: 'd', q: 'The vertical line x = k divides R into two regions of equal area. Find k.', steps: [
        S(r`Solve $\int_{-2}^k(2 - x - x^2)\,dx = 2.25$.`, ['-0.5', '-1/2'], 'Half of 4.5.', r`$k = -0.5$ (the parabola is symmetric about $x = -\frac{1}{2}$ between the intersection points).`, () => near(integ((x) => 2 - x - x * x, -2, -0.5), 2.25)),
      ], write: r`Write the equation $\int_{-2}^k\left(2 - x - x^2\right)dx = \frac{1}{2}(4.5)$; then $k = -0.5$.`, trap: 'Setting the integral equal to 4.5 instead of half of it.' },
    ] },
  { id: 'frq-7', units: [9], title: 'Motion in the plane', calculator: true,
    setup: r`A particle moves in the plane with velocity $\langle e^{t/2},\ \sin t\rangle$. At $t = 0$ it is at $(2, 1)$.`,
    parts: [
      { label: 'a', q: 'Find the speed of the particle at t = 2.', steps: [
        S(r`Speed $= \sqrt{(e^{1})^2 + \sin^2 2}$. (Three decimal places.)`, ['2.866'], 'Magnitude of the velocity vector.', r`$\approx 2.866$.`, () => near(Math.hypot(Math.E, Math.sin(2)), 2.8663, 1e-4)),
      ], write: r`Speed $= \sqrt{\left(e^{2/2}\right)^2 + (\sin 2)^2} \approx 2.866$.`, trap: 'Adding the components instead of taking the square root of the sum of squares.' },
      { label: 'b', q: 'Find the position of the particle at t = 3.', steps: [
        S(r`$x(3) = 2 + \int_0^3e^{t/2}\,dt$. (Three decimal places.)`, ['8.963'], '∫ e^(t/2) dt = 2e^(t/2).', r`$2 + 2(e^{1.5} - 1) \approx 8.963$.`, () => near(2 + integ((t) => Math.exp(t / 2), 0, 3), 8.9634, 1e-4)),
        S(r`$y(3) = 1 + \int_0^3\sin t\,dt$. (Three decimal places.)`, ['2.990'], '∫ sin t dt = −cos t.', r`$1 + (1 - \cos 3) \approx 2.990$.`, () => near(1 + integ(Math.sin, 0, 3), 2.98999, 1e-4)),
      ], write: r`$(x(3), y(3)) = \left(2 + \int_0^3e^{t/2}dt,\ 1 + \int_0^3\sin t\,dt\right) \approx (8.963, 2.990)$.`, trap: 'Forgetting the starting point (2, 1).' },
      { label: 'c', q: 'Find the total distance traveled from t = 0 to t = 3.', steps: [
        S(r`$\int_0^3\sqrt{e^t + \sin^2t}\,dt$. (Three decimal places.)`, ['7.320'], 'Distance = ∫ speed.', r`$\approx 7.320$.`, () => near(integ((t) => Math.sqrt(Math.exp(t) + Math.sin(t) ** 2), 0, 3), 7.3203, 1e-4)),
      ], write: r`Distance $= \int_0^3\sqrt{e^t + \sin^2t}\,dt \approx 7.320$.`, trap: 'Computing the straight-line distance between the start and end points.' },
    ] },
  { id: 'frq-8', units: [9], title: 'A polar curve', calculator: true,
    setup: r`Consider the polar curve $r = 3 + 2\cos\theta$ for $0 \le \theta \le 2\pi$.`,
    parts: [
      { label: 'a', q: 'Find the area of the region enclosed by the curve.', steps: [
        S(r`$\frac{1}{2}\int_0^{2\pi}(3 + 2\cos\theta)^2\,d\theta$. (Three decimal places.)`, ['34.558'], 'Area in polar = ½ ∫ r² dθ.', r`$= 11\pi \approx 34.558$.`, () => near(0.5 * integ((t) => (3 + 2 * Math.cos(t)) ** 2, 0, 2 * Math.PI), 11 * Math.PI)),
      ], write: r`$A = \frac{1}{2}\int_0^{2\pi}(3 + 2\cos\theta)^2d\theta \approx 34.558$.`, trap: 'Leaving out the factor of ½ in the polar area formula.' },
      { label: 'b', q: 'Find dy/dx at θ = π/2.', steps: [
        S(r`$\frac{dy}{d\theta} = r'\sin\theta + r\cos\theta$ at $\theta = \frac{\pi}{2}$.`, ['-2'], 'r = 3 and r′ = −2 sin θ = −2 at π/2.', r`$(-2)(1) + 3(0) = -2$.`),
        S(r`$\frac{dx}{d\theta} = r'\cos\theta - r\sin\theta$ at $\theta = \frac{\pi}{2}$.`, ['-3'], 'Same values.', r`$(-2)(0) - 3(1) = -3$.`),
        S(r`$\frac{dy}{dx}$ at $\theta = \frac{\pi}{2}$.`, ['2/3', '0.667'], 'Divide.', r`$\frac{-2}{-3} = \frac{2}{3}$.`, () => { const x = (t: number) => (3 + 2 * Math.cos(t)) * Math.cos(t), y = (t: number) => (3 + 2 * Math.cos(t)) * Math.sin(t); return near(d(y, Math.PI / 2) / d(x, Math.PI / 2), 2 / 3); }),
      ], write: r`Use $x = r\cos\theta$, $y = r\sin\theta$: $\frac{dy}{dx} = \frac{dy/d\theta}{dx/d\theta} = \frac{-2}{-3} = \frac{2}{3}$.`, trap: 'Reporting dr/dθ as the slope of the curve.' },
      { label: 'c', q: 'Is the particle moving toward or away from the origin at θ = π/2? (Assume θ increases.)', steps: [
        S(r`Find $\frac{dr}{d\theta}$ at $\theta = \frac{\pi}{2}$.`, ['-2'], 'r′ = −2 sin θ.', r`$-2 < 0$ while $r = 3 > 0$, so $r$ is decreasing: moving toward the origin.`),
        S('Is it moving toward the origin? (yes or no)', YES, 'r > 0 and decreasing means the distance to the origin is shrinking.', 'Yes.'),
      ], write: r`"$r(\pi/2) = 3 > 0$ and $r'(\pi/2) = -2 < 0$, so the distance from the origin is decreasing."`, trap: 'Ignoring the sign of r. Distance to the origin is |r|.' },
    ] },
  { id: 'frq-9', units: [10], title: 'A Taylor polynomial and its error', calculator: false,
    setup: r`Let $f(x) = \ln(1 + 2x)$.`,
    parts: [
      { label: 'a', q: 'Find the first three nonzero terms of the Maclaurin series for f.', steps: [
        S(r`Substitute $u = 2x$ into $\ln(1 + u) = u - \frac{u^2}{2} + \frac{u^3}{3} - \cdots$. Coefficient of $x^2$:`, ['-2'], '(2x)²/2 = 2x².', r`$-\frac{(2x)^2}{2} = -2x^2$.`),
        S(r`Coefficient of $x^3$:`, ['8/3', '2.667'], '(2x)³/3.', r`$\frac{8x^3}{3}$, so $f(x) \approx 2x - 2x^2 + \frac{8}{3}x^3$.`, () => near((Math.log(1.02) - 0.02 + 2e-4) / 1e-6, 8 / 3, 2e-2)),
      ], write: r`$f(x) = 2x - 2x^2 + \frac{8}{3}x^3 - \cdots$. Show the substitution into the known series.`, trap: 'Writing 2x − 4x²/2 … and then simplifying wrongly; keep (2x)ⁿ in parentheses.' },
      { label: 'b', q: 'Use the three terms to approximate f(0.1), and bound the error.', steps: [
        S('Approximate f(0.1). (Three decimal places.)', ['0.183'], '0.2 − 0.02 + 0.002667.', r`$\approx 0.18267$.`, () => near(0.2 - 0.02 + (8 / 3) * 0.001, 0.18267, 1e-4)),
        S('Alternating series error bound: the next term in absolute value.', ['0.0004'], 'Next term is (2x)⁴/4 at x = 0.1.', r`$\frac{(0.2)^4}{4} = 0.0004$. The true value $\ln 1.2 \approx 0.18232$ is within it.`, () => Math.abs(Math.log(1.2) - 0.182667) < 0.0004),
      ], write: r`"The series at $x = 0.1$ alternates with terms decreasing to 0, so the error is at most the first omitted term: $\frac{(0.2)^4}{4} = 0.0004$."`, trap: 'Using the alternating error bound without saying the terms alternate and decrease to 0.' },
      { label: 'c', q: 'Find the radius of convergence of the series.', steps: [
        S('Radius of convergence.', ['1/2', '0.5'], 'The series for ln(1 + u) converges for |u| < 1.', r`$|2x| < 1$ gives $|x| < \frac{1}{2}$.`),
      ], write: r`Ratio test (or $|2x| < 1$): radius $\frac{1}{2}$.`, trap: 'Answering 1, the radius for ln(1 + x).' },
    ] },
  { id: 'frq-10', units: [10], title: 'A power series', calculator: false,
    setup: r`Let $f(x) = \displaystyle\sum_{n=1}^\infty\frac{(x - 3)^n}{n\cdot 2^n}$ wherever the series converges.`,
    parts: [
      { label: 'a', q: 'Find the interval of convergence.', steps: [
        S('Radius of convergence from the ratio test.', ['2'], 'The ratio tends to |x − 3|/2.', r`$\frac{|x - 3|}{2} < 1$: radius 2, endpoints 1 and 5.`),
        S('Does the series converge at x = 5? (yes or no)', NO, 'At x = 5 the terms are 1/n.', 'No: the harmonic series diverges.'),
        S('Does the series converge at x = 1? (yes or no)', YES, 'At x = 1 the terms are (−1)ⁿ/n.', 'Yes: the alternating harmonic series converges. Interval $[1, 5)$.', () => near(series((n) => (-1) ** n / n, 1, 20000), -Math.log(2), 1e-3)),
      ], write: r`Ratio test for the radius, then test each endpoint by name: harmonic (diverges) at 5, alternating series test (converges) at 1. Interval $[1, 5)$.`, trap: 'Forgetting to test the endpoints, or testing them without naming a test.' },
      { label: 'b', q: 'Find f′(4).', steps: [
        S(r`Differentiate term by term: $f'(x) = \sum\frac{(x - 3)^{n-1}}{2^n}$. Evaluate at $x = 4$.`, ['1'], 'A geometric series with first term 1/2 and ratio 1/2.', r`$\frac{1/2}{1 - 1/2} = 1$.`, () => near(series((n) => 1 / 2 ** n, 1, 80), 1)),
      ], write: r`$f'(4) = \sum_{n=1}^\infty\frac{1}{2^n} = \frac{1/2}{1 - 1/2} = 1$.`, trap: 'Differentiating 1/n · (x − 3)ⁿ incorrectly; the n cancels.' },
      { label: 'c', q: 'Find f(4) exactly.', steps: [
        S(r`$f(4) = \sum\frac{1}{n2^n}$. Recognize it as $-\ln(1 - \frac{1}{2})$. (Three decimal places.)`, ['0.693'], 'Σ uⁿ/n = −ln(1 − u).', r`$= \ln 2 \approx 0.693$.`, () => near(series((n) => 1 / (n * 2 ** n), 1, 80), Math.log(2))),
      ], write: r`$f(4) = \sum\frac{(1/2)^n}{n} = -\ln\left(1 - \frac{1}{2}\right) = \ln 2$.`, trap: 'Confusing Σ uⁿ/n with the geometric series Σ uⁿ.' },
    ] },
  { id: 'frq-11', units: [3, 4], title: 'Implicit differentiation and linear approximation', calculator: false,
    setup: r`Consider the curve $x^2 + 3xy + y^2 = 11$, which passes through $(1, 2)$.`,
    parts: [
      { label: 'a', q: 'Find dy/dx at (1, 2).', steps: [
        S(r`Differentiating gives $2x + 3y + 3xy' + 2yy' = 0$. Solve for $y'$ at $(1, 2)$.`, ['-8/7', '-1.143'], 'Group the y′ terms: y′(3x + 2y) = −(2x + 3y).', r`$y' = -\frac{2 + 6}{3 + 4} = -\frac{8}{7}$.`, () => { const y = (x: number) => (-3 * x + Math.sqrt(9 * x * x - 4 * (x * x - 11))) / 2; return near(y(1), 2) && near(d(y, 1), -8 / 7); }),
      ], write: r`Show the implicit derivative with the product rule on $3xy$, then substitute: $\frac{dy}{dx} = -\frac{2x + 3y}{3x + 2y} = -\frac{8}{7}$.`, trap: 'Differentiating 3xy as 3y′ (missing the product rule).' },
      { label: 'b', q: 'Use the tangent line at (1, 2) to approximate y when x = 1.1.', steps: [
        S('Approximate y at x = 1.1. (Three decimal places.)', ['1.886'], 'y ≈ 2 + (−8/7)(0.1).', r`$2 - \frac{0.8}{7} \approx 1.886$.`, () => near(2 - 0.8 / 7, 1.8857, 1e-4)),
      ], write: r`$y \approx 2 - \frac{8}{7}(1.1 - 1) \approx 1.886$.`, trap: 'Using the slope at x = 1.1 instead of at the known point.' },
      { label: 'c', q: 'Does the curve have any horizontal tangent lines?', steps: [
        S('Horizontal tangents need 2x + 3y = 0, so y = −2x/3. Substituting gives (−5/9)x² = 11. How many real solutions?', ['0'], 'A negative times x² cannot equal 11.', r`$-\frac{5}{9}x^2 = 11$ has no real solution, so there are no horizontal tangents.`),
      ], write: r`Set the numerator $2x + 3y = 0$, substitute into the curve, and show the resulting equation has no real solutions.`, trap: 'Stopping at y = −2x/3 without checking that such points lie on the curve.' },
    ] },
  { id: 'frq-12', units: [4, 5], title: 'An inscribed rectangle', calculator: false,
    setup: r`A rectangle has its base on the $x$-axis and its upper corners on $y = 12 - x^2$, at $(\pm x, 12 - x^2)$ with $0 < x < \sqrt{12}$.`,
    parts: [
      { label: 'a', q: 'If x increases at 0.5 units per second, how fast is the area changing when x = 1?', steps: [
        S(r`Write $A(x) = 2x(12 - x^2) = 24x - 2x^3$. Find $A'(1)$.`, ['18'], 'A′(x) = 24 − 6x².', r`$A'(1) = 18$.`, () => near(d((x) => 24 * x - 2 * x ** 3, 1), 18)),
        S(r`$\frac{dA}{dt} = A'(x)\frac{dx}{dt}$ at $x = 1$.`, ['9'], 'Chain rule.', r`$18 \cdot 0.5 = 9$ square units per second.`),
      ], write: r`$\frac{dA}{dt} = (24 - 6x^2)\frac{dx}{dt} = 18(0.5) = 9$ square units per second.`, trap: 'Forgetting the factor dx/dt.' },
      { label: 'b', q: 'Find the maximum possible area. Justify that it is a maximum.', steps: [
        S(r`Solve $A'(x) = 0$ on the domain.`, ['2'], '24 − 6x² = 0.', r`$x = 2$; $A''(x) = -12x < 0$ there, so it is a maximum.`, () => near(d((x) => 24 * x - 2 * x ** 3, 2), 0)),
        S('The maximum area.', ['32'], 'A(2).', r`$A(2) = 4 \cdot 8 = 32$.`, () => 2 * 2 * (12 - 4) === 32),
      ], write: r`"$A'(2) = 0$ and $A''(2) = -24 < 0$ (or $A'$ changes from positive to negative), so $A(2) = 32$ is the maximum."`, trap: 'Finding x = 2 but never justifying that it gives a maximum.' },
    ] },
];
/** the workouts with their full explanations and formula links attached */
export const CALC_FRQS: Frq[] = WORKOUTS.map((f) => ({ ...f, parts: f.parts.map((p) => ({ ...p, steps: p.steps.map((s, i) => { const k = `${f.id}|${p.label}|${i}`; return { ...s, explain: FRQ_FULL[k] ?? s.explain, formula: s.formula ?? FRQ_FORMULA[k] }; }) })) }));
export const CALC_FRQ: Record<string, Frq> = Object.fromEntries(CALC_FRQS.map((f) => [f.id, f]));
