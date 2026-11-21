'use client';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { CheckCircle2, Circle, ExternalLink, Printer, Trash2 } from 'lucide-react';
import { Card, PageHeader, cn } from '@/components/ui';
import { BLUEBOOK_STEPS, CHECKLIST, PHASES, PLAYBOOK, POLICY_TERMS, SOURCES, type Source } from '@/data/testDay';
import scorecard from '@/data/scorecard.json';
import { useOverview } from '@/lib/hooks';
import { useStore } from '@/lib/store';
import type { SchoolEntry } from '@/lib/types';
import { addDays, dateKey, uid } from '@/lib/util';

/** A source link with its verification state, so every College Board specific can be checked. */
function Src({ s }: { s: Source }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-x-1.5 text-[13px]">
      <a href={s.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-accent underline">{s.title}<ExternalLink size={12} aria-hidden /><span className="sr-only">(opens a new tab)</span></a>
      {s.verified ? <span className="text-ok">last verified {s.verified}</span> : <span className="rounded-full border border-warn/40 px-2 text-warn" data-testid="needs-verification">Needs verification</span>}
    </span>
  );
}

const fmt = (k: string) => new Date(`${k}T12:00:00`).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });

export function TestDayPage() {
  const examDate = useStore((s) => s.profile.examDate);
  const setProfile = useStore((s) => s.setProfile);
  const ticks = useStore((s) => s.testDay?.ticks) ?? {};
  const tick = useStore((s) => s.tickTestDay);
  const done = CHECKLIST.filter((c) => ticks[c.id]).length;
  return (
    <div className="mx-auto max-w-4xl" data-testid="test-day">
      <PageHeader eyebrow="Test day" title="Test-day readiness" subtitle="A checklist that counts down to your test date, how Bluebook works, a calm plan for the night before, and how colleges use scores. College Board details link to their source; check them there."
        actions={<button type="button" className="btn-ghost no-print" onClick={() => window.print()} data-testid="print"><Printer size={16} aria-hidden />Print the checklist</button>} />

      <Card className="mb-6">
        <div className="flex flex-wrap items-end gap-3">
          <div><label className="label" htmlFor="td-date">Your test date</label><input id="td-date" type="date" className="input" value={examDate ?? ''} onChange={(e) => setProfile({ examDate: e.target.value || undefined })} data-testid="td-date" /></div>
          <p className="pb-2 text-[15px] text-muted" data-num>{examDate ? `${Math.max(0, Math.round((Date.parse(`${examDate}T12:00:00`) - Date.parse(`${dateKey()}T12:00:00`)) / 864e5))} days to go · ` : 'Add your date to see when each step is due · '}{done} of {CHECKLIST.length} done</p>
        </div>
        <p className="mt-2 text-[13px] text-faint">Test dates and registration deadlines: <Src s={SOURCES.dates} /></p>
      </Card>

      <section aria-labelledby="tl-h" className="mb-8">
        <h2 id="tl-h" className="mb-3 text-[24px]">Timeline</h2>
        <ol className="space-y-4">
          {PHASES.map((p) => (
            <li key={p.id} className="card p-0" data-testid={`phase-${p.id}`}>
              <h3 className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line px-5 py-3 text-[19px]">{p.title}{examDate && p.offsetDays !== null && <span className="font-sans text-[14px] font-normal text-muted">{fmt(addDays(examDate, p.offsetDays))}</span>}</h3>
              <ul className="divide-y divide-line">
                {CHECKLIST.filter((c) => c.phase === p.id).map((c) => (
                  <li key={c.id} className="flex items-start gap-3 px-5 py-3">
                    <button type="button" role="checkbox" aria-checked={!!ticks[c.id]} onClick={() => tick(c.id, !ticks[c.id])} className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center" aria-label={c.text} data-testid={`tick-${c.id}`}>
                      {ticks[c.id] ? <CheckCircle2 size={22} className="text-ok" aria-hidden /> : <Circle size={22} className="text-faint" aria-hidden />}
                    </button>
                    <span className="min-w-0 flex-1"><span className={cn('block text-[15px]', ticks[c.id] && 'text-muted line-through')}>{c.text}</span>{c.source && <span className="mt-1 block"><Src s={SOURCES[c.source]} /></span>}</span>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      </section>

      <div className="no-print space-y-8">
        <section aria-labelledby="bb-h">
          <h2 id="bb-h" className="mb-3 text-[24px]">Bluebook, step by step</h2>
          <ol className="card divide-y divide-line p-0">{BLUEBOOK_STEPS.map((b, i) => <li key={b.title} className="px-5 py-3"><b className="font-medium">{i + 1}. {b.title}.</b> <span className="text-[15px]">{b.text}</span><span className="mt-1 block"><Src s={SOURCES[b.source]} /></span></li>)}</ol>
          <p className="mt-2 text-[14px] text-muted">Practising here: Stellify’s <Link href="/mocks" className="text-accent underline">mock exams</Link> follow the same flow (module timing, mark for review, the calculator, the break), but they are not Bluebook. Take at least one practice test in Bluebook itself.</p>
        </section>

        <section aria-labelledby="calm-h">
          <h2 id="calm-h" className="mb-3 text-[24px]">Sleep, nerves and a calm plan</h2>
          <Card>
            <ul className="list-disc space-y-1.5 pl-5 text-[15px]">
              <li>Keep the same bedtime and wake time for the last week. A good night two nights before matters as much as the last night.</li>
              <li>The day before: light review only. Nothing new on test day.</li>
              <li><b className="font-medium">Box breathing, one minute:</b> breathe in for 4 counts, hold 4, out 4, hold 4. Repeat four times.</li>
              <li>Nerves are normal and usually help a little. If worry about tests is stopping you from sleeping, eating or studying, talk to your school counsellor. This page is not medical advice.</li>
            </ul>
          </Card>
          <h3 className="mb-2 mt-5 text-[19px]">When things go wrong</h3>
          <ul className="space-y-3" data-testid="playbook">{PLAYBOOK.map((p) => <li key={p.title} className="card p-4"><b className="font-medium">{p.title}.</b> <span className="text-[15px]">{p.text}</span>{p.source && <span className="mt-1 block"><Src s={SOURCES[p.source]} /></span>}</li>)}</ul>
        </section>

        <ScoresSection />
      </div>
    </div>
  );
}

type Snap = { snapshotDate: string | null; source: string; schools: { id: number; name: string; city: string; state: string; url: string; rw: number[]; math: number[]; total: number[] }[] };
const SNAP = scorecard as Snap;

function ScoresSection() {
  const schools = useStore((s) => s.testDay?.schools) ?? [];
  const save = useStore((s) => s.setTestDaySchools);
  const ov = useOverview();
  const mine = ov.estimate.total?.mid;
  const [draft, setDraft] = useState<Omit<SchoolEntry, 'id'>>({ name: '', url: '', policy: 'unknown', checked: dateKey() });
  const [q, setQ] = useState('');
  const hits = useMemo(() => (q.length < 3 ? [] : SNAP.schools.filter((s) => s.name.toLowerCase().includes(q.toLowerCase())).slice(0, 6)), [q]);
  const add = () => { if (!draft.name.trim()) return; save([...schools, { ...draft, id: uid(), name: draft.name.trim(), url: draft.url.trim() }]); setDraft({ name: '', url: '', policy: 'unknown', checked: dateKey() }); };
  return (
    <section aria-labelledby="sc-h">
      <h2 id="sc-h" className="mb-3 text-[24px]">Sending scores, and how colleges use them</h2>
      <Card>
        <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">{POLICY_TERMS.map((t) => <div key={t.term}><dt className="font-medium">{t.term}</dt><dd className="text-[15px] text-muted">{t.text}</dd></div>)}</dl>
        <p className="mt-4 text-[14px] text-muted">Policies change, and second-hand lists often disagree: some selective colleges have recently brought back testing requirements while many others stay optional. Stellify does not list any school’s policy. Check each school’s own admissions page, and note the date you checked.</p>
        <p className="mt-2 text-[14px]">Fee waivers and free score sends: <Src s={SOURCES.waivers} /></p>
      </Card>

      <h3 className="mb-2 mt-5 text-[19px]">Should I send my score?</h3>
      <Card>
        <ul className="list-disc space-y-1.5 pl-5 text-[15px]">
          <li>Find the school’s middle range: the 25th to 75th percentile of scores among students who enrolled.</li>
          <li>At or above the middle of that range, sending a score usually helps. Below the 25th percentile at a test-optional school, many students do not send it.</li>
          <li>Caveats: published ranges include only students who sent scores, so they run high at test-optional schools. Programmes, scholarships and states can have their own rules. When in doubt, ask the admissions office.</li>
        </ul>
        {mine && <p className="mt-3 text-[14px] text-muted" data-num>Your current Stellify estimate is about {mine} (an unofficial estimate, not an SAT score).</p>}
      </Card>

      <h3 className="mb-2 mt-5 text-[19px]">My schools</h3>
      <Card data-testid="schools">
        {SNAP.snapshotDate ? (
          <div className="mb-4">
            <label className="label" htmlFor="sc-q">Look up a school’s published SAT range</label>
            <input id="sc-q" className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Type at least 3 letters" />
            {hits.length > 0 && <ul className="mt-2 divide-y divide-line rounded-xl border border-line">{hits.map((h) => <li key={h.id}><button type="button" className="w-full px-3 py-2 text-left hover:bg-raised" onClick={() => { setDraft({ ...draft, name: h.name, low: h.total[0], high: h.total[1], unitId: h.id }); setQ(''); }}>{h.name} <span className="text-faint">· {h.city}, {h.state} · about {h.total[0]}–{h.total[1]}</span></button></li>)}</ul>}
            <p className="mt-1 text-[13px] text-faint">College Scorecard snapshot from {SNAP.snapshotDate}. Totals add the two section percentiles, so they are approximate.</p>
          </div>
        ) : <p className="mb-3 text-[14px] text-muted" data-testid="no-snapshot">Published score ranges are not loaded in this version yet (the College Scorecard snapshot needs a free key that the site’s owner adds when building). You can type a school’s range yourself from its own page.</p>}
        <div className="grid gap-3 sm:grid-cols-2">
          <div><label className="label" htmlFor="sc-name">School</label><input id="sc-name" className="input" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></div>
          <div><label className="label" htmlFor="sc-url">Its official testing-policy page</label><input id="sc-url" className="input" type="url" placeholder="https://" value={draft.url} onChange={(e) => setDraft({ ...draft, url: e.target.value })} /></div>
          <div><label className="label" htmlFor="sc-pol">Policy you found there</label><select id="sc-pol" className="input" value={draft.policy} onChange={(e) => setDraft({ ...draft, policy: e.target.value as SchoolEntry['policy'] })}><option value="unknown">Not checked yet</option><option value="required">Test-required</option><option value="optional">Test-optional</option><option value="flexible">Test-flexible</option><option value="blind">Test-blind</option></select></div>
          <div><label className="label" htmlFor="sc-checked">Date you checked</label><input id="sc-checked" className="input" type="date" value={draft.checked} onChange={(e) => setDraft({ ...draft, checked: e.target.value })} /></div>
          <div><label className="label" htmlFor="sc-low">25th percentile (total)</label><input id="sc-low" className="input" inputMode="numeric" value={draft.low ?? ''} onChange={(e) => setDraft({ ...draft, low: Number(e.target.value) || undefined })} /></div>
          <div><label className="label" htmlFor="sc-high">75th percentile (total)</label><input id="sc-high" className="input" inputMode="numeric" value={draft.high ?? ''} onChange={(e) => setDraft({ ...draft, high: Number(e.target.value) || undefined })} /></div>
        </div>
        <button type="button" className="btn-primary mt-3" onClick={add} disabled={!draft.name.trim()} data-testid="add-school">Add school</button>
        {schools.length > 0 && (
          <ul className="mt-4 divide-y divide-line border-y border-line">
            {schools.map((s) => {
              const where = mine && s.low && s.high ? (mine >= (s.low + s.high) / 2 ? 'at or above the middle of the range' : mine >= s.low ? 'inside the range, below the middle' : 'below the 25th percentile') : null;
              return (
                <li key={s.id} className="flex flex-wrap items-start gap-3 py-3" data-testid="school-row">
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">{s.name}</span>
                    <span className="block text-[14px] text-muted">{{ unknown: 'Policy not checked yet', required: 'Test-required', optional: 'Test-optional', flexible: 'Test-flexible', blind: 'Test-blind' }[s.policy]}{s.policy !== 'unknown' ? ` · you checked on ${s.checked}` : ''}{s.low && s.high ? ` · range ${s.low}–${s.high}` : ''}</span>
                    {where && <span className="block text-[14px]">Your estimate is {where}.</span>}
                    {s.url && <a href={s.url} target="_blank" rel="noreferrer" className="text-[14px] text-accent underline">Official page<span className="sr-only"> for {s.name} (opens a new tab)</span></a>}
                  </span>
                  <button type="button" className="btn-quiet !min-h-[40px] !px-2" onClick={() => save(schools.filter((x) => x.id !== s.id))} aria-label={`Remove ${s.name}`}><Trash2 size={16} aria-hidden /></button>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </section>
  );
}
