import { useMemo } from 'react';
import { useEngine } from '@/store/useEngine';
import { useAppStore } from '@/store/useAppStore';
import { Badge, Button, Card, Notice } from '@/components/ui/primitives';
import { NavCard, PageHeader, SectionHeader, Stat, TimelineItem } from '@/components/ui/shared';
import { deadlineIntelligence, buildStudyPlan, nextBestActions } from '@/domain/engine/planning';
import { buildDailyBriefing } from '@/domain/engine/briefing';
import { countLabel, minutesLabel } from '@/lib/format';
import { formatDate, relativeDays, DAY_NAMES } from '@/lib/date';
import { Icon } from '@/components/ui/Icon';

/* Section 29 — planner home. */

const URGENCY_TONE: Record<string, 'danger' | 'warn' | 'accent' | 'default'> = {
  overdue: 'danger',
  critical: 'danger',
  soon: 'warn',
  upcoming: 'accent',
  distant: 'default',
};

export function PlannerHome() {
  const ctx = useEngine();
  const { state, updateDeadline } = useAppStore();

  const deadlines = useMemo(() => deadlineIntelligence(ctx), [ctx]);
  const plan = useMemo(() => buildStudyPlan(ctx), [ctx]);
  const actions = useMemo(() => nextBestActions(ctx, 5), [ctx]);
  const briefing = useMemo(() => buildDailyBriefing(ctx), [ctx]);

  const critical = deadlines.filter((d) => d.urgency === 'overdue' || d.urgency === 'critical');
  const thisWeek = state.calendarEvents.filter((e) => !e.done);
  const todayIndex = new Date().getDay();
  const todayBlocks = plan.blocks.filter((b) => b.day === todayIndex);

  return (
    <div className="page">
      <PageHeader
        eyebrow="Today"
        title="Planner"
        description="Deadlines, this week's study time and what is worth doing next — all of it derived from your own profile rather than a generic checklist."
        actions={
          <>
            <Button variant="ghost" icon="calendar" to="/app/planner/calendar">
              Calendar
            </Button>
            <Button variant="primary" icon="list" to="/app/planner/deadlines">
              Deadlines
            </Button>
          </>
        }
      />

      <div className="row g-5 wrap">
        <Stat label="Open deadlines" value={String(deadlines.length)} tone={critical.length ? 'var(--danger)' : undefined} />
        <Stat label="Study time planned" value={minutesLabel(plan.totalMinutes)} />
        <Stat label="Events this week" value={String(thisWeek.length)} />
        <Stat label="Colleges on your list" value={String(state.collegeList.length)} />
      </div>

      {critical.length ? (
        <Notice tone="danger" icon="alert" className="mt-4">
          <span className="w-600">
            {countLabel(critical.length, 'deadline')} {critical.length === 1 ? 'needs' : 'need'} attention now.
          </span>{' '}
          {critical[0].deadline.title} — {critical[0].message}
        </Notice>
      ) : null}

      <div className="grid-fit-lg mt-6">
        <NavCard to="/app/planner/deadlines" icon="flag" title="Deadlines" description="Everything with a date, ordered by urgency, with what is blocking each one." meta={deadlines.length ? <Badge tone={critical.length ? 'danger' : 'default'}>{deadlines.length}</Badge> : undefined} />
        <NavCard to="/app/planner/calendar" icon="calendar" title="Calendar" description="Your month, with deadlines, study blocks and anything you have added yourself." />
        <NavCard to="/app/planner/study-plan" icon="clock" title="Study plan" description="A weekly plan built from your real available hours and your measured weak areas." />
        <NavCard to="/app/planner/summer" icon="sun" title="Summer planning" description="What a summer can realistically be for, including the option of resting." />
      </div>

      <div className="split-aside mt-6">
        <div className="col g-4">
          {actions.length ? (
            <Card pad="md">
              <SectionHeader title="What to do next" description="Ranked by what would move your situation most, given where you are in the year." />
              <ol className="col g-3">
                {actions.map((a) => (
                  <li key={a.id} className="card card-pad-sm">
                    <div className="row between g-3 items-start wrap">
                      <div className="grow" style={{ minWidth: 0 }}>
                        <p className="t-sm w-600">{a.title}</p>
                        <p className="t-xs subtle mt-1">{a.summary}</p>
                      </div>
                      <Badge tone={a.priority === 'important' ? 'warn' : 'default'}>{a.priority}</Badge>
                    </div>
                    {a.route ? (
                      <Button size="sm" variant="ghost" to={a.route} iconRight="arrow-right" className="mt-3">
                        Go
                      </Button>
                    ) : null}
                  </li>
                ))}
              </ol>
            </Card>
          ) : null}

          {deadlines.length ? (
            <Card pad="md">
              <SectionHeader
                title="Coming up"
                description="Soonest first."
                action={
                  <Button size="sm" variant="ghost" to="/app/planner/deadlines" iconRight="arrow-right">
                    All deadlines
                  </Button>
                }
              />
              <ol className="col g-1" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {deadlines.slice(0, 6).map((d) => (
                  <TimelineItem
                    key={d.deadline.id}
                    title={
                      <span className="row g-2 items-center wrap">
                        <span>{d.deadline.title}</span>
                        <Badge tone={URGENCY_TONE[d.urgency]}>{d.urgency}</Badge>
                      </span>
                    }
                    state={d.urgency === 'overdue' ? 'late' : d.urgency === 'critical' ? 'warn' : 'default'}
                    meta={
                      <span className="row g-2 items-center">
                        <span className="t-2xs mono faint">
                          {formatDate(d.deadline.date)} · {relativeDays(d.daysAway)}
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          icon="check"
                          aria-label={`Mark ${d.deadline.title} done`}
                          onClick={() => updateDeadline(d.deadline.id, { done: true })}
                        />
                      </span>
                    }
                  >
                    <p className="t-xs subtle">{d.message}</p>
                    {d.blockers.length ? (
                      <ul className="col g-1 mt-2">
                        {d.blockers.map((b) => (
                          <li key={b} className="t-2xs c-warn">
                            • {b}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </TimelineItem>
                ))}
              </ol>
            </Card>
          ) : (
            <Card pad="lg">
              <p className="t-sm subtle ta-center">
                No deadlines tracked yet. Add colleges to your list or save a scholarship and their dates will appear here.
              </p>
            </Card>
          )}
        </div>

        <div className="col g-4">
          <Card pad="md">
            <p className="t-2xs eyebrow">{DAY_NAMES[todayIndex]}</p>
            <h3 className="t-sm w-600 mt-2">Today&rsquo;s study blocks</h3>
            {todayBlocks.length ? (
              <div className="col g-3 mt-3">
                {todayBlocks.map((b, i) => (
                  <div key={`${b.scope}-${i}`} className="col g-1">
                    <span className="row between g-2">
                      <span className="t-xs w-600">{b.scope}</span>
                      <span className="t-2xs mono faint">{minutesLabel(b.minutes)}</span>
                    </span>
                    <span className="t-2xs subtle">{b.focus}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="t-xs subtle mt-3">Nothing planned for today. Rest days are part of a sustainable plan, not a failure of one.</p>
            )}
            <Button size="sm" variant="ghost" to="/app/planner/study-plan" iconRight="arrow-right" className="mt-4">
              Full week
            </Button>
          </Card>

          <Card pad="md">
            <p className="t-2xs eyebrow">Today&rsquo;s briefing</p>
            <p className="t-sm w-600 mt-2">{briefing.greeting}</p>
            {briefing.priorities.length ? (
              <div className="col g-2 mt-3">
                {briefing.priorities.slice(0, 4).map((pr) => (
                  <div key={pr.label} className="row g-2 t-xs">
                    <Icon name="chevron-right" size={12} className="mt-1 shrink-0 subtle" />
                    <span className="subtle">
                      <span className="w-600">{pr.label}</span> — {pr.detail}
                      {pr.minutes ? <span className="faint"> ({minutesLabel(pr.minutes)})</span> : null}
                    </span>
                  </div>
                ))}
              </div>
            ) : null}
            <p className="t-2xs faint mt-3">{briefing.oneThingToKnow.text}</p>
            <Button size="sm" variant="ghost" to={briefing.recommendedAction.route} iconRight="arrow-right" className="mt-3">
              {briefing.recommendedAction.label}
            </Button>
          </Card>

          <Card pad="md">
            <p className="t-2xs eyebrow">A note on planning</p>
            <p className="t-xs subtle mt-2">
              A plan you cannot follow is worse than no plan, because it turns every week into evidence that you are behind. If this one is
              consistently unrealistic, lower the hours in your profile rather than resolving to try harder.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
