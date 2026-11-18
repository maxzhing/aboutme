import type { Genre } from '@/data/questions/genres';
import type { Figure, SkillId } from '../types';
import { shuffle } from '../util';
import { AGREE, BOUNDARIES, DATA_CARDS, DEBATES, LEXICON, MODIFIER, NEAR, NOTE_CARDS, PAIRS, PRONOUN, STUDIES, TRANSITIONS, WIC, type BoundaryKind, type Rel, type Study } from './rwBank';
import type { Candidate, RemixLevel, RemixMode, RwSpec } from './types';

/**
 * Reading & Writing generators. Each builds a question from the original content bank (rwBank.ts) and tags
 * every choice with what it is (the supported main idea, an overgeneralization, a reversal, an unrelated
 * detail…) so the validator can confirm that exactly one choice is defensible. Grammar items derive the
 * acceptable answers from the sentence structure, not from the key.
 */
type R = () => number;
const pk = <T,>(r: R, xs: readonly T[]) => xs[Math.floor(r() * xs.length)];
const SEC_STEM = 'Which choice completes the text so that it conforms to the conventions of Standard English?';

/** What the generator knows about the question being remixed. */
export interface RwCtx { genre?: Genre; sub?: string; answerText?: string; passage?: string }

/** Modes that mean something for each skill (others are offered with an explanation instead of faked). */
export const RW_MODES: Partial<Record<SkillId, Partial<Record<RemixMode, string>>>> = {
  cid: { number: 'A new study in the same subject area.', context: 'A new study from a different subject area.', representation: 'The same skill asked as "Based on the text…" rather than "main idea".', reverse: 'The claim is removed: work backward from the evidence to the main idea.', reasoning: 'Every wrong choice is a near miss (too broad, reversed or a detail).', challenge: 'A harder passage whose wrong choices are all near misses.' },
  coet: { number: 'A new hypothesis or argument to support.', context: 'A claim from a different subject area.', reverse: 'Find the finding that would WEAKEN the claim instead of support it.', reasoning: 'Judge which finding bears on the claim rather than merely on the topic.', challenge: 'A harder claim with an argument rather than an experiment.' },
  coeq: { number: 'A new table and claim.', context: 'Data from a different subject area.', representation: 'The data shown as a bar graph instead of a table.', reverse: 'Start from the conclusion and find the data that support it.', challenge: 'A claim that needs two rows at once, with tempting half-answers.' },
  inf: { number: 'A new study to draw a conclusion from.', context: 'A conclusion in a different subject area.', reverse: 'Find the idea the results CHALLENGE instead of support.', reasoning: 'Wrong choices that go beyond the evidence or reverse it.', challenge: 'A harder passage with subtler overreach.' },
  wic: { number: 'A new sentence that needs a precise word.', context: 'A precise word in a different subject area.', representation: 'Asked as "what does the word most nearly mean?" instead of a blank.', reverse: 'A sentence whose clue points to the OPPOSITE meaning.', challenge: 'A harder word with a subtler clue.' },
  tsp: { number: 'The function of a sentence in a new passage.', context: 'A passage in a different subject area.', representation: 'Describe the overall structure instead of one sentence.', challenge: 'An argument (not an experiment), where roles are subtler.' },
  ctc: { number: 'A new pair of texts.', context: 'Paired texts from a different subject area.', representation: 'A study answering a common assumption, instead of two named views.', challenge: 'Paired texts whose wrong answers misread one text.' },
  tra: { number: 'A new pair of sentences with the same relationship.', context: 'The same relationship in a different subject area.', representation: 'A different logical relationship to recognize.', challenge: 'A relationship with closer-sounding wrong transitions.' },
  syn: { number: 'New notes and a new goal.', context: 'Notes from a different subject area.', representation: 'The same notes with a different goal.', challenge: 'A goal that needs two facts combined.' },
  bnd: { number: 'A new sentence with the same boundary.', context: 'The same boundary in a different subject area.', representation: 'A different kind of boundary (clauses, dashes, introductory clauses).', reverse: 'A spot where NO punctuation belongs (subject and verb).', challenge: 'A longer sentence where the boundary is harder to see.' },
  fss: { number: 'A new sentence testing the same form.', context: 'The same form in a different subject area.', representation: 'A different form (agreement, pronouns or modifiers).', challenge: 'A long interrupting phrase between the parts that must agree.' },
};

// ───────────────────────── helpers ─────────────────────────
const ALL_TEXT = [...STUDIES.flatMap((s) => [...s.s, s.main, s.support, s.weaken, ...s.off, s.beyond, s.reversed, s.detail])].join(' ');
/** words that are capitalized mid-sentence somewhere in the bank, so they are proper nouns */
const PROPER = new Set((ALL_TEXT.match(/(?<=[a-z,;] )[A-Z][\w'’-]*/g) ?? []).map((w) => w.replace(/['’]s$/, '')));
/** a sentence as a lowercase clause to complete "…suggest that ______" */
export function clause(s: string): string {
  const t = s.trim().replace(/[.]$/, '');
  const first = t.split(/\s/)[0].replace(/['’]s$/, '');
  return PROPER.has(first) ? t : t[0].toLowerCase() + t.slice(1);
}
const surname = (st: Study) => st.s[1].match(/([A-Z][a-zé]+) ([A-Z][a-zé]+) (hypothesized|suspected|proposed|argues|expected)/)?.[2] ?? 'the researcher';
const isTest = (st: Study) => !/argues/.test(st.s[1]);
const claimWord = (st: Study) => (isTest(st) ? 'hypothesis' : 'argument');
const levelOf = (l: RemixLevel) => Math.min(4, Math.max(2, l === 5 ? 4 : l));

/** Picks an item that fits the mode: same subject (number), a different one (context), the hardest (challenge). */
function choose<T extends { genre: Genre; lvl?: number }>(r: R, items: readonly T[], level: RemixLevel, mode: RemixMode, ctx: RwCtx, extra?: (x: T) => boolean): T | null {
  let pool = items.filter((x) => (!extra || extra(x)) && !(ctx.passage && 'id' in x && ctx.passage.includes(String((x as unknown as { s?: string[] }).s?.[1] ?? '\u0000'))));
  if (mode === 'context' && ctx.genre) pool = pool.filter((x) => x.genre !== ctx.genre);
  if (mode === 'number' && ctx.genre && pool.some((x) => x.genre === ctx.genre)) pool = pool.filter((x) => x.genre === ctx.genre);
  const want = mode === 'challenge' ? 4 : levelOf(level);
  if (pool.some((x) => x.lvl !== undefined)) {
    const best = Math.min(...pool.map((x) => Math.abs((x.lvl ?? want) - want)));
    const near = pool.filter((x) => Math.abs((x.lvl ?? want) - want) <= best + (mode === 'challenge' ? 0 : 1));
    if (near.length) pool = near;
  }
  return pool.length ? pk(r, pool) : null;
}
interface Opt { t: string; tag: string; why: string }
function mc(r: R, key: Opt, ds: Opt[]) {
  const all = shuffle([key, ...ds.slice(0, 3)], r);
  return { choices: all.map((o) => o.t), answer: all.indexOf(key), why: all.map((o) => (o === key ? `Correct. ${o.why}` : o.why)), tags: all.map((o) => o.tag) };
}
type Base = Pick<Candidate, 'skill' | 'level' | 'mode' | 'family'>;
const out = (b: Base, o: Omit<Candidate, keyof Base>): Candidate => ({ ...b, ...o });
const LETTER = (i: number) => 'ABCD'[i];

// ───────────────────────── Information and Ideas ─────────────────────────
function centralIdea(r: R, level: RemixLevel, mode: RemixMode, ctx: RwCtx): Candidate | null {
  const st = choose(r, STUDIES, level, mode, ctx);
  if (!st) return null;
  const S = surname(st);
  const nearMiss = mode === 'reasoning' || mode === 'challenge' || level >= 4;
  const evidenceOnly = mode === 'reverse';
  const intro = st.s[1].match(/^(.*?) (hypothesized|suspected|proposed|argues|expected)/)?.[1] ?? S;
  const passage = evidenceOnly ? [st.s[0], st.s[2].replace(/^(She|He)\b/, intro).replace(new RegExp(`^${S}\\b`), intro), st.s[3]].join(' ') : st.s.join(' ');
  const key: Opt = { t: st.main, tag: 'main', why: evidenceOnly ? `The ${isTest(st) ? 'test and its result' : 'evidence'} points to this conclusion even though the text never states it outright.` : `It states ${S}'s claim and what the evidence suggests about it.` };
  const ds: Opt[] = [
    { t: st.beyond, tag: 'overgeneralizes', why: 'Too broad: the text describes one study, not every case.' },
    { t: st.reversed, tag: 'contradicts', why: 'This reverses what the evidence in the text shows.' },
    nearMiss ? { t: st.detail, tag: 'detail', why: 'A true detail from the text, but not its main idea.' } : { t: st.off[0], tag: 'unrelated', why: 'The text never discusses this.' },
  ];
  const m = mc(r, key, ds);
  const stem = mode === 'representation' ? `Based on the text, what does ${S}'s research most strongly suggest?` : 'Which choice best states the main idea of the text?';
  return out({ skill: 'cid', level, mode, family: `rw:${st.id}:cid` }, {
    sub: 'Main idea', passage, stem, choices: m.choices, answer: m.answer, why: m.why,
    steps: [evidenceOnly ? 'The text never states the claim, so ask: what does the test, together with its result, show?' : `Find the claim: ${S}'s ${claimWord(st)} in the second sentence.`, 'Check what the evidence in the last sentences shows about that claim.', `Choose the statement that matches both the claim and the evidence: ${LETTER(m.answer)}.`],
    concept: 'The main idea is the point the whole text supports, not one detail and not a broader claim.', strategy: 'Say the point in your own words before reading the choices.', trap: 'A true but minor detail, or a claim broader than one study can support.', remember: 'Main idea = what the whole text adds up to. Not wider, not narrower.',
    hints: [evidenceOnly ? 'The claim is never stated. What do the evidence sentences, taken together, show?' : `Find the sentence where ${S} says what ${isTest(st) ? 'the study was meant to show' : 'the argument is'}.`, 'Ask what the final sentence adds: does it support that idea or go against it?', 'Eliminate any choice that is wider than the evidence (every, all), reversed, or only one detail.'],
    spec: { t: 'tags', kind: 'role', tags: m.tags, want: 'main' }, differs: RW_MODES.cid![mode] ?? 'A new passage testing the same skill.',
  });
}
function evidence(r: R, level: RemixLevel, mode: RemixMode, ctx: RwCtx): Candidate | null {
  const st = choose(r, STUDIES, level, mode, ctx, mode === 'challenge' ? (x) => !isTest(x) : undefined);
  if (!st) return null;
  const S = surname(st), cw = claimWord(st);
  const weaken = mode === 'reverse';
  const passage = st.s.join(' ');
  const sup: Opt = { t: st.support, tag: 'supports', why: weaken ? `This would support ${S}'s ${cw}, not weaken it.` : `This finding is exactly what ${S}'s ${cw} predicts.` };
  const wk: Opt = { t: st.weaken, tag: 'weakens', why: weaken ? `If true, this would directly undercut ${S}'s ${cw}.` : `This would weaken ${S}'s ${cw}, not support it.` };
  const offs: Opt[] = st.off.map((t, i) => ({ t, tag: `irrelevant-${i}`, why: `This is about the same general topic, but it says nothing about ${S}'s ${cw}.` }));
  const restated: Opt = { t: st.detail, tag: 'restates', why: 'This only repeats how the study was done; it is not new evidence about the claim.' };
  const m = weaken ? mc(r, wk, [sup, ...offs]) : mc(r, sup, mode === 'reasoning' || mode === 'challenge' ? [wk, restated, offs[0]] : [wk, ...offs]);
  return out({ skill: 'coet', level, mode, family: `rw:${st.id}:coet` }, {
    sub: weaken ? 'Weakening evidence' : 'Supporting evidence', passage, stem: `Which finding, if true, would most directly ${weaken ? 'weaken' : 'support'} ${S}'s ${cw}?`, choices: m.choices, answer: m.answer, why: m.why,
    steps: [`State the ${cw} precisely: ${clause(st.s[1].replace(/^.*?(hypothesized|suspected|proposed|argues|expected) (that )?/, ''))}.`, `Ask what would have to be true if the ${cw} were ${weaken ? 'wrong' : 'right'}.`, `Only ${LETTER(m.answer)} bears directly on that; the topic-only choices do not.`],
    concept: `Evidence questions ask what would ${weaken ? 'undercut' : 'back up'} a specific claim, not what is merely on the same topic.`, strategy: 'Restate the claim as a prediction, then look for the finding that tests it.', trap: weaken ? 'Picking the finding that supports the claim (reading the question too fast).' : 'A finding about the same topic that does not touch the claim.', remember: 'Same topic is not the same claim.',
    hints: [`Put ${S}'s ${cw} into your own words: what causes or explains what?`, `If the ${cw} were ${weaken ? 'false' : 'true'}, what would you expect to see?`, 'Cross out choices that are about the topic but would not change anyone\'s mind about the claim.'],
    spec: { t: 'tags', kind: 'evidence', tags: m.tags, want: weaken ? 'weakens' : 'supports' }, differs: RW_MODES.coet![mode] ?? 'A new claim to evaluate.',
  });
}
const NOUN: Record<string, string> = { 'dc-birds': 'nesting pairs', 'dc-transit': 'daily riders', 'dc-museum': 'visitors', 'dc-books': 'copies sold' };
const COL: Record<string, string> = { 'dc-birds': 'Species', 'dc-transit': 'Route', 'dc-museum': 'Museum', 'dc-books': 'Kind of book' };
function quantEvidence(r: R, level: RemixLevel, mode: RemixMode, ctx: RwCtx): Candidate | null {
  const dc = choose(r, DATA_CARDS, level, mode, ctx);
  if (!dc) return null;
  const S = dc.who.split(' ').pop()!;
  const names = shuffle(dc.names, r);
  const [U1, U2, D1, X] = names;
  const base = () => 20 + 5 * Math.floor(r() * 36);
  const rows = names.map((name) => {
    const a = base();
    const dir = name === U1 || name === U2 ? 1 : name === D1 ? -1 : r() < 0.5 ? 1 : -1;
    const delta = 5 * (3 + Math.floor(r() * 8));
    return { name, a, b: Math.max(5, a + dir * delta) };
  }).map((x) => (x.b === x.a ? { ...x, b: x.a + 15 } : x));
  const row = (n: string) => rows.find((x) => x.name === n)!;
  const u = row(U1), u2 = row(U2), d = row(D1);
  const [y1, y2] = dc.years;
  const unit = dc.unit;
  const stmts = [
    { t: `${U1} rose from ${u.a} to ${u.b} ${unit}, while ${D1} fell from ${d.a} to ${d.b} ${unit}.`, rows: [U1, D1], claims: [{ row: U1, dir: 'up' as const }, { row: D1, dir: 'down' as const }], relevant: true, why: 'It shows one rising and one falling at the same time, which is exactly the uneven pattern the claim describes.' },
    { t: `${U1} and ${U2} both rose between ${y1} and ${y2}, to ${u.b} and ${u2.b} ${unit}.`, rows: [U1, U2], claims: [{ row: U1, dir: 'up' as const }, { row: U2, dir: 'up' as const }], relevant: false, why: 'True, but it shows only growth, so it cannot illustrate a mixed pattern.' },
    { t: `${D1} had more ${NOUN[dc.id]} in ${y2} than in ${y1}, while ${U1} had fewer.`, rows: [D1, U1], claims: [{ row: D1, dir: 'up' as const }, { row: U1, dir: 'down' as const }], relevant: true, why: 'This misreads the table: both directions are reversed.' },
    { t: `${D1} fell from ${d.a} ${unit} in ${y1} to ${d.b} ${unit} in ${y2}.`, rows: [D1], claims: [{ row: D1, dir: 'down' as const }], relevant: false, why: 'True, but it shows only one side of the pattern.' },
  ];
  void X;
  const order = shuffle(stmts.map((_, i) => i), r);
  const st = order.map((i) => stmts[i]);
  const answer = order.indexOf(0);
  const bar = mode === 'representation';
  const figure: Figure = bar
    ? { kind: 'bar', title: `${dc.measure[0].toUpperCase()}${dc.measure.slice(1)}, ${y1} and ${y2}`, xLabel: COL[dc.id], yLabel: dc.measure, categories: rows.map((x) => x.name), series: [{ name: y1, values: rows.map((x) => x.a) }, { name: y2, values: rows.map((x) => x.b) }] }
    : { kind: 'table', title: `${dc.measure[0].toUpperCase()}${dc.measure.slice(1)}, ${y1} and ${y2}`, headers: [COL[dc.id], y1, y2], rows: rows.map((x) => [x.name, x.a, x.b]) };
  const describe = mode === 'reverse';
  const lead = `${dc.who} ${dc.intro}, shown in the ${bar ? 'graph' : 'table'}. ${S} concludes that ${dc.topic}.`;
  const passage = describe ? lead : `${lead} For example, ______`;
  return out({ skill: 'coeq', level, mode, family: `rw:${dc.id}:coeq` }, {
    sub: describe ? 'Data that support a conclusion' : 'Completing an example with data', figure, passage,
    stem: describe ? `Which choice best describes data from the ${bar ? 'graph' : 'table'} that support ${S}'s conclusion?` : `Which choice most effectively uses data from the ${bar ? 'graph' : 'table'} to complete the example?`,
    choices: st.map((x) => x.t), answer, why: st.map((x, i) => (i === answer ? `Correct. ${x.why}` : x.why)),
    steps: [`The claim needs a mixed pattern: something rising AND something falling between ${y1} and ${y2}.`, `Check each choice against the ${bar ? 'graph' : 'table'}: is it true, and does it show both sides?`, `Only ${LETTER(answer)} is both accurate and complete.`],
    concept: 'A data choice must be accurate AND illustrate the claim; a true statement that misses the point is still wrong.', strategy: 'First decide what the claim needs, then check accuracy.', trap: 'A true statement that shows only one side of the claim.', remember: 'True is not enough: it must be true AND on point.',
    hints: [`Underline what ${S} concludes. What would data have to show to illustrate it?`, `Read the ${bar ? 'bars' : 'rows'} for ${y1} and ${y2}: which went up, which went down?`, 'Eliminate choices that misread the numbers, then those that show only part of the pattern.'],
    spec: { t: 'data', rows, stmts: st.map((x) => ({ rows: x.rows, claims: x.claims, relevant: x.relevant })) }, differs: RW_MODES.coeq![mode] ?? 'New data and a new claim.',
  });
}
function inference(r: R, level: RemixLevel, mode: RemixMode, ctx: RwCtx): Candidate | null {
  const st = choose(r, STUDIES, level, mode, ctx);
  if (!st) return null;
  const S = surname(st);
  const challenge = mode === 'reverse';
  const ending = challenge ? (isTest(st) ? 'These results challenge the idea that' : 'This evidence challenges the idea that') : isTest(st) ? 'These results suggest that' : 'Taken together, this evidence suggests that';
  const passage = `${st.s.join(' ')} ${ending} ______`;
  const inf: Opt = { t: clause(st.infer.endsWith('.') ? st.infer : `${st.infer}.`), tag: 'supported', why: challenge ? 'The evidence supports this, so it does not challenge it.' : `It follows from ${S}'s evidence without going beyond it.` };
  const rev: Opt = { t: clause(st.reversed), tag: 'contradicts', why: challenge ? 'The results show the opposite, so they challenge exactly this idea.' : 'This is the opposite of what the evidence shows.' };
  const bey: Opt = { t: clause(st.beyond), tag: 'overgeneralizes', why: 'Goes far beyond one study.' };
  const off: Opt[] = st.off.map((t, i) => ({ t: clause(t), tag: `unrelated-${i}`, why: 'The passage gives no information about this.' }));
  const m = challenge ? mc(r, rev, [inf, ...off]) : mc(r, inf, mode === 'reasoning' || mode === 'challenge' ? [rev, bey, off[0]] : [rev, off[0], off[1]]);
  return out({ skill: 'inf', level, mode, family: `rw:${st.id}:inf` }, {
    sub: challenge ? 'What the evidence rules out' : 'Logical conclusions', passage, stem: 'Which choice most logically completes the text?', choices: m.choices, answer: m.answer, why: m.why,
    steps: [`Summarize the evidence: ${clause(st.s[3])}.`, challenge ? 'Ask which idea that evidence goes against.' : 'Ask what that evidence allows you to conclude, and no more.', `${LETTER(m.answer)} is the only choice that follows.`],
    concept: 'An inference must be forced by the text: it follows from what is stated without adding anything new.', strategy: 'Predict the ending from the last sentence before reading the choices.', trap: challenge ? 'Picking the conclusion the results support, instead of the one they challenge.' : 'A claim that sounds right but reaches beyond the evidence.', remember: 'If you need outside knowledge to accept it, it is not the inference.',
    hints: ['Read the last two sentences: what was tested and what happened?', challenge ? 'Which idea would someone have to give up after seeing these results?' : 'Finish the sentence in your own words before looking at the choices.', 'Eliminate anything the passage never mentions and anything that claims too much.'],
    spec: { t: 'tags', kind: 'inference', tags: m.tags, want: challenge ? 'contradicts' : 'supported' }, differs: RW_MODES.inf![mode] ?? 'A new passage to complete.',
  });
}

// ───────────────────────── Craft and Structure ─────────────────────────
const POS: Record<string, 'adj' | 'verb'> = { doubtful: 'adj', confirm: 'verb', brief: 'adj', plentiful: 'adj', scarce: 'adj', praise: 'verb', criticize: 'verb', hide: 'verb', reveal: 'verb', careful: 'adj', careless: 'adj', lasting: 'adj', new: 'adj', common: 'adj' };
/** distractor senses that are clearly wrong in each sense's frames (never a near-synonym) */
const WIC_DS: Record<string, string[]> = {
  doubtful: ['brief', 'plentiful', 'lasting', 'common'], brief: ['lasting', 'plentiful', 'careful', 'doubtful'], plentiful: ['scarce', 'brief', 'careless', 'doubtful'],
  scarce: ['plentiful', 'lasting', 'careful', 'doubtful'], careful: ['careless', 'doubtful', 'scarce', 'plentiful'], careless: ['careful', 'lasting', 'new', 'doubtful'],
  lasting: ['brief', 'scarce', 'careless', 'doubtful'], new: ['common', 'brief', 'careless', 'scarce'], common: ['new', 'scarce', 'careful', 'doubtful'],
  confirm: ['praise', 'criticize', 'hide'], praise: ['criticize', 'hide', 'confirm'], criticize: ['praise', 'hide', 'confirm'], hide: ['reveal', 'praise', 'confirm'], reveal: ['hide', 'praise', 'criticize'],
};
const OPPOSITE: Record<string, string> = { praise: 'criticize', criticize: 'praise', hide: 'reveal', reveal: 'hide', plentiful: 'scarce', scarce: 'plentiful', careful: 'careless', careless: 'careful', brief: 'lasting', lasting: 'brief', new: 'common', common: 'new' };
const GLOSS: Record<string, string> = { doubtful: 'not persuaded', confirm: 'support', brief: 'temporary', plentiful: 'numerous', scarce: 'hard to obtain', praise: 'applaud', criticize: 'object to', hide: 'disguise', reveal: 'make known', careful: 'thorough', careless: 'disorganized', lasting: 'continuing', new: 'original', common: 'familiar' };
function words(r: R, level: RemixLevel, mode: RemixMode, ctx: RwCtx): Candidate | null {
  const origSense = ctx.answerText ? Object.keys(LEXICON).find((s) => LEXICON[s].some((w) => ctx.answerText!.toLowerCase().includes(w))) : undefined;
  const fr = choose(r, WIC, level, mode, ctx, mode === 'reverse' && origSense && OPPOSITE[origSense] ? (x) => x.sense === OPPOSITE[origSense] : (x) => !ctx.passage || !ctx.passage.includes(x.text.slice(0, 40)));
  if (!fr) return null;
  const meaning = mode === 'representation';
  const lvl = mode === 'challenge' || level >= 4 ? 0 : level <= 2 ? 1 : pk(r, [0, 1, 2]);
  const lex = LEXICON[fr.sense];
  const target = lex[Math.min(lvl, lex.length - 1)];
  const others = shuffle(WIC_DS[fr.sense].filter((s) => POS[s] === POS[fr.sense]), r).slice(0, 3);
  if (others.length < 3) return null;
  const clue = fr.text.split(/[:;,.]/).find((part) => !part.includes('______'))?.trim() ?? 'the rest of the sentence';
  if (meaning) {
    const passage = fr.text.replace('______', target);
    const key: Opt = { t: GLOSS[fr.sense], tag: fr.sense, why: `In this sentence "${target}" means ${GLOSS[fr.sense]}, which fits the clue.` };
    const ds = others.map((s) => ({ t: GLOSS[s], tag: s, why: `"${GLOSS[s]}" does not fit what the sentence says around "${target}".` }));
    const m = mc(r, key, ds);
    return out({ skill: 'wic', level, mode, family: `rw:wic:${fr.sense}` }, {
      sub: 'Meaning in context', passage, stem: `As used in the text, what does the word “${target}” most nearly mean?`, choices: m.choices, answer: m.answer, why: m.why,
      steps: [`Cover the word "${target}" and reread the sentence: what meaning does the context demand?`, 'Substitute each choice into the sentence.', `Only ${LETTER(m.answer)} keeps the sentence's meaning.`],
      concept: 'A word\'s meaning in context comes from the clue around it, not from the dictionary\'s first entry.', strategy: 'Cover the word, predict a replacement, then match.', trap: 'A choice that is a real meaning of a related word but not of this one here.', remember: 'Predict before you look.',
      hints: [`Cover "${target}" and reread the sentence around it.`, 'Find the clue: what else in the text tells you what the word must mean?', 'Put each choice in place of the word: which one keeps the sentence\'s meaning?'],
      spec: { t: 'tags', kind: 'sense', tags: m.tags, want: fr.sense }, differs: RW_MODES.wic![mode] ?? 'A new sentence and word.',
    });
  }
  const key: Opt = { t: target, tag: fr.sense, why: `"${target}" fits the clue in the text.` };
  const ds = others.map((s) => { const w = LEXICON[s][Math.min(lvl, LEXICON[s].length - 1)]; return { t: w, tag: s, why: `"${w}" ${OPPOSITE[fr.sense] === s ? 'means the opposite of what the context requires' : 'does not fit what the text says'}.` }; });
  const m = mc(r, key, ds);
  return out({ skill: 'wic', level, mode, family: `rw:wic:${fr.sense}` }, {
    sub: 'Precise words in context', passage: fr.text, stem: 'Which choice completes the text with the most logical and precise word or phrase?', choices: m.choices, answer: m.answer, why: m.why,
    steps: [`Find the clue: "${clue}".`, 'Predict a word for the blank from that clue.', `${LETTER(m.answer)} matches the prediction.`],
    concept: 'The blank\'s word is fixed by a clue elsewhere in the text, often after a colon or in a nearby sentence.', strategy: 'Predict a simple word for the blank, then find its precise match.', trap: 'A sophisticated word that does not match the clue.', remember: 'The clue is in the text. Find it first.',
    hints: ['Find the part of the text that explains or restates the blank.', 'Say a simple word that would fit the blank, before looking at the choices.', 'Eliminate words with the opposite meaning, then words that do not fit the sentence.'],
    spec: { t: 'tags', kind: 'sense', tags: m.tags, want: fr.sense }, differs: RW_MODES.wic![mode] ?? 'A new sentence and word.',
  });
}
function structure(r: R, level: RemixLevel, mode: RemixMode, ctx: RwCtx): Candidate | null {
  const st = choose(r, STUDIES, level, mode, ctx, mode === 'challenge' ? (x) => !isTest(x) : undefined);
  if (!st) return null;
  const S = surname(st), test = isTest(st);
  if (mode === 'representation') {
    const key: Opt = test ? { t: 'It introduces a situation, presents a hypothesis about it, describes a test of that hypothesis, and reports a result that supports it.', tag: 'bg-claim-test-support', why: 'It follows the four sentences in order.' }
      : { t: 'It introduces a subject, presents a scholar\'s argument about it, and offers evidence for that argument.', tag: 'bg-claim-evidence', why: 'It follows the sentences in order: subject, argument, evidence.' };
    const ds: Opt[] = test ? [
      { t: 'It presents a hypothesis, explains why it was rejected, and proposes a different explanation.', tag: 'claim-reject-alt', why: 'Nothing in the text rejects the hypothesis.' },
      { t: 'It describes a test, reports its result, and then questions whether the test was fair.', tag: 'test-result-doubt', why: 'The text never questions the test.' },
      { t: 'It compares two competing hypotheses and argues that neither is supported by the evidence.', tag: 'compare-two', why: 'There is only one hypothesis, and the evidence supports it.' },
    ] : [
      { t: 'It presents a scholar\'s argument and then describes evidence that undermines it.', tag: 'claim-undermine', why: 'The evidence supports the argument rather than undermining it.' },
      { t: 'It compares two scholars\' arguments and explains why one is more persuasive.', tag: 'compare-two', why: 'Only one scholar\'s argument appears.' },
      { t: 'It describes a debate that, according to the scholar, can never be settled.', tag: 'unsettled', why: 'The scholar takes a clear position.' },
    ];
    const m = mc(r, key, ds);
    return out({ skill: 'tsp', level, mode, family: `rw:${st.id}:tsp-structure` }, {
      sub: 'Overall structure', passage: st.s.join(' '), stem: 'Which choice best describes the overall structure of the text?', choices: m.choices, answer: m.answer, why: m.why,
      steps: ['Label each sentence with its job (situation, claim, test or evidence, result).', 'Write the sequence of jobs.', `${LETTER(m.answer)} lists that sequence.`],
      concept: 'Structure questions ask for the sequence of jobs the sentences do, not a summary of the content.', strategy: 'Label each sentence with a two-word job, then match the sequence.', trap: 'A structure that adds a step the text does not take (rejecting, doubting, comparing).', remember: 'Structure = the order of the jobs.',
      hints: ['Give the first sentence a two-word job. Then the second.', `Does anything in the text push back against ${S}'s ${claimWord(st)}?`, 'Choose the choice whose every step happens in the text, in that order.'],
      spec: { t: 'tags', kind: 'structure', tags: m.tags, want: key.tag }, differs: RW_MODES.tsp!.representation!,
    });
  }
  const idx = test ? Math.floor(r() * 4) : Math.floor(r() * 2);
  const role = ['background', 'claim', 'method', 'result'][idx];
  const passage = st.s.map((x, i) => (i === idx ? `__${x}__` : x)).join(' ');
  const opts: Opt[] = [
    { t: `It introduces the situation that ${S} studies.`, tag: 'background', why: 'The first sentence sets up the situation before any claim is made.' },
    { t: `It states the ${claimWord(st)} that the rest of the text ${test ? 'tests' : 'supports'}.`, tag: 'claim', why: `This is ${S}'s ${claimWord(st)}; what follows ${test ? 'tests' : 'supports'} it.` },
    test ? { t: `It describes how ${S} tested the hypothesis.`, tag: 'method', why: 'It explains what was done to test the hypothesis.' } : { t: `It presents evidence that ${S} offers for the argument.`, tag: 'method', why: 'It presents evidence.' },
    test ? { t: 'It reports a finding that supports the hypothesis.', tag: 'result', why: 'It gives the outcome of the test.' } : { t: `It raises an objection to ${S}'s argument.`, tag: 'objection', why: 'Nothing in the text objects to the argument.' },
  ];
  const key = opts.find((o) => o.tag === role)!;
  const ds = opts.filter((o) => o !== key).map((o) => ({ ...o, why: o.tag === 'objection' ? o.why : `That describes a different sentence: the underlined one ${role === 'background' ? 'sets up the situation' : role === 'claim' ? `states the ${claimWord(st)}` : role === 'method' ? 'describes the test' : 'reports the result'}.` }));
  const m = mc(r, key, ds);
  return out({ skill: 'tsp', level, mode, family: `rw:${st.id}:tsp` }, {
    sub: 'Function of a sentence', passage, stem: 'Which choice best describes the function of the underlined sentence in the text as a whole?', choices: m.choices, answer: m.answer, why: m.why,
    steps: ['Read the whole text and label each sentence\'s job.', `The underlined sentence is sentence ${idx + 1}; its job is to ${role === 'background' ? 'set up the situation' : role === 'claim' ? `state the ${claimWord(st)}` : role === 'method' ? 'describe the test' : 'report the result'}.`, `${LETTER(m.answer)} names that job.`],
    concept: 'A function question asks what a sentence DOES for the passage, not what it says.', strategy: 'Ask: what would the passage lose without this sentence?', trap: 'Describing what the sentence says instead of the job it does.', remember: 'Function = job, not content.',
    hints: ['Read the sentences before and after the underlined one.', 'What would the text lose if the underlined sentence were removed?', 'Pick the choice that names the job, not the one that repeats the content.'],
    spec: { t: 'tags', kind: 'function', tags: m.tags, want: role }, differs: RW_MODES.tsp![mode] ?? 'A new passage and underlined sentence.',
  });
}
function crossText(r: R, level: RemixLevel, mode: RemixMode, ctx: RwCtx): Candidate | null {
  const useStudy = mode === 'representation' ? !(ctx.passage ?? '').match(/Many observers have assumed/) : mode === 'number' ? (ctx.passage ?? '').includes('Many observers have assumed') : r() < 0.5;
  if (!useStudy) {
    const db = choose(r, DEBATES, level, mode, ctx, (x) => !ctx.passage?.includes(x.t2.slice(0, 30)));
    if (db) {
      const m = mc(r, { t: db.key, tag: 'responds', why: `${db.who2}'s findings answer the view in Text 1 directly.` }, [
        { t: db.reversed, tag: 'agrees', why: `${db.who2} does not agree; Text 2 offers evidence against Text 1's view.` },
        { t: db.beyond, tag: 'overreaches', why: `${db.who2} never goes this far.` },
        { t: db.wrongText, tag: 'misreads', why: 'Text 2 says nothing about this.' },
      ]);
      return out({ skill: 'ctc', level, mode, family: `rw:${db.id}:ctc` }, {
        sub: 'Responding to another view', passage: `Text 1\n${db.t1}\n\nText 2\n${db.t2}`, stem: `Based on the texts, how would ${db.who2} (Text 2) most likely respond to ${db.topic} in Text 1?`, choices: m.choices, answer: m.answer, why: m.why,
        steps: ['State Text 1\'s view in a few words.', `State what ${db.who2} found in Text 2 and whether it agrees.`, `${LETTER(m.answer)} connects the two.`],
        concept: 'Cross-text questions ask how one author would react to the other text, using only what each text says.', strategy: 'Summarize each text in one line, then ask: agree, disagree, or qualify?', trap: 'A response that goes further than Text 2 does.', remember: 'Two summaries first, then the relationship.',
        hints: ['Summarize Text 1 in one sentence.', `Summarize ${db.who2}'s finding in one sentence. Does it agree with Text 1?`, 'Eliminate choices that go beyond what Text 2 actually shows.'],
        spec: { t: 'tags', kind: 'response', tags: m.tags, want: 'responds' }, differs: RW_MODES.ctc![mode] ?? 'A new pair of texts.',
      });
    }
  }
  const st = choose(r, STUDIES, level, mode, ctx, (x) => !['st-novel', 'st-letters', 'st-chairs'].includes(x.id));
  if (!st) return null;
  const S = surname(st);
  const passage = `Text 1\n${st.s[0]} Many observers have assumed that ${clause(st.reversed)}.\n\nText 2\n${st.s[1]} ${st.s[2]} ${st.s[3]}`;
  const m = mc(r, { t: `${S} would argue that the assumption is mistaken, since the evidence described in Text 2 suggests that ${clause(st.infer.endsWith('.') ? st.infer : `${st.infer}.`)}.`, tag: 'responds', why: `${S}'s evidence points the other way.` }, [
    { t: `${S} would agree with the assumption, since the evidence described in Text 2 is consistent with it.`, tag: 'agrees', why: 'The evidence in Text 2 goes against the assumption.' },
    { t: `${S} would argue that the assumption is mistaken, since the evidence shows that ${clause(st.beyond)}.`, tag: 'overreaches', why: 'The evidence in Text 2 is far narrower than this.' },
    { t: `${S} would argue that the assumption matters less than the fact that ${clause(st.off[0])}.`, tag: 'misreads', why: 'Text 2 never mentions this.' },
  ]);
  return out({ skill: 'ctc', level, mode, family: `rw:${st.id}:ctc` }, {
    sub: 'Responding to another view', passage, stem: `Based on the texts, how would ${S} (Text 2) most likely respond to the assumption described in Text 1?`, choices: m.choices, answer: m.answer, why: m.why,
    steps: ['State the assumption in Text 1.', `State what ${S}'s evidence shows.`, `They conflict, and ${LETTER(m.answer)} says so for the right reason.`],
    concept: 'Cross-text questions ask how one author would react to the other text, using only what each text says.', strategy: 'Summarize each text in one line, then ask: agree, disagree, or qualify?', trap: 'The right reaction for the wrong reason (a claim Text 2 never makes).', remember: 'Check the reason, not just "agree" or "disagree".',
    hints: ['What exactly do the observers in Text 1 assume?', `What does ${S}'s result show? Does it fit the assumption?`, 'Two choices say "mistaken": check which reason Text 2 actually supports.'],
    spec: { t: 'tags', kind: 'response', tags: m.tags, want: 'responds' }, differs: RW_MODES.ctc![mode] ?? 'A new pair of texts.',
  });
}

// ───────────────────────── Expression of Ideas ─────────────────────────
const REL_NAME: Record<Rel, string> = { contrast: 'a contrast', result: 'a result', addition: 'an addition', example: 'an example', sequence: 'a later step in time', similarity: 'a similarity' };
const REL_DOES: Record<Rel, string> = { contrast: 'contrasts with the first', result: 'describes a result of the first', addition: 'adds a further point to the first', example: 'gives an example of the first', sequence: 'describes what happened later', similarity: 'describes something similar to the first' };
const tooClose = (a: Rel, b: Rel) => a === b || NEAR[a].includes(b) || NEAR[b].includes(a);
function transition(r: R, level: RemixLevel, mode: RemixMode, ctx: RwCtx): Candidate | null {
  const origRel = ctx.answerText ? (Object.keys(TRANSITIONS) as Rel[]).find((k) => TRANSITIONS[k].some((t) => ctx.answerText!.startsWith(t.replace(',', '')))) : undefined;
  const pr = choose(r, PAIRS, level, mode, ctx, (x) => (mode === 'representation' && origRel ? x.rel !== origRel : mode === 'number' && origRel ? x.rel === origRel : true) && !ctx.passage?.includes(x.a.slice(0, 30)));
  if (!pr) return null;
  const others = shuffle((Object.keys(TRANSITIONS) as Rel[]).filter((k) => !tooClose(k, pr.rel)), r);
  if (others.length < 3) return null;
  const key: Opt = { t: pk(r, TRANSITIONS[pr.rel]), tag: pr.rel, why: `The second sentence ${REL_DOES[pr.rel]}.` };
  const ds = others.slice(0, 3).map((k) => ({ t: pk(r, TRANSITIONS[k]), tag: k, why: `This signals ${REL_NAME[k]}, but the second sentence ${REL_DOES[pr.rel]}.` }));
  const m = mc(r, key, ds);
  const passage = `${pr.a} ______ ${pr.b}`;
  return out({ skill: 'tra', level, mode, family: `rw:tra:${pr.rel}` }, {
    sub: 'Logical transitions', passage, stem: 'Which choice completes the text with the most logical transition?', choices: m.choices, answer: m.answer, why: m.why,
    steps: ['Read both sentences without the transition.', `Name the relationship: the second sentence ${REL_DOES[pr.rel]}.`, `${LETTER(m.answer)} signals that relationship.`],
    concept: 'A transition names the logical relationship between two ideas; the relationship comes first, the word second.', strategy: 'Name the relationship in one word before reading the choices.', trap: 'A transition that sounds formal but signals the wrong relationship.', remember: 'Relationship first, word second.',
    hints: ['Cover the blank and read the two sentences on their own.', 'Does the second sentence agree with, go against, follow from, or illustrate the first?', 'Eliminate every transition that signals a different relationship.'],
    spec: { t: 'tags', kind: 'relation', tags: m.tags, want: pr.rel, avoid: NEAR[pr.rel] }, differs: RW_MODES.tra![mode] ?? 'A new pair of sentences.',
  });
}
function synthesis(r: R, level: RemixLevel, mode: RemixMode, ctx: RwCtx): Candidate | null {
  const card = choose(r, NOTE_CARDS.map((c) => ({ ...c, lvl: 3 })), level, mode, ctx, mode === 'representation' ? (c) => !!ctx.passage && c.notes.some((n) => (ctx.passage ?? '').includes(n.text.slice(0, 25))) || !ctx.passage : undefined);
  if (!card) return null;
  const goals = card.goals.filter((g) => (mode === 'challenge' ? g.requires.length >= 2 : true) && !(ctx.passage ?? '').includes(g.text.replace(/^The student wants to /, '').slice(0, 30)));
  const goal = goals.length ? pk(r, goals) : pk(r, card.goals);
  const tagOf = new Map(card.notes.map((n) => [n.id, n.tag]));
  const meets = (fs: string[]) => goal.requires.every((t) => fs.some((f) => tagOf.get(f) === t));
  const keyS = card.sentences.find((s) => meets(s.facts));
  if (!keyS) return null;
  const rest = card.sentences.filter((s) => s !== keyS);
  const all = shuffle([keyS, ...rest].slice(0, 4), r);
  const answer = all.indexOf(keyS);
  const want = goal.text.replace(/^The student wants to /, '').replace(/\.$/, '');
  return out({ skill: 'syn', level, mode, family: `rw:${card.id}:syn` }, {
    sub: 'Using notes for a goal', notes: card.notes.map((n) => n.text),
    stem: `While researching a topic, a student has taken the following notes. The student wants to ${want}. Which choice most effectively uses relevant information from the notes to accomplish this goal?`,
    choices: all.map((s) => s.text), answer,
    why: all.map((s, i) => (i === answer ? `Correct. It does exactly what the goal asks (${goal.requires.join(' + ')}).` : `Accurate, but it does not ${want}.`)),
    steps: [`Underline the goal: ${want}.`, 'Ignore whether a choice is true (they all are); ask only whether it accomplishes the goal.', `${LETTER(answer)} is the only one that does.`],
    concept: 'Rhetorical synthesis is about the goal: every choice is accurate, but only one does what the student wants.', strategy: 'Read the goal first, then the choices, and use the notes only to check.', trap: 'An accurate sentence that answers a different goal.', remember: 'Goal first. Accuracy is a given.',
    hints: ['Read the goal in the question before the notes.', `What would a sentence need to include to ${want}?`, 'Cross out every choice that is accurate but aims at something else.'],
    spec: { t: 'facts', notes: card.notes.map((n) => ({ id: n.id, tag: n.tag })), choiceFacts: all.map((s) => s.facts), requires: goal.requires }, differs: RW_MODES.syn![mode] ?? 'New notes and a new goal.',
  });
}

// ───────────────────────── Standard English Conventions ─────────────────────────
const BND: Record<BoundaryKind, { valid: string[]; wrong: string[]; sub: string; rule: string; steps: string }> = {
  'ic-ic': { valid: [';', ':', '—'], wrong: [',', '', ' and,'], sub: 'Joining independent clauses', rule: 'Two complete sentences need a semicolon (or a period), never a comma alone or nothing at all.', steps: 'Both sides could stand alone as sentences.' },
  appositive: { valid: ['—'], wrong: [',', ';', ''], sub: 'Paired punctuation', rule: 'An interrupting phrase opened with a dash must be closed with a dash.', steps: 'The phrase that interrupts the sentence opened with a dash.' },
  intro: { valid: [','], wrong: [';', ':', '—'], sub: 'Introductory clauses', rule: 'An introductory dependent clause is followed by a comma, not a semicolon or colon.', steps: 'The opening clause cannot stand alone; the main clause follows.' },
  'subject-verb': { valid: [''], wrong: [',', ';', '—'], sub: 'No punctuation between subject and verb', rule: 'No punctuation separates a subject from its verb, however long the subject is.', steps: 'Everything before the blank is the subject; the verb comes right after it.' },
};
function boundaries(r: R, level: RemixLevel, mode: RemixMode, ctx: RwCtx): Candidate | null {
  const origKind = (Object.keys(BND) as BoundaryKind[]).find((k) => BND[k].sub === ctx.sub);
  const fr = choose(r, BOUNDARIES, level, mode, ctx, (x) => (mode === 'reverse' ? x.kind === 'subject-verb' : mode === 'representation' && origKind ? x.kind !== origKind : mode === 'number' && origKind ? x.kind === origKind : true) && !ctx.passage?.includes(x.lead.slice(0, 30)));
  if (!fr) return null;
  const rule = BND[fr.kind];
  const keyMark = rule.valid[0];
  const opts = shuffle([keyMark, ...rule.wrong], r);
  const show = (mk: string) => `${fr.w}${mk}`;
  const answer = opts.indexOf(keyMark);
  return out({ skill: 'bnd', level, mode, family: `rw:bnd:${fr.kind}` }, {
    sub: rule.sub, passage: `${fr.lead} ______ ${fr.rest} ${fr.after}`, stem: SEC_STEM, choices: opts.map(show), answer,
    why: opts.map((mk, i) => (i === answer ? `Correct. ${rule.rule}` : `${show(mk)} breaks the rule: ${rule.rule.charAt(0).toLowerCase()}${rule.rule.slice(1)}`)),
    steps: [`Find what is on each side of the blank. ${rule.steps}`, rule.rule, `So the answer is "${show(keyMark)}" (${LETTER(answer)}).`],
    concept: rule.rule, strategy: 'Identify what is on each side of the blank before choosing punctuation.', trap: fr.kind === 'subject-verb' ? 'Adding a pause where a long subject "feels" like it needs one.' : 'A comma, which looks harmless but cannot do this job.', remember: rule.rule,
    hints: ['Read the text before the blank. Could it stand alone as a sentence?', 'Read the text after the blank. Could it stand alone?', fr.kind === 'appositive' ? 'Look earlier in the sentence: how was the interruption opened?' : 'Which punctuation does that combination require (or forbid)?'],
    spec: { t: 'grammar', structure: fr.kind, options: opts, valid: rule.valid }, differs: RW_MODES.bnd![mode] ?? 'A new sentence with a boundary.',
  });
}
function forms(r: R, level: RemixLevel, mode: RemixMode, ctx: RwCtx): Candidate | null {
  const kinds = ['agree', 'pronoun', 'modifier'] as const;
  const origKind = /agree/i.test(ctx.sub ?? '') ? 'agree' : /pronoun/i.test(ctx.sub ?? '') ? 'pronoun' : /modifier/i.test(ctx.sub ?? '') ? 'modifier' : undefined;
  const kind = mode === 'challenge' ? 'agree' : mode === 'representation' && origKind ? pk(r, kinds.filter((k) => k !== origKind)) : mode === 'number' && origKind ? origKind : pk(r, kinds);
  const base = { skill: 'fss' as const, level, mode };
  const notSame = <T extends { genre: Genre }>(xs: T[], textOf: (x: T) => string) => xs.filter((x) => !ctx.passage?.includes(textOf(x).slice(0, 30)));
  if (kind === 'agree') {
    const fr = choose(r, notSame(AGREE, (x) => x.mid), level, mode, ctx);
    if (!fr) return null;
    const pl = r() < 0.5;
    const subj = pl ? fr.pl : fr.sg;
    const forms4 = fr.verb === 'be' ? ['is', 'are', 'being', 'to be'] : ['has', 'have', 'having', 'to have'];
    const key = fr.verb === 'be' ? (pl ? 'are' : 'is') : pl ? 'have' : 'has';
    const opts = shuffle(forms4, r), answer = opts.indexOf(key);
    const head = subj.split(' ').pop()!;
    return out({ ...base, family: 'rw:fss:agree' }, {
      sub: 'Subject–verb agreement', passage: `${subj} ${fr.mid} ______ ${fr.pred} ${fr.after}`, stem: SEC_STEM, choices: opts, answer,
      why: opts.map((o, i) => (i === answer ? `Correct. The subject is "${head}" (${pl ? 'plural' : 'singular'}), so the verb is "${key}".` : o.includes(' ') || o.endsWith('ing') ? `"${o}" is not a main verb, so the sentence would have none.` : `"${o}" is ${pl ? 'singular' : 'plural'}, but the subject "${head}" is ${pl ? 'plural' : 'singular'}.`)),
      steps: [`Strip the interrupting phrase "${fr.mid}".`, `The subject is "${subj}": ${pl ? 'plural' : 'singular'}.`, `The sentence needs a main verb that agrees: "${key}" (${LETTER(answer)}).`],
      concept: 'A verb agrees with its subject, not with the nearest noun.', strategy: 'Cross out the phrase between the subject and the verb.', trap: `Matching the verb to "${fr.mid.split(' ').pop()}", the noun right before the blank.`, remember: 'Cross out the middle, match the ends.',
      hints: ['Who or what is doing the action in this sentence?', 'Cross out the "of …" phrase between the subject and the blank.', 'Is that subject singular or plural? The sentence also needs a real main verb.'],
      spec: { t: 'grammar', structure: `agree-${pl ? 'pl' : 'sg'}`, options: opts, valid: [key] }, differs: RW_MODES.fss![mode] ?? 'A new sentence testing agreement.',
    });
  }
  if (kind === 'pronoun') {
    const fr = choose(r, notSame(PRONOUN, (x) => x.text), level, mode, ctx);
    if (!fr) return null;
    const opts0 = fr.number === 'sg' ? ['its', "it's", 'their', "its'"] : ['their', "they're", 'there', 'its'];
    const key = opts0[0];
    const opts = shuffle(opts0, r), answer = opts.indexOf(key);
    return out({ ...base, family: 'rw:fss:pronoun' }, {
      sub: 'Pronoun–antecedent agreement', passage: `${fr.text} ${fr.after}`, stem: SEC_STEM, choices: opts, answer,
      why: opts.map((o, i) => (i === answer ? `Correct. "${key}" is the ${fr.number === 'sg' ? 'singular' : 'plural'} possessive pronoun the sentence needs.` : o.includes("'") ? `"${o}" is a contraction or not a word, not a possessive pronoun.` : o === 'there' ? '"there" names a place, not ownership.' : `"${o}" does not match the ${fr.number === 'sg' ? 'singular' : 'plural'} noun it refers to.`)),
      steps: ['Find the noun the pronoun refers to.', `It is ${fr.number === 'sg' ? 'singular' : 'plural'}, and the sentence needs ownership (a possessive).`, `"${key}" (${LETTER(answer)}).`],
      concept: 'A pronoun matches its antecedent in number, and possessive pronouns never take an apostrophe.', strategy: 'Find the antecedent, decide singular or plural, then pick the possessive.', trap: fr.number === 'sg' ? '"it\'s", which means "it is".' : '"they\'re", which means "they are".', remember: 'its = belonging to it; it\'s = it is.',
      hints: ['What does the blank belong to?', 'Find that noun. Is it singular or plural?', 'Possessive pronouns never take an apostrophe; contractions do.'],
      spec: { t: 'grammar', structure: `pronoun-${fr.number}`, options: opts, valid: [key] }, differs: RW_MODES.fss![mode] ?? 'A new sentence testing pronouns.',
    });
  }
  const fr = choose(r, notSame(MODIFIER, (x) => x.mod), level, mode, ctx);
  if (!fr) return null;
  const opts = shuffle([fr.agent, ...fr.wrong], r), answer = opts.indexOf(fr.agent);
  const doer = fr.agent.split(/ (?:concluded|found|completed|now)/)[0];
  return out({ ...base, family: 'rw:fss:modifier' }, {
    sub: 'Dangling modifiers', passage: `${fr.mod} ______ ${fr.after}`, stem: SEC_STEM, choices: opts, answer,
    why: opts.map((o, i) => (i === answer ? `Correct. The opening phrase describes ${doer}, so ${doer} must come right after the comma.` : `This makes the opening phrase describe ${o.split(' ').slice(0, 2).join(' ')}, which is not what it describes.`)),
    steps: [`Ask who or what is "${fr.mod.replace(/,$/, '').toLowerCase()}".`, `That must be the first thing named after the comma: ${doer}.`, `${LETTER(answer)} puts it there.`],
    concept: 'An opening modifier describes the first noun after the comma, so that noun must be the one doing it.', strategy: 'Ask "who is doing the opening phrase?" and look for that noun right after the comma.', trap: 'A passive sentence that pushes the real doer to the end.', remember: 'The doer goes right after the comma.',
    hints: ['Read the opening phrase. Who or what is doing it?', 'In a correct sentence, that doer is the first thing named after the comma.', 'Check the first few words of each choice.'],
    spec: { t: 'grammar', structure: 'modifier', options: opts, valid: [fr.agent] }, differs: RW_MODES.fss![mode] ?? 'A new sentence testing modifiers.',
  });
}

export type RwFamily = (r: R, level: RemixLevel, mode: RemixMode, ctx: RwCtx) => Candidate | null;
export const RW_FAMILIES: Partial<Record<SkillId, { family: RwFamily; name: string }>> = {
  cid: { family: centralIdea, name: 'central ideas' }, coet: { family: evidence, name: 'textual evidence' }, coeq: { family: quantEvidence, name: 'quantitative evidence' },
  inf: { family: inference, name: 'inferences' }, wic: { family: words, name: 'words in context' }, tsp: { family: structure, name: 'text structure and purpose' },
  ctc: { family: crossText, name: 'cross-text connections' }, tra: { family: transition, name: 'transitions' }, syn: { family: synthesis, name: 'rhetorical synthesis' },
  bnd: { family: boundaries, name: 'boundaries' }, fss: { family: forms, name: 'form, structure and sense' },
};
export type { RwSpec };
