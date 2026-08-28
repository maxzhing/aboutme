/* Cadence — the full search page. Same index as the command palette, more room
   to show it, and filters for when you know what kind of thing you are after. */
(function (global) {
  'use strict';
  var Views = global.Views = global.Views || {};

  var query = '';
  var typeFilter = null;
  var root = null;
  function rerender() { if (root) render(root); }

  var TYPES = [
    { id: null, label: 'Everything' },
    { id: 'event', label: 'Events' },
    { id: 'task', label: 'Tasks' },
    { id: 'deadline', label: 'Deadlines' },
    { id: 'note', label: 'Notes' },
    { id: 'project', label: 'Projects' },
    { id: 'goal', label: 'Goals' },
    { id: 'habit', label: 'Habits' },
    { id: 'person', label: 'People' },
    { id: 'location', label: 'Locations' },
    { id: 'tag', label: 'Tags' }
  ];

  function render(container, params) {
    root = container;
    if (params && params.q !== undefined) query = params.q;
    if (params && params.type !== undefined) typeFilter = params.type;
    D.clear(container);

    var input = D.h('input.search__input', {
      type: 'search',
      value: query,
      placeholder: 'Search events, tasks, notes, projects, people…',
      'aria-label': 'Search everything',
      autocomplete: 'off',
      'data-autofocus': ''
    });
    input.addEventListener('input', D.debounce(function () {
      query = input.value;
      paintResults();
    }, 90));

    container.appendChild(D.h('header.page__head', [
      D.h('div.page__head-main', [
        D.h('h1.page__title', { text: 'Search' }),
        D.h('p.page__subtitle', { text: 'One box over everything you have written down.' })
      ])
    ]));
    container.appendChild(D.h('div.search__bar', [D.icon('search', 18), input]));

    var filters = D.h('div.search__filters');
    TYPES.forEach(function (t) {
      filters.appendChild(D.h('button.chip', {
        type: 'button', 'aria-pressed': typeFilter === t.id ? 'true' : 'false',
        onclick: function () { typeFilter = t.id; paintResults(); }
      }, t.label));
    });
    container.appendChild(filters);

    var results = D.h('div.search__results', { 'aria-live': 'polite' });
    container.appendChild(results);

    function paintResults() {
      D.qsa('.chip', filters).forEach(function (c, i) {
        c.setAttribute('aria-pressed', TYPES[i].id === typeFilter ? 'true' : 'false');
      });
      D.clear(results);
      if (!query.trim()) {
        results.appendChild(recentBlock());
        return;
      }
      var found = SEARCH.search(query, { limit: 60, type: typeFilter });
      if (!found.length) {
        results.appendChild(UI.emptyState({
          icon: 'search',
          title: 'Nothing matches “' + query.trim() + '”',
          body: 'Search covers titles, descriptions, notes, tags, people and locations. Try fewer letters.',
          actions: [{ label: 'Add “' + query.trim() + '”', onClick: function () { UI.quickAdd({ text: query.trim() }); } }]
        }));
        return;
      }
      var grouped = {};
      found.forEach(function (r) { (grouped[r.doc.type] || (grouped[r.doc.type] = [])).push(r); });
      Object.keys(grouped).forEach(function (type) {
        var meta = SEARCH.typeMeta(type);
        results.appendChild(D.h('h2.section-title', { text: meta.label + 's' }));
        var list = D.h('ul.search__list');
        grouped[type].forEach(function (r) { list.appendChild(resultRow(r, meta)); });
        results.appendChild(list);
      });
    }

    paintResults();
    setTimeout(function () { input.focus(); }, 40);
  }

  function resultRow(r, meta) {
    var title = D.h('span.search__title');
    SEARCH.highlight(r.doc.title, r.positions).forEach(function (part) {
      title.appendChild(part.hit ? D.h('mark', { text: part.text }) : document.createTextNode(part.text));
    });
    return D.h('li', D.h('button.search__row', {
      type: 'button', onclick: function () { UI.openSearchResult(r.doc); }
    }, [
      D.h('span.search__icon', D.icon(meta.icon || 'circle', 16)),
      D.h('span.search__main', [title, D.h('span.search__sub', { text: r.doc.subtitle || meta.label })]),
      D.h('span.search__type', { text: meta.label })
    ]));
  }

  function recentBlock() {
    var wrap = D.h('div');
    var tags = Q.allTags().slice(0, 14);
    if (tags.length) {
      wrap.appendChild(D.h('h2.section-title', { text: 'Tags' }));
      var chips = D.h('div.search__tags');
      tags.forEach(function (t) {
        chips.appendChild(D.h('button.chip', {
          type: 'button',
          onclick: function () { query = '#' + t.tag; render(root); }
        }, ['#' + t.tag, D.h('span.chip__count', { text: String(t.count) })]));
      });
      wrap.appendChild(chips);
    }

    var now = T.nowWall();
    var upcoming = Q.eventsInRange(now, T.addDays(now, 7), { ignoreLayers: true }).slice(0, 6);
    if (upcoming.length) {
      wrap.appendChild(D.h('h2.section-title', { text: 'Coming up' }));
      var list = D.h('ul.search__list');
      upcoming.forEach(function (e) {
        list.appendChild(D.h('li', D.h('button.search__row', {
          type: 'button', onclick: function () { UI.editEvent(e); }
        }, [
          D.h('span.search__icon', D.icon('calendar', 16)),
          D.h('span.search__main', [
            D.h('span.search__title', { text: e.title }),
            D.h('span.search__sub', { text: T.relativeDay(e.startWall, now) + ' · ' + (e.allDay ? 'all day' : T.fmtTime(e.startWall, S.settings().use24Hour)) })
          ])
        ])));
      });
      wrap.appendChild(list);
    }

    if (!wrap.childNodes.length) {
      wrap.appendChild(UI.emptyState({
        icon: 'search',
        title: 'Search everything at once',
        body: 'Type part of a title, a tag, a person or a place. Partial words work — “bio” finds “Biology test”.'
      }));
    }
    return wrap;
  }

  /* Routing for a search hit: open the right editor or jump to the right place. */
  function openResult(doc) {
    switch (doc.type) {
      case 'event': {
        var base = S.get('events', doc.id);
        if (!base) return;
        var inst = R.nextOccurrence(base, T.addDays(T.nowWall(), -365)) || base;
        UI.go('calendar', { date: T.key(T.w(inst.start)) });
        setTimeout(function () { UI.editEvent(inst.startWall ? inst : base); }, 60);
        break;
      }
      case 'task': UI.editTask(S.get('tasks', doc.id)); break;
      case 'deadline': UI.editDeadline(S.get('deadlines', doc.id)); break;
      case 'note': UI.editNote(S.get('notes', doc.id)); break;
      case 'project': UI.go('projects', { id: doc.id }); break;
      case 'goal': UI.go('goals', { id: doc.id }); break;
      case 'habit': UI.editHabit(S.get('habits', doc.id)); break;
      case 'tag':
        query = doc.title;
        UI.go('search', { q: doc.title });
        break;
      case 'person':
      case 'location':
        query = doc.title;
        UI.go('search', { q: doc.title });
        break;
    }
  }

  Views.search = { render: render, rerender: rerender, openResult: openResult, setQuery: function (q) { query = q; } };
})(window);
