import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useEngine } from '@/store/useEngine';
import { useAppStore } from '@/store/useAppStore';
import { Badge, Button, Card, EmptyState, Notice, Tabs } from '@/components/ui/primitives';
import { Icon } from '@/components/ui/Icon';
import { DataRow, FitDimensionDetail, FitDimensionGrid, PageHeader, SectionHeader } from '@/components/ui/shared';
import { DemoDataBanner, ProvenanceFooter } from '@/components/ui/Provenance';
import { COLLEGE_BY_ID } from '@/data/colleges';
import { MAJOR_BY_ID } from '@/data/majors';
import { matchForCollege } from '@/domain/engine/collegeMatch';
import { FIT_DISCLAIMER } from '@/domain/engine/explain';
import { APPLICATION_TASKS } from '@/features/applications/tasks';
import { currency, listJoin, number, percent } from '@/lib/format';

/* Section 6 — college profile with tabs, including a personalised "Your fit". */

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'academics', label: 'Academics' },
  { id: 'admissions', label: 'Admissions' },
  { id: 'life', label: 'Student life' },
  { id: 'cost', label: 'Cost' },
  { id: 'opportunities', label: 'Opportunities' },
  { id: 'deadlines', label: 'Deadlines' },
  { id: 'fit', label: 'Your fit' },
];

export function CollegeProfile() {
  const { collegeId } = useParams();
  const ctx = useEngine();
  const { state, addToCollegeList, removeCollegeEntry, toast } = useAppStore();
  const [tab, setTab] = useState('overview');

  const college = collegeId ? COLLEGE_BY_ID.get(collegeId) : undefined;
  const match = useMemo(() => (collegeId ? matchForCollege(ctx, collegeId) : undefined), [ctx, collegeId]);

  if (!college) {
    return (
      <div className="page">
        <EmptyState
          icon="alert"
          title="We do not have that college"
          description="It may not be in this catalog yet. The catalog here is demo data and covers a limited set."
          action={
            <Link to="/app/colleges" className="btn btn-primary">
              Back to colleges
            </Link>
          }
        />
      </div>
    );
  }

  const entry = state.collegeList.find((e) => e.collegeId === college.id);
  const inState = ctx.profile.academics.state === college.state && college.control === 'public';
  const tuition = inState ? college.tuitionInState : college.tuitionOutState;
  const total = (tuition ?? 0) + (college.roomAndBoard ?? 0);

  return (
    <div className="page">
      <PageHeader
        eyebrow={`${college.city}, ${college.state} · ${college.region}`}
        title={college.name}
        description={college.blurb}
        actions={
          <>
            {entry ? (
              <Button icon="check" variant="soft" onClick={() => removeCollegeEntry(entry.id)}>
                On your list
              </Button>
            ) : (
              <Button
                icon="plus"
                variant="primary"
                onClick={() => {
                  addToCollegeList(college.id);
                  toast(`${college.shortName ?? college.name} added.`, 'ok');
                }}
              >
                Add to my list
              </Button>
            )}
            <Button icon="grid" to="/app/colleges/compare">
              Compare
            </Button>
            {college.website ? (
              <Button icon="external" href={college.website}>
                Official site
              </Button>
            ) : null}
          </>
        }
      >
        <div className="row g-2 mt-4 wrap">
          <Badge>{college.control}</Badge>
          <Badge>{college.setting}</Badge>
          <Badge>{number(college.undergradEnrollment)} undergraduates</Badge>
          {college.acceptanceRate !== undefined ? <Badge tone="warn">{percent(college.acceptanceRate)} admit rate</Badge> : null}
          <Badge tone={college.testPolicy === 'blind' ? 'info' : 'default'}>
            {college.testPolicy === 'blind' ? 'Test-blind' : college.testPolicy === 'optional' ? 'Test-optional' : `Test ${college.testPolicy}`}
          </Badge>
          {college.meetsFullNeed ? <Badge tone="ok">Meets full need</Badge> : null}
          {college.noLoanAid ? <Badge tone="ok">No-loan aid</Badge> : null}
        </div>
      </PageHeader>

      <DemoDataBanner what={`Every figure on this page about ${college.shortName ?? college.name}`} />

      <Tabs items={TABS} active={tab} onChange={setTab} ariaLabel="College profile sections" />

      {tab === 'overview' ? (
        <div className="grid" style={{ gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 330px)', gap: 'var(--s-5)' }}>
          <div className="col g-5" style={{ minWidth: 0 }}>
            <Card pad="md">
              <SectionHeader title="At a glance" />
              <div className="seg-list">
                <DataRow label="Location" value={`${college.city}, ${college.state}`} />
                <DataRow label="Setting" value={college.setting} />
                <DataRow label="Undergraduates" value={number(college.undergradEnrollment)} />
                <DataRow label="Student–faculty ratio" value={college.studentFacultyRatio ?? 'Not recorded'} />
                <DataRow label="Graduation rate" value={college.graduationRate ? percent(college.graduationRate) : 'Not recorded'} />
                <DataRow label="Clubs and organisations" value={college.studentLife.clubsCount ? number(college.studentLife.clubsCount) : 'Not recorded'} />
              </div>
            </Card>

            {college.signaturePrograms.length ? (
              <Card pad="md">
                <SectionHeader title="Signature programmes" description="The things this college is genuinely distinctive for." />
                <div className="col g-3">
                  {college.signaturePrograms.map((p) => (
                    <div key={p.name} className="row-top g-3">
                      <Icon name="star" size={15} className="c-accent shrink-0" style={{ marginTop: 3 }} />
                      <div>
                        <p className="t-sm w-600">{p.name}</p>
                        <p className="t-xs subtle mt-1">{p.description}</p>
                        {p.relatedMajors.length ? (
                          <div className="tag-list mt-2">
                            {p.relatedMajors.map((m) => (
                              <Link key={m} to={`/app/majors/${m}`} className="chip chip-sm" style={{ textDecoration: 'none' }}>
                                {MAJOR_BY_ID.get(m)?.name ?? m}
                              </Link>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            ) : null}

            <Card pad="md">
              <SectionHeader title="Campus culture" description="Tags from our catalog — a starting point for your own research, not a description you should trust." />
              <div className="tag-list">
                {college.studentLife.culture.map((c) => (
                  <span key={c} className="chip chip-sm chip-static">
                    {c.replace(/-/g, ' ')}
                  </span>
                ))}
              </div>
            </Card>
          </div>

          <aside className="col g-4">
            {match ? (
              <Card pad="md">
                <SectionHeader title="Your fit" />
                <FitDimensionGrid dimensions={match.dimensions} compact />
                <p className="t-xs muted mt-4">{match.headline}</p>
                <Button size="sm" variant="ghost" onClick={() => setTab('fit')} className="mt-3" iconRight="arrow-right">
                  See the reasoning
                </Button>
              </Card>
            ) : null}
            <Card pad="md">
              <SectionHeader title="Data provenance" />
              <ProvenanceFooter provenance={college.provenance} />
            </Card>
          </aside>
        </div>
      ) : null}

      {tab === 'academics' ? (
        <div className="col g-5">
          <Card pad="md">
            <SectionHeader title="Majors offered" description="From our catalog. Confirm with the college — programme availability changes." />
            <div className="tag-list">
              {college.majors.map((m) => {
                const mine = ctx.majorIds.includes(m);
                return (
                  <Link key={m} to={`/app/majors/${m}`} className={`chip chip-sm${mine ? ' is-on' : ''}`} style={{ textDecoration: 'none' }}>
                    {MAJOR_BY_ID.get(m)?.name ?? m}
                    {mine ? <Icon name="check" size={11} /> : null}
                  </Link>
                );
              })}
            </div>
          </Card>

          <Card pad="md">
            <SectionHeader title="Programme strengths" description="What this college is best known for academically." />
            <div className="tag-list">
              {college.strengths.map((s) => (
                <span key={s} className="badge badge-accent">
                  {MAJOR_BY_ID.get(s)?.name ?? s}
                </span>
              ))}
            </div>
          </Card>

          <Card pad="md">
            <SectionHeader title="AP and prior credit" />
            <p className="t-sm">{college.apCreditPolicy ?? 'No AP credit policy recorded in this catalog.'}</p>
            <Notice tone="warn" className="mt-4">
              AP credit policies vary between schools within a single university and change year to year. Check the registrar
              before assuming a score saves you a semester.
            </Notice>
          </Card>
        </div>
      ) : null}

      {tab === 'admissions' ? (
        <div className="col g-5">
          <Card pad="md">
            <SectionHeader title="Admissions data" />
            <div className="seg-list">
              <DataRow label="Acceptance rate" value={college.acceptanceRate !== undefined ? percent(college.acceptanceRate) : 'Not recorded'} />
              <DataRow label="Testing policy" value={college.testPolicy === 'blind' ? 'Test-blind — scores are not considered' : college.testPolicy === 'optional' ? 'Test-optional' : college.testPolicy} />
              <DataRow label="SAT middle 50%" value={college.sat25 && college.sat75 ? `${college.sat25}–${college.sat75}` : 'Not recorded'} />
              <DataRow label="ACT middle 50%" value={college.act25 && college.act75 ? `${college.act25}–${college.act75}` : 'Not recorded'} />
              <DataRow label="Average admitted GPA" value={college.gpaAvg ? college.gpaAvg.toFixed(2) : 'Not recorded'} />
            </div>
            <Notice tone="warn" className="mt-4">
              {FIT_DISCLAIMER}
            </Notice>
          </Card>

          <Card pad="md">
            <SectionHeader title="Application requirements" />
            <ul className="col g-2">
              {college.applicationRequirements.map((r) => (
                <li key={r} className="row-top g-2 t-sm">
                  <Icon name="check" size={14} className="subtle shrink-0" style={{ marginTop: 3 }} />
                  {r}
                </li>
              ))}
            </ul>
            {college.admissionsUrl ? (
              <Button size="sm" href={college.admissionsUrl} icon="external" className="mt-4">
                Official admissions page
              </Button>
            ) : null}
          </Card>
        </div>
      ) : null}

      {tab === 'life' ? (
        <div className="col g-5">
          <Card pad="md">
            <SectionHeader title="Student life" />
            <div className="seg-list">
              <DataRow label="Housing" value={college.studentLife.housing ?? 'Not recorded'} />
              <DataRow label="Athletics" value={college.studentLife.athletics ?? 'Not recorded'} />
              <DataRow label="Music" value={college.studentLife.music ?? 'Not recorded'} />
              <DataRow label="Greek life" value={college.studentLife.greekLife ?? 'Not recorded'} />
              <DataRow label="Clubs" value={college.studentLife.clubsCount ? `${number(college.studentLife.clubsCount)} registered organisations` : 'Not recorded'} />
            </div>
          </Card>
          <Card pad="md">
            <SectionHeader title="Culture tags" />
            <div className="tag-list">
              {college.studentLife.culture.map((c) => (
                <span key={c} className="chip chip-sm chip-static">
                  {c.replace(/-/g, ' ')}
                </span>
              ))}
            </div>
            <p className="t-xs subtle mt-4">
              Culture is the thing least well captured by any database. Visit if you can, and talk to current students — a
              campus that reads well on paper can feel wrong in person, and the reverse.
            </p>
          </Card>
        </div>
      ) : null}

      {tab === 'cost' ? (
        <div className="col g-5">
          <Card pad="md">
            <SectionHeader title="Published cost" description="Before any aid. Almost nobody with financial need pays this." />
            <div className="seg-list">
              <DataRow label="Tuition (in-state)" value={currency(college.tuitionInState)} note={inState ? 'Applies to you' : undefined} />
              <DataRow label="Tuition (out-of-state)" value={currency(college.tuitionOutState)} note={!inState ? 'Applies to you' : undefined} />
              <DataRow label="Room and board" value={currency(college.roomAndBoard)} />
              <DataRow label="Estimated total" value={currency(total)} />
            </div>
          </Card>

          <Card pad="md" className="card-accent">
            <SectionHeader title="What people actually pay" />
            <div className="seg-list">
              <DataRow label="Average net price" value={currency(college.avgNetPrice)} />
              <DataRow label="Meets full demonstrated need" value={college.meetsFullNeed ? 'Yes, per this catalog' : 'Not recorded as doing so'} />
              <DataRow label="No-loan aid" value={college.noLoanAid ? 'Yes' : 'Not recorded'} />
              <DataRow label="Merit scholarships" value={college.meritAid ? 'Available' : 'Not recorded'} />
              <DataRow label="Students receiving aid" value={college.pctReceivingAid ? percent(college.pctReceivingAid) : 'Not recorded'} />
            </div>
            {ctx.constraints.maxCostPerYear !== undefined ? (
              <Notice tone={(college.avgNetPrice ?? Infinity) <= ctx.constraints.maxCostPerYear ? 'ok' : 'warn'} className="mt-4">
                {(college.avgNetPrice ?? Infinity) <= ctx.constraints.maxCostPerYear
                  ? `The average net price is within the $${ctx.constraints.maxCostPerYear.toLocaleString()} budget you set — but your own number could differ a lot from the average.`
                  : `The average net price is above the $${ctx.constraints.maxCostPerYear.toLocaleString()} budget you set. That does not rule it out, but aid would need to beat the average for you.`}
              </Notice>
            ) : null}
          </Card>

          <Notice tone="info">
            <strong>Run the net price calculator.</strong> Every US college must publish one, and it is the only figure worth
            planning around. It takes about ten minutes.{' '}
            {college.netPriceCalculatorUrl ? (
              <a href={college.netPriceCalculatorUrl} target="_blank" rel="noreferrer noopener">
                Financial aid page
              </a>
            ) : (
              <a href="https://collegecost.ed.gov/net-price" target="_blank" rel="noreferrer noopener">
                Find it through the Net Price Calculator Center
              </a>
            )}
          </Notice>
        </div>
      ) : null}

      {tab === 'opportunities' ? (
        <div className="col g-5">
          <Card pad="md">
            <SectionHeader title="Undergraduate opportunities" />
            <div className="seg-list">
              <DataRow label="Undergraduate research" value={college.opportunities.undergradResearch ?? 'Not recorded'} />
              <DataRow label="Co-op" value={college.opportunities.coop ?? 'Not recorded'} />
              <DataRow label="Internships" value={college.opportunities.internships ?? 'Not recorded'} />
              <DataRow label="Study abroad" value={college.opportunities.studyAbroad ?? 'Not recorded'} />
              <DataRow label="Entrepreneurship" value={college.opportunities.entrepreneurship ?? 'Not recorded'} />
            </div>
          </Card>
        </div>
      ) : null}

      {tab === 'deadlines' ? (
        <div className="col g-5">
          <Card pad="md">
            <SectionHeader title="Application rounds" description="Dates in this catalog are estimates. Confirm every one on the official site." />
            <ul className="timeline">
              {college.deadlines.map((d, i) => (
                <li key={i} className="tl-item">
                  <span className="tl-dot" aria-hidden="true" />
                  <div className="row between g-3 wrap">
                    <span className="t-sm w-600">{roundLabel(d.kind)}</span>
                    <Badge tone="warn">Estimated</Badge>
                  </div>
                  <p className="t-xs subtle mt-1">{d.note ?? 'No date recorded.'}</p>
                </li>
              ))}
            </ul>
            <Notice tone="warn" className="mt-4">
              These are typical dates for this round type, not verified dates for this cycle. Missing a real deadline because
              of an estimate would be a serious error, so check the college site.
            </Notice>
          </Card>

          {entry ? (
            <Card pad="md">
              <SectionHeader title="Your application checklist" description="Tracked per college." />
              <div className="col g-1">
                {APPLICATION_TASKS.map((t) => (
                  <div key={t.id} className="row between g-3 t-sm py-1">
                    <span className={entry.checklist[t.id] ? 'subtle strike' : ''}>{t.label}</span>
                    <Icon name={entry.checklist[t.id] ? 'check' : 'clock'} size={14} className={entry.checklist[t.id] ? 'c-ok' : 'faint'} />
                  </div>
                ))}
              </div>
              <Button size="sm" to="/app/applications" className="mt-4" iconRight="arrow-right">
                Manage in the application dashboard
              </Button>
            </Card>
          ) : null}
        </div>
      ) : null}

      {tab === 'fit' ? (
        match ? (
          <div className="col g-5">
            <Card pad="md" className="card-accent">
              <SectionHeader title="Why this college, for you" />
              <p className="t-md">{match.headline}</p>
              <div className="mt-4">
                <FitDimensionGrid dimensions={match.dimensions} />
              </div>
              {ctx.majorIds.length ? (
                <p className="t-sm muted mt-4">
                  You are interested in {listJoin(ctx.majorIds.map((m) => MAJOR_BY_ID.get(m)?.name ?? m))}.{' '}
                  {match.matchedPrograms.length
                    ? `Here that connects to ${listJoin(match.matchedPrograms.map((p) => p.name))}.`
                    : `This catalog does not record a programme here specifically connected to that — worth checking the department pages directly.`}
                </p>
              ) : null}
            </Card>

            <div className="grid-2">
              {match.dimensions.map((d) => (
                <FitDimensionDetail key={d.key} dimension={d} />
              ))}
            </div>

            {match.matchedOpportunities.length ? (
              <Card pad="md">
                <SectionHeader title="Opportunities that match what you care about" />
                <ul className="col g-2">
                  {match.matchedOpportunities.map((o, i) => (
                    <li key={i} className="row-top g-2 t-sm">
                      <Icon name="check" size={14} className="c-ok shrink-0" style={{ marginTop: 3 }} />
                      {o}
                    </li>
                  ))}
                </ul>
              </Card>
            ) : null}

            <Card pad="md">
              <SectionHeader title="Academic context" description="How your record compares with students this college has admitted. This is preparation, not probability." />
              <div className="col g-3">
                {match.academicContext.gpaNote ? <p className="t-sm">{match.academicContext.gpaNote}</p> : null}
                {match.academicContext.testNote ? <p className="t-sm">{match.academicContext.testNote}</p> : null}
              </div>
              <Notice tone="warn" className="mt-4">
                {match.academicContext.disclaimer}
              </Notice>
            </Card>

            {match.concerns.length ? (
              <Card pad="md">
                <SectionHeader title="Things to check before you invest more time" />
                <ul className="col g-2">
                  {match.concerns.map((c, i) => (
                    <li key={i} className="row-top g-2 t-sm">
                      <Icon name="alert" size={14} className="c-warn shrink-0" style={{ marginTop: 3 }} />
                      {c}
                    </li>
                  ))}
                </ul>
              </Card>
            ) : null}
          </div>
        ) : (
          <EmptyState icon="compass" title="Complete your profile to see your fit" description="Fit needs your intended direction and preferences to say anything useful." action={<Link to="/app/settings/profile" className="btn btn-primary">Update profile</Link>} />
        )
      ) : null}
    </div>
  );
}

function roundLabel(kind: string): string {
  const map: Record<string, string> = {
    ED: 'Early Decision',
    ED2: 'Early Decision II',
    EA: 'Early Action',
    REA: 'Restrictive / Single-Choice Early Action',
    RD: 'Regular Decision',
    Rolling: 'Rolling admission',
    Priority: 'Priority deadline',
    Transfer: 'Transfer',
  };
  return map[kind] ?? kind;
}
