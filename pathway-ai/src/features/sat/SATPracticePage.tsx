import { useMemo, useState } from 'react';
import { useEngine } from '@/store/useEngine';
import { useAppStore } from '@/store/useAppStore';
import { Button, Card, Notice } from '@/components/ui/primitives';
import { PageHeader, SectionHeader } from '@/components/ui/shared';
import { SAT_MATH_DOMAINS, SAT_VERBAL_DOMAINS } from '@/data/questions';
import { satStats, selectQuestions } from '@/domain/engine/practice';
import { QuestionRunner } from '@/features/practice/QuestionRunner';
import { countLabel, percent } from '@/lib/format';
import { Icon } from '@/components/ui/Icon';
import type { Difficulty, QuestionAttempt } from '@/domain/types';

/* Sections 35–36 — SAT practice modes. */

interface ModeDef {
  id: QuestionAttempt['mode'];
  label: string;
  description: string;
  strategy: 'adaptive' | 'review' | 'new' | 'mixed';
  icon: 'target' | 'refresh' | 'zap' | 'timer' | 'flame';
  count: number;
  minutes?: number;
  instantFeedback: boolean;
}

const MODES: ModeDef[] = [
  {
    id: 'adaptive',
    label: 'Adaptive set',
    description:
      'Ten questions chosen by weighting your weakest domains against what you have not seen, at a difficulty just above your current accuracy. The set changes as you improve.',
    strategy: 'adaptive',
    icon: 'target',
    count: 10,
    instantFeedback: true,
  },
  {
    id: 'review',
    label: 'Review misses',
    description: 'Comes back to what you got wrong, far enough apart that you have to reason it out again rather than recall the answer.',
    strategy: 'review',
    icon: 'refresh',
    count: 8,
    instantFeedback: true,
  },
  {
    id: 'daily',
    label: 'Daily five',
    description: 'A short, consistent set. Five questions a day beats a three-hour session every fortnight, and it is far easier to keep up.',
    strategy: 'adaptive',
    icon: 'flame',
    count: 5,
    instantFeedback: true,
  },
  {
    id: 'timed',
    label: 'Timed module',
    description:
      'Twenty minutes, feedback withheld until the end. This is the one that builds pace — on the real test you cannot check each answer as you go.',
    strategy: 'mixed',
    icon: 'timer',
    count: 15,
    minutes: 20,
    instantFeedback: false,
  },
  {
    id: 'drill',
    label: 'Fresh questions',
    description: 'Only items you have never seen. Useful for an honest read on where you actually are.',
    strategy: 'new',
    icon: 'zap',
    count: 10,
    instantFeedback: true,
  },
];

export function SATPracticePage() {
  const ctx = useEngine();
  const { toast } = useAppStore();
  const [active, setActive] = useState<ModeDef | undefined>(undefined);
  const [section, setSection] = useState<'all' | 'math' | 'reading-writing'>('all');
  const [domain, setDomain] = useState('all');
  const [difficulty, setDifficulty] = useState<'all' | Difficulty>('all');

  const stats = useMemo(() => satStats(ctx), [ctx]);

  const questions = useMemo(() => {
    if (!active) return [];
    return selectQuestions(ctx, {
      exam: 'SAT',
      section: section === 'all' ? undefined : section,
      domains: domain === 'all' ? undefined : [domain],
      difficulties: difficulty === 'all' ? undefined : [difficulty],
      count: active.count,
      minutes: active.minutes,
      strategy: active.strategy,
    });
  }, [active, ctx, section, domain, difficulty]);

  const domains = section === 'math' ? SAT_MATH_DOMAINS : section === 'reading-writing' ? SAT_VERBAL_DOMAINS : [...SAT_MATH_DOMAINS, ...SAT_VERBAL_DOMAINS];

  const weakest = stats.byDomain.filter((d) => d.attempted >= 2).sort((a, b) => a.accuracy - b.accuracy)[0];

  if (active) {
    return (
      <div className="page">
        <QuestionRunner
          questions={questions}
          mode={active.id}
          exam="SAT"
          scope={section === 'all' ? undefined : section}
          title={`SAT · ${active.label}`}
          timedTotalMinutes={active.minutes}
          instantFeedback={active.instantFeedback}
          onExit={() => setActive(undefined)}
          onComplete={() => toast('Attempts saved. Your weakness analysis has been updated.', 'ok')}
        />
      </div>
    );
  }

  return (
    <div className="page">
      <PageHeader
        eyebrow="SAT Lab"
        title="Practice"
        description="Every question is original, written for Pathway AI and labelled as practice. None is reproduced from a College Board test."
        back={{ to: '/app/sat', label: 'SAT Lab' }}
      />

      {weakest ? (
        <Card pad="md">
          <p className="t-sm row g-2">
            <Icon name="sparkles" size={15} className="shrink-0 mt-1" style={{ color: 'var(--ai-text)' }} />
            <span>
              Your weakest domain right now is <span className="w-600">{weakest.label}</span> at {percent(weakest.accuracy)} across{' '}
              {countLabel(weakest.attempted, 'attempt')}. Adaptive practice will weight it heavily — or set the domain filter below to work on it
              directly.
            </span>
          </p>
          <Button
            size="sm"
            className="mt-3"
            onClick={() => {
              setDomain(weakest.label);
              setSection('all');
            }}
          >
            Focus on {weakest.label}
          </Button>
        </Card>
      ) : null}

      <Card pad="md" className="mt-4">
        <div className="row g-3 wrap items-end">
          <label className="col g-1">
            <span className="t-2xs eyebrow">Section</span>
            <select
              className="select"
              style={{ minWidth: 200 }}
              value={section}
              onChange={(e) => {
                setSection(e.target.value as 'all' | 'math' | 'reading-writing');
                setDomain('all');
              }}
            >
              <option value="all">Both sections</option>
              <option value="math">Math</option>
              <option value="reading-writing">Reading &amp; Writing</option>
            </select>
          </label>
          <label className="col g-1">
            <span className="t-2xs eyebrow">Domain</span>
            <select className="select" style={{ minWidth: 250 }} value={domain} onChange={(e) => setDomain(e.target.value)}>
              <option value="all">All domains</option>
              {domains.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </label>
          <label className="col g-1">
            <span className="t-2xs eyebrow">Difficulty</span>
            <select className="select" style={{ minWidth: 160 }} value={difficulty} onChange={(e) => setDifficulty(e.target.value as 'all' | Difficulty)}>
              <option value="all">Adaptive</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </label>
        </div>
        <p className="t-2xs faint mt-3">
          Leaving difficulty on &ldquo;adaptive&rdquo; lets the engine step you up as your accuracy rises, which builds faster than grinding hard
          questions you are not ready for.
        </p>
      </Card>

      <SectionHeader title="Choose a mode" className="mt-6" description="Each one trains something different. Mix them." />
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
                {m.minutes ? `${m.minutes} min` : `${m.count} questions`}
                {m.instantFeedback ? ' · feedback as you go' : ' · feedback at the end'}
              </span>
              <Button size="sm" icon="play" onClick={() => setActive(m)}>
                Start
              </Button>
            </div>
          </Card>
        ))}
      </div>

      <Notice tone="info" icon="info" className="mt-6">
        This demo bank is small by design — a shipped version would carry thousands of items. Practising the same questions repeatedly measures
        your memory, not your ability, so treat repeated accuracy here with suspicion and use full official practice tests for a real read.
      </Notice>
    </div>
  );
}
