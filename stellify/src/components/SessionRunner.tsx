'use client';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Bookmark, BookmarkCheck, Bot, Clock, Flag, Lightbulb, NotebookPen, SkipForward, TriangleAlert } from 'lucide-react';
import { sfx } from '@/lib/sfx';
import { Confetti } from './Confetti';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PracticeMode, Question } from '@/lib/types';
import { getQuestion } from '@/data/questions';
import { useStore } from '@/lib/store';
import { isCorrect } from '@/lib/answers';
import { SKILL } from '@/lib/taxonomy';
import { fmtClock, fmtDuration, pct, uid } from '@/lib/util';
import { Explanation, QuestionMeta, QuestionView } from './Question';
import { TutorChat } from './TutorChat';
import { Pet } from './Pet';
import { RichText } from './RichText';
import { HackCard } from './HackCard';
import { hacksFor } from '@/data/hacks';
import { Badge, Card, Modal, Progress, cn } from './ui';

export interface SessionRow { qid: string; answer: string | null; correct: boolean; ms: number; hints: number }
export interface SessionResult { rows: SessionRow[]; totalMs: number; correct: number; xp: number }
export interface SessionConfig {
  qids: string[];
  mode: PracticeMode;
  title: string;
  reasons?: Record<string, string>;
  /** 'immediate' shows the explanation after each answer; 'end' holds feedback until the set is submitted */
  feedback?: 'immediate' | 'end';
  totalMs?: number;
  perQuestionMs?: number;
  hints?: boolean;
  backHref?: string;
  onComplete?: (r: SessionResult) => void;
  completeLabel?: string;
  completeHref?: string;
}

const REPORT_REASONS = ['The answer key seems wrong', 'More than one answer seems correct', 'Typo or formatting problem', 'The explanation is unclear', 'Something else'];

export function SessionRunner(cfg: SessionConfig) {
  const questions = useMemo(() => cfg.qids.map(getQuestion).filter((q): q is Question => !!q), [cfg.qids]);
  const feedback = cfg.feedback ?? 'immediate';
  const hintsOn = cfg.hints ?? feedback === 'immediate';
  const store = useStore();
  const showTimer = store.settings.showTimer;
  const sessionId = useRef(uid()).current;
  const xpStart = useRef(store.pet.xp).current;
  const startedAt = useRef(Date.now()).current;

  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | null>>({});
  const [submitted, setSubmitted] = useState<Record<string, boolean>>({});
  const [hints, setHints] = useState<Record<string, number>>({});
  const [flagged, setFlagged] = useState<string[]>([]);
  const [elim, setElim] = useState<Record<string, number[]>>({});
  const [done, setDone] = useState<SessionResult | null>(null);
  const [panel, setPanel] = useState<'tutor' | 'report' | 'note' | null>(null);
  const [reviewId, setReviewId] = useState<string | null>(null);
  const [hackFor, setHackFor] = useState<string | null>(null);
  const [combo, setCombo] = useState(0);
  const [fire, setFire] = useState(0);
  const [, setTick] = useState(0);
  const spent = useRef<Record<string, number>>({});
  const enterAt = useRef(Date.now());
  const finished = useRef(false);

  const q = questions[idx];
  const isSubmitted = q ? !!submitted[q.id] || !!done : false;

  const bank = useCallback(() => {
    const cur = questions[idx];
    if (cur && !(feedback === 'immediate' && submitted[cur.id])) spent.current[cur.id] = (spent.current[cur.id] ?? 0) + (Date.now() - enterAt.current);
    enterAt.current = Date.now();
  }, [questions, idx, feedback, submitted]);

  const liveMs = (id: string) => (spent.current[id] ?? 0) + (questions[idx]?.id === id && !(feedback === 'immediate' && submitted[id]) && !done ? Date.now() - enterAt.current : 0);

  const finish = useCallback((subs: Record<string, boolean>, ans: Record<string, string | null>) => {
    if (finished.current) return;
    finished.current = true;
    const rows: SessionRow[] = questions.map((x) => ({ qid: x.id, answer: ans[x.id] ?? null, correct: isCorrect(x, ans[x.id] ?? null), ms: Math.round(spent.current[x.id] ?? 0), hints: hints[x.id] ?? 0 }));
    if (feedback === 'end') {
      for (const r of rows) store.answer({ qid: r.qid, answer: r.answer, ms: r.ms, hints: 0, mode: cfg.mode, sessionId });
    } else {
      // anything seen but never submitted was abandoned
      for (const r of rows) if (!subs[r.qid] && (spent.current[r.qid] ?? 0) > 3000) store.answer({ qid: r.qid, answer: null, ms: r.ms, hints: r.hints, mode: cfg.mode, sessionId, abandoned: true });
    }
    const result: SessionResult = { rows, totalMs: Date.now() - startedAt, correct: rows.filter((r) => r.correct).length, xp: useStore.getState().pet.xp - xpStart };
    setDone(result);
    cfg.onComplete?.(result);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questions, hints, feedback, cfg, sessionId, startedAt, xpStart]);

  const go = (n: number) => { bank(); setIdx(Math.max(0, Math.min(questions.length - 1, n))); };

  const check = useCallback(() => {
    if (!q || submitted[q.id] || done) return;
    const a = answers[q.id] ?? null;
    if (a === null || a === '') return;
    bank();
    store.answer({ qid: q.id, answer: a, ms: spent.current[q.id] ?? 0, hints: hints[q.id] ?? 0, mode: cfg.mode, sessionId });
    setSubmitted((s) => ({ ...s, [q.id]: true }));
    if (feedback === 'immediate') {
      if (isCorrect(q, a)) { const c = combo + 1; setCombo(c); setFire(Date.now()); sfx(c >= 3 ? 'combo' : 'correct'); } else { setCombo(0); sfx('wrong'); }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, submitted, done, answers, hints, cfg.mode, sessionId, bank, combo]);

  const next = useCallback(() => {
    if (idx >= questions.length - 1) { bank(); finish(submitted, answers); } else go(idx + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, questions.length, submitted, answers, finish, bank]);

  // clocks
  useEffect(() => {
    if (done) return;
    const id = setInterval(() => {
      setTick((n) => n + 1);
      if (cfg.totalMs && Date.now() - startedAt >= cfg.totalMs) { bank(); finish(submitted, answers); }
      else if (cfg.perQuestionMs && q && !submitted[q.id] && liveMs(q.id) >= cfg.perQuestionMs) {
        bank();
        if (feedback === 'immediate') {
          store.answer({ qid: q.id, answer: answers[q.id] ?? null, ms: spent.current[q.id] ?? 0, hints: hints[q.id] ?? 0, mode: cfg.mode, sessionId });
          setSubmitted((s) => ({ ...s, [q.id]: true }));
        } else next();
      }
    }, 250);
    return () => clearInterval(id);
  });

  // keyboard: A–D or 1–4 to choose, Enter to check / continue, H hint, F flag, arrows to move
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (panel || done || !q || e.metaKey || e.ctrlKey || e.altKey) return;
      const typing = t.tagName === 'INPUT' || t.tagName === 'TEXTAREA';
      if (e.key === 'Enter' && !(t.tagName === 'BUTTON' || t.tagName === 'A' || t.tagName === 'TEXTAREA')) {
        e.preventDefault();
        if (feedback === 'immediate' && !submitted[q.id]) check(); else next();
        return;
      }
      if (typing) return;
      const k = e.key.toLowerCase();
      const i = 'abcd'.indexOf(k) >= 0 ? 'abcd'.indexOf(k) : '1234'.indexOf(k);
      if (i >= 0 && q.type === 'mcq' && !isSubmitted) setAnswers((a) => ({ ...a, [q.id]: String(i) }));
      else if (k === 'h' && hintsOn && !isSubmitted) setHints((h) => ({ ...h, [q.id]: Math.min(3, (h[q.id] ?? 0) + 1) }));
      else if (k === 'f') setFlagged((f) => (f.includes(q.id) ? f.filter((x) => x !== q.id) : [...f, q.id]));
      else if (e.key === 'ArrowRight' && (feedback === 'end' || submitted[q.id])) next();
      else if (e.key === 'ArrowLeft' && idx > 0) go(idx - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (!questions.length) return <Card><p className="text-sm text-muted">No questions match this selection yet. Try a different filter.</p><Link href={cfg.backHref ?? '/practice'} className="btn-primary mt-3">Back</Link></Card>;

  // ── summary ────────────────────────────────────────────────────────────────────────────
  if (done) {
    const acc = pct(done.correct, done.rows.length);
    const review = reviewId ? getQuestion(reviewId) : undefined;
    const row = done.rows.find((r) => r.qid === reviewId);
    const weak = [...new Set(done.rows.filter((r) => !r.correct).map((r) => getQuestion(r.qid)!.skill))];
    return (
      <div className="space-y-4" data-testid="session-summary">
        <Card className="flex flex-wrap items-center gap-5">
          <Pet mood={acc >= 80 ? 'celebrate' : acc >= 50 ? 'happy' : 'think'} level={1} equipped={store.pet.equipped} size={110} />
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-bold">{cfg.title}: complete</h2>
            <p className="mt-1 text-sm text-muted">{acc >= 80 ? 'Strong work. The engine will raise the difficulty for these skills.' : acc >= 50 ? 'Solid effort. Review the misses below while they are fresh.' : 'This set was tough, which is exactly where learning happens. Go through each explanation.'}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge tone={acc >= 75 ? 'ok' : acc >= 50 ? 'warn' : 'bad'}>{done.correct}/{done.rows.length} correct · {acc}%</Badge>
              <Badge><Clock size={12} />{fmtDuration(done.totalMs)}</Badge>
              <Badge tone="gold">+{done.xp} XP</Badge>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            {cfg.completeHref && <Link href={cfg.completeHref} className="btn-primary">{cfg.completeLabel ?? 'Continue'}</Link>}
            <Link href={cfg.backHref ?? '/'} className="btn-ghost">Done</Link>
          </div>
        </Card>
        {weak.length > 0 && (
          <Card>
            <h3 className="font-semibold">Where to go next</h3>
            <div className="mt-2 flex flex-wrap gap-2">
              {weak.slice(0, 4).map((k) => <Link key={k} href={`/learn/${k}`} className="btn-ghost !py-1.5">Review {SKILL[k].short}</Link>)}
              <Link href="/mistakes" className="btn-ghost !py-1.5">Open Mistake Bucket</Link>
            </div>
          </Card>
        )}
        <Card>
          <h3 className="mb-2 font-semibold">Question review</h3>
          <ul className="divide-y divide-line">
            {done.rows.map((r, i) => { const x = getQuestion(r.qid)!; return (
              <li key={r.qid}>
                <button onClick={() => setReviewId(reviewId === r.qid ? null : r.qid)} className="flex w-full items-center gap-3 py-2.5 text-left hover:bg-raised/50" aria-expanded={reviewId === r.qid}>
                  <span className={cn('grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold text-white', r.correct ? 'bg-ok' : r.answer ? 'bg-bad' : 'bg-faint')}>{i + 1}</span>
                  <span className="min-w-0 flex-1 truncate text-sm">{SKILL[x.skill].short} · <span className="text-muted">{x.sub}</span></span>
                  <span className="text-xs text-faint">{fmtDuration(r.ms)}</span>
                  <span className="text-xs font-semibold text-brand2">{reviewId === r.qid ? 'Hide' : 'Explain'}</span>
                </button>
                {reviewId === r.qid && review && row && (
                  <div className="space-y-4 pb-4"><QuestionMeta q={review} /><QuestionView q={review} answer={row.answer} onAnswer={() => {}} locked reveal /><Explanation q={review} answer={row.answer} category={store.mistakes[review.id]?.category} onCategory={(c) => store.setMistakeCategory(review.id, c)} /></div>
                )}
              </li>
            ); })}
          </ul>
        </Card>
      </div>
    );
  }

  // ── active question ────────────────────────────────────────────────────────────────────
  const a = answers[q.id] ?? null;
  const used = hints[q.id] ?? 0;
  const saved = store.saved.includes(q.id);
  const totalLeft = cfg.totalMs ? cfg.totalMs - (Date.now() - startedAt) : null;
  const qLeft = cfg.perQuestionMs && !submitted[q.id] ? cfg.perQuestionMs - liveMs(q.id) : null;
  const answeredCount = feedback === 'end' ? questions.filter((x) => answers[x.id]).length : Object.keys(submitted).length;
  const mood = submitted[q.id] ? (isCorrect(q, a) ? 'celebrate' : 'think') : used > 0 ? 'think' : 'study';

  return (
    <div className="space-y-4">
      <Confetti fire={fire} count={combo >= 3 ? 40 : 18} />
      <div className="flex flex-wrap items-center gap-3">
        <Link href={cfg.backHref ?? '/practice'} className="btn-quiet !px-2" aria-label="Leave session"><ArrowLeft size={18} /></Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3 text-sm"><h1 className="truncate font-display font-bold">{cfg.title}</h1><span className="shrink-0 text-muted">Question {idx + 1} of {questions.length}</span></div>
          <Progress value={(answeredCount / questions.length) * 100} className="mt-1.5" label="Session progress" />
        </div>
        {(totalLeft !== null || qLeft !== null || showTimer) && (
          <button onClick={() => store.setSettings({ showTimer: !showTimer })} className={cn('chip !py-1.5 font-mono text-sm', ((totalLeft ?? 1e9) < 60_000 || (qLeft ?? 1e9) < 10_000) && 'border-bad text-bad')} aria-label="Timer (click to show or hide)" title="Show or hide the timer">
            <Clock size={14} />{!showTimer && totalLeft === null && qLeft === null ? 'Hidden' : totalLeft !== null ? fmtClock(totalLeft) : qLeft !== null ? fmtClock(qLeft) : fmtClock(liveMs(q.id))}
          </button>
        )}
        {combo >= 2 && <span className="chip !border-warn !py-1.5 text-sm font-black text-warn" data-testid="combo" aria-live="polite">🔥 {combo} in a row</span>}
        <div className="hidden sm:block"><Pet mood={mood} equipped={store.pet.equipped} size={54} /></div>
      </div>

      <div className="flex flex-wrap gap-1.5" role="navigation" aria-label="Question navigation">
        {questions.map((x, i) => {
          const st = feedback === 'immediate' ? (submitted[x.id] ? (isCorrect(x, answers[x.id] ?? null) ? 'ok' : 'bad') : '') : answers[x.id] ? 'ans' : '';
          const canJump = feedback === 'end' || !!submitted[x.id] || i <= Math.max(idx, Object.keys(submitted).length);
          return (
            <button key={x.id} onClick={() => canJump && go(i)} disabled={!canJump} aria-label={`Question ${i + 1}${flagged.includes(x.id) ? ', flagged' : ''}`} aria-current={i === idx ? 'step' : undefined}
              className={cn('relative grid h-8 w-8 place-items-center rounded-lg border text-xs font-bold', i === idx ? 'border-brand ring-2 ring-brand/40' : 'border-line', st === 'ok' ? 'bg-ok/20 text-ok' : st === 'bad' ? 'bg-bad/20 text-bad' : st === 'ans' ? 'bg-brand/20 text-ink' : 'bg-surface text-muted', !canJump && 'opacity-40')}>
              {i + 1}{flagged.includes(x.id) && <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-warn" />}
            </button>
          );
        })}
      </div>

      <Card className="space-y-4" data-testid="question-card" data-qid={q.id}>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <QuestionMeta q={q} />
          <div className="flex gap-1">
            <button className={cn('btn-quiet !p-2', flagged.includes(q.id) && 'text-warn')} onClick={() => setFlagged((f) => (f.includes(q.id) ? f.filter((x) => x !== q.id) : [...f, q.id]))} aria-pressed={flagged.includes(q.id)} aria-label="Flag for review" title="Flag for review (F)"><Flag size={17} /></button>
            <button className={cn('btn-quiet !p-2', saved && 'text-brand')} onClick={() => store.toggleSaved(q.id)} aria-pressed={saved} aria-label={saved ? 'Remove from saved questions' : 'Save question'} title="Save question">{saved ? <BookmarkCheck size={17} /> : <Bookmark size={17} />}</button>
            <button className="btn-quiet !p-2" onClick={() => setPanel('report')} aria-label="Report a problem with this question" title="Report question"><TriangleAlert size={17} /></button>
          </div>
        </div>
        {cfg.reasons?.[q.id] && <p className="rounded-lg bg-brand/10 px-3 py-1.5 text-xs text-muted"><b className="text-ink">Why this question:</b> {cfg.reasons[q.id]}</p>}
        <QuestionView q={q} answer={a} locked={isSubmitted} reveal={feedback === 'immediate' && !!submitted[q.id]} number={idx + 1}
          onAnswer={(v) => setAnswers((s) => ({ ...s, [q.id]: v }))}
          eliminated={elim[q.id]} onEliminate={(i) => setElim((e) => ({ ...e, [q.id]: (e[q.id] ?? []).includes(i) ? e[q.id].filter((x) => x !== i) : [...(e[q.id] ?? []), i] }))} />

        {hintsOn && hackFor === q.id && !submitted[q.id] && hacksFor(q.skill, q.sub).slice(0, 1).map((h) => <HackCard key={h.id} hack={h} compact />)}
        {hintsOn && used > 0 && !submitted[q.id] && (
          <div className="space-y-2" aria-live="polite">
            {q.hints.slice(0, used).map((h, i) => (
              <div key={i} className="rounded-xl border border-gold/30 bg-gold/5 p-3 text-sm"><b className="text-gold">Hint {i + 1} · {['Concept', 'Strategy', 'Almost there'][i]}</b><div className="mt-1"><RichText text={h} /></div></div>
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2 border-t border-line pt-4">
          {feedback === 'immediate' && !submitted[q.id] ? (
            <>
              <button className="btn-primary" onClick={check} disabled={a === null || a === ''} data-testid="check">Check answer</button>
              {hintsOn && <button className="btn-ghost" onClick={() => setHints((h) => ({ ...h, [q.id]: Math.min(3, used + 1) }))} disabled={used >= 3} title="Reveal the next hint (H)"><Lightbulb size={16} />{used >= 3 ? 'No more hints' : `Hint ${used + 1} of 3`}</button>}
              {hintsOn && <button className="btn-ghost" onClick={() => setHackFor(hackFor === q.id ? null : q.id)} aria-pressed={hackFor === q.id} title="Show the concept card for this kind of question (free)" data-testid="show-hack">Hack</button>}
              <button className="btn-quiet" onClick={next} title="Skip without answering"><SkipForward size={16} />Skip</button>
            </>
          ) : (
            <>
              {idx > 0 && <button className="btn-ghost" onClick={() => go(idx - 1)}><ArrowLeft size={16} />Back</button>}
              <button className="btn-primary" onClick={next} data-testid="next">{idx >= questions.length - 1 ? (feedback === 'end' ? 'Submit all answers' : 'Finish') : 'Next'}<ArrowRight size={16} /></button>
              {feedback === 'end' && idx < questions.length - 1 && <button className="btn-quiet ml-auto" onClick={() => { if (confirm(`Submit now? ${questions.length - answeredCount} question(s) are unanswered.`)) { bank(); finish(submitted, answers); } }}>Submit early</button>}
            </>
          )}
          {feedback === 'immediate' && <button className="btn-quiet ml-auto" onClick={() => setPanel('tutor')}><Bot size={16} />Ask the tutor</button>}
        </div>
      </Card>

      {feedback === 'immediate' && submitted[q.id] && (
        <Card>
          <Explanation q={q} answer={a} category={store.mistakes[q.id]?.category} onCategory={(c) => store.setMistakeCategory(q.id, c)}
            extra={<div className="flex flex-wrap gap-2"><button className="btn-ghost !py-1.5" onClick={() => setPanel('tutor')}><Bot size={15} />Discuss with the tutor</button><button className="btn-ghost !py-1.5" onClick={() => setPanel('note')}><NotebookPen size={15} />Add to my notebook</button></div>} />
        </Card>
      )}
      <p className="text-center text-xs text-faint">Shortcuts: A–D choose · Enter check / next · H hint · F flag</p>

      <Modal open={panel === 'tutor'} onClose={() => setPanel(null)} title="Tutor" wide>
        <TutorChat qid={q.id} answer={submitted[q.id] ? a : null} compact />
      </Modal>
      <ReportModal open={panel === 'report'} onClose={() => setPanel(null)} qid={q.id} />
      <NoteModal open={panel === 'note'} onClose={() => setPanel(null)} q={q} />
    </div>
  );
}

function ReportModal({ open, onClose, qid }: { open: boolean; onClose: () => void; qid: string }) {
  const report = useStore((s) => s.report);
  const [reason, setReason] = useState(REPORT_REASONS[0]);
  const [detail, setDetail] = useState('');
  const [sent, setSent] = useState(false);
  return (
    <Modal open={open} onClose={() => { setSent(false); onClose(); }} title="Report this question">
      {sent ? <p className="text-sm text-muted">Thank you. The report is saved with your data (Settings → Export) so it can be sent to whoever maintains your copy of Stellify.</p> : (
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); report({ qid, reason, detail }); setSent(true); setDetail(''); }}>
          <div><label className="label" htmlFor="rr">What is wrong?</label><select id="rr" className="input" value={reason} onChange={(e) => setReason(e.target.value)}>{REPORT_REASONS.map((r) => <option key={r}>{r}</option>)}</select></div>
          <div><label className="label" htmlFor="rd">Details (optional)</label><textarea id="rd" className="input min-h-24" value={detail} onChange={(e) => setDetail(e.target.value)} maxLength={600} /></div>
          <button className="btn-primary">Save report</button>
        </form>
      )}
    </Modal>
  );
}

function NoteModal({ open, onClose, q }: { open: boolean; onClose: () => void; q: Question }) {
  const saveNote = useStore((s) => s.saveNote);
  const [body, setBody] = useState('');
  useEffect(() => { if (open) setBody(`Takeaway: ${q.remember}\n\nMy own words: `); }, [open, q]);
  return (
    <Modal open={open} onClose={onClose} title="Add to my notebook">
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); saveNote({ title: `${SKILL[q.skill].short}: ${q.sub}`, body, qid: q.id, topic: q.skill, kind: 'strategy' }); onClose(); }}>
        <textarea className="input min-h-40" value={body} onChange={(e) => setBody(e.target.value)} aria-label="Note" />
        <button className="btn-primary">Save note</button>
      </form>
    </Modal>
  );
}
