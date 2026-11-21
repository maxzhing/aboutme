/**
 * Full explanations and formula links for the original guided free-response workouts (frq.ts).
 * Each explanation says what is being found, why that method, what every number means, and how to say it.
 * Keyed by "workout id|part|step index".
 */
const r = String.raw;

export const FRQ_FORMULA: Record<string, string> = {
  'frq-1|a|0': 'net-change', 'frq-1|c|0': 'net-change', 'frq-1|c|1': 'net-change', 'frq-1|d|0': 'net-change', 'frq-1|d|1': 'net-change',
  'frq-2|c|0': 'net-change', 'frq-2|c|1': 'net-change', 'frq-2|d|0': 'arc-length', 'frq-2|d|1': 'arc-length', 'frq-2|d|2': 'arc-length',
  'frq-3|a|0': 'avg-rate', 'frq-3|b|0': 'riemann', 'frq-3|b|1': 'riemann', 'frq-3|b|2': 'riemann', 'frq-3|c|0': 'avg-rate', 'frq-3|c|1': 'mvt',
  'frq-4|c|0': 'net-change', 'frq-4|c|1': 'net-change',
  'frq-5|b|0': 'euler', 'frq-5|b|1': 'euler', 'frq-5|c|0': 'separation', 'frq-5|c|1': 'separation',
  'frq-6|b|0': 'volume', 'frq-6|c|0': 'volume',
  'frq-7|a|0': 'arc-length', 'frq-7|b|0': 'net-change', 'frq-7|b|1': 'net-change', 'frq-7|c|0': 'arc-length',
  'frq-8|a|0': 'polar', 'frq-8|b|0': 'polar', 'frq-8|b|1': 'polar', 'frq-8|b|2': 'param-slope', 'frq-8|c|0': 'polar',
  'frq-9|a|0': 'taylor', 'frq-9|a|1': 'taylor', 'frq-9|b|1': 'alt-error', 'frq-9|c|0': 'ratio',
  'frq-10|a|0': 'ratio', 'frq-10|b|0': 'geometric', 'frq-10|c|0': 'geometric',
  'frq-11|b|0': 'tangent-line',
};

export const FRQ_FULL: Record<string, string> = {
  'frq-1|a|0': r`$\int_0^8E(t)\,dt \approx 70.615$ gallons.

$E(t)$ is a rate in gallons per hour. Integrating a rate over a time interval adds up "rate × tiny time" pieces, so the result is an amount: gallons. The limits 0 and 8 are the start and end of the time window the question names. Use radian mode for the sine.`,
  'frq-1|b|0': r`$E(6) = 8 + 2\sin\left(\frac{6}{2}\right) = 8 + 2\sin 3 \approx 8.282$ gallons per hour.

This is how fast water is coming IN at the moment $t = 6$. It is a rate, not an amount, so you just evaluate the formula; no integral is needed for a question about one instant.`,
  'frq-1|b|1': r`$L(6) = 0.5(6) + 4 = 7$ gallons per hour.

This is how fast water is going OUT at $t = 6$. The amount in the tank changes at the net rate (in minus out), which is what decides increasing or decreasing in the next step.`,
  'frq-1|b|2': r`Yes: $E(6) - L(6) \approx 8.282 - 7 = 1.282 > 0$.

If $A(t)$ is the amount in the tank, then $A'(t) = E(t) - L(t)$. A positive derivative means the amount is increasing. The justification must compare the two rates (or state the sign of $A'(6)$); "water is flowing in" alone is not a reason.`,
  'frq-1|c|0': r`$\int_0^8(0.5t + 4)\,dt = \left[\frac{t^2}{4} + 4t\right]_0^8 = 16 + 32 = 48$ gallons.

This is the total that drains OUT in 8 hours. Antiderivative term by term: $0.5t \to 0.5\cdot\frac{t^2}{2} = \frac{t^2}{4}$, and $4 \to 4t$. At $t = 8$: $\frac{64}{4} + 32 = 48$; at 0 both are 0.`,
  'frq-1|c|1': r`$A(8) = 50 + 70.615 - 48 = 72.615$ gallons.

Net change: amount at the end = amount at the start (50) + water in ($\int_0^8E$) − water out ($\int_0^8L$). Writing it as one expression, $50 + \int_0^8(E(t) - L(t))\,dt$, is the cleanest setup to show.`,
  'frq-1|d|0': r`$E(t) = L(t)$ at $t \approx 6.861$.

The amount $A$ is largest where $A'(t) = E(t) - L(t)$ changes from positive (filling) to negative (draining). Graph $y = E(t) - L(t)$ on the calculator and find its zero in $(0, 8)$. Before 6.861 more water comes in than goes out; after it, less.`,
  'frq-1|d|1': r`$A(6.861) = 50 + \int_0^{6.861}(E(t) - L(t))\,dt \approx 73.510$ gallons.

Candidates test: compare the amount at the critical time with the amounts at both endpoints, $A(0) = 50$ and $A(8) \approx 72.615$. The largest of the three, 73.510 at $t \approx 6.861$, is the absolute maximum.`,
  'frq-2|a|0': r`$t = 2$.

"At rest" means velocity is zero. $t^2 - 6t + 8$ factors as $(t - 2)(t - 4)$ because $(-2)(-4) = 8$ and $-2 + (-4) = -6$. A product is zero when a factor is zero, so $t = 2$ or $t = 4$; the smaller is 2.`,
  'frq-2|a|1': r`$t = 4$.

The second factor, $t - 4$, is zero at $t = 4$. Both times are inside $[0, 5]$, so both count. Between them the velocity is negative (the particle moves left); outside them it is positive.`,
  'frq-2|b|0': r`$v(1) = 1^2 - 6(1) + 8 = 3$.

Positive velocity: at $t = 1$ the particle is moving to the right at 3 units per unit time. Its SIGN is what matters for the speed question.`,
  'frq-2|b|1': r`$a(1) = 2(1) - 6 = -4$.

Acceleration is the derivative of velocity: $\frac{d}{dt}(t^2 - 6t + 8) = 2t - 6$. Negative acceleration means the velocity is decreasing, but that does not by itself tell you whether the particle is slowing down.`,
  'frq-2|b|2': r`No: the speed is decreasing.

Speed is $|v|$. It increases when velocity and acceleration have the SAME sign (pushing in the direction of motion) and decreases when they have OPPOSITE signs. Here $v(1) = 3 > 0$ and $a(1) = -4 < 0$: the push is against the motion, so the particle is slowing down.`,
  'frq-2|c|0': r`$\int_0^5v(t)\,dt = \left[\frac{t^3}{3} - 3t^2 + 8t\right]_0^5 = \frac{125}{3} - 75 + 40 = \frac{20}{3}$.

This is the DISPLACEMENT from $t = 0$ to $t = 5$: net change in position, with leftward motion counted negative. It is not the distance traveled.`,
  'frq-2|c|1': r`$x(5) = x(0) + \int_0^5v(t)\,dt = 1 + \frac{20}{3} = \frac{23}{3}$.

Position at the end = starting position + displacement. The starting position $x(0) = 1$ is given in the setup; forgetting it is the most common lost point on position questions.`,
  'frq-2|d|0': r`On $[0, 2]$: $\int_0^2v(t)\,dt = \frac{8}{3} - 12 + 16 = \frac{20}{3}$.

Here $v \ge 0$ (the particle moves right), so the integral of $v$ already equals the distance. Distance is the integral of $|v|$; you split the interval where $v$ changes sign so you can handle the negative piece separately.`,
  'frq-2|d|1': r`$\int_2^4v(t)\,dt = -\frac{4}{3}$, so the distance on $[2, 4]$ is $\frac{4}{3}$.

On $(2, 4)$ the velocity is negative, so the particle moves left and the integral comes out negative. Distance cannot be negative, so take the absolute value.`,
  'frq-2|d|2': r`Total distance $= \frac{20}{3} + \frac{4}{3} + \frac{4}{3} = \frac{28}{3}$.

The last piece: on $[4, 5]$, $v > 0$ again and $\int_4^5v\,dt = \frac{4}{3}$. Adding the distances of all three pieces gives $\int_0^5|v(t)|\,dt$. Compare with the displacement $\frac{20}{3}$ from part (c): the leftward trip is why they differ.`,
  'frq-3|a|0': r`$v'(3.5) \approx \frac{v(5) - v(2)}{5 - 2} = \frac{14 - 8}{3} = 2$ ft/s².

You cannot differentiate a table, so estimate the derivative with the average rate of change over the closest interval that contains 3.5, which is $[2, 5]$. Units: feet per second, per second.`,
  'frq-3|b|0': r`$2\cdot\frac{0 + 8}{2} + 3\cdot\frac{8 + 14}{2} = 8 + 33 = 41$.

Each trapezoid is width × average of its two heights. First: width $2 - 0 = 2$, heights 0 and 8. Second: width $5 - 2 = 3$, heights 8 and 14. Read every width from the table; they are not equal.`,
  'frq-3|b|1': r`$4\cdot\frac{14 + 10}{2} + 3\cdot\frac{10 + 4}{2} = 48 + 21 = 69$.

Third trapezoid: width $9 - 5 = 4$, heights 14 and 10, average 12. Fourth: width $12 - 9 = 3$, heights 10 and 4, average 7.`,
  'frq-3|b|2': r`$41 + 69 = 110$ feet.

The trapezoidal sum approximates $\int_0^{12}v(t)\,dt$, the distance the runner covers in 12 seconds (velocity is positive throughout, so displacement and distance agree). Feet per second × seconds = feet.`,
  'frq-3|c|0': r`$\frac{v(9) - v(5)}{9 - 5} = \frac{10 - 14}{4} = -1$.

This is the average acceleration on $[5, 9]$: the velocity dropped 4 ft/s over 4 seconds. It is the number the Mean Value Theorem will connect to an instantaneous acceleration.`,
  'frq-3|c|1': r`Yes, by the Mean Value Theorem.

Hypotheses: $v$ is differentiable (given), so it is also continuous on $[5, 9]$. Conclusion: some $c$ in $(5, 9)$ has $v'(c)$ equal to the average rate $-1$. Since $v'$ is the acceleration, there is a moment with acceleration $-1$ ft/s².`,
  'frq-4|a|0': r`$f'(x) = (x - 1)(x - 3)$, zero at $x = 1$ and $x = 3$; the smaller is 1.

Factor $x^2 - 4x + 3$ by finding two numbers with product 3 and sum $-4$: $-1$ and $-3$. These zeros are the critical points of $f$, the only interior candidates for extrema.`,
  'frq-4|a|1': r`$x = 1$.

Test the sign of $f'$ on each piece: at $x = 0.5$, $(−)(−) > 0$; at $x = 2$, $(+)(−) < 0$; at $x = 3.5$, $(+)(+) > 0$. $f'$ goes from positive to negative at $x = 1$: $f$ rises then falls, a relative maximum. At $x = 3$ it goes negative to positive: a relative minimum.`,
  'frq-4|b|0': r`$x = 2$.

$f''(x) = \frac{d}{dx}(x^2 - 4x + 3) = 2x - 4$, which is negative for $x < 2$ and positive for $x > 2$. A sign change of $f''$ means the concavity of $f$ switches, so $(2, f(2))$ is a point of inflection. The sign change, not just $f''(2) = 0$, is the reason.`,
  'frq-4|c|0': r`$f(1) = 2 + \left[\frac{x^3}{3} - 2x^2 + 3x\right]_0^1 = 2 + \frac{1}{3} - 2 + 3 = \frac{10}{3}$.

You know $f(0) = 2$ and the rate $f'$, so the value at 1 is the starting value plus the accumulated change from 0 to 1.`,
  'frq-4|c|1': r`$f(4) = 2 + \left[\frac{x^3}{3} - 2x^2 + 3x\right]_0^4 = 2 + \frac{64}{3} - 32 + 12 = \frac{10}{3}$.

Same method, from 0 to 4. The tie with $f(1)$ is not a coincidence: from 1 to 4 the area below the axis (on $(1, 3)$) exactly cancels the area above it (on $(3, 4)$).`,
  'frq-4|c|2': r`The absolute maximum value is $\frac{10}{3}$, reached at $x = 1$ and at $x = 4$.

Candidates test on a closed interval: list every critical point and both endpoints, compute $f$ at each, and pick the largest. $f(3) = 2 + \int_0^3f' = 2$. Values: $f(0) = 2$, $f(1) = \frac{10}{3}$, $f(3) = 2$, $f(4) = \frac{10}{3}$.`,
  'frq-5|a|0': r`$\frac{dy}{dx} = (2 - 1)(1)^2 = 1$.

The differential equation gives the slope at any point $(x, y)$: plug in $x = 1$, $y = 2$. You need this number inside the second-derivative formula in the next step.`,
  'frq-5|a|1': r`$\frac{d^2y}{dx^2} = 2(1)(2 - 1) + (1)^2(1) = 3 > 0$: concave up.

Where the formula comes from: differentiate $(y - 1)x^2$ with the product rule. The derivative of $(y - 1)$ is $\frac{dy}{dx}$ (y depends on x) and the derivative of $x^2$ is $2x$, giving $\frac{dy}{dx}x^2 + (y - 1)2x$.`,
  'frq-5|b|0': r`$f(0.5) \approx 3 + 0.5\cdot 0 = 3$.

Euler's first step uses the slope at the START $(0, 3)$: $(3 - 1)(0)^2 = 0$. A zero slope means the tangent line is flat, so the first step does not change $y$.`,
  'frq-5|b|1': r`$f(1) \approx 3 + 0.5\cdot 0.5 = 3.25$.

Second step: recompute the slope at the new point $(0.5, 3)$: $(3 - 1)(0.5)^2 = 0.5$. Then move 0.5 in $x$ along that slope. The true value (3.791, from part (c)) is larger because the curve is concave up and Euler's straight steps fall below it.`,
  'frq-5|c|0': r`$C = \ln 2 \approx 0.693$.

Separate: $\frac{dy}{y - 1} = x^2\,dx$; integrate: $\ln|y - 1| = \frac{x^3}{3} + C$. Plug in $x = 0$, $y = 3$: $\ln 2 = 0 + C$. Find $C$ immediately, before solving for $y$.`,
  'frq-5|c|1': r`$f(1) = 1 + 2e^{1/3} \approx 3.791$.

Solve for $y$: $|y - 1| = e^{x^3/3 + \ln 2} = 2e^{x^3/3}$, and $y - 1 > 0$ near the start, so $y = 1 + 2e^{x^3/3}$. At $x = 1$: $1 + 2e^{1/3}$.`,
  'frq-6|a|0': r`$x = 1$.

Intersections: set $4 - x^2 = x + 2$, so $x^2 + x - 2 = 0 = (x + 2)(x - 1)$. These $x$-values are the limits of integration for every part of this problem.`,
  'frq-6|a|1': r`Area $= \left[2x - \frac{x^2}{2} - \frac{x^3}{3}\right]_{-2}^1 = \left(2 - \frac{1}{2} - \frac{1}{3}\right) - \left(-4 - 2 + \frac{8}{3}\right) = \frac{7}{6} + \frac{10}{3} = 4.5$.

Top minus bottom: the parabola $4 - x^2$ is above the line $x + 2$ between the intersections (test $x = 0$: 4 vs 2), so the integrand is $2 - x - x^2$.`,
  'frq-6|b|0': r`$V = \pi\int_{-2}^1\left[(4 - x^2)^2 - (x + 2)^2\right]dx \approx 67.858$.

Washer method: a slice perpendicular to the $x$-axis is a disc with a hole. Outer radius = distance from the axis to the far curve, $4 - x^2$; inner radius = distance to the near curve, $x + 2$. Area of the slice: $\pi(R^2 - r^2)$.`,
  'frq-6|c|0': r`$V = \int_{-2}^1(2 - x - x^2)^2\,dx = 8.1$.

Each cross section is a square whose side is the vertical width of the region, top minus bottom $= 2 - x - x^2$. A square's area is side squared. There is no $\pi$: nothing is being rotated.`,
  'frq-6|d|0': r`$k = -0.5$.

Half the area is $2.25$, so solve $\int_{-2}^k(2 - x - x^2)\,dx = 2.25$. The width function $2 - x - x^2$ is a downward parabola centered halfway between $-2$ and $1$, at $x = -\frac{1}{2}$, so the halfway line is $x = -0.5$ by symmetry.`,
  'frq-7|a|0': r`Speed $= \sqrt{\left(e^{2/2}\right)^2 + (\sin 2)^2} \approx 2.866$.

Speed is the length of the velocity vector $\langle e^{t/2}, \sin t\rangle$. At $t = 2$: horizontal component $e^1 = e$, vertical component $\sin 2$. Pythagoras: $\sqrt{e^2 + \sin^2 2}$.`,
  'frq-7|b|0': r`$x(3) = 2 + \int_0^3e^{t/2}\,dt = 2 + 2(e^{1.5} - 1) \approx 8.963$.

Each coordinate is accumulated separately: start at $x(0) = 2$ and add the horizontal change, the integral of the horizontal velocity. The antiderivative of $e^{t/2}$ is $2e^{t/2}$ (divide by the inside derivative $\frac{1}{2}$).`,
  'frq-7|b|1': r`$y(3) = 1 + \int_0^3\sin t\,dt = 1 + (1 - \cos 3) \approx 2.990$.

Same idea for the vertical coordinate: start at $y(0) = 1$ and add $\int_0^3\sin t\,dt = [-\cos t]_0^3 = -\cos 3 + 1$.`,
  'frq-7|c|0': r`Distance $= \int_0^3\sqrt{e^t + \sin^2t}\,dt \approx 7.320$.

Distance traveled is the integral of speed. Inside the root: $\left(e^{t/2}\right)^2 = e^t$ plus $(\sin t)^2$. This has no simple antiderivative, which is why it is a calculator question.`,
  'frq-8|a|0': r`$\frac{1}{2}\int_0^{2\pi}(3 + 2\cos\theta)^2\,d\theta = 11\pi \approx 34.558$.

Polar area adds thin sectors of area $\frac{1}{2}r^2\,d\theta$. The curve closes once as $\theta$ goes from 0 to $2\pi$. Expanding: $9 + 12\cos\theta + 4\cos^2\theta$ integrates to $18\pi + 0 + 4\pi$, and half of $22\pi$ is $11\pi$.`,
  'frq-8|b|0': r`$\frac{dy}{d\theta} = r'\sin\theta + r\cos\theta = (-2)(1) + (3)(0) = -2$.

$y = r\sin\theta$; by the product rule its derivative is $r'\sin\theta + r\cos\theta$. At $\theta = \frac{\pi}{2}$: $r = 3 + 2\cos\frac{\pi}{2} = 3$ and $r' = -2\sin\frac{\pi}{2} = -2$.`,
  'frq-8|b|1': r`$\frac{dx}{d\theta} = r'\cos\theta - r\sin\theta = (-2)(0) - (3)(1) = -3$.

$x = r\cos\theta$; product rule: $r'\cos\theta + r\cdot(-\sin\theta)$. Same values of $r$ and $r'$ as before.`,
  'frq-8|b|2': r`$\frac{dy}{dx} = \frac{dy/d\theta}{dx/d\theta} = \frac{-2}{-3} = \frac{2}{3}$.

The slope of the curve is rise over run, both measured per unit of $\theta$; the $d\theta$'s cancel. Do not confuse it with $\frac{dr}{d\theta}$, which measures how the distance from the origin changes.`,
  'frq-8|c|0': r`$\frac{dr}{d\theta} = -2\sin\frac{\pi}{2} = -2$.

$r$ is the distance from the origin (when $r > 0$). A negative $\frac{dr}{d\theta}$ means that, as $\theta$ increases, the distance shrinks.`,
  'frq-8|c|1': r`Yes: moving toward the origin.

Both facts are needed: $r = 3 > 0$, so the distance is $r$ itself, and $\frac{dr}{d\theta} < 0$, so that distance is decreasing. (If $r$ were negative, a decreasing $r$ would mean moving AWAY.)`,
  'frq-9|a|0': r`$-2$.

Known series: $\ln(1 + u) = u - \frac{u^2}{2} + \frac{u^3}{3} - \cdots$. Replace every $u$ with $2x$: the second term becomes $-\frac{(2x)^2}{2} = -\frac{4x^2}{2} = -2x^2$. Keep $2x$ in parentheses so the 2 is squared too.`,
  'frq-9|a|1': r`$\frac{8}{3}$.

Third term: $\frac{(2x)^3}{3} = \frac{8x^3}{3}$. So the first three nonzero terms are $2x - 2x^2 + \frac{8}{3}x^3$. Substituting into a known series is much faster than computing derivatives.`,
  'frq-9|b|0': r`$f(0.1) \approx 2(0.1) - 2(0.1)^2 + \frac{8}{3}(0.1)^3 = 0.2 - 0.02 + 0.00267 \approx 0.183$.

Plug $x = 0.1$ into the three-term polynomial. The true value $\ln 1.2 \approx 0.1823$ is very close.`,
  'frq-9|b|1': r`Error $\le \frac{(0.2)^4}{4} = 0.0004$.

At $x = 0.1$ the series alternates in sign, its terms shrink, and they go to 0, so the error is at most the first term left out: $-\frac{(2x)^4}{4}$ at $x = 0.1$, in absolute value.`,
  'frq-9|c|0': r`Radius $\frac{1}{2}$.

$\ln(1 + u)$'s series converges for $|u| < 1$ (plus $u = 1$). With $u = 2x$: $|2x| < 1$, so $|x| < \frac{1}{2}$. Substituting $2x$ squeezes the interval by a factor of 2.`,
  'frq-10|a|0': r`Radius 2.

Ratio test: $\left|\frac{a_{n+1}}{a_n}\right| = \frac{|x - 3|\,n}{2(n + 1)} \to \frac{|x - 3|}{2}$. It must be less than 1, so $|x - 3| < 2$: the open interval $(1, 5)$, centered at 3, radius 2. The endpoints need separate tests.`,
  'frq-10|a|1': r`No.

At $x = 5$: $\frac{(2)^n}{n2^n} = \frac{1}{n}$, the harmonic series $1 + \frac{1}{2} + \frac{1}{3} + \cdots$, which diverges (it is a p-series with $p = 1$).`,
  'frq-10|a|2': r`Yes: the interval of convergence is $[1, 5)$.

At $x = 1$: $\frac{(-2)^n}{n2^n} = \frac{(-1)^n}{n}$. The terms alternate, decrease in size and go to 0, so by the alternating series test it converges. Include 1, exclude 5.`,
  'frq-10|b|0': r`$f'(4) = \sum_{n=1}^\infty\frac{1}{2^n} = \frac{1/2}{1 - 1/2} = 1$.

Differentiating $\frac{(x - 3)^n}{n2^n}$ brings down $n$, which cancels: $\frac{(x - 3)^{n-1}}{2^n}$. At $x = 4$ each term is $\frac{1}{2^n}$: a geometric series with first term $\frac{1}{2}$ and ratio $\frac{1}{2}$.`,
  'frq-10|c|0': r`$f(4) = \sum\frac{1}{n2^n} = -\ln\left(1 - \frac{1}{2}\right) = \ln 2 \approx 0.693$.

Known series: $-\ln(1 - u) = u + \frac{u^2}{2} + \frac{u^3}{3} + \cdots = \sum\frac{u^n}{n}$ for $|u| < 1$. With $u = \frac{1}{2}$ it matches term for term.`,
  'frq-11|a|0': r`$y' = -\frac{2x + 3y}{3x + 2y} = -\frac{2 + 6}{3 + 4} = -\frac{8}{7}$.

Implicit differentiation: $x^2 \to 2x$; $3xy \to 3y + 3xy'$ (product rule, since $y$ depends on $x$); $y^2 \to 2yy'$; $11 \to 0$. Collect the $y'$ terms, $y'(3x + 2y) = -(2x + 3y)$, and divide.`,
  'frq-11|b|0': r`$y \approx 2 - \frac{8}{7}(0.1) \approx 1.886$.

Tangent line at $(1, 2)$: $y = 2 + y'(1)(x - 1)$. Moving $0.1$ to the right changes $y$ by about slope × step $= -\frac{8}{7}\cdot 0.1 \approx -0.114$.`,
  'frq-11|c|0': r`0 solutions: there are no horizontal tangents.

Horizontal tangent: numerator of $y'$ is zero, $2x + 3y = 0$, so $y = -\frac{2x}{3}$. Substitute into the curve: $x^2 + 3x\left(-\frac{2x}{3}\right) + \frac{4x^2}{9} = x^2 - 2x^2 + \frac{4}{9}x^2 = -\frac{5}{9}x^2$. Setting that equal to 11 is impossible, since the left side is never positive.`,
  'frq-12|a|0': r`$A'(1) = 24 - 6(1)^2 = 18$.

The rectangle is $2x$ wide (from $-x$ to $x$) and $12 - x^2$ tall, so $A(x) = 24x - 2x^3$ and $A'(x) = 24 - 6x^2$. $A'(1) = 18$ means area grows 18 square units per unit increase in $x$, at $x = 1$.`,
  'frq-12|a|1': r`$\frac{dA}{dt} = 18\cdot 0.5 = 9$ square units per second.

Related rates through the chain rule: area depends on $x$, and $x$ depends on time, so $\frac{dA}{dt} = \frac{dA}{dx}\cdot\frac{dx}{dt}$.`,
  'frq-12|b|0': r`$x = 2$.

$24 - 6x^2 = 0$ gives $x^2 = 4$; only $x = 2$ is in the domain. $A''(x) = -12x$, so $A''(2) = -24 < 0$: the area graph is concave down there, a maximum.`,
  'frq-12|b|1': r`$A(2) = 2(2)(12 - 4) = 32$.

Width $2x = 4$, height $12 - x^2 = 8$. As a check, the endpoints of the domain give area 0 (at $x = 0$ the rectangle has no width; at $x = \sqrt{12}$ no height), so 32 is the absolute maximum.`,
};
