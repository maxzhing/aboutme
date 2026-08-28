/* Cadence — dialogs, drawers, popover menus and confirmations. */
(function (global) {
  'use strict';
  var UI = global.UI = global.UI || {};

  var openLayers = [];

  function lockScroll(lock) {
    document.documentElement.classList.toggle('is-locked', lock);
  }

  function baseLayer(opts) {
    opts = opts || {};
    var backdrop = D.h('div.backdrop', { class: opts.backdropClass || null });
    var panel = D.h('div.' + (opts.panelClass || 'dialog'), {
      role: opts.role || 'dialog',
      'aria-modal': 'true',
      'aria-label': opts.ariaLabel || opts.title || 'Dialog',
      tabindex: '-1'
    });
    backdrop.appendChild(panel);
    document.body.appendChild(backdrop);

    var release = D.trapFocus(panel, function () { layer.close(); });

    var layer = {
      node: panel,
      backdrop: backdrop,
      closed: false,
      close: function (result) {
        if (layer.closed) return;
        layer.closed = true;
        release();
        var idx = openLayers.indexOf(layer);
        if (idx >= 0) openLayers.splice(idx, 1);
        if (!openLayers.length) lockScroll(false);
        if (D.prefersReducedMotion()) remove();
        else {
          backdrop.classList.add('is-leaving');
          setTimeout(remove, 180);
        }
        if (opts.onClose) opts.onClose(result);
      }
    };
    function remove() { if (backdrop.parentNode) backdrop.parentNode.removeChild(backdrop); }

    backdrop.addEventListener('mousedown', function (e) {
      if (e.target === backdrop && opts.dismissible !== false) layer.close();
    });

    openLayers.push(layer);
    lockScroll(true);
    if (!D.prefersReducedMotion()) {
      backdrop.classList.add('is-entering');
      requestAnimationFrame(function () { backdrop.classList.remove('is-entering'); });
    }
    return layer;
  }

  /* Centred dialog. `size`: sm | md | lg | xl */
  function modal(opts) {
    opts = opts || {};
    var layer = baseLayer({
      panelClass: 'dialog dialog--' + (opts.size || 'md') + (opts.class ? ' ' + opts.class : ''),
      ariaLabel: opts.title,
      onClose: opts.onClose,
      dismissible: opts.dismissible
    });

    var header = D.h('header.dialog__head');
    if (opts.title) {
      var titleWrap = D.h('div.dialog__titles', [
        D.h('h2.dialog__title', { text: opts.title, id: 'dlg-title-' + M.uid('t') }),
        opts.subtitle ? D.h('p.dialog__subtitle', { text: opts.subtitle }) : null
      ]);
      header.appendChild(titleWrap);
    }
    if (opts.headerExtra) header.appendChild(opts.headerExtra);
    header.appendChild(D.iconButton('x', 'Close', function () { layer.close(); }, { class: 'dialog__close' }));
    layer.node.appendChild(header);

    var body = D.h('div.dialog__body');
    if (opts.body) D.append(body, typeof opts.body === 'function' ? opts.body(layer) : opts.body);
    layer.node.appendChild(body);
    layer.body = body;

    if (opts.footer) {
      var footer = D.h('footer.dialog__foot');
      D.append(footer, typeof opts.footer === 'function' ? opts.footer(layer) : opts.footer);
      layer.node.appendChild(footer);
      layer.footer = footer;
    }

    D.autofocus(layer.node);
    return layer;
  }

  /* Side drawer on desktop, bottom sheet on small screens (CSS decides). */
  function sheet(opts) {
    opts = opts || {};
    var layer = baseLayer({
      panelClass: 'sheet' + (opts.class ? ' ' + opts.class : ''),
      backdropClass: 'backdrop--sheet',
      ariaLabel: opts.title,
      onClose: opts.onClose,
      dismissible: opts.dismissible
    });

    var header = D.h('header.sheet__head');
    header.appendChild(D.h('div.sheet__grip', { 'aria-hidden': 'true' }));
    var titles = D.h('div.sheet__titles', [
      D.h('h2.sheet__title', { text: opts.title || '' }),
      opts.subtitle ? D.h('p.sheet__subtitle', { text: opts.subtitle }) : null
    ]);
    header.appendChild(titles);
    if (opts.headerExtra) header.appendChild(opts.headerExtra);
    header.appendChild(D.iconButton('x', 'Close', function () { layer.close(); }, { class: 'sheet__close' }));
    layer.node.appendChild(header);

    var body = D.h('div.sheet__body');
    if (opts.body) D.append(body, typeof opts.body === 'function' ? opts.body(layer) : opts.body);
    layer.node.appendChild(body);
    layer.body = body;

    if (opts.footer) {
      var footer = D.h('footer.sheet__foot');
      D.append(footer, typeof opts.footer === 'function' ? opts.footer(layer) : opts.footer);
      layer.node.appendChild(footer);
      layer.footer = footer;
    }
    D.autofocus(layer.node);
    return layer;
  }

  function confirm(opts) {
    opts = opts || {};
    return new Promise(function (resolve) {
      var settled = false;
      var layer = modal({
        size: 'sm',
        class: 'dialog--confirm',
        title: opts.title || 'Are you sure?',
        body: D.h('p.confirm__msg', { text: opts.message || '' }),
        onClose: function () { if (!settled) resolve(false); },
        footer: function (l) {
          return [
            D.h('button.btn.btn--ghost', {
              type: 'button', onclick: function () { settled = true; l.close(); resolve(false); }
            }, opts.cancelLabel || 'Cancel'),
            D.h('button.btn' + (opts.tone === 'danger' ? '.btn--danger' : '.btn--primary'), {
              type: 'button', 'data-autofocus': '',
              onclick: function () { settled = true; l.close(); resolve(true); }
            }, opts.confirmLabel || 'Confirm')
          ];
        }
      });
    });
  }

  /* Popover menu anchored to an element, flipped to stay on screen. */
  function menu(anchor, items, opts) {
    opts = opts || {};
    closeMenus();

    var list = D.h('div.menu', { role: 'menu', tabindex: '-1' });
    var buttons = [];

    items.forEach(function (item) {
      if (!item) return;
      if (item.separator) { list.appendChild(D.h('div.menu__sep', { role: 'separator' })); return; }
      if (item.heading) { list.appendChild(D.h('div.menu__heading', { text: item.heading })); return; }
      var btn = D.h('button.menu__item', {
        type: 'button', role: 'menuitem',
        class: (item.danger ? 'is-danger' : '') + (item.checked ? ' is-checked' : ''),
        disabled: !!item.disabled,
        onclick: function (e) {
          e.stopPropagation();
          close();
          if (item.onClick) item.onClick(e);
        }
      });
      btn.appendChild(D.h('span.menu__icon', item.icon ? D.icon(item.icon, 16) : (item.checked ? D.icon('check', 16) : null)));
      btn.appendChild(D.h('span.menu__label', { text: item.label }));
      if (item.shortcut) btn.appendChild(D.h('kbd.menu__kbd', { text: item.shortcut }));
      list.appendChild(btn);
      buttons.push(btn);
    });

    document.body.appendChild(list);

    var rect = anchor.getBoundingClientRect();
    var mw = list.offsetWidth, mh = list.offsetHeight;
    var left = opts.align === 'right' ? rect.right - mw : rect.left;
    var top = rect.bottom + 6;
    if (left + mw > window.innerWidth - 8) left = window.innerWidth - mw - 8;
    if (left < 8) left = 8;
    if (top + mh > window.innerHeight - 8) top = Math.max(8, rect.top - mh - 6);
    list.style.left = left + 'px';
    list.style.top = top + 'px';

    var scrim = D.h('div.menu-scrim');
    document.body.appendChild(scrim);
    scrim.addEventListener('mousedown', function (e) { e.preventDefault(); close(); });

    var index = -1;
    function onKey(e) {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); anchor.focus && anchor.focus(); }
      else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        var dir = e.key === 'ArrowDown' ? 1 : -1;
        index = (index + dir + buttons.length) % buttons.length;
        buttons[index] && buttons[index].focus();
      } else if (e.key === 'Tab') { close(); }
    }
    document.addEventListener('keydown', onKey, true);
    window.addEventListener('resize', close);
    window.addEventListener('scroll', close, true);

    function close() {
      document.removeEventListener('keydown', onKey, true);
      window.removeEventListener('resize', close);
      window.removeEventListener('scroll', close, true);
      if (list.parentNode) list.parentNode.removeChild(list);
      if (scrim.parentNode) scrim.parentNode.removeChild(scrim);
      openMenu = null;
    }

    openMenu = { close: close };
    setTimeout(function () { if (buttons[0]) { buttons[0].focus(); index = 0; } }, 10);
    return openMenu;
  }

  var openMenu = null;
  function closeMenus() { if (openMenu) openMenu.close(); }

  function closeTop() {
    if (openMenu) { closeMenus(); return true; }
    if (openLayers.length) { openLayers[openLayers.length - 1].close(); return true; }
    return false;
  }

  function anyOpen() { return !!(openMenu || openLayers.length); }

  UI.modal = modal;
  UI.sheet = sheet;
  UI.confirm = confirm;
  UI.menu = menu;
  UI.closeMenus = closeMenus;
  UI.closeTop = closeTop;
  UI.anyOpen = anyOpen;
})(window);
