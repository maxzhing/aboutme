import { useMemo, useSyncExternalStore } from 'react';

/**
 * Hash-based routing so the whole app works from a single HTML file opened with file://.
 * A location looks like  stellify.html#/practice/session?mode=smart&n=10
 * and may carry an in-page anchor:  #/grammar#semicolon
 */
const raw = () => (typeof window === 'undefined' ? '/' : window.location.hash.slice(1) || '/');
const subscribe = (cb: () => void) => { window.addEventListener('hashchange', cb); return () => window.removeEventListener('hashchange', cb); };

export function useHash() { return useSyncExternalStore(subscribe, raw, () => '/'); }
export const parseHash = (h: string) => {
  const [route, anchor] = h.split('#');
  const [path, query = ''] = route.split('?');
  return { path: path.replace(/\/+$/, '') || '/', query, anchor };
};
export function usePathname() { return parseHash(useHash()).path; }
export function useSearchParams() { const q = parseHash(useHash()).query; return useMemo(() => new URLSearchParams(q), [q]); }
export function useAnchor() { return parseHash(useHash()).anchor; }
export const navigate = (href: string, replace = false) => {
  if (replace) { history.replaceState(null, '', `#${href}`); window.dispatchEvent(new HashChangeEvent('hashchange')); }
  else window.location.hash = href;
};
export function useRouter() { return useMemo(() => ({ push: (h: string) => navigate(h), replace: (h: string) => navigate(h, true), back: () => history.back() }), []); }
