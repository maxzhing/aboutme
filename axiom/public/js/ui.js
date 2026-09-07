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

export function emptyState(title, detail, action) {
  return h(
    'div.empty',
    {},
    h('h3', {}, title),
    detail ? h('p.tiny', {}, detail) : null,
    action ? h('div', { style: { marginTop: '14px' } }, action) : null,
  );
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

export function masteryPips(level) {
  return h(
    'span.pips',
    { title: `Mastery ${level}/5` },
    ...Array.from({ length: 5 }, (_, i) =>
      h('span', {
        class: `pip${i < level ? ' on' : ''}${level >= 5 ? ' full' : level <= 2 ? ' low' : ''}`,
      }),
    ),
  );
}

export function masteryBar(level, label) {
  const pct = Math.round((level / 5) * 100);
  return h(
    'div.mastery-row',
    {},
    h('div.spread', {}, h('span', {}, label), h('span.tiny.dim', {}, `${level}/5`)),
    h(
      'div.mastery-bar',
      {},
      h('div', { class: `mastery-fill${level <= 2 ? ' low' : level <= 3 ? ' mid' : ''}`, style: { width: `${pct}%` } }),
    ),
  );
}

export function scoreRing(score, max) {
  const pct = max ? Math.max(0, Math.min(1, score / max)) : 0;
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const colour = pct >= 0.8 ? 'var(--mint)' : pct >= 0.5 ? 'var(--amber)' : 'var(--rose)';
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('width', '92');
  svg.setAttribute('height', '92');
  svg.setAttribute('viewBox', '0 0 92 92');
  const track = document.createElementNS(ns, 'circle');
  const fill = document.createElementNS(ns, 'circle');
  for (const [node, stroke, offset] of [
    [track, 'var(--ink-700)', 0],
    [fill, colour, circumference * (1 - pct)],
  ]) {
    node.setAttribute('cx', '46');
    node.setAttribute('cy', '46');
    node.setAttribute('r', String(radius));
    node.setAttribute('fill', 'none');
    node.setAttribute('stroke', stroke);
    node.setAttribute('stroke-width', '7');
    node.setAttribute('stroke-linecap', 'round');
    node.setAttribute('stroke-dasharray', String(circumference));
    node.setAttribute('stroke-dashoffset', String(offset));
    svg.appendChild(node);
  }
  return h(
    'div.score-ring',
    {},
    svg,
    h('div.value', {}, h('b', {}, `${Math.round(pct * 100)}%`), h('span', {}, `${score}/${max}`)),
  );
}

export function barRow(label, value, total, colour = 'var(--accent)') {
  const pct = total ? Math.round((value / total) * 100) : 0;
  return h(
    'div.bar-row',
    {},
    h('span', { style: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }, title: label }, label),
    h('div.bar-track', {}, h('div.bar-fill', { style: { width: `${pct}%`, background: colour } })),
    h('span.tiny.dim', {}, `${value}/${total}`),
  );
}

export { clear };
