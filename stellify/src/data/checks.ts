import type { SkillId } from '@/lib/types';

const r = String.raw;

/** Quick checks: ten-second, low-stakes questions used inside interactive lessons. */
export interface QuickCheck { q: string; options: string[]; answer: number; why: string }
type Row = [string, string[], number, string];

const RAW: Record<SkillId, Row[]> = {
  lin1: [
    [r`After simplifying, an equation becomes $7x - 2 = 7x + 5$. How many solutions does it have?`, ['Exactly one', 'None', 'Infinitely many'], 1, r`The $x$-terms cancel and leave $-2 = 5$, which is never true.`],
    [r`$|x - 4| = 3$. Which describes the solutions?`, [r`$x = 7$ only`, r`$x = 7$ or $x = 1$`, r`$x = 7$ or $x = -7$`], 1, r`$x - 4 = 3$ or $x - 4 = -3$, so $x = 7$ or $x = 1$.`],
  ],
  linf: [
    [r`$C(t) = 35 + 12t$ gives the cost after $t$ hours. What does 12 represent?`, ['The starting fee', 'The cost added each hour', 'The total cost'], 1, 'The coefficient of the variable is the rate: 12 per hour.'],
    [r`$f$ is linear, $f(2) = 5$ and $f(4) = 11$. What is $f(6)$?`, ['$14$', '$17$', '$22$'], 1, 'Equal steps in x give equal steps in f: 5, 11, 17.'],
  ],
  lin2: [
    [r`What is the slope of the line $3x + 4y = 12$?`, [r`$\frac{3}{4}$`, r`$-\frac{3}{4}$`, r`$-\frac{4}{3}$`], 1, r`Slope of $Ax + By = C$ is $-\frac{A}{B}$.`],
    [r`A line has slope $\frac{2}{5}$. What is the slope of a perpendicular line?`, [r`$\frac{5}{2}$`, r`$-\frac{2}{5}$`, r`$-\frac{5}{2}$`], 2, 'Negative reciprocal: flip the fraction and change the sign.'],
  ],
  sys: [
    [r`$2x + y = 7$ and $4x + 2y = 14$. How many solutions?`, ['One', 'None', 'Infinitely many'], 2, 'The second equation is exactly twice the first: the same line.'],
    [r`$5x + 2y = 20$ and $2x + 5y = 15$. Fastest way to get $x + y$?`, ['Solve for x, then y', 'Add the equations', 'Graph them'], 1, r`Adding gives $7x + 7y = 35$, so $x + y = 5$.`],
  ],
  ineq: [
    [r`Solve $-2x > 8$.`, [r`$x > -4$`, r`$x < -4$`, r`$x < 4$`], 1, 'Dividing by a negative number flips the inequality.'],
    ['A bus holds at most 40 people. 38.6 is the computed limit for groups. How many whole groups fit?', ['38', '39', '40'], 0, 'A maximum under a limit rounds down.'],
  ],
  equiv: [
    [r`$(x + 3)^2$ equals…`, [r`$x^2 + 9$`, r`$x^2 + 6x + 9$`, r`$x^2 + 3x + 9$`], 1, r`$(a + b)^2 = a^2 + 2ab + b^2$. The middle term is $2 \cdot x \cdot 3$.`],
    [r`$x^{1/2} \cdot x^{1/3} = $`, [r`$x^{1/6}$`, r`$x^{5/6}$`, r`$x^{2/5}$`], 1, 'Multiplying powers adds the exponents: 1/2 + 1/3 = 5/6.'],
  ],
  nleq: [
    [r`$x^2 - 6x + 9 = 0$ has how many real solutions?`, ['Two', 'One', 'None'], 1, r`Discriminant: $36 - 36 = 0$, so exactly one.`],
    [r`You solve $\sqrt{x + 2} = x$ and get $x = 2$ and $x = -1$. Which are solutions?`, ['Both', r`Only $x = 2$`, r`Only $x = -1$`], 1, r`A square root is never negative, so $x = -1$ is extraneous.`],
  ],
  nlf: [
    [r`$f(x) = -(x - 2)^2 + 9$. What is the maximum value of $f$?`, ['$2$', '$9$', '$-2$'], 1, 'Vertex form: the vertex is (2, 9), and the parabola opens down.'],
    [r`$P(t) = 500(0.9)^t$. Each year the quantity…`, ['drops by 90%', 'drops by 10%', 'drops by 0.9%'], 1, 'The factor 0.9 keeps 90%, which is a 10% decrease.'],
  ],
  ratio: [
    ['Lengths are multiplied by 3. Areas are multiplied by…', ['3', '6', '9'], 2, 'Areas scale by the square of the length factor.'],
    [r`The ratio of red to blue is $2 : 3$. What fraction of the total is red?`, [r`$\frac{2}{3}$`, r`$\frac{2}{5}$`, r`$\frac{3}{5}$`], 1, 'Two parts out of five total parts.'],
  ],
  pct: [
    ['A price rises 10% and then falls 10%. Compared with the start, it is…', ['the same', '1% lower', '1% higher'], 1, r`$1.10 \times 0.90 = 0.99$.`],
    [r`After a 25% discount an item costs \$60. The original price was…`, [r`\$75`, r`\$80`, r`\$85`], 1, r`$60 \div 0.75 = 80$. Undo a change by dividing by its multiplier.`],
  ],
  data1: [
    ['Every value in a data set increases by 5. The standard deviation…', ['increases by 5', 'stays the same', 'is multiplied by 5'], 1, 'Shifting every value does not change how spread out they are.'],
    ['Five numbers have a mean of 8. Their sum is…', ['13', '40', '45'], 1, 'Sum = mean × count.'],
  ],
  data2: [
    ['x: 0, 1, 2 and y: 4, 12, 36. The best model is…', ['linear', 'exponential', 'quadratic'], 1, 'Each step multiplies y by 3: constant ratio.'],
    ['A point lies above the line of best fit. Its residual is…', ['positive', 'negative', 'zero'], 0, 'Residual = actual − predicted.'],
  ],
  prob: [
    ['"Given that the student walks…" — what is the denominator?', ['All students', 'Students who walk', 'Students who do not walk'], 1, 'The condition names the group you are choosing from.'],
    [r`Two cards are drawn without replacement from 3 red and 2 blue. P(both red)?`, [r`$\frac{9}{25}$`, r`$\frac{3}{10}$`, r`$\frac{6}{25}$`], 1, r`$\frac{3}{5} \cdot \frac{2}{4} = \frac{3}{10}$.`],
  ],
  infer: [
    ['A poll finds 48% support with a 4-point margin of error. Can we conclude a majority opposes?', ['Yes', 'No'], 1, 'The plausible range, 44% to 52%, includes values above 50%.'],
    ['To shrink the margin of error, a researcher should…', ['use a larger random sample', 'use a smaller sample', 'survey volunteers only'], 0, 'Larger random samples give more precise estimates.'],
  ],
  claims: [
    ['Volunteers are randomly assigned a treatment. What does the random assignment allow?', ['Generalizing to everyone', 'A cause-and-effect conclusion', 'Neither'], 1, 'Assignment → causation. Selection → generalization.'],
    ['A random sample of adults is only observed, with no treatment assigned. The study can show…', ['causation', 'an association in the population', 'nothing'], 1, 'Random sampling generalizes; without an experiment there is no causal claim.'],
  ],
  area: [
    [r`A cylinder has radius 2 and height 5. Its volume is…`, [r`$10\pi$`, r`$20\pi$`, r`$40\pi$`], 1, r`$\pi r^2 h = \pi \cdot 4 \cdot 5$.`],
    ['A cube’s edges are doubled. Its volume is multiplied by…', ['2', '4', '8'], 2, 'Volume scales by the cube of the length factor.'],
  ],
  lines: [
    ['Parallel lines are cut by a transversal. Alternate interior angles are…', ['equal', 'supplementary', 'complementary'], 0, 'Alternate interior and corresponding angles are equal.'],
    [r`In triangle $ABC$, $DE \parallel BC$, $AD = 4$, $DB = 4$, $DE = 5$. $BC$ = ?`, ['$5$', '$9$', '$10$'], 2, r`Use whole sides: $\frac{AD}{AB} = \frac{4}{8}$, so $BC = 10$.`],
  ],
  trig: [
    [r`In a right triangle, $\sin 35^\circ$ equals…`, [r`$\cos 35^\circ$`, r`$\cos 55^\circ$`, r`$\tan 55^\circ$`], 1, 'Sine of an angle equals cosine of its complement.'],
    ['A right triangle has legs 9 and 12. The hypotenuse is…', ['15', '21', '13'], 0, '9-12-15 is a 3-4-5 triangle scaled by 3.'],
  ],
  circ: [
    [r`$(x + 1)^2 + (y - 4)^2 = 36$. The center is…`, [r`$(1, -4)$`, r`$(-1, 4)$`, r`$(-1, -4)$`], 1, 'The center makes each parenthesis zero.'],
    ['An inscribed angle intercepts an arc of 80°. The angle measures…', ['80°', '40°', '160°'], 1, 'An inscribed angle is half its arc.'],
  ],
  cid: [
    ['A choice is true in real life but the passage never says it. It is…', ['a strong answer', 'wrong'], 1, 'Every part of the answer must be supported by the text.'],
    ['A text says a finding "may suggest" something. The best main-idea choice says…', ['"proves"', '"suggests"', '"disproves"'], 1, 'Match the text’s level of certainty.'],
  ],
  coet: [
    ['Hypothesis: plants grow taller with music. Which supports it?', ['Plants near music grew taller than identical plants in silence', 'Plants like sunlight', 'Music is popular with gardeners'], 0, 'Support needs the condition (music) and the result (taller).'],
    ['Claim: a new law caused accidents to fall. What weakens it most?', ['Accidents fell equally in places without the law', 'The law was popular', 'Accidents are costly'], 0, 'The effect without the cause points to another explanation.'],
  ],
  coeq: [
    ['Three choices describe the table accurately. You should pick…', ['the one with the biggest number', 'the one that supports the claim', 'any of them'], 1, 'Accurate is not enough; it must be relevant to the claim.'],
    ['A claim says a program’s effect "grew over time." You need…', ['one year’s value', 'the change in the gap between groups across years', 'the largest value'], 1, 'An effect is a difference; "grew" needs it at two or more times.'],
  ],
  inf: [
    ['One small study finds a link. The safest inference uses…', ['"proves"', '"may"', '"always"'], 1, 'Limited evidence supports a limited claim.'],
    ['A text says "even though the workshop never moved." That phrase is there to…', ['rule out an explanation', 'add colour', 'state the conclusion'], 0, 'Such clauses eliminate wrong answers for you.'],
  ],
  wic: [
    ['Where is the clue for a vocabulary blank most often found?', ['In the answer choices', 'After a colon, dash or comma in the sentence', 'Nowhere; you must know the word'], 1, 'The sentence defines its own blank.'],
    ['"Rather than ______ the theory, the data contradicted it." The blank means…', ['support', 'attack', 'ignore'], 0, '"Rather than" sets the blank against "contradicted."'],
  ],
  tsp: [
    ['A function question asks…', ['what the sentence mentions', 'what job the sentence does'], 1, 'Describe its role relative to the sentences around it.'],
    ['A sentence begins "Curiously, …" and the next offers "a resolution." The first one…', ['introduces a puzzle', 'gives evidence', 'states the conclusion'], 0, '"Curiously" flags something that needs explaining.'],
  ],
  ctc: [
    ['Text 2 "agrees … but notes" something about Text 1. The relationship is…', ['total disagreement', 'partial agreement with a qualification', 'unrelated'], 1, '"Yes, but" is the most common paired-text relationship.'],
    ['For "both authors would agree," a choice must be acceptable to…', ['either author', 'both authors'], 1, 'Test the choice against each text separately.'],
  ],
  tra: [
    ['"Sales fell. ______ profits rose." The relationship is…', ['addition', 'contrast', 'example'], 1, 'The second idea runs against the first.'],
    ['"The report found a single cause. ______ the wiring was faulty."', ['For example,', 'Specifically,', 'However,'], 1, 'It names THE cause, not one of several.'],
  ],
  syn: [
    ['In a notes question, what do you read first?', ['All the notes', 'The goal', 'The longest choice'], 1, 'Every choice is true; only one does what the goal says.'],
    ['Goal: "emphasize a similarity." The answer must…', ['contrast the two things', 'say what both share', 'describe one of them'], 1, 'Look for "both" or "like."'],
  ],
  bnd: [
    ['"The quokka, a small marsupial ___ appears to smile." What goes in the blank?', ['a comma', 'nothing', 'a semicolon'], 0, 'The aside opened with a comma, so it closes with one.'],
    ['"The trail was closed ___ leaving hikers stranded." Which works?', ['a period', 'a semicolon', 'a comma'], 2, '"Leaving hikers stranded" is not a sentence, so only a comma works.'],
  ],
  fss: [
    ['"The box of old letters ___ in the attic."', ['is', 'are'], 0, 'The subject is "box," not "letters."'],
    ['"Running late, ___" Which ending is correct?', ['the bus left without Maya.', 'Maya missed the bus.'], 1, 'Maya was running late, so "Maya" must come right after the comma.'],
  ],
};

export const CHECKS = Object.fromEntries(Object.entries(RAW).map(([k, rows]) => [k, rows.map(([q, options, answer, why]) => ({ q, options, answer, why }))])) as Record<SkillId, QuickCheck[]>;
