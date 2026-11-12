import type { Difficulty, DomainId, Section, SkillId } from './types';

export const BRAND = {
  name: 'Stellify',
  tagline: 'Free Digital SAT prep that actually teaches you.',
  mascot: 'Lumi',
  disclaimer:
    'Stellify is an independent, free study tool. SAT® is a trademark registered by the College Board, which is not affiliated with and does not endorse Stellify. All practice questions are original Stellify content, not official College Board questions.',
};

export const SECTION_NAME: Record<Section, string> = { math: 'Math', rw: 'Reading & Writing' };
export const DIFFICULTY_NAME: Record<Difficulty, string> = { medium: 'Medium', hard: 'Hard', 'very-hard': 'Very Hard', elite: 'Beyond SAT' };
export const DIFFICULTIES: Difficulty[] = ['medium', 'hard', 'very-hard', 'elite'];

export interface DomainInfo {
  id: DomainId;
  section: Section;
  name: string;
  /** approximate share of the section on the real test (official blueprint) */
  weight: number;
  blurb: string;
}

export const DOMAINS: DomainInfo[] = [
  { id: 'alg', section: 'math', name: 'Algebra', weight: 0.35, blurb: 'Linear equations, functions, systems and inequalities.' },
  { id: 'adv', section: 'math', name: 'Advanced Math', weight: 0.35, blurb: 'Quadratics, polynomials, exponentials, rationals, radicals and nonlinear systems.' },
  { id: 'psda', section: 'math', name: 'Problem-Solving and Data Analysis', weight: 0.15, blurb: 'Ratios, percentages, statistics, probability and study design.' },
  { id: 'geo', section: 'math', name: 'Geometry and Trigonometry', weight: 0.15, blurb: 'Area, volume, triangles, circles and right-triangle trigonometry.' },
  { id: 'ii', section: 'rw', name: 'Information and Ideas', weight: 0.26, blurb: 'Central ideas, evidence, data and inference.' },
  { id: 'cs', section: 'rw', name: 'Craft and Structure', weight: 0.28, blurb: 'Vocabulary in context, structure, purpose and paired texts.' },
  { id: 'eoi', section: 'rw', name: 'Expression of Ideas', weight: 0.2, blurb: 'Transitions and rhetorical synthesis.' },
  { id: 'sec', section: 'rw', name: 'Standard English Conventions', weight: 0.26, blurb: 'Sentence boundaries, punctuation, agreement and verb forms.' },
];

export interface SkillInfo {
  id: SkillId;
  domain: DomainId;
  section: Section;
  name: string;
  short: string;
  /** granular topics from the curriculum covered by this skill */
  topics: string[];
}

const S = (id: SkillId, domain: DomainId, name: string, short: string, topics: string[]): SkillInfo => ({
  id, domain, name, short, topics,
  section: (['alg', 'adv', 'psda', 'geo'] as DomainId[]).includes(domain) ? 'math' : 'rw',
});

export const SKILLS: SkillInfo[] = [
  // ── Math · Algebra
  S('lin1', 'alg', 'Linear equations in one variable', 'Linear equations', ['Solving linear equations', 'Equivalent equations', 'Number of solutions', 'Rearranging formulas', 'Absolute value equations', 'Word problems']),
  S('linf', 'alg', 'Linear functions', 'Linear functions', ['Slope', 'Intercepts', 'Function notation', 'Linear models', 'Interpreting slope and intercept', 'Tables and graphs']),
  S('lin2', 'alg', 'Linear equations in two variables', 'Lines in two variables', ['Standard and slope-intercept form', 'Parallel and perpendicular lines', 'Writing equations from context', 'Relationships between variables']),
  S('sys', 'alg', 'Systems of two linear equations in two variables', 'Linear systems', ['Substitution', 'Elimination', 'No solution and infinitely many solutions', 'Systems from word problems', 'Graphical solutions']),
  S('ineq', 'alg', 'Linear inequalities in one or two variables', 'Linear inequalities', ['Solving inequalities', 'Compound and absolute value inequalities', 'Systems of inequalities', 'Modeling constraints']),
  // ── Math · Advanced Math
  S('equiv', 'adv', 'Equivalent expressions', 'Equivalent expressions', ['Factoring', 'Polynomials', 'Rational expressions', 'Radical expressions and rational exponents', 'Completing the square', 'Rewriting for structure']),
  S('nleq', 'adv', 'Nonlinear equations in one variable and systems of equations in two variables', 'Nonlinear equations & systems', ['Quadratic equations', 'Discriminants', 'Sum and product of roots', 'Radical equations', 'Rational equations', 'Exponential equations', 'Nonlinear systems', 'Parameters']),
  S('nlf', 'adv', 'Nonlinear functions', 'Nonlinear functions', ['Quadratic functions and vertex form', 'Zeros and roots', 'Exponential growth and decay', 'Function transformations', 'Polynomial graphs', 'Rational functions and asymptotes', 'Function notation']),
  // ── Math · PSDA
  S('ratio', 'psda', 'Ratios, rates, proportional relationships, and units', 'Ratios, rates & units', ['Ratios', 'Rates', 'Proportions', 'Unit conversions', 'Density and derived units']),
  S('pct', 'psda', 'Percentages', 'Percentages', ['Percent of a quantity', 'Percent change', 'Successive percent changes', 'Reverse percentages']),
  S('data1', 'psda', 'One-variable data: distributions and measures of center and spread', 'One-variable data', ['Mean', 'Median', 'Range', 'Standard deviation', 'Data distributions', 'Outliers', 'Frequency tables']),
  S('data2', 'psda', 'Two-variable data: models and scatterplots', 'Two-variable data', ['Scatterplots', 'Lines of best fit', 'Correlation', 'Linear vs exponential models', 'Residuals']),
  S('prob', 'psda', 'Probability and conditional probability', 'Probability', ['Probability', 'Conditional probability', 'Two-way tables']),
  S('infer', 'psda', 'Inference from sample statistics and margin of error', 'Inference & margin of error', ['Sampling', 'Margin of error', 'Data inference', 'Confidence in estimates']),
  S('claims', 'psda', 'Evaluating statistical claims: observational studies and experiments', 'Evaluating statistical claims', ['Study design', 'Random sampling vs random assignment', 'Causation vs association', 'Generalizing results']),
  // ── Math · Geometry & Trig
  S('area', 'geo', 'Area and volume', 'Area & volume', ['Area', 'Perimeter', 'Volume', 'Surface area', 'Scale factors', 'Geometric transformations']),
  S('lines', 'geo', 'Lines, angles, and triangles', 'Lines, angles & triangles', ['Parallel lines and transversals', 'Triangle angle sum', 'Similar triangles', 'Congruent triangles', 'Coordinate geometry', 'Distance and midpoint']),
  S('trig', 'geo', 'Right triangles and trigonometry', 'Right triangles & trig', ['Pythagorean theorem', 'Special right triangles', 'Sine, cosine, tangent', 'Complementary angle identity', 'Radians', 'Right-triangle applications']),
  S('circ', 'geo', 'Circles', 'Circles', ['Circle equations', 'Arcs and sectors', 'Central and inscribed angles', 'Chords', 'Tangents', 'Radians and arc length']),
  // ── R&W · Information and Ideas
  S('cid', 'ii', 'Central Ideas and Details', 'Central ideas & details', ['Main idea', 'Supporting details', 'Summarizing', 'Identifying arguments']),
  S('coet', 'ii', 'Command of Evidence: Textual', 'Evidence: textual', ['Supporting a claim', 'Weakening a claim', 'Evaluating evidence', 'Claims and evidence', 'Illustrating a claim with a quotation']),
  S('coeq', 'ii', 'Command of Evidence: Quantitative', 'Evidence: quantitative', ['Interpreting tables', 'Interpreting graphs', 'Data that supports a claim', 'Completing a statement with data']),
  S('inf', 'ii', 'Inferences', 'Inferences', ['Logical conclusions', 'Inference vs assumption', 'Understanding assumptions', 'Completing an argument']),
  // ── R&W · Craft and Structure
  S('wic', 'cs', 'Words in Context', 'Words in context', ['Vocabulary in context', 'Precision', 'Connotation and tone', 'Figurative language', 'Secondary meanings']),
  S('tsp', 'cs', 'Text Structure and Purpose', 'Structure & purpose', ["Author's purpose", 'Function of a sentence', 'Passage organization', 'Tone and attitude', 'Rhetorical strategies', 'Argument structure']),
  S('ctc', 'cs', 'Cross-Text Connections', 'Cross-text connections', ['Relationships between passages', 'How one author would respond', 'Agreement and disagreement', 'Qualifying a claim']),
  // ── R&W · Expression of Ideas
  S('tra', 'eoi', 'Transitions', 'Transitions', ['Addition', 'Contrast', 'Cause and effect', 'Sequence', 'Example', 'Emphasis', 'Concession', 'Conclusion', 'Logical flow']),
  S('syn', 'eoi', 'Rhetorical Synthesis', 'Rhetorical synthesis', ['Combining information', 'Maintaining rhetorical purpose', 'Audience awareness', 'Emphasizing similarities or differences', 'Introductions and conclusions', 'Concision and precision']),
  // ── R&W · Standard English Conventions
  S('bnd', 'sec', 'Boundaries', 'Boundaries (punctuation)', ['Sentence boundaries', 'Commas', 'Semicolons', 'Colons', 'Dashes', 'Parentheses', 'Nonessential and essential clauses', 'Run-ons and fragments', 'Lists', 'Transition punctuation', 'Coordination and subordination']),
  S('fss', 'sec', 'Form, Structure, and Sense', 'Form, structure & sense', ['Subject-verb agreement', 'Pronoun agreement and clarity', 'Verb tense and forms', 'Modifiers', 'Parallel structure', 'Comparisons', 'Possessives and apostrophes', 'Singular and plural']),
];

export const SKILL: Record<SkillId, SkillInfo> = Object.fromEntries(SKILLS.map((s) => [s.id, s])) as Record<SkillId, SkillInfo>;
export const DOMAIN: Record<DomainId, DomainInfo> = Object.fromEntries(DOMAINS.map((d) => [d.id, d])) as Record<DomainId, DomainInfo>;

export const skillsOfDomain = (d: DomainId) => SKILLS.filter((s) => s.domain === d);
export const skillsOfSection = (s: Section) => SKILLS.filter((k) => k.section === s);
export const domainsOfSection = (s: Section) => DOMAINS.filter((d) => d.section === s);

/** Official digital SAT structure (College Board, "What's on the test"). */
export const SAT_STRUCTURE = {
  rw: { modules: 2, questionsPerModule: 27, minutesPerModule: 32 },
  math: { modules: 2, questionsPerModule: 22, minutesPerModule: 35 },
  breakMinutes: 10,
} as const;

/** Default expected solving time in seconds */
export const DEFAULT_TIME: Record<Section, Record<Difficulty, number>> = {
  rw: { medium: 60, hard: 75, 'very-hard': 90, elite: 110 },
  math: { medium: 75, hard: 100, 'very-hard': 130, elite: 170 },
};
