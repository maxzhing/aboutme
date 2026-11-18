import { plain } from '../richtext';
import { SKILL } from '../taxonomy';
import type { Question } from '../types';
import { dateKey } from '../util';
import { LEVEL_MEANS, LEVEL_NAME, MODE_INFO, type Candidate, type RemixLevel, type RemixMode } from './types';

/**
 * OPTIONAL AI path for Remix Studio (the student's own Gemini key, as for the tutor). The model is asked for
 * STRUCTURED output: a question plus a machine-checkable spec. Its answer is never trusted: the candidate
 * goes through exactly the same validator as a local one, and anything malformed, refused or off-spec
 * falls back to the local generators. AI-written Reading & Writing is labelled "Needs review", because
 * prose quality is something the validator cannot fully judge.
 */
const API = 'https://generativelanguage.googleapis.com/v1beta';
const DAILY_CAP = 60;
const usageKey = () => `stellify-ai-${dateKey()}`;
const usedToday = () => { try { return Number(localStorage.getItem(usageKey()) ?? 0); } catch { return 0; } };
const bumpUsage = () => { try { localStorage.setItem(usageKey(), String(usedToday() + 1)); } catch { /* ignore */ } };

export interface AiSettings { aiEnabled?: boolean; aiConsent?: boolean; geminiKey?: string; geminiModel?: string }
export const aiReady = (s: AiSettings) => !!(s.aiEnabled && s.aiConsent && s.geminiKey);

const S = (type: string, extra: object = {}) => ({ type, ...extra });
const SCHEMA = S('OBJECT', {
  properties: {
    passage: S('STRING', { nullable: true }), stem: S('STRING'), choices: S('ARRAY', { items: S('STRING') }), answer: S('INTEGER'),
    steps: S('ARRAY', { items: S('STRING') }), why: S('ARRAY', { items: S('STRING') }), concept: S('STRING'), strategy: S('STRING'), trap: S('STRING'),
    hints: S('ARRAY', { items: S('STRING') }), differs: S('STRING'),
    specType: S('STRING', { enum: ['solve', 'eval', 'system', 'tags'] }),
    equation: S('STRING', { nullable: true, description: 'solve: one equation in x using * for multiplication, e.g. "3*x+5=20"' }),
    ask: S('STRING', { nullable: true, description: 'solve/system: expression in x (and y) whose value is the answer, e.g. "x" or "2*x-1"' }),
    expression: S('STRING', { nullable: true, description: 'eval: arithmetic expression whose value is the answer' }),
    equations: S('ARRAY', { nullable: true, items: S('STRING'), description: 'system: two linear equations in x and y' }),
    choiceValues: S('ARRAY', { nullable: true, items: S('STRING'), description: 'math: the value of each choice as an arithmetic expression' }),
    tags: S('ARRAY', { nullable: true, items: S('STRING'), description: 'reading and writing: one distinct label per choice saying what it is (e.g. main, overgeneralizes, reversed, unrelated)' }),
    want: S('STRING', { nullable: true, description: 'reading and writing: the tag of the correct choice' }),
  },
  required: ['stem', 'choices', 'answer', 'steps', 'why', 'concept', 'strategy', 'trap', 'hints', 'differs', 'specType'],
});

const str = (x: unknown) => (typeof x === 'string' ? x.trim() : '');
const strs = (x: unknown) => (Array.isArray(x) ? x.map(str).filter(Boolean) : []);
/** Turns the model's JSON into a candidate, or null if anything required is missing or malformed. */
export function parseAi(json: unknown, parent: Question, mode: RemixMode, level: RemixLevel): Candidate | null {
  if (!json || typeof json !== 'object') return null;
  const j = json as Record<string, unknown>;
  const choices = strs(j.choices), steps = strs(j.steps), why = strs(j.why), hints = strs(j.hints);
  const answer = typeof j.answer === 'number' && Number.isInteger(j.answer) ? j.answer : -1;
  if (!str(j.stem) || choices.length !== 4 || answer < 0 || answer > 3 || !steps.length || why.length !== 4 || hints.length < 3) return null;
  const t = str(j.specType);
  let spec: Candidate['spec'] | null = null;
  const choiceExprs = strs(j.choiceValues);
  if (t === 'solve' && str(j.equation)) spec = { t: 'solve', eq: str(j.equation), ask: str(j.ask) || 'x', choiceExprs: choiceExprs.length === 4 ? choiceExprs : undefined };
  else if (t === 'eval' && str(j.expression)) spec = { t: 'eval', expr: str(j.expression), choiceExprs: choiceExprs.length === 4 ? choiceExprs : undefined };
  else if (t === 'system' && strs(j.equations).length === 2) spec = { t: 'system', eqs: strs(j.equations) as [string, string], ask: str(j.ask) || 'x', choiceExprs: choiceExprs.length === 4 ? choiceExprs : undefined };
  else if (t === 'tags' && strs(j.tags).length === 4 && str(j.want)) spec = { t: 'tags', kind: 'ai', tags: strs(j.tags), want: str(j.want) };
  if (!spec) return null;
  if (parent.section === 'math' && spec.t === 'tags') return null; // math must be re-solvable
  return {
    skill: parent.skill, sub: parent.sub, level, mode, family: 'ai', passage: str(j.passage) || undefined,
    stem: str(j.stem), choices, answer, steps, why, concept: str(j.concept), strategy: str(j.strategy), trap: str(j.trap), remember: str(j.concept),
    hints: [hints[0], hints[1], hints[2]], spec, differs: str(j.differs) || MODE_INFO[mode].blurb,
  };
}

function prompt(parent: Question, mode: RemixMode, level: RemixLevel): string {
  return [
    `Write ONE new, original Digital SAT ${parent.section === 'math' ? 'Math' : 'Reading and Writing'} multiple-choice question testing the skill "${SKILL[parent.skill].name}" (${parent.sub}).`,
    `Transformation: ${MODE_INFO[mode].name}: ${MODE_INFO[mode].blurb}`,
    `Difficulty: ${LEVEL_NAME[level]}: ${LEVEL_MEANS[level]}`,
    'The question this remixes (use it ONLY to understand the skill; do not reuse its wording, names, numbers or situation):',
    plain(`${parent.passage ?? ''}\n${parent.stem}`).slice(0, 1200),
    'Rules: exactly four choices, exactly one correct; every wrong choice comes from a specific, named misconception; one rationale per choice in "why"; three hints that guide without giving the answer; "differs" says in one sentence how the new question differs from the original.',
    parent.section === 'math'
      ? 'Math: write math as $...$ LaTeX. Fill specType with "solve", "eval" or "system" and the matching fields so a computer can re-solve it; fill choiceValues with each choice as a plain arithmetic expression.'
      : 'Reading and Writing: write an original passage of 25 to 150 words about an invented researcher, work or place (never a real published text). Use the official College Board question wording for this skill. Fill specType "tags", one distinct tag per choice, and "want" with the correct choice\'s tag.',
  ].join('\n');
}

export type AiOutcome = { candidate: Candidate | null; notice?: string };
/** Asks the model for a candidate. A null candidate means "fall back to local"; the notice says why. */
export async function aiCandidate(settings: AiSettings, parent: Question, mode: RemixMode, level: RemixLevel, fetchImpl: typeof fetch = fetch): Promise<AiOutcome> {
  if (!aiReady(settings)) return { candidate: null, notice: 'AI generation is off, so Stellify used its built-in generators.' };
  if (usedToday() >= DAILY_CAP) return { candidate: null, notice: `The daily AI limit (${DAILY_CAP}) is reached, so Stellify used its built-in generators.` };
  try {
    const res = await fetchImpl(`${API}/models/${encodeURIComponent(settings.geminiModel || 'gemini-flash-latest')}:generateContent`, {
      method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': settings.geminiKey! },
      body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt(parent, mode, level) }] }], generationConfig: { temperature: 0.7, maxOutputTokens: 2000, responseMimeType: 'application/json', responseSchema: SCHEMA } }),
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) return { candidate: null, notice: res.status === 429 ? 'The free AI quota is resting, so Stellify used its built-in generators.' : `The AI service returned status ${res.status}, so Stellify used its built-in generators.` };
    bumpUsage();
    const data = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
    const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
    let parsed: unknown;
    try { parsed = JSON.parse(text); } catch { return { candidate: null, notice: 'The AI reply was not valid structured data, so Stellify used its built-in generators.' }; }
    const c = parseAi(parsed, parent, mode, level);
    return c ? { candidate: c } : { candidate: null, notice: 'The AI reply was missing required parts, so Stellify used its built-in generators.' };
  } catch {
    return { candidate: null, notice: 'The AI service could not be reached, so Stellify used its built-in generators.' };
  }
}
