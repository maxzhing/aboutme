/**
 * Formula anatomy for AP Calculus BC. Every formula is taken apart symbol by symbol, read aloud in words,
 * and shown in the different disguises it wears on the exam, so a student never has to wonder what a
 * piece means or when to use it. Guided free-response steps link to these by id.
 */
export interface Formula {
  id: string;
  name: string;
  /** the formula in LaTeX */
  tex: string;
  /** how to say it in plain words */
  read: string;
  /** every piece of the formula and what it means */
  parts: { piece: string; means: string }[];
  /** the different ways the same formula is used on the exam */
  ways: { when: string; how: string }[];
  /** the mistake that costs the most points */
  trap: string;
}

const r = String.raw;

export const CALC_FORMULAS: Formula[] = [
  { id: 'avg-rate', name: 'Average rate of change', tex: r`\dfrac{f(b) - f(a)}{b - a}`, read: 'How much the output changed, divided by how much the input changed.',
    parts: [
      { piece: r`$f(b) - f(a)$`, means: 'The total change in the quantity between the two times: the value at the end minus the value at the start. Its sign tells you whether the quantity went up (positive) or down (negative).' },
      { piece: r`$b - a$`, means: 'The length of the interval: how much time (or input) passed. Always end minus start, in the same order as the top.' },
      { piece: 'the whole fraction', means: 'The slope of the straight line (the secant line) joining the two points. Its units are output units per input unit, for example words per minute per minute.' },
    ],
    ways: [
      { when: 'A table asks you to estimate a derivative such as P′(3).', how: r`Use the two table values that bracket the point: $P'(3) \approx \frac{P(4) - P(2)}{4 - 2}$. This is an estimate, so write "≈".` },
      { when: 'The Mean Value Theorem asks whether f′(c) equals some number.', how: 'Compute this fraction on the interval; MVT says the derivative hits exactly this value somewhere inside.' },
      { when: 'A question asks for the "average rate of change" of a formula over an interval.', how: r`Plug the endpoints into the function itself (not its derivative): $\frac{A(6) - A(0)}{6 - 0}$.` },
    ],
    trap: 'Using it with the derivative’s values instead of the function’s, or mixing the order (f(b) − f(a) over a − b), which flips the sign.' },
  { id: 'tangent-line', name: 'Tangent line (linear approximation)', tex: r`y = f(a) + f'(a)(x - a)`, read: 'Start at the known value, then add slope times how far you move.',
    parts: [
      { piece: r`$a$`, means: 'The point where you know everything: the input where you know both the value and the slope.' },
      { piece: r`$f(a)$`, means: 'The height of the curve at that known point: where the line starts.' },
      { piece: r`$f'(a)$`, means: 'The slope of the curve at that point: how fast the output changes per unit of input there.' },
      { piece: r`$(x - a)$`, means: 'How far you step away from the known point. It can be negative if you step left.' },
      { piece: r`$f'(a)(x - a)$`, means: 'The predicted change in output: slope times step. Added to f(a) it gives the approximation.' },
    ],
    ways: [
      { when: 'Approximate a value such as T(3) from T(0) and dT/dt at t = 0.', how: r`$T(3) \approx T(0) + T'(0)(3 - 0)$.` },
      { when: 'Decide whether the approximation is too big or too small.', how: 'Check concavity near a: concave up means the curve lies above the tangent line, so the tangent line underestimates; concave down means it overestimates.' },
      { when: 'Euler’s method.', how: 'Euler’s method is this formula used again and again with short steps.' },
    ],
    trap: 'Using the slope at the new point instead of at the known point a.' },
  { id: 'mvt', name: 'Mean Value Theorem', tex: r`f'(c) = \dfrac{f(b) - f(a)}{b - a}\ \text{ for some } c \text{ in } (a, b)`, read: 'If a smooth function goes from one value to another, at some moment its instantaneous rate equals its average rate.',
    parts: [
      { piece: 'hypotheses', means: 'f must be continuous on [a, b] and differentiable on (a, b). A problem that says "differentiable" gives you both, because differentiable implies continuous. You must say this in your answer.' },
      { piece: r`$c$`, means: 'An unknown input strictly between a and b. The theorem promises it exists; it does not tell you where.' },
      { piece: r`$f'(c)$`, means: 'The instantaneous rate of change at that unknown moment.' },
      { piece: 'right side', means: 'The average rate of change over the whole interval (see the average-rate formula).' },
    ],
    ways: [
      { when: '"Must there be a time when f′(c) = 0?" and f(a) = f(b).', how: 'The average rate is 0, so MVT (this special case is Rolle’s theorem) guarantees f′(c) = 0.' },
      { when: '"Must there be a time when the acceleration is −2?"', how: 'Acceleration is the derivative of velocity, so apply MVT to velocity on an interval whose average rate of change is −2.' },
      { when: 'The question asks for a value of the function, not its derivative.', how: 'That is the Intermediate Value Theorem, not MVT. Use IVT instead.' },
    ],
    trap: 'Writing "by MVT" without stating that the function is differentiable (and therefore continuous) on the interval. The justification point is lost.' },
  { id: 'ivt', name: 'Intermediate Value Theorem', tex: r`f(a) < k < f(b) \implies f(c) = k \text{ for some } c \text{ in } (a, b)`, read: 'A continuous function cannot jump over a value: to get from one height to another it must pass through every height in between.',
    parts: [
      { piece: 'continuous on [a, b]', means: 'The only hypothesis, and you must state it. "Differentiable" in the problem gives you continuity.' },
      { piece: r`$k$`, means: 'The target value of the function (for example 40 liters per hour, or D(t) = 0).' },
      { piece: r`$f(a)$, $f(b)$`, means: 'Two known values on opposite sides of k. You must show that k is between them.' },
    ],
    ways: [
      { when: 'Must W(c) = 40 for some c? A table shows W(3) = 32 and W(5) = 47.', how: '32 < 40 < 47 and W is continuous, so yes.' },
      { when: 'Is there a time when D(t) = 0?', how: 'Show D is positive at one time and negative at another, then apply IVT.' },
    ],
    trap: 'Confusing it with MVT. IVT is about values of the function; MVT is about values of the derivative.' },
  { id: 'net-change', name: 'Net change (Fundamental Theorem, part 2)', tex: r`F(b) = F(a) + \int_a^b F'(t)\,dt`, read: 'The amount at the end equals the amount at the start plus everything the rate added in between.',
    parts: [
      { piece: r`$F(a)$`, means: 'The starting amount, given in the problem (initial condition). Forgetting it is the most common lost point.' },
      { piece: r`$F'(t)$`, means: 'The rate at which the amount changes: gallons per hour, birds per day, velocity.' },
      { piece: r`$\int_a^b F'(t)\,dt$`, means: 'The total change from a to b: the signed area under the rate graph. Its units are rate units × time units.' },
      { piece: r`$F(b)$`, means: 'The amount at the end time b.' },
    ],
    ways: [
      { when: 'Position of a particle at a later time.', how: r`$x(5) = x(0) + \int_0^5 v(t)\,dt$.` },
      { when: 'A value of f from a graph of f′.', how: r`$f(5) = f(1) + \int_1^5 f'(x)\,dx$, using areas (triangles, semicircles) under the graph of f′. Going left, $f(-3) = f(1) - \int_{-3}^1 f'(x)\,dx$.` },
      { when: 'Interpret an integral of a rate in words.', how: r`"$\int_{2}^{6} R(t)\,dt$ is the total number of liters of water that flow into the tank from t = 2 to t = 6 hours." Name the quantity, the units and the time interval.` },
    ],
    trap: 'Reporting only the integral (the change) when the question asks for the amount.' },
  { id: 'ftc1', name: 'Derivative of an accumulation function (Fundamental Theorem, part 1)', tex: r`\dfrac{d}{dx}\int_a^{u(x)} f(t)\,dt = f\big(u(x)\big)\cdot u'(x)`, read: 'The rate at which accumulated area grows is the height of the function at the moving edge (times the speed of the edge).',
    parts: [
      { piece: r`$a$`, means: 'A fixed lower limit. It does not affect the derivative at all.' },
      { piece: r`$u(x)$`, means: 'The moving upper limit. If it is just x, then u′(x) = 1.' },
      { piece: r`$f(u(x))$`, means: 'The integrand evaluated at the upper limit.' },
      { piece: r`$u'(x)$`, means: 'The chain-rule factor: how fast the upper limit moves.' },
    ],
    ways: [
      { when: r`$g(x) = \int_2^x f(t)\,dt$ and you need $g'(5)$.`, how: r`$g'(5) = f(5)$: read it from the graph of f.` },
      { when: 'Where does g have a point of inflection?', how: 'g″ = f′, so g has an inflection point wherever f changes from increasing to decreasing or the reverse.' },
      { when: r`$Q(t) = P(t) - \int_1^t \sqrt{x}\,dx$.`, how: r`$Q'(t) = P'(t) - \sqrt{t}$.` },
    ],
    trap: 'Integrating instead of evaluating, or forgetting the chain-rule factor u′(x) when the upper limit is not plain x.' },
  { id: 'avg-value', name: 'Average value of a function', tex: r`f_{\text{avg}} = \dfrac{1}{b - a}\int_a^b f(x)\,dx`, read: 'Total accumulated amount divided by the length of the interval.',
    parts: [
      { piece: r`$\int_a^b f(x)\,dx$`, means: 'The total of f over the interval (the area under its graph).' },
      { piece: r`$\dfrac{1}{b - a}$`, means: 'Divide by the length of the interval to spread that total evenly.' },
      { piece: r`$f_{\text{avg}}$`, means: 'The constant height that would give the same total: the rectangle with the same area.' },
    ],
    ways: [
      { when: 'Average rate of flow R(t) on [0, 8].', how: r`$\frac{1}{8}\int_0^{8} R(t)\,dt$: the function being averaged is the rate itself.` },
      { when: 'Average population P(t) on [0, 10].', how: r`$\frac{1}{10}\int_0^{10} P(t)\,dt$.` },
      { when: 'Average distance from the origin on a polar curve.', how: r`$\frac{1}{\beta - \alpha}\int_\alpha^\beta r(\theta)\,d\theta$: the "function" is r.` },
    ],
    trap: 'Confusing average VALUE (integral divided by length) with average RATE OF CHANGE (difference of endpoint values divided by length).' },
  { id: 'riemann', name: 'Riemann and trapezoidal sums', tex: r`\text{Trap} = \sum \frac{\Delta x_i}{2}\big(f(x_{i-1}) + f(x_i)\big),\quad \text{Mid} = \sum \Delta x_i\, f(m_i)`, read: 'Chop the interval into pieces, approximate each piece’s area by a shape, and add.',
    parts: [
      { piece: r`$\Delta x_i$`, means: 'The width of piece i. In tables the widths are often unequal: compute each one.' },
      { piece: r`$f(x_{i-1}),\ f(x_i)$`, means: 'The heights at the left and right edges of piece i (trapezoid uses both, left sum uses the left one, right sum the right one).' },
      { piece: r`$m_i$`, means: 'The midpoint of piece i, used by a midpoint sum; its value must be in the table.' },
    ],
    ways: [
      { when: 'Right Riemann sum on [0, 2], [2, 5], [5, 6].', how: r`$2 f(2) + 3 f(5) + 1 f(6)$.` },
      { when: 'Trapezoidal sum from a table.', how: 'Width × average of the two heights for every piece, then add.' },
      { when: 'Midpoint sum on [0, 4], [4, 8].', how: r`$4R(2) + 4R(6)$.` },
    ],
    trap: 'Assuming equal widths, or using the wrong endpoint (left vs right).' },
  { id: 'lhopital', name: 'L’Hôpital’s rule', tex: r`\lim_{x\to a}\frac{f(x)}{g(x)} = \lim_{x\to a}\frac{f'(x)}{g'(x)}\quad\text{when the limit is } \tfrac{0}{0} \text{ or } \tfrac{\infty}{\infty}`, read: 'If top and bottom both go to 0 (or both blow up), compare how fast they change instead.',
    parts: [
      { piece: 'the condition', means: 'You must show the form is 0/0 or ∞/∞ first, in writing. Without it, the rule does not apply and the point is lost.' },
      { piece: r`$f'(x),\ g'(x)$`, means: 'Differentiate top and bottom separately. This is NOT the quotient rule.' },
    ],
    ways: [
      { when: r`$\lim_{x\to 3}\frac{2f(x) - x}{x^2 - 9}$ with $f(3) = 1.5$ and f known only through a graph.`, how: r`Show the top is $2(1.5) - 3 = 0$ and the bottom is 0; then the limit is $\frac{2f'(3) - 1}{2(3)}$, read from the graph.` },
    ],
    trap: 'Skipping the check that the limit is indeterminate, or applying the quotient rule.' },
  { id: 'volume', name: 'Volumes by discs, washers and cross sections', tex: r`V = \pi\int_a^b\big(R(x)^2 - r(x)^2\big)\,dx \qquad V = \int_a^b A(x)\,dx`, read: 'Add up the volumes of thin slices.',
    parts: [
      { piece: r`$R(x)$`, means: 'Outer radius: distance from the axis of rotation to the far edge of the region.' },
      { piece: r`$r(x)$`, means: 'Inner radius: distance from the axis to the near edge (0 if the region touches the axis, giving a disc).' },
      { piece: r`$\pi(R^2 - r^2)$`, means: 'Area of one washer-shaped slice. Square each radius separately.' },
      { piece: r`$A(x)$`, means: 'For known cross sections (squares, semicircles): the area of one slice, built from the slice’s width.' },
    ],
    ways: [
      { when: 'Region between y = f(x) and the x-axis on [0, 4] rotated about the x-axis.', how: r`$\pi\int_0^4 f(x)^2\,dx$.` },
      { when: 'Square cross sections perpendicular to the x-axis.', how: r`$\int(\text{top} - \text{bottom})^2\,dx$, with no π.` },
    ],
    trap: 'Writing (R − r)² instead of R² − r², or putting π in a cross-section volume.' },
  { id: 'arc-length', name: 'Arc length and distance traveled', tex: r`L = \int_a^b\sqrt{1 + \big(f'(x)\big)^2}\,dx \qquad D = \int_a^b\sqrt{\big(x'(t)\big)^2 + \big(y'(t)\big)^2}\,dt`, read: 'Add up tiny hypotenuses along the curve.',
    parts: [
      { piece: r`$f'(x)$`, means: 'Slope of the curve: rise per unit of run along each tiny piece.' },
      { piece: r`$\sqrt{1 + (f')^2}$`, means: 'The length of a tiny hypotenuse whose run is 1 and whose rise is f′.' },
      { piece: r`$\sqrt{x'^2 + y'^2}$`, means: 'The speed of a particle moving along a parametric path; integrating speed over time gives distance traveled.' },
    ],
    ways: [
      { when: 'Total distance traveled by a particle with given x′(t) and y′(t).', how: 'Integrate the speed from start time to end time.' },
      { when: 'Perimeter of a region with a curved edge.', how: 'Arc length of the curved part plus the lengths of the straight edges.' },
      { when: 'Find when the speed equals a value.', how: r`Set $\sqrt{x'(t)^2 + y'(t)^2}$ equal to that value and solve on the calculator.` },
    ],
    trap: 'Computing the straight-line distance between endpoints, or forgetting the square root.' },
  { id: 'param-slope', name: 'Slope and acceleration for parametric and vector motion', tex: r`\frac{dy}{dx} = \frac{dy/dt}{dx/dt}, \qquad \vec a(t) = \langle x''(t),\ y''(t)\rangle`, read: 'Slope is vertical speed over horizontal speed; acceleration differentiates each coordinate twice.',
    parts: [
      { piece: r`$dy/dt,\ dx/dt$`, means: 'How fast y and x change with time: the components of velocity.' },
      { piece: r`$\frac{dy/dt}{dx/dt}$`, means: 'The slope of the path at that moment (rise over run).' },
      { piece: r`$x''(t),\ y''(t)$`, means: 'The components of acceleration: derivative of each velocity component.' },
    ],
    ways: [
      { when: 'Acceleration vector when x′(t) is given and y(t) is given.', how: 'Differentiate x′ once and y twice.' },
      { when: 'x-coordinate at a later time when only x′ is given.', how: r`Net change: $x(1) = x(0) + \int_0^1 x'(t)\,dt$.` },
    ],
    trap: 'Dividing dx/dt by dy/dt (upside down).' },
  { id: 'polar', name: 'Polar area, polar coordinates and polar rates', tex: r`A = \frac{1}{2}\int_\alpha^\beta r^2\,d\theta,\quad x = r\cos\theta,\ y = r\sin\theta`, read: 'Polar area adds up thin pizza slices; x and y come from r and θ.',
    parts: [
      { piece: r`$\frac{1}{2}r^2\,d\theta$`, means: 'Area of a thin sector of radius r and angle dθ.' },
      { piece: r`$\alpha, \beta$`, means: 'The angles where the region starts and stops; for "inside one curve and outside another" they are where the curves meet.' },
      { piece: r`$x = r\cos\theta$`, means: 'Horizontal position (distance from the y-axis is |x|).' },
      { piece: r`$\frac{dr}{d\theta}$`, means: 'How fast the distance from the origin changes as θ grows. With θ depending on time, dr/dt = (dr/dθ)(dθ/dt).' },
    ],
    ways: [
      { when: 'Area inside r = 2 + 2 cos θ and outside r = 3.', how: r`The curves meet at $\theta = \pm\frac{\pi}{3}$: $\frac{1}{2}\int_{-\pi/3}^{\pi/3}\left((2 + 2\cos\theta)^2 - 3^2\right)d\theta$.` },
      { when: 'Point farthest from the y-axis.', how: r`Maximize $x(\theta) = r\cos\theta$: set $dx/d\theta = 0$ and check.` },
      { when: 'Rate the distance from the origin changes in time.', how: r`$\frac{dr}{dt} = \frac{dr}{d\theta}\cdot\frac{d\theta}{dt}$.` },
    ],
    trap: 'Forgetting the ½, or subtracting radii before squaring.' },
  { id: 'separation', name: 'Separation of variables', tex: r`\frac{dy}{dx} = g(x)h(y) \;\Rightarrow\; \int\frac{dy}{h(y)} = \int g(x)\,dx`, read: 'Get every y on one side and every x on the other, integrate both, then use the starting point.',
    parts: [
      { piece: 'separate', means: 'Move all y terms (with dy) to one side and all x terms (with dx) to the other.' },
      { piece: r`$+\,C$`, means: 'The constant of integration. It is required, and you find it with the initial condition. Leaving it out forfeits most of the points.' },
      { piece: 'solve for y', means: 'Exponentiate and isolate y; drop the absolute value using the sign known from the problem.' },
    ],
    ways: [
      { when: r`$\frac{dT}{dt} = \frac{1}{5}(90 - T)$, $T(0) = 10$.`, how: r`$-\ln(90 - T) = \frac{t}{5} + C$ ⇒ $T = 90 - 80e^{-t/5}$.` },
      { when: r`$\frac{dy}{dt} = -\frac{1}{10}(y - 30)$, $y(0) = 100$.`, how: r`$y = 30 + 70e^{-t/10}$.` },
    ],
    trap: 'Forgetting +C, or adding it after exponentiating the wrong way.' },
  { id: 'euler', name: 'Euler’s method', tex: r`y_{\text{new}} = y_{\text{old}} + \Delta x\cdot\frac{dy}{dx}\Big|_{(x_{\text{old}},\,y_{\text{old}})}`, read: 'Take a short step along the tangent line, then recompute the slope and repeat.',
    parts: [
      { piece: r`$\Delta x$`, means: 'Step size. "Two steps of equal size from 1 to 1.4" means Δx = 0.2.' },
      { piece: r`$\frac{dy}{dx}$ at the old point`, means: 'The slope from the differential equation, evaluated where you are now, not where you are going.' },
    ],
    ways: [
      { when: 'Two steps of size 0.5 from (0, 2).', how: 'Step 1 uses the slope at (0, 2); step 2 uses the slope at (0.5, new y).' },
    ],
    trap: 'Using the slope at the new point, or the wrong step size.' },
  { id: 'taylor', name: 'Taylor polynomial', tex: r`P_n(x) = \sum_{k=0}^n\frac{f^{(k)}(a)}{k!}(x - a)^k`, read: 'Match the function’s value and its first n derivatives at the center a.',
    parts: [
      { piece: r`$a$`, means: 'The center: where all the derivatives are known.' },
      { piece: r`$f^{(k)}(a)$`, means: 'The k-th derivative evaluated at the center (k = 0 is the function value).' },
      { piece: r`$k!$`, means: 'k factorial (1, 1, 2, 6, 24, …). Dividing by it is what makes the polynomial’s derivatives match f’s.' },
      { piece: r`$(x - a)^k$`, means: 'Powers of the distance from the center, not powers of x (unless a = 0).' },
    ],
    ways: [
      { when: 'Derivatives given by formulas in terms of f itself, such as f″(x) = x·f(x).', how: 'Evaluate each derivative at the center using the earlier values, then divide by k!.' },
      { when: 'Second-degree polynomial for g when g′ is given.', how: 'g(a) is given; g′(a) comes from the formula; g″ needs the product rule on g′.' },
      { when: 'Derivatives come from a differential equation.', how: 'f′(1) is the slope at the point; f″ comes from differentiating dy/dx implicitly.' },
    ],
    trap: 'Forgetting to divide by k!, or writing xᵏ instead of (x − a)ᵏ.' },
  { id: 'lagrange', name: 'Lagrange error bound', tex: r`\big|f(x) - P_n(x)\big| \le \frac{\max\big|f^{(n+1)}\big|}{(n+1)!}\,|x - a|^{n+1}`, read: 'The error is at most the biggest possible next derivative times the next term’s shape.',
    parts: [
      { piece: r`$n$`, means: 'The degree of the polynomial you used.' },
      { piece: r`$\max|f^{(n+1)}|$`, means: 'The largest size of the NEXT derivative on the interval between a and x. The problem usually gives it ("≤ 15").' },
      { piece: r`$(n+1)!$`, means: 'Factorial of one more than the degree.' },
      { piece: r`$|x - a|^{n+1}$`, means: 'How far you are from the center, to the power one more than the degree.' },
    ],
    ways: [
      { when: 'Third-degree polynomial about 0, |f⁽⁴⁾| ≤ 8, x = 0.2.', how: r`$\frac{8}{4!}(0.2)^4 = \frac{8}{24}(0.0016) \approx 0.000533$.` },
      { when: 'Second-degree polynomial about x = 2, |f‴| ≤ 12, x = 2.3.', how: r`$\frac{12}{3!}(0.3)^3 = 2(0.027) = 0.054$.` },
    ],
    trap: 'Using the n-th derivative instead of the (n + 1)-th, or the wrong factorial.' },
  { id: 'alt-error', name: 'Alternating series error bound', tex: r`\big|S - S_n\big| \le |a_{n+1}|`, read: 'For an alternating series with terms shrinking to 0, the error is at most the first term you left out.',
    parts: [
      { piece: 'conditions', means: 'The terms must alternate in sign, decrease in size, and go to 0. Say so in your justification.' },
      { piece: r`$|a_{n+1}|$`, means: 'The size of the first omitted term.' },
    ],
    ways: [
      { when: 'A degree-2 Taylor polynomial of an alternating series approximates f(1/2).', how: 'The error is at most the size of the degree-3 term at x = 1/2.' },
    ],
    trap: 'Using it for a series that does not alternate (use Lagrange instead).' },
  { id: 'ratio', name: 'Ratio test and interval of convergence', tex: r`\lim_{n\to\infty}\left|\frac{a_{n+1}}{a_n}\right| < 1`, read: 'If each term is eventually a fixed fraction smaller than the one before, the series converges.',
    parts: [
      { piece: r`$\left|\frac{a_{n+1}}{a_n}\right|$`, means: 'The ratio of the next term to the current term, in absolute value. For power series it simplifies to |x − a| times a number.' },
      { piece: '< 1', means: 'Gives an open interval centered at a. The radius is half its length.' },
      { piece: 'endpoints', means: 'The ratio test says nothing when the limit equals 1, so you must test each endpoint separately with another test (p-series, alternating series test, nth-term test).' },
    ],
    ways: [
      { when: r`$\sum\frac{(x - 2)^n}{n\cdot 5^n}$.`, how: r`Ratio → $\frac{|x - 2|}{5} < 1$ ⇒ $-3 < x < 7$; at $x = 7$ the harmonic series diverges; at $x = -3$ the alternating harmonic series converges. Interval $[-3, 7)$.` },
    ],
    trap: 'Stopping at the open interval and never testing the endpoints.' },
  { id: 'geometric', name: 'Geometric series', tex: r`\sum_{n=0}^\infty a r^n = \frac{a}{1 - r}\quad (|r| < 1)`, read: 'First term divided by one minus the ratio, as long as the ratio is between −1 and 1.',
    parts: [
      { piece: r`$a$`, means: 'The first term of the series (plug in the starting n).' },
      { piece: r`$r$`, means: 'The common ratio: what you multiply by to get from one term to the next. It may contain x.' },
      { piece: r`$|r| < 1$`, means: 'The condition for convergence. It also gives the interval of convergence of a power series.' },
    ],
    ways: [
      { when: r`$h(x) = \sum_{n=0}^\infty 3\left(\frac{x}{4}\right)^n$, find $h(2)$.`, how: r`$a = 3$, $r = \frac{2}{4} = \frac{1}{2}$, so $h(2) = \frac{3}{1 - 1/2} = 6$.` },
      { when: r`A series starting at n = 1: $\sum_{n=1}^\infty\left(\frac{x}{2}\right)^n$.`, how: r`First term $\frac{x}{2}$, ratio $\frac{x}{2}$: $\frac{x/2}{1 - x/2} = \frac{x}{2 - x}$ for $|x| < 2$.` },
    ],
    trap: 'Using the wrong first term when the sum does not start at n = 0.' },
  { id: 'parts', name: 'Integration by parts', tex: r`\int u\,dv = uv - \int v\,du`, read: 'Trade an integral you cannot do for one you can.',
    parts: [
      { piece: r`$u$`, means: 'The piece that gets simpler when differentiated (polynomials, logarithms).' },
      { piece: r`$dv$`, means: 'The piece you can integrate (here, often f′(x) dx).' },
      { piece: r`$uv$`, means: 'Evaluate between the limits for a definite integral.' },
    ],
    ways: [
      { when: r`$\int_0^4 x f'(x)\,dx$ with $f(4) = 5$ and $\int_0^4 f(x)\,dx = 12$ known.`, how: r`$u = x$, $dv = f'(x)\,dx$: $[xf(x)]_0^4 - \int_0^4 f(x)\,dx = 4\cdot 5 - 12 = 8$.` },
    ],
    trap: 'Choosing u and dv the wrong way round, so the new integral is harder.' },
  { id: 'improper', name: 'Improper integrals', tex: r`\int_a^\infty f(x)\,dx = \lim_{b\to\infty}\int_a^b f(x)\,dx`, read: 'Integrate to a finite b, then let b run to infinity.',
    parts: [
      { piece: r`$b$`, means: 'A temporary finite upper limit. You must write the limit with b; writing ∞ directly into the antiderivative is not accepted.' },
      { piece: r`$\lim_{b\to\infty}$`, means: 'If this limit is a finite number, the integral converges to it; otherwise it diverges.' },
    ],
    ways: [
      { when: r`$\int_1^\infty\frac{6}{(2 + x)^2}dx$.`, how: r`$\lim_{b\to\infty}\left[-\frac{6}{2 + x}\right]_1^b = 0 + 2 = 2$.` },
      { when: r`$\int_0^\infty e^{-3x}\,dx$.`, how: r`$\lim_{b\to\infty}\left[-\tfrac{1}{3}e^{-3x}\right]_0^b = \frac{1}{3}$.` },
    ],
    trap: 'Plugging ∞ in without writing the limit.' },
];
export const CALC_FORMULA: Record<string, Formula> = Object.fromEntries(CALC_FORMULAS.map((f) => [f.id, f]));
