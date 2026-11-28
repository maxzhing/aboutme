/**
 * Stellify's free AI tutor on the website: Firebase AI Logic with the Gemini Developer API (no-cost tier).
 * Students need no key: Firebase holds it. Loaded only when a student has agreed to AI replies and asks
 * something; nothing is downloaded or sent before that. The single offline file swaps this module for
 * firebaseAi.stub.ts at build time, so it never contains this code.
 */
import { FIREBASE_CONFIG } from './firebaseConfig';

/** Google's alias for its current free-tier Flash-Lite model (the free tier gives it far more daily requests than Flash), so a retired model never breaks the tutor. */
export const SITE_MODEL = 'gemini-flash-lite-latest';
export const siteAiAvailable = () => true;

export type Turn = { role: 'user' | 'model'; parts: { text: string }[] };
export class SiteAiError extends Error { constructor(public kind: 'quota' | 'off' | 'other', msg: string) { super(msg); } }

/** Tried in order: if one free model is overloaded or out of its daily quota, the other usually is not. */
export const SITE_MODELS = [SITE_MODEL, 'gemini-flash-latest'];
const busy = (m: string) => /\b(500|503|429)\b|high demand|overloaded|UNAVAILABLE|INTERNAL|RESOURCE_EXHAUSTED|quota/i.test(m);

export async function siteGenerate(system: string, contents: Turn[]): Promise<string> {
  const [{ initializeApp, getApps }, ai] = await Promise.all([import('firebase/app'), import('firebase/ai')]);
  const app = getApps()[0] ?? initializeApp(FIREBASE_CONFIG);
  const backend = ai.getAI(app, { backend: new ai.GoogleAIBackend() });
  const deadline = Date.now() + 25_000; // never leave the tutor waiting longer than this
  let last = '';
  for (const name of SITE_MODELS) {
    const left = deadline - Date.now();
    if (left < 2_000) break;
    const model = ai.getGenerativeModel(backend, { model: name, systemInstruction: system, generationConfig: { temperature: 0.3, maxOutputTokens: 800 } });
    try {
      const r = await Promise.race([
        model.generateContent({ contents }),
        new Promise<never>((_, no) => setTimeout(() => no(new Error('timeout')), left)),
      ]);
      return r.response.text().trim();
    } catch (e) {
      last = String((e as Error)?.message ?? e);
      console.warn('Stellify AI (' + name + '):', last.slice(0, 300));
      if (/403|PERMISSION_DENIED|not been used|disabled|API_NOT_ENABLED|App Check/i.test(last)) throw new SiteAiError('off', last);
      if (!busy(last) && !/404|not found|no longer available/i.test(last)) throw new SiteAiError('other', last);
      // busy or retired: try the next model
    }
  }
  throw new SiteAiError(busy(last) ? 'quota' : 'other', last || 'timeout');
}
