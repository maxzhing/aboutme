import type { CalcLesson, CalcProblem, LessonTutor } from '../calc/types';
import { near, normCdf, round, zStar } from './lib';

const r = String.raw;
const P = (id: string, level: 1 | 2 | 3, q: string, answer: number | string[], hint: string, solution: string[], extra: Partial<CalcProblem> = {}): CalcProblem => ({ id, level, q, answer, hint, solution, ...extra });

const SD_PHAT = Math.sqrt((0.6 * 0.4) / 100);
const PHAT = 248 / 400, SE_CI = Math.sqrt((PHAT * (1 - PHAT)) / 400), ME_CI = zStar(0.95) * SE_CI;
const Z_TEST = (116 / 200 - 0.5) / Math.sqrt((0.5 * 0.5) / 200);

/** AP Statistics Units 5–6. Original lessons and problems. */
export const STATS_C: CalcLesson[] = [
  {
    id: 'st5-1', unit: 5, n: 1, title: 'Sampling distributions of sample proportions',
    intro: 'If you took many random samples, each one would give a slightly different answer. The pattern of those answers is a sampling distribution, and it is the foundation of all inference. Today you find the center, spread and shape of the sampling distribution of a sample proportion p̂.',
    goals: ['Explain what a sampling distribution is', 'Find the mean and standard deviation of p̂', 'Check the 10% and Large Counts conditions', 'Use a normal model to find probabilities about p̂'],
    notes: [
      { k: 'p', t: r`A **parameter** describes a population (like $p$, the true proportion). A **statistic** describes a sample (like $\hat{p}$). Statistics vary from sample to sample; that variation is sampling variability.` },
      { k: 'formula', t: r`\mu_{\hat{p}} = p \qquad \sigma_{\hat{p}} = \sqrt{\frac{p(1-p)}{n}}` },
      { k: 'rule', title: 'Conditions', t: r`**10% condition**: $n \le 10\%$ of the population (so the SD formula is accurate). **Large Counts**: $np \ge 10$ and $n(1-p) \ge 10$ (so the shape is approximately normal).` },
      { k: 'p', t: r`Because $\mu_{\hat{p}} = p$, the sample proportion is an **unbiased estimator**: on average it hits the truth. Larger samples make it less variable: to cut the SD in half, take four times as many observations.` },
      { k: 'warn', t: r`The sampling distribution is not the distribution of one sample's data. It is the distribution of a statistic over many possible samples.` },
    ],
    examples: [
      { q: r`60% of a large school's students ride the bus. Describe the sampling distribution of $\hat{p}$ for random samples of 100 students.`, steps: [r`Center: $\mu_{\hat{p}} = 0.6$. Spread: $\sigma_{\hat{p}} = \sqrt{\frac{0.6 \times 0.4}{100}} \approx 0.049$.`, r`Shape: $np = 60$ and $n(1-p) = 40$ are both at least 10, so it is approximately normal.`], a: 'Approximately normal, mean 0.6, SD about 0.049' },
      { q: r`For the same samples, find $P(\hat{p} < 0.55)$.`, steps: [r`$z = \frac{0.55 - 0.6}{0.049} \approx -1.02$.`, r`$P(Z < -1.02) \approx 0.154$.`], a: 'About 0.154' },
    ],
    practice: [
      P('st5-1-1', 1, r`$p = 0.6$ and $n = 100$. What is the mean of the sampling distribution of $\hat{p}$?`, ['0.6'], 'p̂ is unbiased.', [r`$\mu_{\hat{p}} = p = 0.6$.`], { check: () => near(0.6, 0.6) }),
      P('st5-1-2', 2, r`$p = 0.6$ and $n = 100$. What is $\sigma_{\hat{p}}$? Round to three decimal places.`, ['0.049', '0.0490'], '√(p(1 − p)/n).', [r`$\sqrt{0.24/100} = \sqrt{0.0024} \approx 0.049$.`], { check: () => round(SD_PHAT, 3) === 0.049 }),
      P('st5-1-3', 3, r`$p = 0.6$ and $n = 100$. What is $P(\hat{p} < 0.55)$? Round to three decimal places.`, ['0.154', '0.1537'], 'Standardize with the SD you just found.', [r`$z = \frac{0.55 - 0.6}{0.049} \approx -1.02$, and $P(Z < -1.02) \approx 0.154$.`], { check: () => round(normCdf(0.55, 0.6, SD_PHAT), 3) === 0.154 }),
      P('st5-1-4', 1, r`For $p = 0.6$ and $n = 100$, what is $np$ (the expected number of successes)?`, ['60'], 'Multiply.', [r`$100 \times 0.6 = 60$, which is at least 10.`], { check: () => 100 * 0.6 === 60 }),
      P('st5-1-5', 2, r`The sample size is changed from 100 to 400. What happens to $\sigma_{\hat{p}}$?`, 1, 'n is under a square root.', [r`Multiplying $n$ by 4 divides the SD by $\sqrt{4} = 2$: it is cut in half.`], { choices: ['It is divided by 4', 'It is cut in half', 'It stays the same', 'It doubles'] }),
      P('st5-1-6', 2, r`Why is $\hat{p}$ called an unbiased estimator of $p$?`, 2, 'Where is the sampling distribution centered?', [r`The mean of its sampling distribution equals $p$, so on average it neither overestimates nor underestimates.`], { choices: ['Every sample gives exactly p', 'Its standard deviation is 0', 'The mean of its sampling distribution equals p', 'It is always normally distributed'] }),
    ],
    remember: ['μ_p̂ = p; σ_p̂ = √(p(1 − p)/n).', 'Large Counts: np ≥ 10 and n(1 − p) ≥ 10.', '4 times the sample size halves the SD.'],
    checkIn: 'Next: sample means and the central limit theorem.',
  },
  {
    id: 'st5-2', unit: 5, n: 2, title: 'Sampling distributions of sample means and the CLT',
    intro: 'Sample means vary too, but less than individual values do. Today you find the mean and standard deviation of the sampling distribution of x̄, and meet one of the most important ideas in statistics, the central limit theorem: for large samples, x̄ is approximately normal whatever the population looks like.',
    goals: ['Find the mean and SD of the sampling distribution of x̄', 'State the central limit theorem and when it applies', 'Compute probabilities about x̄ with a normal model', 'Find the sample size needed for a given SD'],
    notes: [
      { k: 'formula', t: r`\mu_{\bar{x}} = \mu \qquad \sigma_{\bar{x}} = \frac{\sigma}{\sqrt{n}}` },
      { k: 'rule', title: 'Central limit theorem (CLT)', t: r`When $n$ is large (a common rule is $n \ge 30$), the sampling distribution of $\bar{x}$ is approximately normal, even if the population is not.` },
      { k: 'list', items: [r`If the population is normal, $\bar{x}$ is normal for any $n$.`, r`If the population is skewed and $n$ is small, $\bar{x}$ is also skewed (less than the population).`, r`The 10% condition still applies when sampling without replacement.`] },
      { k: 'p', t: r`Averages are less variable than individual values: the SD of $\bar{x}$ shrinks as $n$ grows. For differences of two independent means or proportions, the means subtract and the **variances add**.` },
      { k: 'warn', t: r`The CLT is about the distribution of $\bar{x}$, not of the data. A large sample from a skewed population is still a skewed sample.` },
    ],
    examples: [
      { q: r`Battery lifetimes have $\mu = 50$ hours and $\sigma = 12$ hours. For random samples of 36 batteries, describe $\bar{x}$.`, steps: [r`$\mu_{\bar{x}} = 50$ and $\sigma_{\bar{x}} = \frac{12}{\sqrt{36}} = 2$ hours.`, r`$n = 36 \ge 30$, so by the CLT $\bar{x}$ is approximately normal.`], a: 'Approximately normal, mean 50, SD 2' },
      { q: r`Find $P(\bar{x} > 53)$.`, steps: [r`$z = \frac{53 - 50}{2} = 1.5$.`, r`$P(Z > 1.5) \approx 0.067$.`], a: 'About 0.067' },
    ],
    practice: [
      P('st5-2-1', 1, r`$\mu = 50$, $\sigma = 12$, $n = 36$. What is $\sigma_{\bar{x}}$?`, ['2'], 'σ ÷ √n.', [r`$12 \div 6 = 2$.`], { check: () => 12 / Math.sqrt(36) === 2 }),
      P('st5-2-2', 2, r`Same setting. What is $P(\bar{x} > 53)$? Round to three decimal places.`, ['0.067', '0.0668'], 'z = (53 − 50)/2.', [r`$z = 1.5$ and $P(Z > 1.5) \approx 0.067$.`], { check: () => round(1 - normCdf(53, 50, 2), 3) === 0.067 }),
      P('st5-2-3', 2, r`With $\sigma = 12$, what sample size makes $\sigma_{\bar{x}} = 1$?`, ['144'], 'Solve 12/√n = 1.', [r`$\sqrt{n} = 12$, so $n = 144$.`], { check: () => 12 / Math.sqrt(144) === 1 }),
      P('st5-2-4', 1, r`What is the mean of the sampling distribution of $\bar{x}$ when $\mu = 50$?`, ['50'], 'x̄ is unbiased.', [r`$\mu_{\bar{x}} = \mu = 50$.`], { check: () => 50 === 50 }),
      P('st5-2-5', 2, r`A population is strongly skewed right. Which sampling distribution of $\bar{x}$ is closest to normal?`, 3, 'The CLT needs a large n.', [r`The larger the sample, the closer $\bar{x}$ is to normal; $n = 50$ is the largest.`], { choices: ['n = 2', 'n = 5', 'n = 10', 'n = 50'] }),
      P('st5-2-6', 3, r`Two independent sample means, $\bar{x}_1$ and $\bar{x}_2$, have standard deviations 0.3 and 0.4. What is the standard deviation of $\bar{x}_1 - \bar{x}_2$?`, ['0.5'], 'Variances add.', [r`$\sqrt{0.3^2 + 0.4^2} = \sqrt{0.25} = 0.5$.`], { check: () => near(Math.sqrt(0.09 + 0.16), 0.5) }),
    ],
    remember: ['μ_x̄ = μ; σ_x̄ = σ/√n.', 'CLT: large n → x̄ approximately normal.', 'Differences: means subtract, variances add.'],
    checkIn: 'Unit 5 done. Next: using samples to estimate a proportion.',
  },
  {
    id: 'st6-1', unit: 6, n: 1, title: 'Confidence intervals for a proportion',
    intro: 'A single sample gives a point estimate, but we know it is probably a little off. A confidence interval gives a range of plausible values instead. Today you build a one-proportion z interval, interpret it and the confidence level correctly, and find the sample size needed for a given margin of error.',
    goals: ['Check the conditions for a one-proportion z interval', 'Construct the interval: estimate ± margin of error', 'Interpret the interval and the confidence level in context', 'Find the sample size for a desired margin of error'],
    notes: [
      { k: 'formula', t: r`\hat{p} \pm z^* \sqrt{\frac{\hat{p}(1-\hat{p})}{n}}` },
      { k: 'list', items: [r`Common critical values: $z^* = 1.645$ (90%), $1.960$ (95%), $2.576$ (99%).`, r`Conditions: **random** sample, **10%** condition, **Large Counts** ($n\hat{p} \ge 10$ and $n(1-\hat{p}) \ge 10$).`] },
      { k: 'rule', title: 'Interpreting', t: r`**The interval**: "We are 95% confident that the interval from 0.572 to 0.668 captures the true proportion of [context]." **The level**: "If we took many random samples and built an interval from each, about 95% of them would capture the true proportion."` },
      { k: 'p', t: r`The margin of error gets smaller with a larger sample or a lower confidence level. To find the needed sample size, solve $z^*\sqrt{\frac{p^*(1-p^*)}{n}} \le ME$ for $n$, using $p^* = 0.5$ if you have no earlier estimate, and round **up**.` },
      { k: 'warn', t: r`It is wrong to say "there is a 95% probability that $p$ is in this interval." The parameter is fixed; it is the method that captures it 95% of the time.` },
      { k: 'p', t: r`A **two-proportion z interval** estimates $p_1 - p_2$ with $(\hat{p}_1 - \hat{p}_2) \pm z^*\sqrt{\frac{\hat{p}_1(1-\hat{p}_1)}{n_1} + \frac{\hat{p}_2(1-\hat{p}_2)}{n_2}}$.` },
    ],
    examples: [
      { q: r`In a random sample of 400 voters, 248 support a new park. Build a 95% confidence interval for the true proportion.`, steps: [r`$\hat{p} = \frac{248}{400} = 0.62$, and $SE = \sqrt{\frac{0.62 \times 0.38}{400}} \approx 0.0243$.`, r`$ME = 1.96 \times 0.0243 \approx 0.048$, so the interval is $0.62 \pm 0.048 = (0.572, 0.668)$.`], a: '(0.572, 0.668)' },
      { q: r`How large a sample is needed for a margin of error of at most 0.03 at 95% confidence?`, steps: [r`Use $p^* = 0.5$: $1.96\sqrt{\frac{0.25}{n}} \le 0.03$ gives $n \ge \left(\frac{1.96}{0.03}\right)^2 \times 0.25 \approx 1067.1$.`, r`Round up: $n = 1068$.`], a: '1068' },
    ],
    practice: [
      P('st6-1-1', 1, r`248 of 400 sampled voters support the park. What is $\hat{p}$?`, ['0.62'], 'Successes ÷ n.', [r`$248 \div 400 = 0.62$.`], { check: () => near(PHAT, 0.62) }),
      P('st6-1-2', 2, r`What is the standard error, $\sqrt{\hat{p}(1-\hat{p})/n}$? Round to three decimal places.`, ['0.024', '0.0243'], 'Use p̂ = 0.62 and n = 400.', [r`$\sqrt{0.2356/400} \approx 0.024$.`], { check: () => round(SE_CI, 3) === 0.024 }),
      P('st6-1-3', 2, r`What is the margin of error at 95% confidence? Round to three decimal places.`, ['0.048', '0.0476'], 'z* × SE with z* = 1.96.', [r`$1.96 \times 0.0243 \approx 0.048$.`], { check: () => round(ME_CI, 3) === 0.048 }),
      P('st6-1-4', 2, r`What is the lower endpoint of the 95% interval? Round to three decimal places.`, ['0.572'], 'p̂ − ME.', [r`$0.62 - 0.048 = 0.572$.`], { check: () => round(PHAT - ME_CI, 3) === 0.572 }),
      P('st6-1-5', 3, r`What is the smallest sample size giving a margin of error of at most 0.03 at 95% confidence, using $p^* = 0.5$?`, ['1068'], 'Solve for n and round up.', [r`$n \ge (1.96/0.03)^2 \times 0.25 \approx 1067.1$, so $n = 1068$.`], { check: () => Math.ceil((1.96 / 0.03) ** 2 * 0.25) === 1068 }),
      P('st6-1-6', 2, r`Which is the correct meaning of "95% confidence"?`, 0, 'It describes the method over many samples.', [r`About 95% of intervals built this way from many random samples would capture the true proportion.`], { choices: ['About 95% of intervals made this way capture the true proportion', 'There is a 95% chance the true proportion is in this interval', '95% of voters are in the interval', 'The sample proportion is correct 95% of the time'] }),
    ],
    remember: ['p̂ ± z*·√(p̂(1 − p̂)/n).', 'Interpret: "We are C% confident the interval captures the true p…"', 'Sample size: solve for n and round up.'],
    checkIn: 'Next: testing a claim about a proportion.',
  },
  {
    id: 'st6-2', unit: 6, n: 2, title: 'Significance tests for a proportion, errors and power',
    intro: 'A significance test asks whether sample data give convincing evidence against a claim. Today you write hypotheses, compute a z statistic and a p-value, make a conclusion in context, and learn about the two kinds of mistakes a test can make (Type I and Type II errors) and the power of a test.',
    goals: ['State null and alternative hypotheses about a proportion', 'Compute the test statistic and p-value', 'Write a conclusion that compares the p-value with α, in context', 'Describe Type I and Type II errors and what increases power'],
    notes: [
      { k: 'list', items: [r`$H_0$: the claim of "no effect" or "no difference", e.g. $p = 0.5$.`, r`$H_a$: what we suspect, e.g. $p > 0.5$ (one-sided) or $p \ne 0.5$ (two-sided).`, r`Hypotheses are about parameters ($p$), never statistics ($\hat{p}$).`] },
      { k: 'formula', t: r`z = \frac{\hat{p} - p_0}{\sqrt{\frac{p_0(1-p_0)}{n}}}` },
      { k: 'rule', title: 'The p-value and the conclusion', t: r`The p-value is the probability, assuming $H_0$ is true, of getting a result at least as extreme as the one observed. If p-value $< \alpha$, reject $H_0$: there is convincing evidence for $H_a$. Otherwise, fail to reject $H_0$: there is not convincing evidence for $H_a$.` },
      { k: 'list', items: [r`**Type I error**: rejecting $H_0$ when it is true. Its probability is $\alpha$.`, r`**Type II error**: failing to reject $H_0$ when $H_a$ is true.`, r`**Power** $= 1 - P(\text{Type II})$: the chance of correctly rejecting a false $H_0$. Power increases with a larger sample, a larger $\alpha$, or a true value farther from $p_0$.`] },
      { k: 'warn', t: r`Never "accept $H_0$". Failing to reject only means the evidence was not strong enough, not that $H_0$ is proven.` },
    ],
    examples: [
      { q: r`A coin is flipped 200 times and lands heads 116 times. Test $H_0: p = 0.5$ against $H_a: p > 0.5$.`, steps: [r`$\hat{p} = 0.58$ and $z = \frac{0.58 - 0.5}{\sqrt{0.25/200}} = \frac{0.08}{0.0354} \approx 2.26$.`, r`p-value $= P(Z > 2.26) \approx 0.012$. Since $0.012 < 0.05$, reject $H_0$: there is convincing evidence the coin lands heads more than half the time.`], a: 'z ≈ 2.26, p ≈ 0.012; reject H₀' },
      { q: r`In context, what would a Type I error be here?`, steps: [r`A Type I error rejects a true $H_0$.`, r`Concluding the coin favors heads when it is actually fair.`], a: 'Concluding the coin favors heads when it is fair' },
    ],
    practice: [
      P('st6-2-1', 2, r`116 heads in 200 flips, $H_0: p = 0.5$. What is the z statistic? Round to two decimal places.`, ['2.26', '2.263'], '(p̂ − p₀)/√(p₀(1 − p₀)/n).', [r`$\frac{0.58 - 0.5}{0.0354} \approx 2.26$.`], { check: () => round(Z_TEST, 2) === 2.26 }),
      P('st6-2-2', 2, r`For $H_a: p > 0.5$, what is the p-value? Round to three decimal places.`, ['0.012', '0.0118'], 'Area to the right of z.', [r`$P(Z > 2.263) \approx 0.012$.`], { check: () => round(1 - normCdf(Z_TEST), 3) === 0.012 }),
      P('st6-2-3', 2, r`For $H_a: p \ne 0.5$, what is the p-value? Round to three decimal places.`, ['0.024', '0.0237'], 'Two tails.', [r`$2 \times 0.0118 \approx 0.024$.`], { check: () => round(2 * (1 - normCdf(Z_TEST)), 3) === 0.024 }),
      P('st6-2-4', 1, r`A test gives a p-value of 0.08 with $\alpha = 0.05$. What is the correct conclusion?`, 1, 'Compare the p-value with α.', [r`$0.08 > 0.05$, so fail to reject $H_0$: there is not convincing evidence for $H_a$.`], { choices: ['Reject H₀; there is convincing evidence for Hₐ', 'Fail to reject H₀; there is not convincing evidence for Hₐ', 'Accept H₀; it is proven true', 'Reject Hₐ; H₀ is true'] }),
      P('st6-2-5', 2, r`A Type I error occurs when you`, 0, 'Type I: a false alarm.', [r`A Type I error is rejecting $H_0$ when $H_0$ is actually true.`], { choices: ['reject H₀ when H₀ is true', 'fail to reject H₀ when H₀ is false', 'reject H₀ when H₀ is false', 'use the wrong sample size'] }),
      P('st6-2-6', 3, r`Which change increases the power of a test (all else equal)?`, 2, 'More data means more ability to detect a real effect.', [r`A larger sample shrinks the standard error, making a real difference easier to detect, so power increases.`], { choices: ['Decreasing α from 0.05 to 0.01', 'Decreasing the sample size', 'Increasing the sample size', 'Moving the true value closer to p₀'] }),
    ],
    remember: ['z = (p̂ − p₀)/√(p₀(1 − p₀)/n).', 'p < α: reject H₀; otherwise fail to reject (never accept).', 'Type I: reject a true H₀. Power rises with n.'],
    checkIn: 'Unit 6 done. Next: inference for means with the t distribution.',
  },
];

/** Tutor layer for Units 5–6. */
export const STATS_C_TUTOR: Record<string, LessonTutor> = {
  'st5-1': {
    bigIdea: [
      r`Imagine taking a random sample of 100 students and finding the share who ride the bus. Take another sample and the share will be a bit different. If you did this thousands of times, the shares would form their own distribution: the sampling distribution.`,
      r`That distribution is centered right at the true proportion, so the sample proportion is fair: it does not lean high or low. Its spread, $\sqrt{p(1-p)/n}$, shrinks as the sample gets bigger.`,
      r`When the sample is big enough to expect at least 10 successes and 10 failures, the sampling distribution is close to normal, so all the normal-curve tools from Unit 1 work.`,
    ],
    picture: { title: 'Many classes, one question', t: r`Every class in the country asks 100 random students, "Do you ride the bus?" Each class gets a slightly different percent. Plot all the percents and they make a bell curve centered at the true 60%.` },
    words: [
      { term: 'Parameter', means: 'A number describing a population, like p.' },
      { term: 'Statistic', means: 'A number computed from a sample, like p̂.' },
      { term: 'Sampling distribution', means: 'The distribution of a statistic over all possible samples of the same size.' },
      { term: 'Unbiased estimator', means: 'A statistic whose sampling distribution is centered at the parameter.' },
    ],
    tools: [
      { name: 'z-scores and normal areas', refresher: 'z = (value − mean)/SD, then find the area.', lesson: 'st1-3' },
      { name: 'Binomial mean', refresher: 'Expected successes = np.', lesson: 'st4-3' },
    ],
    why: [
      [r`The center and spread come straight from the formulas.`, r`The Large Counts check tells us the normal shape is justified.`],
      [r`Standardize 0.55 using the sampling distribution's mean and SD.`, r`Then the normal table gives the area below.`],
    ],
    walk: {
      'st5-1-1': [r`p̂ is an unbiased estimator of p.`, r`So its sampling distribution is centered at p.`, r`Mean = 0.6.`],
      'st5-1-2': [r`p(1 − p) = 0.6 × 0.4 = 0.24.`, r`Divide by n: 0.24 ÷ 100 = 0.0024.`, r`√0.0024 ≈ 0.049.`],
      'st5-1-3': [r`z = (0.55 − 0.6) ÷ 0.049 ≈ −1.02.`, r`The area to the left of −1.02 is about 0.154.`, r`P(p̂ < 0.55) ≈ 0.154.`],
      'st5-1-4': [r`Expected successes = np.`, r`100 × 0.6.`, r`= 60 (at least 10, so Large Counts holds).`],
      'st5-1-5': [r`σ = √(p(1 − p)/n), so n is under a square root.`, r`4 times n divides σ by √4 = 2.`, r`The SD is cut in half (choice B).`],
      'st5-1-6': [r`Individual samples still miss, so A and B are false.`, r`Unbiased means the sampling distribution is centered at the truth.`, r`Its mean equals p (choice C).`],
    },
    teach: {
      plan: [r`Contrast parameter and statistic.`, r`Simulate several samples to show sampling variability.`, r`State the mean and SD formulas for p̂.`, r`Check the 10% and Large Counts conditions.`, r`Compute a probability using a normal model.`],
      questions: [
        { q: 'Does a bigger sample make p̂ unbiased?', a: 'p̂ is already unbiased at any size; a bigger sample makes it less variable.' },
        { q: 'Why do we need Large Counts?', a: 'With too few expected successes or failures, the sampling distribution is skewed and a normal model would be wrong.' },
        { q: 'What is the 10% condition for?', a: 'It makes the SD formula accurate when sampling without replacement.' },
      ],
      keyPoints: ['μ_p̂ = p, σ_p̂ = √(p(1 − p)/n).', 'Large Counts → normal shape.', 'Bigger n, less variability.'],
    },
  },
  'st5-2': {
    bigIdea: [
      r`Averages are steadier than single values. One battery might last 30 hours or 70, but the average of 36 batteries will be close to 50 almost every time. That is why $\sigma_{\bar{x}} = \sigma/\sqrt{n}$ is smaller than σ.`,
      r`The central limit theorem says something surprising: even when individual values are skewed, the averages of large samples pile up in a bell shape. That lets us use normal calculations for $\bar{x}$ in many real situations.`,
      r`When you compare two groups, the difference of their averages varies even more than either one, because the uncertainties combine: the variances add.`,
    ],
    picture: { title: 'Averaging out', t: r`One person's guess of the number of jelly beans in a jar can be wildly off. The average of 50 guesses is usually much closer, because the high and low guesses cancel each other out.` },
    words: [
      { term: 'Sampling distribution of x̄', means: 'The distribution of sample means over all samples of size n.' },
      { term: 'Central limit theorem', means: 'For large n, x̄ is approximately normal, whatever the population shape.' },
      { term: 'Standard error', means: 'The standard deviation of a statistic (estimated from data).' },
    ],
    tools: [
      { name: 'Square roots', refresher: '√36 = 6 and √144 = 12.', lesson: 'c0-5' },
      { name: 'Combining random variables', refresher: 'For independent variables, variances add.', lesson: 'st4-2' },
    ],
    why: [
      [r`The formulas give the center and spread.`, r`n = 36 is large enough for the CLT, so the shape is approximately normal.`],
      [r`Standardize 53 with the SD of x̄ (2), not of individual batteries (12).`, r`The area above z = 1.5 is the answer.`],
    ],
    walk: {
      'st5-2-1': [r`σ_x̄ = σ ÷ √n.`, r`√36 = 6.`, r`12 ÷ 6 = 2.`],
      'st5-2-2': [r`z = (53 − 50) ÷ 2 = 1.5.`, r`The area to the left of 1.5 is about 0.933.`, r`Area to the right: 1 − 0.933 ≈ 0.067.`],
      'st5-2-3': [r`We need 12 ÷ √n = 1.`, r`So √n = 12.`, r`n = 144.`],
      'st5-2-4': [r`x̄ is an unbiased estimator of μ.`, r`Its sampling distribution is centered at μ.`, r`Mean = 50.`],
      'st5-2-5': [r`The CLT works better as n grows.`, r`The largest sample here is 50.`, r`n = 50 (choice D).`],
      'st5-2-6': [r`Variances: 0.3² = 0.09 and 0.4² = 0.16.`, r`They add: 0.09 + 0.16 = 0.25.`, r`SD = √0.25 = 0.5.`],
    },
    teach: {
      plan: [r`Compare the spread of individual values with the spread of sample means.`, r`State the formulas for μ_x̄ and σ_x̄.`, r`State the CLT and its n ≥ 30 rule of thumb.`, r`Compute a probability about x̄.`, r`Solve for the sample size that gives a target SD.`],
      questions: [
        { q: 'Does the CLT make the data normal?', a: 'No. It makes the sampling distribution of x̄ approximately normal; the data keep their shape.' },
        { q: 'If the population is normal, how large must n be?', a: 'Any n works; x̄ is exactly normal.' },
        { q: 'Why does quadrupling n only halve the SD?', a: 'Because σ is divided by the square root of n.' },
      ],
      keyPoints: ['σ_x̄ = σ/√n.', 'CLT for large n.', 'Variances add for differences.'],
    },
  },
  'st6-1': {
    bigIdea: [
      r`A sample proportion is our best single guess, but it is almost never exactly right. A confidence interval adds a margin of error on each side to give a range of believable values for the true proportion.`,
      r`The margin of error is a critical value times the standard error. Higher confidence needs a wider net (a bigger $z^*$); more data gives a narrower one.`,
      r`"95% confident" is about the method: if we repeated the sampling many times, about 95% of the intervals would catch the true value. Any one interval either caught it or did not.`,
    ],
    picture: { title: 'Ring toss', t: r`The true proportion is a fixed peg. Each sample throws a ring (an interval) at it. With a 95% method, about 95 of every 100 rings land around the peg. Bigger rings (higher confidence) catch it more often, but tell you less precisely where it is.` },
    words: [
      { term: 'Point estimate', means: 'A single number used to estimate a parameter, like p̂.' },
      { term: 'Margin of error', means: 'How far the interval reaches on each side of the estimate.' },
      { term: 'Confidence level', means: 'The success rate of the method over many samples.' },
      { term: 'Critical value (z*)', means: 'The z that puts the middle C% of the normal curve between ±z*.' },
    ],
    tools: [
      { name: 'Sampling distribution of p̂', refresher: 'SD = √(p(1 − p)/n), approximately normal with Large Counts.', lesson: 'st5-1' },
      { name: 'Solving inequalities', refresher: 'Isolate n, then round up for sample size.', lesson: 'c0-2' },
    ],
    why: [
      [r`The standard error estimates how much p̂ varies.`, r`The margin is z* standard errors on each side of p̂.`],
      [r`p* = 0.5 gives the largest possible margin, so it is the safe choice.`, r`Round up so the margin is at most 0.03.`],
    ],
    walk: {
      'st6-1-1': [r`p̂ = successes ÷ sample size.`, r`248 ÷ 400.`, r`= 0.62.`],
      'st6-1-2': [r`p̂(1 − p̂) = 0.62 × 0.38 = 0.2356.`, r`÷ 400 = 0.000589.`, r`√0.000589 ≈ 0.024.`],
      'st6-1-3': [r`For 95%, z* = 1.96.`, r`ME = 1.96 × 0.0243.`, r`≈ 0.048.`],
      'st6-1-4': [r`Lower endpoint = p̂ − ME.`, r`0.62 − 0.048.`, r`= 0.572.`],
      'st6-1-5': [r`n ≥ (z*/ME)² × p*(1 − p*) = (1.96/0.03)² × 0.25.`, r`(65.33)² × 0.25 ≈ 1067.1.`, r`Round up: 1068.`],
      'st6-1-6': [r`The true proportion is fixed, so B is a common mistake.`, r`Confidence describes the method's long-run success rate.`, r`About 95% of such intervals capture p (choice A).`],
    },
    teach: {
      plan: [r`Explain why a point estimate needs a margin of error.`, r`Check the three conditions.`, r`Build the interval step by step.`, r`Write the interpretation of the interval and of the confidence level.`, r`Find a sample size for a target margin of error.`],
      questions: [
        { q: 'Why not always use 99% confidence?', a: 'Higher confidence makes the interval wider, so the estimate is less precise.' },
        { q: 'Does a 95% interval contain 95% of the sample data?', a: 'No. It is about the parameter, not individual data values.' },
        { q: 'Why use p* = 0.5 for sample size?', a: 'It makes p(1 − p) as large as possible, so the sample size is big enough for any true p.' },
      ],
      keyPoints: ['Estimate ± z*·SE.', 'Interpret in context; confidence is about the method.', 'Sample size: round up.'],
    },
  },
  'st6-2': {
    bigIdea: [
      r`A significance test is like a trial. The null hypothesis is "innocent": nothing special is going on. We only reject it if the evidence would be very surprising if it were true.`,
      r`The p-value measures that surprise: assuming the null is true, how likely is a result at least as extreme as ours? A small p-value (below α) means our result would be rare under the null, so we reject it.`,
      r`Tests can make mistakes. A Type I error convicts the innocent (rejecting a true null). A Type II error lets the guilty go free (missing a real effect). Power is the chance of catching a real effect, and more data gives more power.`,
    ],
    picture: { title: 'A suspicious coin', t: r`If a fair coin gives 116 heads in 200 flips, that is unusual: it happens only about 1.2% of the time by luck. So we start to doubt that the coin is fair.` },
    words: [
      { term: 'Null hypothesis (H₀)', means: 'The claim of no effect or no difference that we test against.' },
      { term: 'Alternative hypothesis (Hₐ)', means: 'What we suspect is true instead.' },
      { term: 'p-value', means: 'The probability, if H₀ is true, of a result at least as extreme as observed.' },
      { term: 'Significance level (α)', means: 'The cutoff for "small enough", often 0.05.' },
      { term: 'Power', means: 'The probability of correctly rejecting a false H₀.' },
    ],
    tools: [
      { name: 'z-scores and normal areas', refresher: 'Standardize, then find the tail area.', lesson: 'st1-3' },
      { name: 'Confidence intervals', refresher: 'A two-sided test and an interval tell a consistent story.', lesson: 'st6-1' },
    ],
    why: [
      [r`The test statistic measures how many standard errors p̂ is from p₀.`, r`The p-value turns that distance into a probability, which we compare with α.`],
      [r`Type I means rejecting a true H₀.`, r`Here, H₀ says the coin is fair.`],
    ],
    walk: {
      'st6-2-1': [r`p̂ = 116 ÷ 200 = 0.58.`, r`SE under H₀: √(0.5 × 0.5 ÷ 200) ≈ 0.0354.`, r`z = (0.58 − 0.5) ÷ 0.0354 ≈ 2.26.`],
      'st6-2-2': [r`Hₐ is p > 0.5, so use the right tail.`, r`P(Z > 2.263) ≈ 0.0118.`, r`p-value ≈ 0.012.`],
      'st6-2-3': [r`Two-sided means both tails count.`, r`2 × 0.0118.`, r`≈ 0.024.`],
      'st6-2-4': [r`0.08 is bigger than α = 0.05.`, r`So the result is not surprising enough to reject H₀.`, r`Fail to reject; not convincing evidence (choice B).`],
      'st6-2-5': [r`Type I is a false alarm.`, r`It happens when H₀ is true but we reject it.`, r`Reject a true H₀ (choice A).`],
      'st6-2-6': [r`Lowering α or shrinking n makes rejecting harder, so power drops.`, r`A true value closer to p₀ is harder to detect.`, r`Increasing the sample size raises power (choice C).`],
    },
    teach: {
      plan: [r`Write hypotheses about p for a real claim.`, r`Check the conditions using p₀.`, r`Compute z and the p-value.`, r`Write a conclusion that compares p with α, in context.`, r`Describe Type I and Type II errors in context, and what increases power.`],
      questions: [
        { q: 'Why use p₀ (not p̂) in the standard error?', a: 'Because the test assumes H₀ is true, so we use its value of p.' },
        { q: 'Why not say "accept H₀"?', a: 'Not finding strong evidence against a claim does not prove it true.' },
        { q: 'How do α and Type I errors relate?', a: 'α is the probability of a Type I error when H₀ is true.' },
      ],
      keyPoints: ['Hypotheses about parameters.', 'p < α → reject; else fail to reject.', 'Type I, Type II and power.'],
    },
  },
};
