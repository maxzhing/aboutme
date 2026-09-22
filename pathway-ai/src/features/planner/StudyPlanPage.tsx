import { useMemo, useState } from 'react';
import { useEngine } from '@/store/useEngine';
import { useAppStore } from '@/store/useAppStore';
import { Badge, Button, Card, Field, Notice } from '@/components/ui/primitives';
import { PageHeader, SectionHeader, Stat } from '@/components/ui/shared';
import { AIGuidanceNote } from '@/components/ui/Provenance';
import { BarChart } from '@/components/charts';
import { buildStudyPlan } from '@/domain/engine/planning';
import { DAY_NAMES, formatDate } from '@/lib/date';
import { minutesLabel, countLabel } from '@/lib/format';
import { printPDF } from '@/lib/export';
import { Icon } from '@/components/ui/Icon';

/* Section 33 — the weekly study plan, and the reasoning behind it. */

export function StudyPlanPage() {
  const ctx = useEngine();
  const { state, updateProfile, saveStudyPlan, addCalendarEvent, toast } = useAppStore();
  const [hours, setHours] = useState(String(state.profile.academics.weeklyStudyHours ?? 8));

  const weeklyMinutes = Math.max(60, (Number(hours) || 8) * 60);
  const plan = useMemo(() => buildStudyPlan(ctx, weeklyMinutes), [ctx, weeklyMinutes]);
  const saved = state.studyPlans[state.studyPlans.length - 1];

  const byDay = Array.from({ length: 7 }, (_, d) => plan.blocks.filter((b) => b.day === d));
  const byScope = useMemo(() => {
    const map = new Map<string, number>();
    for (const b of plan.blocks) map.set(b.scope, (map.get(b.scope) ?? 0) + b.minutes);
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([scope, minutes]) => ({ label: scope, value: minutes, note: minutesLabel(minutes) }));
  }, [plan]);

  function commitHours() {
    const n = Math.max(1, Number(hours) || 8);
    updateProfile((p) => {
      p.academics.weeklyStudyHours = n;
    });
    toast(`Weekly study time set to ${n} hours. Plans across the app now use it.`, 'ok');
  }

  function addWeekToCalendar() {
    let added = 0;
    for (const b of plan.blocks) {
      const date = plan.weekOf;
      const offset = b.day;
      const d = new Date(date);
      d.setUTCDate(d.getUTCDate() + offset);
      addCalendarEvent({
        title: b.scope,
        date: d.toISOString().slice(0, 10),
        kind: 'study',
        minutes: b.minutes,
        scope: b.focus,
        notes: b.reason,
        done: false,
        generated: true,
      });
      added += 1;
    }
    toast(`${countLabel(added, 'study block')} added to your calendar as editable events.`, 'ok');
  }

  return (
    <div className="page">
      <PageHeader
        eyebrow="Planner"
        title="Study plan"
        description="Time allocated by what is actually urgent and what your own practice shows is weakest — not by subject in alphabetical order."
        back={{ to: '/app/planner', label: 'Planner' }}
        actions={
          <>
            <Button variant="ghost" icon="download" onClick={printPDF}>
              Print / PDF
            </Button>
            <Button variant="ghost" icon="calendar" onClick={addWeekToCalendar}>
              Add to calendar
            </Button>
            <Button
              variant="primary"
              icon="check"
              onClick={() => {
                saveStudyPlan(plan);
                toast('Plan saved.', 'ok');
              }}
            >
              Save plan
            </Button>
          </>
        }
      />

      <Card pad="md">
        <div className="row g-4 wrap items-end">
          <Field label="Study hours per week" hint="Be honest. A plan built on hours you do not have produces a week that ends in guilt.">
            {(p) => (
              <input
                {...p}
                className="input"
                inputMode="numeric"
                value={hours}
                onChange={(e) => setHours(e.target.value.replace(/[^0-9]/g, ''))}
                onBlur={commitHours}
              />
            )}
          </Field>
          <div className="row g-5 wrap">
            <Stat label="Planned this week" value={minutesLabel(plan.totalMinutes)} />
            <Stat label="Study days" value={String(byDay.filter((d) => d.length).length)} />
            <Stat label="Subjects" value={String(byScope.length)} />
          </div>
        </div>
        {plan.inputs.commitments.length ? (
          <p className="t-2xs faint mt-4">
            Your existing commitments —{' '}
            {plan.inputs.commitments.map((c) => `${c.label} (${minutesLabel(c.minutes)})`).join(', ')} — are already deducted from what the plan
            assumes you have free.
          </p>
        ) : null}
      </Card>

      <AIGuidanceNote>
        Generated from your test dates, your unit progress and the domains your practice answers show are weakest. It does not know about your
        coursework load this week, your job, or the fact that Thursdays are impossible. Treat it as a starting allocation, not a schedule.
      </AIGuidanceNote>

      <Card pad="md" className="mt-4">
        <SectionHeader title="Why the time is split this way" description="Every allocation has a reason. If one of these is wrong, fix the input rather than the plan." />
        <div className="col g-2">
          {plan.inputs.priorities.map((p) => (
            <div key={p.scope} className="row between g-3 items-start wrap">
              <div className="grow" style={{ minWidth: 0 }}>
                <p className="t-sm w-600">{p.scope}</p>
                <p className="t-xs subtle mt-1">{p.reason}</p>
              </div>
              <Badge tone={p.weight >= 2 ? 'warn' : p.weight >= 1.2 ? 'accent' : 'default'}>weight {p.weight.toFixed(1)}</Badge>
            </div>
          ))}
        </div>
      </Card>

      {byScope.length ? (
        <Card pad="md" className="mt-4">
          <SectionHeader title="Where the week goes" description="Total minutes per subject." />
          <BarChart data={byScope} ariaLabel="Weekly study minutes by subject" unit="" format={(n: number) => minutesLabel(n)} />
        </Card>
      ) : null}

      <SectionHeader title={`Week of ${formatDate(plan.weekOf)}`} className="mt-8" description="Heavier midweek, lighter at the weekend — move things if that is the wrong way round for you." />
      <div className="grid-fit-sm">
        {byDay.map((blocks, day) => (
          <Card key={day} pad="md">
            <p className="t-2xs eyebrow">{DAY_NAMES[day]}</p>
            {blocks.length ? (
              <>
                <p className="t-2xs mono faint mt-1">{minutesLabel(blocks.reduce((n, b) => n + b.minutes, 0))}</p>
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
              </>
            ) : (
              <p className="t-2xs faint mt-3">Rest day.</p>
            )}
          </Card>
        ))}
      </div>

      {saved ? (
        <Card pad="md" className="mt-6">
          <p className="t-2xs eyebrow">Saved plan</p>
          <p className="t-sm mt-2">
            {saved.label} · {minutesLabel(saved.totalMinutes)} · saved {formatDate(saved.createdAt.slice(0, 10))}
          </p>
          <p className="t-2xs faint mt-2">
            Regenerating replaces it. The plan above is live and reflects your current data; the saved one is a snapshot.
          </p>
        </Card>
      ) : null}

      <Notice tone="info" icon="info" className="mt-6">
        <span className="w-600">Two hours of focused work beats six distracted ones.</span> If a block consistently goes nowhere, the problem is
        usually the environment or the task being too vague — not the amount of time. &ldquo;Review biology&rdquo; is a wish; &ldquo;do eight
        questions on cellular respiration and write down what I got wrong&rdquo; is a task.
      </Notice>

      <p className="t-2xs faint mt-4 row g-2">
        <Icon name="info" size={12} className="mt-1 shrink-0" />
        <span>
          Plans regenerate from your live profile, so adding a test date or answering practice questions changes next week&rsquo;s allocation
          automatically.
        </span>
      </p>
    </div>
  );
}
