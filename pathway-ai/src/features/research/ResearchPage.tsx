import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useEngine } from '@/store/useEngine';
import { useAppStore } from '@/store/useAppStore';
import { Badge, Button, Card, Notice, SearchInput, Tabs } from '@/components/ui/primitives';
import { FeedbackButtons, PageHeader, SectionHeader } from '@/components/ui/shared';
import { AIGuidanceNote, DemoDataBanner } from '@/components/ui/Provenance';
import { findResearch } from '@/domain/engine/opportunities';
import { MAJOR_BY_ID } from '@/data/majors';
import { RESEARCH_PROGRAMS } from '@/data/research';
import { countLabel, uniq } from '@/lib/format';
import { Icon } from '@/components/ui/Icon';

/* Section 27 — research opportunities, honestly framed. */

const KIND_LABEL: Record<string, string> = {
  'university-program': 'University programme',
  'lab-placement': 'Lab placement',
  competition: 'Research competition',
  independent: 'Independent research',
  'summer-research': 'Summer research',
  mentorship: 'Mentorship',
};

const SELECTIVITY_NOTE: Record<number, string> = {
  1: 'Open to most applicants who meet the basic criteria.',
  2: 'Competitive but reachable.',
  3: 'Selective — a strong application matters.',
  4: 'Highly selective.',
  5: 'Extremely selective. Apply if it genuinely interests you; never build a plan around getting in.',
};

export default function ResearchPage() {
  const ctx = useEngine();
  const { state, toggleSaved, recordFeedback, toast } = useAppStore();
  const [tab, setTab] = useState('matched');
  const [query, setQuery] = useState('');
  const [subject, setSubject] = useState('');
  const [format, setFormat] = useState('any');
  const [paid, setPaid] = useState('any');
  const [maxSelectivity, setMaxSelectivity] = useState(0);

  const results = useMemo(
    () =>
      findResearch(ctx, {
        query: query || undefined,
        subject: subject || undefined,
        format,
        paid,
        maxSelectivity: maxSelectivity || undefined,
      }),
    [ctx, query, subject, format, paid, maxSelectivity],
  );

  const savedIds = new Set(
    state.savedItems.filter((s) => s.targetType === 'research' && s.status !== 'dismissed').map((s) => s.targetId),
  );

  const subjects = useMemo(() => uniq(RESEARCH_PROGRAMS.flatMap((p) => p.subjects)).sort(), []);

  const shown =
    tab === 'saved' ? results.filter((r) => savedIds.has(r.program.id)) : tab === 'accessible' ? results.filter((r) => r.program.selectivity <= 2) : results;

  return (
    <div className="page">
      <PageHeader
        eyebrow="Beyond class"
        title="Research"
        description="Programmes, placements and independent routes into real research, matched against your direction and your grade."
        actions={
          <Button variant="ghost" icon="rocket" to="/app/projects">
            Independent projects
          </Button>
        }
      />

      <Notice tone="warn" icon="alert">
        <span className="w-600">Most high school research is not what the word suggests.</span> A summer programme you pay to attend is a course,
        not a research placement, and admissions readers know the difference. The routes that carry real weight are the ones where you did
        something genuinely new — usually unglamorous, often local, and almost always the result of asking a lot of people for a chance.
      </Notice>

      <Card pad="md" className="mt-4">
        <SectionHeader title="The route nobody tells you about" description="It works more often than the selective programmes, and it costs nothing." />
        <ol className="col g-2">
          {[
            'Find three or four people locally whose work actually interests you — a university department, a hospital, a municipal lab, a company doing something technical.',
            'Read something they published. Properly, even if you only follow half of it.',
            'Write a short, specific email: what you read, what you found interesting, what you can already do, and how many hours a week you could offer. No flattery, no CV attached.',
            'Expect most to say no or nothing at all. That is normal, and it is not about you.',
            'One yes is all you need, and it is worth more than any programme on this page.',
          ].map((step, i) => (
            <li key={step} className="row g-2 t-sm subtle">
              <span className="step-num">{i + 1}</span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
        <p className="t-2xs faint mt-3">
          Pathway AI will not write that email for you. It has to sound like you, and a template that reads as generated gets deleted.
        </p>
      </Card>

      <DemoDataBanner what="Programme listings, deadlines and eligibility" />

      <div className="mt-6">
        <Tabs
          ariaLabel="Research views"
          active={tab}
          onChange={setTab}
          items={[
            { id: 'matched', label: 'Matched to you', count: results.length },
            { id: 'accessible', label: 'Realistically accessible' },
            { id: 'saved', label: 'Saved', count: savedIds.size },
          ]}
        />
      </div>

      <Card pad="md" className="mt-4">
        <div className="row g-3 wrap items-end">
          <SearchInput value={query} onChange={setQuery} label="Search programmes" placeholder="Search by name, host or focus…" />
          <label className="col g-1">
            <span className="t-2xs eyebrow">Subject</span>
            <select className="select" style={{ minWidth: 190 }} value={subject} onChange={(e) => setSubject(e.target.value)}>
              <option value="">Any subject</option>
              {subjects.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label className="col g-1">
            <span className="t-2xs eyebrow">Format</span>
            <select className="select" style={{ minWidth: 150 }} value={format} onChange={(e) => setFormat(e.target.value)}>
              <option value="any">Any format</option>
              <option value="online">Online</option>
              <option value="in-person">In person</option>
              <option value="hybrid">Hybrid</option>
            </select>
          </label>
          <label className="col g-1">
            <span className="t-2xs eyebrow">Cost</span>
            <select className="select" style={{ minWidth: 150 }} value={paid} onChange={(e) => setPaid(e.target.value)}>
              <option value="any">Any</option>
              <option value="paid">Paid</option>
              <option value="stipend">Stipend</option>
              <option value="unpaid">Unpaid</option>
            </select>
          </label>
          <button type="button" className="chip chip-sm" aria-pressed={maxSelectivity === 3} onClick={() => setMaxSelectivity((v) => (v === 3 ? 0 : 3))}>
            Hide lottery-odds programmes
          </button>
        </div>
      </Card>

      <AIGuidanceNote>
        Match scores reflect overlap with your stated direction, your grade and your location. They say nothing about your chance of being
        accepted, which depends on an application we have not seen.
      </AIGuidanceNote>

      <p className="t-xs subtle mt-4">{countLabel(shown.length, 'programme')} shown.</p>

      {shown.length ? (
        <div className="col g-3 mt-3">
          {shown.map(({ program: p, reasons, blockers }) => (
            <Card key={p.id} pad="md" hover>
              <div className="row between g-3 items-start wrap">
                <div className="grow" style={{ minWidth: 0 }}>
                  <div className="row g-2 items-center wrap">
                    <h3 className="t-md w-600">{p.name}</h3>
                    <Badge>{KIND_LABEL[p.kind] ?? p.kind}</Badge>
                    {p.paid === 'paid' || p.paid === 'stipend' ? <Badge tone="ok">{p.paid === 'stipend' ? 'Stipend' : 'Paid'}</Badge> : null}
                    {p.selectivity >= 5 ? <Badge tone="warn">Extremely selective</Badge> : null}
                  </div>
                  <p className="t-2xs subtle mt-1">
                    {p.host} · {p.format}
                    {p.location ? ` · ${p.location}` : ''} · {p.commitment}
                  </p>
                </div>
                <div className="row g-2">
                  <Button size="sm" variant={savedIds.has(p.id) ? 'soft' : 'ghost'} icon="bookmark" onClick={() => toggleSaved('research', p.id)}>
                    {savedIds.has(p.id) ? 'Saved' : 'Save'}
                  </Button>
                  {p.website ? (
                    <Button size="sm" variant="ghost" href={p.website} iconRight="external">
                      Official site
                    </Button>
                  ) : null}
                </div>
              </div>

              <p className="t-sm muted mt-3">{p.description}</p>

              {reasons.length ? (
                <ul className="col g-1 mt-3">
                  {reasons.slice(0, 3).map((r) => (
                    <li key={r} className="t-xs subtle row g-2">
                      <Icon name="check" size={12} className="c-ok mt-1 shrink-0" />
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              ) : null}

              {blockers.length ? (
                <ul className="col g-1 mt-3">
                  {blockers.map((b) => (
                    <li key={b} className="t-xs c-warn row g-2">
                      <Icon name="alert" size={12} className="mt-1 shrink-0" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              ) : null}

              <div className="row g-4 mt-4 t-2xs faint wrap">
                <span>Grades {p.grades.join(', ')}</span>
                <span>Deadline: {p.deadlineText}</span>
                {p.cost ? <span>Cost: {p.cost}</span> : null}
              </div>

              <p className="t-2xs subtle mt-3">{SELECTIVITY_NOTE[p.selectivity]}</p>

              {p.majorTags.length ? (
                <div className="row g-2 mt-3 wrap">
                  {p.majorTags.map((m) => (
                    <Link key={m} to={`/app/majors/${m}`} className="chip chip-sm">
                      {MAJOR_BY_ID.get(m)?.name ?? m}
                    </Link>
                  ))}
                </div>
              ) : null}

              {p.eligibility.length ? (
                <details className="mt-4">
                  <summary className="t-xs c-accent" style={{ cursor: 'pointer' }}>
                    Eligibility
                  </summary>
                  <ul className="col g-1 mt-2">
                    {p.eligibility.map((e) => (
                      <li key={e} className="t-xs subtle">
                        • {e}
                      </li>
                    ))}
                  </ul>
                  <p className="t-2xs faint mt-2">
                    Demo data. Eligibility rules change every cycle — confirm on the programme&rsquo;s own site before you invest time in an
                    application.
                  </p>
                </details>
              ) : null}

              <div className="row end mt-3">
                <FeedbackButtons
                  compact
                  onFeedback={(kind) => {
                    recordFeedback({ targetType: 'research', targetId: p.id, kind });
                    toast(kind === 'not-interested' ? 'Hidden from future suggestions.' : 'Noted.', 'default');
                  }}
                />
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card pad="lg" className="mt-3">
          <p className="t-sm subtle ta-center">
            {tab === 'saved'
              ? 'Nothing saved yet.'
              : 'Nothing matched those filters. This demo catalog is small — the independent route described above is available to everyone and is not in any catalog.'}
          </p>
        </Card>
      )}
    </div>
  );
}
