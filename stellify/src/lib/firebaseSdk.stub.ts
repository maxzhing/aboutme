/** The offline single file has no Google sign-in (it needs a real web address), so no Firebase code is bundled. */
export async function loadSdk(): Promise<never> {
  throw new Error('Google sign-in is available on the website, not in the offline file.');
}
export type Sdk = never;
