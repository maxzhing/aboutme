import type { LessonTutor } from '../types';

const r = String.raw;

/** Tutor layer · Unit 4: derivatives in the real world. */
export const TUTOR4: Record<string, LessonTutor> = {
  'c4-1': {
    bigIdea: [
      r`A derivative is a rate, so in a real situation it always has units: “output units per input unit”. If $V(t)$ is liters and $t$ is minutes, then $V'(t)$ is liters per minute. Reading a derivative in context means saying, in a full sentence, what is changing, how fast, in which direction, and when.`,
      r`The most important context is motion along a line. Position $s(t)$ tells where the particle is. Velocity $v(t) = s'(t)$ tells how fast and which way: positive means moving right (or up), negative means moving left. Acceleration $a(t) = v'(t)$ tells how the velocity is changing.`,
      r`Two classic questions. When does the particle change direction? When $v$ changes sign. Is it speeding up or slowing down? Compare signs: if $v$ and $a$ have the SAME sign, it speeds up; if they have OPPOSITE signs, it slows down. (Speed is the size of velocity, without the sign.)`,
    ],
    picture: { title: 'Braking while reversing', t: r`You are backing out of a driveway (velocity negative). You press the brake, which pushes you forward (acceleration positive). Opposite signs: you are slowing down. If you instead pressed the gas while reversing, velocity and acceleration would both be negative and you would speed up.` },
    words: [
      { term: r`Position $s(t)$`, means: 'Where the object is at time t.' },
      { term: r`Velocity $v(t) = s'(t)$`, means: 'Rate of change of position; its sign shows direction.' },
      { term: r`Acceleration $a(t) = v'(t)$`, means: 'Rate of change of velocity.' },
      { term: 'Speed', means: r`$|v(t)|$: how fast, ignoring direction.` },
      { term: 'At rest', means: r`$v(t) = 0$ at that instant.` },
      { term: 'Units of a derivative', means: r`(units of the output) per (unit of the input).` },
    ],
    tools: [
      { name: 'Derivative rules', refresher: r`Power rule and chain rule, e.g. $(\sin \pi t)' = \pi\cos\pi t$.`, lesson: 'c3-1' },
      { name: 'Factoring and sign charts', refresher: r`Factor $v(t)$, find its zeros, then test a number in each interval for the sign.`, lesson: 'c0-5' },
      { name: 'Second derivative', refresher: r`Acceleration is the second derivative of position.`, lesson: 'c3-5' },
    ],
    why: [
      [r`Rest and direction both depend on velocity, so differentiate position first and factor so the zeros are visible.`, r`At rest means velocity zero; the factors give the times.`, r`Between the zeros, test a time like $t = 2$: $3(1)(-1) < 0$, so velocity is negative, which means moving left.`],
      [r`Speeding up vs slowing down needs the signs of BOTH velocity and acceleration at that time.`, r`With $a(2) = 0$ the speed is momentarily not changing; just after $t = 2$, $a > 0$ while $v < 0$: opposite signs, so slowing down.`],
    ],
    walk: {
      'c4-1-1': [r`$V'(5)$ is a rate of change at the instant $t = 5$, i.e. 12:05. Units: liters per minute.`, r`The value $-3$ means decreasing, by 3 liters per minute.`, r`So: at 12:05 the volume is decreasing at 3 liters per minute. Choice C. (A describes $V(5)$, B describes a total change, not a rate.)`],
      'c4-1-2': [r`Velocity is the derivative of position: $v(t) = 2t - 4$.`, r`At $t = 5$: $10 - 4 = 6$.`, r`Positive 6: moving right at 6 units per unit of time.`],
      'c4-1-3': [r`At rest means $v(t) = 0$.`, r`$v(t) = 2t - 4 = 0$.`, r`$t = 2$.`],
      'c4-1-4': [r`Velocity at 2: $v(2) = 4 - 10 + 4 = -2$ (moving left).`, r`Acceleration: $a(t) = v'(t) = 2t - 5$, so $a(2) = -1$.`, r`Both negative: same signs, so the particle is speeding up. Choice A.`],
      'c4-1-5': [r`Direction changes when velocity changes sign. $v(t) = s'(t) = 6t^2 - 30t + 36$.`, r`Factor: $6(t^2 - 5t + 6) = 6(t - 2)(t - 3)$. Zeros at 2 and 3.`, r`Signs: positive before 2, negative between 2 and 3, positive after 3. Two sign changes: $2$ direction changes.`],
      'c4-1-6': [r`$v(t) = \pi\cos(\pi t)$ by the chain rule.`, r`$a(t) = -\pi^2\sin(\pi t)$ (chain rule again).`, r`At $t = \frac{1}{2}$: $\sin\frac{\pi}{2} = 1$, so $a = -\pi^2 \approx -9.870$.`],
    },
    teach: {
      plan: [r`Write $V'(5) = -3$ on the board and practice saying it as a sentence with units and time.`, r`Draw a number line and move a coin to act out position, velocity and acceleration.`, r`Show how to find when a particle is at rest and changes direction with a sign chart of $v$.`, r`Teach the speeding up / slowing down rule with the reversing-car story.`, r`Work a full particle problem together.`],
      questions: [
        { q: 'Does negative acceleration mean slowing down?', a: 'Not always! It means velocity is decreasing. If velocity is already negative, decreasing it further makes the particle go faster (more negative).' },
        { q: 'Is “at rest” the same as “changes direction”?', a: r`No. At rest means $v = 0$ for an instant. It changes direction only if $v$ actually switches sign there.` },
        { q: 'What are the units of acceleration?', a: r`Velocity units per time unit, e.g. meters per second per second (m/s²).` },
      ],
      keyPoints: ['A derivative in context: a rate, with units, at a specific time.', 'v = s′, a = v′ = s″.', 'Direction changes where v changes sign.', 'Speeding up when v and a have the same sign; slowing down when opposite.'],
    },
  },
  'c4-2': {
    bigIdea: [
      r`In related rates problems, two or more quantities change over time, and they are connected by an equation. A ladder slides: both the bottom’s distance and the top’s height change, but they always satisfy the Pythagorean theorem. If you know how fast one changes, you can find how fast the other changes.`,
      r`The method: write an equation connecting the quantities, then differentiate BOTH sides with respect to time $t$. Every variable picks up its own rate, like $\frac{dx}{dt}$ or $\frac{dy}{dt}$, by the chain rule. That gives an equation connecting the rates.`,
      r`The golden rule: differentiate first, THEN plug in the numbers for the specific moment. If you plug in too early, quantities that are actually changing become frozen constants, and their rates disappear.`,
    ],
    picture: { title: 'Blowing up a balloon', t: r`As you blow steadily, the radius grows, but the volume grows faster and faster because $V = \frac{4}{3}\pi r^3$. The same breath (volume rate) makes the radius grow slower when the balloon is big. The equation between $V$ and $r$ ties their rates together.` },
    words: [
      { term: 'Related rates', means: 'Rates of change of quantities that are linked by an equation.' },
      { term: r`$\frac{dx}{dt}$`, means: r`How fast $x$ changes per unit of time.` },
      { term: 'Snapshot moment', means: 'The specific instant the question asks about, where you plug in numbers.' },
      { term: 'Similar triangles', means: r`Triangles with the same shape; their side ratios match, which helps relate radius and height in cones.` },
    ],
    tools: [
      { name: 'Implicit differentiation', refresher: r`Same idea, but with respect to $t$: $\frac{d}{dt}y^2 = 2y\frac{dy}{dt}$.`, lesson: 'c3-2' },
      { name: 'Geometry formulas', refresher: r`Circle area $\pi r^2$, sphere volume $\frac{4}{3}\pi r^3$, cone volume $\frac{1}{3}\pi r^2 h$, Pythagorean theorem.` },
      { name: 'Chain rule', refresher: r`$\frac{dA}{dt} = \frac{dA}{dr} \cdot \frac{dr}{dt}$.`, lesson: 'c3-1' },
    ],
    why: [
      [r`The wall, ground and ladder form a right triangle, so the Pythagorean theorem links $x$ and $y$ at every moment. The given rate is $\frac{dx}{dt}$.`, r`Differentiate both sides with respect to time; each variable brings its rate along (chain rule). The constant 100 gives 0.`, r`Now plug in the snapshot: when $x = 6$, the theorem gives $y = 8$. Solve for the unknown rate. Negative means the top moves down.`],
      [r`$A = \pi r^2$ links area and radius; differentiate with respect to $t$ to get $\frac{dA}{dt} = 2\pi r\frac{dr}{dt}$.`, r`Plug in the snapshot values $r = 5$ and $\frac{dr}{dt} = 2$.`],
    ],
    walk: {
      'c4-2-1': [r`Equation: $A = \pi r^2$. Given: $\frac{dr}{dt} = 2$. Want: $\frac{dA}{dt}$ when $r = 5$.`, r`Differentiate with respect to $t$: $\frac{dA}{dt} = 2\pi r\frac{dr}{dt}$.`, r`Plug in: $2\pi(5)(2) = 20\pi \approx 62.832$ cm² per second.`],
      'c4-2-2': [r`Equation: $V = \frac{4}{3}\pi r^3$. Given $\frac{dr}{dt} = 0.5$; want $\frac{dV}{dt}$ when $r = 3$.`, r`Differentiate: $\frac{dV}{dt} = 4\pi r^2\frac{dr}{dt}$.`, r`Plug in: $4\pi(9)(0.5) = 18\pi \approx 56.549$ cm³ per second.`],
      'c4-2-3': [r`Equation: $x^2 + y^2 = 13^2 = 169$ ($x$ = bottom’s distance, $y$ = top’s height). Given $\frac{dx}{dt} = 2$.`, r`Differentiate: $2x\frac{dx}{dt} + 2y\frac{dy}{dt} = 0$.`, r`Snapshot: $x = 5$, so $y = \sqrt{169 - 25} = 12$. Plug in: $2(5)(2) + 2(12)\frac{dy}{dt} = 0$.`, r`$20 + 24\frac{dy}{dt} = 0$, so $\frac{dy}{dt} = -\frac{20}{24} = -\frac{5}{6}$ ft/s (sliding down).`],
      'c4-2-4': [r`Equation: $V = s^3$. Given $\frac{ds}{dt} = 0.1$.`, r`Differentiate: $\frac{dV}{dt} = 3s^2\frac{ds}{dt}$.`, r`At $s = 4$: $3(16)(0.1) = 4.8$ cm³/s.`],
      'c4-2-5': [r`Cone volume $V = \frac{1}{3}\pi r^2 h$ has two changing variables. Similar triangles: the water’s cone has the same shape as the tank, so $\frac{r}{h} = \frac{3}{6}$, i.e. $r = \frac{h}{2}$.`, r`Substitute to get one variable: $V = \frac{1}{3}\pi\left(\frac{h}{2}\right)^2 h = \frac{\pi h^3}{12}$.`, r`Differentiate: $\frac{dV}{dt} = \frac{\pi h^2}{4}\frac{dh}{dt}$.`, r`Plug in $\frac{dV}{dt} = 9$, $h = 3$: $9 = \frac{9\pi}{4}\frac{dh}{dt}$, so $\frac{dh}{dt} = \frac{4}{\pi} \approx 1.273$ ft/min.`],
      'c4-2-6': [r`The cars and the start form a right triangle: $D^2 = x^2 + y^2$, with $x' = 30$ (east) and $y' = 40$ (north).`, r`Differentiate: $2DD' = 2xx' + 2yy'$, so $DD' = xx' + yy'$.`, r`After 2 hours: $x = 60$, $y = 80$, $D = \sqrt{3600 + 6400} = 100$.`, r`$100D' = 60(30) + 80(40) = 5000$, so $D' = 50$ mph.`],
    },
    teach: {
      plan: [r`Act out the sliding ladder with a pencil against a book.`, r`Write the five steps: draw, label variables and rates, write an equation, differentiate with respect to $t$, then plug in the snapshot.`, r`Work the ladder problem slowly, stressing “differentiate before plugging in”.`, r`Do the cone problem to show how similar triangles remove an extra variable.`, r`Ask your student to explain the sign of each answer in words.`],
      questions: [
        { q: 'Why can’t I plug in numbers before differentiating?', a: r`Because plugging in turns changing quantities into constants, and constants have derivative 0. You would erase the very rates you need.` },
        { q: 'What does a negative rate mean?', a: 'That quantity is decreasing at that moment, like the ladder’s top sliding down.' },
        { q: 'What if the equation has a variable I don’t have a rate for?', a: 'Find another relationship (often similar triangles or a given ratio) to eliminate it before differentiating.' },
      ],
      keyPoints: ['Write one equation linking the changing quantities.', 'Differentiate both sides with respect to time.', 'Plug in the snapshot values only after differentiating.', 'Give the answer with units and interpret its sign.'],
    },
  },
  'c4-3': {
    bigIdea: [
      r`Zoom in close enough on a smooth curve and it looks like its tangent line. That means near a point, the tangent line is a great stand-in for the function. This is called local linearity.`,
      r`We use it to estimate hard values with easy ones. $\sqrt{4.1}$ is hard; $\sqrt{4} = 2$ is easy. The tangent line at $x = 4$ starts at height 2 and rises with slope $\frac{1}{4}$. Walking 0.1 to the right adds about $\frac{1}{4} \times 0.1 = 0.025$. So $\sqrt{4.1} \approx 2.025$. (The true value is 2.0248…)`,
      r`The formula is $L(x) = f(a) + f'(a)(x - a)$: start value plus slope times step. Whether the estimate is too big or too small depends on how the curve bends: a curve bending up (concave up) lies above its tangent line, so the tangent line underestimates.`,
    ],
    picture: { title: 'A GPS on a straight stretch', t: r`If you are driving at 60 mph right now, a good guess for where you will be in 1 minute is 1 mile ahead. That guess assumes your speed stays the same, like following the tangent line. For short times it is excellent; for long times, curves in the road add error.` },
    words: [
      { term: 'Local linearity', means: 'Close to a point, a smooth curve looks like its tangent line.' },
      { term: r`Linearization $L(x)$`, means: r`The tangent line used as an approximation: $L(x) = f(a) + f'(a)(x - a)$.` },
      { term: 'Overestimate / underestimate', means: 'An approximation that is too large / too small.' },
      { term: 'Concave up / down', means: 'Bending upward like a cup / downward like a cap.' },
    ],
    tools: [
      { name: 'Tangent lines', refresher: r`$y - f(a) = f'(a)(x - a)$.`, lesson: 'c2-1' },
      { name: 'Power rule with roots', refresher: r`$(\sqrt{x})' = \frac{1}{2\sqrt{x}}$, $(\sqrt[3]{x})' = \frac{1}{3x^{2/3}}$.`, lesson: 'c2-3' },
      { name: 'Second derivative', refresher: r`Its sign tells which way the curve bends.`, lesson: 'c3-5' },
    ],
    why: [
      [r`Choose a nearby point where everything is easy: $\sqrt{4} = 2$, and the slope $\frac{1}{2\sqrt{4}} = \frac{1}{4}$.`, r`Start at 2 and walk along the tangent line 0.1 to the right: rise = slope × run.`, r`$\sqrt{x}$ bends downward, so its tangent lines sit above it: the estimate is a bit too big.`],
      [r`We have exactly the two ingredients the tangent line needs: the value and the slope at 2. Step 0.1 times slope $-3$ gives a change of $-0.3$.`],
    ],
    walk: {
      'c4-3-1': [r`Easy nearby point: $a = 9$, $\sqrt{9} = 3$.`, r`Slope: $f'(x) = \frac{1}{2\sqrt{x}}$, so $f'(9) = \frac{1}{6}$.`, r`$L(9.2) = 3 + \frac{1}{6}(0.2) = 3 + 0.0333 = 3.033$.`],
      'c4-3-2': [r`$L(x) = f(2) + f'(2)(x - 2) = 5 - 3(x - 2)$.`, r`Step: $2.1 - 2 = 0.1$.`, r`$5 - 3(0.1) = 4.7$.`],
      'c4-3-3': [r`At $x = 1$: $\ln 1 = 0$ and $(\ln x)' = \frac{1}{x} = 1$.`, r`$L(x) = 0 + 1(x - 1) = x - 1$.`, r`$L(1.05) = 0.05$. (True value: 0.04879, very close.)`],
      'c4-3-4': [r`$f(x) = x^4$, $a = 2$: $f(2) = 16$, $f'(x) = 4x^3$ so $f'(2) = 32$.`, r`Step: 0.01.`, r`$16 + 32(0.01) = 16.32$.`],
      'c4-3-5': [r`$f'' > 0$ means concave up: the curve bends upward like a cup.`, r`A cup-shaped curve lies above its tangent lines.`, r`So the tangent line value is below the true value: an underestimate. Choice A.`],
      'c4-3-6': [r`Easy point: $\sqrt[3]{8} = 2$.`, r`$f(x) = x^{1/3}$, $f'(x) = \frac{1}{3}x^{-2/3}$; $8^{2/3} = 4$, so $f'(8) = \frac{1}{12}$.`, r`$L(8.3) = 2 + \frac{1}{12}(0.3) = 2 + 0.025 = 2.025$.`],
    },
    teach: {
      plan: [r`Graph $\sqrt{x}$ and its tangent line at 4; zoom in to show they nearly coincide.`, r`Write $L(x) = f(a) + f'(a)(x - a)$ and explain it as “start + slope × step”.`, r`Estimate $\sqrt{4.1}$ together, then check on a calculator.`, r`Explain over/underestimates with concavity pictures.`, r`Have your student estimate $\sqrt[3]{8.3}$ alone.`],
      questions: [
        { q: 'How do I choose a?', a: r`Pick a point close to the target where $f(a)$ and $f'(a)$ are easy: perfect squares for roots, 1 for logs, 0 for $e^x$.` },
        { q: 'Why does it get worse farther from a?', a: 'The curve bends away from the tangent line; the farther you go, the more the bending adds up.' },
        { q: 'How do I know if it is an over- or underestimate?', a: r`Check $f''$: positive (concave up) → underestimate; negative (concave down) → overestimate.` },
      ],
      keyPoints: ['Near a, f(x) ≈ f(a) + f′(a)(x − a).', 'Pick a nearby easy point a.', 'Concave up → underestimate; concave down → overestimate.', 'Accuracy is best close to a.'],
    },
  },
  'c4-4': {
    bigIdea: [
      r`Remember $\frac{0}{0}$? It meant “the answer is hidden”. L’Hôpital’s rule is a powerful tool for finding it: if a limit gives $\frac{0}{0}$ or $\frac{\infty}{\infty}$, you may replace the top and bottom by their derivatives and try again.`,
      r`Why does it work? Near the point, both top and bottom are almost their tangent lines. Their ratio is almost the ratio of their slopes. So the race between top and bottom is decided by how fast each one changes.`,
      r`Important: differentiate the top and bottom SEPARATELY (not the quotient rule). Only use it on $\frac{0}{0}$ or $\frac{\infty}{\infty}$. If you still get one of those forms, apply it again. Other forms like $0 \cdot \infty$ or $1^\infty$ must be rewritten as a fraction first.`,
    ],
    picture: { title: 'A race to zero', t: r`Two runners both reach the finish line (zero) at the same moment. Who was “bigger” just before? Compare their speeds at the finish. L’Hôpital compares the speeds (derivatives) of the top and bottom.` },
    words: [
      { term: 'L’Hôpital’s rule', means: r`If $\frac{f(x)}{g(x)}$ gives $\frac{0}{0}$ or $\frac{\infty}{\infty}$, then $\lim\frac{f}{g} = \lim\frac{f'}{g'}$ (when the second limit exists).` },
      { term: 'Indeterminate forms', means: r`$\frac{0}{0}$, $\frac{\infty}{\infty}$, $0 \cdot \infty$, $\infty - \infty$, $1^\infty$, $0^0$, $\infty^0$.` },
      { term: 'Rewrite as a quotient', means: r`Turn $x\ln x$ into $\frac{\ln x}{1/x}$ so L’Hôpital applies.` },
    ],
    tools: [
      { name: 'Indeterminate 0/0', refresher: 'L’Hôpital is a new route to the same limits you found by algebra.', lesson: 'c1-4' },
      { name: 'Derivative rules', refresher: r`$(e^x)' = e^x$, $(\ln x)' = \frac{1}{x}$, $(\cos 2x)' = -2\sin 2x$.`, lesson: 'c3-1' },
      { name: 'Logs to handle powers', refresher: r`If $y = a^b$, then $\ln y = b\ln a$.`, lesson: 'c0-7' },
    ],
    why: [
      [r`Always check the form first: $\sin 0 = 0$ on top and 0 on the bottom, so L’Hôpital is allowed.`, r`Differentiate top and bottom separately: $(\sin 3x)' = 3\cos 3x$ and $(x)' = 1$; then plug in 0.`],
      [r`Both grow forever: $\frac{\infty}{\infty}$. One application lowers the power on top.`, r`After the second application the top is a constant while the bottom still explodes, so the ratio goes to 0. Exponentials beat powers.`],
    ],
    walk: {
      'c4-4-1': [r`Check: $e^0 - 1 - 0 = 0$ on top, 0 on bottom. Form $\frac{0}{0}$.`, r`L’Hôpital: $\lim \frac{e^x - 1}{2x}$. Check again: $\frac{0}{0}$.`, r`Again: $\lim \frac{e^x}{2} = \frac{1}{2}$.`],
      'c4-4-2': [r`As $x \to \infty$: $\frac{\infty}{\infty}$.`, r`Derivatives: top $\frac{1}{x}$, bottom $\frac{1}{2\sqrt{x}}$.`, r`$\frac{1/x}{1/(2\sqrt{x})} = \frac{2\sqrt{x}}{x} = \frac{2}{\sqrt{x}} \to 0$.`],
      'c4-4-3': [r`At 0: $1 - \cos 0 = 0$ and $0^2 = 0$. Form $\frac{0}{0}$.`, r`Derivatives: top $2\sin 2x$ (chain rule), bottom $2x$. So $\lim\frac{\sin 2x}{x}$, still $\frac{0}{0}$.`, r`Again: $\lim\frac{2\cos 2x}{1} = 2$.`],
      'c4-4-4': [r`At 1: $\ln 1 = 0$ and $1 - 1 = 0$. Form $\frac{0}{0}$.`, r`Derivatives: top $\frac{1}{x}$, bottom 1.`, r`$\frac{1/1}{1} = 1$.`],
      'c4-4-5': [r`$x \to 0^+$ and $\ln x \to -\infty$: the form is $0 \cdot (-\infty)$, not a fraction. Rewrite: $x\ln x = \frac{\ln x}{1/x}$.`, r`Now the form is $\frac{-\infty}{\infty}$, so L’Hôpital applies: $\frac{1/x}{-1/x^2}$.`, r`Simplify: $\frac{1}{x} \cdot \left(-x^2\right) = -x \to 0$.`],
      'c4-4-6': [r`Form $1^\infty$: take logs. Let $y = \left(1 + \frac{3}{x}\right)^x$, so $\ln y = x\ln\left(1 + \frac{3}{x}\right) = \frac{\ln(1 + 3/x)}{1/x}$, a $\frac{0}{0}$ form.`, r`L’Hôpital: top’s derivative $\frac{-3/x^2}{1 + 3/x}$, bottom’s $-\frac{1}{x^2}$. Ratio: $\frac{3}{1 + 3/x} \to 3$.`, r`So $\ln y \to 3$, which means $y \to e^3 \approx 20.086$.`],
    },
    teach: {
      plan: [r`Revisit $\frac{\sin 3x}{x}$ and solve it two ways: special limit and L’Hôpital.`, r`State the rule and the conditions: only $\frac{0}{0}$ or $\frac{\infty}{\infty}$.`, r`Stress: derivative of top over derivative of bottom, not the quotient rule.`, r`Show repeated use on $\frac{x^2}{e^x}$.`, r`Show how to rewrite $0 \cdot \infty$ and $1^\infty$ forms.`],
      questions: [
        { q: 'Can I use L’Hôpital on any limit?', a: r`No, only $\frac{0}{0}$ or $\frac{\infty}{\infty}$. Using it on something like $\frac{1}{0}$ gives wrong answers.` },
        { q: 'Why not use the quotient rule?', a: 'Because the rule compares the rates of the top and bottom separately. The quotient rule would be the derivative of the whole fraction, which is a different thing.' },
        { q: 'What if it keeps going forever?', a: 'Sometimes L’Hôpital loops (like with roots). Then go back to algebra: divide by the dominant term or simplify.' },
      ],
      keyPoints: ['Check for 0/0 or ∞/∞ first.', 'Differentiate top and bottom separately.', 'Repeat if the form is still indeterminate.', 'Rewrite 0·∞ as a fraction; use logs for powers like 1^∞.'],
    },
  },
};
