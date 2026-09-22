import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppStore } from '@/store/useAppStore';
import { Badge, Button, Card, Modal, SearchInput, Tabs } from '@/components/ui/primitives';
import { PageHeader, SectionHeader } from '@/components/ui/shared';
import { AP_COURSE_BY_ID } from '@/data/ap';
import { AP_QUESTIONS } from '@/data/questions';
import { QuestionRunner } from '@/features/practice/QuestionRunner';
import { searchItems } from '@/lib/search';
import { countLabel, secondsLabel, uniq } from '@/lib/format';
import { Icon } from '@/components/ui/Icon';
import type { Difficulty, PracticeQuestion } from '@/domain/types';

/* Section 34 — AP question bank, browsable and filterable. */

export function APQuestionBank() {
  const { state, toggleSaved, toast } = useAppStore();
  const [tab, setTab] = useState('browse');
  const [query, setQuery] = useState('');
  const [course, setCourse] = useState('all');
  const [difficulty, setDifficulty] = useState<'all' | Difficulty>('all');
  const [format, setFormat] = useState('all');
  const [preview, setPreview] = useState<PracticeQuestion | undefined>(undefined);
  const [running, setRunning] = useState<PracticeQuestion[] | undefined>(undefined);

  const attemptsByQuestion = useMemo(() => {
    const map = new Map<string, number>();
    for (const a of state.attempts) map.set(a.questionId, (map.get(a.questionId) ?? 0) + 1);
    return map;
  }, [state.attempts]);

  const savedIds = new Set(
    state.savedItems.filter((s) => s.targetType === 'question' && s.status !== 'dismissed').map((s) => s.targetId),
  );

  const courses = useMemo(() => uniq(AP_QUESTIONS.map((q) => q.courseId).filter((c): c is string => Boolean(c))), []);
  const formats = useMemo(() => uniq(AP_QUESTIONS.map((q) => q.format)), []);

  const filtered = useMemo(() => {
    let pool = AP_QUESTIONS;
    if (course !== 'all') pool = pool.filter((q) => q.courseId === course);
    if (difficulty !== 'all') pool = pool.filter((q) => q.difficulty === difficulty);
    if (format !== 'all') pool = pool.filter((q) => q.format === format);
    if (tab === 'saved') pool = pool.filter((q) => savedIds.has(q.id));
    if (tab === 'missed') {
      const missed = new Set(state.attempts.filter((a) => a.exam === 'AP' && a.correct === false).map((a) => a.questionId));
      pool = pool.filter((q) => missed.has(q.id));
    }
    if (!query.trim()) return pool;
    return searchItems(query, pool, [
      { get: (q) => q.prompt, weight: 1 },
      { get: (q) => q.concept, weight: 0.8 },
      { get: (q) => q.domain, weight: 0.6 },
      { get: (q) => q.skill, weight: 0.5 },
      { get: (q) => q.tags, weight: 0.4 },
    ]).map((r) => r.item);
  }, [query, course, difficulty, format, tab, savedIds, state.attempts]);

  if (running) {
    return (
      <div className="page">
        <QuestionRunner
          questions={running}
          mode="drill"
          exam="AP"
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
        eyebrow="AP Center"
        title="Question bank"
        description={`${countLabel(AP_QUESTIONS.length, 'original AP-style practice question')} written for Pathway AI, each with a worked explanation and the specific mistake it is built to expose.`}
        back={{ to: '/app/ap', label: 'AP Center' }}
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
            <span className="w-600">Every item here is original.</span> Pathway AI does not reproduce College Board questions, licensed or
            otherwise, and these are labelled as practice questions everywhere they appear. They are written to match the style and the reasoning
            an AP exam asks for — they are not released exam items and should not be treated as predictive of one.
          </span>
        </p>
      </Card>

      <div className="mt-6">
        <Tabs
          ariaLabel="Question bank views"
          active={tab}
          onChange={setTab}
          items={[
            { id: 'browse', label: 'All questions', count: AP_QUESTIONS.length },
            { id: 'missed', label: 'Ones you missed' },
            { id: 'saved', label: 'Saved', count: savedIds.size },
          ]}
        />
      </div>

      <Card pad="md" className="mt-4">
        <div className="row g-3 wrap">
          <SearchInput value={query} onChange={setQuery} label="Search questions" placeholder="Search by concept, skill or prompt…" />
          <select className="select" style={{ maxWidth: 230 }} value={course} onChange={(e) => setCourse(e.target.value)} aria-label="Course">
            <option value="all">All courses</option>
            {courses.map((c) => (
              <option key={c} value={c}>
                {AP_COURSE_BY_ID.get(c)?.name ?? c}
              </option>
            ))}
          </select>
          <select className="select" style={{ maxWidth: 160 }} value={difficulty} onChange={(e) => setDifficulty(e.target.value as 'all' | Difficulty)} aria-label="Difficulty">
            <option value="all">Any difficulty</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
          <select className="select" style={{ maxWidth: 200 }} value={format} onChange={(e) => setFormat(e.target.value)} aria-label="Question format">
            <option value="all">Any format</option>
            {formats.map((f) => (
              <option key={f} value={f}>
                {f.replace(/-/g, ' ')}
              </option>
            ))}
          </select>
        </div>
      </Card>

      <p className="t-xs subtle mt-4">{countLabel(filtered.length, 'question')} shown.</p>

      {filtered.length ? (
        <div className="col g-3 mt-3">
          {filtered.map((q) => {
            const attempts = attemptsByQuestion.get(q.id) ?? 0;
            const lastAttempt = [...state.attempts].reverse().find((a) => a.questionId === q.id);
            return (
              <Card key={q.id} pad="md" hover>
                <div className="row between g-3 items-start wrap">
                  <div className="grow" style={{ minWidth: 0 }}>
                    <div className="row g-2 wrap items-center">
                      <Badge tone="ai">Practice question</Badge>
                      <Badge>{q.difficulty}</Badge>
                      <span className="t-2xs subtle">
                        {q.courseId ? AP_COURSE_BY_ID.get(q.courseId)?.name : 'AP'} · {q.domain}
                      </span>
                      {attempts ? (
                        <Badge tone={lastAttempt?.correct === true ? 'ok' : lastAttempt?.correct === false ? 'warn' : 'default'}>
                          {lastAttempt?.correct === true ? 'got it' : lastAttempt?.correct === false ? 'missed' : 'attempted'}
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
              ? 'You have not missed any AP questions yet — either you have not practised, or you are doing well. Either way, nothing to review here.'
              : tab === 'saved'
                ? 'No saved questions. Bookmark one from the browse tab to build a set you want to come back to.'
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
              <Badge>{preview.format.replace(/-/g, ' ')}</Badge>
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
            {preview.commonError ? <p className="t-xs c-warn">Common error: {preview.commonError}</p> : null}
            <div className="row g-2">
              <Button
                onClick={() => {
                  const q = preview;
                  setPreview(undefined);
                  setRunning([q]);
                }}
                icon="play"
              >
                Answer it properly
              </Button>
              {preview.courseId ? (
                <Button variant="ghost" to={`/app/ap/course/${preview.courseId}`} onClick={() => setPreview(undefined)}>
                  Open the course
                </Button>
              ) : null}
            </div>
          </div>
        ) : null}
      </Modal>

      <p className="t-2xs faint mt-6">
        A shipped version of Pathway AI would carry thousands of items across every AP course.{' '}
        <Link to="/app/ap" className="c-accent">
          Back to the AP Center
        </Link>
        .
      </p>
    </div>
  );
}
