/**
 * JSON schemas for every structured generation.
 *
 * Structured outputs constrain the model to these shapes, so the frontend can
 * render real components instead of dumping prose. Schemas are written in the
 * strict style (every property required, `additionalProperties: false`);
 * "optional" fields are expressed as nullable types or empty arrays.
 */

const str = (description, extra = {}) => ({ type: 'string', description, ...extra });
const nullableStr = (description) => ({ type: ['string', 'null'], description });
const num = (description, extra = {}) => ({ type: 'number', description, ...extra });
const int = (description, extra = {}) => ({ type: 'integer', description, ...extra });
const bool = (description) => ({ type: 'boolean', description });
const arr = (items, description) => ({ type: 'array', items, description });
const enumOf = (values, description) => ({ type: 'string', enum: values, description });

/** Strict object: all declared properties required, no extras. */
function obj(properties, description) {
  return {
    type: 'object',
    description,
    properties,
    required: Object.keys(properties),
    additionalProperties: false,
  };
}

/* ------------------------------------------------------------------ shared */

export const QUESTION_TYPES = [
  'multiple_choice',
  'true_false',
  'short_answer',
  'numeric',
  'free_response',
  'fill_blank',
  'coding',
  'essay',
  'scenario',
  'proof',
];

export const EVIDENCE_KINDS = ['recall', 'explain', 'solve', 'apply', 'transfer'];

const choice = obj(
  {
    key: str('Single uppercase letter: A, B, C, D...'),
    text: str('Choice text. Plausible distractors only — no joke options.'),
  },
  'One multiple-choice option.',
);

const rubricRow = obj(
  {
    criterion: str('What earns this point, stated so a grader could apply it consistently.'),
    points: num('Points available for this criterion.'),
  },
  'One rubric line.',
);

export const question = obj(
  {
    id: str('Stable id, e.g. "q1".'),
    type: enumOf(QUESTION_TYPES, 'Question format.'),
    concept: str('The single concept this question tests, in 1-5 words.'),
    difficulty: num('1 = easiest recall, 5 = hardest transfer/synthesis.', {
      minimum: 1,
      maximum: 5,
    }),
    evidence: enumOf(EVIDENCE_KINDS, 'What a correct answer proves the learner can do.'),
    context: str('Stimulus the question depends on (passage, data, code, scenario). "" if none.'),
    prompt: str('The question itself, in Markdown. LaTeX in $...$ / $$...$$ where useful.'),
    choices: arr(choice, 'Options for multiple_choice / true_false. Empty array otherwise.'),
    answer: str('The correct answer. For multiple_choice this is the choice key only (e.g. "B").'),
    accepted: arr(str('An alternative form of the correct answer that should be marked right.'), 'Equivalent accepted answers. Empty if none.'),
    tolerance: {
      type: ['number', 'null'],
      description: 'Absolute numeric tolerance for numeric answers, else null.',
    },
    units: str('Expected units for numeric answers, "" if not applicable.'),
    points: num('Points this question is worth.'),
    rubric: arr(rubricRow, 'Rubric for free_response/essay/proof/coding. Empty for auto-gradable items.'),
    solution: str('Complete worked solution in Markdown — the reasoning, not just the answer.'),
    hints: arr(str('A hint.'), 'Graduated hints, smallest nudge first, at most 3. Never the answer.'),
    estimated_seconds: int('Realistic solving time in seconds.'),
  },
  'A single generated question.',
);

const diagramNode = obj(
  {
    id: str('Short id used by edges.'),
    label: str('Node label, kept short.'),
    detail: str('One-line elaboration, "" if none.'),
    group: str('Optional grouping/colour key, "" if none.'),
  },
  'Diagram node.',
);

const diagramEdge = obj(
  {
    from: str('Source node id.'),
    to: str('Target node id.'),
    label: str('Edge label, "" if none.'),
  },
  'Diagram edge.',
);

export const diagram = obj(
  {
    type: enumOf(
      ['flow', 'cycle', 'concept_map', 'timeline', 'bar', 'function_graph', 'comparison'],
      'Diagram family. Choose the one that actually clarifies the idea.',
    ),
    title: str('Diagram title.'),
    caption: str('What the learner should notice in it.'),
    nodes: arr(diagramNode, 'Nodes for flow / cycle / concept_map. Empty otherwise.'),
    edges: arr(diagramEdge, 'Edges for flow / cycle / concept_map. Empty otherwise.'),
    items: arr(
      obj(
        {
          when: str('Time label / stage name.'),
          label: str('What happens.'),
          detail: str('Why it matters, "" if none.'),
        },
        'Timeline entry.',
      ),
      'Entries for timeline. Empty otherwise.',
    ),
    series: arr(
      obj({ label: str('Category.'), value: num('Magnitude.') }, 'Bar entry.'),
      'Bars for bar charts. Empty otherwise.',
    ),
    points: arr(
      obj({ x: num('x value.'), y: num('y value.'), label: str('Point label, "" if none.') }, 'Plot point.'),
      'Points for function_graph, in x order. Empty otherwise.',
    ),
    columns: arr(str('Column header.'), 'Headers for comparison tables. Empty otherwise.'),
    rows: arr(arr(str('Cell.'), 'Row cells.'), 'Rows for comparison tables. Empty otherwise.'),
    x_label: str('X axis label, "" if none.'),
    y_label: str('Y axis label, "" if none.'),
  },
  'A diagram that earns its place — never decoration.',
);

const block = obj(
  {
    kind: enumOf(
      ['concept', 'intuition', 'analogy', 'example', 'steps', 'warning', 'misconception', 'diagram', 'code', 'table', 'summary'],
      'Block role in the lesson.',
    ),
    heading: str('Short heading.'),
    markdown: str('Body in Markdown. "" when the block is carried by its structured field.'),
    steps: arr(
      obj({ title: str('Step name.'), detail: str('What happens in this step and why.') }, 'One step.'),
      'Ordered steps for `steps` blocks. Empty otherwise.',
    ),
    diagram: { anyOf: [diagram, { type: 'null' }], description: 'Diagram for `diagram` blocks, else null.' },
    code: {
      anyOf: [
        obj(
          {
            language: str('Language id, e.g. "java".'),
            source: str('The code.'),
            explanation: str('What to look at in it.'),
          },
          'Code sample.',
        ),
        { type: 'null' },
      ],
      description: 'Code for `code` blocks, else null.',
    },
    table: {
      anyOf: [
        obj(
          {
            columns: arr(str('Header.'), 'Column headers.'),
            rows: arr(arr(str('Cell.'), 'Row.'), 'Rows.'),
          },
          'Table.',
        ),
        { type: 'null' },
      ],
      description: 'Table for `table` blocks, else null.',
    },
  },
  'One unit of explanation.',
);

/* ------------------------------------------------------------------- intake */

export const routeSchema = obj(
  {
    understood: str("One sentence, addressed to the learner, showing you understood the request."),
    intent: enumOf(
      [
        'learn', 'practice', 'quiz', 'test', 'worksheet', 'homework', 'review',
        'exam_prep', 'crash_course', 'explore', 'plan', 'flashcards', 'study_guide', 'diagnose',
      ],
      'The learning experience that should actually be built.',
    ),
    mode: enumOf(
      ['learn', 'practice', 'quiz', 'master', 'homework', 'review', 'exam_prep', 'crash_course', 'explore'],
      'Teaching mode to run the session in.',
    ),
    title: str('Short session title, max 6 words.'),
    subject: str('Broad subject, e.g. "Physics", "Spanish", "Computer Science".'),
    course_level: str('Course/level if inferable, e.g. "AP Physics 1", "Year 9", "" if unclear.'),
    topic: str('The specific topic.'),
    concepts: arr(str('A single teachable concept name, 1-5 words.'), 'Concepts this breaks into, ordered by teaching order. 1-8 of them.'),
    prerequisites: arr(str('A prerequisite concept name.'), 'Concepts that must already be solid. Empty if none.'),
    goal: enumOf(
      ['understand', 'memorise', 'master', 'test_prep', 'homework_help', 'review', 'practice', 'apply', 'from_scratch', 'advance'],
      'What the learner actually wants out of this.',
    ),
    estimated_level: str('Your estimate of their current level in one short phrase.'),
    difficulty: num('Starting difficulty 1-5.', { minimum: 1, maximum: 5 }),
    time_minutes: int('Minutes available for this session. Infer if unstated.'),
    horizon_days: int('Days until the deadline that matters, 0 if none.'),
    needs_diagnostic: bool('True when a 2-3 question probe would change how you teach this.'),
    diagnostic_reason: str('Why the probe is worth the time, or "" if not needed.'),
    clarifying_question: nullableStr(
      'One short question to ask ONLY if the request is genuinely unteachable without it. Prefer null and a sensible assumption.',
    ),
    assumption: str('The assumption you are proceeding on if you did not ask. "" if you asked.'),
    opening_note: str('2-4 sentences to the learner: what you will do and why, in that order. No filler.'),
  },
  'Analysis of a learning request.',
);

/* --------------------------------------------------------------- tutor turn */

export const tutorTurnSchema = obj(
  {
    // `say` is first so it streams first.
    say: str(
      'What the tutor says now, in Markdown. Concise. End by putting the learner to work unless you are giving feedback on something they just did.',
    ),
    intent: enumOf(
      ['diagnose', 'teach', 'demonstrate', 'probe', 'feedback', 'reteach', 'assess', 'advance', 'plan', 'wrap_up'],
      'What this turn is doing in the teaching loop.',
    ),
    activity: {
      anyOf: [
        obj(
          {
            instructions: str('What the learner must do, in one line.'),
            question: question,
          },
          'The thing the learner must now do.',
        ),
        { type: 'null' },
      ],
      description: 'A question or task for the learner, or null when this turn is pure feedback.',
    },
    blocks: arr(block, 'Explanation blocks for this turn. Keep to 0-3; this is a conversation, not a textbook.'),
    focus_concept: str('The concept currently being worked on.'),
    difficulty: num('Difficulty of the current activity, 1-5.', { minimum: 1, maximum: 5 }),
    strategy_note: str('One line, for the learner, on why you are teaching it this way now. "" if not useful.'),
    mastery_signal: enumOf(
      ['unknown', 'not_yet', 'developing', 'competent', 'strong', 'mastered'],
      'Your read on where they are with focus_concept right now.',
    ),
    suggestions: arr(
      obj(
        {
          label: str('Button label, max 4 words.'),
          action: enumOf(
            ['harder', 'easier', 'practice_set', 'worksheet', 'quiz', 'explain_more', 'worked_example', 'next_concept', 'flashcards', 'study_guide', 'plan'],
            'What the button should do.',
          ),
        },
        'A next-step suggestion.',
      ),
      'At most 3 genuinely useful next steps.',
    ),
  },
  'One turn from the tutor.',
);

/* ---------------------------------------------------------------- resources */

export const lessonSchema = obj(
  {
    title: str('Lesson title.'),
    subject: str('Subject.'),
    topic: str('Topic.'),
    level: str('Who this is pitched at.'),
    objectives: arr(str('A specific, checkable objective starting with a verb.'), '2-5 learning objectives.'),
    concepts: arr(str('Concept name.'), 'Concepts covered, in teaching order.'),
    difficulty: num('1-5.', { minimum: 1, maximum: 5 }),
    estimated_minutes: int('Realistic reading + working time.'),
    hook: str('2-3 sentences that make the learner want to know this. No throat-clearing.'),
    blocks: arr(block, 'The lesson body. Build understanding in order.'),
    checks: arr(question, '2-4 checkpoint questions embedded in the lesson.'),
    common_mistakes: arr(
      obj(
        {
          mistake: str('What learners get wrong.'),
          why: str('The reasoning that leads them there.'),
          fix: str('The correction, stated so it sticks.'),
        },
        'A predictable mistake.',
      ),
      '2-4 mistakes specific to this material.',
    ),
    summary: str('The lesson in 3-5 bullet lines of Markdown.'),
    next_steps: arr(str('What to do next.'), '2-3 concrete next steps.'),
  },
  'A generated lesson.',
);

export const practiceSchema = obj(
  {
    title: str('Title of the set.'),
    kind: enumOf(
      [
        'practice_set', 'worksheet', 'quiz', 'test', 'homework', 'exam_prep', 'problem_set',
        'diagnostic', 'mastery_check', 'review', 'project', 'lab', 'coding_exercise',
        'essay_prompt', 'saq', 'dbq', 'leq',
      ],
      'What kind of assessment this is.',
    ),
    subject: str('Subject.'),
    topic: str('Topic.'),
    level: str('Level it is pitched at.'),
    instructions: str('Instructions for the learner.'),
    objectives: arr(str('Objective.'), 'What this set is measuring.'),
    difficulty: num('Mean difficulty, 1-5.', { minimum: 1, maximum: 5 }),
    estimated_minutes: int('Realistic completion time.'),
    sections: arr(
      obj(
        {
          title: str('Section title.'),
          instructions: str('Section instructions, "" if none.'),
          question_ids: arr(str('Question id in this section.'), 'Ids, in order.'),
        },
        'A section.',
      ),
      'Sections for multi-part worksheets/tests. Empty for a flat set.',
    ),
    questions: arr(question, 'The questions. Difficulty must rise across the set.'),
    answer_key_note: str('Anything a grader needs to know beyond the per-question solutions. "" if nothing.'),
  },
  'A generated practice set, worksheet, quiz or test.',
);

export const studyGuideSchema = obj(
  {
    title: str('Study guide title.'),
    subject: str('Subject.'),
    topic: str('Topic.'),
    exam_context: str('What it is preparing them for, "" if general.'),
    difficulty: num('1-5.', { minimum: 1, maximum: 5 }),
    estimated_minutes: int('Time to work through it.'),
    priorities: arr(
      obj(
        {
          concept: str('Concept name.'),
          why: str('Why it is this high on the list for THIS learner.'),
          status: enumOf(['weak', 'shaky', 'solid'], 'Where they currently stand.'),
        },
        'A prioritised concept.',
      ),
      'Ordered by what will move their score most.',
    ),
    blocks: arr(block, 'Condensed explanations of the priority material.'),
    key_terms: arr(
      obj({ term: str('Term.'), definition: str('Definition in one or two lines.') }, 'A key term.'),
      'Terms worth memorising.',
    ),
    formulas: arr(
      obj({ name: str('Name.'), expression: str('LaTeX or plain expression.'), when: str('When to reach for it.') }, 'A formula.'),
      'Formulas/rules. Empty if the subject has none.',
    ),
    self_test: arr(question, '4-8 self-test questions covering the priorities.'),
    summary: str('Final revision checklist as Markdown bullets.'),
  },
  'A personalised study guide.',
);

export const flashcardSchema = obj(
  {
    title: str('Deck title.'),
    subject: str('Subject.'),
    topic: str('Topic.'),
    cards: arr(
      obj(
        {
          id: str('Stable id.'),
          front: str('Prompt side. A real retrieval cue, not a heading.'),
          back: str('Answer side. Complete but tight.'),
          hint: str('Hint, "" if none.'),
          concept: str('Concept it belongs to.'),
          difficulty: num('1-5.', { minimum: 1, maximum: 5 }),
        },
        'A flashcard.',
      ),
      'The deck. One idea per card.',
    ),
  },
  'A generated flashcard deck.',
);

export const planSchema = obj(
  {
    title: str('Plan title.'),
    subject: str('Subject.'),
    goal: str('The outcome this plan delivers.'),
    horizon_days: int('Number of days the plan spans.'),
    minutes_per_day: int('Assumed daily study time.'),
    rationale: str('Why this ordering, in 2-4 sentences, referencing what they already know.'),
    milestones: arr(
      obj({ label: str('Milestone.'), day: int('Day index it lands on, 1-based.') }, 'A milestone.'),
      'Checkpoints across the plan.',
    ),
    days: arr(
      obj(
        {
          day: int('1-based day index.'),
          focus: str('The single focus for the day.'),
          concepts: arr(str('Concept name.'), 'Concepts touched.'),
          minutes: int('Planned minutes.'),
          activities: arr(
            obj(
              {
                type: enumOf(
                  ['lesson', 'practice_set', 'worksheet', 'quiz', 'test', 'review', 'flashcards', 'study_guide', 'mastery_check'],
                  'Resource to generate for this activity.',
                ),
                title: str('Activity title.'),
                detail: str('What the learner does and what "done" looks like.'),
                minutes: int('Minutes for this activity.'),
              },
              'A single activity.',
            ),
            'Activities for the day, in order.',
          ),
          checkpoint: str('How they will know the day worked. "" if none.'),
        },
        'One day of the plan.',
      ),
      'The day-by-day plan.',
    ),
  },
  'A multi-day learning plan.',
);

/* ---------------------------------------------------------------- grading */

export const gradeSchema = obj(
  {
    verdict: enumOf(['correct', 'partial', 'incorrect', 'unscorable'], 'Overall judgement.'),
    score: num('Points earned.'),
    max_score: num('Points available.'),
    error_type: enumOf(
      ['none', 'conceptual', 'prerequisite_gap', 'procedure', 'reasoning', 'transfer', 'vocabulary', 'memory', 'misread', 'calculation', 'careless', 'incomplete'],
      'Why it was wrong. "none" when correct. Be precise — this drives what happens next.',
    ),
    misconception: str(
      'The specific false belief or slipped step, stated in one line ("treats velocity as a scalar"). "" when correct.',
    ),
    what_went_right: str('What their work genuinely got right. "" only if nothing did.'),
    feedback: str(
      'Markdown feedback to the learner. Do NOT restate the full solution for a first wrong attempt — point at the exact step that broke and ask them to fix it.',
    ),
    reveal_solution: bool('True only when they have already had a real chance to self-correct.'),
    rubric_scores: arr(
      obj({ criterion: str('Criterion.'), earned: num('Points earned.'), note: str('Why.') }, 'Rubric line result.'),
      'Per-criterion scores for rubric items. Empty otherwise.',
    ),
    concept: str('The concept this attempt is evidence about.'),
    mastery_signal: enumOf(['not_yet', 'developing', 'competent', 'strong', 'mastered'], 'What this attempt shows.'),
    next_move: enumOf(
      ['advance', 'same_level', 'easier', 'reteach', 'backtrack_prerequisite', 'vary_surface', 'drill_step', 'timed_practice', 'move_on'],
      'What the tutor should do next.',
    ),
  },
  'Evaluation of one student answer.',
);

/* ------------------------------------------------------------------- QC */

export const qcSchema = obj(
  {
    verdict: enumOf(['pass', 'repair'], 'Whether the material is fit to show a learner.'),
    summary: str('One line on the overall quality.'),
    problems: arr(
      obj(
        {
          question_id: str('Id of the offending question, "" if it is a whole-resource issue.'),
          issue: enumOf(
            ['wrong_answer', 'ambiguous', 'duplicate', 'off_level', 'off_topic', 'broken_math', 'unsupported_claim', 'no_correct_choice', 'multiple_correct', 'bad_explanation', 'factual_error'],
            'What is wrong.',
          ),
          detail: str('What exactly is wrong.'),
          corrected_answer: str('The answer that IS correct, if the answer key is wrong. "" otherwise.'),
        },
        'A defect.',
      ),
      'Every defect found. Empty when the material is clean.',
    ),
  },
  'Quality-control review of generated material.',
);

/* -------------------------------------------------------------- insights */

export const insightsSchema = obj(
  {
    headline: str('One sentence the learner should read first. Specific, never generic praise.'),
    patterns: arr(
      obj(
        {
          observation: str('The pattern, quantified where possible.'),
          evidence: str('What in their history supports it.'),
          action: str('The single most useful thing to do about it.'),
          concept: str('Concept it concerns, "" if cross-cutting.'),
        },
        'A detected pattern.',
      ),
      '0-4 patterns. Say nothing rather than something obvious.',
    ),
    recommended: arr(
      obj(
        {
          title: str('What to do, as a button label.'),
          kind: enumOf(
            ['lesson', 'practice_set', 'worksheet', 'quiz', 'review', 'flashcards', 'study_guide', 'mastery_check'],
            'Resource to generate.',
          ),
          topic: str('Exact topic for it.'),
          why: str('Why this, now.'),
          minutes: int('Expected minutes.'),
        },
        'A recommended next activity.',
      ),
      '1-3 recommendations, most valuable first.',
    ),
  },
  'Proactive analysis of a learner’s history.',
);

/* ------------------------------------------------------- source analysis */

export const sourceSchema = obj(
  {
    title: str('What this document is.'),
    subject: str('Subject.'),
    topics: arr(str('Topic present in the document.'), 'Topics actually covered.'),
    concepts: arr(
      obj(
        {
          name: str('Concept name.'),
          summary: str('What the document says about it, in one or two lines.'),
          difficulty: num('1-5.', { minimum: 1, maximum: 5 }),
        },
        'A concept found in the source.',
      ),
      'Concepts extracted from the document, in document order.',
    ),
    level: str('Level the material is written at.'),
    summary: str('A 3-5 sentence summary of the document.'),
    suggested: arr(
      obj(
        {
          kind: enumOf(['lesson', 'study_guide', 'practice_set', 'worksheet', 'quiz', 'test', 'flashcards', 'plan'], 'Resource kind.'),
          title: str('Suggested title.'),
          why: str('Why this is the useful thing to build from this document.'),
        },
        'A suggested resource.',
      ),
      '2-4 suggestions.',
    ),
  },
  'Analysis of an uploaded learning source.',
);

/* --------------------------------------------------------------- courses */

export const courseSchema = obj(
  {
    title: str('Course title as a learner would name it.'),
    exam: str('The exam it prepares for, e.g. "AP Physics 1". "" if there is no external exam.'),
    subject: str('Subject.'),
    level: str('Level, e.g. "AP / first-year college".'),
    overview: str('3-4 sentences: what the course covers and what the exam actually rewards.'),
    total_hours: int('Realistic total study hours from a standing start.'),
    exam_format: obj(
      {
        total_minutes: int('Total exam length in minutes.'),
        description: str('How the paper is structured and marked, in 2-3 sentences.'),
        sections: arr(
          obj(
            {
              name: str('Section name, e.g. "Section I: Multiple Choice".'),
              question_type: enumOf(QUESTION_TYPES, 'Dominant question type in this section.'),
              count: int('Number of questions.'),
              minutes: int('Minutes allowed.'),
              weight_percent: num('Percent of the total score this section carries.'),
              notes: str('What this section actually tests, beyond content recall. "" if nothing to add.'),
            },
            'One exam section.',
          ),
          'The sections of the real paper, in order.',
        ),
      },
      'The shape of the real exam.',
    ),
    score_bands: arr(
      obj(
        {
          score: int('The reported score, e.g. 5.'),
          min_percent: num('Minimum percent of the total that typically earns this score.'),
          meaning: str('What this score means, in a few words.'),
        },
        'One score band.',
      ),
      'Score bands from highest to lowest. Use the exam’s real reporting scale (1-5 for AP, 1-7 for IB, a grade letter mapped to a number otherwise).',
    ),
    units: arr(
      obj(
        {
          idx: int('1-based unit number, in teaching order.'),
          title: str('Unit title.'),
          summary: str('What this unit is about, in one or two sentences.'),
          exam_weight_percent: num('Percent of the exam this unit is worth. Across all units these must sum to about 100.'),
          hours: int('Study hours this unit realistically needs.'),
          concepts: arr(
            obj(
              {
                name: str('A single teachable concept, 1-5 words.'),
                difficulty: num('1-5, the difficulty the exam asks this at.', { minimum: 1, maximum: 5 }),
                criticality: enumOf(
                  ['core', 'important', 'peripheral'],
                  'core = the exam cannot be passed without it; peripheral = occasionally worth a mark.',
                ),
                prerequisites: arr(str('Concept name that must come first.'), 'Prerequisite concepts. Empty if none.'),
              },
              'A concept in this unit.',
            ),
            'Concepts, in teaching order.',
          ),
          exam_traps: arr(
            obj({ trap: str('What examiners exploit here.'), fix: str('How to not fall for it.') }, 'An exam trap.'),
            '1-3 traps specific to this unit. Empty if none are worth naming.',
          ),
        },
        'One unit of the course.',
      ),
      'The whole course, in the order it should be taught.',
    ),
  },
  'A complete course blueprint with its exam weighting.',
);

export const RESOURCE_SCHEMAS = {
  lesson: lessonSchema,
  practice: practiceSchema,
  study_guide: studyGuideSchema,
  flashcards: flashcardSchema,
  plan: planSchema,
};
