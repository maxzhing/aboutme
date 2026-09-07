import { h, clear } from './js/dom.js';
import { icon } from './js/icons.js';
import { route, setNotFound, startRouter, navigate, currentPath } from './js/router.js';
import { api } from './js/api.js';
import { state, update } from './js/state.js';
import { initTheme, toggleTheme, toast, emptyState } from './js/ui.js';
import { homeView } from './js/views/home.js';
import { sessionView } from './js/views/session.js';
import { dashboardView } from './js/views/dashboard.js';
import { studioView } from './js/views/studio.js';
import { libraryView, resourceView } from './js/views/library.js';
import { progressView } from './js/views/progress.js';
import { sourcesView } from './js/views/sources.js';
import { reviewView } from './js/views/review.js';
import { coursesView, courseView } from './js/views/course.js';

const NAV = [
  { path: '/dashboard', label: 'Dashboard', icon: 'home' },
  { path: '/course', label: 'Courses', icon: 'route', href: '/courses' },
  { path: '/studio', label: 'Studio', icon: 'wand' },
  { path: '/review', label: 'Review', icon: 'repeat', badge: () => state.dashboard?.dueNow || 0 },
  { path: '/progress', label: 'Mastery', icon: 'chart' },
  { path: '/library', label: 'Library', icon: 'library' },
  { path: '/sources', label: 'My material', icon: 'file' },
];

const app = document.getElementById('app');

route('/', homeView);
route('/dashboard', dashboardView);
route('/session/:id', sessionView);
route('/studio', studioView);
route('/library', libraryView);
route('/resource/:id', resourceView);
route('/progress', progressView);
route('/sources', sourcesView);
route('/review', reviewView);
route('/courses', coursesView);
route('/course/:id', courseView);
setNotFound(() =>
  h('div.page', {}, emptyState('That page does not exist', null, h('button.btn.primary', { type: 'button', onClick: () => navigate('/') }, 'Go home'))),
);

/* ------------------------------------------------------------------- shell */

let titleNode;
let subtitleNode;
let railNode;

function buildShell(content) {
  const rail = h('nav.rail');
  railNode = rail;

  rail.appendChild(
    h(
      'button.brand',
      { type: 'button', onClick: () => navigate('/'), style: { background: 'none', width: '100%' } },
      h('div.brand-mark', {}, icon('spark', { size: 17 })),
      h('span.brand-name', {}, h('b', {}, 'Axiom')),
    ),
  );

  rail.appendChild(
    h(
      'button.btn.primary',
      { type: 'button', style: { margin: '0 10px 14px', width: 'calc(100% - 20px)' }, onClick: () => navigate('/') },
      icon('plus', { size: 14 }),
      'New session',
    ),
  );

  const path = currentPath();
  for (const item of NAV) {
    const badge = item.badge?.() || 0;
    rail.appendChild(
      h(
        'button',
        {
          type: 'button',
          class: `nav-item${path.startsWith(item.path) ? ' is-active' : ''}`,
          onClick: () => {
            navigate(item.href || item.path);
            rail.classList.remove('open');
          },
        },
        h('span.nav-icon', {}, icon(item.icon, { size: 16 })),
        item.label,
        badge ? h('span.nav-badge', {}, String(badge)) : null,
      ),
    );
  }

  rail.appendChild(h('div.nav-group', {}, 'Recent sessions'));
  const recentHost = h('div.stack', { style: { gap: '1px' } });
  rail.appendChild(recentHost);
  drawRecent(recentHost);

  rail.appendChild(
    h(
      'div.rail-foot',
      {},
      h(
        'button.nav-item',
        { type: 'button', onClick: () => { toggleTheme(); render(); } },
        h('span.nav-icon', {}, icon(document.documentElement.dataset.theme === 'dark' ? 'sun' : 'moon', { size: 16 })),
        document.documentElement.dataset.theme === 'dark' ? 'Light mode' : 'Dark mode',
      ),
      h(
        'div.tiny.dim',
        { style: { padding: '8px 11px' } },
        state.health?.llmReady === false
          ? h('span', { style: { color: 'var(--warning)' } }, 'No API key configured')
          : `${state.health?.model || 'model'} · quality control ${state.health?.qualityControl ? 'on' : 'off'}`,
      ),
    ),
  );

  titleNode = h('h1', {}, 'Axiom');
  subtitleNode = h('span.topbar-sub', {});

  const topbar = h(
    'header.topbar',
    {},
    h(
      'button.btn.icon.ghost',
      {
        type: 'button',
        'aria-label': 'Menu',
        style: { display: 'none' },
        class: 'menu-button',
        onClick: () => rail.classList.toggle('open'),
      },
      icon('menu', { size: 16 }),
    ),
    h('div', {}, titleNode, subtitleNode),
    h(
      'div.topbar-actions',
      {},
      h('button.btn.sm', { type: 'button', onClick: () => navigate('/studio') }, icon('wand', { size: 13 }), 'Make a worksheet'),
      h('button.btn.sm.primary', { type: 'button', onClick: () => navigate('/') }, icon('sparkles', { size: 13 }), 'Learn'),
    ),
  );

  return h('div.shell', {}, rail, h('div.main', {}, topbar, content));
}

/** Keep the rail's session list in step with what the learner has started. */
export function refreshSessions() {
  return api
    .sessions()
    .then(({ sessions }) => {
      const changed = sessions.length !== state.sessions.length || sessions[0]?.id !== state.sessions[0]?.id;
      state.sessions = sessions;
      const host = railNode?.querySelector('.nav-group + .stack');
      if (host) drawRecent(host);
      else if (changed && currentPath() !== '/') render();
    })
    .catch(() => {});
}

function drawRecent(host) {
  const sessions = state.sessions || [];
  clear(host);
  if (!sessions.length) {
    host.appendChild(h('p.tiny.dim', { style: { padding: '4px 11px' } }, 'No sessions yet.'));
    return;
  }
  for (const session of sessions.slice(0, 6)) {
    host.appendChild(
      h(
        'button.nav-item',
        {
          type: 'button',
          title: session.title,
          onClick: () => {
            navigate(`/session/${session.id}`);
            railNode?.classList.remove('open');
          },
        },
        h('span.nav-icon', {}, icon('book', { size: 15 })),
        h(
          'span',
          { style: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } },
          session.title,
        ),
      ),
    );
  }
}

function setTitle(title, sub) {
  if (titleNode) titleNode.textContent = title;
  if (subtitleNode) subtitleNode.textContent = sub || '';
  document.title = title === 'Axiom' ? 'Axiom — Tell me what you want to learn' : `${title} · Axiom`;
}

document.addEventListener('axiom:title', (event) => setTitle(event.detail.title, event.detail.sub));

const TITLES = {
  '/dashboard': ['Dashboard', 'Your learning at a glance'],
  '/studio': ['Studio', 'Generate anything you need'],
  '/library': ['Library', 'Everything made for you'],
  '/progress': ['Mastery', 'Concept by concept'],
  '/sources': ['My material', 'Learn from your own documents'],
  '/review': ['Review', 'Spaced retrieval queue'],
  '/courses': ['Courses', 'Whole syllabuses, weighted by their exam'],
};

/* ------------------------------------------------------------------ render */

let currentView = null;

function render(resolved) {
  const target = resolved || { view: null, params: {}, path: currentPath() };
  const isNavigation = Boolean(resolved) && resolved.path !== currentView?.path;
  if (target.view) currentView = target;
  if (!currentView) return;

  const { view, params, path } = currentView;
  const content = view({ params });

  clear(app);
  if (path === '/') {
    app.appendChild(content);
    document.title = 'Axiom — Tell me what you want to learn';
    if (isNavigation) window.scrollTo({ top: 0, behavior: 'instant' });
    refreshSessions();
    return;
  }

  const holder = h('div', {}, content);
  app.appendChild(buildShell(holder));
  if (isNavigation) window.scrollTo({ top: 0, behavior: 'instant' });
  const [title, sub] = TITLES[path] || ['Axiom', ''];
  setTitle(title, sub);

  // Mobile menu button visibility is handled by CSS width, not JS.
  const menuButton = app.querySelector('.menu-button');
  if (menuButton) menuButton.style.display = window.matchMedia('(max-width: 780px)').matches ? 'inline-flex' : 'none';
}

/* -------------------------------------------------------------------- boot */

async function boot() {
  initTheme();
  try {
    update({ health: await api.health() });
  } catch {
    update({ health: { llmReady: false } });
  }
  refreshSessions();
  api.dashboard().then((data) => update({ dashboard: data })).catch(() => {});

  startRouter(render);

  if (state.health?.llmReady === false) {
    toast('No ANTHROPIC_API_KEY is configured — add one to axiom/.env and restart the server.', 'error', 12000);
  }
}

window.addEventListener('resize', () => {
  const menuButton = app.querySelector('.menu-button');
  if (menuButton) menuButton.style.display = window.matchMedia('(max-width: 780px)').matches ? 'inline-flex' : 'none';
});

boot();
