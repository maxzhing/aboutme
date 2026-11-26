import type { Question, SkillId } from './types';
import { correctAnswerLabel, LETTERS } from './answers';

/**
 * "In simple words": a short, plain-language version of an official College Board explanation.
 *
 * Reading & Writing explanations are rewritten from the College Board's own text with fixed,
 * meaning-preserving rules: the formal opening is dropped, formal words become everyday ones,
 * grammar terms get a plain definition, and long notes are cut to their key sentences. Anything
 * in quotation marks or italics (the answer choices and words from the passage) is never changed.
 *
 * Math explanations are not rewritten: their text loses exponents and fractions when it is taken
 * out of the PDF (x² = 900 comes out as "x = 900"), so a rewrite could be wrong. Math questions get
 * the answer, a plain method for that kind of question, and the College Board's exact worked
 * solution as printed.
 */

/** How to do each kind of question, in plain words (written for Stellify). */
export const METHOD: Record<SkillId, string[]> = {
  wic: ['Cover the choices. Read the sentence around the blank and say, in your own words, what the missing word has to mean.', 'Then pick the choice that means exactly that. A word can sound smart and still mean the wrong thing.'],
  tsp: ['Ask: what is the writer doing here (explaining, arguing, describing, comparing)?', 'Pick the choice that describes every part of the text, not just one sentence.'],
  ctc: ['Find the main point of each text in one short sentence.', 'Then ask how the second author would react to the first one: agree, disagree, or add a "yes, but"?'],
  cid: ['Say the main point of the text in one short sentence before looking at the choices.', 'Pick the choice that matches it. Wrong choices are often true details that are too small, or ideas the text never says.'],
  coet: ['Find the exact claim the question asks about.', 'Pick the choice that would prove (or weaken) that exact claim, not just a choice on the same topic.'],
  coeq: ['Read the claim in the text first, then look at the table or graph.', 'Pick the choice whose numbers are really in the data and actually back up that claim.'],
  inf: ['Read the text as a chain of ideas and ask what must come next.', 'Pick the choice that follows from what the text says, without adding anything new.'],
  bnd: ['Find the two parts on each side of the blank. Can each part stand alone as a full sentence?', 'Two full sentences need a period, a semicolon, or a comma plus "and/but/so". Extra information is set off by a matching pair of commas, dashes or parentheses.'],
  fss: ['Find the word the blank has to match (its subject, the noun it stands for, or the time of the sentence).', 'Pick the form that matches it: one or more than one, past or present, and so on.'],
  tra: ['Read the sentence before the blank and the sentence after it.', 'Decide how they connect (adding, contrasting, giving a result, giving an example), then pick the word that shows that link.'],
  syn: ['Read the goal in the question first: that is all that matters.', 'Pick the choice that does exactly that goal, using facts from the notes. Ignore choices that are true but do something else.'],
  lin1: ['Get the variable by itself: do the same thing to both sides of the equation, one step at a time.', 'Check by putting your answer back into the original equation.'],
  linf: ['A linear function goes up or down by the same amount each step. That amount is the slope; the starting value (when x = 0) is the y-intercept.', 'Use two points or the equation to find what the question asks for.'],
  lin2: ['Turn the words into an equation with two variables, or rewrite the line as y = mx + b.', 'The slope (m) tells how steep the line is; b tells where it crosses the y-axis.'],
  sys: ['A solution is a point that works in both equations at once.', 'Add or subtract the equations to remove one variable, or substitute one into the other. A graphing tool can also show where the lines cross.'],
  ineq: ['Solve it like an equation, but flip the sign if you multiply or divide by a negative number.', 'Test one value in the original inequality to check your answer.'],
  equiv: ['Equivalent expressions are equal for every value of the variable.', 'Expand or factor step by step, or test a simple number like x = 2 in both expressions.'],
  nleq: ['Move everything to one side, then factor, use the quadratic formula, or graph it.', 'Check each answer in the original equation, because some steps can create extra solutions.'],
  nlf: ['Look at the form: a parabola (x²) has a vertex and can open up or down; an exponential grows or shrinks by the same factor each step.', 'Plug in values or use a graph to read what the question asks.'],
  ratio: ['Write the rate or ratio with its units (like miles per hour).', 'Set up a proportion or multiply by the rate, and check that the units cancel to what you need.'],
  pct: ['Percent means "out of 100". To find p% of a number, multiply by p ÷ 100.', 'For an increase of p%, multiply by (1 + p ÷ 100); for a decrease, by (1 − p ÷ 100).'],
  data1: ['Mean: add the values and divide by how many there are. Median: the middle value in order. Range: biggest minus smallest.', 'Read the graph or table carefully, then do the one calculation the question asks for.'],
  data2: ['A line or curve of best fit shows the trend in the data.', 'Use it to predict values, and read the slope as "how much y changes when x goes up by 1".'],
  prob: ['Probability = number of ways you want ÷ total number of possible ways.', 'In a table, find the right row or column for the "out of" group first.'],
  infer: ['A random sample can be used to estimate the whole group it was taken from.', 'The margin of error gives a range: estimate minus the margin to estimate plus the margin.'],
  claims: ['Only random assignment to groups can show cause and effect.', 'Results only apply to the kind of group the sample was randomly chosen from.'],
  area: ['Find the right formula on the reference sheet (area, volume, perimeter).', 'Put in the numbers carefully and keep track of the units.'],
  lines: ['Angles on a straight line add to 180°, and the angles in a triangle add to 180°.', 'Similar triangles have the same shape, so their matching sides are in the same ratio.'],
  trig: ['In a right triangle, the longest side (across from the square corner) is the hypotenuse.', 'Sine = side across from the angle ÷ longest side. Cosine = side next to the angle ÷ longest side. Tangent = side across ÷ side next to it.', 'For the sides themselves, use a² + b² = c², where c is the longest side.'],
  circ: ['A circle\'s equation (x − h)² + (y − k)² = r² gives its center (h, k) and radius r.', 'A full circle is 360° (or 2π radians); an arc or sector is that same fraction of the whole circle.'],
};

/** Grammar ideas the College Board names, each with a plain definition. */
const CONVENTIONS: [RegExp, string][] = [
  [/subject.{0,3}verb agreement/i, 'subject–verb agreement: the verb must match its subject (one thing: "is", "has"; more than one: "are", "have")'],
  [/pronoun.{0,3}antecedent agreement/i, 'pronoun agreement: a word like "it" or "they" must match the noun it stands for'],
  [/possessive determiners|determiners/i, 'words like "its", "their" and "this" that point to a noun'],
  [/plural and possessive nouns|possessive nouns|plural nouns/i, 'plural and possessive nouns ("dogs" means more than one dog; "dog\'s" means belonging to one dog; "dogs\'" means belonging to several)'],
  [/coordination of (main|independent) clauses|between two main clauses|between main clauses|between sentences/i, 'how to join or separate two complete sentences (use a period, a semicolon, or a comma plus "and", "but" or "so")'],
  [/complex series/i, 'a list whose items already have commas inside them (use semicolons between the items)'],
  [/supplement/i, 'extra information added to a sentence (it is set off by a matching pair of commas, dashes or parentheses)'],
  [/subject.modifier placement/i, 'describing phrases: a phrase at the start of a sentence must describe the noun that comes right after it'],
  [/finite|non-?finite|untensed/i, 'verb forms: a sentence needs a main verb that shows time (like "studied"); forms like "studying" or "to study" cannot be the main verb'],
  [/tense/i, 'verb tense: the verb must fit the time the sentence is talking about (past, present or future)'],
  [/verb forms/i, 'verb forms: the verb must have the right form for its sentence (matching its subject and the time described)'],
  [/colon/i, 'colons: a colon comes after a complete sentence and introduces a list, an example or an explanation'],
  [/between a subject and a verb|between a verb and an object|preposition and its complement|between a modifier and a noun/i, 'no punctuation between words that belong together, such as a subject and its verb'],
  [/end-of-sentence/i, 'ending a sentence with the right mark (a period for a statement, a question mark for a question)'],
  [/titles and proper nouns|noun phrases|integrated relative clause/i, 'no commas around a name or description that is needed to say which thing is meant'],
  [/subordinate clause/i, 'joining a "because/although/when" part to a main sentence'],
  [/punctuation/i, 'punctuation: where commas, semicolons, colons and periods go'],
];

/** Formal phrases and their everyday equivalents (applied outside quotation marks only). */
const WORDS: [RegExp, string][] = [
  // "is thus/therefore X" → "is X" (before the general "thus" → "so" swap)
  [/\b(is|are|was|were|can|could|would|must|may) (?:thus|therefore)\b/g, '$1'], [/, (?:thus|therefore),/g, ','],
  [/\bThere’s no suggestion that\b/g, 'The text never says that'], [/\bthere’s no suggestion that\b/g, 'the text never says that'],
  [/\bit can’t be concluded that\b/g, 'we can’t say that'], [/\bgives no indication of\b/g, 'never tells us'], [/\bdoesn’t address\b/g, 'doesn’t talk about'],
  [/\bmost accurately\b/g, 'best'], [/\bmost effectively\b/g, 'best'], [/\bthe text as a whole\b/g, 'the whole text'],
  [/\bis inconsistent with\b/g, 'doesn’t fit'], [/\bis consistent with\b/g, 'fits'], [/\bcriteria\b/g, 'conditions'],
  [/\bregarding\b/g, 'about'], [/\bwith respect to\b/g, 'about'], [/\brhetorically unacceptable\b/g, 'incomplete'],
  [/\bIt results in\b/g, 'It makes'], [/\bit’s conventional to\b/g, 'the rule is to'], [/\bcoordinating (?!conjunction)/g, 'joining '], [/\bresults in\b/g, 'makes'], [/\bthe implications of\b/g, 'what follows from'],
  [/\bprovides additional information about\b/g, 'adds information about'], [/\badditional\b/g, 'more'],
  [/\bmark the boundary between\b/g, 'separate'], [/\bfused without punctuation and\/or a conjunction\b/g, 'run together with no punctuation or joining word'],
  [/\bcoordinating conjunction\b/g, 'joining word (like "and" or "but")'], [/\bconjunction\b/g, 'joining word'],
  [/\bThis context (?:shows|supports|conveys|suggests|indicates) the idea that\b/g, 'So'], [/\bThis context (?:shows|supports|conveys|suggests|indicates) that\b/g, 'So'],
  [/\bindependent clauses\b/g, 'complete sentences'],
  [/\bThe text indicates that\b/g, 'The text says that'], [/\bthe text indicates that\b/g, 'the text says that'],
  [/\bindicates\b/g, 'shows'], [/\bindicate\b/g, 'show'], [/\bindicated\b/g, 'shown'],
  [/\bsuggests that\b/g, 'hints that'], [/\bconveys\b/g, 'shows'], [/\bconvey\b/g, 'show'],
  [/\billustrates\b/g, 'shows'], [/\billustrate\b/g, 'show'], [/\bdemonstrates\b/g, 'shows'], [/\bdemonstrate\b/g, 'show'],
  [/\bestablishes\b/g, 'sets up'], [/\bemphasizes\b/g, 'stresses'], [/\bemphasize\b/g, 'stress'],
  [/\bTherefore,\s*/g, 'So, '], [/\btherefore,?\s*/g, 'so '], [/\bThus,\s*/g, 'So, '], [/\bthus,?\s*/g, 'so '], [/\bHence,?\s*/g, 'So, '],
  [/\bIn other words,\s*/g, 'That is, '], [/\bIt follows that\b/g, 'So'], [/\bit follows that\b/g, 'so'],
  [/\bmost nearly means\b/g, 'means'], [/\bAs used in the text,\s*/g, 'Here, '], [/\bas used in the text,\s*/g, 'here, '],
  [/\bIn this context,\s*/g, 'Here, '], [/\bin this context\b/g, 'here'],
  [/\billogically\b/g, 'wrongly'], [/\blogically signals\b/g, 'signals'], [/\bmost logical\b/g, 'best'], [/\bmost logically\b/g, 'best'],
  [/\bdoesn’t agree in number with\b/g, 'doesn’t match'], [/\bdoesn't agree in number with\b/g, "doesn't match"], [/\bagrees in number with\b/g, 'matches'], [/\bagree in number with\b/g, 'match'],
  [/\bantecedent\b/g, 'noun it stands for'], [/\bIt’s conventional to\b/g, 'The rule is to'], [/\bconventionally\b/g, 'correctly'],
  [/\bsupplementary\b/g, 'extra'], [/\bsubsequently\b/g, 'later'], [/\bconsequently\b/g, 'so'], [/\bConsequently,\s*/g, 'So, '],
  [/\badditionally\b/g, 'also'], [/\bAdditionally,\s*/g, 'Also, '], [/\bfurthermore\b/g, 'also'], [/\bFurthermore,\s*/g, 'Also, '], [/\bMoreover,\s*/g, 'Also, '],
  [/\bapproximately\b/g, 'about'], [/\bsubstantially\b/g, 'a lot'], [/\bnevertheless\b/g, 'still'], [/\bnonetheless\b/g, 'still'], [/\bNevertheless,\s*/g, 'Still, '],
  [/\butilize\b/g, 'use'], [/\butilizes\b/g, 'uses'], [/\bwhereas\b/g, 'while'], [/\bassertion\b/g, 'claim'], [/\bdepicts\b/g, 'shows'], [/\bportrays\b/g, 'shows'],
  [/\bcharacterizes\b/g, 'describes'], [/\bundermines\b/g, 'weakens'], [/\bundermine\b/g, 'weaken'], [/\bsubstantiates?\b/g, 'backs up'],
  [/\bprior to\b/g, 'before'], [/\bin order to\b/g, 'to'], [/\bnumerous\b/g, 'many'], [/\bobtain\b/g, 'get'], [/\bpertaining to\b/g, 'about'],
  [/\bfacilitate\b/g, 'help'], [/\bmain clause\b/g, 'complete sentence'], [/\bmain clauses\b/g, 'complete sentences'], [/\bindependent clause\b/g, 'complete sentence'],
];

/** Pieces of text that must never change: quotations, italic titles and quoted choices. */
const PROTECT = /(“[^”]*”|"[^"\n]*"|\*[^*\n]+\*|‘[^’]*’)/;
export function plainWords(text: string): string {
  return text.split(PROTECT).map((part, i) => (i % 2 ? part : WORDS.reduce((t, [re, to]) => t.replace(re, to), part))).join('')
    .replace(/\s{2,}/g, ' ').replace(/ ([,.;:])/g, '$1').trim();
}
const cap = (s: string) => s.replace(/^\s*([a-z])/, (m) => m.toUpperCase());

/** Sentences, never splitting inside a quotation or after an abbreviation like "A. thaliana" or "U.S.". */
export function sentences(text: string): string[] {
  const out: string[] = [];
  let cur = '', depth = 0;
  const toks = text.split(/(\s+)/);
  for (let i = 0; i < toks.length; i++) {
    const t = toks[i];
    cur += t;
    if (/^\s+$/.test(t)) continue;
    depth += (t.match(/“/g)?.length ?? 0) - (t.match(/”/g)?.length ?? 0);
    if (depth < 0) depth = 0;
    const next = toks[i + 2] ?? '';
    const ends = /[.!?][”"’)]*$/.test(t) && !/\.\.\.$|…$/.test(t) && depth === 0;
    const abbrev = /^(?:[A-Z]|e\.g|i\.e|U\.S|vs|Dr|Mr|Ms|St|ca|al)\.$/.test(t.replace(/^[(“"]/, ''));
    if (ends && !abbrev && (!next || /^[A-Z“"(*]/.test(next))) { out.push(cur.trim()); cur = ''; }
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}
const words = (s: string) => (s.match(/[A-Za-z’'-]+/g) ?? []).length;

/** Breaks long sentences at safe points: semicolons and ", but" (outside quotations). */
export function splitLong(text: string): string {
  return text.split(PROTECT).map((part, i) => (i % 2 ? part : part
    .replace(/;\s+([a-z])/g, (_m, c: string) => `. ${c.toUpperCase()}`)
    .replace(/,\s+but\s+([a-z])/g, (_m, c: string) => `. But ${c}`))).join('');
}

/** The College Board's formal first sentence for each question type, which repeats the question. */
const BOILERPLATE = /^because it (?:most logically|logically|most accurately|best|most effectively|effectively|accurately|most directly)?\s*(?:completes|states|describes|presents|uses|illustrates|supports|weakens|identifies|explains)[^.]*\.\s*/i;

/** A quotation without the sentence's own period tucked inside it ("“the triangle.”" → "“the triangle”"). */
const unq = (q: string) => q.replace(/[.,]”$/, '”');
const WHO: Record<string, string> = { subject: 'The subject', antecedent: 'The noun it stands for,', noun: 'The noun' };

export interface SimpleExplanation { answer: string; right: string; wrong: { letter: string; text: string }[]; method: string[]; rewritten: boolean }

export function simpleExplanation(q: Question): SimpleExplanation | null {
  if (!q.official) return null;
  const answer = correctAnswerLabel(q);
  const method = METHOD[q.skill] ?? [];
  const mcq = q.type === 'mcq';
  const rightNote = mcq ? q.why[q.answer as number] ?? '' : '';
  // Math, and any explanation kept only as an image: no rewrite (see the note at the top)
  if (q.section === 'math' || !mcq || !/^Choice [A-D] is (the best answer|correct)/.test(rightNote)) {
    return { answer, right: '', wrong: [], method, rewritten: false };
  }
  let body = rightNote.replace(/^Choice [A-D] is the best answer\.?\s*/, '');
  const wic = body.match(/^because (?:as used in the text|in this context),?\s*(“[^”]+”|"[^"]+")\s*most nearly means\s*([^.]*)\./i);
  if (wic) body = `Here, ${wic[1]} means ${wic[2]}.${body.slice(wic[0].length)}`;
  else if (BOILERPLATE.test(body) && sentences(body.replace(BOILERPLATE, '')).length) body = body.replace(BOILERPLATE, '');
  else body = body.replace(/^because\s+/i, 'It is right because ');
  // grammar: name the rule in plain words
  const conv = body.match(/The convention being tested is ([^.]*)\.\s*/);
  let rule = '';
  if (conv) {
    const name = /agrees in number/.test(body) && /verb/.test(body) ? 'subject-verb agreement' : /agrees in number/.test(body) ? 'pronoun-antecedent agreement' : conv[1];
    rule = `This tests ${CONVENTIONS.find(([re]) => re.test(name))?.[1] ?? conv[1]}.`;
    body = body.replace(conv[0], '');
  }
  // the College Board usually states the point last ("The main purpose of the text is thus…"), so keep the
  // conclusion, plus the opening sentence when it sets up the evidence and the whole stays short
  const ss = sentences(body);
  // the sentence before the conclusion usually holds the key evidence, so keep the last two
  const n = ss.length;
  let keep = words(ss.join(' ')) <= 45 ? ss
    : n >= 2 && words(ss[n - 2]) + words(ss[n - 1]) <= 70 ? ss.slice(-2)
    : [ss[n - 1]];
  // a short conclusion ("Such a finding would weaken the hypothesis.") needs the sentence before it
  if (keep.length === 1 && n >= 2 && words(keep[0]) < 15) keep = ss.slice(-2);
  // vocabulary questions: the meaning of the right word always comes first
  const meaning = ss.find((x) => /(“[^”]+”|"[^"]+") (?:would )?means? /.test(x));
  if (meaning && !keep.includes(meaning)) keep = [meaning, ...keep.slice(-1)];
  // grammar notes: the rule plus the note's first sentence is enough
  if (conv && words(keep.join(' ')) > 60) keep = ss.slice(0, 1);
  // the most common grammar notes follow one sentence pattern: say them in very plain words
  const agree = body.match(/The (singular|plural) (verb|pronoun|possessive determiner) (“[^”]+”) agrees in number with the (singular|plural) (subject|antecedent|noun) (“[^”]+”)/);
  const plainAgree = agree ? `${WHO[agree[5]]} ${unq(agree[6])} is ${agree[4] === 'singular' ? 'one thing' : 'more than one thing'}, so the ${agree[2]} must be the ${agree[1] === 'singular' ? 'one-thing' : 'more-than-one'} form: ${unq(agree[3])}.` : '';
  // a contrast word at the start ("However, …", "In the second paragraph, however, …") points back to a sentence that is not shown
  const reason = cap(plainWords(keep.join(' ')).replace(/^(?:However|But),?\s+/, '').replace(/^([^,.“]{3,40}),\s*however,\s*/, '$1, '));
  const right = [rule, plainAgree || splitLong(reason)].filter(Boolean).join(' ');
  const wrong = (q.why ?? []).map((w, i) => ({ i, w })).filter(({ i }) => i !== q.answer).map(({ i, w }) => {
    const t = w.replace(/^Choice [A-D] is incorrect\.?\s*(?:because\s*)?/, '').replace(/^This choice is incorrect\.?\s*/, '');
    const first = sentences(t);
    const keepW = first.length > 1 && words(first[0]) < 8 ? `${first[0]} ${first[1]}` : first[0] ?? '';
    const wa = t.match(/^the (singular|plural) (verb|pronoun|possessive determiner) (“[^”]+”) doesn’t agree in number with the (singular|plural) (subject|antecedent|noun) (“[^”]+”)/);
    if (wa) return { letter: LETTERS[i], text: `The ${wa[2]} ${unq(wa[3])} is the ${wa[1] === 'singular' ? 'one-thing' : 'more-than-one'} form, but ${WHO[wa[5]].toLowerCase()} ${unq(wa[6])} is ${wa[4] === 'singular' ? 'one thing' : 'more than one thing'}.` };
    return { letter: LETTERS[i], text: splitLong(cap(plainWords(keepW))) };
  });
  return { answer, right, wrong, method, rewritten: true };
}

/** Flesch–Kincaid grade level: about the school year a reader needs to follow the text. */
export function gradeLevel(text: string): number {
  const ss = sentences(text.replace(/\n+/g, ' ')).filter((s) => words(s) > 0);
  const ws = text.match(/[A-Za-z]+/g) ?? [];
  if (!ss.length || !ws.length) return 0;
  const syll = (w: string) => { const s = w.toLowerCase().replace(/e$/, '').match(/[aeiouy]+/g); return Math.max(1, s ? s.length : 1); };
  const sy = ws.reduce((n, w) => n + syll(w), 0);
  return 0.39 * (ws.length / ss.length) + 11.8 * (sy / ws.length) - 15.59;
}
