import { useMemo, useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { Badge, Button, Card, Modal, SearchInput, Tabs } from '@/components/ui/primitives';
import { PageHeader, SectionHeader } from '@/components/ui/shared';
import { SAT_QUESTIONS, SAT_MATH_DOMAINS, SAT_VERBAL_DOMAINS } from '@/data/questions';
import { QuestionRunner } from '@/features/practice/QuestionRunner';
import { searchItems } from '@/lib/search';
import { countLabel, secondsLabel } from '@/lib/format';
import { Icon } from '@/components/ui/Icon';
import type { Difficulty, PracticeQuestion } from '@/domain/types';

/* Section 34 — SAT question bank. */

export function SATBankPage() {
  const { state, toggleSaved, toast } = useAppStore();
  const [tab, setTab] = useState('browse');
  const [query, setQuery] = useState('');
  const [section, setSection] = useState<'all' | 'math' | 'reading-writing'>('all');
  const [domain, setDomain] = useState('all');
  const [difficulty, setDifficulty] = useState<'all' | Difficulty>('all');
  const [preview, setPreview] = useState<PracticeQuestion | undefined>(undefined);
  const [running, setRunning] = useState<PracticeQuestion[] | undefined>(undefined);

  const savedIds = new Set(
    state.savedItems.filter((s) => s.targetType === 'question' && s.status !== 'dismissed').map((s) => s.targetId),
  );
  const missedIds = new Set(state.attempts.filter((a) => a.exam === 'SAT' && a.correct === false).map((a) => a.questionId));

  const domains = section === 'math' ? SAT_MATH_DOMAINS : section === 'reading-writing' ? SAT_VERBAL_DOMAINS : [...SAT_MATH_DOMAINS, ...SAT_VERBAL_DOMAINS];

  const filtered = useMemo(() => {
    let pool = SAT_QUESTIONS;
    if (section !== 'all') pool = pool.filter((q) => q.satSection === section);
    if (domain !== 'all') pool = pool.filter((q) => q.domain === domain);
    if (difficulty !== 'all') pool = pool.filter((q) => q.difficulty === difficulty);
    if (tab === 'saved') pool = pool.filter((q) => savedIds.has(q.id));
    if (tab === 'missed') pool = pool.filter((q) => missedIds.has(q.id));
    if (!query.trim()) return pool;
    return searchItems(query, pool, [
      { get: (q) => q.prompt, weight: 1 },
      { get: (q) => q.concept, weight: 0.8 },
      { get: (q) => q.domain, weight: 0.6 },
      { get: (q) => q.skill, weight: 0.5 },
    ]).map((r) => r.item);
  }, [query, section, domain, difficulty, tab, savedIds, missedIds]);

  if (running) {
    return (
      <div className="page">
        <QuestionRunner
          questions={running}
          mode="drill"
          exam="SAT"
          title="Question bank drill"
          onExit={() => setRunning(undefined)}
          onComplete={() => toast('Attempts saved.', 'ok')}
        />
      </div>
    );
  }

  return (
    <div className="page">
      <PageHeader
        eyebrow="SAT Lab"
        title="Question bank"
        description={`${countLabel(SAT_QUESTIONS.length, 'original practice question')} across Math and Reading & Writing, each with a full explanation and the specific error it is designed to catch.`}
        back={{ to: '/app/sat', label: 'SAT Lab' }}
        actions={
          <Button variant="primary" icon="play" disabled={!filtered.length} onClick={() => setRunning(filtered.slice(0, 10))}>
            Drill these ({Math.min(filtered.length, 10)})
          </Button>
        }
      />

      <Card pad="md">
        <p className="t-sm row g-2">
          <Icon name="shield" size={15} className="c-accent shrink-0 mt-1" />
          <span>
            <span className="w-600">Original items only.</span> Pathway AI writes its own practice questions rather than reproducing College
            Board material. They target the same reasoning and the same traps, but they are not real test questions and performance here does not
            translate to a score.
          </span>
        </p>
      </Card>

      <div className="mt-6">
        <Tabs
          ariaLabel="Question bank views"
          active={tab}
          onChange={setTab}
          items={[
            { id: 'browse', label: 'All questions', count: SAT_QUESTIONS.length },
            { id: 'missed', label: 'Ones you missed', count: missedIds.size },
            { id: 'saved', label: 'Saved', count: savedIds.size },
          ]}
        />
      </div>

      <Card pad="md" className="mt-4">
        <div className="row g-3 wrap">
          <SearchInput value={query} onChange={setQuery} label="Search questions" placeholder="Search by concept, skill or prompt…" />
          <select
            className="select"
            style={{ maxWidth: 210 }}
            value={section}
            onChange={(e) => {
              setSection(e.target.value as 'all' | 'math' | 'reading-writing');
              setDomain('all');
            }}
            aria-label="Section"
          >
            <option value="all">Both sections</option>
            <option value="math">Math</option>
            <option value="reading-writing">Reading &amp; Writing</option>
          </select>
          <select className="select" style={{ maxWidth: 250 }} value={domain} onChange={(e) => setDomain(e.target.value)} aria-label="Domain">
            <option value="all">All domains</option>
            {domains.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
          <select className="select" style={{ maxWidth: 160 }} value={difficulty} onChange={(e) => setDifficulty(e.target.value as 'all' | Difficulty)} aria-label="Difficulty">
            <option value="all">Any difficulty</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>
      </Card>

      <p className="t-xs subtle mt-4">{countLabel(filtered.length, 'question')} shown.</p>

      {filtered.length ? (
        <div className="col g-3 mt-3">
          {filtered.map((q) => {
            const lastAttempt = [...state.attempts].reverse().find((a) => a.questionId === q.id);
            return (
              <Card key={q.id} pad="md" hover>
                <div className="row between g-3 items-start wrap">
                  <div className="grow" style={{ minWidth: 0 }}>
                    <div className="row g-2 wrap items-center">
                      <Badge tone="ai">Practice question</Badge>
                      <Badge>{q.difficulty}</Badge>
                      <span className="t-2xs subtle">
                        {q.satSection === 'math' ? 'Math' : 'Reading & Writing'} · {q.domain}
                      </span>
                      {lastAttempt ? (
                        <Badge tone={lastAttempt.correct === true ? 'ok' : lastAttempt.correct === false ? 'warn' : 'default'}>
                          {lastAttempt.correct === true ? 'got it' : lastAttempt.correct === false ? 'missed' : 'attempted'}
                        </Badge>
                      ) : null}
                    </div>
                    <p className="t-sm mt-3 clamp-2">{q.prompt}</p>
                    <p className="t-2xs faint mt-2">
                      Tests {q.concept} · target {secondsLabel(q.timeTargetSec)}
                    </p>
                  </div>
                  <div className="row g-2">
                    <Button
                      size="sm"
                      variant={savedIds.has(q.id) ? 'soft' : 'ghost'}
                      icon="bookmark"
                      aria-label="Save question"
                      onClick={() => toggleSaved('question', q.id)}
                    />
                    <Button size="sm" variant="ghost" onClick={() => setPreview(q)}>
                      Preview
                    </Button>
                    <Button size="sm" icon="play" onClick={() => setRunning([q])}>
                      Try it
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card pad="lg" className="mt-3">
          <p className="t-sm subtle ta-center">
            {tab === 'missed'
              ? 'Nothing missed yet in this section. Either you have not practised here, or you are getting them right.'
              : tab === 'saved'
                ? 'No saved questions. Bookmark one to build a set to come back to.'
                : 'Nothing matched those filters.'}
          </p>
        </Card>
      )}

      <Modal open={Boolean(preview)} onClose={() => setPreview(undefined)} title="Question preview" size="lg">
        {preview ? (
          <div className="col g-4">
            <div className="row g-2 wrap">
              <Badge tone="ai">Original practice question</Badge>
              <Badge>{preview.difficulty}</Badge>
              <Badge>{preview.satSection === 'math' ? 'Math' : 'Reading & Writing'}</Badge>
            </div>
            {preview.stimulus ? (
              <div className={`stimulus stimulus-${preview.stimulusKind ?? 'passage'}`}>
                <div className="t-sm" style={{ whiteSpace: 'pre-wrap' }}>
                  {preview.stimulus}
                </div>
              </div>
            ) : null}
            <p className="t-md" style={{ whiteSpace: 'pre-wrap' }}>
              {preview.prompt}
            </p>
            {preview.choices ? (
              <ol className="col g-2">
                {preview.choices.map((c) => (
                  <li key={c.id} className={`choice${c.id === preview.correctChoiceId ? ' is-correct' : ''}`}>
                    <span className="choice-key">{c.id.toUpperCase()}</span>
                    <span className="grow">
                      {c.text}
                      {c.why ? <span className="block t-2xs subtle mt-1">{c.why}</span> : null}
                    </span>
                  </li>
                ))}
              </ol>
            ) : null}
            <SectionHeader title="Explanation" />
            <p className="t-sm subtle" style={{ whiteSpace: 'pre-wrap' }}>
              {preview.explanation}
            </p>
            {preview.steps?.length ? (
              <>
                <p className="t-2xs eyebrow">Worked steps</p>
                <ol className="col g-2">
                  {preview.steps.map((s, i) => (
                    <li key={s} className="row g-2 t-sm subtle">
                      <span className="step-num">{i + 1}</span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ol>
              </>
            ) : null}
            {preview.commonError ? <p className="t-xs c-warn">Common error: {preview.commonError}</p> : null}
            <div className="row g-2">
              <Button
                icon="play"
                onClick={() => {
                  const q = preview;
                  setPreview(undefined);
                  setRunning([q]);
                }}
              >
                Answer it properly
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
