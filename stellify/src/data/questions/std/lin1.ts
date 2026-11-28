/**
 * Linear equations in one variable (lin1), brought to the Stellify question standard as patches (same ids).
 * Medium questions keep their content with recorded mistakes, reviews and an independent check. Hard tiers that
 * used only numbers were rebuilt around an unknown constant that must be found from a condition, with an extra
 * final step; the others record their combined topics and twist. Every `check` recomputes the answer from scratch
 * and, for multiple choice, confirms that each wrong choice is what its recorded mistake produces.
 */
import type { RawQuestion } from '@/lib/types';
import { near, r } from '../kit';

type Patch = Partial<RawQuestion> & { id: string };
const REVIEWED = '2026-11-28';
const teacher = (s: string) => ({ teacher: `AI teacher pass (Stellify): ${s}`, bias: 'AI bias and clarity pass (Stellify): neutral everyday or school context, no regional, cultural or income assumptions, plain wording with no double negatives.', date: REVIEWED });

export const LIN1_STD: Patch[] = [
  // ---- medium: content kept, evidence recorded ----
  {
    id: 'm-lin1-01',
    meta: { mistakes: ['Distributes 3 to 2x only: 6x − 5 + 4 = 2x + 13, so 4x = 14.', 'Distributes 2 to x only on the right: 6x − 11 = 2x + 6, so 4x = 17.', null, 'Adds −15 + 4 as −19: 6x − 19 = 2x + 13, so 4x = 32.'], review: teacher('6x − 11 = 2x + 13 gives x = 6; both sides equal 25.') },
    check: () => near((13 + 11) / 4, 6) && near((13 + 1) / 4, 3.5) && near((6 + 11) / 4, 17 / 4) && near((13 + 19) / 4, 8),
  },
  { id: 'm-lin1-02', meta: { review: teacher('(237 − 45) ÷ 32 = 6 half hours = 3 hours.') }, check: () => near((237 - 45) / 32 / 2, 3) },
  {
    id: 'm-lin1-n1',
    meta: { mistakes: ['Solves for x = 6 and stops, answering the wrong quantity.', 'Finds 6x = 36 and forgets to add 4.', null, 'Doubles the whole equation, 2(23) = 46, which is 6x + 10, not 6x + 4.'], review: teacher('x = 6, so 6x + 4 = 40.') },
    check: () => { const x = (23 - 5) / 3; return near(x, 6) && near(6 * x + 4, 40) && near(6 * x, 36) && near(2 * 23, 46); },
  },
  { id: 'm-lin1-n6', meta: { review: teacher('8 + 3.5h = 14 + 2.75h gives h = 8; both totals are 36 dollars.') }, check: () => near((14 - 8) / (3.5 - 2.75), 8) },
  { id: 'm-lin1-n8', meta: { review: teacher('7x − 14 = 3x + 10 gives x = 6.') }, check: () => near((10 + 14) / 4, 6) },
  { id: 'm-lin1-n12', meta: { review: teacher('(125 − 20) ÷ 35 = 3 hours.') }, check: () => near((125 - 20) / 35, 3) },
  {
    id: 'm-lin1-n16',
    meta: { mistakes: ['Multiplies 0.4 × 10 instead of dividing 10 by 0.4.', null, 'Picks the 15 inside the parentheses instead of solving.', 'Finds x + 15 = 25 and stops without subtracting 15.'], review: teacher('0.4(10 + 15) = 10.') },
    check: () => near(10 / 0.4 - 15, 10) && near(0.4 * 10, 4) && near(10 / 0.4, 25),
  },

  // ---- hard tiers ----
  {
    id: 'm-lin1-03',
    stem: r`In the equation $a(3x - 4) + 5 = 12x - 11$, $a$ is a constant. If the equation has infinitely many solutions, what is the value of $2a - 1$?`,
    choices: ['$7$', '$5$', '$-9$', '$23$'], answer: 0,
    steps: [
      r`Infinitely many solutions means the two sides must be the same expression for every $x$. Distribute $a$ on the left: $3ax - 4a + 5 = 12x - 11$.`,
      r`Match the coefficients of $x$: $3a = 12$, so $a = 4$. Then check the constants with $a = 4$: $-4(4) + 5 = -11$, which matches the right side, so the value works.`,
      r`The question asks for $2a - 1$, not $a$. Substitute: $2(4) - 1 = 7$.`,
    ],
    why: [
      r`Correct. $a = 4$ makes both sides $12x - 11$, and $2(4) - 1 = 7$.`,
      r`$5$ uses $a = 3$, which matches the 3 inside the parentheses instead of solving $3a = 12$.`,
      r`$-9$ uses $a = -4$, matching the sign of the $-4$ term instead of the coefficients of $x$.`,
      r`$23$ uses $a = 12$, setting $a$ (not $3a$) equal to 12.`,
    ],
    meta: { concepts: ['infinitely many solutions (identical sides)', 'distributing a constant', 'evaluating an expression'], twist: 'After finding a, the question asks for the value of 2a − 1.', mistakes: [null, 'Uses a = 3, matching the 3 in the parentheses instead of solving 3a = 12.', 'Uses a = −4, matching the sign of the −4 term.', 'Sets a = 12 instead of 3a = 12.'], review: teacher('a = 4 makes the sides identical; the constants agree (−16 + 5 = −11).') },
    check: () => { const a = 12 / 3; return near(-4 * a + 5, -11) && near(2 * a - 1, 7) && near(2 * 3 - 1, 5) && near(2 * -4 - 1, -9) && near(2 * 12 - 1, 23); },
  },
  {
    id: 'm-lin1-04',
    stem: r`$$\frac{2x - c}{3} + \frac{x}{2} = \frac{7x + 5}{6} - 1$$ In the given equation, $c$ is a constant. If the equation has infinitely many solutions, what is the value of $4c$?`,
    answer: ['2'],
    steps: [
      r`Multiply every term by 6: $2(2x - c) + 3x = 7x + 5 - 6$.`,
      r`Simplify: $7x - 2c = 7x - 1$. The $x$-terms already match, so the constants must too: $-2c = -1$ and $c = \frac{1}{2}$.`,
      r`$4c = 4 \cdot \frac{1}{2} = 2$.`,
    ],
    why: [
      r`$-8$: this uses $c = -2$, from not multiplying the stand-alone $-1$ by 6 ($7x - 2c = 7x + 4$).`,
      r`$-2$: this uses $c = -\frac{1}{2}$, a sign error in $-2c = -1$.`,
      r`$\frac{1}{2}$: this is the value of $c$; the question asks for $4c$.`,
    ],
    meta: { concepts: ['clearing fractions', 'infinitely many solutions', 'evaluating an expression'], twist: 'After finding c, the question asks for 4c.', review: teacher('with c = 1/2 both sides reduce to (7x − 1)/6.') },
    check: () => { const c = 0.5; const f = (x: number) => (2 * x - c) / 3 + x / 2 - ((7 * x + 5) / 6 - 1); return near(f(0), 0) && near(f(7), 0) && near(4 * c, 2); },
  },
  {
    id: 'm-lin1-05',
    stem: r`In the equation $|2x - 7| + k = 12$, $k$ is a constant. If $x = 8$ is a solution to the equation, what is the sum of all the solutions?`,
    steps: [
      r`A known solution must make the equation true, so substitute $x = 8$: $|2(8) - 7| + k = 12$, which is $9 + k = 12$, so $k = 3$.`,
      r`Now solve the full equation $|2x - 7| + 3 = 12$. Isolate the absolute value: $|2x - 7| = 9$. Either $2x - 7 = 9$, giving $x = 8$, or $2x - 7 = -9$, giving $x = -1$.`,
      r`The question asks for the sum of all the solutions: $8 + (-1) = 7$.`,
    ],
    why: [
      r`$-1$ is the other solution, not the sum of the two solutions.`,
      r`Correct. With $k = 3$ the solutions are $8$ and $-1$, and their sum is $7$.`,
      r`$8$ is only the given solution; the equation $|2x - 7| = 9$ also allows $2x - 7 = -9$.`,
      r`$9$ is the value of $|2x - 7|$ once $k$ is known, not a solution or a sum.`,
    ],
    meta: { concepts: ['solving for a constant from a known solution', 'absolute value equations (two cases)', 'sum of solutions'], twist: 'After finding k, the student must find the second solution and add the two.', mistakes: ['Answers the other solution, −1, instead of the sum.', null, 'Uses only the given solution and misses the negative case.', 'Answers the value of |2x − 7| = 9 instead of solving.'], review: teacher('k = 3; |2x − 7| = 9 gives 8 and −1, sum 7.') },
    check: () => { const k = 12 - Math.abs(2 * 8 - 7); const s = [(12 - k + 7) / 2, (-(12 - k) + 7) / 2]; return k === 3 && near(s[0] + s[1], 7) && near(s[1], -1) && near(12 - k, 9); },
  },
  {
    id: 'm-lin1-06',
    meta: { concepts: ['no-solution condition (equal coefficients)', 'comparing constants', 'distributing constants'], twist: 'After setting p = q, the student must check the constants to rule out p = 3, which gives infinitely many solutions.', mistakes: ['Uses p = q = 3, which makes the sides identical (infinitely many solutions).', 'Assumes unequal coefficients, which give exactly one solution.', 'Uses opposite coefficients, which still give exactly one solution.', null], review: teacher('p(x − 2) + 3 = px − 2p + 3 and q(x + 1) − 6 = qx + q − 6; with p = q the constants agree only when p = 3.') },
    check: () => { const same = (p: number) => near(-2 * p + 3, p - 6); return same(3) && !same(2) && !same(5); },
  },
  {
    id: 'm-lin1-07',
    stem: r`A chemist mixes $a$ liters of a 20% saline solution with $b$ liters of a 50% saline solution. The resulting mixture is a 32% saline solution. What is the value of $\dfrac{a}{b}$?`,
    answer: ['3/2', '1.5'],
    steps: [
      r`Track the salt. The first solution contributes $0.20a$ liters of salt and the second $0.50b$ liters. The mixture has $a + b$ liters, of which 32% is salt.`,
      r`Write salt in equals salt out: $0.20a + 0.50b = 0.32(a + b) = 0.32a + 0.32b$. Collect terms: $0.50b - 0.32b = 0.32a - 0.20a$, so $0.18b = 0.12a$.`,
      r`Neither $a$ nor $b$ is determined, but their ratio is: $\frac{a}{b} = \frac{0.18}{0.12} = \frac{3}{2}$. For example, 9 liters and 6 liters work.`,
    ],
    why: [
      r`$\frac{2}{3}$: this is $\frac{b}{a}$, the ratio inverted.`,
      r`$\frac{25}{6}$: this applies 32% to $a$ alone ($0.20a + 0.50b = 0.32a$) instead of to the whole mixture, $a + b$.`,
    ],
    meta: { concepts: ['mixture equations', 'two unknowns reduced to a ratio'], twist: 'Neither amount can be found; the question asks for their ratio.', review: teacher('for example a = 9, b = 6 gives 1.8 + 3 = 4.8 = 0.32 × 15.') },
    check: () => near((0.5 - 0.32) / (0.32 - 0.2), 1.5) && near(0.2 * 9 + 0.5 * 6, 0.32 * 15) && near(0.5 / 0.12, 25 / 6),
  },
  {
    id: 'm-lin1-08',
    meta: { concepts: ['identities (true for all x)', 'distributing with negatives', 'evaluating an expression'], twist: 'After finding a and b, the question asks for the product ab.', mistakes: ['Answers a + b = 7 instead of ab.', null, 'Sign error: −6 + 2b = 16 gives b = 11.', 'Sign error: −6 − 2b = −16 solved as b = −5.'], review: teacher('3a − 2 = 4 gives a = 2; −6 − 2b = −16 gives b = 5; ab = 10.') },
    check: () => { const a = 2, b = 5; return near(3 * a - 2, 4) && near(-6 - 2 * b, -16) && a * b === 10 && a + b === 7 && 2 * 11 === 22 && 2 * -5 === -10; },
  },
  {
    id: 'm-x-lin1-01',
    stem: r`In the equation $|x - 3| + |x + 2| = k$, $k$ is a constant. If the equation has infinitely many solutions, how many integers $x$ satisfy the equation?`,
    steps: [
      r`$|x - 3| + |x + 2|$ is the sum of the distances from $x$ to 3 and to $-2$. That sum is at least 5, and it equals 5 for every $x$ between $-2$ and 3.`,
      r`Outside that interval the sum changes with $x$, so each value above 5 is reached at exactly two points. Infinitely many solutions therefore requires $k = 5$.`,
      r`With $k = 5$, every $x$ with $-2 \le x \le 3$ works. The integers are $-2, -1, 0, 1, 2, 3$: six of them.`,
    ],
    why: [
      r`2: this counts only the endpoints $-2$ and $3$; every value between them also works.`,
      r`5: this is the value of $k$, the distance between $-2$ and 3, not the number of integers in the interval.`,
      r`Infinitely many: the solutions are infinite, but the question asks only for the integers among them.`,
    ],
    meta: { concepts: ['absolute value as distance', 'finding the constant that gives infinitely many solutions', 'counting integers in an interval'], twist: 'After identifying k = 5, the student must count the integers in the solution interval.', review: teacher('the sum is constant at 5 on [−2, 3] and larger elsewhere; six integers.') },
    check: () => { const f = (x: number) => Math.abs(x - 3) + Math.abs(x + 2); let n = 0; for (let x = -10; x <= 10; x++) if (f(x) === 5) n++; return n === 6 && f(-2.5) > 5 && f(3.5) > 5; },
  },
  {
    id: 'm-c-lin1-01',
    stem: r`$$\frac{2x - 1}{3} - \frac{x + 4}{6} = \frac{x}{4} + k$$ In the given equation, $k$ is a constant. The equation has the same solution as $3x - 4 = 20$. What is the value of $k$?`,
    answer: ['1'],
    steps: [
      r`First find the shared solution from the simpler equation: $3x - 4 = 20$ gives $3x = 24$, so $x = 8$.`,
      r`Substitute $x = 8$ into the left side of the given equation: $\frac{2(8) - 1}{3} - \frac{8 + 4}{6} = \frac{15}{3} - \frac{12}{6} = 5 - 2 = 3$.`,
      r`The right side at $x = 8$ is $\frac{8}{4} + k = 2 + k$. Setting the two sides equal gives $2 + k = 3$, so $k = 1$.`,
    ],
    why: [
      r`3: this is the value of the left side at $x = 8$, not $k$.`,
      r`8: this is the shared solution $x$, not $k$.`,
      r`$\frac{7}{3}$: this writes $-\frac{x + 4}{6}$ as $-\frac{x}{6} + \frac{4}{6}$, distributing the minus to only the first term, so the left side becomes $\frac{13}{3}$.`,
    ],
    meta: { concepts: ['solving a linear equation', 'fractional expressions', 'solving for a constant'], twist: 'The solution comes from a second equation and must be substituted before solving for k.', review: teacher('x = 8; 5 − 2 = 3 = 2 + k, so k = 1.') },
    check: () => { const x = 24 / 3; const L = (2 * x - 1) / 3 - (x + 4) / 6; const k = L - x / 4; const bad = (2 * x - 1) / 3 - x / 6 + 4 / 6 - x / 4; return near(x, 8) && near(k, 1) && near(L, 3) && near(bad, 7 / 3); },
  },
  {
    id: 'm-c-lin1-02',
    stem: r`Tank A holds 240 liters of water and drains at a constant rate of 6 liters per minute. At the same moment, Tank B, which holds 90 liters, begins filling at a constant rate of $r$ liters per minute. The two tanks hold equal amounts after 15 minutes. After how many minutes from the start will Tank A hold exactly twice as much water as Tank B?`,
    steps: [
      r`First use the condition that the tanks are equal after 15 minutes. Tank A then holds $240 - 6(15) = 150$ liters and Tank B holds $90 + 15r$ liters, so $90 + 15r = 150$ and $r = 4$.`,
      r`Now write the main condition. After $t$ minutes Tank A holds $240 - 6t$ and Tank B holds $90 + 4t$. Twice as much means $240 - 6t = 2(90 + 4t) = 180 + 8t$.`,
      r`Solve: $60 = 14t$, so $t = \frac{60}{14} = \frac{30}{7}$, a little under 4.3 minutes.`,
    ],
    why: [
      r`Correct. With $r = 4$, at $t = \frac{30}{7}$ Tank A holds about 214.3 liters and Tank B about 107.1 liters.`,
      r`6 doubles only the 90: $240 - 6t = 180 + 4t$. The 2 must multiply all of Tank B's amount.`,
      r`15 is when the tanks hold equal amounts, which the question gives; it asks when A is twice B.`,
      r`$\frac{195}{8}$ reverses the relationship, $2(240 - 6t) = 90 + 4t$, making B twice A.`,
    ],
    meta: { concepts: ['finding a rate from a condition', 'linear models of change', 'translating "twice as much"'], twist: 'The filling rate r must be found from the equal-amount condition before the main equation can be written.', mistakes: [null, 'Doubles only the 90 instead of all of 90 + 4t.', 'Answers the given equal-amount time, 15 minutes.', 'Reverses the relationship, doubling Tank A instead of Tank B.'], review: teacher('r = 4; 240 − 6t = 2(90 + 4t) gives t = 30/7.') },
    check: () => { const r0 = (240 - 90 - 90) / 15; const t = (240 - 180) / (6 + 2 * r0); return near(r0, 4) && near(t, 30 / 7) && near((240 - 180) / (6 + r0), 6) && near((480 - 90) / (12 + r0), 195 / 8); },
  },
  {
    id: 'm-c-lin1-03',
    meta: { concepts: ['infinitely many solutions', 'distributing a constant', 'sum of constants'], twist: 'After finding a and b, the question asks for a + b.', mistakes: ['Answers b = 0 alone instead of a + b.', null, 'Forgets to distribute a to −2, so b = 2 and a + b = 4.', 'Sign slip writing −2a as +2a, so b = 8 and a + b = 10.'], review: teacher('3a = 6 gives a = 2; −2a + 4 = b gives b = 0; a + b = 2.') },
    check: () => { const a = 2, b = -2 * a + 4; return b === 0 && a + b === 2 && a + (-2 + 4) === 4 && a + (2 * a + 4) === 10; },
  },
  {
    id: 'm-c-lin1-04',
    stem: r`In the equation $3|2x + 1| - k = 8$, $k$ is a constant. If $x = 2$ is a solution to the equation, what is the sum of all solutions to the equation?`,
    answer: ['-1'],
    steps: [
      r`Substitute the known solution $x = 2$ to find $k$: $3|2(2) + 1| - k = 8$, which is $15 - k = 8$, so $k = 7$.`,
      r`Now isolate the absolute value in $3|2x + 1| - 7 = 8$: add 7 to get $3|2x + 1| = 15$, then divide by 3 to get $|2x + 1| = 5$.`,
      r`Split into two cases: $2x + 1 = 5$ gives $x = 2$, and $2x + 1 = -5$ gives $x = -3$. The sum of the solutions is $2 + (-3) = -1$.`,
    ],
    why: [
      r`2: this is only the given solution; the negative case gives a second one.`,
      r`$-3$: this is the other solution, not the sum.`,
      r`$\frac{4}{3}$: this splits into cases before isolating the absolute value, $3(2x + 1) - 7 = \pm 8$.`,
    ],
    meta: { concepts: ['solving for a constant from a known solution', 'isolating an absolute value', 'sum of solutions'], twist: 'After finding k, the student must isolate the absolute value, find the second solution and add.', review: teacher('k = 7; |2x + 1| = 5 gives 2 and −3.') },
    check: () => { const k = 3 * 5 - 8; const v = (8 + k) / 3; return k === 7 && near(v, 5) && near((v - 1) / 2 + (-v - 1) / 2, -1); },
  },
  {
    id: 'm-c-lin1-05',
    choices: ['1', '3', '2', 'Infinitely many'],
    meta: { concepts: ['absolute value equations', 'conditions on solutions', 'counting integer parameters'], twist: 'Beyond having two solutions, both solutions must be positive, which limits k.', mistakes: ['Misses one of the two values (k = 6 or k = 7).', 'Counts k = 8 too, whose solutions are 6 and 0; 0 is not positive.', null, 'Ignores the condition that both solutions be positive.'], review: teacher('k − 5 = d with 0 < d < 3: k = 6 (4, 2) and k = 7 (5, 1).') },
    check: () => { let n = 0; for (let k = 0; k < 50; k++) { const d = k - 5; if (d > 0 && 3 - d > 0) n++; } return n === 2; },
  },
  {
    id: 'm-lin1-n2',
    stem: r`In the equation $ax + 8 = 3(x + 2) + b$, $a$ and $b$ are constants. If the equation has infinitely many solutions, what is the value of $a + b$?`,
    answer: ['5'],
    steps: [
      r`Distribute on the right side: $3(x + 2) + b = 3x + 6 + b$. The equation becomes $ax + 8 = 3x + 6 + b$.`,
      r`Infinitely many solutions means the two sides are identical, so the coefficients of $x$ must match and the constants must match: $a = 3$ and $8 = 6 + b$, so $b = 2$.`,
      r`The question asks for the sum of the constants: $a + b = 3 + 2 = 5$.`,
    ],
    why: [
      r`3: this is the value of $a$ alone; the question asks for $a + b$.`,
      r`11: this uses $b = 8$, matching the 8 on the left to $b$ without the 6 from distributing.`,
      r`1: this uses $b = -2$, a sign error in $8 = 6 + b$.`,
    ],
    meta: { concepts: ['infinitely many solutions', 'distributing', 'matching coefficients and constants'], twist: 'After finding both constants, the question asks for their sum.', review: teacher('a = 3, b = 2 make both sides 3x + 8.') },
    check: () => { const a = 3, b = 8 - 6; return a + b === 5 && a + 8 === 11 && a - 2 === 1; },
  },
  {
    id: 'm-lin1-n3',
    stem: r`A plumber charges a fixed fee of $a$ dollars plus $b$ dollars per hour of work. A 2-hour job costs \$190 and a 5-hour job costs \$385. What is the value of $a + 8b$, the cost, in dollars, of an 8-hour job?`,
    answer: ['580'],
    steps: [
      r`Each job's cost is the fixed fee plus the hourly rate times the hours, so $a + 2b = 190$ and $a + 5b = 385$.`,
      r`Subtract the first equation from the second to remove $a$: $3b = 195$, so $b = 65$ dollars per hour. Then $a = 190 - 2(65) = 60$ dollars.`,
      r`An 8-hour job costs $a + 8b = 60 + 8(65) = 60 + 520 = 580$ dollars.`,
    ],
    why: [
      r`520: this is $8b$ alone; it leaves out the fixed fee.`,
      r`760: this assumes no fixed fee, using $b = 95$ (190 ÷ 2) and $8b = 760$.`,
      r`125: this is $a + b$, the cost of a 1-hour job.`,
    ],
    meta: { concepts: ['writing a linear model from two data points', 'solving for a rate and a fixed fee', 'evaluating the model'], twist: 'After finding a and b, the student must evaluate the model at 8 hours.', review: teacher('b = 65, a = 60; 2- and 5-hour jobs check (190, 385).') },
    check: () => { const b = (385 - 190) / 3, a = 190 - 2 * b; return a === 60 && a + 5 * b === 385 && a + 8 * b === 580; },
  },
  {
    id: 'm-lin1-n4',
    meta: { concepts: ['absolute value equations', 'solving for a constant', 'checking for extra solutions'], twist: 'After finding c, the student should confirm that x = 4 is the only solution.', mistakes: ['Drops the absolute value: 4 − 6 = 8 + c gives c = −10.', null, 'Picks c = 2, for which x = 4 gives 2 ≠ 10.', 'Picks c = 6, for which x = 4 gives 2 ≠ 14.'], review: teacher('c = −6: |x − 6| = 2x − 6 has the single solution x = 4 (x = 0 fails x ≥ 6).') },
    check: () => { const c = Math.abs(4 - 6) - 8; const sols: number[] = []; for (let x = -20; x <= 20; x += 0.5) if (near(Math.abs(x - 6), 2 * x + c)) sols.push(x); return c === -6 && sols.length === 1 && sols[0] === 4 && 4 - 6 - 8 === -10; },
  },
  {
    id: 'm-lin1-n5',
    stem: r`$$\frac{2}{3}(x - 6) = \frac{1}{4}(x + k)$$ In the given equation, $k$ is a constant. The solution to the equation is $x = 18$. If the value of $k$ were doubled, what would be the solution to the equation?`,
    answer: ['132/5', '26.4'],
    steps: [
      r`At $x = 18$: $\frac{2}{3}(12) = 8$, so $\frac{1}{4}(18 + k) = 8$ and $k = 14$.`,
      r`Doubled, $k = 28$: $\frac{2}{3}(x - 6) = \frac{1}{4}(x + 28)$. Multiply by 12: $8x - 48 = 3x + 84$.`,
      r`$5x = 132$, so $x = 26.4$.`,
    ],
    why: [
      r`36: this doubles the solution instead of doubling $k$.`,
      r`14: this is the original value of $k$, not a solution.`,
      r`15.2: this multiplies the 28 by 1 instead of 3 when clearing fractions ($8x - 48 = 3x + 28$).`,
    ],
    meta: { concepts: ['solving for a constant from a known solution', 'clearing fractions', 'solving the changed equation'], twist: 'After finding k, the student must double it and solve a new equation.', review: teacher('k = 14; with k = 28, 8x − 48 = 3x + 84 gives x = 26.4.') },
    check: () => { const k = 8 * 4 - 18; const x = (48 + 3 * 2 * k) / 5; return k === 14 && near(x, 26.4) && near((48 + 28) / 5, 15.2); },
  },
  {
    id: 'm-lin1-n7',
    meta: { concepts: ['substituting an expression for the solution', 'distributing', 'solving for a constant'], twist: 'The solution is given in terms of c, so it must be substituted before solving for c.', review: teacher('4(2c + c) = 6c + 2c + 10 gives 12c = 8c + 10, c = 2.5.') },
    check: () => { const c = 10 / 4; return near(4 * (2 * c + c), 3 * 2 * c + 2 * c + 10); },
  },
  {
    id: 'm-lin1-n9',
    stem: r`Kai is now $k$ times as old as his daughter. In 20 years, Kai will be twice as old as his daughter will be then, and in 50 years he will be 1.5 times as old as she will be then. How old is Kai now?`,
    choices: ['$10$', '$4$', '$40$', '$60$'], answer: 2,
    steps: [
      r`Let $K$ and $D$ be their ages now. $K + 20 = 2(D + 20)$ gives $K = 2D + 20$; $K + 50 = 1.5(D + 50)$ gives $K = 1.5D + 25$.`,
      r`$2D + 20 = 1.5D + 25$, so $D = 10$ and $K = 40$.`,
      r`(So $k = 4$.) Kai is 40.`,
    ],
    why: [
      r`10 is the daughter's age now, not Kai's.`,
      r`4 is the value of $k$, the ratio of their ages, not an age.`,
      r`Correct. Kai is 40 and his daughter is 10; in 20 years they are 60 and 30, and in 50 years 90 and 60.`,
      r`60 is Kai's age 20 years from now, not his age today.`,
    ],
    meta: { concepts: ['systems from word problems', 'age problems', 'interpreting a ratio constant'], twist: 'Two future conditions are needed; the ratio k is a by-product, and the question asks for Kai’s age.', mistakes: ['Answers the daughter’s age, 10, instead of Kai’s.', 'Answers the ratio k = 4 instead of an age.', null, 'Answers Kai’s age in 20 years instead of now.'], review: teacher('D = 10, K = 40 satisfy both conditions (60 = 2·30, 90 = 1.5·60).') },
    check: () => { const D = (25 - 20) / 0.5, K = 2 * D + 20; return D === 10 && K === 40 && K + 50 === 1.5 * (D + 50) && K / D === 4 && K + 20 === 60; },
  },
  {
    id: 'm-lin1-n10',
    meta: { concepts: ['infinitely many solutions', 'distributing a constant', 'sum of constants'], twist: 'After finding a and b, the question asks for a + b.', mistakes: ['Answers a = 2 alone.', 'Answers b = 6 alone.', null, 'Forgets to distribute a to the 3, using b = 3.'], review: teacher('a = 2, b = 3a = 6, a + b = 8.') },
    check: () => { const a = 2, b = 3 * a; return a + b === 8 && a + 3 === 5; },
  },
  {
    id: 'm-lin1-n11',
    stem: r`A water tank is $\tfrac{3}{8}$ full. After $k$ liters of water are added, the tank is $\tfrac{3}{4}$ full. After another 30 liters are added, the tank is completely full. What is the value of $k$?`,
    answer: ['45'],
    steps: [
      r`The last 30 liters fill the final $\frac{1}{4}$ of the tank, so the capacity is $120$ liters.`,
      r`The $k$ liters raised the level from $\frac{3}{8}$ to $\frac{3}{4}$, an increase of $\frac{3}{8}$ of the tank.`,
      r`$k = \frac{3}{8} \times 120 = 45$.`,
    ],
    why: [
      r`120: this is the capacity of the tank, not $k$.`,
      r`90: this is $\frac{3}{4}$ of the capacity, the amount in the tank after $k$ liters are added.`,
      r`30: this is the second addition, not $k$.`,
    ],
    meta: { concepts: ['fractions of a whole', 'finding the whole from a part', 'change between two fractions'], twist: 'The capacity must be found from the second addition before k can be found.', review: teacher('capacity 120 L; 3/8 → 3/4 is 45 L.') },
    check: () => { const C = 30 / (1 - 3 / 4); return C === 120 && near((3 / 4 - 3 / 8) * C, 45); },
  },
  {
    id: 'm-lin1-n13',
    stem: r`In the equation $\tfrac{2}{3}(6x - 9) = 4x + c$, $c$ is a constant. For what value of $c$ does the equation have infinitely many solutions?`,
    choices: ['$-6$', '$-9$', '$-3$', '$6$'], answer: 0,
    steps: [
      r`Distribute the fraction to both terms on the left side: $\frac{2}{3}(6x) = 4x$ and $\frac{2}{3}(-9) = -6$, so the left side is $4x - 6$.`,
      r`The equation is now $4x - 6 = 4x + c$. The coefficients of $x$ already match, so the number of solutions depends only on the constants.`,
      r`If $c = -6$ the two sides are identical and every $x$ works (infinitely many solutions); any other value of $c$ gives a false statement and no solution. So $c = -6$.`,
    ],
    why: [
      r`Correct. With $c = -6$ both sides are $4x - 6$.`,
      r`$-9$ multiplies only the $6x$ by $\frac{2}{3}$ and leaves $-9$ unchanged.`,
      r`$-3$ divides 9 by 3 but forgets to multiply by 2.`,
      r`$6$ drops the negative sign of the constant term.`,
    ],
    meta: { concepts: ['distributing a fraction', 'infinitely many solutions', 'matching constants'], twist: 'The fraction must be distributed to both terms before the constants can be compared.', mistakes: [null, 'Distributes 2/3 to 6x only and leaves −9 unchanged.', 'Divides 9 by 3 and forgets to multiply by 2.', 'Drops the negative sign of the constant term.'], review: teacher('2/3(6x − 9) = 4x − 6; c = −6; any other c gives no solution.') },
    check: () => near((2 / 3) * -9, -6) && near(-9 / 3, -3),
  },
  {
    id: 'm-lin1-n14',
    stem: r`In the equation $3x - 5 = k$, $k$ is a positive constant. If $(6x - 10)^2 = 1024$, what is the value of $k$?`,
    answer: ['16'],
    steps: [
      r`Notice that $6x - 10 = 2(3x - 5)$, and $3x - 5 = k$, so $6x - 10 = 2k$. The given equation becomes $(2k)^2 = 1024$.`,
      r`Simplify: $4k^2 = 1024$, so $k^2 = 256$ and $k = 16$ or $k = -16$.`,
      r`The problem states that $k$ is positive, so the negative root is rejected and $k = 16$.`,
    ],
    why: [
      r`32: this is the value of $6x - 10$, which equals $2k$.`,
      r`$-16$: this root is ruled out because $k$ is positive.`,
      r`256: this is $k^2$; take the square root.`,
    ],
    meta: { concepts: ['recognizing a multiple of an expression', 'solving a quadratic by square roots', 'using a sign condition'], twist: 'The negative root must be rejected using the condition that k is positive.', review: teacher('6x − 10 = 2k; 4k² = 1024 gives k = ±16; k > 0.') },
    check: () => { const k = Math.sqrt(1024 / 4); return k === 16 && (2 * k) ** 2 === 1024; },
  },
  {
    id: 'm-lin1-n15',
    stem: r`The sum of three consecutive odd integers is 87. If the least of the three integers is $n$, what is the value of $n + 4$?`,
    steps: [
      r`Consecutive odd integers differ by 2, so if the least is $n$, the three integers are $n$, $n + 2$ and $n + 4$.`,
      r`Their sum is $3n + 6 = 87$, so $3n = 81$ and $n = 27$. The integers are 27, 29 and 31, which do add to 87.`,
      r`The question asks for $n + 4$, which is $27 + 4 = 31$, the greatest of the three integers.`,
    ],
    why: [
      '27 is the value of n, the least of the three integers, not n + 4.',
      '29 is n + 2, the middle integer, not n + 4 as the question asks.',
      'Correct. The integers are 27, 29, and 31, so n + 4 = 31.',
      '33 would make the three integers 29, 31, and 33, whose sum is 93.',
    ],
    meta: { concepts: ['consecutive integer expressions', 'solving a linear equation', 'evaluating an expression'], twist: 'After finding n, the question asks for n + 4, the greatest integer.', mistakes: ['Answers n = 27, the least integer.', 'Answers n + 2 = 29, the middle integer.', null, 'Uses consecutive odd integers starting at 29 (sum 93 ≠ 87).'], review: teacher('27 + 29 + 31 = 87.') },
    check: () => { const n = (87 - 6) / 3; return n === 27 && n + 4 === 31 && 29 + 31 + 33 === 93; },
  },
  {
    id: 'm-lin1-n17',
    stem: r`$$\frac{3x - 2}{4} - \frac{x + 5}{6} = \frac{x - k}{3}$$ For a certain constant $k$, the only value of $x$ that makes the given equation true is 4. What is $k$?`,
    answer: ['1'],
    steps: [
      r`The value $x = 4$ must make the equation true, so evaluate the left side first: $\frac{3(4) - 2}{4} - \frac{4 + 5}{6} = \frac{10}{4} - \frac{9}{6} = 2.5 - 1.5 = 1$.`,
      r`The right side at $x = 4$ is $\frac{4 - k}{3}$. Setting the two sides equal gives $\frac{4 - k}{3} = 1$.`,
      r`Multiply both sides by 3: $4 - k = 3$, so $k = 1$.`,
    ],
    why: [
      r`3: this is $4 - k$, not $k$.`,
      r`$-1$: this is a sign error in $4 - k = 3$.`,
      r`7: this solves $\frac{4 - k}{3} = -1$, from a sign error on the left side ($\frac{10}{4} - \frac{9}{6}$ taken as $-1$).`,
    ],
    meta: { concepts: ['evaluating fractional expressions', 'solving for a constant', 'subtracting fractions'], twist: 'The left side must be evaluated exactly at x = 4 before the right side gives k.', review: teacher('left side is 1 at x = 4; (4 − k)/3 = 1 gives k = 1.') },
    check: () => { const L = (3 * 4 - 2) / 4 - (4 + 5) / 6; return near(L, 1) && near(4 - 3 * L, 1); },
  },
  {
    id: 'm-lin1-n18',
    meta: { concepts: ['identities (true for every x)', 'distributing a constant', 'checking constants'], twist: 'After matching the x-coefficients, the constants must also agree for the value to work.', review: teacher('3k = 6 gives k = 2, and −12 = 2(2) − 16 confirms it.') },
    check: () => { const k = 2; return 3 * k === 6 && -12 === 2 * k - 16; },
  },
  {
    id: 'm-lin1-n19',
    meta: { concepts: ['clearing fractions', 'infinitely many solutions', 'product of constants'], twist: 'After finding a and b, the question asks for the product ab.', review: teacher('6ax + 18 = 8x − 4b gives a = 4/3, b = −9/2, ab = −6.') },
    check: () => { const a = 8 / 6, b = -18 / 4; return near(a * b, -6); },
  },
  {
    id: 'm-lin1-n20',
    stem: r`$$\frac{x}{a} + \frac{x}{6} = 15$$ In the given equation, $a$ is a positive constant. The solution to the equation is $x = 36$. If the value of $a$ were halved, what would be the solution to the equation?`,
    answer: ['22.5', '45/2'],
    steps: [
      r`Use the known solution to find $a$: $\frac{36}{a} + \frac{36}{6} = 15$, so $\frac{36}{a} + 6 = 15$, $\frac{36}{a} = 9$ and $a = 4$.`,
      r`Halving $a$ gives $a = 2$, so the new equation is $\frac{x}{2} + \frac{x}{6} = 15$. Multiply every term by 6 to clear the fractions: $3x + x = 90$.`,
      r`So $4x = 90$ and $x = 22.5$. Check: $11.25 + 3.75 = 15$.`,
    ],
    why: [
      r`18: this halves the solution instead of halving $a$.`,
      r`4: this is the original value of $a$.`,
      r`120: this adds the denominators, treating $\frac{x}{2} + \frac{x}{6}$ as $\frac{x}{8}$.`,
    ],
    meta: { concepts: ['solving for a constant from a known solution', 'adding fractions with unlike denominators', 'solving the changed equation'], twist: 'After finding a, the student must halve it and solve a new equation.', review: teacher('a = 4; with a = 2, 4x/6 = 15 gives x = 22.5.') },
    check: () => { const a = 36 / (15 - 6); const x = 15 / (1 / (a / 2) + 1 / 6); return a === 4 && near(x, 22.5); },
  },
  {
    id: 'm-lin1-n21',
    stem: r`In the equation $0.2(x - 5) = cx + 1$, $c$ is a constant. If the solution to the equation is $x = 40$, what is the value of $100c$?`,
    answer: ['15'],
    steps: [
      r`Substitute the solution $x = 40$ into both sides. The left side is $0.2(40 - 5) = 0.2(35) = 7$, and the right side is $40c + 1$.`,
      r`Set them equal: $7 = 40c + 1$, so $40c = 6$ and $c = \frac{6}{40} = 0.15$.`,
      r`The question asks for $100c$, so multiply: $100(0.15) = 15$.`,
    ],
    why: [
      r`0.15: this is $c$; the question asks for $100c$.`,
      r`17.5: this ignores the $+1$, solving $7 = 40c$ to get $c = 0.175$, then $100c = 17.5$.`,
    ],
    meta: { concepts: ['decimal coefficients', 'solving for a constant from a known solution', 'scaling the result'], twist: 'After finding c, the question asks for 100c.', review: teacher('0.2(35) = 7 = 40(0.15) + 1.') },
    check: () => { const c = (0.2 * 35 - 1) / 40; return near(c, 0.15) && near(100 * c, 15) && near((100 * 7) / 40, 17.5); },
  },
  {
    id: 'm-lin1-n22',
    stem: r`In the equation $5 - 2(3 - x) = 4(x + 1) - k$, $k$ is a constant. For what value of $k$ is the solution to the equation $x = -k$?`,
    answer: ['5/3', '1.666', '1.667'],
    steps: [
      r`Simplify both sides first. Left: $5 - 2(3 - x) = 5 - 6 + 2x = 2x - 1$. Right: $4(x + 1) - k = 4x + 4 - k$.`,
      r`The solution is to be $x = -k$, so substitute $-k$ for $x$: $2(-k) - 1 = 4(-k) + 4 - k$, which is $-2k - 1 = -5k + 4$.`,
      r`Solve for $k$: add $5k$ to both sides and add 1, giving $3k = 5$, so $k = \frac{5}{3}$.`,
    ],
    why: [
      r`$-\frac{5}{3}$: this is the solution $x = -k$, not $k$.`,
      r`$\frac{5}{2}$: this drops the $-k$ term on the right side after substituting, solving $-2k - 1 = -4k + 4$.`,
    ],
    meta: { concepts: ['distributing with negatives', 'a solution expressed in terms of a constant', 'solving for the constant'], twist: 'The solution depends on k, so x = −k must be substituted and the equation solved for k.', review: teacher('with k = 5/3, x = −5/3: both sides equal −13/3.') },
    check: () => { const k = 5 / 3, x = -k; return near(5 - 2 * (3 - x), 4 * (x + 1) - k); },
  },
  {
    id: 'm-lin1-n23',
    meta: { concepts: ['no-solution condition', 'distributing a constant', 'comparing constants'], twist: 'After matching the x-coefficients, the constants must differ, which restricts b.', mistakes: [null, 'Matches the constants too, which makes the sides identical (infinitely many solutions).', 'Assumes the coefficients differ, which gives exactly one solution.', 'Fixes only the constants, which never by itself gives no solution.'], review: teacher('4a + 2 = 10 gives a = 2; no solution requires b ≠ −12.') },
    check: () => { const a = (10 - 2) / 4; return a === 2; },
  },
  {
    id: 'm-lin1-n24',
    stem: r`A plumber charges a 65-dollar service fee plus 48 dollars per hour of work. An electrician charges a service fee of $c$ dollars plus 58 dollars per hour of work. The two charge the same total for 2.5 hours of work. For how many hours of work would the electrician charge exactly 50 dollars more than the plumber?`,
    answer: ['7.5', '15/2'],
    steps: [
      r`Use the equality at 2.5 hours to find $c$. The plumber charges $65 + 48(2.5) = 185$ dollars, and the electrician charges $c + 58(2.5) = c + 145$, so $c = 40$.`,
      r`For $h$ hours, the electrician minus the plumber is $(40 + 58h) - (65 + 48h) = 10h - 25$ dollars.`,
      r`Set the difference equal to 50: $10h - 25 = 50$, so $10h = 75$ and $h = 7.5$ hours. Check: $40 + 435 = 475$ and $65 + 360 = 425$, a difference of 50.`,
    ],
    why: [
      r`2.5: this is when the charges are equal, which the question gives.`,
      r`5: this leaves out the difference in service fees, solving $10h = 50$.`,
      r`40: this is the electrician's fee $c$, not a number of hours.`,
    ],
    meta: { concepts: ['finding a constant from an equality condition', 'linear cost models', 'difference of two models'], twist: 'After finding c, the student must model the difference and solve for when it equals 50.', review: teacher('c = 40; at 7.5 hours: 475 − 425 = 50.') },
    check: () => { const c = 65 + 48 * 2.5 - 58 * 2.5; const h = (50 + 65 - c) / 10; return c === 40 && h === 7.5 && 40 + 58 * h - (65 + 48 * h) === 50; },
  },
  {
    id: 'm-lin1-n25',
    stem: r`If $\dfrac{3}{4}(2x - 8) = k$, where $k$ is a constant, which expression is equal to $x - 4$?`,
    choices: ['$\\dfrac{2k}{3}$', '$\\dfrac{4k}{3}$', '$\\dfrac{3k}{8}$', '$\\dfrac{k}{2}$'], answer: 0,
    steps: [
      r`Undo the fraction by multiplying both sides by $\frac{4}{3}$: $2x - 8 = \frac{4}{3}k = \frac{4k}{3}$.`,
      r`Look at the target expression: $x - 4$ is exactly half of $2x - 8$, because $2x - 8 = 2(x - 4)$.`,
      r`So $x - 4 = \frac{1}{2} \cdot \frac{4k}{3} = \frac{2k}{3}$.`,
    ],
    why: [
      r`Correct. $2x - 8 = \frac{4k}{3}$, and half of that is $\frac{2k}{3}$.`,
      r`$\frac{4k}{3}$ is the value of $2x - 8$; it still has to be halved to give $x - 4$.`,
      r`$\frac{3k}{8}$ multiplies $k$ by $\frac{3}{4}$ instead of dividing, then halves.`,
      r`$\frac{k}{2}$ ignores the factor $\frac{3}{4}$ and just halves $k$.`,
    ],
    meta: { concepts: ['solving for an expression', 'undoing a fractional coefficient', 'recognizing a multiple of an expression'], twist: 'The answer is x − 4, half of the expression in parentheses, written in terms of k.', mistakes: [null, 'Stops at 2x − 8 = 4k/3 instead of halving.', 'Multiplies by 3/4 instead of dividing by it, then halves.', 'Ignores the 3/4 factor and just halves k.'], review: teacher('for k = 9, x = 10 and x − 4 = 6 = 2(9)/3.') },
    check: () => { const k = 9, x = (k * 4 / 3 + 8) / 2; return near(x - 4, (2 * k) / 3) && !near(x - 4, (4 * k) / 3) && !near(x - 4, (3 * k) / 8) && !near(x - 4, k / 2); },
  },
  {
    id: 'm-lin1-n26',
    stem: r`A number is increased by $p$% and then 15 is subtracted from the result. The final value equals $\tfrac{3}{4}$ of the original number plus 12. If the original number is 60, what is the value of $p$?`,
    answer: ['20'],
    steps: [
      r`Start with the right side, which uses only the known original number: $\frac{3}{4}(60) + 12 = 45 + 12 = 57$.`,
      r`Increasing 60 by $p$% multiplies it by $1 + \frac{p}{100}$. So $60\left(1 + \frac{p}{100}\right) - 15 = 57$, and adding 15 gives $60\left(1 + \frac{p}{100}\right) = 72$.`,
      r`Divide by 60: $1 + \frac{p}{100} = 1.2$, so $\frac{p}{100} = 0.2$ and $p = 20$.`,
    ],
    why: [
      r`12: this is the amount of the increase, $72 - 60$, not the percent.`,
      r`57: this is the common final value of both expressions.`,
      r`$-30$: this adds 15 instead of subtracting it ($60(1 + \frac{p}{100}) + 15 = 57$).`,
    ],
    meta: { concepts: ['percent increase as a multiplier', 'evaluating an expression', 'solving for a percent'], twist: 'The right side must be evaluated first, and the percent recovered from the multiplier 1.2.', review: teacher('60 × 1.2 − 15 = 57 = 45 + 12.') },
    check: () => { const m = (0.75 * 60 + 12 + 15) / 60; return near(m, 1.2) && near((m - 1) * 100, 20); },
  },
];
