import { llm } from '../llm/index.js';
import { renderPrompt, systemPrompt } from '../prompts.js';
import { courseSchema, practiceSchema } from '../schemas/index.js';
import { coerce, normaliseQuestionIds, inspectQuestions } from './validate.js';
import { buildProfile, profileContext } from './profile.js';
import { sourceBlocks, sourceContext } from './sources.js';
import { courseReadiness, pathToScore, pacing, nextBestAction } from './readiness.js';
import {
  saveCourse,
  getCourse,
  listCourses,
  upsertConcept,
  listConcepts,
  dueConcepts,
  listExamResults,
  recordExamResult,
  saveResource,
  logEvent,
} from '../store.js';
import { logger } from '../util/log.js';

const log = logger('course');

/**
 * Generate a course blueprint and register every concept in it, so the mastery
 * engine starts tracking the whole syllabus from day one rather than only the
 * parts the learner happens to ask about.
 */
export async function createCourse({ learnerId, request, subject, level, examDate, instructions, sourceIds = [], onPartial }) {
  const profile = buildProfile(learnerId);

  const { object } = await llm().run({
    label: 'course-blueprint',
    system: [{ text: systemPrompt(), cache: true }],
    messages: [
      {
        role: 'user',
        content: [
          ...sourceBlocks(sourceIds, learnerId),
          {
            type: 'text',
            text: renderPrompt('course', {
              request,
              subject: subject || '(infer it)',
              level: level || '(infer it)',
              exam_date: examDate || '(none given)',
              instructions: instructions || '(none)',
              learner_context: profileContext(profile),
              source_context: sourceContext(sourceIds, learnerId),
            }),
          },
        ],
      },
    ],
    schema: courseSchema,
    effort: 'high',
    maxTokens: 32000,
    onPartial,
  });

  const blueprint = normaliseBlueprint(coerce(object, courseSchema));

  const course = saveCourse(learnerId, {
    title: blueprint.title,
    exam: blueprint.exam,
    subject: blueprint.subject,
    level: blueprint.level,
    exam_date: examDate || null,
    blueprint,
    state: { targetScore: topScore(blueprint), minutesPerDay: 60, sourceIds },
  });

  // Every concept in the syllabus becomes a tracked concept immediately.
  for (const unit of blueprint.units) {
    for (const concept of unit.concepts) {
      upsertConcept(learnerId, { name: concept.name, subject: blueprint.subject || 'General' });
    }
  }

  logEvent(learnerId, 'course_created', {
    courseId: course.id,
    title: blueprint.title,
    units: blueprint.units.length,
    concepts: blueprint.units.reduce((n, u) => n + u.concepts.length, 0),
  });
  log.info(`course "${blueprint.title}" — ${blueprint.units.length} units, ${blueprint.units.reduce((n, u) => n + u.concepts.length, 0)} concepts`);

  return course;
}

/** The highest score the exam reports — the default target. */
function topScore(blueprint) {
  return (blueprint.score_bands || []).reduce((best, band) => Math.max(best, band.score || 0), 5);
}

/**
 * Exam weights are the whole basis of the readiness model, so they are
 * normalised to sum to 100 rather than trusted blindly.
 */
function normaliseBlueprint(blueprint) {
  const units = (blueprint.units || [])
    .filter((unit) => unit.title)
    .map((unit, i) => ({ ...unit, idx: unit.idx || i + 1 }))
    .sort((a, b) => a.idx - b.idx);

  const total = units.reduce((sum, unit) => sum + (Number(unit.exam_weight_percent) || 0), 0);
  if (total > 0 && Math.abs(total - 100) > 0.5) {
    for (const unit of units) {
      unit.exam_weight_percent = Number(((Number(unit.exam_weight_percent) || 0) * 100) / total).toFixed(2) * 1;
    }
    log.debug(`normalised unit weights from ${total.toFixed(1)}% to 100%`);
  } else if (total === 0 && units.length) {
    const even = Number((100 / units.length).toFixed(2));
    for (const unit of units) unit.exam_weight_percent = even;
  }

  const bands = (blueprint.score_bands || []).slice().sort((a, b) => b.score - a.score);
  return { ...blueprint, units, score_bands: bands };
}

/* ------------------------------------------------------------- readiness */

/** Assemble everything the course view needs, in one pass over the learner model. */
export function courseSnapshot(learnerId, courseId, { now = new Date() } = {}) {
  const course = getCourse(courseId);
  if (!course || course.learner_id !== learnerId) return null;

  const concepts = listConcepts(learnerId);
  // If a legacy duplicate exists for a name, the row carrying the evidence wins.
  const byName = new Map();
  for (const concept of concepts) {
    const key = concept.name.toLowerCase();
    const held = byName.get(key);
    if (!held || (concept.attempts ?? 0) > (held.attempts ?? 0)) byName.set(key, concept);
  }
  const lookup = (name) => byName.get(String(name).toLowerCase());

  const examResults = listExamResults(courseId);
  const readiness = courseReadiness({ blueprint: course.blueprint, conceptLookup: lookup, examResults, now });
  const targetScore = course.state?.targetScore ?? topScore(course.blueprint);
  const path = pathToScore(readiness, targetScore);
  const pace = pacing(readiness, {
    examDate: course.exam_date,
    minutesPerDay: course.state?.minutesPerDay ?? 60,
    now,
  });
  const due = dueConcepts(learnerId, now.toISOString()).filter((c) =>
    course.blueprint.units?.some((u) => u.concepts?.some((x) => x.name.toLowerCase() === c.name.toLowerCase())),
  );

  const action = nextBestAction({
    readiness,
    pace,
    dueCount: due.length,
    examTaken: examResults.length > 0,
    targetScore,
  });

  return {
    course: {
      id: course.id,
      title: course.title,
      exam: course.exam,
      subject: course.subject,
      level: course.level,
      exam_date: course.exam_date,
      overview: course.blueprint.overview,
      exam_format: course.blueprint.exam_format,
      total_hours: course.blueprint.total_hours,
      state: course.state,
      created_at: course.created_at,
    },
    readiness,
    targetScore,
    path,
    pace,
    dueCount: due.length,
    action,
    history: examResults.map((r) => ({ at: r.created_at, percent: r.percent, score: r.score })),
    units: course.blueprint.units.map((unit) => {
      const measured = readiness.units.find((u) => u.idx === unit.idx);
      return {
        idx: unit.idx,
        title: unit.title,
        summary: unit.summary,
        exam_weight: unit.exam_weight_percent,
        hours: unit.hours,
        expected: measured?.expected ?? 0,
        confidence: measured?.confidence ?? 0,
        points_available: measured?.points_available ?? 0,
        concepts: measured?.concepts ?? [],
        exam_traps: unit.exam_traps || [],
      };
    }),
  };
}

export const listCoursesFor = (learnerId) =>
  listCourses(learnerId).map((course) => ({
    id: course.id,
    title: course.title,
    exam: course.exam,
    subject: course.subject,
    exam_date: course.exam_date,
    units: (course.blueprint.units || []).length,
    updated_at: course.updated_at,
  }));

/* ---------------------------------------------------------- full exams */

/**
 * A full practice paper built to the course's own blueprint: the same sections,
 * counts, question types and unit weighting as the real thing, so the score it
 * produces means something.
 */
export async function generateExam({ learnerId, courseId, onPartial }) {
  const course = getCourse(courseId);
  if (!course || course.learner_id !== learnerId) throw new Error('Course not found');

  const blueprint = course.blueprint;
  const profile = buildProfile(learnerId);
  const format = blueprint.exam_format || {};
  const sections = format.sections?.length ? format.sections : [{ name: 'Paper', question_type: 'multiple_choice', count: 12, minutes: 40, weight_percent: 100 }];

  // Scale the paper down to something sittable while keeping unit proportions.
  const totalRealQuestions = sections.reduce((n, s) => n + (s.count || 0), 0);
  const target = Math.min(24, Math.max(10, Math.round(totalRealQuestions / 4)));

  const allocation = blueprint.units
    .map((unit) => ({
      title: unit.title,
      weight: unit.exam_weight_percent,
      questions: Math.max(1, Math.round((target * unit.exam_weight_percent) / 100)),
      concepts: unit.concepts.map((c) => c.name),
    }))
    .filter((u) => u.weight > 0);

  const instructions = [
    `This is a scaled-down but faithful mock of ${blueprint.exam || blueprint.title}.`,
    `Mirror the real paper's structure: ${sections.map((s) => `${s.name} — ${s.question_type}, worth ${s.weight_percent}%`).join('; ')}.`,
    '',
    'Distribute questions across units in exam proportion:',
    ...allocation.map((u) => `- ${u.title} (${u.weight}% of the paper): ${u.questions} question(s), drawn from ${u.concepts.slice(0, 6).join(', ')}`),
    '',
    'Write questions at the difficulty the real exam asks at, not at revision difficulty.',
    'Include the traps the real examiners use. Set each question\'s `concept` to the concept name it tests, exactly as written above, so the result can be scored by unit.',
    'Use `sections` to group the questions the way the real paper does.',
  ].join('\n');

  const { object } = await llm().run({
    label: 'course-exam',
    system: [{ text: systemPrompt(), cache: true }],
    messages: [
      {
        role: 'user',
        content: renderPrompt('practice', {
          kind: 'test',
          topic: blueprint.title,
          subject: blueprint.subject,
          level: blueprint.level,
          difficulty: 4,
          count: target,
          minutes: Math.min(120, format.total_minutes || 90),
          types: sections.map((s) => s.question_type).join(', '),
          concepts: allocation.flatMap((u) => u.concepts).slice(0, 40).join(', '),
          instructions,
          learner_context: profileContext(profile),
          source_context: '',
        }),
      },
    ],
    schema: practiceSchema,
    effort: 'high',
    maxTokens: 40000,
    onPartial,
  });

  const payload = coerce(object, practiceSchema);
  payload.questions = normaliseQuestionIds(payload.questions || []);
  payload.kind = 'test';
  payload.course_id = courseId;

  const defects = inspectQuestions(payload.questions, { difficulty: 4 }).filter((p) =>
    ['wrong_answer', 'no_correct_choice'].includes(p.issue),
  );
  if (defects.length) {
    const broken = new Set(defects.map((d) => d.question_id));
    payload.questions = payload.questions.filter((q) => !broken.has(q.id));
    log.warn(`dropped ${broken.size} defective exam question(s)`);
  }

  const resource = saveResource(learnerId, {
    kind: 'test',
    title: `${blueprint.exam || blueprint.title} — practice paper`,
    subject: blueprint.subject,
    topic: blueprint.title,
    difficulty: 4,
    payload,
    max_score: payload.questions.reduce((sum, q) => sum + (Number(q.points) || 1), 0),
  });

  logEvent(learnerId, 'exam_generated', { courseId, resourceId: resource.id, questions: payload.questions.length });
  return resource;
}

/**
 * Score a completed practice paper by unit and store it, so the readiness
 * model is calibrated against a real result rather than only its own estimate.
 */
export function recordExam({ learnerId, courseId, resource, results }) {
  const course = getCourse(courseId);
  if (!course || course.learner_id !== learnerId) return null;

  const questions = resource.payload?.questions || [];
  const unitOf = new Map();
  for (const unit of course.blueprint.units || []) {
    for (const concept of unit.concepts || []) unitOf.set(concept.name.toLowerCase(), unit);
  }

  const byUnit = {};
  let earned = 0;
  let possible = 0;

  for (const question of questions) {
    const result = results.find((r) => r.questionId === question.id);
    const points = Number(question.points) || 1;
    const score = result?.grade?.score || 0;
    earned += score;
    possible += points;

    const unit = unitOf.get(String(question.concept || '').toLowerCase());
    const key = unit ? unit.title : 'Unassigned';
    byUnit[key] ||= { earned: 0, possible: 0, exam_weight: unit?.exam_weight_percent ?? 0 };
    byUnit[key].earned += score;
    byUnit[key].possible += points;
  }

  const percent = possible ? earned / possible : 0;
  const band = (course.blueprint.score_bands || [])
    .slice()
    .sort((a, b) => b.min_percent - a.min_percent)
    .find((b) => percent * 100 >= b.min_percent);

  recordExamResult(learnerId, {
    course_id: courseId,
    resource_id: resource.id,
    percent,
    score: band?.score ?? null,
    by_unit: byUnit,
  });
  logEvent(learnerId, 'exam_scored', { courseId, percent, score: band?.score });

  return { percent, score: band?.score ?? null, byUnit };
}

export { courseReadiness, pathToScore, pacing, nextBestAction };
