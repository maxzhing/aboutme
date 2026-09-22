import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { Badge, Button, Card, Notice } from '@/components/ui/primitives';
import { ProgressRing } from '@/components/charts';
import { Icon } from '@/components/ui/Icon';
import { secondsLabel, percent } from '@/lib/format';
import type { PracticeQuestion, QuestionAttempt } from '@/domain/types';

/* --------------------------------------------------------------------------
   Shared practice runner — sections 30, 34–38.

   Used by SAT practice, AP study mode and unit drills. Every item is an
   original Pathway-written practice question, labelled as such on screen, and
   every answer records an attempt so the weakness tracker has real evidence.
   ----------------------------------------------------------------------- */

export interface RunnerConfig {
  questions: PracticeQuestion[];
  mode: QuestionAttempt['mode'];
  exam: 'SAT' | 'AP';
  title: string;
  /** AP course id or SAT section, recorded on the session. */
  scope?: string;
  /** Timed modes show a countdown and auto-advance on expiry. */
  timedTotalMinutes?: number;
  /** Instant feedback is the default; timed tests defer it to the review. */
  instantFeedback?: boolean;
  onExit: () => void;
  /** Called once when the set is finished, with the attempts made. */
  onComplete?: (results: RunnerResult[]) => void;
}

export interface RunnerResult {
  question: PracticeQuestion;
  response?: string;
  correct: boolean | null;
  elapsedSec: number;
  usedHint: boolean;
  viewedExplanation: boolean;
}

export function QuestionRunner({
  questions,
  mode,
  exam,
  title,
  scope,
  timedTotalMinutes,
  instantFeedback = true,
  onExit,
  onComplete,
}: RunnerConfig) {
  const { recordAttempt, startPracticeSession, completePracticeSession, toast } = useAppStore();
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | undefined>(undefined);
  const [freeText, setFreeText] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [revealedSteps, setRevealedSteps] = useState(0);
  const [usedHint, setUsedHint] = useState(false);
  const [viewedExplanation, setViewedExplanation] = useState(false);
  const [results, setResults] = useState<RunnerResult[]>([]);
  const [finished, setFinished] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [flagged, setFlagged] = useState<Set<string>>(new Set());

  const sessionId = useRef<string | undefined>(undefined);
  const startedAt = useRef(Date.now());
  const questionStart = useRef(Date.now());

  const question = questions[index];
  const isLast = index === questions.length - 1;
  const total = questions.length;

  useEffect(() => {
    if (!questions.length) return;
    sessionId.current = startPracticeSession({
      exam,
      mode,
      label: title,
      scope,
      questionIds: questions.map((q) => q.id),
      targetMinutes: timedTotalMinutes,
    });
    // Session is opened once per mounted runner.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* One ticking clock drives both the per-question timer and the test countdown. */
  useEffect(() => {
    if (finished) return;
    const t = window.setInterval(() => setElapsed(Math.round((Date.now() - startedAt.current) / 1000)), 1000);
    return () => window.clearInterval(t);
  }, [finished]);

  const remainingSec = timedTotalMinutes ? timedTotalMinutes * 60 - elapsed : undefined;

  const finish = useCallback(
    (all: RunnerResult[]) => {
      setFinished(true);
      if (sessionId.current) completePracticeSession(sessionId.current);
      onComplete?.(all);
    },
    [completePracticeSession, onComplete],
  );

  useEffect(() => {
    if (remainingSec !== undefined && remainingSec <= 0 && !finished) {
      toast('Time is up. Everything you answered has been saved.', 'warn');
      finish(results);
    }
  }, [remainingSec, finished, results, finish, toast]);

  if (!questions.length) {
    return (
      <Card pad="lg">
        <p className="t-sm subtle ta-center">
          No questions matched that selection. This demo bank is deliberately small — widen the filters, or try a different topic.
        </p>
        <div className="row center mt-4">
          <Button variant="ghost" onClick={onExit}>
            Back
          </Button>
        </div>
      </Card>
    );
  }

  if (finished) {
    return <RunnerSummary results={results} title={title} onExit={onExit} />;
  }

  const isChoice = Boolean(question.choices?.length);
  const answered = isChoice ? Boolean(selected) : freeText.trim().length > 0;

  function submit() {
    if (!answered || submitted) return;
    const elapsedSec = Math.max(1, Math.round((Date.now() - questionStart.current) / 1000));
    /* Open responses are self-assessed against the rubric — we never pretend to grade prose. */
    const correct = isChoice ? selected === question.correctChoiceId : null;
    const result: RunnerResult = {
      question,
      response: isChoice ? selected : freeText,
      correct,
      elapsedSec,
      usedHint,
      viewedExplanation,
    };
    recordAttempt({
      questionId: question.id,
      exam,
      response: result.response,
      correct,
      elapsedSec,
      usedHint,
      viewedExplanation,
      mode,
      sessionId: sessionId.current,
    });
    setResults((r) => [...r, result]);
    if (instantFeedback) {
      setSubmitted(true);
    } else {
      advance([...results, result]);
    }
  }

  function advance(all: RunnerResult[] = results) {
    if (isLast) {
      finish(all);
      return;
    }
    setIndex((i) => i + 1);
    setSelected(undefined);
    setFreeText('');
    setSubmitted(false);
    setRevealedSteps(0);
    setUsedHint(false);
    setViewedExplanation(false);
    questionStart.current = Date.now();
  }

  function toggleFlag() {
    setFlagged((f) => {
      const next = new Set(f);
      if (next.has(question.id)) next.delete(question.id);
      else next.add(question.id);
      return next;
    });
  }

  const questionElapsed = Math.round((Date.now() - questionStart.current) / 1000);
  const overTime = questionElapsed > question.timeTargetSec * 1.5;

  return (
    <div className="col g-4">
      <Card pad="md">
        <div className="row between g-3 wrap items-center">
          <div className="row g-3 items-center">
            <ProgressRing value={((index + (submitted ? 1 : 0)) / total) * 100} size={44} stroke={5} label={`${index + 1}`} ariaLabel={`Question ${index + 1} of ${total}`} />
            <div>
              <p className="t-sm w-600">{title}</p>
              <p className="t-2xs subtle">
                Question {index + 1} of {total} · {question.domain} · {question.difficulty}
              </p>
            </div>
          </div>
          <div className="row g-3 items-center">
            {remainingSec !== undefined ? (
              <span className={`mono t-sm w-600${remainingSec < 120 ? ' c-warn' : ''}`} aria-live="polite" aria-atomic="true">
                {secondsLabel(Math.max(0, remainingSec))}
              </span>
            ) : (
              <span className="mono t-xs subtle">Target {secondsLabel(question.timeTargetSec)}</span>
            )}
            <Button size="sm" variant={flagged.has(question.id) ? 'soft' : 'ghost'} icon="flag" onClick={toggleFlag} aria-label="Flag for review" />
            <Button size="sm" variant="ghost" icon="x" onClick={onExit}>
              End
            </Button>
          </div>
        </div>
      </Card>

      <Card pad="lg">
        <div className="row g-2 wrap items-center mb-4">
          <Badge tone="ai">Original practice question</Badge>
          <Badge>{question.format.replace(/-/g, ' ')}</Badge>
          <span className="t-2xs faint">Written for Pathway AI — not a College Board item.</span>
        </div>

        {question.stimulus ? (
          <div className={`stimulus stimulus-${question.stimulusKind ?? 'passage'}`}>
            <p className="t-2xs eyebrow mb-2">{question.stimulusKind === 'data' ? 'Data' : question.stimulusKind === 'graph' ? 'Figure' : question.stimulusKind === 'scenario' ? 'Scenario' : 'Passage'}</p>
            <div className="t-sm" style={{ whiteSpace: 'pre-wrap' }}>
              {question.stimulus}
            </div>
          </div>
        ) : null}

        <p className="t-md mt-4" style={{ whiteSpace: 'pre-wrap' }}>
          {question.prompt}
        </p>

        {isChoice ? (
          <fieldset className="col g-2 mt-5" style={{ border: 0, padding: 0, margin: 0 }}>
            <legend className="sr-only">Answer choices</legend>
            {question.choices!.map((choice) => {
              const chosen = selected === choice.id;
              const isCorrect = choice.id === question.correctChoiceId;
              const state = !submitted ? '' : isCorrect ? ' is-correct' : chosen ? ' is-wrong' : '';
              return (
                <label key={choice.id} className={`choice${chosen ? ' is-chosen' : ''}${state}`}>
                  <input
                    type="radio"
                    name={`q-${question.id}`}
                    value={choice.id}
                    checked={chosen}
                    disabled={submitted}
                    onChange={() => setSelected(choice.id)}
                  />
                  <span className="choice-key">{choice.id.toUpperCase()}</span>
                  <span className="grow">
                    {choice.text}
                    {submitted && choice.why ? <span className="block t-2xs subtle mt-2">{choice.why}</span> : null}
                  </span>
                  {submitted && isCorrect ? <Icon name="check" size={15} className="c-ok" /> : null}
                  {submitted && chosen && !isCorrect ? <Icon name="x" size={15} className="c-danger" /> : null}
                </label>
              );
            })}
          </fieldset>
        ) : (
          <div className="mt-5">
            <label className="label" htmlFor={`free-${question.id}`}>
              Your response
            </label>
            <textarea
              id={`free-${question.id}`}
              className="input textarea"
              rows={7}
              value={freeText}
              disabled={submitted}
              onChange={(e) => setFreeText(e.target.value)}
              placeholder="Write your response. On the real exam this would be hand-written under time pressure — try to work at that pace."
            />
            {question.rubric ? (
              <p className="t-2xs faint mt-2">
                Scored out of {question.rubric.points} points on the real exam. You will self-assess against the rubric after submitting.
              </p>
            ) : null}
          </div>
        )}

        {!submitted ? (
          <div className="row between g-3 mt-5 wrap items-center">
            <div className="row g-2">
              {question.hint ? (
                <Button
                  size="sm"
                  variant="ghost"
                  icon="lightbulb"
                  onClick={() => {
                    setUsedHint(true);
                    toast(question.hint!, 'default');
                  }}
                  disabled={usedHint}
                >
                  {usedHint ? 'Hint used' : 'Hint'}
                </Button>
              ) : null}
              {overTime ? (
                <span className="t-2xs c-warn row g-1">
                  <Icon name="clock" size={11} /> Past the target time — on a real exam this is where you would move on.
                </span>
              ) : null}
            </div>
            <Button variant="primary" onClick={submit} disabled={!answered} iconRight="arrow-right">
              {instantFeedback ? 'Check answer' : isLast ? 'Finish' : 'Next question'}
            </Button>
          </div>
        ) : (
          <Feedback
            question={question}
            correct={isChoice ? selected === question.correctChoiceId : null}
            revealedSteps={revealedSteps}
            onRevealStep={() => {
              setRevealedSteps((s) => s + 1);
              setViewedExplanation(true);
            }}
            onViewExplanation={() => setViewedExplanation(true)}
            onNext={() => advance()}
            isLast={isLast}
          />
        )}
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ Feedback */

function Feedback({
  question,
  correct,
  revealedSteps,
  onRevealStep,
  onViewExplanation,
  onNext,
  isLast,
}: {
  question: PracticeQuestion;
  correct: boolean | null;
  revealedSteps: number;
  onRevealStep: () => void;
  onViewExplanation: () => void;
  onNext: () => void;
  isLast: boolean;
}) {
  const [showExplanation, setShowExplanation] = useState(false);
  const steps = question.steps ?? [];

  return (
    <div className="mt-5">
      {correct === true ? (
        <Notice tone="ok" icon="check">
          <span className="w-600">Correct.</span> {question.commonError ? `The common mistake here is ${question.commonError.toLowerCase()} — you avoided it.` : 'Worth checking you got there for the right reason.'}
        </Notice>
      ) : correct === false ? (
        <Notice tone="warn" icon="alert">
          <span className="w-600">Not quite.</span> {question.commonError ? `This item is built around one specific mistake: ${question.commonError}` : 'Work through the steps below before reading the full explanation.'}
        </Notice>
      ) : (
        <Notice tone="info" icon="info">
          <span className="w-600">Self-assess this one.</span> We do not grade written responses automatically — an algorithm scoring your prose
          would teach you the wrong thing. Compare yours against the rubric and sample below.
        </Notice>
      )}

      {steps.length ? (
        <div className="mt-4">
          <p className="t-2xs eyebrow mb-2">Work it through</p>
          <ol className="col g-2">
            {steps.slice(0, revealedSteps).map((s, i) => (
              <li key={s} className="row g-2 t-sm subtle">
                <span className="step-num">{i + 1}</span>
                <span>{s}</span>
              </li>
            ))}
          </ol>
          {revealedSteps < steps.length ? (
            <Button size="sm" variant="ghost" icon="chevron-down" onClick={onRevealStep} className="mt-2">
              {revealedSteps === 0 ? 'Show the first step' : `Show step ${revealedSteps + 1} of ${steps.length}`}
            </Button>
          ) : null}
        </div>
      ) : null}

      {question.rubric ? (
        <div className="mt-4">
          <p className="t-2xs eyebrow mb-2">Rubric — {question.rubric.points} points</p>
          <ul className="col g-1">
            {question.rubric.criteria.map((c) => (
              <li key={c} className="t-sm subtle">
                • {c}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-4">
        {showExplanation ? (
          <div className="explain-open">
            <p className="t-2xs eyebrow mb-2">Full explanation</p>
            <p className="t-sm" style={{ whiteSpace: 'pre-wrap' }}>
              {question.explanation}
            </p>
            {question.sampleResponse ? (
              <>
                <p className="t-2xs eyebrow mt-4 mb-2">A response that would score well</p>
                <p className="t-sm subtle" style={{ whiteSpace: 'pre-wrap' }}>
                  {question.sampleResponse}
                </p>
              </>
            ) : null}
            <p className="t-2xs faint mt-3">
              Concept tested: {question.concept}. Skill: {question.skill}.
            </p>
          </div>
        ) : (
          <Button
            size="sm"
            variant="ghost"
            icon="book"
            onClick={() => {
              setShowExplanation(true);
              onViewExplanation();
            }}
          >
            Read the full explanation
          </Button>
        )}
      </div>

      <div className="row end mt-5">
        <Button variant="primary" onClick={onNext} iconRight={isLast ? undefined : 'arrow-right'}>
          {isLast ? 'Finish and review' : 'Next question'}
        </Button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------- Summary */

function RunnerSummary({ results, title, onExit }: { results: RunnerResult[]; title: string; onExit: () => void }) {
  const graded = results.filter((r) => r.correct !== null);
  const correct = graded.filter((r) => r.correct).length;
  const accuracy = graded.length ? Math.round((correct / graded.length) * 100) : undefined;
  const totalSec = results.reduce((n, r) => n + r.elapsedSec, 0);
  const missed = results.filter((r) => r.correct === false);
  const selfAssess = results.filter((r) => r.correct === null);

  const byDomain = useMemo(() => {
    const map = new Map<string, { total: number; correct: number }>();
    for (const r of graded) {
      const entry = map.get(r.question.domain) ?? { total: 0, correct: 0 };
      entry.total += 1;
      if (r.correct) entry.correct += 1;
      map.set(r.question.domain, entry);
    }
    return Array.from(map.entries()).sort((a, b) => a[1].correct / a[1].total - b[1].correct / b[1].total);
  }, [graded]);

  return (
    <div className="col g-4">
      <Card pad="lg">
        <div className="row g-5 wrap items-center">
          {accuracy !== undefined ? (
            <ProgressRing value={accuracy} size={110} stroke={9} label={`${accuracy}%`} sublabel="accuracy" ariaLabel={`${accuracy} percent accuracy`} />
          ) : null}
          <div className="grow">
            <h2 className="t-lg w-600">{title} — done</h2>
            <p className="t-sm subtle mt-2">
              {graded.length ? `${correct} of ${graded.length} auto-graded questions correct` : 'No auto-graded questions in this set'}
              {selfAssess.length ? `, plus ${selfAssess.length} to self-assess` : ''}. Total time {secondsLabel(totalSec)}.
            </p>
            <p className="t-2xs faint mt-2">
              Accuracy on {results.length} practice questions is a signal about this set, not a score. It moves around a lot at small sample
              sizes — what matters is the pattern across sessions.
            </p>
          </div>
        </div>
      </Card>

      {byDomain.length ? (
        <Card pad="md">
          <h3 className="t-sm w-600">By topic, weakest first</h3>
          <div className="col g-2 mt-3">
            {byDomain.map(([domain, s]) => (
              <div key={domain} className="row between g-3 t-sm">
                <span className="subtle">{domain}</span>
                <span className="mono">
                  {s.correct}/{s.total} · {percent((s.correct / s.total) * 100)}
                </span>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      {missed.length ? (
        <Card pad="md">
          <h3 className="t-sm w-600">What you missed</h3>
          <p className="t-2xs subtle mt-1">These are now weighted more heavily in your adaptive practice.</p>
          <div className="col g-3 mt-3">
            {missed.map((r) => (
              <div key={r.question.id} className="card card-pad-sm">
                <p className="t-xs w-600">{r.question.concept}</p>
                <p className="t-sm subtle mt-2">{r.question.prompt.slice(0, 180)}{r.question.prompt.length > 180 ? '…' : ''}</p>
                {r.question.commonError ? <p className="t-2xs c-warn mt-2">{r.question.commonError}</p> : null}
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      {selfAssess.length ? (
        <Card pad="md">
          <h3 className="t-sm w-600">Written responses to score yourself</h3>
          <div className="col g-3 mt-3">
            {selfAssess.map((r) => (
              <div key={r.question.id} className="card card-pad-sm">
                <p className="t-xs w-600">{r.question.concept}</p>
                {r.question.rubric ? (
                  <ul className="col g-1 mt-2">
                    {r.question.rubric.criteria.map((c) => (
                      <li key={c} className="t-xs subtle">
                        • {c}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      <div className="row g-2">
        <Button variant="primary" onClick={onExit}>
          Done
        </Button>
      </div>
    </div>
  );
}
