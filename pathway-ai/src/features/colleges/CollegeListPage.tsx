import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useEngine } from '@/store/useEngine';
import { useAppStore } from '@/store/useAppStore';
import { Badge, Button, Card, EmptyState, Field, Modal } from '@/components/ui/primitives';
import { Icon } from '@/components/ui/Icon';
import { PageHeader, SectionHeader, TimelineItem } from '@/components/ui/shared';
import { COLLEGE_BY_ID } from '@/data/colleges';
import { MAJORS, MAJOR_BY_ID } from '@/data/majors';
import { APPLICATION_TASKS } from '@/features/applications/tasks';
import type { CollegeListEntry, ListStage } from '@/domain/types';
import { deadlineIntelligence } from '@/domain/engine/planning';
import { compactCurrency, countLabel, percent } from '@/lib/format';
import { downloadCSV } from '@/lib/export';
import { formatDate } from '@/lib/date';

/* Section 8 — the college list builder. */

const STAGES: { id: ListStage; label: string; description: string }[] = [
  { id: 'exploring', label: 'Exploring', description: 'Curious, nothing decided' },
  { id: 'considering', label: 'Considering', description: 'Seriously in the running' },
  { id: 'application-planning', label: 'Application planning', description: 'Working out rounds and requirements' },
  { id: 'applying', label: 'Applying', description: 'Actively working on it' },
  { id: 'applied', label: 'Applied', description: 'Submitted' },
  { id: 'decision', label: 'Decision', description: 'Waiting or decided' },
];

export function CollegeListPage() {
  const ctx = useEngine();
  const { state, updateCollegeEntry, removeCollegeEntry, toast } = useAppStore();
  const [editing, setEditing] = useState<CollegeListEntry | undefined>();

  const byStage = useMemo(() => {
    const map = new Map<ListStage, CollegeListEntry[]>();
    for (const stage of STAGES) map.set(stage.id, []);
    for (const entry of state.collegeList) {
      map.set(entry.stage, [...(map.get(entry.stage) ?? []), entry]);
    }
    return map;
  }, [state.collegeList]);

  const deadlines = useMemo(
    () => deadlineIntelligence(ctx).filter((d) => d.deadline.refType === 'college').slice(0, 8),
    [ctx],
  );

  const exportList = () => {
    downloadCSV(
      'pathway-college-list.csv',
      state.collegeList.map((e) => {
        const c = COLLEGE_BY_ID.get(e.collegeId);
        return {
          College: c?.name ?? e.collegeId,
          Location: c ? `${c.city}, ${c.state}` : '',
          Stage: e.stage,
          'Intended major': e.intendedMajorId ? MAJOR_BY_ID.get(e.intendedMajorId)?.name ?? '' : '',
          'Application round': e.applicationRound ?? '',
          'Acceptance rate': c?.acceptanceRate ?? '',
          'Avg net price': c?.avgNetPrice ?? '',
          'Checklist complete': Object.values(e.checklist).filter(Boolean).length,
          Decision: e.decision ?? '',
          Notes: e.notes ?? '',
        };
      }),
    );
    toast('College list exported as CSV.', 'ok');
  };

  if (!state.collegeList.length) {
    return (
      <div className="page">
        <PageHeader eyebrow="My list" title="Your college list" />
        <EmptyState
          icon="bookmark"
          title="No colleges saved yet"
          description="Let's find your first colleges. Saving a few early is mostly about learning what you actually want, not about building a final list."
          action={
            <div className="row g-2">
              <Link to="/app/colleges/match" className="btn btn-primary">
                Find colleges
              </Link>
              <Link to="/app/colleges" className="btn">
                Browse the catalog
              </Link>
            </div>
          }
        />
      </div>
    );
  }

  return (
    <div className="page">
      <PageHeader
        eyebrow="My list"
        title="Your college list"
        description={`${countLabel(state.collegeList.length, 'college')} tracked across ${STAGES.filter((s) => (byStage.get(s.id) ?? []).length).length} stages.`}
        actions={
          <>
            <Button size="sm" icon="download" onClick={exportList}>
              Export CSV
            </Button>
            <Button size="sm" icon="grid" to="/app/colleges/compare">
              Compare
            </Button>
            <Button size="sm" variant="primary" icon="plus" to="/app/colleges/match">
              Add more
            </Button>
          </>
        }
      />

      {deadlines.length ? (
        <Card pad="md" className="mb-6">
          <SectionHeader
            title="Timeline"
            description="Dates from the catalog are estimates — confirm each on the official site."
            action={
              <Link to="/app/planner/deadlines" className="t-xs">
                Full deadline tracker
              </Link>
            }
          />
          <ul className="timeline">
            {deadlines.map((d) => (
              <TimelineItem
                key={d.deadline.id}
                title={d.deadline.title}
                state={d.urgency === 'overdue' ? 'late' : d.urgency === 'critical' ? 'now' : d.urgency === 'soon' ? 'warn' : 'default'}
                meta={<Badge tone={d.urgency === 'critical' ? 'danger' : d.urgency === 'soon' ? 'warn' : 'default'}>{d.daysAway < 0 ? 'Passed' : `${d.daysAway} days`}</Badge>}
              >
                <p className="t-xs subtle">{d.message}</p>
              </TimelineItem>
            ))}
          </ul>
        </Card>
      ) : null}

      <div className="col g-6">
        {STAGES.map((stage) => {
          const entries = byStage.get(stage.id) ?? [];
          if (!entries.length) return null;
          return (
            <section key={stage.id}>
              <SectionHeader title={stage.label} description={stage.description} action={<Badge>{entries.length}</Badge>} />
              <div className="grid-fit">
                {entries.map((entry) => {
                  const college = COLLEGE_BY_ID.get(entry.collegeId);
                  if (!college) return null;
                  const done = Object.values(entry.checklist).filter(Boolean).length;
                  const pct = Math.round((done / APPLICATION_TASKS.length) * 100);
                  return (
                    <Card key={entry.id} pad="md" hover>
                      <div className="row between g-2 items-start">
                        <Link to={`/app/colleges/${college.id}`} className="t-sm w-600" style={{ color: 'inherit', textDecoration: 'none' }}>
                          {college.shortName ?? college.name}
                        </Link>
                        <Button size="xs" variant="ghost" icon="edit" onClick={() => setEditing(entry)} aria-label={`Edit ${college.name}`} />
                      </div>
                      <p className="t-2xs subtle">
                        {college.city}, {college.state}
                      </p>

                      <div className="row g-2 mt-3 wrap">
                        {entry.intendedMajorId ? <Badge tone="accent">{MAJOR_BY_ID.get(entry.intendedMajorId)?.name}</Badge> : null}
                        {entry.applicationRound ? <Badge>{entry.applicationRound}</Badge> : null}
                        {entry.decision ? <Badge tone={entry.decision === 'accepted' ? 'ok' : entry.decision === 'denied' ? 'danger' : 'warn'}>{entry.decision}</Badge> : null}
                      </div>

                      <div className="col g-1 mt-4">
                        <div className="row between t-2xs">
                          <span className="subtle">Application checklist</span>
                          <span className="mono">{done}/{APPLICATION_TASKS.length}</span>
                        </div>
                        <div className="bar bar-sm">
                          <div className="bar-fill" style={{ width: `${pct}%` }} />
                        </div>
                      </div>

                      <div className="row g-3 mt-3 t-2xs faint wrap">
                        {college.acceptanceRate !== undefined ? <span>{percent(college.acceptanceRate)} admit</span> : null}
                        {college.avgNetPrice !== undefined ? <span>{compactCurrency(college.avgNetPrice)} net</span> : null}
                        <span>Added {formatDate(entry.addedAt.slice(0, 10), 'short')}</span>
                      </div>

                      {entry.notes ? <p className="t-xs muted mt-3 clamp-3">{entry.notes}</p> : null}
                    </Card>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      <Modal
        open={Boolean(editing)}
        onClose={() => setEditing(undefined)}
        title={editing ? COLLEGE_BY_ID.get(editing.collegeId)?.name ?? 'College' : ''}
        footer={
          editing ? (
            <>
              <Button
                variant="danger"
                icon="trash"
                onClick={() => {
                  removeCollegeEntry(editing.id);
                  setEditing(undefined);
                  toast('Removed from your list.', 'default');
                }}
              >
                Remove
              </Button>
              <Button variant="primary" onClick={() => setEditing(undefined)}>
                Done
              </Button>
            </>
          ) : null
        }
      >
        {editing ? (
          <div className="col g-4">
            <Field label="Stage">
              {(props) => (
                <select {...props} className="select" value={editing.stage} onChange={(e) => { updateCollegeEntry(editing.id, { stage: e.target.value as ListStage }); setEditing({ ...editing, stage: e.target.value as ListStage }); }}>
                  {STAGES.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label} — {s.description}
                    </option>
                  ))}
                </select>
              )}
            </Field>

            <Field label="Intended major here" hint="Can differ by college.">
              {(props) => (
                <select {...props} className="select" value={editing.intendedMajorId ?? ''} onChange={(e) => { updateCollegeEntry(editing.id, { intendedMajorId: e.target.value || undefined }); setEditing({ ...editing, intendedMajorId: e.target.value || undefined }); }}>
                  <option value="">Not decided</option>
                  {(COLLEGE_BY_ID.get(editing.collegeId)?.majors ?? MAJORS.map((m) => m.id)).map((m) => (
                    <option key={m} value={m}>
                      {MAJOR_BY_ID.get(m)?.name ?? m}
                    </option>
                  ))}
                </select>
              )}
            </Field>

            <Field label="Application round">
              {(props) => (
                <select {...props} className="select" value={editing.applicationRound ?? ''} onChange={(e) => { const v = (e.target.value || undefined) as CollegeListEntry['applicationRound']; updateCollegeEntry(editing.id, { applicationRound: v }); setEditing({ ...editing, applicationRound: v }); }}>
                  <option value="">Not decided</option>
                  {(COLLEGE_BY_ID.get(editing.collegeId)?.deadlines ?? []).map((d) => (
                    <option key={d.kind} value={d.kind}>
                      {d.kind} — {d.note}
                    </option>
                  ))}
                </select>
              )}
            </Field>

            <Field label="Decision" hint="Fill this in once you hear back.">
              {(props) => (
                <select {...props} className="select" value={editing.decision ?? ''} onChange={(e) => { const v = (e.target.value || undefined) as CollegeListEntry['decision']; updateCollegeEntry(editing.id, { decision: v }); setEditing({ ...editing, decision: v }); }}>
                  <option value="">No decision yet</option>
                  <option value="accepted">Accepted</option>
                  <option value="waitlisted">Waitlisted</option>
                  <option value="deferred">Deferred</option>
                  <option value="denied">Denied</option>
                  <option value="withdrawn">Withdrawn</option>
                </select>
              )}
            </Field>

            <Field label="Notes">
              {(props) => (
                <textarea {...props} className="textarea" value={editing.notes ?? ''} onChange={(e) => { updateCollegeEntry(editing.id, { notes: e.target.value }); setEditing({ ...editing, notes: e.target.value }); }} />
              )}
            </Field>

            <div>
              <p className="label mb-2">Application checklist</p>
              <div className="col g-1">
                {APPLICATION_TASKS.map((t) => (
                  <label key={t.id} className="row g-3 t-sm" style={{ cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={Boolean(editing.checklist[t.id])}
                      onChange={() => {
                        const next = { ...editing.checklist, [t.id]: !editing.checklist[t.id] };
                        updateCollegeEntry(editing.id, { checklist: next });
                        setEditing({ ...editing, checklist: next });
                      }}
                      style={{ accentColor: 'var(--accent)' }}
                    />
                    <span className={editing.checklist[t.id] ? 'subtle strike' : ''}>{t.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <Button variant="ghost" to={`/app/colleges/${editing.collegeId}`} iconRight="arrow-right">
              <Icon name="graduation" size={14} /> Open full profile
            </Button>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
