import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useEngine } from '@/store/useEngine';
import { useAppStore } from '@/store/useAppStore';
import { Badge, Button, Card, SearchInput, Tabs } from '@/components/ui/primitives';
import { NavCard, PageHeader, SectionHeader } from '@/components/ui/shared';
import { DemoDataBanner } from '@/components/ui/Provenance';
import { ProgressRing } from '@/components/charts';
import { AP_COURSES, AP_COURSE_BY_ID, AP_FAMILIES, AP_UNIT_COUNT, resolveAPCourse, resolveAPCourses } from '@/data/ap';
import { MAJOR_BY_ID } from '@/data/majors';
import { buildAPPlan } from '@/domain/engine/apPlanner';
import { apStats } from '@/domain/engine/practice';
import { AP_QUESTIONS } from '@/data/questions';
import { searchItems } from '@/lib/search';
import { countLabel, percent } from '@/lib/format';
import { Icon } from '@/components/ui/Icon';

/* Sections 16–18 — AP Center home. */

export function APHome() {
  const ctx = useEngine();
  const { state } = useAppStore();
  const [tab, setTab] = useState('yours');
  const [query, setQuery] = useState('');
  const [family, setFamily] = useState('all');
  const [relevantOnly, setRelevantOnly] = useState(false);

  const plan = useMemo(() => buildAPPlan(ctx), [ctx]);
  const stats = useMemo(() => apStats(ctx), [ctx]);

  // Students type course names, not catalog ids, so resolve both.
  const enrolled = resolveAPCourses(state.profile.academics.currentCourses);
  const previous = resolveAPCourses(state.profile.academics.previousCourses);

  const relevantIds = useMemo(() => {
    const ids = new Set<string>();
    for (const id of ctx.majorIds) {
      const major = MAJOR_BY_ID.get(id);
      major?.recommendedAP.forEach((a) => ids.add(a));
      major?.usefulAP.forEach((a) => ids.add(a));
    }
    return ids;
  }, [ctx.majorIds]);

  const browse = useMemo(() => {
    let pool = AP_COURSES;
    if (family !== 'all') pool = pool.filter((c) => c.family === family);
    if (relevantOnly) pool = pool.filter((c) => relevantIds.has(c.id));
    if (!query.trim()) return pool;
    return searchItems(query, pool, [
      { get: (c) => c.name, weight: 1 },
      { get: (c) => c.family, weight: 0.6 },
      { get: (c) => c.summary, weight: 0.4 },
      { get: (c) => c.units.map((u) => u.title), weight: 0.5 },
    ]).map((r) => r.item);
  }, [query, family, relevantOnly, relevantIds]);

  const unitProgress = state.apUnitProgress;

  return (
    <div className="page">
      <PageHeader
        eyebrow="Academics"
        title="AP Center"
        description="A plan for which AP courses genuinely serve your direction, unit-by-unit content for the ones you are taking, and original practice questions with worked explanations."
        actions={
          <>
            <Button variant="ghost" icon="chart" to="/app/ap/weak-areas">
              Weak areas
            </Button>
            <Button variant="primary" icon="compass" to="/app/ap/plan">
              My AP plan
            </Button>
          </>
        }
      />

      <div className="grid-fit-lg">
        <NavCard to="/app/ap/plan" icon="compass" title="AP plan" description="Which courses to take, in which grade, with an honest readiness read and a workload ceiling." />
        <NavCard to="/app/ap/bank" icon="list" title="Question bank" description={`${countLabel(AP_QUESTIONS.length, 'original practice question')} across the courses in this build.`} />
        <NavCard to="/app/ap/weak-areas" icon="target" title="Weak areas" description="Where your practice actually breaks down, with the attempts that show it." />
      </div>

      <div className="mt-6">
        <Tabs
          ariaLabel="AP Center sections"
          active={tab}
          onChange={setTab}
          items={[
            { id: 'yours', label: 'Your courses', count: enrolled.length },
            { id: 'browse', label: 'All AP courses', count: AP_COURSES.length },
            { id: 'plan', label: 'Recommended', count: Object.values(plan.byGrade).flat().length },
          ]}
        />
      </div>

      {tab === 'yours' ? (
        <div className="col g-4 mt-4">
          {enrolled.length ? (
            <div className="grid-fit">
              {enrolled.map((course) => {
                const progressEntries = course.units.map((u) => unitProgress[`${course.id}:${u.id}`] ?? 0);
                const avg = progressEntries.length ? Math.round(progressEntries.reduce((a, b) => a + b, 0) / progressEntries.length) : 0;
                const courseStats = apStats(ctx, course.id);
                return (
                  <Card key={course.id} pad="md" hover>
                    <div className="row between g-3 items-start">
                      <div style={{ minWidth: 0 }}>
                        <Link to={`/app/ap/course/${course.id}`} className="t-sm w-600" style={{ color: 'inherit', textDecoration: 'none' }}>
                          {course.name}
                        </Link>
                        <p className="t-2xs subtle mt-1">{countLabel(course.units.length, 'unit')}</p>
                      </div>
                      <ProgressRing value={avg} size={46} stroke={5} label={`${avg}%`} ariaLabel={`${avg} percent of units marked covered`} />
                    </div>
                    <p className="t-2xs faint mt-3">
                      {courseStats.total ? `${countLabel(courseStats.total, 'practice question')} answered` : 'No practice attempts yet'}
                    </p>
                    <div className="row g-2 mt-4">
                      <Button size="sm" variant="ghost" to={`/app/ap/course/${course.id}`}>
                        Units
                      </Button>
                      <Button size="sm" to={`/app/ap/study/${course.id}`} icon="play">
                        Study
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card pad="lg">
              <p className="t-sm subtle ta-center">
                You have not listed any AP courses for this year.{' '}
                <Link to="/app/settings/profile" className="c-accent">
                  Add your current courses
                </Link>{' '}
                and study tools will appear here. If your school offers no APs, that is genuinely fine — colleges read your record against what
                was available to you.
              </p>
            </Card>
          )}

          {previous.length ? (
            <Card pad="md">
              <p className="t-2xs eyebrow">Already completed</p>
              <div className="row g-2 mt-2 wrap">
                {previous.map((course) => (
                  <Link key={course.id} to={`/app/ap/course/${course.id}`} className="chip chip-sm">
                    {course.name}
                  </Link>
                ))}
              </div>
            </Card>
          ) : null}

          {stats.total ? (
            <Card pad="md">
              <SectionHeader
                title="Your AP practice so far"
                description="Across every AP question you have answered in this app."
                action={
                  <Button size="sm" variant="ghost" to="/app/ap/weak-areas" iconRight="arrow-right">
                    Full breakdown
                  </Button>
                }
              />
              <div className="col g-2">
                {stats.byCourse.slice(0, 5).map((s) => (
                  <div key={s.key} className="row between g-3 t-sm">
                    <span className="subtle">{s.label}</span>
                    <span className="mono">
                      {s.correct}/{s.attempted} · {percent(s.accuracy)}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          ) : null}
        </div>
      ) : null}

      {tab === 'browse' ? (
        <div className="col g-4 mt-4">
          <DemoDataBanner what="AP course structures, unit lists and exam formats" />
          <Card pad="md">
            <div className="row g-3 wrap items-end">
              <SearchInput value={query} onChange={setQuery} label="Search AP courses" placeholder="Search by course or unit…" />
              <select className="select" style={{ maxWidth: 220 }} value={family} onChange={(e) => setFamily(e.target.value)} aria-label="Subject family">
                <option value="all">All subjects</option>
                {AP_FAMILIES.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
              {relevantIds.size ? (
                <button type="button" className="chip chip-sm" aria-pressed={relevantOnly} onClick={() => setRelevantOnly((v) => !v)}>
                  Relevant to my direction
                </button>
              ) : null}
            </div>
          </Card>

          <p className="t-xs subtle">
            {countLabel(browse.length, 'course')} shown · {AP_UNIT_COUNT} units in this catalog.
          </p>

          <div className="grid-fit">
            {browse.map((c) => {
              const isEnrolled = enrolled.some((e) => e.id === c.id);
              const isRelevant = relevantIds.has(c.id);
              const offered =
                state.profile.academics.schoolOffersAP.length === 0 ||
                state.profile.academics.schoolOffersAP.some((o) => resolveAPCourse(o)?.id === c.id);
              return (
                <Link key={c.id} to={`/app/ap/course/${c.id}`} className="card card-pad card-hover card-link">
                  <div className="row between g-2 items-start">
                    <h3 className="t-sm w-600">{c.name}</h3>
                    {isEnrolled ? <Badge tone="ok">Taking</Badge> : isRelevant ? <Badge tone="accent">Relevant</Badge> : null}
                  </div>
                  <p className="t-2xs eyebrow mt-1">{c.family}</p>
                  <p className="t-xs subtle mt-3 clamp-3">{c.summary}</p>
                  <div className="row g-3 mt-4 t-2xs faint wrap">
                    <span>{countLabel(c.units.length, 'unit')}</span>
                    <span>Workload {c.workload}/5</span>
                    {!offered ? <span className="c-warn">Not offered at your school</span> : null}
                  </div>
                </Link>
              );
            })}
          </div>

          {!browse.length ? (
            <Card pad="lg">
              <p className="t-sm subtle ta-center">
                Nothing matched.{' '}
                <button type="button" className="c-accent" onClick={() => { setQuery(''); setFamily('all'); setRelevantOnly(false); }}>
                  Clear the filters
                </button>
              </p>
            </Card>
          ) : null}
        </div>
      ) : null}

      {tab === 'plan' ? (
        <div className="col g-4 mt-4">
          <Card pad="md">
            <SectionHeader
              title="What the planner recommends"
              description="A summary. The full plan explains each choice, checks readiness honestly and caps the load per year."
              action={
                <Button size="sm" variant="ghost" to="/app/ap/plan" iconRight="arrow-right">
                  Open the plan
                </Button>
              }
            />
            {Object.entries(plan.byGrade).map(([grade, items]) => (
              <div key={grade} className="mb-4">
                <p className="t-2xs eyebrow mb-2">Grade {grade}</p>
                <div className="row g-2 wrap">
                  {items.map((i) => (
                    <Link key={i.courseId} to={`/app/ap/course/${i.courseId}`} className="chip chip-sm">
                      {AP_COURSE_BY_ID.get(i.courseId)?.name ?? i.courseId}
                      {i.tier === 'recommended' ? ' ★' : ''}
                    </Link>
                  ))}
                  {!items.length ? <span className="t-xs faint">Nothing recommended for this year.</span> : null}
                </div>
              </div>
            ))}
            {plan.warnings.length ? (
              <p className="t-xs c-warn mt-2">
                <Icon name="alert" size={12} /> {plan.warnings[0]}
              </p>
            ) : null}
          </Card>
        </div>
      ) : null}
    </div>
  );
}
