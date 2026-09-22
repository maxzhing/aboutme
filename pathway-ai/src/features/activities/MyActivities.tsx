import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useEngine } from '@/store/useEngine';
import { useAppStore } from '@/store/useAppStore';
import { Badge, Button, Card, Field, Modal, Notice, Switch } from '@/components/ui/primitives';
import { PageHeader, SectionHeader, Stat } from '@/components/ui/shared';
import { BarChart } from '@/components/charts';
import { analyseActivityDepth } from '@/domain/engine/projects';
import { countLabel, sum } from '@/lib/format';
import { downloadCSV } from '@/lib/export';
import { Icon } from '@/components/ui/Icon';
import type { ActivityCategory, GradeLevel, StudentActivity } from '@/domain/types';

/* Section 24 — the student's own activity record. Nothing here is invented. */

const CATEGORIES: ActivityCategory[] = [
  'club', 'sport', 'music', 'art', 'research', 'volunteering', 'competition',
  'leadership', 'job', 'internship', 'project', 'community', 'family', 'other',
];

const GRADES: GradeLevel[] = [9, 10, 11, 12];

const EMPTY = {
  name: '',
  category: 'club' as ActivityCategory,
  organization: '',
  role: '',
  gradesInvolved: [] as GradeLevel[],
  hoursPerWeek: '',
  weeksPerYear: '',
  description: '',
  accomplishments: [] as string[],
  leadership: false,
  personalConnection: '',
  onApplicationList: true,
};

export function MyActivities() {
  const ctx = useEngine();
  const { state, addActivity, updateActivity, removeActivity, toast } = useAppStore();
  const [editing, setEditing] = useState<StudentActivity | undefined>(undefined);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [newAccomplishment, setNewAccomplishment] = useState('');

  const activities = state.profile.activities;
  const totalHours = sum(activities.map((a) => a.hoursPerWeek ?? 0));
  const leadershipCount = activities.filter((a) => a.leadership).length;
  const multiYear = activities.filter((a) => a.gradesInvolved.length >= 2).length;

  const depthByActivity = useMemo(
    () => new Map(activities.map((a) => [a.id, analyseActivityDepth(ctx, a.id)])),
    [ctx, activities],
  );

  const hoursChart = activities
    .filter((a) => a.hoursPerWeek)
    .sort((a, b) => (b.hoursPerWeek ?? 0) - (a.hoursPerWeek ?? 0))
    .map((a) => ({ label: a.name, value: a.hoursPerWeek ?? 0, note: `${countLabel(a.gradesInvolved.length, 'year')}` }));

  function openNew() {
    setEditing(undefined);
    setForm(EMPTY);
    setOpen(true);
  }

  function openEdit(a: StudentActivity) {
    setEditing(a);
    setForm({
      name: a.name,
      category: a.category,
      organization: a.organization ?? '',
      role: a.role ?? '',
      gradesInvolved: a.gradesInvolved,
      hoursPerWeek: a.hoursPerWeek !== undefined ? String(a.hoursPerWeek) : '',
      weeksPerYear: a.weeksPerYear !== undefined ? String(a.weeksPerYear) : '',
      description: a.description ?? '',
      accomplishments: a.accomplishments,
      leadership: a.leadership ?? false,
      personalConnection: a.personalConnection ?? '',
      onApplicationList: a.onApplicationList,
    });
    setOpen(true);
  }

  function save() {
    if (!form.name.trim()) {
      toast('An activity needs a name.', 'warn');
      return;
    }
    const payload = {
      name: form.name.trim(),
      category: form.category,
      organization: form.organization.trim() || undefined,
      role: form.role.trim() || undefined,
      gradesInvolved: form.gradesInvolved,
      hoursPerWeek: form.hoursPerWeek ? Number(form.hoursPerWeek) : undefined,
      weeksPerYear: form.weeksPerYear ? Number(form.weeksPerYear) : undefined,
      description: form.description.trim() || undefined,
      accomplishments: form.accomplishments,
      leadership: form.leadership,
      personalConnection: form.personalConnection.trim() || undefined,
      onApplicationList: form.onApplicationList,
    };
    if (editing) {
      updateActivity(editing.id, payload);
      toast('Activity updated.', 'ok');
    } else {
      addActivity(payload);
      toast('Activity added. Recommendations across the app have been recalculated.', 'ok');
    }
    setOpen(false);
  }

  function exportActivities() {
    downloadCSV(
      'pathway-activities.csv',
      activities.map((a) => ({
        Name: a.name,
        Category: a.category,
        Organization: a.organization ?? '',
        Role: a.role ?? '',
        Grades: a.gradesInvolved.join('; '),
        'Hours per week': a.hoursPerWeek ?? '',
        'Weeks per year': a.weeksPerYear ?? '',
        Leadership: a.leadership ? 'yes' : 'no',
        Description: a.description ?? '',
        Accomplishments: a.accomplishments.join('; '),
        'On application list': a.onApplicationList ? 'yes' : 'no',
      })),
    );
    toast('Activities exported as CSV.', 'ok');
  }

  return (
    <div className="page">
      <PageHeader
        eyebrow="Beyond class"
        title="My activities"
        description="Everything here is yours — written by you, edited by you. Pathway AI will suggest how to describe what you did more clearly, but it will never add an accomplishment you did not tell it about."
        back={{ to: '/app/activities', label: 'Activities' }}
        actions={
          <>
            <Button variant="ghost" icon="download" onClick={exportActivities} disabled={!activities.length}>
              Export
            </Button>
            <Button variant="primary" icon="plus" onClick={openNew}>
              Add an activity
            </Button>
          </>
        }
      />

      {activities.length ? (
        <>
          <div className="row g-5 wrap">
            <Stat label="Activities" value={String(activities.length)} />
            <Stat label="Hours a week" value={String(totalHours)} tone={totalHours > 25 ? 'var(--warn)' : undefined} />
            <Stat label="Multi-year" value={`${multiYear} of ${activities.length}`} tone={multiYear ? 'var(--ok)' : undefined} />
            <Stat label="With a leadership role" value={String(leadershipCount)} />
          </div>

          {totalHours > 25 ? (
            <Notice tone="warn" icon="alert" className="mt-4">
              {totalHours} hours a week outside class is a lot alongside school. That is workable for some people and unsustainable for others —
              if your grades or your sleep are suffering, dropping the thing you care about least is a better move than pushing through.
            </Notice>
          ) : null}

          {hoursChart.length > 1 ? (
            <Card pad="md" className="mt-6">
              <SectionHeader title="Where your time goes" description="Hours per week, largest first. The shape of this is usually more informative than the total." />
              <BarChart data={hoursChart} ariaLabel="Hours per week by activity" unit="h" maxValue={Math.max(...hoursChart.map((h) => h.value), 10)} />
            </Card>
          ) : null}

          <SectionHeader title="Your activities" className="mt-8" />
          <div className="col g-3">
            {activities.map((a) => {
              const depth = depthByActivity.get(a.id);
              return (
                <Card key={a.id} pad="md" hover>
                  <div className="row between g-3 items-start wrap">
                    <div className="grow" style={{ minWidth: 0 }}>
                      <div className="row g-2 items-center wrap">
                        <h3 className="t-md w-600">{a.name}</h3>
                        <Badge>{a.category}</Badge>
                        {a.leadership ? <Badge tone="accent">Leadership</Badge> : null}
                        {!a.onApplicationList ? <Badge>Not on application list</Badge> : null}
                      </div>
                      <p className="t-2xs subtle mt-1">
                        {a.role ? `${a.role}` : 'No role recorded'}
                        {a.organization ? ` · ${a.organization}` : ''}
                        {a.gradesInvolved.length ? ` · grades ${a.gradesInvolved.join(', ')}` : ''}
                        {a.hoursPerWeek ? ` · ${a.hoursPerWeek}h/week` : ''}
                        {a.weeksPerYear ? ` for ${a.weeksPerYear} weeks` : ''}
                      </p>
                    </div>
                    <div className="row g-2">
                      <Button size="sm" variant="ghost" icon="edit" aria-label={`Edit ${a.name}`} onClick={() => openEdit(a)} />
                      <Button
                        size="sm"
                        variant="ghost"
                        icon="trash"
                        aria-label={`Delete ${a.name}`}
                        onClick={() => {
                          removeActivity(a.id);
                          toast(`${a.name} removed.`, 'default');
                        }}
                      />
                    </div>
                  </div>

                  {a.description ? <p className="t-sm muted mt-3">{a.description}</p> : <p className="t-xs faint mt-3">No description yet — worth writing one while you remember the detail.</p>}

                  {a.accomplishments.length ? (
                    <ul className="col g-1 mt-3">
                      {a.accomplishments.map((acc) => (
                        <li key={acc} className="t-xs subtle row g-2">
                          <Icon name="check" size={12} className="c-ok mt-1 shrink-0" />
                          <span>{acc}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}

                  {a.personalConnection ? (
                    <p className="t-xs mt-3" style={{ fontStyle: 'italic' }}>
                      &ldquo;{a.personalConnection}&rdquo;
                    </p>
                  ) : null}

                  {depth ? (
                    <div className="row between g-3 mt-4 wrap items-center">
                      <p className="t-2xs subtle">{depth.summary}</p>
                      <Button size="sm" variant="ghost" to={`/app/activities/depth/${a.id}`} iconRight="chevron-right">
                        Depth analysis
                      </Button>
                    </div>
                  ) : null}
                </Card>
              );
            })}
          </div>
        </>
      ) : (
        <Card pad="lg">
          <p className="t-sm subtle ta-center">
            Nothing recorded yet. Add what you already do — clubs, a job, caring for a sibling, a thing you build at home. All of it counts, and
            the app cannot help you plan around commitments it does not know about.
          </p>
          <div className="row center mt-4">
            <Button icon="plus" onClick={openNew}>
              Add your first activity
            </Button>
          </div>
        </Card>
      )}

      <Card pad="md" className="mt-6">
        <p className="t-sm row g-2">
          <Icon name="shield" size={15} className="c-accent shrink-0 mt-1" />
          <span>
            <span className="w-600">Your words stay yours.</span> Pathway AI does not write accomplishments, invent roles or inflate hours. When
            it helps with an application description it works only from what you have entered here — you can see exactly what changed, and you can
            reject it.
          </span>
        </p>
        <Button size="sm" variant="ghost" to="/app/applications/activity-list" iconRight="arrow-right" className="mt-3">
          See how these appear on the application
        </Button>
      </Card>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? `Edit ${editing.name}` : 'Add an activity'}
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={save}>
              {editing ? 'Save changes' : 'Add activity'}
            </Button>
          </>
        }
      >
        <div className="col g-4">
          <div className="row g-3 wrap">
            <Field label="Name" required>
              {(p) => <input {...p} className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Robotics Team" />}
            </Field>
            <Field label="Category">
              {(p) => (
                <select {...p} className="select" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as ActivityCategory })}>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              )}
            </Field>
          </div>

          <div className="row g-3 wrap">
            <Field label="Organisation" hint="School, club, employer — optional.">
              {(p) => <input {...p} className="input" value={form.organization} onChange={(e) => setForm({ ...form, organization: e.target.value })} />}
            </Field>
            <Field label="Your role" hint="What you actually did, in your words.">
              {(p) => <input {...p} className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} placeholder="Build lead" />}
            </Field>
          </div>

          <div>
            <p className="label">Grades involved</p>
            <div className="row g-2 wrap">
              {GRADES.map((g) => (
                <button
                  key={g}
                  type="button"
                  className="chip chip-sm"
                  aria-pressed={form.gradesInvolved.includes(g)}
                  onClick={() =>
                    setForm({
                      ...form,
                      gradesInvolved: form.gradesInvolved.includes(g)
                        ? form.gradesInvolved.filter((x) => x !== g)
                        : [...form.gradesInvolved, g].sort((a, b) => a - b),
                    })
                  }
                >
                  Grade {g}
                </button>
              ))}
            </div>
          </div>

          <div className="row g-3 wrap">
            <Field label="Hours per week" hint="Roughly. During the season if it is seasonal.">
              {(p) => <input {...p} className="input" inputMode="numeric" value={form.hoursPerWeek} onChange={(e) => setForm({ ...form, hoursPerWeek: e.target.value.replace(/[^0-9]/g, '') })} />}
            </Field>
            <Field label="Weeks per year" hint="A season is often 12–16; a year-round club closer to 36.">
              {(p) => <input {...p} className="input" inputMode="numeric" value={form.weeksPerYear} onChange={(e) => setForm({ ...form, weeksPerYear: e.target.value.replace(/[^0-9]/g, '') })} />}
            </Field>
          </div>

          <Field label="What you did" hint="Plain description. This is the raw material for your application list later.">
            {(p) => <textarea {...p} className="input textarea" rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />}
          </Field>

          <div>
            <p className="label">Accomplishments</p>
            <p className="hint mb-2">Specific things that happened. Only add what is true — an invented line here becomes a lie on an application.</p>
            {form.accomplishments.length ? (
              <div className="col g-2 mb-3">
                {form.accomplishments.map((acc, i) => (
                  <div key={acc} className="row between g-2">
                    <span className="t-sm">{acc}</span>
                    <button
                      type="button"
                      className="subtle"
                      aria-label={`Remove ${acc}`}
                      onClick={() => setForm({ ...form, accomplishments: form.accomplishments.filter((_, x) => x !== i) })}
                    >
                      <Icon name="x" size={13} />
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
            <div className="row g-2">
              <input
                className="input grow"
                value={newAccomplishment}
                onChange={(e) => setNewAccomplishment(e.target.value)}
                placeholder="Rebuilt the drivetrain, cutting cycle time by a third"
                aria-label="New accomplishment"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newAccomplishment.trim()) {
                    e.preventDefault();
                    setForm({ ...form, accomplishments: [...form.accomplishments, newAccomplishment.trim()] });
                    setNewAccomplishment('');
                  }
                }}
              />
              <Button
                variant="ghost"
                icon="plus"
                onClick={() => {
                  if (!newAccomplishment.trim()) return;
                  setForm({ ...form, accomplishments: [...form.accomplishments, newAccomplishment.trim()] });
                  setNewAccomplishment('');
                }}
              >
                Add
              </Button>
            </div>
          </div>

          <Field label="Why it matters to you" hint="Optional, and only for you — this never goes onto an application automatically. It is useful when you write essays later.">
            {(p) => <textarea {...p} className="input textarea" rows={3} value={form.personalConnection} onChange={(e) => setForm({ ...form, personalConnection: e.target.value })} />}
          </Field>

          <Switch checked={form.leadership} onChange={(v) => setForm({ ...form, leadership: v })} label="I hold a leadership role here" />
          <Switch
            checked={form.onApplicationList}
            onChange={(v) => setForm({ ...form, onApplicationList: v })}
            label="Include on my application activity list"
            description="You can change this later when you see how the list reads as a whole."
          />
        </div>
      </Modal>

      <p className="t-2xs faint mt-6">
        <Link to="/app/activities" className="c-accent">
          Back to the activity finder
        </Link>
      </p>
    </div>
  );
}
