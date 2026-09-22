import { useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Button, Field, Notice } from '@/components/ui/primitives';
import { Icon } from '@/components/ui/Icon';
import { useAppStore } from '@/store/useAppStore';
import { repository } from '@/store/repository';
import { passwordStrength } from '@/lib/crypto';

type Mode = 'login' | 'signup' | 'forgot' | 'reset';

const COPY: Record<Mode, { title: string; sub: string; cta: string }> = {
  login: { title: 'Welcome back', sub: 'Pick up where you left off.', cta: 'Log in' },
  signup: { title: 'Create your account', sub: 'Two minutes now, and every recommendation afterwards is built around you.', cta: 'Create account' },
  forgot: { title: 'Reset your password', sub: 'Enter your email and we will issue a reset code.', cta: 'Send reset code' },
  reset: { title: 'Set a new password', sub: 'Enter the code you were given along with a new password.', cta: 'Update password' },
};

export function AuthPage({ mode }: { mode: Mode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { signUp, logIn, status, loadDemoAccount } = useAppStore();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string>();
  const [info, setInfo] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [demoBusy, setDemoBusy] = useState(false);

  if (status === 'ready' && mode !== 'reset') {
    const from = (location.state as { from?: string } | null)?.from;
    return <Navigate to={from ?? '/app'} replace />;
  }

  const strength = mode === 'signup' || mode === 'reset' ? passwordStrength(password) : undefined;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(undefined);
    setInfo(undefined);
    setBusy(true);
    try {
      if (mode === 'signup') {
        const res = await signUp({ name, email, password });
        if (!res.ok) setError(res.error);
        else navigate('/onboarding');
      } else if (mode === 'login') {
        const res = await logIn({ email, password });
        if (!res.ok) setError(res.error);
        else navigate((location.state as { from?: string } | null)?.from ?? '/app');
      } else if (mode === 'forgot') {
        const res = await repository.requestPasswordReset(email);
        if (res.resetToken) {
          setInfo(
            `A real deployment would email this. For this build your reset code is: ${res.resetToken}`,
          );
        } else {
          setInfo('If an account exists for that address, a reset code has been issued.');
        }
      } else {
        const res = await repository.resetPassword({ email, token, password });
        if (!res.ok) setError(res.error);
        else {
          setInfo('Password updated. Logging you in…');
          const login = await logIn({ email, password });
          if (login.ok) navigate('/app');
        }
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const copy = COPY[mode];

  return (
    <div className="auth-wrap">
      <aside className="auth-side">
        <Link to="/" className="row g-3" style={{ textDecoration: 'none', color: 'inherit', position: 'relative', zIndex: 1 }}>
          <span className="logo" style={{ background: 'rgba(255,255,255,.16)' }} aria-hidden="true">P</span>
          <span className="wordmark" style={{ color: '#fff' }}>
            Pathway AI
          </span>
        </Link>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <h2 className="display">Tell us where you want to go. We will help you build the path.</h2>
          <p className="mt-5">
            One profile drives college matching, AP planning, activity recommendations, SAT practice and your whole schedule —
            and every recommendation explains its reasoning.
          </p>
          <ul className="col g-3 mt-7">
            {[
              'Fit is never confused with your chance of admission',
              'Nothing about your achievements is ever invented',
              'You can see and edit everything the AI remembers',
              'Your data stays on your device and can be exported or deleted',
            ].map((t) => (
              <li key={t} className="row-top g-3" style={{ color: 'rgba(255,255,255,.88)', fontSize: 'var(--fs-sm)' }}>
                <Icon name="check" size={16} />
                {t}
              </li>
            ))}
          </ul>
        </div>
        <p className="t-2xs" style={{ color: 'rgba(255,255,255,.6)', position: 'relative', zIndex: 1 }}>
          Catalog data in this build is demo data and is labelled throughout.
        </p>
      </aside>

      <main className="auth-panel">
        <form className="auth-form" onSubmit={onSubmit} noValidate>
          <Link to="/" className="row g-2 t-sm subtle mb-6" style={{ textDecoration: 'none' }}>
            <Icon name="chevron-left" size={15} />
            Back to home
          </Link>
          <h1 className="t-2xl display">{copy.title}</h1>
          <p className="t-sm subtle mt-2">{copy.sub}</p>

          <div className="col g-4 mt-6">
            {mode === 'signup' ? (
              <Field label="Your name" required>
                {(props) => (
                  <input
                    {...props}
                    className="input"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoComplete="name"
                    placeholder="Alex Rivera"
                    required
                  />
                )}
              </Field>
            ) : null}

            <Field label="Email" required>
              {(props) => (
                <input
                  {...props}
                  className="input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  placeholder="you@school.edu"
                  required
                />
              )}
            </Field>

            {mode === 'reset' ? (
              <Field label="Reset code" required hint="From the message shown when you requested the reset.">
                {(props) => (
                  <input {...props} className="input mono" value={token} onChange={(e) => setToken(e.target.value)} required />
                )}
              </Field>
            ) : null}

            {mode !== 'forgot' ? (
              <Field
                label={mode === 'reset' ? 'New password' : 'Password'}
                required
                hint={mode === 'signup' ? 'At least 8 characters. Longer matters more than complicated.' : undefined}
              >
                {(props) => (
                  <div className="input-icon">
                    <input
                      {...props}
                      className="input"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                      style={{ paddingLeft: '0.75rem', paddingRight: '2.5rem' }}
                      required
                      minLength={8}
                    />
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm btn-clear"
                      onClick={() => setShowPassword((s) => !s)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      <Icon name={showPassword ? 'eye-off' : 'eye'} size={15} />
                    </button>
                  </div>
                )}
              </Field>
            ) : null}

            {strength && password ? (
              <div className="col g-2">
                <div className="meter" aria-hidden="true">
                  {[0, 1, 2, 3].map((i) => (
                    <span
                      key={i}
                      className={`meter-seg${i < strength.score ? ' is-on' : ''}`}
                      style={{
                        background:
                          i < strength.score
                            ? strength.score <= 1
                              ? 'var(--danger)'
                              : strength.score <= 2
                                ? 'var(--warn)'
                                : 'var(--ok)'
                            : undefined,
                      }}
                    />
                  ))}
                </div>
                <p className="t-xs subtle">
                  {strength.label}
                  {strength.issues.length ? ` — ${strength.issues[0]}` : ''}
                </p>
              </div>
            ) : null}

            {error ? <Notice tone="danger">{error}</Notice> : null}
            {info ? <Notice tone="info">{info}</Notice> : null}

            <Button type="submit" variant="primary" size="lg" block loading={busy}>
              {copy.cta}
            </Button>
          </div>

          <div className="col g-2 mt-5 t-sm subtle">
            {mode === 'login' ? (
              <>
                <p>
                  New here? <Link to="/signup">Create an account</Link>
                </p>
                <p>
                  <Link to="/forgot-password">Forgot your password?</Link>
                </p>
              </>
            ) : mode === 'signup' ? (
              <p>
                Already have an account? <Link to="/login">Log in</Link>
              </p>
            ) : mode === 'forgot' ? (
              <p>
                Have a code already? <Link to="/reset-password">Enter it here</Link> · <Link to="/login">Back to log in</Link>
              </p>
            ) : (
              <p>
                <Link to="/login">Back to log in</Link>
              </p>
            )}
          </div>

          <div className="divider mt-6 mb-5" />
          <Button
            block
            icon="play"
            loading={demoBusy}
            onClick={async () => {
              setDemoBusy(true);
              await loadDemoAccount();
              navigate('/app');
            }}
          >
            Open the example account instead
          </Button>
          <p className="t-2xs faint mt-3">
            A fully populated fictional student so you can see the whole product before entering anything of your own.
          </p>

          <Notice tone="info" className="mt-6">
            <strong>About security in this build:</strong> accounts are stored in your browser and passwords are hashed with
            PBKDF2 before storage. That keeps plaintext out of storage, but it is a client-side reference implementation — move
            verification to a server before real accounts.
          </Notice>
        </form>
      </main>
    </div>
  );
}
