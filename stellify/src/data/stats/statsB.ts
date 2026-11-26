import type { CalcLesson, CalcProblem, LessonTutor } from '../calc/types';
import { binomCdf, binomPdf, geomPdf, near, round } from './lib';

const r = String.raw;
const P = (id: string, level: 1 | 2 | 3, q: string, answer: number | string[], hint: string, solution: string[], extra: Partial<CalcProblem> = {}): CalcProblem => ({ id, level, q, answer, hint, solution, ...extra });

/** a discrete random variable used in st4-2 */
const XV = [0, 1, 2, 3], XP = [0.1, 0.3, 0.4, 0.2];
const EX = XV.reduce((s, x, i) => s + x * XP[i], 0);
const VX = XV.reduce((s, x, i) => s + (x - EX) ** 2 * XP[i], 0);
const XTABLE = r`~~~
Pets (X)      0    1    2    3
Probability  0.1  0.3  0.4  0.2
~~~`;

/** AP Statistics Units 3–4. Original lessons and problems. */
export const STATS_B: CalcLesson[] = [
  {
    id: 'st3-1', unit: 3, n: 1, title: 'Sampling methods and bias',
    intro: 'A statistic is only as good as the data behind it. Today you learn the difference between an observational study and an experiment, how to pick a random sample (simple random, stratified, cluster, systematic), and the ways a sample can be biased so that its answers miss the truth.',
    goals: ['Tell a sample survey, an observational study and an experiment apart', 'Describe simple random, stratified, cluster and systematic samples', 'Recognize undercoverage, nonresponse, response bias and voluntary response', 'Explain why random selection lets us generalize to a population'],
    notes: [
      { k: 'list', items: [r`The **population** is the whole group we want to learn about; the **sample** is the part we actually measure.`, r`An **observational study** observes without assigning treatments; an **experiment** deliberately imposes treatments.`, r`Only a well-designed experiment can show cause and effect.`] },
      { k: 'list', items: [r`**Simple random sample (SRS)**: every group of $n$ individuals has the same chance to be chosen.`, r`**Stratified**: split the population into similar groups (strata), then take an SRS from each.`, r`**Cluster**: split into groups that each look like the population, randomly pick whole groups, and survey everyone in them.`, r`**Systematic**: pick a random start, then every $k$th individual.`] },
      { k: 'rule', title: 'Sources of bias', t: r`**Undercoverage**: some groups cannot be chosen. **Nonresponse**: chosen people do not answer. **Response bias**: answers are pushed by wording or the setting. **Voluntary response**: people choose themselves, usually those with strong opinions. **Convenience sampling**: choosing whoever is easiest to reach.` },
      { k: 'p', t: r`Random selection makes the sample likely to represent the population, so results can be **generalized** to that population. A bigger sample reduces variability, but it does not fix bias.` },
      { k: 'warn', t: r`Stratified and cluster samples are easy to mix up. Strata are alike inside (all 9th graders) and you sample from every stratum. Clusters are mixed inside (one homeroom) and you take a few whole clusters.` },
    ],
    examples: [
      { q: r`A school has 300 freshmen, 200 sophomores and 100 juniors. A stratified sample of 60 students is taken in proportion to grade size. How many sophomores are chosen?`, steps: [r`Sophomores are $\frac{200}{600} = \frac{1}{3}$ of the school.`, r`$\frac{1}{3} \times 60 = 20$ sophomores.`], a: '20' },
      { q: r`A radio host asks listeners to call in and say whether they support a new law. 80% of callers oppose it. Why is this not a good estimate?`, steps: [r`Listeners choose whether to call: this is a voluntary response sample.`, r`People with strong (often negative) feelings are the most likely to call, so the 80% probably overstates opposition.`], a: 'Voluntary response bias' },
    ],
    practice: [
      P('st3-1-1', 1, r`A systematic sample of 25 students is taken from a list of 500. A student is picked at random from the first $k$ on the list, then every $k$th student after that. What is $k$?`, ['20'], 'Population size ÷ sample size.', [r`$500 \div 25 = 20$: every 20th student.`], { check: () => 500 / 25 === 20 }),
      P('st3-1-2', 2, r`Using the school above (300, 200 and 100 students by grade), how many freshmen are in a proportional stratified sample of 60?`, ['30'], 'Freshmen are what fraction of the 600 students?', [r`$\frac{300}{600} \times 60 = 30$.`], { check: () => (300 / 600) * 60 === 30 }),
      P('st3-1-3', 1, r`A researcher randomly selects 5 of a city's 40 neighborhoods and surveys every household in those 5. This is a`, 2, 'Whole groups are chosen, then everyone in them is surveyed.', [r`Randomly choosing whole groups and measuring everyone in them is a cluster sample.`], { choices: ['simple random sample', 'stratified random sample', 'cluster sample', 'convenience sample'] }),
      P('st3-1-4', 2, r`A survey asks, "Don't you agree that the cafeteria food is too expensive?" Which bias is most likely?`, 1, 'The question itself pushes people toward an answer.', [r`Leading wording pushes respondents toward "yes": response bias.`], { choices: ['Undercoverage', 'Response bias', 'Nonresponse', 'Voluntary response'] }),
      P('st3-1-5', 2, r`A phone survey that only calls landline numbers will most likely suffer from`, 0, 'Who cannot be reached at all?', [r`People with only cell phones (many of them young) cannot be selected: undercoverage.`], { choices: ['undercoverage', 'response bias', 'voluntary response', 'no bias, because the numbers are random'] }),
      P('st3-1-6', 3, r`A study records the diets of 2,000 adults and finds that those who eat breakfast have lower weights. What can be concluded?`, 3, 'Were treatments assigned?', [r`No one was assigned to eat breakfast, so this is an observational study. It shows an association, but lurking variables (like exercise habits) could explain it, so it cannot show cause and effect.`], { choices: ['Eating breakfast causes lower weight', 'Skipping breakfast causes weight gain', 'The study is an experiment, so causation is shown', 'There is an association, but causation cannot be concluded'] }),
    ],
    remember: ['Random selection → generalize to the population.', 'Strata: sample from each similar group. Clusters: take whole mixed groups.', 'A larger sample does not fix bias.'],
    checkIn: 'Next: designing experiments that can show cause and effect.',
  },
  {
    id: 'st3-2', unit: 3, n: 2, title: 'Designing experiments',
    intro: 'To show that one thing causes another, we need an experiment: we choose the treatments and randomly decide who gets which. Today you learn the vocabulary of experiments, the four principles of a good design, and the three main designs: completely randomized, randomized block and matched pairs.',
    goals: ['Identify experimental units, factors, levels, treatments and the response variable', 'Apply the principles of comparison, random assignment, control and replication', 'Explain blocking and matched-pairs designs', 'Explain why random assignment allows cause-and-effect conclusions'],
    notes: [
      { k: 'list', items: [r`**Experimental units** are what the treatments are applied to (called **subjects** when they are people).`, r`A **factor** is an explanatory variable the experimenter sets; its values are **levels**.`, r`A **treatment** is a specific combination of factor levels. Two factors with 3 and 2 levels give $3 \times 2 = 6$ treatments.`] },
      { k: 'rule', title: 'Four principles of design', t: r`**Comparison** (use two or more treatments, often with a control group), **random assignment** (chance decides who gets which treatment), **control** (keep other variables the same for all groups), **replication** (enough units in each group).` },
      { k: 'p', t: r`A **placebo** is a fake treatment. In a **double-blind** experiment, neither the subjects nor the people measuring the response know who got which treatment, so expectations cannot affect the results.` },
      { k: 'p', t: r`**Blocking** groups similar units (for example, by age) and randomly assigns treatments within each block, which removes the block's variability from the comparison. **Matched pairs** is blocking with blocks of two (or one subject receiving both treatments in random order).` },
      { k: 'warn', t: r`Random **sampling** lets you generalize to a population. Random **assignment** lets you conclude cause and effect. A study can have one, both or neither.` },
    ],
    examples: [
      { q: r`An experiment tests 3 fertilizer amounts and 2 watering schedules on tomato plants. How many treatments are there?`, steps: [r`Each treatment combines one fertilizer amount with one watering schedule.`, r`$3 \times 2 = 6$ treatments.`], a: '6' },
      { q: r`A researcher wants to compare two study apps. Students' current grades vary a lot. How could blocking help?`, steps: [r`Group students into blocks with similar current grades (for example, A/B students and C/D students).`, r`Within each block, randomly assign half to each app. Comparing apps within blocks removes the effect of prior grades and makes the comparison more precise.`], a: 'Block by current grade, then randomize within blocks' },
    ],
    practice: [
      P('st3-2-1', 1, r`An experiment has two factors: caffeine (0 mg, 100 mg, 200 mg) and sleep (4 hours, 8 hours). How many treatments are there?`, ['6'], 'Multiply the number of levels.', [r`$3 \times 2 = 6$ treatments.`], { check: () => 3 * 2 === 6 }),
      P('st3-2-2', 1, r`40 volunteers are randomly assigned equally to 4 treatments. How many are in each group?`, ['10'], 'Divide evenly.', [r`$40 \div 4 = 10$ per group.`], { check: () => 40 / 4 === 10 }),
      P('st3-2-3', 2, r`What is the main purpose of random assignment in an experiment?`, 0, 'Think about lurking variables.', [r`Random assignment spreads other variables evenly across groups, so differences in the response can be attributed to the treatments.`], { choices: ['To create groups that are similar except for the treatment', 'To make the results apply to everyone in the country', 'To make the sample larger', 'To make the experiment double-blind'] }),
      P('st3-2-4', 2, r`In a double-blind experiment,`, 2, 'Who does not know?', [r`Neither the subjects nor the people who measure the response know which treatment each subject got.`], { choices: ['the subjects are blindfolded', 'only the subjects do not know their treatment', 'neither the subjects nor those measuring the response know who got which treatment', 'the researcher does not know the hypothesis'] }),
      P('st3-2-5', 3, r`To compare two running shoes, each of 20 runners wears shoe A on one foot and shoe B on the other, with a coin flip deciding which foot gets A. This design is`, 1, 'Each runner gets both treatments.', [r`Each runner is a pair (left and right foot) receiving both treatments in a random arrangement: a matched-pairs design.`], { choices: ['a completely randomized design', 'a matched-pairs design', 'an observational study', 'a cluster sample'] }),
      P('st3-2-6', 2, r`A sleep study uses 120 volunteers from one college, randomly assigned to two treatments. A clear difference is found. To whom can the cause-and-effect conclusion be applied?`, 3, 'Random assignment, but were the volunteers randomly sampled?', [r`Random assignment supports causation, but the subjects were volunteers from one college, not a random sample, so the conclusion applies to people like these volunteers.`], { choices: ['All college students in the country', 'All adults', 'No one, because volunteers were used', 'Subjects like those in the study'] }),
    ],
    remember: ['Treatments = combinations of factor levels.', 'Compare, randomly assign, control, replicate.', 'Random assignment → causation; random sampling → generalization.'],
    checkIn: 'Unit 3 done. Next: probability.',
  },
  {
    id: 'st4-1', unit: 4, n: 1, title: 'Probability rules, conditional probability and independence',
    intro: 'Probability measures how likely something is, on a scale from 0 (never) to 1 (always). Today you learn the addition and multiplication rules, conditional probability ("given that"), what independence means, and how a tree diagram organizes a problem with stages.',
    goals: ['Use the complement and addition rules', 'Compute conditional probabilities', 'Check whether two events are independent', 'Solve multi-stage problems with a tree diagram'],
    notes: [
      { k: 'formula', t: r`P(A^C) = 1 - P(A) \qquad P(A \cup B) = P(A) + P(B) - P(A \cap B)` },
      { k: 'formula', t: r`P(A \mid B) = \frac{P(A \cap B)}{P(B)} \qquad P(A \cap B) = P(A)\,P(B \mid A)` },
      { k: 'rule', title: 'Independence', t: r`Events $A$ and $B$ are independent if knowing one happened does not change the probability of the other: $P(A \mid B) = P(A)$. For independent events, $P(A \cap B) = P(A)\,P(B)$.` },
      { k: 'p', t: r`**Mutually exclusive** events cannot happen together: $P(A \cap B) = 0$. Then the addition rule is just $P(A) + P(B)$.` },
      { k: 'p', t: r`A **tree diagram** shows each stage as branches. Multiply along a path to get the probability of that path; add the paths that lead to the event you want.` },
      { k: 'warn', t: r`Mutually exclusive is not the same as independent. If $A$ and $B$ are mutually exclusive (and both possible), knowing $A$ happened tells you $B$ did not, so they are dependent.` },
    ],
    examples: [
      { q: r`$P(A) = 0.5$, $P(B) = 0.4$ and $P(A \cap B) = 0.2$. Find $P(A \cup B)$ and decide whether $A$ and $B$ are independent.`, steps: [r`$P(A \cup B) = 0.5 + 0.4 - 0.2 = 0.7$.`, r`$P(A)\,P(B) = 0.5 \times 0.4 = 0.2 = P(A \cap B)$, so they are independent.`], a: '0.7; independent' },
      { q: r`2% of people have a condition. A test is positive for 95% of people with it and for 10% of people without it. What is $P(\text{positive})$?`, steps: [r`Path "has it, positive": $0.02 \times 0.95 = 0.019$. Path "does not, positive": $0.98 \times 0.10 = 0.098$.`, r`Add the paths: $0.019 + 0.098 = 0.117$.`], a: '0.117' },
    ],
    practice: [
      P('st4-1-1', 1, r`$P(A) = 0.5$, $P(B) = 0.4$, $P(A \cap B) = 0.2$. What is $P(A \cup B)$?`, ['0.7'], 'Add, then subtract the overlap.', [r`$0.5 + 0.4 - 0.2 = 0.7$.`], { check: () => near(0.5 + 0.4 - 0.2, 0.7) }),
      P('st4-1-2', 1, r`With the same events, what is $P(A \mid B)$?`, ['0.5'], 'P(A and B) ÷ P(B).', [r`$0.2 \div 0.4 = 0.5$, which equals $P(A)$: independent.`], { check: () => near(0.2 / 0.4, 0.5) }),
      P('st4-1-3', 2, r`A fair die is rolled 4 times. What is the probability of at least one six? Round to three decimal places.`, ['0.518', '0.5177'], 'Use the complement: no sixes at all.', [r`$P(\text{no sixes}) = \left(\frac{5}{6}\right)^4 \approx 0.482$.`, r`$P(\text{at least one}) = 1 - 0.482 \approx 0.518$.`], { check: () => round(1 - (5 / 6) ** 4, 3) === 0.518 }),
      P('st4-1-4', 2, r`Using the medical test above (2% have the condition; 95% and 10% positive rates), what is $P(\text{positive})$?`, ['0.117'], 'Add the two "positive" paths.', [r`$0.02 \times 0.95 + 0.98 \times 0.10 = 0.019 + 0.098 = 0.117$.`], { check: () => near(0.02 * 0.95 + 0.98 * 0.1, 0.117) }),
      P('st4-1-5', 3, r`For the same test, what is $P(\text{has the condition} \mid \text{positive})$? Round to three decimal places.`, ['0.162', '0.1624'], 'The "has it and positive" path over all positives.', [r`$\frac{0.019}{0.117} \approx 0.162$.`, r`Only about 16% of positives actually have the condition, because the condition is rare.`], { check: () => round(0.019 / 0.117, 3) === 0.162 }),
      P('st4-1-6', 2, r`Events $A$ and $B$ are mutually exclusive, with $P(A) = 0.3$ and $P(B) = 0.4$. Which is true?`, 1, 'What is P(A and B)?', [r`Mutually exclusive means $P(A \cap B) = 0$, but $P(A)\,P(B) = 0.12$. These differ, so the events are not independent.`], { choices: ['A and B are independent', 'A and B are not independent', 'P(A or B) = 0.12', 'P(A and B) = 0.12'] }),
    ],
    remember: ['Complement: 1 − P(A).', 'Or: add, subtract the overlap. Given: divide by the condition.', 'Independent: P(A|B) = P(A).'],
    checkIn: 'Next: random variables, their means and their standard deviations.',
  },
  {
    id: 'st4-2', unit: 4, n: 2, title: 'Discrete random variables and combining them',
    intro: 'A random variable assigns a number to each outcome of a chance process, such as the number of pets in a randomly chosen home. Today you find its mean (expected value) and standard deviation, see how they change when you transform it, and learn how to combine two independent random variables.',
    goals: ['Find the mean (expected value) of a discrete random variable', 'Find its variance and standard deviation', 'Apply the rules for linear transformations', 'Find the mean and SD of a sum or difference of independent random variables'],
    notes: [
      { k: 'formula', t: r`\mu_X = \sum x_i\,p_i \qquad \sigma_X^2 = \sum (x_i - \mu_X)^2\,p_i` },
      { k: 'p', t: r`The probabilities of a valid distribution are each between 0 and 1 and add to exactly 1.` },
      { k: 'rule', title: 'Linear transformations', t: r`If $Y = a + bX$, then $\mu_Y = a + b\mu_X$ and $\sigma_Y = |b|\,\sigma_X$. Adding a constant shifts the mean only; multiplying scales both.` },
      { k: 'rule', title: 'Combining independent random variables', t: r`$\mu_{X \pm Y} = \mu_X \pm \mu_Y$. Variances always **add**: $\sigma^2_{X \pm Y} = \sigma_X^2 + \sigma_Y^2$, so $\sigma_{X \pm Y} = \sqrt{\sigma_X^2 + \sigma_Y^2}$.` },
      { k: 'warn', t: r`Never add standard deviations, and never subtract variances. Even for $X - Y$, the variances add, because subtracting still adds uncertainty.` },
      { k: 'p', t: r`Distribution used today:
${XTABLE}` },
    ],
    examples: [
      { q: r`Find the expected number of pets, $E(X)$.`, steps: [r`Multiply each value by its probability: $0(0.1) + 1(0.3) + 2(0.4) + 3(0.2)$.`, r`$= 0 + 0.3 + 0.8 + 0.6 = 1.7$ pets.`], a: '1.7' },
      { q: r`Find the standard deviation of $X$.`, steps: [r`$\sigma^2 = (0-1.7)^2(0.1) + (1-1.7)^2(0.3) + (2-1.7)^2(0.4) + (3-1.7)^2(0.2) = 0.289 + 0.147 + 0.036 + 0.338 = 0.81$.`, r`$\sigma = \sqrt{0.81} = 0.9$ pets.`], a: '0.9' },
    ],
    practice: [
      P('st4-2-1', 1, r`Using the pet distribution, what is $P(X \ge 2)$?`, ['0.6'], 'Add the probabilities for 2 and 3.', [r`$0.4 + 0.2 = 0.6$.`], { check: () => near(XP[2] + XP[3], 0.6) }),
      P('st4-2-2', 1, r`What is the expected value $E(X)$?`, ['1.7'], 'Σ x·p.', [r`$0 + 0.3 + 0.8 + 0.6 = 1.7$.`], { check: () => near(EX, 1.7) }),
      P('st4-2-3', 2, r`What is the variance of $X$?`, ['0.81'], 'Σ (x − μ)²·p.', [r`$0.289 + 0.147 + 0.036 + 0.338 = 0.81$.`], { check: () => near(VX, 0.81) }),
      P('st4-2-4', 2, r`A pet store gives each home \$5 plus \$2 per pet: $Y = 5 + 2X$. What is the mean of $Y$, in dollars?`, ['8.4'], 'μ_Y = a + b·μ_X.', [r`$5 + 2(1.7) = 8.4$ dollars.`], { check: () => near(5 + 2 * EX, 8.4) }),
      P('st4-2-5', 2, r`What is the standard deviation of $Y = 5 + 2X$, in dollars?`, ['1.8'], 'Adding 5 does not change spread.', [r`$\sigma_Y = 2 \times 0.9 = 1.8$ dollars.`], { check: () => near(2 * Math.sqrt(VX), 1.8) }),
      P('st4-2-6', 3, r`$X$ and $Y$ are independent with $\sigma_X = 3$ and $\sigma_Y = 4$. What is the standard deviation of $X - Y$?`, ['5'], 'Add the variances, then take the square root.', [r`$\sqrt{3^2 + 4^2} = \sqrt{25} = 5$.`], { check: () => Math.sqrt(9 + 16) === 5 }),
    ],
    remember: ['E(X) = Σ x·p.', 'Y = a + bX: mean a + bμ, SD |b|σ.', 'Independent sums and differences: variances add.'],
    checkIn: 'Next: two special random variables, binomial and geometric.',
  },
  {
    id: 'st4-3', unit: 4, n: 3, title: 'Binomial and geometric distributions',
    intro: 'Some chance processes repeat the same trial over and over: shooting free throws, guessing on a quiz. Today you learn the binomial distribution (how many successes in a fixed number of trials) and the geometric distribution (how many trials until the first success), with their formulas, means and standard deviations.',
    goals: ['Check the conditions for a binomial setting (BINS)', 'Compute binomial probabilities, mean and standard deviation', 'Compute geometric probabilities and mean', 'Choose between binomial and geometric models'],
    notes: [
      { k: 'rule', title: 'Binomial setting: BINS', t: r`**B**inary (success or failure), **I**ndependent trials, **N**umber of trials fixed in advance, **S**ame probability of success $p$ on every trial.` },
      { k: 'formula', t: r`P(X = k) = \binom{n}{k} p^k (1-p)^{n-k} \qquad \mu = np \qquad \sigma = \sqrt{np(1-p)}` },
      { k: 'p', t: r`A **geometric** random variable counts trials until the first success (no fixed number of trials).` },
      { k: 'formula', t: r`P(X = k) = (1-p)^{k-1} p \qquad \mu = \frac{1}{p}` },
      { k: 'list', items: [r`Calculator: binompdf$(n, p, k)$ gives $P(X = k)$; binomcdf$(n, p, k)$ gives $P(X \le k)$.`, r`$P(X \ge k) = 1 - P(X \le k - 1)$.`] },
      { k: 'warn', t: r`When sampling without replacement, trials are not exactly independent. The **10% condition** says it is fine to treat them as independent if the sample is at most 10% of the population.` },
    ],
    examples: [
      { q: r`A student guesses on 10 multiple-choice questions, each with a 0.3 chance of being right. Find $P(X = 3)$.`, steps: [r`$\binom{10}{3} = 120$, so $P(X = 3) = 120 (0.3)^3 (0.7)^7$.`, r`$= 120 \times 0.027 \times 0.0824 \approx 0.267$.`], a: '0.267' },
      { q: r`A basketball player makes 20% of her three-point shots. What is the probability that her first make is on her 3rd shot?`, steps: [r`Miss, miss, make: $(0.8)^2(0.2)$.`, r`$= 0.64 \times 0.2 = 0.128$.`], a: '0.128' },
    ],
    practice: [
      P('st4-3-1', 2, r`$X$ is binomial with $n = 10$ and $p = 0.3$. What is $P(X = 3)$? Round to three decimal places.`, ['0.267', '0.2668'], 'C(10,3)(0.3)³(0.7)⁷.', [r`$120 \times 0.027 \times 0.0824 \approx 0.267$.`], { check: () => round(binomPdf(10, 0.3, 3), 3) === 0.267 }),
      P('st4-3-2', 2, r`Same $X$. What is $P(X \le 3)$? Round to three decimal places.`, ['0.65', '0.650', '0.6496'], 'Add P(X = 0) through P(X = 3), or use binomcdf.', [r`$0.028 + 0.121 + 0.233 + 0.267 \approx 0.650$.`], { check: () => round(binomCdf(10, 0.3, 3), 3) === 0.65 }),
      P('st4-3-3', 1, r`Same $X$. What is its mean?`, ['3'], 'μ = np.', [r`$10 \times 0.3 = 3$.`], { check: () => near(10 * 0.3, 3) }),
      P('st4-3-4', 2, r`Same $X$. What is its standard deviation? Round to three decimal places.`, ['1.449', '1.45'], 'σ = √(np(1 − p)).', [r`$\sqrt{10 \times 0.3 \times 0.7} = \sqrt{2.1} \approx 1.449$.`], { check: () => round(Math.sqrt(2.1), 3) === 1.449 }),
      P('st4-3-5', 2, r`A player makes 20% of her shots. What is the probability her first make is on the 3rd shot?`, ['0.128'], '(1 − p)²·p.', [r`$0.8^2 \times 0.2 = 0.128$.`], { check: () => near(geomPdf(0.2, 3), 0.128) }),
      P('st4-3-6', 1, r`You roll a die until you get a 6, and count the rolls. Which model fits?`, 2, 'Is the number of trials fixed?', [r`You count trials until the first success, with no fixed number of trials: geometric.`], { choices: ['Binomial with n = 6', 'Normal', 'Geometric with p = 1/6', 'Binomial with p = 1/6 and n = 1'] }),
    ],
    remember: ['Binomial: BINS; μ = np, σ = √(np(1 − p)).', 'Geometric: trials until the first success; μ = 1/p.', 'At least: use 1 − P(fewer).'],
    checkIn: 'Unit 4 done. Next: how statistics vary from sample to sample.',
  },
];

/** Tutor layer for Units 3–4. */
export const STATS_B_TUTOR: Record<string, LessonTutor> = {
  'st3-1': {
    bigIdea: [
      r`We usually cannot ask everyone (the population), so we ask some people (the sample) and use their answers to estimate the truth. That only works if the sample looks like the population.`,
      r`The best protection is chance: picking people at random means no one's opinions decide who gets picked. Different random methods (simple random, stratified, cluster, systematic) fit different situations.`,
      r`Bias is a mistake built into the method, so it pushes the answer the same wrong way every time. Leaving groups out, people not answering, slanted questions and letting people volunteer all cause bias, and a bigger sample does not fix any of them.`,
    ],
    picture: { title: 'Tasting soup', t: r`To check a pot of soup, you stir it and taste one spoonful. Stirring is the randomness: it makes the spoonful like the whole pot. Skim only the top without stirring and you might taste only the oil: that is bias.` },
    words: [
      { term: 'Population', means: 'The whole group we want to learn about.' },
      { term: 'Sample', means: 'The part of the population we actually collect data from.' },
      { term: 'Stratified sample', means: 'Split into similar groups, then randomly sample from each group.' },
      { term: 'Cluster sample', means: 'Randomly choose whole groups and survey everyone in them.' },
      { term: 'Bias', means: 'A method that systematically pushes results away from the truth.' },
    ],
    tools: [
      { name: 'Fractions of a whole', refresher: 'Part ÷ whole, then multiply by the sample size.', lesson: 'c0-1' },
      { name: 'Association vs causation', refresher: 'Two variables can move together without one causing the other.', lesson: 'st2-1' },
    ],
    why: [
      [r`A proportional stratified sample keeps each group's share the same as in the population.`, r`So sophomores get one third of the 60 spots.`],
      [r`The host did not choose who answered; the listeners chose themselves.`, r`People who care most are the ones who call, so the result is slanted.`],
    ],
    walk: {
      'st3-1-1': [r`A systematic sample takes every kth person.`, r`To end up with 25 people from 500, k = 500 ÷ 25.`, r`k = 20.`],
      'st3-1-2': [r`Freshmen are 300 of 600 students: one half.`, r`One half of 60 is 30.`, r`30 freshmen.`],
      'st3-1-3': [r`The groups (neighborhoods) were chosen at random.`, r`Everyone in the chosen groups was surveyed.`, r`That is a cluster sample (choice C).`],
      'st3-1-4': [r`"Don't you agree…" invites a yes.`, r`The wording pushes the answers.`, r`Response bias (choice B).`],
      'st3-1-5': [r`People without landlines can never be called.`, r`A group of the population is left out of the sampling.`, r`Undercoverage (choice A).`],
      'st3-1-6': [r`No one was told to eat breakfast; diets were only recorded.`, r`That is an observational study, and other habits could explain the difference.`, r`Association, not causation (choice D).`],
    },
    teach: {
      plan: [r`Define population and sample with a real example.`, r`Act out the four random sampling methods with the class roster.`, r`List the five kinds of bias with one example each.`, r`Explain why a larger biased sample is still biased.`, r`Contrast observational studies with experiments.`],
      questions: [
        { q: 'If I survey 10,000 people online, is that better than 500 random people?', a: 'Not if the 10,000 volunteered. Size reduces random variation but cannot remove bias; the 500 random people are more trustworthy.' },
        { q: 'When is stratifying a good idea?', a: 'When the groups differ in the thing you measure (for example, grades differ in their opinions); it gives more precise estimates.' },
        { q: 'Why can an observational study not prove causation?', a: 'Because a lurking variable might cause both the explanatory and response variables.' },
      ],
      keyPoints: ['Random selection lets you generalize.', 'Know the four sampling methods.', 'Bias is not fixed by size.'],
    },
  },
  'st3-2': {
    bigIdea: [
      r`An experiment is how we show cause and effect. Instead of watching what people already do, the researcher decides who gets which treatment.`,
      r`The key is random assignment. If chance decides who gets the new medicine, then the two groups are alike in every other way on average, so a difference in results must come from the treatment.`,
      r`Good experiments compare treatments, randomly assign them, keep everything else the same, and use enough subjects. Blocking groups similar subjects first, so their differences do not blur the comparison.`,
    ],
    picture: { title: 'A fair race', t: r`To test which of two shoes is faster, you would not give one shoe to the track team and the other to the chess club. You would let a coin decide who wears which shoe, so the groups are equally fast to begin with.` },
    words: [
      { term: 'Treatment', means: 'A specific condition applied to the units in an experiment.' },
      { term: 'Random assignment', means: 'Using chance to decide which units get which treatment.' },
      { term: 'Placebo', means: 'A fake treatment that looks like the real one.' },
      { term: 'Double-blind', means: 'Neither the subjects nor the evaluators know who got which treatment.' },
      { term: 'Blocking', means: 'Grouping similar units, then randomizing within each group.' },
    ],
    tools: [
      { name: 'Sampling', refresher: 'Random selection lets you generalize to the population.', lesson: 'st3-1' },
      { name: 'Multiplication', refresher: 'Combinations of choices multiply.', lesson: 'c0-1' },
    ],
    why: [
      [r`A treatment is one choice from each factor.`, r`So the count is the product of the numbers of levels.`],
      [r`Prior grades affect the response, so they would blur the comparison.`, r`Randomizing within blocks of similar students removes that effect.`],
    ],
    walk: {
      'st3-2-1': [r`Caffeine has 3 levels and sleep has 2 levels.`, r`Each treatment pairs one of each.`, r`3 × 2 = 6 treatments.`],
      'st3-2-2': [r`Equal groups means divide evenly.`, r`40 ÷ 4.`, r`10 per group.`],
      'st3-2-3': [r`Without randomizing, groups might differ in fitness, age or motivation.`, r`Chance makes the groups alike on average in everything except the treatment.`, r`Similar groups except for the treatment (choice A).`],
      'st3-2-4': [r`Single-blind: only the subjects do not know.`, r`Double-blind: the evaluators do not know either.`, r`Neither subjects nor evaluators know (choice C).`],
      'st3-2-5': [r`Each runner tests both shoes, one on each foot.`, r`A coin decides which foot gets which shoe.`, r`Matched pairs (choice B).`],
      'st3-2-6': [r`Random assignment means a cause-and-effect conclusion is fine.`, r`But the subjects were volunteers from one college, not a random sample of a larger group.`, r`It applies to subjects like those in the study (choice D).`],
    },
    teach: {
      plan: [r`Define units, factors, levels, treatments and the response.`, r`Count treatments for a two-factor design.`, r`Explain the four principles with a simple drug trial.`, r`Show how blocking and matched pairs reduce variability.`, r`Contrast random sampling and random assignment with a 2×2 table.`],
      questions: [
        { q: 'Why use a placebo instead of no treatment?', a: 'Believing you are treated can change results (the placebo effect); a placebo gives both groups the same expectations.' },
        { q: 'Is blocking the same as stratifying?', a: 'They are similar ideas: blocking groups similar units in an experiment; stratifying groups similar individuals in a sample.' },
        { q: 'Can an experiment with volunteers show causation?', a: 'Yes, if treatments are randomly assigned, but only for subjects like the volunteers.' },
      ],
      keyPoints: ['Treatments = factor-level combinations.', 'Random assignment → causation.', 'Blocking reduces variability.'],
    },
  },
  'st4-1': {
    bigIdea: [
      r`Probability is the long-run share of times something happens. A probability of 0.3 means that, over many repeats, it happens about 30% of the time.`,
      r`A few rules handle most problems. "Not A" is 1 minus P(A). "A or B" is P(A) plus P(B) minus the overlap, so the overlap is not counted twice. "A given B" means we only look at the cases where B happened.`,
      r`Two events are independent if one does not change the chances of the other. Tree diagrams organize problems in stages: multiply along each branch, then add the branches that end where you want.`,
    ],
    picture: { title: 'A rare disease test', t: r`Even a good test gives many false alarms when the disease is rare. Out of 1,000 people, about 19 sick people test positive, but so do about 98 healthy people. So most positives are actually healthy.` },
    words: [
      { term: 'Complement', means: 'The event that A does not happen.' },
      { term: 'Conditional probability', means: 'The probability of A given that B has happened.' },
      { term: 'Independent', means: 'Knowing one event happened does not change the probability of the other.' },
      { term: 'Mutually exclusive', means: 'The two events cannot happen at the same time.' },
    ],
    tools: [
      { name: 'Two-way tables', refresher: 'Conditional proportion = cell ÷ group total.', lesson: 'st2-1' },
      { name: 'Decimals and percents', refresher: 'Multiply decimals for "and"; 0.02 × 0.95 = 0.019.', lesson: 'c0-1' },
    ],
    why: [
      [r`The overlap was counted in both P(A) and P(B), so subtract it once.`, r`Independence is checked by comparing P(A and B) with P(A) × P(B).`],
      [r`Each path multiplies the chance of the first stage by the chance of the second.`, r`A positive can happen on two paths, so add them.`],
    ],
    walk: {
      'st4-1-1': [r`Addition rule: P(A) + P(B) − P(A and B).`, r`0.5 + 0.4 − 0.2.`, r`= 0.7.`],
      'st4-1-2': [r`P(A | B) = P(A and B) ÷ P(B).`, r`0.2 ÷ 0.4.`, r`= 0.5, the same as P(A): independent.`],
      'st4-1-3': [r`"At least one" is easier through its complement, "none".`, r`P(no six in 4 rolls) = (5/6)⁴ ≈ 0.482.`, r`1 − 0.482 ≈ 0.518.`],
      'st4-1-4': [r`Has the condition and tests positive: 0.02 × 0.95 = 0.019.`, r`Does not have it and tests positive: 0.98 × 0.10 = 0.098.`, r`Total: 0.019 + 0.098 = 0.117.`],
      'st4-1-5': [r`Given positive means we only look at the 0.117.`, r`The part that has the condition is 0.019.`, r`0.019 ÷ 0.117 ≈ 0.162.`],
      'st4-1-6': [r`Mutually exclusive: P(A and B) = 0.`, r`If independent, P(A and B) would be 0.3 × 0.4 = 0.12.`, r`0 ≠ 0.12, so not independent (choice B).`],
    },
    teach: {
      plan: [r`Define probability as a long-run relative frequency.`, r`Show the complement, addition and conditional rules on a Venn diagram.`, r`Test independence with numbers.`, r`Draw the medical test tree and compute both answers.`, r`Contrast mutually exclusive and independent.`],
      questions: [
        { q: 'Why subtract P(A and B) in the addition rule?', a: 'Because the overlap is included in both P(A) and P(B), so adding them counts it twice.' },
        { q: 'Why is P(sick | positive) so low here?', a: 'The condition is rare, so false positives from the many healthy people outnumber true positives.' },
        { q: 'Can two events with positive probabilities be both mutually exclusive and independent?', a: 'No: if they cannot happen together, one happening makes the other impossible, which changes its probability.' },
      ],
      keyPoints: ['Complement, addition, conditional rules.', 'Independence: P(A|B) = P(A).', 'Trees: multiply along, add across.'],
    },
  },
  'st4-2': {
    bigIdea: [
      r`A random variable turns a chance outcome into a number, like the number of pets in a randomly chosen home. Its probability distribution lists each possible value and its chance.`,
      r`The mean, or expected value, is the long-run average: weigh each value by its probability. The standard deviation measures how much the values typically vary from that mean.`,
      r`When you change units or combine random variables, simple rules apply. Adding a constant moves the mean only. Multiplying scales the mean and the SD. And for independent variables, variances add, whether you add or subtract the variables.`,
    ],
    picture: { title: 'Two dice', t: r`Roll one die and the total varies a bit. Roll two and add them, and the total varies more. Now subtract one from the other: the result still varies more than either die alone. Combining always adds uncertainty.` },
    words: [
      { term: 'Random variable', means: 'A numerical outcome of a chance process.' },
      { term: 'Expected value', means: 'The long-run average value: Σ x·p.' },
      { term: 'Variance', means: 'The average squared distance from the mean; its square root is the SD.' },
      { term: 'Independent random variables', means: 'Knowing one tells you nothing about the other.' },
    ],
    tools: [
      { name: 'Weighted averages', refresher: 'Multiply each value by its weight, then add.', lesson: 'st1-2' },
      { name: 'Square roots', refresher: '√25 = 5 because 5 × 5 = 25.', lesson: 'c0-5' },
    ],
    why: [
      [r`Each value counts in proportion to how often it happens.`, r`Adding the weighted values gives the long-run average.`],
      [r`Variance averages squared distances from the mean, weighted by probability.`, r`The square root brings it back to the original units (pets).`],
    ],
    walk: {
      'st4-2-1': [r`"At least 2" means 2 or 3 pets.`, r`P(2) = 0.4 and P(3) = 0.2.`, r`0.4 + 0.2 = 0.6.`],
      'st4-2-2': [r`E(X) = Σ x·p.`, r`0(0.1) + 1(0.3) + 2(0.4) + 3(0.2) = 0 + 0.3 + 0.8 + 0.6.`, r`= 1.7 pets.`],
      'st4-2-3': [r`Squared distances from 1.7: 2.89, 0.49, 0.09, 1.69.`, r`Weighted: 0.289 + 0.147 + 0.036 + 0.338.`, r`= 0.81.`],
      'st4-2-4': [r`For Y = a + bX, the mean is a + b·μ_X.`, r`5 + 2 × 1.7 = 5 + 3.4.`, r`= \$8.40.`],
      'st4-2-5': [r`Adding 5 shifts everything without spreading it.`, r`Multiplying by 2 doubles the spread: σ_Y = 2 × 0.9.`, r`= \$1.80.`],
      'st4-2-6': [r`For independent X and Y, Var(X − Y) = Var(X) + Var(Y).`, r`9 + 16 = 25.`, r`SD = √25 = 5.`],
    },
    teach: {
      plan: [r`Build a probability distribution table and check it adds to 1.`, r`Compute the expected value and explain "long-run average".`, r`Compute the variance and SD.`, r`Show what happens to the mean and SD under Y = a + bX.`, r`Combine two independent variables and stress that variances add.`],
      questions: [
        { q: 'Can the expected value be a number X never takes, like 1.7 pets?', a: 'Yes. It is a long-run average, not a single outcome.' },
        { q: 'Why do variances add even for X − Y?', a: 'Subtracting a random amount adds its uncertainty; the result can vary in both directions.' },
        { q: 'Why not just add the standard deviations?', a: 'SDs do not add; only variances do (for independent variables). Adding SDs overstates the spread.' },
      ],
      keyPoints: ['E(X) = Σ x·p.', 'Linear transformation rules.', 'Variances add for independent variables.'],
    },
  },
  'st4-3': {
    bigIdea: [
      r`Many chance processes repeat the same yes-or-no trial. If you do it a fixed number of times and count the successes, that count is binomial. If you keep going until the first success and count the tries, that count is geometric.`,
      r`The binomial formula counts how many ways the successes can be arranged, then multiplies by the chance of each arrangement. The mean is simply n times p: 10 guesses with a 0.3 chance each gives 3 right answers on average.`,
      r`For the geometric case, the first success on try k means k − 1 failures followed by one success. On average you wait 1/p tries.`,
    ],
    picture: { title: 'Free throws', t: r`A player shoots 10 free throws: how many go in? That is binomial. Another player keeps shooting until one goes in: how many shots did it take? That is geometric.` },
    words: [
      { term: 'Binomial random variable', means: 'The number of successes in n independent trials with the same p.' },
      { term: 'Geometric random variable', means: 'The number of trials until the first success.' },
      { term: 'BINS', means: 'Binary, Independent, Number fixed, Same probability: the binomial conditions.' },
      { term: '10% condition', means: 'Sampling without replacement is close enough to independent if n ≤ 10% of the population.' },
    ],
    tools: [
      { name: 'Exponents', refresher: '(0.8)² = 0.8 × 0.8 = 0.64.', lesson: 'c0-5' },
      { name: 'Probability rules', refresher: 'Multiply for independent "and"; use the complement for "at least".', lesson: 'st4-1' },
    ],
    why: [
      [r`There are 120 ways to choose which 3 of the 10 guesses are right.`, r`Each arrangement has probability (0.3)³(0.7)⁷, so multiply.`],
      [r`The first make on shot 3 means two misses, then a make.`, r`Multiply the three independent probabilities.`],
    ],
    walk: {
      'st4-3-1': [r`C(10, 3) = 120.`, r`(0.3)³ = 0.027 and (0.7)⁷ ≈ 0.0824.`, r`120 × 0.027 × 0.0824 ≈ 0.267.`],
      'st4-3-2': [r`P(X ≤ 3) = P(0) + P(1) + P(2) + P(3).`, r`≈ 0.028 + 0.121 + 0.233 + 0.267.`, r`≈ 0.650.`],
      'st4-3-3': [r`Binomial mean: μ = np.`, r`10 × 0.3.`, r`= 3.`],
      'st4-3-4': [r`σ = √(np(1 − p)).`, r`√(10 × 0.3 × 0.7) = √2.1.`, r`≈ 1.449.`],
      'st4-3-5': [r`Miss (0.8), miss (0.8), make (0.2).`, r`0.8 × 0.8 × 0.2.`, r`= 0.128.`],
      'st4-3-6': [r`There is no fixed number of rolls.`, r`We count rolls until the first 6, which has p = 1/6.`, r`Geometric with p = 1/6 (choice C).`],
    },
    teach: {
      plan: [r`State BINS and check it for a guessing example.`, r`Compute one binomial probability by formula and by calculator.`, r`Find the binomial mean and SD.`, r`Contrast with a geometric example.`, r`Practice choosing the right model.`],
      questions: [
        { q: 'Why does the binomial formula need C(n, k)?', a: 'Because the k successes can occur in many different orders, and each order has the same probability.' },
        { q: 'How do you find P(X ≥ 4) with a calculator?', a: '1 − binomcdf(n, p, 3).' },
        { q: 'If p = 0.25, how many trials until the first success on average?', a: '1/0.25 = 4.' },
      ],
      keyPoints: ['BINS conditions.', 'Binomial: μ = np, σ = √(np(1 − p)).', 'Geometric: μ = 1/p.'],
    },
  },
};
