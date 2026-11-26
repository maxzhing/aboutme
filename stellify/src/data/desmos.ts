export interface Slider { name: string; min: number; max: number; value: number; step: number }
export interface GraphDemo {
  exprs: string[];
  sliders?: Slider[];
  view: [number, number, number, number];
  /** which points of interest to mark */
  show?: ('intersections' | 'roots' | 'extrema' | 'yint')[];
  table?: [number, number][];
  regression?: 'linear' | 'quadratic' | 'exponential';
  showTable?: boolean;
}
export interface DesmosLesson { id: string; title: string; goal: string; teach: string[]; steps: string[]; demo: GraphDemo; caution: string }

export const DESMOS_LESSONS: DesmosLesson[] = [
  {
    id: 'equations', title: 'Graphing an equation to solve it', goal: 'Solve any one-variable equation by graphing each side.',
    teach: ['Any equation in one variable can be solved by graphing its left side and right side as two functions. The x-coordinate of each intersection is a solution.', 'In the real Desmos calculator you can also type the whole equation and Desmos draws a vertical line at each solution.'],
    steps: ['Enter the left side as y = ...', 'Enter the right side as y = ...', 'Click the intersection point and read its x-coordinate.'],
    demo: { exprs: ['y = 3(2x - 5) + 4', 'y = 2(x + 7) - 1'], view: [-2, 12, -5, 40], show: ['intersections'] },
    caution: 'For a simple linear equation, algebra is just as fast. Graphing shines when the equation is messy.',
  },
  {
    id: 'functions', title: 'Graphing functions and reading key points', goal: 'Read zeros, the y-intercept and the vertex directly from a graph.',
    teach: ['Desmos marks points of interest with gray dots: x-intercepts (zeros), the y-intercept, maximums and minimums. Click a dot to see its coordinates.', 'For a quadratic, the vertex gives the maximum or minimum value and the x-intercepts are the solutions of f(x) = 0.'],
    steps: ['Type the function.', 'Click the gray dots: zeros, vertex, y-intercept.', 'Answer the question using the coordinate it asks for.'],
    demo: { exprs: ['y = x^2 - 4x + 3'], view: [-2, 6, -3, 9], show: ['roots', 'extrema', 'yint'], showTable: true },
    caution: 'Read the question carefully: "minimum value" is the y-coordinate of the vertex; "where it occurs" is the x-coordinate.',
  },
  {
    id: 'intersections', title: 'Finding intersections', goal: 'Solve a linear–quadratic system graphically.',
    teach: ['The solutions of a system are the points where the graphs cross. A line can meet a parabola twice, once (tangent) or not at all.'],
    steps: ['Enter both equations.', 'Click each intersection.', 'Check whether the question wants x, y, or a combination.'],
    demo: { exprs: ['y = x^2 - 4x + 3', 'y = x - 1'], view: [-2, 7, -3, 9], show: ['intersections'] },
    caution: 'If an intersection has ugly decimals, the exact answer may be a fraction or radical: confirm with algebra.',
  },
  {
    id: 'roots', title: 'Finding roots of polynomials', goal: 'Locate every real zero of a cubic in seconds.',
    teach: ['Factoring a cubic by hand can be slow. Its graph shows all real zeros at once as x-intercepts.'],
    steps: ['Type the polynomial.', 'Zoom until every x-intercept is visible.', 'Click each intercept.'],
    demo: { exprs: ['y = x^3 - 4x^2 - 9x + 36'], view: [-5, 6, -20, 50], show: ['roots'] },
    caution: 'Make sure the window is wide enough: a zero outside the view is easy to miss.',
  },
  {
    id: 'systems', title: 'Solving linear systems graphically', goal: 'Enter equations in any form and read the solution.',
    teach: ['Desmos accepts equations in standard form, so there is no need to solve for y first. The intersection is the solution (x, y).', 'Parallel lines never cross (no solution); identical lines overlap (infinitely many solutions).'],
    steps: ['Type each equation exactly as given.', 'Click the intersection.'],
    demo: { exprs: ['3x + 2y = 16', 'x - 2y = 8'], view: [-2, 10, -6, 8], show: ['intersections'] },
    caution: 'When the question asks for x + y, elimination may be faster than graphing.',
  },
  {
    id: 'quadratics', title: 'Quadratic analysis: maximum and minimum', goal: 'Find the vertex of a projectile model.',
    teach: ['Projectile questions ask for the maximum height or the time it occurs. Both are the coordinates of the vertex.', 'You must often adjust the window: heights can be far larger than the default view.'],
    steps: ['Type the function using x for time.', 'Zoom out vertically until the peak is visible.', 'Click the highest point.'],
    demo: { exprs: ['y = -16x^2 + 64x + 5'], view: [-0.5, 5, -10, 80], show: ['extrema', 'roots', 'yint'] },
    caution: 'Algebra check: x = −b/(2a) = 2, and f(2) = 69.',
  },
  {
    id: 'transformations', title: 'Function transformations with sliders', goal: 'See how a, h and k change a parabola.',
    teach: ['In y = a(x − h)² + k, h moves the graph horizontally, k moves it vertically, and a stretches or flips it.', 'Drag each slider and watch which feature of the graph responds.'],
    steps: ['Change h: the vertex slides left or right.', 'Change k: the vertex slides up or down.', 'Make a negative: the parabola opens downward.'],
    demo: { exprs: ['y = a(x - h)^2 + k'], sliders: [{ name: 'a', min: -3, max: 3, value: 1, step: 0.25 }, { name: 'h', min: -5, max: 5, value: 1, step: 0.5 }, { name: 'k', min: -5, max: 5, value: -2, step: 0.5 }], view: [-8, 8, -8, 10], show: ['extrema'] },
    caution: 'x − h moves the graph to the right when h is positive. Inside changes act opposite to their sign.',
  },
  {
    id: 'sliders', title: 'Sliders for unknown constants', goal: 'Find the parameter value that makes a line tangent to a parabola.',
    teach: ['When a question contains an unknown constant, type it as a letter. Desmos offers a slider; here it is already built.', 'Move the slider until the graph satisfies the condition in the question, such as "exactly one intersection."'],
    steps: ['Drag c until the line just touches the parabola.', 'Read the value of c.', 'Confirm with the discriminant: 64 − 4(c + 3) = 0.'],
    demo: { exprs: ['y = x^2 - 6x + c', 'y = 2x - 3'], sliders: [{ name: 'c', min: 5, max: 20, value: 9, step: 0.5 }], view: [-1, 9, -6, 20], show: ['intersections'] },
    caution: 'A slider gives an approximate value. If it lands on a clean number, verify it algebraically; if not, solve exactly.',
  },
  {
    id: 'regression', title: 'Regression: line and curve of best fit', goal: 'Fit a model to a table of data.',
    teach: ['In Desmos, enter data in a table, then type y₁ ~ mx₁ + b for a linear model or y₁ ~ a·b^x₁ for an exponential one. Desmos reports the parameters.', 'Choose the model by pattern: roughly constant differences suggest linear; roughly constant ratios suggest exponential.'],
    steps: ['Look at the plotted points.', 'Switch between model types below.', 'Use the fitted equation to predict.'],
    demo: { exprs: [], table: [[0, 5.1], [1, 14.6], [2, 46.2], [3, 133.8], [4, 410]], regression: 'exponential', view: [-1, 5, -40, 450] },
    caution: 'A model is only as good as its fit. Do not extrapolate far beyond the data.',
  },
  {
    id: 'tables', title: 'Tables of values', goal: 'Check an equation against a table quickly.',
    teach: ['A table of values lets you test whether a proposed equation matches given data, or evaluate a function at several inputs at once.'],
    steps: ['Type a candidate equation.', 'Compare its table with the table in the question.', 'Reject the candidate at the first mismatch.'],
    demo: { exprs: ['y = -3x + 7'], view: [-4, 6, -8, 16], showTable: true, table: [[-2, 13], [1, 4], [4, -5]] },
    caution: 'Checking one row is not enough; distractors are built to match one or two rows.',
  },
  {
    id: 'restrictions', title: 'Domain restrictions', goal: 'Graph only the part of a function that makes sense in context.',
    teach: ['Add a restriction in braces to limit a graph: y = 2x + 1 {0 ≤ x ≤ 5}. This helps with piecewise situations and with contexts where time or length cannot be negative.'],
    steps: ['Type the function followed by {condition}.', 'Notice the graph is drawn only where the condition holds.'],
    demo: { exprs: ['y = -16x^2 + 64x + 5 {0 <= x <= 4.08}', 'y = 2x + 1 {0 <= x <= 3}'], view: [-1, 6, -10, 80] },
    caution: 'A restricted graph can hide intersections that lie outside the allowed domain, which is exactly what you want in a context problem.',
  },
  {
    id: 'inequalities', title: 'Inequalities and regions', goal: 'See the solution set of a system of inequalities.',
    teach: ['Type an inequality and Desmos shades its solution region. For a system, the solutions are where the shadings overlap. A dashed boundary means the line itself is excluded.'],
    steps: ['Enter each inequality.', 'Find the overlap.', 'Plot an answer choice as a point to see whether it lies in the overlap.'],
    demo: { exprs: ['y > 2x - 1', 'y <= -x + 8'], view: [-4, 10, -4, 12], show: ['intersections'] },
    caution: 'Points exactly on a dashed (strict) boundary are not solutions.',
  },
  {
    id: 'advanced', title: 'Advanced: circles and tangent lines', goal: 'Combine implicit equations and sliders.',
    teach: ['Desmos graphs implicit equations such as x² + y² = 25 directly. With a slider on the line y = x + k you can find where the line becomes tangent to the circle.'],
    steps: ['Drag k upward until the line touches the circle at a single point.', 'Compare with the exact value k = 5√2 ≈ 7.07.'],
    demo: { exprs: ['x^2 + y^2 = 25', 'y = x + k'], sliders: [{ name: 'k', min: -10, max: 10, value: 3, step: 0.01 }], view: [-9, 9, -9, 9], show: ['intersections'] },
    caution: 'The slider suggests k ≈ 7.07, but the answer choices will be exact. Use the discriminant to get 5√2.',
  },
];

export interface DecideItem { id: string; prompt: string; best: 'algebra' | 'desmos' | 'both'; why: string }

/** "Which tool?" drills: efficient calculator use without blind dependence. */
export const DECIDE: DecideItem[] = [
  { id: 'd1', prompt: 'Solve 3(2x − 5) + 4 = 2(x + 7) − 1.', best: 'algebra', why: 'Four quick algebra steps. Typing and reading a graph takes at least as long, and the algebra is easy to check by substitution.' },
  { id: 'd2', prompt: 'How many distinct real solutions does |x² − 5| = 4 have?', best: 'desmos', why: 'Graph y = |x² − 5| and y = 4 and count four intersections. Algebra works too, but the graph makes it hard to miss a case.' },
  { id: 'd3', prompt: 'What is the sum of the solutions to 3x² − 12x + 7 = 0?', best: 'algebra', why: 'Use −b/a = 4 in five seconds. The roots are irrational, so reading them from a graph and adding decimals is slower and less exact.' },
  { id: 'd4', prompt: 'For what value of c do y = x² − 6x + c and y = 2x − 3 intersect at exactly one point?', best: 'both', why: 'A slider shows the tangency near c = 13; the discriminant confirms it exactly. Using both gives speed and certainty.' },
  { id: 'd5', prompt: 'The equation (ax + 3)(2x − b) = 10x² + cx − 12 is true for all x. What is c?', best: 'algebra', why: 'This is coefficient matching. A graph cannot show unknown coefficients directly.' },
  { id: 'd6', prompt: 'What is the greatest zero of f(x) = x³ − 4x² − 9x + 36?', best: 'desmos', why: 'The graph shows all three zeros immediately. Factoring by grouping also works, but only if you spot it.' },
  { id: 'd7', prompt: 'After how many whole years is 24,000(0.85)^t first below 12,000?', best: 'desmos', why: 'Graph both sides and read the intersection (about 4.27), or use a table. Solving exactly would need logarithms, which the SAT does not require.' },
  { id: 'd8', prompt: 'Which point satisfies y > 2x − 1 and y ≤ −x + 8: (3, 5), (4, 3), (2, 6), or (−1, 10)?', best: 'both', why: 'Plugging in is quick, but boundary cases are easy to misjudge. Graphing the region and plotting the points settles them visually.' },
  { id: 'd9', prompt: 'If sin(x°) = cos((3x − 10)°) for acute angles, what is x?', best: 'algebra', why: 'The cofunction identity turns it into x + 3x − 10 = 90. A graph in degree mode works but is slower and needs the right mode.' },
  { id: 'd10', prompt: 'A line of best fit is ŷ = 2.4x + 51. Predict ŷ when x = 15.', best: 'algebra', why: 'One multiplication and one addition. Reaching for the grapher here costs time.' },
  { id: 'd11', prompt: 'What is the radius of the circle x² + y² − 8x + 6y − 11 = 0?', best: 'both', why: 'Typing the equation shows a circle of radius 6 at a glance; completing the square confirms it and is needed if choices are exact radicals.' },
  { id: 'd12', prompt: 'Which expression is equivalent to (x² − 9)/(x² − x − 6) ÷ (x + 3)/(x² − 4)?', best: 'both', why: 'Factor and cancel, or graph the original and each choice to see which graph coincides. The graph check is a strong safeguard against sign errors.' },
];
