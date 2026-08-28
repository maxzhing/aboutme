/* Cadence — projects: the place related tasks, deadlines, events and notes live
   together, with a progress read that comes from real work rather than a slider. */
(function (global) {
  'use strict';
  var Views = global.Views = global.Views || {};

  var openId = null;
  var root = null;
  function rerender() { if (root) render(root); }

  function render(container, params) {
    root = container;
    if (params && params.id !== undefined) openId = params.id;
    D.clear(container);
    if (openId && S.get('projects', openId)) renderDetail(container, S.get('projects', openId));
    else renderList(container);
  }

  function renderList(container) {
    var projects = S.all('projects').filter(function (p) { return p.status !== 'archived'; });

    container.appendChild(D.h('header.page__head', [
      D.h('div.page__head-main', [
        D.h('h1.page__title', { text: 'Projects' }),
        D.h('p.page__subtitle', { text: 'Work that takes more than one sitting.' })
      ]),
      D.h('div.page__head-actions', [
        D.h('button.btn.btn--primary', {
          type: 'button', onclick: function () { UI.editProject(null); }
        }, [D.icon('plus', 16), 'New project'])
      ])
    ]));

    if (!projects.length) {
      container.appendChild(UI.emptyState({
        icon: 'folder',
        title: 'No projects yet',
        body: 'A project groups the tasks, deadlines, events and notes that belong to one piece of work — a science fair entry, a paper, an application.',
        actions: [{ label: 'Create a project', onClick: function () { UI.editProject(null); } }]
      }));
      return;
    }

    var grid = D.h('div.projects__grid');
    projects.forEach(function (p) { grid.appendChild(projectCard(p)); });
    container.appendChild(grid);

    var archived = S.all('projects').filter(function (p) { return p.status === 'archived'; });
    if (archived.length) {
      container.appendChild(D.h('h2.section-title', { text: 'Archived' }));
      var arch = D.h('div.projects__grid');
      archived.forEach(function (p) { arch.appendChild(projectCard(p)); });
      container.appendChild(arch);
    }
  }

  function projectCard(p) {
    var progress = Q.projectProgress(p.id);
    var due = p.due ? T.w(p.due) : null;
    var now = T.nowWall();
    var card = D.h('article.project', { style: { '--proj-color': p.color } });

    card.appendChild(D.h('div.project__head', [
      D.h('span.project__swatch', { style: { background: p.color } }),
      D.h('button.project__name', {
        type: 'button', onclick: function () { openId = p.id; rerender(); }
      }, p.name),
      D.iconButton('more', 'Project actions', function (e) { projectMenu(e.currentTarget, p); }, { size: 15 })
    ]));

    if (p.description) card.appendChild(D.h('p.project__desc', { text: p.description }));

    card.appendChild(progressBar(progress.pct, p.color));
    card.appendChild(D.h('div.project__meta', [
      D.h('span', { text: progress.total ? progress.done + ' of ' + progress.total + ' tasks' : 'No tasks yet' }),
      due ? D.h('span' + (due < now ? '.is-overdue' : ''), { text: 'Target ' + T.fmtDateShort(due) }) : null
    ]));
    return card;
  }

  function progressBar(pct, color) {
    return D.h('div.progress', {
      role: 'progressbar', 'aria-valuenow': String(pct), 'aria-valuemin': '0', 'aria-valuemax': '100',
      'aria-label': pct + ' per cent complete'
    }, [
      D.h('div.progress__fill', { style: { width: pct + '%', background: color || 'var(--accent)' } }),
      D.h('span.progress__label', { text: pct + '%' })
    ]);
  }

  function projectMenu(anchor, p) {
    UI.menu(anchor, [
      { label: 'Open', icon: 'arrowRight', onClick: function () { openId = p.id; rerender(); } },
      { label: 'Edit', icon: 'edit', onClick: function () { UI.editProject(p); } },
      { label: 'Add a task', icon: 'checkSquare', onClick: function () { UI.editTask({ projectId: p.id }); } },
      { label: 'Add a deadline', icon: 'flag', onClick: function () { UI.editDeadline({ projectId: p.id }); } },
      { label: 'Add a note', icon: 'note', onClick: function () { UI.editNote({ projectId: p.id }); } },
      { separator: true },
      {
        label: p.status === 'archived' ? 'Unarchive' : 'Archive', icon: 'folder',
        onClick: function () { A.updateProject(p.id, { status: p.status === 'archived' ? 'active' : 'archived' }); rerender(); }
      },
      {
        label: 'Delete', icon: 'trash', danger: true, onClick: function () {
          UI.confirm({
            title: 'Delete “' + p.name + '”?',
            message: 'Its tasks, notes and events are kept — they simply stop being grouped here.',
            confirmLabel: 'Delete project', tone: 'danger'
          }).then(function (ok) { if (ok) { A.deleteProject(p.id); openId = null; rerender(); } });
        }
      }
    ], { align: 'right' });
  }

  /* ------------------------------------------------------------- detail */

  function renderDetail(container, p) {
    var now = T.nowWall();
    var progress = Q.projectProgress(p.id);
    var tasks = Q.tasksForProject(p.id);
    var deadlines = S.all('deadlines').filter(function (d) { return d.projectId === p.id; })
      .sort(function (a, b) { return T.w(a.due) - T.w(b.due); });
    var notes = Q.notesFor('projectId', p.id);
    var events = Q.eventsForProject(p.id);

    container.appendChild(D.h('div.detail__back',
      D.h('button.btn.btn--ghost.btn--sm', {
        type: 'button', onclick: function () { openId = null; rerender(); }
      }, [D.icon('chevronLeft', 15), 'All projects'])));

    container.appendChild(D.h('header.page__head', [
      D.h('div.page__head-main', [
        D.h('h1.page__title', [
          D.h('span.project__swatch', { style: { background: p.color } }),
          D.h('span', { text: p.name })
        ]),
        p.description ? D.h('p.page__subtitle', { text: p.description }) : null
      ]),
      D.h('div.page__head-actions', [
        D.h('button.btn.btn--ghost', { type: 'button', onclick: function () { UI.editProject(p); } }, [D.icon('edit', 15), 'Edit']),
        D.h('button.btn.btn--primary', { type: 'button', onclick: function () { UI.editTask({ projectId: p.id }); } }, [D.icon('plus', 15), 'Add task'])
      ])
    ]));

    var overview = D.h('div.detail__overview', [
      statBlock(progress.pct + '%', 'complete', progressBar(progress.pct, p.color)),
      statBlock(String(progress.total - progress.done), 'tasks left'),
      statBlock(p.due ? T.relativeTime(T.w(p.due), now) : '—', p.due ? 'until the target date' : 'no target date'),
      statBlock(String(deadlines.filter(function (d) { return !d.done; }).length), 'open deadlines')
    ]);
    container.appendChild(overview);

    if (p.goalId) {
      var goal = S.get('goals', p.goalId);
      if (goal) {
        container.appendChild(D.h('p.detail__link', [
          D.icon('target', 14),
          D.h('span', { text: 'Part of ' }),
          D.h('button.link', { type: 'button', onclick: function () { UI.go('goals', { id: goal.id }); } }, goal.name)
        ]));
      }
    }

    /* timeline of the project's work */
    container.appendChild(D.h('h2.section-title', { text: 'Timeline' }));
    container.appendChild(projectTimeline(p, tasks, deadlines, events, now));

    container.appendChild(sectionHeader('Tasks', 'Add task', function () { UI.editTask({ projectId: p.id }); }));
    if (!tasks.length) {
      container.appendChild(UI.emptyState({
        icon: 'checkSquare', title: 'No tasks yet',
        body: 'Break the project into steps you can actually finish.',
        actions: [
          { label: 'Add a task', onClick: function () { UI.editTask({ projectId: p.id }); } },
          { label: 'Dump the steps', onClick: function () { UI.organizeDialog(); } }
        ]
      }));
    } else {
      var list = D.h('ul.tlist');
      tasks.slice().sort(function (a, b) {
        if ((a.status === 'completed') !== (b.status === 'completed')) return a.status === 'completed' ? 1 : -1;
        return (a.due ? T.w(a.due) : Infinity) - (b.due ? T.w(b.due) : Infinity);
      }).forEach(function (t) {
        list.appendChild(compactTaskRow(t));
      });
      container.appendChild(list);
    }

    container.appendChild(sectionHeader('Deadlines', 'Add deadline', function () { UI.editDeadline({ projectId: p.id }); }));
    if (!deadlines.length) {
      container.appendChild(D.h('p.card__note', { text: 'No deadlines attached to this project.' }));
    } else {
      var dl = D.h('ul.deadline-list');
      deadlines.forEach(function (d) {
        var status = Q.deadlineStatus(d, now);
        dl.appendChild(D.h('li.deadline-row.is-' + status.level, [
          D.h('button.check', {
            type: 'button', role: 'checkbox', 'aria-checked': d.done ? 'true' : 'false',
            'aria-label': 'Mark ' + d.title + ' complete',
            onclick: function () { A.toggleDeadline(d.id); rerender(); }
          }, d.done ? D.icon('check', 13) : null),
          D.h('button.deadline-row__title', { type: 'button', onclick: function () { UI.editDeadline(d); } }, d.title),
          D.h('span.deadline-row__when', { text: status.label })
        ]));
      });
      container.appendChild(dl);
    }

    container.appendChild(sectionHeader('Scheduled work', 'Find time', function () {
      UI.findTimeDialog({
        minutes: 90, title: p.name,
        onPick: function (slot) {
          A.createEvent({
            title: 'Work on ' + p.name,
            start: T.iso(slot.start), end: T.iso(T.addMinutes(slot.start, slot.minutes)),
            type: 'block', projectId: p.id, color: p.color
          });
        }
      });
    }));
    var upcoming = events.filter(function (e) { return e.endWall >= T.startOfDay(now); }).slice(0, 8);
    if (!upcoming.length) {
      container.appendChild(D.h('p.card__note', { text: 'Nothing on the calendar for this project yet.' }));
    } else {
      var ev = D.h('ul.mini-schedule');
      upcoming.forEach(function (e) {
        ev.appendChild(D.h('li', D.h('button.mini-schedule__row', {
          type: 'button', onclick: function () { UI.editEvent(e); }
        }, [
          D.h('span.mini-schedule__time', { text: T.fmtDateShort(e.startWall) }),
          D.h('span.mini-schedule__bar', { style: { background: Q.eventColor(e) } }),
          D.h('span.mini-schedule__title', { text: e.title }),
          D.h('span.mini-schedule__meta', { text: e.allDay ? 'All day' : T.fmtTime(e.startWall, S.settings().use24Hour) })
        ])));
      });
      container.appendChild(ev);
    }

    container.appendChild(sectionHeader('Notes', 'Add note', function () { UI.editNote({ projectId: p.id }); }));
    if (!notes.length) {
      container.appendChild(D.h('p.card__note', { text: 'No notes yet.' }));
    } else {
      var ng = D.h('div.notes__grid');
      notes.forEach(function (n) {
        ng.appendChild(D.h('article.note', [
          D.h('button.note__title', { type: 'button', onclick: function () { UI.editNote(n); } }, n.title || 'Untitled note'),
          n.body ? D.h('p.note__body', { text: n.body.slice(0, 160) }) : null
        ]));
      });
      container.appendChild(ng);
    }
  }

  function sectionHeader(title, actionLabel, onClick) {
    return D.h('div.section-head', [
      D.h('h2.section-title', { text: title }),
      actionLabel ? D.h('button.btn.btn--ghost.btn--sm', { type: 'button', onclick: onClick }, [D.icon('plus', 14), actionLabel]) : null
    ]);
  }

  function statBlock(value, label, extra) {
    return D.h('div.statblock', [
      D.h('span.statblock__value', { text: value }),
      D.h('span.statblock__label', { text: label }),
      extra || null
    ]);
  }

  function compactTaskRow(t) {
    var done = t.status === 'completed';
    return D.h('li.trow' + (done ? '.is-done' : ''), [
      D.h('button.check.trow__check', {
        type: 'button', role: 'checkbox', 'aria-checked': done ? 'true' : 'false',
        'aria-label': (done ? 'Reopen ' : 'Complete ') + t.title,
        onclick: function () { A.completeTask(t.id); rerender(); }
      }, done ? D.icon('check', 13) : null),
      D.h('div.trow__main', [
        D.h('button.trow__title', { type: 'button', onclick: function () { UI.editTask(t); } }, t.title),
        D.h('div.trow__meta', [
          t.due ? D.h('span.trow__chip', [D.icon('calendar', 12), D.h('span', { text: T.relativeDay(T.w(t.due)) })]) : null,
          t.estimate ? D.h('span.trow__chip', [D.icon('clock', 12), D.h('span', { text: T.humanDuration(t.estimate) })]) : null
        ])
      ]),
      D.iconButton('calendar', 'Find time for ' + t.title, function () {
        UI.findTimeDialog({
          minutes: Q.taskEstimate(t), title: t.title, before: t.due,
          onPick: function (slot) { A.scheduleTask(t.id, slot.start, slot.minutes); }
        });
      }, { size: 15 })
    ]);
  }

  /* A simple span chart: where the project's work sits between now and its date. */
  function projectTimeline(p, tasks, deadlines, events, now) {
    var start = T.startOfDay(now);
    var candidates = [p.due ? T.w(p.due) : null]
      .concat(deadlines.map(function (d) { return T.w(d.due); }))
      .concat(tasks.map(function (t) { return t.due ? T.w(t.due) : null; }))
      .concat(events.map(function (e) { return e.endWall; }))
      .filter(Boolean);
    var end = candidates.length ? new Date(Math.max.apply(null, candidates.map(function (d) { return d.getTime(); }))) : T.addDays(start, 30);
    if (end < T.addDays(start, 7)) end = T.addDays(start, 7);
    var span = Math.max(1, T.diffDays(start, end));

    var wrap = D.h('div.ptimeline');
    var track = D.h('div.ptimeline__track');

    events.filter(function (e) { return e.endWall >= start; }).forEach(function (e) {
      var offset = Math.max(0, T.diffDays(start, e.startWall)) / span * 100;
      var width = Math.max(1.5, (T.diffDays(e.startWall, e.endWall) + 1) / span * 100);
      track.appendChild(D.h('span.ptimeline__bar', {
        title: e.title + ' · ' + T.fmtDateShort(e.startWall),
        style: { left: offset + '%', width: width + '%', background: D.mix(p.color, 0.5) }
      }));
    });

    deadlines.forEach(function (d) {
      var due = T.w(d.due);
      if (due < start) return;
      var offset = T.diffDays(start, due) / span * 100;
      track.appendChild(D.h('span.ptimeline__marker' + (d.done ? '.is-done' : ''), {
        title: d.title + ' · ' + T.fmtDateShort(due),
        style: { left: offset + '%' }
      }, D.icon('flag', 12)));
    });

    if (p.due) {
      var target = T.w(p.due);
      track.appendChild(D.h('span.ptimeline__target', {
        title: 'Target: ' + T.fmtDateShort(target),
        style: { left: (T.diffDays(start, target) / span * 100) + '%' }
      }));
    }

    wrap.appendChild(track);
    wrap.appendChild(D.h('div.ptimeline__axis', [
      D.h('span', { text: 'Today' }),
      D.h('span', { text: T.fmtDateShort(end) })
    ]));
    return wrap;
  }

  Views.projects = { render: render, rerender: rerender, progressBar: progressBar };
})(window);
