'use client';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUp, BarChart3, Bookmark, BookmarkCheck, Check, ChevronRight, Globe2, Hash, Info, Loader2, Mountain, RefreshCw, RotateCcw, SearchCheck, Shuffle, Sparkles, Trash2, Undo2, Wand2, X, type LucideIcon } from 'lucide-react';
import { getQuestion, OFFICIAL, QUESTIONS, questionsBySkill } from '@/data/questions';
import { useStore } from '@/lib/store';
import { useSkillStats } from '@/lib/hooks';
import { SKILL, SKILLS } from '@/lib/taxonomy';
import { plain } from '@/lib/richtext';
import type { Question, SkillId } from '@/lib/types';
import { bump, buildCorpus, generate, levelFor, MAX_CHAIN, modesFor, remixable, smartPick } from '@/lib/remix/engine';
import { aiCandidate, aiReady } from '@/lib/remix/ai';
import { signature } from '@/lib/remix/validate';
import { LEVEL_MEANS, LEVEL_NAME, MODE_INFO, STATUS_NAME, type Candidate, type RemixLevel, type RemixMode, type RemixQuestion } from '@/lib/remix/types';
import { Explanation, QuestionMeta, QuestionView } from '@/components/Question';
import { SessionRunner } from '@/components/SessionRunner';
import { Badge, Card, Empty, Modal, PageHeader, cn } from '@/components/ui';

/** an icon for each transformation (visual only) */
const MODE_ICON: Record<RemixMode, LucideIcon> = { number: Hash, context: Globe2, representation: BarChart3, reverse: Undo2, reasoning: SearchCheck, challenge: Mountain };
let CORPUS: Set<string> | null = null;
/** built once per visit: every passage in the bank and on this device that a remix must not copy */
const corpus = () => (CORPUS ??= buildCorpus([...QUESTIONS, ...OFFICIAL]));
const label = (q: Question) => `${SKILL[q.skill]?.short ?? q.skill} · ${q.sub}`;
const snippet = (q: Question) => { const t = plain(q.stem.length > 30 ? q.stem : `${q.passage ?? ''} ${q.stem}`).replace(/\s+/g, ' ').trim(); return t.length > 110 ? `${t.slice(0, 107)}…` : t; };
const href = (q: string, chain?: string, at?: string) => `/remix?q=${encodeURIComponent(q)}${chain ? `&chain=${chain}` : ''}${at ? `&at=${at}` : ''}`;

export function RemixPage() {
  const p = useSearchParams();
  const q = p.get('q');
  return q ? <Workspace key={q} originId={q} chainId={p.get('chain') ?? undefined} at={p.get('at') ?? undefined} /> : <Home />;
}

// ───────────────────────── home ─────────────────────────
function Home() {
  const s = useStore();
  const router = useRouter();
  const [skill, setSkill] = useState<SkillId>('lin1');
  const ok = (q: Question | undefined): q is Question => !!q && !q.id.startsWith('gx-') && remixable(q).ok;
  const mistakes = Object.values(s.mistakes).filter((m) => m.status === 'unresolved').sort((a, b) => b.lastAt - a.lastAt).map((m) => getQuestion(m.qid)).filter(ok).slice(0, 6);
  const saved = s.saved.map(getQuestion).filter(ok).slice(0, 6);
  const recent = [...new Set([...s.attempts].reverse().map((a) => a.qid))].map(getQuestion).filter(ok).slice(0, 6);
  const chains = Object.values(s.remix?.chains ?? {}).filter((c) => c.steps.length).sort((a, b) => Number(!!b.saved) - Number(!!a.saved) || b.updatedAt - a.updatedAt).slice(0, 12);
  const random = () => { const pool = questionsBySkill(skill).filter((q) => remixable(q).ok); if (pool.length) router.push(href(pool[Math.floor(Math.random() * pool.length)].id)); };
  const List = ({ title, items, empty }: { title: string; items: Question[]; empty: string }) => (
    <Card>
      <h2 className="font-semibold">{title}</h2>
      {items.length ? <ul className="mt-2 space-y-1.5">{items.map((q) => (
        <li key={q.id}><Link href={href(q.id)} className="flex items-center gap-2 rounded-lg border border-line p-2.5 text-sm hover:border-brand/50" data-testid="remix-source">
          <span className="min-w-0 flex-1"><span className="block text-xs font-semibold text-brand2">{label(q)}</span><span className="block truncate text-muted">{snippet(q)}</span></span><Wand2 size={15} className="shrink-0 text-brand" /></Link></li>
      ))}</ul> : <p className="mt-3 rounded-xl border border-dashed border-line px-4 py-5 text-center text-sm text-muted">{empty}</p>}
    </Card>
  );
  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Practice" title="Remix Studio" subtitle="Turn any question into new ones that test the same idea in a different way: new numbers, a new situation, another representation, working backward, spotting an error, or a harder application. Every remix is checked by an independent validator before you see it." />
      <div className="grid items-start gap-4 md:grid-cols-3">
        <List title="From your Mistake Bucket" items={mistakes} empty="No unresolved mistakes. Remixing a missed question is the best way to fix it." />
        <List title="From your saved questions" items={saved} empty="Bookmark questions while you practice to remix them here." />
        <List title="Recently answered" items={recent} empty="Answer a few questions first, or pick a skill below." />
      </div>
      <Card>
        <h2 className="font-semibold">Start from any skill</h2>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <select className="input !w-auto max-w-full" value={skill} onChange={(e) => setSkill(e.target.value as SkillId)} aria-label="Skill">
            {SKILLS.filter((k) => questionsBySkill(k.id).some((q) => remixable(q).ok)).map((k) => <option key={k.id} value={k.id}>{k.name}</option>)}
          </select>
          <button className="btn-primary" onClick={random} data-testid="remix-random"><Shuffle size={15} />Pick a question to remix</button>
        </div>
      </Card>
      {chains.length > 0 && (
        <Card>
          <h2 className="font-semibold">Your remix chains</h2>
          <ul className="mt-2 divide-y divide-line">{chains.map((c) => { const o = getQuestion(c.originId); return (
            <li key={c.id} className="flex flex-wrap items-center gap-2 py-2 text-sm" data-testid="remix-chain">
              <span className="min-w-0 flex-1"><span className="font-medium">{o ? label(o) : 'Original no longer available'}</span><span className="ml-2 text-xs text-muted">{c.steps.length} of {MAX_CHAIN} steps · {new Date(c.updatedAt).toLocaleDateString()}</span>{c.saved && <Badge tone="gold" className="ml-2">Saved</Badge>}</span>
              {o && <Link href={href(c.originId, c.id)} className="btn-ghost !py-1">Continue</Link>}
              {o && <Link href={href(c.originId)} className="btn-quiet !py-1" title="Start a new chain from the same original"><RotateCcw size={14} />Restart</Link>}
              <button className="btn-quiet !p-1.5" onClick={() => s.remixSaveChain(c.id, !c.saved)} aria-label={c.saved ? 'Unsave chain' : 'Save chain'}>{c.saved ? <BookmarkCheck size={15} className="text-brand" /> : <Bookmark size={15} />}</button>
              <button className="btn-quiet !p-1.5" onClick={() => { if (confirm('Delete this chain? Questions in your Mistake Bucket, review queue or saved list are kept.')) s.remixDeleteChain(c.id); }} aria-label="Delete chain"><Trash2 size={15} /></button>
            </li>); })}</ul>
        </Card>
      )}
      <ModeGuide />
    </div>
  );
}
function ModeGuide() {
  return (
    <Card>
      <h2 className="font-semibold">The six transformations</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {(Object.keys(MODE_INFO) as RemixMode[]).map((m) => { const I = MODE_ICON[m]; return <div key={m} className="rounded-2xl border border-line/80 p-3.5"><div className="flex items-center gap-2 font-semibold"><span className="grid h-8 w-8 place-items-center rounded-lg bg-accent/10 text-accent"><I size={16} aria-hidden /></span>{MODE_INFO[m].name}</div><p className="mt-0.5 text-sm text-muted">{MODE_INFO[m].blurb}</p><p className="mt-1 font-mono text-[11px] text-faint">{MODE_INFO[m].example}</p></div>; })}
      </div>
      <p className="mt-3 text-xs text-faint">Levels: {([1, 2, 3, 4, 5] as RemixLevel[]).map((l) => `${l} ${LEVEL_NAME[l]}`).join(' · ')}. Remixes count toward skill mastery (at most one per original question per day) but never toward your score estimate, because generated questions have no calibrated difficulty.</p>
    </Card>
  );
}

// ───────────────────────── workspace ─────────────────────────
function Workspace({ originId, chainId, at }: { originId: string; chainId?: string; at?: string }) {
  const s = useStore();
  const router = useRouter();
  const stats = useSkillStats();
  const origin = getQuestion(originId);
  const chain = chainId ? s.remix?.chains[chainId] : undefined;
  const steps = (chain?.steps ?? []).map((id) => s.remix?.items[id]).filter((x): x is RemixQuestion => !!x);
  const current = (at ? s.remix?.items[at] : undefined) ?? steps[steps.length - 1];
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<{ reason: string; rejected: string[] } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [levelChoice, setLevelChoice] = useState<RemixLevel | null>(null);
  const [useAi, setUseAi] = useState(false);
  const [showOrig, setShowOrig] = useState(false);
  const modesRef = useRef<HTMLDivElement>(null);
  // a generation that finishes after the student has moved on must not pull them back to this question
  const alive = useRef(true);
  useEffect(() => () => { alive.current = false; }, []);
  const can = remixable(origin);
  if (!origin || !can.ok) return <div><PageHeader eyebrow="Practice" title="Remix Studio" /><Empty title="This question cannot be remixed" body={can.reason ?? 'It could not be found.'} action={{ label: 'Back to Remix Studio', href: '/remix' }} /></div>;

  const parent = current ?? origin;
  const firstTry = (qid: string) => s.attempts.find((a) => a.qid === qid && !a.abandoned);
  const lastTry = (qid: string) => [...s.attempts].reverse().find((a) => a.qid === qid && !a.abandoned);
  const chainInfo = steps.map((q) => ({ id: q.id, mode: q.remix.mode, level: q.remix.level, correct: firstTry(q.id)?.correct }));
  const smart = smartPick({
    question: parent, last: lastTry(parent.id) ? { correct: lastTry(parent.id)!.correct, confidence: lastTry(parent.id)!.confidence, ms: lastTry(parent.id)!.ms } : undefined,
    mistake: s.mistakes[parent.id]?.category, skill: stats[parent.skill] ? { n: stats[parent.skill].n, acc: stats[parent.skill].acc } : undefined, chain: chainInfo,
  });
  const base = levelChoice ?? levelFor(parent);
  const full = steps.length >= MAX_CHAIN;
  const modes = modesFor(origin);

  const run = async (mode: RemixMode, level: RemixLevel, from: Question, why?: string) => {
    if (busy) return;
    if (full) { setErr({ reason: `This chain has reached ${MAX_CHAIN} steps. Start a new chain from the original to keep going.`, rejected: [] }); return; }
    setBusy(true); setErr(null); setNotice(null);
    await new Promise((r) => setTimeout(r, 20)); // let the button show it is working
    let ai: Candidate | null | undefined;
    if (useAi && aiReady(s.settings)) { const o = await aiCandidate(s.settings, from, mode, level); ai = o.candidate; if (o.notice) setNotice(o.notice); }
    if (!alive.current) return;
    const cid = chain?.id ?? s.remixNewChain(origin.id);
    const previous = Object.values(useStore.getState().remix?.items ?? {}).filter((x) => x.remix.originId === origin.id).map(signature);
    const r = generate({ parent: from, originId: origin.id, chainId: cid, mode, level, previous, corpus: corpus(), smart: why, aiCandidate: ai, seed: `${cid}-${Date.now()}` });
    if (!r.ok) { setErr({ reason: r.reason, rejected: r.rejected }); setBusy(false); return; }
    const add = useStore.getState().remixAdd(r.question);
    if (!add.ok) { setErr({ reason: add.reason!, rejected: [] }); setBusy(false); return; }
    if (!alive.current) return;
    setBusy(false);
    // only move to the new step if the student is still on this question (they may have navigated away meanwhile)
    const here = new URLSearchParams((window.location.hash.split('?')[1] ?? '')).get('q');
    if (here !== origin.id) return;
    router.replace(href(origin.id, cid, r.question.id));
  };
  const nextPick = current ? smartPick({ question: current, last: lastTry(current.id) ? { correct: lastTry(current.id)!.correct, confidence: lastTry(current.id)!.confidence } : undefined, mistake: s.mistakes[current.id]?.category, chain: chainInfo }) : null;
  const stepParent = (q: RemixQuestion) => getQuestion(q.remix.parentId ?? q.remix.originId) ?? origin;

  return (
    <div className="space-y-4">
      <PageHeader eyebrow="Remix Studio" title={label(origin)} subtitle={current ? `Step ${steps.indexOf(current) + 1} of this chain. Each step is generated from the one before it and validated on its own.` : 'Choose how to transform this question. Smart Remix picks for you, using your answers, confidence and mistakes.'}
        actions={<Link href="/remix" className="btn-ghost">All remixes</Link>} />

      <nav aria-label="Remix chain" className="card-soft flex flex-wrap items-center gap-1.5 p-2 text-sm" data-testid="remix-chain-nav">
        <Link href={href(origin.id, chain?.id, undefined)} onClick={(e) => { e.preventDefault(); setShowOrig(true); }} className="chip">Original</Link>
        {steps.map((q, i) => { const c = chainInfo[i].correct; return (
          <span key={q.id} className="flex items-center gap-1.5"><ChevronRight size={13} className="text-faint" />
            <Link href={href(origin.id, chain!.id, q.id)} className={cn('chip !py-1', q.id === current?.id && 'border-accent/60 bg-accent/[.14] text-ink shadow-[0_0_0_3px_rgb(var(--accent)/.12)]')} aria-current={q.id === current?.id ? 'step' : undefined}>
              {i + 1}. {MODE_INFO[q.remix.mode].name.replace(' Remix', '')}{c === true ? <Check size={12} className="text-ok" /> : c === false ? <X size={12} className="text-bad" /> : null}</Link></span>); })}
        {chain && <button className="btn-quiet ml-auto !py-1" onClick={() => s.remixSaveChain(chain.id, !chain.saved)} data-testid="remix-save-chain">{chain.saved ? <BookmarkCheck size={15} className="text-brand" /> : <Bookmark size={15} />}{chain.saved ? 'Chain saved' : 'Save chain'}</button>}
      </nav>

      <div ref={modesRef} id="remix-modes">
        <Card className="card-glow space-y-4">
          <div className="-mx-5 -mt-5 flex flex-wrap items-center gap-3 rounded-t-[22px] border-b border-line/60 bg-accent/[.07] px-5 py-4">
            <button className="btn-primary" disabled={busy || full} onClick={() => run(smart.mode, smart.level, parent, smart.reason)} data-testid="remix-smart">{busy ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}Smart Remix</button>
            <p className="min-w-[14rem] flex-1 text-sm text-muted"><b className="text-ink">{MODE_INFO[smart.mode].name}, {LEVEL_NAME[smart.level]}.</b> {smart.reason}</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3" role="group" aria-label="Transformations">
            {modes.map((m) => (
              <button key={m.mode} disabled={!m.ok || busy || full} onClick={() => run(m.mode, MODE_INFO[m.mode].effect === 'increase' ? bump(base, 1) : base, parent)} className={cn('group flex gap-3 rounded-2xl border border-line/80 bg-surface p-3 text-left transition-[border-color,box-shadow,transform]', m.ok ? 'hover:-translate-y-0.5 hover:border-accent/50 hover:shadow-[0_12px_28px_-18px_rgb(var(--accent)/.7)]' : 'cursor-not-allowed opacity-50')} data-testid={`remix-mode-${m.mode}`} title={m.ok ? undefined : m.note}>
                {(() => { const I = MODE_ICON[m.mode]; return <span className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-xl transition-colors', m.ok ? 'bg-accent/10 text-accent group-hover:bg-accent group-hover:text-white' : 'bg-raised text-faint')}><I size={17} aria-hidden /></span>; })()}
                <span className="min-w-0"><span className="flex items-center gap-1.5 font-semibold">{MODE_INFO[m.mode].name}{MODE_INFO[m.mode].effect === 'increase' && <ArrowUp size={13} className="text-accent" aria-label="raises difficulty" />}</span><span className="mt-0.5 block text-xs leading-snug text-muted">{m.note}</span></span>
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-1.5 text-sm" role="radiogroup" aria-label="Difficulty">
            <span className="mr-1 text-[11px] font-bold uppercase tracking-[0.08em] text-faint">Difficulty</span>
            <button role="radio" aria-checked={levelChoice === null} className={cn('chip !py-1', levelChoice === null && 'border-accent/60 bg-accent/[.12] text-ink')} onClick={() => setLevelChoice(null)}>Preserve ({LEVEL_NAME[levelFor(parent)]})</button>
            <button role="radio" aria-checked={levelChoice === bump(levelFor(parent), 1) && levelFor(parent) < 5} className="chip !py-1" onClick={() => setLevelChoice(bump(levelFor(parent), 1))} disabled={levelFor(parent) >= 5}><ArrowUp size={12} />Increase</button>
            {([1, 2, 3, 4, 5] as RemixLevel[]).map((l) => <button key={l} role="radio" aria-checked={levelChoice === l} title={LEVEL_MEANS[l]} className={cn('chip !py-1', levelChoice === l && 'border-accent/60 bg-accent/[.12] text-ink')} onClick={() => setLevelChoice(l)}>{l}. {LEVEL_NAME[l]}</button>)}
          </div>
          {aiReady(s.settings) && <label className="flex items-center gap-2 text-xs text-muted"><input type="checkbox" checked={useAi} onChange={(e) => setUseAi(e.target.checked)} className="h-4 w-4 accent-[rgb(var(--brand))]" />Try your Gemini key first (still validated; falls back to the built-in generators; AI-written Reading &amp; Writing is marked for review)</label>}
          {full && <p className="text-sm text-warn">This chain has reached {MAX_CHAIN} steps. <Link className="underline" href={href(origin.id)}>Start a new chain</Link> from the original.</p>}
          {notice && <p className="text-xs text-muted" role="status">{notice}</p>}
          {err && <div className="rounded-xl border border-bad/40 bg-bad/5 p-3 text-sm" role="alert" data-testid="remix-error"><b>{err.reason}</b>{err.rejected.length > 0 && <details className="mt-1 text-xs text-muted"><summary className="cursor-pointer">Why each attempt was rejected</summary><ul className="mt-1 list-disc space-y-0.5 pl-4">{err.rejected.map((r, i) => <li key={i}>{r}</li>)}</ul></details>}</div>}
          {origin.official && <p className="flex gap-1.5 text-xs text-faint"><Info size={13} className="mt-0.5 shrink-0" />This original is an official College Board question. Remixes are built entirely from Stellify’s own content: they test the same skill but reuse none of the College Board’s text.</p>}
        </Card>
      </div>

      {current ? <CurrentRemix key={current.id} q={current} originId={origin.id} chainId={chain!.id}
        actions={(
          <div className="flex flex-wrap gap-2" data-testid="remix-actions">
            <button className="btn-primary !py-1.5" disabled={busy || full} onClick={() => run(nextPick!.mode, nextPick!.level, current, nextPick!.reason)} title={nextPick?.reason} data-testid="remix-next"><Sparkles size={15} />Smart next step</button>
            <button className="btn-ghost !py-1.5" disabled={busy || full} onClick={() => run(current.remix.mode, current.remix.level, stepParent(current))} data-testid="remix-again"><RefreshCw size={15} />Remix again</button>
            <button className="btn-ghost !py-1.5" onClick={() => modesRef.current?.scrollIntoView({ behavior: 'smooth' })}><Wand2 size={15} />Another transformation</button>
            <button className="btn-ghost !py-1.5" disabled={busy || full || current.remix.level >= 5} onClick={() => run(current.remix.mode, bump(current.remix.level, 1), current)} data-testid="remix-harder"><ArrowUp size={15} />Increase difficulty</button>
            <button className="btn-ghost !py-1.5" onClick={() => setShowOrig(true)}>Review original</button>
          </div>
        )} />
        : <OriginalCard q={origin} answered={!!firstTry(origin.id)} />}

      <Modal open={showOrig} onClose={() => setShowOrig(false)} title="The original question" wide>
        <OriginalCard q={origin} answered={!!firstTry(origin.id)} bare />
      </Modal>
    </div>
  );
}

function OriginalCard({ q, answered, bare }: { q: Question; answered: boolean; bare?: boolean }) {
  const last = useStore((st) => [...st.attempts].reverse().find((a) => a.qid === q.id && !a.abandoned));
  const body = (
    <div className="space-y-3">
      <QuestionMeta q={q} />
      <QuestionView q={q} answer={answered ? last?.answer ?? null : null} onAnswer={() => {}} locked reveal={answered} hlScope="remix" />
      {answered ? <details><summary className="cursor-pointer text-sm font-semibold">Explanation</summary><div className="mt-2"><Explanation q={q} answer={last?.answer ?? null} /></div></details>
        : <p className="text-sm text-muted">You have not answered this one yet. <Link className="underline" href={`/practice/session?mode=single&ids=${q.id}`}>Try the original first</Link>, or remix it straight away.</p>}
    </div>
  );
  return bare ? body : <Card><h2 className="mb-2 font-semibold">The original</h2>{body}</Card>;
}

function CurrentRemix({ q, actions }: { q: RemixQuestion; originId: string; chainId: string; actions: React.ReactNode }) {
  const m = q.remix;
  return (
    <div className="space-y-3">
      <Card className="!p-4" data-testid="remix-info">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge tone="brand">{MODE_INFO[m.mode].name}</Badge><Badge>{LEVEL_NAME[m.level]}</Badge>
          <Badge tone={m.status === 'rejected' ? 'bad' : m.status === 'needs-review' ? 'warn' : 'ok'}>{STATUS_NAME[m.status]}</Badge>
          <Badge>{m.method === 'ai' ? 'Written with AI, then validated' : 'Built-in generator'}</Badge>
        </div>
        <p className="mt-2 text-sm"><b>How this differs:</b> {m.differs}</p>
        {m.smart && <p className="mt-1 text-sm text-muted"><b className="text-ink">Why Smart Remix chose this:</b> {m.smart}</p>}
        {m.status === 'rejected' && <p className="mt-1 text-sm text-bad">A reviewer rejected this question{m.review?.note ? `: ${m.review.note}` : '.'} It no longer counts toward mastery.</p>}
        <details className="mt-2 text-xs text-muted"><summary className="cursor-pointer">Validation report ({m.validation.checks.filter((c) => c.pass).length} of {m.validation.checks.length} checks passed{m.rejected.length ? `; ${m.rejected.length} earlier attempt${m.rejected.length === 1 ? '' : 's'} rejected` : ''})</summary>
          <ul className="mt-1 grid gap-0.5 sm:grid-cols-2">{m.validation.checks.map((c) => <li key={c.name} className="flex gap-1.5">{c.pass ? <Check size={13} className="mt-0.5 shrink-0 text-ok" /> : <X size={13} className="mt-0.5 shrink-0 text-bad" />}{c.name}</li>)}</ul>
        </details>
      </Card>
      <SessionRunner qids={[q.id]} mode="remix" title={`${MODE_INFO[m.mode].name} · ${SKILL[q.skill].short}`} backHref="/remix" completeHref="/remix" completeLabel="Back to Remix Studio"
        afterExplanation={() => <Card className="!p-4"><h3 className="mb-2 text-sm font-semibold">Keep going</h3>{actions}</Card>} />
    </div>
  );
}
