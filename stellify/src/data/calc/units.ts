import type { CalcUnit } from './types';

/**
 * The ten units of AP Calculus BC, in the College Board's order, with approximate exam weights and
 * a self-study pace that fits a school year. Topic lists are written in plain words for students.
 */
export const CALC_UNITS: CalcUnit[] = [
  { n: 1, title: 'Limits and Continuity', weeks: 3, examWeight: '4–7%', summary: 'What it means for a function to approach a value, how to compute limits, and what makes a function continuous.',
    topics: ['What a limit is: graphs, tables and notation', 'One-sided limits and limits that do not exist', 'Limit laws and direct substitution', 'Algebra for 0/0: factoring, conjugates, fractions', 'Squeeze theorem and special trig limits', 'Infinite limits and vertical asymptotes', 'Limits at infinity and horizontal asymptotes', 'Continuity and types of discontinuity', 'Intermediate Value Theorem'] },
  { n: 2, title: 'Differentiation: Definition and Fundamental Properties', weeks: 2, examWeight: '4–7%', summary: 'The derivative as a limit and a rate of change, and the basic rules for computing it.',
    topics: ['Average vs instantaneous rate of change', 'The derivative as a limit', 'Estimating derivatives from tables and graphs; differentiability vs continuity', 'Power, constant multiple and sum rules', 'Derivatives of sin x, cos x, eˣ and ln x', 'Product and quotient rules', 'Derivatives of tan x, cot x, sec x and csc x'] },
  { n: 3, title: 'Differentiation: Composite, Implicit, and Inverse Functions', weeks: 2, examWeight: '4–7%', summary: 'Chain rule, implicit differentiation, inverse functions and higher derivatives.',
    topics: ['The chain rule', 'Implicit differentiation', 'Derivatives of inverse functions', 'Derivatives of inverse trig functions', 'Choosing the right differentiation method', 'Second and higher derivatives'] },
  { n: 4, title: 'Contextual Applications of Differentiation', weeks: 2, examWeight: '6–9%', summary: 'Derivatives as rates in motion and real situations, related rates, linearization and L’Hôpital’s rule.',
    topics: ['Interpreting the derivative in context', 'Straight-line motion: position, velocity, acceleration', 'Rates of change in applied settings', 'Related rates', 'Local linearity and linear approximation', 'L’Hôpital’s rule for 0/0 and ∞/∞'] },
  { n: 5, title: 'Analytical Applications of Differentiation', weeks: 3, examWeight: '8–11%', summary: 'Mean Value Theorem, extrema, increasing/decreasing, concavity, curve sketching and optimization.',
    topics: ['Mean Value Theorem', 'Extreme Value Theorem and critical points', 'Increasing/decreasing and the first derivative test', 'Absolute extrema on closed intervals (candidates test)', 'Concavity and the second derivative test', 'Connecting graphs of f, f′ and f″', 'Optimization', 'Behavior of implicit relations'] },
  { n: 6, title: 'Integration and Accumulation of Change', weeks: 4, examWeight: '17–20%', summary: 'Accumulation, Riemann sums, the Fundamental Theorem, and every integration technique on the BC exam.',
    topics: ['Accumulation and area under a rate curve', 'Riemann sums and the trapezoidal rule', 'Definite integral as a limit; properties', 'Fundamental Theorem of Calculus (both parts)', 'Antiderivatives and indefinite integrals', 'u-substitution', 'Long division and completing the square', 'Integration by parts (BC)', 'Partial fractions with linear factors (BC)', 'Improper integrals (BC)'] },
  { n: 7, title: 'Differential Equations', weeks: 2, examWeight: '6–9%', summary: 'Writing, verifying and solving differential equations, slope fields, Euler’s method and logistic growth.',
    topics: ['Modeling with differential equations', 'Verifying solutions', 'Slope fields', 'Euler’s method (BC)', 'Separation of variables and particular solutions', 'Exponential growth and decay', 'Logistic models (BC)'] },
  { n: 8, title: 'Applications of Integration', weeks: 3, examWeight: '6–9%', summary: 'Average value, motion with integrals, area between curves, volumes, and arc length.',
    topics: ['Average value of a function', 'Position, velocity and total distance with integrals', 'Accumulation in applied contexts', 'Area between curves (in x and in y)', 'Volumes with cross sections', 'Volumes of revolution: disc and washer', 'Arc length of a smooth curve (BC)'] },
  { n: 9, title: 'Parametric Equations, Polar Coordinates, and Vector-Valued Functions', weeks: 2, examWeight: '11–12%', summary: 'Calculus for curves given by parameters, vectors and polar equations (BC only).',
    topics: ['Derivatives of parametric equations', 'Second derivatives of parametric equations', 'Arc length of parametric curves', 'Vector-valued functions: velocity, acceleration, speed', 'Integrating vector-valued functions and motion', 'Polar curves: derivatives and slopes', 'Area of a polar region and between polar curves'] },
  { n: 10, title: 'Infinite Sequences and Series', weeks: 4, examWeight: '17–18%', summary: 'Convergence tests, error bounds, and Taylor and Maclaurin series (BC only).',
    topics: ['Sequences and convergence of series', 'Geometric series', 'nth term test for divergence', 'Integral test and p-series', 'Comparison and limit comparison tests', 'Alternating series test and error bound', 'Ratio test', 'Absolute vs conditional convergence', 'Taylor polynomials and Lagrange error bound', 'Radius and interval of convergence', 'Taylor and Maclaurin series of common functions', 'Building new series by substitution, differentiation, integration'] },
];
