/* Cadence — notes, ideas and the capture inbox. */
(function (global) {
  'use strict';
  var Views = global.Views = global.Views || {};

  var view = { type: 'all', query: '', tag: null };
  var root = null;
  function rerender() { if (root) render(root); }

  function render(container, params) {
    root = container;
    if (params && params.type) view.type = params.type;
    D.clear(container);

    container.appendChild(D.h('header.page__head', [
      D.h('div.page__head-main', [
        D.h('h1.page__title', { text: 'Notes & ideas' }),
        D.h('p.page__subtitle', { text: 'Somewhere to put things before you know what they are.' })
      ]),
      D.h('div.page__head-actions', [
        D.h('button.btn.btn--ghost', {
          type: 'button', onclick: function () { UI.organizeDialog(); }
        }, [D.icon('zap', 16), 'Organize a dump']),
        D.h('button.btn.btn--primary', {
          type: 'button', onclick: function () { UI.editNote(null); }
        }, [D.icon('plus', 16), 'New note'])
      ])
    ]));

    container.appendChild(UI.captureBox({ onAdd: rerender }));

    var filters = D.h('div.notes__filters');
    var types = [{ value: 'all', label: 'All' }].concat(M.NOTE_KINDS.map(function (k) {
      return { value: k.id, label: k.label };
    }));
    types.forEach(function (t) {
      filters.appendChild(D.h('button.chip', {
        type: 'button', 'aria-pressed': view.type === t.value ? 'true' : 'false',
        onclick: function () { view.type = t.value; rerender(); }
      }, t.label));
    });
    if (view.tag) {
      filters.appendChild(D.h('button.chip.chip--clear', {
        type: 'button', onclick: function () { view.tag = null; rerender(); }
      }, ['#' + view.tag, D.icon('x', 13)]));
    }
    container.appendChild(filters);

    var notes = S.all('notes').filter(function (n) {
      if (n.archived) return false;
      if (view.type !== 'all' && n.type !== view.type) return false;
      if (view.tag && (n.tags || []).indexOf(view.tag) < 0) return false;
      return true;
    }).sort(function (a, b) {
      if (!!b.pinned !== !!a.pinned) return b.pinned ? 1 : -1;
      return T.w(b.updatedAt) - T.w(a.updatedAt);
    });

    if (!notes.length) {
      container.appendChild(UI.emptyState({
        icon: 'note',
        title: view.type === 'all' ? 'No notes yet' : 'Nothing of that kind yet',
        body: 'Notes hold information — a meeting record, study notes, a half-formed idea. Nothing here needs a date.',
        actions: [
          { label: 'New note', onClick: function () { UI.editNote(null); } },
          { label: 'Capture a thought', onClick: function () { var b = D.qs('.capture__input', container); if (b) b.focus(); } }
        ]
      }));
      return;
    }

    var grid = D.h('div.notes__grid');
    notes.forEach(function (n) { grid.appendChild(noteCard(n)); });
    container.appendChild(grid);
  }

  function noteCard(note) {
    var kind = M.NOTE_KINDS.filter(function (k) { return k.id === note.type; })[0] || M.NOTE_KINDS[0];
    var card = D.h('article.note' + (note.pinned ? '.is-pinned' : ''));

    card.appendChild(D.h('div.note__head', [
      D.h('span.note__kind', { text: kind.label }),
      D.h('div.note__head-actions', [
        D.iconButton(note.pinned ? 'star' : 'star', note.pinned ? 'Unpin note' : 'Pin note', function () {
          A.updateNote(note.id, { pinned: !note.pinned });
          rerender();
        }, { size: 14, class: note.pinned ? 'is-active' : null }),
        D.iconButton('more', 'Note actions', function (e) { noteMenu(e.currentTarget, note); }, { size: 15 })
      ])
    ]));

    var title = note.title || firstLine(note.body) || 'Untitled note';
    card.appendChild(D.h('button.note__title', {
      type: 'button', onclick: function () { UI.editNote(note); }
    }, title));

    if (note.type === 'checklist' && (note.checklist || []).length) {
      var list = D.h('ul.note__checklist');
      note.checklist.slice(0, 6).forEach(function (item) {
        list.appendChild(D.h('li.note__check' + (item.done ? '.is-done' : ''), [
          D.h('button.check.check--sm', {
            type: 'button', role: 'checkbox', 'aria-checked': item.done ? 'true' : 'false',
            'aria-label': item.title,
            onclick: function () {
              var next = (note.checklist || []).map(function (c) {
                return c.id === item.id ? Object.assign({}, c, { done: !c.done }) : c;
              });
              A.updateNote(note.id, { checklist: next });
              rerender();
            }
          }, item.done ? D.icon('check', 11) : null),
          D.h('span', { text: item.title })
        ]));
      });
      if (note.checklist.length > 6) {
        list.appendChild(D.h('li.note__more', { text: '+' + (note.checklist.length - 6) + ' more' }));
      }
      card.appendChild(list);
    } else if (note.body) {
      card.appendChild(D.h('p.note__body', { text: excerpt(note.body, note.title ? 200 : 160) }));
    }

    var foot = D.h('div.note__foot');
    (note.tags || []).slice(0, 4).forEach(function (t) {
      foot.appendChild(D.h('button.note__tag', {
        type: 'button', onclick: function () { view.tag = t; rerender(); }
      }, '#' + t));
    });
    if (note.projectId) {
      var p = S.get('projects', note.projectId);
      if (p) {
        foot.appendChild(D.h('button.note__tag.note__tag--project', {
          type: 'button', style: { '--chip-color': p.color },
          onclick: function () { UI.go('projects', { id: p.id }); }
        }, p.name));
      }
    }
    foot.appendChild(D.h('span.note__date', { text: T.relativeDay(T.w(note.updatedAt)) }));
    card.appendChild(foot);
    return card;
  }

  function noteMenu(anchor, note) {
    UI.menu(anchor, [
      { label: 'Edit', icon: 'edit', onClick: function () { UI.editNote(note); } },
      {
        label: 'Turn into a task', icon: 'checkSquare', onClick: function () {
          A.createTask({ title: note.title || firstLine(note.body), description: note.body, projectId: note.projectId, tags: note.tags });
          UI.toast('Task created from note', { undo: true });
        }
      },
      {
        label: 'Organize its contents', icon: 'zap', onClick: function () {
          UI.organizeDialog({ text: (note.title ? note.title + '\n' : '') + note.body });
        }
      },
      { separator: true },
      {
        label: 'Delete', icon: 'trash', danger: true, onClick: function () {
          UI.confirm({ title: 'Delete this note?', message: 'You can undo this straight away.', confirmLabel: 'Delete', tone: 'danger' })
            .then(function (ok) { if (ok) { A.deleteNote(note.id); rerender(); } });
        }
      }
    ], { align: 'right' });
  }

  function firstLine(s) { return String(s || '').split('\n')[0].slice(0, 80); }
  function excerpt(s, n) {
    var t = String(s || '').replace(/\s+/g, ' ').trim();
    return t.length > n ? t.slice(0, n - 1) + '…' : t;
  }

  /* ----------------------------------------------------- capture inbox */

  function renderCapture(container) {
    root = null;
    D.clear(container);
    container.appendChild(D.h('header.page__head', [
      D.h('div.page__head-main', [
        D.h('h1.page__title', { text: 'Capture inbox' }),
        D.h('p.page__subtitle', { text: 'Everything you dumped, waiting to become something.' })
      ]),
      D.h('div.page__head-actions', [
        D.h('button.btn.btn--primary', {
          type: 'button', onclick: function () { UI.organizeDialog({ onDone: function () { UI.refresh(); } }); }
        }, [D.icon('zap', 16), 'Organize new text'])
      ])
    ]));

    container.appendChild(UI.captureBox({ onAdd: function () { UI.refresh(); } }));

    var captures = S.all('captures').filter(function (c) { return !c.processed; })
      .sort(function (a, b) { return T.w(b.createdAt) - T.w(a.createdAt); });

    if (!captures.length) {
      container.appendChild(UI.emptyState({
        icon: 'inbox',
        title: 'Inbox is empty',
        body: 'Anything you capture lands here until you turn it into a task, an event or a note.',
        actions: [{ label: 'Organize a brain dump', onClick: function () { UI.organizeDialog(); } }]
      }));
      return;
    }

    var list = D.h('ul.captures');
    captures.forEach(function (c) {
      list.appendChild(D.h('li.capture-row', [
        D.h('div.capture-row__main', [
          D.h('p.capture-row__text', { text: c.text }),
          D.h('span.capture-row__when', { text: T.relativeDay(T.w(c.createdAt)) + ' · ' + T.fmtTime(T.w(c.createdAt), S.settings().use24Hour) })
        ]),
        D.h('div.capture-row__actions', [
          D.h('button.btn.btn--sm.btn--primary', {
            type: 'button',
            onclick: function () { UI.organizeDialog({ text: c.text, captureId: c.id, onDone: function () { UI.refresh(); } }); }
          }, 'Organize'),
          D.h('button.btn.btn--sm.btn--ghost', {
            type: 'button',
            onclick: function () {
              A.createNote({ body: c.text, type: 'idea' });
              A.markCaptureProcessed(c.id);
              UI.refresh();
            }
          }, 'Keep as note'),
          D.iconButton('trash', 'Discard', function () {
            A.deleteCapture(c.id);
            UI.refresh();
          }, { size: 15 })
        ])
      ]));
    });
    container.appendChild(list);
  }

  Views.notes = { render: render, rerender: rerender };
  Views.capture = { render: renderCapture };
})(window);
