import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useEngine } from '@/store/useEngine';
import { useAppStore } from '@/store/useAppStore';
import { Badge, Button, Card, Notice } from '@/components/ui/primitives';
import { PageHeader, SectionHeader } from '@/components/ui/shared';
import { AP_COURSE_BY_ID } from '@/data/ap';
import { questionsForCourse } from '@/data/questions';
import { apStats, selectQuestions } from '@/domain/engine/practice';
import { QuestionRunner } from '@/features/practice/QuestionRunner';
import { countLabel, percent } from '@/lib/format';
import { Icon } from '@/components/ui/Icon';
import type { Difficulty, QuestionAttempt } from '@/domain/types';

/* Section 18 — AP study mode. Picks a mode, then hands off to the runner. */

interface Mode {
  id: QuestionAttempt['mode'];
  label: string;
  description: string;
  strategy: 'adaptive' | 'review' | 'new' | 'mixed';
  icon: 'target' | 'refresh' | 'zap' | 'timer';
  count: number;
  minutes?: number;
  instantFeedback: boolean;
}

const MODES: Mode[] = [
  {
    id: 'adaptive',
    label: 'Adaptive practice',
    description: 'Weighted toward the units where your answers have actually been weakest, at a difficulty just above where you are comfortable.',
    strategy: 'adaptive',
    icon: 'target',
    count: 10,
    instantFeedback: true,
  },
  {
    id: 'review',
    label: 'Review what you missed',
    description: 'Returns to the questions you got wrong, spaced out enough that you have to reconstruct the reasoning rather than recall the answer.',
    strategy: 'review',
    icon: 'refresh',
    count: 8,
    instantFeedback: true,
  },
  {
    id: 'drill',
    label: 'New questions only',
    description: 'Items you have not seen. Useful for gauging where you actually stand rather than how well you remember a set.',
    strategy: 'new',
    icon: 'zap',
    count: 10,
    instantFeedback: true,
  },
  {
    id: 'timed',
    label: 'Timed set',
    description: 'Twenty minutes, no feedback until the end — closer to the pressure of the real thing, where you cannot check as you go.',
    strategy: 'mixed',
    icon: 'timer',
    count: 12,
    minutes: 20,
    instantFeedback: false,
  },
];

export function APStudyPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const ctx = useEngine();
  const { toast } = useAppStore();
  const [active, setActive] = useState<Mode | undefined>(undefined);
  const [unitFilter, setUnitFilter] = useState('all');
  const [difficulty, setDifficulty] = useState<'all' | Difficulty>('all');

  const course = courseId ? AP_COURSE_BY_ID.get(courseId) : undefined;
  const available = useMemo(() => (course ? questionsForCourse(course.id) : []), [course]);
  const stats = useMemo(() => (course ? apStats(ctx, course.id) : undefined), [ctx, course]);

  const questions = useMemo(() => {
    if (!active || !course) return [];
    return selectQuestions(ctx, {
      exam: 'AP',
      courseId: course.id,
      unitId: unitFilter === 'all' ? undefined : unitFilter,
      difficulties: difficulty === 'all' ? undefined : [difficulty],
      count: active.count,
      minutes: active.minutes,
      strategy: active.strategy,
    });
  }, [active, ctx, course, unitFilter, difficulty]);

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

  if (active) {
    return (
      <div className="page">
        <QuestionRunner
          questions={questions}
          mode={active.id}
          exam="AP"
          scope={course.id}
          title={`${course.name} · ${active.label}`}
          timedTotalMinutes={active.minutes}
          instantFeedback={active.instantFeedback}
          onExit={() => setActive(undefined)}
          onComplete={() => toast('Attempts saved. Weak areas updated.', 'ok')}
        />
      </div>
    );
  }

  return (
    <div className="page">
      <PageHeader
        eyebrow={course.name}
        title="Study mode"
        description="Every question here was written for Pathway AI. None is reproduced from a College Board exam, and none should be treated as a released item."
        back={{ to: `/app/ap/course/${course.id}`, label: course.name }}
      />

      {!available.length ? (
        <Card pad="lg">
          <p className="t-sm subtle ta-center">
            This build has no practice questions for {course.name} yet. The{' '}
            <Link to={`/app/ap/course/${course.id}`} className="c-accent">
              unit pages
            </Link>{' '}
            still carry the content, vocabulary and skills to study from.
          </p>
        </Card>
      ) : (
        <>
          <Card pad="md">
            <div className="row g-3 wrap items-end">
              <label className="col g-1">
                <span className="t-2xs eyebrow">Unit</span>
                <select className="select" style={{ minWidth: 250 }} value={unitFilter} onChange={(e) => setUnitFilter(e.target.value)}>
                  <option value="all">All units</option>
                  {course.units.map((u) => (
                    <option key={u.id} value={u.id}>
                      Unit {u.number}: {u.title}
                    </option>
                  ))}
                </select>
              </label>
              <label className="col g-1">
                <span className="t-2xs eyebrow">Difficulty</span>
                <select className="select" style={{ minWidth: 160 }} value={difficulty} onChange={(e) => setDifficulty(e.target.value as 'all' | Difficulty)}>
                  <option value="all">Any difficulty</option>
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </label>
              <p className="t-2xs subtle self-center">
                {countLabel(available.length, 'question')} available for this course.
              </p>
            </div>
          </Card>

          <SectionHeader title="Pick a mode" className="mt-6" description="Different modes teach different things. Adaptive builds accuracy; timed builds pace." />
          <div className="grid-fit">
            {MODES.map((m) => (
              <Card key={m.id} pad="md" hover>
                <div className="row g-3 items-start">
                  <span className="empty-art" style={{ width: 34, height: 34, borderRadius: 'var(--r-md)' }}>
                    <Icon name={m.icon} size={17} />
                  </span>
                  <div className="grow">
                    <h3 className="t-sm w-600">{m.label}</h3>
                    <p className="t-xs subtle mt-2">{m.description}</p>
                  </div>
                </div>
                <div className="row between g-2 mt-4 items-center">
                  <span className="t-2xs faint">
                    {m.minutes ? `${m.minutes} minutes` : `${m.count} questions`}
                    {m.instantFeedback ? ' · feedback as you go' : ' · feedback at the end'}
                  </span>
                  <Button size="sm" icon="play" onClick={() => setActive(m)}>
                    Start
                  </Button>
                </div>
              </Card>
            ))}
          </div>

          {stats && stats.total ? (
            <Card pad="md" className="mt-6">
              <SectionHeader
                title="Where you stand in this course"
                description="From your own attempts. Small samples move around a lot — treat a single weak unit as a prompt to look, not a diagnosis."
                action={
                  <Button size="sm" variant="ghost" to="/app/ap/weak-areas" iconRight="arrow-right">
                    Full breakdown
                  </Button>
                }
              />
              <div className="col g-2">
                {stats.byUnit
                  .filter((u) => u.attempted > 0)
                  .map((u) => (
                    <div key={u.key} className="row between g-3 t-sm">
                      <span className="subtle clamp-1">{u.label}</span>
                      <span className="row g-2 items-center">
                        <span className="mono t-xs">
                          {u.correct}/{u.attempted}
                        </span>
                        <Badge tone={u.band === 'strong' ? 'ok' : u.band === 'solid' ? 'accent' : u.band === 'untested' ? 'default' : 'warn'}>
                          {u.band}
                        </Badge>
                      </span>
                    </div>
                  ))}
              </div>
              <p className="t-2xs faint mt-3">Overall accuracy in this course: {percent(stats.byCourse.find((c) => c.key === course.id)?.accuracy ?? 0)}.</p>
            </Card>
          ) : null}

          <Notice tone="info" icon="info" className="mt-6">
            Practice accuracy here says something about this question bank, which is small and Pathway-written. It is not an AP score prediction,
            and we will not give you one — the only honest signal is a full official practice exam under real timing.
          </Notice>
        </>
      )}
    </div>
  );
}
