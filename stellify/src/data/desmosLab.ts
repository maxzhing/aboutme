import type { GraphDemo } from './desmos';

/**
 * Desmos Lab (N7): seven SAT techniques, each with the algebra way and the Desmos way side by side, when NOT to
 * use Desmos, and an exercise checked on Stellify's built-in grapher (offline, and its state can be read).
 * Original problems; every answer is checked by tests/desmoslab.test.ts.
 */
export interface LabExercise {
  prompt: string;
  /** what the student should type to graph it (checked for equivalence, any order) */
  targets?: string[];
  demo: Omit<GraphDemo, 'exprs'>;
  ask: string;
  answer?: string[];
  choices?: string[];
  correct?: number;
}
export interface LabTechnique { id: string; title: string; algebra: string[]; desmos: string[]; notWhen: string; exercise: LabExercise }

export const LAB: LabTechnique[] = [
  { id: 'intersect', title: 'Solve equations and systems by intersection',
    algebra: ['Distribute both sides: $6x - 11 = 2x + 13$.', 'Collect: $4x = 24$.', 'Divide: $x = 6$.'],
    desmos: ['Type the left side as $y = 3(2x - 5) + 4$.', 'Type the right side as $y = 2(x + 7) - 1$.', 'Tap the intersection and read its x-coordinate.'],
    notWhen: 'A clean linear equation is usually faster by hand. Save graphing for messy, nonlinear or many-step equations.',
    exercise: { prompt: 'Solve $3(2x - 5) + 4 = 2(x + 7) - 1$ by graphing both sides.', targets: ['y = 3(2x - 5) + 4', 'y = 2(x + 7) - 1'], demo: { view: [-2, 12, -5, 40], show: ['intersections'] }, ask: 'x', answer: ['6'] } },
  { id: 'inequality', title: 'Inequalities and shading',
    algebra: ['Test the point in each inequality.', 'For $(1, 3)$: $3 > 2(1) - 1 = 1$ ✓ and $3 \\le -1 + 5 = 4$ ✓.'],
    desmos: ['Type $y > 2x - 1$ and $y \\le -x + 5$.', 'The solution is where the shadings overlap; check which point sits in it.'],
    notWhen: 'If the choices are points, plugging each one in is often faster than reading a shaded region.',
    exercise: { prompt: 'Which point is a solution of the system $y > 2x - 1$ and $y \\le -x + 5$?', targets: ['y > 2x - 1', 'y <= -x + 5'], demo: { view: [-3, 6, -3, 8] }, ask: 'the point', choices: ['(2, 4)', '(1, 3)', '(3, 1)', '(0, 6)'], correct: 1 } },
  { id: 'slider', title: 'Parameters with a slider',
    algebra: ['$y = x^2 + k$ meets $y = 4$ once when $x^2 + k = 4$ has one solution.', 'That needs $4 - k = 0$, so $k = 4$.'],
    desmos: ['Type $y = x^2 + k$ and add a slider for k.', 'Type $y = 4$.', 'Slide k until the parabola just touches the line.'],
    notWhen: 'If the question asks for k as an exact fraction or in terms of another letter, use algebra (the discriminant).',
    exercise: { prompt: 'For what value of $k$ does $y = x^2 + k$ meet the line $y = 4$ at exactly one point?', targets: ['y = x^2 + k', 'y = 4'], demo: { view: [-5, 5, -4, 10], sliders: [{ name: 'k', min: -5, max: 8, value: 0, step: 0.5 }] }, ask: 'k', answer: ['4'] } },
  { id: 'regression', title: 'Tables and regression for modeling',
    algebra: ['Estimate the slope between the first and last points: $(11 - 3) / (5 - 1) = 2$.', 'Line through $(1, 3)$: $y = 2x + 1$, so at $x = 8$, $y \\approx 17$.'],
    desmos: ['Add a table with the data.', 'Type $y_1 \\sim mx_1 + b$ to fit a line.', 'Evaluate the fitted line at $x = 8$.'],
    notWhen: 'If the question gives the model already, just substitute. Regression is for when you must build the model from data.',
    exercise: { prompt: 'The table shows (1, 3), (2, 5), (3, 7.2), (4, 8.9), (5, 11). Using a line of best fit, what is the predicted value at $x = 8$, to the nearest whole number?', demo: { view: [0, 10, 0, 20], table: [[1, 3], [2, 5], [3, 7.2], [4, 8.9], [5, 11]], regression: 'linear', showTable: true }, ask: 'the prediction', answer: ['17'] } },
  { id: 'features', title: 'Zeros, vertex and intercepts',
    algebra: ['Vertex x-coordinate: $-b / 2a = 6 / 2 = 3$.', 'Minimum value: $3^2 - 6(3) + 5 = -4$.'],
    desmos: ['Type $y = x^2 - 6x + 5$.', 'Tap the gray points: zeros, the vertex and the y-intercept.'],
    notWhen: 'If the function is already in vertex or factored form, read the answer off the equation.',
    exercise: { prompt: 'What is the minimum value of $f(x) = x^2 - 6x + 5$?', targets: ['y = x^2 - 6x + 5'], demo: { view: [-2, 8, -6, 10], show: ['roots', 'extrema', 'yint'] }, ask: 'the minimum value', answer: ['-4'] } },
  { id: 'lists', title: 'Checking choices with lists',
    algebra: ['Substitute each choice into $x^3 - 2x - 5$ and look for the value closest to 0.'],
    desmos: ['Type $f(x) = x^3 - 2x - 5$.', 'Type $f([1.5, 2.09, 2.5, 3])$ to evaluate every choice at once.'],
    notWhen: 'With two or three easy choices, mental substitution is quicker than typing.',
    exercise: { prompt: 'Which value is closest to a solution of $x^3 - 2x - 5 = 0$?', targets: ['y = x^3 - 2x - 5'], demo: { view: [-3, 4, -12, 12], show: ['roots'] }, ask: 'the value', choices: ['1.5', '2.09', '2.5', '3'], correct: 1 } },
  { id: 'window', title: 'Reading and adjusting the window',
    algebra: ['Set $0.01x^2 - 50 = 0$: $x^2 = 5000$, so $x = \\sqrt{5000} \\approx 70.7$.'],
    desmos: ['Type $y = 0.01x^2 - 50$. In the default window it looks like a flat line.', 'Zoom out until both zeros appear, then tap the positive one.'],
    notWhen: 'If a graph looks flat, empty or straight, the window is hiding it: never answer from a graph you have not zoomed to fit.',
    exercise: { prompt: 'What is the positive zero of $y = 0.01x^2 - 50$, to the nearest tenth?', targets: ['y = 0.01x^2 - 50'], demo: { view: [-10, 10, -10, 10], show: ['roots'] }, ask: 'the positive zero', answer: ['70.7'] } },
];

/** Decision guide: algebra, Desmos, or backsolve? */
export const DECIDE: { q: string; best: 'algebra' | 'desmos' | 'backsolve'; why: string }[] = [
  { q: 'Solve $5x - 7 = 3x + 9$.', best: 'algebra', why: 'Two steps by hand; typing it would take longer.' },
  { q: 'How many solutions does $x^3 - 4x = 2x^2 - 1$ have?', best: 'desmos', why: 'A cubic is hard by hand; graph both sides and count intersections.' },
  { q: 'Which of four given numbers satisfies $\\sqrt{x + 7} = x - 5$?', best: 'backsolve', why: 'Plugging in four choices also catches extraneous solutions.' },
  { q: 'Find $k$ so that $kx + 2y = 6$ and $3x + y = 4$ have no solution.', best: 'algebra', why: 'Parallel lines: equal slopes give $k = 6$ directly.' },
  { q: 'Predict a value from a scatterplot of 8 data points.', best: 'desmos', why: 'A regression is exact and quick; eyeballing a line is not.' },
  { q: 'A word problem with four answer choices for the number of tickets sold.', best: 'backsolve', why: 'Test the choices against the conditions; no equation needed.' },
];

/** Final timed drill: choose a method, then answer. */
export const DRILL: { q: string; answer: string[]; best: 'algebra' | 'desmos' | 'backsolve' }[] = [
  { q: 'Solve $4(x - 3) = 2x + 6$.', answer: ['9'], best: 'algebra' },
  { q: 'What is the positive solution of $x^2 = 3x + 10$?', answer: ['5'], best: 'desmos' },
  { q: 'What is the y-coordinate of the vertex of $y = 2x^2 - 8x + 3$?', answer: ['-5'], best: 'desmos' },
  { q: 'For which choice is $\\sqrt{2x + 1} = x - 1$ true: 0, 4, 6 or 8?', answer: ['4'], best: 'backsolve' },
  { q: 'Lines $y = 3x - 2$ and $y = -x + 10$ meet at $(a, b)$. What is $b$?', answer: ['7'], best: 'desmos' },
];
