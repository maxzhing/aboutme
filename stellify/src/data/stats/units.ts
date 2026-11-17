import type { CalcUnit } from '../calc/types';

/** AP Statistics, in the nine units of the College Board course, with approximate exam weights. */
export const STATS_UNITS: CalcUnit[] = [
  { n: 1, title: 'Exploring One-Variable Data', weeks: 3, examWeight: '15–23%', summary: 'Describing data in context: graphs, shape, center and spread, outliers, comparing groups, and the normal distribution.',
    topics: ['Variables and their distributions', 'Representing categorical and quantitative data', 'Describing a distribution', 'Summary statistics', 'Boxplots and outliers', 'Comparing distributions', 'The normal distribution'] },
  { n: 2, title: 'Exploring Two-Variable Data', weeks: 2, examWeight: '5–7%', summary: 'Two-way tables, scatterplots, correlation, least-squares regression lines, residuals and r².',
    topics: ['Two categorical variables', 'Statistics for two categorical variables', 'Representing two quantitative variables', 'Correlation', 'Linear regression models', 'Residuals', 'Least-squares regression'] },
  { n: 3, title: 'Collecting Data', weeks: 2, examWeight: '12–15%', summary: 'How data are produced: sampling methods, sources of bias, and the principles of experimental design.',
    topics: ['Planning a study', 'Random sampling and data collection', 'Potential problems with sampling', 'Introduction to experimental design', 'Selecting an experimental design', 'Inference and experiments'] },
  { n: 4, title: 'Probability, Random Variables, and Probability Distributions', weeks: 4, examWeight: '10–20%', summary: 'Probability rules, conditional probability and independence, random variables, and the binomial and geometric distributions.',
    topics: ['Estimating probabilities using simulation', 'Probability rules', 'Conditional probability', 'Independence', 'Discrete random variables', 'Combining random variables', 'Binomial distributions', 'Geometric distributions'] },
  { n: 5, title: 'Sampling Distributions', weeks: 2, examWeight: '7–12%', summary: 'How statistics vary from sample to sample: sampling distributions of proportions and means, and the central limit theorem.',
    topics: ['Variation in statistics', 'The central limit theorem', 'Biased and unbiased point estimates', 'Sampling distributions for sample proportions', 'Sampling distributions for sample means', 'Differences of proportions and means'] },
  { n: 6, title: 'Inference for Categorical Data: Proportions', weeks: 3, examWeight: '12–15%', summary: 'Confidence intervals and significance tests for a population proportion (and the difference of two), with errors and power.',
    topics: ['Constructing a confidence interval for a proportion', 'Justifying a claim with a confidence interval', 'Setting up a test for a proportion', 'p-values and conclusions', 'Type I and Type II errors', 'Two-proportion inference'] },
  { n: 7, title: 'Inference for Quantitative Data: Means', weeks: 3, examWeight: '10–18%', summary: 'Confidence intervals and t tests for a population mean, paired data, and the difference of two means.',
    topics: ['The t distribution', 'Confidence intervals for a mean', 'Significance tests for a mean', 'Paired data', 'Two-sample t intervals and tests'] },
  { n: 8, title: 'Inference for Categorical Data: Chi-Square', weeks: 1, examWeight: '2–5%', summary: 'Chi-square tests for goodness of fit, homogeneity and independence.',
    topics: ['Expected counts', 'The chi-square statistic', 'Goodness-of-fit tests', 'Tests for homogeneity and independence'] },
  { n: 9, title: 'Inference for Quantitative Data: Slopes', weeks: 1, examWeight: '2–5%', summary: 'Confidence intervals and t tests for the slope of a population regression line, including reading computer output.',
    topics: ['Variation in slopes', 'Conditions for slope inference', 'Confidence intervals for a slope', 'Significance tests for a slope'] },
];
