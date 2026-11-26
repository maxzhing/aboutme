import type { LessonTutor } from '../types';

const r = String.raw;

/** Tutor layer · Unit 1 (lessons 1–5): limits, explained from the ground up. */
export const TUTOR1A: Record<string, LessonTutor> = {
  'c1-1': {
    bigIdea: [
      r`Imagine walking toward a door. You get halfway, then halfway again, then halfway again. You get closer and closer, and it is obvious where you are heading: the door. A limit is that idea in math: not where you are, but where you are heading.`,
      r`For a function, we ask: as the input $x$ gets closer and closer to some number $a$, what number does the output $f(x)$ get closer and closer to? That target is the limit, written $\lim\limits_{x \to a} f(x)$.`,
      r`Here is the surprising part: the limit does not care what happens exactly AT $x = a$. The function might be undefined there, or have a strange value there. The limit only looks at the nearby values. That is exactly what makes it useful, because calculus keeps running into expressions like $\frac{0}{0}$ that we cannot compute directly.`,
      r`The simplest way to find a limit is to sneak up on it: plug in numbers closer and closer to $a$, from both sides, and watch where the outputs are heading.`,
    ],
    picture: { title: 'A photo with one pixel missing', t: r`Picture a photo of a road with one tiny pixel erased. You can still tell exactly what color that pixel should be by looking at the pixels around it. The limit is the color the neighbors tell you; the actual pixel (the function value) might be missing or even the wrong color.` },
    words: [
      { term: 'Limit', means: r`The value $f(x)$ approaches as $x$ approaches $a$. Written $\lim\limits_{x \to a} f(x) = L$.` },
      { term: r`$x \to a$`, means: r`“$x$ approaches $a$”: $x$ gets arbitrarily close to $a$ but is never equal to it.` },
      { term: 'Undefined', means: r`Has no value, like $\frac{0}{0}$ or dividing by zero.` },
      { term: 'Indeterminate form', means: r`An expression like $\frac{0}{0}$ that does not tell you the answer by itself; you need more work.` },
      { term: 'Estimate', means: 'A careful best guess, here based on a table of nearby values.' },
    ],
    tools: [
      { name: 'Evaluating functions', refresher: r`Plugging numbers into a formula, like $f(0.99)$, carefully and with a calculator.`, lesson: 'c0-3' },
      { name: 'Holes in graphs', refresher: r`$\frac{x^2 - 4}{x - 2}$ is a line with a single missing point. The limit asks for the height of that hole.`, lesson: 'c0-6' },
      { name: 'Exponentials and trig', refresher: r`Some examples use $e^x$ and $\sin x$ (radians!).`, lesson: 'c0-7' },
    ],
    why: [
      [r`Plugging in $x = 1$ gives $\frac{1 - 1}{1 - 1} = \frac{0}{0}$, which is meaningless. So instead of asking “what is it AT 1?”, we ask “what is it heading toward NEAR 1?”.`, r`We test numbers just below 1 and just above 1, getting closer each time, and look for a pattern in the outputs.`, r`Both sides home in on the same number, 2. When the left and right agree, that number is the limit.`],
      [r`The limit only looks at $x$ values near 2, never at 2 itself, so we use the formula that applies near 2.`, r`The single value at $x = 2$ is like the one strange pixel: it does not change what the neighbors say.`, r`This example shows the most important fact about limits: the limit and the function value are different questions and can have different answers.`],
    ],
    walk: {
      'c1-1-1': [r`Plugging in $x = 0$ gives $\frac{e^0 - 1}{0} = \frac{0}{0}$, so we must estimate with nearby values.`, r`Right side: $x = 0.01$ gives $\frac{e^{0.01} - 1}{0.01} \approx \frac{0.01005}{0.01} = 1.005$.`, r`Left side: $x = -0.01$ gives $\frac{e^{-0.01} - 1}{-0.01} \approx \frac{-0.00995}{-0.01} = 0.995$.`, r`One side is a hair above 1, the other a hair below, and they squeeze closer as $x$ shrinks. The limit is $1$.`],
      'c1-1-2': [r`At $x = 3$: $\frac{9 - 9}{3 - 3} = \frac{0}{0}$. Estimate instead.`, r`$x = 2.99$: $\frac{8.9401 - 9}{-0.01} = \frac{-0.0599}{-0.01} = 5.99$.`, r`$x = 3.01$: $\frac{9.0601 - 9}{0.01} = 6.01$.`, r`Both sides approach $6$. (Sneak peek of Lesson 4: it factors to $x + 3$, and $3 + 3 = 6$.)`],
      'c1-1-3': [r`A limit is about values NEAR $x = 2$, not AT it.`, r`Choice A ($f(2) = 5$) is about the value at 2, which the limit does not control. C (continuous) and D ($f(2)$ defined) also need information about $f(2)$ itself.`, r`Choice B describes exactly what “the limit is 5” means: $f(x)$ can be made as close to 5 as we like by taking $x$ close enough to 2.`],
      'c1-1-4': [r`Near $x = 1$ (but not at 1), $g(x) = x^2$.`, r`As $x$ gets close to 1, $x^2$ gets close to $1^2 = 1$: for example $0.99^2 = 0.9801$ and $1.01^2 = 1.0201$.`, r`The value $g(1) = 4$ is one isolated point and does not affect where the graph is heading. The limit is $1$.`],
      'c1-1-5': [r`At $x = 0$: $\frac{\sin 0}{0} = \frac{0}{0}$. Set your calculator to RADIANS.`, r`$x = 0.1$: $\frac{\sin 0.1}{0.1} \approx 0.99833$. $x = 0.01$: $\approx 0.99998$.`, r`For negative $x$, both $\sin x$ and $x$ change sign, so the fraction is the same.`, r`The values climb toward 1: the limit is $1$, one of the most famous limits in calculus.`],
      'c1-1-6': [r`At $x = 4$: $\frac{\sqrt{4} - 2}{4 - 4} = \frac{0}{0}$. Estimate.`, r`$x = 4.01$: $\sqrt{4.01} \approx 2.002498$, so $\frac{0.002498}{0.01} \approx 0.2498$.`, r`$x = 3.99$: $\sqrt{3.99} \approx 1.997498$, so $\frac{-0.002502}{-0.01} \approx 0.2502$.`, r`Both sides approach $0.25 = \frac{1}{4}$.`],
      'c1-1-7': [r`Read the table from the left of 2: $3.71, 3.97, 3.997$. These climb toward 4.`, r`From the right of 2: $4.31, 4.03, 4.003$. These fall toward 4.`, r`Both sides head to the same number, so the best estimate is $4$. (Notice the table does not even include $x = 2$, and it does not need to.)`],
      'c1-1-8': [r`At $x = 0$ we get $1^\infty$, which is not a real calculation. Estimate.`, r`$x = 0.001$: $(1.001)^{1000} \approx 2.7169$.`, r`$x = -0.001$: $(0.999)^{-1000} \approx 2.7196$.`, r`The two sides trap a number about $2.718$: the famous number $e$.`],
    },
    teach: {
      plan: [r`Start with the walking-to-the-door story: a limit is where you are heading.`, r`Draw the graph of $y = x + 1$ with a hole at $x = 2$ and a dot floating at height 7. Ask: “where is the graph heading near 2?”.`, r`Make a table for $\frac{x^2 - 1}{x - 1}$ with $x = 0.9, 0.99, 0.999$ and $1.1, 1.01, 1.001$, and let your student see the pattern.`, r`Stress: we check BOTH sides, and the value at the point does not matter.`, r`Write the notation $\lim\limits_{x \to a} f(x) = L$ and have them read it aloud.`],
      questions: [
        { q: 'If I can just plug in, why do I need limits?', a: r`For nice functions, the limit IS what you get by plugging in. Limits matter when plugging in fails, like $\frac{0}{0}$. The whole derivative in Unit 2 is a $\frac{0}{0}$ situation.` },
        { q: 'Does the function ever reach the limit?', a: 'It might or might not. The limit is about where the outputs are heading, not whether they arrive. The function can even be undefined at that point.' },
        { q: 'Why check both sides?', a: 'Because the limit only exists if both directions head to the same number. If the left heads to 3 and the right to 5, there is no single destination.' },
      ],
      keyPoints: ['A limit is the value f(x) approaches as x approaches a.', 'The value at x = a does not affect the limit.', 'You can estimate a limit with a table from both sides.', 'Limits handle cases like 0/0 where plugging in fails.'],
    },
  },
  'c1-2': {
    bigIdea: [
      r`Sometimes a graph comes toward a point from the left at one height and from the right at a different height, like two roads that end at the edge of a cliff at different levels. Each side has its own destination.`,
      r`We give each side its own name. The left-hand limit, $\lim\limits_{x \to a^-} f(x)$, only uses $x$ values smaller than $a$. The right-hand limit, $\lim\limits_{x \to a^+} f(x)$, only uses $x$ values bigger than $a$. The little minus and plus signs mean “from below” and “from above”.`,
      r`The ordinary (two-sided) limit exists only when both sides agree. If they disagree, we say the limit does not exist, written DNE. Limits can also fail to exist if the function shoots off to infinity, or if it wiggles forever without settling down.`,
    ],
    picture: { title: 'A staircase', t: r`Walk along a staircase in the dark with your hand on the wall. Just before a step, your hand is at one height; just after it, at another. The left and right limits are the two heights; since they differ, there is no single height “at” the step.` },
    words: [
      { term: r`Left-hand limit $x \to a^-$`, means: r`The value approached as $x$ comes toward $a$ from numbers less than $a$.` },
      { term: r`Right-hand limit $x \to a^+$`, means: r`The value approached as $x$ comes toward $a$ from numbers greater than $a$.` },
      { term: 'DNE', means: 'Does not exist: there is no single finite number the function approaches.' },
      { term: 'Jump', means: 'A place where the graph suddenly leaps from one height to another.' },
      { term: 'Oscillate', means: 'Wiggle back and forth forever without settling on one value.' },
    ],
    tools: [
      { name: 'Absolute value', refresher: r`$|x| = x$ when $x \ge 0$ and $|x| = -x$ when $x < 0$. So $|-3| = -(-3) = 3$.`, lesson: 'c0-3' },
      { name: 'Piecewise functions', refresher: 'Use the piece whose condition matches the side you are approaching from.', lesson: 'c0-6' },
      { name: 'What a limit is', refresher: 'A limit is where the function is heading, not its value at the point.', lesson: 'c1-1' },
    ],
    why: [
      [r`Absolute value acts differently on each side of 0, so we split into the two cases and simplify each.`, r`Each one-sided limit uses only its own side, so each is a constant: 1 on the right and $-1$ on the left.`, r`A two-sided limit needs one destination. Two different destinations means the limit does not exist.`],
      [r`Approaching 2 from the left uses $x < 2$, the first piece; from the right uses $x \ge 2$, the second piece. Each piece is a polynomial, so we can just substitute 2.`, r`Both pieces head to 5, so the two roads meet: the limit exists and equals 5.`],
    ],
    walk: {
      'c1-2-1': [r`$x \to 0^+$ means $x$ is a small positive number, like $0.001$.`, r`For positive $x$, $|x| = x$, so $\frac{|x|}{x} = \frac{x}{x} = 1$.`, r`The function is exactly 1 for every positive $x$, so the right-hand limit is $1$.`],
      'c1-2-2': [r`$x \to 0^-$ means $x$ is a small negative number, like $-0.001$.`, r`For negative $x$, $|x| = -x$ (for example $|-0.001| = 0.001 = -(-0.001)$).`, r`So $\frac{|x|}{x} = \frac{-x}{x} = -1$. The left-hand limit is $-1$.`],
      'c1-2-3': [r`From the previous two problems: right-hand limit 1, left-hand limit $-1$.`, r`A two-sided limit requires both sides to agree on one number.`, r`$1 \ne -1$, so the limit does not exist: DNE. On the graph, it is a jump from $-1$ to 1.`],
      'c1-2-4': [r`From the left ($x < 1$) use $2x + 3$. Substituting 1: $2 + 3 = 5$.`, r`From the right ($x \ge 1$) use $x^2 + 4$. Substituting 1: $1 + 4 = 5$.`, r`Both sides give 5, so $\lim\limits_{x \to 1} f(x) = 5$.`],
      'c1-2-5': [r`For the limit to exist, the two pieces must meet at $x = 3$.`, r`Left piece at 3: $3^2 - 1 = 8$. Right piece at 3: $2(3) + k = 6 + k$.`, r`Set them equal: $6 + k = 8$, so $k = 2$.`],
      'c1-2-6': [r`The floor $\lfloor x \rfloor$ rounds DOWN to the nearest integer: $\lfloor 1.7 \rfloor = 1$, $\lfloor 1.999 \rfloor = 1$.`, r`Approaching 2 from the left means $x$ like $1.9, 1.99, 1.999$, all of which round down to 1.`, r`So the left-hand limit is $1$. (From the right, $\lfloor 2.001 \rfloor = 2$; that is why the floor function has a jump at every integer.)`],
      'c1-2-7': [r`As $x \to 0$, $\frac{1}{x}$ becomes enormous: $x = 0.001$ gives 1000, $x = 0.0001$ gives 10000.`, r`Sine of a huge, growing number keeps cycling between $-1$ and 1 over and over.`, r`The outputs never settle on one value, so the limit does not exist because of oscillation. That is choice C.`],
      'c1-2-8': [r`We approach 3 from the left, so $x < 3$ and $x - 3$ is negative. Then $|x - 3| = -(x - 3)$.`, r`Factor the top: $x^2 - 9 = (x - 3)(x + 3)$. The fraction is $\frac{(x - 3)(x + 3)}{-(x - 3)}$.`, r`Cancel $(x - 3)$: we get $-(x + 3)$.`, r`Now substitute $x = 3$: $-(3 + 3) = -6$.`],
    },
    teach: {
      plan: [r`Draw a jump: a line ending at height 1 on the right of 0 and at $-1$ on the left. Ask for the “height at 0”.`, r`Introduce the notation $x \to 0^-$ and $x \to 0^+$ and what the signs mean.`, r`Explain the rule: the limit exists only if both one-sided limits exist and are equal.`, r`Work a piecewise example where the pieces meet, and one where they do not.`, r`Show the three ways a limit can fail: jump, blow-up to infinity, and endless wiggling.`],
      questions: [
        { q: r`Is $0^-$ a negative zero?`, a: r`No. $x \to 0^-$ is a direction: $x$ approaches 0 through negative numbers. There is no such number as “negative zero”.` },
        { q: 'If the function is defined at the point, can the limit still not exist?', a: r`Yes. $\frac{|x|}{x}$ with $f(0) = 0$ is defined at 0 but still jumps from $-1$ to 1, so the limit does not exist.` },
        { q: 'How do I find a value that makes a piecewise limit exist?', a: 'Compute each piece’s value at the meeting point and set them equal, then solve for the unknown.' },
      ],
      keyPoints: ['One-sided limits use only one side of the point.', 'The two-sided limit exists only when both one-sided limits agree.', 'Limits can fail by jumping, blowing up, or oscillating.', 'For piecewise functions, use the piece that matches the side.'],
    },
  },
  'c1-3': {
    bigIdea: [
      r`Finding limits by tables is slow. Luckily, limits follow simple rules, called limit laws. The limit of a sum is the sum of the limits, the limit of a product is the product of the limits, and so on. You can break a complicated limit into small pieces.`,
      r`Even better: for “nice” functions, like polynomials, roots, exponentials and sine and cosine where they are defined, the limit is just the value you get by plugging in. This is called direct substitution, and it is always the first thing to try.`,
      r`Plugging in only fails when you hit something illegal, like dividing by zero. The most important warning sign is $\frac{0}{0}$: it does NOT mean the answer is 0 or 1. It means “do more work”, which is the next lesson.`,
    ],
    picture: { title: 'Building with LEGO', t: r`A complicated function is built from simple bricks: $x$, numbers, sines, roots. The limit laws say you can find the limit of each brick and then snap the answers together the same way the bricks were snapped together.` },
    words: [
      { term: 'Limit laws', means: 'Rules that let you split the limit of a sum, difference, product, quotient or power into the limits of the parts.' },
      { term: 'Direct substitution', means: r`Finding a limit by plugging in $x = a$; it works whenever the function is continuous at $a$.` },
      { term: 'Polynomial', means: r`A function like $x^3 - 4x + 2$; its limits are always found by plugging in.` },
      { term: r`$\frac{0}{0}$`, means: 'An indeterminate form: a signal to simplify, not an answer.' },
    ],
    tools: [
      { name: 'Order of operations and negatives', refresher: r`Substituting $x = -1$ into $x^3 - 4x + 2$ needs careful signs.`, lesson: 'c0-1' },
      { name: 'Special trig values', refresher: r`$\cos\frac{\pi}{3} = \frac{1}{2}$, $\tan\frac{\pi}{3} = \sqrt{3}$, $\cos\pi = -1$.`, lesson: 'c0-8' },
      { name: 'What a limit is', refresher: 'The value the function approaches near the point.', lesson: 'c1-1' },
    ],
    why: [
      [r`The limit laws let us replace each piece with its limit: $f(x)$ by 3 and $g(x)$ by $-1$, keeping the same operations around them.`, r`Now it is ordinary arithmetic. Squaring $-1$ gives $+1$.`],
      [r`$x$ and $\cos x$ are both continuous everywhere, and products of continuous functions are continuous, so plugging in is allowed.`, r`$\cos\pi = -1$ because angle $\pi$ is the leftmost point $(-1, 0)$ of the unit circle.`],
    ],
    walk: {
      'c1-3-1': [r`Use the sum law and constant-multiple law: $\lim[2f + 3g] = 2\lim f + 3\lim g$.`, r`Substitute the given limits: $2(6) + 3(-2)$.`, r`$12 - 6 = 6$.`],
      'c1-3-2': [r`The product law: the limit of a product is the product of the limits.`, r`$6 \times (-2)$.`, r`$= -12$. (Different signs give a negative.)`],
      'c1-3-3': [r`The quotient law works only if the bottom’s limit is not 0. Here it is $-2$, so we are fine.`, r`$\frac{6}{-2}$.`, r`$= -3$.`],
      'c1-3-4': [r`Find the limit of what is inside the root first: $6 + 3(-2) + 4$.`, r`$6 - 6 + 4 = 4$.`, r`The root law lets the limit pass inside the root: $\sqrt{4} = 2$.`],
      'c1-3-5': [r`$x^3 - 4x + 2$ is a polynomial, so the limit is found by plugging in $x = -1$.`, r`$(-1)^3 = -1$ and $-4(-1) = +4$.`, r`$-1 + 4 + 2 = 5$.`],
      'c1-3-6': [r`Cosine and tangent are continuous at $\frac{\pi}{3}$ (tangent only breaks where cosine is 0), so substitute.`, r`$\cos\frac{\pi}{3} = \frac{1}{2}$, so $2\cos\frac{\pi}{3} = 1$.`, r`$\tan\frac{\pi}{3} = \sqrt{3}$, so $\tan^2\frac{\pi}{3} = 3$.`, r`Add: $1 + 3 = 4$.`],
      'c1-3-7': [r`Check the bottom first: at $x = 0$, $x^2 + 1 = 1$, not 0. So direct substitution works.`, r`Top: $e^0(0 + 5) = 1 \cdot 5 = 5$.`, r`$\frac{5}{1} = 5$.`],
      'c1-3-8': [r`Both top and bottom go to 0, so we have $\frac{0}{0}$, which is indeterminate.`, r`Try examples: $\frac{x}{x} \to 1$; $\frac{x^2}{x} = x \to 0$; $\frac{x}{x^2} = \frac{1}{x}$ blows up. Same $\frac{0}{0}$ start, three different results.`, r`So we cannot tell from this information alone: choice D.`],
    },
    teach: {
      plan: [r`Ask your student to guess $\lim\limits_{x \to 2}(x^2 + 3x)$. Show that plugging in gives the right answer.`, r`State the limit laws in words: limits of sums, products and quotients behave the way you would hope.`, r`Practice with given limits like $\lim f = 6$, $\lim g = -2$.`, r`Show the danger: the quotient law fails when the bottom goes to 0.`, r`End with three $\frac{0}{0}$ examples that give different answers, to show why $\frac{0}{0}$ means “more work”.`],
      questions: [
        { q: r`If plugging in gives $\frac{0}{0}$, is the answer 0 or 1?`, a: r`Neither, necessarily. $\frac{0}{0}$ is a warning that the limit is hidden. You must simplify (factor, rationalize, etc.) to find it.` },
        { q: 'When is direct substitution allowed?', a: 'Whenever the function is continuous at that point: polynomials always; fractions when the bottom is not zero; roots when the inside is allowed.' },
        { q: r`What if plugging in gives $\frac{5}{0}$?`, a: r`That is not $\frac{0}{0}$. A nonzero number over something going to 0 means the function blows up toward $\pm\infty$ (Lesson 6).` },
      ],
      keyPoints: ['Limits of sums, products, quotients and powers can be split into pieces.', 'For continuous functions, the limit is the plugged-in value.', 'The quotient law needs a nonzero bottom limit.', '0/0 is indeterminate: it signals more work.'],
    },
  },
  'c1-4': {
    bigIdea: [
      r`When plugging in gives $\frac{0}{0}$, it is usually because the top and bottom share a hidden common piece that is zero at that point. If we can expose that piece and cancel it, the problem becomes a simple plug-in.`,
      r`Think of $\frac{x^2 - 4}{x - 2}$. The top secretly contains $(x - 2)$: $x^2 - 4 = (x - 2)(x + 2)$. Cancelling leaves $x + 2$, which agrees with the original everywhere except at the single point $x = 2$. Since limits ignore that single point, both have the same limit.`,
      r`There are three main tools for exposing the hidden piece: factoring (for polynomials), multiplying by the conjugate (for square roots), and combining fractions (for fractions inside fractions). Each is just algebra from the toolkit, used with a purpose.`,
    ],
    picture: { title: 'A twist-tie on a bag', t: r`The $\frac{0}{0}$ form is like a bag closed with a twist-tie. You cannot see what is inside until you untwist it. Factoring, conjugates and common denominators are three ways to untwist; once the bag is open (the zero factor cancelled), you can see the answer by plugging in.` },
    words: [
      { term: 'Factor', means: r`Rewrite as a product, like $x^2 + x - 6 = (x + 3)(x - 2)$.` },
      { term: 'Cancel', means: 'Divide a common factor out of the top and bottom of a fraction.' },
      { term: 'Conjugate', means: r`The same two terms with the middle sign flipped: the conjugate of $\sqrt{x} - 2$ is $\sqrt{x} + 2$.` },
      { term: 'Rationalize', means: 'Multiply by a conjugate to remove square roots from part of a fraction.' },
      { term: 'Complex fraction', means: 'A fraction with fractions inside its top or bottom.' },
    ],
    tools: [
      { name: 'Factoring', refresher: r`Trinomials, difference of squares $a^2 - b^2 = (a - b)(a + b)$, and difference of cubes $a^3 - b^3 = (a - b)(a^2 + ab + b^2)$.`, lesson: 'c0-5' },
      { name: 'Adding fractions', refresher: r`Use a common denominator: $\frac{1}{x + 3} - \frac{1}{3} = \frac{3 - (x + 3)}{3(x + 3)}$.`, lesson: 'c0-1' },
      { name: 'Direct substitution', refresher: 'After cancelling, the limit is found by plugging in.', lesson: 'c1-3' },
    ],
    why: [
      [r`$\frac{0}{0}$ tells us $(x - 2)$ is hiding in both top and bottom, because both are zero at $x = 2$. Factoring the top reveals it.`, r`Cancelling is allowed because $x \ne 2$ in a limit. What remains is continuous, so we can plug in.`],
      [r`Square roots block factoring. Multiplying top and bottom by the conjugate (the same expression with $+$) is multiplying by 1, so the value is unchanged.`, r`$(a - b)(a + b) = a^2 - b^2$ removes the root from the top, and the hidden factor $x$ appears.`, r`With the troublesome $x$ cancelled, the bottom is no longer 0 at $x = 0$, so substitution works.`],
    ],
    walk: {
      'c1-4-1': [r`Plug in $-3$: top $9 - 15 + 6 = 0$, bottom $0$. So $\frac{0}{0}$: factor.`, r`$x^2 + 5x + 6$: two numbers multiplying to 6 and adding to 5 are 2 and 3. So it is $(x + 2)(x + 3)$.`, r`Cancel $(x + 3)$: we get $x + 2$.`, r`Plug in $x = -3$: $-3 + 2 = -1$.`],
      'c1-4-2': [r`Plug in 2: $\frac{8 - 8}{0} = \frac{0}{0}$.`, r`Difference of cubes: $x^3 - 8 = x^3 - 2^3 = (x - 2)(x^2 + 2x + 4)$.`, r`Cancel $(x - 2)$: left with $x^2 + 2x + 4$.`, r`Plug in 2: $4 + 4 + 4 = 12$.`],
      'c1-4-3': [r`Plug in 0: $\frac{\sqrt{4} - 2}{0} = \frac{0}{0}$. A square root means: use the conjugate.`, r`Multiply top and bottom by $\sqrt{x + 4} + 2$. Top: $(\sqrt{x + 4})^2 - 2^2 = (x + 4) - 4 = x$.`, r`The fraction becomes $\frac{x}{x(\sqrt{x + 4} + 2)} = \frac{1}{\sqrt{x + 4} + 2}$.`, r`Plug in 0: $\frac{1}{2 + 2} = \frac{1}{4}$.`],
      'c1-4-4': [r`Plug in $h = 0$: $\frac{4 - 4}{0} = \frac{0}{0}$. Expand the square.`, r`$(2 + h)^2 = 4 + 4h + h^2$, so the top is $4h + h^2$.`, r`Factor out $h$: $\frac{h(4 + h)}{h} = 4 + h$.`, r`Plug in $h = 0$: $4$. (This is secretly the slope of $x^2$ at $x = 2$, as you will see in Unit 2.)`],
      'c1-4-5': [r`Plug in 0: the top is $\frac{1}{3} - \frac{1}{3} = 0$ and the bottom is 0. Combine the fractions on top first.`, r`Common denominator $3(x + 3)$: $\frac{3 - (x + 3)}{3(x + 3)} = \frac{-x}{3(x + 3)}$.`, r`Dividing by $x$ is multiplying by $\frac{1}{x}$: $\frac{-x}{3(x + 3)} \cdot \frac{1}{x} = \frac{-1}{3(x + 3)}$.`, r`Plug in 0: $\frac{-1}{3 \cdot 3} = -\frac{1}{9}$.`],
      'c1-4-6': [r`Plug in 1: $\frac{0}{0}$.`, r`Trick: treat $x$ as $(\sqrt{x})^2$, so $x - 1$ is a difference of squares: $(\sqrt{x} - 1)(\sqrt{x} + 1)$.`, r`Cancel $(\sqrt{x} - 1)$: left with $\sqrt{x} + 1$.`, r`Plug in 1: $1 + 1 = 2$.`],
      'c1-4-7': [r`Plug in 4: top $16 - 16 = 0$, bottom $16 - 12 - 4 = 0$. Factor both.`, r`Top: $(x - 4)(x + 4)$. Bottom: $x^2 - 3x - 4 = (x - 4)(x + 1)$.`, r`Cancel $(x - 4)$: $\frac{x + 4}{x + 1}$.`, r`Plug in 4: $\frac{8}{5} = 1.6$.`],
      'c1-4-8': [r`Plug in 0: $\frac{1 - 1}{0} = \frac{0}{0}$. Two roots on top: multiply by the conjugate $\sqrt{1 + 3x} + \sqrt{1 - x}$.`, r`Top becomes $(1 + 3x) - (1 - x) = 4x$.`, r`So $\frac{4x}{x(\sqrt{1 + 3x} + \sqrt{1 - x})} = \frac{4}{\sqrt{1 + 3x} + \sqrt{1 - x}}$.`, r`Plug in 0: $\frac{4}{1 + 1} = 2$.`],
      'c1-4-9': [r`Plug in 0: top $\frac{1}{1} - 1 = 0$, bottom 0. Combine the top into one fraction.`, r`$\frac{1}{(t + 1)^2} - 1 = \frac{1 - (t + 1)^2}{(t + 1)^2} = \frac{1 - (1 + 2t + t^2)}{(t + 1)^2} = \frac{-2t - t^2}{(t + 1)^2}$.`, r`Divide by $t$ (factor $t$ out of the top and cancel): $\frac{-2 - t}{(t + 1)^2}$.`, r`Plug in 0: $\frac{-2}{1} = -2$.`],
    },
    teach: {
      plan: [r`Show $\frac{x^2 - 4}{x - 2}$ gives $\frac{0}{0}$ at 2, then factor and cancel. Graph both: a line, and a line with a hole.`, r`Explain WHY cancelling is allowed: in a limit, $x$ is never exactly 2.`, r`Teach the conjugate trick with $\frac{\sqrt{x + 4} - 2}{x}$.`, r`Teach complex fractions with $\frac{\frac{1}{x+3} - \frac{1}{3}}{x}$.`, r`Give the decision rule: polynomial → factor; root → conjugate; fractions inside → common denominator.`],
      questions: [
        { q: 'Isn’t cancelling the zero factor dividing by zero?', a: r`No, because in a limit $x$ is never equal to the point, only close to it. So $x - 2$ is a tiny nonzero number, and dividing by it is fine.` },
        { q: 'How do I know which technique to use?', a: 'Look at the expression: polynomials → factor; square roots → multiply by the conjugate; fractions within fractions → combine into one fraction.' },
        { q: 'What if I still get 0/0 after simplifying?', a: 'Simplify again; there may be another hidden factor. Later (Unit 4) you will also learn L’Hôpital’s rule for stubborn cases.' },
      ],
      keyPoints: ['0/0 means a common factor is hiding in top and bottom.', 'Factor polynomials, use conjugates for roots, combine complex fractions.', 'Cancelling is valid because x never equals a in a limit.', 'After cancelling, plug in.'],
    },
  },
  'c1-5': {
    bigIdea: [
      r`Some limits can’t be untwisted with algebra. For those, there is a clever trick: trap the function between two simpler functions that go to the same place. If the trapped function is always stuck in the middle, it has nowhere else to go. This is the Squeeze Theorem.`,
      r`A famous result comes from squeezing: as $x \to 0$ (in radians), $\frac{\sin x}{x} \to 1$. In words: for tiny angles, $\sin x$ is almost exactly $x$. You saw this numerically in Lesson 1; now it becomes a tool.`,
      r`With that one fact you can do many trig limits. The trick is to make the inside of the sine match the bottom, like $\frac{\sin 5x}{5x}$, by multiplying and dividing by the right number.`,
    ],
    picture: { title: 'Walking between two friends', t: r`You walk down a hallway between two friends who hold your arms. If both friends walk into the same classroom, you end up in that classroom too, no matter how you wiggle in between. The friends are the bounding functions, you are the trapped function.` },
    words: [
      { term: 'Squeeze Theorem', means: r`If $g(x) \le f(x) \le h(x)$ near $a$ and $g$ and $h$ both approach $L$, then $f$ approaches $L$ too.` },
      { term: 'Bound', means: r`A function that stays above (upper bound) or below (lower bound) another function.` },
      { term: r`$\frac{\sin x}{x} \to 1$`, means: 'The key special trig limit, valid when x is in radians.' },
      { term: r`$\frac{1 - \cos x}{x} \to 0$`, means: 'The second special trig limit.' },
    ],
    tools: [
      { name: 'Sine and cosine stay between −1 and 1', refresher: r`For every input, $-1 \le \sin(\text{anything}) \le 1$, and the same for cosine.`, lesson: 'c0-8' },
      { name: 'Trig identities', refresher: r`$\sin^2 x + \cos^2 x = 1$, so $1 - \cos^2 x = \sin^2 x$; and $\tan x = \frac{\sin x}{\cos x}$.`, lesson: 'c0-8' },
      { name: 'Limit laws', refresher: 'Limits of products and quotients split into pieces.', lesson: 'c1-3' },
    ],
    why: [
      [r`We can’t compute $\sin\frac{1}{x}$ near 0 (it oscillates), but we know it is always between $-1$ and 1. Multiplying that inequality by $x^2$ (which is positive) traps our function.`, r`The two walls $-x^2$ and $x^2$ both shrink to 0, so the function caught between them must go to 0 as well.`],
      [r`We want the special form $\frac{\sin(\text{stuff})}{\text{stuff}}$. The sine contains $5x$, so we need $5x$ on the bottom; multiplying by $\frac{5}{5}$ builds it without changing the value.`, r`The special piece goes to 1, leaving the constant out front.`],
    ],
    walk: {
      'c1-5-1': [r`We want $\frac{\sin 4x}{4x}$, which goes to 1. The bottom only has $x$.`, r`Multiply top and bottom by 4: $\frac{\sin 4x}{x} = 4 \cdot \frac{\sin 4x}{4x}$.`, r`As $x \to 0$, $4x \to 0$ too, so $\frac{\sin 4x}{4x} \to 1$.`, r`Answer: $4 \cdot 1 = 4$.`],
      'c1-5-2': [r`Both top and bottom are sines. Build the special form for each.`, r`$\sin 3x = 3x \cdot \frac{\sin 3x}{3x}$ and $\sin 7x = 7x \cdot \frac{\sin 7x}{7x}$.`, r`So the ratio is $\frac{3x \cdot (\text{something} \to 1)}{7x \cdot (\text{something} \to 1)}$; the $x$’s cancel.`, r`The limit is $\frac{3}{7}$.`],
      'c1-5-3': [r`Rewrite tangent using sine and cosine: $\tan x = \frac{\sin x}{\cos x}$.`, r`So $\frac{\tan x}{x} = \frac{\sin x}{x} \cdot \frac{1}{\cos x}$.`, r`As $x \to 0$: $\frac{\sin x}{x} \to 1$ and $\cos x \to 1$.`, r`Product: $1 \cdot 1 = 1$.`],
      'c1-5-4': [r`This is the second special trig limit, which we accept as a fact: $\frac{1 - \cos x}{x} \to 0$.`, r`Intuition: near 0, $\cos x$ is extremely close to 1, so the top shrinks much faster than the bottom.`, r`Check: $x = 0.01$ gives $\frac{1 - 0.99995}{0.01} = 0.005$, tiny. The limit is $0$.`],
      'c1-5-5': [r`Multiply top and bottom by $1 + \cos x$ (a conjugate) to use $1 - \cos^2 x = \sin^2 x$.`, r`$\frac{1 - \cos x}{x^2} = \frac{1 - \cos^2 x}{x^2(1 + \cos x)} = \frac{\sin^2 x}{x^2} \cdot \frac{1}{1 + \cos x}$.`, r`$\frac{\sin^2 x}{x^2} = \left(\frac{\sin x}{x}\right)^2 \to 1$, and $\frac{1}{1 + \cos x} \to \frac{1}{2}$.`, r`Answer: $1 \cdot \frac{1}{2} = \frac{1}{2}$.`],
      'c1-5-6': [r`$\cos\frac{1}{x}$ wiggles, but always between $-1$ and 1.`, r`Multiplying by $x$ (whose sign can be either way), the product is between $-|x|$ and $|x|$.`, r`Both $-|x|$ and $|x|$ go to 0 as $x \to 0$.`, r`By the Squeeze Theorem, the limit is $0$.`],
      'c1-5-7': [r`$f$ is trapped: below by $3 - x^2$, above by $3 + x^2$.`, r`As $x \to 0$, both walls approach $3 - 0 = 3$ and $3 + 0 = 3$.`, r`The Squeeze Theorem forces $\lim\limits_{x \to 0} f(x) = 3$: choice B.`],
      'c1-5-8': [r`Write the expression as a square: $\frac{x^2}{\sin^2 3x} = \left(\frac{x}{\sin 3x}\right)^2$.`, r`Build the special form: $\frac{x}{\sin 3x} = \frac{1}{3} \cdot \frac{3x}{\sin 3x}$.`, r`$\frac{3x}{\sin 3x}$ is the upside-down special limit, which also goes to 1. So $\frac{x}{\sin 3x} \to \frac{1}{3}$.`, r`Square it: $\frac{1}{9}$.`],
    },
    teach: {
      plan: [r`Tell the two-friends story, then draw $-x^2$, $x^2$ and the wiggly $x^2\sin\frac{1}{x}$ trapped between them.`, r`State the Squeeze Theorem and its three conditions.`, r`Show a table for $\frac{\sin x}{x}$ near 0 and announce the special limit.`, r`Teach the “match the inside” trick on $\frac{\sin 5x}{3x}$.`, r`Have your student do $\frac{\tan x}{x}$ alone.`],
      questions: [
        { q: r`Why must $x$ be in radians for $\frac{\sin x}{x} \to 1$?`, a: r`Radians measure angle by arc length on the unit circle, and for small angles the arc and the height ($\sin x$) are nearly equal. In degrees, the limit would be $\frac{\pi}{180}$ instead.` },
        { q: 'How do I pick the two bounding functions?', a: r`Usually start from $-1 \le \sin(\ldots) \le 1$ or the same for cosine, then multiply through by whatever is in front.` },
        { q: r`Does $\frac{\sin 5x}{5x}$ still go to 1?`, a: r`Yes. As $x \to 0$, $5x \to 0$, so it is the same special limit with the input called $5x$ instead of $x$.` },
      ],
      keyPoints: ['Squeeze: trapped between two functions with the same limit means the same limit.', 'sin x / x → 1 as x → 0 (radians).', '(1 − cos x)/x → 0.', 'Match the inside of the sine with the denominator by multiplying and dividing.'],
    },
  },
};
