/* Cadence — DOM helpers and the icon set. */
(function (global) {
  'use strict';

  /* h('div.card', {onclick: fn}, [children]) — the only element factory used. */
  function h(spec, attrs, children) {
    var parts = String(spec).split(/(?=[.#])/);
    var tag = parts[0] || 'div';
    var node = document.createElement(tag);
    for (var i = 1; i < parts.length; i++) {
      var p = parts[i];
      // A segment may carry several space-separated classes ('.a b c').
      if (p.charAt(0) === '.') {
        p.slice(1).split(/\s+/).forEach(function (c) { if (c) node.classList.add(c); });
      } else if (p.charAt(0) === '#') node.id = p.slice(1).split(/\s+/)[0];
    }
    if (attrs && (Array.isArray(attrs) || typeof attrs === 'string' || attrs instanceof Node)) {
      children = attrs; attrs = null;
    }
    if (attrs) applyAttrs(node, attrs);
    if (children != null) append(node, children);
    return node;
  }

  function applyAttrs(node, attrs) {
    Object.keys(attrs).forEach(function (k) {
      var v = attrs[k];
      if (v === null || v === undefined || v === false) return;
      if (k === 'class' || k === 'className') { String(v).split(/\s+/).filter(Boolean).forEach(function (c) { node.classList.add(c); }); }
      else if (k === 'text') node.textContent = v;
      else if (k === 'html') node.innerHTML = v;
      else if (k === 'style' && typeof v === 'object') Object.assign(node.style, v);
      else if (k === 'dataset') Object.keys(v).forEach(function (d) { node.dataset[d] = v[d]; });
      else if (k.indexOf('on') === 0 && typeof v === 'function') {
        node.addEventListener(k.slice(2).toLowerCase(), v);
      } else if (k === 'value') node.value = v;
      else if (k === 'checked' || k === 'disabled' || k === 'selected' || k === 'readOnly' || k === 'multiple') node[k] = !!v;
      else node.setAttribute(k, v === true ? '' : v);
    });
  }

  function append(node, child) {
    if (child === null || child === undefined || child === false) return;
    if (Array.isArray(child)) { child.forEach(function (c) { append(node, c); }); return; }
    if (child instanceof Node) { node.appendChild(child); return; }
    node.appendChild(document.createTextNode(String(child)));
  }

  function clear(node) { while (node && node.firstChild) node.removeChild(node.firstChild); return node; }
  function qs(sel, root) { return (root || document).querySelector(sel); }
  function qsa(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function frag(children) { var f = document.createDocumentFragment(); append(f, children); return f; }

  /* Event delegation: on(root, 'click', '.row', handler) */
  function on(root, type, selector, handler, opts) {
    if (typeof selector === 'function') return root.addEventListener(type, selector, handler);
    var fn = function (e) {
      var target = e.target.closest ? e.target.closest(selector) : null;
      if (target && root.contains(target)) handler.call(target, e, target);
    };
    root.addEventListener(type, fn, opts);
    return function () { root.removeEventListener(type, fn, opts); };
  }

  /* ---- accessibility helpers ---- */
  var liveRegion = null;
  /* The region has to exist before the first change, or assistive technology
     has nothing registered to announce into. */
  function ensureLiveRegion() {
    if (liveRegion) return liveRegion;
    liveRegion = h('div', { class: 'sr-only', 'aria-live': 'polite', 'aria-atomic': 'true', id: 'live-region' });
    document.body.appendChild(liveRegion);
    return liveRegion;
  }
  function announce(message, assertive) {
    ensureLiveRegion();
    liveRegion.setAttribute('aria-live', assertive ? 'assertive' : 'polite');
    // Clearing first guarantees repeat messages are re-announced.
    liveRegion.textContent = '';
    setTimeout(function () { liveRegion.textContent = message; }, 40);
  }

  var FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

  function focusables(root) {
    return qsa(FOCUSABLE, root).filter(function (n) {
      return n.offsetWidth || n.offsetHeight || n.getClientRects().length;
    });
  }

  /* Keep Tab inside a dialog and restore focus when it closes. */
  function trapFocus(root, onEscape) {
    var previous = document.activeElement;
    function keydown(e) {
      if (e.key === 'Escape') { e.stopPropagation(); if (onEscape) onEscape(); return; }
      if (e.key !== 'Tab') return;
      var list = focusables(root);
      if (!list.length) return;
      var first = list[0], last = list[list.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
    root.addEventListener('keydown', keydown);
    return function release() {
      root.removeEventListener('keydown', keydown);
      if (previous && previous.focus && document.contains(previous)) {
        try { previous.focus(); } catch (e) { }
      }
    };
  }

  function autofocus(root) {
    var target = qs('[data-autofocus]', root) || focusables(root)[0];
    if (target) setTimeout(function () { try { target.focus(); target.select && target.select(); } catch (e) { } }, 30);
  }

  function prefersReducedMotion() {
    if (S.settings().reduceMotion) return true;
    return global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* ---- icons ---- */
  var PATHS = {
    plus: '<path d="M12 5v14M5 12h14"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>',
    check: '<path d="m20 6-11 11-5-5"/>',
    checkSquare: '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="m8 12 3 3 5-6"/>',
    circle: '<circle cx="12" cy="12" r="8"/>',
    note: '<path d="M4 4h11l5 5v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z"/><path d="M14 4v6h6"/>',
    folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/>',
    repeat: '<path d="M17 2l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>',
    chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1A1.7 1.7 0 0 0 9 19.4a1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
    chevronLeft: '<path d="m15 18-6-6 6-6"/>',
    chevronRight: '<path d="m9 18 6-6-6-6"/>',
    chevronDown: '<path d="m6 9 6 6 6-6"/>',
    chevronUp: '<path d="m18 15-6-6-6 6"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    flag: '<path d="M4 22V4M4 4h13l-2.5 4L17 12H4"/>',
    alert: '<path d="M12 9v4M12 17h.01"/><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/>',
    sparkle: '<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M18.5 15.5 19 17l1.5.5L19 18l-.5 1.5L18 18l-1.5-.5L18 17z"/>',
    play: '<path d="M7 4.5v15l12-7.5z"/>',
    pause: '<path d="M9 4v16M15 4v16"/>',
    undo: '<path d="M3 8h11a5 5 0 0 1 0 10h-4"/><path d="m7 4-4 4 4 4"/>',
    menu: '<path d="M3 6h18M3 12h18M3 18h18"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
    inbox: '<path d="M3 12h5l2 3h4l2-3h5"/><path d="M5.5 5h13l2.5 7v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-6z"/>',
    trash: '<path d="M4 7h16M10 11v6M14 11v6"/><path d="M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13"/><path d="M9 7V4h6v3"/>',
    copy: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"/>',
    edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
    link: '<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.5 1.5"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7L12 19"/>',
    paperclip: '<path d="M21 12.5 12.5 21a5.5 5.5 0 0 1-7.8-7.8l8.5-8.5a3.7 3.7 0 0 1 5.2 5.2l-8.5 8.5a1.8 1.8 0 0 1-2.6-2.6l7.8-7.8"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 5.2a3.5 3.5 0 0 1 0 5.6M18 14.5a6.5 6.5 0 0 1 3.5 5.5"/>',
    pin: '<path d="M12 21s7-6.3 7-11a7 7 0 1 0-14 0c0 4.7 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/>',
    bell: '<path d="M18 9a6 6 0 1 0-12 0c0 5-2 6-2 6h16s-2-1-2-6z"/><path d="M10.5 20a2 2 0 0 0 3 0"/>',
    more: '<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>',
    arrowRight: '<path d="M4 12h16M14 6l6 6-6 6"/>',
    arrowUpRight: '<path d="M7 17 17 7M9 7h8v8"/>',
    grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    list: '<path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01"/>',
    zap: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
    home: '<path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z"/>',
    filter: '<path d="M3 5h18l-7 8v6l-4 2v-8z"/>',
    tag: '<path d="M3 12V5a2 2 0 0 1 2-2h7l9 9-9 9z"/><circle cx="7.5" cy="7.5" r="1.3"/>',
    layers: '<path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5"/>',
    focus: '<circle cx="12" cy="12" r="9"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3"/>',
    download: '<path d="M12 4v11M8 11l4 4 4-4"/><path d="M4 20h16"/>',
    upload: '<path d="M12 20V9M8 12l4-4 4 4"/><path d="M4 20h16"/>',
    drag: '<circle cx="9" cy="6" r="1.4"/><circle cx="15" cy="6" r="1.4"/><circle cx="9" cy="12" r="1.4"/><circle cx="15" cy="12" r="1.4"/><circle cx="9" cy="18" r="1.4"/><circle cx="15" cy="18" r="1.4"/>',
    compass: '<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5z"/>',
    book: '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M6 17h13"/>',
    star: '<path d="m12 3.5 2.6 5.6 6 .8-4.4 4.2 1.1 6-5.3-3-5.3 3 1.1-6L3.4 9.9l6-.8z"/>',
    eye: '<path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z"/><circle cx="12" cy="12" r="2.5"/>',
    eyeOff: '<path d="M4 4l16 16"/><path d="M9.9 5.6A9.6 9.6 0 0 1 12 5.5c6.4 0 10 6.5 10 6.5a17 17 0 0 1-3.3 4.1M6.4 7.6A16.6 16.6 0 0 0 2 12s3.6 6.5 10 6.5c1 0 1.9-.2 2.8-.4"/>',
    coffee: '<path d="M4 8h13v6a5 5 0 0 1-10 0z"/><path d="M17 9h2a2.5 2.5 0 0 1 0 5h-2"/><path d="M4 21h14"/>',
    minus: '<path d="M5 12h14"/>',
    save: '<path d="M5 3h11l4 4v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><path d="M8 3v5h7M8 21v-6h8v6"/>'
  };

  function icon(name, size) {
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('width', size || 18);
    svg.setAttribute('height', size || 18);
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '1.7');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    svg.classList.add('icon');
    svg.innerHTML = PATHS[name] || PATHS.circle;
    if (name === 'play' || name === 'star' || name === 'zap' || name === 'sparkle' || name === 'flag') {
      // These read better filled at small sizes.
      if (name === 'play') svg.setAttribute('fill', 'currentColor');
    }
    return svg;
  }

  function iconButton(name, label, handler, opts) {
    opts = opts || {};
    var btn = h('button.icon-btn', {
      type: 'button',
      'aria-label': label,
      title: opts.title === false ? null : (opts.shortcut ? label + ' (' + opts.shortcut + ')' : label),
      class: opts.class || null,
      onclick: handler
    }, icon(name, opts.size));
    return btn;
  }

  /* Rough colour contrast so event text stays readable on any chip colour. */
  function readableOn(hex) {
    var c = String(hex || '#888').replace('#', '');
    if (c.length === 3) c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2];
    var r = parseInt(c.slice(0, 2), 16) / 255,
      g = parseInt(c.slice(2, 4), 16) / 255,
      b = parseInt(c.slice(4, 6), 16) / 255;
    function lin(v) { return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }
    var L = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
    return L > 0.45 ? '#15171c' : '#ffffff';
  }

  function mix(hex, alpha) {
    var c = String(hex || '#888').replace('#', '');
    if (c.length === 3) c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2];
    return 'rgba(' + parseInt(c.slice(0, 2), 16) + ',' + parseInt(c.slice(2, 4), 16) + ',' + parseInt(c.slice(4, 6), 16) + ',' + alpha + ')';
  }

  function debounce(fn, ms) {
    var t = null;
    return function () {
      var args = arguments, self = this;
      if (t) clearTimeout(t);
      t = setTimeout(function () { t = null; fn.apply(self, args); }, ms);
    };
  }

  function rafThrottle(fn) {
    var queued = false, lastArgs = null;
    return function () {
      lastArgs = arguments;
      if (queued) return;
      queued = true;
      requestAnimationFrame(function () { queued = false; fn.apply(null, lastArgs); });
    };
  }

  global.D = {
    h: h, clear: clear, qs: qs, qsa: qsa, frag: frag, on: on, append: append,
    announce: announce, ensureLiveRegion: ensureLiveRegion, trapFocus: trapFocus, autofocus: autofocus, focusables: focusables,
    prefersReducedMotion: prefersReducedMotion, escapeHtml: escapeHtml,
    icon: icon, iconButton: iconButton, readableOn: readableOn, mix: mix,
    debounce: debounce, rafThrottle: rafThrottle
  };
})(window);
