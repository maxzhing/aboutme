import type { AppState, Question, SkillId } from '../types';
import { DIFFICULTY_NAME, SKILL } from '../taxonomy';
import { LETTERS, correctAnswerLabel, isCorrect, parseNumeric } from '../answers';
import { LESSON } from '@/data/lessons';
import { GRAMMAR } from '@/data/grammar';
import { REFERENCE } from '@/data/reference';
import { VOCAB } from '@/data/vocabulary';
import { computeSkillStats, MASTERY_LEVELS } from './mastery';
import { CATEGORY_LABEL, ERROR_CATEGORIES } from './mistakes';
import { findWeaknesses } from './adaptive';

export const TUTOR_MODES = [
  { id: 'teach', label: 'Teach Me', hint: 'Walk me through this step by step' },
  { id: 'hint', label: 'Give Me a Hint', hint: 'A nudge, not the answer' },
  { id: 'mistake', label: 'Explain My Mistake', hint: 'Why was my answer wrong?' },
  { id: 'fastest', label: 'Show the Fastest Method', hint: 'The most efficient reliable approach' },
  { id: 'socratic', label: 'Socratic Mode', hint: 'Ask me questions until I get it' },
  { id: 'challenge', label: 'Challenge Me', hint: 'Give me something harder' },
  { id: 'scratch', label: 'Explain the Concept From Scratch', hint: 'Assume I know nothing' },
] as const;
export type TutorMode = (typeof TUTOR_MODES)[number]['id'] | 'ask';

export interface TutorContext {
  mode: TutorMode;
  message?: string;
  question?: Question;
  /** the student's latest answer to this question, if any */
  answer?: string | null;
  /** how many hints have already been given in this thread */
  hintsGiven?: number;
  /** which Socratic step the student is on */
  socraticStep?: number;
  state: AppState;
  bank: Question[];
  getQ: (id: string) => Question | undefined;
}
export interface TutorReply { text: string; links?: { label: string; href: string }[]; hintsGiven?: number; socraticStep?: number }

const lessonLink = (skill: SkillId) => ({ label: `Lesson: ${SKILL[skill].short}`, href: `/learn/${skill}` });
const practiceLink = (skill: SkillId) => ({ label: `Practice ${SKILL[skill].short}`, href: `/practice/session?mode=skill&skill=${skill}&n=6` });
const numbered = (steps: string[]) => steps.map((s, i) => `${i + 1}. ${s}`).join('\n');

function whyForAnswer(q: Question, answer: string | null | undefined): string | null {
  if (answer == null || answer === '') return null;
  if (q.type === 'mcq') { const i = Number(answer); return q.why[i] ? `You chose ${LETTERS[i]}. ${q.why[i]}` : null; }
  const v = parseNumeric(answer);
  const hit = q.why.find((w) => { const m = w.match(/^\$?(-?[\d.,/\\{}a-z]+)\$?\s+—/i); if (!m) return false; const k = parseNumeric(m[1].replace(/[$,]/g, '').replace(/\\frac\{(\d+)\}\{(\d+)\}/, '$1/$2')); return v !== null && k !== null && Math.abs(v - k) < 1e-6; });
  return hit ? `You entered ${answer}. ${hit.replace(/^.*?—\s*/, 'That value: ')}` : `You entered ${answer}, which does not match. Compare your work with the steps below to find where it diverges.`;
}

/**
 * Deterministic tutor. Everything it says about a question comes from that question's validated
 * data (steps, per-choice rationales, concept, strategy, trap), the lesson for its skill and the
 * student's own history. It never invents an answer; if it has nothing grounded to say, it says so.
 */
export function offlineTutor(c: TutorContext): TutorReply {
  const q = c.question;
  const answered = q && c.answer != null && c.answer !== '';
  const lesson = q ? LESSON[q.skill] : undefined;

  if (!q) return askGeneral(c);

  const stats = computeSkillStats(q.skill, c.state.attempts, c.getQ);
  const personal = stats.n >= 3 ? `\n\nYour record in ${SKILL[q.skill].short}: ${stats.correct}/${stats.n} correct (${MASTERY_LEVELS[stats.level]}). ${stats.next}` : '';

  switch (c.mode) {
    case 'hint': {
      const i = Math.min(2, c.hintsGiven ?? 0);
      const label = ['Hint 1 — the idea', 'Hint 2 — the strategy', 'Hint 3 — almost there'][i];
      return { text: `**${label}**\n${q.hints[i]}${i < 2 ? '\n\nAsk again if you want a stronger hint.' : '\n\nThat is the last hint. Try the final step, then check the explanation.'}`, hintsGiven: i + 1 };
    }
    case 'teach': {
      if (!answered) {
        const body = q.steps.slice(0, -1);
        return { text: `**What this question tests**\n${q.concept}\n\n**How to approach it**\n${q.strategy}\n\n**Getting started**\n${numbered(body.length ? body : q.steps.slice(0, 1))}\n\nTake the last step yourself, then submit. I will go through the full solution once you have answered.`, links: [lessonLink(q.skill)] };
      }
      return { text: `**Concept**\n${q.concept}\n\n**Step by step**\n${numbered(q.steps)}\n\n**Correct answer:** ${correctAnswerLabel(q)}\n\n**Remember**\n${q.remember}${personal}`, links: [lessonLink(q.skill), practiceLink(q.skill)] };
    }
    case 'mistake': {
      if (!answered) return { text: 'Answer the question first and I will explain exactly what went wrong (or confirm what went right).' };
      if (isCorrect(q, c.answer!)) return { text: `Your answer is correct. ${q.type === 'mcq' ? q.why[q.answer as number] : q.steps[q.steps.length - 1]}\n\n**Worth remembering**\n${q.remember}` };
      const m = c.state.mistakes[q.id];
      const cat = m ? ERROR_CATEGORIES.find((e) => e.id === m.category) : undefined;
      return {
        text: `**What happened**\n${whyForAnswer(q, c.answer) ?? 'Your answer does not match the key.'}\n\n**The trap in this question**\n${q.trap}\n\n**The correct reasoning**\n${numbered(q.steps)}\n\n**Correct answer:** ${correctAnswerLabel(q)}${cat ? `\n\n**Pattern:** this was logged as “${CATEGORY_LABEL[cat.id]}.” ${cat.tip}` : ''}${m && m.count > 1 ? `\n\nYou have missed this question ${m.count} times. Redo it tomorrow and add two related questions to clear it from your Mistake Bucket.` : ''}`,
        links: [lessonLink(q.skill), practiceLink(q.skill)],
      };
    }
    case 'fastest':
      return { text: `**Fastest reliable method**\n${q.strategy}${q.desmos ? `\n\n**With Desmos**\n${q.desmos}` : ''}${q.alt ? `\n\n**Another way**\n${q.alt}` : ''}\n\n**Why speed is safe here**\n${q.remember}\n\nTarget time for a ${DIFFICULTY_NAME[q.difficulty].toLowerCase()} question like this: about ${q.time} seconds.` };
    case 'socratic': {
      const i = c.socraticStep ?? 0;
      if (i === 0) return { text: `Let's reason it out together. Before any calculation or elimination: in your own words, what is this question asking you to find, and what information matters most?`, socraticStep: 1 };
      const idx = i - 1;
      if (idx >= q.steps.length) return { text: `You have worked through every step. ${answered ? `The answer is ${correctAnswerLabel(q)}.` : 'Now choose your answer and submit it.'}\n\n**Takeaway**\n${q.remember}`, socraticStep: i };
      const last = idx === q.steps.length - 1;
      const prompt = last ? 'Does that match what you concluded?' : idx === 0 ? 'Given that, what would you do next, and why?' : 'What follows from that?';
      if (last && !answered) return { text: `Good. You have everything you need. Decide on your answer and submit it; then I will confirm the final step.`, socraticStep: i };
      return { text: `Compare your thinking with this:\n\n> ${q.steps[idx]}\n\n${prompt}`, socraticStep: i + 1 };
    }
    case 'challenge': {
      const order = ['medium', 'hard', 'very-hard'];
      const done = new Set(c.state.attempts.filter((a) => a.correct).map((a) => a.qid));
      const harder = c.bank.filter((x) => x.skill === q.skill && x.id !== q.id && !done.has(x.id))
        .sort((a, b) => order.indexOf(b.difficulty) - order.indexOf(a.difficulty))[0]
        ?? c.bank.filter((x) => x.domain === q.domain && x.id !== q.id && !done.has(x.id) && x.difficulty === 'very-hard')[0];
      if (!harder) return { text: `You have already answered every other ${SKILL[q.skill].short} question correctly. Try the Hardest Questions set for a mixed challenge.`, links: [{ label: 'Hardest questions', href: `/practice/session?mode=hard&section=${q.section}&n=8` }] };
      return { text: `Here is a ${DIFFICULTY_NAME[harder.difficulty].toLowerCase()} question on the same skill (${harder.sub}). Try it without hints, and aim for under ${harder.time} seconds.`, links: [{ label: 'Open the challenge question', href: `/practice/session?mode=single&ids=${harder.id}` }] };
    }
    case 'scratch':
      return { text: conceptFromScratch(q.skill), links: [lessonLink(q.skill), practiceLink(q.skill)] };
    default: {
      const msg = (c.message ?? '').trim();
      const letter = msg.match(/\b(?:choice|option|answer)?\s*\(?([A-D])\)?\b(?!\w)/);
      if (q.type === 'mcq' && letter && /why|wrong|right|correct|not/i.test(msg)) {
        const i = LETTERS.indexOf(letter[1]);
        if (!answered && i === q.answer) return { text: 'I will not confirm or rule out a specific choice before you answer. Ask for a hint, or submit your answer and I will explain every choice.' };
        return { text: `**Choice ${letter[1]}**\n${q.why[i]}` };
      }
      if (/answer|solution|solve|explain/i.test(msg) && !answered) return { text: `I can guide you without giving the answer away.\n\n**Start here**\n${q.hints[0]}\n\nAsk for another hint, or submit an answer for the full explanation.`, hintsGiven: 1 };
      if (/desmos|calculator|graph/i.test(msg)) return { text: q.desmos ? `**With Desmos**\n${q.desmos}` : `This question is solved more reliably by reasoning than with the calculator.\n\n${q.strategy}` };
      if (/trap|trick|careful/i.test(msg)) return { text: `**Common trap**\n${q.trap}` };
      if (answered) return { text: `**Concept**\n${q.concept}\n\n**Solution**\n${numbered(q.steps)}\n\n**Correct answer:** ${correctAnswerLabel(q)}`, links: [lessonLink(q.skill)] };
      const g = askGeneral(c);
      return g.text.startsWith('I could not find') ? { text: `Here is the idea behind this question:\n\n${q.concept}\n\n${lesson ? lesson.intro : ''}`, links: [lessonLink(q.skill)] } : g;
    }
  }
}

function conceptFromScratch(skill: SkillId): string {
  const l = LESSON[skill];
  const ex = l.examples[0];
  return `**${SKILL[skill].name}, from the beginning**\n${l.intro}\n\n${l.detail[0]}\n\n**The rules that matter most**\n${l.rules.slice(0, 4).map((x) => `• ${x}`).join('\n')}\n\n**Worked example**\n${ex.q}\n→ ${ex.a}\n\n**Watch out for**\n• ${l.mistakes[0]}`;
}

const tokens = (s: string) => s.toLowerCase().replace(/[^a-z0-9' ]+/g, ' ').split(/\s+/).filter((t) => t.length > 2 && !STOP.has(t));
const STOP = new Set(['the', 'and', 'for', 'what', 'how', 'why', 'when', 'does', 'are', 'with', 'this', 'that', 'can', 'you', 'use', 'about', 'tell', 'explain', 'help', 'need', 'from', 'have', 'into', 'which', 'should', 'would', 'between', 'difference', 'mean', 'means']);

/** Free-form questions with no question attached: answer from lessons, grammar rules, the reference sheet and vocabulary. */
function askGeneral(c: TutorContext): TutorReply {
  const msg = (c.message ?? '').trim();
  if (!msg || /^(hi|hello|hey)\b/i.test(msg) || /what (should|do) i (study|work|practice)|weak|recommend|next/i.test(msg)) {
    const w = findWeaknesses(c.state, c.getQ, 3);
    if (!w.length) return { text: 'I do not have enough of your practice history yet to spot weaknesses. Try the diagnostic or a Smart Practice set, and I will tailor advice to your results. You can also ask me about any rule, formula or word.', links: [{ label: 'Start Smart Practice', href: '/practice/session?mode=smart&n=10' }] };
    return { text: `Based on your practice so far, these are your biggest opportunities:\n\n${w.map((x) => `• ${SKILL[x.skill].name}: ${x.accuracy}% over ${x.n} questions`).join('\n')}\n\nStart with the first lesson, then do a short focused set.`, links: w.flatMap((x) => [lessonLink(x.skill)]).concat(practiceLink(w[0].skill)) };
  }
  const qt = tokens(msg);
  const vocab = VOCAB.find((v) => new RegExp(`\\b${v.w}\\b`, 'i').test(msg));
  if (vocab) return { text: `**${vocab.w}** (${vocab.pos}): ${vocab.def}.\n\n“${vocab.ex}”\n\nSimilar: ${vocab.syn.join(', ')}.${vocab.nuance ? `\n\nNuance: ${vocab.nuance}` : ''}`, links: [{ label: 'Vocabulary center', href: '/vocabulary' }] };
  type Hit = { score: number; text: string; links: { label: string; href: string }[] };
  const hits: Hit[] = [];
  const score = (hay: string, w = 1) => { const h = hay.toLowerCase(); return qt.reduce((s, t) => s + (h.includes(t) ? w : 0), 0); };
  for (const g of GRAMMAR) {
    const s = score(g.title, 3) + score(g.rule) + score(g.subs.join(' '), 2);
    if (s > 0) hits.push({ score: s, text: `**${g.title}**\n${g.rule}\n\nWhy: ${g.why}\n\n✓ ${g.correct[0]}\n✗ ${g.incorrect[0]}\n\nSAT tip: ${g.sat}\nTrap: ${g.trap}`, links: [{ label: 'Grammar Masterclass', href: `/grammar#${g.id}` }, practiceLink(g.skill)] });
  }
  for (const e of REFERENCE) {
    const s = score(e.title, 3) + score(e.body) + score(e.cat, 1);
    if (s > 0) hits.push({ score: s, text: `**${e.title}** (${e.cat})\n${e.body}`, links: [{ label: 'Reference sheet', href: `/reference#${e.id}` }] });
  }
  for (const k of Object.values(SKILL)) {
    const l = LESSON[k.id];
    const s = score(k.name, 3) + score(k.topics.join(' '), 2) + score(l.intro);
    if (s > 0) hits.push({ score: s + 0.5, text: conceptFromScratch(k.id), links: [lessonLink(k.id), practiceLink(k.id)] });
  }
  hits.sort((a, b) => b.score - a.score);
  if (!hits.length || hits[0].score < 2) return { text: 'I could not find that in Stellify\'s lessons or reference material, and I will not guess. Try naming the topic (for example "semicolons", "discriminant", "margin of error"), or open a question and ask about it directly.', links: [{ label: 'Browse the curriculum', href: '/learn' }] };
  return { text: hits[0].text, links: hits[0].links };
}
