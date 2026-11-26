import { CloudCheck, CloudOff, LogOut, RefreshCw, Trash2, UserRound } from 'lucide-react';
import { useEffect, useState } from 'react';
import { accountMode, cloudAvailable, deleteCloudCopy, preloadCloud, push, resolveConflict, setAccountMode, signInWithGoogle, signOutCloud, useCloud } from '@/lib/cloud';
import { Modal, cn } from './ui';

const ago = (t: number) => { const s = Math.round((Date.now() - t) / 1000); return s < 60 ? 'just now' : s < 3600 ? `${Math.round(s / 60)} min ago` : new Date(t).toLocaleString(); };

/** Google's sign-in button style: white with the "G" mark, as Google's branding rules ask. */
export function GoogleButton({ onClick, busy, label = 'Continue with Google' }: { onClick: () => void; busy?: boolean; label?: string }) {
  return (
    <button type="button" onClick={onClick} disabled={busy} data-testid="google-sign-in"
      className="inline-flex items-center justify-center gap-3 rounded-xl border border-line bg-white px-4 py-2.5 font-semibold text-[#1f1f1f] shadow-sm transition-colors hover:bg-[#f7f7f7] disabled:opacity-60">
      <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.6 5.4 2.6 13.3l7.9 6.1C12.4 13.7 17.7 9.5 24 9.5z" /><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.7 6c4.5-4.2 6.9-10.3 6.9-17.7z" /><path fill="#FBBC05" d="M10.5 28.6c-.5-1.4-.8-3-.8-4.6s.3-3.2.8-4.6l-7.9-6.1C.9 16.6 0 20.2 0 24s.9 7.4 2.6 10.7l7.9-6.1z" /><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.7-6c-2.1 1.4-4.9 2.3-8.2 2.3-6.3 0-11.6-4.2-13.5-9.9l-7.9 6.1C6.6 42.6 14.6 48 24 48z" /></svg>
      {busy ? 'Opening Google…' : label}
    </button>
  );
}

/**
 * The first choice a new student makes on the website: sign in with Google (progress saved to their account) or carry
 * on as a guest (everything stays on this device). Not shown in the offline file, which has no sign-in.
 */
export function AccountChoice({ onDone }: { onDone: (mode: 'guest' | 'google') => void }) {
  const [busy, setBusy] = useState(false);
  const error = useCloud((s) => s.error);
  useEffect(preloadCloud, []);
  const google = async () => { setBusy(true); const ok = await signInWithGoogle(); setBusy(false); if (ok) onDone('google'); };
  return (
    <div className="space-y-4" data-testid="account-choice">
      <h1 className="text-2xl font-bold">Save your progress?</h1>
      <p className="text-[15px] text-muted">Sign in with Google to keep your progress in your account and pick it up on any device. Or continue as a guest: everything stays in this browser, and you can sign in later in Settings.</p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <GoogleButton onClick={google} busy={busy} />
        <button type="button" className="btn-ghost" onClick={() => { setAccountMode('guest'); onDone('guest'); }} data-testid="continue-guest">Continue as guest</button>
      </div>
      {error && <p className="text-sm text-bad" role="alert">{error}</p>}
      <p className="text-xs text-muted">Accounts are for students 13 and older; younger students can use guest mode. Signing in saves only your Stellify progress, your name and your email address (see Privacy). No ads, ever.</p>
    </div>
  );
}

/** Settings: who is signed in, when progress was last saved, and the controls. */
export function AccountCard() {
  const { user, syncing, lastSync, error, status } = useCloud();
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  useEffect(() => { if (!user) preloadCloud(); }, [user]);
  if (!cloudAvailable()) return (
    <section className="card p-5" aria-labelledby="account-h">
      <h2 id="account-h" className="flex items-center gap-2 text-lg font-bold"><UserRound size={18} />Account</h2>
      <p className="mt-2 text-sm text-muted">This is the offline file, so there is no sign-in here. Open Stellify on the website to save your progress to a Google account, or move it with Export and Import below.</p>
    </section>
  );
  return (
    <section className="card space-y-3 p-5" aria-labelledby="account-h" data-testid="account-card">
      <h2 id="account-h" className="flex items-center gap-2 text-lg font-bold"><UserRound size={18} />Account</h2>
      {user ? (
        <>
          <div className="flex items-center gap-3">
            {user.photo ? <img src={user.photo} alt="" className="h-10 w-10 rounded-full" referrerPolicy="no-referrer" /> : <span className="grid h-10 w-10 place-items-center rounded-full bg-raised"><UserRound size={18} /></span>}
            <div className="min-w-0"><p className="truncate font-semibold" data-testid="account-name">{user.name ?? 'Signed in'}</p><p className="truncate text-sm text-muted">{user.email}</p></div>
          </div>
          <p className={cn('flex items-center gap-1.5 text-sm', error ? 'text-bad' : 'text-ok')} data-testid="sync-status">
            {error ? <CloudOff size={16} /> : <CloudCheck size={16} />}
            {error ?? (syncing ? 'Saving to your account…' : lastSync ? `Saved to your account ${ago(lastSync)}` : 'Connected to your account')}
          </p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-ghost" disabled={syncing} onClick={() => void push().catch(() => undefined)} data-testid="sync-now"><RefreshCw size={15} />Save now</button>
            <button type="button" className="btn-ghost" onClick={() => void signOutCloud()} data-testid="sign-out"><LogOut size={15} />Sign out</button>
            <button type="button" className="btn-quiet text-bad" onClick={() => setConfirmDelete(true)}><Trash2 size={15} />Delete my account copy</button>
          </div>
          <p className="text-xs text-muted">Progress saves to your account a few seconds after you study, and when you close the tab. Signing out keeps a copy on this device; Delete all data below removes it.</p>
          <Modal open={confirmDelete} onClose={() => setConfirmDelete(false)} title="Delete your account copy?">
            <p className="text-sm">This deletes the progress saved in your Google-linked Stellify account. This device keeps its own copy, and the next save creates a new account copy unless you sign out first.</p>
            <div className="mt-4 flex gap-2"><button type="button" className="btn-primary bg-bad" onClick={async () => { await deleteCloudCopy(); await signOutCloud(); setConfirmDelete(false); }}>Delete and sign out</button><button type="button" className="btn-ghost" onClick={() => setConfirmDelete(false)}>Cancel</button></div>
          </Modal>
        </>
      ) : (
        <>
          <p className="text-sm text-muted">{status === 'loading' ? 'Checking your account…' : accountMode() === 'google' ? 'You are signed out. Sign in to keep saving to your account.' : 'You are using Stellify as a guest: progress is saved in this browser only. Sign in with Google to keep it in your account and use it on any device; what you have done so far comes with you.'}</p>
          <GoogleButton onClick={async () => { setBusy(true); await signInWithGoogle(); setBusy(false); }} busy={busy} label="Sign in with Google" />
          {error && <p className="text-sm text-bad" role="alert">{error}</p>}
          <p className="text-xs text-muted">For students 13 and older.</p>
        </>
      )}
    </section>
  );
}

/** Shown anywhere when this device and the account both have new progress: the student picks which to keep. */
export function ConflictDialog() {
  const conflict = useCloud((s) => s.conflict);
  const [busy, setBusy] = useState(false);
  if (!conflict) return null;
  const pick = async (k: 'cloud' | 'device') => { setBusy(true); await resolveConflict(k); setBusy(false); };
  return (
    <Modal open onClose={() => undefined} title="Which progress should we keep?">
      <div className="space-y-3 text-sm" data-testid="sync-conflict">
        <p>This device and your account both have progress that the other does not.</p>
        <ul className="space-y-1">
          <li><b>Your account:</b> {conflict.cloudAttempts} answers, last saved {new Date(conflict.cloudAt).toLocaleString()}.</li>
          <li><b>This device:</b> {conflict.localAttempts} answers.</li>
        </ul>
        <p className="text-muted">The one you do not keep is saved as a backup on this device (Settings → Backups), so nothing is lost.</p>
        <div className="flex flex-wrap gap-2 pt-1">
          <button type="button" className="btn-primary" disabled={busy} onClick={() => void pick('cloud')} data-testid="keep-cloud">Use my account’s progress</button>
          <button type="button" className="btn-ghost" disabled={busy} onClick={() => void pick('device')} data-testid="keep-device">Use this device’s progress</button>
        </div>
      </div>
    </Modal>
  );
}
