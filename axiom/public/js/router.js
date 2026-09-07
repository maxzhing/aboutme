const routes = [];
let notFound = () => document.createTextNode('Not found');
let current = null;

export function route(pattern, view) {
  const keys = [];
  const regex = new RegExp(
    '^' +
      pattern
        .replace(/\/:([\w]+)/g, (_, key) => {
          keys.push(key);
          return '/([^/]+)';
        })
        .replace(/\//g, '\\/') +
      '$',
  );
  routes.push({ regex, keys, view });
}

export const setNotFound = (view) => {
  notFound = view;
};

export function navigate(path, { replace = false } = {}) {
  const target = `#${path}`;
  if (location.hash === target) {
    resolve();
    return;
  }
  if (replace) history.replaceState(null, '', target);
  else location.hash = target;
}

export const currentPath = () => location.hash.replace(/^#/, '') || '/';

export function resolve() {
  const path = currentPath();
  for (const { regex, keys, view } of routes) {
    const match = path.match(regex);
    if (!match) continue;
    const params = {};
    keys.forEach((key, i) => {
      params[key] = decodeURIComponent(match[i + 1]);
    });
    current = { path, params, view };
    return { view, params, path };
  }
  current = { path, params: {}, view: notFound };
  return { view: notFound, params: {}, path };
}

export const activeRoute = () => current;

export function startRouter(onChange) {
  window.addEventListener('hashchange', () => onChange(resolve()));
  onChange(resolve());
}
