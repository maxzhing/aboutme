import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useEngine } from '@/store/useEngine';
import { useAppStore } from '@/store/useAppStore';
import { Badge, Button, Card, Notice } from '@/components/ui/primitives';
import { ExplainCard, PageHeader, SectionHeader, FeedbackButtons } from '@/components/ui/shared';
import { AIGuidanceNote } from '@/components/ui/Provenance';
import { BarChart } from '@/components/charts';
import { AP_COURSE_BY_ID, resolveAPCourse, resolveAPCourses } from '@/data/ap';
import { MAJOR_BY_ID } from '@/data/majors';
import { buildAPPlan } from '@/domain/engine/apPlanner';
import { printPDF } from '@/lib/export';
import { countLabel } from '@/lib/format';
import { Icon } from '@/components/ui/Icon';
import type { APPlanItem } from '@/domain/types';

/* Section 17 — the AP plan, with readiness stated honestly. */

const TIER_TONE: Record<APPlanItem['tier'], 'ok' | 'accent' | 'default'> = {
  recommended: 'ok',
  useful: 'accent',
  optional: 'default',
  'not-necessary': 'default',
};

const TIER_LABEL: Record<APPlanItem['tier'], string> = {
  recommended: 'Builds real foundations',
  useful: 'Useful',
  optional: 'Optional',
  'not-necessary': 'Not necessary for your direction',
};

const READINESS_TONE: Record<APPlanItem['readiness'], 'ok' | 'accent' | 'warn' | 'default'> = {
  ready: 'ok',
  'likely-ready': 'accent',
  'build-first': 'warn',
  unknown: 'default',
};

export function APPlanPage() {
  const ctx = useEngine();
  const { state, updateProfile, recordFeedback, toast } = useAppStore();
  const plan = useMemo(() => buildAPPlan(ctx), [ctx]);

  const grades = Object.keys(plan.byGrade)
    .map(Number)
    .sort((a, b) => a - b);

  const loadData = grades.map((g) => ({
    label: `Grade ${g}`,
    value: plan.loadByGrade[g] ?? 0,
    tone: (plan.loadByGrade[g] ?? 0) > 11 ? 'var(--warn)' : 'var(--accent)',
    note: `${countLabel(plan.byGrade[g]?.length ?? 0, 'course')}`,
  }));

  const majorNames = ctx.majorIds.map((m) => MAJOR_BY_ID.get(m)?.name ?? m);

  const takingIds = new Set(resolveAPCourses(state.profile.academics.currentCourses).map((c) => c.id));

  function addToSchedule(courseId: string) {
    updateProfile((p) => {
      const already = p.academics.currentCourses.some((c) => resolveAPCourse(c)?.id === courseId);
      if (!already) p.academics.currentCourses.push(courseId);
    });
    toast(`${AP_COURSE_BY_ID.get(courseId)?.name} added to this year's courses.`, 'ok');
  }

  return (
    <div className="page">
      <PageHeader
        eyebrow="AP Center"
        title="Your AP plan"
        description={
          majorNames.length
            ? `Built around ${majorNames.join(' and ')}, the courses your school offers, and the workload you said you could carry.`
            : 'Built to keep your options open, since you have not named a direction yet. Naming one will sharpen this considerably.'
        }
        back={{ to: '/app/ap', label: 'AP Center' }}
        actions={
          <>
            <Button variant="ghost" icon="download" onClick={printPDF}>
              Print / PDF
            </Button>
            <Button variant="ghost" icon="calendar" to="/app/path/four-year">
              Four-year view
            </Button>
          </>
        }
      />

      <AIGuidanceNote>
        This is generated guidance, not a school-approved schedule. Your counselor knows things this app does not — prerequisites at your school,
        teacher availability, graduation requirements and how your schedule actually fits together. Take it to them.
      </AIGuidanceNote>

      {plan.warnings.length ? (
        <div className="col g-2 mt-4">
          {plan.warnings.map((w) => (
            <Notice key={w} tone="warn" icon="alert">
              {w}
            </Notice>
          ))}
        </div>
      ) : null}

      {loadData.length ? (
        <Card pad="md" className="mt-4">
          <SectionHeader
            title="Workload across the years"
            description="Sum of the per-course workload ratings. A high bar is a warning, not an achievement — grades that slip under an overloaded schedule cost more than the extra course adds."
          />
          <BarChart data={loadData} ariaLabel="Planned AP workload per grade" unit="" format={(n: number) => `${n} pts`} maxValue={15} />
        </Card>
      ) : null}

      <div className="col g-6 mt-6">
        {grades.map((grade) => {
          const items = plan.byGrade[grade] ?? [];
          const load = plan.loadByGrade[grade] ?? 0;
          return (
            <section key={grade}>
              <SectionHeader
                title={`Grade ${grade}`}
                description={
                  items.length
                    ? `${countLabel(items.length, 'course')} · workload ${load}${load > 11 ? ' — above what you said you could carry' : ''}`
                    : 'Nothing strongly indicated for this year.'
                }
              />
              {items.length ? (
                <div className="col g-3">
                  {items.map((item) => {
                    const course = AP_COURSE_BY_ID.get(item.courseId);
                    if (!course) return null;
                    const taking = takingIds.has(course.id);
                    return (
                      <Card key={item.courseId} pad="md" hover>
                        <div className="row between g-3 items-start wrap">
                          <div className="grow" style={{ minWidth: 0 }}>
                            <div className="row g-2 items-center wrap">
                              <Link to={`/app/ap/course/${course.id}`} className="t-md w-600" style={{ color: 'inherit', textDecoration: 'none' }}>
                                {course.name}
                              </Link>
                              <Badge tone={TIER_TONE[item.tier]}>{TIER_LABEL[item.tier]}</Badge>
                              <Badge tone={READINESS_TONE[item.readiness]}>{item.readiness.replace(/-/g, ' ')}</Badge>
                            </div>
                            <p className="t-2xs subtle mt-1">
                              {course.family} · workload {course.workload}/5 · {countLabel(course.units.length, 'unit')}
                            </p>
                          </div>
                          <div className="row g-2">
                            {taking ? (
                              <Badge tone="ok">On your schedule</Badge>
                            ) : grade === ctx.grade ? (
                              <Button size="sm" icon="plus" onClick={() => addToSchedule(course.id)}>
                                Add to my courses
                              </Button>
                            ) : null}
                            <Button size="sm" variant="ghost" to={`/app/ap/course/${course.id}`} iconRight="chevron-right">
                              Open
                            </Button>
                          </div>
                        </div>

                        <p className="t-sm muted mt-3">{item.readinessNote}</p>

                        <div className="mt-4">
                          <ExplainCard explanation={item.explanation} />
                        </div>

                        <div className="row end mt-3">
                          <FeedbackButtons
                            compact
                            onFeedback={(kind) => {
                              recordFeedback({ targetType: 'ap-course', targetId: course.id, kind });
                              toast(kind === 'not-interested' ? 'Noted — it will drop out of your plan.' : 'Thanks, that sharpens the plan.', 'default');
                            }}
                          />
                        </div>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <Card pad="md">
                  <p className="t-sm subtle">
                    No AP courses are strongly indicated for this year. That is a legitimate plan — a lighter year with strong grades and a
                    serious project outside class reads better than five APs and a slipping transcript.
                  </p>
                </Card>
              )}
            </section>
          );
        })}
      </div>

      {plan.notes.length ? (
        <Card pad="md" className="mt-6">
          <SectionHeader title="How this plan was built" description="The reasoning, stated plainly, including what it could not account for." />
          <ul className="col g-2">
            {plan.notes.map((n) => (
              <li key={n} className="row g-2 t-sm subtle">
                <Icon name="chevron-right" size={13} className="mt-1 shrink-0" />
                <span>{n}</span>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <Notice tone="info" icon="info" className="mt-6">
        Taking every AP available is not a strategy. Colleges read your record in the context of what your school offered, and a strong,
        coherent set of courses you actually learned from beats a longer list you survived.
      </Notice>
    </div>
  );
}
