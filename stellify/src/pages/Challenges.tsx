import Link from 'next/link';
import { Flame, Gauge, Swords, Trophy } from 'lucide-react';
import { useMemo, useState } from 'react';
import { getQuestion, QUESTIONS } from '@/data/questions';
import { useStore } from '@/lib/store';
import { dailyQuestion } from '@/lib/sessions';
import { DIFFICULTY_NAME, SECTION_NAME, SKILL } from '@/lib/taxonomy';
import { addDays, dateKey, fmtDuration, pct, rng, shuffle } from '@/lib/util';
import type { Section } from '@/lib/types';
import { SessionRunner, type SessionResult } from '@/components/SessionRunner';
import { Badge, Card, PageHeader, Stat } from '@/components/ui';

export function DailyPage() {
  const daily = useStore((s) => s.daily);
  const record = useStore((s) => s.recordDaily);
  const today = dateKey();
  const q = useMemo(() => dailyQuestion(QUESTIONS, today), [today]);
  const [go, setGo] = useState(false);
  const done = daily[today];
  let run = 0;
  for (let d = done ? today : addDays(today, -1); daily[d]; d = addDays(d, -1)) run++;
  const best = Math.min(...Object.values(daily).filter((d) => d.correct).map((d) => d.ms), Infinity);
  const wins = Object.values(daily).filter((d) => d.correct).length;
  if (go && !done) return <SessionRunner qids={[q.id]} mode="daily" title="Daily Challenge" backHref="/daily" onComplete={(r) => record(q.id, r.rows[0].correct, r.rows[0].ms)} completeHref="/daily" completeLabel="Back to Daily Challenge" />;
  return (
    <div>
      <PageHeader eyebrow="Practice" title="Daily Challenge" subtitle="One hard or very hard question a day, the same for everyone using Stellify that day. A small habit that keeps you sharp." />
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Challenge streak" value={`${run} day${run === 1 ? '' : 's'}`} icon={<Flame size={15} className="text-warn" />} />
        <Stat label="Solved" value={`${wins}/${Object.keys(daily).length}`} sub="correct / attempted" />
        <Stat label="Personal best" value={Number.isFinite(best) ? fmtDuration(best) : '—'} sub="fastest correct solve" icon={<Trophy size={15} className="text-gold" />} />
      </div>
      <Card className="mt-4">
        <div className="flex flex-wrap items-center gap-2"><Badge tone="brand">{SECTION_NAME[q.section]}</Badge><Badge>{SKILL[q.skill].short}</Badge><Badge tone={q.difficulty === 'very-hard' ? 'bad' : 'warn'}>{DIFFICULTY_NAME[q.difficulty]}</Badge></div>
        {done ? (
          <div className="mt-3"><p className="font-semibold">{done.correct ? 'Solved today' : 'Attempted today'} in {fmtDuration(done.ms)}. A new challenge unlocks tomorrow.</p>
            <div className="mt-3 flex gap-2"><Link href={`/practice/session?mode=single&ids=${done.qid}&back=/daily`} className="btn-ghost">Review today&apos;s question</Link><Link href="/practice/session?mode=smart&n=5" className="btn-primary">Keep going: 5 smart questions</Link></div></div>
        ) : (
          <div className="mt-3"><p className="text-sm text-muted">Today&apos;s challenge is ready. Bonus XP for a correct answer; hints are available but reduce the reward.</p><button className="btn-primary mt-3" onClick={() => setGo(true)} data-testid="start-daily">Start today&apos;s challenge</button></div>
        )}
      </Card>
    </div>
  );
}

export function SpeedPage() {
  const arena = useStore((s) => s.arena);
  const recordArena = useStore((s) => s.recordArena);
  const [section, setSection] = useState<Section | null>(null);
  const [result, setResult] = useState<SessionResult | null>(null);
  const qids = useMemo(() => (section ? shuffle(QUESTIONS.filter((q) => q.section === section && q.difficulty !== 'very-hard'), rng(`speed-${Date.now()}`)).slice(0, 10).map((q) => q.id) : []), [section]);
  const analyze = (r: SessionResult) => {
    const rows = r.rows.map((x) => ({ ...x, q: getQuestion(x.qid)! }));
    const fast = rows.filter((x) => x.ms <= x.q.time * 1000), slow = rows.filter((x) => x.ms > x.q.time * 1000);
    const onPace = rows.filter((x) => x.correct && x.ms <= x.q.time * 1000).length;
    return { fastAcc: pct(fast.filter((x) => x.correct).length, fast.length), slowAcc: pct(slow.filter((x) => x.correct).length, slow.length), fastN: fast.length, slowN: slow.length, onPace, avg: r.totalMs / rows.length, target: rows.reduce((t, x) => t + x.q.time * 1000, 0) / rows.length };
  };
  if (section) {
    const a = result ? analyze(result) : null;
    return (
      <div>
        {a && result && (
          <Card className="mb-4" data-testid="speed-result">
            <h2 className="text-lg font-bold">Speed analysis</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-4">
              <Stat label="Correct and on pace" value={`${a.onPace}/10`} sub="the score that counts" />
              <Stat label="Average time" value={fmtDuration(a.avg)} sub={`target ${fmtDuration(a.target)}`} />
              <Stat label="Accuracy when on pace" value={a.fastN ? `${a.fastAcc}%` : '—'} sub={`${a.fastN} questions`} />
              <Stat label="Accuracy when over time" value={a.slowN ? `${a.slowAcc}%` : '—'} sub={`${a.slowN} questions`} />
            </div>
            <p className="mt-3 text-sm text-muted">{a.fastN && a.slowN && a.fastAcc + 15 < a.slowAcc ? 'You are noticeably more accurate when you take your time. Keep the slower pace for now and build speed through familiarity, not rushing.' : a.fastN >= 7 && a.fastAcc >= 80 ? 'You are fast and accurate at this level. Move up to hard and very hard questions.' : 'Only correct answers count toward your pace score. Speed never earns credit for a wrong answer.'}</p>
          </Card>
        )}
        <SessionRunner key={qids.join()} qids={qids} mode="speed" feedback="end" hints={false} title={`Speed training · ${SECTION_NAME[section]}`} backHref="/speed"
          onComplete={(r) => { setResult(r); recordArena(`speed-${section}`, { score: analyze(r).onPace, correct: r.correct, total: 10, ms: r.totalMs }); window.scrollTo(0, 0); }} completeHref="/speed" completeLabel="Back to Speed Training" />
      </div>
    );
  }
  return (
    <div>
      <PageHeader eyebrow="Practice" title="Speed Training" subtitle="Ten medium and hard questions against their target times. Your score is the number you get right within the target. A fast wrong answer is worth nothing, so accuracy always comes first." />
      <div className="grid gap-4 md:grid-cols-2">
        {(['math', 'rw'] as Section[]).map((sec) => { const rec = arena[`speed-${sec}`]; const h = rec?.history ?? []; const lastN = h.slice(-5); return (
          <Card key={sec}>
            <h2 className="flex items-center gap-2 text-lg font-bold"><Gauge size={18} className="text-brand2" />{SECTION_NAME[sec]}</h2>
            <p className="mt-1 text-sm text-muted">{rec ? `Best: ${rec.best}/10 correct and on pace · ${h.length} session${h.length === 1 ? '' : 's'}` : 'No sessions yet'}</p>
            {lastN.length > 0 && <div className="mt-3 flex items-end gap-1.5" aria-label="Recent pace scores">{lastN.map((x, i) => <div key={i} className="flex flex-col items-center gap-1 text-[10px] text-muted"><div className="w-7 rounded-t bg-gradient-to-t from-brand to-brand2" style={{ height: 6 + x.score * 6 }} />{x.score}</div>)}<span className="ml-2 text-xs text-faint">average time {fmtDuration(lastN[lastN.length - 1].ms / 10)} last session</span></div>}
            <button className="btn-primary mt-4" onClick={() => { setResult(null); setSection(sec); }}>Start</button>
          </Card>
        ); })}
      </div>
    </div>
  );
}

const ARENA = [
  { id: 'blitz-math', name: 'Math Blitz', desc: 'As many Math questions as you can in 8 minutes.', n: 12, ms: 8 * 60_000, pick: () => QUESTIONS.filter((q) => q.section === 'math' && q.difficulty !== 'very-hard') },
  { id: 'blitz-rw', name: 'Reading Blitz', desc: 'As many Reading & Writing questions as you can in 8 minutes.', n: 12, ms: 8 * 60_000, pick: () => QUESTIONS.filter((q) => q.section === 'rw' && q.difficulty !== 'very-hard') },
  { id: 'gauntlet', name: 'Hardest-Question Gauntlet', desc: 'Ten very hard questions from both sections. No clock.', n: 10, ms: 0, pick: () => QUESTIONS.filter((q) => q.difficulty === 'very-hard') },
  { id: 'sprint', name: 'Mixed Sprint', desc: 'Fifteen mixed questions in 18 minutes, like the end of a module.', n: 15, ms: 18 * 60_000, pick: () => QUESTIONS },
];

export function ArenaPage() {
  const arena = useStore((s) => s.arena);
  const recordArena = useStore((s) => s.recordArena);
  const [active, setActive] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<{ score: number; record: boolean; prev?: number } | null>(null);
  const ch = ARENA.find((c) => c.id === active);
  const qids = useMemo(() => (ch ? shuffle(ch.pick(), rng(`${ch.id}-${Date.now()}`)).slice(0, ch.n).map((q) => q.id) : []), [ch]);
  if (ch) return (
    <div>
      {outcome && <Card className="mb-4" data-testid="arena-result"><h2 className="text-lg font-bold">{outcome.record ? 'New personal record!' : 'Challenge complete'}</h2><p className="mt-1 text-sm text-muted">Score: <b className="text-ink">{outcome.score}</b>{outcome.prev !== undefined ? ` · previous best ${outcome.prev}` : ' · your first result sets the bar'}. You are only ever competing with your own past self.</p></Card>}
      <SessionRunner key={qids.join()} qids={qids} mode="arena" feedback="end" hints={false} totalMs={ch.ms || undefined} title={ch.name} backHref="/arena"
        onComplete={(r) => { const wrong = r.rows.filter((x) => x.answer && !x.correct).length; const score = r.correct * 10 - wrong * 3; const prev = arena[ch.id]?.best; const rec = recordArena(ch.id, { score, correct: r.correct, total: r.rows.length, ms: r.totalMs }); setOutcome({ score, record: rec, prev }); window.scrollTo(0, 0); }} completeHref="/arena" completeLabel="Back to the Arena" />
    </div>
  );
  return (
    <div>
      <PageHeader eyebrow="Practice" title="Battle Arena" subtitle="Optional challenges against the only opponent that matters: your previous best. Ten points for each correct answer, minus three for each wrong one, so careless guessing does not pay. Nothing to buy, nothing to bet." />
      <div className="grid gap-4 md:grid-cols-2">
        {ARENA.map((c) => { const rec = arena[c.id]; return (
          <Card key={c.id}>
            <h2 className="flex items-center gap-2 text-lg font-bold"><Swords size={18} className="text-brand" />{c.name}</h2>
            <p className="mt-1 text-sm text-muted">{c.desc}</p>
            <div className="mt-3 flex flex-wrap gap-2"><Badge tone="gold"><Trophy size={12} />Personal record: {rec ? rec.best : '—'}</Badge>{rec && <Badge>{rec.history.length} attempt{rec.history.length === 1 ? '' : 's'}</Badge>}{rec && rec.history.length > 1 && <Badge>Last: {rec.history[rec.history.length - 1].score}</Badge>}</div>
            <button className="btn-primary mt-4" onClick={() => { setOutcome(null); setActive(c.id); }}>Enter</button>
          </Card>
        ); })}
      </div>
    </div>
  );
}
