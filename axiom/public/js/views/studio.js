import { h, clear, autosize } from '../dom.js';
import { icon } from '../icons.js';
import { api } from '../api.js';
import { navigate } from '../router.js';
import { state } from '../state.js';
import { toast, statusLine, emptyState } from '../ui.js';
import { renderResource, renderPreview, resourceLabel } from '../render/resource.js';

const KINDS = [
  ['worksheet', 'Worksheet'],
  ['practice_set', 'Practice set'],
  ['quiz', 'Quiz'],
  ['test', 'Test'],
  ['homework', 'Homework'],
  ['lesson', 'Lesson'],
  ['study_guide', 'Study guide'],
  ['flashcards', 'Flashcards'],
  ['plan', 'Study plan'],
  ['exam_prep', 'Exam prep'],
  ['mastery_check', 'Mastery check'],
  ['review', 'Review'],
  ['coding_exercise', 'Coding exercise'],
  ['lab', 'Lab activity'],
  ['project', 'Project'],
  ['essay_prompt', 'Essay prompt'],
  ['saq', 'SAQ'],
  ['dbq', 'DBQ'],
  ['leq', 'LEQ'],
];

const QUESTION_TYPES = [
  ['multiple_choice', 'Multiple choice'],
  ['short_answer', 'Short answer'],
  ['numeric', 'Numeric'],
  ['free_response', 'Free response'],
  ['fill_blank', 'Fill in the blank'],
  ['true_false', 'True / false'],
  ['coding', 'Coding'],
  ['essay', 'Essay'],
  ['scenario', 'Scenario'],
  ['proof', 'Proof'],
];

const NEEDS_QUESTIONS = new Set([
  'worksheet', 'practice_set', 'quiz', 'test', 'homework', 'exam_prep', 'mastery_check',
  'review', 'coding_exercise', 'lab', 'project', 'essay_prompt', 'saq', 'dbq', 'leq',
]);

/** Jump straight into the studio with a request queued up. */
export function startGeneration(request) {
  state.studioRequest = { ...request, autorun: true };
  navigate('/studio');
}

export function studioView() {
  const queued = state.studioRequest;
  state.studioRequest = null;

  const form = {
    kind: queued?.kind || 'worksheet',
    topic: queued?.topic || '',
    subject: queued?.subject || '',
    level: queued?.level || '',
    difficulty: queued?.difficulty ?? 3,
    count: queued?.count ?? 10,
    minutes: queued?.minutes ?? 20,
    days: queued?.days ?? 7,
    types: queued?.types || ['multiple_choice', 'short_answer'],
    instructions: queued?.instructions || '',
    sourceIds: queued?.sourceIds || [],
  };

  const output = h('div');
  const controls = h('div.studio-form');
  const root = h(
    'div.page.wide',
    {},
    h(
      'div.spread',
      { style: { marginBottom: '20px' } },
      h(
        'div',
        {},
        h('h1.page-title', {}, 'Resource studio'),
        h('p.page-sub', {}, 'Every resource is written for you specifically — your level, your weak concepts, the mistakes you keep making.'),
      ),
    ),
    h('div.studio-grid', {}, controls, output),
  );

  let sources = [];
  api.sources().then(({ sources: list }) => {
    sources = list;
    draw();
  }).catch(() => {});

  function field(label, control) {
    return h('div.field', {}, h('label', {}, label), control);
  }

  function draw() {
    clear(controls);
    const showQuestions = NEEDS_QUESTIONS.has(form.kind);

    controls.appendChild(
      h(
        'section.card.stack',
        {},
        field(
          'What kind',
          h(
            'div.toggle-group',
            {},
            ...KINDS.map(([value, label]) =>
              h(
                'button',
                {
                  type: 'button',
                  class: `toggle${form.kind === value ? ' on' : ''}`,
                  onClick: () => {
                    form.kind = value;
                    draw();
                  },
                },
                label,
              ),
            ),
          ),
        ),
        field(
          'Topic',
          h('input.input', {
            value: form.topic,
            placeholder: 'e.g. cellular respiration',
            onInput: (event) => {
              form.topic = event.target.value;
            },
          }),
        ),
        h(
          'div.row',
          { style: { gap: '10px', alignItems: 'flex-end' } },
          field(
            'Subject',
            h('input.input', {
              value: form.subject,
              placeholder: 'Biology',
              onInput: (event) => {
                form.subject = event.target.value;
              },
            }),
          ),
          field(
            'Level',
            h('input.input', {
              value: form.level,
              placeholder: 'AP / Year 11 / beginner',
              onInput: (event) => {
                form.level = event.target.value;
              },
            }),
          ),
        ),
        field(
          h('span', {}, 'Difficulty ', h('b', { id: 'diffval' }, String(form.difficulty))),
          h('input.slider', {
            type: 'range',
            min: '1',
            max: '5',
            step: '0.5',
            value: String(form.difficulty),
            onInput: (event) => {
              form.difficulty = Number(event.target.value);
              const node = controls.querySelector('#diffval');
              if (node) node.textContent = String(form.difficulty);
            },
          }),
        ),
        showQuestions || form.kind === 'flashcards'
          ? field(
              form.kind === 'flashcards' ? 'Number of cards' : 'Number of questions',
              h('input.input', {
                type: 'number',
                min: '1',
                max: '40',
                value: String(form.count),
                onInput: (event) => {
                  form.count = Number(event.target.value);
                },
              }),
            )
          : null,
        form.kind === 'plan'
          ? h(
              'div.row',
              { style: { gap: '10px', alignItems: 'flex-end' } },
              field(
                'Days',
                h('input.input', {
                  type: 'number',
                  min: '1',
                  max: '60',
                  value: String(form.days),
                  onInput: (event) => {
                    form.days = Number(event.target.value);
                  },
                }),
              ),
              field(
                'Minutes per day',
                h('input.input', {
                  type: 'number',
                  min: '5',
                  max: '480',
                  value: String(form.minutes),
                  onInput: (event) => {
                    form.minutes = Number(event.target.value);
                  },
                }),
              ),
            )
          : field(
              'Time limit (minutes)',
              h('input.input', {
                type: 'number',
                min: '3',
                max: '360',
                value: String(form.minutes),
                onInput: (event) => {
                  form.minutes = Number(event.target.value);
                },
              }),
            ),
        showQuestions
          ? field(
              'Question types',
              h(
                'div.toggle-group',
                {},
                ...QUESTION_TYPES.map(([value, label]) =>
                  h(
                    'button',
                    {
                      type: 'button',
                      class: `toggle${form.types.includes(value) ? ' on' : ''}`,
                      onClick: (event) => {
                        form.types = form.types.includes(value)
                          ? form.types.filter((t) => t !== value)
                          : [...form.types, value];
                        event.currentTarget.classList.toggle('on');
                      },
                    },
                    label,
                  ),
                ),
              ),
            )
          : null,
        sources.length
          ? field(
              'Build from your material',
              h(
                'div.toggle-group',
                {},
                ...sources.map((source) =>
                  h(
                    'button',
                    {
                      type: 'button',
                      class: `toggle${form.sourceIds.includes(source.id) ? ' on' : ''}`,
                      onClick: (event) => {
                        form.sourceIds = form.sourceIds.includes(source.id)
                          ? form.sourceIds.filter((s) => s !== source.id)
                          : [...form.sourceIds, source.id];
                        event.currentTarget.classList.toggle('on');
                      },
                    },
                    icon('file', { size: 12 }),
                    source.name,
                  ),
                ),
              ),
            )
          : null,
        field(
          'Anything else',
          (() => {
            const node = h('textarea.textarea', {
              rows: 3,
              placeholder: 'e.g. exam-style, no calculator, focus on the sign conventions I keep missing',
              value: form.instructions,
              onInput: (event) => {
                form.instructions = event.target.value;
              },
            });
            autosize(node, 200);
            return node;
          })(),
        ),
        h(
          'button.btn.primary.lg',
          { type: 'button', style: { width: '100%' }, onClick: generate },
          icon('wand', { size: 15 }),
          `Generate ${resourceLabel(form.kind).toLowerCase()}`,
        ),
        h('p.tiny.dim', {}, 'Generated material is checked for wrong answer keys, ambiguity and duplicates before you see it.'),
      ),
    );
  }

  async function generate() {
    if (!form.topic.trim()) {
      toast('Give it a topic first.', 'info');
      return;
    }
    clear(output).appendChild(statusLine(`Building your ${resourceLabel(form.kind).toLowerCase()}…`));
    const previewHost = h('div.stack', { style: { opacity: '0.72' } });
    output.appendChild(previewHost);

    try {
      await api.generate(
        {
          kind: form.kind,
          topic: form.topic.trim(),
          subject: form.subject.trim() || 'General',
          level: form.level.trim(),
          difficulty: form.difficulty,
          count: form.count,
          minutes: form.minutes,
          days: form.days,
          types: form.types,
          instructions: form.instructions.trim(),
          sourceIds: form.sourceIds,
        },
        {
          status: ({ message }) => {
            const line = output.querySelector('.status-line span:last-child');
            if (line) line.textContent = message;
          },
          partial: (partial) => {
            clear(previewHost).appendChild(renderPreview(partial));
          },
          resource: ({ resource }) => {
            state.lastResource = resource;
            clear(output).appendChild(
              h(
                'div.stack',
                { style: { gap: '16px' } },
                h(
                  'div.row.wrap',
                  {},
                  h('span.chip.mint', {}, 'Ready'),
                  h(
                    'button.btn.sm',
                    { type: 'button', onClick: () => navigate(`/resource/${resource.id}`) },
                    icon('arrowRight', { size: 13 }),
                    'Open on its own page',
                  ),
                  resource.payload?.quality?.repaired
                    ? h('span.chip.amber', {}, `${resource.payload.quality.repaired} question(s) repaired by quality control`)
                    : null,
                ),
                renderResource(resource, {
                  onGenerateMore: (kind, topic, extra) => startGeneration({ kind, topic, ...extra }),
                  onGenerated: (made) => navigate(`/resource/${made.id}`),
                }),
              ),
            );
          },
        },
      );
    } catch (err) {
      clear(output).appendChild(
        h(
          'div.card',
          {},
          h('p', { style: { color: 'var(--rose)' } }, err.message || 'Generation failed.'),
          h('button.btn.sm', { type: 'button', onClick: generate, style: { marginTop: '10px' } }, icon('refresh', { size: 13 }), 'Try again'),
        ),
      );
    }
  }

  draw();
  output.appendChild(
    emptyState(
      'Nothing generated yet',
      'Pick what you want on the left. Everything is written fresh against your current mastery level.',
    ),
  );
  if (queued?.autorun && form.topic) queueMicrotask(generate);

  return root;
}
