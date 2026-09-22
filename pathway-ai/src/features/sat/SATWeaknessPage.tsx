import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useEngine } from '@/store/useEngine';
import { useAppStore } from '@/store/useAppStore';
import { Badge, Button, Card, Notice, Tabs } from '@/components/ui/primitives';
import { PageHeader, SectionHeader } from '@/components/ui/shared';
import { BarChart, RadarChart } from '@/components/charts';
import { QUESTION_BY_ID } from '@/data/questions';
import { errorPatterns, satStats, selectQuestions } from '@/domain/engine/practice';
import { QuestionRunner } from '@/features/practice/QuestionRunner';
import { countLabel, percent, secondsLabel } from '@/lib/format';
import { formatDate } from '@/lib/date';
import { Icon } from '@/components/ui/Icon';
import type { TopicStat } from '@/domain/engine/practice';

/* Section 37 — SAT weakness analysis, every claim evidenced. */

const BAND_TONE: Record<TopicStat['band'], 'ok' | 'accent' | 'warn' | 'danger' | 'default'> = {
  strong: 'ok',
  solid: 'accent',
  shaky: 'warn',
  weak: 'danger',
  untested: 'default',
};

export function SATWeaknessPage() {
  const ctx = useEngine();
  const { state, toast } = useAppStore();
  const [tab, setTab] = useState('domains');
  const [drillDomain, setDrillDomain] = useState<string | undefined>(undefined);

  const stats = useMemo(() => satStats(ctx), [ctx]);
  const patterns = useMemo(() => errorPatterns(ctx, 'SAT'), [ctx]);

  const drillQuestions = useMemo(
    () => (drillDomain ? selectQuestions(ctx, { exam: 'SAT', domains: [drillDomain], count: 8, strategy: 'adaptive' }) : []),
    [drillDomain, ctx],
  );

  if (drillDomain) {
    return (
      <div className="page">
        <QuestionRunner
          questions={drillQuestions}
          mode="adaptive"
          exam="SAT"
          title={`SAT · ${drillDomain}`}
          onExit={() => setDrillDomain(undefined)}
          onComplete={() => toast('Attempts saved. This analysis has been updated.', 'ok')}
        />
      </div>
    );
  }

  if (!stats.total) {
    return (
      <div className="page">
        <PageHeader eyebrow="SAT Lab" title="Weakness analysis" back={{ to: '/app/sat', label: 'SAT Lab' }} />
        <Card pad="lg">
          <p className="t-sm subtle ta-center">
            Nothing to analyse yet. Everything on this page comes from questions you have actually answered — we do not guess at weaknesses from
            your grades or your course list.{' '}
            <Link to="/app/sat/practice" className="c-accent">
              Start with an adaptive set
            </Link>
            .
          </p>
        </Card>
      </div>
    );
  }

  const timingIssues = stats.bySkill.filter((s) => s.attempted >= 2 && s.medianSec > s.targetSec * 1.4);
  const radarAxes = stats.byDomain.filter((d) => d.attempted > 0).map((d) => ({ label: d.label, value: d.accuracy }));

  return (
    <div className="page">
      <PageHeader
        eyebrow="SAT Lab"
        title="Weakness analysis"
        description={`Built from ${countLabel(stats.total, 'answered question')}. Every statement here points to the specific attempts behind it.`}
        back={{ to: '/app/sat', label: 'SAT Lab' }}
      />

      <div className="mt-2">
        <Tabs
          ariaLabel="Analysis views"
          active={tab}
          onChange={setTab}
          items={[
            { id: 'domains', label: 'By domain' },
            { id: 'skills', label: 'By skill' },
            { id: 'patterns', label: 'Error patterns', count: patterns.length },
            { id: 'timing', label: 'Timing', count: timingIssues.length },
          ]}
        />
      </div>

      {tab === 'domains' ? (
        <div className="col g-4 mt-4">
          {radarAxes.length >= 3 ? (
            <Card pad="md">
              <SectionHeader title="Shape of your performance" description="Accuracy across the domains you have practised. A lopsided shape is normal and usually the fastest thing to fix." />
              <div className="row center">
                <RadarChart axes={radarAxes} size={300} ariaLabel="Accuracy by SAT domain" />
              </div>
            </Card>
          ) : null}

          <Card pad="md">
            <SectionHeader title="Domain by domain, weakest first" description="Two attempts is not a diagnosis. Look at the pattern, not one number." />
            <div className="col g-2">
              {stats.byDomain
                .filter((d) => d.attempted > 0)
                .sort((a, b) => a.accuracy - b.accuracy)
                .map((d) => (
                  <div key={d.key} className="row between g-3 items-center wrap unit-row">
                    <div className="grow" style={{ minWidth: 0 }}>
                      <p className="t-sm w-600">{d.label}</p>
                      <p className="t-2xs subtle mt-1">
                        {d.correct}/{d.attempted} correct · median {secondsLabel(d.medianSec)} against a {secondsLabel(d.targetSec)} target
                      </p>
                    </div>
                    <div className="row g-2 items-center">
                      <Badge tone={BAND_TONE[d.band]}>{d.band}</Badge>
                      <span className="mono t-sm">{percent(d.accuracy)}</span>
                      <Button size="sm" variant="ghost" icon="play" onClick={() => setDrillDomain(d.key)}>
                        Drill
                      </Button>
                    </div>
                  </div>
                ))}
            </div>
          </Card>

          {stats.bySection.length ? (
            <Card pad="md">
              <SectionHeader title="Section split" description="Where the bigger gain is available. Most students find it faster to lift their weaker section than to push their stronger one higher." />
              <BarChart
                data={stats.bySection.map((s) => ({
                  label: s.label,
                  value: s.accuracy,
                  tone: s.accuracy >= 80 ? 'var(--ok)' : s.accuracy >= 60 ? 'var(--accent)' : 'var(--warn)',
                  note: `${s.correct}/${s.attempted} correct`,
                }))}
                ariaLabel="Accuracy by SAT section"
              />
            </Card>
          ) : null}
        </div>
      ) : null}

      {tab === 'skills' ? (
        <Card pad="md" className="mt-4">
          <SectionHeader title="By skill" description="Finer than domain. This is usually where a fixable gap shows up." />
          <div className="col g-2">
            {stats.bySkill
              .filter((s) => s.attempted > 0)
              .sort((a, b) => a.accuracy - b.accuracy)
              .map((s) => (
                <div key={s.key} className="row between g-3 t-sm">
                  <span className="subtle clamp-1">{s.label}</span>
                  <span className="row g-2 items-center">
                    <span className="mono t-xs">
                      {s.correct}/{s.attempted}
                    </span>
                    <Badge tone={BAND_TONE[s.band]}>{s.band}</Badge>
                  </span>
                </div>
              ))}
          </div>
          <p className="t-2xs faint mt-4">
            A skill with one or two attempts is marked untested rather than given a band. We would rather show you a gap in the data than a
            confident number built on nothing.
          </p>
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
                <p className="t-2xs eyebrow mt-4 mb-2">Attempts behind this claim</p>
                <div className="col g-2">
                  {p.evidenceAttemptIds.slice(0, 4).map((id) => {
                    const attempt = state.attempts.find((a) => a.id === id);
                    const question = attempt ? QUESTION_BY_ID.get(attempt.questionId) : undefined;
                    if (!attempt || !question) return null;
                    return (
                      <div key={id} className="card card-pad-sm">
                        <p className="t-xs subtle clamp-2">{question.prompt}</p>
                        <p className="t-2xs faint mt-2">
                          {formatDate(attempt.createdAt)} · {question.domain} · {question.concept} · {secondsLabel(attempt.elapsedSec)}
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
                No pattern has enough behind it yet. We only name a pattern when several attempts point the same way — an insight built on two
                wrong answers is a guess wearing a confident face.
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
                Accuracy without pace does not survive a timed section. Each of these you are getting right, but far too slowly to finish a module
                at that rate.
              </Notice>
              <Card pad="md">
                <div className="col g-2">
                  {timingIssues.map((s) => (
                    <div key={s.key} className="row between g-3 t-sm">
                      <span className="subtle clamp-1">{s.label}</span>
                      <span className="mono t-xs">
                        {secondsLabel(s.medianSec)} vs {secondsLabel(s.targetSec)} target
                      </span>
                    </div>
                  ))}
                </div>
              </Card>
              <Card pad="md">
                <p className="t-sm">
                  <Icon name="lightbulb" size={14} className="c-accent" /> The fix is almost never &ldquo;go faster&rdquo;. It is recognising the
                  question type sooner, and knowing when to skip. A timed module with feedback held to the end trains exactly that.
                </p>
                <Button size="sm" className="mt-3" to="/app/sat/practice" icon="timer">
                  Run a timed module
                </Button>
              </Card>
            </>
          ) : (
            <Card pad="lg">
              <p className="t-sm subtle ta-center">
                <Icon name="check" size={14} className="c-ok" /> Your pace is within range on everything you have practised here. Worth
                confirming under full test conditions, where fatigue changes things.
              </p>
            </Card>
          )}
        </div>
      ) : null}
    </div>
  );
}
