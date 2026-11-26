import type { LessonTutor } from '../types';

const r = String.raw;

/** Tutor layer · Unit 2: the derivative, from slope to rules. */
export const TUTOR2: Record<string, LessonTutor> = {
  'c2-1': {
    bigIdea: [
      r`Your car’s speedometer shows your speed RIGHT NOW, not your average speed for the trip. But speed is distance divided by time, and “right now” is no time at all. How can a speedometer divide by zero? This puzzle is exactly what the derivative solves.`,
      r`Start with an average: the slope between two points on a graph, $\frac{f(x + h) - f(x)}{h}$. That is the average rate of change over a gap of size $h$. Now shrink the gap: $h = 0.1$, $0.01$, $0.001$… The averages settle toward one number: the instantaneous rate of change. That limit is the derivative, $f'(x)$.`,
      r`On a graph, the line through two nearby points (a secant line) turns into the line that just touches the curve at one point: the tangent line. The derivative is the slope of that tangent line. So the derivative is “the slope of a curve at a single point”, the idea promised back in the toolkit.`,
    ],
    picture: { title: 'Zooming in on a curve', t: r`Zoom in on any smooth curve with a powerful magnifying glass. The more you zoom, the straighter it looks, until it looks like a line. The slope of that line is the derivative at that point.` },
    words: [
      { term: 'Average rate of change', means: r`$\frac{f(b) - f(a)}{b - a}$: the slope of the line through two points (a secant line).` },
      { term: 'Instantaneous rate of change', means: 'The rate at one exact moment; the limit of average rates over shrinking intervals.' },
      { term: r`Derivative $f'(x)$`, means: r`$\lim\limits_{h \to 0}\frac{f(x + h) - f(x)}{h}$: the slope of the tangent line at $x$.` },
      { term: 'Tangent line', means: 'The line that just touches a curve at a point and has the same slope as the curve there.' },
      { term: 'Secant line', means: 'A line through two points of a curve.' },
      { term: 'Velocity', means: r`The derivative of position: how fast the position is changing, with a sign for direction.` },
    ],
    tools: [
      { name: 'Slope and point-slope form', refresher: r`Slope $= \frac{\Delta y}{\Delta x}$; the tangent line is $y - f(a) = f'(a)(x - a)$.`, lesson: 'c0-4' },
      { name: 'Expanding', refresher: r`$(x + h)^2 = x^2 + 2xh + h^2$.`, lesson: 'c0-5' },
      { name: 'Algebra for 0/0', refresher: 'Every derivative from the definition is a 0/0 limit: factor out h, use conjugates, or combine fractions.', lesson: 'c1-4' },
    ],
    why: [
      [r`The definition starts with the change in output over a step of size $h$. Expanding lets the $x^2$ and $3x$ cancel, leaving only terms with $h$, which is what we need to divide by $h$.`, r`Every remaining term has a factor $h$, so dividing removes the $0/0$ problem.`, r`Now the expression is continuous in $h$, so we let $h$ shrink to 0 by substituting. The result is a formula for the slope at ANY $x$.`],
      [r`A line needs a point and a slope. The point comes from $f(1)$; the slope comes from the derivative at 1.`, r`Point-slope form builds the line directly from those two facts.`],
    ],
    walk: {
      'c2-1-1': [r`Average rate of change on $[1, 4]$ is the slope between the points at $x = 1$ and $x = 4$.`, r`$f(4) = 16 + 12 = 28$ and $f(1) = 1 + 3 = 4$.`, r`$\frac{28 - 4}{4 - 1} = \frac{24}{3} = 8$.`],
      'c2-1-2': [r`Definition: $f'(3) = \lim\limits_{h \to 0}\frac{f(3 + h) - f(3)}{h} = \lim\limits_{h \to 0}\frac{(3 + h)^2 - 9}{h}$.`, r`Expand: $(3 + h)^2 = 9 + 6h + h^2$, so the top is $6h + h^2$.`, r`Factor out $h$ and cancel: $\frac{h(6 + h)}{h} = 6 + h$.`, r`Let $h \to 0$: $6$. The parabola $x^2$ has slope 6 at $x = 3$.`],
      'c2-1-3': [r`$f'(2) = \lim\limits_{h \to 0}\frac{\frac{1}{2 + h} - \frac{1}{2}}{h}$.`, r`Combine the top: $\frac{2 - (2 + h)}{2(2 + h)} = \frac{-h}{2(2 + h)}$.`, r`Divide by $h$: $\frac{-1}{2(2 + h)}$.`, r`Let $h \to 0$: $\frac{-1}{4}$. Negative makes sense: $\frac{1}{x}$ is decreasing.`],
      'c2-1-4': [r`$f'(9) = \lim\limits_{h \to 0}\frac{\sqrt{9 + h} - 3}{h}$. A square root means: use the conjugate.`, r`Multiply top and bottom by $\sqrt{9 + h} + 3$: the top becomes $(9 + h) - 9 = h$.`, r`Cancel $h$: $\frac{1}{\sqrt{9 + h} + 3}$.`, r`Let $h \to 0$: $\frac{1}{3 + 3} = \frac{1}{6}$.`],
      'c2-1-5': [r`We need a point and a slope. Point: $f(3) = 9 - 6 = 3$, so $(3, 3)$.`, r`Slope: using the rule from the example pattern, $f'(x) = 2x - 2$, so $f'(3) = 4$.`, r`Line: $y - 3 = 4(x - 3)$, so $y = 4x - 12 + 3 = 4x - 9$.`, r`The $y$-intercept is $-9$.`],
      'c2-1-6': [r`Recognize the shape $\frac{f(3 + h) - f(3)}{h}$ with $f(x) = x^4$, since $3^4 = 81$.`, r`So the limit is the derivative of $x^4$ at 3. Using the power pattern (Lesson 3), $f'(x) = 4x^3$.`, r`$f'(3) = 4 \cdot 27 = 108$. Recognizing a hidden derivative saves expanding $(3 + h)^4$!`],
      'c2-1-7': [r`Velocity is the derivative of position.`, r`$s(t) = t^3 - 6t$, so $s'(t) = 3t^2 - 6$.`, r`$s'(2) = 12 - 6 = 6$ meters per second. Positive: moving forward at that moment.`],
    },
    teach: {
      plan: [r`Start with the speedometer puzzle: how do you get speed at one instant?`, r`Draw a curve, pick a point, and draw secant lines to nearby points. Show them rotating toward the tangent line as the second point slides in.`, r`Write the difference quotient $\frac{f(x + h) - f(x)}{h}$ and explain each piece: rise over run with run $h$.`, r`Compute $f'(x)$ for $x^2$ from the definition together.`, r`Use it to write a tangent line with point-slope form.`],
      questions: [
        { q: 'Why can’t we just put h = 0 in the slope formula?', a: r`Because then it is $\frac{0}{0}$: two points become the same point, and a single point has no slope. The limit lets $h$ get close to 0 without ever being 0.` },
        { q: 'What is the difference between f(x) and f′(x)?', a: r`$f(x)$ tells you the height of the graph; $f'(x)$ tells you how steep it is there (the rate of change).` },
        { q: 'Is the tangent line the line that touches only once?', a: 'Not necessarily. It is the line with the same slope as the curve at that point; it can cross the curve somewhere else.' },
      ],
      keyPoints: ['Average rate of change = slope of a secant line.', 'The derivative is the limit of the difference quotient as h → 0.', 'f′(a) is the slope of the tangent line and the instantaneous rate.', 'Tangent line: y − f(a) = f′(a)(x − a).'],
    },
  },
  'c2-2': {
    bigIdea: [
      r`In real life you often have data, not formulas: a table of temperatures, a speed reading every few seconds. You can still estimate a derivative: take the two data points closest to where you care, and compute the slope between them.`,
      r`Not every function has a derivative everywhere. If a graph has a sharp corner (like the point of a V), the slope suddenly switches, so there is no single tangent line. If the graph goes perfectly vertical, the slope is infinite. And if the graph has a break, there is no slope at all. Where the derivative exists, we call the function differentiable.`,
      r`One important rule ties this together: if a function is differentiable at a point, it must be continuous there. Smooth implies connected. But connected does not imply smooth: $|x|$ is continuous at 0, but its corner makes it not differentiable.`,
    ],
    picture: { title: 'A skateboard ramp', t: r`On a smooth ramp, your board always points in a definite direction: that direction is the tangent. At a sharp corner, the board would have to point two ways at once, so there is no single direction. That is a point where the derivative does not exist.` },
    words: [
      { term: 'Differentiable', means: r`Has a derivative: the limit of the difference quotient exists (and is a finite number).` },
      { term: 'Corner (cusp)', means: 'A sharp point where the slope from the left and right are different.' },
      { term: 'Vertical tangent', means: 'A point where the tangent line is vertical, so the slope is infinite.' },
      { term: 'Symmetric difference quotient', means: r`$\frac{f(b) - f(a)}{b - a}$ with $a$ and $b$ on either side of the point: the best table estimate of the derivative.` },
    ],
    tools: [
      { name: 'Definition of the derivative', refresher: r`$f'(a) = \lim\limits_{h \to 0}\frac{f(a + h) - f(a)}{h}$.`, lesson: 'c2-1' },
      { name: 'Continuity', refresher: 'Pieces must meet for continuity, and also match slopes for differentiability.', lesson: 'c1-8' },
      { name: 'Unit circle values', refresher: r`$\cos\frac{\pi}{6} = \frac{\sqrt{3}}{2}$, $\sin\pi = 0$.`, lesson: 'c0-8' },
    ],
    why: [
      [r`The derivative at 3 is a slope at 3, so the best data are the points just to each side of 3: that centers our estimate on 3.`, r`Compute the slope between them: change in $f$ over change in $x$.`],
      [r`Matching the limit to the definition of a derivative: it has the form $\frac{f(a + h) - f(a)}{h}$ with $f = \cos$ and $a = \pi$, once we notice $+1 = -\cos\pi$.`, r`Once recognized, we use the known derivative of cosine instead of computing a hard limit.`],
    ],
    walk: {
      'c2-2-1': [r`$x = 4$ is between the table values 3 and 5, so use those two.`, r`$f(3) = 10$ and $f(5) = 13$.`, r`Slope: $\frac{13 - 10}{5 - 3} = \frac{3}{2} = 1.5$.`],
      'c2-2-2': [r`$f(x) = |x - 2|$ is a V shape with its point at $x = 2$.`, r`Continuous? Yes, the two sides meet at height 0.`, r`Slopes: left of 2 the graph is $-(x - 2)$ with slope $-1$; right of 2 it is $x - 2$ with slope 1. They differ: a corner.`, r`So it is continuous but not differentiable: choice B.`],
      'c2-2-3': [r`The key theorem: differentiable at $a$ implies continuous at $a$. That is choice A.`, r`B is false: $|x|$ at 0 is continuous but not differentiable.`, r`C is the same false idea turned around; D is false because being defined at a point is not enough. Answer: A.`],
      'c2-2-4': [r`Notice $\frac{1}{2} = \sin\frac{\pi}{6}$, so this is $\frac{\sin(\frac{\pi}{6} + h) - \sin\frac{\pi}{6}}{h}$.`, r`That is the derivative of $\sin x$ at $\frac{\pi}{6}$.`, r`The derivative of $\sin x$ is $\cos x$ (Lesson 4), so the answer is $\cos\frac{\pi}{6} = \frac{\sqrt{3}}{2} \approx 0.866$.`],
      'c2-2-5': [r`$\sqrt[3]{x}$ is defined and continuous at 0 (cube roots of negatives are fine). So A is wrong.`, r`Its graph near 0 goes straight up and down, like an S turned on its side.`, r`The tangent line at 0 is vertical: its slope would be infinite, so the derivative does not exist. Choice C.`],
      'c2-2-6': [r`The pattern $\frac{f(2 + h) - f(2)}{h}$ with $f(x) = e^x$.`, r`So the limit equals the derivative of $e^x$ at 2.`, r`$e^x$ is its own derivative, so the answer is $e^2 \approx 7.389$.`],
      'c2-2-7': [r`Differentiable at 1 requires two things: the pieces meet (continuity) and their slopes match.`, r`Meet: $1^2 = a(1) + b$, so $a + b = 1$.`, r`Slopes: the left piece $x^2$ has slope $2x = 2$ at 1; the right piece has slope $a$. So $a = 2$.`, r`Then $b = 1 - 2 = -1$.`],
    },
    teach: {
      plan: [r`Give a table of data and ask: “how fast is it changing at $x = 4$?”. Show the centered slope estimate.`, r`Draw three non-differentiable shapes: a corner, a vertical tangent and a jump.`, r`Explain “differentiable ⇒ continuous” and why the reverse fails (show $|x|$).`, r`Practice spotting a hidden derivative in a limit like $\frac{e^{2 + h} - e^2}{h}$.`, r`Finish with a piecewise function that must be both continuous and smooth.`],
      questions: [
        { q: 'Why use the two points on either side?', a: 'They balance each other’s errors, so the slope between them is usually the best estimate of the slope in the middle.' },
        { q: 'If a function is continuous, is it differentiable?', a: r`Not necessarily. Continuity means no breaks; differentiability also needs no corners or vertical tangents. $|x|$ is the classic example.` },
        { q: 'How do I make a piecewise function differentiable?', a: 'Make the pieces meet (same value) and make their slopes match (same derivative) at the break point.' },
      ],
      keyPoints: ['Estimate f′(a) from a table with the slope between the nearest points on either side.', 'Corners, vertical tangents and discontinuities make derivatives fail.', 'Differentiable implies continuous, not the other way around.', 'A limit of the form [f(a + h) − f(a)]/h is f′(a).'],
    },
  },
  'c2-3': {
    bigIdea: [
      r`Computing every derivative from the limit definition would take forever. Luckily, patterns appear. The derivative of $x^2$ is $2x$, of $x^3$ is $3x^2$, of $x^4$ is $4x^3$. See it? Bring the exponent down in front, and lower the exponent by one. That is the power rule, the most-used rule in calculus.`,
      r`It works for any power, including negative and fractional ones, as long as you first rewrite the function as a power: $\frac{1}{x} = x^{-1}$ and $\sqrt{x} = x^{1/2}$.`,
      r`Two more simple rules make it powerful: constants in front just come along for the ride ($\frac{d}{dx}5x^3 = 5 \cdot 3x^2$), and you can differentiate a sum one term at a time. Also, the derivative of a plain constant is 0, because a flat line has no slope.`,
    ],
    picture: { title: 'Area of a growing square', t: r`A square with side $x$ has area $x^2$. Grow the side by a sliver $h$: you add two thin strips of size $x \cdot h$ (plus a tiny corner $h^2$). So the area grows at rate $2x$, exactly the power rule’s answer for $x^2$.` },
    words: [
      { term: 'Power rule', means: r`$\frac{d}{dx}x^n = nx^{n-1}$.` },
      { term: r`$\frac{d}{dx}$`, means: r`“The derivative with respect to $x$ of…”. Another notation for $f'$.` },
      { term: 'Constant', means: 'A number that does not change; its derivative is 0.' },
      { term: 'Horizontal tangent', means: r`A place where the tangent line is flat, so $f'(x) = 0$.` },
    ],
    tools: [
      { name: 'Negative and fractional exponents', refresher: r`$\frac{1}{x^2} = x^{-2}$, $\sqrt{x} = x^{1/2}$, $x^{-1/2} = \frac{1}{\sqrt{x}}$.`, lesson: 'c0-5' },
      { name: 'Factoring and solving', refresher: r`To find horizontal tangents, solve $f'(x) = 0$, usually by factoring.`, lesson: 'c0-5' },
      { name: 'Tangent lines', refresher: r`$y - f(a) = f'(a)(x - a)$.`, lesson: 'c2-1' },
    ],
    why: [
      [r`The power rule needs every term as a power of $x$, so we rewrite fractions and roots with negative and fractional exponents first.`, r`Apply the power rule to each term separately: bring the exponent down, subtract one. Careful with $-2x^{-1}$: $(-2)(-1) = +2$.`, r`Rewrite the negative and fractional powers back as fractions and roots so the answer is easy to read.`],
      [r`Horizontal tangents happen where the slope is zero, so we need the derivative first; factoring it makes solving easy.`, r`Set each factor equal to zero, using the zero product property.`],
    ],
    walk: {
      'c2-3-1': [r`Differentiate term by term with the power rule: $5x^4 \to 5 \cdot 4x^3 = 20x^3$.`, r`$-3x^2 \to -6x$, and the constant 7 $\to 0$.`, r`$f'(x) = 20x^3 - 6x$, so $f'(1) = 20 - 6 = 14$.`],
      'c2-3-2': [r`Rewrite the root as a power: $6\sqrt{x} = 6x^{1/2}$.`, r`Power rule: $6 \cdot \frac{1}{2}x^{-1/2} = 3x^{-1/2} = \frac{3}{\sqrt{x}}$.`, r`At $x = 4$: $\frac{3}{\sqrt{4}} = \frac{3}{2}$.`],
      'c2-3-3': [r`Rewrite: $\frac{4}{x^2} = 4x^{-2}$.`, r`Power rule: $4 \cdot (-2)x^{-3} = -8x^{-3} = -\frac{8}{x^3}$.`, r`At $x = 2$: $-\frac{8}{8} = -1$.`],
      'c2-3-4': [r`Rewrite: $x^{3/2} - 2x^{-1}$.`, r`Differentiate: $\frac{3}{2}x^{1/2} - 2(-1)x^{-2} = \frac{3}{2}\sqrt{x} + \frac{2}{x^2}$.`, r`At $x = 4$: $\frac{3}{2}(2) + \frac{2}{16} = 3 + 0.125 = 3.125$.`],
      'c2-3-5': [r`Split the fraction first: $\frac{x^2 + 1}{x} = \frac{x^2}{x} + \frac{1}{x} = x + x^{-1}$.`, r`Differentiate: $1 - x^{-2} = 1 - \frac{1}{x^2}$.`, r`At $x = 2$: $1 - \frac{1}{4} = \frac{3}{4}$.`],
      'c2-3-6': [r`Horizontal tangent means slope 0: solve $f'(x) = 0$.`, r`$f'(x) = 3x^2 - 12$.`, r`$3x^2 = 12$, so $x^2 = 4$ and $x = \pm 2$.`, r`The positive one is $x = 2$.`],
      'c2-3-7': [r`Tangent line at $x = 1$: point $(1, 1)$; slope $y' = 3x^2 = 3$. So $y - 1 = 3(x - 1)$, or $y = 3x - 2$.`, r`Where does the line meet the curve? Set $x^3 = 3x - 2$, i.e. $x^3 - 3x + 2 = 0$.`, r`We know $x = 1$ is a solution (twice, since the line is tangent there): $x^3 - 3x + 2 = (x - 1)^2(x + 2)$.`, r`The other intersection is $x = -2$.`],
    },
    teach: {
      plan: [r`List $x^2 \to 2x$, $x^3 \to 3x^2$ from the definition and ask your student to guess the pattern.`, r`State the power rule and the constant and sum rules.`, r`Practice rewriting: roots → fractional exponents, fractions → negative exponents.`, r`Differentiate a messy polynomial term by term.`, r`Find horizontal tangents by solving $f'(x) = 0$.`],
      questions: [
        { q: 'Why is the derivative of a constant 0?', a: r`A constant function has a flat graph. Flat means zero slope everywhere.` },
        { q: r`Can I use the power rule on $\frac{1}{x}$ directly?`, a: r`Only after rewriting it as $x^{-1}$. Then the rule gives $-1 \cdot x^{-2} = -\frac{1}{x^2}$.` },
        { q: r`Does the power rule work on $2^x$?`, a: r`No! The power rule is for $x^{\text{number}}$. In $2^x$ the variable is in the exponent; that is an exponential function with a different rule.` },
      ],
      keyPoints: ['d/dx xⁿ = nxⁿ⁻¹ for any real n.', 'Rewrite roots and fractions as powers first.', 'Constants multiply through; sums go term by term; constants alone → 0.', 'Horizontal tangents: solve f′(x) = 0.'],
    },
  },
  'c2-4': {
    bigIdea: [
      r`Four functions get their own special derivative facts, and you will use them constantly. First: $e^x$ is its own derivative. That is what makes $e$ special: it is the one exponential whose growth rate equals its own value.`,
      r`Second: $\ln x$ has derivative $\frac{1}{x}$. Since $\ln x$ grows more and more slowly, its slope $\frac{1}{x}$ shrinks as $x$ grows. That fits the picture.`,
      r`Third and fourth: $\sin x$ has derivative $\cos x$, and $\cos x$ has derivative $-\sin x$. Picture the Ferris wheel: when your height ($\sin$) is at the top, it is momentarily not changing, and indeed $\cos\frac{\pi}{2} = 0$. Differentiating sine four times brings you back to sine, so the pattern repeats every four steps.`,
    ],
    picture: { title: 'A swing', t: r`On a swing, your speed is greatest at the bottom and zero at the highest points. Position and speed take turns being big: when one is at a peak, the other is zero. Sine and cosine relate exactly like that, which is why each is (plus or minus) the derivative of the other.` },
    words: [
      { term: r`$\frac{d}{dx}e^x = e^x$`, means: r`The exponential with base $e$ is its own derivative.` },
      { term: r`$\frac{d}{dx}\ln x = \frac{1}{x}$`, means: r`The natural log’s slope is one over $x$ (for $x > 0$).` },
      { term: r`$\frac{d}{dx}\sin x = \cos x$`, means: 'Sine’s slope is cosine (x in radians).' },
      { term: r`$\frac{d}{dx}\cos x = -\sin x$`, means: 'Cosine’s slope is negative sine.' },
      { term: 'Higher derivative', means: r`Differentiating again: $f''$ is the derivative of $f'$.` },
    ],
    tools: [
      { name: 'Unit circle values', refresher: r`$\sin 0 = 0$, $\cos 0 = 1$, $\sin\frac{\pi}{2} = 1$, $\sin\frac{\pi}{6} = \frac{1}{2}$.`, lesson: 'c0-8' },
      { name: 'e and ln', refresher: r`$e^0 = 1$, $\ln 1 = 0$, $e \approx 2.718$.`, lesson: 'c0-7' },
      { name: 'Sum and constant rules', refresher: 'Differentiate term by term; constants come along.', lesson: 'c2-3' },
    ],
    why: [
      [r`Use the sum and constant-multiple rules with the two new facts: $\sin \to \cos$ and $e^x \to e^x$.`, r`$\cos 0 = 1$ and $e^0 = 1$, so we get $2(1) + 3(1)$.`],
      [r`Derivatives of sine cycle: $\sin \to \cos \to -\sin \to -\cos \to \sin$. So only the remainder after dividing by 4 matters.`, r`A remainder of 3 means three steps into the cycle: $-\cos x$.`],
    ],
    walk: {
      'c2-4-1': [r`Differentiate each term: $3\sin x \to 3\cos x$.`, r`$-2\cos x \to -2(-\sin x) = +2\sin x$. Watch the double negative!`, r`$f'(x) = 3\cos x + 2\sin x$; at 0: $3(1) + 2(0) = 3$.`],
      'c2-4-2': [r`$e^x \to e^x$ and $\ln x \to \frac{1}{x}$.`, r`$f'(x) = e^x + \frac{1}{x}$.`, r`$f'(1) = e + 1 \approx 3.718$.`],
      'c2-4-3': [r`Constant multiple: $4\ln x \to 4 \cdot \frac{1}{x} = \frac{4}{x}$.`, r`At $x = 2$: $\frac{4}{2} = 2$.`, r`So the graph of $4\ln x$ rises with slope 2 at $x = 2$.`],
      'c2-4-4': [r`The derivative of $\cos x$ is $-\sin x$.`, r`At $\frac{\pi}{2}$: $-\sin\frac{\pi}{2} = -1$.`, r`Makes sense: cosine is falling through zero there, as steeply as it ever falls.`],
      'c2-4-5': [r`First derivative of $\sin x$: $\cos x$. Second: derivative of $\cos x$, which is $-\sin x$.`, r`So $(\sin x)'' = -\sin x$.`, r`At $\frac{\pi}{6}$: $-\sin\frac{\pi}{6} = -\frac{1}{2}$.`],
      'c2-4-6': [r`$2e^x \to 2e^x$ and $-x^2 \to -2x$.`, r`$f'(x) = 2e^x - 2x$.`, r`$f'(0) = 2(1) - 0 = 2$.`],
      'c2-4-7': [r`Since $\ln 1 = 0$, write it as $\frac{\ln(1 + h) - \ln 1}{h}$.`, r`That is the definition of the derivative of $\ln x$ at $x = 1$.`, r`$\frac{d}{dx}\ln x = \frac{1}{x}$, so at 1 the answer is $1$.`],
    },
    teach: {
      plan: [r`Graph $e^x$ and point out that its height and its slope are the same at every point.`, r`Graph $\ln x$ and show its slope shrinking like $\frac{1}{x}$.`, r`Draw sine and cosine together; show cosine is positive exactly where sine is rising.`, r`Write the four-step cycle of sine derivatives.`, r`Practice evaluating derivatives at special angles.`],
      questions: [
        { q: r`Why is the derivative of $\cos x$ negative sine?`, a: r`Just after $x = 0$, cosine starts going down while sine is positive. A falling function needs a negative slope, so the derivative is $-\sin x$.` },
        { q: r`Is the derivative of $e^x$ really $e^x$, not $xe^{x-1}$?`, a: r`Yes, it is $e^x$. The power rule only applies when $x$ is the base, not the exponent.` },
        { q: 'Do I need radians?', a: r`Yes. $\frac{d}{dx}\sin x = \cos x$ is only true in radians; that is why calculus always uses radians.` },
      ],
      keyPoints: ['(eˣ)′ = eˣ and (ln x)′ = 1/x.', '(sin x)′ = cos x and (cos x)′ = −sin x.', 'Sine derivatives repeat every 4.', 'Radians are required.'],
    },
  },
  'c2-5': {
    bigIdea: [
      r`What is the derivative of a product, like $x^2 \sin x$? You might hope it is just the product of the derivatives, but it is not. Think of a rectangle whose width and height are both growing. The area grows in two ways: from the width growing (times the height) and from the height growing (times the width).`,
      r`That gives the product rule: $(fg)' = f'g + fg'$. In words: “derivative of the first times the second, plus the first times the derivative of the second”.`,
      r`For a fraction, the quotient rule is: $\left(\frac{f}{g}\right)' = \frac{f'g - fg'}{g^2}$. A popular memory chant is “low d-high minus high d-low, over the square of what’s below”. The order on top matters because of the minus sign.`,
    ],
    picture: { title: 'A growing garden plot', t: r`A garden is $f$ meters wide and $g$ meters long, and both are growing. In one moment the area gains a strip along the length ($f' \cdot g$) and a strip along the width ($f \cdot g'$). Total growth: $f'g + fg'$.` },
    words: [
      { term: 'Product rule', means: r`$(fg)' = f'g + fg'$.` },
      { term: 'Quotient rule', means: r`$\left(\frac{f}{g}\right)' = \frac{f'g - fg'}{g^2}$.` },
      { term: 'Numerator / denominator', means: r`Top / bottom of a fraction (here "high" and "low").` },
    ],
    tools: [
      { name: 'Basic derivatives', refresher: r`Power rule, $e^x$, $\ln x$, $\sin x$, $\cos x$.`, lesson: 'c2-4' },
      { name: 'Fraction arithmetic and signs', refresher: r`Be careful with $-(\ldots)$ in the quotient rule.`, lesson: 'c0-1' },
      { name: 'Unit circle values', refresher: r`$\sin\pi = 0$, $\cos\pi = -1$.`, lesson: 'c0-8' },
    ],
    why: [
      [r`It is a product of two functions, so name the two factors to apply the product rule cleanly.`, r`Derivative of the first ($2x$) times the second, plus the first times derivative of the second ($\cos x$).`],
      [r`Quotient rule with top $x$ (derivative 1) and bottom $x^2 + 1$ (derivative $2x$): low d-high minus high d-low, over low squared.`, r`Simplify the top: $x^2 + 1 - 2x^2 = 1 - x^2$.`],
    ],
    walk: {
      'c2-5-1': [r`Product of $x^2$ and $e^x$. Their derivatives: $2x$ and $e^x$.`, r`Product rule: $f'(x) = 2x \cdot e^x + x^2 \cdot e^x$.`, r`At $x = 1$: $2e + e = 3e \approx 8.155$.`],
      'c2-5-2': [r`Product of $x$ and $\sin x$, with derivatives $1$ and $\cos x$.`, r`$f'(x) = 1 \cdot \sin x + x\cos x$.`, r`At $\pi$: $\sin\pi + \pi\cos\pi = 0 + \pi(-1) = -\pi \approx -3.142$.`],
      'c2-5-3': [r`Quotient: high $= x + 1$ (derivative 1), low $= x - 1$ (derivative 1).`, r`$f'(x) = \frac{(1)(x - 1) - (x + 1)(1)}{(x - 1)^2} = \frac{x - 1 - x - 1}{(x - 1)^2} = \frac{-2}{(x - 1)^2}$.`, r`At 3: $\frac{-2}{4} = -\frac{1}{2}$.`],
      'c2-5-4': [r`Quotient: high $\ln x$ (derivative $\frac{1}{x}$), low $x$ (derivative 1).`, r`$f'(x) = \frac{\frac{1}{x} \cdot x - \ln x \cdot 1}{x^2} = \frac{1 - \ln x}{x^2}$.`, r`At 1: $\frac{1 - 0}{1} = 1$.`],
      'c2-5-5': [r`Product rule: $(fg)' = f'g + fg'$.`, r`At 2: $f'(2)g(2) + f(2)g'(2) = (-1)(4) + (3)(5)$.`, r`$= -4 + 15 = 11$.`],
      'c2-5-6': [r`Quotient rule: $\frac{f'g - fg'}{g^2}$.`, r`At 2: $\frac{(-1)(4) - (3)(5)}{4^2} = \frac{-4 - 15}{16}$.`, r`$= -\frac{19}{16}$.`],
      'c2-5-7': [r`$h$ is a product of $x^2$ and $f(x)$.`, r`$h'(x) = 2x \cdot f(x) + x^2 \cdot f'(x)$.`, r`At 3: $6 \cdot 2 + 9 \cdot (-1) = 12 - 9 = 3$.`],
    },
    teach: {
      plan: [r`Show that $(x \cdot x)' = 2x$, but $(x)' \cdot (x)' = 1$: the derivative of a product is NOT the product of derivatives.`, r`Draw the growing rectangle to explain $f'g + fg'$.`, r`State the quotient rule with the “low d-high” chant.`, r`Practice with formulas, then with tables of values.`, r`Point out shortcuts: sometimes simplifying first avoids the quotient rule.`],
      questions: [
        { q: 'Does the order matter in the product rule?', a: r`No, addition does not care about order: $f'g + fg' = fg' + f'g$.` },
        { q: 'Does the order matter in the quotient rule?', a: r`Yes! Because of the minus sign, you must do $f'g - fg'$ (top’s derivative first). Swapping flips the sign of the answer.` },
        { q: r`Do I always need the quotient rule for fractions?`, a: r`No. If the bottom is a single term like $x$ or $x^2$, splitting or rewriting with negative exponents is often easier.` },
      ],
      keyPoints: ['(fg)′ = f′g + fg′.', '(f/g)′ = (f′g − fg′)/g².', 'Order matters in the quotient rule because of the minus.', 'The derivative of a product is not the product of derivatives.'],
    },
  },
  'c2-6': {
    bigIdea: [
      r`The other four trig functions are all built from sine and cosine: $\tan x = \frac{\sin x}{\cos x}$, $\cot x = \frac{\cos x}{\sin x}$, $\sec x = \frac{1}{\cos x}$, $\csc x = \frac{1}{\sin x}$. So their derivatives come from the quotient rule. No new ideas, just results worth memorizing.`,
      r`The four results: $(\tan x)' = \sec^2 x$, $(\sec x)' = \sec x\tan x$, $(\cot x)' = -\csc^2 x$, $(\csc x)' = -\csc x\cot x$. Notice the pairs: tan/sec and cot/csc look alike, and the “co” functions get a minus sign.`,
      r`Since $\sec^2 x$ is always positive, tangent is always increasing between its asymptotes, which matches its graph climbing from $-\infty$ to $\infty$.`,
    ],
    picture: { title: 'Family resemblance', t: r`Think of the trig functions as two families. The tangent family (tan, sec) has positive derivatives built from tan and sec. The cofunction family (cot, csc) is the mirror image: same shapes, but with “co” names and a minus sign.` },
    words: [
      { term: r`$\sec x$`, means: r`Secant: $\frac{1}{\cos x}$.` },
      { term: r`$\csc x$`, means: r`Cosecant: $\frac{1}{\sin x}$.` },
      { term: r`$\cot x$`, means: r`Cotangent: $\frac{\cos x}{\sin x}$.` },
      { term: r`$\sec^2 x$`, means: r`$(\sec x)^2$, the square of the secant.` },
    ],
    tools: [
      { name: 'Quotient rule', refresher: r`$\left(\frac{f}{g}\right)' = \frac{f'g - fg'}{g^2}$.`, lesson: 'c2-5' },
      { name: 'Trig values', refresher: r`At $\frac{\pi}{4}$: $\sin = \cos = \frac{\sqrt{2}}{2}$, so $\sec = \csc = \sqrt{2}$, $\tan = \cot = 1$.`, lesson: 'c0-8' },
      { name: 'Product rule', refresher: r`Needed for $x\tan x$.`, lesson: 'c2-5' },
    ],
    why: [
      [r`Apply the memorized result $(\tan x)' = \sec^2 x$.`, r`$\cos\frac{\pi}{4} = \frac{\sqrt{2}}{2}$, so $\sec\frac{\pi}{4} = \frac{2}{\sqrt{2}} = \sqrt{2}$, and squaring gives 2.`],
      [r`A tangent line needs a point and a slope: $\sec 0 = \frac{1}{\cos 0} = 1$, and the slope uses $(\sec x)' = \sec x\tan x$ with $\tan 0 = 0$.`, r`Slope 0 means a flat line through the point: $y = 1$.`],
    ],
    walk: {
      'c2-6-1': [r`$(\tan x)' = \sec^2 x$.`, r`$\sec\frac{\pi}{4} = \frac{1}{\cos(\pi/4)} = \frac{1}{\sqrt{2}/2} = \sqrt{2}$.`, r`$\sec^2\frac{\pi}{4} = (\sqrt{2})^2 = 2$.`],
      'c2-6-2': [r`$(\sec x)' = \sec x\tan x$.`, r`At $\frac{\pi}{3}$: $\cos\frac{\pi}{3} = \frac{1}{2}$, so $\sec = 2$; and $\tan\frac{\pi}{3} = \sqrt{3}$.`, r`$2\sqrt{3} \approx 3.464$.`],
      'c2-6-3': [r`Product of $x$ and $\tan x$: $f'(x) = 1 \cdot \tan x + x\sec^2 x$.`, r`At $\frac{\pi}{4}$: $\tan = 1$ and $\sec^2 = 2$.`, r`$1 + \frac{\pi}{4} \cdot 2 = 1 + \frac{\pi}{2} \approx 2.571$.`],
      'c2-6-4': [r`$(\csc x)' = -\csc x\cot x$.`, r`At $\frac{\pi}{2}$: $\csc = \frac{1}{\sin(\pi/2)} = 1$ and $\cot = \frac{\cos(\pi/2)}{\sin(\pi/2)} = 0$.`, r`$-1 \cdot 0 = 0$.`],
      'c2-6-5': [r`$(\cot x)' = -\csc^2 x$.`, r`$\csc\frac{\pi}{4} = \sqrt{2}$, so $\csc^2 = 2$.`, r`Answer: $-2$.`],
      'c2-6-6': [r`Write $\sec x = (\cos x)^{-1}$ or use the quotient rule on $\frac{1}{\cos x}$.`, r`Quotient rule: $\frac{0 \cdot \cos x - 1 \cdot (-\sin x)}{\cos^2 x} = \frac{\sin x}{\cos^2 x}$.`, r`Split: $\frac{1}{\cos x} \cdot \frac{\sin x}{\cos x} = \sec x\tan x$. Choice A.`],
      'c2-6-7': [r`Point: $\tan\frac{\pi}{4} = 1$, so $(\frac{\pi}{4}, 1)$. Slope: $\sec^2\frac{\pi}{4} = 2$.`, r`Line: $y - 1 = 2\left(x - \frac{\pi}{4}\right)$, so $y = 2x - \frac{\pi}{2} + 1$.`, r`$y$-intercept (set $x = 0$): $1 - \frac{\pi}{2} \approx -0.571$.`],
    },
    teach: {
      plan: [r`Write all six trig functions in terms of sine and cosine.`, r`Derive $(\tan x)' = \sec^2 x$ with the quotient rule together.`, r`Show the four results in two columns (tan/sec and cot/csc) to highlight the pattern and the minus signs.`, r`Practice at $\frac{\pi}{4}$, $\frac{\pi}{3}$ and $\frac{\pi}{2}$.`, r`Do one tangent-line problem.`],
      questions: [
        { q: 'Do I have to memorize these?', a: 'Yes, they appear constantly. But if you forget one, you can always rebuild it from sine and cosine with the quotient rule.' },
        { q: 'Why do the co-functions get minus signs?', a: r`They come from cosine-related pieces, and $(\cos x)' = -\sin x$ brings in a minus.` },
        { q: r`Is $\sec^2 x$ the same as $\sec(x^2)$?`, a: r`No. $\sec^2 x$ means $(\sec x)^2$. $\sec(x^2)$ means secant of $x$ squared, a different function.` },
      ],
      keyPoints: ['(tan x)′ = sec² x; (sec x)′ = sec x tan x.', '(cot x)′ = −csc² x; (csc x)′ = −csc x cot x.', 'All come from the quotient rule.', 'Co-functions carry a minus sign.'],
    },
  },
};
