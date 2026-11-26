'use client';
import { create } from 'zustand';
import { loadSdk, preloadModules, type Sdk } from './firebaseSdk';
import { snapshot, useStore } from './store';
import { safetyBackup } from './backup';
import type { AppState } from './types';

/**
 * Optional Google account: progress is saved to the student's own Firestore record (users/{uid}) and follows them to
 * any device. Guests keep everything on the device, as before. The whole app state is stored as one gzip-compressed
 * copy of the same snapshot that Export writes, so an account holds exactly what an export file would.
 *
 * On sign-in: no copy in the account yet → this device's progress is uploaded. The account has a copy and this device
 * has nothing new → the account's copy is loaded. Both changed → the student chooses which to keep (the other one is
 * kept as a safety backup on this device when it is replaced).
 */
export type Mode = 'guest' | 'google';
export interface CloudUser { uid: string; name: string | null; email: string | null; photo: string | null }
export interface Conflict { cloudAt: number; cloudAttempts: number; localAttempts: number }
interface CloudState {
  status: 'idle' | 'loading' | 'ready' | 'error';
  user: CloudUser | null;
  syncing: boolean;
  lastSync: number | null;
  conflict: Conflict | null;
  error: string | null;
}
export const useCloud = create<CloudState>(() => ({ status: 'idle', user: null, syncing: false, lastSync: null, conflict: null, error: null }));

const MODE_KEY = 'stellify-account', META_KEY = 'stellify-sync', REDIRECT_KEY = 'stellify-redirect';
const ls = {
  get(k: string) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k: string, v: string | null) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch { /* storage blocked */ } },
};
export const accountMode = (): Mode | null => { const m = ls.get(MODE_KEY); return m === 'guest' || m === 'google' ? m : null; };
export const setAccountMode = (m: Mode) => ls.set(MODE_KEY, m);
/** Google sign-in needs a real web address (not the offline file) and the Firebase build. */
export const cloudAvailable = () => typeof location !== 'undefined' && /^https?:$/.test(location.protocol) && !(globalThis as { __STELLIFY_NO_CLOUD__?: boolean }).__STELLIFY_NO_CLOUD__;

/** What this device last agreed with the account on. */
interface Meta { uid: string; cloudAt: number; dirty: boolean }
const readMeta = (): Meta | null => { try { return JSON.parse(ls.get(META_KEY) ?? 'null'); } catch { return null; } };
const writeMeta = (m: Meta | null) => ls.set(META_KEY, m ? JSON.stringify(m) : null);

export const hasProgress = (s: Pick<AppState, 'attempts' | 'mocks' | 'lessonsDone'>) => s.attempts.length > 0 || s.mocks.length > 0 || Object.keys(s.lessonsDone ?? {}).length > 0;
/** Firestore's limit is 1 MiB a record; stay well below it. */
export const MAX_BYTES = 900_000;

// ── compression: the snapshot is JSON, gzip makes it about ten times smaller ────────────────────────────────────
async function gzip(text: string): Promise<Uint8Array> {
  const stream = new Blob([text]).stream().pipeThrough(new CompressionStream('gzip'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}
async function gunzip(bytes: Uint8Array): Promise<string> {
  const stream = new Blob([bytes as Uint8Array<ArrayBuffer>]).stream().pipeThrough(new DecompressionStream('gzip'));
  return new Response(stream).text();
}

let sdk: Sdk | null = null;
let started = false, importing = false, timer: number | undefined;
const sdkOnce = async () => (sdk ??= await loadSdk());
const message = (e: unknown) => {
  const code = (e as { code?: string })?.code ?? '';
  if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') return 'Sign-in was cancelled.';
  if (code === 'auth/network-request-failed' || code === 'unavailable') return 'No connection to the account service. Your progress is still saved on this device.';
  if (code === 'auth/unauthorized-domain') return 'Google sign-in is not set up for this web address yet.';
  return (e as Error)?.message || 'Something went wrong with the account.';
};

/** Starts the account layer if this browser chose Google before. Safe to call more than once. */
export async function initCloud() {
  if (started || !cloudAvailable() || accountMode() !== 'google') return;
  started = true;
  useCloud.setState({ status: 'loading' });
  try {
    const s = await sdkOnce();
    // finish a sign-in that had to use a full-page redirect (pop-up blocked); otherwise skip this network round trip
    if (ls.get(REDIRECT_KEY)) { ls.set(REDIRECT_KEY, null); await s.A.getRedirectResult(s.auth, s.popup).catch(() => null); }
    s.A.onAuthStateChanged(s.auth, (u) => {
      const user = u ? { uid: u.uid, name: u.displayName, email: u.email, photo: u.photoURL } : null;
      useCloud.setState({ user, status: 'ready' });
      if (user) void reconcile();
    });
  } catch (e) { useCloud.setState({ status: 'error', error: message(e) }); started = false; }
}

/** Loads Firebase ahead of time (when a sign-in button appears), so the click can open Google's pop-up at once. */
export const preloadCloud = () => { if (cloudAvailable()) preloadModules(); };

export async function signInWithGoogle() {
  useCloud.setState({ error: null });
  try {
    const s = await sdkOnce();
    const provider = new s.A.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    // tests only: the local emulators accept a made-up Google identity, so no pop-up is needed
    const fake = (globalThis as { __STELLIFY_EMULATORS__?: { googleUser?: { sub: string; email: string; name: string } } }).__STELLIFY_EMULATORS__?.googleUser;
    // the pop-up must open straight from the click, before anything else waits on the network
    try { if (fake) await s.A.signInWithCredential(s.auth, s.A.GoogleAuthProvider.credential(JSON.stringify({ ...fake, email_verified: true }))); else await s.A.signInWithPopup(s.auth, provider, s.popup); }
    catch (e) {
      if ((e as { code?: string }).code !== 'auth/popup-blocked') throw e;
      setAccountMode('google'); ls.set(REDIRECT_KEY, '1');
      await s.A.signInWithRedirect(s.auth, provider, s.popup);
    }
    setAccountMode('google');
    await initCloud();
    return true;
  } catch (e) { useCloud.setState({ error: message(e) }); return false; }
}

/** Signs out after a last save. Progress stays on this device (Settings → Delete all data removes it). */
export async function signOutCloud() {
  if (!sdk) return;
  if (readMeta()?.dirty) await push().catch(() => undefined);
  await sdk.A.signOut(sdk.auth);
  writeMeta(null); setAccountMode('guest');
  useCloud.setState({ user: null, conflict: null, lastSync: null });
}

/** Deletes the account's saved copy (this device keeps its own). */
export async function deleteCloudCopy() {
  const s = await sdkOnce(), u = useCloud.getState().user; if (!u) return;
  await s.F.deleteDoc(s.F.doc(s.db, 'users', u.uid));
  // nothing to save back on sign-out; staying signed in, the next change creates a new account copy
  writeMeta(null);
}

async function readCloud(): Promise<{ at: number; attempts: number; state: () => Promise<AppState> } | null> {
  const s = await sdkOnce(), u = useCloud.getState().user!;
  const snap = await s.F.getDoc(s.F.doc(s.db, 'users', u.uid));
  if (!snap.exists()) return null;
  const d = snap.data() as { at: number; attempts: number; data: { toUint8Array(): Uint8Array } };
  return { at: d.at, attempts: d.attempts, state: async () => JSON.parse(await gunzip(d.data.toUint8Array())) as AppState };
}

/** Uploads this device's progress to the account. */
export async function push() {
  const u = useCloud.getState().user; if (!u || useCloud.getState().conflict) return;
  const s = await sdkOnce();
  useCloud.setState({ syncing: true });
  try {
    const state = snapshot();
    const bytes = await gzip(JSON.stringify(state));
    if (bytes.length > MAX_BYTES) throw new Error('Your progress is too large to save to the account. It is still saved on this device; Export also works.');
    const at = Date.now();
    await s.F.setDoc(s.F.doc(s.db, 'users', u.uid), { v: 1, at, attempts: state.attempts.length, data: s.F.Bytes.fromUint8Array(bytes), updated: s.F.serverTimestamp() });
    writeMeta({ uid: u.uid, cloudAt: at, dirty: false });
    useCloud.setState({ lastSync: at, error: null });
  } catch (e) { useCloud.setState({ error: message(e) }); throw e; }
  finally { useCloud.setState({ syncing: false }); }
}

async function pull(cloud: NonNullable<Awaited<ReturnType<typeof readCloud>>>) {
  const u = useCloud.getState().user!;
  const state = await cloud.state();
  importing = true;
  try { useStore.getState().importState(state); } finally { importing = false; }
  writeMeta({ uid: u.uid, cloudAt: cloud.at, dirty: false });
  useCloud.setState({ lastSync: Date.now(), conflict: null });
}

/** The device's saved progress loads asynchronously; never compare against the empty state before it. */
const hydrated = () => new Promise<void>((ok) => {
  if (useStore.getState().hydrated) return ok();
  const off = useStore.subscribe((s) => { if (s.hydrated) { off(); ok(); } });
});

/** Brings this device and the account into agreement after sign-in or on start-up. */
export async function reconcile() {
  const u = useCloud.getState().user; if (!u) return;
  useCloud.setState({ syncing: true });
  try {
    await hydrated();
    const cloud = await readCloud();
    const meta = readMeta(), local = snapshot();
    const known = meta?.uid === u.uid;
    if (!cloud) { if (hasProgress(local) || !known) await push(); return; }
    if (known && cloud.at === meta!.cloudAt) { if (meta!.dirty) await push(); else useCloud.setState({ lastSync: Date.now() }); return; }
    // the account changed elsewhere (or this device has not synced with it yet)
    const localNew = known ? meta!.dirty : hasProgress(local);
    if (!localNew) await pull(cloud);
    else useCloud.setState({ conflict: { cloudAt: cloud.at, cloudAttempts: cloud.attempts, localAttempts: local.attempts.length } });
  } catch (e) { useCloud.setState({ error: message(e) }); }
  finally { useCloud.setState({ syncing: false }); }
}

/** The student's answer when both this device and the account have new progress. */
export async function resolveConflict(keep: 'cloud' | 'device') {
  const cloud = await readCloud();
  useCloud.setState({ conflict: null });
  if (keep === 'cloud' && cloud) await pull(cloud); // importState keeps this device's progress as a safety backup
  else {
    if (cloud) await safetyBackup(await cloud.state(), 'replacing the account copy with this device');
    await push();
  }
}

// save a little after every change, and straight away when the tab is hidden or closed
useStore.subscribe((s, prev) => {
  if (!s.hydrated || importing || s === prev) return;
  const u = useCloud.getState().user; if (!u) return;
  const m = readMeta(); writeMeta({ uid: u.uid, cloudAt: m?.uid === u.uid ? m.cloudAt : 0, dirty: true });
  window.clearTimeout(timer);
  timer = window.setTimeout(() => { void push().catch(() => undefined); }, 20_000);
});
if (typeof document !== 'undefined') document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden' && useCloud.getState().user && readMeta()?.dirty) { window.clearTimeout(timer); void push().catch(() => undefined); }
});
