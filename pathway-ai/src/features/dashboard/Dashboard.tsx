import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useEngine } from '@/store/useEngine';
import { useAppStore } from '@/store/useAppStore';
import { Badge, Button, Card, EmptyState } from '@/components/ui/primitives';
import { Icon } from '@/components/ui/Icon';
import { ExplainCard, PageHeader, PriorityBadge, SectionHeader } from '@/components/ui/shared';
import { ProgressRing, Sparkline } from '@/components/charts';
import { buildDailyBriefing } from '@/domain/engine/briefing';
import { nextBestActions, deadlineIntelligence } from '@/domain/engine/planning';
import { findOpportunities } from '@/domain/engine/opportunities';
import { satStats } from '@/domain/engine/practice';
import { currentStreak, computeAchievements } from '@/domain/engine/achievements';
import { buildStudentDNA } from '@/domain/engine/dna';
import { MAJOR_BY_ID } from '@/data/majors';
import { COLLEGE_BY_ID } from '@/data/colleges';
import { AP_COURSE_BY_ID } from '@/data/ap';
import { formatDate, relativeDays } from '@/lib/date';
import { countLabel, listJoin, percent } from '@/lib/format';
import { AIGuidanceNote } from '@/components/ui/Provenance';
import { AskBox } from '@/features/counselor/AskBox';

/* ==========================================================================
   Home — section 71
   Answers, in order: where am I, what should I do next, what is coming up,
   what opportunities exist, and how am I progressing.
   ========================================================================== */

export default function Dashboard() {
  const ctx = useEngine();
  const { state, updateCalendarEvent } = useAppStore();

  const briefing = useMemo(() => buildDailyBriefing(ctx), [ctx]);
  const actions = useMemo(() => nextBestActions(ctx, 5), [ctx]);
  const deadlines = useMemo(() => deadlineIntelligence(ctx).filter((d) => d.daysAway >= -7).slice(0, 5), [ctx]);
  const opportunities = useMemo(() => findOpportunities(ctx, {}, 3), [ctx]);
  const sat = useMemo(() => satStats(ctx), [ctx]);
  const dna = useMemo(() => buildStudentDNA(ctx), [ctx]);
  const streak = currentStreak(ctx);
  const achievements = useMemo(() => computeAchievements(ctx).filter((a) => a.earnedAt), [ctx]);

  const weekEvents = state.calendarEvents.filter((e) => e.date >= ctx.today).slice(0, 4);
  const goals = state.profile.goals.personalGoals;

  const apProgress = useMemo(() => {
    const entries = Object.entries(state.apUnitProgress);
    if (!entries.length) return undefined;
    const byCourse = new Map<string, { done: number; total: number }>();
    for (const [key, pct] of entries) {
      const [courseId] = key.split(':');
      const course = AP_COURSE_BY_ID.get(courseId);
      if (!course) continue;
      const entry = byCourse.get(courseId) ?? { done: 0, total: course.units.length };
      if (pct >= 100) entry.done += 1;
      byCourse.set(courseId, entry);
    }
    return Array.from(byCourse.entries()).map(([id, v]) => ({
      id,
      name: AP_COURSE_BY_ID.get(id)?.name ?? id,
      pct: Math.round((v.done / v.total) * 100),
      done: v.done,
      total: v.total,
    }));
  }, [state.apUnitProgress]);

  const satTrend = state.satScores.map((s) => s.total);

  return (
    <div className="page">
      <PageHeader
        eyebrow={formatDate(ctx.today, 'day')}
        title={briefing.greeting}
        description={
          ctx.majorIds.length
            ? `Working toward ${listJoin(ctx.majorIds.map((m) => MAJOR_BY_ID.get(m)?.name ?? m))} · Class of ${state.profile.academics.graduationYear}`
            : `Grade ${ctx.grade} · Class of ${state.profile.academics.graduationYear} · No major named yet`
        }
        actions={
          <>
            <Button icon="compass" to="/app/path/blind-spots">
              Find my blind spots
            </Button>
            <Button variant="primary" icon="sparkles" to="/app/counselor">
              Ask Pathway AI
            </Button>
          </>
        }
      />

      {/* ------------------------------------------------ Today's priorities */}
      <div className="grid" style={{ gridTemplateColumns: 'minmax(0, 1.55fr) minmax(0, 1fr)', gap: 'var(--s-5)' }}>
        <div className="col g-5" style={{ minWidth: 0 }}>
          <Card pad="none">
            <div className="card-head">
              <div className="row g-2">
                <Icon name="sun" size={16} className="c-warn" />
                <span className="w-600 t-sm">Today&rsquo;s priorities</span>
              </div>
              <Badge tone="ai" dot>
                AI
              </Badge>
            </div>
            <div className="card-body col g-3">
              {briefing.priorities.map((p, i) => (
                <div className="row-top g-3" key={i}>
                  <span
                    className="badge badge-accent shrink-0 mono"
                    style={{ minWidth: 22, justifyContent: 'center', marginTop: 2 }}
                  >
                    {i + 1}
                  </span>
                  <div className="grow">
                    <div className="row g-2 wrap items-baseline">
                      {p.route ? (
                        <Link to={p.route} className="t-sm w-600" style={{ color: 'inherit' }}>
                          {p.label}
                        </Link>
                      ) : (
                        <span className="t-sm w-600">{p.label}</span>
                      )}
                      {p.minutes ? <span className="t-2xs faint mono">{p.minutes} min</span> : null}
                    </div>
                    <p className="t-xs subtle mt-1">{p.detail}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="card-foot">
              <Button size="sm" variant="soft" to={briefing.recommendedAction.route} iconRight="arrow-right">
                {briefing.recommendedAction.label}
              </Button>
            </div>
          </Card>

          {/* ------------------------------------------------- Next actions */}
          <div>
            <SectionHeader
              title="Next best actions"
              description="Ordered by what matters most right now, with the reasoning behind each one."
              action={
                <Button size="sm" variant="ghost" to="/app/path/blind-spots" iconRight="arrow-right">
                  See all
                </Button>
              }
            />
            {actions.length ? (
              <div className="col g-3 stagger">
                {actions.map((a) => (
                  <Card key={a.id} pad="md">
                    <div className="row between g-3 items-start">
                      <div className="grow">
                        <div className="row g-2 wrap items-center">
                          <PriorityBadge priority={a.priority} />
                          <span className="t-sm w-600">{a.title}</span>
                        </div>
                        <p className="t-sm muted mt-2">{a.summary}</p>
                      </div>
                      {a.route ? (
                        <Button size="sm" variant="soft" to={a.route} iconRight="chevron-right">
                          Open
                        </Button>
                      ) : null}
                    </div>
                    <div className="mt-3">
                      <ExplainCard explanation={a.explanation} />
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <EmptyState
                icon="check"
                title="Nothing needs your attention"
                description="That is a real answer. We would rather say nothing than invent work for you."
                small
              />
            )}
          </div>

          {/* --------------------------------------------- Opportunity radar */}
          <div>
            <SectionHeader
              title="Opportunity radar"
              description="Filtered by your grade, time, budget and location — not a list of everything that exists."
              action={
                <Button size="sm" variant="ghost" to="/app/activities" iconRight="arrow-right">
                  Find more
                </Button>
              }
            />
            <div className="grid-fit">
              {opportunities.map((o) => (
                <Card key={o.opportunity.id} pad="md" hover>
                  <div className="row between g-2 items-start">
                    <Badge>{o.opportunity.category.replace('-', ' ')}</Badge>
                    <Badge tone={o.opportunity.cost === 'free' || o.opportunity.cost === 'stipend' ? 'ok' : 'default'}>
                      {o.opportunity.cost === 'stipend' ? 'Paid' : o.opportunity.cost}
                    </Badge>
                  </div>
                  <h3 className="t-sm w-600 mt-3">{o.opportunity.name}</h3>
                  <p className="t-xs subtle mt-2 clamp-2">{o.reasons[0] ?? o.opportunity.description}</p>
                  {o.blockers.length ? (
                    <p className="t-2xs c-warn mt-2 clamp-2">{o.blockers[0]}</p>
                  ) : null}
                  <Button size="sm" variant="ghost" to="/app/activities" className="mt-3" iconRight="chevron-right">
                    Details
                  </Button>
                </Card>
              ))}
            </div>
          </div>
        </div>

        {/* ------------------------------------------------------- Side rail */}
        <aside className="col g-5" style={{ minWidth: 0 }}>
          <Card pad="md">
            <SectionHeader title="Your goal" />
            <div className="col g-3">
              <div className="row g-3">
                <ProgressRing
                  value={Math.min(100, ((12 - ctx.gradesRemaining + 1) / 4) * 100)}
                  size={54}
                  label={`G${ctx.grade}`}
                  ariaLabel={`Grade ${ctx.grade} of 12`}
                />
                <div className="col grow">
                  <span className="t-sm w-600">
                    {ctx.majorIds.length ? MAJOR_BY_ID.get(ctx.majorIds[0])?.name : 'Major undecided'}
                  </span>
                  <span className="t-xs subtle">
                    Class of {state.profile.academics.graduationYear} · {countLabel(ctx.gradesRemaining, 'year')} left
                  </span>
                </div>
              </div>
              {state.profile.goals.idealExperience ? (
                <p className="t-xs muted italic clamp-4" style={{ borderLeft: '2px solid var(--border)', paddingLeft: 'var(--s-3)' }}>
                  &ldquo;{state.profile.goals.idealExperience}&rdquo;
                </p>
              ) : (
                <Link to="/app/settings/profile" className="t-xs">
                  Describe what you want from college →
                </Link>
              )}
            </div>
          </Card>

          <Card pad="none">
            <div className="card-head">
              <span className="w-600 t-sm">Coming up</span>
              <Link to="/app/planner/deadlines" className="t-xs">
                All deadlines
              </Link>
            </div>
            <div className="card-body col g-3">
              {deadlines.length ? (
                deadlines.map((d) => (
                  <div key={d.deadline.id} className="row-top g-3">
                    <span
                      className={`badge shrink-0 mono ${
                        d.urgency === 'overdue' || d.urgency === 'critical' ? 'badge-danger' : d.urgency === 'soon' ? 'badge-warn' : ''
                      }`}
                      style={{ minWidth: 52, justifyContent: 'center' }}
                    >
                      {d.daysAway < 0 ? 'past' : `${d.daysAway}d`}
                    </span>
                    <div className="grow">
                      <p className="t-sm w-500">{d.deadline.title}</p>
                      <p className="t-2xs subtle">{formatDate(d.deadline.date, 'short')} · {d.deadline.category.replace('-', ' ')}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="t-sm subtle">
                  No deadlines tracked yet.{' '}
                  <Link to="/app/planner/deadlines">Add your first</Link>.
                </p>
              )}
            </div>
          </Card>

          <Card pad="md">
            <SectionHeader title="Progress" />
            <div className="col g-4">
              <div className="col g-2">
                <div className="row between t-xs">
                  <span className="w-500">SAT practice</span>
                  <span className="mono subtle">{sat.total ? `${percent(sat.accuracy)} · ${sat.total} questions` : 'Not started'}</span>
                </div>
                <div className="bar">
                  <div className="bar-fill" style={{ width: `${Math.min(100, (sat.total / 120) * 100)}%` }} />
                </div>
                {satTrend.length >= 2 ? (
                  <div className="row g-2 items-center">
                    <Sparkline values={satTrend} />
                    <span className="t-2xs faint mono">
                      {satTrend[0]} → {satTrend[satTrend.length - 1]}
                    </span>
                  </div>
                ) : null}
              </div>

              {apProgress?.slice(0, 3).map((c) => (
                <div className="col g-2" key={c.id}>
                  <div className="row between t-xs">
                    <span className="w-500 truncate">{c.name}</span>
                    <span className="mono subtle shrink-0">
                      {c.done}/{c.total} units
                    </span>
                  </div>
                  <div className="bar">
                    <div className="bar-fill is-ok" style={{ width: `${c.pct}%` }} />
                  </div>
                </div>
              ))}

              <div className="col g-2">
                <div className="row between t-xs">
                  <span className="w-500">College research</span>
                  <span className="mono subtle">{countLabel(state.collegeList.length, 'college')}</span>
                </div>
                <div className="bar">
                  <div className="bar-fill is-info" style={{ width: `${Math.min(100, (state.collegeList.length / 10) * 100)}%` }} />
                </div>
              </div>

              <div className="row between items-center">
                <div className="col">
                  <span className="t-xs w-500">Study streak</span>
                  <span className="t-2xs subtle">{countLabel(streak, 'day')} in a row</span>
                </div>
                <div className="streak" aria-label={`${streak} day streak`}>
                  {Array.from({ length: 7 }).map((_, i) => (
                    <span key={i} className={`streak-day${i < Math.min(streak, 7) ? ' is-on' : ''}`} />
                  ))}
                </div>
              </div>
            </div>
          </Card>

          {goals.length ? (
            <Card pad="md">
              <SectionHeader title="Your goals" />
              <ul className="col g-2">
                {goals.slice(0, 4).map((g) => (
                  <li key={g.id} className="row-top g-2 t-sm">
                    <Icon name={g.done ? 'check' : 'target'} size={14} className={g.done ? 'c-ok' : 'subtle'} style={{ marginTop: 3 }} />
                    <span className={g.done ? 'subtle strike' : ''}>{g.text}</span>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}

          {achievements.length ? (
            <Card pad="md">
              <SectionHeader
                title="Recent achievements"
                action={
                  <Link to="/app/path/achievements" className="t-xs">
                    All
                  </Link>
                }
              />
              <div className="tag-list">
                {achievements.slice(-4).map((a) => (
                  <span key={a.id} className="badge badge-ok" title={a.description}>
                    <Icon name="trophy" size={11} /> {a.name}
                  </span>
                ))}
              </div>
            </Card>
          ) : null}
        </aside>
      </div>

      {/* --------------------------------------------------- One thing / ask */}
      <div className="grid-2 mt-6">
        <Card pad="md">
          <div className="row g-2 mb-3">
            <Icon name="lightbulb" size={16} className="c-warn" />
            <span className="eyebrow">One thing to know</span>
          </div>
          <p className="t-sm">{briefing.oneThingToKnow.text}</p>
          {briefing.oneThingToKnow.source?.url ? (
            <a
              className="t-2xs row g-1 mt-3"
              href={briefing.oneThingToKnow.source.url}
              target="_blank"
              rel="noreferrer noopener"
            >
              {briefing.oneThingToKnow.source.label}
              {briefing.oneThingToKnow.source.publisher ? ` — ${briefing.oneThingToKnow.source.publisher}` : ''}
              <Icon name="external" size={10} />
            </a>
          ) : null}
        </Card>

        <Card pad="md">
          <div className="row g-2 mb-3">
            <Icon name="brain" size={16} className="c-ai" />
            <span className="eyebrow">Your profile right now</span>
          </div>
          {dna.academicStrengths.slice(0, 3).map((s) => (
            <div key={s.subject} className="row between t-sm mt-2">
              <span>{s.subject}</span>
              <Badge tone={s.band === 'very-strong' ? 'ok' : s.band === 'strong' ? 'accent' : 'default'}>
                {s.band.replace('-', ' ')}
              </Badge>
            </div>
          ))}
          {dna.missingInputs.length ? (
            <p className="t-xs c-warn mt-4">
              Still missing: {dna.missingInputs.slice(0, 2).join('; ')}
            </p>
          ) : null}
          <Button size="sm" variant="ghost" to="/app/path/dna" className="mt-4" iconRight="arrow-right">
            Open your Student DNA
          </Button>
        </Card>
      </div>

      {weekEvents.length ? (
        <div className="mt-6">
          <SectionHeader
            title="This week"
            action={
              <Link to="/app/planner/calendar" className="t-xs">
                Full calendar
              </Link>
            }
          />
          <div className="grid-fit">
            {weekEvents.map((e) => (
              <Card key={e.id} pad="sm">
                <div className="row between g-2">
                  <div className="col grow">
                    <span className="t-sm w-500">{e.title}</span>
                    <span className="t-2xs subtle">
                      {formatDate(e.date, 'day')}
                      {e.minutes ? ` · ${e.minutes} min` : ''}
                    </span>
                  </div>
                  <Button
                    size="xs"
                    variant={e.done ? 'soft' : 'ghost'}
                    icon="check"
                    onClick={() => updateCalendarEvent(e.id, { done: !e.done })}
                    aria-label={e.done ? 'Mark not done' : 'Mark done'}
                  />
                </div>
              </Card>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-8">
        <SectionHeader title="Ask Pathway AI" description="It answers from your profile, not in general." />
        <AskBox />
      </div>

      <div className="mt-6">
        <AIGuidanceNote />
      </div>

      {state.collegeList.length ? (
        <div className="mt-6">
          <SectionHeader
            title="Your college list"
            action={
              <Link to="/app/colleges/list" className="t-xs">
                Manage list
              </Link>
            }
          />
          <div className="scroll-x">
            {state.collegeList.slice(0, 8).map((entry) => {
              const college = COLLEGE_BY_ID.get(entry.collegeId);
              if (!college) return null;
              return (
                <Link key={entry.id} to={`/app/colleges/${college.id}`} className="card card-pad-sm card-hover card-link" style={{ width: 210 }}>
                  <p className="t-sm w-600 clamp-1">{college.shortName ?? college.name}</p>
                  <p className="t-2xs subtle">{college.city}, {college.state}</p>
                  <Badge className="mt-3">{entry.stage.replace('-', ' ')}</Badge>
                </Link>
              );
            })}
          </div>
        </div>
      ) : null}

      {briefing.oneDeadline ? (
        <p className="t-xs subtle mt-8">
          Next deadline: <strong>{briefing.oneDeadline.title}</strong> {relativeDays(briefing.oneDeadline.daysAway)}.
        </p>
      ) : null}
    </div>
  );
}
