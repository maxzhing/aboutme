/**
 * Zero-dependency persistent document store.
 *
 * Collections are held in memory and flushed to disk atomically (write temp,
 * fsync, rename), debounced so a burst of writes costs one flush. This keeps
 * the deployment to a single `node server/index.mjs` with no native modules,
 * while still surviving restarts.
 *
 * Collections:
 *   grants     - verified grant records keyed by GrantID (the durable database)
 *   profiles   - saved applicant profiles (for alerts and re-runs)
 *   runs       - search runs: results, excluded opportunities, reasoning
 *   saved      - user-saved grants
 *   tracker    - application tracker entries
 *   alerts     - alert notifications produced by the background sweeper
 *   pages      - cached fetched source pages (text + fetch timestamp)
 */

import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { config } from './config.mjs';

const COLLECTIONS = ['grants', 'profiles', 'runs', 'saved', 'tracker', 'alerts', 'pages'];

class Collection {
  constructor(name, dir) {
    this.name = name;
    this.file = path.join(dir, `${name}.json`);
    this.docs = new Map();
    this.dirty = false;
    this.flushTimer = null;
    this.flushing = null;
    this.load();
  }

  load() {
    try {
      if (!fs.existsSync(this.file)) return;
      const parsed = JSON.parse(fs.readFileSync(this.file, 'utf8'));
      if (Array.isArray(parsed)) {
        for (const doc of parsed) if (doc && doc.id) this.docs.set(doc.id, doc);
      }
    } catch (error) {
      // A corrupt file must not take the server down; quarantine and start clean.
      const backup = `${this.file}.corrupt-${Date.now()}`;
      try {
        fs.renameSync(this.file, backup);
        console.error(`[store] ${this.name}.json was unreadable (${error.message}); moved to ${backup}`);
      } catch {
        console.error(`[store] ${this.name}.json was unreadable: ${error.message}`);
      }
    }
  }

  markDirty() {
    this.dirty = true;
    if (this.flushTimer) return;
    this.flushTimer = setTimeout(() => {
      this.flushTimer = null;
      this.flush().catch((error) => console.error(`[store] flush ${this.name} failed: ${error.message}`));
    }, 150);
    this.flushTimer.unref?.();
  }

  async flush() {
    if (!this.dirty) return;
    if (this.flushing) return this.flushing;
    this.dirty = false;
    const payload = JSON.stringify([...this.docs.values()]);
    this.flushing = (async () => {
      const temp = `${this.file}.tmp-${process.pid}`;
      const handle = await fsp.open(temp, 'w');
      try {
        await handle.writeFile(payload, 'utf8');
        await handle.sync();
      } finally {
        await handle.close();
      }
      await fsp.rename(temp, this.file);
    })();
    try {
      await this.flushing;
    } finally {
      this.flushing = null;
    }
  }

  get(id) {
    return this.docs.get(id) ?? null;
  }

  put(doc) {
    if (!doc || !doc.id) throw new Error(`${this.name}: document requires an id`);
    const now = new Date().toISOString();
    const existing = this.docs.get(doc.id);
    const merged = { ...doc, createdAt: existing?.createdAt ?? doc.createdAt ?? now, updatedAt: now };
    this.docs.set(doc.id, merged);
    this.markDirty();
    return merged;
  }

  patch(id, changes) {
    const existing = this.docs.get(id);
    if (!existing) return null;
    return this.put({ ...existing, ...changes, id });
  }

  delete(id) {
    const removed = this.docs.delete(id);
    if (removed) this.markDirty();
    return removed;
  }

  all() {
    return [...this.docs.values()];
  }

  find(predicate) {
    return this.all().filter(predicate);
  }

  count() {
    return this.docs.size;
  }
}

export class Store {
  constructor(dir = config.dataDir) {
    fs.mkdirSync(dir, { recursive: true });
    this.dir = dir;
    for (const name of COLLECTIONS) this[name] = new Collection(name, dir);
  }

  async flushAll() {
    await Promise.all(COLLECTIONS.map((name) => this[name].flush()));
  }

  /** Records whose verification is older than the staleness window. */
  staleGrants(hours = config.pipeline.staleAfterHours) {
    const cutoff = Date.now() - hours * 3600_000;
    return this.grants.find((g) => {
      const stamp = Date.parse(g.lastVerified || '');
      return !Number.isFinite(stamp) || stamp < cutoff;
    });
  }

  /** Cache of fetched source pages, so re-verification does not re-crawl needlessly. */
  cachedPage(url, maxAgeMs) {
    const doc = this.pages.get(pageKey(url));
    if (!doc) return null;
    if (maxAgeMs !== undefined && Date.now() - Date.parse(doc.fetchedAt) > maxAgeMs) return null;
    return doc;
  }

  cachePage(url, { text, html, status, title, fetchedAt = new Date().toISOString() }) {
    return this.pages.put({ id: pageKey(url), url, text, html, status, title, fetchedAt });
  }
}

export function pageKey(url) {
  return `page:${url}`;
}

let singleton = null;
export function getStore() {
  if (!singleton) singleton = new Store();
  return singleton;
}
