import type { CalcLesson, CalcProblem, LessonTutor } from '../calc/types';
import { chi2Cdf, near, round, tCdf, tStar } from './lib';

const r = String.raw;
const P = (id: string, level: 1 | 2 | 3, q: string, answer: number | string[], hint: string, solution: string[], extra: Partial<CalcProblem> = {}): CalcProblem => ({ id, level, q, answer, hint, solution, ...extra });

/** a die rolled 60 times */
const ROLLS = [8, 12, 9, 11, 6, 14];
const GOF = ROLLS.reduce((s, o) => s + (o - 10) ** 2 / 10, 0);
const DIE = r`~~~
Face     1   2   3   4   5   6
Count    8  12   9  11   6  14
(60 rolls in all)
~~~`;
const OBS = [[30, 20], [15, 35]];
const ROWT = OBS.map((row) => row[0] + row[1]), COLT = [OBS[0][0] + OBS[1][0], OBS[0][1] + OBS[1][1]];
const EXP = OBS.map((_, i) => COLT.map((c) => (ROWT[i] * c) / 100));
const CHI_IND = OBS.reduce((s, row, i) => s + row.reduce((t, o, j) => t + (o - EXP[i][j]) ** 2 / EXP[i][j], 0), 0);
const TABLE = r`~~~
              Android   iPhone   Total
9th grade        30        20       50
12th grade       15        35       50
Total            45        55      100
~~~`;
const OUTPUT = r`~~~
Predictor   Coef  SE Coef     T      P
Constant   12.40     3.10  4.00  0.001
Hours       2.50     0.80  3.13  0.006
S = 4.2   R-sq = 35.2%   n = 20
~~~`;
const SE2 = Math.sqrt(10 ** 2 / 25 + 12 ** 2 / 36);

/** AP Statistics Units 7–9. Original lessons and problems. */
export const STATS_D: CalcLesson[] = [
  {
    id: 'st7-1', unit: 7, n: 1, title: 'The t distribution and confidence intervals for a mean',
    intro: 'To estimate a population mean we almost never know σ, so we estimate it with the sample standard deviation s. That extra uncertainty is handled by the t distribution. Today you meet the t distribution, check the conditions, and build and interpret a one-sample t interval for a mean.',
    goals: ['Explain why we use t instead of z when σ is unknown', 'Find degrees of freedom and the critical value t*', 'Check the Random, 10% and Normal/Large Sample conditions', 'Construct and interpret a one-sample t interval'],
    notes: [
      { k: 'formula', t: r`\bar{x} \pm t^* \frac{s}{\sqrt{n}} \qquad df = n - 1` },
      { k: 'p', t: r`The t distributions are bell-shaped and centered at 0 like the standard normal, but with **heavier tails** to account for estimating σ with $s$. As $df$ grows, t gets closer to the normal curve.` },
      { k: 'rule', title: 'Conditions', t: r`**Random** sample (or random assignment). **10%** condition when sampling without replacement. **Normal/Large Sample**: the population is normal, or $n \ge 30$, or (for small samples) a graph of the data shows no strong skew or outliers.` },
      { k: 'list', items: [r`Find $t^*$ with invT or a t table: for 95% confidence and $df = 15$, $t^* \approx 2.131$.`, r`$s/\sqrt{n}$ is the **standard error** of $\bar{x}$.`] },
      { k: 'warn', t: r`Using $z^*$ when σ is unknown makes the interval too narrow, especially for small samples.` },
    ],
    examples: [
      { q: r`A random sample of 16 bags of chips has mean weight $\bar{x} = 52$ g and $s = 8$ g. Build a 95% confidence interval for the true mean weight.`, steps: [r`$SE = \frac{8}{\sqrt{16}} = 2$, $df = 15$, and $t^* \approx 2.131$.`, r`$52 \pm 2.131 \times 2 = 52 \pm 4.26$, giving $(47.74, 56.26)$ grams.`], a: '(47.74, 56.26)' },
      { q: r`Interpret that interval.`, steps: [r`Say what the interval estimates, with units and context.`, r`"We are 95% confident that the interval from 47.74 g to 56.26 g captures the true mean weight of bags of these chips."`], a: 'We are 95% confident the true mean weight is between 47.74 g and 56.26 g' },
    ],
    practice: [
      P('st7-1-1', 1, r`$n = 16$ and $s = 8$. What is the standard error of $\bar{x}$?`, ['2'], 's ÷ √n.', [r`$8 \div 4 = 2$.`], { check: () => 8 / Math.sqrt(16) === 2 }),
      P('st7-1-2', 1, r`How many degrees of freedom for a one-sample t interval with $n = 16$?`, ['15'], 'df = n − 1.', [r`$16 - 1 = 15$.`], { check: () => 16 - 1 === 15 }),
      P('st7-1-3', 2, r`What is $t^*$ for 95% confidence with $df = 15$? Round to three decimal places.`, ['2.131', '2.13'], 'invT(0.975, 15).', [r`$t^* \approx 2.131$.`], { check: () => round(tStar(0.95, 15), 3) === 2.131 }),
      P('st7-1-4', 2, r`What is the margin of error (95%, $n = 16$, $s = 8$)? Round to two decimal places.`, ['4.26', '4.263'], 't* × SE.', [r`$2.131 \times 2 \approx 4.26$.`], { check: () => round(tStar(0.95, 15) * 2, 2) === 4.26 }),
      P('st7-1-5', 2, r`With $\bar{x} = 52$, what is the upper endpoint of the interval? Round to two decimal places.`, ['56.26'], 'x̄ + ME.', [r`$52 + 4.26 = 56.26$ g.`], { check: () => round(52 + tStar(0.95, 15) * 2, 2) === 56.26 }),
      P('st7-1-6', 2, r`Why do we use $t^*$ rather than $z^*$ for this interval?`, 3, 'What did we not know?', [r`σ is unknown and is estimated by $s$, which adds uncertainty; the t distribution accounts for it.`], { choices: ['Because the sample is random', 'Because the data are categorical', 'Because n is greater than 10', 'Because σ is unknown and estimated by s'] }),
    ],
    remember: ['x̄ ± t*·s/√n, df = n − 1.', 't has heavier tails than z.', 'Normal/Large Sample: n ≥ 30 or no strong skew.'],
    checkIn: 'Next: significance tests for means, paired data and two samples.',
  },
  {
    id: 'st7-2', unit: 7, n: 2, title: 't tests: one sample, paired and two samples',
    intro: 'Now you test claims about means. Today you run a one-sample t test, learn when data are paired (and analyze the differences), and compare two independent groups with a two-sample t test, always ending with a conclusion in context.',
    goals: ['Carry out a one-sample t test for a mean', 'Recognize paired data and analyze the differences', 'Compute the two-sample t statistic', 'Write conclusions that compare the p-value with α in context'],
    notes: [
      { k: 'formula', t: r`t = \frac{\bar{x} - \mu_0}{s/\sqrt{n}} \qquad df = n - 1` },
      { k: 'p', t: r`**Paired data** come from the same individual measured twice (before and after) or from matched pairs. Find each pair's difference, then do a one-sample t procedure on the differences, with $H_0: \mu_{\text{diff}} = 0$.` },
      { k: 'formula', t: r`t = \frac{(\bar{x}_1 - \bar{x}_2) - 0}{\sqrt{\frac{s_1^2}{n_1} + \frac{s_2^2}{n_2}}}` },
      { k: 'list', items: [r`For two-sample t procedures, use technology for $df$, or the smaller of $n_1 - 1$ and $n_2 - 1$ (conservative).`, r`Conditions are checked for **each** group: random, 10%, and Normal/Large Sample.`] },
      { k: 'warn', t: r`Do not treat paired data as two independent samples. Pairing removes the variation between individuals, so ignoring it throws away information.` },
    ],
    examples: [
      { q: r`A random sample of 25 commutes has $\bar{x} = 31$ minutes and $s = 5$. Test $H_0: \mu = 29$ against $H_a: \mu > 29$.`, steps: [r`$t = \frac{31 - 29}{5/\sqrt{25}} = \frac{2}{1} = 2$, with $df = 24$.`, r`p-value $= P(t > 2) \approx 0.028 < 0.05$, so reject $H_0$: there is convincing evidence the mean commute is longer than 29 minutes.`], a: 't = 2, p ≈ 0.028; reject H₀' },
      { q: r`Group 1: $\bar{x} = 78$, $s = 10$, $n = 25$. Group 2: $\bar{x} = 72$, $s = 12$, $n = 36$. Find the two-sample t statistic.`, steps: [r`$SE = \sqrt{\frac{100}{25} + \frac{144}{36}} = \sqrt{4 + 4} \approx 2.828$.`, r`$t = \frac{78 - 72}{2.828} \approx 2.12$.`], a: 't ≈ 2.12' },
    ],
    practice: [
      P('st7-2-1', 1, r`$n = 25$, $\bar{x} = 31$, $s = 5$, $\mu_0 = 29$. What is the t statistic?`, ['2'], '(x̄ − μ₀)/(s/√n).', [r`$\frac{2}{5/5} = 2$.`], { check: () => (31 - 29) / (5 / Math.sqrt(25)) === 2 }),
      P('st7-2-2', 2, r`For $t = 2$ with $df = 24$ and $H_a: \mu > 29$, what is the p-value? Round to three decimal places.`, ['0.028', '0.0285'], 'Right-tail area of the t distribution.', [r`$P(t_{24} > 2) \approx 0.028$.`], { check: () => round(1 - tCdf(2, 24), 3) === 0.028 }),
      P('st7-2-3', 2, r`If instead $H_a: \mu \ne 29$, what is the p-value? Round to three decimal places.`, ['0.057', '0.0569'], 'Double the one tail.', [r`$2 \times 0.0285 \approx 0.057$.`], { check: () => round(2 * (1 - tCdf(2, 24)), 3) === 0.057 }),
      P('st7-2-4', 2, r`With the two-sided p-value of 0.057 and $\alpha = 0.05$, what do you conclude?`, 2, 'Compare p with α.', [r`$0.057 > 0.05$, so fail to reject $H_0$: there is not convincing evidence the mean differs from 29 minutes.`], { choices: ['Reject H₀; the mean is not 29 minutes', 'Accept H₀; the mean is exactly 29 minutes', 'Fail to reject H₀; not convincing evidence the mean differs from 29', 'The test is invalid because p is close to α'] }),
      P('st7-2-5', 3, r`Group 1: $\bar{x} = 78$, $s = 10$, $n = 25$. Group 2: $\bar{x} = 72$, $s = 12$, $n = 36$. What is the two-sample t statistic? Round to two decimal places.`, ['2.12', '2.121'], 'Difference ÷ √(s₁²/n₁ + s₂²/n₂).', [r`$SE = \sqrt{4 + 4} \approx 2.828$, and $t = 6 / 2.828 \approx 2.12$.`], { check: () => round(6 / SE2, 2) === 2.12 }),
      P('st7-2-6', 2, r`Twenty students take a reading test before and after a summer program. Which procedure fits?`, 0, 'The same students are measured twice.', [r`Each student gives a before–after pair, so analyze the differences with a paired t procedure.`], { choices: ['A paired t test on the differences', 'A two-sample t test', 'A one-proportion z test', 'A chi-square test for independence'] }),
    ],
    remember: ['t = (x̄ − μ₀)/(s/√n).', 'Paired: one-sample t on the differences.', 'Two-sample: SE = √(s₁²/n₁ + s₂²/n₂).'],
    checkIn: 'Unit 7 done. Next: chi-square tests for categorical data.',
  },
  {
    id: 'st8-1', unit: 8, n: 1, title: 'Chi-square goodness-of-fit tests',
    intro: 'Is a die fair? Do candy colors match the company’s claim? A chi-square goodness-of-fit test compares the counts we observe in several categories with the counts a claimed distribution predicts. Today you find expected counts, compute the chi-square statistic, and use its distribution to get a p-value.',
    goals: ['Compute expected counts from a claimed distribution', 'Compute the chi-square statistic and degrees of freedom', 'Check the conditions (random, 10%, expected counts at least 5)', 'Find the p-value and conclude in context'],
    notes: [
      { k: 'formula', t: r`\chi^2 = \sum \frac{(\text{Observed} - \text{Expected})^2}{\text{Expected}} \qquad df = \text{number of categories} - 1` },
      { k: 'list', items: [r`$H_0$: the claimed distribution is correct. $H_a$: it is not correct.`, r`Expected count for a category = $n \times$ (its claimed proportion).`] },
      { k: 'rule', title: 'Conditions', t: r`**Random** sample, **10%** condition, and **Large Counts**: every **expected** count is at least 5.` },
      { k: 'p', t: r`Chi-square distributions are skewed right and take only non-negative values; the p-value is always the area to the **right** of $\chi^2$. Big differences between observed and expected counts make $\chi^2$ large and the p-value small.` },
      { k: 'warn', t: r`Use counts, never percents, in the formula. And check expected counts (not observed counts) for the Large Counts condition.` },
      { k: 'p', t: r`Data used today:
${DIE}` },
    ],
    examples: [
      { q: r`Test whether the die is fair. Find the expected counts and $\chi^2$.`, steps: [r`If fair, each face is expected $60 \times \frac{1}{6} = 10$ times.`, r`$\chi^2 = \frac{4}{10} + \frac{4}{10} + \frac{1}{10} + \frac{1}{10} + \frac{16}{10} + \frac{16}{10} = 4.2$.`], a: 'Expected 10 each; χ² = 4.2' },
      { q: r`Find the p-value and conclude.`, steps: [r`$df = 6 - 1 = 5$, and $P(\chi^2_5 > 4.2) \approx 0.52$.`, r`$0.52 > 0.05$, so fail to reject $H_0$: there is not convincing evidence that the die is unfair.`], a: 'p ≈ 0.52; fail to reject H₀' },
    ],
    practice: [
      P('st8-1-1', 1, r`A fair die is rolled 60 times. What is the expected count for each face?`, ['10'], 'n × 1/6.', [r`$60 \div 6 = 10$.`], { check: () => 60 / 6 === 10 }),
      P('st8-1-2', 2, r`Using the die data, what is the chi-square statistic?`, ['4.2'], 'Σ (O − E)²/E.', [r`$0.4 + 0.4 + 0.1 + 0.1 + 1.6 + 1.6 = 4.2$.`], { check: () => near(GOF, 4.2) }),
      P('st8-1-3', 1, r`How many degrees of freedom does this test have?`, ['5'], 'Categories − 1.', [r`$6 - 1 = 5$.`], { check: () => ROLLS.length - 1 === 5 }),
      P('st8-1-4', 2, r`What is the p-value? Round to two decimal places.`, ['0.52', '0.521'], 'Right-tail area of χ² with df = 5.', [r`$P(\chi^2_5 > 4.2) \approx 0.52$.`], { check: () => round(1 - chi2Cdf(GOF, 5), 2) === 0.52 }),
      P('st8-1-5', 2, r`A company claims 30% of its candies are red. In a random sample of 200 candies, what is the expected number of red candies?`, ['60'], 'n × claimed proportion.', [r`$200 \times 0.30 = 60$.`], { check: () => near(200 * 0.3, 60) }),
      P('st8-1-6', 2, r`Which condition is required for a chi-square test?`, 1, 'It is about the counts H₀ predicts.', [r`Every expected count must be at least 5.`], { choices: ['Every observed count is at least 10', 'Every expected count is at least 5', 'The population is normal', 'The sample size is at least 30'] }),
    ],
    remember: ['χ² = Σ (O − E)²/E.', 'GOF: df = categories − 1.', 'Expected counts ≥ 5; p-value is the right tail.'],
    checkIn: 'Next: chi-square tests for two-way tables.',
  },
  {
    id: 'st8-2', unit: 8, n: 2, title: 'Chi-square tests for homogeneity and independence',
    intro: 'Two-way tables can be tested too. A test for homogeneity compares the distribution of one variable across several populations; a test for independence checks whether two variables are related in one population. The mechanics are the same: expected counts, χ², and a p-value.',
    goals: ['Tell a test for homogeneity from a test for independence', 'Compute expected counts in a two-way table', 'Compute χ² and df = (rows − 1)(columns − 1)', 'Conclude in context'],
    notes: [
      { k: 'formula', t: r`\text{Expected} = \frac{(\text{row total})(\text{column total})}{\text{table total}} \qquad df = (r - 1)(c - 1)` },
      { k: 'list', items: [r`**Homogeneity**: separate random samples from two or more populations (or treatment groups), one categorical variable. $H_0$: the distributions are the same.`, r`**Independence**: one random sample, two categorical variables. $H_0$: the variables are independent (no association).`] },
      { k: 'rule', title: 'Same conditions', t: r`Random, 10%, and every expected count at least 5. The p-value is the area to the right of $\chi^2$.` },
      { k: 'p', t: r`If you reject $H_0$, look at which cells contribute most to $\chi^2$ (the biggest $\frac{(O-E)^2}{E}$ terms) to describe the association.` },
      { k: 'warn', t: r`A significant chi-square result shows association, not causation, unless the data came from a randomized experiment.` },
      { k: 'p', t: r`Data used today (one random sample of 100 students):
${TABLE}` },
    ],
    examples: [
      { q: r`Find the expected count for 9th graders with Android phones.`, steps: [r`Row total 50, column total 45, table total 100.`, r`$\frac{50 \times 45}{100} = 22.5$.`], a: '22.5' },
      { q: r`Compute $\chi^2$ and conclude.`, steps: [r`Expected counts are 22.5 and 27.5 in each row. $\chi^2 = \frac{7.5^2}{22.5} + \frac{7.5^2}{27.5} + \frac{7.5^2}{22.5} + \frac{7.5^2}{27.5} \approx 9.09$, with $df = 1$.`, r`p-value $\approx 0.003 < 0.05$: reject $H_0$. There is convincing evidence that grade level and phone type are associated for students at this school.`], a: 'χ² ≈ 9.09, p ≈ 0.003; associated' },
    ],
    practice: [
      P('st8-2-1', 1, r`What is the expected count for 12th graders with iPhones?`, ['27.5'], '(row total × column total) ÷ table total.', [r`$\frac{50 \times 55}{100} = 27.5$.`], { check: () => near(EXP[1][1], 27.5) }),
      P('st8-2-2', 2, r`What does the 9th-grade Android cell contribute to $\chi^2$?`, ['2.5'], '(O − E)²/E with O = 30, E = 22.5.', [r`$\frac{(30 - 22.5)^2}{22.5} = \frac{56.25}{22.5} = 2.5$.`], { check: () => near((30 - EXP[0][0]) ** 2 / EXP[0][0], 2.5) }),
      P('st8-2-3', 2, r`What is $\chi^2$ for the whole table? Round to two decimal places.`, ['9.09', '9.091'], 'Add all four contributions.', [r`$2.5 + 2.045 + 2.5 + 2.045 \approx 9.09$.`], { check: () => round(CHI_IND, 2) === 9.09 }),
      P('st8-2-4', 2, r`What is the p-value ($df = 1$)? Round to three decimal places.`, ['0.003', '0.0026'], 'Right tail of χ² with df = 1.', [r`$P(\chi^2_1 > 9.09) \approx 0.003$.`], { check: () => round(1 - chi2Cdf(CHI_IND, 1), 3) === 0.003 }),
      P('st8-2-5', 1, r`How many degrees of freedom does a chi-square test on a table with 3 rows and 4 columns have?`, ['6'], '(r − 1)(c − 1).', [r`$(3 - 1)(4 - 1) = 6$.`], { check: () => (3 - 1) * (4 - 1) === 6 }),
      P('st8-2-6', 2, r`Researchers take separate random samples of 100 students from each of three schools and record each student's favorite lunch option. Which test fits?`, 0, 'Several populations, one variable.', [r`Separate samples from several populations, comparing one categorical variable: a chi-square test for homogeneity.`], { choices: ['Chi-square test for homogeneity', 'Chi-square test for independence', 'Chi-square goodness-of-fit test', 'Two-sample t test'] }),
    ],
    remember: ['Expected = row × column ÷ total.', 'df = (r − 1)(c − 1).', 'Homogeneity: several samples. Independence: one sample, two variables.'],
    checkIn: 'Unit 8 done. Next: inference for the slope of a regression line.',
  },
  {
    id: 'st9-1', unit: 9, n: 1, title: 'Conditions and confidence intervals for a slope',
    intro: 'The slope from a sample is a statistic: another sample would give a slightly different line. Today you learn the conditions for inference about the true slope β, how to read the standard error of the slope from computer output, and how to build and interpret a t interval for β.',
    goals: ['Explain sampling variability in a regression slope', 'Check the LINER conditions for slope inference', 'Read the slope and its standard error from computer output', 'Construct and interpret a t interval for the slope'],
    notes: [
      { k: 'formula', t: r`b \pm t^* \, SE_b \qquad df = n - 2` },
      { k: 'rule', title: 'Conditions: LINER', t: r`**L**inear relationship (residual plot with no pattern). **I**ndependent observations (10% condition). **N**ormal residuals (no strong skew or outliers in a graph of residuals). **E**qual SD of residuals (the residual plot has even spread). **R**andom sample or random assignment.` },
      { k: 'p', t: r`The sample slope $b$ estimates the population slope β. In computer output, the slope is the **Coef** in the row for the explanatory variable, and **SE Coef** is its standard error.` },
      { k: 'p', t: r`Computer output used today:
${OUTPUT}` },
      { k: 'warn', t: r`The slope row, not the Constant row, describes the relationship. The Constant row is about the y-intercept and is rarely the target of inference.` },
    ],
    examples: [
      { q: r`Using the output, build a 95% confidence interval for the true slope.`, steps: [r`$b = 2.50$, $SE_b = 0.80$, $df = 20 - 2 = 18$, and $t^* \approx 2.101$.`, r`$2.50 \pm 2.101 \times 0.80 = 2.50 \pm 1.68$, giving $(0.82, 4.18)$.`], a: '(0.82, 4.18)' },
      { q: r`Interpret the interval in context.`, steps: [r`Say what the slope means: points per extra hour.`, r`"We are 95% confident that the interval from 0.82 to 4.18 captures the true slope: each extra hour of study is associated with an increase of 0.82 to 4.18 points in mean score." The interval is entirely above 0, so it suggests a positive relationship.`], a: 'Between 0.82 and 4.18 more points per hour, on average' },
    ],
    practice: [
      P('st9-1-1', 1, r`For slope inference with $n = 20$, how many degrees of freedom?`, ['18'], 'df = n − 2.', [r`$20 - 2 = 18$.`], { check: () => 20 - 2 === 18 }),
      P('st9-1-2', 2, r`What is $t^*$ for 95% confidence with $df = 18$? Round to three decimal places.`, ['2.101', '2.1'], 'invT(0.975, 18).', [r`$t^* \approx 2.101$.`], { check: () => round(tStar(0.95, 18), 3) === 2.101 }),
      P('st9-1-3', 2, r`Using the output, what is the margin of error for the slope? Round to three decimal places.`, ['1.681', '1.68'], 't* × SE of the slope.', [r`$2.101 \times 0.80 \approx 1.681$.`], { check: () => round(tStar(0.95, 18) * 0.8, 3) === 1.681 }),
      P('st9-1-4', 2, r`What is the lower endpoint of the 95% interval for the slope? Round to three decimal places.`, ['0.819', '0.82'], 'b − ME.', [r`$2.50 - 1.681 = 0.819$.`], { check: () => round(2.5 - tStar(0.95, 18) * 0.8, 3) === 0.819 }),
      P('st9-1-5', 1, r`Using the output, what is the predicted score for a student who studies 10 hours?`, ['37.4'], 'ŷ = Constant + slope × x.', [r`$12.40 + 2.50 \times 10 = 37.4$.`], { check: () => near(12.4 + 2.5 * 10, 37.4) }),
      P('st9-1-6', 2, r`Which residual plot pattern violates the conditions for slope inference?`, 3, 'Look for a curve or uneven spread.', [r`A fan shape (spread growing with x) breaks the Equal SD condition.`], { choices: ['Random scatter around 0 with even spread', 'Points evenly above and below 0', 'No outliers and no pattern', 'Residuals that fan out as x increases'] }),
    ],
    remember: ['b ± t*·SE_b, df = n − 2.', 'LINER conditions.', 'Read the slope row of the output.'],
    checkIn: 'Next: significance tests for the slope.',
  },
  {
    id: 'st9-2', unit: 9, n: 2, title: 'Significance tests for a slope',
    intro: 'Is there really a linear relationship in the population, or could the slope in our sample just be chance? Today you test $H_0: \\beta = 0$ with a t test for the slope, read the test statistic and p-value straight from computer output, and connect the test to r² and the confidence interval.',
    goals: ['State hypotheses about the population slope β', 'Compute the t statistic for the slope', 'Find and interpret the p-value, including from computer output', 'Connect R-sq and r to the output'],
    notes: [
      { k: 'formula', t: r`t = \frac{b - \beta_0}{SE_b} \qquad df = n - 2` },
      { k: 'list', items: [r`Usually $H_0: \beta = 0$ (no linear relationship) and $H_a: \beta \ne 0$ (or $> 0$, $< 0$).`, r`Computer output gives $t$ and a **two-sided** p-value in the slope row. Halve it for a one-sided test in the direction of $b$.`] },
      { k: 'rule', title: 'Reading R-sq', t: r`R-sq is $r^2$: the percent of the variation in y explained by the line. $r = \pm\sqrt{r^2}$, with the sign of the slope.` },
      { k: 'p', t: r`A two-sided test at α = 0.05 rejects $\beta = 0$ exactly when the 95% confidence interval for the slope does not contain 0.` },
      { k: 'warn', t: r`A significant slope shows a linear association, not causation, unless the data came from a randomized experiment.` },
      { k: 'p', t: r`Computer output used today:
${OUTPUT}` },
    ],
    examples: [
      { q: r`Using the output, test $H_0: \beta = 0$ against $H_a: \beta \ne 0$.`, steps: [r`$t = \frac{2.50 - 0}{0.80} = 3.125$, with $df = 18$; the output rounds it to 3.13.`, r`p-value $\approx 0.006 < 0.05$: reject $H_0$. There is convincing evidence of a linear relationship between hours studied and score.`], a: 't ≈ 3.13, p ≈ 0.006; reject H₀' },
      { q: r`Find the correlation $r$ from the output.`, steps: [r`R-sq = 35.2%, so $r^2 = 0.352$.`, r`The slope is positive, so $r = +\sqrt{0.352} \approx 0.593$.`], a: 'r ≈ 0.593' },
    ],
    practice: [
      P('st9-2-1', 1, r`Using the output, what is the t statistic for $H_0: \beta = 0$? Round to three decimal places.`, ['3.125', '3.13'], 'b ÷ SE_b.', [r`$2.50 \div 0.80 = 3.125$.`], { check: () => 2.5 / 0.8 === 3.125 }),
      P('st9-2-2', 2, r`What is the two-sided p-value for $t = 3.125$ with $df = 18$? Round to three decimal places.`, ['0.006', '0.0059'], 'Two tails of t with df = 18.', [r`$2P(t_{18} > 3.125) \approx 0.006$.`], { check: () => round(2 * (1 - tCdf(3.125, 18)), 3) === 0.006 }),
      P('st9-2-3', 2, r`For $H_a: \beta > 0$, what is the p-value? Round to three decimal places.`, ['0.003', '0.0029'], 'Half the two-sided p-value (b is positive).', [r`$0.0059 \div 2 \approx 0.003$.`], { check: () => round(1 - tCdf(3.125, 18), 3) === 0.003 }),
      P('st9-2-4', 2, r`From the output, what is the correlation $r$? Round to three decimal places.`, ['0.593', '0.59'], 'r = √(R-sq), with the slope’s sign.', [r`$\sqrt{0.352} \approx 0.593$, positive because the slope is positive.`], { check: () => round(Math.sqrt(0.352), 3) === 0.593 }),
      P('st9-2-5', 2, r`What does the null hypothesis $H_0: \beta = 0$ say?`, 1, 'A slope of 0 means a flat line.', [r`A population slope of 0 means there is no linear relationship between x and y in the population.`], { choices: ['The sample slope is 0', 'There is no linear relationship between x and y in the population', 'The y-intercept is 0', 'The correlation in the sample is 1'] }),
      P('st9-2-6', 3, r`A 95% confidence interval for a slope is $(-0.4, 1.9)$. What does a two-sided test of $H_0: \beta = 0$ at $\alpha = 0.05$ conclude?`, 2, 'Is 0 inside the interval?', [r`0 is a plausible value (it is inside the interval), so we fail to reject $H_0$: there is not convincing evidence of a linear relationship.`], { choices: ['Reject H₀, because the interval is wide', 'Reject H₀, because most of the interval is positive', 'Fail to reject H₀, because 0 is in the interval', 'The interval and the test cannot be compared'] }),
    ],
    remember: ['t = b/SE_b, df = n − 2.', 'Output p-values are two-sided.', 'Reject β = 0 when the interval excludes 0.'],
    checkIn: 'Course complete! Review any unit, then practice a full set of free-response style problems.',
  },
];

/** Tutor layer for Units 7–9. */
export const STATS_D_TUTOR: Record<string, LessonTutor> = {
  'st7-1': {
    bigIdea: [
      r`To estimate an average, like the mean weight of chip bags, we use the sample mean plus or minus a margin of error, just like for proportions.`,
      r`There is one catch: the margin needs σ, the population SD, which we almost never know. We use the sample SD s instead, and to pay for that extra guess, we use slightly wider critical values from the t distribution.`,
      r`The t distribution depends on the degrees of freedom, n − 1. Small samples get heavier tails and bigger t*; with lots of data, t is almost the same as z.`,
    ],
    picture: { title: 'Guessing with a borrowed ruler', t: r`If your ruler is a bit uncertain, you give your measurement a little extra room. Using s instead of σ is like a slightly uncertain ruler, so t* gives the interval a little extra room.` },
    words: [
      { term: 't distribution', means: 'A bell-shaped curve like z but with heavier tails, used when σ is estimated by s.' },
      { term: 'Degrees of freedom (df)', means: 'n − 1 for a one-sample mean; it picks which t curve to use.' },
      { term: 'Standard error of x̄', means: 's/√n: the estimated SD of the sample mean.' },
    ],
    tools: [
      { name: 'Sampling distribution of x̄', refresher: 'σ_x̄ = σ/√n.', lesson: 'st5-2' },
      { name: 'Confidence intervals', refresher: 'Estimate ± critical value × standard error.', lesson: 'st6-1' },
    ],
    why: [
      [r`The standard error uses s because σ is unknown, so t* replaces z*.`, r`Estimate ± margin gives the interval.`],
      [r`An interpretation needs the parameter, the interval and the context.`, r`"Confident" refers to the method's long-run success rate.`],
    ],
    walk: {
      'st7-1-1': [r`SE = s ÷ √n.`, r`√16 = 4.`, r`8 ÷ 4 = 2.`],
      'st7-1-2': [r`For a one-sample mean, df = n − 1.`, r`16 − 1.`, r`= 15.`],
      'st7-1-3': [r`95% leaves 2.5% in each tail, so look up the 0.975 point.`, r`With df = 15, invT(0.975, 15).`, r`t* ≈ 2.131.`],
      'st7-1-4': [r`ME = t* × SE.`, r`2.131 × 2.`, r`≈ 4.26.`],
      'st7-1-5': [r`Upper endpoint = x̄ + ME.`, r`52 + 4.26.`, r`= 56.26 g.`],
      'st7-1-6': [r`Random sampling and sample size are conditions, not the reason for t.`, r`We use t because σ is replaced by s, adding uncertainty.`, r`σ is unknown (choice D).`],
    },
    teach: {
      plan: [r`Explain why σ is usually unknown.`, r`Compare a t curve with the normal curve.`, r`Find df and t*.`, r`Check the conditions and build the interval.`, r`Interpret the interval in context.`],
      questions: [
        { q: 'When is t* close to z*?', a: 'When df is large; with many observations, s is a very good estimate of σ.' },
        { q: 'Can we use t with a small sample from a skewed population?', a: 'Not safely. For small n, the data should show no strong skew or outliers.' },
        { q: 'Why is df = n − 1?', a: 'Because s is computed from deviations around x̄, which uses up one piece of information.' },
      ],
      keyPoints: ['x̄ ± t*·s/√n.', 'df = n − 1.', 'Check Normal/Large Sample.'],
    },
  },
  'st7-2': {
    bigIdea: [
      r`A t test works like the z test for proportions: measure how many standard errors the sample mean is from the claimed mean, then find how surprising that would be if the claim were true.`,
      r`If the same people are measured twice (before and after), the data are paired. Subtract to get one difference per person, then it is just a one-sample t test on the differences.`,
      r`To compare two separate groups, subtract their means and divide by the combined standard error, where the variances add. A large t means the gap is bigger than chance usually produces.`,
    ],
    picture: { title: 'Before and after', t: r`To see whether a reading program helps, compare each student with themselves: Maya went from 70 to 78 (+8), Leo from 85 to 86 (+1). Looking at the changes removes the big differences between students.` },
    words: [
      { term: 't statistic', means: 'How many standard errors the estimate is from the null value.' },
      { term: 'Paired data', means: 'Two measurements linked to the same individual or matched pair.' },
      { term: 'Two-sample t test', means: 'A test comparing the means of two independent groups.' },
    ],
    tools: [
      { name: 'Significance tests', refresher: 'p < α: reject H₀; otherwise fail to reject.', lesson: 'st6-2' },
      { name: 'The t distribution', refresher: 'df = n − 1; heavier tails than z.', lesson: 'st7-1' },
    ],
    why: [
      [r`The t statistic measures the distance from μ₀ in standard errors.`, r`The p-value says how rare that distance would be if H₀ were true.`],
      [r`For two independent groups the variances add, giving the standard error of the difference.`, r`Divide the difference in means by that standard error.`],
    ],
    walk: {
      'st7-2-1': [r`SE = 5 ÷ √25 = 1.`, r`x̄ − μ₀ = 31 − 29 = 2.`, r`t = 2 ÷ 1 = 2.`],
      'st7-2-2': [r`Hₐ is μ > 29, so use the right tail.`, r`df = 24, and P(t > 2) ≈ 0.0285.`, r`p-value ≈ 0.028.`],
      'st7-2-3': [r`Two-sided means both tails.`, r`2 × 0.0285.`, r`≈ 0.057.`],
      'st7-2-4': [r`0.057 is greater than 0.05.`, r`We do not have strong enough evidence, and we never "accept" H₀.`, r`Fail to reject H₀ (choice C).`],
      'st7-2-5': [r`s₁²/n₁ = 100/25 = 4 and s₂²/n₂ = 144/36 = 4.`, r`SE = √8 ≈ 2.828.`, r`t = (78 − 72) ÷ 2.828 ≈ 2.12.`],
      'st7-2-6': [r`Each student is measured before and after.`, r`Those two scores are linked, so take differences.`, r`Paired t test on the differences (choice A).`],
    },
    teach: {
      plan: [r`Run a one-sample t test from hypotheses to conclusion.`, r`Show how to spot paired data.`, r`Turn paired data into differences and test them.`, r`Compute a two-sample t statistic.`, r`Practice writing conclusions in context.`],
      questions: [
        { q: 'Why is pairing more powerful when it fits?', a: 'Differences remove the variation between individuals, so the standard error is smaller.' },
        { q: 'What df do I use for a two-sample t test?', a: 'Use technology, or the smaller of n₁ − 1 and n₂ − 1 as a conservative choice.' },
        { q: 'What if p = 0.051 and α = 0.05?', a: 'Fail to reject H₀. The cutoff is set in advance; you report the p-value honestly.' },
      ],
      keyPoints: ['One-sample t test.', 'Paired data: test the differences.', 'Two-sample SE: variances add.'],
    },
  },
  'st8-1': {
    bigIdea: [
      r`A goodness-of-fit test asks: do the counts we saw fit the counts a claim predicts? For a fair die rolled 60 times, we expect 10 of each face.`,
      r`The chi-square statistic adds up how far each observed count is from its expected count, squared and scaled by the expected count. A small χ² means a good fit; a large one means the claim fits poorly.`,
      r`Chance alone always creates some differences, so we compare χ² with its distribution (df = categories − 1) to get a p-value. Only a large χ² with a small p-value gives evidence against the claim.`,
    ],
    picture: { title: 'Checking a spinner', t: r`A carnival spinner claims equal chances for 4 colors. If 100 spins give 25, 24, 27 and 24, that fits. If they give 10, 10, 10 and 70, something is off. χ² turns "how far off" into one number.` },
    words: [
      { term: 'Expected count', means: 'The count predicted for a category if H₀ is true.' },
      { term: 'Chi-square statistic (χ²)', means: 'Σ (O − E)²/E: the total distance between observed and expected counts.' },
      { term: 'Goodness of fit', means: 'How well observed counts match a claimed distribution.' },
    ],
    tools: [
      { name: 'Significance tests', refresher: 'The p-value is how surprising the data would be if H₀ were true.', lesson: 'st6-2' },
      { name: 'Fractions of a total', refresher: 'Expected count = n × proportion.', lesson: 'c0-1' },
    ],
    why: [
      [r`A fair die gives each face 1/6 of the rolls.`, r`Each term measures one face's miss; add them all.`],
      [r`With 6 categories, df = 5.`, r`The p-value is large, so these differences are typical of a fair die.`],
    ],
    walk: {
      'st8-1-1': [r`If fair, each face has probability 1/6.`, r`Expected = 60 × 1/6.`, r`= 10.`],
      'st8-1-2': [r`(O − E)² for each face: 4, 4, 1, 1, 16, 16.`, r`Divide each by 10: 0.4, 0.4, 0.1, 0.1, 1.6, 1.6.`, r`Add them: χ² = 4.2.`],
      'st8-1-3': [r`df = number of categories − 1.`, r`6 faces − 1.`, r`= 5.`],
      'st8-1-4': [r`Use the right tail of χ² with df = 5.`, r`P(χ² > 4.2) ≈ 0.52.`, r`Large p-value: no evidence the die is unfair.`],
      'st8-1-5': [r`Expected = n × claimed proportion.`, r`200 × 0.30.`, r`= 60.`],
      'st8-1-6': [r`The condition is about counts predicted under H₀.`, r`Each expected count must be at least 5.`, r`Expected counts ≥ 5 (choice B).`],
    },
    teach: {
      plan: [r`State the hypotheses for a fairness claim.`, r`Compute the expected counts.`, r`Compute χ² term by term.`, r`Find df and the p-value.`, r`Write the conclusion in context.`],
      questions: [
        { q: 'Why square the differences?', a: 'So positive and negative misses do not cancel, and big misses count more.' },
        { q: 'Why divide by the expected count?', a: 'A miss of 5 matters more when you expected 10 than when you expected 1,000.' },
        { q: 'Is the χ² p-value one-tailed?', a: 'Yes, always the right tail: only large χ² values are evidence against H₀.' },
      ],
      keyPoints: ['Expected = n × p.', 'χ² = Σ (O − E)²/E.', 'df = categories − 1.'],
    },
  },
  'st8-2': {
    bigIdea: [
      r`Chi-square tests also work on two-way tables. The question is whether the pattern in the table could be due to chance, or whether the variables are really related.`,
      r`The expected count for each cell is what we would see if there were no association: row total times column total, divided by the table total. Then χ² measures the total gap, exactly as before.`,
      r`The design decides the name. Separate samples from different groups gives a test for homogeneity. One sample measured on two variables gives a test for independence. The math is the same.`,
    ],
    picture: { title: 'If there were no connection', t: r`45% of all students use Android. If grade did not matter, about 45% of each grade, 22.5 of the 50 students, would use Android. The real counts, 30 and 15, are far from 22.5.` },
    words: [
      { term: 'Test for homogeneity', means: 'Compares the distribution of one categorical variable across several populations.' },
      { term: 'Test for independence', means: 'Checks for association between two categorical variables in one population.' },
      { term: 'Contribution', means: 'One cell’s (O − E)²/E term in χ².' },
    ],
    tools: [
      { name: 'Two-way tables', refresher: 'Row totals, column totals and conditional proportions.', lesson: 'st2-1' },
      { name: 'Goodness of fit', refresher: 'χ² = Σ (O − E)²/E; p-value is the right tail.', lesson: 'st8-1' },
    ],
    why: [
      [r`Expected counts assume the column split is the same in every row.`, r`So scale the row total by the column's share of the table.`],
      [r`Add the four contributions to get χ² with df = 1.`, r`A tiny p-value means the association is unlikely to be chance.`],
    ],
    walk: {
      'st8-2-1': [r`Row total (12th grade) = 50, column total (iPhone) = 55.`, r`Expected = 50 × 55 ÷ 100.`, r`= 27.5.`],
      'st8-2-2': [r`O = 30 and E = 22.5, so O − E = 7.5.`, r`7.5² = 56.25.`, r`56.25 ÷ 22.5 = 2.5.`],
      'st8-2-3': [r`Every cell misses by 7.5 (in one direction or the other).`, r`Contributions: 2.5, 2.045, 2.5, 2.045.`, r`Sum ≈ 9.09.`],
      'st8-2-4': [r`df = (2 − 1)(2 − 1) = 1.`, r`P(χ² > 9.09) ≈ 0.0026.`, r`≈ 0.003: strong evidence of association.`],
      'st8-2-5': [r`df = (rows − 1)(columns − 1).`, r`(3 − 1)(4 − 1) = 2 × 3.`, r`= 6.`],
      'st8-2-6': [r`There are three separate samples, one from each school.`, r`One variable (favorite lunch) is compared across them.`, r`Test for homogeneity (choice A).`],
    },
    teach: {
      plan: [r`Decide between homogeneity and independence from the design.`, r`Compute one expected count and explain it.`, r`Compute all contributions and χ².`, r`Find df and the p-value.`, r`Describe the association using the largest contributions.`],
      questions: [
        { q: 'Why do expected counts not have to be whole numbers?', a: 'They are long-run averages under H₀, not actual counts.' },
        { q: 'If χ² is significant, does grade cause phone choice?', a: 'No. This is observational data, so it shows association only.' },
        { q: 'What if an expected count is 3?', a: 'The Large Counts condition fails, so the χ² p-value may not be trustworthy.' },
      ],
      keyPoints: ['Expected = row × column ÷ total.', 'df = (r − 1)(c − 1).', 'Homogeneity vs independence depends on the design.'],
    },
  },
  'st9-1': {
    bigIdea: [
      r`A regression line from one sample is a guess at the true line for the whole population. Another sample would give a slightly different slope, so the slope has its own sampling variability.`,
      r`Computer output reports the slope and its standard error. A confidence interval for the true slope β is the slope plus or minus t* standard errors, with n − 2 degrees of freedom.`,
      r`The conditions (LINER) are checked mostly with a residual plot: no curve, even spread, no extreme outliers, and random data.`,
    ],
    picture: { title: 'Different classes, different lines', t: r`Five classes each fit a line of score against study hours. The slopes are 2.1, 2.9, 2.5, 1.8 and 3.0: close, but not identical. The interval for β gives the range of plausible true slopes.` },
    words: [
      { term: 'Population slope (β)', means: 'The slope of the true regression line for the whole population.' },
      { term: 'SE of the slope', means: 'The estimated standard deviation of the sample slope b.' },
      { term: 'LINER', means: 'Linear, Independent, Normal residuals, Equal SD, Random: the slope conditions.' },
    ],
    tools: [
      { name: 'Regression lines', refresher: 'ŷ = a + bx; residual = y − ŷ.', lesson: 'st2-2' },
      { name: 't intervals', refresher: 'Estimate ± t* × SE.', lesson: 'st7-1' },
    ],
    why: [
      [r`Read b and SE_b from the slope row; df = n − 2.`, r`Estimate ± t* × SE gives the interval.`],
      [r`The slope is the change in mean score per extra hour.`, r`Since the whole interval is above 0, a positive relationship is plausible.`],
    ],
    walk: {
      'st9-1-1': [r`For slope inference, df = n − 2.`, r`20 − 2.`, r`= 18.`],
      'st9-1-2': [r`95% leaves 2.5% in each tail.`, r`invT(0.975, 18).`, r`t* ≈ 2.101.`],
      'st9-1-3': [r`ME = t* × SE_b.`, r`2.101 × 0.80.`, r`≈ 1.681.`],
      'st9-1-4': [r`Lower endpoint = b − ME.`, r`2.50 − 1.681.`, r`= 0.819.`],
      'st9-1-5': [r`The line is ŷ = 12.40 + 2.50x.`, r`Substitute x = 10: 12.40 + 25.`, r`= 37.4 points.`],
      'st9-1-6': [r`Random scatter with even spread is what we want.`, r`A fan shape means the spread changes with x.`, r`It breaks the Equal SD condition (choice D).`],
    },
    teach: {
      plan: [r`Explain why the slope varies from sample to sample.`, r`Go through LINER with a residual plot.`, r`Find b and SE_b in computer output.`, r`Build the interval with df = n − 2.`, r`Interpret the interval in context.`],
      questions: [
        { q: 'Why is df = n − 2 here?', a: 'Because two things are estimated from the data: the slope and the intercept.' },
        { q: 'What does an interval for β that contains 0 mean?', a: 'No linear relationship is a plausible explanation.' },
        { q: 'Which row of the output has the slope?', a: 'The row named for the explanatory variable (here "Hours"), not "Constant".' },
      ],
      keyPoints: ['b ± t*·SE_b.', 'df = n − 2.', 'LINER via residual plots.'],
    },
  },
  'st9-2': {
    bigIdea: [
      r`A slope test asks whether the linear pattern in the sample could be a fluke. The null hypothesis is that the true slope is 0: no linear relationship at all.`,
      r`The test statistic is the slope divided by its standard error: how many standard errors the slope is from 0. Computer output prints it with a two-sided p-value.`,
      r`R-sq tells how much of the variation in y the line explains, and its square root (with the slope's sign) is the correlation r. A test and a confidence interval always agree: reject β = 0 exactly when the interval leaves out 0.`,
    ],
    picture: { title: 'A flat line', t: r`If study hours did not matter, the true line would be flat: the same average score at every number of hours. The test asks whether our tilted sample line could have come from a flat true line just by chance.` },
    words: [
      { term: 'Null slope', means: 'H₀: β = 0, meaning no linear relationship.' },
      { term: 'R-sq', means: 'r²: the share of variation in y explained by the line.' },
      { term: 'Two-sided p-value', means: 'Counts results as extreme in either direction.' },
    ],
    tools: [
      { name: 'Slope intervals', refresher: 'b ± t*·SE_b with df = n − 2.', lesson: 'st9-1' },
      { name: 'Correlation', refresher: 'r has the same sign as the slope.', lesson: 'st2-1' },
    ],
    why: [
      [r`The t statistic is the slope's distance from 0 in standard errors.`, r`A small p-value means a slope this steep would be rare if β were 0.`],
      [r`R-sq is r², so take the square root.`, r`The sign comes from the slope, which is positive.`],
    ],
    walk: {
      'st9-2-1': [r`t = (b − 0) ÷ SE_b.`, r`2.50 ÷ 0.80.`, r`= 3.125.`],
      'st9-2-2': [r`df = 18; one tail beyond 3.125 is about 0.0029.`, r`Two-sided: double it.`, r`≈ 0.006.`],
      'st9-2-3': [r`Hₐ: β > 0 matches the positive slope, so use one tail.`, r`Half of 0.0059.`, r`≈ 0.003.`],
      'st9-2-4': [r`R-sq = 35.2% = 0.352.`, r`√0.352 ≈ 0.593.`, r`The slope is positive, so r ≈ 0.593.`],
      'st9-2-5': [r`β is the true slope for the population.`, r`β = 0 means the true line is flat.`, r`No linear relationship in the population (choice B).`],
      'st9-2-6': [r`A two-sided test at α = 0.05 matches a 95% interval.`, r`0 is inside (−0.4, 1.9), so 0 is plausible.`, r`Fail to reject H₀ (choice C).`],
    },
    teach: {
      plan: [r`State H₀: β = 0 and explain "flat line".`, r`Compute t from the output.`, r`Read the p-value and adjust it for a one-sided test.`, r`Find r from R-sq.`, r`Connect the test to the confidence interval.`],
      questions: [
        { q: 'Why might the output p-value need halving?', a: 'Output gives a two-sided p-value; a one-sided test in the slope’s direction uses half of it.' },
        { q: 'Does a significant slope mean x causes y?', a: 'Only if the data come from a randomized experiment.' },
        { q: 'Can R-sq be significant but small?', a: 'Yes. With a large sample even a weak relationship can be statistically significant.' },
      ],
      keyPoints: ['t = b/SE_b.', 'Output p-values are two-sided.', 'Test and interval agree.'],
    },
  },
};
