import { llm } from '../llm/index.js';
import { renderPrompt, systemPrompt } from '../prompts.js';
import { tutorTurnSchema } from '../schemas/index.js';
import { coerce, normaliseQuestionIds } from './validate.js';
import { buildProfile, profileContext } from './profile.js';
import { sourceBlocks, sourceContext } from './sources.js';
import { evaluateAnswer } from './evaluate.js';
import { nextDifficulty } from './difficulty.js';
import { addMessage, listMessages, getSession, updateSession, logEvent } from '../store.js';
import { logger } from '../util/log.js';

const log = logger('tutor');

/** Directives the UI can send that are not the learner speaking. */
const DIRECTIVES = {
  hint: 'The learner pressed "I\'m stuck" and asked for a HINT. Give the smallest possible nudge — one sentence pointing at what to look at next. Do not reveal a step of the solution, and do not re-explain the concept. Keep the same activity open.',
  bigger_hint:
    'The learner asked for a BIGGER HINT. Reveal the next single reasoning step only, then hand the problem straight back. Do not finish it for them.',
  explain:
    'The learner asked for an EXPLANATION of the underlying idea. Re-teach the specific concept blocking them — using a different representation from the one you already used — then re-ask an equivalent question.',
  worked_example:
    'The learner asked for a WORKED EXAMPLE. Show a fully worked *similar* problem (not the one they are on), with every step justified, then hand them back their own problem.',
  start_over:
    'The learner asked to START OVER from the prerequisite. Drop down one level, check the prerequisite skill with a quick question, and rebuild from there.',
  harder:
    'The learner asked to MAKE IT HARDER. The next activity must be genuinely harder — more steps, an unfamiliar context, two concepts combined, or scaffolding removed. Changing the numbers is not harder.',
  easier:
    'The learner is struggling and asked to MAKE IT EASIER. Reduce the load: scaffold the steps, simplify the numbers or context, and rebuild confidence before climbing again.',
  next_concept:
    'Move to the next concept in the session plan. Say in one line why the current one is done.',
  explain_more: 'The learner wants more depth on what you just said. Go deeper, and keep it concrete.',
  mode_switch:
    'The learner has changed the teaching mode. Adopt the mode named in their message from this point on, say in one line what changes, and carry on from where the session stands. Do not grade or re-read their message as an answer to the open question.',
  continue: 'Continue the session from where it stands.',
};

function serialiseHistory(messages, limit = 12) {
  return messages
    .slice(-limit)
    .map((m) => {
      const body = m.body || {};
      if (m.role === 'user') return `LEARNER: ${String(body.text || '').slice(0, 1500)}`;
      const activity = body.activity?.question;
      return [
        `TUTOR (${body.intent || 'teach'}): ${String(body.say || '').slice(0, 1500)}`,
        activity ? `TUTOR ASKED: ${activity.prompt}${activity.choices?.length ? `\n${activity.choices.map((c) => `${c.key}. ${c.text}`).join('\n')}` : ''}` : '',
      ]
        .filter(Boolean)
        .join('\n');
    })
    .join('\n\n');
}

function serialiseEvaluation(outcome) {
  if (!outcome) return '';
  const { grade, concept, next } = outcome;
  return [
    '<evaluation of="the answer the learner just submitted">',
    `Verdict: ${grade.verdict} (${grade.score}/${grade.max_score})`,
    `Error type: ${grade.error_type}`,
    grade.misconception ? `Misconception: ${grade.misconception}` : '',
    grade.what_went_right ? `Got right: ${grade.what_went_right}` : '',
    `Concept "${concept.name}" is now level ${concept.mastery_level}/5, ability ${concept.ability.toFixed(1)}.`,
    `Recommended next move: ${grade.next_move}. Strategy: ${next.strategy} — ${next.reason}`,
    `Target difficulty for the next item: ${next.difficulty}.`,
    'Address this evaluation directly in your turn. Do not grade it again — explain and act on it.',
    '</evaluation>',
  ]
    .filter(Boolean)
    .join('\n');
}

/**
 * Run one turn of the adaptive teaching loop.
 *
 * If a question is open and the learner has answered it, the answer is graded
 * first and the grade is fed to the tutor, so the turn is a *response* to what
 * their answer revealed rather than a fresh monologue.
 */
export async function runTutorTurn({ learnerId, sessionId, input = '', directive = null, onPartial, onEvaluation }) {
  const session = getSession(sessionId);
  if (!session) throw new Error('Session not found');
  if (session.learner_id !== learnerId) throw new Error('Session not found');

  const state = session.state || {};
  const profile = buildProfile(learnerId);
  const messages = listMessages(sessionId);

  let evaluation = null;
  const answersOpenQuestion =
    state.pendingQuestion && input && input.trim() && !directive;

  if (answersOpenQuestion) {
    try {
      evaluation = await evaluateAnswer({
        learnerId,
        sessionId,
        question: state.pendingQuestion,
        answer: input,
        attemptNumber: state.attemptNumber || 1,
        elapsedMs: state.questionAskedAt ? Date.now() - state.questionAskedAt : null,
        subject: session.subject || 'General',
        profile,
      });
      if (onEvaluation) onEvaluation(evaluation);
    } catch (err) {
      log.warn(`grading the open question failed, continuing as conversation: ${err.message}`);
    }
  }

  addMessage(sessionId, 'user', {
    text: input,
    directive,
    answeredQuestionId: answersOpenQuestion ? state.pendingQuestion.id : null,
  });

  const directiveText = directive ? `<app_directive>${DIRECTIVES[directive] || DIRECTIVES.continue}</app_directive>` : '';
  const focusConcept = evaluation?.concept?.name || state.focusConcept || session.topic;
  const targetDifficulty = evaluation?.next?.difficulty ?? state.difficulty ?? session.plan?.difficulty ?? 3;
  const strategy = evaluation?.next
    ? `${evaluation.next.strategy} — ${evaluation.next.reason}`
    : `${profile.strategy.strategy} — ${profile.strategy.reason}`;

  const promptText = renderPrompt('tutor', {
    learner_context: profileContext(profile, { focusConcepts: [focusConcept] }),
    mode: session.mode,
    topic: session.topic || session.title,
    concepts: (session.plan?.concepts || []).join(', '),
    plan: session.plan?.opening_note || '',
    phase: state.phase || 'teach',
    difficulty: targetDifficulty,
    strategy,
    source_context: sourceContext(state.sourceIds || [], learnerId),
    history: serialiseHistory(messages),
    input: input || '(the learner did not type anything — act on the directive)',
    evaluation: [serialiseEvaluation(evaluation), directiveText].filter(Boolean).join('\n\n'),
  });

  const { object } = await llm().run({
    label: 'tutor-turn',
    system: [{ text: systemPrompt(), cache: true }],
    messages: [
      {
        role: 'user',
        content: [...sourceBlocks(state.sourceIds || [], learnerId), { type: 'text', text: promptText }],
      },
    ],
    schema: tutorTurnSchema,
    effort: 'high',
    maxTokens: 12000,
    onPartial: onPartial ? (partial) => onPartial(partial) : undefined,
  });

  const turn = coerce(object, tutorTurnSchema);
  if (turn.activity?.question) {
    turn.activity.question = normaliseQuestionIds([turn.activity.question])[0];
    if (!turn.activity.question.concept) turn.activity.question.concept = focusConcept;
  }

  addMessage(sessionId, 'tutor', turn);

  const repeatedQuestion =
    state.pendingQuestion && turn.activity?.question?.prompt === state.pendingQuestion.prompt;

  updateSession(sessionId, {
    state: {
      ...state,
      phase: phaseFor(turn.intent, state.phase),
      focusConcept: turn.focus_concept || focusConcept,
      difficulty: turn.difficulty || targetDifficulty,
      strategy: evaluation?.next?.strategy || state.strategy,
      turnCount: (state.turnCount || 0) + 1,
      pendingQuestion: turn.activity?.question || null,
      questionAskedAt: turn.activity?.question ? Date.now() : null,
      attemptNumber: repeatedQuestion ? (state.attemptNumber || 1) + 1 : 1,
      lastMastery: turn.mastery_signal,
    },
  });

  logEvent(learnerId, 'tutor_turn', { sessionId, intent: turn.intent, concept: turn.focus_concept });
  return { turn, evaluation };
}

function phaseFor(intent, current) {
  switch (intent) {
    case 'diagnose':
      return 'diagnose';
    case 'teach':
    case 'demonstrate':
    case 'reteach':
      return 'teach';
    case 'probe':
    case 'assess':
      return 'assess';
    case 'feedback':
      return 'adapt';
    case 'advance':
      return 'advance';
    case 'wrap_up':
      return 'complete';
    default:
      return current || 'teach';
  }
}

export function nextTargetDifficulty(concept) {
  return nextDifficulty(concept, { streak: concept?.streak || 0 });
}

export { DIRECTIVES };
