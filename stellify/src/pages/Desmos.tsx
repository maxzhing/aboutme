import { ExternalLink } from 'lucide-react';
import { useState } from 'react';
import { DECIDE, DESMOS_LESSONS } from '@/data/desmos';
import { useStore } from '@/lib/store';
import { Grapher } from '@/components/Grapher';
import { CalcPanel, DESMOS } from '@/components/Calculators';
import { Badge, Card, PageHeader } from '@/components/ui';

const LABEL = { algebra: 'Algebra', desmos: 'Desmos', both: 'Both together' } as const;
const DESMOS_TOUR = [
  'Graphing: type y = 2x + 3 and watch the line appear. Click the line to see its intercepts.',
  'Add a second line, y = -x + 9, and click where they cross: that point solves the system.',
  'Type y = x^2 - 4x - 5 and click the gray points to read the roots and the vertex.',
  'Type y = ax + 2 and add the slider for a. Drag it to see how slope changes the line.',
  'Add a table (the + button, then table). Enter a few points, then type y_1 ~ m x_1 + b for a line of best fit.',
  'Type an inequality, y < 2x + 1, to see the shaded region.',
  'Use the wrench (graph settings) to zoom to a window that shows what you need.',
  'Scientific tab: compute 3/8 + 5/12 and use the fraction button to switch between fraction and decimal.',
  'Scientific tab: check whether trig is in degrees or radians, then find sin(30°).',
  'Scientific tab: use the ans key to reuse your last result in a new calculation.',
];

export function DesmosPage() {
  const [active, setActive] = useState(DESMOS_LESSONS[0].id);
  const [picks, setPicks] = useState<Record<string, string>>({});
  const award = useStore((s) => s.awardXp);
  const [awarded, setAwarded] = useState(false);
  const lesson = DESMOS_LESSONS.find((l) => l.id === active)!;
  const right = DECIDE.filter((d) => picks[d.id] === d.best).length;
  const answered = Object.keys(picks).length;
  return (
    <div>
      <PageHeader eyebrow="Learn" title="Desmos Masterclass" subtitle="The Digital SAT has a Desmos graphing calculator built in. Used well, it turns many hard questions into quick ones. Used blindly, it wastes time. These lessons teach both the techniques and the judgment."
        actions={<a className="btn-ghost" href={DESMOS.graphing} target="_blank" rel="noopener noreferrer">Open the real Desmos (SAT version)<ExternalLink size={14} /></a>} />
      <div className="mb-4 flex flex-wrap gap-1.5" role="tablist" aria-label="Desmos lessons">
        {DESMOS_LESSONS.map((l, i) => <button key={l.id} id={l.id} role="tab" aria-selected={active === l.id} onClick={() => setActive(l.id)} className={`chip !py-1 ${active === l.id ? 'border-brand bg-brand/15 text-ink' : ''}`}>{i + 1}. {l.title}</button>)}
      </div>
      <Card>
        <h2 className="text-xl font-bold">{lesson.title}</h2>
        <p className="mt-0.5 text-sm font-medium text-brand2">{lesson.goal}</p>
        <div className="mt-3 space-y-2 text-[15px] leading-relaxed">{lesson.teach.map((t, i) => <p key={i}>{t}</p>)}</div>
        <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-muted">{lesson.steps.map((s) => <li key={s}>{s}</li>)}</ol>
        <div className="mt-4"><Grapher key={lesson.id} demo={lesson.demo} /></div>
        <p className="mt-4 rounded-xl border border-warn/30 bg-warn/5 p-3 text-sm"><b className="text-warn">Judgment call.</b> {lesson.caution}</p>
        <p className="mt-2 text-xs text-faint">This is Stellify&apos;s own practice grapher, built to behave like the calculator you will use. Edit any expression to experiment: it understands y = …, equations in x and y, inequalities, and restrictions in braces.</p>
      </Card>

      <h2 className="mb-1 mt-8 text-xl font-bold">Try the real calculators</h2>
      <p className="mb-3 text-sm text-muted">These are Desmos&apos;s own College Board calculators, the versions built into Bluebook, embedded from desmos.com (internet needed). Work through the checklist to learn where everything is before test day. The same panel opens from the Calculator button in every mock exam.</p>
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Card className="!p-3"><CalcPanel height={540} /></Card>
        <Card className="!p-4">
          <h3 className="font-semibold">Get to know it: 10 things to try</h3>
          <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm">
            {DESMOS_TOUR.map((t) => <li key={t}>{t}</li>)}
          </ol>
          <p className="mt-3 text-xs text-faint">On the real test, Desmos opens from the Calculator button at the top of every Math question. Practising with it now means no surprises on test day.</p>
        </Card>
      </div>

      <h2 className="mb-1 mt-8 text-xl font-bold">Which tool would you use?</h2>
      <p className="mb-3 text-sm text-muted">For each question, decide whether algebra, Desmos, or a combination is the fastest reliable approach. There is no penalty for being wrong; the reasoning is the lesson.</p>
      <div className="grid gap-3 md:grid-cols-2">
        {DECIDE.map((d) => { const p = picks[d.id]; return (
          <Card key={d.id} className="!p-4">
            <p className="text-sm font-medium">{d.prompt}</p>
            <div className="mt-2.5 flex flex-wrap gap-1.5">{(['algebra', 'desmos', 'both'] as const).map((o) => <button key={o} disabled={!!p} onClick={() => setPicks((x) => ({ ...x, [d.id]: o }))} className={`chip !px-3 !py-1 ${p ? (o === d.best ? 'border-ok bg-ok/15 text-ink' : p === o ? 'border-bad bg-bad/15 text-ink' : 'opacity-60') : 'hover:text-ink'}`}>{LABEL[o]}</button>)}</div>
            {p && <p className="mt-2 text-sm text-muted"><Badge tone={p === d.best ? 'ok' : 'warn'}>{p === d.best ? 'Good call' : `Best: ${LABEL[d.best]}`}</Badge> {d.why}</p>}
          </Card>
        ); })}
      </div>
      {answered === DECIDE.length && (
        <Card className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm">You matched the recommended approach on <b>{right} of {DECIDE.length}</b>. The goal is not to avoid the calculator or to lean on it, but to choose deliberately.</p>
          <button className="btn-primary" disabled={awarded} onClick={() => { award(30, 'Completed the Desmos judgment drill'); setAwarded(true); }}>{awarded ? 'XP claimed' : 'Claim 30 XP'}</button>
        </Card>
      )}
    </div>
  );
}
