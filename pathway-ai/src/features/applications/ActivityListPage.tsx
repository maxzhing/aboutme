import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useEngine } from '@/store/useEngine';
import { useAppStore } from '@/store/useAppStore';
import { Badge, Button, Card, Notice, Switch } from '@/components/ui/primitives';
import { PageHeader, SectionHeader, Stat } from '@/components/ui/shared';
import { tightenActivityDescription } from '@/domain/engine/writing';
import { countLabel } from '@/lib/format';
import { downloadCSV } from '@/lib/export';
import { Icon } from '@/components/ui/Icon';

/* Section 31 — how the activity list actually reads on an application. */

const CHAR_LIMIT = 150;
const ROLE_LIMIT = 50;
const MAX_SLOTS = 10;

export function ActivityListPage() {
  const ctx = useEngine();
  const { state, updateActivity, toast } = useAppStore();

  const all = state.profile.activities;
  const included = all.filter((a) => a.onApplicationList);

  const suggestions = useMemo(
    () => new Map(included.map((a) => [a.id, tightenActivityDescription(ctx, a.id, CHAR_LIMIT)])),
    [ctx, included],
  );

  const overLimit = included.filter((a) => (a.description ?? '').length > CHAR_LIMIT);
  const missingDescription = included.filter((a) => !a.description?.trim());

  function exportList() {
    downloadCSV(
      'pathway-application-activities.csv',
      included.map((a, i) => ({
        Position: i + 1,
        Activity: a.name,
        Category: a.category,
        Role: a.role ?? '',
        Organization: a.organization ?? '',
        Grades: a.gradesInvolved.join('; '),
        'Hours per week': a.hoursPerWeek ?? '',
        'Weeks per year': a.weeksPerYear ?? '',
        Description: a.description ?? '',
        'Description length': (a.description ?? '').length,
      })),
    );
    toast('Activity list exported as CSV.', 'ok');
  }

  return (
    <div className="page">
      <PageHeader
        eyebrow="Applications"
        title="Activity list"
        description="How your activities read in the space an application actually gives you — roughly 150 characters each, ten slots, no room for anything vague."
        back={{ to: '/app/applications', label: 'Applications' }}
        actions={
          <>
            <Button variant="ghost" icon="download" onClick={exportList} disabled={!included.length}>
              Export
            </Button>
            <Button variant="ghost" icon="edit" to="/app/activities/mine">
              Edit activities
            </Button>
          </>
        }
      />

      <Notice tone="info" icon="info">
        Character limits vary between applications; the Common Application currently allows around 150 characters for a description and 50 for a
        position. Treat the counts here as a guide and confirm the real limits on the application you are filling in.
      </Notice>

      {all.length ? (
        <>
          <div className="row g-5 wrap mt-4">
            <Stat label="On the list" value={`${included.length} of ${MAX_SLOTS}`} tone={included.length > MAX_SLOTS ? 'var(--danger)' : undefined} />
            <Stat label="Over the character limit" value={String(overLimit.length)} tone={overLimit.length ? 'var(--warn)' : undefined} />
            <Stat label="Missing a description" value={String(missingDescription.length)} tone={missingDescription.length ? 'var(--warn)' : undefined} />
          </div>

          {included.length > MAX_SLOTS ? (
            <Notice tone="warn" icon="alert" className="mt-4">
              You have {included.length} activities selected for {MAX_SLOTS} slots. Cut the weakest — and the weakest is usually the one you did
              for one term and cannot say anything specific about.
            </Notice>
          ) : null}

          <SectionHeader
            title="Ordering matters"
            className="mt-8"
            description="Readers spend under a minute on this. Put the thing you care most about first, not the thing that sounds most impressive."
          />

          <div className="col g-3">
            {included.map((a, i) => {
              const suggestion = suggestions.get(a.id);
              const desc = a.description ?? '';
              const over = desc.length > CHAR_LIMIT;
              return (
                <Card key={a.id} pad="md">
                  <div className="row between g-3 items-start wrap">
                    <div className="grow" style={{ minWidth: 0 }}>
                      <div className="row g-2 items-center wrap">
                        <span className="badge mono">{i + 1}</span>
                        <h3 className="t-sm w-600">{a.name}</h3>
                        <Badge>{a.category}</Badge>
                        {a.leadership ? <Badge tone="accent">Leadership</Badge> : null}
                      </div>
                      <p className="t-2xs subtle mt-1">
                        {a.role ?? 'No position recorded'}
                        {a.organization ? ` · ${a.organization}` : ''} · grades {a.gradesInvolved.join(', ') || '—'} ·{' '}
                        {a.hoursPerWeek ?? '—'}h/week, {a.weeksPerYear ?? '—'} weeks
                      </p>
                    </div>
                    <Switch
                      checked={a.onApplicationList}
                      onChange={(v) => updateActivity(a.id, { onApplicationList: v })}
                      label="On the list"
                    />
                  </div>

                  <div className="mt-4">
                    <div className="row between g-2 items-center">
                      <p className="t-2xs eyebrow">Description</p>
                      <span className={`t-2xs mono${over ? ' c-danger' : ' faint'}`}>
                        {desc.length}/{CHAR_LIMIT}
                      </span>
                    </div>
                    {desc ? (
                      <p className="t-sm mt-2" style={{ fontFamily: 'var(--font-mono)', whiteSpace: 'pre-wrap' }}>
                        {desc}
                      </p>
                    ) : (
                      <p className="t-sm c-warn mt-2">
                        <Icon name="alert" size={12} /> Nothing written. An empty slot is worse than a short one.
                      </p>
                    )}
                    {(a.role ?? '').length > ROLE_LIMIT ? (
                      <p className="t-2xs c-warn mt-2">Position is {(a.role ?? '').length} characters — over the usual {ROLE_LIMIT} limit.</p>
                    ) : null}
                  </div>

                  {suggestion && suggestion.tightened !== suggestion.original ? (
                    <div className="mt-4">
                      <p className="t-2xs eyebrow mb-2">Tightened to {suggestion.characterCount} characters</p>
                      <p className="t-sm subtle" style={{ fontFamily: 'var(--font-mono)' }}>
                        {suggestion.tightened}
                      </p>
                      {suggestion.notes.length ? (
                        <ul className="col g-1 mt-2">
                          {suggestion.notes.map((n) => (
                            <li key={n} className="t-2xs faint">
                              • {n}
                            </li>
                          ))}
                        </ul>
                      ) : null}
                      <Button
                        size="sm"
                        variant="ghost"
                        icon="check"
                        className="mt-2"
                        onClick={() => {
                          updateActivity(a.id, { description: suggestion.tightened });
                          toast('Description updated. Edit it further whenever you like.', 'ok');
                        }}
                      >
                        Use this version
                      </Button>
                      <p className="t-2xs faint mt-2">
                        Compression only — filler removed, your phrasing kept. No claim, number or outcome has been added.
                      </p>
                    </div>
                  ) : null}

                  {a.accomplishments.length ? (
                    <details className="mt-4">
                      <summary className="t-xs c-accent" style={{ cursor: 'pointer' }}>
                        Accomplishments you recorded ({a.accomplishments.length})
                      </summary>
                      <ul className="col g-1 mt-2">
                        {a.accomplishments.map((acc) => (
                          <li key={acc} className="t-xs subtle">
                            • {acc}
                          </li>
                        ))}
                      </ul>
                      <p className="t-2xs faint mt-2">
                        These do not appear on the application automatically. If one belongs in the 150 characters, put it there yourself.
                      </p>
                    </details>
                  ) : null}
                </Card>
              );
            })}
          </div>

          {all.length > included.length ? (
            <Card pad="md" className="mt-6">
              <SectionHeader title="Not on the list" description="Excluded activities. Add one back if the list has room and it says something the others do not." />
              <div className="col g-2">
                {all
                  .filter((a) => !a.onApplicationList)
                  .map((a) => (
                    <div key={a.id} className="row between g-3 items-center">
                      <span className="t-sm subtle">{a.name}</span>
                      <Button size="sm" variant="ghost" icon="plus" onClick={() => updateActivity(a.id, { onApplicationList: true })}>
                        Add
                      </Button>
                    </div>
                  ))}
              </div>
            </Card>
          ) : null}

          <Card pad="md" className="mt-6">
            <SectionHeader title="What a strong entry does" description="In 150 characters there is room for exactly one of these things done well." />
            <div className="grid-fit">
              {[
                { title: 'Names the specific thing', body: '"Rebuilt the drivetrain" beats "contributed to the robotics team".' },
                { title: 'Uses a number that means something', body: 'Not hours logged — the size of what you made, taught, raised or ran.' },
                { title: 'Shows what changed because you were there', body: 'The test is whether the sentence would be false if someone else had held the role.' },
                { title: 'Avoids adjectives', body: 'Every "passionate", "dedicated" and "hard-working" is characters that could have been a fact.' },
              ].map((c) => (
                <div key={c.title} className="col g-2">
                  <p className="t-sm w-600">{c.title}</p>
                  <p className="t-xs subtle">{c.body}</p>
                </div>
              ))}
            </div>
          </Card>
        </>
      ) : (
        <Card pad="lg" className="mt-4">
          <p className="t-sm subtle ta-center">
            No activities recorded yet.{' '}
            <Link to="/app/activities/mine" className="c-accent">
              Add what you do
            </Link>{' '}
            and this page will show how each one reads in the space an application gives you.
          </p>
        </Card>
      )}

      <p className="t-2xs faint mt-6 row g-2">
        <Icon name="shield" size={12} className="mt-1 shrink-0" />
        <span>
          Every word on this page came from you. Pathway AI compresses; it does not embellish, and it will not add an accomplishment you did not
          record. {countLabel(included.length, 'activity', 'activities')} currently selected.
        </span>
      </p>
    </div>
  );
}
