const r = String.raw;

export interface RefEntry { id: string; cat: string; title: string; body: string; tags?: string }

/** Searchable formula, grammar, transition and strategy reference. */
export const REFERENCE: RefEntry[] = [
  // ── Algebra
  { id: 'slope', cat: 'Algebra', title: 'Slope', body: r`$m = \dfrac{y_2 - y_1}{x_2 - x_1}$. Parallel lines: equal slopes. Perpendicular lines: slopes multiply to $-1$.` },
  { id: 'line-forms', cat: 'Algebra', title: 'Forms of a line', body: r`Slope-intercept: $y = mx + b$. Point-slope: $y - y_1 = m(x - x_1)$. Standard: $Ax + By = C$ with slope $-\frac{A}{B}$, $x$-intercept $\frac{C}{A}$, $y$-intercept $\frac{C}{B}$.` },
  { id: 'num-solutions', cat: 'Algebra', title: 'Number of solutions (linear)', body: r`After simplifying to $ax + b = cx + d$: $a \ne c$ → one solution; $a = c$, $b \ne d$ → none; $a = c$, $b = d$ → infinitely many. Systems: compare $\frac{a_1}{a_2}$, $\frac{b_1}{b_2}$, $\frac{c_1}{c_2}$.` },
  { id: 'abs', cat: 'Algebra', title: 'Absolute value', body: r`$|A| = k$ → $A = \pm k$. $|A| < k$ → $-k < A < k$. $|A| > k$ → $A < -k$ or $A > k$.` },
  { id: 'ineq-flip', cat: 'Algebra', title: 'Inequalities', body: 'Multiplying or dividing by a negative number reverses the inequality symbol. "At least" ≥, "at most" ≤.' },
  { id: 'dist-mid', cat: 'Algebra', title: 'Distance and midpoint', body: r`Distance: $\sqrt{(x_2-x_1)^2 + (y_2-y_1)^2}$. Midpoint: $\left(\frac{x_1+x_2}{2}, \frac{y_1+y_2}{2}\right)$.` },
  // ── Advanced Math
  { id: 'quad-formula', cat: 'Advanced Math', title: 'Quadratic formula and discriminant', body: r`$x = \dfrac{-b \pm \sqrt{b^2 - 4ac}}{2a}$. Discriminant $b^2 - 4ac$: positive → 2 real solutions, zero → 1, negative → none.` },
  { id: 'vieta', cat: 'Advanced Math', title: 'Sum and product of roots', body: r`For $ax^2 + bx + c = 0$: sum $= -\frac{b}{a}$, product $= \frac{c}{a}$.` },
  { id: 'vertex', cat: 'Advanced Math', title: 'Parabola forms', body: r`Standard $ax^2 + bx + c$ (vertex at $x = -\frac{b}{2a}$). Vertex $a(x-h)^2 + k$ (vertex $(h, k)$). Factored $a(x - r_1)(x - r_2)$ (zeros $r_1, r_2$; vertex midway).` },
  { id: 'special-products', cat: 'Advanced Math', title: 'Special products', body: r`$(a \pm b)^2 = a^2 \pm 2ab + b^2$. $a^2 - b^2 = (a+b)(a-b)$. $a^3 \pm b^3 = (a \pm b)(a^2 \mp ab + b^2)$.` },
  { id: 'exponents', cat: 'Advanced Math', title: 'Exponent rules', body: r`$x^a x^b = x^{a+b}$, $\frac{x^a}{x^b} = x^{a-b}$, $(x^a)^b = x^{ab}$, $x^{-a} = \frac{1}{x^a}$, $x^{a/b} = \sqrt[b]{x^a}$, $x^0 = 1$.` },
  { id: 'exp-growth', cat: 'Advanced Math', title: 'Exponential growth and decay', body: r`$f(t) = a(1 \pm r)^t$. If the factor $b$ applies every $p$ time units: $a \cdot b^{t/p}$. Doubling: $b = 2$; half-life: $b = \frac{1}{2}$.` },
  { id: 'transform', cat: 'Advanced Math', title: 'Function transformations', body: r`$f(x) + k$: up $k$. $f(x - h)$: right $h$. $-f(x)$: reflect over the $x$-axis. $f(-x)$: reflect over the $y$-axis. $c\,f(x)$: vertical stretch by $c$.` },
  { id: 'remainder', cat: 'Advanced Math', title: 'Remainder and factor theorems', body: r`Dividing $p(x)$ by $x - a$ leaves remainder $p(a)$. $(x - a)$ is a factor exactly when $p(a) = 0$.` },
  { id: 'asymptotes', cat: 'Advanced Math', title: 'Rational functions', body: r`Vertical asymptote where the denominator is 0 (and the factor does not cancel). Same degree top and bottom: horizontal asymptote at the ratio of leading coefficients.` },
  { id: 'complex', cat: 'Advanced Math', title: 'Complex numbers (enrichment)', body: r`$i^2 = -1$; $(a + bi)(a - bi) = a^2 + b^2$. Complex numbers are not listed in the current digital SAT specifications; they are included here only for completeness.` },
  // ── Data
  { id: 'percent', cat: 'Data & Statistics', title: 'Percent change and multipliers', body: r`Percent change $= \frac{\text{new} - \text{old}}{\text{old}} \times 100\%$. Increase by $p\%$: multiply by $1 + \frac{p}{100}$. Successive changes multiply.` },
  { id: 'mean', cat: 'Data & Statistics', title: 'Mean, median, range', body: r`Mean $= \frac{\text{sum}}{\text{count}}$ (so sum $=$ mean $\times$ count). Median: middle value in order. Range: max $-$ min.` },
  { id: 'sd', cat: 'Data & Statistics', title: 'Standard deviation', body: 'Measures spread around the mean. Adding a constant to every value does not change it; multiplying every value by c multiplies it by |c|.' },
  { id: 'probability', cat: 'Data & Statistics', title: 'Probability', body: r`$P = \frac{\text{favorable}}{\text{total}}$. Conditional: restrict the total to the given group. Without replacement: both counts shrink.` },
  { id: 'moe', cat: 'Data & Statistics', title: 'Margin of error', body: 'Plausible range for the population = estimate ± margin of error. Larger random samples give smaller margins.' },
  { id: 'study-design', cat: 'Data & Statistics', title: 'Study design', body: 'Random sampling → generalize to the population. Random assignment → cause and effect. Observational study → association only.' },
  { id: 'models', cat: 'Data & Statistics', title: 'Linear vs exponential', body: 'Equal differences for equal steps in x → linear. Equal ratios → exponential. Residual = actual − predicted.' },
  // ── Geometry
  { id: 'area', cat: 'Geometry', title: 'Area', body: r`Rectangle $lw$; triangle $\frac{1}{2}bh$; circle $\pi r^2$; trapezoid $\frac{1}{2}(b_1 + b_2)h$.` },
  { id: 'volume', cat: 'Geometry', title: 'Volume', body: r`Prism/cylinder: base area $\times$ height ($\pi r^2 h$). Cone/pyramid: $\frac{1}{3}$ base area $\times$ height. Sphere: $\frac{4}{3}\pi r^3$.` },
  { id: 'scale', cat: 'Geometry', title: 'Scale factors', body: r`Lengths $\times k$ → areas $\times k^2$ → volumes $\times k^3$.` },
  { id: 'angles', cat: 'Geometry', title: 'Angles and triangles', body: r`Triangle angles sum to $180^\circ$. Exterior angle = sum of the two remote interior angles. Polygon interior sum: $(n-2)180^\circ$. Parallel lines: alternate interior and corresponding angles are equal.` },
  { id: 'similar', cat: 'Geometry', title: 'Similar triangles', body: r`Corresponding sides are proportional. Altitude to the hypotenuse: $h^2 = pq$.` },
  { id: 'circle-eq', cat: 'Geometry', title: 'Circle equation', body: r`$(x - h)^2 + (y - k)^2 = r^2$: center $(h, k)$, radius $r$.` },
  { id: 'arc', cat: 'Geometry', title: 'Arcs and sectors', body: r`Arc length $= \frac{\theta}{360}\cdot 2\pi r = r\theta_{\text{rad}}$. Sector area $= \frac{\theta}{360}\cdot \pi r^2 = \frac{1}{2}r^2\theta_{\text{rad}}$. Inscribed angle $= \frac{1}{2}$ central angle.` },
  // ── Trigonometry
  { id: 'pythag', cat: 'Trigonometry', title: 'Pythagorean theorem and triples', body: r`$a^2 + b^2 = c^2$. Triples: 3-4-5, 5-12-13, 8-15-17, 7-24-25.` },
  { id: 'sohcahtoa', cat: 'Trigonometry', title: 'SOH-CAH-TOA', body: r`$\sin = \frac{\text{opp}}{\text{hyp}}$, $\cos = \frac{\text{adj}}{\text{hyp}}$, $\tan = \frac{\text{opp}}{\text{adj}}$. $\sin x^\circ = \cos(90 - x)^\circ$.` },
  { id: 'special-tri', cat: 'Trigonometry', title: 'Special right triangles', body: r`45-45-90: $x, x, x\sqrt{2}$. 30-60-90: $x, x\sqrt{3}, 2x$.` },
  { id: 'radians', cat: 'Trigonometry', title: 'Radians', body: r`$180^\circ = \pi$ radians. Degrees → radians: multiply by $\frac{\pi}{180}$.` },
  // ── Punctuation & grammar
  { id: 'p-join', cat: 'Punctuation', title: 'Joining two sentences', body: 'Period, semicolon, colon (second explains the first), or comma + FANBOYS. Never a comma alone.' },
  { id: 'p-colon', cat: 'Punctuation', title: 'Colon', body: 'Needs a complete sentence before it. Introduces a list or explanation. Never after "including" or "such as."' },
  { id: 'p-pairs', cat: 'Punctuation', title: 'Nonessential pairs', body: 'Comma … comma, dash … dash, or ( … ). The two marks must match.' },
  { id: 'p-however', cat: 'Punctuation', title: 'However / therefore', body: 'Between two sentences: "; however," — inside one clause: ", however,".' },
  { id: 'p-apostrophe', cat: 'Punctuation', title: 'Apostrophes', body: "One owner: 's. Several owners: s'. Plural only: no apostrophe. its/their/whose are possessive; it's = it is." },
  { id: 'g-sva', cat: 'Grammar', title: 'Subject–verb agreement', body: 'Ignore prepositional phrases. "Each," gerund phrases and "the number of" are singular. "As well as" does not make a subject plural.' },
  { id: 'g-tense', cat: 'Grammar', title: 'Tense signals', body: '"Since 1987" → have/has + participle. "By the time ... (past)" → had + participle. "If ... had ..., ... would have ...".' },
  { id: 'g-modifier', cat: 'Grammar', title: 'Modifiers', body: 'An opening modifier describes the noun right after the comma. A possessive ("Ishida\'s novels") is not that noun.' },
  { id: 'g-parallel', cat: 'Grammar', title: 'Parallelism and comparisons', body: 'List items share one form. Compare like with like: "that of" (singular), "those of" (plural).' },
  // ── Transitions
  { id: 't-add', cat: 'Transitions', title: 'Addition', body: 'moreover, furthermore, in addition, also — a further point in the same direction.' },
  { id: 't-contrast', cat: 'Transitions', title: 'Contrast', body: 'however, by contrast, on the other hand, conversely — the second idea opposes or differs from the first.' },
  { id: 't-concede', cat: 'Transitions', title: 'Concession', body: 'nevertheless, nonetheless, still, even so, that said, admittedly — true in spite of, or a limit on, the first point.' },
  { id: 't-cause', cat: 'Transitions', title: 'Cause and effect', body: 'therefore, thus, consequently, as a result, accordingly, in turn — the second idea results from the first.' },
  { id: 't-seq', cat: 'Transitions', title: 'Sequence', body: 'first, next, then, afterward, finally, meanwhile, today — order in time or steps in a process.' },
  { id: 't-example', cat: 'Transitions', title: 'Example and specification', body: 'for example / for instance (one case of several); specifically (the exact thing just mentioned).' },
  { id: 't-emph', cat: 'Transitions', title: 'Emphasis and restatement', body: 'in fact, indeed (confirm and go further); that is, in other words (say it again more clearly).' },
  { id: 't-replace', cat: 'Transitions', title: 'Replacement and alternative', body: 'instead, rather (after a negation or failed expectation); alternatively (a competing possibility).' },
  { id: 't-conclude', cat: 'Transitions', title: 'Conclusion and purpose', body: 'in conclusion, in short, ultimately (summing up); to that end (steps taken toward a goal).' },
  // ── Reading strategies
  { id: 's-evidence', cat: 'Reading strategies', title: 'Prove it with the text', body: 'For every reading answer, point to the words that support it. One unsupported word makes a choice wrong.' },
  { id: 's-predict', cat: 'Reading strategies', title: 'Predict before you look', body: 'Answer in your own words first, then find the matching choice. This protects you from attractive distractors.' },
  { id: 's-strength', cat: 'Reading strategies', title: 'Match the strength', body: '"Suggests" and "may" are not "proves" and "always." Extreme choices are rarely right for a single study.' },
  { id: 's-quant', cat: 'Reading strategies', title: 'Data questions', body: 'Accurate is not enough. Decide what comparison the claim needs (often a difference, not a level) before reading choices.' },
  { id: 's-goal', cat: 'Reading strategies', title: 'Synthesis: the goal is the question', body: 'Read the goal first. Every choice is true; only one does what the goal says.' },
  { id: 's-pacing', cat: 'Reading strategies', title: 'Pacing', body: 'R&W: about 71 seconds per question. Math: about 95 seconds. Flag and move on after two minutes; return with fresh eyes.' },
];
export const REF_CATS = [...new Set(REFERENCE.map((e) => e.cat))];
