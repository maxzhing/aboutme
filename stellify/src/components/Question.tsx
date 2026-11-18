'use client';
import Link from 'next/link';
import { Check, CircleSlash, Highlighter, Lightbulb, Wand2, X } from 'lucide-react';
import { remixable } from '@/lib/remix/engine';
import type { ErrorCategory, Question } from '@/lib/types';
import { DIFFICULTY_NAME, DOMAIN, SECTION_NAME, SKILL } from '@/lib/taxonomy';
import { LETTERS, correctAnswerLabel, displayAnswer, isCorrect } from '@/lib/answers';
import { CAUSE, ERROR_CATEGORIES } from '@/lib/engine/mistakes';
import { questionsBySkill } from '@/data/questions';
import { RichText } from './RichText';
import { HackCard } from './HackCard';
import { hacksFor } from '@/data/hacks';
import { Figure } from './Figure';
import { Badge, cn } from './ui';
import { useStore } from '@/lib/store';
import { chapterFor } from '@/data/courses';
import { simpleExplanation } from '@/lib/plain';
import { Sparkles } from './Feel';
import { canHighlightText, HighlightImage, HighlightText, MarkNotes, useHasHighlighted } from './Highlight';
import { DISTRACTORS, TRAPS } from '@/data/questions/distractors';

export function QuestionMeta({ q }: { q: Question }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {q.official || q.id.startsWith('cb-') ? <Badge tone="gold">Official College Board question</Badge> : q.id.startsWith('gx-') ? <Badge tone="brand">Remix Studio · generated</Badge> : <Badge>Stellify original</Badge>}
      <Badge tone="brand">{SECTION_NAME[q.section]}</Badge>
      <Badge>{DOMAIN[q.domain].name}</Badge>
      <Link href={`/learn/${q.skill}`} className="chip hover:text-ink">{SKILL[q.skill].short}</Link>
      <Badge tone={(q.difficulty === 'very-hard' || q.difficulty === 'elite') ? 'bad' : q.difficulty === 'hard' ? 'warn' : 'ok'}>{DIFFICULTY_NAME[q.difficulty]}</Badge>
      <span className="text-xs text-faint">{q.sub}</span>
    </div>
  );
}

/** The question itself: passage or notes, figure, stem, and choices or a student-produced response field. */
export function QuestionView({ q, answer, onAnswer, locked, reveal, eliminated, onEliminate, number, hlScope = 'practice' }: {
  q: Question; answer: string | null; onAnswer: (v: string) => void; locked?: boolean; reveal?: boolean;
  eliminated?: number[]; onEliminate?: (i: number) => void; number?: number;
  /** whose highlights these are: each test attempt passes its own id, so a new attempt starts clean */
  hlScope?: string;
}) {
  const hk = (part: string) => `${hlScope}|${q.id}|${part}`;
  const tipped = useHasHighlighted();
  const stimulus = q.passage || q.notes || q.figure;
  const twoCol = q.section === 'rw' && !!stimulus;
  const stim = (
    <div className="space-y-3">
      {q.figure && <Figure figure={q.figure} />}
      {q.passage && <HighlightText hkey={hk('passage')}><RichText block text={q.passage} className="passage whitespace-pre-line" /></HighlightText>}
      {q.notes && (
        <HighlightText hkey={hk('notes')}><ul className="passage list-disc space-y-1.5 pl-5">{q.notes.map((n, i) => <li key={i}><RichText text={n} /></li>)}</ul></HighlightText>
      )}
    </div>
  );
  const body = (
    <div>
      {!twoCol && stimulus && <div className="mb-4">{stim}</div>}
      {q.image ? (
        <figure className="mb-1" id={`stem-${q.id}`}>
          <div className="overflow-hidden rounded-2xl border border-line bg-white p-2 shadow-card sm:p-3">{number !== undefined && <span className="mb-1 inline-grid h-6 min-w-6 place-items-center rounded-md bg-[#141830] px-1 text-xs font-bold text-white">{number}</span>}<HighlightImage hkey={hk('image')} src={q.image} alt="Official College Board question, shown exactly as printed" /></div>
          <figcaption className="mt-1.5 text-xs text-faint">Shown exactly as College Board printed it.{q.type === 'mcq' ? ' Pick the letter of your answer below.' : ' Type your answer below.'} Drag across the printed words to highlight them.</figcaption>
        </figure>
      ) : <div className="prose-q font-medium" id={`stem-${q.id}`}>{number !== undefined && <span className="mr-2 inline-grid h-6 min-w-6 place-items-center rounded-md bg-ink px-1 text-xs font-bold text-bg">{number}</span>}<HighlightText hkey={hk('stem')} inline={!q.stem.includes('$$')}><RichText block={q.stem.includes('$$')} text={q.stem} /></HighlightText></div>}
      {q.type === 'mcq' ? (
        <div role="radiogroup" aria-labelledby={`stem-${q.id}`} className="mt-4 space-y-2">
          {q.choices!.map((c, i) => {
            const selected = answer === String(i);
            const right = reveal && i === q.answer;
            const wrong = reveal && selected && i !== q.answer;
            const out = eliminated?.includes(i) && !reveal;
            return (
              <div key={i} className="flex items-stretch gap-2">
                <button type="button" role="radio" aria-checked={selected} disabled={locked} onClick={() => onAnswer(String(i))} data-choice={LETTERS[i]}
                  className={cn('flex min-h-[48px] flex-1 items-center gap-3 rounded-xl border px-3.5 py-2.5 text-left text-[15px] transition-colors',
                    right ? 'border-ok bg-ok/10' : wrong ? 'border-bad bg-bad/10' : selected ? 'border-brand bg-brand/10 ring-1 ring-brand' : 'border-line bg-surface hover:border-brand/50',
                    out && 'opacity-45', locked && !right && !wrong && !selected && 'opacity-80')}>
                  <span className={cn('grid h-7 w-7 shrink-0 place-items-center rounded-full border text-sm font-bold', right ? 'border-ok bg-ok text-white' : wrong ? 'border-bad bg-bad text-white' : selected ? 'border-brand bg-brand-solid text-white' : 'border-line text-muted')}>
                    {right ? <Check size={15} /> : wrong ? <X size={15} /> : LETTERS[i]}
                  </span>
                  <span className={cn('min-w-0', out && 'line-through')}>{q.image ? <span className="font-semibold">Choice {LETTERS[i]}</span> : <RichText text={c} />}</span>
                </button>
                {onEliminate && !locked && (
                  <button type="button" onClick={() => onEliminate(i)} className={cn('btn-quiet !px-2', eliminated?.includes(i) && 'text-bad')} aria-label={`${eliminated?.includes(i) ? 'Restore' : 'Cross out'} choice ${LETTERS[i]}`} title="Cross out this choice"><CircleSlash size={16} /></button>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="mt-4">
          <label className="label" htmlFor={`spr-${q.id}`}>Your answer</label>
          <input id={`spr-${q.id}`} inputMode="decimal" autoComplete="off" disabled={locked} value={answer ?? ''} onChange={(e) => onAnswer(e.target.value.replace(/[^0-9./\-−]/g, '').slice(0, 7))}
            className={cn('input max-w-[220px] text-lg font-semibold tracking-wide', reveal && (isCorrect(q, answer) ? 'border-ok bg-ok/10' : 'border-bad bg-bad/10'))} placeholder="e.g. 3.5 or 7/2" />
          <p className="mt-1.5 text-xs text-faint">Enter a number, decimal or fraction. If a decimal does not fit, round or truncate at the fourth digit.</p>
        </div>
      )}
      {!tipped && !q.image && canHighlightText() && <p className="mt-3 flex items-center gap-1.5 text-xs text-faint" data-testid="hl-tip"><Highlighter size={13} className="text-brand2" />Tip: select any words in the question to highlight them or add a note, just like on test day.</p>}
      <MarkNotes prefix={`${hlScope}|${q.id}|`} />
    </div>
  );
  if (!twoCol) return body;
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <div className="lg:max-h-[68vh] lg:overflow-y-auto lg:border-r lg:border-line lg:pr-5">{stim}</div>
      {body}
    </div>
  );
}

/**
 * After a miss: name the trap that caused it. The answer is saved, counted across questions, and shown
 * with its fix on the Mistake Bucket, so the same trap can be drilled until it stops working on you.
 */
function TrapCheck({ q }: { q: Question }) {
  const ch = chapterFor(q.skill, q.sub);
  const log = useStore((s) => s.logTrap);
  const traps = useStore((s) => s.traps) ?? {};
  if (!ch) return null;
  const picked = ch.traps.filter((t) => traps[t.id]?.qids.includes(q.id));
  return (
    <div className="rounded-xl border border-warn/40 bg-warn/5 p-3.5" data-testid="trap-check">
      <div className="mb-2 text-xs font-bold uppercase tracking-wide text-warn">🪤 Which trap got you? Name it so it stops working on you</div>
      <div className="flex flex-wrap gap-1.5">{ch.traps.map((t) => <button key={t.id} type="button" onClick={() => log(t.id, q.id)} aria-pressed={picked.includes(t)} className={cn('chip', picked.includes(t) && 'border-warn bg-warn/15 text-ink')} data-testid={`trap-${t.id}`}>{t.name}</button>)}</div>
      {picked.map((t) => <p key={t.id} className="mt-2 text-sm"><b>Fix:</b> <RichText text={t.fix} /> <span className="text-muted">You have fallen for this {traps[t.id].n}×.</span></p>)}
      <Link href={`/learn/${q.skill}/${ch.id}`} className="mt-2 inline-block text-sm font-semibold text-accent hover:underline">Re-learn chapter {ch.n}: {ch.title} →</Link>
    </div>
  );
}

const Block = ({ title, children, tone }: { title: string; children: React.ReactNode; tone?: 'ok' | 'bad' | 'brand' }) => (
  <section className={cn('rounded-xl border p-3.5', tone === 'ok' ? 'border-ok/30 bg-ok/5' : tone === 'bad' ? 'border-bad/30 bg-bad/5' : tone === 'brand' ? 'border-brand/30 bg-brand/5' : 'border-line bg-raised/40')}>
    <h4 className="mb-1.5 text-xs font-bold uppercase tracking-wide text-faint">{title}</h4>
    <div className="prose-q">{children}</div>
  </section>
);

/**
 * The full explanation shown after every submitted question: verdict, both answers, worked steps,
 * why the right answer works, why each wrong answer fails, concept, fastest method, trap,
 * takeaway and what to practice next.
 */
/** The plain-language version of an official explanation (see lib/plain.ts), shown first. */
function SimpleExplanationBlock({ q }: { q: Question }) {
  const s = simpleExplanation(q);
  if (!s) return null;
  return (
    <section className="rounded-xl border border-brand/40 bg-brand/5 p-3.5" data-testid="simple-explanation">
      <h4 className="mb-1.5 text-xs font-bold uppercase tracking-wide text-brand2">In simple words</h4>
      <p className="leading-relaxed"><b>The answer is {s.answer}.</b>{s.right && <> <RichText text={s.right} /></>}</p>
      {s.wrong.length > 0 && (
        <ul className="mt-2 space-y-1 text-sm">
          {s.wrong.map((w) => <li key={w.letter} className="flex gap-2"><X size={15} className="mt-0.5 shrink-0 text-bad" /><span><b>{w.letter} is wrong.</b> <RichText text={w.text} /></span></li>)}
        </ul>
      )}
      {s.method.length > 0 && (
        <div className="mt-3 border-t border-line pt-2.5 text-sm">
          <div className="mb-1 font-semibold">How to do this kind of question</div>
          <ol className="list-decimal space-y-0.5 pl-5 text-muted">{s.method.map((m) => <li key={m}>{m}</li>)}</ol>
        </div>
      )}
      {!s.rewritten && q.rationaleImage && <p className="mt-2 text-xs text-faint">The College Board&apos;s complete worked solution, exactly as printed, is below.</p>}
    </section>
  );
}

export function Explanation({ q, answer, category, onCategory, extra }: {
  q: Question; answer: string | null; category?: ErrorCategory; onCategory?: (c: ErrorCategory) => void; extra?: React.ReactNode;
}) {
  const ok = isCorrect(q, answer);
  const mistake = useStore((s) => s.mistakes[q.id]);
  const related = questionsBySkill(q.skill).filter((x) => x.id !== q.id && x.sub === q.sub)[0] ?? questionsBySkill(q.skill).find((x) => x.id !== q.id);
  return (
    <div className="space-y-3" data-testid="explanation">
      <div className={cn('flex flex-wrap items-center gap-x-5 gap-y-1 rounded-xl border p-3.5', ok ? 'border-ok/40 bg-ok/10' : 'border-bad/40 bg-bad/10')} role="status">
        <span className={cn('relative inline-flex items-center gap-1.5 font-display text-lg font-bold', ok ? 'text-ok pop-in' : 'text-bad shake')} data-testid="verdict">{ok && <Sparkles fire={1} />}{ok ? <Check size={20} /> : <X size={20} />}{ok ? 'Correct' : answer ? 'Incorrect' : 'Not answered'}</span>
        <span className="text-sm">Your answer: <b data-testid="your-answer">{displayAnswer(q, answer)}</b></span>
        <span className="text-sm">Correct answer: <b data-testid="correct-answer">{correctAnswerLabel(q)}</b></span>
      </div>

      {!ok && onCategory && (
        <div className="rounded-xl border border-line p-3.5">
          {mistake?.why && mistake.categoryBy === 'auto' && (
            <div className="mb-3 rounded-lg bg-warn/10 p-2.5 text-sm" data-testid="diagnosis">
              <div className="font-semibold">Likely cause: {CAUSE[mistake.category]} <span className="font-normal text-muted">({ERROR_CATEGORIES.find((c) => c.id === mistake.category)?.label.toLowerCase()})</span></div>
              <ul className="mt-1 space-y-0.5 text-muted">{mistake.why.map((w) => <li key={w}>• {w}</li>)}</ul>
              <p className="mt-1 text-[11px] text-faint">A rule-based read of your timing, confidence, record on this skill and the trap you chose. If it is wrong, pick the real reason below.</p>
            </div>
          )}
          <div className="mb-2 text-xs font-bold uppercase tracking-wide text-faint">What went wrong? (saved with this mistake)</div>
          <div className="flex flex-wrap gap-1.5">
            {ERROR_CATEGORIES.map((c) => <button key={c.id} onClick={() => onCategory(c.id)} aria-pressed={category === c.id} className={cn('chip', category === c.id && 'border-brand bg-brand/15 text-ink')}>{c.label}</button>)}
          </div>
          {category && <p className="mt-2 text-xs text-muted">{ERROR_CATEGORIES.find((c) => c.id === category)?.tip}</p>}
        </div>
      )}

      {!ok && <TrapCheck q={q} />}

      {q.official && <SimpleExplanationBlock q={q} />}

      {q.rationaleImage ? (
        <section className="rounded-xl border border-ok/30 bg-ok/5 p-3.5" data-testid="official-rationale">
          <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-faint">College Board explanation · correct answer {correctAnswerLabel(q)}</h4>
          <div className="overflow-hidden rounded-xl bg-white p-2"><img src={q.rationaleImage} alt="College Board explanation, shown exactly as printed" className="mx-auto block h-auto w-auto max-w-full" /></div>
        </section>
      ) : <>
      {/* official questions: the College Board's own notes below are the full explanation, so no repeated steps */}
      {!q.official && <Block title="Step-by-step solution">
        <ol className="list-decimal space-y-1.5 pl-5">{q.steps.map((s, i) => <li key={i}><RichText text={s} /></li>)}</ol>
      </Block>}

      {q.type === 'mcq' ? (
        <>
          <Block title={`Why ${LETTERS[q.answer as number]} is correct${q.official ? ' · College Board explanation' : ''}`} tone="ok"><RichText text={q.why[q.answer as number]} /></Block>
          <Block title={`Why each other choice fails${q.official ? ' · College Board explanation' : ''}`}>
            <ul className="space-y-2">
              {q.choices!.map((c, i) => i === q.answer ? null : (
                <li key={i} className="flex gap-2.5">
                  <span className={cn('mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border text-xs font-bold', answer === String(i) ? 'border-bad bg-bad text-white' : 'border-line text-muted')}>{LETTERS[i]}</span>
                  <span>{(() => { const t = DISTRACTORS[q.id]?.[i]; return t ? <span className="mb-0.5 block text-[11px] font-bold uppercase tracking-wide text-bad" title={TRAPS[t].tip} data-testid="trap-tag">Trap: {TRAPS[t].label}</span> : null; })()}{!q.image && <><span className="text-muted"><RichText text={c} /></span><span className="mx-1.5 text-faint">—</span></>}<RichText text={q.why[i]} />{answer === String(i) && <span className="ml-1.5 text-xs font-semibold text-bad">(your choice)</span>}</span>
                </li>
              ))}
            </ul>
          </Block>
        </>
      ) : (
        <>
          <Block title="Why the correct answer works" tone="ok"><RichText text={q.steps[q.steps.length - 1]} /> <span className="text-muted">Accepted: {(q.answer as string[]).join(', ')}.</span></Block>
          <Block title="Common wrong answers and why they fail"><ul className="space-y-1.5">{q.why.map((w, i) => <li key={i} className="flex gap-2"><X size={15} className="mt-1 shrink-0 text-bad" /><RichText text={w} /></li>)}</ul></Block>
        </>
      )}
      </>}

      <div className="grid gap-3 md:grid-cols-2">
        <Block title="The underlying concept"><RichText text={q.concept} /></Block>
        <Block title="Fastest reliable method" tone="brand">
          <RichText text={q.strategy} />
          {q.alt && <p className="mt-2 text-sm"><b>Another way:</b> <RichText text={q.alt} /></p>}
          {q.desmos && <p className="mt-2 text-sm"><b>With Desmos:</b> <RichText text={q.desmos} /></p>}
        </Block>
        <Block title="Common trap" tone="bad"><RichText text={q.trap} /></Block>
        <Block title="What to remember"><span className="inline-flex gap-2"><Lightbulb size={16} className="mt-1 shrink-0 text-gold" /><RichText text={q.remember} /></span></Block>
      </div>

      {hacksFor(q.skill, q.sub).slice(0, 1).map((h) => <HackCard key={h.id} hack={h} />)}

      <Block title="Recommended next">
        <div className="flex flex-wrap gap-2">
          {chapterFor(q.skill, q.sub) && <Link href={`/learn/${q.skill}/${chapterFor(q.skill, q.sub)!.id}`} className="btn-ghost !py-1.5" data-testid="relearn">Re-learn: {chapterFor(q.skill, q.sub)!.title}</Link>}
          <Link href={`/practice/session?mode=skill&skill=${q.skill}&n=6`} className="btn-ghost !py-1.5">6 more {SKILL[q.skill].short} questions</Link>
          {related && <Link href={`/practice/session?mode=single&ids=${related.id}`} className="btn-ghost !py-1.5">Similar question ({DIFFICULTY_NAME[related.difficulty]})</Link>}
          {!q.id.startsWith('gx-') && remixable(q).ok && <Link href={`/remix?q=${encodeURIComponent(q.id)}`} className="btn-ghost !py-1.5" data-testid="remix-this"><Wand2 size={14} />Remix this question</Link>}
        </div>
      </Block>
      {extra}
      <p className="text-[11px] text-faint">{q.id} · {q.source} · Target time {q.time}s</p>
    </div>
  );
}
