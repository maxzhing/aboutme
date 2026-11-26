import type { SkillId } from '@/lib/types';

const r = String.raw;

export type Tone = 'brand' | 'brand2' | 'ok' | 'warn' | 'bad' | 'gold' | 'muted';
/** [text, color, legend label] */
export type Seg = [string, Tone?, string?];

export type Visual =
  | { kind: 'sentence'; segs: Seg[]; lift?: number[]; liftLabel?: string }
  | { kind: 'flow'; nodes: [string, string?, Tone?][] }
  | { kind: 'plot'; mode: 'line' | 'standard' | 'perp' | 'system' | 'ineq' | 'parabola' | 'disc' | 'exp' | 'circle' | 'fit' }
  | { kind: 'steps'; lines: [string, string][] }
  | { kind: 'compare'; bad: string; good: string; badLabel?: string; goodLabel?: string }
  | { kind: 'tiles'; items: [string, string, string][] }
  | { kind: 'meter'; left: string; right: string; words: [string, number][]; zone?: [number, number] }
  | { kind: 'numline'; center: number }
  | { kind: 'tape'; a: number; b: number; names: [string, string] }
  | { kind: 'percent' }
  | { kind: 'dots'; values: number[]; outlier: number }
  | { kind: 'spread' }
  | { kind: 'table'; headers: string[]; rows: (string | number)[][]; views: { label: string; num: [number, number][]; den: [number, number][]; text: string }[] }
  | { kind: 'sample' }
  | { kind: 'shape'; mode: 'trig' | 'similar' | 'arc' | 'angles' | 'tri' | 'box' | 'special' | 'cyl' };

/** One screen of a lesson: a picture, a headline, and at most two short sentences. */
export interface Idea { title: string; text: string; visual: Visual; try?: string }
export interface VisualLesson { icon: string; hook: string; ideas: Idea[] }

const I = (title: string, text: string, visual: Visual, try_?: string): Idea => ({ title, text, visual, try: try_ });

export const VISUAL_LESSONS: Record<SkillId, VisualLesson> = {
  /* ───────────── Math · Algebra ───────────── */
  lin1: { icon: '⚖️', hook: 'Solve any one-variable equation and know instantly whether it has one, zero or endless solutions.', ideas: [
    I('An equation is a balanced scale', 'Whatever you do to one side, do to the other. Undo things in reverse order: distribute, collect, divide.', { kind: 'steps', lines: [[r`$3(x - 2) = x + 8$`, 'start'], [r`$3x - 6 = x + 8$`, 'distribute the 3 to BOTH terms'], [r`$2x = 14$`, 'subtract $x$, add 6'], [r`$x = 7$`, 'divide by 2']] }, 'Predict each line before you reveal it.'),
    I('One, none, or endless?', 'Simplify both sides, then compare the $x$-terms and the constants.', { kind: 'tiles', items: [['🎯', 'One solution', r`$x$-coefficients differ: $3x + 1 = x + 9$`], ['🚫', 'No solution', r`Same $x$-terms, different constants: $2x + 3 = 2x + 5$`], ['♾️', 'Infinitely many', r`Both sides identical: $2x + 6 = 2(x + 3)$`]] }),
    I('Absolute value means distance', r`$|x - 4| = 3$ says “$x$ is 3 away from 4.” That is always two places, so there are two equations to solve.`, { kind: 'numline', center: 4 }, 'Drag the distance. Flip = to < and >.'),
  ] },
  linf: { icon: '📈', hook: 'Read any line like a story: where it starts and how fast it changes.', ideas: [
    I('Two numbers run the whole line', 'The intercept is where you start. The slope is how much you change for each step of 1.', { kind: 'plot', mode: 'line' }, 'Make the line fall. Then make it start at −4.'),
    I('Find the rate and the start in the words', '“Per,” “each” and “every” mark the slope. A one-time amount is the intercept.', { kind: 'sentence', segs: [['A plumber charges '], ['a $35 visit fee', 'gold', 'start (intercept)'], [' plus '], ['$12 per hour', 'brand', 'rate (slope)'], ['.  →  '], ['C(t) = 35 + 12t', 'ok', 'the model']] }),
    I('Equal steps in, equal steps out', 'In a linear table, every equal jump in $x$ gives the same jump in $y$. Divide the jumps to get the slope.', { kind: 'table', headers: ['x', '2', '4', '6', '8'], rows: [['f(x)', 5, 11, 17, 23]], views: [{ label: 'Step in x', num: [], den: [[0, 1], [0, 2]], text: 'Each column moves $x$ by 2.' }, { label: 'Step in f(x)', num: [[0, 1], [0, 2]], den: [], text: r`Each column moves $f(x)$ by 6, so the slope is $\frac{6}{2} = 3$.` }, { label: 'Predict', num: [[0, 4]], den: [], text: 'Keep adding 6: 5, 11, 17, 23. No equation needed.' }] }),
  ] },
  lin2: { icon: '📐', hook: 'Jump between the forms of a line and spot parallel and perpendicular lines on sight.', ideas: [
    I('Standard form hides the slope', r`For $Ax + By = C$ the slope is $-\frac{A}{B}$. Cover one variable to get each intercept.`, { kind: 'plot', mode: 'standard' }, 'Watch the intercepts move as A and B change.'),
    I('Perpendicular: flip it and change the sign', 'Perpendicular slopes are negative reciprocals. Their product is always −1.', { kind: 'plot', mode: 'perp' }),
    I('Three ways two lines can relate', 'Compare slopes first, then intercepts.', { kind: 'tiles', items: [['🛤️', 'Parallel', 'Same slope, different intercept. Never meet.'], ['✖️', 'Perpendicular', 'Slopes multiply to −1.'], ['🪞', 'Same line', r`One equation is a multiple of the other: $2x + y = 3$ and $4x + 2y = 6$.`]] }),
  ] },
  sys: { icon: '🔀', hook: 'Solve two equations at once, and often skip solving completely.', ideas: [
    I('A solution is a crossing point', 'Different slopes cross once. Same slope and different intercept never cross. Same line overlaps everywhere.', { kind: 'plot', mode: 'system' }, 'Set the gold slope to 1 and see what happens.'),
    I('Elimination: stack and cancel', 'Line up the equations so one variable disappears when you add or subtract.', { kind: 'steps', lines: [[r`$2x + 3y = 12$ and $2x - y = 4$`, 'same $2x$ in both'], [r`$4y = 8$`, 'subtract the second from the first'], [r`$y = 2$`, 'divide by 4'], [r`$x = 3$`, 'put $y = 2$ back in']] }),
    I('Asked for x + y? Do not solve for each', 'Add or subtract the equations to build exactly what the question asks for.', { kind: 'steps', lines: [[r`$3x + y = 10$ and $x + 3y = 6$`, 'question: what is $x + y$?'], [r`$4x + 4y = 16$`, 'add the two equations'], [r`$x + y = 4$`, 'divide by 4. Done.']] }),
  ] },
  ineq: { icon: '🚦', hook: 'Shade the right region and never forget the one move that flips the sign.', ideas: [
    I('Negative flip', 'Solve it like an equation. The only new rule: multiplying or dividing by a negative reverses the sign.', { kind: 'steps', lines: [[r`$-2x + 5 < 11$`, 'start'], [r`$-2x < 6$`, 'subtract 5 (no flip)'], [r`$x > -3$`, 'divide by −2: FLIP']] }),
    I('A line splits the plane in two', 'Solid line means “or equal.” Dashed means strict. Test (0, 0) to choose the side.', { kind: 'plot', mode: 'ineq' }, 'Switch the symbol and watch the shading and the line style.'),
    I('Less than = inside, greater than = outside', r`$|x - c| < d$ is one stretch between two numbers. $|x - c| > d$ is two separate rays.`, { kind: 'numline', center: 2 }, 'Tap < and > to compare.'),
  ] },

  /* ───────────── Math · Advanced Math ───────────── */
  equiv: { icon: '🧩', hook: 'Rewrite expressions into the form that makes the answer obvious.', ideas: [
    I('Factoring is un-multiplying a rectangle', 'The two numbers add to the middle coefficient and multiply to the last one.', { kind: 'shape', mode: 'box' }, 'Find p and q that give x² + 7x + 12.'),
    I('Three patterns to recognize on sight', 'The SAT hides these inside bigger expressions.', { kind: 'tiles', items: [['➖', r`$a^2 - b^2$`, r`$(a - b)(a + b)$, even for $9x^4 - 16$`], ['🟦', r`$a^2 \pm 2ab + b^2$`, r`$(a \pm b)^2$: a perfect square`], ['🌱', r`$x^{\frac{m}{n}}$`, r`$\sqrt[n]{x^m}$: bottom is the root, top is the power`]] }),
    I('Complete the square', 'Take half the $x$-coefficient, square it, add and subtract it.', { kind: 'steps', lines: [[r`$x^2 + 6x + 2$`, 'half of 6 is 3, and $3^2 = 9$'], [r`$(x^2 + 6x + 9) - 9 + 2$`, 'add 9, subtract 9'], [r`$(x + 3)^2 - 7$`, 'vertex form: minimum is −7 at $x = -3$']] }),
  ] },
  nleq: { icon: '🎢', hook: 'Know how many solutions a quadratic has before you solve it.', ideas: [
    I('The discriminant counts the solutions', r`$b^2 - 4ac$ positive: two. Zero: one. Negative: none. It is also how many times the graph touches the $x$-axis.`, { kind: 'plot', mode: 'disc' }, 'Raise c until the parabola lifts off the axis.'),
    I('Sum and product without solving', r`For $ax^2 + bx + c = 0$ the two solutions add to $-\frac{b}{a}$ and multiply to $\frac{c}{a}$.`, { kind: 'tiles', items: [['➕', 'Sum of solutions', r`$-\frac{b}{a}$. For $2x^2 - 10x + 3 = 0$ it is $5$.`], ['✖️', 'Product of solutions', r`$\frac{c}{a}$. For the same equation it is $\frac{3}{2}$.`]] }),
    I('Squaring can invent fake answers', 'After you square both sides or clear a denominator, plug every answer back into the original.', { kind: 'compare', bad: r`$\sqrt{x + 2} = x$ → $x^2 - x - 2 = 0$ → “$x = 2$ or $x = -1$.”`, good: r`Check $x = -1$: $\sqrt{1} = 1 \ne -1$. Throw it out. Only $x = 2$.`, badLabel: 'Stops too early', goodLabel: 'Checks' }),
  ] },
  nlf: { icon: '🚀', hook: 'Read vertex, zeros, growth and decay straight from the equation.', ideas: [
    I('Vertex form shows the turning point', r`In $y = a(x - h)^2 + k$ the vertex is $(h, k)$. The sign inside the brackets is the opposite of what you see.`, { kind: 'plot', mode: 'parabola' }, 'Move the vertex to (−2, 3). How many x-intercepts now?'),
    I('Exponential: multiply, do not add', r`In $y = a \cdot b^x$, $a$ is the start and $b$ is the factor each step. Above 1 grows, below 1 shrinks.`, { kind: 'plot', mode: 'exp' }, 'Set the factor to 0.8: that is a 20% decrease each step.'),
    I('Four moves that transform any graph', 'Changes outside the function move it vertically. Changes inside move it horizontally, the opposite way.', { kind: 'tiles', items: [['⬆️', r`$f(x) + k$`, 'up $k$'], ['➡️', r`$f(x - h)$`, 'right $h$ (opposite of the sign)'], ['🙃', r`$-f(x)$`, 'flip over the $x$-axis'], ['↕️', r`$a \cdot f(x)$`, 'stretch by $a$']] }),
  ] },

  /* ───────────── Math · Problem-Solving & Data Analysis ───────────── */
  ratio: { icon: '🍰', hook: 'Turn ratios and unit conversions into simple pictures you cannot get wrong.', ideas: [
    I('A ratio is equal-sized parts', 'A 3 : 5 ratio means 8 equal parts in total. Find one part and everything follows.', { kind: 'tape', a: 3, b: 5, names: ['red', 'blue'] }, 'Make the total 96. What is the red amount?'),
    I('Units cancel like numbers', 'Write each conversion as a fraction that puts the unit you want on top and the unit you are removing on the bottom.', { kind: 'steps', lines: [[r`$45 \ \frac{\text{mi}}{\text{h}}$`, 'want feet per second'], [r`$45 \ \frac{\text{mi}}{\text{h}} \times \frac{5280 \text{ ft}}{1 \text{ mi}}$`, 'miles cancel'], [r`$\times \ \frac{1 \text{ h}}{3600 \text{ s}}$`, 'hours cancel'], [r`$= 66 \ \frac{\text{ft}}{\text{s}}$`, 'only ft and s remain']] }),
    I('Scale a shape, scale the powers', 'If every length is multiplied by $k$, areas are multiplied by $k^2$ and volumes by $k^3$.', { kind: 'shape', mode: 'similar' }),
  ] },
  pct: { icon: '💯', hook: 'Stack percent changes correctly, which is where most students lose points.', ideas: [
    I('Percents multiply, they do not add', 'Up 20% then down 20% does not bring you back. Each change is a multiplier.', { kind: 'percent' }, 'Find a pair that lands exactly on 100. (Hint: it is hard.)'),
    I('Every percent change is one multiplier', 'Increase by $r$%: multiply by $1 + \\frac{r}{100}$. Decrease: multiply by $1 - \\frac{r}{100}$.', { kind: 'tiles', items: [['📈', 'Up 8%', r`$\times 1.08$`], ['📉', 'Down 35%', r`$\times 0.65$`], ['🔁', 'Up 8%, three times', r`$\times 1.08^3$`], ['↩️', 'Undo an increase', r`divide by $1.08$, do not subtract 8%`]] }),
    I('“Percent of” is not “percent greater than”', 'Read the two phrases slowly. They differ by a whole 100%.', { kind: 'compare', bad: '“150% greater than 40” → 40 × 1.5 = 60', good: '150% greater = 40 + 150% of 40 = 40 × 2.5 = 100', badLabel: 'Treats it as “150% of”', goodLabel: 'Adds the original' }),
  ] },
  data1: { icon: '📊', hook: 'Predict what happens to mean, median and spread without computing anything.', ideas: [
    I('The mean gets dragged, the median stays put', 'An extreme value pulls the mean toward it. The median only cares about the middle position.', { kind: 'dots', values: [2, 3, 3, 4, 4, 4, 5, 5, 6], outlier: 18 }, 'Add the outlier and watch both markers.'),
    I('Standard deviation = how spread out', 'Data bunched near the mean has a small standard deviation. Sliding all the data over does not change it.', { kind: 'spread' }, 'Add 3 to every value. Did the spread change?'),
    I('Which measure should you trust?', 'Choose the measure that matches the shape of the data.', { kind: 'tiles', items: [['⚖️', 'Symmetric data', 'Mean ≈ median. Either is fine.'], ['🐘', 'Outlier or long tail', 'Median describes a typical value better.'], ['📏', 'Range vs IQR', 'Range uses the extremes, so an outlier changes it. IQR ignores them.']] }),
  ] },
  data2: { icon: '🔬', hook: 'Read scatterplots, lines of best fit and growth patterns like a scientist.', ideas: [
    I('The line predicts; the points are reality', 'Residual = actual − predicted. Points above the line have positive residuals.', { kind: 'plot', mode: 'fit' }, 'Step through the points. Which one is farthest from its prediction?'),
    I('Linear adds, exponential multiplies', 'Check the table: same difference each step is linear; same ratio each step is exponential.', { kind: 'table', headers: ['x', '0', '1', '2', '3'], rows: [['A', 5, 8, 11, 14], ['B', 5, 10, 20, 40]], views: [{ label: 'Row A', num: [[0, 1], [0, 2], [0, 3], [0, 4]], den: [], text: 'Row A adds 3 each time: linear, $y = 5 + 3x$.' }, { label: 'Row B', num: [[1, 1], [1, 2], [1, 3], [1, 4]], den: [], text: r`Row B doubles each time: exponential, $y = 5 \cdot 2^x$.` }] }),
    I('What the slope and intercept mean', 'Translate the model into a sentence with units.', { kind: 'tiles', items: [['↗️', 'Slope', 'Predicted change in $y$ for each +1 in $x$.'], ['🏁', 'Intercept', 'Predicted $y$ when $x = 0$. Sometimes outside the data, so not always meaningful.'], ['⚠️', 'Prediction', 'An estimate, not a guarantee. Say “predicted,” not “will be.”']] }),
  ] },
  prob: { icon: '🎲', hook: 'Pick the right denominator every time, which is the whole game in probability.', ideas: [
    I('“Given” shrinks the table', 'The words “given,” “of those” and “among” tell you to use only one row or column as the total.', { kind: 'table', headers: ['', 'Bus', 'Car', 'Total'], rows: [['Juniors', 30, 20, 50], ['Seniors', 15, 35, 50], ['Total', 45, 55, 100]], views: [
      { label: 'P(bus)', num: [[2, 1]], den: [[2, 3]], text: r`Everyone is the total: $\frac{45}{100}$.` },
      { label: 'P(bus | junior)', num: [[0, 1]], den: [[0, 3]], text: r`Only juniors count: $\frac{30}{50}$.` },
      { label: 'P(junior | bus)', num: [[0, 1]], den: [[2, 1]], text: r`Only bus riders count: $\frac{30}{45}$. Same top, different bottom.` },
      { label: 'P(junior and bus)', num: [[0, 1]], den: [[2, 3]], text: r`No “given,” so the total is everyone: $\frac{30}{100}$.` }] }, 'Tap each probability and watch the denominator move.'),
    I('Three phrases, three moves', 'Translate the wording before touching numbers.', { kind: 'tiles', items: [['🔎', '“given / of those”', 'Shrink the denominator to that group.'], ['➕', '“or”', 'Add both, then subtract the overlap.'], ['1️⃣', '“at least one”', 'Compute 1 − P(none).']] }),
    I('Do not flip the condition', 'P(A given B) and P(B given A) share a numerator but have different denominators.', { kind: 'compare', bad: '“30 juniors ride the bus, 50 juniors, so P(junior | bus) = 30/50.”', good: 'The condition is “bus,” so divide by the 45 bus riders: 30/45.', badLabel: 'Wrong group as total', goodLabel: 'Condition picks the total' }),
  ] },
  infer: { icon: '🎯', hook: 'Say exactly what a sample can and cannot tell you.', ideas: [
    I('An estimate comes with a cushion', 'The margin of error gives a range of plausible values. Bigger random samples shrink it.', { kind: 'sample' }, 'Quadruple the sample. What happens to the margin?'),
    I('Who was sampled is who you can talk about', 'Results generalize only to the population the random sample was drawn from.', { kind: 'flow', nodes: [['Population sampled from', 'e.g. students at ONE school', 'muted'], ['Random sample', 'everyone equally likely', 'brand'], ['Conclusion', 'about THAT school only', 'ok']] }),
    I('Plausible, not exact', 'A correct conclusion talks about a range and uses careful words.', { kind: 'compare', bad: '“Exactly 42% of all students prefer the new schedule.”', good: '“It is plausible that between 38% and 46% of the students prefer it.”', badLabel: 'Too certain', goodLabel: 'Matches the margin' }),
  ] },
  claims: { icon: '🧪', hook: 'Tell at a glance whether a study can prove cause or only show a link.', ideas: [
    I('Two kinds of “random,” two different powers', 'Random sampling lets you generalize. Random assignment lets you claim cause.', { kind: 'tiles', items: [['🎟️', 'Random SAMPLE', 'Who gets studied. Lets you generalize to the population.'], ['🔀', 'Random ASSIGNMENT', 'Who gets the treatment. Lets you say the treatment caused the result.']] }),
    I('What can this study conclude?', 'Ask the two questions separately.', { kind: 'table', headers: ['', 'Random assignment', 'No random assignment'], rows: [['Random sample', 'Cause + generalize', 'Link only, generalize'], ['Not random sample', 'Cause, for these subjects only', 'Link only, these subjects only']], views: [
      { label: 'Experiment on volunteers', num: [[1, 1]], den: [], text: 'Treatment was assigned at random, so cause is fair, but only for people like the volunteers.' },
      { label: 'Random survey', num: [[0, 2]], den: [], text: 'A survey assigns nothing. It can show an association for the whole population, never a cause.' },
      { label: 'Gold standard', num: [[0, 1]], den: [], text: 'Random sample and random assignment: cause, for the whole population.' }] }),
    I('A link is not a cause', 'When nothing was assigned, something else may explain both variables.', { kind: 'compare', bad: '“Students who eat breakfast score higher, so breakfast raises scores.”', good: '“Eating breakfast is associated with higher scores.” (Sleep or income might drive both.)', badLabel: 'Claims cause', goodLabel: 'Claims association' }),
  ] },

  /* ───────────── Math · Geometry & Trigonometry ───────────── */
  area: { icon: '📦', hook: 'Handle any area or volume question, including the “what if it doubles” ones.', ideas: [
    I('Scale factor k: area k², volume k³', 'Count the small rectangles inside the big one as you scale it.', { kind: 'shape', mode: 'similar' }, 'Set k = 3. How many copies fit?'),
    I('Radius counts twice', 'In $V = \\pi r^2 h$ the radius is squared, so changing it matters much more than changing the height.', { kind: 'shape', mode: 'cyl' }, 'Double r, then double h. Compare.'),
    I('The formulas are given. The setup is not', 'The reference sheet has every formula. Your job is choosing the right pieces.', { kind: 'tiles', items: [['✂️', 'Odd shape', 'Cut it into rectangles and triangles, or subtract a hole.'], ['🧱', 'Prism or cylinder', 'Volume = base area × height.'], ['🍦', 'Cone or pyramid', r`One third of the matching prism: $\frac{1}{3}Bh$.`]] }),
  ] },
  lines: { icon: '📏', hook: 'Find any missing angle with three facts and no guessing.', ideas: [
    I('Parallel lines make only two angle sizes', 'Every angle is either equal to the one you know or adds with it to 180°.', { kind: 'shape', mode: 'angles' }, 'Drag the angle. The colors never change.'),
    I('Inside 180, outside = the two far ones', 'A triangle’s angles add to 180°. An exterior angle equals the sum of the two interior angles it does not touch.', { kind: 'shape', mode: 'tri' }),
    I('Two triangles worth memorizing', 'These ratios appear constantly and let you skip the Pythagorean theorem.', { kind: 'shape', mode: 'special' }),
  ] },
  trig: { icon: '🧭', hook: 'Master right-triangle trig and the sine-cosine swap the SAT loves.', ideas: [
    I('Sine, cosine and tangent are just side ratios', 'Name the sides from the angle you are standing at: opposite, adjacent, hypotenuse.', { kind: 'shape', mode: 'trig' }, 'Drag θ. Notice sin θ always equals cos(90° − θ).'),
    I('SOH · CAH · TOA', 'One word, three ratios.', { kind: 'tiles', items: [['🅢', 'SOH', r`$\sin = \frac{\text{opposite}}{\text{hypotenuse}}$`], ['🅒', 'CAH', r`$\cos = \frac{\text{adjacent}}{\text{hypotenuse}}$`], ['🅣', 'TOA', r`$\tan = \frac{\text{opposite}}{\text{adjacent}}$`]] }),
    I('The complement swap', r`The two acute angles of a right triangle add to 90°, so the sine of one is the cosine of the other.`, { kind: 'compare', bad: r`“$\sin 32° = \cos x°$, so $x = 32$.”`, good: r`$\sin 32° = \cos(90° - 32°) = \cos 58°$, so $x = 58$.`, badLabel: 'Same angle', goodLabel: 'Complement' }),
  ] },
  circ: { icon: '⭕', hook: 'Read a circle’s equation and slice it into arcs and sectors.', ideas: [
    I('The equation is the center and the radius', r`$(x - h)^2 + (y - k)^2 = r^2$. Flip the signs for the center; take the square root for the radius.`, { kind: 'plot', mode: 'circle' }, 'Build the circle with center (−2, 3) and radius 3.'),
    I('An arc is a fraction of the circle', 'Central angle over 360 is the fraction. Use the same fraction for arc length and for sector area.', { kind: 'shape', mode: 'arc' }),
    I('Messy equation? Complete the square twice', 'Group the $x$ terms and the $y$ terms and complete each square.', { kind: 'steps', lines: [[r`$x^2 + y^2 - 6x + 4y = 12$`, 'not in standard form'], [r`$(x^2 - 6x + 9) + (y^2 + 4y + 4) = 12 + 9 + 4$`, 'add 9 and 4 to BOTH sides'], [r`$(x - 3)^2 + (y + 2)^2 = 25$`, 'center $(3, -2)$, radius 5']] }),
  ] },

  /* ───────────── Reading & Writing · Information and Ideas ───────────── */
  cid: { icon: '🔭', hook: 'Find the main point fast and reject answers that are almost right.', ideas: [
    I('Four kinds of answer, one winner', 'Wrong answers are too broad, too narrow, or bring in something the text never said.', { kind: 'tiles', items: [['🎯', 'Just right', 'Covers the whole text and claims nothing extra.'], ['🔬', 'Too narrow', 'True, but only one detail.'], ['🌍', 'Too broad', 'Bigger claim than the text makes.'], ['👻', 'Not there', 'Sounds sensible, but the text never says it.']] }),
    I('Pivot words carry the point', 'After “but,” “however” or “yet,” the author says what they really think. The first half is usually the view being corrected.', { kind: 'sentence', segs: [['Travel posters of the 1920s are often dismissed as mere advertising', 'muted', 'the common view'], [', '], ['but', 'gold', 'pivot'], [' '], ['historians find sharp political commentary throughout them', 'brand', 'the author’s point'], ['.']], lift: [0, 1, 2], liftLabel: 'Hide the set-up' }),
    I('One wrong word kills a choice', 'Hard answers are built from a correct idea plus one word that goes too far. Hunt for that word.', { kind: 'compare', bad: 'The mural is impossible to display anywhere else.', good: 'The mural would likely be difficult to relocate intact.', badLabel: 'Too strong', goodLabel: 'Matches the text' }),
  ] },
  coet: { icon: '🧲', hook: 'Pick the evidence that actually proves the claim, not just the one on the same topic.', ideas: [
    I('Predict the evidence before you read the choices', 'Ask: if this claim were true, what exactly would we see?', { kind: 'flow', nodes: [['Find the claim', 'usually the last sentence', 'brand'], ['Predict', '“If true, we would see…”', 'gold'], ['Match', 'the choice that shows exactly that', 'ok']] }),
    I('Evidence must hit every part of the claim', 'Break the claim into pieces. A choice that covers only some pieces is the trap.', { kind: 'sentence', segs: [['Bees given caffeine', 'brand', 'who (vs. bees given plain nectar)'], [' remember '], ['a flower’s scent', 'ok', 'what is measured'], [' '], ['for longer', 'gold', 'direction of the difference'], ['.']] }),
    I('Support, weaken, illustrate', 'Read the question stem carefully: it tells you which job the evidence must do.', { kind: 'tiles', items: [['👍', 'Support', 'A result the claim predicts.'], ['👎', 'Weaken', 'A result the claim says should NOT happen.'], ['🖼️', 'Illustrate', 'A quotation that shows the claim happening, not just the same topic.']] }),
  ] },
  coeq: { icon: '📋', hook: 'Use tables and graphs as evidence without getting lost in the numbers.', ideas: [
    I('Read the claim, not the table', 'The claim tells you which cells matter. Everything else in the table is noise.', { kind: 'table', headers: ['Hive crowding', 'Honey stored (kg)', 'Guard bees (%)'], rows: [['Crowded', 12, 31], ['Moderate', 19, 22], ['Sparse', 20, 14]], views: [
      { label: 'Claim: crowding cuts honey', num: [[0, 1], [2, 1]], den: [], text: 'Compare honey in crowded and sparse hives: 12 vs 20.' },
      { label: 'Claim: crowding raises defense', num: [[0, 2], [2, 2]], den: [], text: 'Compare guard bees in crowded and sparse hives: 31% vs 14%.' },
      { label: 'Claim: defense AT THE COST of honey', num: [[0, 1], [2, 1], [0, 2], [2, 2]], den: [], text: 'This claim has two parts, so the answer must mention BOTH columns.' }] }, 'Tap each claim to see which cells it needs.'),
    I('A four-step routine', 'Do it in this order every time.', { kind: 'flow', nodes: [['Claim', 'what must be shown?', 'brand'], ['Variables', 'which rows and columns?', 'gold'], ['Check numbers', 'is the choice accurate?', 'brand2'], ['Relevance', 'does it prove THE claim?', 'ok']] }),
    I('True but useless', 'The most tempting wrong answer reads the data correctly and still does not support the claim.', { kind: 'compare', bad: 'Accurate numbers about a column the claim never mentions.', good: 'Accurate numbers about exactly the things the claim compares.', badLabel: 'True, wrong topic', goodLabel: 'True AND relevant' }),
  ] },
  inf: { icon: '🕵️', hook: 'Complete any argument with the one conclusion the facts force.', ideas: [
    I('Add the facts, do not add ideas', 'Put the premises together. The right answer is what must follow, nothing more.', { kind: 'flow', nodes: [['Fact A', 'The map is dated 1790', 'muted'], ['Fact B', 'Its ink was not invented until 1850', 'muted'], ['So…', 'the map was drawn later than its date', 'ok']] }),
    I('Choose the gentlest answer that works', 'Inference answers live in the cautious zone. Strong words need strong proof.', { kind: 'meter', left: 'cautious', right: 'absolute', words: [['may', 8], ['suggests', 22], ['likely', 36], ['often', 52], ['most', 68], ['proves', 84], ['always', 96]], zone: [2, 42] }),
    I('“Even though” clauses block wrong answers', 'A detail like “although the workshop never moved” exists to rule out a tempting choice.', { kind: 'compare', bad: 'Picks the answer the “although” detail was written to eliminate.', good: 'Uses every detail: asks why each one is in the text.', badLabel: 'Ignores a detail', goodLabel: 'Uses all of them' }),
  ] },

  /* ───────────── Reading & Writing · Craft and Structure ───────────── */
  wic: { icon: '🔤', hook: 'Choose the precise word by using the clues the sentence hands you.', ideas: [
    I('Cover the choices and predict', 'The sentence defines the blank. Find the clue and the direction word, then guess your own word first.', { kind: 'sentence', segs: [['Although', 'gold', 'direction word'], [' critics called the film '], ['______', 'bad', 'the blank'], [', audiences found it '], ['surprisingly moving', 'brand', 'the clue'], ['.']] }),
    I('Right meaning, right strength', 'Several choices will point the right way. Only one has the right intensity for the context.', { kind: 'meter', left: 'mild', right: 'extreme', words: [['question', 10], ['doubt', 26], ['criticize', 44], ['reject', 62], ['denounce', 80], ['vilify', 95]] }),
    I('Common words, uncommon meanings', 'The SAT loves second meanings. Test each choice inside the sentence.', { kind: 'tiles', items: [['🏆', 'champion (verb)', 'to support or defend'], ['📐', 'qualify', 'to limit or add conditions to a claim'], ['✨', 'novel (adj.)', 'new and original'], ['✋', 'arrest', 'to stop or slow']] }),
  ] },
  tsp: { icon: '🏗️', hook: 'See how a text is built and name the job of any sentence.', ideas: [
    I('Most passages follow a few blueprints', 'Label each sentence with its job. The structure answer is those labels in order.', { kind: 'flow', nodes: [['Common view', '“It is often assumed…”', 'muted'], ['Turn', '“However…”', 'gold'], ['New finding', 'what the study showed', 'brand'], ['So what', 'why it matters', 'ok']] }),
    I('Function = job, not content', 'Ask what the sentence does for the sentences around it.', { kind: 'sentence', segs: [['Octopus arms seem to act on their own. ', 'muted', 'background'], ['Yet when signals from the brain were blocked, the arms stopped working together, ', 'brand', 'evidence'], ['which suggests central control matters more than assumed.', 'ok', 'conclusion']] }),
    I('Check the verb first', 'Each choice starts with a verb. If the verb is wrong, the choice is dead no matter what follows.', { kind: 'tiles', items: [['📝', 'describe / present', 'neutral: just tells'], ['⚔️', 'challenge / question', 'pushes back on a view'], ['🔗', 'explain / account for', 'gives the reason'], ['🖼️', 'illustrate', 'gives an example of a claim']] }),
  ] },
  ctc: { icon: '🤝', hook: 'Work out how two authors relate, even when they half agree.', ideas: [
    I('Summarise each text in six words', 'Reduce both texts to one claim each before reading any choice.', { kind: 'flow', nodes: [['Text 1 says', 'one short claim', 'brand'], ['Text 2 says', 'one short claim', 'gold'], ['Relationship', 'agree, disagree, or “yes, but”', 'ok']] }),
    I('“Yes, but” is the usual answer', 'Hard pairs rarely fully agree or fully disagree. Text 2 normally accepts part and limits the rest.', { kind: 'meter', left: 'fully agrees', right: 'fully rejects', words: [['endorses', 6], ['agrees, adds detail', 26], ['accepts but limits', 50], ['doubts the method', 72], ['dismisses', 94]], zone: [36, 80] }),
    I('Respond as that author would', 'Use only what the second author actually says. Do not hand them opinions.', { kind: 'compare', bad: '“Text 2’s author thinks the Text 1 study is worthless.”', good: '“Text 2’s author accepts the finding but doubts it applies to other species.”', badLabel: 'Too extreme', goodLabel: 'Matches the text' }),
  ] },

  /* ───────────── Reading & Writing · Expression of Ideas ───────────── */
  tra: { icon: '🌉', hook: 'Name the relationship first, then the transition picks itself.', ideas: [
    I('Four families of transitions', 'Decide the family before you look at the words.', { kind: 'tiles', items: [['➕', 'Same direction', 'moreover, furthermore, in addition, similarly'], ['↔️', 'Contrast', 'however, by contrast, nevertheless, instead'], ['➡️', 'Result', 'therefore, consequently, thus, as a result'], ['🔍', 'Zoom in', 'for example, specifically, in fact, indeed']] }),
    I('Cover the blank, compare the two sentences', 'What does sentence 2 do to sentence 1? That relationship is the answer.', { kind: 'sentence', segs: [['The first trial showed a strong effect. ', 'brand', 'sentence 1'], ['______, ', 'bad', 'the blank'], ['the second trial showed none.', 'gold', 'sentence 2: goes against']] }),
    I('Near-twins that are not the same', 'Within a family, each word needs something specific.', { kind: 'tiles', items: [['🔄', 'instead', 'needs a replacement: not X; instead, Y'], ['💪', 'nevertheless', 'surprising result despite the first fact'], ['🪞', 'likewise', 'needs a real similarity'], ['📣', 'indeed', 'strengthens the same point']] }),
  ] },
  syn: { icon: '🗂️', hook: 'Beat notes questions in seconds by reading the goal first.', ideas: [
    I('Goal first, notes second', 'Every choice is factually true. Only one does what the goal asks.', { kind: 'flow', nodes: [['Read the goal', 'underline its key words', 'gold'], ['Skim the notes', 'only for what the goal needs', 'brand'], ['Pick the doer', 'the choice that does the goal', 'ok']] }),
    I('Underline the goal words', 'Words like “difference,” “similarity,” “unfamiliar audience” and “specific example” decide everything.', { kind: 'sentence', segs: [['The student wants to '], ['emphasize a difference', 'gold', 'the task'], [' between '], ['the two studies', 'brand', 'the things compared'], [' for an audience '], ['unfamiliar with the field', 'ok', 'so define terms'], ['.']] }),
    I('True is not enough', 'Do not check the choices against the notes. Check them against the goal.', { kind: 'compare', bad: 'Accurate summary of both studies (no difference stated).', good: 'States how one study differs from the other, with “whereas” or “unlike.”', badLabel: 'True, wrong job', goodLabel: 'Does the goal' }),
  ] },

  /* ───────────── Reading & Writing · Standard English Conventions ───────────── */
  bnd: { icon: '✂️', hook: 'Punctuation becomes a yes-or-no test: can each side stand alone?', ideas: [
    I('Extra information gets a matching pair', 'If you can lift a phrase out and the sentence survives, fence it with two commas, two dashes, or parentheses. Never just one.', { kind: 'sentence', segs: [['The theremin'], [',', 'bad', 'matching marks'], [' an instrument played without touch', 'gold', 'extra information'], [',', 'bad', 'matching marks'], [' produces an eerie tone.']], lift: [1, 2, 3] }, 'Tap “Lift it out.”'),
    I('What can join two complete sentences?', 'Test each side of the blank: is it a complete sentence on its own?', { kind: 'tiles', items: [['✅', 'Allowed', 'period · semicolon · comma + and/but/so · colon · dash'], ['❌', 'Comma alone', 'A comma splice. The most common wrong answer.'], ['❌', 'Nothing at all', 'A run-on.'], ['☝️', 'Colon', 'Left side must be a full sentence. Right side explains it.']] }),
    I('“However” in the middle: check both sides', 'Sentence; however, sentence. But when the word only interrupts one sentence, it takes two commas.', { kind: 'compare', bad: 'The telescope is small, however, it found three comets.', good: 'The telescope is small; however, it found three comets.  ·  It did, however, find three comets.', badLabel: 'Comma splice', goodLabel: 'Both correct patterns' }),
    I('Lists with commas inside need semicolons', 'When the items themselves contain commas, semicolons separate the items.', { kind: 'sentence', segs: [['She has lived in '], ['Lima, Peru', 'brand', 'item'], [';', 'bad', 'separator'], [' '], ['Quito, Ecuador', 'gold', 'item'], [';', 'bad', 'separator'], [' and '], ['Bogotá, Colombia', 'ok', 'item'], ['.']] }),
  ] },
  fss: { icon: '🔧', hook: 'Fix verbs, pronouns and modifiers by finding the one word they must match.', ideas: [
    I('Cross out the middle to find the subject', 'The SAT hides the subject behind long interruptions. Lift them out and the verb becomes obvious.', { kind: 'sentence', segs: [['The collection', 'ok', 'subject (singular)'], [' of rare maps, which includes several antique globes,', 'muted', 'interruption'], [' '], ['is', 'brand', 'verb (singular)'], [' on display this month.']], lift: [1] }, 'Lift out the interruption.'),
    I('An opening description must touch its owner', 'Whatever comes right after the comma is the thing being described.', { kind: 'compare', bad: 'By rerouting the stream, flooding was prevented by the engineers.', good: 'By rerouting the stream, the engineers prevented flooding.', badLabel: 'Flooding rerouted the stream?', goodLabel: 'The engineers did' }),
    I('One main verb per clause', 'If the sentence already has its main verb, the blank needs an -ing or -ed form, not another full verb.', { kind: 'sentence', segs: [['The pianist', 'ok', 'subject'], [', '], ['hoping', 'gold', 'describing word (not a verb)'], [' to calm the crowd, '], ['begins', 'brand', 'the one main verb'], [' the concert with a lullaby.']] }),
    I('Apostrophes: own it or shorten it', 'Possession and contraction look alike. Expand the contraction to test it.', { kind: 'tiles', items: [['🐾', 'its', 'belongs to it: “nurses its young”'], ['✂️', 'it’s', '= it is. Say “it is” to check.'], ['👥', 'Kenya’s and Peru’s coasts', 'each owns its own: two apostrophes'], ['👨‍👩‍👧', 'writers’', 'plural owner: apostrophe after the s']] }),
  ] },
};
