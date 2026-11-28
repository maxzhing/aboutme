import { Heart } from 'lucide-react';
import { useState } from 'react';
import { DONATE, donateLink, parseAmount } from '@/lib/donate';
import { SUPPORT_EMAIL } from '@/lib/feedback';
import { cn } from './ui';

/** Pick an amount (or type another) and donate. Optional: Stellify stays free whether or not anyone gives. */
export function DonateForm() {
  const [pick, setPick] = useState<number | 'other'>(DONATE.amounts[1] ?? DONATE.amounts[0]);
  const [other, setOther] = useState('');
  const [state, setState] = useState<'idle' | 'opened' | 'soon'>('idle');
  const amount = pick === 'other' ? parseAmount(other) : pick;
  const symbol = DONATE.currency === 'USD' ? '$' : '';
  const go = () => {
    if (amount == null) return;
    const link = donateLink(amount);
    if (!link) { setState('soon'); return; }
    window.open(link, '_blank', 'noopener');
    setState('opened');
  };
  return (
    <div className="space-y-3" data-testid="donate-form">
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Donation amount">
        {DONATE.amounts.map((a) => (
          <button key={a} type="button" role="radio" aria-checked={pick === a} onClick={() => { setPick(a); setState('idle'); }}
            className={cn('chip min-w-16 justify-center !py-2 text-base font-semibold', pick === a && 'border-brand bg-brand/15 text-ink')} data-testid={`donate-${a}`}>{symbol}{a}</button>
        ))}
        <button type="button" role="radio" aria-checked={pick === 'other'} onClick={() => { setPick('other'); setState('idle'); }}
          className={cn('chip !py-2 text-base font-semibold', pick === 'other' && 'border-brand bg-brand/15 text-ink')} data-testid="donate-other">Other</button>
      </div>
      {pick === 'other' && (
        <div>
          <label className="label" htmlFor="donate-amount">Amount ({DONATE.currency}, {symbol}{DONATE.min} to {symbol}{DONATE.max})</label>
          <input id="donate-amount" className="input max-w-40" inputMode="decimal" value={other} onChange={(e) => { setOther(e.target.value); setState('idle'); }} placeholder={`${symbol}15`} data-testid="donate-amount" />
          {other && amount == null && <p className="mt-1 text-sm text-bad" role="alert">Enter an amount from {symbol}{DONATE.min} to {symbol}{DONATE.max}.</p>}
        </div>
      )}
      <button type="button" className="btn-primary" disabled={amount == null} onClick={go} data-testid="donate-go"><Heart size={15} />{amount == null ? 'Donate' : `Donate ${symbol}${amount}`}</button>
      {state === 'soon' && <p className="text-sm" role="status" data-testid="donate-soon">Thank you! Online donations open soon: we’re still setting up payments. Check back, or email <a className="text-accent underline" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> if you’d like to help now.</p>}
      {state === 'opened' && <p className="text-sm" role="status" data-testid="donate-opened">Thank you! The payment page opened in a new tab.</p>}
    </div>
  );
}

/** "Keep Stellify free": why donations help, and the form. In Settings and on the Support page. */
export function DonateCard() {
  return (
    <section className="card space-y-3 p-5" aria-labelledby="donate-h" data-testid="donate-card">
      <h2 id="donate-h" className="flex items-center gap-2 text-lg font-bold"><Heart size={18} className="text-bad" />Keep Stellify free</h2>
      <p className="text-sm text-muted">Stellify is free for everyone, with no ads and no paywall, and it always will be. If it helped you, you can chip in: donations pay for the website, the AI tutor and new questions. It’s completely optional, and everything stays free whether or not you give.</p>
      <DonateForm />
    </section>
  );
}

export function DonatePage() {
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <h1 className="font-display text-3xl font-bold">Support Stellify</h1>
      <DonateCard />
    </div>
  );
}
