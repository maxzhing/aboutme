import { h, clear, titleCase, autosize } from '../dom.js';
import { icon } from '../icons.js';
import { prose } from '../markdown.js';
import { api } from '../api.js';
import { navigate } from '../router.js';
import { state } from '../state.js';
import { toast, statusLine, emptyState, skeleton, modal } from '../ui.js';
import {
  scoreScale,
  leverageChart,
  syllabusMatrix,
  scoreHistory,
  masteryMeter,
  masteryPips,
  statTile,
  MASTERY_LABELS,
} from '../render/charts.js';
import { renderPreview, resourceLabel } from '../render/resource.js';
import { startGeneration } from './studio.js';

const PACE_STATUS = {
  on_track: { kind: 'good', label: 'On track' },
  tight: { kind: 'warning', label: 'Tight' },
  behind: { kind: 'critical', label: 'Behind' },
  out_of_time: { kind: 'critical', label: 'Out of time' },
  no_deadline: { kind: null, label: 'No exam date set' },
};

const ACTION_ICON = { review: 'repeat', exam: 'flag', learn: 'book', practice: 'target', master: 'trophy', maintain: 'scale' };

/* -------------------------------------------------------------- the index */

export function coursesView() {
  const list = h('div.stack', { style: { gap: '10px' } });
  const root = h(
    'div.page.stack',
    { style: { gap: '20px' } },
    h(
      'div.spread',
      {},
      h(
        'div',
        {},
        h('h1.page-title', {}, 'Courses'),
        h(
          'p.page-sub',
          {},
          'A course is the whole syllabus with its real exam weighting. Axiom tracks every concept in it, predicts what you would score today, and works out where the next hour is worth the most marks.',
        ),
      ),
      h('button.btn.primary', { type: 'button', onClick: newCourse }, icon('plus', { size: 14 }), 'New course'),
    ),
    list,
  );

  list.appendChild(skeleton(2, 74));
  api
    .courses()
    .then(({ courses }) => {
      clear(list);
      if (!courses.length) {
        list.appendChild(
          emptyState(
            'No courses yet',
            'Name an exam — "AP Physics 1", "IB Chemistry HL", "A-level Economics" — and Axiom builds the whole syllabus with its exam weighting, then teaches to it.',
            h('button.btn.primary', { type: 'button', onClick: newCourse }, icon('plus', { size: 14 }), 'Build a course'),
            'grid',
          ),
        );
        return;
      }
      for (const course of courses) {
        list.appendChild(
          h(
            'button.list-item',
            { type: 'button', onClick: () => navigate(`/course/${course.id}`) },
            h(
              'div',
              {},
              h('b', {}, course.title),
              h(
                'span',
                {},
                [course.exam, `${course.units} units`, course.exam_date ? `exam ${course.exam_date}` : null]
                  .filter(Boolean)
                  .join(' · '),
              ),
            ),
            icon('arrowRight', { size: 14 }),
          ),
        );
      }
    })
    .catch((err) => clear(list).appendChild(h('p', { style: { color: 'var(--critical)' } }, err.message)));

  return root;
}

export function newCourse() {
  modal((panel, close) => {
    const request = h('input.input', { placeholder: 'e.g. AP Physics 1' });
    const level = h('input.input', { placeholder: 'Where you are starting from (optional)' });
    const date = h('input.input', { type: 'date' });
    const notes = h('textarea.textarea', { rows: 2, placeholder: 'Anything specific — a teacher’s scheme of work, units you can skip…' });
    autosize(notes, 160);

    const verdict = h('p.tiny', { style: { margin: '2px 0 0', minHeight: '16px', color: 'var(--ink-3)' } });
    const shelf = h('div.row.wrap', { style: { gap: '6px', marginTop: '2px' } });

    panel.appendChild(h('h3', {}, 'What are you preparing for?'));
    panel.appendChild(
      h('p.tiny.muted', {}, 'Axiom will map the real syllabus, weight each unit by what the exam actually rewards, and start tracking every concept in it.'),
    );
    panel.appendChild(h('div.field', {}, h('label', {}, 'Course or exam'), request, verdict));
    panel.appendChild(
      h(
        'div.field',
        {},
        h('label', {}, 'Courses with a transcribed syllabus'),
        h('p.tiny.dim', { style: { margin: 0 } }, 'These use the published framework — real units, real exam weightings. Anything else is mapped by the model.'),
        shelf,
      ),
    );

    // Recognise a library course as it is typed, so nobody has to guess whether
    // the weightings they are about to plan around are published or invented.
    let catalogue = [];
    const matches = (text) => {
      const needle = ` ${String(text).toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim()} `;
      return catalogue.find((course) =>
        (course.aliases || []).some((alias) => needle.includes(` ${alias.toLowerCase()} `)),
      );
    };
    const reflect = () => {
      const found = matches(request.value);
      verdict.textContent = found
        ? `Verified syllabus — ${found.units} units, ${found.concepts} tracked concepts, published exam weightings.`
        : request.value.trim()
          ? 'No published framework on file — Axiom will map this one itself.'
          : '';
      verdict.style.color = found ? 'var(--good)' : 'var(--ink-3)';
    };
    request.addEventListener('input', reflect);

    api
      .curriculum()
      .then(({ courses }) => {
        catalogue = courses;
        for (const course of courses) {
          shelf.appendChild(
            h(
              'button.chip',
              {
                type: 'button',
                title: `${course.units} units · ${course.concepts} concepts · about ${course.hours} hours`,
                style: { cursor: 'pointer' },
                onClick: () => {
                  request.value = course.title;
                  reflect();
                  request.focus();
                },
              },
              course.title,
            ),
          );
        }
        reflect();
      })
      .catch(() => shelf.remove());
    panel.appendChild(h('div.field', {}, h('label', {}, 'Your starting level'), level));
    panel.appendChild(h('div.field', {}, h('label', {}, 'Exam date'), date));
    panel.appendChild(h('div.field', {}, h('label', {}, 'Notes'), notes));
    panel.appendChild(
      h(
        'div.row',
        { style: { justifyContent: 'flex-end' } },
        h('button.btn', { type: 'button', onClick: close }, 'Cancel'),
        h(
          'button.btn.primary',
          {
            type: 'button',
            onClick: () => {
              if (!request.value.trim()) return;
              state.pendingCourse = {
                request: request.value.trim(),
                level: level.value.trim(),
                examDate: date.value || null,
                instructions: notes.value.trim(),
              };
              close();
              navigate('/course/new');
            },
          },
          icon('sparkles', { size: 14 }),
          'Build the course',
        ),
      ),
    );
    queueMicrotask(() => request.focus());
  });
}

/* --------------------------------------------------------- the course view */

export function courseView({ params }) {
  const root = h('div.page.wide.stack', { style: { gap: '22px' } });
  let snapshot = null;

  if (params.id === 'new') {
    const pending = state.pendingCourse;
    state.pendingCourse = null;
    if (!pending) {
      navigate('/courses');
      return root;
    }
    const host = h('div.stack', { style: { gap: '16px' } });
    root.appendChild(host);
    host.appendChild(statusLine(`Mapping ${pending.request}…`));
    const previewHost = h('div.card', { style: { opacity: '0.75' } });
    host.appendChild(previewHost);

    api
      .createCourse(pending, {
        status: ({ message }) => {
          const line = host.querySelector('.status-line span:last-child');
          if (line) line.textContent = message;
        },
        partial: (partial) => {
          clear(previewHost).appendChild(coursePreview(partial));
        },
        course: ({ snapshot: made }) => {
          history.replaceState(null, '', `#/course/${made.course.id}`);
          snapshot = made;
          clear(root);
          draw();
        },
      })
      .catch((err) => {
        clear(host).appendChild(h('p', { style: { color: 'var(--critical)' } }, err.message || 'Could not build the course.'));
      });
    return root;
  }

  root.appendChild(skeleton(3, 130));
  api
    .course(params.id)
    .then((data) => {
      snapshot = data;
      clear(root);
      draw();
    })
    .catch((err) => clear(root).appendChild(h('p', { style: { color: 'var(--critical)' } }, err.message)));

  /* ------------------------------------------------------------- drawing */

  function refresh() {
    api.course(snapshot.course.id).then((data) => {
      snapshot = data;
      clear(root);
      draw();
    });
  }

  function draw() {
    const { course, readiness, path, pace, action, units, targetScore, history: papers } = snapshot;
    document.dispatchEvent(new CustomEvent('axiom:title', { detail: { title: course.title, sub: course.exam || course.subject } }));

    root.appendChild(header(course, pace, targetScore));
    root.appendChild(projection(readiness, path, targetScore, papers));
    root.appendChild(nextAction(action));
    root.appendChild(leverageSection(readiness, units));
    root.appendChild(syllabusSection(units));
    if (course.exam_format?.sections?.length) root.appendChild(examFormat(course));
  }

  function header(course, pace, targetScore) {
    const status = PACE_STATUS[pace.status] || PACE_STATUS.no_deadline;
    return h(
      'div.spread',
      { style: { alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' } },
      h(
        'div',
        {},
        h('h1.page-title', {}, course.title),
        course.overview ? h('p.page-sub', {}, course.overview) : null,
        h(
          'div.row.wrap',
          { style: { marginTop: '10px' } },
          course.exam ? h('span.chip.accent', {}, course.exam) : null,
          course.verified
            ? h(
                'span.chip.good',
                { title: course.source || 'Transcribed from the published course framework' },
                icon('checkCircle', { size: 11 }),
                'Verified syllabus',
              )
            : h(
                'span.chip',
                { title: 'No published framework was on file for this exam, so the syllabus and its weightings were generated. Treat the unit percentages as an estimate.' },
                'Generated syllabus',
              ),
          h('span.chip', {}, `Target: score ${targetScore}`),
          pace.daysLeft != null ? h('span.chip', {}, icon('clock', { size: 11 }), `${pace.daysLeft} days left`) : null,
          status.kind
            ? h(`span.chip.${status.kind}`, {}, icon(status.kind === 'good' ? 'checkCircle' : 'alert', { size: 11 }), status.label)
            : h('span.chip', {}, status.label),
          pace.hoursPerDayNeeded != null && Number.isFinite(pace.hoursPerDayNeeded)
            ? h('span.chip', {}, `${pace.hoursPerDayNeeded.toFixed(1)} h/day to finish`)
            : null,
        ),
      ),
      h(
        'div.row.wrap',
        {},
        h('button.btn', { type: 'button', onClick: settings }, icon('settings', { size: 14 }), 'Settings'),
        h('button.btn', { type: 'button', onClick: sitExam }, icon('flag', { size: 14 }), 'Sit a paper'),
        h('button.btn.primary', { type: 'button', onClick: doNext }, icon('sparkles', { size: 14 }), 'Teach me the next thing'),
      ),
    );
  }

  function projection(readiness, path, targetScore, papers) {
    const target = readiness.bands.find((b) => b.score === targetScore);
    const evidence = readiness.confidence < 0.15
      ? 'Almost no evidence yet — this is a prior, not a measurement.'
      : readiness.confidence < 0.5
        ? 'Based on limited evidence; the range is wide for a reason.'
        : 'Based on enough graded work to be worth trusting.';

    const body = h(
      'div.stack',
      { style: { gap: '16px' } },
      h(
        'div.projection-head',
        {},
        h(
          'div',
          {},
          h('span.stat-label', {}, 'Projected score if you sat it today'),
          h('span.projection-score', {}, String(readiness.score)),
          h(
            'span.stat-delta',
            {},
            readiness.range.low === readiness.range.high
              ? `${Math.round(readiness.percent * 100)}% of the paper`
              : `likely ${readiness.range.low}–${readiness.range.high} · ${Math.round(readiness.percent * 100)}% of the paper`,
          ),
          h('span.tiny.dim', {}, evidence),
          readiness.calibrated_on
            ? h('span.chip.good', { style: { marginTop: '8px' } }, icon('checkCircle', { size: 11 }), 'Calibrated on your last paper')
            : null,
        ),
        h(
          'div',
          { style: { flex: '1 1 340px', minWidth: 0 } },
          scoreScale({
            percent: readiness.percent,
            margin: readiness.margin,
            score: readiness.score,
            bands: readiness.bands,
            target: target ? target.min_percent / 100 : null,
            calibrated: Boolean(readiness.calibrated_on),
          }),
        ),
      ),
      path.alreadyThere
        ? h(
            'div.strategy-note',
            {},
            icon('trophy', { size: 14 }),
            h('span', {}, `You are projecting at or above your target of ${targetScore}. From here the job is protecting it — interleaved review beats new content.`),
          )
        : path.units.length
          ? h(
              'div.stack',
              { style: { gap: '10px' } },
              h(
                'div.strategy-note',
                {},
                icon('route', { size: 14 }),
                h(
                  'span',
                  {},
                  `You are ${Math.round(path.gap * 100)} points of the paper short of a ${targetScore}. ` +
                    `Getting these ${path.units.length} unit${path.units.length === 1 ? '' : 's'} to strong closes it` +
                    `${path.reachable ? '.' : ' — and even then it is tight, so start now.'}`,
                ),
              ),
              h(
                'div.row.wrap',
                {},
                ...path.units.map((unit) =>
                  h(
                    'button.btn.sm',
                    {
                      type: 'button',
                      title: `${unit.exam_weight}% of the paper · about ${(unit.gain * 100).toFixed(1)} points to gain`,
                      onClick: () => teachUnit(unit.title),
                    },
                    icon('arrowRight', { size: 12 }),
                    `${unit.title} (+${(unit.gain * 100).toFixed(1)})`,
                  ),
                ),
              ),
            )
          : null,
      papers?.length ? scoreHistory(papers, { targetPercent: target ? target.min_percent / 100 : null }) : null,
    );

    return h('section.card', {}, h('div.card-head', {}, icon('target', { size: 15 }), h('h2', {}, 'Exam projection')), body);
  }

  function nextAction(action) {
    return h(
      'section.card.next-action',
      {},
      h(
        'div.signal',
        { style: { border: 'none', background: 'none', padding: 0, boxShadow: 'none' } },
        h('div.signal-icon.review', {}, icon(ACTION_ICON[action.kind] || 'sparkles', { size: 16 })),
        h('div', {}, h('b', {}, action.title), h('p', {}, action.why)),
        h('button.btn.primary', { type: 'button', onClick: doNext }, icon('sparkles', { size: 14 }), 'Do it now'),
      ),
    );
  }

  function leverageSection(readiness, units) {
    const chart = leverageChart(readiness.leverage, { onSelect: (unit) => teachUnit(unit.title) });
    return h(
      'div.grid.two',
      {},
      h(
        'section.card',
        {},
        h('div.card-head', {}, icon('scale', { size: 15 }), h('h2', {}, 'Where the marks are')),
        chart || emptyState('Nothing outstanding', 'Every unit is projecting strongly.'),
      ),
      h(
        'section.card',
        {},
        h('div.card-head', {}, icon('layers', { size: 15 }), h('h2', {}, 'Unit readiness')),
        h(
          'div.stack',
          { style: { gap: '14px' } },
          ...units.map((unit) =>
            h(
              'div.stack',
              { style: { gap: '6px' } },
              h(
                'div.spread',
                {},
                h('span', { style: { fontSize: '13px', fontWeight: 550 } }, unit.title),
                h('span.tiny.dim', {}, `${unit.exam_weight}% · projecting ${Math.round(unit.expected * 100)}%`),
              ),
              h(
                'div.meter-track',
                {},
                h('div.meter-fill', {
                  style: {
                    width: `${Math.round(unit.expected * 100)}%`,
                    background: unit.expected >= 0.8 ? 'var(--good)' : unit.expected >= 0.55 ? 'var(--warning)' : 'var(--critical)',
                  },
                }),
              ),
            ),
          ),
        ),
      ),
    );
  }

  function syllabusSection(units) {
    const matrix = syllabusMatrix(units, {
      onSelect: (concept) => startGeneration({ kind: 'practice_set', topic: concept.name, subject: snapshot.course.subject }),
    });
    const host = h('section.card', {}, h('div.card-head', {}, icon('grid', { size: 15 }), h('h2', {}, 'The syllabus')));
    if (matrix) host.appendChild(matrix);

    host.appendChild(
      h(
        'div.stack',
        { style: { gap: '10px', marginTop: '16px' } },
        ...units.map((unit) =>
          h(
            'details.unit',
            {},
            h(
              'summary',
              {},
              h('span.unit-idx', {}, String(unit.idx)),
              h('span.unit-title', {}, unit.title),
              h(
                'span.chip',
                {
                  title: unit.published_weight
                    ? `Published weighting: ${unit.published_weight} of the exam`
                    : 'Share of the exam',
                },
                `${unit.exam_weight}%`,
              ),
              h(
                'span',
                { class: `chip ${unit.expected >= 0.8 ? 'good' : unit.expected >= 0.55 ? 'warning' : 'critical'}` },
                `${Math.round(unit.expected * 100)}%`,
              ),
            ),
            h(
              'div.unit-body',
              {},
              unit.summary ? prose(unit.summary) : null,
              h(
                'div.stack',
                { style: { gap: '3px' } },
                ...unit.concepts.map((concept) =>
                  h(
                    'div.concept-row',
                    {},
                    h(
                      'div',
                      {},
                      h('div.concept-name', {}, concept.name),
                      h(
                        'div.concept-sub',
                        {},
                        `${titleCase(concept.criticality)} · ${MASTERY_LABELS[Math.max(0, Math.min(5, concept.mastery_level))]} · ` +
                          `${concept.attempts} attempt${concept.attempts === 1 ? '' : 's'} · projecting ${Math.round(concept.expected * 100)}%`,
                      ),
                    ),
                    h(
                      'div.row',
                      { style: { gap: '10px' } },
                      masteryPips(concept.mastery_level),
                      h(
                        'button.btn.sm.ghost',
                        {
                          type: 'button',
                          onClick: () =>
                            startGeneration({
                              kind: concept.attempts === 0 ? 'lesson' : concept.expected < 0.6 ? 'practice_set' : 'mastery_check',
                              topic: concept.name,
                              subject: snapshot.course.subject,
                            }),
                        },
                        concept.attempts === 0 ? 'Learn' : concept.expected < 0.6 ? 'Drill' : 'Prove',
                      ),
                    ),
                  ),
                ),
              ),
              unit.exam_traps?.length
                ? h(
                    'div.stack',
                    { style: { gap: '8px', marginTop: '10px' } },
                    ...unit.exam_traps.map((trap) =>
                      h(
                        'div.block.warning',
                        {},
                        h('div.block-head', {}, icon('alert', { size: 13 }), 'Examiner trap'),
                        h('h4', {}, trap.trap),
                        trap.fix ? prose(trap.fix) : null,
                      ),
                    ),
                  )
                : null,
              h(
                'div.row.wrap',
                { style: { marginTop: '12px' } },
                h('button.btn.sm', { type: 'button', onClick: () => teachUnit(unit.title, 'lesson') }, icon('book', { size: 12 }), 'Teach this unit'),
                h('button.btn.sm', { type: 'button', onClick: () => teachUnit(unit.title, 'practice_set') }, icon('target', { size: 12 }), 'Practice set'),
                h('button.btn.sm', { type: 'button', onClick: () => teachUnit(unit.title, 'mastery_check') }, icon('trophy', { size: 12 }), 'Mastery check'),
              ),
            ),
          ),
        ),
      ),
    );
    return host;
  }

  function examFormat(course) {
    const format = course.exam_format;
    return h(
      'section.card',
      {},
      h('div.card-head', {}, icon('file', { size: 15 }), h('h2', {}, 'The paper'), h('span.tiny.dim', { style: { marginLeft: 'auto' } }, `${format.total_minutes} minutes`)),
      format.description ? prose(format.description) : null,
      h(
        'div.stack',
        { style: { gap: '6px', marginTop: '12px' } },
        ...format.sections.map((section) =>
          h(
            'div.list-item',
            {},
            h(
              'div',
              {},
              h('b', {}, section.name),
              h('span', {}, `${section.count} × ${titleCase(section.question_type)} · ${section.minutes} min${section.notes ? ` · ${section.notes}` : ''}`),
            ),
            h('span.chip', {}, `${section.weight_percent}%`),
          ),
        ),
      ),
    );
  }

  /* ------------------------------------------------------------- actions */

  function teachUnit(unitTitle, kind) {
    const unit = snapshot.units.find((u) => u.title === unitTitle);
    startGeneration({
      kind: kind || (unit && unit.expected < 0.4 ? 'lesson' : 'practice_set'),
      topic: unitTitle,
      subject: snapshot.course.subject,
      concepts: unit?.concepts.slice(0, 6).map((c) => c.name) || [],
      instructions: `This sits inside ${snapshot.course.title}, worth ${unit?.exam_weight ?? '?'}% of the exam. Pitch it at exam level.`,
    });
  }

  async function doNext() {
    const host = h('div.card.stack', { style: { gap: '12px' } });
    host.appendChild(statusLine('Working out what is worth the most marks…'));
    root.insertBefore(host, root.children[2] || null);
    host.scrollIntoView({ behavior: 'smooth', block: 'center' });

    try {
      await api.courseNext(snapshot.course.id, {
        status: ({ message }) => {
          const line = host.querySelector('.status-line span:last-child');
          if (line) line.textContent = message;
        },
        resource: ({ resource }) => {
          clear(host).appendChild(
            h(
              'button.list-item',
              { type: 'button', onClick: () => navigate(`/resource/${resource.id}`) },
              h('div', {}, h('b', {}, resource.title), h('span', {}, `${resourceLabel(resource.kind)} · open it`)),
              icon('arrowRight', { size: 14 }),
            ),
          );
        },
      });
    } catch (err) {
      clear(host).appendChild(h('p', { style: { color: 'var(--critical)' } }, err.message || 'Could not build that.'));
    }
  }

  async function sitExam() {
    const host = h('div.card', {}, statusLine('Writing a paper to the real blueprint…'));
    root.insertBefore(host, root.children[2] || null);
    host.scrollIntoView({ behavior: 'smooth', block: 'center' });
    try {
      await api.courseExam(snapshot.course.id, {
        resource: ({ resource }) => navigate(`/resource/${resource.id}`),
      });
    } catch (err) {
      clear(host).appendChild(h('p', { style: { color: 'var(--critical)' } }, err.message));
    }
  }

  function settings() {
    modal((panel, close) => {
      const bands = snapshot.readiness.bands;
      let target = snapshot.targetScore;
      const date = h('input.input', { type: 'date', value: snapshot.course.exam_date || '' });
      const minutes = h('input.input', { type: 'number', min: '10', max: '480', value: String(snapshot.course.state?.minutesPerDay ?? 60) });

      panel.appendChild(h('h3', {}, 'Course settings'));
      panel.appendChild(
        h(
          'div.field',
          {},
          h('label', {}, 'Target score'),
          h(
            'div.toggle-group',
            {},
            ...bands.map((band) =>
              h(
                'button',
                {
                  type: 'button',
                  class: `toggle${band.score === target ? ' on' : ''}`,
                  onClick: (event) => {
                    target = band.score;
                    panel.querySelectorAll('.toggle').forEach((t) => t.classList.remove('on'));
                    event.currentTarget.classList.add('on');
                  },
                },
                String(band.score),
              ),
            ),
          ),
        ),
      );
      panel.appendChild(h('div.field', {}, h('label', {}, 'Exam date'), date));
      panel.appendChild(h('div.field', {}, h('label', {}, 'Minutes you can study per day'), minutes));
      panel.appendChild(
        h(
          'div.row',
          { style: { justifyContent: 'flex-end' } },
          h('button.btn', { type: 'button', onClick: close }, 'Cancel'),
          h(
            'button.btn.primary',
            {
              type: 'button',
              onClick: async () => {
                try {
                  await api.updateCourse(snapshot.course.id, {
                    targetScore: target,
                    examDate: date.value || null,
                    minutesPerDay: Number(minutes.value) || 60,
                  });
                  close();
                  refresh();
                } catch (err) {
                  toast(err.message, 'error');
                }
              },
            },
            'Save',
          ),
        ),
      );
    });
  }

  return root;
}

/** What the learner sees while the blueprint is still being written. */
function coursePreview(partial) {
  const root = h('div.stack', { style: { gap: '12px' } });
  if (partial.title) root.appendChild(h('h2', { style: { fontSize: '20px', fontWeight: 620, letterSpacing: '-0.02em' } }, partial.title));
  if (partial.overview) root.appendChild(prose(partial.overview));
  if (partial.units?.length) {
    root.appendChild(
      h(
        'div.stack',
        { style: { gap: '6px' } },
        ...partial.units.map((unit) =>
          h(
            'div.list-item',
            {},
            h('div', {}, h('b', {}, unit.title || '…'), h('span', {}, `${unit.concepts?.length || 0} concepts`)),
            unit.exam_weight_percent ? h('span.chip', {}, `${unit.exam_weight_percent}%`) : null,
          ),
        ),
      ),
    );
  }
  return root;
}

export { renderPreview };
