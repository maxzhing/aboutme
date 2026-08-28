/* Cadence — transient notices, and the Undo affordance that makes destructive
   actions safe to attempt. */
(function (global) {
  'use strict';
  var UI = global.UI = global.UI || {};

  var container = null;
  var active = [];

  function ensure() {
    if (container) return container;
    container = D.h('div.toast-stack', { id: 'toasts', role: 'status', 'aria-live': 'polite' });
    document.body.appendChild(container);
    return container;
  }

  function toast(message, opts) {
    opts = opts || {};
    ensure();

    // Collapse a repeat of the same message rather than stacking duplicates.
    var dup = active.filter(function (t) { return t.message === message; })[0];
    if (dup) { dismiss(dup, true); }

    var node = D.h('div.toast', { role: 'status' });
    if (opts.tone) node.classList.add('toast--' + opts.tone);

    node.appendChild(D.h('span.toast__msg', { text: message }));

    var actions = (opts.actions || []).slice();
    if (opts.undo) {
      actions.unshift({
        label: 'Undo', shortcut: '⌘Z', onClick: function () { A.undo(); }
      });
    }
    if (opts.redo) {
      actions.unshift({ label: 'Redo', onClick: function () { A.redo(); } });
    }

    if (actions.length) {
      var row = D.h('div.toast__actions');
      actions.forEach(function (a) {
        row.appendChild(D.h('button.toast__action', {
          type: 'button',
          onclick: function () { entry.keep = false; dismiss(entry); a.onClick(); }
        }, a.label));
      });
      node.appendChild(row);
    }

    var close = D.iconButton('x', 'Dismiss notification', function () { dismiss(entry); }, { class: 'toast__close' });
    node.appendChild(close);

    var entry = { node: node, message: message, timer: null };
    container.appendChild(node);
    active.push(entry);
    if (active.length > 3) dismiss(active[0], true);

    if (!D.prefersReducedMotion()) {
      node.classList.add('toast--enter');
      requestAnimationFrame(function () { node.classList.remove('toast--enter'); });
    }

    var duration = opts.duration || (actions.length ? 8000 : 4200);
    entry.timer = setTimeout(function () { dismiss(entry); }, duration);

    // Pausing on hover means a slow reader never loses the Undo button.
    node.addEventListener('mouseenter', function () { if (entry.timer) { clearTimeout(entry.timer); entry.timer = null; } });
    node.addEventListener('mouseleave', function () {
      if (!entry.timer) entry.timer = setTimeout(function () { dismiss(entry); }, 2500);
    });
    node.addEventListener('focusin', function () { if (entry.timer) { clearTimeout(entry.timer); entry.timer = null; } });

    D.announce(message);
    return entry;
  }

  function dismiss(entry, immediate) {
    if (!entry || entry.removed) return;
    entry.removed = true;
    if (entry.timer) clearTimeout(entry.timer);
    var i = active.indexOf(entry);
    if (i >= 0) active.splice(i, 1);
    if (immediate || D.prefersReducedMotion()) {
      if (entry.node.parentNode) entry.node.parentNode.removeChild(entry.node);
      return;
    }
    entry.node.classList.add('toast--leave');
    setTimeout(function () {
      if (entry.node.parentNode) entry.node.parentNode.removeChild(entry.node);
    }, 200);
  }

  function clearAll() { active.slice().forEach(function (t) { dismiss(t, true); }); }

  UI.toast = toast;
  UI.clearToasts = clearAll;
  UI.ensureToastStack = ensure;
})(window);
