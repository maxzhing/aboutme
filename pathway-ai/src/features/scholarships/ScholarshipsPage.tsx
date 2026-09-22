import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useEngine } from '@/store/useEngine';
import { useAppStore } from '@/store/useAppStore';
import { Badge, Button, Card, Notice, SearchInput, Tabs } from '@/components/ui/primitives';
import { FeedbackButtons, PageHeader, SectionHeader, Stat } from '@/components/ui/shared';
import { AIGuidanceNote, DemoDataBanner } from '@/components/ui/Provenance';
import { findScholarships } from '@/domain/engine/opportunities';
import { MAJOR_BY_ID, MAJORS } from '@/data/majors';
import { SCHOLARSHIPS } from '@/data/scholarships';
import { demo } from '@/data/provenance';
import { countLabel, currency } from '@/lib/format';
import { addDays, monthName, nextOccurrenceOfMonth, todayISO } from '@/lib/date';
import { downloadCSV } from '@/lib/export';
import { Icon } from '@/components/ui/Icon';

/* Section 28 — scholarships, with the limits of matching stated plainly. */

export default function ScholarshipsPage() {
  const ctx = useEngine();
  const { state, toggleSaved, recordFeedback, addDeadline, toast } = useAppStore();
  const [tab, setTab] = useState('matched');
  const [query, setQuery] = useState('');
  const [major, setMajor] = useState('');
  const [minAmount, setMinAmount] = useState(0);

  const results = useMemo(
    () => findScholarships(ctx, { query: query || undefined, major: major || undefined, minAmount: minAmount || undefined }),
    [ctx, query, major, minAmount],
  );

  const savedIds = new Set(
    state.savedItems.filter((s) => s.targetType === 'scholarship' && s.status !== 'dismissed').map((s) => s.targetId),
  );

  const shown =
    tab === 'saved'
      ? results.filter((r) => savedIds.has(r.scholarship.id))
      : tab === 'open'
        ? results.filter((r) => r.scholarship.grades.includes(ctx.grade))
        : results;

  const potentialTotal = shown.reduce((n, r) => n + (r.scholarship.amountMax ?? r.scholarship.amountMin ?? 0), 0);

  function exportList() {
    downloadCSV(
      'pathway-scholarships.csv',
      shown.map((r) => ({
        Name: r.scholarship.name,
        Sponsor: r.scholarship.sponsor,
        Amount: r.scholarship.amountText,
        Deadline: r.scholarship.deadlineText,
        Grades: r.scholarship.grades.join('; '),
        Renewable: r.scholarship.renewable ? 'yes' : 'no',
        'Essay required': r.scholarship.essayRequired ? 'yes' : 'no',
        Website: r.scholarship.website ?? '',
        Source: 'Pathway AI demo catalog — verify with the sponsor',
      })),
    );
    toast('Scholarship list exported as CSV.', 'ok');
  }

  return (
    <div className="page">
      <PageHeader
        eyebrow="Colleges"
        title="Scholarships"
        description="Awards matched against your direction, your grade and what we know about your record — with everything we cannot check stated rather than assumed."
        actions={
          <>
            <Button variant="ghost" icon="download" onClick={exportList} disabled={!shown.length}>
              Export
            </Button>
            <Button variant="ghost" icon="wallet" to="/app/colleges/cost">
              Cost planning
            </Button>
          </>
        }
      />

      <Notice tone="warn" icon="alert">
        <span className="w-600">Institutional aid dwarfs private scholarships for most families.</span> The money that changes what college costs
        usually comes from the colleges themselves, through need-based and merit aid. Private scholarships are worth applying for, but a strong
        aid package from one well-chosen college will almost always beat a stack of $1,000 awards.
      </Notice>

      <DemoDataBanner what="Award amounts, deadlines and eligibility criteria" />

      <div className="mt-6">
        <Tabs
          ariaLabel="Scholarship views"
          active={tab}
          onChange={setTab}
          items={[
            { id: 'matched', label: 'Matched to you', count: results.length },
            { id: 'open', label: `Open to grade ${ctx.grade}` },
            { id: 'saved', label: 'Saved', count: savedIds.size },
          ]}
        />
      </div>

      <Card pad="md" className="mt-4">
        <div className="row g-3 wrap items-end">
          <SearchInput value={query} onChange={setQuery} label="Search scholarships" placeholder="Search by name, sponsor or focus…" />
          <label className="col g-1">
            <span className="t-2xs eyebrow">Intended major</span>
            <select className="select" style={{ minWidth: 220 }} value={major} onChange={(e) => setMajor(e.target.value)}>
              <option value="">Any major</option>
              {MAJORS.filter((m) => m.id !== 'undecided').map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </label>
          <label className="col g-1">
            <span className="t-2xs eyebrow">Minimum award</span>
            <select className="select" style={{ minWidth: 160 }} value={minAmount} onChange={(e) => setMinAmount(Number(e.target.value))}>
              <option value={0}>Any amount</option>
              <option value={1000}>$1,000+</option>
              <option value={5000}>$5,000+</option>
              <option value={20000}>$20,000+</option>
            </select>
          </label>
          {ctx.majorIds.length ? (
            <button type="button" className="chip chip-sm" onClick={() => setMajor(ctx.majorIds[0])}>
              My major: {MAJOR_BY_ID.get(ctx.majorIds[0])?.name}
            </button>
          ) : null}
        </div>
      </Card>

      {shown.length ? (
        <div className="row g-5 wrap mt-4">
          <Stat label="Shown" value={String(shown.length)} />
          <Stat label="Combined maximum" value={currency(potentialTotal)} />
          <Stat label="Require an essay" value={String(shown.filter((r) => r.scholarship.essayRequired).length)} />
        </div>
      ) : null}

      <AIGuidanceNote>
        Matching here uses your grade, intended major, state and GPA where you have entered them. It deliberately does not use — and we do not
        ask for — heritage, income, citizenship or family circumstances. Where an award turns on those, we say so and leave the judgement to you.
      </AIGuidanceNote>

      <p className="t-xs subtle mt-4">{countLabel(shown.length, 'scholarship')} shown.</p>

      {shown.length ? (
        <div className="col g-3 mt-3">
          {shown.map(({ scholarship: s, reasons, cautions, eligibilityUnknown }) => (
            <Card key={s.id} pad="md" hover>
              <div className="row between g-3 items-start wrap">
                <div className="grow" style={{ minWidth: 0 }}>
                  <div className="row g-2 items-center wrap">
                    <h3 className="t-md w-600">{s.name}</h3>
                    <Badge tone="accent">{s.amountText}</Badge>
                    {s.renewable ? <Badge tone="ok">Renewable</Badge> : null}
                    {s.essayRequired ? <Badge>Essay required</Badge> : null}
                  </div>
                  <p className="t-2xs subtle mt-1">
                    {s.sponsor} · grades {s.grades.join(', ')} · {s.deadlineText}
                    {s.deadlineMonth ? ` (${monthName(s.deadlineMonth)})` : ''}
                  </p>
                </div>
                <div className="row g-2">
                  <Button size="sm" variant={savedIds.has(s.id) ? 'soft' : 'ghost'} icon="bookmark" onClick={() => toggleSaved('scholarship', s.id)}>
                    {savedIds.has(s.id) ? 'Saved' : 'Save'}
                  </Button>
                  {s.website ? (
                    <Button size="sm" variant="ghost" href={s.website} iconRight="external">
                      Official site
                    </Button>
                  ) : null}
                </div>
              </div>

              <p className="t-sm muted mt-3">{s.description}</p>

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

              {cautions.length ? (
                <ul className="col g-1 mt-3">
                  {cautions.map((c) => (
                    <li key={c} className="t-xs c-warn row g-2">
                      <Icon name="alert" size={12} className="mt-1 shrink-0" />
                      <span>{c}</span>
                    </li>
                  ))}
                </ul>
              ) : null}

              {eligibilityUnknown.length ? (
                <div className="notice mt-3 t-xs">
                  <Icon name="info" size={14} className="notice-icon" />
                  <div className="col g-1">
                    {eligibilityUnknown.map((e) => (
                      <span key={e}>{e}</span>
                    ))}
                  </div>
                </div>
              ) : null}

              <details className="mt-4">
                <summary className="t-xs c-accent" style={{ cursor: 'pointer' }}>
                  Full eligibility and requirements
                </summary>
                <div className="col g-3 mt-3">
                  <div>
                    <p className="t-2xs eyebrow mb-2">Eligibility</p>
                    <ul className="col g-1">
                      {s.eligibility.map((e) => (
                        <li key={e} className="t-xs subtle">
                          • {e}
                        </li>
                      ))}
                    </ul>
                  </div>
                  {s.academicRequirements?.length ? (
                    <div>
                      <p className="t-2xs eyebrow mb-2">Academic requirements</p>
                      <ul className="col g-1">
                        {s.academicRequirements.map((r) => (
                          <li key={r} className="t-xs subtle">
                            • {r}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {s.activityRequirements?.length ? (
                    <div>
                      <p className="t-2xs eyebrow mb-2">Activity requirements</p>
                      <ul className="col g-1">
                        {s.activityRequirements.map((r) => (
                          <li key={r} className="t-xs subtle">
                            • {r}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {s.recommendationsRequired ? (
                    <p className="t-xs subtle">Requires {countLabel(s.recommendationsRequired, 'recommendation')}.</p>
                  ) : null}
                  <p className="t-2xs faint">
                    All of this is demo data. Award amounts, deadlines and criteria change every year — the sponsor&rsquo;s own page is the only
                    authoritative source.
                  </p>
                </div>
              </details>

              <div className="row between g-3 mt-4 wrap items-center">
                <Button
                  size="sm"
                  variant="ghost"
                  icon="calendar"
                  onClick={() => {
                    addDeadline({
                      title: `${s.name} application`,
                      category: 'scholarship',
                      date: s.deadlineMonth ? nextOccurrenceOfMonth(s.deadlineMonth) : addDays(todayISO(), 60),
                      refType: 'scholarship',
                      refId: s.id,
                      notes: `Listed as: ${s.deadlineText}. This is a demo date — confirm it on the sponsor's own site.`,
                      done: false,
                      provenance: demo(),
                    });
                    toast('Added to your deadlines. Confirm the real date with the sponsor before relying on it.', 'ok');
                  }}
                >
                  Track this deadline
                </Button>
                <FeedbackButtons
                  compact
                  onFeedback={(kind) => {
                    recordFeedback({ targetType: 'scholarship', targetId: s.id, kind });
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
              : `Nothing matched. This demo carries ${countLabel(SCHOLARSHIPS.length, 'scholarship')}; a real deployment would search tens of thousands, including local awards that are far less competitive.`}
          </p>
        </Card>
      )}

      <Card pad="md" className="mt-6">
        <SectionHeader title="Where the less competitive money actually is" description="National awards get the attention. These are the ones with real odds." />
        <ul className="col g-2">
          {[
            'Your own high school — counselors keep a list of local awards that almost nobody applies for.',
            'Community foundations and Rotary, Kiwanis or Lions clubs in your town.',
            'Your parents’ employers and unions, which often fund awards restricted to employees’ children.',
            'Professional associations in the field you want to enter.',
            'Your state’s higher education agency, which usually runs grants tied to residency.',
          ].map((s) => (
            <li key={s} className="row g-2 t-sm subtle">
              <Icon name="chevron-right" size={13} className="mt-1 shrink-0" />
              <span>{s}</span>
            </li>
          ))}
        </ul>
        <p className="t-2xs faint mt-3">
          A $2,000 local award with forty applicants is worth more of your time than a $40,000 national one with forty thousand.
        </p>
      </Card>

      <Notice tone="danger" icon="shield" className="mt-4">
        <span className="w-600">A legitimate scholarship never charges a fee to apply.</span> Nor does it guarantee an award, contact you out of
        the blue about money you did not apply for, or ask for bank details before you have been selected. Anything that does is a scam.{' '}
        <Link to="/app/colleges/cost" className="c-accent">
          Financial planning
        </Link>{' '}
        covers the legitimate routes.
      </Notice>
    </div>
  );
}
