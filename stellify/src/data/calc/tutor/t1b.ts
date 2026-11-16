import type { LessonTutor } from '../types';

const r = String.raw;

/** Tutor layer · Unit 1 (lessons 6–9): infinity, continuity and the IVT. */
export const TUTOR1B: Record<string, LessonTutor> = {
  'c1-6': {
    bigIdea: [
      r`What happens when you divide 1 by a very small number? $\frac{1}{0.1} = 10$, $\frac{1}{0.001} = 1000$, $\frac{1}{0.000001} = 1{,}000{,}000$. The smaller the bottom, the bigger the answer. As the bottom shrinks to 0, the fraction grows without any limit.`,
      r`When that happens we write the limit as $\infty$ (or $-\infty$ if it heads down). This is a way of describing HOW the limit fails to be a number: the graph shoots straight up or down. On the graph, there is a vertical line the curve hugs but never touches: a vertical asymptote.`,
      r`The key skill is figuring out the SIGN. If the top heads to a positive number and the bottom is a tiny positive number, the result is $+\infty$. If the bottom is a tiny negative number, it is $-\infty$. So for each side, ask: is the bottom a little above zero or a little below?`,
    ],
    picture: { title: 'Sharing a pizza with fewer and fewer... then tiny slices', t: r`Divide 1 pizza into slices of size 0.1 and you get 10 slices; size 0.001 gives 1000 slices. As the slice size shrinks toward nothing, the number of slices explodes. That explosion is an infinite limit.` },
    words: [
      { term: r`$\infty$ (infinity)`, means: 'Not a number, but a description: the values grow larger than any number you name.' },
      { term: 'Infinite limit', means: r`$\lim\limits_{x \to a} f(x) = \infty$ means $f(x)$ grows without bound as $x \to a$.` },
      { term: 'Vertical asymptote', means: r`A vertical line $x = a$ that the graph approaches while shooting up or down.` },
      { term: r`$0^+$ and $0^-$`, means: 'A quantity approaching 0 through positive values or through negative values.' },
    ],
    tools: [
      { name: 'Sign rules for division', refresher: 'positive ÷ positive = positive; positive ÷ negative = negative.', lesson: 'c0-1' },
      { name: 'One-sided limits', refresher: 'Check each side separately; the sign of the bottom can differ on each side.', lesson: 'c1-2' },
      { name: 'Factoring and holes', refresher: 'A zero in the bottom that cancels gives a hole, not an asymptote.', lesson: 'c1-4' },
      { name: 'Graphs of ln x and tan x', refresher: r`$\ln x$ dives down near 0; $\tan x$ shoots up near $\frac{\pi}{2}$.`, lesson: 'c0-7' },
    ],
    why: [
      [r`Squaring makes the bottom positive on both sides, and it shrinks to 0. So we have 1 divided by a tiny positive number.`, r`Dividing by a tiny positive number gives a huge positive number, on both sides, so the two-sided limit is $+\infty$.`],
      [r`The top is not heading to 0, so this is not $\frac{0}{0}$: it is “4 over something tiny”. The sign of $x - 3$ flips at 3.`, r`Different signs on the two sides means the graph goes down on one side and up on the other, so there is no single two-sided behavior.`],
    ],
    walk: {
      'c1-6-1': [r`As $x \to 0$, $x^2$ is always positive and gets tiny: $0.1^2 = 0.01$, $0.01^2 = 0.0001$.`, r`$\frac{1}{\text{tiny positive}}$ is huge and positive: $\frac{1}{0.0001} = 10{,}000$.`, r`Same on both sides (squares are positive), so the limit is $\infty$.`],
      'c1-6-2': [r`$x \to 2^+$ means $x$ slightly bigger than 2, like 2.001. Then $x - 2 = 0.001$: tiny and positive.`, r`$\frac{3}{0.001} = 3000$, and smaller differences give bigger results.`, r`The limit is $\infty$.`],
      'c1-6-3': [r`$x \to 2^-$ means $x$ slightly less than 2, like 1.999. Then $x - 2 = -0.001$: tiny and negative.`, r`$\frac{3}{-0.001} = -3000$.`, r`The values head down without bound: $-\infty$.`],
      'c1-6-4': [r`Plug in $x = -1$ on top: $-1 + 2 = 1$, positive and not 0.`, r`Bottom: $(x + 1)^2$ goes to 0 and is always positive (it is a square).`, r`$\frac{\text{about } 1}{\text{tiny positive}}$ is huge positive on both sides: $\infty$.`],
      'c1-6-5': [r`Remember the graph of $\ln x$: it rises slowly to the right and plunges down as $x$ approaches 0 from the right.`, r`Numbers: $\ln 0.01 \approx -4.6$, $\ln 0.0001 \approx -9.2$, $\ln 0.000001 \approx -13.8$.`, r`They decrease without bound: $-\infty$.`],
      'c1-6-6': [r`$\tan x = \frac{\sin x}{\cos x}$. Near $\frac{\pi}{2}$, $\sin x \approx 1$.`, r`Approaching $\frac{\pi}{2}$ from the left (angles a bit less than 90°), $\cos x$ is a tiny positive number.`, r`$\frac{1}{\text{tiny positive}} \to \infty$.`],
      'c1-6-7': [r`Vertical asymptotes come from zeros of the bottom that do NOT cancel. Factor first.`, r`Top: $(x - 2)(x + 2)$. Bottom: $x^2 - x - 2 = (x - 2)(x + 1)$.`, r`$(x - 2)$ cancels, so $x = 2$ is only a hole. $(x + 1)$ remains on the bottom, so $x = -1$ is an asymptote.`, r`Answer: $1$ vertical asymptote.`],
      'c1-6-8': [r`Factor and cancel first: $\frac{(x - 3)(x + 3)}{(x - 3)^2} = \frac{x + 3}{x - 3}$.`, r`Top heads to $3 + 3 = 6$, positive.`, r`From the left, $x < 3$, so $x - 3$ is tiny negative.`, r`$\frac{6}{\text{tiny negative}} \to -\infty$.`],
    },
    teach: {
      plan: [r`Make a table of $\frac{1}{x}$ for $x = 0.1, 0.01, 0.001$ and for the negatives. Let your student see the explosion and the sign change.`, r`Explain that $\infty$ is a description, not a number.`, r`Teach the sign check: top’s sign ÷ bottom’s sign, on each side.`, r`Draw a vertical asymptote and show how the graph hugs it.`, r`Show $\frac{x^2 - 4}{x^2 - x - 2}$: one zero of the bottom is a hole, the other an asymptote.`],
      questions: [
        { q: r`If the limit is $\infty$, does the limit exist?`, a: r`Technically no: a limit that exists must be a real number. Writing $\infty$ tells us HOW it fails to exist: by growing without bound.` },
        { q: 'Does every zero of the denominator give an asymptote?', a: 'No. If the factor cancels with the top, it gives a hole instead. Always factor and cancel first.' },
        { q: r`What is $\frac{0}{0}$ vs $\frac{5}{0}$?`, a: r`$\frac{0}{0}$ is indeterminate: simplify. $\frac{5}{0}$ (nonzero over zero) means the function blows up; find the sign on each side.` },
      ],
      keyPoints: ['Nonzero ÷ (something → 0) blows up to ±∞.', 'The sign comes from the signs of top and bottom on each side.', 'Vertical asymptotes are at zeros of the bottom that do not cancel.', '∞ describes unbounded growth; it is not a number.'],
    },
  },
  'c1-7': {
    bigIdea: [
      r`Now we flip the question: instead of $x$ approaching a number, what happens as $x$ grows forever, toward $\infty$? Where does the graph end up far to the right (or far to the left)?`,
      r`For fractions of polynomials, only the biggest powers matter in the long run. In $\frac{3x^2 - x}{5x^2 + 2}$, when $x$ is a million, $3x^2$ is three trillion and $-x$ is a measly million. The small terms become crumbs. So the fraction behaves like $\frac{3x^2}{5x^2} = \frac{3}{5}$.`,
      r`If the graph settles toward a height $L$ far out, the line $y = L$ is a horizontal asymptote. Comparing the top and bottom degrees tells you the answer fast: bigger bottom means 0, equal degrees means the ratio of the leading numbers, bigger top means it runs off to infinity.`,
    ],
    picture: { title: 'Billionaires and pocket change', t: r`If one person has 3 billion dollars plus 7 dollars, and another has 5 billion minus 2 dollars, the ratio of their fortunes is basically $\frac{3}{5}$. The extra few dollars are irrelevant at that scale. Leading terms are the billions; the rest is pocket change.` },
    words: [
      { term: 'Limit at infinity', means: r`$\lim\limits_{x \to \infty} f(x)$: where $f(x)$ heads as $x$ grows without bound.` },
      { term: 'Horizontal asymptote', means: r`A horizontal line $y = L$ that the graph approaches far to the right or left.` },
      { term: 'Degree', means: r`The highest power of $x$ in a polynomial. $5x^3 + x$ has degree 3.` },
      { term: 'Leading coefficient', means: r`The number in front of the highest power. In $5x^3 + x$, it is 5.` },
      { term: 'Dominant term', means: 'The part of an expression that grows fastest and controls its long-run behavior.' },
    ],
    tools: [
      { name: 'Exponent rules', refresher: r`$\sqrt{x^2} = |x|$, and dividing by $e^{2x}$ turns $e^x$ into $e^{-x}$.`, lesson: 'c0-5' },
      { name: 'Exponentials and logs', refresher: r`$e^{-x} \to 0$ as $x \to \infty$; $\ln x$ grows, but very slowly.`, lesson: 'c0-7' },
      { name: 'Conjugates', refresher: r`Multiply by $\sqrt{a} + b$ over itself to simplify $\sqrt{a} - b$.`, lesson: 'c1-4' },
    ],
    why: [
      [r`For huge $x$, the $x^2$ terms dwarf everything else, so only the leading terms matter.`, r`$\frac{3x^2}{5x^2}$: the $x^2$ cancels, leaving the ratio of leading coefficients.`],
      [r`Under the root, $4x^2$ dominates the $+1$. But $\sqrt{x^2} = |x|$, not $x$, and for negative $x$, $|x| = -x$. This sign detail is the whole trap.`, r`Now divide: the $x$’s cancel and the minus sign survives.`, r`Going right ($x > 0$), $|x| = x$ and you get $+2$. The two ends have different asymptotes.`],
    ],
    walk: {
      'c1-7-1': [r`Top and bottom both have degree 3. Equal degrees: the answer is the ratio of leading coefficients.`, r`Leading terms: $2x^3$ on top, $7x^3$ on bottom.`, r`$\frac{2x^3}{7x^3} = \frac{2}{7}$.`],
      'c1-7-2': [r`Top has degree 1, bottom degree 2: the bottom grows faster.`, r`For huge $x$ it behaves like $\frac{4x}{x^2} = \frac{4}{x}$.`, r`$\frac{4}{x} \to 0$ as $x$ grows. The limit is $0$.`],
      'c1-7-3': [r`Top degree 3, bottom degree 2: the top grows faster.`, r`It behaves like $\frac{x^3}{x^2} = x$.`, r`$x \to \infty$, so the limit is $\infty$.`],
      'c1-7-4': [r`Under the root, $9x^2$ dominates: $\sqrt{9x^2 + 4} \approx \sqrt{9x^2} = 3|x|$.`, r`As $x \to \infty$, $x$ is positive, so $3|x| = 3x$. The bottom behaves like $2x$.`, r`$\frac{3x}{2x} = \frac{3}{2}$.`],
      'c1-7-5': [r`Same dominant terms as before, but now $x \to -\infty$, so $x$ is negative.`, r`For negative $x$, $|x| = -x$, so $\sqrt{9x^2} = 3|x| = -3x$.`, r`$\frac{-3x}{2x} = -\frac{3}{2}$. The sign flips at the left end!`],
      'c1-7-6': [r`As $x \to \infty$, $e^{2x}$ is the dominant term (it grows fastest). Divide top and bottom by it.`, r`Top: $\frac{3e^{2x} - e^x}{e^{2x}} = 3 - e^{-x}$. Bottom: $1 + 4e^{-2x}$.`, r`$e^{-x}$ and $e^{-2x}$ shrink to 0 as $x \to \infty$.`, r`$\frac{3 - 0}{1 + 0} = 3$.`],
      'c1-7-7': [r`Now $x \to -\infty$. Exponentials with negative inputs shrink: $e^{-100}$ is microscopic.`, r`So $e^{2x} \to 0$ and $e^x \to 0$. Top $\to 0$.`, r`Bottom $\to 0 + 4 = 4$.`, r`$\frac{0}{4} = 0$.`],
      'c1-7-8': [r`It looks like $\infty - \infty$, which is indeterminate. Multiply by the conjugate $\frac{\sqrt{x^2 + 6x} + x}{\sqrt{x^2 + 6x} + x}$.`, r`Top: $(x^2 + 6x) - x^2 = 6x$. So we have $\frac{6x}{\sqrt{x^2 + 6x} + x}$.`, r`Divide top and bottom by $x$: $\frac{6}{\sqrt{1 + 6/x} + 1}$.`, r`As $x \to \infty$, $\frac{6}{x} \to 0$: $\frac{6}{1 + 1} = 3$.`],
      'c1-7-9': [r`Both $\ln x$ and $x$ grow forever, so it is $\frac{\infty}{\infty}$.`, r`Compare speeds: at $x = 1{,}000{,}000$, $\ln x \approx 13.8$. The bottom is a million.`, r`The logarithm grows far slower, so the ratio shrinks to $0$. (Unit 4’s L’Hôpital’s rule proves it.)`],
    },
    teach: {
      plan: [r`Tell the billionaire story, then show $\frac{3x^2 - x}{5x^2 + 2}$ at $x = 1000$ on a calculator.`, r`Teach the three degree cases: bottom bigger → 0, equal → ratio, top bigger → $\pm\infty$.`, r`Draw a horizontal asymptote.`, r`Show the $\sqrt{x^2} = |x|$ trap with $x \to -\infty$.`, r`Do one exponential example by dividing by the dominant exponential.`],
      questions: [
        { q: 'Can a graph cross its horizontal asymptote?', a: 'Yes! A horizontal asymptote only describes the far-left or far-right behavior. In the middle, the graph can cross it.' },
        { q: r`Why is $\sqrt{x^2}$ not just $x$?`, a: r`Square roots are never negative. If $x = -5$, $\sqrt{(-5)^2} = \sqrt{25} = 5 = -x$. So $\sqrt{x^2} = |x|$.` },
        { q: 'Which grows fastest: logs, powers or exponentials?', a: r`Exponentials beat powers, and powers beat logs. For example $\frac{\ln x}{x} \to 0$ and $\frac{x^{100}}{e^x} \to 0$.` },
      ],
      keyPoints: ['As x → ±∞, only the dominant terms matter.', 'Compare degrees: bottom bigger → 0; equal → ratio of leading coefficients; top bigger → ±∞.', '√(x²) = |x|: watch the sign as x → −∞.', 'A horizontal asymptote y = L describes far-out behavior.'],
    },
  },
  'c1-8': {
    bigIdea: [
      r`A continuous function is one you can draw without lifting your pencil. No holes, no jumps, no sudden explosions. Most functions you know are continuous wherever they are defined.`,
      r`Precisely, $f$ is continuous at $x = a$ when three things happen: $f(a)$ exists (there is a dot), $\lim\limits_{x \to a} f(x)$ exists (the graph heads somewhere), and they are equal (the dot is exactly where the graph is heading).`,
      r`If any of the three fails, there is a discontinuity, and there are three kinds. Removable: a hole (the limit exists but the dot is missing or misplaced). Jump: the left and right sides head to different heights. Infinite: the graph shoots off to infinity.`,
    ],
    picture: { title: 'A road trip', t: r`A continuous road lets you drive without stopping. A pothole you can fill with one shovel of asphalt is a removable discontinuity. A cliff where the road continues 10 feet lower is a jump. A road that rises into the sky forever is an infinite discontinuity.` },
    words: [
      { term: 'Continuous at a', means: r`$f(a)$ exists, $\lim\limits_{x \to a} f(x)$ exists, and they are equal.` },
      { term: 'Removable discontinuity', means: 'A hole: the limit exists but f(a) is missing or wrong. Redefining one point fixes it.' },
      { term: 'Jump discontinuity', means: 'The one-sided limits exist but are different.' },
      { term: 'Infinite discontinuity', means: 'The function blows up to ±∞ (a vertical asymptote).' },
    ],
    tools: [
      { name: 'One-sided limits', refresher: 'Piecewise functions are continuous at a break point only if both pieces meet there.', lesson: 'c1-2' },
      { name: 'Factoring to find holes', refresher: 'Cancel the common factor; plug in to find the height of the hole.', lesson: 'c1-4' },
      { name: 'Special trig limit', refresher: r`$\frac{\sin kx}{x} \to k$ as $x \to 0$.`, lesson: 'c1-5' },
      { name: 'Solving systems', refresher: 'Two equations with two unknowns: subtract one from the other.', lesson: 'c0-2' },
    ],
    why: [
      [r`The function is a line with a hole at $x = 2$; first find the height of the hole by factoring and cancelling.`, r`Continuity requires the dot to sit exactly at the height the graph approaches, so $k$ must equal that height.`],
      [r`Continuity at a break point means the two pieces meet. Each piece is a polynomial, so plug in 1 to find where each ends.`, r`Setting them equal gives an impossible statement, so no choice of $a$ closes the gap: the pieces are always 2 apart.`],
    ],
    walk: {
      'c1-8-1': [r`Check the three conditions at $x = 1$. Is $f(1)$ defined? $\frac{0}{0}$: no.`, r`Does the limit exist? Factor: $\frac{(x - 1)(x + 1)}{x - 1} = x + 1 \to 2$. Yes.`, r`The limit exists but the point is missing: a hole. That is a removable discontinuity: choice A.`],
      'c1-8-2': [r`The pieces meet at $x = 2$; they must reach the same height there.`, r`Left piece at 2: $k(2) + 1 = 2k + 1$. Right piece at 2: $2^2 - k = 4 - k$.`, r`Set equal: $2k + 1 = 4 - k$. Add $k$: $3k + 1 = 4$. So $3k = 3$ and $k = 1$.`],
      'c1-8-3': [r`For continuity, $f(0)$ must equal the limit at 0.`, r`Use the special trig limit: $\frac{\sin 3x}{x} = 3 \cdot \frac{\sin 3x}{3x} \to 3 \cdot 1 = 3$.`, r`So $c = 3$.`],
      'c1-8-4': [r`A fraction is discontinuous where its bottom is zero.`, r`$x^2 - 9 = 0$ means $x^2 = 9$, so $x = 3$ or $x = -3$.`, r`At $x = -3$ the factor $(x + 3)$ cancels with the top (a hole); at $x = 3$ it does not (an asymptote). Both are discontinuities: $2$.`],
      'c1-8-5': [r`Left limit at 1, using $x + 2$: $1 + 2 = 3$.`, r`Right limit at 1, using $4 - x$: $4 - 1 = 3$. And $f(1)$ uses the second piece: $3$.`, r`Value, left and right all equal 3: continuous. Choice C.`],
      'c1-8-6': [r`Continuity at $x = 1$: the first two pieces meet. $1^2 = a(1) + b$, so $a + b = 1$.`, r`Continuity at $x = 3$: the last two pieces meet. $3a + b = 2(3) + 3 = 9$.`, r`Subtract the first equation from the second: $2a = 8$, so $a = 4$.`, r`Then $4 + b = 1$, so $b = -3$.`],
      'c1-8-7': [r`Find the height of the hole: factor $x^2 - x - 6 = (x - 3)(x + 2)$.`, r`Cancel $(x - 3)$: $x + 2$.`, r`Plug in 3: $5$. Defining $g(3) = 5$ fills the hole.`],
      'c1-8-8': [r`A: $\frac{|x|}{x}$ is $-1$ on the left and 1 on the right: a jump. Not continuous.`, r`B: the floor function jumps at every integer, including 0. D: $\frac{1}{x}$ is undefined at 0.`, r`C: $-|x| \le x\sin\frac{1}{x} \le |x|$, so by squeezing the limit is 0, which equals $f(0) = 0$. Continuous. Choice C.`],
    },
    teach: {
      plan: [r`Ask your student to draw a graph without lifting the pencil: that is continuity.`, r`Write the three-part definition and check it on a simple example.`, r`Draw the three kinds of discontinuity side by side: hole, jump, asymptote.`, r`Do a “find $k$” piecewise problem: make the pieces meet.`, r`Do a hole problem: find the height that fills it.`],
      questions: [
        { q: 'Which functions are automatically continuous?', a: 'Polynomials everywhere; rational functions, roots, logs and trig functions everywhere they are defined; and sums, products and compositions of continuous functions.' },
        { q: 'Why is a removable discontinuity called removable?', a: 'Because changing or adding a single point fixes it: define f(a) to be the limit and the hole is gone.' },
        { q: 'Can a function be continuous but have a sharp corner?', a: r`Yes. $|x|$ has a corner at 0 but you can draw it without lifting your pencil. Corners matter for derivatives, not for continuity.` },
      ],
      keyPoints: ['Continuous at a: f(a) exists, the limit exists, and they are equal.', 'Removable (hole), jump, and infinite discontinuities.', 'Piecewise functions: make the pieces meet.', 'Fill a hole by defining f(a) as the limit.'],
    },
  },
  'c1-9': {
    bigIdea: [
      r`If you were 4 feet tall when you were six and 5 feet tall when you were ten, then at some moment in between you were exactly 4.5 feet tall. You did not jump over it; you grew continuously. That obvious idea is the Intermediate Value Theorem (IVT).`,
      r`In math: if $f$ is continuous on $[a, b]$, then $f$ takes every value between $f(a)$ and $f(b)$ somewhere between $a$ and $b$. The most common use: if $f$ changes sign (negative at one end, positive at the other), it must cross zero in between.`,
      r`The IVT tells you that a solution EXISTS, not where exactly it is. It also needs continuity: a function with a jump or a gap can skip values, and then the theorem says nothing.`,
    ],
    picture: { title: 'Crossing a river', t: r`If you start on the south bank and end on the north bank, and you never teleport (continuous path), you must have crossed the river at some point. A sign change is the two banks; zero is the river.` },
    words: [
      { term: 'Intermediate Value Theorem', means: r`If $f$ is continuous on $[a, b]$ and $k$ is between $f(a)$ and $f(b)$, then $f(c) = k$ for some $c$ in $(a, b)$.` },
      { term: 'Zero / root', means: r`An input $c$ where $f(c) = 0$: where the graph crosses or touches the $x$-axis.` },
      { term: 'Closed interval [a, b]', means: r`All numbers from $a$ to $b$, including the endpoints.` },
      { term: 'Existence theorem', means: 'A theorem that guarantees something exists without telling you exactly where.' },
    ],
    tools: [
      { name: 'Continuity', refresher: 'The IVT only works for continuous functions; check for division by zero.', lesson: 'c1-8' },
      { name: 'Reading tables', refresher: 'Look for sign changes or for a target value between consecutive entries.' },
      { name: 'Trig values', refresher: r`$\cos 0 = 1$ and $\cos 1 \approx 0.54$ (radians).`, lesson: 'c0-8' },
    ],
    why: [
      [r`The IVT needs continuity on the interval, so we confirm it first: polynomials are continuous everywhere.`, r`Zero is between $-1$ and $1$, which is exactly the situation the IVT handles.`, r`So the graph must cross zero somewhere in between, which means a solution exists.`],
      [r`Each sign change between consecutive values forces at least one crossing of 0 in that stretch.`, r`Two separate sign changes give two separate zeros, so the minimum is 2. There could be more, but the IVT only guarantees 2.`],
    ],
    walk: {
      'c1-9-1': [r`$f$ is continuous on $[2, 6]$, $f(2) = -3$ and $f(6) = 5$.`, r`0 is between $-3$ and $5$, so the IVT guarantees $f(c) = 0$ for some $c$ in $(2, 6)$.`, r`The other options are not forced: $f$ could wiggle, and 6 is not between $-3$ and 5. Answer: A.`],
      'c1-9-2': [r`Look for sign changes between neighbors: $3 \to -1$ (yes), $-1 \to 2$ (yes), $2 \to 5$ (no), $5 \to -2$ (yes).`, r`Each sign change forces at least one zero in that interval.`, r`Three sign changes: at least $3$ zeros.`],
      'c1-9-3': [r`The IVT requires continuity on the whole closed interval $[-1, 1]$.`, r`$\frac{1}{x}$ is undefined at $x = 0$, which is inside the interval, so it is not continuous there.`, r`The IVT does not apply, and in fact $\frac{1}{x}$ is never 0. Answer: B.`],
      'c1-9-4': [r`Find the endpoint values: $f(1) = 2$ and $f(3) = 10$.`, r`The IVT guarantees every value between 2 and 10.`, r`Of 1, 11, 7 and 0, only 7 is between 2 and 10. Answer: C.`],
      'c1-9-5': [r`Rewrite $\cos x = x$ as $g(x) = \cos x - x = 0$. $g$ is continuous.`, r`$g(0) = 1 - 0 = 1 > 0$. $g(1) = \cos 1 - 1 \approx 0.54 - 1 < 0$.`, r`The sign changes on $[0, 1]$, so the IVT puts a solution there. Answer: C.`],
      'c1-9-6': [r`We want $f(x) = 3$. Check whether 3 lies between consecutive values.`, r`$5 \to 1$: 3 is between them, so at least one solution. $1 \to -2$: no. $-2 \to 4$: yes, another solution.`, r`At least $2$ solutions.`],
    },
    teach: {
      plan: [r`Tell the height story (4 ft to 5 ft passes 4.5 ft).`, r`Draw a continuous curve from below the axis to above it and show it must cross.`, r`Draw a function with a jump that skips a value, to show why continuity is required.`, r`State the IVT carefully, including “continuous on the closed interval”.`, r`Practice with a table: count sign changes.`],
      questions: [
        { q: 'Does the IVT tell me where the zero is?', a: 'No, only that at least one exists in the interval. To find it, you would use algebra or a calculator.' },
        { q: 'Can there be more zeros than the IVT guarantees?', a: 'Yes. The IVT gives a minimum. The function could cross many times.' },
        { q: 'What should I write on a free-response question?', a: r`State that $f$ is continuous on $[a, b]$, give the endpoint values, say that $k$ is between them, and conclude “by the IVT, there is a $c$ in $(a, b)$ with $f(c) = k$”.` },
      ],
      keyPoints: ['Continuous on [a, b] is required.', 'Every value between f(a) and f(b) is hit somewhere in between.', 'A sign change guarantees a zero.', 'The IVT guarantees existence, not location or uniqueness.'],
    },
  },
};
