import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useEngine } from '@/store/useEngine';
import { useAppStore } from '@/store/useAppStore';
import { Badge, Button, Card, Notice } from '@/components/ui/primitives';
import { NavCard, PageHeader, SectionHeader, Stat } from '@/components/ui/shared';
import { ProgressRing } from '@/components/charts';
import { COLLEGE_BY_ID } from '@/data/colleges';
import { APPLICATION_TASKS } from './tasks';
import { deadlineIntelligence } from '@/domain/engine/planning';
import { countLabel, percent } from '@/lib/format';
import { formatDate, relativeDays } from '@/lib/date';
import { Icon } from '@/components/ui/Icon';
import type { ListStage } from '@/domain/types';

/* Section 40 — application tracker dashboard. */

const STAGE_LABEL: Record<ListStage, string> = {
  exploring: 'Exploring',
  considering: 'Considering',
  'application-planning': 'Planning',
  applying: 'Applying',
  applied: 'Applied',
  decision: 'Decision in',
};

const STAGE_ORDER: ListStage[] = ['exploring', 'considering', 'application-planning', 'applying', 'applied', 'decision'];

export function ApplicationDashboard() {
  const ctx = useEngine();
  const { state } = useAppStore();

  const entries = state.collegeList;
  const deadlines = useMemo(() => deadlineIntelligence(ctx).filter((d) => d.deadline.refType === 'college'), [ctx]);

  const applying = entries.filter((e) => e.stage === 'applying' || e.stage === 'application-planning');
  const overallProgress = applying.length
    ? Math.round(
        (applying.reduce((n, e) => n + Object.values(e.checklist).filter(Boolean).length, 0) /
          (applying.length * APPLICATION_TASKS.length)) *
          100,
      )
    : 0;

  const byStage = STAGE_ORDER.map((stage) => ({ stage, entries: entries.filter((e) => e.stage === stage) }));
  const decisions = entries.filter((e) => e.decision);

  return (
    <div className="page">
      <PageHeader
        eyebrow="Colleges"
        title="Applications"
        description="Where every application stands, what is outstanding, and the dates that matter — with essays, your activity list and recommendations in one place."
        actions={
          <>
            <Button variant="ghost" icon="pen" to="/app/applications/essays">
              Essays
            </Button>
            <Button variant="ghost" icon="bookmark" to="/app/colleges/list">
              College list
            </Button>
          </>
        }
      />

      {entries.length ? (
        <>
          <div className="row g-5 wrap">
            <Stat label="Colleges tracked" value={String(entries.length)} />
            <Stat label="Actively applying" value={String(applying.length)} />
            <Stat label="Essays drafted" value={String(state.essays.length)} />
            <Stat label="Recommenders" value={String(state.recommendationPackets.length)} />
          </div>

          {applying.length ? (
            <Card pad="md" className="mt-4">
              <div className="row g-5 wrap items-center">
                <ProgressRing
                  value={overallProgress}
                  size={92}
                  stroke={8}
                  label={`${overallProgress}%`}
                  sublabel="complete"
                  ariaLabel={`${overallProgress} percent of application tasks complete`}
                />
                <div className="grow">
                  <h2 className="t-md w-600">Across the applications you are working on</h2>
                  <p className="t-sm subtle mt-2">
                    {countLabel(applying.length, 'application')} in progress, {APPLICATION_TASKS.length} standard tasks each.
                  </p>
                  <p className="t-2xs faint mt-2">
                    Completeness is a measure of paperwork, not of how strong an application is. A fully ticked checklist with a rushed essay is
                    not finished.
                  </p>
                </div>
              </div>
            </Card>
          ) : null}
        </>
      ) : null}

      <div className="grid-fit-lg mt-6">
        <NavCard to="/app/applications/essays" icon="pen" title="Essay workshop" description="Brainstorming from your own material, and an authenticity check. It will not write for you." meta={state.essays.length ? <Badge>{state.essays.length}</Badge> : undefined} />
        <NavCard to="/app/applications/activity-list" icon="list" title="Activity list" description="How your activities read in the space an application actually gives you." />
        <NavCard to="/app/applications/recommendations" icon="users" title="Recommendations" description="Who to ask, when, and a packet built from what you have recorded." meta={state.recommendationPackets.length ? <Badge>{state.recommendationPackets.length}</Badge> : undefined} />
      </div>

      {deadlines.length ? (
        <Card pad="md" className="mt-6">
          <SectionHeader
            title="Application deadlines"
            description="Demo dates from the catalog. Verify every one against the college's own admissions page before you rely on it."
            action={
              <Button size="sm" variant="ghost" to="/app/planner/deadlines" iconRight="arrow-right">
                All deadlines
              </Button>
            }
          />
          <div className="col g-2">
            {deadlines.slice(0, 6).map((d) => (
              <div key={d.deadline.id} className="row between g-3 items-center wrap">
                <div className="grow" style={{ minWidth: 0 }}>
                  <p className="t-sm w-600">{d.deadline.title}</p>
                  <p className="t-2xs subtle mt-1">
                    {formatDate(d.deadline.date)} · {relativeDays(d.daysAway)}
                    {d.blockers.length ? ` · ${d.blockers[0]}` : ''}
                  </p>
                </div>
                <Badge tone={d.urgency === 'overdue' || d.urgency === 'critical' ? 'danger' : d.urgency === 'soon' ? 'warn' : 'default'}>
                  {d.urgency}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      {entries.length ? (
        <>
          <SectionHeader title="By stage" className="mt-8" description="Drag nothing — change a stage from the college's own page." />
          <div className="board">
            {byStage.map(({ stage, entries: staged }) => (
              <div key={stage} className="board-col">
                <div className="row between g-2 items-center">
                  <p className="t-2xs eyebrow">{STAGE_LABEL[stage]}</p>
                  <span className="t-2xs mono faint">{staged.length}</span>
                </div>
                <div className="col g-2 mt-3">
                  {staged.map((e) => {
                    const college = COLLEGE_BY_ID.get(e.collegeId);
                    if (!college) return null;
                    const done = Object.values(e.checklist).filter(Boolean).length;
                    return (
                      <Link key={e.id} to={`/app/applications/${college.id}`} className="card card-pad-sm card-hover card-link">
                        <p className="t-xs w-600 clamp-2">{college.shortName ?? college.name}</p>
                        <p className="t-2xs faint mt-1">
                          {e.applicationRound ? `${e.applicationRound} · ` : ''}
                          {done}/{APPLICATION_TASKS.length} tasks
                        </p>
                        {e.decision ? (
                          <Badge tone={e.decision === 'accepted' ? 'ok' : e.decision === 'denied' ? 'danger' : 'warn'}>{e.decision}</Badge>
                        ) : null}
                      </Link>
                    );
                  })}
                  {!staged.length ? <p className="t-2xs faint">Nothing here.</p> : null}
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <Card pad="lg" className="mt-6">
          <p className="t-sm subtle ta-center">
            No colleges on your list yet.{' '}
            <Link to="/app/colleges/match" className="c-accent">
              Find matches
            </Link>{' '}
            and add a few — the application tracker fills in from there.
          </p>
        </Card>
      )}

      {decisions.length ? (
        <Card pad="md" className="mt-6">
          <SectionHeader title="Decisions" description="However these land, they are decisions about one application in one year — not a verdict on you." />
          <div className="col g-2">
            {decisions.map((e) => {
              const college = COLLEGE_BY_ID.get(e.collegeId);
              return (
                <div key={e.id} className="row between g-3 items-center">
                  <span className="t-sm">{college?.shortName ?? e.collegeId}</span>
                  <Badge tone={e.decision === 'accepted' ? 'ok' : e.decision === 'denied' ? 'danger' : 'warn'}>{e.decision}</Badge>
                </div>
              );
            })}
          </div>
        </Card>
      ) : null}

      <Notice tone="info" icon="info" className="mt-6">
        <span className="w-600">Completeness is not competitiveness.</span> {percent(overallProgress)} of the paperwork done tells you nothing
        about how the application reads. The parts that carry weight — the essay, the activity list, what your recommenders can say — take longer
        than the forms and cannot be rushed at the end.
      </Notice>

      <p className="t-2xs faint mt-4 row g-2">
        <Icon name="shield" size={12} className="mt-1 shrink-0" />
        <span>
          Pathway AI never submits anything on your behalf, never fills in an application form, and has no connection to the Common Application.
        </span>
      </p>
    </div>
  );
}
