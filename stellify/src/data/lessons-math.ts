import type { SkillId } from '@/lib/types';

const r = String.raw;

export interface Lesson {
  skill: SkillId;
  /** Beginner explanation: what this skill is, in plain words */
  intro: string;
  /** Detailed explanation */
  detail: string[];
  rules: string[];
  examples: { q: string; a: string }[];
  mistakes: string[];
  shortcuts: string[];
}

export const LESSONS_MATH: Lesson[] = [
  {
    skill: 'lin1',
    intro: 'A linear equation in one variable has a single unknown, raised only to the first power. Solving it means finding the value that makes both sides equal.',
    detail: [
      r`Every solving step keeps the equation balanced: whatever you do to one side, you do to the other. The usual order is to distribute, combine like terms on each side, collect the variable on one side, and divide by its coefficient.`,
      r`The SAT also asks how many solutions an equation has. After simplifying both sides to the form $ax + b$, compare them. Different $x$-coefficients mean exactly one solution. Equal coefficients and equal constants mean infinitely many. Equal coefficients and different constants mean no solution.`,
      r`Absolute value equations split into two cases: $|A| = k$ (with $k > 0$) means $A = k$ or $A = -k$. Isolate the absolute value first.`,
    ],
    rules: [
      r`Distribute to every term inside parentheses, including the sign.`,
      r`To clear fractions, multiply every term on both sides by the least common denominator.`,
      r`One solution: coefficients differ. No solution: same coefficients, different constants. Infinitely many: both match.`,
      r`$|A| = k$ gives two equations when $k > 0$, one when $k = 0$, none when $k < 0$.`,
    ],
    examples: [
      { q: r`Solve $\frac{x - 2}{3} = \frac{x}{4} + 1$.`, a: r`Multiply by 12: $4(x - 2) = 3x + 12$, so $4x - 8 = 3x + 12$ and $x = 20$. Check: $\frac{18}{3} = 6$ and $\frac{20}{4} + 1 = 6$.` },
      { q: r`For what value of $k$ does $5x - 3 = k(x + 1) - 8$ have no solution?`, a: r`Right side: $kx + k - 8$. No solution needs $k = 5$ with different constants: $-3$ versus $5 - 8 = -3$. The constants match, so $k = 5$ gives infinitely many solutions, and no value of $k$ gives no solution. Always check the constants.` },
    ],
    mistakes: [
      'Distributing a negative sign to only the first term.',
      'Multiplying the fractions by the common denominator but forgetting the whole-number terms.',
      'Stopping at the value of the variable when the question asks for something else (such as 2x + 1 or a different unit).',
      'Solving only the positive case of an absolute value equation.',
    ],
    shortcuts: [
      'If the question asks for an expression such as 3x + 6, look for a way to get it directly instead of solving for x first.',
      'Plug your answer back in. It takes ten seconds and catches most slips.',
      r`In Desmos, type the whole equation (for example $3(2x-5)+4 = 2(x+7)-1$); it draws a vertical line at the solution.`,
    ],
  },
  {
    skill: 'linf',
    intro: 'A linear function changes by the same amount every time its input increases by 1. That constant change is the slope; the output when the input is 0 is the y-intercept.',
    detail: [
      r`In $f(x) = mx + b$, $m$ is the slope (rate of change) and $b$ is the $y$-intercept (starting value). Given two points, $m = \dfrac{y_2 - y_1}{x_2 - x_1}$; then substitute one point to find $b$.`,
      r`In word problems, the slope carries a "per" unit (dollars per hour, millimeters per day) and the intercept is the amount at time zero. Interpretation questions are answered by attaching units to each number.`,
      r`Transformations: $f(x) + k$ shifts the graph up $k$ (changing the $y$-intercept), while replacing $x$ with $x - h$ shifts it right $h$. Adding $cx$ to a linear function changes its slope by $c$.`,
    ],
    rules: [
      r`Slope $= \dfrac{\text{change in output}}{\text{change in input}}$.`,
      r`$x$-intercept: set the output to 0. $y$-intercept: set the input to 0.`,
      r`For $y = mx + b$, the $x$-intercept is $-\dfrac{b}{m}$.`,
      r`Equal steps in $x$ produce equal steps in $f(x)$.`,
    ],
    examples: [
      { q: r`$f$ is linear with $f(1) = 4$ and $f(5) = 16$. Find $f(9)$.`, a: r`The inputs are evenly spaced (1, 5, 9), so the outputs are too: $4, 16, 28$. $f(9) = 28$. No equation needed.` },
      { q: r`$C(t) = 35 + 12t$ gives the cost in dollars of renting a kayak for $t$ hours. Interpret 35 and 12.`, a: r`35 is the fixed fee in dollars charged even for 0 hours. 12 is the additional cost in dollars for each hour.` },
    ],
    mistakes: [
      'Reading the first output in a table as the y-intercept when its x-value is not 0.',
      'Inverting the slope (run over rise).',
      'Confusing the rate (coefficient) with the starting value (constant) in a context.',
    ],
    shortcuts: [
      'When inputs in a table are evenly spaced, continue the pattern in the outputs.',
      'Unknown constants often cancel when you compute a slope. Try before assuming you need more information.',
      'To check an equation against a table, test the row that is least convenient (not x = 0 or 1).',
    ],
  },
  {
    skill: 'lin2',
    intro: 'An equation such as 3x + 2y = 12 relates two quantities. Its graph is a line, and every point on the line is a pair of values that makes the equation true.',
    detail: [
      r`Standard form $Ax + By = C$ has slope $-\dfrac{A}{B}$, $x$-intercept $\dfrac{C}{A}$, and $y$-intercept $\dfrac{C}{B}$. Slope-intercept form $y = mx + b$ shows the slope and $y$-intercept directly.`,
      r`Parallel lines have equal slopes; perpendicular lines have slopes whose product is $-1$. In standard form, lines $A_1x + B_1y = C_1$ and $A_2x + B_2y = C_2$ are perpendicular when $A_1A_2 + B_1B_2 = 0$.`,
      r`In a context such as $2.5x + 4y = 60$, each term is (price) × (quantity). Trading one unit of $x$ for $y$ changes $y$ by $-\dfrac{A}{B}$.`,
    ],
    rules: [
      r`Slope of $Ax + By = C$ is $-\dfrac{A}{B}$.`,
      'Parallel: same slope, different intercepts. Perpendicular: negative reciprocal slopes.',
      r`A line parallel to $Ax + By = C$ has the form $Ax + By = C'$; find $C'$ by substituting a point.`,
      r`The triangle a line makes with the axes has area $\tfrac{1}{2}|x\text{-intercept}| \cdot |y\text{-intercept}|$.`,
    ],
    examples: [
      { q: r`Write the line through $(4, -1)$ perpendicular to $y = 2x + 3$.`, a: r`Perpendicular slope: $-\frac{1}{2}$. Then $y + 1 = -\frac{1}{2}(x - 4)$, so $y = -\frac{1}{2}x + 1$.` },
      { q: r`A line has $x$-intercept 6 and $y$-intercept $-3$. What is its slope?`, a: r`Through $(6, 0)$ and $(0, -3)$: slope $= \dfrac{-3 - 0}{0 - 6} = \dfrac{1}{2}$.` },
    ],
    mistakes: [
      'Doing only half of "negative reciprocal": flipping without changing the sign, or the reverse.',
      'Choosing an equation that passes through the given point but has the wrong slope.',
      'Dropping the negative sign in −A/B.',
    ],
    shortcuts: [
      'For parallel lines in standard form, keep the left side and recompute the constant with the given point.',
      'Check two things in every line question: slope and a point. Wrong answers usually satisfy only one.',
      'Graph both lines in Desmos to confirm parallel or perpendicular at a glance.',
    ],
  },
  {
    skill: 'sys',
    intro: 'A system of two linear equations asks for the pair (x, y) that satisfies both equations at once: the point where two lines cross.',
    detail: [
      r`Substitution works well when one equation is already solved for a variable. Elimination works well when coefficients line up: add or subtract the equations (after scaling if needed) so one variable cancels.`,
      r`Number of solutions: two lines can cross once, never (parallel), or everywhere (the same line). For $a_1x + b_1y = c_1$ and $a_2x + b_2y = c_2$: if $\frac{a_1}{a_2} \neq \frac{b_1}{b_2}$ there is one solution; if $\frac{a_1}{a_2} = \frac{b_1}{b_2} \neq \frac{c_1}{c_2}$ there is none; if all three ratios are equal there are infinitely many.`,
      r`Word problems usually give one equation for a total count and one for a total value. Define variables carefully and keep each rate attached to its own variable.`,
    ],
    rules: [
      'A solution must satisfy both equations.',
      'No solution: same slope, different intercepts. Infinitely many: one equation is a multiple of the other.',
      'When asked for x + y or x − y, try adding or subtracting the equations first.',
    ],
    examples: [
      { q: r`$2x + 3y = 13$ and $4x - 3y = 5$. Find $x$.`, a: r`Add: $6x = 18$, so $x = 3$. (Then $y = \frac{7}{3}$.)` },
      { q: r`$kx - 6y = 9$ and $2x - 3y = 5$ has no solution. Find $k$.`, a: r`The $y$-coefficients have ratio $\frac{-6}{-3} = 2$, so $k = 2(2) = 4$. Constants: $\frac{9}{5} \neq 2$, so the lines are parallel and distinct. $k = 4$.` },
    ],
    mistakes: [
      'Solving for one variable and reporting it when the question asks for the other, or for a combination.',
      'Declaring "no solution" from proportional coefficients without checking the constants.',
      'Sign errors when subtracting one equation from another.',
    ],
    shortcuts: [
      'Count-and-value problems: assume every item is the cheaper kind, then divide the leftover money by the price difference.',
      'Swapped coefficients (7x + 3y and 3x + 7y): adding gives x + y, subtracting gives x − y.',
      'Desmos: type both equations and click the intersection.',
    ],
  },
  {
    skill: 'ineq',
    intro: 'An inequality describes a range of values instead of a single one. You solve it like an equation, with one extra rule about negative numbers.',
    detail: [
      r`Multiplying or dividing both sides by a negative number reverses the inequality symbol. Adding or subtracting never does.`,
      r`Compound inequalities such as $-7 < 3 - 2x \le 9$ are solved by operating on all three parts at once. Absolute value: $|A| < k$ means $-k < A < k$; $|A| > k$ means $A < -k$ or $A > k$.`,
      r`A system of inequalities in two variables describes a region. A point is a solution only if it satisfies every inequality; points on a boundary count only for $\le$ or $\ge$. Extreme values of $x$ or $y$ in the region occur at its corners.`,
    ],
    rules: [
      'Flip the symbol when multiplying or dividing by a negative.',
      '"At least" is ≥; "at most" and "no more than" are ≤; "more than" is >; "fewer than" is <.',
      'Maximum whole number under a limit: round down. Minimum whole number to reach a goal: round up.',
      'Strict inequalities exclude the boundary.',
    ],
    examples: [
      { q: r`Solve $5 - 3x > 17$.`, a: r`$-3x > 12$, so $x < -4$ (the symbol flips when dividing by $-3$).` },
      { q: r`How many integers satisfy $|x - 4| \le 2$?`, a: r`$2 \le x \le 6$: the integers 2, 3, 4, 5, 6. Five integers.` },
    ],
    mistakes: [
      'Forgetting to reverse the symbol after dividing by a negative.',
      'Attaching "or equal to" to the wrong endpoint of a compound inequality.',
      'Rounding to the nearest whole number instead of in the direction the context requires.',
    ],
    shortcuts: [
      'Move the variable to the side where its coefficient is positive and you never need to flip.',
      'Test one easy value (such as 0) in the original inequality to confirm the direction.',
      'Desmos shades inequalities; plot the answer choices as points to see which fall in the overlap.',
    ],
  },
  {
    skill: 'equiv',
    intro: 'Equivalent expressions look different but have the same value for every allowed input. These questions ask you to rewrite: factor, expand, combine, or simplify.',
    detail: [
      r`Core patterns: $(a + b)^2 = a^2 + 2ab + b^2$, $(a - b)^2 = a^2 - 2ab + b^2$, and $a^2 - b^2 = (a + b)(a - b)$. Recognizing these inside larger expressions is the main skill.`,
      r`Exponents and radicals: $x^m \cdot x^n = x^{m+n}$, $(x^m)^n = x^{mn}$, $x^{-n} = \dfrac{1}{x^n}$, and $\sqrt[n]{x^m} = x^{m/n}$ ("power over root").`,
      r`Rational expressions follow fraction rules. To add or subtract, use a common denominator; to divide, multiply by the reciprocal; to simplify, factor and cancel common factors (never cancel terms).`,
      r`If two polynomials are equal for all $x$, their corresponding coefficients are equal. Polynomial division: dividend $=$ quotient $\times$ divisor $+$ remainder, and the remainder when dividing by $x - a$ is $p(a)$.`,
    ],
    rules: [
      r`$a^2 - b^2 = (a - b)(a + b)$; a sum of squares does not factor over the reals.`,
      r`Completing the square: $x^2 + bx + c = \left(x + \tfrac{b}{2}\right)^2 + c - \tfrac{b^2}{4}$.`,
      r`$\dfrac{1}{\frac{1}{a} + \frac{1}{b}} = \dfrac{ab}{a + b}$.`,
      'Factor theorem: (x − a) is a factor exactly when plugging in a gives 0.',
    ],
    examples: [
      { q: r`Simplify $\dfrac{x^2 - 16}{x^2 - x - 12}$.`, a: r`$\dfrac{(x - 4)(x + 4)}{(x - 4)(x + 3)} = \dfrac{x + 4}{x + 3}$ for $x \neq 4$.` },
      { q: r`Write $\sqrt{x} \cdot \sqrt[4]{x^3}$ as a single power of $x$.`, a: r`$x^{1/2} \cdot x^{3/4} = x^{5/4}$.` },
    ],
    mistakes: [
      r`Writing $(a + b)^2$ as $a^2 + b^2$.`,
      'Subtracting a numerator without distributing the minus sign to all of its terms.',
      'Multiplying exponents when they should be added (or the reverse).',
      'Cancelling terms instead of factors.',
    ],
    shortcuts: [
      'Plug in a simple number (not 0 or 1 if they hide differences) and compare the original with each choice.',
      'If every choice shares the first and last terms, check only the middle term.',
      'Use the remainder theorem instead of long division.',
    ],
  },
  {
    skill: 'nleq',
    intro: 'Nonlinear equations include quadratics, radicals, rationals, and exponentials. The goal is still to find the values that make the equation true, but there may be two solutions, one, or none, and some candidates must be thrown out.',
    detail: [
      r`Quadratics $ax^2 + bx + c = 0$: factor when possible, otherwise use $x = \dfrac{-b \pm \sqrt{b^2 - 4ac}}{2a}$. The discriminant $b^2 - 4ac$ tells the number of real solutions: positive → two, zero → one, negative → none.`,
      r`Vieta's formulas: the solutions add to $-\dfrac{b}{a}$ and multiply to $\dfrac{c}{a}$. These answer "sum of the solutions" questions without solving.`,
      r`Radical and rational equations can produce extraneous solutions. After squaring both sides or multiplying by a denominator, check each candidate in the original equation and reject any that makes a denominator zero or a principal square root negative.`,
      r`A line and a parabola: set the expressions equal to get one quadratic. Its discriminant gives the number of intersection points; tangency means discriminant zero. Exponential equations: rewrite both sides with the same base and set the exponents equal.`,
    ],
    rules: [
      r`Discriminant $b^2 - 4ac$: $> 0$ two real solutions, $= 0$ one, $< 0$ none.`,
      r`Sum of solutions $= -\dfrac{b}{a}$; product $= \dfrac{c}{a}$.`,
      'Always check solutions of radical and rational equations.',
      r`$(\text{expression})^2 = k$ gives $\text{expression} = \pm\sqrt{k}$.`,
      'An equation that is quadratic in something (√x, x², 3ˣ) can be solved by substitution.',
    ],
    examples: [
      { q: r`Solve $\sqrt{2x + 7} = x + 2$.`, a: r`Square: $2x + 7 = x^2 + 4x + 4$, so $x^2 + 2x - 3 = 0$ and $x = 1$ or $x = -3$. Check: $x = 1$ gives $3 = 3$ (valid); $x = -3$ gives $1 = -1$ (rejected). Solution: $x = 1$.` },
      { q: r`For what $c$ does $y = x^2 + c$ touch $y = 4x - 1$ at exactly one point?`, a: r`$x^2 - 4x + (c + 1) = 0$ needs discriminant 0: $16 - 4(c + 1) = 0$, so $c = 3$.` },
    ],
    mistakes: [
      'Keeping an extraneous solution.',
      'Leaving out the leading coefficient a in the discriminant or in −b/a.',
      'Reading roots with the wrong sign from factors: (x + 2) gives −2.',
      'Including the boundary case when the question says "no real solutions" (a strict inequality).',
    ],
    shortcuts: [
      'Sum or product of solutions: use Vieta, do not solve.',
      'Number of solutions or intersections: use the discriminant, or graph both sides in Desmos and count.',
      'For parameter questions in Desmos, add a slider and watch for tangency.',
    ],
  },
  {
    skill: 'nlf',
    intro: 'Nonlinear functions include quadratics (parabolas), exponentials (repeated multiplication), polynomials, and rational functions. Questions ask you to evaluate them, read their key features, and model situations.',
    detail: [
      r`Quadratics have three useful forms. Standard $ax^2 + bx + c$ shows the $y$-intercept $c$. Factored $a(x - r_1)(x - r_2)$ shows the zeros. Vertex form $a(x - h)^2 + k$ shows the vertex $(h, k)$, which is the minimum if $a > 0$ and the maximum if $a < 0$. The vertex lies at $x = -\dfrac{b}{2a}$, halfway between the zeros.`,
      r`Exponentials $f(t) = a \cdot b^t$: $a$ is the starting value and $b$ the growth factor per unit of $t$. Growth of $r\%$ means $b = 1 + \frac{r}{100}$; decay means $b = 1 - \frac{r}{100}$. If the factor $b$ applies every $p$ units, the exponent is $\frac{t}{p}$.`,
      r`Transformations: $f(x - h) + k$ moves the graph right $h$ and up $k$. The zeros of $f(x - h)$ are the zeros of $f$ plus $h$.`,
      r`Rational functions: vertical asymptotes occur where the denominator is zero (and the factor does not cancel). If numerator and denominator have the same degree, the horizontal asymptote is the ratio of leading coefficients.`,
    ],
    rules: [
      r`Vertex $x$-coordinate: $-\dfrac{b}{2a}$, or the average of the zeros.`,
      r`Equal outputs at two inputs → the axis of symmetry is halfway between them.`,
      r`$b^{t} = \left(b^{1/n}\right)^{nt}$: change time units with roots and powers, not by dividing the rate.`,
      r`For $x^3 + ax^2 + bx + c$, the product of the zeros is $-c$ and their sum is $-a$.`,
    ],
    examples: [
      { q: r`$f(x) = -2(x - 3)^2 + 11$. What is the maximum of $f$ and where does it occur?`, a: r`The maximum value is 11, at $x = 3$.` },
      { q: r`A population of 800 grows 5% per year. Write a model and find the size after 3 years.`, a: r`$P(t) = 800(1.05)^t$; $P(3) = 800(1.157625) \approx 926$.` },
    ],
    mistakes: [
      'Giving the x-coordinate of the vertex when asked for the maximum or minimum value.',
      'Reading 1.04 as "104% growth" or "1.04% growth" instead of 4%.',
      'Shifting the wrong way for f(x − h).',
      'Assuming a = 1 when it is not given.',
    ],
    shortcuts: [
      'Graph it in Desmos and click the vertex, zeros, or intersections.',
      'For exponential models in the choices, test t = 0 and one more easy value.',
      'If numeric choices are given for a question with unknown constants, try the simplest case.',
    ],
  },
  {
    skill: 'ratio',
    intro: 'Ratios compare quantities, rates compare quantities with different units (miles per hour), and proportions say two ratios are equal. Unit conversion is multiplication by a ratio equal to 1.',
    detail: [
      r`A ratio $a : b$ means that for every $a$ of one thing there are $b$ of another; the first is $\frac{a}{a+b}$ of the total. To chain ratios $a : b$ and $b : c$, scale them so the shared quantity matches.`,
      r`Write units as fractions and cancel: $\dfrac{2.4\ \text{L}}{\text{min}} \times \dfrac{1000\ \text{cm}^3}{\text{L}} \times \dfrac{1\ \text{min}}{60\ \text{s}} = 40\ \dfrac{\text{cm}^3}{\text{s}}$.`,
      r`Scale factors: if lengths scale by $k$, areas scale by $k^2$ and volumes by $k^3$.`,
    ],
    rules: [
      'Units must match before you set up a proportion.',
      'Length × k → area × k² → volume × k³.',
      'In a ratio a : b, the parts add to the whole: a + b parts.',
      'Density = mass ÷ volume; speed = distance ÷ time.',
    ],
    examples: [
      { q: 'A car travels 150 miles on 6 gallons. How far on 10 gallons at the same rate?', a: r`$\frac{150}{6} = 25$ miles per gallon, so $25 \times 10 = 250$ miles.` },
      { q: r`The ratio of red to blue tiles is $3 : 5$ and there are 96 tiles. How many are blue?`, a: r`8 parts total, so one part is 12 tiles. Blue: $5 \times 12 = 60$.` },
    ],
    mistakes: [
      'Mixing units (seconds with minutes) in one proportion.',
      'Applying a length scale factor directly to an area or volume.',
      'Treating a : b as the fraction a/b of the total instead of a/(a + b).',
    ],
    shortcuts: [
      'Find the value of "one part" first.',
      'Look for the quantity that does not change when a ratio changes; it anchors both ratios.',
      'Do a size check: per-second amounts should be smaller than per-minute amounts.',
    ],
  },
  {
    skill: 'pct',
    intro: 'A percent is a fraction out of 100. Percent questions are about finding a part, a whole, or a change, and the key is knowing which number is the base.',
    detail: [
      r`Use multipliers. An increase of $p\%$ multiplies by $1 + \frac{p}{100}$; a decrease multiplies by $1 - \frac{p}{100}$. Successive changes multiply: up 25% then down 20% is $1.25 \times 0.80 = 1.00$.`,
      r`Percent change $= \dfrac{\text{new} - \text{original}}{\text{original}} \times 100\%$. The base is always the starting value.`,
      r`To undo a percent change, divide by the multiplier. If a price after a 20% discount is \$680, the original is $680 \div 0.80 = 850$.`,
      r`An overall percentage across groups is a weighted average: multiply each group's rate by its share of the total and add.`,
    ],
    rules: [
      'Percent change is measured against the original value.',
      'Successive percent changes multiply; they never simply add.',
      '"A is p% greater than B" does not mean "B is p% less than A".',
      'Reverse a change by dividing by its multiplier.',
    ],
    examples: [
      { q: 'A population rises from 4,000 to 4,600. What is the percent increase?', a: r`$\frac{600}{4000} = 0.15$, a 15% increase.` },
      { q: r`A coat costs \$90 after a 25% markdown. What was the original price?`, a: r`$0.75P = 90$, so $P = 120$ dollars.` },
    ],
    mistakes: [
      'Dividing by the new value instead of the original.',
      'Adding 20% back to a price that was reduced by 20%.',
      'Averaging group percentages without weighting by group size.',
    ],
    shortcuts: [
      'Start with 100 (or 1,000 people) and track actual numbers.',
      'Think in multipliers: 1.08, 0.85, and so on.',
      'A weighted average lies closer to the rate of the larger group.',
    ],
  },
  {
    skill: 'data1',
    intro: 'One-variable data questions ask you to describe a list of numbers: where its center is (mean, median) and how spread out it is (range, standard deviation).',
    detail: [
      r`Mean $= \dfrac{\text{sum}}{\text{count}}$, so sum $=$ mean $\times$ count. Most mean questions are solved by converting a mean to a total.`,
      r`The median is the middle value of the ordered data (the average of the two middle values when the count is even). In a frequency table, count cumulatively to the middle position.`,
      r`Standard deviation measures typical distance from the mean. You are never asked to compute it by hand; you compare it. Data clustered near the mean have a small standard deviation; data spread far from the mean have a large one.`,
      r`Adding a constant to every value shifts mean and median but leaves range and standard deviation unchanged. Multiplying every value by a constant multiplies all four.`,
    ],
    rules: [
      'Sum = mean × count.',
      'An outlier pulls the mean toward it but barely affects the median.',
      'Shift: center changes, spread does not. Scale: both change.',
      'In a frequency table, the frequencies tell how many times each value occurs.',
    ],
    examples: [
      { q: 'Six scores have mean 80. A seventh score of 94 is added. What is the new mean?', a: r`Total: $480 + 94 = 574$. New mean: $\frac{574}{7} = 82$.` },
      { q: 'Set A is 1, 5, 9. Set B is 4, 5, 6. Which has the greater standard deviation?', a: 'Set A. Both have mean 5, but the values of A lie farther from the mean.' },
    ],
    mistakes: [
      'Forgetting that the count changes when a value is added or removed.',
      'Taking the median of the category labels in a frequency table.',
      'Applying a shift (adding a constant) to the standard deviation.',
    ],
    shortcuts: [
      'Removing a below-average value raises the mean; use direction as a check.',
      'Compare standard deviations by looking at how far the values sit from the center.',
      'Desmos computes mean(...) and median(...) for a typed list.',
    ],
  },
  {
    skill: 'data2',
    intro: 'Two-variable data pairs two measurements (hours studied and score). A scatterplot shows the pairs, and a model (a line or curve of best fit) summarizes the trend and makes predictions.',
    detail: [
      r`A line of best fit $\hat{y} = mx + b$ predicts $y$ from $x$. The slope is the predicted change in $y$ for each one-unit increase in $x$; the intercept is the predicted $y$ when $x = 0$.`,
      r`Residual $=$ actual $-$ predicted. Points above the line have positive residuals. An association can be positive or negative, strong or weak, linear or nonlinear.`,
      r`Choosing a model: constant differences in $y$ for equal steps in $x$ indicate a linear model; constant ratios indicate an exponential model $y = a \cdot b^x$.`,
    ],
    rules: [
      'Predict by substituting into the model.',
      'Residual = actual − predicted.',
      'Constant difference → linear. Constant ratio → exponential.',
      r`In $a \cdot b^x$, increasing $x$ by $k$ multiplies $y$ by $b^k$.`,
    ],
    examples: [
      { q: r`A model is $\hat{y} = 3.2x + 18$. Interpret the slope if $x$ is weeks and $y$ is height in cm.`, a: 'The predicted height increases by 3.2 cm for each additional week.' },
      { q: 'x: 0, 1, 2, 3 and y: 80, 40, 20, 10. What type of model fits?', a: r`Each step multiplies $y$ by $\frac{1}{2}$: exponential, $y = 80(0.5)^x$.` },
    ],
    mistakes: [
      'Interpreting the slope as a total instead of a per-unit change.',
      'Subtracting in the wrong order for a residual.',
      'Fitting a line through two rows of a table without checking the rest.',
      'Treating correlation as proof of causation.',
    ],
    shortcuts: [
      'Check ratios of consecutive y-values before anything else.',
      'Desmos regression: enter a table, then type y1 ~ mx1 + b (or y1 ~ a·b^x1).',
    ],
  },
  {
    skill: 'prob',
    intro: 'Probability is the fraction of equally likely outcomes that count as a success. On the SAT it almost always comes from a two-way table or a simple description of a group.',
    detail: [
      r`$P(\text{event}) = \dfrac{\text{favorable outcomes}}{\text{possible outcomes}}$. The work is choosing the right denominator.`,
      r`Conditional probability restricts the group. "Given that the member prefers tea" or "of the students who walk" means the denominator is that group's total, not the grand total.`,
      r`For two selections without replacement, multiply: the second fraction has one fewer favorable outcome and one fewer total. When percentages are nested, convert to counts with a convenient total such as 100.`,
    ],
    rules: [
      'Selected from everyone → grand total in the denominator.',
      '"Given that" / "of those who" → that row or column total.',
      'P(A given B) is usually different from P(B given A).',
      'Without replacement: both numerator and denominator shrink.',
    ],
    examples: [
      { q: 'Of 200 voters, 120 are urban; 78 urban voters and 52 rural voters support a measure. Given that a voter supports it, what is the probability the voter is rural?', a: r`Supporters: $78 + 52 = 130$. Probability: $\frac{52}{130} = \frac{2}{5}$.` },
      { q: 'A box has 4 red and 6 blue pens. Two are drawn without replacement. P(both blue)?', a: r`$\frac{6}{10} \cdot \frac{5}{9} = \frac{1}{3}$.` },
    ],
    mistakes: [
      'Using the grand total when a condition narrows the group.',
      'Reversing the condition.',
      'Treating draws without replacement as independent.',
    ],
    shortcuts: [
      'Underline the condition; it names the denominator.',
      'Build a quick table of counts when given percentages of percentages.',
    ],
  },
  {
    skill: 'infer',
    intro: 'Inference is using a sample to estimate something about a whole population. The estimate comes with a margin of error that describes how far off it might reasonably be.',
    detail: [
      r`A random sample's proportion or mean is the best single estimate for the population. Scale it up: estimate $=$ sample proportion $\times$ population size.`,
      r`Estimate $\pm$ margin of error gives a range of plausible values for the population. The range is about the population, never about the sample, whose value is known exactly.`,
      r`Larger random samples give smaller margins of error. When comparing two estimates, compare their intervals: a claim is supported only when the whole interval agrees with it.`,
    ],
    rules: [
      'Sample statistic → estimate of the population parameter.',
      'Plausible range = estimate ± margin of error.',
      'Bigger random sample → smaller margin of error.',
      'Overlapping intervals → you cannot claim a definite difference.',
    ],
    examples: [
      { q: 'In a random sample of 400 of a town\'s 12,000 residents, 88 own bicycles. Estimate the number of bicycle owners in the town.', a: r`$\frac{88}{400} = 0.22$; $0.22 \times 12{,}000 = 2{,}640$.` },
      { q: 'A poll reports 47% support with a margin of error of 4%. Can we conclude a majority opposes?', a: 'No. The plausible range for support is 43% to 51%, which includes values above 50%.' },
    ],
    mistakes: [
      'Treating the estimate as exact.',
      'Applying the margin of error to the sample instead of the population.',
      'Comparing two point estimates while ignoring their margins of error.',
    ],
    shortcuts: [
      'Write the interval before reading the choices.',
      'Words such as "exactly" and "certainly" are almost always wrong for sample-based conclusions.',
    ],
  },
  {
    skill: 'claims',
    intro: 'These questions ask what a study allows you to conclude. Two things matter: how the participants were chosen and whether a treatment was randomly assigned.',
    detail: [
      'Random sampling (selecting participants at random from a population) lets you generalize the results to that population, and only to that population.',
      'Random assignment (deciding by chance who gets the treatment) lets you conclude cause and effect, because the groups are alike apart from the treatment. A study that merely observes existing groups can show an association but not causation.',
      'Combine the two: random sample + random assignment → cause and effect, generalizable. Random assignment of volunteers → cause and effect for people like the volunteers. Random sample, no assignment → association in the population.',
    ],
    rules: [
      'Random selection → generalize.',
      'Random assignment → causation.',
      'Observational study → association only.',
      'Results apply only to the population actually sampled.',
    ],
    examples: [
      { q: 'A survey of customers leaving a gym finds that most favor a new park. Can this be generalized to the whole city?', a: 'No. Gym customers were not randomly selected from all city residents, so the sample may not represent the city.' },
      { q: 'Students randomly assigned to a new study method scored higher than those assigned the old method. What can be concluded?', a: 'The new method likely caused the higher scores for students like those in the study. Whether it generalizes depends on how the students were selected.' },
    ],
    mistakes: [
      'Concluding causation from an observational study.',
      'Generalizing beyond the group that was sampled.',
      'Blaming sample size when the real flaw is a biased selection method.',
    ],
    shortcuts: [
      'Ask two questions every time: Was selection random? Was assignment random?',
      'Match the strength of the conclusion to the design; eliminate choices that claim more.',
    ],
  },
  {
    skill: 'area',
    intro: 'Area measures the surface inside a flat shape; volume measures the space inside a solid. The formulas are on the reference sheet, so the skill is choosing and using them correctly.',
    detail: [
      r`Key formulas (provided on the test): rectangle $A = lw$; triangle $A = \frac{1}{2}bh$; circle $A = \pi r^2$, $C = 2\pi r$; prism or cylinder $V = (\text{base area})(\text{height})$; cone and pyramid $V = \frac{1}{3}(\text{base area})(\text{height})$; sphere $V = \frac{4}{3}\pi r^3$.`,
      r`Many questions work backward: given a volume or surface area, find a dimension, then compute something else. Others ask how a measurement changes when dimensions are scaled: because radius is squared in volume formulas, multiplying $r$ by $k$ multiplies volume by $k^2$ (and by $k^3$ if every dimension scales).`,
      r`Recasting or pouring problems conserve volume: total volume before equals total volume after.`,
    ],
    rules: [
      'Square the radius, not the diameter.',
      'Similar figures: area ratio = (side ratio)², volume ratio = (side ratio)³.',
      'Surface area = sum of the areas of all faces.',
      'Use the reference sheet rather than memory for cones and spheres.',
    ],
    examples: [
      { q: 'A cylinder has volume 200π and height 8. Find its radius.', a: r`$\pi r^2(8) = 200\pi$, so $r^2 = 25$ and $r = 5$.` },
      { q: 'A cube\'s edge is tripled. By what factor does its volume increase?', a: r`$3^3 = 27$.` },
    ],
    mistakes: [
      'Using the diameter in place of the radius.',
      'Forgetting the ½ or ⅓ in triangle, cone, and pyramid formulas.',
      'Scaling area or volume by the length factor instead of its square or cube.',
      'Leaving out a pair of faces in a surface area.',
    ],
    shortcuts: [
      'Work with multipliers when dimensions are scaled; you rarely need the actual dimensions.',
      'Keep π symbolic until the end; it usually cancels.',
    ],
  },
  {
    skill: 'lines',
    intro: 'This skill covers the angle facts for intersecting and parallel lines and the properties of triangles, including similar triangles, whose sides are in proportion.',
    detail: [
      r`Angles: vertical angles are equal; angles on a line sum to $180^\circ$. With parallel lines cut by a transversal, corresponding and alternate interior angles are equal, and same-side interior angles sum to $180^\circ$.`,
      r`Triangles: the interior angles sum to $180^\circ$; an exterior angle equals the sum of the two remote interior angles; equal sides face equal angles. The sum of interior angles of an $n$-sided polygon is $(n - 2) \cdot 180^\circ$.`,
      r`Similar triangles have equal angles and proportional sides. A segment parallel to one side of a triangle creates a smaller similar triangle; compare whole sides with whole sides. In a right triangle, the altitude $h$ to the hypotenuse satisfies $h^2 = pq$, where $p$ and $q$ are the two pieces of the hypotenuse.`,
      r`Coordinate geometry: distance $= \sqrt{(x_2 - x_1)^2 + (y_2 - y_1)^2}$; midpoint $= \left(\frac{x_1 + x_2}{2}, \frac{y_1 + y_2}{2}\right)$. A point dividing a segment in the ratio $m : n$ is $\frac{m}{m+n}$ of the way along.`,
    ],
    rules: [
      'Alternate interior and corresponding angles: equal. Same-side interior: supplementary.',
      'Exterior angle = sum of the two remote interior angles.',
      'Similarity ratios compare corresponding whole sides.',
      'Triangle inequality: any side is shorter than the sum of the other two.',
    ],
    examples: [
      { q: r`In triangle $ABC$, $DE \parallel BC$ with $D$ on $AB$, $E$ on $AC$, $AD = 4$, $DB = 6$, $BC = 15$. Find $DE$.`, a: r`$\frac{DE}{BC} = \frac{AD}{AB} = \frac{4}{10}$, so $DE = 6$.` },
      { q: 'Two angles of a triangle measure 35° and 80°. Find the exterior angle at the third vertex.', a: r`$35^\circ + 80^\circ = 115^\circ$.` },
    ],
    mistakes: [
      'Using a partial side (DB) in a similarity ratio instead of the whole side (AB).',
      'Setting supplementary angles equal, or equal angles supplementary.',
      'Reading a ratio 1 : 3 as one third instead of one quarter of the way.',
    ],
    shortcuts: [
      'Redraw the figure and mark every angle you can deduce.',
      'Separate overlapping similar triangles into two drawings with matching orientation.',
    ],
  },
  {
    skill: 'trig',
    intro: 'Right-triangle trigonometry connects the angles of a right triangle to the ratios of its sides. With one side and one acute angle (or two sides), you can find everything else.',
    detail: [
      r`Pythagorean theorem: $a^2 + b^2 = c^2$, where $c$ is the hypotenuse. Common triples: 3-4-5, 5-12-13, 8-15-17, 7-24-25, and their multiples.`,
      r`SOH-CAH-TOA: $\sin\theta = \frac{\text{opposite}}{\text{hypotenuse}}$, $\cos\theta = \frac{\text{adjacent}}{\text{hypotenuse}}$, $\tan\theta = \frac{\text{opposite}}{\text{adjacent}}$. Similar right triangles have equal trig ratios.`,
      r`Special right triangles: 45°-45°-90° has sides $x, x, x\sqrt{2}$; 30°-60°-90° has sides $x, x\sqrt{3}, 2x$.`,
      r`Cofunction identity: $\sin(x^\circ) = \cos(90^\circ - x^\circ)$. In a right triangle, the sine of one acute angle equals the cosine of the other. Radians: $180^\circ = \pi$ radians.`,
    ],
    rules: [
      r`$\sin A = \cos B$ when $A + B = 90^\circ$.`,
      'The hypotenuse is the longest side and is opposite the right angle.',
      r`Degrees to radians: multiply by $\frac{\pi}{180}$.`,
      'A trig ratio fixes the triangle\'s shape; one length fixes its size.',
    ],
    examples: [
      { q: r`In a right triangle, $\cos\theta = \frac{8}{17}$. Find $\sin\theta$.`, a: r`The sides are 8, 15, 17 (since $17^2 - 8^2 = 225$), so $\sin\theta = \frac{15}{17}$.` },
      { q: r`If $\sin(2x^\circ) = \cos(40^\circ)$ for acute angles, find $x$.`, a: r`$2x + 40 = 90$, so $x = 25$.` },
    ],
    mistakes: [
      'Adding the squares when the unknown side is a leg.',
      'Using the 45-45-90 ratio in a 30-60-90 triangle.',
      'Mixing up opposite and adjacent relative to the named angle.',
      'Leaving the calculator in the wrong angle mode.',
    ],
    shortcuts: [
      'Recognize triples and scale them instead of computing.',
      'Write the sides as 3k, 4k, 5k and use the given length to find k.',
    ],
  },
  {
    skill: 'circ',
    intro: 'Circle questions use the equation of a circle in the coordinate plane and the relationships among radii, arcs, sectors, chords, tangents, and angles.',
    detail: [
      r`Equation: $(x - h)^2 + (y - k)^2 = r^2$ has center $(h, k)$ and radius $r$. From general form $x^2 + y^2 + Dx + Ey + F = 0$, complete the square in $x$ and $y$.`,
      r`Arcs and sectors are fractions of the circle: arc length $= \frac{\theta}{360^\circ} \cdot 2\pi r$ and sector area $= \frac{\theta}{360^\circ} \cdot \pi r^2$. In radians: arc length $= r\theta$, sector area $= \frac{1}{2}r^2\theta$.`,
      r`Angles: a central angle equals its arc; an inscribed angle is half its arc. A tangent is perpendicular to the radius at the point of tangency. A radius perpendicular to a chord bisects the chord.`,
      r`A line is tangent to a circle when the system has exactly one solution (discriminant 0), or when the distance from the center to the line equals the radius.`,
    ],
    rules: [
      'Center: flip the signs inside the parentheses. Radius: square root of the right side.',
      'Inscribed angle = ½ central angle on the same arc.',
      'Tangent ⟂ radius at the point of tangency.',
      'Center = midpoint of a diameter.',
    ],
    examples: [
      { q: r`Find the center and radius of $x^2 + y^2 + 6x - 4y = 12$.`, a: r`$(x + 3)^2 + (y - 2)^2 = 12 + 9 + 4 = 25$: center $(-3, 2)$, radius 5.` },
      { q: 'A circle has radius 9. Find the area of a sector with central angle 80°.', a: r`$\frac{80}{360} \cdot 81\pi = 18\pi$.` },
    ],
    mistakes: [
      'Reporting r² as the radius.',
      'Keeping the signs of h and k as they appear in the equation.',
      'Using the arc-length formula when the question asks for sector area.',
      'Adding the completing-the-square constants to only one side.',
    ],
    shortcuts: [
      'Type the equation into Desmos to see the center and radius.',
      'Reduce the fraction θ/360 before multiplying.',
      'Test a known point in each answer choice for circle-equation questions.',
    ],
  },
];
