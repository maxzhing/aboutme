/* Cadence — focus mode. One thing, the time left, and a way out. */
(function (global) {
  'use strict';
  var UI = global.UI = global.UI || {};

  var session = null;
  var overlay = null;
  var tick = null;

  function startFocus(opts) {
    opts = opts || {};
    var task = opts.task || null;
    var event = opts.event || null;
    var minutes = opts.minutes ||
      (event ? Math.max(5, T.diffMinutes(T.nowWall(), event.endWall)) :
        (task ? Q.taskEstimate(task) : 25));

    session = {
      taskId: task ? task.id : null,
      eventId: event ? (event.seriesId || event.id) : null,
      title: task ? task.title : (event ? event.title : 'Focus'),
      plannedMinutes: minutes,
      startedAt: Date.now(),
      elapsedBefore: 0,
      running: true
    };
    render();
    D.announce('Focus mode started for ' + session.title);
  }

  function elapsedMs() {
    if (!session) return 0;
    return session.elapsedBefore + (session.running ? Date.now() - session.startedAt : 0);
  }

  function render() {
    if (overlay) teardown();
    overlay = D.h('div.focus', { role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Focus mode' });

    var next = nextEvent();
    var ring = buildRing();

    var titleNode = D.h('h1.focus__title', { text: session.title });
    var remainNode = D.h('div.focus__remaining', { 'aria-live': 'off' });
    var stateNode = D.h('p.focus__state');
    var progressLabel = D.h('p.focus__progress-label');

    var controls = D.h('div.focus__controls');
    var pauseBtn = D.h('button.btn.btn--ghost.focus__btn', {
      type: 'button',
      onclick: function () {
        if (session.running) {
          session.elapsedBefore = elapsedMs();
          session.running = false;
        } else {
          session.startedAt = Date.now();
          session.running = true;
        }
        paintControls();
        update();
      }
    });
    var completeBtn = D.h('button.btn.btn--primary.focus__btn', {
      type: 'button', onclick: complete
    }, [D.icon('check', 16), 'Complete']);
    var extendBtn = D.h('button.btn.btn--ghost.focus__btn', {
      type: 'button',
      onclick: function () {
        session.plannedMinutes += 10;
        UI.toast('Ten more minutes');
        update();
      }
    }, [D.icon('plus', 16), '10 min']);
    var rescheduleBtn = D.h('button.btn.btn--ghost.focus__btn', {
      type: 'button', onclick: reschedule
    }, [D.icon('calendar', 16), 'Reschedule']);

    function paintControls() {
      D.clear(pauseBtn);
      D.append(pauseBtn, [D.icon(session.running ? 'pause' : 'play', 16), session.running ? 'Pause' : 'Resume']);
      pauseBtn.setAttribute('aria-label', session.running ? 'Pause the timer' : 'Resume the timer');
    }
    paintControls();

    controls.appendChild(pauseBtn);
    controls.appendChild(completeBtn);
    controls.appendChild(extendBtn);
    if (session.taskId) controls.appendChild(rescheduleBtn);

    overlay.appendChild(D.h('div.focus__inner', [
      D.h('div.focus__top', [
        D.h('span.focus__eyebrow', { text: 'Focusing' }),
        D.h('button.btn.btn--ghost.btn--sm', {
          type: 'button', onclick: exit, 'aria-label': 'Leave focus mode'
        }, [D.icon('x', 15), 'Exit'])
      ]),
      ring.node,
      titleNode,
      remainNode,
      stateNode,
      progressLabel,
      controls,
      next ? D.h('p.focus__next', [
        D.icon('calendar', 14),
        D.h('span', { text: 'Next: ' + next.title + ' at ' + T.fmtTime(next.startWall, S.settings().use24Hour) })
      ]) : null
    ]));

    document.body.appendChild(overlay);
    document.documentElement.classList.add('is-focus');
    var release = D.trapFocus(overlay, exit);
    overlay._release = release;

    function update() {
      var totalMs = session.plannedMinutes * 60000;
      var used = elapsedMs();
      var remaining = totalMs - used;
      var over = remaining < 0;
      var show = Math.abs(remaining);
      var mins = Math.floor(show / 60000);
      var secs = Math.floor((show % 60000) / 1000);
      remainNode.textContent = (over ? '+' : '') + mins + ':' + T.pad(secs);
      remainNode.classList.toggle('is-over', over);
      stateNode.textContent = session.running
        ? (over ? 'Past the time you set — finish when you are ready.' : 'Time remaining')
        : 'Paused';
      var pct = Math.max(0, Math.min(1, used / totalMs));
      ring.set(pct, over);
      progressLabel.textContent = T.humanDuration(Math.round(used / 60000)) + ' of ' + T.humanDuration(session.plannedMinutes) + ' done';
      progressLabel.setAttribute('aria-label', Math.round(pct * 100) + ' per cent of the planned time used');
    }

    update();
    tick = setInterval(update, 500);
    setTimeout(function () { completeBtn.focus(); }, 40);
  }

  function buildRing() {
    var size = 190, stroke = 8, r = (size - stroke) / 2, c = 2 * Math.PI * r;
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 ' + size + ' ' + size);
    svg.setAttribute('width', size);
    svg.setAttribute('height', size);
    svg.setAttribute('class', 'focus__ring');
    svg.setAttribute('aria-hidden', 'true');
    var track = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    track.setAttribute('cx', size / 2); track.setAttribute('cy', size / 2); track.setAttribute('r', r);
    track.setAttribute('class', 'focus__ring-track');
    track.setAttribute('stroke-width', stroke);
    track.setAttribute('fill', 'none');
    var bar = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    bar.setAttribute('cx', size / 2); bar.setAttribute('cy', size / 2); bar.setAttribute('r', r);
    bar.setAttribute('class', 'focus__ring-bar');
    bar.setAttribute('stroke-width', stroke);
    bar.setAttribute('fill', 'none');
    bar.setAttribute('stroke-dasharray', c);
    bar.setAttribute('stroke-dashoffset', c);
    bar.setAttribute('transform', 'rotate(-90 ' + size / 2 + ' ' + size / 2 + ')');
    svg.appendChild(track); svg.appendChild(bar);
    return {
      node: D.h('div.focus__ring-wrap', svg),
      set: function (pct, over) {
        bar.setAttribute('stroke-dashoffset', String(c * (1 - Math.min(1, pct))));
        bar.classList.toggle('is-over', !!over);
      }
    };
  }

  function nextEvent() {
    var now = T.nowWall();
    return Q.eventsInRange(now, T.endOfDay(T.addDays(now, 1)), { ignoreLayers: true })
      .filter(function (e) { return !e.allDay && e.startWall > now; })
      .sort(function (a, b) { return a.startWall - b.startWall; })[0];
  }

  function complete() {
    var minutes = Math.round(elapsedMs() / 60000);
    if (session.taskId) {
      A.completeTask(session.taskId, true);
    } else if (session.eventId) {
      var ev = S.get('events', session.eventId);
      if (ev) S.update('events', ev.id, { done: true }, 'Complete event');
      UI.toast('Marked done');
    }
    D.announce('Completed after ' + T.humanDuration(minutes));
    exit();
  }

  function reschedule() {
    var taskId = session.taskId;
    exit();
    var task = S.get('tasks', taskId);
    if (!task) return;
    UI.findTimeDialog({
      minutes: Q.taskEstimate(task), title: task.title, before: task.due,
      onPick: function (slot) { A.scheduleTask(task.id, slot.start, slot.minutes); }
    });
  }

  function exit() {
    teardown();
    session = null;
  }

  function teardown() {
    if (tick) { clearInterval(tick); tick = null; }
    if (overlay) {
      if (overlay._release) overlay._release();
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      overlay = null;
    }
    document.documentElement.classList.remove('is-focus');
  }

  /* Entry point when nothing specific was chosen: pick the best next thing. */
  function focusEntry() {
    if (session) { render(); return; }
    var result = SCHED.whatNow();
    if (result.mode === 'in-event') { startFocus({ event: result.event }); return; }
    var rec = result.recommendation || result.partial;
    if (rec) { startFocus({ task: rec.task, minutes: Math.min(result.usable || 25, Q.taskEstimate(rec.task)) }); return; }
    UI.whatNowDialog();
  }

  UI.startFocus = startFocus;
  UI.focusEntry = focusEntry;
  UI.exitFocus = exit;
  UI.focusActive = function () { return !!session; };
})(window);
