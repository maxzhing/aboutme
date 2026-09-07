import { h, clear, titleCase, fmtDate } from '../dom.js';
import { icon } from '../icons.js';
import { prose } from '../markdown.js';
import { renderBlocks, renderMistakes } from './blocks.js';
import { questionCard } from './question.js';
import { toast, scoreRing, barRow, statusLine, masteryPips } from '../ui.js';
import { api } from '../api.js';

const DEFERRED_KINDS = new Set([
  'worksheet', 'quiz', 'test', 'homework', 'exam_prep', 'diagnostic',
  'project', 'lab', 'essay_prompt', 'saq', 'dbq', 'leq',
]);

const KIND_LABEL = {
  practice_set: 'Practice set',
  worksheet: 'Worksheet',
  quiz: 'Quiz',
  test: 'Test',
  homework: 'Homework',
  exam_prep: 'Exam prep',
  problem_set: 'Problem set',
  diagnostic: 'Diagnostic',
  mastery_check: 'Mastery check',
  review: 'Review',
  study_guide: 'Study guide',
  flashcards: 'Flashcards',
  lesson: 'Lesson',
  plan: 'Study plan',
  project: 'Project',
  lab: 'Lab activity',
  coding_exercise: 'Coding exercise',
  essay_prompt: 'Essay prompt',
  saq: 'Short answer (SAQ)',
  dbq: 'Document-based question',
  leq: 'Long essay question',
};

export function resourceLabel(kind) {
  return KIND_LABEL[kind] || titleCase(kind);
}

function head(payload, resource, extra = []) {
  return h(
    'header.resource-head',
    {},
    h(
      'div.resource-meta',
      {},
      h('span.chip.accent', {}, resourceLabel(resource?.kind || payload.kind)),
      payload.subject ? h('span.chip', {}, payload.subject) : null,
      payload.level ? h('span.chip', {}, payload.level) : null,
      payload.difficulty ? h('span.chip', {}, `Difficulty ${Number(payload.difficulty).toFixed(1).replace(/\.0$/, '')}`) : null,
      payload.estimated_minutes ? h('span.chip', {}, `${payload.estimated_minutes} min`) : null,
      resource?.created_at ? h('span.chip', {}, fmtDate(resource.created_at)) : null,
      ...extra,
    ),
    h('h1', {}, payload.title || 'Untitled'),
    payload.hook ? prose(payload.hook) : null,
    payload.instructions ? prose(payload.instructions) : null,
    payload.rationale ? prose(payload.rationale) : null,
  );
}

function objectives(list = [], label = 'By the end of this you should be able to') {
  if (!list.length) return null;
  return h(
    'section.card',
    {},
    h('div.card-head', {}, h('h2', {}, label)),
    h(
      'div.objectives',
      {},
      ...list.map((text) => h('div.objective', {}, icon('check', { size: 15 }), h('span', {}, text))),
    ),
  );
}

function sectionHead(title) {
  return h('div.section-head', {}, h('h3', {}, title));
}

/* ------------------------------------------------------------------ lesson */

function renderLesson(payload, resource, context) {
  const root = h('div.stack', { style: { gap: '22px' } });
  root.appendChild(head(payload, resource));
  const objectivesNode = objectives(payload.objectives);
  if (objectivesNode) root.appendChild(objectivesNode);

  const blocks = renderBlocks(payload.blocks || []);
  if (blocks) root.appendChild(blocks);

  if (payload.checks?.length) {
    root.appendChild(sectionHead('Check yourself'));
    const stack = h('div.stack');
    payload.checks.forEach((question, i) => {
      const card = questionCard(question, {
        index: i + 1,
        mode: 'immediate',
        resourceId: resource?.id,
        sessionId: context?.sessionId,
        subject: payload.subject,
        onGraded: context?.onGraded,
        onHarder: context?.onHarder,
      });
      stack.appendChild(card.el);
    });
    root.appendChild(stack);
  }

  const mistakes = renderMistakes(payload.common_mistakes || []);
  if (mistakes) {
    root.appendChild(sectionHead('Where this usually goes wrong'));
    root.appendChild(mistakes);
  }

  if (payload.summary) {
    root.appendChild(sectionHead('In short'));
    root.appendChild(h('div.block.summary', {}, prose(payload.summary)));
  }

  if (payload.next_steps?.length) {
    root.appendChild(
      h(
        'div.row.wrap',
        {},
        ...payload.next_steps.map((step) =>
          h(
            'button.btn.sm',
            { type: 'button', onClick: () => context?.onNextStep?.(step) },
            icon('arrowRight', { size: 13 }),
            step,
          ),
        ),
      ),
    );
  }
  return root;
}

/* ---------------------------------------------------------------- practice */

function renderPractice(payload, resource, context) {
  const kind = resource?.kind || payload.kind || 'practice_set';
  const questions = payload.questions || [];
  let deferred = DEFERRED_KINDS.has(kind);
  const answers = {};
  const cards = new Map();

  const root = h('div.stack', { style: { gap: '20px' } });
  const resultHost = h('div');
  const questionHost = h('div.stack');
  const footer = h('div');

  const modeToggle = h(
    'button.btn.sm.ghost',
    {
      type: 'button',
      onClick: () => {
        deferred = !deferred;
        build();
        toast(deferred ? 'Answers will be graded when you submit.' : 'Answers are graded as you go.', 'info');
      },
    },
    icon('settings', { size: 13 }),
    '',
  );

  function build() {
    clear(questionHost);
    clear(footer);
    cards.clear();
    modeToggle.lastChild.textContent = deferred ? 'Grade as I go' : 'Grade at the end';

    const sections = payload.sections?.length
      ? payload.sections
      : [{ title: '', instructions: '', question_ids: questions.map((q) => q.id) }];

    let counter = 0;
    for (const section of sections) {
      if (section.title) {
        questionHost.appendChild(sectionHead(section.title));
        if (section.instructions) questionHost.appendChild(prose(section.instructions));
      }
      const ids = section.question_ids?.length ? section.question_ids : [];
      const list = ids.length ? ids.map((id) => questions.find((q) => q.id === id)).filter(Boolean) : questions;
      for (const question of list) {
        counter++;
        const card = questionCard(question, {
          index: counter,
          mode: deferred ? 'deferred' : 'immediate',
          resourceId: resource?.id,
          sessionId: context?.sessionId ?? resource?.session_id,
          subject: payload.subject,
          onChange: (id, value) => {
            answers[id] = value;
          },
          onGraded: context?.onGraded,
          onHarder: context?.onHarder,
        });
        if (answers[question.id] != null) card.setAnswer(answers[question.id]);
        cards.set(question.id, card);
        questionHost.appendChild(card.el);
      }
    }

    if (deferred) {
      footer.appendChild(
        h(
          'div.row',
          { style: { justifyContent: 'flex-end', paddingTop: '6px' } },
          h('span.tiny.dim', { style: { marginRight: 'auto' } }, `${questions.length} questions · ${payload.estimated_minutes || '—'} min`),
          h('button.btn.primary', { type: 'button', onClick: submitAll }, icon('check', { size: 14 }), 'Submit for grading'),
        ),
      );
    }
  }

  async function submitAll(event) {
    const button = event.currentTarget;
    const answered = Object.values(answers).filter((a) => String(a || '').trim()).length;
    if (!answered) {
      toast('Answer at least one question first.', 'info');
      return;
    }
    button.disabled = true;
    clear(resultHost).appendChild(statusLine(`Grading ${answered} answer${answered > 1 ? 's' : ''}…`));

    const elapsed = {};
    for (const [id, card] of cards) elapsed[id] = card.elapsed();

    try {
      await api.submit(resource.id, { answers, elapsed }, {
        graded: (payload_) => {
          for (const result of payload_.results) {
            const card = cards.get(result.questionId);
            if (card && !result.skipped) card.showResult(result.grade, result.concept);
          }
          clear(resultHost).appendChild(renderScoreboard(payload_, resource, context));
          resultHost.scrollIntoView({ behavior: 'smooth', block: 'start' });
          context?.onSubmitted?.(payload_);
        },
      });
    } catch (err) {
      clear(resultHost);
      toast(err.message || 'Grading failed.', 'error');
      button.disabled = false;
    }
  }

  root.appendChild(head(payload, resource, [modeToggle]));
  const objectivesNode = objectives(payload.objectives, 'What this is measuring');
  if (objectivesNode) root.appendChild(objectivesNode);
  root.appendChild(resultHost);
  root.appendChild(questionHost);
  root.appendChild(footer);

  // Restore a previous submission.
  const submission = payload.submission;
  build();
  if (submission) {
    for (const result of submission.results || []) {
      const card = cards.get(result.questionId);
      if (card && !result.skipped) {
        card.setAnswer(submission.answers?.[result.questionId] ?? '');
        card.showResult(result.grade, result.concept);
      }
    }
    resultHost.appendChild(
      renderScoreboard(
        {
          score: resource.score ?? 0,
          maxScore: resource.max_score ?? 0,
          results: submission.results || [],
          analysis: submission.analysis,
          remediation: { available: (submission.results || []).some((r) => (r.grade?.score || 0) < (r.grade?.max_score || 1) * 0.8) },
        },
        resource,
        context,
      ),
    );
  }
  return root;
}

function renderScoreboard(result, resource, context) {
  const analysis = result.analysis || {};
  const wrap = h('div.stack', { style: { gap: '14px' } });

  wrap.appendChild(
    h(
      'div.scoreboard.fade-up',
      {},
      scoreRing(result.score, result.maxScore),
      h(
        'div.stack',
        { style: { gap: '10px' } },
        h('div', {}, h('b', { style: { fontSize: '15px' } }, analysis.headline || 'Graded.')),
        analysis.dominantError
          ? h('p.tiny.muted', {}, `Most common error type: ${titleCase(analysis.dominantError.type)} (${analysis.dominantError.count}×). That is what to fix first.`)
          : null,
        analysis.byConcept?.length
          ? h(
              'div.bars',
              {},
              ...analysis.byConcept.map((c) =>
                barRow(c.concept, c.correct, c.total, c.correct === c.total ? 'var(--mint)' : c.correct === 0 ? 'var(--rose)' : 'var(--amber)'),
              ),
            )
          : null,
      ),
    ),
  );

  if (result.remediation?.available) {
    const host = h('div');
    wrap.appendChild(
      h(
        'div.row.wrap',
        {},
        h(
          'button.btn.primary',
          {
            type: 'button',
            onClick: async (event) => {
              const button = event.currentTarget;
              button.disabled = true;
              clear(host).appendChild(statusLine('Building practice aimed at exactly what you missed…'));
              try {
                await api.remediate(resource.id, {}, {
                  resource: ({ resource: made }) => {
                    clear(host);
                    context?.onGenerated?.(made);
                  },
                });
              } catch (err) {
                clear(host);
                toast(err.message || 'Could not build the follow-up.', 'error');
              } finally {
                button.disabled = false;
              }
            },
          },
          icon('target', { size: 14 }),
          'Practice what I got wrong',
        ),
        h(
          'button.btn',
          { type: 'button', onClick: () => context?.onGenerateMore?.('lesson', analysis.weakest?.[0]?.concept) },
          icon('book', { size: 14 }),
          're-teach the weakest concept',
        ),
        host,
      ),
    );
  }
  return wrap;
}

/* ------------------------------------------------------------- study guide */

function renderStudyGuide(payload, resource, context) {
  const root = h('div.stack', { style: { gap: '22px' } });
  root.appendChild(head(payload, resource));

  if (payload.priorities?.length) {
    root.appendChild(sectionHead('What to work on, in order'));
    root.appendChild(
      h(
        'div.stack',
        { style: { gap: '8px' } },
        ...payload.priorities.map((p, i) =>
          h(
            'div.list-item',
            {},
            h(
              'div',
              {},
              h('b', {}, `${i + 1}. ${p.concept}`),
              h('span', {}, p.why),
            ),
            h('span', { class: `chip ${p.status === 'weak' ? 'rose' : p.status === 'shaky' ? 'amber' : 'mint'}` }, titleCase(p.status)),
          ),
        ),
      ),
    );
  }

  const blocks = renderBlocks(payload.blocks || []);
  if (blocks) {
    root.appendChild(sectionHead('Condensed re-teach'));
    root.appendChild(blocks);
  }

  if (payload.formulas?.length) {
    root.appendChild(sectionHead('Formulas'));
    root.appendChild(
      h(
        'div.stack',
        { style: { gap: '8px' } },
        ...payload.formulas.map((f) =>
          h(
            'div.list-item',
            {},
            h('div', {}, h('b', {}, f.name), h('span', {}, f.when)),
            prose(`$${f.expression}$`),
          ),
        ),
      ),
    );
  }

  if (payload.key_terms?.length) {
    root.appendChild(sectionHead('Key terms'));
    root.appendChild(
      h(
        'div.grid.two',
        {},
        ...payload.key_terms.map((t) =>
          h('div.block', {}, h('h4', {}, t.term), prose(t.definition)),
        ),
      ),
    );
  }

  if (payload.self_test?.length) {
    root.appendChild(sectionHead('Test yourself'));
    const stack = h('div.stack');
    payload.self_test.forEach((question, i) => {
      stack.appendChild(
        questionCard(question, {
          index: i + 1,
          mode: 'immediate',
          resourceId: resource?.id,
          subject: payload.subject,
          onGraded: context?.onGraded,
        }).el,
      );
    });
    root.appendChild(stack);
  }

  if (payload.summary) {
    root.appendChild(sectionHead('Final checklist'));
    root.appendChild(h('div.block.summary', {}, prose(payload.summary)));
  }
  return root;
}

/* -------------------------------------------------------------- flashcards */

function renderFlashcards(payload, resource, context) {
  const cards = payload.cards || [];
  let index = 0;
  let flipped = false;
  const known = new Set();

  const root = h('div.stack', { style: { gap: '18px' } });
  root.appendChild(head(payload, resource));
  const deck = h('div.deck');
  root.appendChild(deck);

  function draw() {
    clear(deck);
    if (!cards.length) {
      deck.appendChild(h('p.muted', {}, 'This deck is empty.'));
      return;
    }
    if (index >= cards.length) {
      deck.appendChild(
        h(
          'div.card',
          { style: { textAlign: 'center', width: 'min(560px,100%)' } },
          h('h3.serif', { style: { fontSize: '22px', marginBottom: '6px' } }, 'Deck complete'),
          h('p.muted.tiny', {}, `You marked ${known.size} of ${cards.length} as known.`),
          h(
            'div.row',
            { style: { justifyContent: 'center', marginTop: '14px' } },
            h(
              'button.btn',
              {
                type: 'button',
                onClick: () => {
                  index = 0;
                  flipped = false;
                  draw();
                },
              },
              icon('refresh', { size: 14 }),
              'Run through again',
            ),
            known.size < cards.length
              ? h(
                  'button.btn.primary',
                  {
                    type: 'button',
                    onClick: () => context?.onGenerateMore?.('practice_set', payload.topic),
                  },
                  icon('target', { size: 14 }),
                  'Practise the shaky ones',
                )
              : null,
          ),
        ),
      );
      return;
    }

    const card = cards[index];
    const node = h(
      'div',
      { class: `flashcard${flipped ? ' flipped' : ''}`, onClick: () => { flipped = !flipped; draw(); } },
      h(
        'div.flashcard-inner',
        {},
        h(
          'div.flashcard-face',
          {},
          h('span.label', {}, `${card.concept || payload.topic} · card ${index + 1} of ${cards.length}`),
          h('div.text', {}, card.front),
          card.hint ? h('p.tiny.dim', {}, `Hint: ${card.hint}`) : null,
          h('p.tiny.dim', {}, 'Say the answer out loud, then click to check.'),
        ),
        h(
          'div.flashcard-face.back',
          {},
          h('span.label', {}, 'Answer'),
          h('div.text', {}, card.back),
        ),
      ),
    );
    deck.appendChild(node);
    deck.appendChild(
      h(
        'div.deck-controls',
        {},
        h(
          'button.btn',
          {
            type: 'button',
            onClick: () => {
              index++;
              flipped = false;
              draw();
            },
          },
          icon('x', { size: 14 }),
          'Still learning',
        ),
        h(
          'button.btn.primary',
          {
            type: 'button',
            onClick: () => {
              known.add(card.id);
              index++;
              flipped = false;
              draw();
            },
          },
          icon('check', { size: 14 }),
          'I knew it',
        ),
      ),
    );
  }

  draw();
  return root;
}

/* -------------------------------------------------------------------- plan */

function renderPlan(payload, resource, context) {
  const root = h('div.stack', { style: { gap: '20px' } });
  root.appendChild(head(payload, resource));

  if (payload.milestones?.length) {
    root.appendChild(
      h(
        'div.row.wrap',
        {},
        ...payload.milestones.map((m) => h('span.chip.accent', {}, `Day ${m.day}: ${m.label}`)),
      ),
    );
  }

  root.appendChild(
    h(
      'div.stack',
      { style: { gap: '18px' } },
      ...(payload.days || []).map((day) =>
        h(
          'div.plan-day.plan-line',
          {},
          h('div.plan-daymark', {}, h('b', {}, String(day.day)), h('span', {}, 'day')),
          h(
            'div.plan-card',
            {},
            h(
              'div.spread',
              {},
              h('b', { style: { fontSize: '14.5px' } }, day.focus),
              h('span.chip', {}, `${day.minutes} min`),
            ),
            day.concepts?.length ? h('div.row.wrap', {}, ...day.concepts.map((c) => h('span.chip', {}, c))) : null,
            ...(day.activities || []).map((activity) =>
              h(
                'div.plan-activity',
                {},
                h('span.chip.accent', {}, resourceLabel(activity.type)),
                h('div', {}, h('b', {}, activity.title), h('p', {}, activity.detail)),
                h(
                  'button.btn.sm',
                  {
                    type: 'button',
                    onClick: () =>
                      context?.onGenerateMore?.(activity.type, activity.title, {
                        minutes: activity.minutes,
                        concepts: day.concepts,
                        instructions: activity.detail,
                      }),
                  },
                  icon('wand', { size: 13 }),
                  'Build it',
                ),
              ),
            ),
            day.checkpoint ? h('p.tiny.muted', {}, `Checkpoint: ${day.checkpoint}`) : null,
          ),
        ),
      ),
    ),
  );
  return root;
}

/* ------------------------------------------------------------------ router */

export function renderResource(resource, context = {}) {
  const payload = resource.payload || resource;
  const kind = resource.kind || payload.kind;

  if (kind === 'lesson') return renderLesson(payload, resource, context);
  if (kind === 'study_guide') return renderStudyGuide(payload, resource, context);
  if (kind === 'flashcards') return renderFlashcards(payload, resource, context);
  if (kind === 'plan') return renderPlan(payload, resource, context);
  return renderPractice(payload, resource, context);
}

/** A lightweight preview used while a resource is still streaming in. */
export function renderPreview(partial) {
  const root = h('div.stack', { style: { gap: '14px' } });
  if (partial.title) root.appendChild(h('h1.serif', { style: { fontSize: '26px', letterSpacing: '-0.02em' } }, partial.title));
  if (partial.hook) root.appendChild(prose(partial.hook));
  if (partial.instructions) root.appendChild(prose(partial.instructions));
  if (partial.rationale) root.appendChild(prose(partial.rationale));

  const blocks = renderBlocks((partial.blocks || []).slice(0, 4));
  if (blocks) root.appendChild(blocks);

  const questions = partial.questions || partial.self_test || partial.checks || [];
  if (questions.length) {
    root.appendChild(
      h(
        'div.stack',
        { style: { gap: '8px' } },
        h('p.tiny.dim', {}, `${questions.length} question${questions.length > 1 ? 's' : ''} written so far…`),
        ...questions.slice(-3).map((q) => h('div.block', {}, prose(q.prompt || '…'))),
      ),
    );
  }
  if (partial.cards?.length) {
    root.appendChild(h('p.tiny.dim', {}, `${partial.cards.length} cards written…`));
  }
  if (partial.days?.length) {
    root.appendChild(
      h('div.stack', { style: { gap: '6px' } }, ...partial.days.map((d) => h('div.list-item', {}, h('div', {}, h('b', {}, `Day ${d.day}`), h('span', {}, d.focus || ''))))),
    );
  }
  return root;
}

export { masteryPips };
