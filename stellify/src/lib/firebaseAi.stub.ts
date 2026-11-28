/** The offline single file has no website AI (it needs Firebase on the real site), so no Firebase code is bundled. */
export const SITE_MODEL = '';
export const siteAiAvailable = () => false;
export type Turn = { role: 'user' | 'model'; parts: { text: string }[] };
export class SiteAiError extends Error { constructor(public kind: 'quota' | 'off' | 'other', msg: string) { super(msg); } }
export async function siteGenerate(): Promise<string> { throw new SiteAiError('off', 'The website AI is not part of the offline file.'); }
