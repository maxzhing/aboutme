import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useEngine } from '@/store/useEngine';
import { useAppStore } from '@/store/useAppStore';
import { Badge, Button, Card, Field, Modal, Notice, Tabs } from '@/components/ui/primitives';
import { PageHeader, SectionHeader } from '@/components/ui/shared';
import { ProvenanceChip } from '@/components/ui/Provenance';
import { deadlineIntelligence, suggestedDeadlines } from '@/domain/engine/planning';
import { COLLEGE_BY_ID } from '@/data/colleges';
import { countLabel } from '@/lib/format';
import { formatDate, relativeDays, todayISO } from '@/lib/date';
import { downloadCSV } from '@/lib/export';
import { Icon } from '@/components/ui/Icon';
import type { DeadlineCategory } from '@/domain/types';

/* Section 31 — deadline intelligence: what is blocking each one, not just a date. */

const URGENCY_TONE: Record<string, 'danger' | 'warn' | 'accent' | 'default'> = {
  overdue: 'danger',
  critical: 'danger',
  soon: 'warn',
  upcoming: 'accent',
  distant: 'default',
};

const CATEGORIES: DeadlineCategory[] = [
  'college-application', 'scholarship', 'test-registration', 'exam', 'program', 'competition', 'school', 'personal',
];

export function DeadlinesPage() {
  const ctx = useEngine();
  const { state, addDeadline, updateDeadline, removeDeadline, toast } = useAppStore();
  const [tab, setTab] = useState('open');
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(todayISO());
  const [category, setCategory] = useState<DeadlineCategory>('personal');
  const [notes, setNotes] = useState('');

  const intel = useMemo(() => deadlineIntelligence(ctx), [ctx]);
  const suggested = useMemo(() => suggestedDeadlines(ctx), [ctx]);
  const done = state.deadlines.filter((d) => d.done);

  const shown = tab === 'done' ? [] : tab === 'blocked' ? intel.filter((d) => d.blockers.length) : intel;

  function save() {
    if (!title.trim()) {
      toast('A deadline needs a title.', 'warn');
      return;
    }
    addDeadline({
      title: title.trim(),
      date,
      category,
      notes: notes.trim() || undefined,
      done: false,
      provenance: { kind: 'user', sources: [] },
    });
    toast('Deadline added.', 'ok');
    setOpen(false);
    setTitle('');
    setNotes('');
  }

  function exportDeadlines() {
    downloadCSV(
      'pathway-deadlines.csv',
      state.deadlines.map((d) => ({
        Title: d.title,
        Date: d.date,
        Category: d.category,
        Done: d.done ? 'yes' : 'no',
        Notes: d.notes ?? '',
        Source: d.provenance.kind,
      })),
    );
    toast('Deadlines exported as CSV.', 'ok');
  }

  return (
    <div className="page">
      <PageHeader
        eyebrow="Planner"
        title="Deadlines"
        description="Every date you are tracking, ordered by urgency — with what is actually standing between you and finishing each one."
        back={{ to: '/app/planner', label: 'Planner' }}
        actions={
          <>
            <Button variant="ghost" icon="download" onClick={exportDeadlines} disabled={!state.deadlines.length}>
              Export
            </Button>
            <Button variant="primary" icon="plus" onClick={() => setOpen(true)}>
              Add a deadline
            </Button>
          </>
        }
      />

      <Notice tone="warn" icon="alert">
        <span className="w-600">Dates from the catalog are demo data.</span> Application and scholarship deadlines change every cycle, and a
        missed deadline cannot be undone. Confirm every date against the college or sponsor&rsquo;s own site before you rely on it.
      </Notice>

      <div className="mt-6">
        <Tabs
          ariaLabel="Deadline views"
          active={tab}
          onChange={setTab}
          items={[
            { id: 'open', label: 'Open', count: intel.length },
            { id: 'blocked', label: 'Blocked', count: intel.filter((d) => d.blockers.length).length },
            { id: 'done', label: 'Done', count: done.length },
          ]}
        />
      </div>

      {tab === 'done' ? (
        <div className="col g-2 mt-4">
          {done.length ? (
            done.map((d) => (
              <Card key={d.id} pad="md">
                <div className="row between g-3 items-center wrap">
                  <div>
                    <p className="t-sm w-600" style={{ textDecoration: 'line-through', opacity: 0.7 }}>
                      {d.title}
                    </p>
                    <p className="t-2xs faint mt-1">{formatDate(d.date)}</p>
                  </div>
                  <div className="row g-2">
                    <Button size="sm" variant="ghost" onClick={() => updateDeadline(d.id, { done: false })}>
                      Reopen
                    </Button>
                    <Button size="sm" variant="ghost" icon="trash" aria-label={`Delete ${d.title}`} onClick={() => removeDeadline(d.id)} />
                  </div>
                </div>
              </Card>
            ))
          ) : (
            <Card pad="lg">
              <p className="t-sm subtle ta-center">Nothing marked done yet.</p>
            </Card>
          )}
        </div>
      ) : shown.length ? (
        <div className="col g-3 mt-4">
          {shown.map((d) => {
            const college = d.deadline.refType === 'college' && d.deadline.refId ? COLLEGE_BY_ID.get(d.deadline.refId) : undefined;
            return (
              <Card key={d.deadline.id} pad="md" hover>
                <div className="row between g-3 items-start wrap">
                  <div className="grow" style={{ minWidth: 0 }}>
                    <div className="row g-2 items-center wrap">
                      <h3 className="t-md w-600">{d.deadline.title}</h3>
                      <Badge tone={URGENCY_TONE[d.urgency]}>{d.urgency}</Badge>
                      <Badge>{d.deadline.category.replace(/-/g, ' ')}</Badge>
                    </div>
                    <p className="t-2xs subtle mt-1">
                      {formatDate(d.deadline.date, 'long')} · {relativeDays(d.daysAway)}
                    </p>
                  </div>
                  <div className="row g-2 items-center">
                    <ProvenanceChip provenance={d.deadline.provenance} compact />
                    <Button size="sm" variant="ghost" icon="check" onClick={() => updateDeadline(d.deadline.id, { done: true })}>
                      Done
                    </Button>
                    <Button size="sm" variant="ghost" icon="trash" aria-label={`Delete ${d.deadline.title}`} onClick={() => removeDeadline(d.deadline.id)} />
                  </div>
                </div>

                <p className="t-sm muted mt-3">{d.message}</p>

                {d.blockers.length ? (
                  <div className="mt-3">
                    <p className="t-2xs eyebrow mb-2">Standing in the way</p>
                    <ul className="col g-1">
                      {d.blockers.map((b) => (
                        <li key={b} className="t-xs c-warn row g-2">
                          <Icon name="alert" size={12} className="mt-1 shrink-0" />
                          <span>{b}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {d.deadline.notes ? <p className="t-xs subtle mt-3">{d.deadline.notes}</p> : null}

                {college ? (
                  <Button size="sm" variant="ghost" to={`/app/applications/${college.id}`} iconRight="chevron-right" className="mt-3">
                    Open the application checklist
                  </Button>
                ) : null}
              </Card>
            );
          })}
        </div>
      ) : (
        <Card pad="lg" className="mt-4">
          <p className="t-sm subtle ta-center">
            {tab === 'blocked'
              ? 'Nothing is blocked right now.'
              : 'No open deadlines. Add colleges to your list or save a scholarship and their dates will appear here automatically.'}
          </p>
        </Card>
      )}

      {suggested.length ? (
        <Card pad="md" className="mt-6">
          <SectionHeader
            title="Dates we can see that you are not tracking"
            description="Drawn from the colleges and awards you have saved. Add the ones that apply — and verify each against the official source."
          />
          <div className="col g-2">
            {suggested.slice(0, 8).map((s) => (
              <div key={`${s.refType}-${s.refId}-${s.title}`} className="row between g-3 items-center wrap">
                <div>
                  <p className="t-sm">{s.title}</p>
                  <p className="t-2xs faint mt-1">{formatDate(s.date)}</p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  icon="plus"
                  onClick={() => {
                    addDeadline(s);
                    toast('Added. Confirm the date with the official source.', 'ok');
                  }}
                >
                  Track it
                </Button>
              </div>
            ))}
          </div>
          <p className="t-2xs faint mt-3">
            These come from the demo catalog, which is why each one arrives marked as demo data rather than verified.
          </p>
        </Card>
      ) : null}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Add a deadline"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={save}>
              Add deadline
            </Button>
          </>
        }
      >
        <div className="col g-4">
          <Field label="What is due" required>
            {(p) => <input {...p} className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Early action application" />}
          </Field>
          <div className="row g-3 wrap">
            <Field label="Date">
              {(p) => <input {...p} type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />}
            </Field>
            <Field label="Category">
              {(p) => (
                <select {...p} className="select" value={category} onChange={(e) => setCategory(e.target.value as DeadlineCategory)}>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c.replace(/-/g, ' ')}
                    </option>
                  ))}
                </select>
              )}
            </Field>
          </div>
          <Field label="Notes" hint="Optional. What still needs doing, or where you found the date.">
            {(p) => <textarea {...p} className="input textarea" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />}
          </Field>
          <p className="t-2xs faint">
            Deadlines you add yourself are marked as your own information, kept visually distinct from catalog dates throughout the app.
          </p>
        </div>
      </Modal>

      <p className="t-2xs faint mt-6">
        {countLabel(state.deadlines.length, 'deadline')} tracked in total.{' '}
        <Link to="/app/planner/calendar" className="c-accent">
          See them on a calendar
        </Link>
        .
      </p>
    </div>
  );
}
