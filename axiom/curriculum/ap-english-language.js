import { c, u, apBands, course } from './kit.js';

/**
 * AP English Language is the one course here whose units are not weighted by
 * College Board: its nine units are a skill progression, not a content split,
 * and no per-unit exam percentage is published. Weighting them evenly would be
 * an invention. So the blueprint is built on the exam's own scored parts, whose
 * weights *are* published — 45% multiple choice split between reading and
 * writing questions, and three essays at 55% between them. That is also the
 * split a learner actually needs, because the three essays are three different
 * skills with three different rubrics.
 */
export default course({
  key: 'ap-english-language',
  title: 'AP English Language and Composition',
  exam: 'AP English Language and Composition',
  subject: 'English',
  level: 'AP / first-year college composition',
  aliases: ['ap english language', 'ap lang', 'ap english language and composition', 'ap english lang'],
  source: 'Derived from the published AP exam structure; College Board does not publish per-unit weights for this course.',
  overview:
    'Nonfiction rhetoric: reading arguments for how they work, and writing arguments that work. The exam is 45 multiple-choice questions split between reading passages and revising a draft, then three essays in 2 hours 15 minutes — synthesis, rhetorical analysis and argument. Each essay is marked out of 6 on the same shape of rubric: one point for a defensible thesis, four for evidence and commentary, one for sophistication. Commentary is where almost everyone loses marks: explaining how the evidence supports the claim, not just naming a device.',
  total_hours: 120,
  exam_format: {
    total_minutes: 195,
    description:
      'Section I is 45 multiple-choice questions in 60 minutes, worth 45%: roughly 23-25 reading questions across passages and 20-22 writing questions on revising a draft. Section II is three essays in 135 minutes including a 15-minute reading period, worth 55%: synthesis, rhetorical analysis and argument, each scored 0-6.',
    sections: [
      { name: 'Section I: Multiple Choice', question_type: 'mcq', count: 45, minutes: 60, weight_percent: 45, notes: 'Reading questions ask what a choice accomplishes; writing questions ask which revision best serves a stated purpose.' },
      { name: 'Section II Q1: Synthesis Essay', question_type: 'essay', count: 1, minutes: 40, weight_percent: 18.33, notes: 'Six sources provided. Take a position and use at least three of them as evidence for your argument, not as a summary.' },
      { name: 'Section II Q2: Rhetorical Analysis Essay', question_type: 'essay', count: 1, minutes: 40, weight_percent: 18.33, notes: 'Explain the choices a writer makes and the effect on the audience given the rhetorical situation.' },
      { name: 'Section II Q3: Argument Essay', question_type: 'essay', count: 1, minutes: 40, weight_percent: 18.33, notes: 'No sources. Your own evidence, your own line of reasoning.' },
    ],
  },
  score_bands: apBands([74, 61, 47, 33]),
  units: [
    u(1, 'Reading: Rhetorical Analysis (multiple choice)', 24, 24,
      'The reading half of Section I: analysing passages for the rhetorical situation, the argument being made, and the effect of the writer\'s choices.',
      [
        c('Rhetorical situation: exigence, audience, purpose', 3, 'core'),
        c('Identifying the writer\'s claim and line of reasoning', 4, 'core', ['Rhetorical situation: exigence, audience, purpose']),
        c('Types of evidence and their effect', 4, 'core', ["Identifying the writer's claim and line of reasoning"]),
        c('Appeals: ethos, pathos, logos', 3, 'core', ['Rhetorical situation: exigence, audience, purpose']),
        c('Organisation and structural choices', 4, 'core'),
        c('Diction, syntax and tone', 4, 'core'),
        c('Figurative language and its function', 4, 'core', ['Diction, syntax and tone']),
        c('Concessions, refutation and counterargument', 4, 'core', ["Identifying the writer's claim and line of reasoning"]),
        c('Answering effect questions rather than identification questions', 5, 'core', ['Appeals: ethos, pathos, logos']),
      ],
      [
        ['Choosing the option that names a real device in the passage.', 'The question usually asks what the device accomplishes. A correct label attached to the wrong effect is a wrong answer.'],
      ]),
    u(2, 'Writing: Revision and Composition (multiple choice)', 21, 18,
      'The writing half of Section I: choosing the revision that best serves a stated purpose in a student draft.',
      [
        c('Thesis placement and revision', 4, 'core'),
        c('Selecting relevant evidence for a purpose', 4, 'core'),
        c('Transitions and coherence', 3, 'core'),
        c('Sentence combining and syntactic clarity', 4, 'core'),
        c('Modifiers, parallelism and precision', 3, 'core'),
        c('Adjusting for audience and tone', 4, 'core', ['Rhetorical situation: exigence, audience, purpose']),
        c('Citation and integrating sources', 3, 'important'),
      ],
      [
        ['Picking the most elegant sentence rather than the one that does the stated job.', 'Every writing item names a goal. Answer the goal.'],
      ]),
    u(3, 'Synthesis Essay', 18.33, 26,
      'Building an argument from six provided sources, using them as evidence rather than summarising them.',
      [
        c('Reading and annotating source sets under time', 4, 'core'),
        c('Writing a defensible thesis for a synthesis prompt', 4, 'core'),
        c('Selecting and integrating at least three sources', 4, 'core', ['Writing a defensible thesis for a synthesis prompt']),
        c('Commentary that links evidence to the line of reasoning', 5, 'core', ['Selecting and integrating at least three sources']),
        c('Handling counterargument in synthesis', 4, 'core'),
        c('Sophistication: complexity and rhetorical control', 5, 'core', ['Commentary that links evidence to the line of reasoning']),
      ],
      [
        ['Writing a source-by-source tour.', 'Organise by idea, not by document. Sources should appear where your argument needs them.'],
      ]),
    u(4, 'Rhetorical Analysis Essay', 18.33, 26,
      'Explaining what a writer does, why, and to what effect — the essay most students score lowest on.',
      [
        c('Reading a passage for rhetorical choices', 4, 'core', ['Organisation and structural choices']),
        c('Writing a thesis that states a line of reasoning about choices', 5, 'core', ['Reading a passage for rhetorical choices']),
        c('Selecting evidence from the passage', 4, 'core', ['Writing a thesis that states a line of reasoning about choices']),
        c('Commentary on effect, not identification of devices', 5, 'core', ['Selecting evidence from the passage']),
        c('Connecting choices to the rhetorical situation', 5, 'core', ['Commentary on effect, not identification of devices']),
        c('Sophistication in rhetorical analysis', 5, 'core', ['Connecting choices to the rhetorical situation']),
      ],
      [
        ['Device-spotting: listing anaphora, then juxtaposition, then irony.', 'The rubric awards commentary. One choice explained thoroughly beats five named.'],
      ]),
    u(5, 'Argument Essay', 18.33, 24,
      'A position defended with your own evidence — the essay with the most room for a fast score gain.',
      [
        c('Interpreting the prompt and taking a position', 3, 'core'),
        c('Writing a defensible thesis for an argument prompt', 4, 'core', ['Interpreting the prompt and taking a position']),
        c('Developing a line of reasoning across paragraphs', 4, 'core', ['Writing a defensible thesis for an argument prompt']),
        c('Choosing specific evidence from knowledge and experience', 4, 'core', ['Developing a line of reasoning across paragraphs']),
        c('Commentary that explains rather than restates', 5, 'core', ['Choosing specific evidence from knowledge and experience']),
        c('Qualifying and addressing the other side', 4, 'core', ['Developing a line of reasoning across paragraphs']),
        c('Sophistication in argument', 5, 'core', ['Commentary that explains rather than restates']),
      ],
      [
        ['Generic evidence: "throughout history, many people have...".', 'One specific, named example carries the evidence point. Vagueness carries nothing.'],
      ]),
  ],
});
