import { llm } from '../llm/index.js';
import { renderPrompt, systemPrompt } from '../prompts.js';
import { gradeSchema } from '../schemas/index.js';
import { coerce } from './validate.js';
import { buildProfile, profileContext } from './profile.js';
import { applyEvidence, computeMasteryLevel, evidenceKindFor, MASTERY_LABELS } from './mastery.js';
import { updateAbility, nextDifficulty, recommendStrategy } from './difficulty.js';
import { scheduleReview } from './review.js';
import { deterministicVerdict } from '../util/answers.js';
import {
  upsertConcept,
  saveConcept,
  recordAttempt,
  noteMisconception,
  resolveMisconceptions,
  conceptAttempts,
  recentAttempts,
  logEvent,
} from '../store.js';
import { logger } from '../util/log.js';

const log = logger('evaluate');

/**
 * Grade one answer and fold the result into the learner model.
 *
 * Correctness is decided deterministically wherever that is exact (a keyed
 * multiple choice, a numeric answer inside tolerance). The model is still
 * asked — but for the part only it can do: *why* the answer went wrong, and
 * what should happen next.
 */
export async function evaluateAnswer({
  learnerId,
  sessionId = null,
  resourceId = null,
  question,
  answer,
  attemptNumber = 1,
  elapsedMs = null,
  subject = 'General',
  profile: providedProfile,
}) {
  const profile = providedProfile || buildProfile(learnerId);
  const certain = deterministicVerdict(question, answer);
  const points = Number(question.points) || 1;

  const { object } = await llm().run({
    label: 'grade',
    system: [{ text: systemPrompt(), cache: true }],
    messages: [
      {
        role: 'user',
        content: renderPrompt('grade', {
          type: question.type,
          concept: question.concept,
          difficulty: question.difficulty,
          points,
          context: question.context || '(none)',
          prompt: question.prompt,
          choices: (question.choices || []).map((c) => `${c.key}. ${c.text}`).join('\n') || '(not multiple choice)',
          answer: question.answer,
          accepted: (question.accepted || []).join(' | ') || '(none)',
          tolerance: question.tolerance ?? '(none)',
          units: question.units || '(none)',
          rubric: (question.rubric || []).map((r) => `${r.points} pts — ${r.criterion}`).join('\n') || '(none)',
          solution: question.solution,
          student_answer: String(answer ?? '').slice(0, 8000),
          attempt_number: attemptNumber,
          seconds: elapsedMs ? Math.round(elapsedMs / 1000) : 'unknown',
          learner_context: profileContext(profile, { focusConcepts: [question.concept] }),
        }),
      },
    ],
    schema: gradeSchema,
    effort: 'medium',
    maxTokens: 4000,
  });

  const grade = coerce(object, gradeSchema);

  // Where we *know* the answer, the deterministic verdict wins over the model's.
  if (certain === true) {
    grade.verdict = 'correct';
    grade.score = points;
    grade.error_type = 'none';
    grade.misconception = '';
  } else if (certain === false && grade.verdict === 'correct') {
    grade.verdict = 'incorrect';
    grade.score = 0;
    if (grade.error_type === 'none') grade.error_type = 'conceptual';
  }
  grade.max_score = points;
  grade.score = Math.max(0, Math.min(points, Number(grade.score) || 0));

  const ratio = points ? grade.score / points : 0;
  // The question's concept is authoritative. The model may paraphrase it in
  // `grade.concept`, and trusting that would file the attempt against a
  // freshly-invented concept — silently detaching it from the syllabus the
  // course is tracking.
  const conceptName = question.concept || grade.concept || 'General';
  grade.concept = conceptName;
  const concept = upsertConcept(learnerId, { name: conceptName, subject });

  const evidence = evidenceKindFor(question);
  const withEvidence = applyEvidence(concept, {
    ratio,
    difficulty: Number(question.difficulty) || 3,
    errorType: grade.error_type,
    evidence,
  });
  withEvidence.ability = updateAbility(concept, { ratio, difficulty: Number(question.difficulty) || 3 });
  withEvidence.last_seen_at = new Date().toISOString();

  const history = conceptAttempts(concept.id, 40);
  const retentionOk = hasRetention(history, ratio >= 0.8);
  const masteryCheckPassed = ratio >= 0.8 && Number(question.difficulty) >= 4 && evidence === 'transfer';

  withEvidence.mastery_level = computeMasteryLevel(
    { ...withEvidence, mastery_level: Math.max(1, concept.mastery_level) },
    { retentionOk, masteryCheckPassed },
  );
  Object.assign(withEvidence, scheduleReview(withEvidence, ratio));

  const updated = saveConcept(withEvidence);

  recordAttempt(learnerId, {
    resource_id: resourceId,
    session_id: sessionId,
    question_id: question.id,
    concept_id: concept.id,
    concept_name: conceptName,
    prompt: question.prompt?.slice(0, 500),
    answer: String(answer ?? '').slice(0, 4000),
    verdict: grade.verdict,
    score: grade.score,
    max_score: points,
    difficulty: Number(question.difficulty) || 3,
    error_type: grade.error_type,
    misconception: grade.misconception || null,
    feedback: { feedback: grade.feedback, next_move: grade.next_move },
    elapsed_ms: elapsedMs,
  });

  if (grade.misconception && grade.error_type !== 'none') {
    noteMisconception(learnerId, {
      conceptId: concept.id,
      label: grade.misconception.slice(0, 160),
      detail: grade.feedback?.slice(0, 400),
      errorType: grade.error_type,
    });
  }
  if (updated.mastery_level >= 5) resolveMisconceptions(learnerId, concept.id);

  const recent = recentAttempts(learnerId, 12).filter((a) => a.concept_id === concept.id);
  const strategy = recommendStrategy(recent);
  const nextLevel = nextDifficulty(updated, {
    streak: updated.streak,
    lastErrorType: grade.error_type,
  });

  logEvent(learnerId, 'attempt_graded', {
    concept: conceptName,
    verdict: grade.verdict,
    errorType: grade.error_type,
    mastery: updated.mastery_level,
  });
  log.debug(`${conceptName}: ${grade.verdict} (${grade.error_type}) → level ${updated.mastery_level}, next difficulty ${nextLevel}`);

  return {
    grade,
    concept: updated,
    masteryLabel: MASTERY_LABELS[updated.mastery_level],
    next: { difficulty: nextLevel, strategy: strategy.strategy, reason: strategy.reason },
  };
}

/**
 * Retention: a concept only counts as retained when it has been answered
 * correctly at least ~a day after the first correct attempt — you cannot reach
 * mastery inside a single sitting.
 */
function hasRetention(history, currentCorrect) {
  const correct = history.filter((a) => (a.score ?? 0) / (a.max_score || 1) >= 0.8);
  if (!correct.length) return false;
  const first = new Date(correct[correct.length - 1].created_at).getTime();
  const latest = currentCorrect ? Date.now() : new Date(correct[0].created_at).getTime();
  return latest - first >= 20 * 3600 * 1000;
}

/** Grade a whole submitted resource, question by question. */
export async function evaluateSubmission({ learnerId, resource, answers, sessionId = null, elapsed = {} }) {
  const payload = resource.payload || {};
  const questions = payload.questions || payload.self_test || payload.checks || [];
  const profile = buildProfile(learnerId);
  const results = [];

  for (const question of questions) {
    const answer = answers[question.id];
    if (answer == null || String(answer).trim() === '') {
      results.push({
        questionId: question.id,
        skipped: true,
        grade: {
          verdict: 'unscorable',
          score: 0,
          max_score: Number(question.points) || 1,
          error_type: 'incomplete',
          feedback: 'Left blank — attempt it and you will get feedback on your reasoning.',
          misconception: '',
          what_went_right: '',
          reveal_solution: false,
          rubric_scores: [],
          concept: question.concept,
          mastery_signal: 'not_yet',
          next_move: 'same_level',
        },
      });
      continue;
    }
    const outcome = await evaluateAnswer({
      learnerId,
      sessionId,
      resourceId: resource.id,
      question,
      answer,
      elapsedMs: elapsed[question.id] ?? null,
      subject: resource.subject || 'General',
      profile,
    });
    results.push({ questionId: question.id, ...outcome });
  }

  const score = results.reduce((sum, r) => sum + (r.grade?.score || 0), 0);
  const maxScore = questions.reduce((sum, q) => sum + (Number(q.points) || 1), 0);

  return { results, score, maxScore, questions };
}
