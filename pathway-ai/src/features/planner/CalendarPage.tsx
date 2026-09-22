import { useMemo, useState } from 'react';
import { useEngine } from '@/store/useEngine';
import { useAppStore } from '@/store/useAppStore';
import { Badge, Button, Card, Field, Modal, Switch } from '@/components/ui/primitives';
import { PageHeader, SectionHeader } from '@/components/ui/shared';
import { deadlineEvents, buildStudyPlan } from '@/domain/engine/planning';
import { addMonths, DAY_LETTERS, formatDate, monthGrid, startOfMonth, startOfWeek, addDays, todayISO, monthName } from '@/lib/date';
import { minutesLabel, countLabel } from '@/lib/format';
import { Icon } from '@/components/ui/Icon';
import type { CalendarEvent, CalendarEventKind } from '@/domain/types';

/* Section 32 — calendar. Deadlines, generated study blocks and your own events. */

const KIND_TONE: Record<string, string> = {
  study: 'var(--series-1)',
  exam: 'var(--danger)',
  deadline: 'var(--warn)',
  activity: 'var(--series-3)',
  assignment: 'var(--series-4)',
  goal: 'var(--series-5)',
  test: 'var(--series-6)',
  other: 'var(--text-faint)',
};

const KINDS: CalendarEventKind[] = ['study', 'exam', 'test', 'deadline', 'activity', 'assignment', 'goal', 'other'];

export function CalendarPage() {
  const ctx = useEngine();
  const { state, addCalendarEvent, updateCalendarEvent, removeCalendarEvent, toast } = useAppStore();
  const [cursor, setCursor] = useState(startOfMonth(todayISO()));
  const [showStudy, setShowStudy] = useState(true);
  const [selected, setSelected] = useState<string | undefined>(undefined);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: '', date: todayISO(), kind: 'other' as CalendarEventKind, minutes: '', notes: '' });

  const plan = useMemo(() => buildStudyPlan(ctx), [ctx]);
  const deadlineEvts = useMemo(() => deadlineEvents(ctx), [ctx]);

  /* Generated study blocks projected onto the visible month, never persisted. */
  const studyEvents = useMemo(() => {
    if (!showStudy) return [];
    const out: CalendarEvent[] = [];
    const weekStart = startOfWeek(cursor);
    for (let week = 0; week < 6; week++) {
      for (const block of plan.blocks) {
        const date = addDays(weekStart, week * 7 + block.day);
        out.push({
          id: `plan-${week}-${block.day}-${block.scope}`,
          title: block.scope,
          date,
          minutes: block.minutes,
          kind: 'study',
          scope: block.focus,
          done: false,
          generated: true,
          createdAt: '',
        });
      }
    }
    return out;
  }, [plan, cursor, showStudy]);

  const allEvents = useMemo(
    () => [...state.calendarEvents, ...deadlineEvts, ...studyEvents],
    [state.calendarEvents, deadlineEvts, studyEvents],
  );

  const byDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const e of allEvents) map.set(e.date, [...(map.get(e.date) ?? []), e]);
    return map;
  }, [allEvents]);

  const grid = useMemo(() => monthGrid(cursor), [cursor]);
  const selectedEvents = selected ? byDate.get(selected) ?? [] : [];
  const [year, month] = cursor.split('-').map(Number);

  function save() {
    if (!form.title.trim()) {
      toast('An event needs a title.', 'warn');
      return;
    }
    addCalendarEvent({
      title: form.title.trim(),
      date: form.date,
      kind: form.kind,
      minutes: form.minutes ? Number(form.minutes) : undefined,
      notes: form.notes.trim() || undefined,
      done: false,
      generated: false,
    });
    toast('Event added.', 'ok');
    setOpen(false);
    setForm({ title: '', date: selected ?? todayISO(), kind: 'other', minutes: '', notes: '' });
  }

  return (
    <div className="page">
      <PageHeader
        eyebrow="Planner"
        title="Calendar"
        description="Your deadlines, the study blocks your plan generated, and anything you add yourself — in one view."
        back={{ to: '/app/planner', label: 'Planner' }}
        actions={
          <Button
            variant="primary"
            icon="plus"
            onClick={() => {
              setForm((f) => ({ ...f, date: selected ?? todayISO() }));
              setOpen(true);
            }}
          >
            Add an event
          </Button>
        }
      />

      <Card pad="md">
        <div className="row between g-3 wrap items-center">
          <div className="row g-2 items-center">
            <Button size="sm" variant="ghost" icon="chevron-left" aria-label="Previous month" onClick={() => setCursor(addMonths(cursor, -1))} />
            <h2 className="t-md w-600" style={{ minWidth: 170, textAlign: 'center' }}>
              {monthName(month)} {year}
            </h2>
            <Button size="sm" variant="ghost" icon="chevron-right" aria-label="Next month" onClick={() => setCursor(addMonths(cursor, 1))} />
            <Button size="sm" variant="ghost" onClick={() => setCursor(startOfMonth(todayISO()))}>
              Today
            </Button>
          </div>
          <Switch checked={showStudy} onChange={setShowStudy} label="Show generated study blocks" />
        </div>
      </Card>

      <div className="split-aside mt-4">
        <Card pad="md">
          <div className="cal-grid" role="grid" aria-label={`${monthName(month)} ${year}`}>
            {DAY_LETTERS.map((d, i) => (
              <div key={`${d}-${i}`} className="cal-head" aria-hidden="true">
                {d}
              </div>
            ))}
            {grid.map((cell) => {
              const events = byDate.get(cell.date) ?? [];
              const isToday = cell.date === todayISO();
              return (
                <button
                  key={cell.date}
                  type="button"
                  className={`cal-cell${cell.inMonth ? '' : ' is-out'}${isToday ? ' is-today' : ''}${selected === cell.date ? ' is-selected' : ''}`}
                  onClick={() => setSelected(cell.date)}
                  aria-label={`${formatDate(cell.date, 'long')}, ${countLabel(events.length, 'event')}`}
                  aria-pressed={selected === cell.date}
                >
                  <span className="cal-num">{Number(cell.date.slice(8))}</span>
                  <span className="cal-dots">
                    {events.slice(0, 4).map((e) => (
                      <span key={e.id} className="cal-dot" style={{ background: KIND_TONE[e.kind] ?? 'var(--accent)' }} />
                    ))}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="row g-4 mt-4 wrap t-2xs subtle">
            {Object.entries(KIND_TONE)
              .filter(([k]) => k !== 'other')
              .map(([kind, tone]) => (
                <span key={kind} className="row g-1">
                  <span className="cal-dot" style={{ background: tone }} /> {kind}
                </span>
              ))}
          </div>
        </Card>

        <div className="col g-4">
          <Card pad="md">
            <SectionHeader title={selected ? formatDate(selected, 'long') : 'Select a day'} description={selected ? undefined : 'Pick a date on the calendar to see what is on it.'} />
            {selected ? (
              selectedEvents.length ? (
                <div className="col g-3">
                  {selectedEvents.map((e) => (
                    <div key={e.id} className="card card-pad-sm">
                      <div className="row between g-2 items-start wrap">
                        <div className="grow" style={{ minWidth: 0 }}>
                          <p className="t-sm w-600">{e.title}</p>
                          <p className="t-2xs subtle mt-1">
                            {e.kind}
                            {e.minutes ? ` · ${minutesLabel(e.minutes)}` : ''}
                            {e.scope ? ` · ${e.scope}` : ''}
                          </p>
                        </div>
                        {e.generated ? (
                          <Badge>Generated</Badge>
                        ) : (
                          <div className="row g-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              icon={e.done ? 'refresh' : 'check'}
                              aria-label={e.done ? 'Reopen' : 'Mark done'}
                              onClick={() => updateCalendarEvent(e.id, { done: !e.done })}
                            />
                            <Button size="sm" variant="ghost" icon="trash" aria-label={`Delete ${e.title}`} onClick={() => removeCalendarEvent(e.id)} />
                          </div>
                        )}
                      </div>
                      {e.notes ? <p className="t-xs subtle mt-2">{e.notes}</p> : null}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="t-sm subtle">Nothing on this day.</p>
              )
            ) : null}
            {selected ? (
              <Button
                size="sm"
                variant="ghost"
                icon="plus"
                className="mt-4"
                onClick={() => {
                  setForm((f) => ({ ...f, date: selected }));
                  setOpen(true);
                }}
              >
                Add something on this day
              </Button>
            ) : null}
          </Card>

          <Card pad="md">
            <p className="t-2xs eyebrow">About the generated blocks</p>
            <p className="t-xs subtle mt-2">
              Study blocks come from your weekly plan and repeat across every week shown. They are not saved events — change your plan and they
              change here. Anything you add yourself is yours and stays put.
            </p>
            <Button size="sm" variant="ghost" to="/app/planner/study-plan" iconRight="arrow-right" className="mt-3">
              Edit the study plan
            </Button>
          </Card>

          <Card pad="md">
            <p className="t-2xs eyebrow">Export</p>
            <p className="t-xs subtle mt-2">
              This build keeps your calendar inside the app. A shipped version would sync with Google Calendar and export .ics — we have not
              faked either, because a calendar that silently fails to sync is worse than none.
            </p>
          </Card>
        </div>
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Add an event"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={save}>
              Add event
            </Button>
          </>
        }
      >
        <div className="col g-4">
          <Field label="Title" required>
            {(p) => <input {...p} className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Chemistry test" />}
          </Field>
          <div className="row g-3 wrap">
            <Field label="Date">
              {(p) => <input {...p} type="date" className="input" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />}
            </Field>
            <Field label="Kind">
              {(p) => (
                <select {...p} className="select" value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as CalendarEventKind })}>
                  {KINDS.map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </select>
              )}
            </Field>
            <Field label="Minutes" hint="Optional.">
              {(p) => <input {...p} className="input" inputMode="numeric" value={form.minutes} onChange={(e) => setForm({ ...form, minutes: e.target.value.replace(/[^0-9]/g, '') })} />}
            </Field>
          </div>
          <Field label="Notes" hint="Optional.">
            {(p) => <textarea {...p} className="input textarea" rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />}
          </Field>
        </div>
      </Modal>

      <p className="t-2xs faint mt-6 row g-2">
        <Icon name="info" size={12} className="mt-1 shrink-0" />
        <span>Catalog deadlines shown here are demo dates. Confirm each against the official source before acting on it.</span>
      </p>
    </div>
  );
}
