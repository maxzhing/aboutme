import { h, clear } from './dom.js';
import { icon } from './icons.js';

let toastHost;

export function toast(message, kind = 'info', ms = 5200) {
  if (!toastHost) {
    toastHost = h('div.toast-host');
    document.body.appendChild(toastHost);
  }
  const node = h(
    `div.toast.${kind}`,
    {},
    icon(kind === 'error' ? 'alert' : kind === 'success' ? 'checkCircle' : 'info', { size: 15 }),
    h('span', {}, message),
    h('button.close', { type: 'button', onClick: () => node.remove(), 'aria-label': 'Dismiss' }, icon('x', { size: 13 })),
  );
  toastHost.appendChild(node);
  if (ms) setTimeout(() => node.remove(), ms);
  return node;
}

export function modal(build) {
  const host = h('div.modal-host', {
    onClick: (event) => {
      if (event.target === host) close();
    },
  });
  const close = () => {
    host.remove();
    document.removeEventListener('keydown', onKey);
  };
  const onKey = (event) => {
    if (event.key === 'Escape') close();
  };
  document.addEventListener('keydown', onKey);
  const panel = h('div.modal');
  host.appendChild(panel);
  document.body.appendChild(host);
  build(panel, close);
  return close;
}

export function statusLine(message) {
  return h('div.status-line', {}, h('span.spinner'), h('span', {}, message));
}

export function skeleton(count = 3, height = 74) {
  return h(
    'div.stack',
    {},
    ...Array.from({ length: count }, () => h('div.skeleton', { style: { height: `${height}px` } })),
  );
}

export function emptyState(title, detail, action, art = 'compass') {
  return h(
    'div.empty',
    {},
    h('div.empty-art', {}, emptyArt(art)),
    h('h3', {}, title),
    detail ? h('p', {}, detail) : null,
    action ? h('div', { style: { marginTop: '14px' } }, action) : null,
  );
}

/** A quiet piece of geometry rather than a shrugging illustration. */
function emptyArt(kind) {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 68 68');
  svg.setAttribute('width', '68');
  svg.setAttribute('height', '68');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('aria-hidden', 'true');
  const rings = kind === 'grid'
    ? '<rect x="10" y="10" width="20" height="20" rx="5"/><rect x="38" y="10" width="20" height="20" rx="5"/>' +
      '<rect x="10" y="38" width="20" height="20" rx="5"/><rect x="38" y="38" width="20" height="20" rx="5" opacity=".35"/>'
    : '<circle cx="34" cy="34" r="24"/><circle cx="34" cy="34" r="14" opacity=".5"/><circle cx="34" cy="34" r="4" opacity=".9"/>';
  svg.innerHTML = `<g stroke="var(--line-3)" stroke-width="1.5">${rings}</g>`;
  return svg;
}

/* -------------------------------------------------------------------- theme */

const THEME_KEY = 'axiom:theme';

export function initTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  const theme = saved || (window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
  document.documentElement.dataset.theme = theme;
  return theme;
}

export function toggleTheme() {
  const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  localStorage.setItem(THEME_KEY, next);
  return next;
}

/* ---------------------------------------------------------------- fragments */

// Chart pieces live in render/charts.js; re-exported so views have one import.
export { masteryPips, masteryMeter, scoreRing, barRow, statTile, sparkline } from './render/charts.js';

export { clear };
