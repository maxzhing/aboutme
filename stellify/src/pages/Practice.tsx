import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Brain, CheckCircle2, Circle, Timer, XCircle, Zap } from 'lucide-react';
import { useMemo, useState } from 'react';
import { BANK_STATS, getQuestion, QUESTIONS } from '@/data/questions';
import { snapshot, useStore } from '@/lib/store';
import { buildSession, filterBank, type BankFilter } from '@/lib/sessions';
import { rankSkills } from '@/lib/engine/adaptive';
import { buildModule, moduleMs } from '@/lib/engine/mock';
import { MASTERY_LEVELS } from '@/lib/engine/mastery';
import { DIFFICULTIES, DIFFICULTY_NAME, DOMAINS, SAT_STRUCTURE, SECTION_NAME, SKILL, SKILLS } from '@/lib/taxonomy';
import { plain } from '@/lib/richtext';
import { pct, rng, shuffle } from '@/lib/util';
import type { Difficulty, DomainId, Section, SkillId } from '@/lib/types';
import { SessionRunner } from '@/components/SessionRunner';
import { Badge, Card, Empty, PageHeader, Progress } from '@/components/ui';

/** Runs whatever session the URL describes (smart set, skill drill, mistakes, review, saved…). */
export function SessionPage() {
  const sp = useSearchParams();
  const key = sp.toString();
  const built = useMemo(() => buildSession(Object.fromEntries(sp.entries()), snapshot(), QUESTIONS, getQuestion, Date.now()),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key]);
  if (!built.qids.length) return <Empty title="Nothing to practice here yet" body={built.empty ?? 'No questions match this selection.'} action={{ label: 'Go to Smart Practice', href: '/practice/smart' }} />;
  const back = sp.get('back') ?? (built.mode === 'mistakes' ? '/mistakes' : built.mode === 'lesson' ? `/learn/${sp.get('skill')}` : '/practice');
  return <SessionRunner key={key} qids={built.qids} mode={built.mode} title={built.title} reasons={built.reasons} backHref={back}
    completeHref={built.mode === 'mistakes' ? '/mistakes' : '/practice/smart'} completeLabel={built.mode === 'mistakes' ? 'Back to the Mistake Bucket' : 'More smart practice'} />;
}

export function BankPage() {
  const attempts = useStore((s) => s.attempts);
  const saved = useStore((s) => s.saved);
  const [f, setF] = useState<BankFilter>({});
  const [shown, setShown] = useState(20);
  const last = useMemo(() => { const m = new Map<string, boolean>(); for (const a of attempts) if (!a.abandoned) m.set(a.qid, a.correct); return m; }, [attempts]);
  const list = useMemo(() => filterBank(QUESTIONS, f, { attempts, saved }), [f, attempts, saved]);
  const set = (p: Partial<BankFilter>) => { setF((x) => ({ ...x, ...p })); setShown(20); };
  const startIds = (n: number) => shuffle(list, rng(`${Date.now()}`)).sort((a, b) => Number(last.has(a.id)) - Number(last.has(b.id))).slice(0, n).map((q) => q.id).join(',');
  const skills = SKILLS.filter((k) => (!f.section || k.section === f.section) && (!f.domain || k.domain === f.domain));
  return (
    <div>
      <PageHeader eyebrow="Practice" title="Question Bank" subtitle={`${BANK_STATS.total} original, SAT-calibrated questions (${BANK_STATS.math} Math, ${BANK_STATS.rw} Reading & Writing). Every one has a validated answer and a full explanation for each choice. These are not official College Board questions.`}
        actions={<Link href="/resources" className="btn-ghost">Official practice resources</Link>} />
      <Card className="mb-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div><label className="label" htmlFor="f-sec">Section</label>
            <select id="f-sec" className="input" value={f.section ?? ''} onChange={(e) => set({ section: (e.target.value || undefined) as Section | undefined, domain: undefined, skill: undefined })}><option value="">All sections</option><option value="math">Math</option><option value="rw">Reading &amp; Writing</option></select></div>
          <div><label className="label" htmlFor="f-dom">Domain</label>
            <select id="f-dom" className="input" value={f.domain ?? ''} onChange={(e) => set({ domain: (e.target.value || undefined) as DomainId | undefined, skill: undefined })}><option value="">All domains</option>{DOMAINS.filter((d) => !f.section || d.section === f.section).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select></div>
          <div><label className="label" htmlFor="f-skill">Skill</label>
            <select id="f-skill" className="input" value={f.skill ?? ''} onChange={(e) => set({ skill: (e.target.value || undefined) as SkillId | undefined })}><option value="">All skills</option>{skills.map((k) => <option key={k.id} value={k.id}>{k.short}</option>)}</select></div>
          <div><label className="label" htmlFor="f-status">Status</label>
            <select id="f-status" className="input" value={f.status ?? ''} onChange={(e) => set({ status: (e.target.value || undefined) as BankFilter['status'] })}><option value="">Any</option><option value="unseen">Not attempted</option><option value="wrong">Last attempt wrong</option><option value="correct">Last attempt correct</option><option value="saved">Saved</option></select></div>
          <div><span className="label">Difficulty</span>
            <div className="flex flex-wrap gap-1.5">{DIFFICULTIES.map((d) => { const on = f.diff?.includes(d); return <button key={d} aria-pressed={!!on} onClick={() => set({ diff: on ? f.diff!.filter((x) => x !== d) : [...(f.diff ?? []), d] as Difficulty[] })} className={`chip ${on ? 'border-brand bg-brand/15 text-ink' : ''}`}>{DIFFICULTY_NAME[d]}</button>; })}</div></div>
          <div><label className="label" htmlFor="f-type">Format</label>
            <select id="f-type" className="input" value={f.type ?? ''} onChange={(e) => set({ type: (e.target.value || undefined) as 'mcq' | 'spr' | undefined })}><option value="">Any</option><option value="mcq">Multiple choice</option><option value="spr">Student-produced response</option></select></div>
          <div className="sm:col-span-2"><label className="label" htmlFor="f-text">Search text</label><input id="f-text" className="input" placeholder="Words in the question, topic or ID" value={f.text ?? ''} onChange={(e) => set({ text: e.target.value })} /></div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-4">
          <span className="text-sm text-muted" data-testid="bank-count"><b className="text-ink">{list.length}</b> matching question{list.length === 1 ? '' : 's'}</span>
          <div className="ml-auto flex flex-wrap gap-2">
            {[5, 10, 20].map((n) => <Link key={n} href={`/practice/session?mode=custom&ids=${startIds(n)}`} className={`btn-${n === 10 ? 'primary' : 'ghost'} ${list.length ? '' : 'pointer-events-none opacity-50'}`}>Practice {Math.min(n, list.length)}</Link>)}
          </div>
        </div>
      </Card>
      <ul className="space-y-2">
        {list.slice(0, shown).map((q) => (
          <li key={q.id}>
            <Link href={`/practice/session?mode=single&ids=${q.id}`} className="card flex items-center gap-3 p-3.5 hover:border-brand/50">
              {last.get(q.id) === true ? <CheckCircle2 className="shrink-0 text-ok" size={18} aria-label="Answered correctly" /> : last.get(q.id) === false ? <XCircle className="shrink-0 text-bad" size={18} aria-label="Answered incorrectly" /> : <Circle className="shrink-0 text-faint" size={18} aria-label="Not attempted" />}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5 text-xs"><Badge tone="brand">{SKILL[q.skill].short}</Badge><Badge tone={(q.difficulty === 'very-hard' || q.difficulty === 'elite') ? 'bad' : q.difficulty === 'hard' ? 'warn' : 'ok'}>{DIFFICULTY_NAME[q.difficulty]}</Badge><span className="text-faint">{q.sub} · {q.type === 'spr' ? 'Student-produced' : 'Multiple choice'}</span></div>
                <p className="mt-1 truncate text-sm text-muted">{plain(q.passage ?? q.notes?.join(' ') ?? q.stem).slice(0, 150)}</p>
              </div>
              <span className="hidden text-xs text-faint sm:block">{q.id}</span>
            </Link>
          </li>
        ))}
      </ul>
      {shown < list.length && <button className="btn-ghost mx-auto mt-4 flex" onClick={() => setShown((n) => n + 30)}>Show more ({list.length - shown} remaining)</button>}
    </div>
  );
}

export function SmartPage() {
  const attempts = useStore((s) => s.attempts);
  const ranked = useMemo(() => rankSkills(snapshot(), getQuestion, Date.now()).slice(0, 6),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [attempts]);
  const due = useStore((s) => Object.values(s.srs).filter((c) => c.due <= Date.now()).length);
  return (
    <div>
      <PageHeader eyebrow="Practice" title="Smart Practice" subtitle="Each set is built for you: about 60% targets your weakest skills at the right difficulty, 20% brings back questions scheduled for spaced review, and 20% keeps your stronger skills sharp." />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <h2 className="flex items-center gap-2 font-semibold"><Brain size={18} className="text-brand" />Start a set</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {([['', 'Mixed'], ['math', 'Math'], ['rw', 'Reading & Writing']] as const).map(([sec, label]) => (
              <div key={label} className="rounded-xl border border-line p-3">
                <div className="text-sm font-semibold">{label}</div>
                <div className="mt-2 flex flex-wrap gap-1.5">{[5, 10, 20].map((n) => <Link key={n} href={`/practice/session?mode=smart&n=${n}${sec ? `&section=${sec}` : ''}`} className={n === 10 ? 'btn-primary !px-3 !py-1.5' : 'btn-ghost !px-3 !py-1.5'}>{n}</Link>)}</div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/practice/session?mode=review&n=10" className="btn-ghost">Spaced review <Badge tone={due ? 'warn' : 'default'}>{due} due</Badge></Link>
            <Link href="/practice/session?mode=saved" className="btn-ghost">Saved questions</Link>
          </div>
        </Card>
        <Card>
          <h2 className="font-semibold">How difficulty adapts</h2>
          <ul className="mt-2 space-y-1.5 text-sm text-muted">
            <li>• High challenge is on by default: smart sets skip medium questions and start at hard.</li>
            <li>• 50–78% recent accuracy in a skill: hard, then very hard.</li>
            <li>• Above 78%: very hard. Above 90%: Beyond SAT.</li>
            <li>• Anything you miss or need hints for returns after 1 day, then at growing intervals.</li>
          </ul>
        </Card>
      </div>
      <h2 className="mb-2 mt-6 font-semibold">What the engine will prioritize</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {ranked.map((r) => (
          <Card key={r.skill} className="!p-4">
            <div className="flex items-center justify-between gap-2"><Link href={`/learn/${r.skill}`} className="font-semibold hover:underline">{SKILL[r.skill].short}</Link><Badge>{MASTERY_LEVELS[r.stats.level]}</Badge></div>
            <p className="mt-1 text-sm text-muted">{r.reason}</p>
            <Link href={`/practice/session?mode=skill&skill=${r.skill}&n=6`} className="mt-2 inline-block text-sm font-semibold text-brand2 hover:underline">Practice 6 →</Link>
          </Card>
        ))}
      </div>
    </div>
  );
}

/** The set modelled on the structures of the hardest released Digital SAT Reading & Writing items. */
function PatternSet({ solved }: { solved: Set<string> }) {
  const set = QUESTIONS.filter((q) => q.id.startsWith('r-cb-'));
  const done = set.filter((q) => solved.has(q.id)).length;
  const part = (pre: string) => shuffle(set.filter((q) => pre.split(',').some((p) => q.id.startsWith(`r-cb-${p}`))).sort((a, b) => Number(solved.has(a.id)) - Number(solved.has(b.id))).slice(0, 10).map((q) => q.id)).join(',');
  const groups: [string, string][] = [['Punctuation (15)', 'bnd'], ['Verbs, modifiers, apostrophes (9)', 'fss'], ['Evidence and inference (11)', 'coet,coeq,inf'], ['Reading (5)', 'cid,tsp,wic']];
  return (
    <Card className="mt-4 border-brand/40" data-testid="pattern-set">
      <h2 className="text-lg font-bold">🎯 Official-pattern set · Reading &amp; Writing</h2>
      <p className="mt-1 text-sm text-muted">{set.length} original questions built on the structures the hardest released Digital SAT questions use (stacked punctuation decisions, buried subjects, two-part evidence claims), each pushed a step harder. {done} of {set.length} solved.</p>
      <Progress value={pct(done, set.length)} className="mt-2" />
      <div className="mt-4 flex flex-wrap gap-2">
        <Link href={`/practice/session?mode=custom&ids=${part('')}&back=/practice/hard`} className="btn-primary">Start 10 questions</Link>
        {groups.map(([label, pre]) => <Link key={pre} href={`/practice/session?mode=custom&ids=${part(pre)}&back=/practice/hard`} className="btn-ghost">{label}</Link>)}
      </div>
      <p className="mt-3 text-xs text-faint">These are Stellify originals, not College Board questions. For official practice, use Bluebook and the College Board question bank (see Resources).</p>
    </Card>
  );
}

export function HardPage() {
  const attempts = useStore((s) => s.attempts);
  const solved = useMemo(() => new Set(attempts.filter((a) => a.correct).map((a) => a.qid)), [attempts]);
  return (
    <div>
      <PageHeader eyebrow="Practice" title="Hardest Questions" subtitle="Very hard questions at the top of real-test difficulty, plus a Beyond SAT tier that is deliberately harder than anything on the exam, so the real thing feels manageable. Unsolved questions come first." />
      <div className="grid gap-4 md:grid-cols-2">
        {(['math', 'rw'] as Section[]).map((sec) => {
          const pool = QUESTIONS.filter((q) => q.section === sec && (q.difficulty === 'very-hard' || q.difficulty === 'elite'));
          const elite = pool.filter((q) => q.difficulty === 'elite');
          const done = pool.filter((q) => solved.has(q.id)).length;
          return (
            <Card key={sec}>
              <h2 className="flex items-center gap-2 text-lg font-bold"><Zap size={18} className="text-warn" />{SECTION_NAME[sec]}</h2>
              <p className="mt-1 text-sm text-muted">{done} of {pool.length} solved · includes {elite.length} Beyond SAT questions, written to be harder than the real test</p>
              <Progress value={pct(done, pool.length)} className="mt-2" />
              <div className="mt-4 flex flex-wrap gap-2">{[5, 8, 15].map((n) => <Link key={n} href={`/practice/session?mode=hard&section=${sec}&n=${n}`} className={n === 8 ? 'btn-primary' : 'btn-ghost'}>{n} questions</Link>)}</div>
              <Link href={`/practice/session?mode=bank&section=${sec}&diff=elite&n=${elite.length}`} className="btn-ghost mt-2" data-testid={`elite-${sec}`}>Beyond SAT only ({elite.length})</Link>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {DOMAINS.filter((d) => d.section === sec).map((d) => <Link key={d.id} href={`/practice/session?mode=bank&domain=${d.id}&diff=very-hard&n=8`} className="chip hover:text-ink">{d.name}</Link>)}
              </div>
            </Card>
          );
        })}
      </div>
      <PatternSet solved={solved} />
      <Card className="mt-4"><p className="text-sm text-muted">Tip: on very hard questions, spend the first ten seconds deciding what is really being asked. The explanation for each one shows the fastest reliable method and the trap built into the wrong answers.</p></Card>
    </div>
  );
}

export function TimedPage() {
  const sp = useSearchParams();
  const param = sp.get('section');
  const [section, setSection] = useState<Section | null>(param === 'math' || param === 'rw' ? param : null);
  const qids = useMemo(() => (section ? buildModule(section, 'm1', `timed-${Date.now()}`, QUESTIONS, new Set()) : []), [section]);
  if (section) return <SessionRunner qids={qids} mode="timed" feedback="end" totalMs={moduleMs(section)} hints={false} title={`Timed module · ${SECTION_NAME[section]}`} backHref="/practice/timed" completeHref="/analytics" completeLabel="See analytics" />;
  return (
    <div>
      <PageHeader eyebrow="Practice" title="Timed Modules" subtitle="One module at real test length and pacing. No hints and no feedback until you submit, exactly like test day. Explanations for every question follow." />
      <div className="grid gap-4 md:grid-cols-2">
        {(['rw', 'math'] as Section[]).map((sec) => (
          <Card key={sec}>
            <h2 className="flex items-center gap-2 text-lg font-bold"><Timer size={18} className="text-brand2" />{SECTION_NAME[sec]}</h2>
            <p className="mt-1 text-sm text-muted">{SAT_STRUCTURE[sec].questionsPerModule} questions · {SAT_STRUCTURE[sec].minutesPerModule} minutes · about {Math.round((SAT_STRUCTURE[sec].minutesPerModule * 60) / SAT_STRUCTURE[sec].questionsPerModule)} seconds per question</p>
            <button className="btn-primary mt-4" onClick={() => setSection(sec)}>Start {SECTION_NAME[sec]} module</button>
          </Card>
        ))}
      </div>
      <Card className="mt-4 text-sm text-muted">Ready for the full experience? <Link href="/mocks" className="font-semibold text-brand2 hover:underline">Take a full-length mock exam</Link> with two modules per section and adaptive routing.</Card>
    </div>
  );
}
