import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useEngine } from '@/store/useEngine';
import { useAppStore } from '@/store/useAppStore';
import { Badge, Button, Card, Field, Notice, Switch } from '@/components/ui/primitives';
import { PageHeader, SectionHeader, TimelineItem } from '@/components/ui/shared';
import { AIGuidanceNote } from '@/components/ui/Provenance';
import { buildStudyPlan } from '@/domain/engine/planning';
import { satStats, satProjection } from '@/domain/engine/practice';
import { addDays, daysUntil, formatDate, todayISO, DAY_NAMES } from '@/lib/date';
import { minutesLabel, percent, countLabel } from '@/lib/format';
import { printPDF } from '@/lib/export';
import { Icon } from '@/components/ui/Icon';

/* Section 38 — an SAT study plan built backwards from the test date. */

interface Milestone {
  label: string;
  detail: string;
  daysBefore: number;
}

const MILESTONES: Milestone[] = [
  { label: 'Full timed practice test', detail: 'Under real conditions — same start time, same breaks, no phone. This is the only reliable read you get.', daysBefore: 84 },
  { label: 'Fix the weakest domain', detail: 'Pick the single weakest domain from your analysis and work it until the band moves. One domain at a time beats spreading thin.', daysBefore: 63 },
  { label: 'Second full practice test', detail: 'Compare against the first. If nothing moved, the study method is wrong, not the effort level.', daysBefore: 42 },
  { label: 'Timed module drills', detail: 'Switch the emphasis from accuracy to pace. Feedback withheld until the end.', daysBefore: 28 },
  { label: 'Third practice test', detail: 'Last honest measurement with enough time left to act on it.', daysBefore: 14 },
  { label: 'Taper', detail: 'Light review of your own error log only. No new material. Cramming in the last week costs more in fatigue than it adds in knowledge.', daysBefore: 7 },
  { label: 'Logistics check', detail: 'Admission ticket, photo ID, approved calculator, test centre route, an early night.', daysBefore: 2 },
];

export function SATPlanPage() {
  const ctx = useEngine();
  const { state, updateProfile, saveStudyPlan, toast } = useAppStore();
  const [hours, setHours] = useState(String(state.profile.academics.weeklyStudyHours ?? 8));
  const [satOnly, setSatOnly] = useState(true);

  const stats = useMemo(() => satStats(ctx), [ctx]);
  const projection = useMemo(() => satProjection(ctx), [ctx]);
  const plan = useMemo(() => buildStudyPlan(ctx, Math.max(1, Number(hours) || 8) * 60), [ctx, hours]);

  const planned = state.profile.plannedTests.find((t) => t.kind === 'SAT');
  const testDate = planned?.date;
  const days = testDate ? daysUntil(testDate) : undefined;

  const satBlocks = plan.blocks.filter((b) => !satOnly || b.scope === 'SAT');
  const byDay = Array.from({ length: 7 }, (_, d) => satBlocks.filter((b) => b.day === d));

  const upcoming = useMemo(() => {
    if (!testDate || days === undefined || days < 0) return [];
    return MILESTONES.filter((m) => m.daysBefore <= days + 7)
      .map((m) => ({ ...m, date: addDays(testDate, -m.daysBefore) }))
      .filter((m) => m.date >= todayISO())
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [testDate, days]);

  function setTestDate(value: string) {
    updateProfile((p) => {
      const existing = p.plannedTests.find((t) => t.kind === 'SAT');
      if (existing) existing.date = value || undefined;
      else p.plannedTests.push({ id: `sat-${Date.now()}`, kind: 'SAT', date: value || undefined });
    });
    toast(value ? `Test date set to ${formatDate(value)}. The plan now works backwards from it.` : 'Test date cleared.', 'ok');
  }

  function setTarget(value: string) {
    const n = Number(value);
    updateProfile((p) => {
      const existing = p.plannedTests.find((t) => t.kind === 'SAT');
      if (existing) existing.targetScore = Number.isFinite(n) && n > 0 ? n : undefined;
      else p.plannedTests.push({ id: `sat-${Date.now()}`, kind: 'SAT', targetScore: n });
    });
  }

  function saveHours() {
    const n = Math.max(1, Number(hours) || 8);
    updateProfile((p) => {
      p.academics.weeklyStudyHours = n;
    });
    toast(`Weekly study time set to ${n} hours. Plans across the app now use it.`, 'ok');
  }

  return (
    <div className="page">
      <PageHeader
        eyebrow="SAT Lab"
        title="Study plan"
        description="Built from your test date, the hours you actually have and the domains your own attempts show are weakest."
        back={{ to: '/app/sat', label: 'SAT Lab' }}
        actions={
          <>
            <Button variant="ghost" icon="download" onClick={printPDF}>
              Print / PDF
            </Button>
            <Button
              variant="ghost"
              icon="check"
              onClick={() => {
                saveStudyPlan(plan);
                toast('Plan saved. You can find it in the planner.', 'ok');
              }}
            >
              Save this plan
            </Button>
          </>
        }
      />

      <Card pad="md">
        <div className="row g-4 wrap items-end">
          <Field label="SAT date" hint="Leave blank if you have not registered yet.">
            {(p) => <input {...p} type="date" className="input" value={testDate ?? ''} min={todayISO()} onChange={(e) => setTestDate(e.target.value)} />}
          </Field>
          <Field label="Target score" hint="Optional. A target is only useful if it is grounded in a real practice test.">
            {(p) => (
              <input
                {...p}
                className="input"
                inputMode="numeric"
                defaultValue={planned?.targetScore ?? ''}
                onBlur={(e) => setTarget(e.target.value)}
                placeholder="1400"
              />
            )}
          </Field>
          <Field label="Study hours per week" hint="Across everything, not just the SAT. Be honest — an aspirational number produces a plan you will not follow.">
            {(p) => <input {...p} className="input" inputMode="numeric" value={hours} onChange={(e) => setHours(e.target.value.replace(/[^0-9]/g, ''))} onBlur={saveHours} />}
          </Field>
        </div>
        {days !== undefined ? (
          <p className="t-sm mt-4">
            {days > 0 ? (
              <>
                <span className="w-600">{countLabel(days, 'day')}</span> until your test — about {Math.floor(days / 7)} weeks of preparation left.
              </>
            ) : days === 0 ? (
              <span className="w-600">Your test is today. Good luck.</span>
            ) : (
              <span className="c-warn">That date has passed. Update it above or clear it.</span>
            )}
          </p>
        ) : null}
      </Card>

      <AIGuidanceNote>
        This plan is generated from your data, not written by a tutor who knows you. It cannot see that you have a competition the week of the
        third practice test or that maths clicks better for you in the morning. Move things around — the structure matters more than the specific
        slots.
      </AIGuidanceNote>

      {stats.total ? (
        <Card pad="md" className="mt-4">
          <SectionHeader title="What the plan is responding to" description="The inputs, stated so you can check whether they are right." />
          <div className="col g-2">
            {plan.inputs.priorities
              .filter((p) => !satOnly || p.scope === 'SAT')
              .map((p) => (
                <div key={p.scope} className="row g-2 t-sm">
                  <Icon name="chevron-right" size={13} className="mt-1 shrink-0 subtle" />
                  <span>
                    <span className="w-600">{p.scope}</span> — {p.reason}
                  </span>
                </div>
              ))}
          </div>
          {stats.byDomain.filter((d) => d.attempted >= 2).length ? (
            <div className="mt-4">
              <p className="t-2xs eyebrow mb-2">Weakest domains from your own attempts</p>
              <div className="row g-2 wrap">
                {stats.byDomain
                  .filter((d) => d.attempted >= 2)
                  .sort((a, b) => a.accuracy - b.accuracy)
                  .slice(0, 3)
                  .map((d) => (
                    <Badge key={d.key} tone={d.accuracy < 60 ? 'warn' : 'accent'}>
                      {d.label} · {percent(d.accuracy)}
                    </Badge>
                  ))}
              </div>
            </div>
          ) : null}
        </Card>
      ) : (
        <Card pad="md" className="mt-4">
          <p className="t-sm subtle">
            You have not answered any SAT practice questions yet, so this plan allocates time evenly rather than targeting weaknesses it cannot
            see.{' '}
            <Link to="/app/sat/practice" className="c-accent">
              Answer a set
            </Link>{' '}
            and the plan will sharpen considerably.
          </p>
        </Card>
      )}

      <div className="row between g-3 mt-6 wrap items-center">
        <SectionHeader title="Your week" description={`${minutesLabel(satBlocks.reduce((n, b) => n + b.minutes, 0))} across ${countLabel(byDay.filter((d) => d.length).length, 'day')}.`} />
        <Switch checked={satOnly} onChange={setSatOnly} label="SAT blocks only" description="Turn off to see the full study plan including AP work." />
      </div>

      <div className="grid-fit-sm">
        {byDay.map((blocks, day) => (
          <Card key={day} pad="md">
            <p className="t-2xs eyebrow">{DAY_NAMES[day]}</p>
            {blocks.length ? (
              <div className="col g-3 mt-3">
                {blocks.map((b, i) => (
                  <div key={`${b.scope}-${i}`} className="col g-1">
                    <span className="row between g-2">
                      <span className="t-xs w-600">{b.scope}</span>
                      <span className="t-2xs mono faint">{minutesLabel(b.minutes)}</span>
                    </span>
                    <span className="t-2xs subtle">{b.focus}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="t-2xs faint mt-3">Rest day. These are part of the plan, not a gap in it.</p>
            )}
          </Card>
        ))}
      </div>

      {upcoming.length ? (
        <>
          <SectionHeader
            title="Milestones before the test"
            className="mt-8"
            description="A standard preparation arc, dated from your test. Full practice tests are the load-bearing parts — everything else is adjustment between them."
          />
          <Card pad="md">
            <ol className="col g-1" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {upcoming.map((m) => (
                <TimelineItem
                  key={m.label}
                  title={m.label}
                  state={daysUntil(m.date) <= 7 ? 'now' : 'default'}
                  meta={<span className="t-2xs mono faint">{formatDate(m.date)} · {m.daysBefore} days before</span>}
                >
                  <p className="t-xs subtle">{m.detail}</p>
                </TimelineItem>
              ))}
            </ol>
          </Card>
        </>
      ) : testDate ? null : (
        <Card pad="md" className="mt-6">
          <p className="t-sm subtle">Set a test date above and a dated milestone sequence will appear here.</p>
        </Card>
      )}

      <Notice tone="warn" icon="alert" className="mt-6">
        {projection.caveat}
      </Notice>
    </div>
  );
}
