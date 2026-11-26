import type { LessonTutor } from '../types';

const r = String.raw;

/** Tutor layer · Unit 0 Math Toolkit. Written for a student starting from almost nothing. */
export const TUTOR0: Record<string, LessonTutor> = {
  'c0-1': {
    bigIdea: [
      r`Every number has a spot on a long straight road called the number line. Zero sits in the middle, positive numbers go to the right, and negative numbers go to the left. Negative numbers are just “below zero”, like a temperature of $-5$ degrees or owing someone 5 dollars.`,
      r`Adding means walking along the road. Adding a positive number walks right; adding a negative number walks left. Subtracting means “walk the opposite way”, which is why $5 - 8$ is the same as $5 + (-8)$: you end up at $-3$.`,
      r`A fraction is a piece of a whole: $\frac{3}{4}$ means “cut a pizza into 4 equal slices and take 3”. You can only add slices if they are the same size, which is why fractions need a common bottom number before you add them.`,
      r`Finally, math has a fixed order for doing operations, the same way a recipe has an order. If everyone used their own order, the same problem would give different answers. The agreed order is: Parentheses, Exponents, Multiply/Divide, Add/Subtract.`,
    ],
    picture: { title: 'Money in your pocket', t: r`Positive numbers are dollars you have; negative numbers are dollars you owe. Owing 4 dollars, six times over, is owing 24: $(-4)(6) = -24$. But *removing* a debt of 4 dollars six times makes you 24 dollars richer: $(-4)(-6) = 24$. Two negatives cancel into a positive.` },
    words: [
      { term: 'Integer', means: 'A whole number, positive, negative or zero: …, −2, −1, 0, 1, 2, …' },
      { term: 'Numerator / denominator', means: r`The top and bottom of a fraction. In $\frac{3}{4}$, 3 is the numerator (how many pieces) and 4 is the denominator (how many equal pieces the whole is cut into).` },
      { term: 'Common denominator', means: 'A bottom number that both fractions can be rewritten with, so their pieces are the same size and can be added.' },
      { term: 'Exponent', means: r`A small raised number that counts repeated multiplication: $5^3 = 5 \cdot 5 \cdot 5$.` },
      { term: 'Reciprocal', means: r`A fraction flipped upside down. The reciprocal of $\frac{1}{2}$ is $\frac{2}{1} = 2$.` },
    ],
    tools: [
      { name: 'Times tables', refresher: 'Quick multiplication facts up to 12 × 12 make everything faster. If they are slow, practice a few minutes a day; it pays off all course.' },
      { name: 'Equivalent fractions', refresher: r`Multiplying the top and bottom of a fraction by the same number does not change its value: $\frac{2}{3} = \frac{2 \cdot 4}{3 \cdot 4} = \frac{8}{12}$.` },
    ],
    why: [
      [r`We cannot add thirds and quarters directly; the pieces are different sizes. 12 is the smallest number both 3 and 4 divide into, so we cut everything into twelfths.`, r`Now both fractions count twelfths, so we just add how many twelfths we have: 8 + 3 = 11.`],
      [r`Exponents come before multiplication in the order of operations, so we deal with $2^2$ first.`, r`Multiplication comes before addition, so $4 \cdot 4$ is next.`, r`Addition is last. Doing it in this order is what makes everyone get the same answer.`],
    ],
    walk: {
      'c0-1-1': [r`Picture the number line and stand at $-3$.`, r`Adding 8 means walk 8 steps to the right: $-2, -1, 0, 1, 2, 3, 4, 5$.`, r`You stop at $5$. Check with money: owe 3 dollars, receive 8, pay the debt and you have 5 left.`],
      'c0-1-2': [r`Look at the signs first: both numbers are negative.`, r`The rule: same signs give a positive answer.`, r`Now multiply the sizes: $4 \times 6 = 24$. So $(-4)(-6) = 24$.`],
      'c0-1-3': [r`The bottoms are 3 and 4, so the pieces are different sizes. We need a common bottom.`, r`12 works for both: $\frac{2}{3} = \frac{2 \cdot 4}{3 \cdot 4} = \frac{8}{12}$ and $\frac{1}{4} = \frac{1 \cdot 3}{4 \cdot 3} = \frac{3}{12}$.`, r`Add the tops and keep the bottom: $\frac{8 + 3}{12} = \frac{11}{12}$.`, r`Can it be simplified? 11 and 12 share no factor, so $\frac{11}{12}$ is final.`],
      'c0-1-4': [r`Dividing by a fraction asks “how many halves fit into three quarters?”.`, r`The rule: keep the first fraction, flip the second, and multiply: $\frac{3}{4} \cdot \frac{2}{1}$.`, r`Multiply tops and bottoms: $\frac{6}{4}$, which simplifies to $\frac{3}{2} = 1.5$.`, r`Sense check: a half fits into three quarters one and a half times. ✓`],
      'c0-1-5': [r`Order of operations: exponents first. $2^2 = 4$, so the problem becomes $3 + 4 \cdot 4$.`, r`Multiplication before addition: $4 \cdot 4 = 16$.`, r`Finally add: $3 + 16 = 19$.`, r`If you got 30, you added $3 + 4$ first. That breaks the agreed order.`],
      'c0-1-6': [r`Split it into two pieces and do each separately.`, r`$(-2)^3 = (-2)(-2)(-2)$. The first two make $+4$, then $4 \cdot (-2) = -8$.`, r`$\frac{10}{-5}$: different signs give a negative, so it is $-2$.`, r`Now $-8 - (-2)$. Subtracting a negative is adding a positive: $-8 + 2 = -6$.`],
    },
    teach: {
      plan: [r`Draw a number line with 0 in the middle and show that adding walks right and subtracting walks left.`, r`Use the money story to explain why negative × negative is positive.`, r`Cut a paper or drawn pizza to show why fractions need the same bottom before adding.`, r`Write $3 + 4 \cdot 2$ and ask your student to solve it; then explain the order of operations and why everyone must use the same order.`, r`Give them $(-2)^3 - \frac{10}{-5}$ and watch for sign mistakes.`],
      questions: [
        { q: 'Why is a negative times a negative positive?', a: r`Multiplying by $-1$ flips a number to the other side of zero. Flip twice and you are back on the positive side. Or use money: taking away debts makes you richer.` },
        { q: 'Why can’t I just add the tops and the bottoms of fractions?', a: r`Because $\frac{1}{2} + \frac{1}{2}$ would give $\frac{2}{4} = \frac{1}{2}$, but two halves make a whole! The bottom tells the size of the pieces; it does not get added.` },
        { q: 'Is $-2^2$ the same as $(-2)^2$?', a: r`No. Without parentheses, the exponent only touches the 2: $-2^2 = -4$. With parentheses, the whole $-2$ is squared: $(-2)^2 = 4$.` },
      ],
      keyPoints: ['Subtracting a number is adding its opposite.', 'Same signs multiply to a positive, different signs to a negative.', 'Fractions need a common denominator to add; to divide, flip and multiply.', 'The order of operations: parentheses, exponents, × ÷, + −.'],
    },
  },
  'c0-2': {
    bigIdea: [
      r`A variable is a letter, usually $x$, standing in for a number we do not know yet. It is like a box with a number hidden inside. An equation, like $3x + 5 = 20$, is a clue about what is in the box.`,
      r`Think of an equation as a perfectly balanced seesaw. The left side and the right side weigh exactly the same. If you take 5 off one side, you must take 5 off the other, or it tips. That one rule is the whole secret of solving equations.`,
      r`To find $x$, we peel away everything around it, in the reverse order it was put on. In $3x + 5$, the number was first tripled, then 5 was added. So we undo: first subtract 5, then divide by 3. Like taking off your shoes before your socks.`,
    ],
    picture: { title: 'Wrapping and unwrapping a present', t: r`To build $3x + 5$, you put $x$ in a box (×3) and then wrapped it in paper (+5). To get $x$ back, you unwrap in reverse: tear off the paper first (−5), then open the box (÷3).` },
    words: [
      { term: 'Variable', means: 'A letter that stands for an unknown or changing number.' },
      { term: 'Equation', means: 'A statement that two expressions are equal, with an = sign in the middle.' },
      { term: 'Solve', means: 'Find the value(s) of the variable that make the equation true.' },
      { term: 'Distribute', means: r`Multiply a number into every term inside parentheses: $2(x - 4) = 2x - 8$.` },
      { term: 'Coefficient', means: r`The number multiplying a variable. In $3x$, the coefficient is 3.` },
    ],
    tools: [
      { name: 'Inverse operations', refresher: 'Addition and subtraction undo each other; multiplication and division undo each other.', lesson: 'c0-1' },
      { name: 'Signs and fractions', refresher: 'You will divide by negative numbers and work with fractions while solving.', lesson: 'c0-1' },
    ],
    why: [
      [r`The $+5$ was the last thing done to $x$, so it is the first thing we undo. We subtract 5 from BOTH sides to keep the balance.`, r`Now $x$ is only being multiplied by 3. Dividing by 3 undoes that, again on both sides.`, r`Plugging back in proves the answer works. This catches mistakes before they cost points.`],
      [r`$x$ appears on both sides. We gather all the $x$’s on one side by removing $2x$ from both sides.`, r`Now it looks like a two-step equation. Undo the $-7$ by adding 7.`, r`Last, undo “times 3” by dividing by 3.`],
    ],
    walk: {
      'c0-2-1': [r`Goal: get $x$ alone. Around $x$ there is “×3” and “+5”.`, r`Undo the last thing first: subtract 5 from both sides. $3x + 5 - 5 = 20 - 5$, so $3x = 15$.`, r`Undo “×3” by dividing both sides by 3: $x = 5$.`, r`Check: $3(5) + 5 = 15 + 5 = 20$ ✓.`],
      'c0-2-2': [r`The parentheses say: first subtract 4, then multiply by 2.`, r`Undo the multiplication first: divide both sides by 2. $x - 4 = 5$.`, r`Undo the subtraction: add 4 to both sides. $x = 9$.`, r`Check: $2(9 - 4) = 2 \cdot 5 = 10$ ✓.`],
      'c0-2-3': [r`$\frac{x}{3}$ means $x$ divided by 3, and then 2 was subtracted.`, r`Undo the subtraction: add 2 to both sides. $\frac{x}{3} = 6$.`, r`Undo the division: multiply both sides by 3. $x = 18$.`, r`Check: $\frac{18}{3} - 2 = 6 - 2 = 4$ ✓.`],
      'c0-2-4': [r`There are $x$’s on both sides. Move them to one side: subtract $2x$ from both sides. $3x - 7 = 11$.`, r`Add 7 to both sides: $3x = 18$.`, r`Divide both sides by 3: $x = 6$.`, r`Check: left side $5(6) - 7 = 23$; right side $2(6) + 11 = 23$ ✓.`],
      'c0-2-5': [r`$x^2$ means $x \cdot x$. We need a number that times itself gives 49.`, r`$7 \cdot 7 = 49$, so $x = 7$ works.`, r`But $(-7)(-7) = 49$ too (same signs → positive). So there are two solutions: $7$ and $-7$.`, r`The question asks for the positive one: $7$.`],
      'c0-2-6': [r`We have two unknowns, but we are told $x = 3$. Replace $x$ with 3: $2(3) + 3y = 12$.`, r`Simplify: $6 + 3y = 12$.`, r`Subtract 6 from both sides: $3y = 6$. Divide by 3: $y = 2$.`, r`Check: $2(3) + 3(2) = 6 + 6 = 12$ ✓.`],
    },
    teach: {
      plan: [r`Draw a balance scale and write $3x + 5 = 20$ on it. Explain that both sides weigh the same.`, r`Use the present-wrapping story: we undo operations in reverse order.`, r`Solve $3x + 5 = 20$ together, saying “both sides” out loud at every step.`, r`Show how to check by plugging the answer back in.`, r`Let your student solve $5x - 7 = 2x + 11$ alone while you watch.`],
      questions: [
        { q: 'Why do I have to do the same thing to both sides?', a: 'Because the = sign says the two sides are equal. If you change only one side, they are no longer equal and the equation becomes false.' },
        { q: 'How do I know what to undo first?', a: r`Undo in the reverse order the operations were done to $x$. Usually that means: undo addition and subtraction first, then multiplication and division.` },
        { q: 'Why does $x^2 = 49$ have two answers?', a: r`Because squaring removes the sign: $7^2$ and $(-7)^2$ are both 49. Any time you undo a square, remember the $\pm$.` },
      ],
      keyPoints: ['An equation is a balance; do the same thing to both sides.', 'Undo operations in reverse order (usually + − first, then × ÷).', 'Check your answer by substituting it back.', 'Squares have two square roots, positive and negative.'],
    },
  },
  'c0-3': {
    bigIdea: [
      r`A function is a machine with a rule. You drop a number in the top (the input), the machine follows its rule, and exactly one number comes out the bottom (the output). The machine $f(x) = 2x + 1$ doubles your number and adds one.`,
      r`The notation $f(3)$ means “the output of machine $f$ when the input is 3”. It does not mean $f$ times 3. To compute it, replace every $x$ in the rule with 3.`,
      r`We can draw a function as a picture. For every input $x$, mark the point $(x, f(x))$ on a grid. Connect all those points and you get the function’s graph. Calculus is mostly about reading these pictures: where they go up, down, and how steeply.`,
      r`Some machines refuse certain inputs. A machine that divides by $x - 5$ breaks when $x = 5$ because dividing by zero is impossible. The inputs a function accepts are called its domain.`,
    ],
    picture: { title: 'A vending machine', t: r`Press button B3 and you always get the same snack. That is a function: one input, one definite output. A vending machine that sometimes gave chips and sometimes gave candy for B3 would not be a function.` },
    words: [
      { term: r`$f(x)$`, means: 'Read “f of x”: the output of the function f for the input x.' },
      { term: 'Domain', means: 'All the inputs a function is allowed to take.' },
      { term: 'Range', means: 'All the outputs a function actually produces.' },
      { term: 'Coordinate plane', means: r`A grid made by a horizontal $x$-axis and a vertical $y$-axis. A point $(a, b)$ is $a$ across and $b$ up.` },
      { term: 'Composition', means: r`Feeding one function’s output into another: $f(g(x))$ runs $g$ first, then $f$.` },
      { term: 'Absolute value', means: r`Distance from zero, always positive or zero: $|-3| = 3$.` },
    ],
    tools: [
      { name: 'Order of operations and negatives', refresher: r`When you substitute a negative number, use parentheses so its sign is handled correctly: $(-3)^2 = 9$.`, lesson: 'c0-1' },
      { name: 'Solving equations', refresher: r`Finding where a function equals something, or where a denominator is zero, means solving an equation.`, lesson: 'c0-2' },
    ],
    why: [
      [r`Substituting means swapping the letter for the number. Parentheses keep the negative sign attached to the 3 when we square it.`, r`$(-3)(-3) = +9$, because same signs give a positive. Then finish the arithmetic.`],
      [r`In $h(k(2))$, $k(2)$ is inside, so the machine $k$ runs first, like the inner layer of a nesting doll.`, r`The output of $k$ (which is 4) becomes the input of $h$.`],
    ],
    walk: {
      'c0-3-1': [r`The rule is “double it, then add 1”.`, r`Replace $x$ with 3: $f(3) = 2(3) + 1$.`, r`$2(3) = 6$ and $6 + 1 = 7$. So $f(3) = 7$, meaning the point $(3, 7)$ is on the graph.`],
      'c0-3-2': [r`Replace $x$ with $(-3)$, with parentheses: $g(-3) = (-3)^2 - 4$.`, r`$(-3)^2 = (-3)(-3) = 9$.`, r`$9 - 4 = 5$. Without parentheses you might write $-9 - 4 = -13$, which is wrong.`],
      'c0-3-3': [r`Work from the inside out. The inside is $k(2)$.`, r`$k(2) = 2 \cdot 2 = 4$.`, r`Now feed 4 into $h$: $h(4) = 4^2 + 1 = 16 + 1 = 17$.`],
      'c0-3-4': [r`A fraction breaks when its bottom is zero, since nothing can be divided by zero.`, r`Set the bottom equal to zero: $x - 5 = 0$.`, r`Solve: $x = 5$. So 5 is not in the domain; every other number is fine.`],
      'c0-3-5': [r`The quadrants are numbered counterclockwise starting at the top right: I (top right), II (top left), III (bottom left), IV (bottom right).`, r`$(3, -2)$: $x = 3$ is positive (go right), $y = -2$ is negative (go down).`, r`Right and down is the bottom right: quadrant IV.`],
      'c0-3-6': [r`Replace $x$ with 1: $f(1) = |1 - 4|$.`, r`Inside first: $1 - 4 = -3$.`, r`Absolute value is the distance from zero, so $|-3| = 3$.`],
    },
    teach: {
      plan: [r`Draw a box-shaped machine with an input arrow and an output arrow. Write the rule $2x + 1$ on it.`, r`Feed in 0, 1, 2, 3 together and make a table of outputs.`, r`Plot those points on a grid and connect them, so your student sees that a function is also a picture.`, r`Show $f(1/(x-5))$ breaking at 5 to explain the domain.`, r`Finish with composition: one machine feeding another.`],
      questions: [
        { q: 'Does $f(3)$ mean $f$ times 3?', a: r`No. $f$ is the name of the machine, and the 3 in parentheses is the input. $f(3)$ is the output when you put 3 in.` },
        { q: 'Why does a function have to give only one output?', a: 'So it is predictable. If one input could give two outputs, you could not say what the machine “does” to that input. That reliability is what makes calculus possible.' },
        { q: 'Why can’t we divide by zero?', a: r`Division asks “how many times does this fit?”. How many times does 0 fit into 5? No number works, because $0 \times$ anything is 0. So it is undefined.` },
      ],
      keyPoints: ['A function gives exactly one output for each input.', 'f(a) means substitute a for every x (use parentheses for negatives).', 'The graph is all points (x, f(x)).', 'Composition works from the inside out.'],
    },
  },
  'c0-4': {
    bigIdea: [
      r`Slope tells you how steep a line is. Walk along the line from left to right: for every step you take to the right, how many steps do you climb up? That number is the slope.`,
      r`We find it with “rise over run”: pick two points, find how much the height changes (rise) and how much the horizontal position changes (run), and divide. A slope of 3 means: one step right, three steps up.`,
      r`Slope is really a rate. If the $x$-axis is hours and the $y$-axis is miles, then slope is miles per hour: speed! Any “per” you have ever seen, like dollars per pound or points per game, is a slope.`,
      r`This matters enormously, because calculus begins with one question: what is the slope of a curved graph at a single point? For straight lines the slope is the same everywhere. Calculus handles curves.`,
    ],
    picture: { title: 'A wheelchair ramp', t: r`A ramp that rises 1 foot over 12 feet of length has slope $\frac{1}{12}$: gentle. A playground slide that drops 6 feet over 4 feet has slope $-\frac{6}{4}$: steep, and negative because it goes down as you move right.` },
    words: [
      { term: 'Slope ($m$)', means: 'How much y changes for each 1-unit change in x: rise ÷ run.' },
      { term: r`$y$-intercept ($b$)`, means: r`Where the line crosses the $y$-axis, that is, the value of $y$ when $x = 0$.` },
      { term: r`$\Delta$ (delta)`, means: r`Greek letter meaning “change in”. $\Delta y$ is the change in $y$.` },
      { term: 'Point-slope form', means: r`$y - y_1 = m(x - x_1)$: the line with slope $m$ through the point $(x_1, y_1)$.` },
      { term: 'Rate of change', means: 'How fast one quantity changes compared with another, like miles per hour.' },
    ],
    tools: [
      { name: 'Subtracting negatives', refresher: r`Rise and run often involve negatives: $2 - (-3) = 5$.`, lesson: 'c0-1' },
      { name: 'Plugging into functions and points', refresher: r`A point $(x, y)$ is on a line if putting $x$ into the equation gives that $y$.`, lesson: 'c0-3' },
      { name: 'Solving equations', refresher: r`Finding where a line crosses the $x$-axis means solving $0 = mx + b$.`, lesson: 'c0-2' },
    ],
    why: [
      [r`Rise is the change in height ($y$), run is the change in horizontal position ($x$). Subtract in the same order for both.`, r`Slope = rise ÷ run: for each 1 step right, the line goes up 3.`],
      [r`Point-slope form is perfect when you know one point and the slope: it builds the line from exactly that information.`, r`From $x = 2$ to $x = 6$ is 4 steps right; each step adds 3 to the height, so we add $3 \cdot 4 = 12$ to the starting height 5.`],
    ],
    walk: {
      'c0-4-1': [r`Label the points: $(x_1, y_1) = (1, 2)$ and $(x_2, y_2) = (4, 11)$.`, r`Rise $= y_2 - y_1 = 11 - 2 = 9$. Run $= x_2 - x_1 = 4 - 1 = 3$.`, r`Slope $= \frac{9}{3} = 3$. Each step right, the line climbs 3.`],
      'c0-4-2': [r`In $y = mx + b$ form, $b$ is the $y$-intercept.`, r`Here $m = -2$ and $b = 7$.`, r`Check by setting $x = 0$: $y = -2(0) + 7 = 7$. The line crosses the $y$-axis at $(0, 7)$.`],
      'c0-4-3': [r`We know a point $(2, 5)$ and the slope 3. Point-slope form: $y - 5 = 3(x - 2)$.`, r`Put in $x = 6$: $y - 5 = 3(6 - 2) = 3 \cdot 4 = 12$.`, r`Add 5 to both sides: $y = 17$.`, r`Sense check: 4 steps right at 3 up per step is 12 up from 5. ✓`],
      'c0-4-4': [r`Perpendicular means meeting at a right angle (like a plus sign).`, r`The rule: flip the slope and change its sign. Flip $\frac{2}{3}$ to get $\frac{3}{2}$, change the sign to get $-\frac{3}{2}$.`, r`Check: $\frac{2}{3} \cdot \left(-\frac{3}{2}\right) = -1$. Perpendicular slopes always multiply to $-1$. ✓`],
      'c0-4-5': [r`Speed = distance ÷ time, which is a slope with miles on the $y$-axis and hours on the $x$-axis.`, r`Change in miles: $160 - 40 = 120$. Change in time: $3 - 1 = 2$ hours.`, r`$\frac{120}{2} = 60$ miles per hour.`],
      'c0-4-6': [r`Every point on the $x$-axis has height $y = 0$.`, r`Set $y = 0$: $0 = 2x - 8$.`, r`Add 8: $8 = 2x$. Divide by 2: $x = 4$. The line crosses at $(4, 0)$.`],
    },
    teach: {
      plan: [r`Draw a staircase or ramp and ask: “How steep is it?” Introduce rise and run.`, r`Compute the slope between two points together, then show it is the same for any two points on a line.`, r`Connect slope to speed: miles per hour is rise over run on a distance–time graph.`, r`Show $y = mx + b$ and point-slope form, and draw a line from each.`, r`Tell them the secret: calculus asks for the slope of a curve, and that is the derivative.`],
      questions: [
        { q: 'Does it matter which point I call the first one?', a: r`No, as long as you use the same order on top and bottom. $\frac{11 - 2}{4 - 1}$ and $\frac{2 - 11}{1 - 4}$ both give 3.` },
        { q: 'What does a negative slope mean?', a: 'The line goes down as you move to the right, like going downhill. In a story, the quantity is decreasing.' },
        { q: 'What is the slope of a vertical line?', a: r`Undefined. The run is 0, and you cannot divide by 0. (A horizontal line has slope 0: no rise at all.)` },
      ],
      keyPoints: ['Slope = rise/run = change in y over change in x.', 'Positive slope goes up, negative down, zero is flat.', 'Slope is a rate of change (like speed).', 'y = mx + b and y − y₁ = m(x − x₁) describe lines.'],
    },
  },
  'c0-5': {
    bigIdea: [
      r`Exponents are shorthand for repeated multiplication: $x^3 = x \cdot x \cdot x$. Once you see that, the exponent rules are just counting. $x^3 \cdot x^4$ is three $x$’s times four more $x$’s, which is seven $x$’s: $x^7$.`,
      r`Exponents can also be negative or fractions. A negative exponent means “one over”: $x^{-2} = \frac{1}{x^2}$. A fraction exponent means a root: $x^{1/2} = \sqrt{x}$. These are not random rules: they are the only way to keep the counting rules working.`,
      r`A polynomial is a sum of powers, like $x^2 + x - 6$. Expanding multiplies things out; factoring does the reverse and breaks an expression into pieces that multiply together.`,
      r`Factoring is a superpower for solving equations: if two numbers multiply to zero, one of them must be zero. So $(x - 2)(x - 3) = 0$ instantly tells you $x = 2$ or $x = 3$.`,
    ],
    picture: { title: 'Folding paper', t: r`Fold a sheet of paper in half: 2 layers. Again: 4. Again: 8. After $n$ folds you have $2^n$ layers. Fold 3 times and then 4 more times: $2^3 \cdot 2^4 = 2^7 = 128$ layers, exactly as if you folded 7 times.` },
    words: [
      { term: 'Base and exponent', means: r`In $x^5$, $x$ is the base and 5 is the exponent (how many times the base is multiplied).` },
      { term: 'Square root / cube root', means: r`$\sqrt{16} = 4$ because $4^2 = 16$. $\sqrt[3]{8} = 2$ because $2^3 = 8$.` },
      { term: 'Polynomial', means: r`A sum of terms like $3x^2$, $-5x$ and $7$: whole-number powers of $x$ times numbers.` },
      { term: 'Expand', means: 'Multiply out parentheses so there are none left.' },
      { term: 'Factor', means: r`Rewrite as a product: $x^2 - 9 = (x - 3)(x + 3)$.` },
    ],
    tools: [
      { name: 'Multiplying negatives and fractions', refresher: r`Factoring uses pairs like $(-2)(-3) = 6$.`, lesson: 'c0-1' },
      { name: 'Solving equations', refresher: 'After factoring, each factor gives a small equation to solve.', lesson: 'c0-2' },
    ],
    why: [
      [r`The bottom of a fraction exponent names the root. $\sqrt[3]{8}$ asks: what number times itself three times is 8?`, r`The top of the exponent is an ordinary power, so we square the result.`],
      [r`Factoring a trinomial means finding the two numbers that will become the constants in the factors. They must multiply to the last number and add to the middle one.`, r`A product is zero only when a factor is zero, so each factor gives one solution.`],
    ],
    walk: {
      'c0-5-1': [r`$x^3 = x \cdot x \cdot x$ and $x^4 = x \cdot x \cdot x \cdot x$.`, r`Multiplying them puts $3 + 4 = 7$ copies of $x$ in a row.`, r`So $x^3 \cdot x^4 = x^7$ and $n = 7$. Rule: when multiplying, add the exponents.`],
      'c0-5-2': [r`An exponent of $\frac{1}{2}$ means square root.`, r`$\sqrt{16}$ asks: what positive number times itself is 16?`, r`$4 \cdot 4 = 16$, so $16^{1/2} = 4$.`],
      'c0-5-3': [r`Read $\frac{2}{3}$ as “cube root, then square”.`, r`Cube root of 8: $2 \cdot 2 \cdot 2 = 8$, so $\sqrt[3]{8} = 2$.`, r`Square it: $2^2 = 4$.`, r`Doing the root first keeps the numbers small; squaring first ($64$) and then taking the cube root also gives 4.`],
      'c0-5-4': [r`A negative exponent means “one over the positive power”: $x^{-2} = \frac{1}{x^2}$.`, r`Plug in $x = 4$: $\frac{1}{4^2} = \frac{1}{16}$.`, r`As a decimal, $0.0625$. Note it is positive: a negative exponent does not make the number negative.`],
      'c0-5-5': [r`Multiply every term in the first parentheses by every term in the second (FOIL: First, Outer, Inner, Last).`, r`First: $x \cdot x = x^2$. Outer: $x \cdot (-2) = -2x$. Inner: $3 \cdot x = 3x$. Last: $3 \cdot (-2) = -6$.`, r`Combine the middle terms: $-2x + 3x = x$. So it is $x^2 + 1x - 6$ and $b = 1$.`],
      'c0-5-6': [r`We want two numbers that multiply to $+6$ and add to $-5$.`, r`Try pairs: $(-2)(-3) = 6$ and $-2 + (-3) = -5$. ✓ So $x^2 - 5x + 6 = (x - 2)(x - 3)$.`, r`Set each factor to zero: $x - 2 = 0$ gives $x = 2$; $x - 3 = 0$ gives $x = 3$.`, r`The larger solution is 3. Check: $9 - 15 + 6 = 0$ ✓.`],
    },
    teach: {
      plan: [r`Write $x^3$ as $x \cdot x \cdot x$ and let your student discover the multiplication rule by counting.`, r`Show the pattern $2^3 = 8, 2^2 = 4, 2^1 = 2, 2^0 = ?, 2^{-1} = ?$, halving each time, so negative exponents feel natural.`, r`Explain that $x^{1/2}$ must be $\sqrt{x}$ because $x^{1/2} \cdot x^{1/2} = x^1$.`, r`Expand $(x + 3)(x - 2)$ with a 2×2 box.`, r`Factor $x^2 - 5x + 6$ and solve it with the zero product property.`],
      questions: [
        { q: 'Why is anything to the power 0 equal to 1?', a: r`Follow the pattern: $2^3 = 8$, $2^2 = 4$, $2^1 = 2$; each step divides by 2. One more step: $2^0 = 1$.` },
        { q: 'Why is $(x + 3)^2$ not $x^2 + 9$?', a: r`Because $(x + 3)^2 = (x + 3)(x + 3)$, and multiplying out gives the two middle terms $3x + 3x = 6x$. Test with $x = 1$: $(1 + 3)^2 = 16$, but $1 + 9 = 10$.` },
        { q: 'Why does factoring help solve equations?', a: 'Because the only way a product can be zero is if one of its factors is zero. That turns one hard equation into two easy ones.' },
      ],
      keyPoints: ['Exponents count repeated multiplication; multiplying powers adds exponents.', 'Negative exponent = one over; fraction exponent = root.', 'Expanding multiplies every term by every term.', 'Factor, then set each factor to zero.'],
    },
  },
  'c0-6': {
    bigIdea: [
      r`Just like you recognize faces, you should recognize a few function shapes instantly: the straight line, the U-shaped parabola $x^2$, the S-shaped $x^3$, the half-sideways-parabola $\sqrt{x}$, the two-piece curve $\frac{1}{x}$, and the V-shaped $|x|$.`,
      r`Once you know a shape, you can move it around. Subtracting inside, like $(x - 2)^2$, slides the graph right 2. Adding outside, like $x^2 + 3$, lifts it up 3. Calculus problems constantly use shifted versions of these basic shapes.`,
      r`Some functions are built in pieces: one rule here, another rule there, like phone plans that charge differently after a certain number of minutes. To evaluate, first find which piece your input belongs to.`,
      r`Finally, a sneaky one: $\frac{x^2 - 4}{x - 2}$ simplifies to $x + 2$, except at $x = 2$, where the original has a zero in the bottom. Its graph is a line with one missing point, a hole. Asking “what height is the hole at?” is exactly what a limit does in Unit 1.`,
    ],
    picture: { title: 'Stickers on a whiteboard', t: r`Think of each basic shape as a sticker. $(x - h)^2 + k$ means: take the parabola sticker and slide it $h$ right and $k$ up. The sticker does not change shape, only position.` },
    words: [
      { term: 'Parabola', means: r`The U-shaped graph of $x^2$ and its shifted or stretched versions.` },
      { term: 'Vertex', means: 'The turning point of a parabola: its lowest (or highest) point.' },
      { term: 'Piecewise function', means: 'A function that uses different formulas on different parts of its domain.' },
      { term: 'Even / odd function', means: r`Even: mirror image across the $y$-axis. Odd: same after a half-turn about the origin.` },
      { term: 'Hole', means: 'A single missing point in a graph, usually from cancelling a factor that made the bottom zero.' },
    ],
    tools: [
      { name: 'Functions and graphs', refresher: r`A graph is all the points $(x, f(x))$.`, lesson: 'c0-3' },
      { name: 'Factoring', refresher: r`Difference of squares: $x^2 - 4 = (x - 2)(x + 2)$.`, lesson: 'c0-5' },
    ],
    why: [
      [r`A piecewise function is like a fork in the road: first decide which branch your input travels down.`, r`Then use only that branch’s rule.`],
      [r`Factoring reveals a common factor on top and bottom. Cancelling it is allowed for every $x$ except 2, where the original bottom is 0.`, r`The simplified form gives the same values everywhere the original is defined, and it is easier to compute.`],
    ],
    walk: {
      'c0-6-1': [r`$(x - 2)^2$ is a square, and squares are never negative. The smallest it can be is 0.`, r`That happens when $x - 2 = 0$, so at $x = 2$.`, r`Then $y = 0 + 3 = 3$. So the smallest value is 3, at the vertex $(2, 3)$: the basic parabola moved right 2 and up 3.`],
      'c0-6-2': [r`A square root needs a number that is zero or positive inside.`, r`So $x - 4 \ge 0$.`, r`Add 4: $x \ge 4$. The smallest allowed $x$ is 4, where $y = \sqrt{0} = 0$: the graph starts at $(4, 0)$.`],
      'c0-6-3': [r`Decide which piece: is $2 < 1$? No. Is $2 \ge 1$? Yes.`, r`So use the second rule, $f(x) = 3x$.`, r`$f(2) = 3 \cdot 2 = 6$.`],
      'c0-6-4': [r`The basic parabola $y = x^2$ has its lowest point at $x = 0$.`, r`Moving right 3 changes the formula to $y = (x - 3)^2$; the minus sign inside moves it to the right.`, r`The lowest point is where $x - 3 = 0$, so $x = 3$.`],
      'c0-6-5': [r`Even means $f(-x) = f(x)$: plugging in a number and its opposite gives the same output.`, r`Test $x^2$: $(-2)^2 = 4 = 2^2$ ✓. Test $x^3$: $(-2)^3 = -8 \ne 8$, so it is odd.`, r`$x + 1$: $f(-2) = -1$ but $f(2) = 3$, not equal. $2x$ is odd. So only $x^2$ is even.`],
      'c0-6-6': [r`Direct way: plug in 3. Top: $9 - 4 = 5$. Bottom: $3 - 2 = 1$. So $\frac{5}{1} = 5$.`, r`Factoring way: $\frac{(x - 2)(x + 2)}{x - 2} = x + 2$ for $x \ne 2$, and $3 + 2 = 5$.`, r`Both agree. The factored form will matter when we can’t plug in directly, like at $x = 2$.`],
    },
    teach: {
      plan: [r`Sketch the six basic shapes from memory and have your student name each one.`, r`Move the parabola with $(x - 2)^2 + 3$ and ask where the vertex goes.`, r`Use a phone-plan story to explain piecewise functions.`, r`Graph $\frac{x^2 - 4}{x - 2}$ as a line with a hole at $x = 2$.`, r`Ask: “What height is the hole at?” and tell them that is a limit, coming in Unit 1.`],
      questions: [
        { q: 'Why does $(x - 3)^2$ move right, not left?', a: r`Because to get the same output as $x^2$ at 0, you now need $x = 3$. Everything happens 3 units later, which is to the right.` },
        { q: 'If I cancel $(x - 2)$, is the function the same?', a: 'Almost. It matches everywhere except at x = 2, where the original is undefined. That one difference is the hole in the graph.' },
        { q: 'How do I tell even from odd quickly?', a: r`Plug in $-x$. If you get the original back, it is even; if you get the negative of the original, it is odd; otherwise neither.` },
      ],
      keyPoints: ['Recognize the basic shapes: x², x³, √x, 1/x, |x|.', 'f(x − h) + k moves right h and up k.', 'For piecewise functions, pick the right piece first.', 'Cancelling a factor that makes the bottom zero leaves a hole.'],
    },
  },
  'c0-7': {
    bigIdea: [
      r`Some things grow by adding the same amount each time (save 5 dollars a week). Others grow by multiplying by the same amount each time (a population that doubles every year). The second kind is exponential growth, written like $2^x$, and it gets enormous fast.`,
      r`A logarithm asks the reverse question: “what power do I need?”. $\log_2 8$ asks “2 to what power gives 8?”, and the answer is 3. Logarithms are how we solve for an unknown exponent.`,
      r`The number $e \approx 2.718$ is special: it is the growth factor you get when something grows continuously, every instant, instead of in steps. Calculus uses $e^x$ and its log, $\ln x$, constantly because they have the simplest derivatives of all.`,
    ],
    picture: { title: 'A rumor spreading', t: r`You tell 2 friends, each of them tells 2 more, and so on. After 1 round: 2 people. After 5 rounds: $2^5 = 32$. After 20 rounds: over a million. A logarithm answers “how many rounds until a million people know?”` },
    words: [
      { term: 'Exponential function', means: r`A function with the variable in the exponent, like $3 \cdot 2^x$.` },
      { term: r`Logarithm $\log_b y$`, means: r`The power you raise $b$ to in order to get $y$.` },
      { term: r`$e$`, means: r`The natural base, about 2.71828. It comes from continuous growth.` },
      { term: r`Natural log $\ln x$`, means: r`The logarithm with base $e$. It undoes $e^x$.` },
      { term: 'Inverse functions', means: r`Two functions that undo each other, like $e^x$ and $\ln x$.` },
    ],
    tools: [
      { name: 'Exponent rules', refresher: r`$b^m \cdot b^n = b^{m+n}$; the log rules are these same rules in disguise.`, lesson: 'c0-5' },
      { name: 'Solving equations', refresher: 'Get the exponential piece alone first, then use a log.', lesson: 'c0-2' },
    ],
    why: [
      [r`A logarithm is a question about exponents, so we turn it into that question.`, r`We know $2 \cdot 2 \cdot 2 = 8$, so three 2s are needed.`],
      [r`Like any equation, peel away what is wrapped around the unknown first: the “times 3”.`, r`Now both sides are powers of 2, so the exponents must match.`],
    ],
    walk: {
      'c0-7-1': [r`$2^5$ means five 2s multiplied together.`, r`$2 \cdot 2 = 4$, $\cdot 2 = 8$, $\cdot 2 = 16$, $\cdot 2 = 32$.`, r`So $2^5 = 32$. Notice each step doubles: that is exponential growth.`],
      'c0-7-2': [r`Turn the log into a question: “2 to what power equals 8?”.`, r`$2^1 = 2$, $2^2 = 4$, $2^3 = 8$.`, r`So $\log_2 8 = 3$.`],
      'c0-7-3': [r`$\ln$ asks: “$e$ to what power gives this?”.`, r`The input is already $e^4$, so the power is 4.`, r`$\ln(e^4) = 4$. $\ln$ and $e^x$ cancel each other, like undoing a step.`],
      'c0-7-4': [r`$\log_{10} 1000$ asks: “10 to what power is 1000?”.`, r`$10^3 = 10 \cdot 10 \cdot 10 = 1000$.`, r`So the answer is 3. (A handy fact: $\log_{10}$ counts the zeros of 10, 100, 1000, ….)`],
      'c0-7-5': [r`The unknown is in the exponent. To bring it down, take $\ln$ of both sides: $\ln(e^x) = \ln 5$.`, r`$\ln$ undoes $e^x$, so the left side is just $x$: $x = \ln 5$.`, r`On a calculator, $\ln 5 \approx 1.609$. Check: $e^{1.609} \approx 5$ ✓.`],
      'c0-7-6': [r`Get the exponential part alone first: divide both sides by 3. $2^x = 16$.`, r`Write 16 as a power of 2: $16 = 2 \cdot 2 \cdot 2 \cdot 2 = 2^4$.`, r`So $2^x = 2^4$, and $x = 4$. Check: $3 \cdot 16 = 48$ ✓.`],
    },
    teach: {
      plan: [r`Compare saving 5 dollars a week with doubling every week, in a table, to show how fast exponential growth is.`, r`Define the logarithm as the “what power?” question and practice with $\log_2$ and $\log_{10}$.`, r`Introduce $e$ as the base of continuous growth, and $\ln$ as its log.`, r`Show that $\ln(e^x) = x$ and $e^{\ln x} = x$.`, r`Solve $e^x = 5$ together using $\ln$.`],
      questions: [
        { q: 'What is a logarithm actually for?', a: 'For finding an unknown exponent: how many doublings, how many years of interest, how many rounds of a rumor. Exponentials answer “how much?”, logs answer “how long?”.' },
        { q: 'Why is $e$ such a weird number?', a: r`It is the result of growing a little bit continuously. If 1 dollar earned 100% interest compounded every instant for a year, you would end with $e \approx 2.718$ dollars.` },
        { q: 'Can I take the log of a negative number?', a: r`No. A positive base raised to any power is always positive, so no power gives a negative number or zero.` },
      ],
      keyPoints: ['Exponential growth multiplies by the same factor each step.', 'A log answers “what power?”: log_b y = x means bˣ = y.', 'ln and eˣ undo each other.', 'To solve for an exponent, isolate the exponential, then take a log.'],
    },
  },
  'c0-8': {
    bigIdea: [
      r`Trigonometry started with triangles: in a right triangle, the ratios of the sides depend only on the angle. Sine is opposite over hypotenuse, cosine is adjacent over hypotenuse, tangent is opposite over adjacent. Remember them with SOH-CAH-TOA.`,
      r`Calculus needs a bigger idea: the unit circle, a circle of radius 1 centered at the origin. Start at the rightmost point and walk counterclockwise by some angle. Wherever you stop, your $x$-coordinate is the cosine and your $y$-coordinate is the sine. Now any angle, even huge or negative ones, has a sine and cosine.`,
      r`We also measure angles differently: in radians. One radian is the angle you get when you walk a distance of 1 along the edge of the unit circle. Walking all the way around is $2\pi$ (about 6.28), so half a turn, 180°, is $\pi$. Radians make the calculus formulas clean, so we use them all course.`,
    ],
    picture: { title: 'A Ferris wheel', t: r`Ride a Ferris wheel of radius 1. Your height above the center is $\sin\theta$ and your sideways position is $\cos\theta$, where $\theta$ is how far the wheel has turned. As it spins, your height rises and falls in a smooth wave: the sine graph.` },
    words: [
      { term: 'Hypotenuse', means: 'The longest side of a right triangle, opposite the right angle.' },
      { term: 'Radian', means: r`An angle measure: $\pi$ radians $= 180^\circ$, a full turn is $2\pi$.` },
      { term: 'Unit circle', means: r`The circle of radius 1 centered at $(0, 0)$. Its points are $(\cos\theta, \sin\theta)$.` },
      { term: r`$\sin$, $\cos$, $\tan$`, means: 'Sine, cosine and tangent: SOH-CAH-TOA ratios, or unit-circle coordinates.' },
      { term: 'Identity', means: r`An equation true for every value, like $\sin^2\theta + \cos^2\theta = 1$.` },
    ],
    tools: [
      { name: 'Fractions and square roots', refresher: r`Special values like $\frac{\sqrt{2}}{2}$ and $\frac{1}{2}$ show up constantly.`, lesson: 'c0-5' },
      { name: 'The Pythagorean theorem', refresher: r`In a right triangle with legs $a$, $b$ and hypotenuse $c$: $a^2 + b^2 = c^2$.` },
    ],
    why: [
      [r`Since $180^\circ$ equals $\pi$ radians, each degree is $\frac{\pi}{180}$ radians.`, r`Simplify the fraction: $\frac{60}{180} = \frac{1}{3}$.`],
      [r`To use sine we need the hypotenuse, and the Pythagorean theorem gives it from the two legs.`, r`SOH: sine is the opposite side over the hypotenuse.`],
    ],
    walk: {
      'c0-8-1': [r`The key fact: half a full turn is $180^\circ$, and in radians half a turn is $\pi$.`, r`So $180^\circ = \pi$ radians exactly.`, r`As a decimal, $\pi \approx 3.142$.`],
      'c0-8-2': [r`Convert to degrees to picture it: $\frac{\pi}{6} = \frac{180^\circ}{6} = 30^\circ$.`, r`In a 30-60-90 triangle with hypotenuse 1, the side opposite 30° is half the hypotenuse.`, r`So $\sin\frac{\pi}{6} = \frac{1}{2}$.`],
      'c0-8-3': [r`On the unit circle, an angle of $\pi$ is half a turn counterclockwise from $(1, 0)$.`, r`Half a turn lands on the leftmost point, $(-1, 0)$.`, r`Cosine is the $x$-coordinate, so $\cos\pi = -1$.`],
      'c0-8-4': [r`$\frac{\pi}{4}$ is $45^\circ$, halfway between the axes, so the point has equal $x$ and $y$.`, r`$\sin\frac{\pi}{4} = \cos\frac{\pi}{4} = \frac{\sqrt{2}}{2}$.`, r`$\tan = \frac{\sin}{\cos} = 1$, since a number divided by itself is 1.`],
      'c0-8-5': [r`Any point on the unit circle is $(\cos\theta, \sin\theta)$, at distance 1 from the center.`, r`By the Pythagorean theorem, $\cos^2\theta + \sin^2\theta = 1^2 = 1$.`, r`This is true for every angle, including 1.2 radians. So the answer is 1, with no calculator needed.`],
      'c0-8-6': [r`Find the hypotenuse with the Pythagorean theorem: $c = \sqrt{3^2 + 4^2} = \sqrt{25} = 5$.`, r`The angle $\theta$ is opposite the side of length 3.`, r`SOH: $\sin\theta = \frac{\text{opposite}}{\text{hypotenuse}} = \frac{3}{5} = 0.6$.`],
    },
    teach: {
      plan: [r`Draw a right triangle, label opposite, adjacent and hypotenuse, and teach SOH-CAH-TOA.`, r`Draw the unit circle and show that the point at angle $\theta$ is $(\cos\theta, \sin\theta)$.`, r`Explain radians: walking a distance around the circle; a full circle is $2\pi$.`, r`Mark the special angles $0, \frac{\pi}{6}, \frac{\pi}{4}, \frac{\pi}{3}, \frac{\pi}{2}, \pi$ and their sine and cosine.`, r`Prove $\sin^2\theta + \cos^2\theta = 1$ with the Pythagorean theorem on the unit circle.`],
      questions: [
        { q: 'Why do we use radians instead of degrees?', a: r`Radians measure angles by actual distance along the circle, which makes calculus formulas like $\frac{d}{dx}\sin x = \cos x$ come out clean. With degrees, an ugly $\frac{\pi}{180}$ appears everywhere.` },
        { q: 'How can an angle be bigger than 90° in a triangle definition?', a: 'It can’t, in a triangle. That is why we use the unit circle: walking around the circle works for any angle, even more than a full turn.' },
        { q: 'Why can sine never be bigger than 1?', a: 'Sine is a height on a circle of radius 1. You can never be higher than the top of the circle.' },
      ],
      keyPoints: ['SOH-CAH-TOA for right triangles.', 'Unit circle: the point at angle θ is (cos θ, sin θ).', '180° = π radians; calculus uses radians.', 'sin²θ + cos²θ = 1 comes from the Pythagorean theorem.'],
    },
  },
};
