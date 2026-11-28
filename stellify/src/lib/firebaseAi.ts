/**
 * Stellify's free AI tutor on the website: Firebase AI Logic with the Gemini Developer API (no-cost tier).
 * Students need no key: Firebase holds it. Loaded only when a student has agreed to AI replies and asks
 * something; nothing is downloaded or sent before that. The single offline file swaps this module for
 * firebaseAi.stub.ts at build time, so it never contains this code.
 */
import { FIREBASE_CONFIG } from './firebaseConfig';

/** Google's alias for its current free-tier Flash model, so a retired model never breaks the tutor. */
export const SITE_MODEL = 'gemini-flash-latest';
export const siteAiAvailable = () => true;

export type Turn = { role: 'user' | 'model'; parts: { text: string }[] };
export class SiteAiError extends Error { constructor(public kind: 'quota' | 'off' | 'other', msg: string) { super(msg); } }

export async function siteGenerate(system: string, contents: Turn[]): Promise<string> {
  const [{ initializeApp, getApps }, ai] = await Promise.all([import('firebase/app'), import('firebase/ai')]);
  const app = getApps()[0] ?? initializeApp(FIREBASE_CONFIG);
  const model = ai.getGenerativeModel(ai.getAI(app, { backend: new ai.GoogleAIBackend() }), {
    model: SITE_MODEL, systemInstruction: system, generationConfig: { temperature: 0.3, maxOutputTokens: 800 },
  });
  try {
    const r = await model.generateContent({ contents });
    return r.response.text().trim();
  } catch (e) {
    const m = String((e as Error)?.message ?? e);
    if (/429|quota|RESOURCE_EXHAUSTED/i.test(m)) throw new SiteAiError('quota', m);
    if (/403|PERMISSION_DENIED|not been used|disabled|API_NOT_ENABLED/i.test(m)) throw new SiteAiError('off', m);
    throw new SiteAiError('other', m);
  }
}
