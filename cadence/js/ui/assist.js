/* Cadence — the assistant surfaces.
   Find Time, Plan My Day, What Should I Do Now, conflict resolution and missed-
   task recovery. Every one of these proposes and waits for a yes. */
(function (global) {
  'use strict';
  var UI = global.UI = global.UI || {};
  var F = UI.F;

  function use24() { return S.settings().use24Hour; }

  /* ------------------------------------------------------------- find time */

  function findTimeDialog(opts) {
    opts = opts || {};
    var minutes = opts.minutes || 60;
    var before = opts.before ? T.w(opts.before) : null;
    var anyTime = false;

    var durationInput = F.duration({ value: minutes, onChange: function (v) { minutes = v || 60; refresh(); } });
    var beforeInput = F.date({ value: before, onchange: function () { before = beforeInput.getValue(); refresh(); } });
    var anyToggle = F.toggle({ value: false, onChange: function (v) { anyTime = v; refresh(); } });
    var results = D.h('div.slots', { 'aria-live': 'polite' });

    function refresh() {
      var list = SCHED.findTime(minutes, {
        days: 14, limit: 6,
        before: before ? T.iso(T.endOfDay(before)) : null,
        anyTime: anyTime
      });
      D.clear(results);
      if (!list.length) {
        results.appendChild(emptyState({
          icon: 'clock',
          title: 'No block that long is free',
          body: before
            ? 'Nothing of ' + T.humanDuration(minutes) + ' fits before ' + T.fmtDate(before) + '. Try a shorter block, a later date, or allow times outside your working hours.'
            : 'Try a shorter block, or allow times outside your working hours.',
          actions: [
            { label: 'Try ' + T.humanDuration(Math.max(15, Math.round(minutes / 2 / 15) * 15)), onClick: function () { minutes = Math.max(15, Math.round(minutes / 2 / 15) * 15); durationInput.setValue(minutes); refresh(); } },
            { label: 'Allow any time of day', onClick: function () { anyTime = true; anyToggle.setValue(true); refresh(); } }
          ]
        }));
        return;
      }
      list.forEach(function (slot, i) {
        results.appendChild(slotRow(slot, i === 0));
      });
    }

    function slotRow(slot, isBest) {
      var reason = slot.reasons.length ? slot.reasons.join(', ') : 'fits your free time';
      return D.h('div.slot' + (isBest ? '.is-best' : ''), [
        D.h('div.slot__main', [
          D.h('div.slot__when', [
            D.h('strong', { text: T.relativeDay(slot.start) + ', ' + T.fmtDateShort(slot.start) }),
            D.h('span.slot__time', { text: T.fmtTime(slot.start, use24()) + ' – ' + T.fmtTime(slot.end, use24()) })
          ]),
          D.h('p.slot__why', { text: isBest ? 'Best match — ' + reason : reason })
        ]),
        D.h('button.btn.btn--primary.btn--sm', {
          type: 'button',
          onclick: function () {
            layer.close();
            if (opts.onPick) opts.onPick(slot);
          }
        }, isBest ? 'Schedule' : 'Pick')
      ]);
    }

    var layer = UI.modal({
      size: 'md',
      title: 'Find time',
      subtitle: opts.title ? 'For “' + opts.title + '”' : 'Nothing is booked until you pick one.',
      body: D.h('div.findtime', [
        F.field('How long do you need?', durationInput),
        D.h('div.editor__grid', [
          F.field('Needs to be before', beforeInput, { hint: 'Optional.' }),
          F.field('Outside working hours', D.h('label.checkline', [anyToggle, D.h('span', { text: 'Allow evenings and weekends' })]))
        ]),
        D.h('h3.section-title', { text: 'Options' }),
        results
      ])
    });
    refresh();
    return layer;
  }

  /* ---------------------------------------------------------- plan my day */

  function planDayDialog(dayWall, opts) {
    opts = opts || {};
    dayWall = dayWall || T.nowWall();
    var plan = SCHED.planDay(dayWall, { now: T.nowWall() });
    var body = D.h('div.plan');
    var foot = D.h('div.plan__foot');

    var layer = UI.modal({
      size: 'lg',
      class: 'dialog--plan',
      title: 'Plan ' + (T.sameDay(dayWall, T.nowWall()) ? 'my day' : T.fmtDateLong(dayWall)),
      subtitle: 'A proposal. Nothing moves until you accept it.',
      body: body,
      footer: foot
    });

    function render() {
      D.clear(body);
      D.clear(foot);

      if (!plan.proposed.length) {
        body.appendChild(emptyState({
          icon: 'coffee',
          title: plan.stats.totalFree < 30 ? 'Your day is already full' : 'Nothing to schedule',
          body: plan.stats.totalFree < 30
            ? 'There is under half an hour of open time left, so there is nothing sensible to add.'
            : 'Every task that fits is already scheduled, or your list is clear. Enjoy the space.',
          actions: [{ label: 'Add a task', onClick: function () { layer.close(); UI.editTask(null); } }]
        }));
        foot.appendChild(D.h('div.sheet__foot-right',
          D.h('button.btn.btn--ghost', { type: 'button', onclick: function () { layer.close(); } }, 'Close')));
        return;
      }

      var stats = D.h('div.plan__stats', [
        stat('Free today', T.humanDuration(plan.stats.totalFree)),
        stat('This plan uses', T.humanDuration(plan.stats.scheduled)),
        stat('Left unscheduled', T.humanDuration(Math.max(0, plan.stats.remainingFree)), plan.stats.remainingFree < 60 ? 'warn' : null)
      ]);
      body.appendChild(stats);

      plan.warnings.forEach(function (w) {
        body.appendChild(D.h('div.notice.notice--' + (w.level === 'warn' ? 'warn' : 'info'), [
          D.icon(w.level === 'warn' ? 'alert' : 'sparkle', 15),
          D.h('span', { text: w.text })
        ]));
      });

      var timeline = D.h('ol.plan__list');
      var items = plan.fixed.concat(plan.proposed).sort(function (a, b) { return a.start - b.start; });
      items.forEach(function (item) {
        timeline.appendChild(planRow(item));
      });
      body.appendChild(timeline);

      foot.appendChild(D.h('div.sheet__foot-left',
        D.h('button.btn.btn--ghost.btn--sm', {
          type: 'button', onclick: function () { plan = SCHED.planDay(dayWall, { now: T.nowWall() }); render(); }
        }, [D.icon('repeat', 15), 'Rebuild'])));

      foot.appendChild(D.h('div.sheet__foot-right', [
        D.h('button.btn.btn--ghost', { type: 'button', onclick: function () { layer.close(); } }, 'Reject'),
        D.h('button.btn.btn--primary', { type: 'button', onclick: accept }, 'Accept selected')
      ]));
    }

    function stat(label, value, tone) {
      return D.h('div.plan__stat' + (tone ? '.is-' + tone : ''), [
        D.h('span.plan__stat-value', { text: value }),
        D.h('span.plan__stat-label', { text: label })
      ]);
    }

    function planRow(item) {
      var fixed = item.kind === 'fixed';
      var row = D.h('li.plan__row' + (fixed ? '.is-fixed' : '') + (item.kind === 'break' ? '.is-break' : ''));
      row.appendChild(D.h('span.plan__time', {
        text: T.fmtTime(item.start, use24()) + ' – ' + T.fmtTime(item.end, use24())
      }));

      var main = D.h('div.plan__main', [
        D.h('span.plan__title', { text: item.title }),
        fixed
          ? D.h('span.plan__tag', { text: 'Already scheduled' })
          : item.kind === 'break'
            ? D.h('span.plan__tag', { text: 'Breathing room' })
            : D.h('span.plan__why', {
              text: (item.partial ? 'A first ' + T.humanDuration(item.minutes) + ' — ' : '') +
                (item.reasons && item.reasons.length ? item.reasons.join(', ') : 'fits your free time')
            })
      ]);
      row.appendChild(main);

      if (!fixed) {
        var check = D.h('button.check', {
          type: 'button', role: 'checkbox', 'aria-checked': item.selected ? 'true' : 'false',
          'aria-label': 'Include ' + item.title,
          onclick: function () {
            item.selected = !item.selected;
            check.setAttribute('aria-checked', item.selected ? 'true' : 'false');
            row.classList.toggle('is-excluded', !item.selected);
            D.clear(check);
            if (item.selected) check.appendChild(D.icon('check', 13));
          }
        }, item.selected ? D.icon('check', 13) : null);
        row.appendChild(check);
      } else {
        row.appendChild(D.h('span.plan__lock', { 'aria-hidden': 'true' }, D.icon('clock', 14)));
      }
      return row;
    }

    function accept() {
      var chosen = plan.proposed.filter(function (p) { return p.selected; });
      if (!chosen.length) { UI.toast('Nothing selected'); return; }
      var created = 0;
      S.commit('Accept day plan', function (st) {
        chosen.forEach(function (item) {
          if (item.kind === 'break') {
            st.events.push(M.makeEvent({
              title: 'Break', start: T.iso(item.start), end: T.iso(item.end),
              type: 'block', categoryId: 'cat_relax'
            }));
            created++;
            return;
          }
          var ev = M.makeEvent({
            title: item.task.title,
            start: T.iso(item.start), end: T.iso(item.end),
            type: 'block',
            categoryId: item.task.categoryId,
            projectId: item.task.projectId,
            goalId: item.task.goalId,
            taskId: item.task.id,
            priority: item.task.priority,
            tags: item.task.tags
          });
          st.events.push(ev);
          for (var i = 0; i < st.tasks.length; i++) {
            if (st.tasks[i].id === item.task.id) {
              st.tasks[i].scheduledEventId = ev.id;
              if (st.tasks[i].status === 'inbox') st.tasks[i].status = 'planned';
            }
          }
          created++;
        });
      }, ['events', 'tasks']);

      UI.toast('Added ' + created + ' block' + (created === 1 ? '' : 's') + ' to ' + T.relativeDay(dayWall).toLowerCase(), { undo: true });
      layer.close();
      if (opts.onDone) opts.onDone();
    }

    render();
    return layer;
  }

  /* ------------------------------------------------------------ plan week */

  function planWeekDialog(startWall) {
    var start = T.startOfWeek(startWall || T.nowWall(), S.settings().firstDayOfWeek);
    var days = SCHED.planWeek(start, { now: T.nowWall() });
    var body = D.h('div.plan');

    var layer = UI.modal({
      size: 'lg',
      class: 'dialog--plan',
      title: 'Plan the week',
      subtitle: 'Week of ' + T.fmtDateShort(start) + '. Review each day, then accept.',
      body: body,
      footer: function (l) {
        return [
          D.h('div.sheet__foot-left', D.h('span.plan__hint', { text: 'Days you leave unchecked stay as they are.' })),
          D.h('div.sheet__foot-right', [
            D.h('button.btn.btn--ghost', { type: 'button', onclick: function () { l.close(); } }, 'Cancel'),
            D.h('button.btn.btn--primary', { type: 'button', onclick: acceptAll }, 'Accept selected')
          ])
        ];
      }
    });

    if (!days.some(function (d) { return d.proposed.length; })) {
      body.appendChild(emptyState({
        icon: 'coffee',
        title: 'Nothing left to place',
        body: 'Every task that fits this week already has time set aside.'
      }));
    }

    days.forEach(function (plan) {
      if (!plan.proposed.length) return;
      var section = D.h('section.plan__day');
      section.appendChild(D.h('h3.plan__day-title', [
        D.h('span', { text: T.DAY_NAMES[plan.day.getDay()] + ' ' + T.fmtDateShort(plan.day) }),
        D.h('span.plan__day-meta', { text: T.humanDuration(plan.stats.scheduled) + ' planned · ' + T.humanDuration(Math.max(0, plan.stats.remainingFree)) + ' free' })
      ]));
      var list = D.h('ol.plan__list');
      plan.proposed.forEach(function (item) {
        var row = D.h('li.plan__row' + (item.kind === 'break' ? '.is-break' : ''), [
          D.h('span.plan__time', { text: T.fmtTime(item.start, use24()) + ' – ' + T.fmtTime(item.end, use24()) }),
          D.h('div.plan__main', [
            D.h('span.plan__title', { text: item.title }),
            D.h('span.plan__why', { text: item.reasons && item.reasons.length ? item.reasons.join(', ') : 'fits your free time' })
          ])
        ]);
        var check = D.h('button.check', {
          type: 'button', role: 'checkbox', 'aria-checked': 'true',
          'aria-label': 'Include ' + item.title,
          onclick: function () {
            item.selected = !item.selected;
            check.setAttribute('aria-checked', item.selected ? 'true' : 'false');
            row.classList.toggle('is-excluded', !item.selected);
            D.clear(check);
            if (item.selected) check.appendChild(D.icon('check', 13));
          }
        }, D.icon('check', 13));
        row.appendChild(check);
        list.appendChild(row);
      });
      section.appendChild(list);
      body.appendChild(section);
    });

    function acceptAll() {
      var chosen = [];
      days.forEach(function (plan) {
        plan.proposed.forEach(function (item) { if (item.selected) chosen.push(item); });
      });
      if (!chosen.length) { UI.toast('Nothing selected'); return; }
      S.commit('Accept week plan', function (st) {
        chosen.forEach(function (item) {
          if (item.kind === 'break') {
            st.events.push(M.makeEvent({
              title: 'Break', start: T.iso(item.start), end: T.iso(item.end),
              type: 'block', categoryId: 'cat_relax'
            }));
            return;
          }
          var ev = M.makeEvent({
            title: item.task.title, start: T.iso(item.start), end: T.iso(item.end),
            type: 'block', categoryId: item.task.categoryId, projectId: item.task.projectId,
            goalId: item.task.goalId, taskId: item.task.id, priority: item.task.priority
          });
          st.events.push(ev);
          for (var i = 0; i < st.tasks.length; i++) {
            if (st.tasks[i].id === item.task.id) {
              st.tasks[i].scheduledEventId = ev.id;
              if (st.tasks[i].status === 'inbox') st.tasks[i].status = 'planned';
            }
          }
        });
      }, ['events', 'tasks']);
      UI.toast('Week planned — ' + chosen.length + ' blocks added', { undo: true });
      layer.close();
    }
    return layer;
  }

  /* ------------------------------------------------- what should I do now */

  function whatNowDialog() {
    var now = T.nowWall();
    var result = SCHED.whatNow(now);
    var body = D.h('div.whatnow');

    var layer = UI.modal({
      size: 'md',
      class: 'dialog--whatnow',
      title: 'What should I do now?',
      body: body
    });

    function render() {
      D.clear(body);
      body.appendChild(D.h('p.whatnow__headline', { text: result.headline }));

      if (result.mode === 'in-event') {
        body.appendChild(D.h('div.whatnow__card', [
          D.h('h3.whatnow__title', { text: result.event.title }),
          D.h('p.whatnow__meta', {
            text: T.fmtTime(result.event.startWall, use24()) + ' – ' + T.fmtTime(result.event.endWall, use24()) +
              ' · ' + T.humanDuration(result.untilMinutes) + ' left'
          }),
          D.h('div.whatnow__actions', [
            D.h('button.btn.btn--primary', {
              type: 'button', onclick: function () { layer.close(); UI.startFocus({ event: result.event }); }
            }, [D.icon('focus', 15), 'Focus on this']),
            result.next ? D.h('button.btn.btn--ghost', {
              type: 'button', onclick: function () { layer.close(); UI.go('calendar', { date: T.key(now), view: 'day' }); }
            }, 'See the rest of today') : null
          ])
        ]));
        return;
      }

      if (result.mode === 'no-time') {
        body.appendChild(D.h('div.whatnow__card', [
          D.h('p.whatnow__meta', { text: result.detail }),
          D.h('div.whatnow__actions', [
            D.h('button.btn.btn--ghost', {
              type: 'button', onclick: function () { layer.close(); UI.go('today'); }
            }, 'Open Today')
          ])
        ]));
        return;
      }

      if (result.mode === 'free') {
        body.appendChild(emptyState({
          icon: 'coffee',
          title: 'Nothing is asking for you',
          body: 'You have ' + T.humanDuration(result.usable) + ' and no task that needs doing right now. That is allowed.',
          actions: [
            { label: 'Capture a thought', onClick: function () { layer.close(); UI.go('capture'); } },
            { label: 'Plan my day', onClick: function () { layer.close(); planDayDialog(); } }
          ]
        }));
        return;
      }

      var rec = result.recommendation || result.partial;
      var task = rec.task;
      var estimate = Q.taskEstimate(task);
      var minutes = result.mode === 'partial' ? Math.min(result.usable, estimate) : estimate;

      body.appendChild(D.h('div.whatnow__card', [
        D.h('span.whatnow__label', { text: 'Recommended' }),
        D.h('h3.whatnow__title', { text: task.title }),
        D.h('p.whatnow__meta', {
          text: T.humanDuration(minutes) + (result.mode === 'partial' ? ' to make a start (' + T.humanDuration(estimate) + ' in total)' : '')
        }),
        D.h('div.whatnow__why', [
          D.h('span.whatnow__why-label', { text: 'Why' }),
          D.h('span', { text: capitalize(rec.reasons.join(', ')) + (rec.reasons.length ? ', and it fits the ' : 'It fits the ') + T.humanDuration(result.usable) + ' you have.' })
        ]),
        D.h('div.whatnow__actions', [
          D.h('button.btn.btn--primary', {
            type: 'button',
            onclick: function () {
              layer.close();
              UI.startFocus({ task: task, minutes: minutes });
            }
          }, [D.icon('play', 15), 'Start']),
          D.h('button.btn.btn--ghost', {
            type: 'button',
            onclick: function () {
              layer.close();
              findTimeDialog({
                minutes: estimate, title: task.title, before: task.due,
                onPick: function (slot) { A.scheduleTask(task.id, slot.start, slot.minutes); }
              });
            }
          }, 'Schedule for later'),
          result.alternatives.length ? D.h('button.btn.btn--ghost', {
            type: 'button', onclick: showAlternatives
          }, 'Something else') : null
        ])
      ]));

      if (result.next) {
        body.appendChild(D.h('p.whatnow__next', [
          D.icon('calendar', 14),
          D.h('span', { text: 'Next: ' + result.next.title + ' at ' + T.fmtTime(result.next.startWall, use24()) })
        ]));
      }
    }

    function showAlternatives() {
      D.clear(body);
      body.appendChild(D.h('p.whatnow__headline', { text: 'Other things that fit your ' + T.humanDuration(result.usable) }));
      var list = D.h('div.whatnow__alts');
      result.alternatives.forEach(function (alt) {
        list.appendChild(D.h('button.whatnow__alt', {
          type: 'button',
          onclick: function () { layer.close(); UI.startFocus({ task: alt.task, minutes: Q.taskEstimate(alt.task) }); }
        }, [
          D.h('span.whatnow__alt-title', { text: alt.task.title }),
          D.h('span.whatnow__alt-meta', { text: T.humanDuration(Q.taskEstimate(alt.task)) + (alt.reasons.length ? ' · ' + alt.reasons[0] : '') })
        ]));
      });
      body.appendChild(list);
      body.appendChild(D.h('button.btn.btn--ghost.btn--sm', { type: 'button', onclick: render }, [D.icon('chevronLeft', 14), 'Back']));
    }

    render();
    return layer;
  }

  function capitalize(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }

  /* -------------------------------------------------------------- conflict */

  function conflictDialog(pair) {
    var a = pair[0], b = pair[1];
    var overlapStart = new Date(Math.max(a.startWall, b.startWall));
    var overlapEnd = new Date(Math.min(a.endWall, b.endWall));

    var layer = UI.modal({
      size: 'md',
      title: 'Schedule conflict',
      subtitle: 'These two overlap by ' + T.humanDuration(T.diffMinutes(overlapStart, overlapEnd)) + '. Nothing has been changed.',
      body: D.h('div.conflict', [
        D.h('div.conflict__pair', [conflictCard(a), D.h('span.conflict__vs', { text: 'overlaps' }), conflictCard(b)]),
        D.h('div.conflict__options', [
          option('Keep both', 'Leave the overlap as it is — sometimes that is genuinely fine.', function () {
            layer.close();
            UI.toast('Left as they are');
          }),
          option('Move “' + trim(a.title) + '”', 'Find another time for the first one.', function () {
            layer.close();
            findTimeDialog({
              minutes: T.diffMinutes(a.startWall, a.endWall), title: a.title,
              onPick: function (slot) { A.moveEvent(a, slot.start, T.addMinutes(slot.start, slot.minutes), a.isInstance ? 'this' : 'all'); }
            });
          }),
          option('Move “' + trim(b.title) + '”', 'Find another time for the second one.', function () {
            layer.close();
            findTimeDialog({
              minutes: T.diffMinutes(b.startWall, b.endWall), title: b.title,
              onPick: function (slot) { A.moveEvent(b, slot.start, T.addMinutes(slot.start, slot.minutes), b.isInstance ? 'this' : 'all'); }
            });
          }),
          option('Shorten the first one', 'End “' + trim(a.title) + '” when the other begins.', function () {
            A.updateEvent(a, { end: T.iso(b.startWall) }, a.isInstance ? 'this' : 'all', { message: 'Shortened' });
            layer.close();
          })
        ])
      ])
    });

    function option(label, hint, onClick) {
      return D.h('button.scope-choice', { type: 'button', onclick: onClick }, [
        D.h('span.scope-choice__label', { text: label }),
        D.h('span.scope-choice__hint', { text: hint })
      ]);
    }
    function trim(s) { return s.length > 24 ? s.slice(0, 23) + '…' : s; }
    function conflictCard(ev) {
      return D.h('div.conflict__card', {
        style: { borderLeftColor: Q.eventColor(ev) }
      }, [
        D.h('strong', { text: ev.title }),
        D.h('span', { text: T.fmtTime(ev.startWall, use24()) + ' – ' + T.fmtTime(ev.endWall, use24()) })
      ]);
    }
    return layer;
  }

  /* -------------------------------------------------------------- recovery */

  /* Missing something should feel like a fork in the road, not a failure. */
  function recoveryDialog(opts) {
    opts = opts || {};
    var now = T.nowWall();
    var tasks = opts.tasks || Q.overdueTasks(now);
    var body = D.h('div.recovery');

    var layer = UI.modal({
      size: 'md',
      title: tasks.length === 1 ? 'One thing slipped' : tasks.length + ' things slipped',
      subtitle: 'Plans change. Pick what to do with each one.',
      body: body
    });

    function render() {
      D.clear(body);
      var remaining = tasks.filter(function (t) {
        var live = S.get('tasks', t.id);
        return live && live.status !== 'completed' && live.status !== 'archived';
      });
      if (!remaining.length) {
        body.appendChild(emptyState({
          icon: 'check', title: 'All caught up',
          body: 'Nothing is overdue any more.'
        }));
        return;
      }
      remaining.forEach(function (task) {
        body.appendChild(recoveryRow(task, render, layer));
      });
      if (remaining.length > 1) {
        body.appendChild(D.h('div.recovery__bulk', [
          D.h('button.btn.btn--ghost.btn--sm', {
            type: 'button',
            onclick: function () {
              var tomorrow = T.startOfDay(T.addDays(now, 1));
              S.commit('Move overdue tasks', function (st) {
                st.tasks.forEach(function (t) {
                  if (remaining.some(function (r) { return r.id === t.id; })) {
                    var d = new Date(tomorrow);
                    d.setHours(23, 59, 0, 0);
                    t.due = T.iso(d);
                    t.hasDueTime = false;
                  }
                });
              }, ['tasks']);
              UI.toast('Moved ' + remaining.length + ' tasks to tomorrow', { undo: true });
              render();
            }
          }, 'Move all to tomorrow')
        ]));
      }
    }

    render();
    return layer;
  }

  function recoveryRow(task, refresh, layer) {
    var due = task.due ? T.w(task.due) : null;
    var row = D.h('div.recovery__row');
    row.appendChild(D.h('div.recovery__head', [
      D.h('span.recovery__title', { text: task.title }),
      due ? D.h('span.recovery__due', { text: T.relativeTime(due) }) : null
    ]));

    var actions = D.h('div.recovery__actions', [
      act('Do today', function () {
        A.rescheduleTask(task.id, T.endOfDay(T.nowWall()), 'Moved to today');
        refresh();
      }),
      act('Tomorrow', function () {
        A.rescheduleTask(task.id, T.endOfDay(T.addDays(T.nowWall(), 1)), 'Moved to tomorrow');
        refresh();
      }),
      act('Next free slot', function () {
        var slots = SCHED.findTime(Q.taskEstimate(task), { days: 7, limit: 1 });
        if (!slots.length) { UI.toast('No free block that long in the next week'); return; }
        A.scheduleTask(task.id, slots[0].start, slots[0].minutes);
        refresh();
      }),
      act('Break it up', function () {
        layer.close();
        breakDownDialog(task);
      }),
      act('Mark done', function () { A.completeTask(task.id, true); refresh(); }),
      act('Drop it', function () {
        UI.confirm({
          title: 'Delete this task?', message: '“' + task.title + '” will be removed.',
          confirmLabel: 'Delete', tone: 'danger'
        }).then(function (ok) { if (ok) { A.deleteTask(task.id); refresh(); } });
      }, true)
    ]);
    row.appendChild(actions);
    return row;

    function act(label, onClick, danger) {
      return D.h('button.btn.btn--ghost.btn--sm' + (danger ? '.btn--danger-text' : ''), { type: 'button', onclick: onClick }, label);
    }
  }

  /* Splitting an intimidating task into steps is often the whole fix. */
  function breakDownDialog(task) {
    var lines = D.h('textarea.input.input--area', {
      rows: 5, 'data-autofocus': '',
      placeholder: 'One step per line, e.g.\nOutline the argument\nWrite the introduction\nFind three sources'
    });
    lines.value = suggestSteps(task).join('\n');

    return UI.modal({
      size: 'sm',
      title: 'Break it into steps',
      subtitle: '“' + task.title + '”',
      body: D.h('div.editor', [
        UI.F.field('Steps', lines, { hint: 'The original task is replaced by these.' })
      ]),
      footer: function (l) {
        return D.h('div.sheet__foot-right', [
          D.h('button.btn.btn--ghost', { type: 'button', onclick: function () { l.close(); } }, 'Cancel'),
          D.h('button.btn.btn--primary', {
            type: 'button',
            onclick: function () {
              var titles = lines.value.split('\n').map(function (s) { return s.trim(); }).filter(Boolean);
              if (titles.length < 2) { UI.toast('Give it at least two steps'); return; }
              A.breakDownTask(task.id, titles);
              l.close();
            }
          }, 'Split it up')
        ]);
      }
    });
  }

  /* Generic starting points — the user edits them; nothing is invented as fact. */
  function suggestSteps(task) {
    var t = String(task.title).toLowerCase();
    if (/essay|paper|report|writ/.test(t)) return ['Outline it', 'Write a first draft', 'Revise and check sources'];
    if (/study|revise|test|exam|quiz/.test(t)) return ['Review the notes', 'Make practice questions', 'Do a timed run-through'];
    if (/present|slide|deck/.test(t)) return ['Sketch the structure', 'Build the slides', 'Practise it out loud'];
    if (/project/.test(t)) return ['Plan the steps', 'Do the main work', 'Review and finish'];
    return ['First part', 'Second part'];
  }

  /* ----------------------------------------------------------- suggestions */

  function suggestionCard(s, onRefresh) {
    var card = D.h('article.suggestion' + (s.tone === 'urgent' ? '.is-urgent' : s.tone === 'warn' ? '.is-warn' : ''));
    card.appendChild(D.h('div.suggestion__body', [
      D.h('p.suggestion__text', { text: s.text }),
      D.h('p.suggestion__why', [D.icon('compass', 13), D.h('span', { text: s.why })])
    ]));
    var actions = D.h('div.suggestion__actions');
    if (s.action) {
      actions.appendChild(D.h('button.btn.btn--sm.btn--primary', {
        type: 'button', onclick: function () { runSuggestion(s.action); }
      }, s.action.label));
    }
    actions.appendChild(D.h('button.btn.btn--sm.btn--ghost', {
      type: 'button',
      onclick: function () {
        SCHED.dismissSuggestion(s.id);
        UI.toast('Suggestion dismissed for today');
        if (onRefresh) onRefresh();
      }
    }, 'Dismiss'));
    card.appendChild(actions);
    return card;
  }

  function runSuggestion(action) {
    switch (action.type) {
      case 'find-time':
        findTimeDialog({
          minutes: action.minutes || 60, title: action.title,
          before: action.deadlineId ? (S.get('deadlines', action.deadlineId) || {}).due : null,
          onPick: function (slot) {
            var dl = action.deadlineId ? S.get('deadlines', action.deadlineId) : null;
            A.createEvent({
              title: dl ? 'Work on ' + dl.title : action.title,
              start: T.iso(slot.start),
              end: T.iso(T.addMinutes(slot.start, slot.minutes)),
              type: 'block',
              categoryId: 'cat_homework',
              projectId: dl ? dl.projectId : null
            });
          }
        });
        break;
      case 'recover': recoveryDialog(); break;
      case 'goto-day': UI.go('calendar', { date: action.day, view: 'day' }); break;
      case 'goto': UI.go(action.route); break;
      case 'schedule-task':
        A.scheduleTask(action.taskId, new Date(action.start));
        break;
    }
  }

  /* -------------------------------------------------------------- helpers */

  /* An empty state should teach, not apologise. */
  function emptyState(opts) {
    var node = D.h('div.empty');
    node.appendChild(D.h('span.empty__icon', D.icon(opts.icon || 'sparkle', 26)));
    node.appendChild(D.h('h3.empty__title', { text: opts.title }));
    if (opts.body) node.appendChild(D.h('p.empty__body', { text: opts.body }));
    if (opts.actions && opts.actions.length) {
      node.appendChild(D.h('div.empty__actions', opts.actions.map(function (a, i) {
        return D.h('button.btn.btn--sm' + (i === 0 ? '.btn--primary' : '.btn--ghost'), {
          type: 'button', onclick: a.onClick
        }, a.label);
      })));
    }
    return node;
  }

  Object.assign(UI, {
    findTimeDialog: findTimeDialog,
    planDayDialog: planDayDialog,
    planWeekDialog: planWeekDialog,
    whatNowDialog: whatNowDialog,
    conflictDialog: conflictDialog,
    recoveryDialog: recoveryDialog,
    breakDownDialog: breakDownDialog,
    suggestionCard: suggestionCard,
    runSuggestion: runSuggestion,
    emptyState: emptyState
  });
})(window);
