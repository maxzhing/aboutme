import { LifeBuoy, Mail, Send } from 'lucide-react';
import { useState } from 'react';
import { REPORT_KINDS, SUPPORT_EMAIL, sendReport } from '@/lib/feedback';
import { Modal } from './ui';

/** The report form: what it's about, what happened, and (optionally) where to reply. Emailed to the Stellify team. */
export function ReportForm({ qid, initialKind, onSent }: { qid?: string; initialKind?: string; onSent?: () => void }) {
  const [kind, setKind] = useState<string>(initialKind ?? REPORT_KINDS[0]);
  const [message, setMessage] = useState('');
  const [replyTo, setReplyTo] = useState('');
  const [trap, setTrap] = useState(''); // left empty by people; filled in by spam robots
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'mail'>('idle');
  if (state === 'sent') return <p className="text-sm" role="status" data-testid="report-sent">Thank you! Your report was sent to the Stellify team. {replyTo ? 'We’ll reply to the email you gave.' : ''}</p>;
  if (state === 'mail') return <p className="text-sm" role="status" data-testid="report-mail">Your email app should now be open with the report written in: press <b>Send</b> there. If nothing opened, email <a className="text-accent underline" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.</p>;
  return (
    <form className="space-y-3" data-testid="report-form" onSubmit={async (e) => {
      e.preventDefault();
      if (trap || !message.trim()) return;
      setState('sending');
      setState(await sendReport({ kind, message, replyTo, qid, page: typeof location !== 'undefined' ? location.hash.replace(/^#/, '') || '/' : '' }));
      onSent?.();
    }}>
      <div><label className="label" htmlFor="fb-kind">What is it about?</label>
        <select id="fb-kind" className="input" value={kind} onChange={(e) => setKind(e.target.value)}>{REPORT_KINDS.map((k) => <option key={k}>{k}</option>)}</select></div>
      <div><label className="label" htmlFor="fb-msg">What happened?</label>
        <textarea id="fb-msg" className="input min-h-28" required maxLength={4000} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Tell us what you did, what you expected, and what happened instead." /></div>
      <div><label className="label" htmlFor="fb-reply">Your email, if you’d like a reply (optional)</label>
        <input id="fb-reply" className="input" type="email" maxLength={200} value={replyTo} onChange={(e) => setReplyTo(e.target.value)} autoComplete="email" /></div>
      <div aria-hidden="true" style={{ position: 'absolute', left: '-9999px' }}><label>Leave this empty<input tabIndex={-1} autoComplete="off" value={trap} onChange={(e) => setTrap(e.target.value)} /></label></div>
      <button className="btn-primary" disabled={state === 'sending' || !message.trim()} data-testid="report-send"><Send size={15} />{state === 'sending' ? 'Sending…' : 'Send report'}</button>
      <p className="text-xs text-muted">Your report goes to the Stellify team’s email ({SUPPORT_EMAIL}) with the page you were on and your browser type. Nothing else is sent.</p>
    </form>
  );
}

/** "Have a problem?": the team's email and a report form. On the Help page, in Settings, and wherever it's useful. */
export function HelpCard() {
  const [open, setOpen] = useState(false);
  return (
    <section className="card space-y-3 p-5" aria-labelledby="help-h" data-testid="help-card">
      <h2 id="help-h" className="flex items-center gap-2 text-lg font-bold"><LifeBuoy size={18} />Have a problem?</h2>
      <p className="text-sm text-muted">If something isn’t working, a question looks wrong, or you have an idea, tell us. Email <a className="text-accent underline" href={`mailto:${SUPPORT_EMAIL}`} data-testid="support-email">{SUPPORT_EMAIL}</a> or send a report here, and the Stellify team will review it.</p>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn-primary" onClick={() => setOpen(true)} data-testid="report-problem"><Send size={15} />Report a problem</button>
        <a className="btn-ghost" href={`mailto:${SUPPORT_EMAIL}`}><Mail size={15} />Email us</a>
      </div>
      <Modal open={open} onClose={() => setOpen(false)} title="Report a problem"><ReportForm /></Modal>
    </section>
  );
}

/** The Help page: the same card, on its own (linked from the footer and the landing page). */
export function HelpPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <h1 className="font-display text-3xl font-bold">Help and reporting a problem</h1>
      <HelpCard />
      <section className="card space-y-3 p-5" aria-labelledby="report-h">
        <h2 id="report-h" className="text-lg font-bold">Send a report now</h2>
        <ReportForm />
      </section>
    </div>
  );
}
