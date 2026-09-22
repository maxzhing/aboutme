import { useMemo } from 'react';
import { useEngine } from '@/store/useEngine';
import { useAppStore } from '@/store/useAppStore';
import { Button, Card, Notice } from '@/components/ui/primitives';
import { NavCard, PageHeader, SectionHeader, Stat } from '@/components/ui/shared';
import { LineChart, ProgressRing } from '@/components/charts';
import { SAT_QUESTIONS } from '@/data/questions';
import { satProjection, satStats, errorPatterns } from '@/domain/engine/practice';
import { countLabel, percent } from '@/lib/format';
import { daysUntil, formatDate } from '@/lib/date';
import { Icon } from '@/components/ui/Icon';

/* Sections 19–20 — SAT Lab home. */

export function SATHome() {
  const ctx = useEngine();
  const { state } = useAppStore();

  const stats = useMemo(() => satStats(ctx), [ctx]);
  const projection = useMemo(() => satProjection(ctx), [ctx]);
  const patterns = useMemo(() => errorPatterns(ctx, 'SAT'), [ctx]);

  const scores = state.satScores;
  const latest = scores[scores.length - 1];
  const plannedSat = state.profile.plannedTests.find((t) => t.kind === 'SAT' && t.date);
  const daysToTest = plannedSat?.date ? daysUntil(plannedSat.date) : undefined;

  const trendSeries = [
    { name: 'Total', points: scores.map((s, i) => ({ x: i, y: s.total })) },
  ];

  return (
    <div className="page">
      <PageHeader
        eyebrow="Academics"
        title="SAT Lab"
        description="Original practice questions with worked explanations, adaptive drilling that targets what you actually get wrong, and a study plan built around your test date."
        actions={
          <>
            <Button variant="ghost" icon="chart" to="/app/sat/scores">
              Scores
            </Button>
            <Button variant="primary" icon="play" to="/app/sat/practice">
              Practice now
            </Button>
          </>
        }
      />

      {plannedSat?.date ? (
        <Card pad="md">
          <div className="row between g-4 wrap items-center">
            <div className="row g-4 items-center">
              <ProgressRing
                value={daysToTest !== undefined ? Math.max(0, Math.min(100, 100 - (daysToTest / 180) * 100)) : 0}
                size={64}
                stroke={6}
                label={daysToTest !== undefined ? String(Math.max(0, daysToTest)) : '—'}
                sublabel="days"
                ariaLabel={`${daysToTest} days until your SAT`}
              />
              <div>
                <p className="t-sm w-600">Your SAT is on {formatDate(plannedSat.date)}</p>
                <p className="t-2xs subtle mt-1">
                  {plannedSat.targetScore ? `Target ${plannedSat.targetScore}.` : 'No target set.'}{' '}
                  {daysToTest !== undefined && daysToTest < 0 ? 'That date has passed — update it in your profile.' : ''}
                </p>
              </div>
            </div>
            <Button variant="ghost" icon="calendar" to="/app/sat/plan">
              Study plan
            </Button>
          </div>
        </Card>
      ) : (
        <Card pad="md">
          <p className="t-sm">
            <Icon name="info" size={14} /> You have not set an SAT date. Adding one in{' '}
            <a className="c-accent" href="/app/settings/profile">
              your profile
            </a>{' '}
            lets the study plan work backwards from it rather than guessing.
          </p>
        </Card>
      )}

      <div className="grid-fit-lg mt-6">
        <NavCard to="/app/sat/practice" icon="target" title="Adaptive practice" description="Weighted toward your weakest domains, at a difficulty just above where you are comfortable." />
        <NavCard to="/app/sat/bank" icon="list" title="Question bank" description={`${countLabel(SAT_QUESTIONS.length, 'original question')} across Math and Reading & Writing.`} />
        <NavCard to="/app/sat/weaknesses" icon="lens" title="Weakness analysis" description="Where your answers break down, with the attempts that prove it." meta={patterns.length ? <span className="badge badge-warn">{patterns.length}</span> : undefined} />
        <NavCard to="/app/sat/scores" icon="chart" title="Score history" description="Practice tests and official reports, tracked over time." />
        <NavCard to="/app/sat/plan" icon="calendar" title="Study plan" description="A weekly plan built backwards from your test date and your real available hours." />
      </div>

      <div className="split-aside mt-6">
        <div className="col g-4">
          {scores.length > 1 ? (
            <Card pad="md">
              <SectionHeader title="Score history" description="Practice tests and official reports as you have entered them." />
              <LineChart series={trendSeries} xLabels={scores.map((s) => formatDate(s.date))} ariaLabel="SAT total over time" yMin={400} yMax={1600} yLabel="Total" />
            </Card>
          ) : null}

          <Card pad="md">
            <SectionHeader title="Where you stand in this question bank" description="From the questions you have answered here. Deliberately not converted into a score." />
            {stats.total ? (
              <>
                <div className="row g-5 wrap">
                  <Stat label="Questions answered" value={String(stats.total)} />
                  <Stat label="Overall accuracy" value={percent(stats.accuracy)} />
                  {projection.mathAccuracy !== undefined ? <Stat label="Math" value={percent(projection.mathAccuracy)} /> : null}
                  {projection.verbalAccuracy !== undefined ? <Stat label="Reading & Writing" value={percent(projection.verbalAccuracy)} /> : null}
                </div>
                <Notice tone="warn" icon="alert" className="mt-4">
                  {projection.caveat}
                </Notice>
              </>
            ) : (
              <p className="t-sm subtle">
                No practice attempts yet. Answer a set and this fills in with your real numbers rather than an estimate.
              </p>
            )}
          </Card>

          {patterns.length ? (
            <Card pad="md">
              <SectionHeader
                title="Patterns in what you get wrong"
                description="Only stated when several attempts point the same way."
                action={
                  <Button size="sm" variant="ghost" to="/app/sat/weaknesses" iconRight="arrow-right">
                    Full analysis
                  </Button>
                }
              />
              <div className="col g-2">
                {patterns.slice(0, 3).map((p) => (
                  <div key={p.id} className="row g-2 t-sm">
                    <Icon name="alert" size={13} className="c-warn mt-1 shrink-0" />
                    <span>{p.statement}</span>
                  </div>
                ))}
              </div>
            </Card>
          ) : null}
        </div>

        <div className="col g-4">
          {latest ? (
            <Card pad="md">
              <p className="t-2xs eyebrow">Most recent</p>
              <p className="t-2xl display mt-2 mono">{latest.total}</p>
              <p className="t-xs subtle mt-1">
                {latest.label} · {formatDate(latest.date)}
              </p>
              <div className="row g-4 mt-3">
                <div className="col g-1">
                  <span className="t-2xs faint">Math</span>
                  <span className="mono w-600">{latest.math}</span>
                </div>
                <div className="col g-1">
                  <span className="t-2xs faint">Reading &amp; Writing</span>
                  <span className="mono w-600">{latest.readingWriting}</span>
                </div>
              </div>
              {!latest.official ? <p className="t-2xs faint mt-3">Practice test, self-reported.</p> : null}
            </Card>
          ) : null}

          {projection.trend ? (
            <Card pad="md">
              <p className="t-2xs eyebrow">Trend</p>
              <p className="t-lg w-600 mt-2">
                {projection.trend.delta >= 0 ? '+' : ''}
                {projection.trend.delta} points
              </p>
              <p className="t-2xs subtle mt-1">{projection.trend.span}</p>
              <p className="t-2xs faint mt-3">
                Two data points is a line, not a trajectory. Score movement on practice tests is noisy — conditions, fatigue and question mix all
                shift it.
              </p>
            </Card>
          ) : null}

          <Card pad="md">
            <p className="t-2xs eyebrow">A note on test-optional</p>
            <p className="t-xs subtle mt-2">
              Many colleges no longer require the SAT, and several of the ones on your list may be test-optional or test-blind. Submitting a score
              helps when it strengthens your application and does nothing when it does not. Check each college&rsquo;s current policy — they change
              year to year, and we do not hold verified policies for the coming cycle.
            </p>
            <Button size="sm" variant="ghost" to="/app/colleges/list" iconRight="arrow-right" className="mt-3">
              Check your list
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
}
