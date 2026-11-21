'use client';
import Link from 'next/link';
import { useId, useState } from 'react';
import { ArrowRight, Check, CheckCircle2, Circle, Eye, X } from 'lucide-react';
import { RichText } from '@/components/RichText';
import { Card, Empty, PageHeader, cn } from '@/components/ui';
import { WORKED, WORKED_BY_SKILL, type WorkedFamily } from '@/data/worked';
import type { WorkedProblem } from '@/data/worked/types';
import { PATH } from '@/lib/path/skills';
import { useStore } from '@/lib/store';
import { DOMAIN, SKILL } from '@/lib/taxonomy';
import type { SkillId } from '@/lib/types';
import { matches } from '@/lib/worked';

const RUNGS = ['Study a worked example', 'Finish the last step', 'Finish the last two steps', 'Solve one on your own'];

/** Worked Examples (N11): its own mode, separate from hints. Each problem family is a four-rung backward-fading ladder. */
export function WorkedIndexPage() {
  const worked = useStore((s) => s.path?.worked) ?? {};
  const skills = [...new Set(WORKED.map((f) => f.skill))];
  return (
    <div className="mx-auto max-w-4xl" data-testid="worked-index">
      <PageHeader eyebrow="Learn" title="Worked examples" subtitle="Learn a problem type by fading support. First study a fully worked example and explain each step to yourself. Then finish the last step, then the last two, then solve one alone. Finishing a skill’s ladders earns its first Path star." />
      <div className="grid gap-4 sm:grid-cols-2">
        {skills.map((k) => {
          const fams = WORKED_BY_SKILL[k] ?? [];
          const done = fams.filter((f) => worked[f.id]).length;
          return (
            <Link key={k} href={`/worked/${k}`} className={cn('card block p-5 hover:border-ink/40', `dom-${SKILL[k].domain}`)} data-testid={`worked-skill-${k}`}>
              <p className="text-[13px] font-medium" style={{ color: 'rgb(var(--dom))' }}>{DOMAIN[SKILL[k].domain].name}</p>
              <h2 className="text-[20px] leading-tight">{SKILL[k].short}</h2>
              <ul className="mt-2 space-y-1 text-[14px] text-muted">{fams.map((f) => <li key={f.id} className="flex items-center gap-2">{worked[f.id] ? <CheckCircle2 size={16} className="text-ok" aria-hidden /> : <Circle size={16} className="text-faint" aria-hidden />}{f.title}<span className="sr-only">{worked[f.id] ? ' (finished)' : ''}</span></li>)}</ul>
              <p className="mt-2 text-[13px] text-faint" data-num>{done} of {fams.length} ladder{fams.length === 1 ? '' : 's'} finished</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export function WorkedSkillPage({ skill }: { skill: string }) {
  const fams = WORKED_BY_SKILL[skill as SkillId] ?? [];
  if (!fams.length) return <Empty page title="No worked examples for this skill yet" body="Worked-example ladders exist for 12 math skills so far. The skill’s chapters and practice sets are always available." action={{ label: 'All worked examples', href: '/worked' }} />;
  return (
    <div className="mx-auto max-w-3xl" data-testid="worked-skill">
      <PageHeader eyebrow="Worked examples" title={SKILL[skill as SkillId].short} subtitle="Work down the ladder. Support fades one step at a time. This is different from hints: you see a full solution first, then do more of it yourself each time."
        actions={<><Link href="/worked" className="btn-ghost">All skills</Link><Link href={`/path${PATH[skill as SkillId].section === 'rw' ? '/rw' : ''}?skill=${skill}`} className="btn-quiet">On the Path</Link></>} />
      <div className="space-y-8">{fams.map((f) => <Ladder key={f.id} f={f} />)}</div>
    </div>
  );
}

function Ladder({ f }: { f: WorkedFamily }) {
  const finished = useStore((s) => s.path?.worked[f.id]);
  const finish = useStore((s) => s.finishWorked);
  const [rung, setRung] = useState(0);
  const [ready, setReady] = useState(false);
  const [again, setAgain] = useState(false);
  const next = () => { setReady(false); if (rung === 3) { finish(f.id); setAgain(false); setRung(0); } else setRung(rung + 1); };
  return (
    <section className="card p-0" aria-labelledby={`${f.id}-h`} data-testid={`ladder-${f.id}`}>
      <div className="border-b border-line px-5 py-4">
        <h2 id={`${f.id}-h`} className="text-[22px]">{f.title}</h2>
        <p className="mt-1 text-[15px] text-muted">{f.idea}</p>
        <ol className="mt-3 flex flex-wrap gap-2" aria-label="Ladder progress">
          {RUNGS.map((r, i) => <li key={r} className={cn('chip', i === rung && (!finished || again) && '!border-ink !text-ink', (i < rung || (finished && !again)) && '!border-ok/50 !text-ok')} aria-current={i === rung && (!finished || again) ? 'step' : undefined}>{i < rung || (finished && !again) ? <Check size={13} aria-hidden /> : <span data-num>{i + 1}</span>} {r}</li>)}
        </ol>
      </div>
      <div className="px-5 py-4">
        {finished && rung === 0 && !again ? (
          <div data-testid="ladder-finished"><p className="flex items-center gap-2 text-[15px] font-medium text-ok"><CheckCircle2 size={18} aria-hidden />Ladder finished. It counts toward ★1 on the Path.</p><button type="button" className="btn-ghost mt-3" onClick={() => { setAgain(true); setRung(0); setReady(false); }}>Practise it again</button></div>
        ) : (
          <>
            <Rung key={`${f.id}-${rung}`} p={f.rungs[rung]} blanks={rung === 0 ? 0 : rung === 3 ? -1 : f.fade[rung - 1]} onReady={() => setReady(true)} />
            <button type="button" className="btn-primary mt-4" disabled={!ready} onClick={next} data-testid="rung-next">{rung === 3 ? 'Finish the ladder' : `Next: ${RUNGS[rung + 1].toLowerCase()}`}<ArrowRight size={16} aria-hidden /></button>
            {!ready && <p className="mt-2 text-[13px] text-faint">{rung === 0 ? 'Explain each step to yourself, then show the reason, to go on.' : 'Answer the blank steps to go on.'}</p>}
          </>
        )}
      </div>
    </section>
  );
}

/**
 * One rung. blanks = 0: fully worked, with a self-explanation prompt per step; blanks = k: the last k steps are
 * left for the student; blanks = -1: independent (only the final answer is asked).
 */
function Rung({ p, blanks, onReady }: { p: WorkedProblem; blanks: number; onReady: () => void }) {
  const n = p.steps.length;
  const firstBlank = blanks < 0 ? n : n - blanks;
  const [shown, setShown] = useState<boolean[]>(() => p.steps.map(() => false));
  const [solved, setSolved] = useState<boolean[]>(() => p.steps.map((_, i) => i < firstBlank));
  const [finalOk, setFinalOk] = useState(false);
  const report = (sh: boolean[], so: boolean[], fin: boolean) => {
    if (blanks === 0 ? sh.every(Boolean) : blanks < 0 ? fin : so.every(Boolean)) onReady();
  };
  return (
    <div>
      <p className="text-[16px]" data-testid="rung-prompt"><RichText text={p.prompt} /></p>
      {blanks >= 0 && (
        <ol className="mt-4 space-y-3">
          {p.steps.map((st, i) => (
            <li key={i} className="rounded-xl border border-line p-3">
              <p className="text-[14px] text-muted"><span data-num>Step {i + 1}.</span> {st.do}</p>
              {i < firstBlank || solved[i] ? <p className="mt-1 text-[16px]"><RichText text={st.result} /></p> : (
                <BlankStep ask={st.ask} answer={st.answer} reveal={st.result} onSolved={() => { const so = [...solved]; so[i] = true; setSolved(so); report(shown, so, finalOk); }} />
              )}
              {blanks === 0 && (
                <div className="mt-2">
                  {shown[i] ? <p className="rounded-lg bg-raised px-3 py-2 text-[14px]"><b className="font-medium">Why this step?</b> <RichText text={st.why} /></p> : (
                    <div className="space-y-2">
                      <label className="block text-[13px] text-muted" htmlFor={`why-${i}`}>Why this step? Say it in your own words first (optional to type).</label>
                      <textarea id={`why-${i}`} rows={2} className="input" />
                      <button type="button" className="btn-ghost !min-h-[38px] text-[14px]" onClick={() => { const sh = [...shown]; sh[i] = true; setShown(sh); report(sh, solved, finalOk); }} data-testid="show-why"><Eye size={15} aria-hidden />Show the reason</button>
                    </div>
                  )}
                </div>
              )}
              {blanks > 0 && solved[i] && i >= firstBlank && <p className="mt-1 text-[13px] text-muted"><RichText text={st.why} /></p>}
            </li>
          ))}
        </ol>
      )}
      {blanks < 0 && (
        <div className="mt-4">
          {finalOk ? <p className="flex items-center gap-2 font-medium text-ok"><Check size={18} aria-hidden />Correct.</p> : <BlankStep ask="your answer" answer={p.final} reveal={p.steps[n - 1].result} onSolved={() => { setFinalOk(true); report(shown, solved, true); }} independent />}
          {finalOk && <details className="mt-2 text-[14px]"><summary className="cursor-pointer text-accent">See a full solution</summary><ol className="mt-2 space-y-1">{p.steps.map((st, i) => <li key={i}><RichText text={st.result} /></li>)}</ol></details>}
        </div>
      )}
    </div>
  );
}

function BlankStep({ ask, answer, reveal, onSolved, independent }: { ask: string; answer: string[]; reveal: string; onSolved: () => void; independent?: boolean }) {
  const [v, setV] = useState('');
  const [tries, setTries] = useState(0);
  const [wrong, setWrong] = useState(false);
  const id = useId();
  const check = () => { if (matches(v, answer)) { onSolved(); return; } setTries(tries + 1); setWrong(true); };
  return (
    <div className="mt-2" data-testid="blank-step">
      <label htmlFor={id} className="block text-[14px]"><RichText text={`Type ${ask}:`} /></label>
      <div className="mt-1 flex flex-wrap gap-2">
        <input id={id} className="input max-w-[200px]" inputMode="decimal" value={v} onChange={(e) => { setV(e.target.value); setWrong(false); }} onKeyDown={(e) => { if (e.key === 'Enter') check(); }} data-testid="blank-input" />
        <button type="button" className="btn-ghost" onClick={check} data-testid="blank-check">Check</button>
      </div>
      {wrong && <p className="mt-1 flex items-center gap-1.5 text-[14px] text-bad" role="status"><X size={15} aria-hidden />Not yet{tries >= 2 ? '.' : '. Try again.'}</p>}
      {tries >= 2 && <p className="mt-1 text-[14px] text-muted">{independent ? 'Here is the answer. Study it, then type it to go on: ' : 'The step is: '}<RichText text={reveal} /></p>}
    </div>
  );
}
