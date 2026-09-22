import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useEngine } from '@/store/useEngine';
import { useAppStore } from '@/store/useAppStore';
import { Badge, Button, Card, Notice, Tabs } from '@/components/ui/primitives';
import { PageHeader, SectionHeader } from '@/components/ui/shared';
import { BarChart } from '@/components/charts';
import { AP_COURSE_BY_ID } from '@/data/ap';
import { QUESTION_BY_ID } from '@/data/questions';
import { apStats, errorPatterns, selectQuestions } from '@/domain/engine/practice';
import { QuestionRunner } from '@/features/practice/QuestionRunner';
import { countLabel, percent, secondsLabel } from '@/lib/format';
import { formatDate } from '@/lib/date';
import { Icon } from '@/components/ui/Icon';
import type { TopicStat } from '@/domain/engine/practice';

/* Section 37 — weakness tracking with the evidence attached. */

const BAND_TONE: Record<TopicStat['band'], 'ok' | 'accent' | 'warn' | 'danger' | 'default'> = {
  strong: 'ok',
  solid: 'accent',
  shaky: 'warn',
  weak: 'danger',
  untested: 'default',
};

export function APWeakAreas() {
  const ctx = useEngine();
  const { state, toast } = useAppStore();
  const [tab, setTab] = useState('units');
  const [drill, setDrill] = useState<{ courseId?: string; unitId?: string; label: string } | undefined>(undefined);

  const stats = useMemo(() => apStats(ctx), [ctx]);
  const patterns = useMemo(() => errorPatterns(ctx, 'AP'), [ctx]);

  const drillQuestions = useMemo(
    () =>
      drill
        ? selectQuestions(ctx, { exam: 'AP', courseId: drill.courseId, unitId: drill.unitId, count: 8, strategy: 'adaptive' })
        : [],
    [drill, ctx],
  );

  if (drill) {
    return (
      <div className="page">
        <QuestionRunner
          questions={drillQuestions}
          mode="adaptive"
          exam="AP"
          scope={drill.courseId}
          title={drill.label}
          onExit={() => setDrill(undefined)}
          onComplete={() => toast('Attempts saved. This page has been updated.', 'ok')}
        />
      </div>
    );
  }

  if (!stats.total) {
    return (
      <div className="page">
        <PageHeader eyebrow="AP Center" title="Weak areas" back={{ to: '/app/ap', label: 'AP Center' }} />
        <Card pad="lg">
          <p className="t-sm subtle ta-center">
            Nothing to analyse yet. This page is built entirely from questions you have answered — we will not guess at your weaknesses from
            your grades.{' '}
            <Link to="/app/ap" className="c-accent">
              Pick a course and start practising
            </Link>
            .
          </p>
        </Card>
      </div>
    );
  }

  const timingIssues = stats.byUnit.filter((u) => u.attempted >= 2 && u.medianSec > u.targetSec * 1.4);

  return (
    <div className="page">
      <PageHeader
        eyebrow="AP Center"
        title="Weak areas"
        description={`Built from ${countLabel(stats.total, 'answered question')}. Every claim here points at the attempts that support it — nothing is inferred from your grades or your course list.`}
        back={{ to: '/app/ap', label: 'AP Center' }}
      />

      <div className="mt-2">
        <Tabs
          ariaLabel="Weak-area views"
          active={tab}
          onChange={setTab}
          items={[
            { id: 'units', label: 'By unit', count: stats.byUnit.filter((u) => u.attempted > 0).length },
            { id: 'concepts', label: 'By concept' },
            { id: 'patterns', label: 'Error patterns', count: patterns.length },
            { id: 'timing', label: 'Timing', count: timingIssues.length },
          ]}
        />
      </div>

      {tab === 'units' ? (
        <div className="col g-4 mt-4">
          {stats.byCourse.length > 1 ? (
            <Card pad="md">
              <SectionHeader title="Across your courses" description="Accuracy per course, on the questions you have answered here." />
              <BarChart
                data={stats.byCourse.map((c) => ({
                  label: c.label,
                  value: c.accuracy,
                  tone: c.accuracy >= 80 ? 'var(--ok)' : c.accuracy >= 60 ? 'var(--accent)' : 'var(--warn)',
                  note: `${c.correct}/${c.attempted} correct`,
                }))}
                ariaLabel="Accuracy by AP course"
              />
            </Card>
          ) : null}

          <Card pad="md">
            <SectionHeader title="Unit by unit, weakest first" description="Two attempts is not a diagnosis. Treat a weak band as a reason to look closer, not a conclusion." />
            <div className="col g-2">
              {stats.byUnit
                .filter((u) => u.attempted > 0)
                .sort((a, b) => a.accuracy - b.accuracy)
                .map((u) => {
                  const courseId = Array.from(AP_COURSE_BY_ID.values()).find((c) => c.units.some((unit) => unit.id === u.key))?.id;
                  return (
                    <div key={u.key} className="row between g-3 items-center wrap unit-row">
                      <div className="grow" style={{ minWidth: 0 }}>
                        <p className="t-sm w-600 clamp-1">{u.label}</p>
                        <p className="t-2xs subtle mt-1">
                          {u.correct}/{u.attempted} correct · median {secondsLabel(u.medianSec)} against a {secondsLabel(u.targetSec)} target
                        </p>
                      </div>
                      <div className="row g-2 items-center">
                        <Badge tone={BAND_TONE[u.band]}>{u.band}</Badge>
                        <span className="mono t-sm">{percent(u.accuracy)}</span>
                        <Button size="sm" variant="ghost" icon="play" onClick={() => setDrill({ courseId, unitId: u.key, label: u.label })}>
                          Drill
                        </Button>
                      </div>
                    </div>
                  );
                })}
            </div>
          </Card>
        </div>
      ) : null}

      {tab === 'concepts' ? (
        <Card pad="md" className="mt-4">
          <SectionHeader title="By concept" description="The finest-grained view. This is where a genuine gap usually shows up first." />
          <div className="col g-2">
            {stats.byConcept
              .filter((c) => c.attempted > 0)
              .sort((a, b) => a.accuracy - b.accuracy)
              .map((c) => (
                <div key={c.key} className="row between g-3 t-sm">
                  <span className="subtle clamp-1">{c.label}</span>
                  <span className="row g-2 items-center">
                    <span className="mono t-xs">
                      {c.correct}/{c.attempted}
                    </span>
                    <Badge tone={BAND_TONE[c.band]}>{c.band}</Badge>
                  </span>
                </div>
              ))}
          </div>
        </Card>
      ) : null}

      {tab === 'patterns' ? (
        <div className="col g-4 mt-4">
          {patterns.length ? (
            patterns.map((p) => (
              <Card key={p.id} pad="md">
                <div className="row between g-3 items-start wrap">
                  <p className="t-sm w-600 grow">{p.statement}</p>
                  <Badge tone={p.confidence === 'high' ? 'warn' : p.confidence === 'medium' ? 'accent' : 'default'}>{p.confidence} confidence</Badge>
                </div>
                <p className="t-2xs eyebrow mt-4 mb-2">The attempts behind this</p>
                <div className="col g-2">
                  {p.evidenceAttemptIds.slice(0, 4).map((id) => {
                    const attempt = state.attempts.find((a) => a.id === id);
                    const question = attempt ? QUESTION_BY_ID.get(attempt.questionId) : undefined;
                    if (!attempt || !question) return null;
                    return (
                      <div key={id} className="card card-pad-sm">
                        <p className="t-xs subtle clamp-2">{question.prompt}</p>
                        <p className="t-2xs faint mt-2">
                          {formatDate(attempt.createdAt)} · {question.concept} · {secondsLabel(attempt.elapsedSec)}
                          {attempt.usedHint ? ' · used a hint' : ''}
                        </p>
                      </div>
                    );
                  })}
                </div>
                <p className="t-2xs faint mt-3">Scope: {p.scope}</p>
              </Card>
            ))
          ) : (
            <Card pad="lg">
              <p className="t-sm subtle ta-center">
                No pattern has enough evidence behind it yet. We only state a pattern when several attempts point the same way — a claim from two
                wrong answers would be noise dressed up as insight.
              </p>
            </Card>
          )}
        </div>
      ) : null}

      {tab === 'timing' ? (
        <div className="col g-4 mt-4">
          {timingIssues.length ? (
            <>
              <Notice tone="warn" icon="clock">
                Pace matters on AP exams as much as accuracy. Getting a question right in triple the time it should take is not a question you
                have mastered — it is one you will run out of time on.
              </Notice>
              <Card pad="md">
                <div className="col g-2">
                  {timingIssues.map((u) => (
                    <div key={u.key} className="row between g-3 t-sm">
                      <span className="subtle clamp-1">{u.label}</span>
                      <span className="mono t-xs">
                        {secondsLabel(u.medianSec)} vs {secondsLabel(u.targetSec)} target
                      </span>
                    </div>
                  ))}
                </div>
              </Card>
            </>
          ) : (
            <Card pad="lg">
              <p className="t-sm subtle ta-center">
                <Icon name="check" size={14} className="c-ok" /> Your pace is within range on everything you have practised. Worth re-checking
                under real timed conditions, where the pressure is different.
              </p>
            </Card>
          )}
        </div>
      ) : null}
    </div>
  );
}
