import type { RawQuestion } from '@/lib/types';
import { r, near, roots, sameSet, ints } from './kit';

/** Solve a 2×2 linear system a1x+b1y=c1, a2x+b2y=c2 by Cramer's rule (null when not unique). */
const solve2 = (a1: number, b1: number, c1: number, a2: number, b2: number, c2: number): [number, number] | null => {
  const det = a1 * b2 - a2 * b1;
  if (Math.abs(det) < 1e-12) return null;
  return [(c1 * b2 - c2 * b1) / det, (a1 * c2 - a2 * c1) / det];
};

/** Math · Algebra — systems of linear equations, linear inequalities */
export const MATH_ALG_2: RawQuestion[] = [
  {
    id: 'm-sys-01', skill: 'sys', sub: 'Elimination', d: 'M',
    stem: r`$$3x + 2y = 16$$ $$x - 2y = 8$$ The solution to the given system of equations is $(x, y)$. What is the value of $y$?`,
    choices: ['$-1$', '$1$', '$5$', '$6$'], answer: 0,
    steps: [
      r`Add the equations so the $y$-terms cancel: $4x = 24$, so $x = 6$.`,
      r`Substitute into the second equation: $6 - 2y = 8$, so $-2y = 2$.`,
      r`$y = -1$.`,
    ],
    why: [
      r`Correct. Check in the first equation: $3(6) + 2(-1) = 16$.`,
      r`$1$ has the wrong sign. From $6 - 2y = 8$, $-2y = 2$, so $y$ is negative.`,
      r`$5$ is the value of $x + y$ (that is, $6 + (-1)$), not the value of $y$ alone.`,
      r`$6$ is the value of $x$. The question asks for $y$.`,
    ],
    concept: 'Elimination: add or subtract equations so one variable cancels.',
    strategy: 'The y-coefficients are already opposites (+2 and −2), so add the equations immediately.',
    trap: 'Solving for x and selecting it, even though the question asks for y.',
    remember: 'Circle which variable the question wants before you start solving.',
    desmos: 'Type both equations; the intersection point (6, −1) is the solution.',
    check: () => { const s = solve2(3, 2, 16, 1, -2, 8)!; return near(s[0], 6) && near(s[1], -1); },
  },
  {
    id: 'm-sys-02', skill: 'sys', sub: 'Systems from word problems', d: 'M',
    stem: r`A café sold a total of 84 small and large drinks. Small drinks cost \$3.25 each and large drinks cost \$4.50 each. If the total revenue from these drinks was \$320.50, how many large drinks were sold?`,
    answer: ['38'],
    steps: [
      r`Let $s$ and $l$ be the numbers of small and large drinks: $s + l = 84$ and $3.25s + 4.50l = 320.50$.`,
      r`Substitute $s = 84 - l$: $3.25(84 - l) + 4.50l = 320.50$, so $273 + 1.25l = 320.50$.`,
      r`$1.25l = 47.50$.`,
      r`$l = 38$.`,
    ],
    why: [
      r`46 — this is the number of small drinks ($84 - 38$). The question asks for large drinks.`,
      r`71 — this divides the total revenue by \$4.50 as if every drink were large, ignoring the count of 84.`,
    ],
    concept: 'Two unknown quantities with a total count and a total value give a system of two linear equations.',
    strategy: 'Pretend all 84 drinks were small (\$273). Each large drink adds \$1.25, and the extra \$47.50 ÷ \$1.25 = 38 large drinks.',
    trap: 'Solving for the wrong variable or mixing up which price goes with which size.',
    remember: 'The "assume all are the cheaper item" shortcut solves count-and-value problems in two steps.',
    check: () => { const s = solve2(1, 1, 84, 3.25, 4.5, 320.5)!; return near(s[1], 38) && near(s[0], 46); },
  },
  {
    id: 'm-sys-03', skill: 'sys', sub: 'Substitution', d: 'M',
    stem: r`$$y = 2x - 3$$ $$4x - 3y = 1$$ Which ordered pair $(x, y)$ is the solution to the given system of equations?`,
    choices: ['$(1, -1)$', '$(-4, -11)$', '$(5, 7)$', '$(4, 5)$'], answer: 3,
    steps: [
      r`Substitute $y = 2x - 3$ into the second equation: $4x - 3(2x - 3) = 1$.`,
      r`Distribute: $4x - 6x + 9 = 1$, so $-2x = -8$ and $x = 4$.`,
      r`Then $y = 2(4) - 3 = 5$, so the solution is $(4, 5)$.`,
    ],
    why: [
      r`$(1, -1)$ satisfies $y = 2x - 3$ but not the second equation: $4(1) - 3(-1) = 7$, not 1.`,
      r`$(-4, -11)$ satisfies the first equation, but $4(-4) - 3(-11) = 17$, not 1. It comes from the sign error $-3(-3) = -9$.`,
      r`$(5, 7)$ satisfies the first equation, but $4(5) - 3(7) = -1$, not 1.`,
      r`Correct. $5 = 2(4) - 3$ and $4(4) - 3(5) = 1$.`,
    ],
    concept: 'Substitution: when one equation is already solved for a variable, replace that variable in the other equation.',
    strategy: 'Either substitute, or test each choice in the second equation since all choices already satisfy the first.',
    trap: 'Distributing −3 as −6x − 9 instead of −6x + 9.',
    remember: 'A solution must satisfy both equations. Distractors usually satisfy one.',
    check: () => { const s = solve2(-2, 1, -3, 4, -3, 1)!; return near(s[0], 4) && near(s[1], 5); },
  },
  {
    id: 'm-sys-04', skill: 'sys', sub: 'No solution and infinitely many solutions', d: 'H',
    stem: r`$$ax + 4y = 14$$ $$3x + 6y = 21$$ In the given system of equations, $a$ is a constant. If the system has infinitely many solutions, what is the value of $a$?`,
    answer: ['2'],
    steps: [
      r`Infinitely many solutions means the two equations describe the same line, so one is a constant multiple of the other.`,
      r`Compare the $y$-coefficients and constants: $\dfrac{4}{6} = \dfrac{14}{21} = \dfrac{2}{3}$. The first equation is $\frac{2}{3}$ of the second.`,
      r`So $a = \dfrac{2}{3}(3)$.`,
      r`$a = 2$.`,
    ],
    why: [
      r`4.5 — this sets up the proportion upside down ($\frac{a}{3} = \frac{6}{4}$). The ratio must be taken in the same direction for every pair of coefficients.`,
      r`3 — this makes the $x$-coefficients equal, but then the equations $3x + 4y = 14$ and $3x + 6y = 21$ are different lines that intersect once.`,
    ],
    concept: 'A system has infinitely many solutions when all three ratios match: a₁/a₂ = b₁/b₂ = c₁/c₂.',
    strategy: 'Find the scale factor from the two fully known pairs (4 to 6 and 14 to 21), then apply it to the unknown coefficient.',
    trap: 'Checking only the x and y coefficients. If the constants are not in the same ratio, the lines are parallel and there is no solution.',
    remember: 'Same line: all three ratios equal. Parallel lines: coefficient ratios equal, constant ratio different.',
    check: () => solve2(2, 4, 14, 3, 6, 21) === null && near(2 / 3, 4 / 6) && near(4 / 6, 14 / 21) && solve2(3, 4, 14, 3, 6, 21) !== null,
  },
  {
    id: 'm-sys-05', skill: 'sys', sub: 'No solution and infinitely many solutions', d: 'H',
    stem: r`$$5x - ky = 8$$ $$15x + 6y = 11$$ In the given system of equations, $k$ is a constant. If the system has no solution, what is the value of $k$?`,
    choices: ['$-18$', '$-2$', '$2$', '$18$'], answer: 1,
    steps: [
      r`No solution means the lines are parallel: the coefficients of $x$ and $y$ are proportional, but the constants are not.`,
      r`The $x$-coefficients have ratio $\dfrac{5}{15} = \dfrac{1}{3}$, so $-k = \dfrac{1}{3}(6) = 2$.`,
      r`So $k = -2$. Check the constants: $\dfrac{8}{11} \neq \dfrac{1}{3}$, so the lines are distinct and parallel.`,
      r`Therefore $k = -2$.`,
    ],
    why: [
      r`$-18$ multiplies 6 by 3 instead of dividing ($-k = 18$). The first equation's coefficients are one-third of the second's, not three times.`,
      r`Correct. With $k = -2$ the first equation is $5x + 2y = 8$; tripling gives $15x + 6y = 24$, which contradicts $15x + 6y = 11$.`,
      r`$2$ ignores the negative sign in $-ky$. With $k = 2$ the lines are $5x - 2y = 8$ and $15x + 6y = 11$, which intersect once.`,
      r`$18$ makes both the scaling error and the sign error.`,
    ],
    concept: 'A linear system has no solution when the lines are parallel: a₁/a₂ = b₁/b₂ ≠ c₁/c₂.',
    strategy: 'Scale the first equation to match the x-coefficient of the second (multiply by 3), then compare the y-coefficients.',
    trap: 'Losing the negative sign attached to k.',
    remember: 'The coefficient of y in the first equation is −k, not k.',
    check: () => solve2(5, 2, 8, 15, 6, 11) === null && !near(8 / 11, 1 / 3) && solve2(5, -2, 8, 15, 6, 11) !== null && solve2(5, 18, 8, 15, 6, 11) !== null,
  },
  {
    id: 'm-sys-06', skill: 'sys', sub: 'Elimination', d: 'H',
    stem: r`$$7x + 3y = 31$$ $$3x + 7y = 19$$ If $(x, y)$ is the solution to the given system of equations, what is the value of $x + y$?`,
    answer: ['5'],
    steps: [
      r`Notice the coefficients are swapped. Add the two equations: $10x + 10y = 50$.`,
      r`Divide every term by 10.`,
      r`$x + y = 5$.`,
    ],
    why: [
      r`3 — this is $x - y$, which comes from subtracting the equations ($4x - 4y = 12$) instead of adding them.`,
      r`4 — this is the value of $x$ alone. The question asks for $x + y$.`,
    ],
    concept: 'When a question asks for a combination such as x + y, look for a way to produce that combination directly by adding or subtracting the equations.',
    strategy: 'Add the equations first and see whether the result is a multiple of what you want. Here it is, so you never need x or y individually.',
    trap: 'Solving for x and y separately, which takes longer and creates more chances for error.',
    remember: 'Swapped coefficients (7, 3 and 3, 7) are a signal: adding gives x + y, subtracting gives x − y.',
    check: () => { const s = solve2(7, 3, 31, 3, 7, 19)!; return near(s[0] + s[1], 5); },
  },
  {
    id: 'm-sys-07', skill: 'sys', sub: 'Systems from word problems', d: 'H',
    stem: r`A lab technician needs 30 milliliters of a 42% acid solution. The technician will make it by mixing a 30% acid solution with a 50% acid solution. How many milliliters of the 50% acid solution are needed?`,
    answer: ['18'],
    steps: [
      r`Let $x$ and $y$ be the milliliters of the 30% and 50% solutions: $x + y = 30$.`,
      r`Acid amounts: $0.30x + 0.50y = 0.42(30) = 12.6$.`,
      r`Substitute $x = 30 - y$: $9 - 0.30y + 0.50y = 12.6$, so $0.20y = 3.6$.`,
      r`$y = 18$.`,
    ],
    why: [
      r`12 — this is the amount of the 30% solution. The question asks for the 50% solution.`,
      r`15 — this assumes equal amounts of each. Equal amounts would give a 40% solution, not 42%.`,
    ],
    concept: 'Mixture systems use one equation for total volume and one for the amount of pure substance.',
    strategy: 'Use distances on a number line: 42 is 12 above 30 and 8 below 50, so the amounts are in the ratio 8 : 12 (30% : 50%), i.e. 12 mL and 18 mL.',
    trap: 'Reporting the amount of the other solution.',
    remember: 'The target (42%) is closer to 50%, so more of the 50% solution is needed. Use that to sanity-check.',
    check: () => { const s = solve2(1, 1, 30, 0.3, 0.5, 12.6)!; return near(s[1], 18); },
  },
  {
    id: 'm-sys-08', skill: 'sys', sub: 'No solution and infinitely many solutions', d: 'V',
    stem: r`$$(a - 2)x + 3y = 6$$ $$4x + (a + 2)y = 12$$ In the given system of equations, $a$ is a constant. For which of the following values of $a$ does the system have no solution?`,
    choices: [r`$-4$ only`, r`$4$ only`, r`$-4$ and $4$`, 'There is no such value of $a$.'], answer: 0,
    steps: [
      r`The lines are parallel or identical when the coefficients are proportional: $(a - 2)(a + 2) = 3 \cdot 4$, so $a^2 - 4 = 12$ and $a = \pm 4$.`,
      r`Test $a = 4$: the equations are $2x + 3y = 6$ and $4x + 6y = 12$. The second is exactly twice the first, so they are the same line: infinitely many solutions.`,
      r`Test $a = -4$: the equations are $-6x + 3y = 6$ and $4x - 2y = 12$, which simplify to $-2x + y = 2$ and $-2x + y = -6$. Same left side, different constants: parallel lines.`,
      r`Only $a = -4$ gives no solution.`,
    ],
    why: [
      r`Correct. Only $a = -4$ produces two distinct parallel lines.`,
      r`For $a = 4$ the two equations describe the same line, which means infinitely many solutions rather than none.`,
      r`Both values make the coefficients proportional, but $a = 4$ also makes the constants proportional, giving infinitely many solutions.`,
      r`A value does exist: $a = -4$ makes the lines parallel and distinct.`,
    ],
    concept: 'Proportional x- and y-coefficients make lines parallel or identical. The constants decide which.',
    strategy: 'Find every value that makes the coefficients proportional, then test each one in the full system to separate "no solution" from "infinitely many."',
    trap: 'Stopping after a² = 16 and choosing both values without checking the constants.',
    remember: 'Proportional coefficients are necessary for no solution, but you must still check that the constants break the pattern.',
    check: () => {
      const kind = (a: number) => {
        if (solve2(a - 2, 3, 6, 4, a + 2, 12)) return 'one';
        // proportional coefficients: identical if constants are in the same ratio
        return near((a - 2) * 12, 4 * 6) && near(3 * 12, (a + 2) * 6) ? 'inf' : 'none';
      };
      return kind(-4) === 'none' && kind(4) === 'inf' && kind(0) === 'one' && kind(3) === 'one';
    },
  },
  {
    id: 'm-sys-09', skill: 'sys', sub: 'Graphical solutions', d: 'V',
    stem: r`In the $xy$-plane, the lines $y = 2x + k$ and $y = -x + 3k$ intersect at a point with an $x$-coordinate of 4, where $k$ is a constant. What is the $y$-coordinate of the point of intersection?`,
    answer: ['14'],
    steps: [
      r`At the intersection the $y$-values are equal: $2x + k = -x + 3k$.`,
      r`Substitute $x = 4$: $8 + k = -4 + 3k$, so $12 = 2k$ and $k = 6$.`,
      r`Use either line: $y = 2(4) + 6$.`,
      r`$y = 14$.`,
    ],
    why: [
      r`6 — this is the value of $k$. The question asks for the $y$-coordinate of the intersection point.`,
      r`8 — this is $2x$ without adding $k$.`,
      r`12 — this is the value of $2k$, an intermediate step.`,
    ],
    concept: 'At an intersection point, both equations give the same y for the same x. Known coordinates can be used to solve for an unknown constant.',
    strategy: 'Set the right sides equal, substitute the known x to find k, then compute y. Verify with the second line: −4 + 18 = 14.',
    trap: 'Stopping once k is found.',
    remember: 'Finding the parameter is usually the middle of the problem, not the end.',
    check: () => { const k = roots((kk) => 2 * 4 + kk - (-4 + 3 * kk), -100, 100); return sameSet(k, [6]) && near(2 * 4 + k[0], 14) && near(-4 + 3 * k[0], 14); },
  },
  {
    id: 'm-sys-10', skill: 'sys', sub: 'Substitution', d: 'V',
    stem: r`$$3x - 2y = 4k + 4$$ $$x + y = k - 3$$ In the given system of equations, $k$ is a constant. If the solution $(x, y)$ to the system satisfies $x = 2y$, what is the value of $k$?`,
    choices: ['$-4$', '$-3$', '$-2$', '$3$'], answer: 1,
    steps: [
      r`Substitute $x = 2y$ into the first equation: $6y - 2y = 4k + 4$, so $4y = 4k + 4$ and $y = k + 1$.`,
      r`Substitute $x = 2y$ into the second equation: $3y = k - 3$.`,
      r`Combine: $3(k + 1) = k - 3$, so $3k + 3 = k - 3$ and $2k = -6$.`,
      r`$k = -3$.`,
    ],
    why: [
      r`$-4$ is the value of $x$ in the solution, not $k$.`,
      r`Correct. With $k = -3$: $y = -2$, $x = -4$, and both equations check ($-12 + 4 = -8$ and $-4 - 2 = -6$).`,
      r`$-2$ is the value of $y$ in the solution, not $k$.`,
      r`$3$ has the wrong sign; it comes from solving $2k = 6$ after a sign slip moving terms.`,
    ],
    concept: 'An extra relationship between x and y (such as x = 2y) turns a system with a parameter into a system you can solve for the parameter.',
    strategy: 'Substitute x = 2y into both equations to get two equations in y and k, then eliminate y.',
    trap: 'Solving for x or y and choosing that value. All three numbers appear among the choices.',
    remember: 'When choices include the values of every variable, re-read which one the question asks for.',
    check: () => sameSet(roots((k) => { const s = solve2(3, -2, 4 * k + 4, 1, 1, k - 3)!; return s[0] - 2 * s[1]; }, -50, 50), [-3]),
  },
  {
    id: 'm-sys-11', skill: 'sys', sub: 'Graphical solutions', d: 'V',
    stem: r`In the $xy$-plane, line $m$ passes through the points $(0, 5)$ and $(4, -3)$, and line $n$ passes through the points $(-2, -7)$ and $(1, 2)$. If lines $m$ and $n$ intersect at the point $(x, y)$, what is the value of $x + y$?`,
    answer: ['3.8', '19/5'],
    steps: [
      r`Line $m$: slope $\dfrac{-3 - 5}{4 - 0} = -2$ and $y$-intercept 5, so $y = -2x + 5$.`,
      r`Line $n$: slope $\dfrac{2 - (-7)}{1 - (-2)} = 3$. Using $(1, 2)$: $2 = 3 + b$, so $b = -1$ and $y = 3x - 1$.`,
      r`Set equal: $-2x + 5 = 3x - 1$, so $5x = 6$ and $x = 1.2$. Then $y = 3(1.2) - 1 = 2.6$.`,
      r`$x + y = 1.2 + 2.6 = 3.8$.`,
    ],
    why: [
      r`1.2 — this is only the $x$-coordinate of the intersection.`,
      r`2.6 — this is only the $y$-coordinate of the intersection.`,
      r`4 — this comes from using $-7$ as the $y$-intercept of line $n$. The intercept is the $y$-value when $x = 0$, which is $-1$.`,
    ],
    concept: 'Build each line from two points (slope, then intercept), then solve the system by setting the expressions for y equal.',
    strategy: 'In Desmos, enter each pair of points in a table or type both equations and click the intersection: (1.2, 2.6).',
    trap: 'Reading a point that is not on the y-axis as the y-intercept.',
    remember: 'Three small problems chained together: two line equations, then one system. Check each link before moving on.',
    desmos: r`Graph $y = -2x + 5$ and $y = 3x - 1$; the intersection is $(1.2, 2.6)$.`,
    check: () => { const s = solve2(2, 1, 5, -3, 1, -1)!; return near(s[0], 1.2) && near(s[1], 2.6) && near(-2 * 4 + 5, -3) && near(3 * -2 - 1, -7); },
  },
  {
    id: 'm-ineq-01', skill: 'ineq', sub: 'Solving inequalities', d: 'M',
    stem: r`Which of the following describes all solutions to the inequality $-3(x - 4) \geq 2x - 8$?`,
    choices: [r`$x \geq 4$`, r`$x \leq -4$`, r`$x \leq 4$`, r`$x \geq -4$`], answer: 2,
    steps: [
      r`Distribute: $-3x + 12 \geq 2x - 8$.`,
      r`Add $3x$ and add $8$ to both sides: $20 \geq 5x$.`,
      r`Divide by 5 (positive, so the direction stays): $4 \geq x$, that is, $x \leq 4$.`,
    ],
    why: [
      r`$x \geq 4$ has the inequality reversed. Test $x = 5$: $-3(1) = -3$ and $2(5) - 8 = 2$; $-3 \geq 2$ is false.`,
      r`$x \leq -4$ has a sign error in the boundary. Test $x = 0$: $12 \geq -8$ is true, yet 0 is not included.`,
      r`Correct. Test $x = 0$: $12 \geq -8$ is true. Test $x = 5$: $-3 \geq 2$ is false. The boundary is 4.`,
      r`$x \geq -4$ includes $x = 5$, which fails the original inequality.`,
    ],
    concept: 'Solve a linear inequality like an equation, but reverse the inequality sign whenever you multiply or divide both sides by a negative number.',
    strategy: 'Move the x-terms to the side where the coefficient ends up positive so you never have to flip the sign.',
    trap: 'Dividing by a negative number without reversing the inequality.',
    remember: 'Test one easy number (like 0) in the original inequality to confirm the direction.',
    check: () => ints(-40, 40).every((i) => { const x = i / 4; return (-3 * (x - 4) >= 2 * x - 8) === (x <= 4); }),
  },
  {
    id: 'm-ineq-02', skill: 'ineq', sub: 'Modeling constraints', d: 'M',
    stem: r`A delivery truck can carry at most 2,400 pounds. The driver and equipment weigh a total of 310 pounds, and each crate weighs 68 pounds. What is the maximum number of crates the truck can carry?`,
    answer: ['30'],
    steps: [
      r`Write the constraint: $310 + 68c \leq 2{,}400$.`,
      r`Subtract 310: $68c \leq 2{,}090$, so $c \leq 30.73\ldots$`,
      r`The number of crates must be a whole number that does not exceed the limit, so round down.`,
      r`The maximum is $30$ crates.`,
    ],
    why: [
      r`31 — rounding $30.73$ up would exceed the weight limit: $310 + 68(31) = 2{,}418$ pounds.`,
      r`35 — this divides 2,400 by 68 without subtracting the 310 pounds for the driver and equipment.`,
    ],
    concept: '"At most" translates to ≤. When the answer must be a whole number, round in the direction that keeps the inequality true.',
    strategy: 'Solve the inequality, then check the nearest whole numbers on each side of the boundary.',
    trap: 'Rounding to the nearest integer instead of rounding down for a maximum.',
    remember: 'Maximum under a limit → round down. Minimum to reach a goal → round up.',
    check: () => Math.max(...ints(0, 100).filter((c) => 310 + 68 * c <= 2400)) === 30,
  },
  {
    id: 'm-ineq-03', skill: 'ineq', sub: 'Compound and absolute value inequalities', d: 'H',
    stem: r`Which of the following describes all values of $x$ that satisfy $-7 < 3 - 2x \leq 9$?`,
    choices: [r`$-5 < x \leq 3$`, r`$-3 \leq x < 5$`, r`$-3 < x \leq 5$`, r`$x \leq -3$ or $x > 5$`], answer: 1,
    steps: [
      r`Subtract 3 from all three parts: $-10 < -2x \leq 6$.`,
      r`Divide all three parts by $-2$ and reverse both inequality signs: $5 > x \geq -3$.`,
      r`Rewrite in increasing order: $-3 \leq x < 5$.`,
    ],
    why: [
      r`This divides by 2 but forgets the negative sign, giving the endpoints with the wrong signs. Test $x = -4$: $3 + 8 = 11$, which is not $\leq 9$.`,
      r`Correct. The endpoint $-3$ is included (it came from $\leq 9$) and 5 is excluded (it came from $-7 <$).`,
      r`The endpoints are right but the inclusion is swapped. At $x = 5$, $3 - 10 = -7$, and $-7 < -7$ is false, so 5 is not included.`,
      r`This is the complement of the solution set. A compound inequality of the form $a < \ldots \leq b$ is an "and" statement, giving an interval.`,
    ],
    concept: 'Operate on all three parts of a compound inequality at once. Dividing by a negative reverses both inequality symbols.',
    strategy: 'After solving, test each endpoint in the original inequality to decide which one is included.',
    trap: 'Reversing the symbols but attaching the "or equal to" to the wrong endpoint.',
    remember: 'The endpoint that came from ≤ stays inclusive even after the flip. Check it by substitution.',
    check: () => ints(-60, 60).every((i) => { const x = i / 4; const v = 3 - 2 * x; return (-7 < v && v <= 9) === (-3 <= x && x < 5); }),
  },
  {
    id: 'm-ineq-04', skill: 'ineq', sub: 'Systems of inequalities', d: 'H',
    stem: r`$$y > 2x - 1$$ $$y \leq -x + 8$$ Which of the following ordered pairs $(x, y)$ is a solution to the given system of inequalities?`,
    choices: ['$(3, 5)$', '$(4, 3)$', '$(2, 6)$', '$(-1, 10)$'], answer: 2,
    steps: [
      r`A solution must make both inequalities true. Test each point.`,
      r`$(3, 5)$: $5 > 5$ is false. $(4, 3)$: $3 > 7$ is false. $(-1, 10)$: $10 > -3$ is true, but $10 \leq 9$ is false.`,
      r`$(2, 6)$: $6 > 3$ is true and $6 \leq 6$ is true.`,
      r`So $(2, 6)$ is a solution.`,
    ],
    why: [
      r`$(3, 5)$ lies exactly on the line $y = 2x - 1$. Because the first inequality is strict ($>$), points on that boundary are not solutions.`,
      r`$(4, 3)$ fails the first inequality: $3$ is not greater than $2(4) - 1 = 7$.`,
      r`Correct. It lies on the boundary of the second inequality, which is allowed because that inequality is $\leq$.`,
      r`$(-1, 10)$ satisfies the first inequality but fails the second: $10$ is not $\leq -(-1) + 8 = 9$.`,
    ],
    concept: 'A solution to a system of inequalities satisfies every inequality. Boundary points count only for ≤ or ≥.',
    strategy: 'Plug in each choice. Pay special attention to points that land exactly on a boundary line.',
    trap: 'Accepting a point on the boundary of a strict inequality, or rejecting a point on the boundary of a non-strict one.',
    remember: 'Strict (<, >): dashed line, boundary excluded. Non-strict (≤, ≥): solid line, boundary included.',
    desmos: 'Type both inequalities; the solution region is where the shading overlaps. Plot each choice as a point to see which is inside.',
    check: () => { const ok = (x: number, y: number) => y > 2 * x - 1 && y <= -x + 8; return ok(2, 6) && !ok(3, 5) && !ok(4, 3) && !ok(-1, 10); },
  },
  {
    id: 'm-ineq-05', skill: 'ineq', sub: 'Modeling constraints', d: 'H',
    stem: r`Maya earns \$12 per hour tutoring and \$15 per hour working at a bookstore. This week she wants to earn at least \$270 and can work no more than 22 hours in total. If Maya tutors for 8 hours, what is the minimum number of whole hours she must work at the bookstore?`,
    answer: ['12'],
    steps: [
      r`Tutoring income: $12 \times 8 = \$96$. She needs at least $270 - 96 = \$174$ from the bookstore.`,
      r`$15b \geq 174$ gives $b \geq 11.6$.`,
      r`She needs a whole number of hours that reaches the goal, so round up to 12. Check the time limit: $8 + 12 = 20 \leq 22$.`,
      r`The minimum is $12$ hours.`,
    ],
    why: [
      r`11 — rounding $11.6$ down gives only \$165 from the bookstore, and $96 + 165 = \$261$ is less than \$270.`,
      r`14 — this is the maximum number of bookstore hours allowed by the 22-hour limit ($22 - 8$), not the minimum needed to reach \$270.`,
    ],
    concept: 'Translate "at least" to ≥ and "no more than" to ≤. A minimum that must be a whole number rounds up.',
    strategy: 'Handle the earnings constraint to get the minimum, then confirm the time constraint does not rule it out.',
    trap: 'Rounding down, or answering with the upper bound from the other constraint.',
    remember: 'Two constraints: one gives the floor (earnings), the other gives the ceiling (hours). The question asked for the floor.',
    check: () => Math.min(...ints(0, 40).filter((b) => 12 * 8 + 15 * b >= 270 && 8 + b <= 22)) === 12,
  },
  {
    id: 'm-ineq-06', skill: 'ineq', sub: 'Compound and absolute value inequalities', d: 'H',
    stem: r`How many integers $x$ satisfy the inequality $|2x - 5| < 7$?`,
    choices: ['$5$', '$6$', '$7$', '$8$'], answer: 1,
    steps: [
      r`$|A| < 7$ means $-7 < A < 7$: so $-7 < 2x - 5 < 7$.`,
      r`Add 5: $-2 < 2x < 12$. Divide by 2: $-1 < x < 6$.`,
      r`The integers strictly between $-1$ and $6$ are $0, 1, 2, 3, 4, 5$.`,
      r`That is $6$ integers.`,
    ],
    why: [
      r`$5$ undercounts, usually by leaving out 0. Zero is an integer and satisfies $|0 - 5| = 5 < 7$.`,
      r`Correct. The integers are 0 through 5 inclusive, which is six values.`,
      r`$7$ includes one endpoint. At $x = 6$, $|12 - 5| = 7$, and $7 < 7$ is false.`,
      r`$8$ includes both endpoints $-1$ and $6$. Each gives an absolute value of exactly 7, which does not satisfy the strict inequality.`,
    ],
    concept: '|A| < k means −k < A < k (an "and" interval). |A| > k means A < −k or A > k.',
    strategy: 'Convert to a compound inequality, solve, then list the integers. Count by listing, not by subtracting.',
    trap: 'Including endpoints of a strict inequality or forgetting that 0 is an integer.',
    remember: 'Number of integers strictly between a and b (both integers) is b − a − 1. Here 6 − (−1) − 1 = 6.',
    check: () => ints(-100, 100).filter((x) => Math.abs(2 * x - 5) < 7).length === 6,
  },
  {
    id: 'm-ineq-07', skill: 'ineq', sub: 'Systems of inequalities', d: 'V',
    stem: r`$$y \leq -2x + 12$$ $$y \geq \tfrac{1}{2}x + 2$$ $$x \geq 0$$ In the $xy$-plane, what is the greatest possible $x$-coordinate of a point $(x, y)$ in the solution set of the given system of inequalities?`,
    answer: ['4'],
    steps: [
      r`A point needs a $y$-value that is at least $\frac{1}{2}x + 2$ and at most $-2x + 12$. That is possible only when $\frac{1}{2}x + 2 \leq -2x + 12$.`,
      r`Solve: $\frac{5}{2}x \leq 10$, so $x \leq 4$.`,
      r`At $x = 4$ both boundaries give $y = 4$, and the point $(4, 4)$ satisfies all three inequalities.`,
      r`The greatest possible $x$-coordinate is $4$.`,
    ],
    why: [
      r`6 — this is the $x$-intercept of $y = -2x + 12$. At $x = 6$ the first inequality requires $y \leq 0$ while the second requires $y \geq 5$, which is impossible.`,
      r`12 — this is the $y$-intercept of the first boundary line, the greatest possible $y$-value, not the greatest $x$-value.`,
    ],
    concept: 'The solution set of a system of inequalities is a region. Extreme coordinates occur at its corners, where boundary lines intersect.',
    strategy: 'Sketch or graph the region. The rightmost corner is where the two slanted boundary lines meet: set them equal.',
    trap: 'Using an intercept of a single boundary line instead of the intersection of the two lines.',
    remember: 'For "greatest/least possible coordinate in a region," check the vertices.',
    desmos: 'Graph the three inequalities. The overlapping region is a triangle with its rightmost vertex at (4, 4).',
    check: () => {
      let best = -Infinity;
      for (let x = 0; x <= 20; x += 0.01) for (let y = -5; y <= 20; y += 0.25) if (y <= -2 * x + 12 + 1e-9 && y >= x / 2 + 2 - 1e-9) best = Math.max(best, x);
      return near(best, 4, 1e-3);
    },
  },
  {
    id: 'm-ineq-08', skill: 'ineq', sub: 'Solving inequalities', d: 'V',
    stem: r`In the inequality $ax + 3 > 2x + 9$, $a$ is a constant. For which of the following values of $a$ is the solution set of the inequality of the form $x < c$, where $c$ is a constant?`,
    choices: [r`All $a > 2$`, r`All $a < 2$`, r`All $a > -2$`, r`All $a < 0$ only`], answer: 1,
    steps: [
      r`Collect the $x$-terms: $ax - 2x > 6$, so $(a - 2)x > 6$.`,
      r`To isolate $x$, divide by $a - 2$. The inequality symbol reverses (from $>$ to $<$) only if $a - 2$ is negative.`,
      r`$a - 2 < 0$ means $a < 2$. Then $x < \dfrac{6}{a - 2}$, which has the form $x < c$.`,
      r`So the solution set has the form $x < c$ for all $a < 2$.`,
    ],
    why: [
      r`If $a > 2$, then $a - 2$ is positive and the symbol does not reverse: the solution is $x > \frac{6}{a-2}$.`,
      r`Correct. For example, $a = 1$ gives $-x > 6$, so $x < -6$.`,
      r`$a > -2$ includes values such as $a = 3$, for which the solution is $x > 6$.`,
      r`This is too restrictive. Values such as $a = 1$ are positive yet still make $a - 2$ negative, so the symbol still reverses.`,
    ],
    concept: 'Dividing an inequality by an expression reverses the symbol exactly when that expression is negative.',
    strategy: 'Isolate x symbolically, then ask what sign the divisor must have to produce the requested direction. Confirm with a test value such as a = 1.',
    trap: 'Thinking the direction depends on the sign of a rather than the sign of a − 2.',
    remember: 'It is the coefficient of x after combining like terms that decides whether the inequality flips.',
    check: () => {
      const formLess = (a: number) => { // solution set is x < c iff large negative x works and large positive x fails
        const f = (x: number) => a * x + 3 > 2 * x + 9;
        return f(-1e6) && !f(1e6);
      };
      return [-5, 0, 1, 1.9].every(formLess) && ![2.1, 3, 10].some(formLess) && !formLess(2);
    },
  },
  {
    id: 'm-ineq-09', skill: 'ineq', sub: 'Systems of inequalities', d: 'V',
    stem: r`$$y < -\tfrac{3}{4}x + 6$$ $$x > 0$$ $$y > 0$$ How many points $(x, y)$ with integer coordinates are in the solution set of the given system of inequalities?`,
    answer: ['17'],
    steps: [
      r`For each positive integer $x$, count the positive integers $y$ that are strictly less than $-\frac{3}{4}x + 6$.`,
      r`$x = 1$: $y < 5.25$, 5 values. $x = 2$: $y < 4.5$, 4 values. $x = 3$: $y < 3.75$, 3 values.`,
      r`$x = 4$: $y < 3$, 2 values (3 itself is excluded). $x = 5$: $y < 2.25$, 2 values. $x = 6$: $y < 1.5$, 1 value. $x = 7$: $y < 0.75$, none.`,
      r`Total: $5 + 4 + 3 + 2 + 2 + 1 = 17$.`,
    ],
    why: [
      r`18 — this counts the point $(4, 3)$, which lies exactly on the boundary line. The inequality is strict, so boundary points are excluded.`,
      r`24 — this is the area of the triangle formed by the line and the axes ($\frac{1}{2} \cdot 8 \cdot 6$), which is not the number of lattice points inside it.`,
    ],
    concept: 'Counting integer solutions of a system means checking each allowed x and counting the y-values strictly inside the region.',
    strategy: 'Work column by column in an organized list. Watch for an x that makes the boundary value an integer: that point is on the line.',
    trap: 'Including the lattice point on the boundary when the inequality is strict.',
    remember: 'When the boundary value is a whole number and the inequality is strict, the count for that column drops by one.',
    check: () => { let n = 0; for (const x of ints(-20, 20)) for (const y of ints(-20, 20)) if (y < -0.75 * x + 6 && x > 0 && y > 0) n++; return n === 17; },
  },
];
