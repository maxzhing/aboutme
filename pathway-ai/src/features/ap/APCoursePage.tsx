import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useEngine } from '@/store/useEngine';
import { useAppStore } from '@/store/useAppStore';
import { Badge, Button, Card, Notice } from '@/components/ui/primitives';
import { DataRow, PageHeader, SectionHeader } from '@/components/ui/shared';
import { ProvenanceFooter, SourceList } from '@/components/ui/Provenance';
import { ProgressRing } from '@/components/charts';
import { AP_COURSE_BY_ID, resolveAPCourse } from '@/data/ap';
import { MAJOR_BY_ID } from '@/data/majors';
import { SRC } from '@/data/provenance';
import { questionsForCourse } from '@/data/questions';
import { apStats } from '@/domain/engine/practice';
import { countLabel, minutesLabel, percent } from '@/lib/format';
import { Icon } from '@/components/ui/Icon';

/* Section 18 — one AP course: structure, units, exam format, study entry. */

export function APCoursePage() {
  const { courseId } = useParams<{ courseId: string }>();
  const ctx = useEngine();
  const { state, updateProfile, setUnitProgress, toast } = useAppStore();

  const course = courseId ? AP_COURSE_BY_ID.get(courseId) : undefined;
  const stats = useMemo(() => (course ? apStats(ctx, course.id) : undefined), [ctx, course]);

  if (!course) {
    return (
      <div className="page">
        <Card pad="lg">
          <p className="t-sm subtle ta-center">
            No AP course with that id.{' '}
            <Link to="/app/ap" className="c-accent">
              Back to the AP Center
            </Link>
            .
          </p>
        </Card>
      </div>
    );
  }

  const taking = state.profile.academics.currentCourses.some((c) => resolveAPCourse(c)?.id === course.id);
  const taken = state.profile.academics.previousCourses.some((c) => resolveAPCourse(c)?.id === course.id);
  const questions = questionsForCourse(course.id);
  const progress = course.units.map((u) => state.apUnitProgress[`${course.id}:${u.id}`] ?? 0);
  const avgProgress = progress.length ? Math.round(progress.reduce((a, b) => a + b, 0) / progress.length) : 0;
  const supportsYourMajors = course.supportsMajors.filter((m) => ctx.majorIds.includes(m));

  function toggleTaking() {
    updateProfile((p) => {
      p.academics.currentCourses = taking
        ? p.academics.currentCourses.filter((c) => resolveAPCourse(c)?.id !== course!.id)
        : [...p.academics.currentCourses, course!.id];
    });
    toast(taking ? 'Removed from this year’s courses.' : `${course!.name} added to this year’s courses.`, taking ? 'default' : 'ok');
  }

  return (
    <div className="page">
      <PageHeader
        eyebrow={course.family}
        title={course.name}
        description={course.summary}
        back={{ to: '/app/ap', label: 'AP Center' }}
        actions={
          <>
            <Button variant={taking ? 'soft' : 'ghost'} icon={taking ? 'check' : 'plus'} onClick={toggleTaking}>
              {taking ? 'On my schedule' : "I'm taking this"}
            </Button>
            <Button variant="primary" icon="play" to={`/app/ap/study/${course.id}`}>
              Study this course
            </Button>
          </>
        }
      />

      <Notice tone="warn" icon="alert">
        <span className="w-600">Course structure shown here is unverified demo content.</span> AP course and exam descriptions change, and only
        College Board publishes the authoritative version. Check the official Course and Exam Description before you rely on any of this for exam
        preparation.
      </Notice>

      <div className="split-aside mt-4">
        <div className="col g-4">
          <Card pad="md">
            <SectionHeader
              title="Units"
              description="Mark a unit as covered to track where you are. Progress is yours to set — we do not infer it from practice scores."
            />
            <div className="col g-2">
              {course.units.map((unit) => {
                const pct = state.apUnitProgress[`${course.id}:${unit.id}`] ?? 0;
                return (
                  <div key={unit.id} className="unit-row">
                    <Link to={`/app/ap/course/${course.id}/unit/${unit.id}`} className="grow col g-1 card-link">
                      <span className="row g-2 items-center wrap">
                        <span className="t-2xs mono faint">Unit {unit.number}</span>
                        <span className="t-sm w-600">{unit.title}</span>
                        {unit.examWeight ? <Badge>{unit.examWeight}</Badge> : null}
                      </span>
                      <span className="t-xs subtle clamp-2">{unit.description}</span>
                    </Link>
                    <div className="col g-1 items-end" style={{ flex: 'none' }}>
                      <label className="sr-only" htmlFor={`prog-${unit.id}`}>
                        Progress through {unit.title}
                      </label>
                      <input
                        id={`prog-${unit.id}`}
                        type="range"
                        min={0}
                        max={100}
                        step={25}
                        value={pct}
                        onChange={(e) => setUnitProgress(course.id, unit.id, Number(e.target.value))}
                        style={{ width: 96 }}
                      />
                      <span className="t-2xs mono faint">{pct}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card pad="md">
            <SectionHeader title="Exam format" description="What the assessment actually looks like, so the shape of your practice matches it." />
            <div className="col g-3">
              {course.examSections.map((s) => (
                <div key={s.name} className="card card-pad-sm">
                  <div className="row between g-2 items-start wrap">
                    <p className="t-sm w-600">{s.name}</p>
                    <div className="row g-2 t-2xs subtle">
                      {s.questionCount !== undefined ? <span>{s.questionCount} questions</span> : null}
                      {s.minutes !== undefined ? <span>{minutesLabel(s.minutes)}</span> : null}
                      {s.weightPct !== undefined ? <span>{percent(s.weightPct)} of the exam</span> : null}
                    </div>
                  </div>
                  <p className="t-xs subtle mt-2">{s.description}</p>
                  {s.calculator ? <p className="t-2xs faint mt-2">Calculator: {s.calculator}</p> : null}
                </div>
              ))}
            </div>
            {course.examTotalMinutes ? <DataRow label="Total exam time" value={minutesLabel(course.examTotalMinutes)} /> : null}
            {course.calculatorPolicy ? <DataRow label="Calculator policy" value={course.calculatorPolicy} /> : null}
            <DataRow label="Question types" value={course.questionTypes.join(', ')} />
            <SourceList sources={[SRC.collegeBoardAP]} className="mt-3" />
          </Card>

          <Card pad="md">
            <SectionHeader
              title="Practice"
              description={`${countLabel(questions.length, 'original practice question')} for this course in the current build, written by Pathway AI rather than reproduced from any exam.`}
              action={
                questions.length ? (
                  <Button size="sm" to={`/app/ap/study/${course.id}`} icon="play">
                    Start
                  </Button>
                ) : undefined
              }
            />
            {questions.length ? (
              <div className="row g-4 wrap">
                {stats && stats.total ? (
                  <>
                    <div className="col g-1">
                      <span className="t-2xs eyebrow">Attempted</span>
                      <span className="t-lg mono w-600">{stats.total}</span>
                    </div>
                    <div className="col g-1">
                      <span className="t-2xs eyebrow">Units practised</span>
                      <span className="t-lg mono w-600">{stats.byUnit.filter((u) => u.attempted > 0).length}</span>
                    </div>
                  </>
                ) : (
                  <p className="t-sm subtle">No attempts yet for this course.</p>
                )}
              </div>
            ) : (
              <p className="t-sm subtle">
                This demo build carries questions for a subset of AP courses. There are none for {course.name} yet — the unit pages still give
                you the content, vocabulary and skills to work from.
              </p>
            )}
          </Card>
        </div>

        <div className="col g-4">
          <Card pad="md">
            <div className="row g-4 items-center">
              <ProgressRing value={avgProgress} size={72} stroke={7} label={`${avgProgress}%`} ariaLabel={`${avgProgress} percent of units marked covered`} />
              <div>
                <p className="t-sm w-600">Your coverage</p>
                <p className="t-2xs subtle mt-1">
                  {progress.filter((p) => p >= 100).length} of {course.units.length} units complete
                </p>
                {taken ? <Badge tone="ok">Already completed</Badge> : null}
              </div>
            </div>
          </Card>

          <Card pad="md">
            <h3 className="t-sm w-600">At a glance</h3>
            <DataRow label="Workload" value={`${course.workload}/5`} />
            <DataRow label="Usually taken in" value={course.typicalGrades.map((g) => `grade ${g}`).join(', ')} />
            <DataRow
              label="Prerequisites"
              value={course.prerequisites.length ? course.prerequisites.join(', ') : 'None listed'}
              note={course.prerequisites.length ? 'Your school may set its own — check with your counselor.' : undefined}
            />
          </Card>

          {course.supportsMajors.length ? (
            <Card pad="md">
              <h3 className="t-sm w-600">Prepares you for</h3>
              <div className="row g-2 wrap mt-3">
                {course.supportsMajors.map((m) => (
                  <Link key={m} to={`/app/majors/${m}`} className="chip chip-sm">
                    {MAJOR_BY_ID.get(m)?.name ?? m}
                  </Link>
                ))}
              </div>
              {supportsYourMajors.length ? (
                <p className="t-2xs mt-3" style={{ color: 'var(--ai-text)' }}>
                  <Icon name="sparkles" size={11} /> This one lines up directly with your stated direction.
                </p>
              ) : (
                <p className="t-2xs faint mt-3">
                  Not directly connected to the direction you named. Worth taking if you want it, but it is not preparation for your stated path.
                </p>
              )}
            </Card>
          ) : null}

          {course.studyResources.length ? (
            <Card pad="md">
              <h3 className="t-sm w-600">Study resources</h3>
              <div className="col g-2 mt-3">
                {course.studyResources.map((r) => (
                  <div key={r.label} className="row between g-2">
                    {r.url ? (
                      <a href={r.url} target="_blank" rel="noreferrer noopener" className="t-xs c-accent row g-1">
                        <Icon name="external" size={11} /> {r.label}
                      </a>
                    ) : (
                      <span className="t-xs subtle">{r.label}</span>
                    )}
                    <Badge tone={r.kind === 'official' ? 'ok' : r.kind === 'in-app' ? 'accent' : 'default'}>{r.kind}</Badge>
                  </div>
                ))}
              </div>
              <p className="t-2xs faint mt-3">Official resources are the ones to trust for exam content. Everything in this app is a supplement.</p>
            </Card>
          ) : null}
        </div>
      </div>

      <ProvenanceFooter provenance={course.provenance} className="mt-6" />
    </div>
  );
}
