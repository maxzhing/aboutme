import type { CalcLesson, CalcProblem, LessonTutor } from '../calc/types';
import { iqrOf, mean, median, near, normBetween, normCdf, invNorm, quartiles, regression, round, sd } from './lib';

const r = String.raw;
const P = (id: string, level: 1 | 2 | 3, q: string, answer: number | string[], hint: string, solution: string[], extra: Partial<CalcProblem> = {}): CalcProblem => ({ id, level, q, answer, hint, solution, ...extra });

/** Minutes of homework for 11 students. */
const HW = [12, 15, 15, 18, 20, 22, 25, 25, 25, 31, 48];
const HW_TXT = r`~~~
Minutes of homework (11 students):
12  15  15  18  20  22
25  25  25  31  48
~~~`;
const TABLE = r`~~~
              Android   iPhone   Total
9th grade        30        20       50
12th grade       15        35       50
Total            45        55      100
~~~`;
const SX = [1, 2, 3, 4, 5], SY = [62, 68, 71, 79, 85];
const STUDY = r`~~~
Hours studied (x)  1   2   3   4   5
Test score (y)    62  68  71  79  85
~~~`;

/** AP Statistics Units 1–2. Original lessons and problems. */
export const STATS_A: CalcLesson[] = [
  {
    id: 'st1-1', unit: 1, n: 1, title: 'Variables and describing distributions',
    intro: 'Statistics is the science of learning from data. Everything starts with two questions: what kind of variable is this, and what does its distribution look like? Today you learn to sort variables, pick a good graph, and describe a distribution the way AP readers expect: shape, outliers, center and spread, always in context.',
    goals: ['Tell categorical variables from quantitative ones', 'Choose a fitting graph for each kind of variable', 'Describe a distribution with shape, outliers, center and spread (in context)', 'Connect skew to how the mean and median compare'],
    notes: [
      { k: 'list', items: [r`A **categorical** variable puts each individual in a group (favorite sport, eye color).`, r`A **quantitative** variable is a number you can do arithmetic with (height, minutes of homework).`, r`Graphs for categorical data: bar charts and pie charts. For quantitative data: dotplots, stemplots, histograms and boxplots.`] },
      { k: 'rule', title: 'Describe a distribution: SOCS', t: r`**S**hape (symmetric, skewed left or right, number of peaks), **O**utliers (unusual values), **C**enter (median or mean), **S**pread (range, IQR or standard deviation). Always describe them in the context of the data.` },
      { k: 'p', t: r`A distribution is **skewed right** when its long tail stretches toward the large values. A few large values pull the mean up, so in a right-skewed distribution the mean is usually greater than the median. In a left-skewed distribution it is usually smaller.` },
      { k: 'formula', t: r`\text{range} = \text{maximum} - \text{minimum}` },
      { k: 'warn', t: r`"Skewed right" names the side of the long tail, not the side where most of the data sits. A pile of values on the left with a tail to the right is skewed right.` },
      { k: 'p', t: r`Data used today:
${HW_TXT}` },
    ],
    examples: [
      { q: r`For each student we record grade level (9–12), favorite subject and hours of sleep. Which variables are quantitative?`, steps: [r`Grade level is a number but here it names a group; favorite subject is a category.`, r`Hours of sleep is a measured amount you can average, so it is quantitative. (Grade level can be treated either way; ask whether averaging it makes sense.)`], a: 'Hours of sleep' },
      { q: r`Describe the shape of the homework data.`, steps: [r`Most values sit between 12 and 31 minutes, and one student did 48 minutes, far above the rest.`, r`The long tail is on the high side, so the distribution is skewed right, with a possible outlier at 48 minutes.`], a: 'Skewed right' },
    ],
    practice: [
      P('st1-1-1', 1, r`Which variable is categorical?`, 1, 'Can you average it?', [r`Favorite sport puts people into groups; the others are measured numbers.`], { choices: ['Height in centimeters', 'Favorite sport', 'Number of siblings', 'Time to run a mile'] }),
      P('st1-1-2', 1, r`Using the homework data, what is the mode (the most common value), in minutes?`, ['25'], 'Count repeats.', [r`25 appears three times, more than any other value.`], { check: () => HW.filter((x) => x === 25).length === 3 && HW.every((x) => HW.filter((y) => y === x).length <= 3) }),
      P('st1-1-3', 1, r`Using the homework data, what is the range, in minutes?`, ['36'], 'Maximum minus minimum.', [r`$48 - 12 = 36$.`], { check: () => Math.max(...HW) - Math.min(...HW) === 36 }),
      P('st1-1-4', 2, r`A distribution of house prices is strongly skewed right. Which is most likely true?`, 0, 'Which statistic do the few very large prices pull?', [r`The large prices in the right tail pull the mean up but barely move the median, so the mean is greater than the median.`], { choices: ['The mean is greater than the median', 'The mean is less than the median', 'The mean equals the median', 'The mean and median cannot be compared'] }),
      P('st1-1-5', 1, r`Using the homework data, how many students did more than 24 minutes?`, ['5'], 'Count the values above 24.', [r`25, 25, 25, 31 and 48: five students.`], { check: () => HW.filter((x) => x > 24).length === 5 }),
      P('st1-1-6', 2, r`A teacher wants to compare the distribution of test scores for two class periods. Which display is best?`, 2, 'You need to compare two quantitative distributions side by side.', [r`Side-by-side boxplots (or back-to-back stemplots) show the center, spread and outliers of both groups on one scale.`], { choices: ['A pie chart for each class', 'A single bar chart of the class averages', 'Side-by-side boxplots on the same scale', 'A scatterplot of the two classes'] }),
    ],
    remember: ['Categorical = groups; quantitative = numbers you can average.', 'Describe with SOCS, in context.', 'Skewed right: mean usually greater than median.'],
    checkIn: 'Next: the numbers that summarize a distribution, and boxplots.',
  },
  {
    id: 'st1-2', unit: 1, n: 2, title: 'Summary statistics, boxplots and outliers',
    intro: 'A distribution can be summarized with a few numbers: where its middle is and how spread out it is. Today you compute the mean, median, quartiles, IQR and standard deviation, draw a boxplot from the five-number summary, and use the 1.5 × IQR rule to spot outliers.',
    goals: ['Compute the mean, median, quartiles and IQR', 'Build a five-number summary and boxplot', 'Identify outliers with the 1.5 × IQR rule', 'Explain which statistics are resistant to outliers'],
    notes: [
      { k: 'formula', t: r`\bar{x} = \frac{\sum x}{n} \qquad s = \sqrt{\frac{\sum (x - \bar{x})^2}{n - 1}}` },
      { k: 'list', items: [r`The **median** is the middle value of the ordered data (the average of the two middle values when $n$ is even).`, r`$Q_1$ is the median of the lower half and $Q_3$ the median of the upper half (leave out the overall median when $n$ is odd).`, r`$IQR = Q_3 - Q_1$: the spread of the middle half of the data.`] },
      { k: 'rule', title: 'Outliers: the 1.5 × IQR rule', t: r`A value is an outlier if it is above $Q_3 + 1.5 \cdot IQR$ or below $Q_1 - 1.5 \cdot IQR$.` },
      { k: 'p', t: r`The **five-number summary** (minimum, $Q_1$, median, $Q_3$, maximum) draws a boxplot: a box from $Q_1$ to $Q_3$, a line at the median, and whiskers to the most extreme values that are not outliers.` },
      { k: 'warn', t: r`The median and IQR are **resistant**: one extreme value hardly changes them. The mean, standard deviation and range are not.` },
      { k: 'p', t: r`Data used today (already in order):
${HW_TXT}` },
    ],
    examples: [
      { q: r`Find the five-number summary of the homework data.`, steps: [r`With 11 values, the median is the 6th: 22. The lower half is 12, 15, 15, 18, 20, so $Q_1 = 15$. The upper half is 25, 25, 25, 31, 48, so $Q_3 = 25$.`, r`Five-number summary: 12, 15, 22, 25, 48.`], a: '12, 15, 22, 25, 48' },
      { q: r`Is 48 minutes an outlier?`, steps: [r`$IQR = 25 - 15 = 10$, so the upper fence is $25 + 1.5 \times 10 = 40$.`, r`48 is above 40, so it is an outlier. (The lower fence is $15 - 15 = 0$, and no value is below it.)`], a: 'Yes' },
    ],
    practice: [
      P('st1-2-1', 1, r`What is the median of the homework data, in minutes?`, ['22'], 'The middle value of 11 ordered values.', [r`The 6th value is 22.`], { check: () => median(HW) === 22 }),
      P('st1-2-2', 1, r`What is $Q_3$ for the homework data?`, ['25'], 'The median of the upper half.', [r`Upper half: 25, 25, 25, 31, 48. Its median is 25.`], { check: () => quartiles(HW)[1] === 25 }),
      P('st1-2-3', 1, r`What is the IQR of the homework data?`, ['10'], 'Q3 − Q1.', [r`$25 - 15 = 10$.`], { check: () => iqrOf(HW) === 10 }),
      P('st1-2-4', 2, r`What is the upper outlier fence, $Q_3 + 1.5 \cdot IQR$?`, ['40'], 'Use Q3 = 25 and IQR = 10.', [r`$25 + 1.5 \times 10 = 40$.`], { check: () => quartiles(HW)[1] + 1.5 * iqrOf(HW) === 40 }),
      P('st1-2-5', 1, r`Which statistic is resistant to outliers?`, 2, 'Which one depends only on the middle of the ordered data?', [r`The median only depends on the middle value(s), so an extreme value barely changes it.`], { choices: ['The mean', 'The standard deviation', 'The median', 'The range'] }),
      P('st1-2-6', 2, r`What is the mean of the homework data, rounded to two decimal places?`, ['23.27', '23.3'], 'Add all 11 values, then divide by 11.', [r`The values add to 256, and $256 \div 11 \approx 23.27$ minutes.`, r`It is above the median of 22 because the outlier 48 pulls the mean up.`], { check: () => round(mean(HW), 2) === 23.27 && sd(HW) > 0 }),
    ],
    remember: ['Five-number summary → boxplot.', 'Outlier: beyond 1.5 × IQR from the quartiles.', 'Median and IQR resist outliers; mean and SD do not.'],
    checkIn: 'Next: the normal distribution and z-scores.',
  },
  {
    id: 'st1-3', unit: 1, n: 3, title: 'Normal distributions and z-scores',
    intro: 'Many measurements, like heights and test scores, follow a symmetric bell-shaped curve called a normal distribution. Today you measure how unusual a value is with a z-score, use the 68–95–99.7 rule, and find areas (proportions) and percentiles under a normal curve.',
    goals: ['Compute and interpret z-scores', 'Apply the 68–95–99.7 rule', 'Find proportions under a normal curve', 'Find the value at a given percentile, and see how changing units affects center and spread'],
    notes: [
      { k: 'formula', t: r`z = \frac{x - \mu}{\sigma}` },
      { k: 'p', t: r`A z-score says how many standard deviations a value is above (positive) or below (negative) the mean.` },
      { k: 'rule', title: 'The 68–95–99.7 rule', t: r`In a normal distribution, about 68% of values are within 1 SD of the mean, 95% within 2 SD, and 99.7% within 3 SD.` },
      { k: 'list', items: [r`To find a proportion: convert to z, then use the normal table or a calculator (normalcdf).`, r`To find a percentile: use invNorm (or the table backwards), then $x = \mu + z\sigma$.`] },
      { k: 'p', t: r`Adding a constant to every value shifts the mean (and median) by that constant but leaves the SD unchanged. Multiplying every value by a constant multiplies both the mean and the SD by it.` },
      { k: 'warn', t: r`Only use normal calculations when the distribution is roughly normal. The 68–95–99.7 rule does not apply to strongly skewed data.` },
    ],
    examples: [
      { q: r`Adult heights are normal with $\mu = 170$ cm and $\sigma = 8$ cm. What proportion are taller than 180 cm?`, steps: [r`$z = \frac{180 - 170}{8} = 1.25$.`, r`$P(Z > 1.25) \approx 0.106$: about 10.6% are taller than 180 cm.`], a: 'About 0.106' },
      { q: r`What height is at the 90th percentile?`, steps: [r`The z-score with 90% below it is about 1.282.`, r`$x = 170 + 1.282 \times 8 \approx 180.3$ cm.`], a: 'About 180.3 cm' },
    ],
    practice: [
      P('st1-3-1', 1, r`Heights: $\mu = 170$, $\sigma = 8$. What is the z-score of a 186 cm person?`, ['2'], '(x − μ) ÷ σ.', [r`$\frac{186 - 170}{8} = 2$.`], { check: () => (186 - 170) / 8 === 2 }),
      P('st1-3-2', 1, r`Using the 68–95–99.7 rule, about what percent of heights are between 162 and 178 cm?`, ['68'], 'How many SDs from the mean are 162 and 178?', [r`162 and 178 are 1 SD below and above 170, so about 68%.`], { check: () => near(normBetween(162, 178, 170, 8), 0.6827, 1e-3) }),
      P('st1-3-3', 2, r`What proportion of heights are above 180 cm? Round to three decimal places.`, ['0.106', '0.1056'], 'z = 1.25, then the area to the right.', [r`$z = 1.25$, and $P(Z > 1.25) \approx 0.106$.`], { check: () => round(1 - normCdf(180, 170, 8), 3) === 0.106 }),
      P('st1-3-4', 2, r`What height is at the 90th percentile? Round to one decimal place.`, ['180.3', '180.25'], 'invNorm(0.90) ≈ 1.282.', [r`$170 + 1.2816 \times 8 \approx 180.3$ cm.`], { check: () => round(invNorm(0.9, 170, 8), 1) === 180.3 }),
      P('st1-3-5', 1, r`Every value in a data set is multiplied by 2. What happens to the mean and the standard deviation?`, 1, 'Multiplying changes both center and spread.', [r`Both are multiplied by 2.`], { choices: ['The mean doubles; the SD is unchanged', 'The mean doubles and the SD doubles', 'The mean is unchanged; the SD doubles', 'Neither changes'] }),
      P('st1-3-6', 3, r`Test scores are normal with $\mu = 72$ and $\sigma = 6$. What proportion of scores are between 65 and 80? Round to three decimal places.`, ['0.787', '0.7871'], 'Find both z-scores, then the area between them.', [r`$z_1 = \frac{65 - 72}{6} \approx -1.167$, $z_2 = \frac{80 - 72}{6} \approx 1.333$.`, r`Area between them $\approx 0.9088 - 0.1217 = 0.787$.`], { check: () => round(normBetween(65, 80, 72, 6), 3) === 0.787 }),
    ],
    remember: ['z = (x − μ)/σ.', '68–95–99.7 within 1, 2, 3 SDs.', 'Percentile value: x = μ + zσ.'],
    checkIn: 'Unit 1 done. Next: relationships between two variables.',
  },
  {
    id: 'st2-1', unit: 2, n: 1, title: 'Two-way tables, scatterplots and correlation',
    intro: 'Often we want to know whether two variables are related. For two categorical variables we use a two-way table; for two quantitative variables, a scatterplot and the correlation r. Today you read joint, marginal and conditional proportions, describe scatterplots, and learn what r does and does not tell you.',
    goals: ['Compute marginal, joint and conditional relative frequencies', 'Decide whether two categorical variables are associated', 'Describe a scatterplot by direction, form, strength and unusual points', 'State the key properties of the correlation r'],
    notes: [
      { k: 'list', items: [r`**Marginal**: a row or column total over the grand total.`, r`**Joint**: one cell over the grand total.`, r`**Conditional**: one cell over its row (or column) total, "given" that group.`] },
      { k: 'rule', title: 'Association', t: r`Two categorical variables are associated if the conditional distributions differ from group to group (for example, the percent with an iPhone is different for 9th and 12th graders).` },
      { k: 'p', t: r`Describe a scatterplot with **direction** (positive or negative), **form** (linear or curved), **strength** (how closely points follow the form) and **unusual features** (outliers, clusters), in context.` },
      { k: 'list', items: [r`The correlation $r$ is between −1 and 1 and measures the strength and direction of a **linear** relationship.`, r`$r$ has no units and does not change if you change units or swap x and y.`, r`$r$ is not resistant: one outlier can change it a lot. And correlation does not prove causation.`] },
      { k: 'warn', t: r`A strong curved relationship can have $r$ near 0. Always look at the scatterplot before trusting r.` },
      { k: 'p', t: r`Data used today:
${TABLE}` },
    ],
    examples: [
      { q: r`What proportion of 12th graders use an iPhone?`, steps: [r`This is conditional on 12th grade: use the 12th-grade row total, 50.`, r`$\frac{35}{50} = 0.70$.`], a: '0.70' },
      { q: r`Is phone type associated with grade level?`, steps: [r`9th graders: $\frac{20}{50} = 40\%$ iPhone. 12th graders: $\frac{35}{50} = 70\%$ iPhone.`, r`The conditional proportions differ a lot, so there is an association.`], a: 'Yes' },
    ],
    practice: [
      P('st2-1-1', 1, r`What proportion of 12th graders use an iPhone?`, ['0.7'], 'Cell ÷ row total.', [r`$35 \div 50 = 0.7$.`], { check: () => 35 / 50 === 0.7 }),
      P('st2-1-2', 1, r`What proportion of all students use an Android phone (the marginal proportion)?`, ['0.45'], 'Column total ÷ grand total.', [r`$45 \div 100 = 0.45$.`], { check: () => 45 / 100 === 0.45 }),
      P('st2-1-3', 2, r`What proportion of iPhone users are 9th graders? Round to three decimal places.`, ['0.364', '0.3636'], 'Now the condition is "iPhone user": divide by the iPhone column total.', [r`$20 \div 55 \approx 0.364$.`], { check: () => round(20 / 55, 3) === 0.364 }),
      P('st2-1-4', 2, r`Based on the table, are phone type and grade level associated?`, 0, 'Compare conditional proportions across the grades.', [r`40% of 9th graders but 70% of 12th graders use iPhones; the distributions differ, so they are associated.`], { choices: ['Yes, because the percent using iPhones differs by grade', 'No, because both grades have 50 students', 'No, because more students use iPhones overall', 'You cannot tell without a scatterplot'] }),
      P('st2-1-5', 1, r`Heights are converted from inches to centimeters. What happens to the correlation between height and weight?`, 2, 'Is r affected by units?', [r`$r$ has no units, so changing units does not change it.`], { choices: ['It increases', 'It decreases', 'It stays the same', 'It becomes negative'] }),
      P('st2-1-6', 2, r`A scatterplot shows a clear U-shaped pattern. The correlation is most likely`, 0, 'r measures only straight-line relationships.', [r`A symmetric curve has no overall linear trend, so $r$ can be near 0 even though the relationship is strong.`], { choices: ['close to 0', 'close to 1', 'close to −1', 'exactly 1'] }),
    ],
    remember: ['Conditional = cell ÷ group total.', 'Association: conditional distributions differ.', 'r: linear only, unit-free, not resistant, not causation.'],
    checkIn: 'Next: the least-squares regression line and residuals.',
  },
  {
    id: 'st2-2', unit: 2, n: 2, title: 'Least-squares regression and residuals',
    intro: 'When a scatterplot is roughly linear, a line can summarize it and predict y from x. Today you build the least-squares regression line, interpret its slope and intercept in context, compute residuals, and read r² as the share of variation the line explains.',
    goals: ['Write and use the least-squares regression line ŷ = a + bx', 'Interpret the slope and y-intercept in context', 'Compute and interpret residuals', 'Interpret r² and avoid extrapolation'],
    notes: [
      { k: 'formula', t: r`\hat{y} = a + bx \qquad b = r\,\frac{s_y}{s_x} \qquad a = \bar{y} - b\bar{x}` },
      { k: 'p', t: r`**Slope** $b$: for each one-unit increase in x, the predicted y changes by $b$. **Intercept** $a$: the predicted y when $x = 0$ (only meaningful if $x = 0$ makes sense).` },
      { k: 'formula', t: r`\text{residual} = y - \hat{y}` },
      { k: 'rule', title: 'Reading residuals and r²', t: r`A positive residual means the point is above the line (the line underpredicted). A residual plot with no pattern means a line is a good fit. $r^2$ is the fraction of the variation in y that is explained by the linear relationship with x.` },
      { k: 'warn', t: r`Do not extrapolate: predictions for x-values far outside the data can be badly wrong, because the pattern may not continue.` },
      { k: 'p', t: r`Data used today:
${STUDY}` },
    ],
    examples: [
      { q: r`Find the least-squares line for the study data.`, steps: [r`$\bar{x} = 3$, $\bar{y} = 73$. $b = \frac{\sum (x - \bar{x})(y - \bar{y})}{\sum (x - \bar{x})^2} = \frac{57}{10} = 5.7$.`, r`$a = 73 - 5.7 \times 3 = 55.9$, so $\hat{y} = 55.9 + 5.7x$.`], a: 'ŷ = 55.9 + 5.7x' },
      { q: r`A student studied 3 hours and scored 71. Find the residual.`, steps: [r`$\hat{y} = 55.9 + 5.7 \times 3 = 73$.`, r`Residual $= 71 - 73 = -2$: the line overpredicted this student by 2 points.`], a: '−2' },
    ],
    practice: [
      P('st2-2-1', 1, r`For the study data, what is the slope of the least-squares line?`, ['5.7'], 'b = Σ(x − x̄)(y − ȳ) ÷ Σ(x − x̄)².', [r`$b = 57 \div 10 = 5.7$ points per hour.`], { check: () => near(regression(SX, SY).b, 5.7) }),
      P('st2-2-2', 2, r`A line has $r = 0.8$, $s_x = 2$, $s_y = 10$, $\bar{x} = 5$ and $\bar{y} = 70$. What is the y-intercept $a$?`, ['50'], 'First b = r·sy/sx, then a = ȳ − b·x̄.', [r`$b = 0.8 \times \frac{10}{2} = 4$.`, r`$a = 70 - 4 \times 5 = 50$.`], { check: () => 70 - 0.8 * (10 / 2) * 5 === 50 }),
      P('st2-2-3', 1, r`Using $\hat{y} = 50 + 4x$, what is the predicted y when $x = 6$?`, ['74'], 'Substitute x = 6.', [r`$50 + 4 \times 6 = 74$.`], { check: () => 50 + 4 * 6 === 74 }),
      P('st2-2-4', 2, r`Using $\hat{y} = 50 + 4x$, a point has $x = 6$ and $y = 80$. What is its residual?`, ['6'], 'Residual = actual − predicted.', [r`$80 - 74 = 6$.`], { check: () => 80 - (50 + 4 * 6) === 6 }),
      P('st2-2-5', 1, r`The correlation is $r = 0.8$. What is $r^2$?`, ['0.64'], 'Square r.', [r`$0.8^2 = 0.64$: 64% of the variation in y is explained by the line.`], { check: () => near(0.8 ** 2, 0.64) }),
      P('st2-2-6', 2, r`A point has a negative residual. This means`, 3, 'Residual = actual − predicted.', [r`Negative means the actual y is less than predicted: the point lies below the line, and the line overpredicted it.`], { choices: ['the point is above the regression line', 'the line underpredicted the actual y', 'the correlation is negative', 'the point is below the line, so the line overpredicted it'] }),
    ],
    remember: ['ŷ = a + bx; b = r·sy/sx; a = ȳ − b·x̄.', 'Residual = y − ŷ (positive: above the line).', 'r² = share of variation explained. No extrapolation.'],
    checkIn: 'Unit 2 done. Next unit: how data should be collected.',
  },
];

/** Tutor layer for Units 1–2. */
export const STATS_A_TUTOR: Record<string, LessonTutor> = {
  'st1-1': {
    bigIdea: [
      r`Statistics is about learning from data when there is variation: not every student does the same amount of homework, so we look at the whole pattern, called a distribution.`,
      r`First decide what kind of variable you have. If it sorts people into groups (favorite sport), it is categorical. If it is a number you could sensibly average (minutes of homework), it is quantitative. The kind of variable decides which graph and which numbers make sense.`,
      r`To describe a distribution, an AP reader wants four things, in context: its shape, any outliers, its center and its spread. A distribution with a long tail toward big numbers is skewed right, and its mean gets pulled toward that tail.`,
    ],
    picture: { title: 'A class line-up', t: r`Imagine the class lining up by minutes of homework. Most students bunch together around 15 to 25 minutes, and one student stands far off at 48. That lonely student at the high end is the long right tail.` },
    words: [
      { term: 'Categorical variable', means: 'A variable that places each individual into a group.' },
      { term: 'Quantitative variable', means: 'A numerical variable you can do arithmetic with.' },
      { term: 'Distribution', means: 'What values a variable takes and how often.' },
      { term: 'Skewed right', means: 'The long tail stretches toward the larger values.' },
      { term: 'Outlier', means: 'A value far from the rest of the data.' },
    ],
    tools: [
      { name: 'Ordering numbers', refresher: 'Put the values from smallest to largest before finding anything in the middle.', lesson: 'c0-1' },
      { name: 'Reading graphs', refresher: 'Bar charts and histograms show counts as heights.', lesson: 'c0-3' },
    ],
    why: [
      [r`The question is whether each variable is a group label or a measured amount.`, r`Averaging hours of sleep makes sense, so it is quantitative.`],
      [r`Look for where the values bunch and where they thin out.`, r`One value far above the rest makes a long right tail.`],
    ],
    walk: {
      'st1-1-1': [r`Ask of each: is it a number you could average?`, r`Height, siblings and mile time are all measured numbers.`, r`Favorite sport is a group label: categorical (choice B).`],
      'st1-1-2': [r`The mode is the value that appears most often.`, r`25 appears three times; 15 appears twice; the rest once.`, r`Mode = 25 minutes.`],
      'st1-1-3': [r`Range = maximum − minimum.`, r`Maximum 48, minimum 12.`, r`48 − 12 = 36 minutes.`],
      'st1-1-4': [r`Skewed right means a few very large values.`, r`Those values pull the mean up; the median stays near the middle.`, r`Mean greater than median (choice A).`],
      'st1-1-5': [r`List the values above 24: 25, 25, 25, 31, 48.`, r`Count them.`, r`5 students.`],
      'st1-1-6': [r`Test scores are quantitative, and there are two groups to compare.`, r`Boxplots on one scale show center, spread and outliers side by side.`, r`Side-by-side boxplots (choice C).`],
    },
    teach: {
      plan: [r`Sort five example variables into categorical and quantitative.`, r`Match each kind of variable with its graphs.`, r`Make a dotplot of the homework data on the board.`, r`Describe it with SOCS: shape, outliers, center, spread, in context.`, r`Explain why the mean is pulled toward the tail.`],
      questions: [
        { q: 'Is zip code quantitative?', a: 'No. It is a number, but averaging zip codes makes no sense; it is a label, so it is categorical.' },
        { q: 'Which way is a distribution skewed if most values are high but a few are very low?', a: 'Skewed left: the long tail points toward the low values.' },
        { q: 'Why say "in context"?', a: 'Because AP answers must describe the actual variable and units (minutes of homework), not just "the data".' },
      ],
      keyPoints: ['Categorical vs quantitative.', 'Describe with SOCS in context.', 'Skew pulls the mean toward the tail.'],
    },
  },
  'st1-2': {
    bigIdea: [
      r`A list of numbers is hard to take in, so we summarize it. The center tells where the middle is (mean or median). The spread tells how much the values vary (range, IQR or standard deviation).`,
      r`The median and quartiles split the ordered data into four parts with about the same number of values each. The box of a boxplot holds the middle half of the data, from $Q_1$ to $Q_3$.`,
      r`Some values are so far from the rest that we call them outliers. The 1.5 × IQR rule gives fences: anything past them is an outlier. The median and IQR barely notice outliers, which is why they are the better summary for skewed data.`,
    ],
    picture: { title: 'Cutting a ribbon into quarters', t: r`Lay all the values along a ribbon in order and cut it into four pieces with the same number of values. The cuts are $Q_1$, the median and $Q_3$. The two middle pieces together are the IQR.` },
    words: [
      { term: 'Mean', means: 'The sum of the values divided by how many there are.' },
      { term: 'Median', means: 'The middle value of the ordered data.' },
      { term: 'Quartiles (Q1, Q3)', means: 'The medians of the lower and upper halves.' },
      { term: 'IQR', means: 'Q3 − Q1: the spread of the middle half.' },
      { term: 'Resistant', means: 'Barely affected by extreme values.' },
    ],
    tools: [
      { name: 'Averages', refresher: 'Add the values, then divide by how many.', lesson: 'c0-1' },
      { name: 'Describing distributions', refresher: 'Shape, outliers, center, spread.', lesson: 'st1-1' },
    ],
    why: [
      [r`The median splits the data in half; each half's median gives a quartile.`, r`Those five numbers are exactly what a boxplot draws.`],
      [r`The fence is 1.5 IQRs past the quartile.`, r`Anything beyond a fence counts as an outlier.`],
    ],
    walk: {
      'st1-2-1': [r`There are 11 ordered values, so the middle is the 6th.`, r`Count: 12, 15, 15, 18, 20, 22.`, r`Median = 22.`],
      'st1-2-2': [r`Leave out the median (22). The upper half is 25, 25, 25, 31, 48.`, r`Its middle value is the 3rd.`, r`Q3 = 25.`],
      'st1-2-3': [r`Q1 is the median of 12, 15, 15, 18, 20: 15.`, r`Q3 = 25.`, r`IQR = 25 − 15 = 10.`],
      'st1-2-4': [r`Upper fence = Q3 + 1.5 × IQR.`, r`25 + 1.5 × 10 = 25 + 15.`, r`= 40.`],
      'st1-2-5': [r`The mean, SD and range all use every value, including extremes.`, r`The median only uses the middle position.`, r`The median (choice C).`],
      'st1-2-6': [r`Add: 12 + 15 + 15 + 18 + 20 + 22 + 25 + 25 + 25 + 31 + 48 = 256.`, r`Divide by 11: 256 ÷ 11 ≈ 23.27.`, r`23.27 minutes, above the median because of the outlier.`],
    },
    teach: {
      plan: [r`Order the data and find the median.`, r`Split into halves to find Q1 and Q3.`, r`Draw the boxplot from the five-number summary.`, r`Compute the fences and test for outliers.`, r`Show how the mean moves (and the median does not) when 48 changes to 98.`],
      questions: [
        { q: 'Why leave out the median when finding quartiles with an odd number of values?', a: 'Because it belongs to neither half; the AP course uses the halves on each side of it.' },
        { q: 'If the 48 became 98, what changes?', a: 'The mean and SD go up; the median, Q1, Q3 and IQR stay the same.' },
        { q: 'When should you report the median and IQR instead of the mean and SD?', a: 'When the distribution is skewed or has outliers.' },
      ],
      keyPoints: ['Five-number summary and boxplot.', '1.5 × IQR fences.', 'Median and IQR are resistant.'],
    },
  },
  'st1-3': {
    bigIdea: [
      r`Many things in nature and in tests follow a bell-shaped curve: most values are near the middle, and fewer and fewer appear as you go out to either side. That shape is a normal distribution, described by its mean $\mu$ and standard deviation $\sigma$.`,
      r`A z-score tells how far a value is from the mean in standard deviations. A z-score of 2 means "two SDs above average", which in a normal distribution is quite unusual.`,
      r`Because every normal curve has the same shape, we can find what share of values lie in any range: about 68% within 1 SD, 95% within 2 and 99.7% within 3, and exact areas with a table or calculator.`,
    ],
    picture: { title: 'A pile of sand', t: r`Pour sand through a funnel and it makes a smooth hill: high in the middle and sloping evenly down both sides. Most grains land near the center; few land far out. That hill is the normal curve.` },
    words: [
      { term: 'Normal distribution', means: 'A symmetric, bell-shaped distribution described by μ and σ.' },
      { term: 'z-score', means: 'How many standard deviations a value is from the mean.' },
      { term: 'Percentile', means: 'The percent of values at or below a given value.' },
      { term: '68–95–99.7 rule', means: 'The share of normal values within 1, 2 and 3 SDs of the mean.' },
    ],
    tools: [
      { name: 'Standard deviation', refresher: 'The typical distance from the mean.', lesson: 'st1-2' },
      { name: 'Solving for x', refresher: 'From z = (x − μ)/σ, x = μ + zσ.', lesson: 'c0-2' },
    ],
    why: [
      [r`Turning 180 into a z-score puts it on the standard normal scale.`, r`The area to the right of that z is the proportion taller than 180.`],
      [r`Work backward: find the z with 90% of the area below it.`, r`Convert that z back to centimeters with x = μ + zσ.`],
    ],
    walk: {
      'st1-3-1': [r`z = (x − μ)/σ.`, r`(186 − 170)/8 = 16/8.`, r`z = 2.`],
      'st1-3-2': [r`162 = 170 − 8 and 178 = 170 + 8: exactly 1 SD on each side.`, r`About 68% of a normal distribution is within 1 SD.`, r`About 68%.`],
      'st1-3-3': [r`z = (180 − 170)/8 = 1.25.`, r`Area to the left of 1.25 is about 0.894.`, r`Area to the right: 1 − 0.894 ≈ 0.106.`],
      'st1-3-4': [r`The z with 90% below it is about 1.2816.`, r`x = 170 + 1.2816 × 8.`, r`≈ 180.3 cm.`],
      'st1-3-5': [r`Multiplying every value by 2 doubles the center.`, r`Distances between values double too, so the spread doubles.`, r`Both double (choice B).`],
      'st1-3-6': [r`z for 65: (65 − 72)/6 ≈ −1.17. z for 80: (80 − 72)/6 ≈ 1.33.`, r`Areas to the left: about 0.1217 and 0.9088.`, r`Between: 0.9088 − 0.1217 ≈ 0.787.`],
    },
    teach: {
      plan: [r`Draw a bell curve and mark μ and 1, 2 and 3 SDs on each side.`, r`Label the 68–95–99.7 areas.`, r`Compute a z-score and say what it means in words.`, r`Find an area above a value using z.`, r`Work backward from a percentile to a value.`],
      questions: [
        { q: 'What does a negative z-score mean?', a: 'The value is below the mean.' },
        { q: 'Can you use the 68–95–99.7 rule for skewed data?', a: 'No. It only describes normal (bell-shaped) distributions.' },
        { q: 'If you add 5 to every value, what happens to the SD?', a: 'Nothing: shifting every value moves the center but not the spread.' },
      ],
      keyPoints: ['z = (x − μ)/σ.', '68–95–99.7 rule.', 'Areas from z; percentiles back to x.'],
    },
  },
  'st2-1': {
    bigIdea: [
      r`Statistics often asks whether two things go together. For two categorical variables, a two-way table counts how many people fall in each combination.`,
      r`To check for a relationship, compare groups fairly using percents within each group (conditional proportions). If 40% of 9th graders but 70% of 12th graders have iPhones, phone type and grade are associated.`,
      r`For two quantitative variables, plot them in a scatterplot. The correlation r measures how tightly the points cluster around a straight line: near 1 or −1 is strong, near 0 is weak. But r only sees straight lines, and it never proves that one thing causes the other.`,
    ],
    picture: { title: 'Ice cream and sunburns', t: r`Ice cream sales and sunburns rise together, so their correlation is strong. Ice cream does not cause sunburns: hot sunny days cause both. Correlation shows a pattern, not a cause.` },
    words: [
      { term: 'Two-way table', means: 'Counts for every combination of two categorical variables.' },
      { term: 'Conditional proportion', means: 'A proportion within one group (a cell ÷ its row or column total).' },
      { term: 'Association', means: 'Knowing one variable changes what you expect for the other.' },
      { term: 'Correlation (r)', means: 'A number from −1 to 1 measuring linear direction and strength.' },
    ],
    tools: [
      { name: 'Fractions and percents', refresher: 'Part ÷ whole, then × 100 for a percent.', lesson: 'c0-1' },
      { name: 'Slope of a line', refresher: 'Positive slope rises, negative falls.', lesson: 'c0-4' },
    ],
    why: [
      [r`"Of 12th graders" sets the group, so divide by the 12th-grade total.`, r`35 of those 50 use iPhones.`],
      [r`Compare the same proportion in each group.`, r`Different conditional proportions mean the variables are associated.`],
    ],
    walk: {
      'st2-1-1': [r`The group is 12th graders: 50 students.`, r`35 of them use iPhones.`, r`35 ÷ 50 = 0.7.`],
      'st2-1-2': [r`Marginal means use a total over the grand total.`, r`45 Android users out of 100 students.`, r`0.45.`],
      'st2-1-3': [r`The group is now iPhone users: 55 students.`, r`20 of them are 9th graders.`, r`20 ÷ 55 ≈ 0.364.`],
      'st2-1-4': [r`9th graders: 20 of 50 = 40% iPhone. 12th graders: 35 of 50 = 70%.`, r`The percents differ by grade.`, r`Associated (choice A).`],
      'st2-1-5': [r`r has no units.`, r`Changing inches to centimeters only rescales x.`, r`r stays the same (choice C).`],
      'st2-1-6': [r`r measures how close points are to a straight line.`, r`A U shape goes down then up: no single straight-line trend.`, r`r near 0 (choice A).`],
    },
    teach: {
      plan: [r`Read a joint, a marginal and a conditional proportion from the table.`, r`Compare the conditional proportions to judge association.`, r`Draw a scatterplot and describe direction, form, strength and outliers.`, r`List the properties of r.`, r`Tell the ice cream and sunburn story about causation.`],
      questions: [
        { q: 'Why compare percents instead of counts?', a: 'Groups can have different sizes; percents put them on the same footing.' },
        { q: 'Does r = 0 mean no relationship?', a: 'It means no linear relationship. There could still be a strong curved one.' },
        { q: 'Why can a strong correlation not prove causation?', a: 'A lurking variable might drive both, or the direction might be reversed.' },
      ],
      keyPoints: ['Conditional proportions reveal association.', 'Describe scatterplots fully.', 'r is linear-only and not causation.'],
    },
  },
  'st2-2': {
    bigIdea: [
      r`When a scatterplot looks like a band of points along a line, we can draw the line that best fits it and use it to predict. The least-squares line makes the squared vertical misses as small as possible.`,
      r`The slope tells how much the predicted y changes for each extra unit of x. In the study data, each extra hour adds about 5.7 points to the predicted score.`,
      r`The miss for each point is its residual: actual minus predicted. And $r^2$ tells what share of the ups and downs in y the line accounts for. Predictions far outside the data (extrapolation) are risky.`,
    ],
    picture: { title: 'Growing taller', t: r`From age 5 to 12 your height rises in a fairly straight line. Use that line to predict your height at 40 and you would be 3 meters tall. The line works inside the data, not far beyond it: that is extrapolation.` },
    words: [
      { term: 'Least-squares regression line', means: 'The line ŷ = a + bx that minimizes the sum of squared residuals.' },
      { term: 'Slope (b)', means: 'The predicted change in y for each one-unit increase in x.' },
      { term: 'Residual', means: 'Actual y minus predicted ŷ.' },
      { term: 'r²', means: 'The fraction of the variation in y explained by the line.' },
      { term: 'Extrapolation', means: 'Predicting far outside the range of the data.' },
    ],
    tools: [
      { name: 'Lines and slope', refresher: 'y = mx + b: slope times x plus intercept.', lesson: 'c0-4' },
      { name: 'Correlation', refresher: 'r measures linear strength; b = r·sy/sx.', lesson: 'st2-1' },
    ],
    why: [
      [r`The slope formula weighs how x and y move together, scaled by how much x varies.`, r`The line always passes through the point of means $(\bar{x}, \bar{y})$, which gives the intercept.`],
      [r`Plug x = 3 into the line to get the prediction.`, r`The residual is how far the real score is from it.`],
    ],
    walk: {
      'st2-2-1': [r`x̄ = 3 and ȳ = 73. The products (x − x̄)(y − ȳ) are 22, 5, 0, 6, 24, which add to 57.`, r`The squares (x − x̄)² add to 10.`, r`b = 57 ÷ 10 = 5.7.`],
      'st2-2-2': [r`Slope: b = r × sy/sx = 0.8 × 10/2 = 4.`, r`Intercept: a = ȳ − b·x̄ = 70 − 4 × 5.`, r`a = 50.`],
      'st2-2-3': [r`Substitute x = 6.`, r`50 + 4 × 6 = 50 + 24.`, r`= 74.`],
      'st2-2-4': [r`Predicted ŷ = 74 (from before).`, r`Residual = actual − predicted = 80 − 74.`, r`= 6 (the point is above the line).`],
      'st2-2-5': [r`r² is r squared.`, r`0.8 × 0.8 = 0.64.`, r`64% of the variation in y is explained by the line.`],
      'st2-2-6': [r`Residual = y − ŷ is negative, so y < ŷ.`, r`The actual point sits below the line.`, r`The line overpredicted it (choice D).`],
    },
    teach: {
      plan: [r`Plot the study data and sketch a line by eye.`, r`Compute the least-squares slope and intercept.`, r`Interpret the slope in a full sentence with context.`, r`Find a residual and say whether the point is above or below the line.`, r`Interpret r² and warn about extrapolation.`],
      questions: [
        { q: 'Interpret a slope of 5.7 here.', a: 'For each additional hour studied, the predicted test score increases by about 5.7 points.' },
        { q: 'What does a residual plot with a curve tell you?', a: 'A straight line is not a good model; the relationship is curved.' },
        { q: 'Why is predicting the score for 15 hours of study risky?', a: 'It is far outside the data (1–5 hours); the linear pattern may not continue.' },
      ],
      keyPoints: ['ŷ = a + bx.', 'Residual = y − ŷ.', 'r² explains variation; avoid extrapolation.'],
    },
  },
};
