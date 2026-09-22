import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useEngine } from '@/store/useEngine';
import { useAppStore } from '@/store/useAppStore';
import { Button, Card, Notice, Tabs } from '@/components/ui/primitives';
import { PageHeader, SectionHeader } from '@/components/ui/shared';
import { ProgressRing } from '@/components/charts';
import { AP_COURSE_BY_ID } from '@/data/ap';
import { questionsForUnit } from '@/data/questions';
import { selectQuestions } from '@/domain/engine/practice';
import { QuestionRunner } from '@/features/practice/QuestionRunner';
import { countLabel } from '@/lib/format';
import { Icon } from '@/components/ui/Icon';

/* Section 18 — unit explorer: concepts, vocabulary, skills, and a unit drill. */

export function APUnitPage() {
  const { courseId, unitId } = useParams<{ courseId: string; unitId: string }>();
  const navigate = useNavigate();
  const ctx = useEngine();
  const { state, setUnitProgress, toast } = useAppStore();
  const [tab, setTab] = useState('content');
  const [drilling, setDrilling] = useState(false);

  const course = courseId ? AP_COURSE_BY_ID.get(courseId) : undefined;
  const unit = course?.units.find((u) => u.id === unitId);
  const questions = useMemo(() => (unitId ? questionsForUnit(unitId) : []), [unitId]);

  const drillQuestions = useMemo(
    () =>
      drilling && course && unit
        ? selectQuestions(ctx, { exam: 'AP', courseId: course.id, unitId: unit.id, count: Math.min(8, questions.length), strategy: 'adaptive' })
        : [],
    [drilling, ctx, course, unit, questions.length],
  );

  if (!course || !unit) {
    return (
      <div className="page">
        <Card pad="lg">
          <p className="t-sm subtle ta-center">
            That unit does not exist.{' '}
            <Link to="/app/ap" className="c-accent">
              Back to the AP Center
            </Link>
            .
          </p>
        </Card>
      </div>
    );
  }

  const progress = state.apUnitProgress[`${course.id}:${unit.id}`] ?? 0;
  const index = course.units.findIndex((u) => u.id === unit.id);
  const prev = index > 0 ? course.units[index - 1] : undefined;
  const next = index < course.units.length - 1 ? course.units[index + 1] : undefined;

  if (drilling) {
    return (
      <div className="page">
        <QuestionRunner
          questions={drillQuestions}
          mode="unit"
          exam="AP"
          scope={course.id}
          title={`${course.name} · Unit ${unit.number}`}
          onExit={() => setDrilling(false)}
          onComplete={() => toast('Attempts saved. Your weak areas have been updated.', 'ok')}
        />
      </div>
    );
  }

  return (
    <div className="page">
      <PageHeader
        eyebrow={`${course.name} · Unit ${unit.number}`}
        title={unit.title}
        description={unit.description}
        back={{ to: `/app/ap/course/${course.id}`, label: course.name }}
        actions={
          questions.length ? (
            <Button variant="primary" icon="play" onClick={() => setDrilling(true)}>
              Practice this unit
            </Button>
          ) : undefined
        }
      />

      <div className="split-aside">
        <div className="col g-4">
          <div>
            <Tabs
              ariaLabel="Unit sections"
              active={tab}
              onChange={setTab}
              items={[
                { id: 'content', label: 'Big ideas & concepts' },
                { id: 'vocab', label: 'Vocabulary', count: unit.vocabulary.length },
                { id: 'skills', label: 'Skills', count: unit.skills.length },
              ]}
            />
          </div>

          {tab === 'content' ? (
            <Card pad="md">
              <SectionHeader title="Big ideas" description="The organising questions this unit is built around." />
              <ul className="col g-2">
                {unit.bigIdeas.map((b) => (
                  <li key={b} className="row g-2 t-sm">
                    <Icon name="lightbulb" size={14} className="mt-1 shrink-0 c-accent" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>

              <SectionHeader title="Concepts covered" className="mt-6" description="What you should be able to explain, not just recognise." />
              <ul className="col g-2">
                {unit.concepts.map((c) => (
                  <li key={c} className="row g-2 t-sm subtle">
                    <Icon name="chevron-right" size={13} className="mt-1 shrink-0" />
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}

          {tab === 'vocab' ? (
            <Card pad="md">
              <SectionHeader title="Vocabulary" description="Terms that carry precise meaning in this unit. Getting these exactly right is often the difference on free-response questions." />
              <dl className="col g-3">
                {unit.vocabulary.map((v) => (
                  <div key={v.term} className="card card-pad-sm">
                    <dt className="t-sm w-600">{v.term}</dt>
                    <dd className="t-xs subtle mt-1">{v.definition}</dd>
                  </div>
                ))}
              </dl>
              {!unit.vocabulary.length ? <p className="t-sm subtle">No vocabulary listed for this unit.</p> : null}
            </Card>
          ) : null}

          {tab === 'skills' ? (
            <Card pad="md">
              <SectionHeader title="Skills practised" description="What the exam asks you to do with this content." />
              <ul className="col g-2">
                {unit.skills.map((s) => (
                  <li key={s} className="row g-2 t-sm subtle">
                    <Icon name="target" size={13} className="mt-1 shrink-0" />
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}

          <Notice tone="warn" icon="alert">
            Unit content here is Pathway AI&rsquo;s demo material, not College Board&rsquo;s official Course and Exam Description. Use it to organise
            your study; use the official CED to know what is actually examinable.
          </Notice>
        </div>

        <div className="col g-4">
          <Card pad="md">
            <div className="row g-4 items-center">
              <ProgressRing value={progress} size={64} stroke={6} label={`${progress}%`} ariaLabel={`${progress} percent covered`} />
              <div className="grow">
                <p className="t-sm w-600">Your coverage</p>
                <p className="t-2xs subtle mt-1">Set this yourself — it is your record, not a score.</p>
              </div>
            </div>
            <div className="row g-2 mt-4 wrap">
              {[0, 25, 50, 75, 100].map((v) => (
                <button
                  key={v}
                  type="button"
                  className="chip chip-sm"
                  aria-pressed={progress === v}
                  onClick={() => setUnitProgress(course.id, unit.id, v)}
                >
                  {v}%
                </button>
              ))}
            </div>
          </Card>

          {unit.examWeight ? (
            <Card pad="md">
              <h3 className="t-sm w-600">Exam weighting</h3>
              <p className="t-lg mono w-600 mt-2">{unit.examWeight}</p>
              <p className="t-2xs faint mt-2">
                Approximate, as published for a recent exam cycle and reproduced here as demo data. Weightings shift — verify against the current
                official description.
              </p>
            </Card>
          ) : null}

          <Card pad="md">
            <h3 className="t-sm w-600">Practice available</h3>
            <p className="t-sm mt-2">
              {questions.length ? countLabel(questions.length, 'original question') : 'None for this unit yet'}
            </p>
            {questions.length ? (
              <Button size="sm" className="mt-3" icon="play" onClick={() => setDrilling(true)}>
                Start a unit drill
              </Button>
            ) : (
              <p className="t-2xs faint mt-2">
                This demo build carries questions for a subset of units. We would rather show you nothing than generate filler that teaches the
                wrong thing.
              </p>
            )}
          </Card>

          <Card pad="md">
            <h3 className="t-sm w-600">Move through the course</h3>
            <div className="col g-2 mt-3">
              {prev ? (
                <Button size="sm" variant="ghost" icon="chevron-left" onClick={() => navigate(`/app/ap/course/${course.id}/unit/${prev.id}`)}>
                  Unit {prev.number}: {prev.title}
                </Button>
              ) : null}
              {next ? (
                <Button size="sm" variant="ghost" iconRight="chevron-right" onClick={() => navigate(`/app/ap/course/${course.id}/unit/${next.id}`)}>
                  Unit {next.number}: {next.title}
                </Button>
              ) : null}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
