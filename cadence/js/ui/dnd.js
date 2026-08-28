/* Cadence — pointer dragging.

   One low-level helper drives every drag in the app: moving and resizing events,
   dropping tasks onto the calendar, and reordering task lists. It works with
   mouse, touch and pen, starts only after a small threshold so clicks still
   click, and cancels cleanly on Escape. */
(function (global) {
  'use strict';

  var THRESHOLD = 4;
  var current = null;
  var payload = null;
  var ghost = null;

  /* handlers: { onStart, onMove(state), onEnd(state), onCancel } */
  function drag(startEvent, handlers) {
    if (current) return null;
    if (startEvent.button != null && startEvent.button !== 0 && startEvent.pointerType === 'mouse') return null;

    var startX = startEvent.clientX, startY = startEvent.clientY;
    var started = false;
    var target = startEvent.currentTarget || startEvent.target;

    var state = {
      startX: startX, startY: startY, x: startX, y: startY, dx: 0, dy: 0,
      event: startEvent, target: target, cancelled: false
    };

    function move(e) {
      state.x = e.clientX; state.y = e.clientY;
      state.dx = e.clientX - startX; state.dy = e.clientY - startY;
      state.pointerEvent = e;
      if (!started) {
        if (Math.abs(state.dx) < THRESHOLD && Math.abs(state.dy) < THRESHOLD) return;
        started = true;
        document.documentElement.classList.add('is-dragging');
        if (handlers.onStart) handlers.onStart(state);
      }
      e.preventDefault();
      if (handlers.onMove) handlers.onMove(state);
      positionGhost(e.clientX, e.clientY);
    }

    function up(e) {
      state.pointerEvent = e;
      cleanup();
      if (started) {
        if (handlers.onEnd) handlers.onEnd(state);
      } else if (handlers.onClick) {
        handlers.onClick(state);
      }
    }

    function key(e) {
      if (e.key !== 'Escape') return;
      state.cancelled = true;
      cleanup();
      if (handlers.onCancel) handlers.onCancel(state);
    }

    function cleanup() {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', cancel);
      window.removeEventListener('keydown', key, true);
      document.documentElement.classList.remove('is-dragging');
      removeGhost();
      current = null;
      payload = null;
    }

    function cancel(e) {
      state.cancelled = true;
      cleanup();
      if (handlers.onCancel) handlers.onCancel(state);
    }

    window.addEventListener('pointermove', move, { passive: false });
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', cancel);
    window.addEventListener('keydown', key, true);

    current = { state: state, cancel: cancel };
    return current;
  }

  /* ---- ghost element that follows the pointer for cross-view drags ---- */
  function showGhost(label, color) {
    removeGhost();
    ghost = D.h('div.drag-ghost', { 'aria-hidden': 'true' }, [
      color ? D.h('span.drag-ghost__dot', { style: { background: color } }) : null,
      D.h('span', { text: label })
    ]);
    document.body.appendChild(ghost);
  }
  function positionGhost(x, y) {
    if (!ghost) return;
    ghost.style.transform = 'translate(' + (x + 14) + 'px,' + (y + 12) + 'px)';
  }
  function removeGhost() {
    if (ghost && ghost.parentNode) ghost.parentNode.removeChild(ghost);
    ghost = null;
  }

  function setPayload(p) { payload = p; }
  function getPayload() { return payload; }

  /* Which registered drop zone is under the pointer right now? */
  function zoneAt(x, y) {
    var el = document.elementFromPoint(x, y);
    while (el && el !== document.body) {
      if (el.dataset && el.dataset.dropzone) return el;
      el = el.parentElement;
    }
    return null;
  }

  function active() { return !!current; }

  global.DND = {
    drag: drag,
    showGhost: showGhost, removeGhost: removeGhost, positionGhost: positionGhost,
    setPayload: setPayload, getPayload: getPayload,
    zoneAt: zoneAt, active: active,
    THRESHOLD: THRESHOLD
  };
})(window);
