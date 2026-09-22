import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Icon, type IconName } from '@/components/ui/Icon';
import { Button } from '@/components/ui/primitives';
import { useAppStore } from '@/store/useAppStore';

/* ==========================================================================
   Landing page — section 2
   ========================================================================== */

const JOURNEY = [
  { title: 'Student profile', body: 'Who you are, what you enjoy, what you are good at, and what your week actually looks like.', icon: 'user' as IconName },
  { title: 'Major', body: 'Not one forced choice — strong matches, possible matches, and directions worth exploring, each with reasons.', icon: 'book' as IconName },
  { title: 'Academic plan', body: 'AP courses chosen for preparation, not prestige, and checked against whether you are ready.', icon: 'flask' as IconName },
  { title: 'Activities', body: 'Depth in what you already do before anything new, with the time cost stated honestly.', icon: 'users' as IconName },
  { title: 'Testing', body: 'Adaptive practice that targets the specific mistakes your answers reveal.', icon: 'target' as IconName },
  { title: 'College list', body: 'Academic, personal, opportunity and financial fit kept separate — never collapsed into one score.', icon: 'graduation' as IconName },
  { title: 'Application strategy', body: 'Deadlines that explain what is blocking them, and essays that stay in your voice.', icon: 'note' as IconName },
];

const FEATURES: { icon: IconName; title: string; body: string }[] = [
  {
    icon: 'compass',
    title: 'AI college matching',
    body: 'Four independent fit dimensions, each with its own reasons, gaps and unknowns. We never reduce a college to a single number, and we never confuse fit with your chance of admission.',
  },
  {
    icon: 'flask',
    title: 'AP course & exam planning',
    body: 'A plan built from your intended direction, your existing coursework and the workload you said you could carry — and it will tell you when you are not ready for something yet.',
  },
  {
    icon: 'layers',
    title: 'AP unit explorer',
    body: 'Every AP course broken into its units, with concepts, vocabulary, skills and practice — so studying has somewhere specific to start.',
  },
  {
    icon: 'target',
    title: 'SAT Lab',
    body: 'An adaptive question bank that finds your error patterns — not just your wrong answers — and drills the specific thing going wrong.',
  },
  {
    icon: 'users',
    title: 'Extracurricular discovery',
    body: 'Opportunities filtered by your time, budget, grade and location. If something does not fit your week, we say so rather than recommending it anyway.',
  },
  {
    icon: 'microscope',
    title: 'Research & projects',
    body: 'Including the routes most students never hear about: cold-emailing local labs, community college faculty, and independent work that costs nothing.',
  },
  {
    icon: 'building',
    title: 'College research',
    body: 'Rich profiles with academics, admissions, student life, cost, opportunities and deadlines — plus a tab that explains what any of it means for you specifically.',
  },
  {
    icon: 'calendar',
    title: 'Application timeline',
    body: 'Deadlines that tell you what is actually blocking them, not just how many days are left.',
  },
  {
    icon: 'sparkles',
    title: 'AI counselor',
    body: 'Answers grounded in your actual profile. Ask it what you are missing and it will tell you — including when the answer is "nothing".',
  },
  {
    icon: 'chart',
    title: 'Progress dashboard',
    body: 'Where you are, what to do next, what is coming up. Updated from real activity, never padded to look busy.',
  },
];

const PRINCIPLES = [
  {
    title: 'Fit is not admission probability',
    body: 'No tool can predict an admission decision, and any product implying otherwise is selling certainty it does not have. We describe fit and preparation, and we say so every time a selectivity figure appears.',
  },
  {
    title: 'Depth over quantity',
    body: 'We will not tell you to join another club. Recommendations favour going further in what you already do, because that is what actually reads as commitment.',
  },
  {
    title: 'We never invent your achievements',
    body: 'The essay tools work only from what you have written. The authenticity check flags claims that do not match your own profile. Nothing is embellished, ever.',
  },
  {
    title: 'You can see exactly what we know',
    body: 'Every recommendation shows why it appeared, what evidence it used, and what it could not determine. Verified data, AI guidance, demo data and your own entries never look alike.',
  },
];

function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll('.lp-reveal');
    if (!('IntersectionObserver' in window)) {
      els.forEach((el) => el.classList.add('is-in'));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-in');
            io.unobserve(entry.target);
          }
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}

interface CatalogCounts {
  colleges: number;
  majors: number;
  apCourses: number;
  apUnits: number;
  questions: number;
  opportunities: number;
}

/**
 * Real counts, read from the catalog rather than hardcoded — but fetched after
 * first paint, so a visitor reading the landing page never downloads it.
 */
function useCatalogCounts(): CatalogCounts | undefined {
  const [counts, setCounts] = useState<CatalogCounts | undefined>(undefined);
  useEffect(() => {
    let alive = true;
    void Promise.all([
      import('@/data/colleges'),
      import('@/data/majors'),
      import('@/data/ap'),
      import('@/data/questions'),
      import('@/data/opportunities'),
    ]).then(([colleges, majors, ap, questions, opportunities]) => {
      if (!alive) return;
      setCounts({
        colleges: colleges.COLLEGES.length,
        majors: majors.MAJORS.filter((m) => m.id !== 'undecided').length,
        apCourses: ap.AP_COURSES.length,
        apUnits: ap.AP_UNIT_COUNT,
        questions: questions.ALL_QUESTIONS.length,
        opportunities: opportunities.OPPORTUNITIES.length,
      });
    });
    return () => {
      alive = false;
    };
  }, []);
  return counts;
}

export function Landing() {
  const [step, setStep] = useState(0);
  const headerRef = useRef<HTMLElement>(null);
  const navigate = useNavigate();
  const loadDemoAccount = useAppStore((s) => s.loadDemoAccount);
  const [loadingDemo, setLoadingDemo] = useState(false);
  const counts = useCatalogCounts();
  useReveal();

  // Advance the journey visual, pausing for anyone who prefers reduced motion.
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      setStep(JOURNEY.length - 1);
      return;
    }
    const t = setInterval(() => setStep((s) => (s + 1) % JOURNEY.length), 2600);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const onScroll = () => headerRef.current?.classList.toggle('is-stuck', window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const openDemo = async () => {
    setLoadingDemo(true);
    await loadDemoAccount();
    navigate('/app');
  };

  return (
    <div className="lp">
      <header className="lp-header" ref={headerRef}>
        <div className="lp-shell lp-header-inner">
          <Link to="/" className="row g-3" style={{ textDecoration: 'none', color: 'inherit' }}>
            <span className="logo" aria-hidden="true">P</span>
            <span className="wordmark">
              Pathway <span className="wordmark-ai">AI</span>
            </span>
          </Link>
          <nav className="lp-nav" aria-label="Sections">
            <a href="#how">How it works</a>
            <a href="#features">Features</a>
            <a href="#principles">Our principles</a>
            <a href="#data">Data honesty</a>
          </nav>
          <div className="row g-2">
            <Button variant="ghost" size="sm" to="/login">Log in</Button>
            <Button variant="primary" size="sm" to="/signup">Get started</Button>
          </div>
        </div>
      </header>

      {/* ------------------------------------------------------------ Hero */}
      <section className="lp-hero">
        <div className="lp-shell lp-hero-grid">
          <div>
            <span className="lp-eyebrow">
              <span className="badge badge-accent">New</span>
              Built around one idea: tell us where you want to go
            </span>
            <h1 className="lp-h1 display">
              Build Your Path to Your <em>Dream College.</em>
            </h1>
            <p className="lp-sub">
              AI-powered college planning, academics, activities, AP preparation and SAT practice — personalized around you.
              One profile drives every recommendation, and every recommendation explains itself.
            </p>
            <div className="lp-cta">
              <Button variant="primary" size="lg" to="/signup" iconRight="arrow-right">
                Build My College Path
              </Button>
              <Button size="lg" to="/app/colleges" icon="graduation" onClick={(e) => { e.preventDefault(); void openDemo(); }}>
                Explore Colleges
              </Button>
            </div>
            <button type="button" className="btn btn-ghost btn-sm mt-4" onClick={openDemo} disabled={loadingDemo}>
              {loadingDemo ? <span className="spinner" /> : <Icon name="play" size={14} />}
              Or open a fully populated example account
            </button>

            <div className="lp-trust">
              <span className="lp-trust-item"><Icon name="shield" size={15} /> Your data stays on your device</span>
              <span className="lp-trust-item"><Icon name="info" size={15} /> Every claim shows its source</span>
              <span className="lp-trust-item"><Icon name="lock" size={15} /> Nothing is shared without you</span>
            </div>
          </div>

          <div className="lp-journey" aria-label="How a student's path is built">
            <div className="lp-journey-head">
              <span className="lp-journey-dots" aria-hidden="true">
                <span /><span /><span />
              </span>
              <span className="t-2xs faint mono ml-auto">your path</span>
            </div>
            <ol className="lp-journey-steps">
              {JOURNEY.map((s, i) => (
                <li
                  key={s.title}
                  className={`lp-step${i === step ? ' is-active' : i < step ? ' is-passed' : ''}`}
                  aria-current={i === step ? 'step' : undefined}
                >
                  <span className="lp-step-marker">
                    <Icon name={i < step ? 'check' : s.icon} size={16} />
                  </span>
                  <span>
                    <span className="lp-step-title">{s.title}</span>
                    {i === step ? <span className="lp-step-body">{s.body}</span> : null}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------- How it works */}
      <section className="lp-section lp-section-alt" id="how">
        <div className="lp-shell">
          <div className="lp-section-head lp-reveal">
            <p className="eyebrow">How it works</p>
            <h2 className="lp-h2 display mt-3">One profile. Everything connects to it.</h2>
            <p className="lp-lead">
              Most college tools are a collection of disconnected pages. Here, saying you are interested in computer science
              changes your major matches, your AP plan, your activity recommendations, your project ideas, your college list,
              your study schedule and what the AI counselor says next.
            </p>
          </div>

          <div className="lp-preview">
            <div className="lp-preview-card lp-reveal">
              <p className="eyebrow">A student says</p>
              <p className="t-lg display mt-3">“I like computer science and I play piano seriously.”</p>
              <div className="col g-3 mt-5">
                {[
                  ['Majors', 'Computer Science, Music Technology, and the overlap between them'],
                  ['AP plan', 'Calculus BC and CS A as core; Music Theory as genuinely useful, not filler'],
                  ['Colleges', 'Places with a real conservatory next to a real CS department'],
                  ['Projects', 'A music visualiser that responds to harmony, not just volume'],
                  ['Essays', 'The connection between the two, which is the actual story'],
                ].map(([k, v]) => (
                  <div key={k} className="row-top g-3">
                    <span className="badge badge-accent shrink-0" style={{ minWidth: 72, justifyContent: 'center' }}>{k}</span>
                    <span className="t-sm muted">{v}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="lp-reveal">
              <div className="lp-principles">
                {[
                  ['Your interests', 'Everything you enjoy, including the things that seem unrelated'],
                  ['Your constraints', 'Time, money, distance and what your week actually holds'],
                  ['Your record', 'Courses, scores, activities and what you have already done'],
                  ['Your goals', 'In your own words, not a dropdown'],
                ].map(([t, b]) => (
                  <div className="lp-principle" key={t}>
                    <h3>{t}</h3>
                    <p>{b}</p>
                  </div>
                ))}
              </div>
              <p className="t-sm subtle mt-6">
                Every recommendation in the product answers four questions: <strong>why this</strong>, <strong>why now</strong>,{' '}
                <strong>what it requires</strong>, and <strong>what the alternatives are</strong> — plus what we could not determine.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ Features */}
      <section className="lp-section" id="features">
        <div className="lp-shell">
          <div className="lp-section-head lp-reveal">
            <p className="eyebrow">What is inside</p>
            <h2 className="lp-h2 display mt-3">A counselor, a planner and a tutor — in one place</h2>
            <p className="lp-lead">
              {counts ? (
                <>
                  {counts.colleges} colleges, {counts.majors} majors, {counts.apCourses} AP courses with {counts.apUnits} units,{' '}
                  {counts.questions} original practice questions and {counts.opportunities} opportunities — all wired into one engine.
                </>
              ) : (
                'Colleges, majors, AP courses, original practice questions and opportunities — all wired into one engine.'
              )}
            </p>
          </div>
          <div className="lp-features">
            {FEATURES.map((f, i) => (
              <article className="lp-feature lp-reveal" key={f.title} style={{ transitionDelay: `${(i % 3) * 60}ms` }}>
                <span className="lp-feature-icon"><Icon name={f.icon} size={19} /></span>
                <h3>{f.title}</h3>
                <p>{f.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------- Principles */}
      <section className="lp-section lp-section-alt" id="principles">
        <div className="lp-shell">
          <div className="lp-section-head lp-reveal">
            <p className="eyebrow">What we will not do</p>
            <h2 className="lp-h2 display mt-3">The constraints matter more than the features</h2>
            <p className="lp-lead">
              This product optimises for student development first and applications second. That distinction changes almost
              every design decision inside it.
            </p>
          </div>
          <div className="lp-principles">
            {PRINCIPLES.map((p) => (
              <div className="lp-principle lp-reveal" key={p.title}>
                <h3>{p.title}</h3>
                <p>{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------- Data honesty */}
      <section className="lp-section" id="data">
        <div className="lp-shell">
          <div className="lp-section-head lp-reveal">
            <p className="eyebrow">Data honesty</p>
            <h2 className="lp-h2 display mt-3">This build ships with demo data, and says so everywhere</h2>
            <p className="lp-lead">
              College figures, programme details, deadlines and scholarship terms in this build are realistic placeholders
              written for development. They have not been verified against any institution. Every record is labelled and links
              to its official source, and the admin system records a source and a verification date for anything replaced.
            </p>
          </div>
          <div className="grid-fit lp-reveal">
            {[
              { kind: 'prov-verified', label: 'Verified', body: 'From an official source, with the date it was checked.' },
              { kind: 'prov-ai', label: 'AI guidance', body: 'Generated from your profile. Guidance, not fact.' },
              { kind: 'prov-user', label: 'You entered this', body: 'Your own words, never altered or inferred around.' },
              { kind: 'prov-demo', label: 'Demo data', body: 'Placeholder for development. Do not rely on it.' },
            ].map((d) => (
              <div className="card card-pad" key={d.label}>
                <span className={`prov ${d.kind}`}>{d.label}</span>
                <p className="t-sm muted mt-3">{d.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- CTA band */}
      <section className="lp-section">
        <div className="lp-shell">
          <div className="lp-cta-band lp-reveal">
            <h2 className="display">Tell us where you want to go.</h2>
            <p>
              We will help you build the path — and show our reasoning at every step, including where it runs out.
            </p>
            <div className="row center g-3 mt-6 wrap">
              <Button variant="primary" size="lg" to="/signup" iconRight="arrow-right">
                Build My College Path
              </Button>
              <Button variant="ghost" size="lg" onClick={openDemo}>
                See the example account
              </Button>
            </div>
          </div>
        </div>
      </section>

      <footer className="lp-footer">
        <div className="lp-shell lp-footer-grid">
          <div>
            <div className="row g-3">
              <span className="logo" aria-hidden="true">P</span>
              <span className="wordmark">Pathway <span className="wordmark-ai">AI</span></span>
            </div>
            <p className="t-sm subtle mt-4" style={{ maxWidth: '38ch' }}>
              An all-in-one college planning, academics and test preparation platform. Built to help students become more
              prepared, not more anxious.
            </p>
          </div>
          <div>
            <h4>Product</h4>
            <ul>
              <li><a href="#features">Features</a></li>
              <li><a href="#how">How it works</a></li>
              <li><Link to="/signup">Get started</Link></li>
              <li><Link to="/login">Log in</Link></li>
            </ul>
          </div>
          <div>
            <h4>Official sources</h4>
            <ul>
              <li><a href="https://apstudents.collegeboard.org/course-index-page" target="_blank" rel="noreferrer noopener">AP courses — College Board</a></li>
              <li><a href="https://satsuite.collegeboard.org/sat" target="_blank" rel="noreferrer noopener">SAT — College Board</a></li>
              <li><a href="https://collegescorecard.ed.gov/" target="_blank" rel="noreferrer noopener">College Scorecard</a></li>
              <li><a href="https://studentaid.gov/" target="_blank" rel="noreferrer noopener">Federal Student Aid</a></li>
            </ul>
          </div>
          <div>
            <h4>Honest notes</h4>
            <ul>
              <li>Fit is not admission probability</li>
              <li>Catalog data here is demo data</li>
              <li>Practice questions are original</li>
              <li>We do not write your essays</li>
            </ul>
          </div>
        </div>
        <div className="lp-shell mt-8">
          <p className="t-2xs faint">
            Pathway AI is an independent product. It is not affiliated with, endorsed by, or connected to College Board, the
            Common Application, or any college or university named in this product. AP® and SAT® are registered trademarks of
            College Board.
          </p>
        </div>
      </footer>
    </div>
  );
}
