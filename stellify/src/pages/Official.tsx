'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BadgeCheck, CheckCircle2, FileUp, ListChecks, Loader2, Lock, Play, ShieldCheck, Trash2, Upload } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { OFFICIAL } from '@/data/questions';
import { useStore } from '@/lib/store';
import { useOfficial, clearImported, saveImported } from '@/lib/officialStore';
import { DOMAINS, SECTION_NAME, SKILL, skillsOfDomain } from '@/lib/taxonomy';
import { officialModules } from '@/lib/engine/mock';
import type { MockAttempt, Section } from '@/lib/types';
import { Badge, Card, PageHeader, Progress, cn } from '@/components/ui';
import { FullTestImport, OfficialTestsCard } from '@/components/FullTests';
import { pct } from '@/lib/util';

/** Real College Board questions: import Question Bank PDFs, practice them by skill, and take official-question tests. */
export function OfficialPage() {
  const router = useRouter();
  useOfficial((s) => s.v); // re-render after an import
  const imported = useOfficial((s) => s.imported);
  const attempts = useStore((s) => s.attempts);
  const active = useStore((s) => s.activeMock);
  const start = useStore((s) => s.startMock);
  const [busy, setBusy] = useState<{ name: string; done: number; total: number } | null>(null);
  const [last, setLast] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const solved = useMemo(() => new Set(attempts.filter((a) => a.correct).map((a) => a.qid)), [attempts]);
  const seen = useMemo(() => new Set(attempts.map((a) => a.qid)), [attempts]);

  const run = async (files: FileList | File[]) => {
    const pdfs = [...files].filter((f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'));
    if (!pdfs.length) { setLast('That was not a PDF. Export your questions from the Question Bank as a PDF and try again.'); return; }
    let added = 0, total = 0, images = 0;
    const skipped: string[] = [];
    try {
      const { importCollegeBoardPdf } = await import('@/lib/importPdf');
      for (const f of pdfs) {
        setBusy({ name: f.name, done: 0, total: 1 });
        const r = await importCollegeBoardPdf(f, (done, t) => setBusy({ name: f.name, done, total: t }));
        const s = await saveImported(r.items);
        added += s.added; total += r.items.length; images += r.images; skipped.push(...r.skipped);
      }
      setLast(total ? `Found ${total} question${total === 1 ? '' : 's'}: ${added} new${total - added ? `, ${total - added} already in your library` : ''}.${images ? ` ${images} kept as exact page images (math, tables, graphs, underlining).` : ''}${skipped.length ? ` ${skipped.length} could not be read.` : ''}`
        : 'No College Board questions were found in that file. Make sure you exported from the SAT Suite Question Bank with answers and explanations included.');
    } catch (e) {
      setLast(`The file could not be read (${(e as Error).message}). Try exporting it again from the Question Bank.`);
    } finally { setBusy(null); }
  };

  const bySection = (sec: Section) => OFFICIAL.filter((q) => q.section === sec);
  const begin = (form: string, kind: MockAttempt['kind']) => { if (active && !confirm('You have a test in progress. Starting a new one discards it.')) return; start(form, kind); router.push('/mocks/run'); };

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <PageHeader eyebrow="Practice" title="Official College Board Questions" subtitle="Official College Board questions from the free SAT Suite Question Bank, with College Board's own explanations, inside your lessons, practice and timed tests." />

      <section className={cn('relative overflow-hidden rounded-3xl border-2 border-dashed p-6 transition-colors sm:p-8', drag ? 'border-brand bg-brand/10' : 'border-line bg-surface')}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={(e) => { e.preventDefault(); setDrag(false); void run(e.dataTransfer.files); }} data-testid="import-zone">
        <div className="grid items-center gap-6 md:grid-cols-[1fr_auto]">
          <div>
            <div className="flex items-center gap-2"><span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-brand-solid to-brand2-solid text-white"><FileUp size={20} /></span><h2 className="text-xl font-bold">Add questions from a Question Bank PDF</h2></div>
            <ol className="mt-4 space-y-2 text-sm text-muted">
              <li><b className="text-ink">1.</b> Open the College Board&apos;s free SAT Suite Question Bank and choose SAT, a section, and the skills you want.</li>
              <li><b className="text-ink">2.</b> Select questions and export them as a PDF <b className="text-ink">with answers and explanations included</b>.</li>
              <li><b className="text-ink">3.</b> Drop the PDF here. Reading &amp; Writing questions become text; math and figure questions are kept exactly as printed.</li>
            </ol>
            <p className="mt-3 flex items-start gap-1.5 text-xs text-faint"><ShieldCheck size={14} className="mt-0.5 shrink-0" />Read on this device only. Imported questions are saved in this browser, never uploaded, and never put into the app file itself.</p>
          </div>
          <div className="text-center">
            <input ref={input} type="file" accept="application/pdf,.pdf" multiple className="hidden" onChange={(e) => e.target.files && void run(e.target.files)} data-testid="import-input" />
            <button type="button" className="btn-primary !px-6 !py-3.5 text-base" disabled={!!busy} onClick={() => input.current?.click()}>{busy ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}{busy ? 'Reading…' : 'Choose PDF'}</button>
            <p className="mt-2 text-xs text-faint">or drag it onto this box</p>
          </div>
        </div>
        {busy && <div className="mt-5"><div className="mb-1 flex justify-between text-xs text-muted"><span>{busy.name}</span><span>{pct(busy.done, busy.total)}%</span></div><Progress value={pct(busy.done, busy.total)} label="Import progress" /></div>}
        {last && !busy && <p className="mt-5 flex items-start gap-2 rounded-xl border border-ok/40 bg-ok/10 p-3 text-sm" role="status" data-testid="import-result"><CheckCircle2 size={17} className="mt-0.5 shrink-0 text-ok" />{last}</p>}
      </section>

      <FullTestImport />
      <OfficialTestsCard begin={begin} />

      {OFFICIAL.length > 0 ? (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            {(['rw', 'math'] as Section[]).map((sec) => { const qs = bySection(sec); const mods = officialModules(OFFICIAL, sec); const can = qs.length >= 6; const right = qs.filter((q) => solved.has(q.id)).length; return (
              <Card key={sec} className="flex flex-col" data-testid={`official-${sec}`}>
                <div className="flex items-center justify-between gap-2"><h2 className="text-lg font-bold">{SECTION_NAME[sec]}</h2><Badge tone="gold"><BadgeCheck size={13} />{qs.length} official</Badge></div>
                <p className="mt-1 text-sm text-muted">{qs.length ? `${right} answered correctly · ${qs.filter((q) => !seen.has(q.id)).length} not tried yet` : `No ${SECTION_NAME[sec]} questions yet. Export some from the Question Bank and add them above.`}</p>
                {qs.length > 0 && <Progress value={pct(right, qs.length)} className="mt-2" tone="ok" label={`${SECTION_NAME[sec]} official progress`} />}
                <div className="mt-4 flex flex-1 flex-col justify-end gap-2">
                  {can ? <button className="btn-primary" onClick={() => begin(sec === 'rw' ? 'cb1' : 'cb3', sec === 'rw' ? 'section-rw' : 'section-math')} data-testid={`official-test-${sec}`}><Lock size={15} />Timed test · {mods[0].length + mods[1].length} questions</button>
                    : qs.length > 0 && <p className="text-xs text-faint">Add at least 6 questions to unlock a timed test.</p>}
                  {qs.length > 0 && <Link href={`/practice/session?mode=custom&ids=${qs.filter((q) => !solved.has(q.id)).slice(0, 15).map((q) => q.id).join(',') || qs.slice(0, 15).map((q) => q.id).join(',')}&back=/official`} className="btn-ghost"><Play size={15} />Practice untimed with explanations</Link>}
                </div>
              </Card>
            ); })}
          </div>
          <Card>
            <h2 className="flex items-center gap-2 font-bold"><ListChecks size={18} className="text-brand" />Your official library by skill</h2>
            <p className="mt-0.5 text-sm text-muted">Official questions also appear first in the matching course chapters, as worked examples and practice.</p>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {DOMAINS.map((d) => { const ks = skillsOfDomain(d.id).map((k) => ({ k, qs: OFFICIAL.filter((q) => q.skill === k.id) })).filter((x) => x.qs.length); if (!ks.length) return null; return (
                <div key={d.id}>
                  <h3 className="text-xs font-bold uppercase tracking-wide text-faint">{d.name}</h3>
                  <ul className="mt-1.5 divide-y divide-line">
                    {ks.map(({ k, qs }) => { const r = qs.filter((q) => solved.has(q.id)).length; return (
                      <li key={k.id} className="flex items-center gap-3 py-2 text-sm">
                        <span className="min-w-0 flex-1 truncate">{SKILL[k.id].short}</span>
                        <span className="tabular-nums text-muted">{r}/{qs.length}</span>
                        <Link href={`/practice/session?mode=custom&ids=${qs.map((q) => q.id).slice(0, 15).join(',')}&back=/official`} className="font-semibold text-accent hover:underline">Practice</Link>
                        <Link href={`/learn/${k.id}`} className="text-muted hover:text-ink">Course</Link>
                      </li>
                    ); })}
                  </ul>
                </div>
              ); })}
            </div>
            {imported > 0 && <button className="btn-quiet mt-4 text-sm text-bad" onClick={() => { if (confirm(`Remove the ${imported} questions you imported on this device? Your answer history stays.`)) void clearImported().then(() => setLast('Imported questions removed.')); }} data-testid="clear-imported"><Trash2 size={15} />Remove imported questions</button>}
          </Card>
        </>
      ) : (
        <Card className="text-center"><p className="text-sm text-muted">No official questions yet. Add a Question Bank PDF above and they will show up here, in the courses, and as timed tests.</p></Card>
      )}
      <p className="text-xs text-faint">Official questions are the College Board&apos;s copyrighted work, made free for personal practice. Keep them for your own study; do not share files containing them.</p>
    </div>
  );
}
