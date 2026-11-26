/**
 * Problem reports, emailed to the Stellify team.
 *
 * Reports go to a small Google Apps Script web app that runs on the team's own Gmail account
 * (scripts/feedback/Code.gs; set up as in scripts/feedback/README.md) and emails each report to SUPPORT_EMAIL.
 * No other company is involved. Until REPORT_URL is set, or if sending fails, the student's own email app opens with
 * the report already written in, so a report always has a way through.
 */
export const SUPPORT_EMAIL = 'stellifyprep@gmail.com';
/** The Apps Script web app's address (https://script.google.com/macros/s/…/exec). Empty: reports open the email app. */
export const REPORT_URL = '';

export const REPORT_KINDS = ['Something isn’t working', 'A question or answer is wrong', 'Signing in or saving', 'An idea or suggestion', 'Something else'] as const;

export interface Report { kind: string; message: string; replyTo?: string; page?: string; qid?: string }

const url = () => (globalThis as { __STELLIFY_REPORT_URL__?: string }).__STELLIFY_REPORT_URL__ ?? REPORT_URL;
const clip = (s: string | undefined, n: number) => (s ?? '').trim().slice(0, n);

/** What the team receives: the report plus where it came from (no account details, nothing else). */
export function reportBody(r: Report) {
  return {
    kind: clip(r.kind, 60), message: clip(r.message, 4000), replyTo: clip(r.replyTo, 200),
    page: clip(r.page, 200), qid: clip(r.qid, 80),
    app: 'Stellify', at: new Date().toISOString(), browser: typeof navigator !== 'undefined' ? clip(navigator.userAgent, 300) : '',
  };
}

/** A mailto: link with the report written in, for the student's own email app. */
export function mailtoFor(r: Report) {
  const b = reportBody(r);
  const text = [b.message, '', '—', `About: ${b.kind}`, b.qid && `Question: ${b.qid}`, b.page && `Page: ${b.page}`].filter(Boolean).join('\n');
  return `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(`Stellify report: ${b.kind}`)}&body=${encodeURIComponent(text)}`;
}

/**
 * Sends a report. 'sent': it went to the team's inbox. 'mail': the student's email app was opened instead
 * (not set up yet, offline, or the send failed), so they can press Send there.
 */
export async function sendReport(r: Report): Promise<'sent' | 'mail'> {
  const to = url();
  if (to && typeof fetch !== 'undefined' && (typeof navigator === 'undefined' || navigator.onLine !== false)) {
    try {
      // text/plain and no-cors: a "simple" request Apps Script accepts without a pre-check; its reply can't be read
      await fetch(to, { method: 'POST', mode: 'no-cors', headers: { 'content-type': 'text/plain;charset=utf-8' }, body: JSON.stringify(reportBody(r)) });
      return 'sent';
    } catch { /* fall through to the email app */ }
  }
  if (typeof location !== 'undefined') location.href = mailtoFor(r);
  return 'mail';
}
