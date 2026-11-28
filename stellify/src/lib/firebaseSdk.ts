/**
 * The Firebase SDK, loaded only when a student uses Google sign-in (guests never download it). The single offline
 * file swaps this module for firebaseSdk.stub.ts at build time: Google sign-in needs a real web address.
 *
 * Privacy: Auth is started WITHOUT Google's pop-up/redirect helper, because that helper loads a script from
 * apis.google.com as soon as Auth starts. It is passed only to the sign-in calls themselves, so nothing reaches
 * Google until the student actually clicks "Continue with Google".
 */
import { FIREBASE_CONFIG as CONFIG } from './firebaseConfig';

const modules = () => Promise.all([import('firebase/app'), import('firebase/auth'), import('firebase/firestore')]);
/** Downloads the code only (same site); starts nothing and contacts nobody. */
export const preloadModules = () => { void modules().catch(() => undefined); };

export async function loadSdk() {
  const [{ initializeApp, getApps }, auth, fs] = await modules();
  const app = getApps()[0] ?? initializeApp(CONFIG);
  let a: import('firebase/auth').Auth;
  try { a = auth.initializeAuth(app, { persistence: [auth.indexedDBLocalPersistence, auth.browserLocalPersistence] }); }
  catch { a = auth.getAuth(app); } // already started
  const db = fs.getFirestore(app);
  // tests point the app at the local Firebase emulators instead of the real project
  const emu = (globalThis as { __STELLIFY_EMULATORS__?: { auth: string; firestore: [string, number] } }).__STELLIFY_EMULATORS__;
  if (emu && !(a as unknown as { emulatorConfig?: unknown }).emulatorConfig) {
    auth.connectAuthEmulator(a, emu.auth, { disableWarnings: true });
    fs.connectFirestoreEmulator(db, emu.firestore[0], emu.firestore[1]);
  }
  return { auth: a, db, A: auth, F: fs, popup: auth.browserPopupRedirectResolver };
}
export type Sdk = Awaited<ReturnType<typeof loadSdk>>;
