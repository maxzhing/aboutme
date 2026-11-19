'use client';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, Check, Eye, Timer, X } from 'lucide-react';
import { Figure } from '@/components/Figure';
import { RichText } from '@/components/RichText';
import { Card, Empty, PageHeader, cn } from '@/components/ui';
import { PREDICT } from '@/data/predict';
import { QUESTIONS } from '@/data/questions';
import { isCorrect } from '@/lib/answers';
import { useSearchParams } from 'next/navigation';
import { useStore } from '@/lib/store';
import { SKILL } from '@/lib/taxonomy';
import type { PredictionRow, Question, SkillId } from '@/lib/types';
import { rng, shuffle, uid } from '@/lib/util';

/** The student's own pattern: how often predictions matched, and accuracy when they did and did not. */
export function predictionPattern(rows: PredictionRow[]) {
  const by = (k: PredictionRow['self']) => rows.filter((r) => r.self === k);
  const acc = (rs: PredictionRow[]) => { const graded = rs.filter((r) => r.correct !== undefined); return graded.length ? { right: graded.filter((r) => r.correct).length, n: graded.length } : null; };
  return { n: rows.length, matched: by('matched').length, close: by('close').length, missed: by('missed').length, whenMatched: acc(by('matched')), whenMissed: acc([...by('close'), ...by('missed')]) };
}

/**
 * Predict-First (N8): a Reading & Writing training mode, never part of a mock test. The passage and question
 * come first with the choices hidden; the student commits to a short prediction, then sees the choices,
 * answers, and grades their own prediction: matched, close or missed.
 */
export function PredictPage() {
  const sp = useSearchParams();
  const skill = sp.get('skill') as SkillId | null;
  const rows = useStore((s) => s.predictions) ?? [];
  const qs = useMemo(() => shuffle(QUESTIONS.filter((q) => q.section === 'rw' && q.type === 'mcq' && PREDICT[q.skill] && (!skill || q.skill === skill)), rng(`predict-${Date.now()}`)).slice(0, 10),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [skill]);
  const [i, setI] = useState(0);
  const [timer, setTimer] = useState(false);
  const pat = predictionPattern(rows);
  if (!qs.length) return <Empty title="No questions for this type" body="Predict-First uses Reading & Writing questions." action={{ label: 'Predict-First', href: '/predict' }} />;
  return (
    <div className="mx-auto max-w-3xl" data-testid="predict">
      <PageHeader eyebrow="Practice" title="Predict-First" subtitle="Read the passage and the question, decide what the answer must say, then look at the choices. It trains you to answer from the text, not from the choices. Training only: mock tests never hide the choices." />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Link href="/predict" className={cn('chip', !skill && '!border-ink !text-ink')}>All types</Link>
        {Object.keys(PREDICT).map((k) => <Link key={k} href={`/predict?skill=${k}`} className={cn('chip', skill === k && '!border-ink !text-ink')}>{SKILL[k as SkillId].short}</Link>)}
        <button type="button" className={cn('chip ml-auto', timer && '!border-ink !text-ink')} aria-pressed={timer} onClick={() => setTimer(!timer)}><Timer size={13} aria-hidden />Soft timer</button>
      </div>
      {i < qs.length ? <PredictItem key={qs[i].id} q={qs[i]} n={i + 1} total={qs.length} timer={timer} onNext={() => setI(i + 1)} /> : (
        <Card><h2 className="text-[22px]">Set finished</h2><p className="mt-1 text-[15px] text-muted">Start another set, or try one question type at a time.</p><button type="button" className="btn-primary mt-3" onClick={() => setI(0)}>Another set</button></Card>
      )}
      <Card className="mt-6" data-testid="predict-pattern">
        <h2 className="text-[20px]">Your pattern</h2>
        {pat.n === 0 ? <p className="mt-1 text-[15px] text-muted">No predictions yet. After a few, this shows how often your prediction matched the right answer, and your accuracy when it did and when it did not.</p> : (
          <ul className="mt-2 space-y-1 text-[15px]" data-num>
            <li>{pat.n} predictions: {pat.matched} matched, {pat.close} close, {pat.missed} missed (your own grading).</li>
            {pat.whenMatched && <li>When your prediction matched: {pat.whenMatched.right} of {pat.whenMatched.n} answered right.</li>}
            {pat.whenMissed && <li>When it was close or missed: {pat.whenMissed.right} of {pat.whenMissed.n} answered right.</li>}
            {pat.n < 10 && <li className="text-muted">Too few to read much into yet.</li>}
          </ul>
        )}
      </Card>
    </div>
  );
}

function PredictItem({ q, n, total, timer, onNext }: { q: Question; n: number; total: number; timer: boolean; onNext: () => void }) {
  const answer = useStore((s) => s.answer);
  const addPrediction = useStore((s) => s.addPrediction);
  const started = useRef(Date.now()).current;
  const session = useRef(uid()).current;
  const p = PREDICT[q.skill]!;
  const [pred, setPred] = useState('');
  const [stage, setStage] = useState<'predict' | 'choose' | 'grade' | 'done'>('predict');
  const [choice, setChoice] = useState<string | null>(null);
  const [correct, setCorrect] = useState<boolean | null>(null);
  const check = () => { const ok = isCorrect(q, choice); setCorrect(ok); answer({ qid: q.id, answer: choice, ms: Date.now() - started, hints: 0, mode: 'predict', sessionId: session }); setStage('grade'); };
  const grade = (self: PredictionRow['self']) => { addPrediction({ qid: q.id, at: Date.now(), prediction: pred.trim(), self, correct: correct ?? undefined }); setStage('done'); };
  return (
    <Card data-testid="predict-item">
      <p className="text-[13px] text-faint" data-num>Question {n} of {total} · {SKILL[q.skill].short}{timer && <Elapsed since={started} />}</p>
      <div className="mt-2 space-y-3">
        {q.figure && <Figure figure={q.figure} />}
        {q.passage && <RichText block text={q.passage} className="passage whitespace-pre-line" />}
        {q.notes && <ul className="passage list-disc space-y-1.5 pl-5">{q.notes.map((x, k) => <li key={k}><RichText text={x} /></li>)}</ul>}
        <p className="font-medium"><RichText text={q.stem} /></p>
      </div>
      <div className="mt-4 rounded-xl border border-line bg-raised/40 p-3">
        <label htmlFor={`pred-${q.id}`} className="block text-[15px] font-medium">{p.prompt}</label>
        {p.picks && <div className="mt-2 flex flex-wrap gap-1.5">{p.picks.map((x) => <button key={x} type="button" disabled={stage !== 'predict'} className={cn('chip', pred === x && '!border-ink !text-ink')} onClick={() => setPred(x)}>{x}</button>)}</div>}
        <textarea id={`pred-${q.id}`} rows={2} className="input mt-2" value={pred} onChange={(e) => setPred(e.target.value)} disabled={stage !== 'predict'} data-testid="prediction" />
        {stage === 'predict' && <button type="button" className="btn-primary mt-2" disabled={!pred.trim()} onClick={() => setStage('choose')} data-testid="show-choices"><Eye size={16} aria-hidden />Show the choices</button>}
      </div>
      {stage !== 'predict' && (
        <div className="mt-4">
          <div role="radiogroup" aria-label="Answer choices" className="space-y-2">
            {q.choices!.map((c, k) => {
              const key = String(k), right = stage !== 'choose' && key === String(q.answer), wrong = stage !== 'choose' && choice === key && !right;
              return (
                <button key={k} type="button" role="radio" aria-checked={choice === key} disabled={stage !== 'choose'} onClick={() => setChoice(key)} data-choice={'ABCD'[k]}
                  className={cn('flex w-full items-start gap-3 border px-3 py-2.5 text-left', choice === key ? 'border-accent' : 'border-line', right && '!border-ok bg-ok/10', wrong && '!border-bad bg-bad/10')}>
                  <span className="font-semibold">{'ABCD'[k]}</span><span className="min-w-0 flex-1"><RichText text={c} /></span>{right && <Check size={18} className="text-ok" aria-label="correct answer" />}{wrong && <X size={18} className="text-bad" aria-label="your answer, incorrect" />}
                </button>
              );
            })}
          </div>
          {stage === 'choose' && <button type="button" className="btn-primary mt-3" disabled={choice === null} onClick={check} data-testid="predict-check">Check</button>}
          {stage !== 'choose' && (
            <div className="mt-3 space-y-3">
              <p className={cn('font-medium', correct ? 'text-ok' : 'text-bad')} role="status">{correct ? 'Correct.' : 'Not this time.'} <span className="font-normal text-ink"><RichText text={q.why[Number(q.answer)]} /></span></p>
              {stage === 'grade' ? (
                <div><p className="text-[15px] font-medium">How close was your prediction to the right answer?</p>
                  <div className="mt-2 flex flex-wrap gap-2">{(['matched', 'close', 'missed'] as const).map((k) => <button key={k} type="button" className="btn-ghost" onClick={() => grade(k)} data-testid={`self-${k}`}>{{ matched: 'Matched', close: 'Close', missed: 'Missed' }[k]}</button>)}</div></div>
              ) : <button type="button" className="btn-primary" onClick={onNext} data-testid="predict-next">Next question<ArrowRight size={16} aria-hidden /></button>}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

function Elapsed({ since }: { since: number }) {
  const [, tick] = useState(0);
  useEffect(() => { const t = setInterval(() => tick((x) => x + 1), 1000); return () => clearInterval(t); }, []);
  const s = Math.floor((Date.now() - since) / 1000);
  return <span> · <span data-num>{Math.floor(s / 60)}:{String(s % 60).padStart(2, '0')}</span></span>;
}
