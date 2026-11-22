import type { Video } from './types';

const r = String.raw;

/** Original video scripts for the 19 SAT Math skills. Every number is checked in tests/videos.test.ts. */
export const MATH_VIDEOS: Video[] = [
  /* ───────────── Algebra ───────────── */
  { skill: 'lin1', title: 'Linear equations: the balance never lies', hook: 'Solve any linear equation, and spot in seconds when it has no solution or infinitely many.', scenes: [
    { k: 'title', title: 'The balance never lies', sub: 'One rule solves every linear equation.', say: ['Every linear equation is a balance scale.', 'Do the same thing to both sides, and it stays balanced. That is the whole game.'] },
    { k: 'lines', head: r`Solve $5(x - 2) - 3 = 2x + 8$`, rows: [[r`$5(x - 2) - 3 = 2x + 8$`, 'start'], [r`$5x - 10 - 3 = 2x + 8$`, 'distribute the 5'], [r`$5x - 13 = 2x + 8$`, 'combine like terms'], [r`$3x = 21$`, r`subtract $2x$, add 13`], [r`$x = 7$`, 'divide by 3']], say: [
      'Let us solve this one together.',
      'First, distribute the five to both terms inside the parentheses. Five x minus ten.',
      'Combine the constants: minus ten minus three is minus thirteen.',
      'Get the x terms on one side. Subtract two x, add thirteen. Three x equals twenty-one.',
      'Divide by three. x equals seven. Check it: both sides come out to twenty-two.',
    ] },
    { k: 'tiles', head: 'How many solutions?', items: [['One solution', r`Different $x$-coefficients: $4x + 1 = x + 10$`], ['No solution', r`Same $x$-coefficients, different constants: $3x + 2 = 3x + 7$`], ['Infinitely many', r`Both sides identical: $3(x + 2) = 3x + 6$`]], say: [
      'After you simplify, compare the two sides. If the x coefficients are different, there is exactly one solution.',
      'If the x coefficients match but the constants do not, the sides can never be equal. No solution.',
      'And if both sides are identical, every number works. Infinitely many solutions.',
    ] },
    { k: 'choices', stem: r`For what value of $k$ does $6x + 4 = k(2x + 1)$ have no solution?`, choices: ['2', '3', '4', '6'], answer: 1, cross: [3, 2, 0], notes: [r`$4x + 2$: different coefficient, one solution.`, r`$6x + 3$: same coefficient as $6x + 4$, different constant. No solution.`, r`$8x + 4$: different coefficient, one solution.`, r`$12x + 6$: different coefficient, one solution.`], say: [
      'Here is a classic. Think about what no solution needs: same x coefficient, different constant.',
      'Six would make the right side twelve x. Different coefficients, so one solution.',
      'Four gives eight x. Still different.',
      'Two gives four x. One solution again.',
      'Three makes the right side six x plus three. Same x coefficient as six x plus four, different constant. No solution.',
    ] },
    { k: 'versus', head: 'The trap', bad: r`The $x$'s cancelled and left $0 = 5$, so $x = 0$.`, good: r`If the $x$'s cancel, read what is left. $0 = 5$ is false: no solution. $0 = 0$ is true: infinitely many.`, say: [
      'Here is the trap. The x terms cancel, and a student writes x equals zero.',
      'But when the x terms cancel, the leftover statement decides. False means no solution. True means every x works.',
    ] },
    { k: 'quiz', q: r`If $\frac{x}{3} + 4 = 10$, what is the value of $x$?`, choices: ['2', '6', '18', '42'], answer: 2, why: r`Subtract 4: $\frac{x}{3} = 6$. Multiply by 3: $x = 18$.`, reveal: 'The answer is eighteen. Subtract four from both sides to get x over three equals six, then multiply by three.', say: ['Your turn. Solve it, then pick an answer.'] },
    { k: 'recap', points: ['Do the same thing to both sides; undo operations in reverse order.', r`Compare $x$-coefficients first: different means exactly one solution.`, 'Same coefficients: same constants means infinitely many, different constants means none.'], say: [
      'Three things to remember. Keep the balance.',
      'Compare the x coefficients first.',
      'And if they match, the constants tell you none or infinitely many.',
    ] },
  ] },

  { skill: 'linf', title: 'Linear functions: where you start and how fast you change', hook: 'Read any line, table or word problem as two numbers: a start and a rate.', scenes: [
    { k: 'title', title: 'Every line tells a story', sub: 'Where it starts, and how fast it changes.', say: ['A line is just two numbers in disguise.', 'Where you start, and how fast you change. Let us see it.'] },
    { k: 'plot', head: r`Taxi fare: $f(m) = 3 + 2m$`, win: [-1, 9, -2, 22], items: [
      { t: 'fn', f: (x) => 3 + 2 * x, from: 0, to: 9 },
      { t: 'pt', x: 0, y: 3, label: 'start: 3 dollars', tone: 'gold', at: 1 },
      { t: 'seg', a: [2, 7], b: [3, 7], tone: 'gold', at: 2 }, { t: 'seg', a: [3, 7], b: [3, 9], tone: 'gold', label: '+2', at: 2 },
      { t: 'pt', x: 5, y: 13, label: '5 miles: 13 dollars', tone: 'ok', at: 3 },
    ], caption: ['', 'The $y$-intercept is the starting value.', 'The slope is the change for each step of 1.', r`$f(5) = 3 + 2(5) = 13$`], say: [
      'A taxi charges three dollars to get in, plus two dollars per mile.',
      'At zero miles you already owe three dollars. That is the y-intercept: the start.',
      'Each extra mile adds two dollars. Over one, up two. That is the slope: the rate.',
      'So five miles costs three plus ten. Thirteen dollars.',
    ] },
    { k: 'passage', head: 'Find the two numbers in the words', text: r`A gym charges {{a one-time 40-dollar sign-up fee|gold|intercept}} plus {{25 dollars per month|brand|slope}}, so the cost is {{$C = 40 + 25m$|ok|the model}}.`, say: [
      'Word problems hide the same two numbers.',
      'A one-time amount is the starting value. That is the intercept.',
      'Words like per, each and every mark the rate. That is the slope.',
      'Put them together and you have the model.',
    ] },
    { k: 'lines', head: 'Slope from a table', rows: [[r`$x$: 1, 3, 5, 7`], [r`$f(x)$: 4, 10, 16, 22`], [r`slope $= \frac{10 - 4}{3 - 1} = \frac{6}{2} = 3$`, r`change in $f$ over change in $x$`], [r`$f(0) = 4 - 3 = 1$`, 'step back one unit from $x = 1$'], [r`$f(x) = 3x + 1$`]], say: [
      'Tables work the same way. Here are the inputs.',
      'And the outputs. Each one is six more than the last.',
      'But the inputs jump by two, not one. So the slope is six over two, which is three.',
      'To find the start, step back from x equals one to x equals zero: four minus three is one.',
      'So the function is three x plus one.',
    ] },
    { k: 'versus', head: 'The trap', bad: 'The outputs go up by 6 each column, so the slope is 6.', good: r`The inputs go up by 2 each column. Slope $= \frac{6}{2} = 3$.`, say: ['The trap: reading the jump in the outputs as the slope.', 'Always divide by the jump in the inputs.'] },
    { k: 'quiz', q: r`A candle is 30 cm tall and burns down 1.5 cm per hour. Which function gives its height, in cm, after $t$ hours?`, choices: [r`$h(t) = 1.5 + 30t$`, r`$h(t) = 30 - 1.5t$`, r`$h(t) = 30 + 1.5t$`, r`$h(t) = 1.5t - 30$`], answer: 1, why: 'It starts at 30, the intercept, and loses 1.5 every hour, a negative slope.', reveal: 'The answer is B. The candle starts at thirty centimeters, and it loses one and a half every hour, so the slope is negative.', say: ['Pause and try. Find the start and the rate.'] },
    { k: 'recap', points: ['The intercept is the starting value: the output when the input is 0.', 'The slope is the change in output for each 1 of input.', 'From a table: slope = change in output ÷ change in input.'], say: ['The intercept is where you start.', 'The slope is how fast you change.', 'And from a table, divide the jumps.'] },
  ] },

  { skill: 'lin2', title: 'Lines in two variables: three forms, one line', hook: 'Switch between forms of a line and spot parallel and perpendicular lines on sight.', scenes: [
    { k: 'title', title: 'Three forms, one line', sub: 'Slope-intercept, standard and point-slope all describe the same thing.', say: ['The SAT loves to hide a line in a form you did not expect.', 'Let us learn to see through all of them.'] },
    { k: 'lines', head: 'Standard form to slope', rows: [[r`$4x + 2y = 10$`], [r`$2y = -4x + 10$`, r`subtract $4x$`], [r`$y = -2x + 5$`, 'divide by 2'], [r`slope $-2$, $y$-intercept $5$`], [r`shortcut: slope $= -\frac{A}{B} = -\frac{4}{2} = -2$`]], say: [
      'Here is a line in standard form.',
      'Get y by itself. Subtract four x.',
      'Divide everything by two.',
      'Now you can read it. The slope is negative two and the y-intercept is five.',
      'Faster: for A x plus B y equals C, the slope is negative A over B.',
    ] },
    { k: 'plot', head: 'Parallel and perpendicular', win: [-6, 6, -4, 8], square: true, items: [
      { t: 'fn', f: (x) => -2 * x + 5 },
      { t: 'fn', f: (x) => -2 * x + 1, tone: 'gold', dash: true, at: 1 },
      { t: 'fn', f: (x) => x / 2 + 5, tone: 'ok', at: 2 },
    ], caption: [r`$y = -2x + 5$`, r`parallel: $y = -2x + 1$`, r`perpendicular: $y = \frac{1}{2}x + 5$`], say: [
      'Here is y equals negative two x plus five.',
      'A parallel line has the same slope, negative two, and a different intercept. They never meet.',
      'A perpendicular line flips the slope and changes its sign: positive one half. The two slopes multiply to negative one.',
    ] },
    { k: 'lines', head: 'A line through two points', rows: [[r`$(1, 2)$ and $(4, 11)$`], [r`$m = \frac{11 - 2}{4 - 1} = 3$`, 'rise over run'], [r`$2 = 3(1) + b$`, 'plug in either point'], [r`$b = -1$, so $y = 3x - 1$`]], say: [
      'Now build a line from two points.',
      'Slope is rise over run: nine over three, which is three.',
      'Plug one point into y equals three x plus b.',
      'b is negative one. The line is y equals three x minus one.',
    ] },
    { k: 'versus', head: 'The trap', bad: r`Perpendicular to slope $\frac{2}{3}$ means slope $-\frac{2}{3}$.`, good: r`Flip it AND change the sign: $-\frac{3}{2}$. Check: $\frac{2}{3} \cdot \left(-\frac{3}{2}\right) = -1$.`, say: ['The trap: changing the sign but forgetting to flip.', 'Do both. And check that the product is negative one.'] },
    { k: 'quiz', q: r`Line $\ell$ is perpendicular to the line $3x - y = 7$. What is the slope of line $\ell$?`, choices: ['$3$', '$-3$', r`$\frac{1}{3}$`, r`$-\frac{1}{3}$`], answer: 3, why: r`$3x - y = 7$ is $y = 3x - 7$, slope 3. The perpendicular slope is $-\frac{1}{3}$.`, reveal: 'The answer is D. Rewrite the line as y equals three x minus seven. Its slope is three, so the perpendicular slope is negative one third.', say: ['Your turn. Find the slope of the given line first.'] },
    { k: 'recap', points: [r`For $Ax + By = C$, the slope is $-\frac{A}{B}$.`, 'Parallel lines: equal slopes, different intercepts.', 'Perpendicular lines: slopes multiply to −1. Flip and change the sign.'], say: ['Standard form: slope is negative A over B.', 'Parallel: same slope.', 'Perpendicular: flip and change the sign.'] },
  ] },

  { skill: 'sys', title: 'Systems of equations: where two lines meet', hook: 'Solve two equations at once, and often skip most of the solving.', scenes: [
    { k: 'title', title: 'Where two lines meet', sub: 'A system asks for the point that works in both equations.', say: ['Two equations, two unknowns.', 'The answer is a single point that makes both true at the same time.'] },
    { k: 'plot', head: 'A solution is a crossing point', win: [-2, 7, -2, 9], items: [
      { t: 'fn', f: (x) => x + 1 },
      { t: 'fn', f: (x) => -x + 5, tone: 'gold' },
      { t: 'pt', x: 2, y: 3, label: '(2, 3)', tone: 'ok', at: 1 },
      { t: 'fn', f: (x) => x + 4, tone: 'bad', dash: true, at: 2 },
    ], caption: [r`$y = x + 1$ and $y = -x + 5$`, 'They cross once: one solution.', 'Same slope, different intercept: parallel, no solution.'], say: [
      'Here are two lines on the same grid.',
      'They cross at two, three. That point is on both lines, so it solves the system.',
      'Now a third line with the same slope as the first. Parallel lines never cross. No solution.',
    ] },
    { k: 'lines', head: 'Elimination: stack and cancel', rows: [[r`$3x + 2y = 16$`], [r`$5x - 2y = 0$`], [r`$8x = 16$`, r`add: the $y$'s cancel`], [r`$x = 2$`], [r`$3(2) + 2y = 16 \Rightarrow y = 5$`, 'substitute back']], say: [
      'Elimination. Here is the first equation.',
      'And the second. Notice plus two y and minus two y.',
      'Add the equations, and y disappears. Eight x equals sixteen.',
      'x is two.',
      'Put it back in: six plus two y is sixteen, so y is five.',
    ] },
    { k: 'lines', head: 'Asked for a combination? Skip solving', rows: [[r`$2x + y = 11$`], [r`$x + 2y = 13$`], [r`$3x + 3y = 24$`, 'add them'], [r`$x + y = 8$`, 'divide by 3']], say: [
      'Here is a speed trick. The question asks for x plus y.',
      'Look at both equations together.',
      'Add them: three x plus three y equals twenty-four.',
      'Divide by three. x plus y is eight. You never found x or y on their own.',
    ] },
    { k: 'choices', stem: r`The system $ax + 3y = 6$ and $4x + 6y = 12$ has infinitely many solutions. What is the value of $a$?`, choices: ['2', '3', '4', '8'], answer: 0, cross: [3, 2, 1], notes: [r`Doubling $2x + 3y = 6$ gives $4x + 6y = 12$: the same line.`, 'Not in proportion with 4, 6 and 12: the lines cross once.', 'The x-terms would match, but the y-terms would not: one crossing.', 'The x-term would be doubled while the y-term is halved: different lines.'], say: [
      'Infinitely many solutions means both equations are the same line.',
      'Eight would scale the x term up while the y term scales down. Different lines.',
      'Four matches the x term but not the y term.',
      'Three is not in proportion at all.',
      'Two works. Double the first equation and you get the second exactly.',
    ] },
    { k: 'quiz', q: r`If $x + y = 10$ and $x - y = 4$, what is the value of $x$?`, choices: ['3', '6', '7', '14'], answer: 2, why: r`Add the equations: $2x = 14$, so $x = 7$.`, reveal: 'The answer is seven. Add the two equations: the y terms cancel, two x equals fourteen, so x is seven.', say: ['Pause and try. Which method is fastest here?'] },
    { k: 'recap', points: ['The solution of a system is the point on both lines.', 'Elimination: add or subtract the equations so one variable cancels.', 'Asked for a combination like x + y? Add or subtract the equations to build it.'], say: ['A solution is a crossing point.', 'Elimination makes a variable cancel.', 'And when they ask for a combination, build it directly.'] },
  ] },

  { skill: 'ineq', title: 'Linear inequalities: one flip to remember', hook: 'Solve and graph inequalities, and turn word problems into the right symbol.', scenes: [
    { k: 'title', title: 'One flip to remember', sub: 'Inequalities solve like equations, with one extra rule.', say: ['Good news. You already know how to solve inequalities.', 'They work like equations, with one rule that catches everyone.'] },
    { k: 'lines', head: 'Watch the sign', rows: [[r`$-3x + 7 \ge 19$`], [r`$-3x \ge 12$`, 'subtract 7: no flip'], [r`$x \le -4$`, 'divide by −3: FLIP the sign']], say: [
      'Solve negative three x plus seven is at least nineteen.',
      'Subtract seven from both sides. Adding and subtracting never changes the sign.',
      'Now divide by negative three. Multiplying or dividing by a negative flips the sign. x is at most negative four.',
    ] },
    { k: 'plot', head: r`$y < 2x - 1$`, win: [-5, 5, -5, 5], square: true, items: [
      { t: 'fn', f: (x) => 2 * x - 1, dash: true },
      { t: 'shade', f: (x) => 2 * x - 1, side: 'below', at: 1 },
      { t: 'pt', x: 0, y: 0, label: 'test (0, 0)', tone: 'bad', at: 2 },
    ], caption: ['Dashed: the line itself is not included.', 'Less than: shade below.', r`$0 < 2(0) - 1$ is false, so $(0, 0)$ is not a solution.`], say: [
      'To graph y less than two x minus one, start with the boundary line. Dashed, because the inequality is strict.',
      'Less than means shade below the line.',
      'Check with a test point. Is zero less than negative one? No. So the origin is outside the shading. It checks out.',
    ] },
    { k: 'tiles', head: 'Words to symbols', items: [['at least', r`$\ge$`], ['at most, no more than', r`$\le$`], ['more than, fewer than', r`$>$ and $<$`]], say: ['At least means greater than or equal to.', 'At most, or no more than, means less than or equal to.', 'More than and fewer than are strict.'] },
    { k: 'choices', stem: 'A van can carry at most 1,200 pounds. The driver weighs 180 pounds and each box weighs 40 pounds. What is the greatest number of boxes the van can carry with the driver?', choices: ['25', '26', '30', '34'], answer: 0, cross: [3, 2, 1], notes: [r`$180 + 40b \le 1200$ gives $b \le 25.5$, so 25 boxes.`, '26 boxes weigh 1,040 pounds; with the driver that is 1,220: over the limit.', '1,200 ÷ 40 ignores the driver.', 'Adds the driver instead of subtracting.'], say: [
      'Set it up: one eighty plus forty b is at most twelve hundred.',
      'Thirty-four adds the driver instead of subtracting.',
      'Thirty forgets the driver completely.',
      'Twenty-six rounds twenty-five point five up. But twenty-six boxes go over the limit.',
      'So the answer is twenty-five. With at most questions, round down.',
    ] },
    { k: 'quiz', q: r`Which value of $x$ satisfies $5 - 2x > 11$?`, choices: ['−4', '−3', '0', '3'], answer: 0, why: r`$-2x > 6$, so $x < -3$ (flip). Only −4 is less than −3; −3 itself fails because the inequality is strict.`, reveal: 'The answer is negative four. Subtract five, then divide by negative two and flip the sign: x is less than negative three. Negative three itself does not count, because the inequality is strict.', say: ['Pause and try. Watch for the flip.'] },
    { k: 'recap', points: ['Multiplying or dividing by a negative flips the inequality.', 'Strict (< or >): dashed line, open circle. Otherwise solid.', 'Test (0, 0) to choose the side to shade.'], say: ['Negative? Flip.', 'Strict means dashed.', 'And a test point settles the shading.'] },
  ] },

  /* ───────────── Advanced Math ───────────── */
  { skill: 'equiv', title: 'Equivalent expressions: same value, different outfit', hook: 'Factor, expand and rewrite expressions, and check any answer in seconds by plugging in.', scenes: [
    { k: 'title', title: 'Same value, different outfit', sub: 'Equivalent expressions give the same output for every input.', say: ['Two expressions are equivalent if they are equal for every value of x.', 'The SAT asks you to change the outfit without changing the value.'] },
    { k: 'lines', head: r`Factor $x^2 + 5x - 14$`, rows: [[r`$x^2 + 5x - 14$`], [r`two numbers: multiply to $-14$, add to $5$`], [r`$7$ and $-2$`], [r`$(x + 7)(x - 2)$`]], say: [
      'Factor x squared plus five x minus fourteen.',
      'Find two numbers that multiply to negative fourteen and add to five.',
      'Seven and negative two.',
      'So it factors as x plus seven times x minus two.',
    ] },
    { k: 'tiles', head: 'Patterns to know on sight', items: [['Difference of squares', r`$a^2 - b^2 = (a - b)(a + b)$`], ['Perfect square', r`$(a + b)^2 = a^2 + 2ab + b^2$`], ['Exponent rules', r`$x^a \cdot x^b = x^{a+b}$ and $(x^a)^b = x^{ab}$`]], say: ['A difference of squares always splits into a minus and a plus.', 'A squared sum has a middle term: two a b.', 'And with exponents: multiply means add the powers, power of a power means multiply them.'] },
    { k: 'versus', head: 'The most common slip', bad: r`$(x + 3)^2 = x^2 + 9$`, good: r`$(x + 3)^2 = x^2 + 6x + 9$. Test $x = 1$: $4^2 = 16$, and $1 + 6 + 9 = 16$.`, say: ['The most common slip on the whole test.', 'Squaring a sum gives a middle term. Not sure? Plug in one. Four squared is sixteen, not ten.'] },
    { k: 'choices', stem: r`Which expression is equivalent to $9x^2 - 25$?`, choices: [r`$(3x - 5)^2$`, r`$(9x - 5)(x + 5)$`, r`$(3x - 5)(3x + 5)$`, r`$(3x - 25)(3x + 1)$`], answer: 2, cross: [0, 1, 3], notes: [r`Expands to $9x^2 - 30x + 25$.`, r`Expands to $9x^2 + 40x - 25$.`, r`Difference of squares: $(3x)^2 - 5^2$.`, r`Expands to $9x^2 - 72x - 25$.`], say: [
      'Nine x squared minus twenty-five. Spot the pattern?',
      'The first choice squares a difference. That has a middle term.',
      'The second expands to a middle term of forty x.',
      'The fourth gives negative seventy-two x.',
      'It is a difference of squares: three x squared minus five squared.',
    ] },
    { k: 'lines', head: 'Check any answer by plugging in', rows: [[r`pick $x = 2$`], [r`$9(2)^2 - 25 = 11$`], [r`$(6 - 5)(6 + 5) = 11$ ✓`]], say: ['Not sure? Pick an easy number, like two.', 'The original gives eleven.', 'The answer gives eleven too. Same value, same expression.'] },
    { k: 'quiz', q: r`Which expression is equivalent to $\frac{x^2 - 9}{x + 3}$ for $x \ne -3$?`, choices: [r`$x - 3$`, r`$x + 3$`, r`$x - 9$`, r`$x^2 - 3$`], answer: 0, why: r`$x^2 - 9 = (x - 3)(x + 3)$. Cancel the $x + 3$.`, reveal: 'The answer is x minus three. The top factors into x minus three times x plus three, and the x plus three cancels.', say: ['Pause and try. Factor the top first.'] },
    { k: 'recap', points: ['Factor by finding two numbers with the right product and sum.', r`Know $a^2 - b^2$ and $(a + b)^2$ by heart.`, 'When in doubt, plug in a number and compare.'], say: ['Product and sum.', 'Know the two big patterns.', 'And when in doubt, plug in.'] },
  ] },

  { skill: 'nleq', title: 'Quadratic equations and systems: three ways in', hook: 'Solve quadratics the fastest way, count solutions without solving, and find where a line meets a curve.', scenes: [
    { k: 'title', title: 'Quadratics: three ways in', sub: 'Factor, formula or graph. Pick the fastest.', say: ['Every quadratic can be solved. The question is how fast.', 'You have three tools.'] },
    { k: 'tiles', head: 'Pick the fastest method', items: [['Factor', r`friendly numbers: $x^2 - x - 12 = (x - 4)(x + 3)$`], ['Quadratic formula', r`always works: $x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}$`], ['Graph it', 'the solutions are where the curve crosses the $x$-axis']], say: ['If the numbers are friendly, factor.', 'If not, the quadratic formula always works.', 'Or graph it and read the x-intercepts.'] },
    { k: 'plot', head: 'The discriminant counts solutions', win: [-4, 4, -3, 6], items: [
      { t: 'fn', f: (x) => x * x - 1 },
      { t: 'fn', f: (x) => x * x + 2, tone: 'gold', at: 1 },
      { t: 'fn', f: (x) => (x - 1) ** 2, tone: 'ok', at: 2 },
    ], caption: [r`$b^2 - 4ac > 0$: crosses twice, two solutions`, r`$b^2 - 4ac < 0$: never touches, no real solutions`, r`$b^2 - 4ac = 0$: touches once, exactly one solution`], say: [
      'The part under the square root, b squared minus four a c, is the discriminant. Positive means two solutions.',
      'Negative means the parabola misses the axis. No real solutions.',
      'Zero means it just touches. Exactly one.',
    ] },
    { k: 'lines', head: 'A line meets a parabola', rows: [[r`$y = x^2 - 3$ and $y = 2x$`], [r`$x^2 - 3 = 2x$`, 'set them equal'], [r`$x^2 - 2x - 3 = 0$`], [r`$(x - 3)(x + 1) = 0$`], [r`$x = 3$ or $x = -1$: points $(3, 6)$ and $(-1, -2)$`]], say: [
      'Now a system: a parabola and a line.',
      'Where they meet, the y values are equal. Set them equal.',
      'Move everything to one side.',
      'Factor.',
      'Two x values, so two intersection points.',
    ] },
    { k: 'lines', head: 'Shortcut: sum and product', rows: [[r`For $ax^2 + bx + c = 0$:`], [r`sum of solutions $= -\frac{b}{a}$`], [r`product of solutions $= \frac{c}{a}$`]], say: ['A shortcut for questions about the solutions together.', 'The sum is negative b over a.', 'The product is c over a. No solving needed.'] },
    { k: 'choices', stem: r`For what value of $c$ does $x^2 + 6x + c = 0$ have exactly one real solution?`, choices: ['3', '6', '9', '36'], answer: 2, cross: [3, 1, 0], notes: [r`$36 - 12 = 24 > 0$: two solutions.`, r`$36 - 24 = 12 > 0$: two solutions.`, r`$36 - 4c = 0$, so $c = 9$: it is $(x + 3)^2 = 0$.`, r`$36 - 144 < 0$: no real solutions.`], say: [
      'Exactly one solution means the discriminant is zero.',
      'Thirty-six makes it negative. No solutions.',
      'Six leaves twelve. Two solutions.',
      'Three leaves twenty-four. Two solutions.',
      'Nine makes it zero. It is x plus three, squared.',
    ] },
    { k: 'quiz', q: r`What is the sum of the solutions of $2x^2 - 10x + 7 = 0$?`, choices: ['−5', '3.5', '5', '10'], answer: 2, why: r`Sum $= -\frac{b}{a} = -\frac{-10}{2} = 5$.`, reveal: 'The answer is five. The sum of the solutions is negative b over a: negative negative ten, over two, which is five.', say: ['Pause and try. Use the shortcut.'] },
    { k: 'recap', points: ['Friendly numbers: factor. Otherwise: formula or graph.', r`Discriminant $b^2 - 4ac$: positive two, zero one, negative none.`, r`Sum of solutions $-\frac{b}{a}$; product $\frac{c}{a}$.`], say: ['Pick the fastest tool.', 'The discriminant counts solutions.', 'And for the sum or product of the solutions, skip solving.'] },
  ] },

  { skill: 'nlf', title: 'Nonlinear functions: curves you can read at a glance', hook: 'Read a parabola’s vertex and zeros straight from its equation, and tell growth from decay.', scenes: [
    { k: 'title', title: 'Curves you can read at a glance', sub: 'Every form of a function shows you something for free.', say: ['Nonlinear functions look scary, but each form hands you information for free.', 'Let us read them.'] },
    { k: 'plot', head: r`$f(x) = (x - 2)^2 - 1$`, win: [-3, 7, -3, 8], items: [
      { t: 'fn', f: (x) => (x - 2) ** 2 - 1 },
      { t: 'pt', x: 2, y: -1, label: 'vertex (2, −1)', tone: 'gold', at: 1 },
      { t: 'seg', a: [2, -3], b: [2, 8], dash: true, tone: 'gold', at: 2 },
      { t: 'pt', x: 1, y: 0, tone: 'ok', at: 3 }, { t: 'pt', x: 3, y: 0, label: 'zeros', tone: 'ok', at: 3 },
    ], caption: ['Vertex form shows the turning point.', r`vertex $(h, k) = (2, -1)$: note the sign flip on $h$`, r`axis of symmetry $x = 2$`, r`zeros at $x = 1$ and $x = 3$, one each side of the axis`], say: [
      'Here is a parabola in vertex form.',
      'The vertex is two, negative one. Careful: x minus two means h is positive two.',
      'The axis of symmetry runs through the vertex.',
      'And the zeros sit the same distance on each side of it.',
    ] },
    { k: 'tiles', head: 'Three forms of a quadratic', items: [['Vertex form', r`$a(x - h)^2 + k$: vertex $(h, k)$`], ['Factored form', r`$a(x - r)(x - s)$: zeros $r$ and $s$`], ['Standard form', r`$ax^2 + bx + c$: $y$-intercept $c$; vertex at $x = -\frac{b}{2a}$`]], say: ['Vertex form gives the vertex.', 'Factored form gives the zeros.', 'Standard form gives the y-intercept, and the vertex x is negative b over two a.'] },
    { k: 'plot', head: r`$P(t) = 200(1.5)^t$`, win: [-0.5, 5.5, -100, 1700], items: [
      { t: 'fn', f: (x) => 200 * 1.5 ** x, from: 0, to: 5.5 },
      { t: 'pt', x: 0, y: 200, label: 'starts at 200', tone: 'gold', at: 1 },
      { t: 'pt', x: 2, y: 450, label: '×1.5 each step: 200, 300, 450, ...', tone: 'ok', at: 2 },
    ], caption: ['Exponential functions multiply by the same factor each step.', 'The number in front is the starting value.', 'A factor of 1.5 means 50% growth per period.'], say: [
      'Exponential functions multiply instead of add.',
      'The number in front is the start: two hundred.',
      'The base is the growth factor. One point five means fifty percent growth each period.',
    ] },
    { k: 'lines', head: 'Percent to growth factor', rows: [['grows 8%: factor $1.08$'], ['decays 8%: factor $0.92$'], [r`halves every 3 years: $A\left(\frac{1}{2}\right)^{t/3}$`]], say: ['Growth of eight percent: multiply by one point oh eight.', 'Decay of eight percent: keep ninety-two percent. Zero point nine two.', 'Halving every three years: one half, to the power t over three.'] },
    { k: 'versus', head: 'The trap', bad: r`Loses 20% each year: $V = 500(0.2)^t$`, good: r`Losing 20% means keeping 80%: $V = 500(0.8)^t$.`, say: ['The trap: using the percent lost as the factor.', 'The factor is what is left. Eighty percent.'] },
    { k: 'quiz', q: r`$f(x) = -2(x + 3)^2 + 5$. What is the maximum value of $f$?`, choices: ['−3', '2', '3', '5'], answer: 3, why: r`The vertex is $(-3, 5)$. Since $a = -2 < 0$ the parabola opens down, so the maximum value is 5.`, reveal: 'The answer is five. The vertex is negative three, five, and the parabola opens downward, so five is the highest value.', say: ['Pause and try. Read it from the vertex form.'] },
    { k: 'recap', points: [r`Vertex form $a(x - h)^2 + k$: vertex $(h, k)$; $a < 0$ opens down.`, 'Factored form shows the zeros.', r`Exponential $a \cdot b^t$: start $a$, factor $b$; $b > 1$ grows, $b < 1$ decays.`], say: ['Vertex form gives the turning point.', 'Factored form gives the zeros.', 'And exponentials: start times factor to the t.'] },
  ] },

  /* ───────────── Problem-Solving and Data Analysis ───────────── */
  { skill: 'ratio', title: 'Ratios, rates and units: let the units do the work', hook: 'Set up proportions and unit conversions that cannot go wrong.', scenes: [
    { k: 'title', title: 'Let the units do the work', sub: 'If the units cancel correctly, the answer is right.', say: ['Ratio and rate questions are really unit questions.', 'Write the units, and they will tell you whether to multiply or divide.'] },
    { k: 'lines', head: 'Unit conversion chain', rows: [[r`$90$ km per hour in meters per second?`], [r`$\frac{90 \text{ km}}{1 \text{ h}} \cdot \frac{1000 \text{ m}}{1 \text{ km}} \cdot \frac{1 \text{ h}}{3600 \text{ s}}$`, 'units cancel'], [r`$= \frac{90\,000}{3600} = 25$ m/s`]], say: ['Convert ninety kilometers per hour to meters per second.', 'Multiply by fractions equal to one. Kilometers cancel, hours cancel.', 'What is left: twenty-five meters per second.'] },
    { k: 'lines', head: 'Proportions', rows: [['3 cups of flour make 8 muffins. How many cups for 20 muffins?'], [r`$\frac{3}{8} = \frac{c}{20}$`, 'cups over muffins, both sides'], [r`$8c = 60$`, 'cross-multiply'], [r`$c = 7.5$ cups`]], say: ['A recipe question.', 'Set up the same ratio on both sides: cups over muffins.', 'Cross-multiply.', 'Seven and a half cups.'] },
    { k: 'tiles', head: 'Part-to-part vs part-to-whole', items: [['Ratio 2 : 3', 'boys to girls'], ['Total parts', r`$2 + 3 = 5$`], ['Fraction that are boys', r`$\frac{2}{5}$, not $\frac{2}{3}$`]], say: ['A ratio of two to three compares the parts.', 'The whole is two plus three: five parts.', 'So the fraction of boys is two fifths, not two thirds.'] },
    { k: 'choices', stem: 'A map scale is 1 inch : 15 miles. Two towns are 4.2 inches apart on the map. How far apart are the towns?', choices: ['3.6 miles', '19.2 miles', '60 miles', '63 miles'], answer: 3, cross: [1, 0, 2], notes: ['Divides 15 by 4.2.', 'Adds instead of multiplies.', 'Uses 4 inches and drops the 0.2.', r`$4.2 \times 15 = 63$ miles.`], say: [
      'Each inch is fifteen miles.',
      'Nineteen point two just adds the numbers.',
      'Three point six divides. Way too small.',
      'Sixty drops the point two.',
      'Four point two times fifteen: sixty-three miles.',
    ] },
    { k: 'quiz', q: 'A printer prints 12 pages in 40 seconds. At this rate, how many pages does it print in 5 minutes?', choices: ['60', '72', '90', '150'], answer: 2, why: r`5 minutes is 300 seconds, which is $\frac{300}{40} = 7.5$ blocks of 40 seconds. $7.5 \times 12 = 90$ pages.`, reveal: 'The answer is ninety. Five minutes is three hundred seconds, which is seven and a half blocks of forty seconds. Seven and a half times twelve is ninety.', say: ['Pause and try. Watch the units.'] },
    { k: 'recap', points: ['Write the units; multiply by fractions equal to 1 so they cancel.', 'Keep the same order on both sides of a proportion.', 'Part-to-whole: add the parts of the ratio to get the whole.'], say: ['Let the units cancel.', 'Keep the order.', 'And add the parts to get the whole.'] },
  ] },

  { skill: 'pct', title: 'Percentages: every percent is a multiplier', hook: 'Handle percent change, back-to-back changes and reverse percents with one idea.', scenes: [
    { k: 'title', title: 'Percents are multipliers', sub: 'Turn every percent into one number you multiply by.', say: ['Here is the single idea that solves almost every percent question.', 'Turn the percent into a multiplier.'] },
    { k: 'tiles', head: 'One multiplier each', items: [['Increase by 15%', '× 1.15'], ['Decrease by 15%', '× 0.85'], ['15% of', '× 0.15']], say: ['An increase of fifteen percent: times one point one five.', 'A decrease of fifteen percent: times zero point eight five.', 'Fifteen percent of something: times zero point one five.'] },
    { k: 'lines', head: 'Back-to-back changes multiply', rows: [['up 20%, then down 20%'], [r`$1.20 \times 0.80 = 0.96$`], ['a 4% loss overall, not 0%']], say: ['Up twenty percent, then down twenty percent. Back where you started?', 'Multiply the factors: zero point nine six.', 'No. You lost four percent.'] },
    { k: 'lines', head: 'Reverse percent', rows: [['After a 25% discount, a jacket costs 63 dollars. What was the original price?'], [r`$0.75p = 63$`, 'the sale price is 75% of the original'], [r`$p = 63 \div 0.75 = 84$`]], say: ['Now go backward.', 'The sale price is seventy-five percent of the original.', 'Divide: eighty-four dollars.'] },
    { k: 'versus', head: 'The trap', bad: r`Original $= 63 + 0.25(63) = 78.75$`, good: r`The 25% was taken off the original, not off 63. Divide: $63 \div 0.75 = 84$.`, say: ['The trap: adding twenty-five percent of the sale price.', 'The discount was a percent of the original. Divide by the multiplier.'] },
    { k: 'choices', stem: "A town's population rose from 2,400 to 3,000. What was the percent increase?", choices: ['20%', '25%', '80%', '125%'], answer: 1, cross: [0, 2, 3], notes: ['Divides the change by the new value.', r`$\frac{600}{2400} = 25\%$.`, '2,400 is 80% of 3,000: the wrong question.', 'The new value is 125% of the old: the ratio, not the change.'], say: [
      'Percent change is the change over the original.',
      'Twenty percent divides by the new value.',
      'Eighty percent compares the wrong way round.',
      'One twenty-five is the ratio, not the increase.',
      'Six hundred over twenty-four hundred: twenty-five percent.',
    ] },
    { k: 'quiz', q: 'A price is increased by 10%, and then the new price is increased by 10%. The final price is what percent of the original price?', choices: ['110%', '120%', '121%', '200%'], answer: 2, why: r`$1.1 \times 1.1 = 1.21$, so 121%.`, reveal: 'The answer is one hundred twenty-one percent. Multiply the factors: one point one times one point one is one point two one.', say: ['Pause and try. Multiply the factors.'] },
    { k: 'recap', points: ['Increase p%: × (1 + p/100). Decrease p%: × (1 − p/100).', 'Back-to-back changes multiply; they do not add.', 'Percent change = change ÷ original. Reverse percent: divide by the multiplier.'], say: ['Every percent is a multiplier.', 'Changes multiply.', 'And for reverse percents, divide.'] },
  ] },

  { skill: 'data1', title: 'One-variable data: center and spread', hook: 'See what an outlier does to the mean, median and spread, and compare data sets without computing.', scenes: [
    { k: 'title', title: 'Center and spread', sub: 'Two numbers that summarize any data set.', say: ['Data questions mostly ask two things.', 'Where is the middle, and how spread out is it?'] },
    { k: 'plot', head: 'Ten quiz scores', win: [0, 16, -1, 3.2], axes: false, items: [
      { t: 'seg', a: [0.5, 0], b: [15.5, 0], tone: 'muted' },
      ...[0, 5, 10, 15].map((x) => ({ t: 'text' as const, x, y: -0.7, s: String(x), size: 11 })),
      // the mean and median markers come first so the dots draw on top of them
      { t: 'seg', a: [5.1, 0], b: [5.1, 2.6], tone: 'gold', label: 'mean 5.1', at: 2 },
      { t: 'seg', a: [4, 0], b: [4, 2.6], tone: 'ok', dash: true, at: 3 }, { t: 'text', x: 3.3, y: 2.9, s: 'median 4', tone: 'ok', at: 3 },
      ...([[2, 1], [3, 2], [4, 3], [5, 2], [6, 1]] as const).flatMap(([x, n]) => Array.from({ length: n }, (_, j) => ({ t: 'pt' as const, x, y: 0.35 + j * 0.5 }))),
      { t: 'pt', x: 15, y: 0.35, tone: 'bad', at: 1 }, { t: 'text', x: 15, y: 1.2, s: 'outlier', tone: 'bad', at: 1 },
    ], say: [
      'Here are ten quiz scores. Most of them sit between two and six.',
      'But one student scored fifteen. That is an outlier.',
      'The outlier drags the mean up to five point one.',
      'The median, the middle value, stays at four. It barely notices.',
    ] },
    { k: 'tiles', head: 'What an outlier does', items: [['Mean', 'moves toward the outlier'], ['Median', 'barely moves'], ['Range and standard deviation', 'both grow']], say: ['An outlier pulls the mean toward it.', 'The median barely moves.', 'And the spread, range and standard deviation, gets bigger.'] },
    { k: 'lines', head: 'Standard deviation: the typical distance from the mean', rows: [['Set A: 9, 10, 10, 11'], ['Set B: 2, 6, 14, 18'], ['Both have mean 10. Set B is far more spread out, so it has the larger standard deviation.']], say: ['Two sets.', 'Both average ten.', 'But set B is spread far from ten, so its standard deviation is much larger. You never need the formula.'] },
    { k: 'choices', stem: 'The value 40 is added to the list 4, 7, 7, 9, 13. Which statement is true?', choices: ['The mean and the median both increase.', 'Only the mean increases.', 'Only the median increases.', 'Neither changes.'], answer: 0, cross: [3, 2, 1], notes: ['Mean: 8 → about 13.3. Median: 7 → 8.', r`The median moves too: from 7 to $\frac{7 + 9}{2} = 8$.`, 'The mean jumps from 8 to about 13.3.', 'Adding a value always changes the count.'], say: [
      'The mean is eight and the median is seven. Now add forty.',
      'Something must change. Cross out neither.',
      'The mean obviously jumps, so not only the median.',
      'Careful here. With six values, the median is the average of the middle two: seven and nine. That is eight.',
      'So both increase. The median just moves a lot less.',
    ] },
    { k: 'quiz', q: 'Set X: 20, 20, 20, 20. Set Y: 10, 20, 20, 30. Which statement is true?', choices: ['The sets have the same mean, and X has the larger standard deviation.', 'The sets have the same mean, and Y has the larger standard deviation.', 'Y has the larger mean.', 'The sets have the same standard deviation.'], answer: 1, why: "Both average 20. X has no spread at all; Y's values sit away from 20.", reveal: "The answer is B. Both sets average twenty. Set X has no spread at all, while set Y's values sit away from twenty.", say: ['Pause and try. No calculator needed.'] },
    { k: 'recap', points: ['Outliers pull the mean; the median resists them.', 'Standard deviation measures the typical distance from the mean.', 'For an even count, the median is the average of the middle two values.'], say: ['Outliers pull the mean.', 'Standard deviation is spread.', 'And for an even count, average the middle two.'] },
  ] },

  { skill: 'data2', title: 'Scatterplots and models: read the trend', hook: 'Interpret a line of best fit, residuals, and the difference between linear and exponential models.', scenes: [
    { k: 'title', title: 'Read the trend', sub: 'A model describes the pattern, not every point.', say: ['A scatterplot is a cloud of points.', 'A model is the pattern running through it.'] },
    { k: 'plot', head: 'Hours practiced and points scored', win: [0, 9, 0, 22], items: [
      ...([[1, 5.5], [2, 6.5], [3, 9.6], [4, 10.6], [5, 13.4], [6, 13.5], [7, 17.2], [8, 18.7]] as const).map(([x, y]) => ({ t: 'pt' as const, x, y })),
      { t: 'fn', f: (x) => 2 * x + 3, tone: 'gold', at: 1 },
      { t: 'seg', a: [6, 13.5], b: [6, 15], tone: 'bad', label: 'residual', at: 2 },
    ], caption: ['', r`line of best fit: $y = 2x + 3$`, 'residual = actual − predicted', r`$13.5 - 15 = -1.5$: below the line, negative`], say: [
      'Each dot is one student: hours practiced and points scored.',
      'The line of best fit runs through the middle of the cloud.',
      'The gap from a point to the line is its residual: actual minus predicted.',
      'Here, actual thirteen point five, predicted fifteen. The residual is negative one point five.',
    ] },
    { k: 'tiles', head: r`Interpreting $y = 2x + 3$`, items: [['Slope 2', 'each extra hour predicts about 2 more points'], ['Intercept 3', 'the predicted score at 0 hours'], ['Predicted, not exact', 'the model describes the trend, not every student']], say: ['The slope is the predicted change per hour.', 'The intercept is the prediction at zero.', 'And always say predicted. Real points scatter around the line.'] },
    { k: 'plot', head: 'Linear or exponential?', win: [0, 6, 0, 90], items: [
      { t: 'fn', f: (x) => 10 + 10 * x },
      { t: 'fn', f: (x) => 5 * 1.6 ** x, tone: 'gold', at: 1 },
    ], caption: ['Linear: adds the same amount each step', 'Exponential: multiplies by the same factor each step, so it curves upward'], say: ['A linear model adds the same amount every step. A straight line.', 'An exponential model multiplies by the same factor. It starts slow, then shoots up.'] },
    { k: 'choices', stem: r`A plant's height $y$, in centimeters, is modeled by $y = 1.8x + 12$, where $x$ is the number of weeks since planting. What is the best interpretation of 1.8?`, choices: ['The plant was 1.8 cm tall when planted.', 'The model predicts the plant grows about 1.8 cm per week.', 'The plant becomes 1.8 times taller each week.', 'After 1.8 weeks the plant is 12 cm tall.'], answer: 1, cross: [0, 2, 3], notes: ['That is the intercept, 12.', 'The slope: centimeters per week.', 'That would be an exponential model.', 'Mixes up the slope and intercept.'], say: [
      'Slope or intercept? One point eight multiplies x, so it is the slope.',
      'The first choice describes an intercept.',
      'Times taller describes exponential growth.',
      'The fourth mixes the numbers up.',
      'The slope is a rate: about one point eight centimeters per week.',
    ] },
    { k: 'quiz', q: r`A line of best fit predicts $y = 40$ when $x = 6$. The actual data point at $x = 6$ has $y = 34$. What is the residual?`, choices: ['−6', '6', '34', '74'], answer: 0, why: 'Residual = actual − predicted = 34 − 40 = −6. Points below the line have negative residuals.', reveal: 'The answer is negative six. Actual minus predicted: thirty-four minus forty. Points below the line have negative residuals.', say: ['Pause and try. Actual minus predicted.'] },
    { k: 'recap', points: ['Slope: predicted change in y per 1 of x. Intercept: prediction at x = 0.', 'Residual = actual − predicted.', 'Linear adds a constant; exponential multiplies by a constant.'], say: ['Slope and intercept are predictions.', 'Residual is actual minus predicted.', 'Linear adds, exponential multiplies.'] },
  ] },

  { skill: 'prob', title: 'Probability: shrink the world to the "given"', hook: 'Read two-way tables and conditional probability without getting the denominator wrong.', scenes: [
    { k: 'title', title: 'Count what you want, over what is possible', sub: 'And when a question says "given," the world gets smaller.', say: ['Probability is a fraction.', 'What you want, over everything that could happen.'] },
    { k: 'lines', head: 'The basic fraction', rows: [[r`$P = \frac{\text{favorable outcomes}}{\text{total outcomes}}$`], ['a bag: 5 red, 3 blue, 2 green marbles'], [r`$P(\text{blue}) = \frac{3}{10}$`]], say: ['Here is the formula.', 'A bag with ten marbles.', 'The chance of blue is three out of ten.'] },
    { k: 'table', head: '100 students', headers: ['', 'Plays a sport', 'No sport', 'Total'], rows: [['Grade 10', 24, 36, 60], ['Grade 11', 30, 10, 40], ['Total', 54, 46, 100]], lit: [[], [[2, 1], [2, 3]], [[1, 0], [1, 1], [1, 2], [1, 3]], [[1, 1], [1, 3]]], note: ['', r`$P(\text{sport}) = \frac{54}{100}$`, 'Given grade 11: only this row counts.', r`$P(\text{sport} \mid \text{grade 11}) = \frac{30}{40} = 0.75$`], say: [
      'Here are a hundred students, by grade and by whether they play a sport.',
      'The chance a random student plays a sport: fifty-four out of a hundred.',
      'Now a conditional question. Given that a student is in grade eleven, what is the chance they play a sport? Given means shrink the world to that row.',
      'Thirty out of forty. Three quarters.',
    ] },
    { k: 'versus', head: 'The trap', bad: r`$P(\text{grade 11} \mid \text{sport}) = \frac{30}{40}$`, good: r`"Given sport" shrinks the world to the sport column: $\frac{30}{54}$. The "given" group is always the denominator.`, say: ['Flip the condition and the answer changes.', 'Given a sport player, the world is the sport column: thirty out of fifty-four.'] },
    { k: 'choices', stem: 'Using the table of 100 students, what is the probability that a student who does not play a sport is in grade 10?', choices: [r`$\frac{36}{100}$`, r`$\frac{36}{60}$`, r`$\frac{36}{46}$`, r`$\frac{10}{46}$`], answer: 2, cross: [0, 1, 3], notes: ['Uses all 100 students, but the question gives "does not play a sport".', 'This is P(no sport | grade 10): the condition is backwards.', 'The world is the 46 non-players; 36 of them are in grade 10.', 'That counts grade 11.'], say: [
      'Who is the given group? Students who do not play a sport.',
      'A hundred in the denominator ignores the condition.',
      'Sixty is the grade ten row. That is the reverse condition.',
      'Ten over forty-six counts grade eleven.',
      'Forty-six non-players, and thirty-six of them are in grade ten.',
    ] },
    { k: 'quiz', q: 'A fair coin is flipped twice. What is the probability of getting heads both times?', choices: [r`$\frac{1}{4}$`, r`$\frac{1}{3}$`, r`$\frac{1}{2}$`, '1'], answer: 0, why: 'There are four equally likely outcomes: HH, HT, TH, TT. Only HH works.', reveal: 'The answer is one quarter. There are four equally likely outcomes, and only heads, heads works.', say: ['Pause and try. List the outcomes.'] },
    { k: 'recap', points: ['Probability = favorable ÷ total.', '"Given" or "of those who" picks the row or column for the denominator.', 'Flipping the condition changes the answer.'], say: ['Favorable over total.', 'The given group is the denominator.', 'And never flip the condition.'] },
  ] },

  { skill: 'infer', title: 'Samples and margin of error: what you can conclude', hook: 'Turn a sample statistic and margin of error into a range, and know who the result applies to.', scenes: [
    { k: 'title', title: 'What a sample can tell you', sub: 'An estimate, a range, and a population.', say: ['A survey asks a few hundred people and makes a claim about thousands.', 'Here is what that claim can and cannot say.'] },
    { k: 'plot', head: 'An estimate is a range', win: [40, 60, -2.5, 2.5], axes: false, items: [
      { t: 'seg', a: [40, 0], b: [60, 0], tone: 'muted' },
      ...[40, 45, 50, 55, 60].map((x) => ({ t: 'text' as const, x, y: -1.4, s: `${x}%`, size: 11 })),
      { t: 'pt', x: 48, y: 0, label: '48%', tone: 'brand' },
      { t: 'seg', a: [45, 0.6], b: [51, 0.6], tone: 'ok', at: 1 }, { t: 'text', x: 48, y: 1.3, s: '45% to 51%', tone: 'ok', at: 1 },
      { t: 'seg', a: [50, -0.6], b: [50, 0.9], tone: 'bad', dash: true, at: 2 },
    ], caption: ['A random sample estimates 48% support.', 'Margin of error 3 points: plausible values 45% to 51%.', 'The range includes values above and below 50%, so a majority is not established either way.'], say: [
      'A random survey finds forty-eight percent support a new park.',
      'The margin of error is three points, so the true value is plausibly anywhere from forty-five to fifty-one percent.',
      'That range crosses fifty. So we cannot say a majority supports it, or that a majority opposes it.',
    ] },
    { k: 'tiles', head: 'What matters', items: [['Larger sample', 'smaller margin of error'], ['Random sample', 'needed to generalize at all'], ['Population', 'the result applies only to the group that was sampled']], say: ['A bigger random sample gives a smaller margin of error.', 'Without random sampling, you cannot generalize.', 'And the result covers only the population the sample came from.'] },
    { k: 'versus', head: 'The trap', bad: 'A random sample of students at one high school shows something about all teenagers in the country.', good: 'The result applies to students at that school, the population that was sampled.', say: ['The trap is stretching the result.', 'It applies only to the population that was randomly sampled.'] },
    { k: 'choices', stem: 'A random sample of 400 adults in a city found that 62% own a bicycle, with a margin of error of 4 percentage points. Which conclusion is most appropriate?', choices: ['Exactly 62% of adults in the city own a bicycle.', 'The percent of adults in the city who own a bicycle is plausibly between 58% and 66%.', 'Between 58% and 66% of all adults in the country own a bicycle.', 'Surveying 800 adults would make the margin of error 8 percentage points.'], answer: 1, cross: [0, 2, 3], notes: ['A sample gives an estimate, not an exact value.', '62 ± 4, for the population that was sampled.', 'The sample came from one city, not the country.', 'A larger sample gives a smaller margin of error.'], say: [
      'Estimate sixty-two, margin of error four.',
      'Exactly is too strong. A sample estimates.',
      'The country is the wrong population.',
      'A larger sample shrinks the margin of error. It does not double it.',
      'Fifty-eight to sixty-six percent, for adults in that city.',
    ] },
    { k: 'quiz', q: 'Two random samples are taken from the same population. Survey A has 200 people and Survey B has 1,000. Which survey is likely to have the smaller margin of error?', choices: ['Survey A', 'Survey B', 'They have the same margin of error.', 'It cannot be known.'], answer: 1, why: 'Larger random samples give smaller margins of error.', reveal: 'The answer is survey B. A larger random sample gives a smaller margin of error.', say: ['Pause and try.'] },
    { k: 'recap', points: ['Estimate ± margin of error gives the plausible range.', 'Larger random samples give smaller margins of error.', 'Generalize only to the population that was randomly sampled.'], say: ['Estimate plus or minus the margin.', 'Bigger samples, smaller margins.', 'And only the sampled population.'] },
  ] },

  { skill: 'claims', title: 'Study design: correlation, cause and who it applies to', hook: 'Two questions settle every study-design question: was there random assignment, and random selection?', scenes: [
    { k: 'title', title: 'Two questions for every study', sub: 'Random assignment gives cause. Random selection gives reach.', say: ['Every study question on the SAT comes down to two questions.', 'Let us learn them.'] },
    { k: 'tiles', head: 'Ask these', items: [['Randomly ASSIGNED to groups?', 'Yes: you can conclude cause and effect.'], ['Randomly SELECTED from a population?', 'Yes: you can generalize to that population.'], ['Neither?', 'Only an association, only for these subjects.']], say: ['First: did the researchers randomly assign the treatment? If yes, you can talk about cause.', 'Second: were the subjects randomly selected from a bigger group? If yes, you can generalize to that group.', 'If neither, you have an association, for these subjects only.'] },
    { k: 'passage', head: 'Read a claim', text: 'Researchers {{surveyed 300 volunteers|bad|not random}} and found that {{people who drank more tea|brand|observed, not assigned}} reported {{fewer colds|gold|association}}.', say: ['Let us read a study.', 'Volunteers are not a random sample. No generalizing.', 'Nobody was assigned to drink tea. It is observational.', 'So this shows an association. Not that tea prevents colds.'] },
    { k: 'versus', head: 'The trap', bad: 'Tea drinkers had fewer colds, so tea prevents colds.', good: 'Maybe tea drinkers also sleep more or exercise more. Only random assignment rules out explanations like these.', say: ['The trap: treating an association as a cause.', 'Something else could explain it. Random assignment is what rules that out.'] },
    { k: 'choices', stem: 'A school randomly assigned 80 student volunteers to study with either a new app or a textbook for one month. The app group scored higher on a final quiz. Which conclusion is best supported?', choices: ['The app causes higher scores for all students in the country.', 'The app likely caused higher scores for students like these volunteers.', 'There is only an association; no cause can be concluded.', 'No conclusion is possible because the students were volunteers.'], answer: 1, cross: [0, 2, 3], notes: ['Volunteers were not randomly selected from all students.', 'Random assignment supports cause; volunteers limit who it applies to.', 'Random assignment does allow a cause-and-effect conclusion.', 'Volunteers limit generalizing, not the causal conclusion for this group.'], say: [
      'Random assignment? Yes. Random selection? No, they were volunteers.',
      'All students in the country is too far. No random selection.',
      'Only an association ignores the random assignment.',
      'Volunteers limit how far it reaches, but a conclusion is still possible.',
      'So: a likely cause, for students like these.',
    ] },
    { k: 'quiz', q: 'Which study design would let researchers conclude that a fertilizer causes taller plants?', choices: ['Measure plants in gardens that already use the fertilizer.', 'Ask gardeners whether their plants grew taller.', 'Randomly assign plants to receive the fertilizer or not.', "Compare this year's plants to last year's plants."], answer: 2, why: 'Only random assignment balances out the other differences between groups.', reveal: 'The answer is C. Only random assignment balances out the other differences between the groups, so only it can show cause and effect.', say: ['Pause and try. Which one supports cause?'] },
    { k: 'recap', points: ['Random assignment → cause and effect.', 'Random selection → generalize to that population.', 'Otherwise: an association for these subjects only.'], say: ['Assignment gives cause.', 'Selection gives reach.', 'Without them, it is just an association.'] },
  ] },

  /* ───────────── Geometry and Trigonometry ───────────── */
  { skill: 'area', title: 'Area and volume: split, scale and stack', hook: 'Break odd shapes into familiar ones, and know exactly what scaling does to area and volume.', scenes: [
    { k: 'title', title: 'Split, scale and stack', sub: 'The formulas are on the reference sheet. The thinking is not.', say: ['The SAT gives you the area and volume formulas.', 'What it tests is how you use them.'] },
    { k: 'plot', head: 'Split a strange shape', win: [0, 10, -0.5, 7.5], axes: false, items: [
      { t: 'poly', pts: [[1, 1], [9, 1], [9, 5], [1, 5]], fill: true },
      { t: 'text', x: 5, y: 0.2, s: '8', at: 1 }, { t: 'text', x: 9.5, y: 2.9, s: '4', at: 1 },
      { t: 'poly', pts: [[1, 5], [9, 5], [5, 7]], tone: 'gold', fill: true, at: 2 },
      { t: 'seg', a: [5, 5], b: [5, 7], dash: true, tone: 'gold', label: '2', at: 2 },
    ], caption: ['Split it into shapes you know.', r`rectangle: $8 \times 4 = 32$`, r`triangle: $\frac{1}{2} \cdot 8 \cdot 2 = 8$`, 'total area: 40'], say: [
      'An odd shape? Split it into shapes you know.',
      'A rectangle, eight by four. Thirty-two.',
      'A triangle on top: base eight, height two. Half of sixteen is eight.',
      'Add them. Forty.',
    ] },
    { k: 'tiles', head: 'Scale every length by k', items: [['Lengths', '× k'], ['Areas', '× k²'], ['Volumes', '× k³']], say: ['Scale every length by k, and lengths multiply by k.', 'Areas multiply by k squared.', 'Volumes by k cubed.'] },
    { k: 'lines', head: 'Volume of a cylinder', rows: [[r`$V = \pi r^2 h$`], [r`$r = 3$, $h = 10$`], [r`$V = \pi (3)^2 (10) = 90\pi$`]], say: ['Cylinder volume: pi r squared h.', 'Radius three, height ten.', 'Nine times ten: ninety pi.'] },
    { k: 'versus', head: 'The trap', bad: 'Double the radius of a sphere and its volume doubles.', good: r`Volume scales by $k^3$: $2^3 = 8$ times the volume.`, say: ['The trap: thinking doubling a length doubles everything.', 'Volume goes up by two cubed. Eight times.'] },
    { k: 'choices', stem: 'A cube has a surface area of 96 square inches. What is the volume of the cube, in cubic inches?', choices: ['16', '24', '64', '96'], answer: 2, cross: [0, 1, 3], notes: ['16 is the area of one face.', 'Multiplies the side length by the 6 faces.', r`Each face is $96 \div 6 = 16$, so the side is 4 and $V = 4^3 = 64$.`, 'That is the surface area again.'], say: [
      'Six equal faces share ninety-six square inches.',
      'Sixteen is one face, not the volume.',
      'Twenty-four multiplies the side by six.',
      'Ninety-six is just the surface area.',
      'Each face is sixteen, so the side is four. Four cubed is sixty-four.',
    ] },
    { k: 'quiz', q: 'Two similar triangles have corresponding sides in the ratio 1 : 3. The smaller triangle has an area of 5. What is the area of the larger triangle?', choices: ['15', '25', '45', '135'], answer: 2, why: r`Areas scale by $k^2 = 3^2 = 9$. $5 \times 9 = 45$.`, reveal: 'The answer is forty-five. Areas scale by the square of the scale factor. Three squared is nine, and five times nine is forty-five.', say: ['Pause and try. Lengths, areas, or volumes?'] },
    { k: 'recap', points: ['Split odd shapes into rectangles, triangles and circles.', 'Scale lengths by k: area × k², volume × k³.', 'Work from what you know (surface area, a face) to what you need.'], say: ['Split odd shapes.', 'Square for area, cube for volume.', 'And work step by step from what you know.'] },
  ] },

  { skill: 'lines', title: 'Lines, angles and triangles: find one, find them all', hook: 'Use parallel lines, the triangle sum and similar triangles to chase every angle and side.', scenes: [
    { k: 'title', title: 'Find one, find them all', sub: 'A few angle facts unlock every diagram.', say: ['Angle questions feel like puzzles.', 'But three facts solve almost all of them.'] },
    { k: 'plot', head: 'Parallel lines cut by a transversal', win: [0, 10, -0.5, 6.5], axes: false, items: [
      { t: 'seg', a: [0, 4], b: [10, 4], tone: 'muted' }, { t: 'seg', a: [0, 1.5], b: [10, 1.5], tone: 'muted' },
      { t: 'seg', a: [2, 0], b: [8, 6] },
      { t: 'arc', c: [6, 4], r: 0.7, from: 0, to: 45, label: '45°', tone: 'gold', at: 1 },
      { t: 'arc', c: [3.5, 1.5], r: 0.7, from: 0, to: 45, label: '45°', tone: 'gold', at: 2 },
      { t: 'arc', c: [6, 4], r: 0.5, from: 45, to: 180, label: '135°', tone: 'ok', at: 3 },
    ], say: [
      'Two parallel lines, cut by a transversal.',
      'This angle is forty-five degrees.',
      'Its twin at the other crossing is equal. Corresponding angles match.',
      'And next to it, along a straight line, the angles add to one eighty. So that one is one thirty-five.',
    ] },
    { k: 'tiles', head: 'The facts that solve most questions', items: [['Straight line', 'angles add to 180°'], ['Triangle', 'angles add to 180°'], ['Parallel lines', 'only two angle sizes, and they add to 180°']], say: ['Angles on a straight line add to one eighty.', 'So do the angles in a triangle.', 'And parallel lines create just two sizes of angle, adding to one eighty.'] },
    { k: 'plot', head: 'Similar triangles', win: [0, 14, -0.6, 7], axes: false, items: [
      { t: 'poly', pts: [[0.5, 0.5], [4.5, 0.5], [0.5, 3.5]] },
      { t: 'poly', pts: [[5.5, 0.5], [13.5, 0.5], [5.5, 6.5]], tone: 'gold' },
      { t: 'text', x: 2.5, y: -0.2, s: '4' }, { t: 'text', x: 0.05, y: 2, s: '3' }, { t: 'text', x: 2.9, y: 2.4, s: '5' },
      { t: 'text', x: 9.5, y: -0.2, s: '8', tone: 'gold', at: 1 }, { t: 'text', x: 5.05, y: 3.5, s: '6', tone: 'gold', at: 1 },
      { t: 'text', x: 10, y: 3.9, s: '10', tone: 'ok', at: 2 },
    ], caption: ['Same angles, so the triangles are similar.', 'Every side is doubled: scale factor 2.', 'The small hypotenuse is 5, so the big one is 10.'], say: [
      'These two triangles have the same angles, so they are similar.',
      'Four becomes eight, three becomes six. Every side doubles.',
      'So the hypotenuse doubles too. Five becomes ten.',
    ] },
    { k: 'choices', stem: 'In a triangle, one angle measures 50° and the other two angles are equal. What is the measure of each of the other two angles?', choices: ['50°', '65°', '70°', '130°'], answer: 1, cross: [3, 0, 2], notes: ['Then the angles would add to only 150°.', r`$(180 - 50) \div 2 = 65$.`, 'That would need the first angle to be 40°.', 'That is the two angles together.'], say: [
      'The three angles add to one eighty.',
      'One thirty is both angles together. Divide by two.',
      'Fifty would make all three fifty: only one fifty total.',
      'Seventy needs a first angle of forty.',
      'One eighty minus fifty, divided by two: sixty-five.',
    ] },
    { k: 'quiz', q: r`Two parallel lines are cut by a transversal. One angle measures $(3x + 10)°$ and its alternate interior angle measures $(5x - 30)°$. What is the value of $x$?`, choices: ['10', '20', '25', '40'], answer: 1, why: r`Alternate interior angles are equal: $3x + 10 = 5x - 30$, so $40 = 2x$ and $x = 20$.`, reveal: 'The answer is twenty. Alternate interior angles are equal, so three x plus ten equals five x minus thirty. That gives x equals twenty.', say: ['Pause and try. Equal or supplementary?'] },
    { k: 'recap', points: ['Straight line and triangle: 180°.', 'Parallel lines: angles are equal or add to 180°.', 'Similar triangles: every side scales by the same factor.'], say: ['One eighty for lines and triangles.', 'Parallel lines: equal or supplementary.', 'Similar triangles share one scale factor.'] },
  ] },

  { skill: 'trig', title: 'Right triangles and trig: SOH CAH TOA and the triangles to know', hook: 'Name the sides, use sine, cosine and tangent, and recognize the special right triangles on sight.', scenes: [
    { k: 'title', title: 'SOH CAH TOA', sub: 'Plus the special triangles you should know by heart.', say: ['Right triangle trig is just ratios of sides.', 'Name the sides correctly, and it is easy.'] },
    { k: 'plot', head: 'Name the sides from the angle', win: [0, 8, -0.4, 5], axes: false, items: [
      { t: 'poly', pts: [[1, 0.5], [5.8, 0.5], [5.8, 4.1]] },
      { t: 'seg', a: [5.5, 0.5], b: [5.5, 0.8], tone: 'muted' }, { t: 'seg', a: [5.5, 0.8], b: [5.8, 0.8], tone: 'muted' },
      { t: 'arc', c: [1, 0.5], r: 0.9, from: 0, to: 36.87, label: 'θ', tone: 'gold' },
      { t: 'text', x: 3.4, y: 0.05, s: 'adjacent 4', tone: 'brand', at: 1 }, { t: 'text', x: 6.9, y: 2.3, s: 'opposite 3', tone: 'brand', at: 1 }, { t: 'text', x: 2.9, y: 3, s: 'hypotenuse 5', tone: 'ok', at: 1 },
    ], caption: ['', 'Opposite is across from θ; adjacent touches θ; the hypotenuse is the longest side.', r`$\sin\theta = \frac{\text{opposite}}{\text{hypotenuse}} = \frac{3}{5}$`, r`$\cos\theta = \frac{\text{adjacent}}{\text{hypotenuse}} = \frac{4}{5}$`, r`$\tan\theta = \frac{\text{opposite}}{\text{adjacent}} = \frac{3}{4}$`], say: [
      'Here is a right triangle and an angle theta.',
      'The side across from theta is opposite. The one touching it is adjacent. The longest is the hypotenuse.',
      'Sine is opposite over hypotenuse. Three fifths.',
      'Cosine is adjacent over hypotenuse. Four fifths.',
      'Tangent is opposite over adjacent. Three quarters.',
    ] },
    { k: 'tiles', head: 'Triangles to know by heart', items: [['45-45-90', r`sides $x$, $x$, $x\sqrt{2}$`], ['30-60-90', r`sides $x$, $x\sqrt{3}$, $2x$`], ['Pythagorean triples', '3-4-5, 5-12-13, 8-15-17']], say: ['In a forty-five forty-five ninety, the hypotenuse is a leg times root two.', 'In a thirty sixty ninety, the hypotenuse is twice the short leg, and the long leg is the short leg times root three.', 'And spot the common triples so you never need the Pythagorean theorem.'] },
    { k: 'lines', head: 'The complement rule', rows: [[r`$\sin x° = \cos(90° - x°)$`], [r`$\sin 28° = \cos 62°$`], [r`If $\sin A = \cos B$ for acute angles, then $A + B = 90°$.`]], say: ['The sine of an angle equals the cosine of its complement.', 'So sine of twenty-eight equals cosine of sixty-two.', 'If a sine equals a cosine, the two angles add to ninety.'] },
    { k: 'versus', head: 'The trap', bad: r`A 30-60-90 triangle with short leg 4 has hypotenuse $4\sqrt{3}$.`, good: r`The hypotenuse is twice the short leg: 8. The long leg is $4\sqrt{3}$.`, say: ['The trap: mixing up which side gets root three.', 'Hypotenuse is double the short leg. Root three goes on the long leg.'] },
    { k: 'choices', stem: r`In right triangle $ABC$, angle $C$ is the right angle and $\sin A = \frac{5}{13}$. What is $\cos A$?`, choices: [r`$\frac{5}{12}$`, r`$\frac{12}{13}$`, r`$\frac{13}{12}$`, r`$\frac{8}{13}$`], answer: 1, cross: [3, 0, 2], notes: [r`That is $\tan A$.`, r`The legs are 5 and 12 (a 5-12-13 triangle), so $\cos A = \frac{12}{13}$.`, 'Upside down: a cosine of an acute angle is less than 1.', 'Subtracts 5 from 13 instead of using the Pythagorean theorem.'], say: [
      'Sine is five over thirteen: opposite five, hypotenuse thirteen.',
      'Eight is thirteen minus five. Sides do not subtract like that.',
      'Five twelfths is the tangent.',
      'Thirteen twelfths is more than one. Impossible for a cosine.',
      'It is a five twelve thirteen triangle. Cosine is twelve over thirteen.',
    ] },
    { k: 'quiz', q: r`In a right triangle, $\cos x° = 0.6$. What is $\sin(90° - x°)$?`, choices: ['0.4', '0.6', '0.8', '1.6'], answer: 1, why: r`$\sin(90° - x°) = \cos x°$, so it is 0.6.`, reveal: 'The answer is zero point six. The sine of an angle equals the cosine of its complement, so it is the same number.', say: ['Pause and try. Use the complement rule.'] },
    { k: 'recap', points: ['SOH CAH TOA, with sides named from the angle.', 'Know 45-45-90, 30-60-90 and the common triples.', 'sin x° = cos(90° − x°).'], say: ['SOH CAH TOA.', 'Know the special triangles.', 'And complements swap sine and cosine.'] },
  ] },

  { skill: 'circ', title: 'Circles: center, radius and the fraction of the turn', hook: 'Read a circle’s equation, complete the square, and find arcs and sectors as fractions of the whole.', scenes: [
    { k: 'title', title: 'Center, radius, fraction', sub: 'Three ideas cover nearly every circle question.', say: ['Circle questions come in two kinds.', 'Equations on a grid, and arcs and sectors. Let us do both.'] },
    { k: 'plot', head: r`$(x - 3)^2 + (y - 2)^2 = 16$`, win: [-2, 8, -3, 7], square: true, items: [
      { t: 'circle', c: [3, 2], r: 4 },
      { t: 'pt', x: 3, y: 2, label: 'center (3, 2)', tone: 'gold', at: 1 },
      { t: 'seg', a: [3, 2], b: [7, 2], tone: 'ok', label: 'r = 4', at: 2 },
    ], caption: [r`$(x - h)^2 + (y - k)^2 = r^2$`, 'The center is (h, k): the signs flip.', r`$r = \sqrt{16} = 4$`], say: [
      'Here is the standard form of a circle.',
      'The center is three, two. Notice the signs flip: x minus three means h is positive three.',
      'And the right side is r squared. The radius is four.',
    ] },
    { k: 'lines', head: 'Complete the square to find the center', rows: [[r`$x^2 + 6x + y^2 - 4y = 12$`], [r`$(x^2 + 6x + 9) + (y^2 - 4y + 4) = 12 + 9 + 4$`, 'add (half the coefficient)² to both sides'], [r`$(x + 3)^2 + (y - 2)^2 = 25$`], [r`center $(-3, 2)$, radius $5$`]], say: ['Sometimes the circle comes scrambled.', 'Complete the square. Half of six is three; three squared is nine. Half of negative four is negative two; squared, four. Add both to each side.', 'Now it is in standard form.', 'Center negative three, two. Radius five.'] },
    { k: 'plot', head: 'Arcs and sectors are fractions', win: [-4, 4, -4, 4], axes: false, items: [
      { t: 'circle', c: [0, 0], r: 3, tone: 'muted' },
      { t: 'seg', a: [0, 0], b: [3, 0] }, { t: 'seg', a: [0, 0], b: [1.5, 2.598] },
      { t: 'arc', c: [0, 0], r: 0.8, from: 0, to: 60, label: '60°', tone: 'gold', at: 1 },
      { t: 'arc', c: [0, 0], r: 3, from: 0, to: 60, tone: 'ok', at: 2 },
    ], caption: ['', r`$60°$ is $\frac{60}{360} = \frac{1}{6}$ of the full turn.`, r`arc length $= \frac{1}{6} \cdot 2\pi r$; sector area $= \frac{1}{6} \cdot \pi r^2$`], say: [
      'Arcs and sectors are just fractions of the circle.',
      'A sixty degree angle is one sixth of the full turn.',
      'So the arc is one sixth of the circumference, and the sector is one sixth of the area.',
    ] },
    { k: 'tiles', head: 'Radians in one line', items: [['Full turn', r`$360° = 2\pi$ radians`], ['Convert', r`degrees $\times \frac{\pi}{180}$`], ['Arc length', r`$s = r\theta$, with $\theta$ in radians`]], say: ['A full turn is two pi radians.', 'To convert degrees, multiply by pi over one eighty.', 'And in radians, arc length is just r times theta.'] },
    { k: 'choices', stem: 'A circle has a radius of 9. What is the length of an arc with a central angle of 40°?', choices: [r`$\pi$`, r`$2\pi$`, r`$4\pi$`, r`$9\pi$`], answer: 1, cross: [3, 2, 0], notes: [r`Uses $9\pi$ as the circumference.`, r`$\frac{40}{360} \cdot 18\pi = 2\pi$.`, r`Uses $\frac{40}{180}$ of the circumference.`, 'That is half the circumference.'], say: [
      'Forty degrees is one ninth of the turn. The circumference is eighteen pi.',
      'Nine pi is half the circle. Far too big.',
      'Four pi divides by one eighty instead of three sixty.',
      'Pi uses the wrong circumference.',
      'One ninth of eighteen pi: two pi.',
    ] },
    { k: 'quiz', q: r`What is the radius of the circle $x^2 + y^2 - 10x = 0$?`, choices: ['5', '10', '25', r`$\sqrt{10}$`], answer: 0, why: r`Complete the square: $(x - 5)^2 + y^2 = 25$, so the radius is 5.`, reveal: 'The answer is five. Complete the square on x: x minus five, squared, plus y squared, equals twenty-five. The radius is five.', say: ['Pause and try. Complete the square on x.'] },
    { k: 'recap', points: [r`$(x - h)^2 + (y - k)^2 = r^2$: center $(h, k)$, radius $r$.`, 'Scrambled equation? Complete the square for x and for y.', 'Arc and sector = (angle ÷ 360°) × the whole.'], say: ['Standard form gives the center and radius.', 'Complete the square when it is scrambled.', 'And arcs and sectors are fractions of the whole.'] },
  ] },
];
