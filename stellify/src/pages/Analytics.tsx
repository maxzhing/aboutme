import Link from 'next/link';
import { Copy, Download, Printer, TrendingDown, TrendingUp } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { getQuestion } from '@/data/questions';
import { snapshot, useStore } from '@/lib/store';
import { useOverview, useSkillStats, useStreak } from '@/lib/hooks';
import { accuracyBlocks, dailySeries, scoreTrend, weekMinutes } from '@/lib/engine/analytics';
import { weeklyReport } from '@/lib/engine/report';
import { fmtRange } from '@/lib/engine/scoring';
import { MASTERY_LEVELS } from '@/lib/engine/mastery';
import { DIFFICULTIES, DIFFICULTY_NAME, DOMAINS, SECTION_NAME, SKILL, SKILLS } from '@/lib/taxonomy';
import { fmtDuration, pct } from '@/lib/util';
import { Badge, Card, Empty, PageHeader, Progress, Stat, Tabs, toneForPct } from '@/components/ui';
import { axis, chartTip } from './Dashboard';

export function AnalyticsPage() {
  const s = useStore();
  const ov = useOverview();
  const stats = useSkillStats();
  const streak = useStreak();
  const [sort, setSort] = useState<'weak' | 'strong' | 'order'>('weak');
  const snap = useMemo(() => snapshot(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [s.attempts.length]);
  const days = useMemo(() => dailySeries(snap, 14), [snap]);
  const blocks = useMemo(() => accuracyBlocks(snap, 20), [snap]);
  const trend = useMemo(() => scoreTrend(snap, getQuestion), [snap]);
  if (!ov.total) return <div><PageHeader eyebrow="Performance" title="Analytics" /><Empty title="No data yet" body="Analytics are built only from questions you actually answer. Take the diagnostic or a practice set to begin." action={{ label: 'Start Smart Practice', href: '/practice/smart' }} /></div>;
  const domainData = DOMAINS.map((d) => ({ name: d.name.replace('Problem-Solving and Data Analysis', 'Data Analysis').replace('Standard English Conventions', 'English Conventions').replace('Geometry and Trigonometry', 'Geometry & Trig'), accuracy: ov.byDomain[d.id].pct, n: ov.byDomain[d.id].n }));
  const rows = SKILLS.map((k) => stats[k.id]).sort((a, b) => (sort === 'order' ? 0 : sort === 'weak' ? (a.n === 0 ? 1 : b.n === 0 ? -1 : a.score - b.score) : b.score - a.score));
  const pace = (sec: 'math' | 'rw') => { const t = ov.time[sec]; return t.avg ? `${fmtDuration(t.avg)} avg · target ${fmtDuration(t.expected)}` : 'no data'; };
  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Performance" title="Analytics" subtitle="Everything here is computed from your own recorded attempts. Nothing is simulated." actions={<Link href="/report" className="btn-ghost">Weekly report</Link>} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Estimated total" value={fmtRange(ov.estimate.total)} sub="unofficial range" />
        <Stat label="Reading & Writing" value={fmtRange(ov.estimate.rw)} sub={`${ov.bySection.rw.pct}% of ${ov.bySection.rw.n}`} />
        <Stat label="Math" value={fmtRange(ov.estimate.math)} sub={`${ov.bySection.math.pct}% of ${ov.bySection.math.n}`} />
        <Stat label="Overall accuracy" value={`${ov.all.pct}%`} sub={`${ov.total} questions · ${ov.unique} unique`} />
        <Stat label="Study time (7 days)" value={`${weekMinutes(snap)} min`} sub={`streak ${streak.current} · best ${streak.best}`} />
        <Stat label="Hint usage" value={`${Math.round(ov.hintRate * 100)}%`} sub="of questions" />
        <Stat label="Abandoned" value={ov.abandoned} sub="left unanswered" />
        <Stat label="Open mistakes" value={Object.values(s.mistakes).filter((m) => m.status === 'unresolved').length} sub={<Link href="/mistakes" className="text-brand2 hover:underline">Open bucket</Link>} />
      </div>
      <p className="text-xs text-faint">Score ranges use Stellify&apos;s own item-response estimate (see Settings → About the estimate). They are not College Board scores and need at least 8 answered questions per section.</p>

      <div className="grid gap-3 lg:grid-cols-2">
        <Card><h2 className="text-sm font-semibold">Study time, last 14 days (minutes)</h2><div className="mt-2 h-52"><ResponsiveContainer><BarChart data={days}><CartesianGrid stroke="rgb(var(--line))" vertical={false} /><XAxis dataKey="label" {...axis} interval={1} /><YAxis {...axis} width={30} /><Tooltip {...chartTip} formatter={(v, n) => [n === 'minutes' ? `${v} min` : v, n === 'minutes' ? 'Studied' : 'Questions']} /><Bar dataKey="minutes" fill="rgb(var(--brand2))" radius={[5, 5, 0, 0]} /></BarChart></ResponsiveContainer></div></Card>
        <Card><h2 className="text-sm font-semibold">Estimated total score over time</h2>{trend.length >= 2 ? <div className="mt-2 h-52"><ResponsiveContainer><AreaChart data={trend}><CartesianGrid stroke="rgb(var(--line))" vertical={false} /><XAxis dataKey="label" {...axis} /><YAxis domain={[(min: number) => Math.max(400, Math.floor(min / 50) * 50 - 50), (max: number) => Math.min(1600, Math.ceil(max / 50) * 50 + 50)]} {...axis} width={40} /><Tooltip {...chartTip} formatter={(v, n) => [v, n === 'mid' ? 'Estimate' : n === 'high' ? 'High' : 'Low']} /><Area type="monotone" dataKey="high" stroke="none" fill="rgb(var(--brand))" fillOpacity={0.15} /><Area type="monotone" dataKey="low" stroke="none" fill="rgb(var(--bg))" fillOpacity={1} /><Line type="monotone" dataKey="mid" stroke="rgb(var(--brand))" strokeWidth={2.5} dot={{ r: 3 }} /></AreaChart></ResponsiveContainer></div> : <p className="mt-6 text-sm text-muted">Appears after you have studied both sections on at least two different days.</p>}</Card>
        <Card><h2 className="text-sm font-semibold">Accuracy by domain</h2><div className="mt-2 h-64"><ResponsiveContainer><BarChart data={domainData} layout="vertical" margin={{ left: 10 }}><CartesianGrid stroke="rgb(var(--line))" horizontal={false} /><XAxis type="number" domain={[0, 100]} {...axis} /><YAxis type="category" dataKey="name" {...axis} width={128} /><Tooltip {...chartTip} formatter={(v, _n, p) => [`${v}% of ${(p.payload as { n: number }).n}`, 'Accuracy']} /><Bar dataKey="accuracy" fill="rgb(var(--brand))" radius={[0, 5, 5, 0]} /></BarChart></ResponsiveContainer></div></Card>
        <Card><h2 className="text-sm font-semibold">Improvement over time (accuracy per 20 questions)</h2>{blocks.length >= 2 ? <div className="mt-2 h-64"><ResponsiveContainer><LineChart data={blocks}><CartesianGrid stroke="rgb(var(--line))" vertical={false} /><XAxis dataKey="label" {...axis} /><YAxis domain={[0, 100]} {...axis} width={30} /><Tooltip {...chartTip} formatter={(v) => [`${v}%`, 'Accuracy']} labelFormatter={(l) => `Questions ${l}`} /><Line type="monotone" dataKey="accuracy" stroke="rgb(var(--ok))" strokeWidth={2.5} dot={{ r: 3 }} /></LineChart></ResponsiveContainer></div> : <p className="mt-6 text-sm text-muted">Appears after 40 questions.</p>}</Card>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <Card><h2 className="text-sm font-semibold">Accuracy by difficulty</h2><ul className="mt-3 space-y-3">{DIFFICULTIES.map((d) => { const x = ov.byDifficulty[d]; return <li key={d}><div className="mb-1 flex justify-between text-sm"><span>{DIFFICULTY_NAME[d]}</span><span className="text-muted">{x.n ? `${x.correct}/${x.n} · ${x.pct}%` : 'no attempts'}</span></div><Progress value={x.pct} tone={toneForPct(x.pct)} label={DIFFICULTY_NAME[d]} /></li>; })}</ul></Card>
        <Card><h2 className="text-sm font-semibold">Time per question</h2><ul className="mt-3 space-y-3 text-sm">{(['rw', 'math'] as const).map((sec) => { const t = ov.time[sec]; return <li key={sec}><div className="flex justify-between"><span>{SECTION_NAME[sec]}</span><span className="text-muted">{pace(sec)}</span></div>{t.avg > 0 && <><Progress value={Math.min(100, t.ratio * 66)} tone={t.ratio > 1.25 ? 'warn' : 'ok'} className="mt-1" label={`${SECTION_NAME[sec]} pace`} /><p className="mt-1 text-xs text-muted">{t.ratio > 1.25 ? 'Slower than the target pace. Add timed modules once accuracy is solid.' : t.ratio < 0.5 ? 'Much faster than target. If accuracy is low here, slow down.' : 'Within a healthy range of the target pace.'}</p></>}</li>; })}</ul></Card>
      </div>

      <Card>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h2 className="font-semibold">Every skill</h2><Tabs label="Sort skills" tabs={[{ id: 'weak', label: 'Weakest first' }, { id: 'strong', label: 'Strongest first' }, { id: 'order', label: 'Curriculum order' }]} value={sort} onChange={setSort} /></div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead><tr className="text-left text-xs uppercase tracking-wide text-faint"><th className="pb-2 font-semibold">Skill</th><th className="pb-2 font-semibold">Mastery</th><th className="pb-2 font-semibold">Accuracy</th><th className="pb-2 font-semibold">Med / Hard / V. hard</th><th className="pb-2 font-semibold">Avg time</th><th /></tr></thead>
            <tbody className="divide-y divide-line">
              {rows.map((st) => (
                <tr key={st.skill}>
                  <td className="py-2 pr-3"><Link href={`/learn/${st.skill}`} className="font-medium hover:underline">{SKILL[st.skill].short}</Link><div className="text-xs text-faint">{SECTION_NAME[SKILL[st.skill].section]}</div></td>
                  <td className="py-2 pr-3"><Badge tone={(['default', 'bad', 'warn', 'brand', 'ok'] as const)[st.level]}>{MASTERY_LEVELS[st.level]}</Badge></td>
                  <td className="py-2 pr-3 tabular-nums">{st.n ? `${pct(st.correct, st.n)}% (${st.correct}/${st.n})` : '—'}</td>
                  <td className="py-2 pr-3 tabular-nums text-muted">{DIFFICULTIES.map((d) => (st.byDiff[d].n ? `${st.byDiff[d].correct}/${st.byDiff[d].n}` : '–')).join('  ·  ')}</td>
                  <td className="py-2 pr-3 tabular-nums text-muted">{st.n ? fmtDuration(st.avgMs) : '—'}</td>
                  <td className="py-2 text-right"><Link href={`/practice/session?mode=skill&skill=${st.skill}&n=6`} className="text-brand2 hover:underline">Practice</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

export function ReportPage() {
  const s = useStore();
  const include = s.settings.shareIncludeMistakes;
  const r = useMemo(() => weeklyReport(snapshot(), getQuestion, Date.now()),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [s.attempts.length]);
  const ov = useOverview();
  const [copied, setCopied] = useState(false);
  const name = s.profile.name || 'Student';
  const summary = [
    `Stellify progress summary for ${name}`, `Week ending ${new Date(r.to).toLocaleDateString()}`, '',
    r.headline, `Questions this week: ${r.questions} (accuracy ${r.accuracy}%)`, `Study time this week: about ${r.minutes} minutes`,
    `All-time: ${ov.total} questions at ${ov.all.pct}% accuracy`, `Estimated score range (unofficial): ${fmtRange(ov.estimate.total)}`, `Target score: ${s.profile.targetScore}`, '',
    r.improved.length ? `Improved: ${r.improved.map((x) => `${SKILL[x.skill].short} (${x.from}% → ${x.to}%)`).join('; ')}` : 'Improved: no skill changed by 10 points or more with enough data to compare',
    r.mastered.length ? `Newly mastered: ${r.mastered.map((k) => SKILL[k].short).join(', ')}` : '',
    r.weak.length ? `Needs work: ${r.weak.map((k) => SKILL[k].short).join(', ')}` : '',
    ...(include ? ['', `Unresolved mistakes: ${Object.values(s.mistakes).filter((m) => m.status === 'unresolved').length}`, ...r.patterns] : []),
    '', 'Next steps:', ...r.nextSteps.map((x) => `- ${x}`), '', 'Shared by the student from Stellify. Private notes and tutor conversations are never included.',
  ].filter((x) => x !== '').join('\n');
  const download = () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([summary], { type: 'text/plain' })); a.download = `stellify-progress-${new Date(r.to).toISOString().slice(0, 10)}.txt`; a.click(); URL.revokeObjectURL(a.href); };
  const Trend = ({ items, up }: { items: typeof r.improved; up: boolean }) => items.length ? <ul className="mt-2 space-y-1.5 text-sm">{items.map((x) => <li key={x.skill} className="flex items-center gap-2">{up ? <TrendingUp size={15} className="text-ok" /> : <TrendingDown size={15} className="text-warn" />}<Link href={`/learn/${x.skill}`} className="hover:underline">{SKILL[x.skill].short}</Link><span className="ml-auto tabular-nums text-muted">{x.from}% → {x.to}%</span></li>)}</ul> : <p className="mt-2 text-sm text-muted">{up ? 'No skill rose by 10 points or more this week (needs at least 3 questions in both weeks to compare).' : 'Nothing slipped by 10 points or more.'}</p>;
  return (
    <div className="space-y-4">
      <PageHeader eyebrow="Performance" title="Weekly Report" subtitle={`${new Date(r.from).toLocaleDateString()} to ${new Date(r.to).toLocaleDateString()}. Generated on this device from your recorded practice.`} />
      <Card><h2 className="text-lg font-bold">{r.headline}</h2><div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4"><Stat label="Questions" value={r.questions} sub={`last week ${r.prevQuestions}`} /><Stat label="Accuracy" value={r.questions ? `${r.accuracy}%` : '—'} sub={r.prevQuestions ? `last week ${r.prevAccuracy}%` : 'no earlier data'} /><Stat label="Study time" value={`${r.minutes} min`} /><Stat label="Newly mastered" value={r.mastered.length} /></div></Card>
      <div className="grid gap-4 md:grid-cols-2">
        <Card><h2 className="font-semibold">What improved</h2><Trend items={r.improved} up /></Card>
        <Card><h2 className="font-semibold">What did not improve</h2><Trend items={r.declined} up={false} />{r.weak.length > 0 && <div className="mt-3"><div className="text-xs font-bold uppercase tracking-wide text-faint">Weak skills</div><div className="mt-1.5 flex flex-wrap gap-1.5">{r.weak.map((k) => <Link key={k} href={`/learn/${k}`} className="chip hover:text-ink">{SKILL[k].short}</Link>)}</div></div>}</Card>
        <Card><h2 className="font-semibold">Recurring errors</h2>{r.patterns.length ? <ul className="mt-2 space-y-2 text-sm text-muted">{r.patterns.map((p) => <li key={p}>• {p}</li>)}</ul> : <p className="mt-2 text-sm text-muted">No recurring pattern detected among unresolved mistakes.</p>}</Card>
        <Card><h2 className="font-semibold">Suggested next steps</h2><ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm">{r.nextSteps.map((x) => <li key={x}>{x}</li>)}</ol>{r.mastered.length > 0 && <p className="mt-3 text-sm">Mastered this week: {r.mastered.map((k) => SKILL[k].short).join(', ')}.</p>}</Card>
      </div>
      <Card id="share">
        <h2 className="font-semibold">Share progress with a parent or counselor</h2>
        <p className="mt-1 text-sm text-muted">Sharing is entirely your choice. The summary below is created on your device; nothing is sent anywhere unless you send it. Private notes and tutor conversations are never included.</p>
        <label className="mt-3 flex items-center gap-2 text-sm"><input type="checkbox" checked={include} onChange={(e) => s.setSettings({ shareIncludeMistakes: e.target.checked })} className="h-4 w-4 accent-[rgb(var(--brand))]" />Include my mistake patterns</label>
        <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap rounded-xl border border-line bg-raised/50 p-3 text-xs leading-relaxed" data-testid="share-summary">{summary}</pre>
        <div className="no-print mt-3 flex flex-wrap gap-2">
          <button className="btn-primary" onClick={() => { navigator.clipboard?.writeText(summary).then(() => setCopied(true), () => setCopied(false)); }}><Copy size={15} />{copied ? 'Copied' : 'Copy summary'}</button>
          <button className="btn-ghost" onClick={download}><Download size={15} />Download .txt</button>
          <button className="btn-ghost" onClick={() => window.print()}><Printer size={15} />Print</button>
        </div>
      </Card>
    </div>
  );
}
