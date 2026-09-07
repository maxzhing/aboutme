/**
 * A very small Express-compatible router, so the API layer written for the
 * server runs unchanged in the browser.
 *
 * This is not a general Express implementation. It supports exactly what
 * server/routes/*.js use: `Router()`, `use(mw)`, the four verb methods with
 * `:param` paths, and a response object that can either answer with JSON or
 * open a server-sent event stream. Keeping the shim honest to that surface is
 * what lets the same route file serve both builds; anything beyond it should
 * fail loudly rather than silently differ.
 */

class Router {
  constructor() {
    this.layers = [];
    const bind = (method) => (path, handler) => {
      this.layers.push({ method, ...compile(path), handler });
      return this;
    };
    this.get = bind('GET');
    this.post = bind('POST');
    this.patch = bind('PATCH');
    this.put = bind('PUT');
    this.delete = bind('DELETE');
  }

  use(pathOrFn, maybeFn) {
    const handler = typeof pathOrFn === 'function' ? pathOrFn : maybeFn;
    this.layers.push({ method: null, handler, middleware: true });
    return this;
  }

  /** Run this router over a request. Resolves true if a layer answered. */
  async handle(req, res) {
    for (const layer of this.layers) {
      if (res.headersSent) return true;

      if (layer.middleware) {
        let advanced = false;
        await new Promise((resolve, reject) => {
          const next = (err) => (err ? reject(err) : (advanced = true, resolve()));
          try {
            const out = layer.handler(req, res, next);
            if (out && typeof out.then === 'function') out.then(() => resolve(), reject);
          } catch (err) {
            reject(err);
          }
        });
        if (!advanced && res.headersSent) return true;
        continue;
      }

      if (layer.method !== req.method) continue;
      const params = match(layer, req.routePath);
      if (!params) continue;

      req.params = params;
      await layer.handler(req, res, (err) => {
        if (err) throw err;
      });
      return true;
    }
    return false;
  }
}

/** Turn "/sessions/:id/turn" into a matcher. */
function compile(path) {
  const keys = [];
  const source = String(path)
    .split('/')
    .map((part) => {
      if (!part.startsWith(':')) return part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      keys.push(part.slice(1));
      return '([^/]+)';
    })
    .join('/');
  return { regex: new RegExp(`^${source}/?$`), keys };
}

function match(layer, path) {
  const found = layer.regex.exec(path);
  if (!found) return null;
  const params = {};
  layer.keys.forEach((key, i) => {
    params[key] = decodeURIComponent(found[i + 1]);
  });
  return params;
}

const express = () => {
  throw new Error('The browser build composes routers directly; it does not create an Express app.');
};
express.Router = () => new Router();
express.json = () => (req, res, next) => next();
express.static = () => (req, res, next) => next();

export default express;
export { Router };
