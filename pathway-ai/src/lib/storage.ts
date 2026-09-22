/* ==========================================================================
   Persistence primitives
   IndexedDB is the store of record; localStorage is the fallback so the app
   still works in private windows or when IDB is blocked. Everything goes
   through this module so a server-backed repository can replace it.
   ========================================================================== */

const DB_NAME = 'pathway-ai';
const DB_VERSION = 1;
const STORE = 'kv';

let dbPromise: Promise<IDBDatabase | null> | null = null;

function openDB(): Promise<IDBDatabase | null> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve) => {
    if (typeof indexedDB === 'undefined') return resolve(null);
    let settled = false;
    const done = (v: IDBDatabase | null) => {
      if (!settled) {
        settled = true;
        resolve(v);
      }
    };
    try {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
      };
      req.onsuccess = () => done(req.result);
      req.onerror = () => done(null);
      req.onblocked = () => done(null);
      // A hung IDB open should not block app boot.
      setTimeout(() => done(null), 2500);
    } catch {
      done(null);
    }
  });
  return dbPromise;
}

const LS_PREFIX = 'pathway:';

function lsGet<T>(key: string): T | undefined {
  try {
    const raw = localStorage.getItem(LS_PREFIX + key);
    return raw === null ? undefined : (JSON.parse(raw) as T);
  } catch {
    return undefined;
  }
}

function lsSet(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(LS_PREFIX + key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

function lsDel(key: string): void {
  try {
    localStorage.removeItem(LS_PREFIX + key);
  } catch {
    /* storage unavailable — nothing to clean up */
  }
}

export async function kvGet<T>(key: string): Promise<T | undefined> {
  const db = await openDB();
  if (db) {
    const fromIdb = await new Promise<T | undefined>((resolve) => {
      try {
        const tx = db.transaction(STORE, 'readonly');
        const req = tx.objectStore(STORE).get(key);
        req.onsuccess = () => resolve(req.result as T | undefined);
        req.onerror = () => resolve(undefined);
      } catch {
        resolve(undefined);
      }
    });
    if (fromIdb !== undefined) return fromIdb;
  }
  return lsGet<T>(key);
}

export async function kvSet(key: string, value: unknown): Promise<void> {
  const db = await openDB();
  if (db) {
    const ok = await new Promise<boolean>((resolve) => {
      try {
        const tx = db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).put(value, key);
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
        tx.onabort = () => resolve(false);
      } catch {
        resolve(false);
      }
    });
    if (ok) return;
  }
  lsSet(key, value);
}

export async function kvDelete(key: string): Promise<void> {
  const db = await openDB();
  if (db) {
    await new Promise<void>((resolve) => {
      try {
        const tx = db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).delete(key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }
  lsDel(key);
}

export async function kvKeys(): Promise<string[]> {
  const db = await openDB();
  if (db) {
    const keys = await new Promise<string[]>((resolve) => {
      try {
        const tx = db.transaction(STORE, 'readonly');
        const req = tx.objectStore(STORE).getAllKeys();
        req.onsuccess = () => resolve((req.result as IDBValidKey[]).map(String));
        req.onerror = () => resolve([]);
      } catch {
        resolve([]);
      }
    });
    if (keys.length) return keys;
  }
  try {
    return Object.keys(localStorage)
      .filter((k) => k.startsWith(LS_PREFIX))
      .map((k) => k.slice(LS_PREFIX.length));
  } catch {
    return [];
  }
}

/** Synchronous, best-effort reads for values needed before first paint. */
export const syncStore = {
  get: <T>(key: string): T | undefined => lsGet<T>(key),
  set: (key: string, value: unknown): void => void lsSet(key, value),
  remove: lsDel,
};

/** Debounced writer so rapid state updates coalesce into one write. */
export function createDebouncedWriter(delay = 350): (key: string, value: unknown) => void {
  const pending = new Map<string, unknown>();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const flush = () => {
    timer = undefined;
    const entries = Array.from(pending.entries());
    pending.clear();
    for (const [key, value] of entries) void kvSet(key, value);
  };
  if (typeof window !== 'undefined') {
    // Never lose the last write when the tab goes away.
    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden' && pending.size) flush();
    });
    window.addEventListener('pagehide', () => {
      if (pending.size) flush();
    });
  }
  return (key, value) => {
    pending.set(key, value);
    if (timer) clearTimeout(timer);
    timer = setTimeout(flush, delay);
  };
}
