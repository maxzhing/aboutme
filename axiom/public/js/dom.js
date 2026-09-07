/** Minimal hyperscript. `h('div.card', {onClick}, ...children)` */
export function h(spec, props, ...children) {
  const [tag, ...classes] = String(spec).split('.');
  const el = document.createElement(tag || 'div');
  if (classes.length) el.className = classes.join(' ');

  if (props && (typeof props !== 'object' || Array.isArray(props) || props instanceof Node)) {
    children.unshift(props);
    props = null;
  }

  for (const [key, value] of Object.entries(props || {})) {
    if (value == null || value === false) continue;
    if (key === 'class' || key === 'className') {
      el.className = [el.className, value].filter(Boolean).join(' ');
    } else if (key === 'style' && typeof value === 'object') {
      Object.assign(el.style, value);
    } else if (key === 'dataset') {
      Object.assign(el.dataset, value);
    } else if (key === 'html') {
      el.innerHTML = value;
    } else if (key.startsWith('on') && typeof value === 'function') {
      el.addEventListener(key.slice(2).toLowerCase(), value);
    } else if (key in el && key !== 'list' && typeof value !== 'object') {
      try { el[key] = value; } catch { el.setAttribute(key, value); }
    } else {
      el.setAttribute(key, value === true ? '' : value);
    }
  }

  append(el, children);
  return el;
}

export function append(parent, children) {
  for (const child of children.flat(6)) {
    if (child == null || child === false || child === true) continue;
    parent.appendChild(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return parent;
}

export function frag(...children) {
  return append(document.createDocumentFragment(), children);
}

export function clear(el) {
  while (el.firstChild) el.removeChild(el.firstChild);
  return el;
}

export function replace(el, ...children) {
  return append(clear(el), children);
}

export function svg(path, { size = 16, width = 2, fill = 'none' } = {}) {
  const node = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  node.setAttribute('viewBox', '0 0 24 24');
  node.setAttribute('fill', fill);
  node.setAttribute('stroke', 'currentColor');
  node.setAttribute('stroke-width', String(width));
  node.setAttribute('stroke-linecap', 'round');
  node.setAttribute('stroke-linejoin', 'round');
  node.setAttribute('width', String(size));
  node.setAttribute('height', String(size));
  node.innerHTML = path;
  return node;
}

export const escapeHtml = (text) =>
  String(text ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** Auto-grow a textarea to fit its content. */
export function autosize(textarea, max = 260) {
  const resize = () => {
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(max, textarea.scrollHeight)}px`;
  };
  textarea.addEventListener('input', resize);
  requestAnimationFrame(resize);
  return resize;
}

export function scrollToEnd(el, smooth = true) {
  requestAnimationFrame(() => {
    el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' });
  });
}

export const fmtDate = (iso) => {
  if (!iso) return '';
  const date = new Date(iso);
  const diff = (Date.now() - date.getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

export const titleCase = (text) =>
  String(text || '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
