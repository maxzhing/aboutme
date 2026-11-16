import type { LessonTutor } from '../types';

const r = String.raw;

/** Tutor layer · Unit 5: what derivatives tell us about graphs. */
export const TUTOR5: Record<string, LessonTutor> = {
  'c5-1': {
    bigIdea: [
      r`Suppose you drive 120 miles in 2 hours. Your average speed was 60 mph. The Mean Value Theorem (MVT) says that at some instant, your speedometer must have read exactly 60. You can’t average 60 without hitting 60 at least once (as long as you didn’t teleport or jump speeds instantly).`,
      r`On a graph: draw the line connecting the two endpoints (its slope is the average rate of change). Somewhere between them, the curve has a tangent line parallel to that line. The conditions: the function must be continuous on the closed interval and differentiable inside it.`,
      r`This lesson also introduces critical points: places where $f'(x) = 0$ or $f'$ does not exist. These are the only places a smooth function can turn around, so they are the candidates for peaks and valleys in the coming lessons.`,
    ],
    picture: { title: 'A speeding ticket from a toll road', t: r`Some toll roads time you between two booths. If you covered 60 miles in 45 minutes, your average was 80 mph, and the MVT proves you were going exactly 80 mph at some moment. That is enough for a ticket in a 65 zone, even if no one saw you speed.` },
    words: [
      { term: 'Mean Value Theorem', means: r`If $f$ is continuous on $[a, b]$ and differentiable on $(a, b)$, then $f'(c) = \frac{f(b) - f(a)}{b - a}$ for some $c$ in $(a, b)$.` },
      { term: 'Average rate of change', means: r`$\frac{f(b) - f(a)}{b - a}$, the slope of the secant line.` },
      { term: 'Critical point', means: r`An $x$ in the domain where $f'(x) = 0$ or $f'(x)$ does not exist.` },
      { term: 'Hypotheses', means: 'The conditions a theorem needs before you are allowed to use it.' },
    ],
    tools: [
      { name: 'Average rate of change', refresher: r`Slope between two points of the graph.`, lesson: 'c2-1' },
      { name: 'Differentiability', refresher: 'Corners (like |x| at 0) break differentiability.', lesson: 'c2-2' },
      { name: 'Derivatives of powers and logs', refresher: r`$(x^{2/3})' = \frac{2}{3}x^{-1/3}$; $(\ln x)' = \frac{1}{x}$.`, lesson: 'c2-4' },
    ],
    why: [
      [r`The MVT promises a point whose instantaneous slope equals the average slope, so compute the average first.`, r`Set the derivative equal to that average and solve; then check that $c$ lands inside the interval, as the theorem promises.`],
      [r`To find where $f'$ is zero or undefined, we need a clean derivative; writing it as one fraction shows both at once.`, r`Top zero → $f' = 0$. Bottom zero → $f'$ undefined (but $f$ itself is defined there). Both kinds count as critical points.`],
    ],
    walk: {
      'c5-1-1': [r`Average rate on $[0, 3]$: $\frac{27 - 0}{3 - 0} = 9$.`, r`Set $f'(c) = 3c^2 = 9$, so $c^2 = 3$.`, r`$c = \sqrt{3} \approx 1.732$ (the negative root is outside $[0, 3]$).`],
      'c5-1-2': [r`$f(0) = 0$, $f(5) = 25 - 20 = 5$. Average rate: $\frac{5}{5} = 1$.`, r`$f'(c) = 2c - 4 = 1$.`, r`$c = 2.5$, inside $(0, 5)$ ✓.`],
      'c5-1-3': [r`Check the hypotheses. Continuous on $[-1, 1]$? Yes.`, r`Differentiable on $(-1, 1)$? No: there is a corner at $x = 0$.`, r`So the MVT does not apply. Indeed the average slope is 0, but $|x|$ has slope $\pm 1$ everywhere. Choice B.`],
      'c5-1-4': [r`$f'(x) = 3x^2 - 6x$.`, r`Factor: $3x(x - 2) = 0$ gives $x = 0$ or $x = 2$.`, r`$f'$ exists everywhere (polynomial), so the critical points are 0 and 2: two of them.`],
      'c5-1-5': [r`$f$ is differentiable, so the MVT applies on $[1, 5]$.`, r`Average rate: $\frac{12 - 4}{5 - 1} = \frac{8}{4}$.`, r`$k = 2$.`],
      'c5-1-6': [r`$\ln 1 = 0$ and $\ln e = 1$, so the average rate is $\frac{1 - 0}{e - 1} = \frac{1}{e - 1}$.`, r`$f'(c) = \frac{1}{c}$. Set $\frac{1}{c} = \frac{1}{e - 1}$.`, r`$c = e - 1 \approx 1.718$, which is between 1 and $e$ ✓.`],
    },
    teach: {
      plan: [r`Tell the toll-road speeding story.`, r`Draw a curve, the secant line between endpoints, and slide a parallel line until it touches the curve.`, r`State the MVT and its two hypotheses; show $|x|$ failing.`, r`Find $c$ for $x^2$ on $[1, 3]$ together.`, r`Define critical points and find them for a polynomial and for $x^{2/3}(x - 5)$.`],
      questions: [
        { q: 'Does the MVT tell me where c is?', a: 'No, it only guarantees one exists. For specific functions we find it by solving f′(c) = average rate.' },
        { q: 'Why must f be differentiable?', a: 'Without a derivative at some point (like a corner), the slope can jump past the average value without ever equaling it.' },
        { q: 'Is every critical point a max or min?', a: r`No. $x^3$ has a critical point at 0, but it keeps increasing. Critical points are only candidates.` },
      ],
      keyPoints: ['MVT: some instantaneous rate equals the average rate.', 'Hypotheses: continuous on [a, b], differentiable on (a, b).', 'Find c by solving f′(c) = (f(b) − f(a))/(b − a).', 'Critical points: f′ = 0 or f′ undefined.'],
    },
  },
  'c5-2': {
    bigIdea: [
      r`The sign of the derivative tells you which way the graph is going. If $f' > 0$, the slope is positive and the graph goes uphill: $f$ is increasing. If $f' < 0$, it goes downhill: decreasing.`,
      r`A peak (relative maximum) is where the graph switches from uphill to downhill, so $f'$ switches from $+$ to $-$. A valley (relative minimum) is where it switches from downhill to uphill: $f'$ goes from $-$ to $+$. That is the first derivative test.`,
      r`The tool is a sign chart: find the critical points, mark them on a number line, and test one number in each interval to find the sign of $f'$. Then read off increasing/decreasing and the peaks and valleys.`,
    ],
    picture: { title: 'Hiking a trail', t: r`On a hike, “uphill” means positive slope and “downhill” negative. The top of a hill is where uphill turns into downhill. A flat spot in the middle of a long climb (slope 0 but still climbing on both sides) is not a top: that is why we check the sign on both sides.` },
    words: [
      { term: 'Increasing / decreasing', means: r`$f$ rises / falls as $x$ moves right: $f' > 0$ / $f' < 0$.` },
      { term: 'Relative (local) maximum', means: 'A point higher than all nearby points: a peak.' },
      { term: 'Relative (local) minimum', means: 'A point lower than all nearby points: a valley.' },
      { term: 'Sign chart', means: 'A number line showing where a function is positive or negative.' },
      { term: 'First derivative test', means: r`$f'$: $+$ to $-$ → max; $-$ to $+$ → min; no change → no extremum.` },
    ],
    tools: [
      { name: 'Critical points', refresher: r`Where $f' = 0$ or $f'$ is undefined.`, lesson: 'c5-1' },
      { name: 'Factoring', refresher: 'Factor f′ to find its zeros and see its sign.', lesson: 'c0-5' },
      { name: 'Product rule and logs', refresher: r`$(x^2\ln x)' = 2x\ln x + x$; $\ln x = -\frac{1}{2}$ means $x = e^{-1/2}$.`, lesson: 'c2-5' },
    ],
    why: [
      [r`The sign of $f'$ controls rising and falling, and factoring shows where it can switch signs.`, r`Test one number in each interval, e.g. $x = -3$: $3(-5)(-1) > 0$; $x = 0$: $3(-2)(2) < 0$; $x = 3$: positive.`, r`$+$ then $-$ at $-2$ is a peak; $-$ then $+$ at 2 is a valley.`],
      [r`Product rule gives $f'$, and factoring out $e^{-x}$ helps: an exponential is always positive, so it never affects the sign.`, r`So the sign of $f'$ is just the sign of $1 - x$: positive when $x < 1$.`],
    ],
    walk: {
      'c5-2-1': [r`$f'(x) = 3x^2 - 12 = 3(x - 2)(x + 2)$, zeros at $\pm 2$.`, r`Sign chart: positive left of $-2$, negative between, positive right of 2.`, r`$+$ to $-$ happens at $x = -2$: relative maximum there.`],
      'c5-2-2': [r`$f'(x) = e^{-x} - xe^{-x} = e^{-x}(1 - x)$.`, r`$e^{-x} > 0$ always, so the sign follows $1 - x$: positive for $x < 1$, negative for $x > 1$.`, r`$+$ to $-$ at $x = 1$: relative maximum.`],
      'c5-2-3': [r`$f'(x) = 4x^3 - 12x^2 = 4x^2(x - 3)$.`, r`$4x^2 \ge 0$, so the sign is the sign of $x - 3$, except it is 0 at $x = 0$.`, r`At 0: negative on both sides, no extremum. At 3: $-$ to $+$, so a relative minimum at $x = 3$.`],
      'c5-2-4': [r`$(x - 1)^2$ is never negative, so it cannot cause a sign change.`, r`The sign of $f'$ is the sign of $x + 2$: changes only at $x = -2$ (from $-$ to $+$).`, r`So only one relative extremum (a minimum at $-2$); $x = 1$ is a critical point but not an extremum.`],
      'c5-2-5': [r`$f' > 0$ before 4: $f$ rising. $f' < 0$ after 4: $f$ falling.`, r`Rising then falling makes a peak.`, r`Relative maximum: choice A.`],
      'c5-2-6': [r`Product rule: $f'(x) = 2x\ln x + x^2 \cdot \frac{1}{x} = 2x\ln x + x$.`, r`Factor: $x(2\ln x + 1) = 0$. The domain is $x > 0$, so $x \ne 0$; solve $2\ln x + 1 = 0$.`, r`$\ln x = -\frac{1}{2}$, so $x = e^{-1/2} \approx 0.607$.`],
    },
    teach: {
      plan: [r`Draw a hilly graph and color the uphill parts green ($f' > 0$) and downhill red ($f' < 0$).`, r`Explain that peaks and valleys happen where the color switches.`, r`Show how to make a sign chart from a factored $f'$.`, r`Do $x^3 - 12x$ together, then $x^4 - 4x^3$ to show a critical point that is not an extremum.`, r`Have your student state conclusions with reasons (“because $f'$ changes from positive to negative”).`],
      questions: [
        { q: r`If $f'(c) = 0$, is $c$ always a max or min?`, a: r`No. The derivative must change sign. $x^3$ has $f'(0) = 0$ but rises on both sides.` },
        { q: 'How do I find the sign in each interval?', a: 'Pick any test number in the interval and plug it into the factored f′. Only the signs of the factors matter.' },
        { q: 'What should I write on the AP exam?', a: r`Justify with the sign change: “$f$ has a relative max at $x = -2$ because $f'$ changes from positive to negative there.”` },
      ],
      keyPoints: ['f′ > 0: increasing; f′ < 0: decreasing.', 'f′ changes + to −: relative max; − to +: relative min.', 'Use a sign chart built from the factored derivative.', 'A critical point without a sign change is not an extremum.'],
    },
  },
  'c5-3': {
    bigIdea: [
      r`A relative maximum is the top of one hill. The absolute maximum is the highest point on the whole interval, the tallest hill or possibly an endpoint. On a closed interval, a continuous function always has both an absolute max and an absolute min (Extreme Value Theorem).`,
      r`Where can the highest point be? Either at the top of a hill inside the interval (a critical point) or at one of the two ends. So we make a short list of candidates: all critical points inside the interval, plus both endpoints. Evaluate $f$ at every candidate. Biggest output wins max, smallest wins min.`,
      r`This “candidates test” (also called the closed interval method) needs no sign chart at all, just a table of values.`,
    ],
    picture: { title: 'The tallest kid in the class photo', t: r`To find the tallest person in a photo, you only need to compare heads, not measure every inch of everyone. Similarly, the absolute max can only happen at a few special places: the candidates. Measure those, compare, done.` },
    words: [
      { term: 'Absolute maximum / minimum', means: 'The largest / smallest output on the entire interval.' },
      { term: 'Extreme Value Theorem', means: 'A continuous function on a closed interval [a, b] has an absolute max and min.' },
      { term: 'Candidates', means: 'Critical points inside the interval plus the two endpoints.' },
      { term: 'Endpoint', means: 'The first or last x-value of a closed interval.' },
    ],
    tools: [
      { name: 'Critical points', refresher: r`Solve $f'(x) = 0$ and find where $f'$ is undefined.`, lesson: 'c5-1' },
      { name: 'Evaluating carefully', refresher: r`Plug each candidate into $f$, not $f'$!`, lesson: 'c0-3' },
      { name: 'Trig and exponential values', refresher: r`$\sin\frac{\pi}{4} + \cos\frac{\pi}{4} = \sqrt{2}$; $e^{-1} \approx 0.368$.`, lesson: 'c0-8' },
    ],
    why: [
      [r`Critical points come from $f' = 0$; we keep only those inside $[0, 2]$, because candidates outside the interval do not count.`, r`Make the candidate table: the endpoints 0 and 2 plus the critical point 1.`, r`Compare the outputs: largest is the absolute max, smallest the absolute min. Report the VALUE and where it occurs.`],
      [r`Set the derivative to zero: $\cos x = \sin x$ happens at $\frac{\pi}{4}$ in $[0, \pi]$.`, r`Evaluate $f$ at the critical point and both endpoints.`, r`$\sqrt{2} \approx 1.414$ is the biggest.`],
    ],
    walk: {
      'c5-3-1': [r`$f'(x) = 3x^2 - 3 = 0$ at $x = \pm 1$, both inside $[-2, 3]$.`, r`Candidates: $-2, -1, 1, 3$.`, r`Values: $f(-2) = -8 + 6 = -2$; $f(-1) = -1 + 3 = 2$; $f(1) = -2$; $f(3) = 27 - 9 = 18$.`, r`Largest: $18$ (at the endpoint $x = 3$).`],
      'c5-3-2': [r`Same candidates and values: $-2, 2, -2, 18$.`, r`The smallest value is $-2$.`, r`It happens at two places ($x = -2$ and $x = 1$); the minimum VALUE is $-2$.`],
      'c5-3-3': [r`$f'(x) = 1 - \frac{4}{x^2} = 0$ gives $x^2 = 4$, so $x = 2$ (in $[1, 4]$).`, r`Candidates: 1, 2, 4. $f(1) = 5$, $f(2) = 2 + 2 = 4$, $f(4) = 4 + 1 = 5$.`, r`Smallest: $4$.`],
      'c5-3-4': [r`$f'(x) = \cos x - \sin x = 0$ at $x = \frac{\pi}{4}$.`, r`Candidates: $0$, $\frac{\pi}{4}$, $\pi$. Values: $1$, $\sqrt{2}$, $-1$.`, r`Largest: $\sqrt{2} \approx 1.414$.`],
      'c5-3-5': [r`$f'(x) = e^{-x}(1 - x) = 0$ at $x = 1$.`, r`Candidates 0, 1, 3. Values: $0$, $e^{-1} \approx 0.368$, $3e^{-3} \approx 0.149$.`, r`Largest: $\frac{1}{e} \approx 0.368$.`],
      'c5-3-6': [r`$f'(x) = 6x^2 - 18x + 12 = 6(x - 1)(x - 2)$: critical points 1 and 2.`, r`Candidates 0, 1, 2, 3: $f(0) = 0$, $f(1) = 2 - 9 + 12 = 5$, $f(2) = 16 - 36 + 24 = 4$, $f(3) = 54 - 81 + 36 = 9$.`, r`Max 9, min 0. Difference: $9$.`],
    },
    teach: {
      plan: [r`Draw a curve on a closed interval where the highest point is at an endpoint, to show endpoints matter.`, r`State the Extreme Value Theorem.`, r`Write the three-step candidates test: find critical points, list candidates, make a table.`, r`Do $x^3 - 3x$ on $[0, 2]$ together.`, r`Contrast with relative extrema: absolute is about the whole interval.`],
      questions: [
        { q: 'Why do endpoints count?', a: 'The graph might keep rising all the way to the end. Then the highest point is the endpoint, even though the slope there is not 0.' },
        { q: 'What if a critical point is outside the interval?', a: 'Ignore it. Only points inside the interval are candidates.' },
        { q: 'Is the answer the x-value or the y-value?', a: 'The maximum VALUE is the output f(x). The location is the x-value. Read the question carefully.' },
      ],
      keyPoints: ['Continuous on [a, b] guarantees an absolute max and min.', 'Candidates: critical points inside the interval and both endpoints.', 'Evaluate f at every candidate; compare.', 'The max value is an output, located at an x.'],
    },
  },
  'c5-4': {
    bigIdea: [
      r`The second derivative tells you how the graph bends. If $f'' > 0$, the slope is increasing, so the graph curves upward like a cup (concave up). If $f'' < 0$, the slope is decreasing and the graph curves downward like a frown (concave down).`,
      r`A point where the bending switches direction is an inflection point: the curve changes from cup to cap or cap to cup. You find it where $f''$ changes sign.`,
      r`The second derivative test: at a critical point where $f' = 0$, if the graph is concave up there, you are at the bottom of a cup: a minimum. If concave down, you are at the top of a cap: a maximum. If $f'' = 0$, the test is inconclusive and you go back to the first derivative test.`,
    ],
    picture: { title: 'Smile and frown', t: r`Concave up looks like a smile and holds water like a cup ($f'' > 0$). Concave down looks like a frown and spills water ($f'' < 0$). A flat spot in the middle of a smile is the lowest point; in the middle of a frown, the highest.` },
    words: [
      { term: 'Concave up', means: r`Bending upward; $f'$ is increasing; $f'' > 0$.` },
      { term: 'Concave down', means: r`Bending downward; $f'$ is decreasing; $f'' < 0$.` },
      { term: 'Inflection point', means: r`Where concavity changes; $f''$ changes sign.` },
      { term: 'Second derivative test', means: r`If $f'(c) = 0$: $f''(c) > 0$ → min, $f''(c) < 0$ → max, $f''(c) = 0$ → no conclusion.` },
    ],
    tools: [
      { name: 'Second derivatives', refresher: r`Differentiate twice; use the product and quotient rules as needed.`, lesson: 'c3-5' },
      { name: 'Sign charts', refresher: 'Same method as for f′, now applied to f″.', lesson: 'c5-2' },
      { name: 'Quotient rule', refresher: r`Needed for $f''$ of $\ln(x^2 + 1)$.`, lesson: 'c2-5' },
    ],
    why: [
      [r`Concavity is controlled by $f''$, so differentiate twice.`, r`$6x - 12$ is negative for $x < 2$ and positive for $x > 2$: the bending flips at 2.`],
      [r`Find the critical points first ($f' = 0$), then check how the graph bends at each.`, r`Concave up at a flat point is the bottom of a cup (min); concave down is the top of a cap (max).`],
    ],
    walk: {
      'c5-4-1': [r`$f'(x) = 3x^2 - 12x$, $f''(x) = 6x - 12$.`, r`$f'' = 0$ at $x = 2$; it is negative before and positive after.`, r`The sign changes, so there is an inflection point at $x = 2$.`],
      'c5-4-2': [r`$f'(x) = 4x^3 - 12x$, $f''(x) = 12x^2 - 12 = 12(x - 1)(x + 1)$.`, r`Zeros at $\pm 1$. Signs: $+$, $-$, $+$.`, r`Two sign changes: $2$ inflection points.`],
      'c5-4-3': [r`$f'(1) = 3 - 3 = 0$, so $x = 1$ is a critical point.`, r`$f''(x) = 6x$, so $f''(1) = 6 > 0$: concave up.`, r`Bottom of a cup: relative minimum. Choice B.`],
      'c5-4-4': [r`$f'(x) = e^x + xe^x = e^x(x + 1)$.`, r`$f''(x) = e^x(x + 1) + e^x = e^x(x + 2)$.`, r`$e^x > 0$, so the sign follows $x + 2$: changes at $x = -2$.`],
      'c5-4-5': [r`$f'(x) = \frac{2x}{x^2 + 1}$.`, r`Quotient rule: $f''(x) = \frac{2(x^2 + 1) - 2x(2x)}{(x^2 + 1)^2} = \frac{2 - 2x^2}{(x^2 + 1)^2}$.`, r`The bottom is always positive; the top $2(1 - x^2)$ changes sign at $x = \pm 1$. So $a = 1$.`],
      'c5-4-6': [r`We are given $f'$, so one derivative gives $f''$: $f''(x) = 2x - 4$.`, r`$2x - 4 = 0$ at $x = 2$, negative before, positive after.`, r`Inflection point at $x = 2$.`],
    },
    teach: {
      plan: [r`Draw a smile and a frown; label $f'' > 0$ and $f'' < 0$.`, r`Explain why: concave up means the slope keeps increasing (watch tangent lines rotate).`, r`Define inflection points and find one for $x^3 - 6x^2$.`, r`Teach the second derivative test on $x^3 - 3x$.`, r`Show $x^4$ at 0, where $f'' = 0$ but it is a minimum, to show “inconclusive”.`],
      questions: [
        { q: r`If $f''(c) = 0$, is it always an inflection point?`, a: r`No. $f''$ must change sign. $f(x) = x^4$ has $f''(0) = 0$, but it is concave up on both sides.` },
        { q: 'What is the difference between f′ and f″ information?', a: 'f′ tells direction (up or down). f″ tells bending (cup or cap).' },
        { q: 'Which test should I use for extrema?', a: 'The first derivative test always works. The second derivative test is faster when f″ is easy, but it can be inconclusive.' },
      ],
      keyPoints: ['f″ > 0: concave up; f″ < 0: concave down.', 'Inflection point: f″ changes sign.', 'Second derivative test: f′ = 0 and f″ > 0 → min; f″ < 0 → max.', 'f″ = 0 alone proves nothing.'],
    },
  },
  'c5-5': {
    bigIdea: [
      r`The AP exam loves to show you the graph of $f'$ and ask about $f$. This trips people up because you must read the picture as SLOPES, not heights. Every question becomes: what does the graph of $f'$ say about the slope of $f$?`,
      r`Translation guide. Where the graph of $f'$ is above the axis, $f$ is increasing; below, decreasing. Where $f'$ crosses the axis from above to below, $f$ has a max; from below to above, a min. Where $f'$ itself is increasing (going uphill), $f$ is concave up; where $f'$ is decreasing, $f$ is concave down.`,
      r`So the peaks and valleys of the $f'$ graph are the inflection points of $f$. Read slowly: “above/below the axis” talks about $f$ going up or down; “uphill/downhill” talks about $f$’s bending.`,
    ],
    picture: { title: 'A car’s speedometer recording', t: r`If you only had a recording of a car’s velocity, you could still say when it moved forward (velocity above 0), when it turned around (velocity crossing 0), and when it was accelerating (velocity rising). The velocity graph is the $f'$ graph; the car’s position is $f$.` },
    words: [
      { term: r`Graph of $f'$`, means: 'A picture whose heights are the slopes of f.' },
      { term: 'Crosses the axis', means: r`$f'$ changes sign: an extremum of $f$.` },
      { term: 'Touches the axis', means: r`$f' = 0$ but no sign change: no extremum.` },
      { term: r`Peak/valley of $f'$`, means: r`$f''$ changes sign: an inflection point of $f$.` },
    ],
    tools: [
      { name: 'First derivative test', refresher: 'Sign changes of f′ give extrema.', lesson: 'c5-2' },
      { name: 'Concavity', refresher: 'f′ increasing ⇔ f″ > 0 ⇔ concave up.', lesson: 'c5-4' },
      { name: 'Sine graph', refresher: r`$\sin x > 0$ on $(0, \pi)$ and $< 0$ on $(\pi, 2\pi)$.`, lesson: 'c0-8' },
    ],
    why: [
      [r`A squared factor is never negative, so it cannot flip the sign. Only $x - 1$ can.`, r`Sign changes of $f'$ are what make extrema; a touch without crossing (at 4) does not.`],
      [r`Inflection points of $f$ are sign changes of $f''$, which is the derivative of the given $f'$.`, r`$3x^2 - 3$ flips sign at $\pm 1$, so $f$ changes bending there.`],
    ],
    walk: {
      'c5-5-1': [r`Signs: $(x - 4)^2 \ge 0$ never changes sign. $(x - 1)$ changes sign at 1.`, r`At $x = 1$: $f'$ goes from $-$ to $+$, a relative min.`, r`At $x = 4$: $f' = 0$ but stays positive on both sides: no extremum. Total: $1$.`],
      'c5-5-2': [r`$f$ is decreasing where $f' < 0$.`, r`$x^2 - 9 < 0$ means $x^2 < 9$.`, r`So $-3 < x < 3$: choice B.`],
      'c5-5-3': [r`$f'$ increasing means its slope, $f''$, is positive.`, r`$f'' > 0$ means concave up.`, r`Choice C. (Note: $f'$ increasing does NOT tell us $f$ is increasing.)`],
      'c5-5-4': [r`Inflection points of $f$ need $f''$ to change sign. $f''(x) = 3x^2 - 3 = 3(x - 1)(x + 1)$.`, r`Signs: $+$, $-$, $+$: changes at $-1$ and 1.`, r`$2$ inflection points.`],
      'c5-5-5': [r`$e^x > 0$, so the sign of $f'$ is the sign of $x - 2$.`, r`Negative before 2, positive after.`, r`$-$ to $+$: relative minimum at $x = 2$.`],
      'c5-5-6': [r`$f' = \sin x$: positive on $(0, \pi)$, negative on $(\pi, 2\pi)$.`, r`So $f$ rises until $\pi$, then falls.`, r`Relative max at $x = \pi \approx 3.142$.`],
    },
    teach: {
      plan: [r`Draw a graph of $f'$ and ask your student what $f$ is doing. Expect the “heights” mistake and correct it gently.`, r`Make a translation table: $f'$ above/below axis, crossing, rising/falling, peaks/valleys.`, r`Sketch a possible $f$ from the $f'$ graph together.`, r`Do a factored $f'$ with a squared factor.`, r`Quiz: point to parts of an $f'$ graph and ask what $f$ does there.`],
      questions: [
        { q: 'If the graph of f′ is high, is f high?', a: 'No. A high f′ means f is rising steeply, not that f is large. Heights of f′ are slopes of f.' },
        { q: 'Where are the inflection points of f on an f′ graph?', a: 'At the peaks and valleys of f′ (where f′ changes from rising to falling or the reverse).' },
        { q: 'What does a squared factor in f′ do?', a: 'It makes f′ touch zero without changing sign, so f has a flat spot but no max or min there.' },
      ],
      keyPoints: ['Above the axis: f increasing; below: decreasing.', 'f′ crosses the axis: extremum of f.', 'f′ rising: f concave up; f′ falling: f concave down.', 'Peaks and valleys of f′ are inflection points of f.'],
    },
  },
  'c5-6': {
    bigIdea: [
      r`Optimization means finding the best: the biggest area, the least material, the shortest distance. Calculus does it the same way every time: write the quantity you want to optimize as a function of ONE variable, then find its absolute max or min with derivatives.`,
      r`The hard part is building the function. Usually you have two variables linked by a constraint (like a fixed perimeter). Use the constraint to replace one variable, so only one is left.`,
      r`Then: take the derivative, set it to 0, solve, and check that it really is a max or min (sign chart, second derivative test, or comparing endpoints). Finally, answer the question that was asked, with units.`,
    ],
    picture: { title: 'A pen for your dog', t: r`You have 40 feet of fence. A long skinny pen wastes space; a square pen gives the most room. Calculus proves the square is best: the area function rises, peaks, and falls as you change the shape, and the peak is where its derivative is 0.` },
    words: [
      { term: 'Objective function', means: 'The quantity you want to maximize or minimize, written as a function.' },
      { term: 'Constraint', means: 'A fixed condition linking the variables, like perimeter = 40.' },
      { term: 'Feasible domain', means: 'The x-values that make physical sense (lengths positive, etc.).' },
    ],
    tools: [
      { name: 'Writing equations from words', refresher: 'Name each quantity with a letter; write area, perimeter, volume formulas.', lesson: 'c0-2' },
      { name: 'Absolute extrema', refresher: 'Critical points and endpoints are the candidates.', lesson: 'c5-3' },
      { name: 'First derivative test', refresher: 'Justify a max with f′ changing from + to −.', lesson: 'c5-2' },
    ],
    why: [
      [r`The box’s base is $12 - 2x$ on each side (a square $x$ cut from each end) and its height is $x$; the domain keeps all lengths positive.`, r`Factor the derivative to find where it is zero; $x = 6$ is outside the domain (no box).`, r`The sign change from $+$ to $-$ proves $x = 2$ gives the max; then compute the volume.`],
      [r`Minimizing the distance is the same as minimizing its square (no root to differentiate). A point on the curve is $(x, \sqrt{x})$, so $y^2 = x$.`, r`Differentiate and set to zero.`, r`The $y$-coordinate comes from the curve: $\sqrt{1.5}$.`],
    ],
    walk: {
      'c5-6-1': [r`Let the numbers be $x$ and $20 - x$ (the constraint: sum 20).`, r`Product: $P(x) = x(20 - x) = 20x - x^2$.`, r`$P'(x) = 20 - 2x = 0$ at $x = 10$; $P'' = -2 < 0$, so it is a max.`, r`$P = 10 \cdot 10 = 100$.`],
      'c5-6-2': [r`Sides $x$ and $y$ with $2x + 2y = 40$, so $y = 20 - x$.`, r`Area: $A(x) = x(20 - x)$.`, r`$A'(x) = 20 - 2x = 0$ at $x = 10$, so $y = 10$: a square.`, r`Area: $100$.`],
      'c5-6-3': [r`Volume: $V(x) = x(12 - 2x)^2$ for $0 < x < 6$.`, r`$V'(x) = (12 - 2x)^2 + x \cdot 2(12 - 2x)(-2) = (12 - 2x)(12 - 2x - 4x) = (12 - 2x)(12 - 6x)$.`, r`Zero at $x = 2$ (and 6, excluded); $V'$ goes $+$ to $-$ at 2.`, r`$V(2) = 2 \cdot 8^2 = 128$ cubic inches.`],
      'c5-6-4': [r`A point on the curve: $(x, \sqrt{x})$. Squared distance to $(2, 0)$: $D^2 = (x - 2)^2 + (\sqrt{x})^2 = (x - 2)^2 + x$.`, r`Derivative: $2(x - 2) + 1$.`, r`Set to 0: $2x - 4 + 1 = 0$, so $x = 1.5$.`],
      'c5-6-5': [r`Let $x$ be each side perpendicular to the river and $y$ the side parallel. Fence: $2x + y = 600$, so $y = 600 - 2x$.`, r`Area: $A(x) = x(600 - 2x) = 600x - 2x^2$.`, r`$A'(x) = 600 - 4x = 0$ at $x = 150$, so $y = 300$.`, r`$A = 150 \cdot 300 = 45{,}000$ square feet.`],
      'c5-6-6': [r`Constraint: volume $\pi r^2 h = 16\pi$, so $h = \frac{16}{r^2}$.`, r`Surface (top, bottom, side): $S = 2\pi r^2 + 2\pi rh = 2\pi r^2 + \frac{32\pi}{r}$.`, r`$S'(r) = 4\pi r - \frac{32\pi}{r^2} = 0$ gives $r^3 = 8$.`, r`$r = 2$ inches (and $h = 4$). $S'$ goes $-$ to $+$, so it is a minimum.`],
    },
    teach: {
      plan: [r`Pose the dog-pen problem and let your student try a few rectangles by hand.`, r`Write the steps: draw, name variables, objective, constraint, substitute, differentiate, solve, justify, answer.`, r`Solve the dog-pen problem with calculus.`, r`Do the box problem, emphasizing the domain.`, r`Ask your student to explain why the answer is a max, not a min.`],
      questions: [
        { q: 'How do I know which formula to optimize?', a: 'Read the question’s last sentence: “maximize the area” means the objective is the area formula.' },
        { q: 'Why do I need the constraint?', a: 'To reduce two variables to one. Derivative methods from this unit work on functions of one variable.' },
        { q: 'Do I need to justify the max?', a: 'Yes, on the AP exam. Use a sign change of the derivative, the second derivative, or compare with endpoint values.' },
      ],
      keyPoints: ['Write the objective in terms of one variable using the constraint.', 'Find critical points in the feasible domain.', 'Justify max/min (sign change, second derivative, or endpoints).', 'Answer the question asked, with units.'],
    },
  },
};
