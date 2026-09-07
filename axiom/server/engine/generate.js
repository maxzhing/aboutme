import { llm } from '../llm/index.js';
import { config } from '../config.js';
import { renderPrompt, systemPrompt } from '../prompts.js';
import {
  lessonSchema,
  practiceSchema,
  studyGuideSchema,
  flashcardSchema,
  planSchema,
  qcSchema,
} from '../schemas/index.js';
import { buildProfile, profileContext } from './profile.js';
import { coerce, validate, inspectQuestions, normaliseQuestionIds } from './validate.js';
import { sourceBlocks, sourceContext } from './sources.js';
import { saveResource, upsertConcept, logEvent } from '../store.js';
import { logger } from '../util/log.js';

const log = logger('generate');

/** Every resource kind the engine can build, and how it is built. */
export const RESOURCE_KINDS = {
  lesson: { schema: lessonSchema, prompt: 'lesson', family: 'lesson' },
  practice_set: { schema: practiceSchema, prompt: 'practice', family: 'practice' },
  worksheet: { schema: practiceSchema, prompt: 'practice', family: 'practice' },
  quiz: { schema: practiceSchema, prompt: 'practice', family: 'practice' },
  test: { schema: practiceSchema, prompt: 'practice', family: 'practice' },
  homework: { schema: practiceSchema, prompt: 'practice', family: 'practice' },
  exam_prep: { schema: practiceSchema, prompt: 'practice', family: 'practice' },
  problem_set: { schema: practiceSchema, prompt: 'practice', family: 'practice' },
  diagnostic: { schema: practiceSchema, prompt: 'practice', family: 'practice' },
  mastery_check: { schema: practiceSchema, prompt: 'practice', family: 'practice' },
  review: { schema: practiceSchema, prompt: 'practice', family: 'practice' },
  project: { schema: practiceSchema, prompt: 'practice', family: 'practice' },
  lab: { schema: practiceSchema, prompt: 'practice', family: 'practice' },
  coding_exercise: { schema: practiceSchema, prompt: 'practice', family: 'practice' },
  essay_prompt: { schema: practiceSchema, prompt: 'practice', family: 'practice' },
  saq: { schema: practiceSchema, prompt: 'practice', family: 'practice' },
  dbq: { schema: practiceSchema, prompt: 'practice', family: 'practice' },
  leq: { schema: practiceSchema, prompt: 'practice', family: 'practice' },
  study_guide: { schema: studyGuideSchema, prompt: 'study_guide', family: 'study_guide' },
  flashcards: { schema: flashcardSchema, prompt: 'flashcards', family: 'flashcards' },
  plan: { schema: planSchema, prompt: 'plan', family: 'plan' },
};

/**
 * What makes a DBQ a DBQ rather than a quiz with long answers. These are
 * appended to the learner's own instructions, never shown to them.
 */
const KIND_BRIEFS = {
  project: [
    'This is a PROJECT brief, not a question set. Produce 1-3 items: a build/investigate task with a',
    'clear deliverable, staged milestones in `context`, and a rubric that a teacher could mark against.',
    'Use type "free_response" and make the rubric the real specification.',
  ],
  lab: [
    'This is a LAB ACTIVITY. Give the aim, apparatus and method in `context`, then items that require',
    'predicting, recording, analysing and evaluating — including one on sources of error and one that',
    'asks what the result would be if a stated variable changed. Type "free_response" with rubrics.',
  ],
  coding_exercise: [
    'These are CODING exercises. Each `context` carries any starter code or signature; the prompt states',
    'the required behaviour and the edge cases that must be handled. Type "coding". `solution` must be a',
    'complete, working implementation with the reasoning behind it. Rubrics score correctness, edge-case',
    'handling and clarity separately.',
  ],
  essay_prompt: [
    'These are ESSAY prompts. Each states a genuinely arguable claim, names the scope, and carries a',
    'rubric covering thesis, evidence, analysis and structure. Type "essay". `solution` is a model',
    'outline with the line of argument, not a finished essay.',
  ],
  saq: [
    'These are AP-style SHORT ANSWER QUESTIONS. Each has parts (a), (b), (c) in one prompt, each part',
    'worth one point and demanding a specific historical example — no general commentary. Where a',
    'stimulus is used, put it in `context`. Type "free_response"; the rubric must state exactly what',
    'earns each point, and `solution` must model a scoring answer for each part.',
  ],
  dbq: [
    'This is a DOCUMENT-BASED QUESTION. Put a numbered set of short primary-source excerpts in `context`',
    '(attributed, varied in viewpoint), then a single prompt requiring a thesis supported by the',
    'documents plus outside evidence. Type "essay". The rubric must follow the standard DBQ points:',
    'thesis, contextualisation, evidence from the documents, outside evidence, sourcing, complexity.',
  ],
  leq: [
    'This is a LONG ESSAY QUESTION. One prompt requiring a defensible thesis across a stated period,',
    'with a rubric for thesis, contextualisation, evidence, analysis and complexity. Type "essay".',
    '`solution` is a model outline with the argument and the evidence it rests on.',
  ],
};

const DEFAULT_COUNTS = {
  practice_set: 6,
  worksheet: 10,
  quiz: 8,
  test: 15,
  homework: 8,
  exam_prep: 12,
  problem_set: 8,
  diagnostic: 3,
  mastery_check: 5,
  review: 6,
  flashcards: 12,
  project: 1,
  lab: 5,
  coding_exercise: 4,
  essay_prompt: 3,
  saq: 3,
  dbq: 1,
  leq: 1,
};

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/**
 * Generate one educational resource, quality-check it, and persist it.
 * This is the single entry point behind every "make me a ..." in the product.
 */
export async function generateResource(options) {
  const {
    learnerId,
    kind,
    topic,
    subject = 'General',
    level = '',
    concepts = [],
    instructions = '',
    sourceIds = [],
    sessionId = null,
    onPartial,
    profile: providedProfile,
  } = options;

  const spec = RESOURCE_KINDS[kind];
  if (!spec) throw new Error(`Unknown resource kind: ${kind}`);

  const profile = providedProfile || buildProfile(learnerId);
  const difficulty = clamp(Number(options.difficulty) || suggestedDifficulty(profile, concepts), 1, 5);
  const count = clamp(Number(options.count) || DEFAULT_COUNTS[kind] || 6, 1, 40);
  const minutes = clamp(Number(options.minutes) || 20, 3, 600);
  const days = clamp(Number(options.days) || 7, 1, 60);

  const vars = {
    kind,
    topic,
    subject,
    level: level || profile.learner?.prefs?.level || 'infer from the learner model',
    difficulty,
    count,
    minutes,
    days,
    goal: options.goal || topic,
    exam_context: options.examContext || '',
    types: (options.types && options.types.length ? options.types : ['a mix appropriate to the subject']).join(', '),
    concepts: concepts.length ? concepts.join(', ') : topic,
    instructions: [KIND_BRIEFS[kind]?.join('\n'), instructions].filter(Boolean).join('\n\n'),
    learner_context: profileContext(profile, { focusConcepts: concepts }),
    source_context: sourceContext(sourceIds, learnerId),
  };

  const userBlocks = [
    ...sourceBlocks(sourceIds, learnerId),
    { type: 'text', text: renderPrompt(spec.prompt, vars) },
  ];

  const started = Date.now();
  const { object } = await llm().run({
    label: `generate:${kind}`,
    system: [{ text: systemPrompt(), cache: true }],
    messages: [{ role: 'user', content: userBlocks }],
    schema: spec.schema,
    effort: spec.family === 'practice' || spec.family === 'lesson' ? 'high' : 'medium',
    maxTokens: estimateTokens(spec.family, count),
    onPartial: onPartial ? (partial) => onPartial(shape(partial, kind, spec)) : undefined,
  });

  let payload = coerce(object, spec.schema);
  const structural = validate(payload, spec.schema);
  if (structural.length) log.warn(`${kind}: ${structural.length} structural issues after coercion`, structural.slice(0, 3));

  if (payload.questions) payload.questions = normaliseQuestionIds(payload.questions);
  if (payload.self_test) payload.self_test = normaliseQuestionIds(payload.self_test);
  if (payload.checks) payload.checks = normaliseQuestionIds(payload.checks);

  const qc = await qualityControl({ payload, kind, spec, vars, learnerId, sourceIds });
  payload = qc.payload;

  const resource = saveResource(learnerId, {
    session_id: sessionId,
    kind,
    title: payload.title || topic,
    subject,
    topic,
    difficulty,
    payload: { ...payload, kind, quality: qc.report },
    status: 'ready',
    max_score: totalPoints(payload),
  });

  for (const name of conceptNames(payload, concepts, topic)) {
    upsertConcept(learnerId, { name, subject });
  }
  logEvent(learnerId, 'resource_generated', { kind, topic, resourceId: resource.id, ms: Date.now() - started });
  log.info(`${kind} "${payload.title}" generated in ${Date.now() - started}ms (${qc.report.checked} checked, ${qc.report.repaired} repaired)`);

  return resource;
}

function shape(partial, kind, spec) {
  if (!partial || typeof partial !== 'object') return null;
  return { ...partial, kind, family: spec.family };
}

function estimateTokens(family, count) {
  if (family === 'practice') return clamp(3000 + count * 900, 6000, 60000);
  if (family === 'lesson') return 20000;
  if (family === 'plan') return 24000;
  if (family === 'flashcards') return clamp(2000 + count * 220, 6000, 32000);
  return 20000;
}

function totalPoints(payload) {
  const questions = payload.questions || payload.self_test || payload.checks || [];
  const total = questions.reduce((sum, q) => sum + (Number(q.points) || 1), 0);
  return total || null;
}

function conceptNames(payload, requested, topic) {
  const names = new Set(requested.filter(Boolean));
  for (const c of payload.concepts || []) if (typeof c === 'string') names.add(c);
  for (const p of payload.priorities || []) if (p?.concept) names.add(p.concept);
  for (const q of payload.questions || []) if (q?.concept) names.add(q.concept);
  if (!names.size && topic) names.add(topic);
  return [...names].filter((n) => n && n.length < 80).slice(0, 12);
}

function suggestedDifficulty(profile, concepts) {
  const relevant = profile.concepts.filter((c) =>
    concepts.some((n) => n && c.name.toLowerCase() === String(n).toLowerCase()),
  );
  if (!relevant.length) return 3;
  const mean = relevant.reduce((sum, c) => sum + c.ability, 0) / relevant.length;
  return clamp(Math.round((mean + 0.35) * 2) / 2, 1, 5);
}

/* ------------------------------------------------------------ quality control */

/**
 * Two gates before a learner sees anything: deterministic structural checks,
 * then an independent model pass that re-solves every question. Defects that
 * can be fixed in place are fixed; the rest are regenerated once.
 */
export async function qualityControl({ payload, kind, spec, vars, learnerId, sourceIds }) {
  const report = { checked: 0, repaired: 0, dropped: 0, issues: [], ran: false };
  const listKey = payload.questions ? 'questions' : payload.self_test ? 'self_test' : null;
  if (!listKey || !payload[listKey]?.length) return { payload, report };

  let questions = payload[listKey];
  report.checked = questions.length;

  let problems = inspectQuestions(questions, { difficulty: vars.difficulty });

  if (config.qualityControl) {
    report.ran = true;
    try {
      const { object } = await llm().run({
        label: `qc:${kind}`,
        system: [{ text: systemPrompt(), cache: true }],
        messages: [
          {
            role: 'user',
            content: renderPrompt('qc', {
              material: JSON.stringify({ title: payload.title, questions }, null, 1),
              topic: vars.topic,
              level: vars.level,
              difficulty: vars.difficulty,
            }),
          },
        ],
        schema: qcSchema,
        effort: 'medium',
        maxTokens: 8000,
      });
      const found = coerce(object, qcSchema).problems || [];
      problems = dedupeProblems([...problems, ...found]);
    } catch (err) {
      log.warn(`qc pass failed, falling back to structural checks only: ${err.message}`);
    }
  }

  if (!problems.length) return { payload, report };
  report.issues = problems;

  // In-place repairs: a wrong answer key with a stated correction is cheap to fix.
  const stillBroken = [];
  for (const problem of problems) {
    const index = questions.findIndex((q) => q.id === problem.question_id);
    if (index === -1) continue;
    if (problem.corrected_answer && problem.issue === 'wrong_answer') {
      questions[index] = { ...questions[index], answer: problem.corrected_answer };
      report.repaired++;
    } else {
      stillBroken.push({ ...problem, index });
    }
  }

  if (stillBroken.length) {
    const indexes = [...new Set(stillBroken.map((p) => p.index))];
    const regenerated = await regenerateQuestions({
      vars,
      kind,
      learnerId,
      sourceIds,
      broken: indexes.map((i) => ({ question: questions[i], defects: stillBroken.filter((p) => p.index === i) })),
    });
    indexes.forEach((questionIndex, n) => {
      const replacement = regenerated[n];
      if (replacement) {
        questions[questionIndex] = { ...replacement, id: questions[questionIndex].id };
        report.repaired++;
      }
    });

    // Anything still failing the deterministic checks is dropped rather than shipped.
    const recheck = inspectQuestions(questions, { difficulty: vars.difficulty });
    const fatal = new Set(
      recheck
        .filter((p) => ['wrong_answer', 'no_correct_choice', 'multiple_correct'].includes(p.issue))
        .map((p) => p.question_id),
    );
    if (fatal.size && questions.length - fatal.size >= 1) {
      questions = questions.filter((q) => !fatal.has(q.id));
      report.dropped = fatal.size;
    }
  }

  return { payload: { ...payload, [listKey]: questions }, report };
}

function dedupeProblems(problems) {
  const seen = new Set();
  return problems.filter((p) => {
    const key = `${p.question_id}|${p.issue}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function regenerateQuestions({ vars, kind, learnerId, sourceIds, broken }) {
  const instructions = [
    'REGENERATION PASS. The questions below failed quality control. Write replacements.',
    'Return exactly ' + broken.length + ' question(s), in the same order, fixing the stated defects.',
    'Keep the same concept and difficulty for each. Solve each one yourself before writing the answer.',
    '',
    ...broken.map(
      ({ question, defects }, i) =>
        `--- Replacement ${i + 1} ---\nConcept: ${question.concept}\nDifficulty: ${question.difficulty}\nType: ${question.type}\n` +
        `Original: ${question.prompt}\nDefects: ${defects.map((d) => `${d.issue} — ${d.detail}`).join(' | ')}`,
    ),
  ].join('\n');

  try {
    const { object } = await llm().run({
      label: `qc-repair:${kind}`,
      system: [{ text: systemPrompt(), cache: true }],
      messages: [
        {
          role: 'user',
          content: [
            ...sourceBlocks(sourceIds, learnerId),
            {
              type: 'text',
              text: renderPrompt('practice', { ...vars, count: broken.length, instructions }),
            },
          ],
        },
      ],
      // Always regenerate through the practice schema: we are replacing
      // questions, whatever family the parent resource belongs to.
      schema: practiceSchema,
      effort: 'high',
      maxTokens: 4000 + broken.length * 1200,
    });
    return coerce(object, practiceSchema).questions || [];
  } catch (err) {
    log.warn(`regeneration failed: ${err.message}`);
    return [];
  }
}
