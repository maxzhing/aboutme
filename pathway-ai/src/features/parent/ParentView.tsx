import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useEngine } from '@/store/useEngine';
import { useAppStore } from '@/store/useAppStore';
import { Badge, Button, Card, Notice } from '@/components/ui/primitives';
import { PageHeader, SectionHeader, Stat } from '@/components/ui/shared';
import { DemoDataBanner } from '@/components/ui/Provenance';
import { ProgressRing } from '@/components/charts';
import { COLLEGE_BY_ID } from '@/data/colleges';
import { MAJOR_BY_ID } from '@/data/majors';
import { AP_COURSE_BY_ID } from '@/data/ap';
import { deadlineIntelligence } from '@/domain/engine/planning';
import { countLabel, currency, firstName } from '@/lib/format';
import { formatDate, relativeDays } from '@/lib/date';
import { printPDF } from '@/lib/export';
import { Icon } from '@/components/ui/Icon';

/* Section 60 — the parent view. Read-only, and only what the student shared. */

export function ParentView() {
  const ctx = useEngine();
  const { state } = useAppStore();
  const share = state.share;
  const name = firstName(state.profile.displayName || 'your student');

  const deadlines = useMemo(() => deadlineIntelligence(ctx).slice(0, 8), [ctx]);
  const applying = state.collegeList.filter((e) => e.stage === 'applying' || e.stage === 'application-planning' || e.stage === 'applied');
  const latestScore = state.satScores[state.satScores.length - 1];

  const costRows = useMemo(
    () =>
      state.collegeList
        .map((e) => COLLEGE_BY_ID.get(e.collegeId))
        .filter((c): c is NonNullable<typeof c> => Boolean(c) && c!.avgNetPrice !== undefined)
        .sort((a, b) => (a.avgNetPrice ?? 0) - (b.avgNetPrice ?? 0)),
    [state.collegeList],
  );

  if (!share.enabled) {
    return (
      <div className="page">
        <PageHeader eyebrow="Sharing" title="Parent view" description="Off at the moment." />
        <Card pad="lg">
          <p className="t-sm subtle ta-center">
            {name} has not turned on sharing. Nothing is visible here, and nobody but them can change that.{' '}
            <Link to="/app/settings/sharing" className="c-accent">
              Sharing settings
            </Link>
          </p>
        </Card>
      </div>
    );
  }

  const nothingShared = !Object.values(share.share).some(Boolean);

  return (
    <div className="page">
      <PageHeader
        eyebrow={share.parentName ? `Shared with ${share.parentName}` : 'Shared summary'}
        title={`${name}'s plan`}
        description="A read-only summary of what they chose to share. Nothing here can be edited from this view."
        actions={
          <>
            <Button variant="ghost" icon="download" onClick={printPDF}>
              Print
            </Button>
            <Button variant="ghost" icon="settings" to="/app/settings/sharing">
              Sharing settings
            </Button>
          </>
        }
      />

      <Notice tone="info" icon="lock">
        {name} controls what appears here and can turn any of it off at any time. Their counselor conversations, individual practice attempts and
        private notes are never shared regardless of these settings.
      </Notice>

      {nothingShared ? (
        <Card pad="lg" className="mt-4">
          <p className="t-sm subtle ta-center">Sharing is on, but no areas are selected yet.</p>
        </Card>
      ) : null}

      {share.share.deadlines && deadlines.length ? (
        <Card pad="md" className="mt-4">
          <SectionHeader title="What is coming up" description="The dates that matter in the next few months." />
          <div className="col g-2">
            {deadlines.map((d) => (
              <div key={d.deadline.id} className="row between g-3 items-center wrap">
                <div className="grow" style={{ minWidth: 0 }}>
                  <p className="t-sm">{d.deadline.title}</p>
                  <p className="t-2xs faint mt-1">
                    {formatDate(d.deadline.date)} · {relativeDays(d.daysAway)}
                  </p>
                </div>
                <Badge tone={d.urgency === 'overdue' || d.urgency === 'critical' ? 'danger' : d.urgency === 'soon' ? 'warn' : 'default'}>
                  {d.urgency}
                </Badge>
              </div>
            ))}
          </div>
          <p className="t-2xs faint mt-3">
            Dates from the catalog are demo data and should be confirmed against each college or sponsor&rsquo;s own site.
          </p>
        </Card>
      ) : null}

      {share.share.collegeList && state.collegeList.length ? (
        <Card pad="md" className="mt-4">
          <SectionHeader title="Colleges being considered" description={`${countLabel(state.collegeList.length, 'college')}, ${applying.length} being applied to.`} />
          <div className="col g-2">
            {state.collegeList.map((e) => {
              const college = COLLEGE_BY_ID.get(e.collegeId);
              if (!college) return null;
              return (
                <div key={e.id} className="row between g-3 items-center wrap">
                  <div className="grow" style={{ minWidth: 0 }}>
                    <p className="t-sm w-600">{college.shortName ?? college.name}</p>
                    <p className="t-2xs faint mt-1">
                      {college.city}, {college.state} · {college.control}
                      {e.applicationRound ? ` · ${e.applicationRound}` : ''}
                    </p>
                  </div>
                  <Badge tone={e.decision === 'accepted' ? 'ok' : e.decision === 'denied' ? 'danger' : 'default'}>
                    {e.decision ?? e.stage.replace(/-/g, ' ')}
                  </Badge>
                </div>
              );
            })}
          </div>
          <Notice tone="warn" icon="alert" className="mt-4">
            This list reflects fit with what {name} said they want — academically, personally, in opportunity and in cost. It is not a ranking, and
            nothing in this app estimates their chance of admission anywhere. Any tool that claims to is guessing.
          </Notice>
        </Card>
      ) : null}

      {share.share.financial && costRows.length ? (
        <Card pad="md" className="mt-4">
          <SectionHeader
            title="What these might cost"
            description="Published average net price — what the average aided student paid, not what your family will pay."
          />
          <div className="col g-2">
            {costRows.map((c) => (
              <div key={c.id} className="row between g-3 items-center">
                <span className="t-sm subtle">{c.shortName ?? c.name}</span>
                <span className="row g-2 items-center">
                  <span className="mono t-sm">{currency(c.avgNetPrice)}</span>
                  {c.meetsFullNeed ? <Badge tone="ok">meets full need</Badge> : null}
                </span>
              </div>
            ))}
          </div>
          {state.profile.collegePrefs.budgetPerYear ? (
            <p className="t-xs subtle mt-3">
              Against a stated annual budget of {currency(state.profile.collegePrefs.budgetPerYear)},{' '}
              {costRows.filter((c) => (c.avgNetPrice ?? 0) <= (state.profile.collegePrefs.budgetPerYear ?? 0)).length} of these fall inside it on
              published averages.
            </p>
          ) : null}
          <Notice tone="warn" icon="alert" className="mt-3">
            These are estimates from demo data, not aid determinations. The only authoritative figures come from each college&rsquo;s net price
            calculator and, after applying, its official aid letter. A high sticker price often becomes a low real price at colleges with large
            aid budgets — it is worth running the calculators before ruling anywhere out.
          </Notice>
        </Card>
      ) : null}

      {share.share.majorPlanning ? (
        <Card pad="md" className="mt-4">
          <SectionHeader title="Direction" description="What they are currently thinking about studying." />
          {state.profile.majors.length ? (
            <div className="col g-2">
              {state.profile.majors.map((m) => (
                <div key={m.majorId} className="row between g-3 items-center">
                  <span className="t-sm">{MAJOR_BY_ID.get(m.majorId)?.name ?? m.majorId}</span>
                  <Badge>{m.confidence}</Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="t-sm subtle">
              Undecided, which is an entirely normal place to be. Most students change direction at least once, and several change after
              starting college.
            </p>
          )}
        </Card>
      ) : null}

      {share.share.academics ? (
        <Card pad="md" className="mt-4">
          <SectionHeader title="Academics" description="Courses and plan. Grades are shown only if they entered them." />
          <div className="row g-5 wrap">
            <Stat label="Grade" value={String(state.profile.academics.grade)} />
            <Stat label="Graduating" value={String(state.profile.academics.graduationYear)} />
            {state.profile.academics.gpa !== undefined ? (
              <Stat label="GPA" value={`${state.profile.academics.gpa} / ${state.profile.academics.gpaScale}`} />
            ) : null}
          </div>
          {state.profile.academics.currentCourses.length ? (
            <div className="mt-4">
              <p className="t-2xs eyebrow mb-2">This year</p>
              <div className="row g-2 wrap">
                {state.profile.academics.currentCourses.map((c) => (
                  <span key={c} className="chip chip-static chip-sm">
                    {AP_COURSE_BY_ID.get(c)?.name ?? c}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </Card>
      ) : null}

      {share.share.testing ? (
        <Card pad="md" className="mt-4">
          <SectionHeader title="Testing" />
          {latestScore ? (
            <div className="row g-5 wrap items-center">
              <ProgressRing
                value={((latestScore.total - 400) / 1200) * 100}
                size={80}
                stroke={7}
                label={String(latestScore.total)}
                ariaLabel={`Most recent total ${latestScore.total}`}
              />
              <div>
                <p className="t-sm w-600">
                  {latestScore.label} · {formatDate(latestScore.date)}
                </p>
                <p className="t-2xs subtle mt-1">
                  Math {latestScore.math} · Reading &amp; Writing {latestScore.readingWriting} ·{' '}
                  {latestScore.official ? 'official report' : 'practice test'}
                </p>
              </div>
            </div>
          ) : (
            <p className="t-sm subtle">No scores recorded yet.</p>
          )}
          <p className="t-2xs faint mt-3">
            Many colleges are now test-optional or test-blind. A score helps when it strengthens an application and is simply not submitted when
            it does not — this is a normal and widely used option, not a compromise.
          </p>
        </Card>
      ) : null}

      {share.share.activities && state.profile.activities.length ? (
        <Card pad="md" className="mt-4">
          <SectionHeader title="Outside the classroom" description="What they spend time on. Depth over quantity is what admissions readers respond to." />
          <div className="col g-2">
            {state.profile.activities.map((a) => (
              <div key={a.id} className="row between g-3 items-start">
                <div className="grow" style={{ minWidth: 0 }}>
                  <p className="t-sm w-600">{a.name}</p>
                  <p className="t-2xs faint mt-1">
                    {a.role ?? a.category}
                    {a.hoursPerWeek ? ` · ${a.hoursPerWeek}h/week` : ''}
                    {a.gradesInvolved.length ? ` · ${countLabel(a.gradesInvolved.length, 'year')}` : ''}
                  </p>
                </div>
                {a.leadership ? <Badge tone="accent">leadership</Badge> : null}
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      {share.share.essays && state.essays.length ? (
        <Card pad="md" className="mt-4">
          <SectionHeader title="Essays" description="Titles and progress only. The drafts themselves stay private unless they show you directly." />
          <div className="col g-2">
            {state.essays.map((e) => (
              <div key={e.id} className="row between g-3 items-center">
                <span className="t-sm">{e.title}</span>
                <span className="t-2xs mono faint">{e.body.trim() ? 'in progress' : 'not started'}</span>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      <DemoDataBanner what="College figures, deadlines and cost estimates in this summary" />

      <Card pad="md" className="mt-4">
        <SectionHeader title="How to be useful here" description="Written for the person reading this, from what counselors consistently say works." />
        <ul className="col g-2">
          {[
            'Ask what they are enjoying before you ask how it is going. The second question is usually about your anxiety, not their plan.',
            'The deadline list is the genuinely useful thing to help with. Logistics, transport, forms, reminders.',
            'Let the college list be theirs. A list built around someone else’s preferences tends to produce four years in the wrong place.',
            'Talk about money early and concretely. Students routinely rule out colleges they could afford, and apply to ones they cannot, because nobody had the conversation.',
            'Rejection in this process is mostly about institutional priorities in a given year, not about them. Say that before decisions arrive, not after.',
          ].map((s) => (
            <li key={s} className="row g-2 t-sm subtle">
              <Icon name="chevron-right" size={13} className="mt-1 shrink-0" />
              <span>{s}</span>
            </li>
          ))}
        </ul>
      </Card>

      <p className="t-2xs faint mt-6 row g-2">
        <Icon name="shield" size={12} className="mt-1 shrink-0" />
        <span>
          This is a read-only view. Nothing here can be changed from this page, and {name} can revoke access at any time from their sharing
          settings.
        </span>
      </p>
    </div>
  );
}

export default ParentView;
