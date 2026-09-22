import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useEngine } from '@/store/useEngine';
import { useAppStore } from '@/store/useAppStore';
import { Button, Card, CheckItem, Notice } from '@/components/ui/primitives';
import { DataRow, PageHeader, SectionHeader } from '@/components/ui/shared';
import { ProvenanceChip } from '@/components/ui/Provenance';
import { ProgressRing } from '@/components/charts';
import { COLLEGE_BY_ID } from '@/data/colleges';
import { MAJOR_BY_ID } from '@/data/majors';
import { matchForCollege } from '@/domain/engine/collegeMatch';
import { APPLICATION_TASKS, TASK_GROUPS } from './tasks';
import { countLabel } from '@/lib/format';
import { formatDate, daysUntil, relativeDays } from '@/lib/date';
import { Icon } from '@/components/ui/Icon';
import type { CollegeDeadline, ListStage } from '@/domain/types';

/* Section 40 — one application, task by task. */

const STAGES: ListStage[] = ['exploring', 'considering', 'application-planning', 'applying', 'applied', 'decision'];
const DECISIONS = ['accepted', 'waitlisted', 'deferred', 'denied', 'withdrawn'] as const;

export function ApplicationDetail() {
  const { collegeId } = useParams<{ collegeId: string }>();
  const ctx = useEngine();
  const { state, updateCollegeEntry, toggleApplicationTask, toast } = useAppStore();

  const college = collegeId ? COLLEGE_BY_ID.get(collegeId) : undefined;
  const entry = state.collegeList.find((e) => e.collegeId === collegeId);
  const match = useMemo(() => (collegeId ? matchForCollege(ctx, collegeId) : undefined), [ctx, collegeId]);

  if (!college || !entry) {
    return (
      <div className="page">
        <Card pad="lg">
          <p className="t-sm subtle ta-center">
            That college is not on your list.{' '}
            <Link to="/app/colleges/list" className="c-accent">
              Open your college list
            </Link>
            .
          </p>
        </Card>
      </div>
    );
  }

  const done = APPLICATION_TASKS.filter((t) => entry.checklist[t.id]).length;
  const progress = Math.round((done / APPLICATION_TASKS.length) * 100);
  const essays = state.essays.filter((e) => e.collegeId === college.id);
  const round = entry.applicationRound;
  const roundDeadline = college.deadlines.find((d) => d.kind === round) ?? college.deadlines[0];
  const daysAway = roundDeadline?.date ? daysUntil(roundDeadline.date) : undefined;

  return (
    <div className="page">
      <PageHeader
        eyebrow="Application"
        title={college.shortName ?? college.name}
        description={`${college.city}, ${college.state} · ${college.control}`}
        back={{ to: '/app/applications', label: 'All applications' }}
        actions={
          <>
            <Button variant="ghost" icon="graduation" to={`/app/colleges/${college.id}`}>
              College profile
            </Button>
            <Button variant="ghost" icon="pen" to="/app/applications/essays">
              Essays
            </Button>
          </>
        }
      />

      <div className="split-aside">
        <div className="col g-4">
          <Card pad="md">
            <div className="row g-5 wrap items-center">
              <ProgressRing value={progress} size={84} stroke={8} label={`${done}/${APPLICATION_TASKS.length}`} ariaLabel={`${done} of ${APPLICATION_TASKS.length} tasks complete`} />
              <div className="grow">
                <h2 className="t-md w-600">Application checklist</h2>
                <p className="t-sm subtle mt-2">
                  {done === APPLICATION_TASKS.length
                    ? 'Everything ticked. Re-read the essay once more before you submit — that is the part a checklist cannot measure.'
                    : `${countLabel(APPLICATION_TASKS.length - done, 'task')} outstanding.`}
                </p>
              </div>
            </div>
          </Card>

          {TASK_GROUPS.map((group) => {
            const tasks = APPLICATION_TASKS.filter((t) => t.group === group.id);
            if (!tasks.length) return null;
            return (
              <Card key={group.id} pad="md">
                <SectionHeader title={group.label} />
                <div className="col g-2">
                  {tasks.map((t) => (
                    <CheckItem
                      key={t.id}
                      checked={Boolean(entry.checklist[t.id])}
                      onToggle={() => toggleApplicationTask(entry.id, t.id)}
                      label={t.label}
                    />
                  ))}
                </div>
                {group.id === 'testing' && college.testPolicy !== 'required' ? (
                  <p className="t-2xs faint mt-3">
                    {college.shortName ?? college.name} is listed as {college.testPolicy === 'blind' ? 'test-blind' : 'test-optional'} in our demo
                    data. Not submitting is a real option, not a compromise — but confirm the current policy on their site.
                  </p>
                ) : null}
                {group.id === 'financial' ? (
                  <Button size="sm" variant="ghost" to="/app/colleges/cost" iconRight="arrow-right" className="mt-3">
                    Financial planning
                  </Button>
                ) : null}
              </Card>
            );
          })}

          <Card pad="md">
            <SectionHeader
              title="Essays for this college"
              description="Supplements are where a generic application becomes obvious. Each one should say something only you could say about this college."
              action={
                <Button size="sm" variant="ghost" to="/app/applications/essays" iconRight="arrow-right">
                  Essay workshop
                </Button>
              }
            />
            {essays.length ? (
              <div className="col g-2">
                {essays.map((e) => (
                  <Link key={e.id} to={`/app/applications/essays/${e.id}`} className="row between g-3 card-link">
                    <span className="t-sm">{e.title}</span>
                    <span className="t-2xs faint mono">{e.body.trim().split(/\s+/).filter(Boolean).length} words</span>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="t-sm subtle">No drafts started for this college yet.</p>
            )}
          </Card>

          {match?.matchedPrograms.length ? (
            <Card pad="md">
              <SectionHeader title="What to write about, specifically" description="Programmes here that connect to your direction. Naming one concretely beats praising the college in general." />
              <ul className="col g-2">
                {match.matchedPrograms.map((p) => (
                  <li key={p.name} className="t-sm subtle">
                    • <span className="w-600">{p.name}</span> — {p.description}
                  </li>
                ))}
              </ul>
              <p className="t-2xs faint mt-3">
                Look these up properly before writing about them. A supplement that describes a programme inaccurately is worse than one that
                does not mention it.
              </p>
            </Card>
          ) : null}
        </div>

        <div className="col g-4">
          <Card pad="md">
            <h3 className="t-sm w-600">Stage</h3>
            <div className="col g-2 mt-3">
              {STAGES.map((s) => (
                <Button
                  key={s}
                  size="sm"
                  variant={entry.stage === s ? 'soft' : 'ghost'}
                  onClick={() => updateCollegeEntry(entry.id, { stage: s })}
                >
                  {s.replace(/-/g, ' ')}
                </Button>
              ))}
            </div>
          </Card>

          <Card pad="md">
            <h3 className="t-sm w-600">Application round</h3>
            <p className="t-2xs faint mt-1">Early rounds usually mean a binding or restrictive commitment. Read the terms before choosing one.</p>
            <div className="row g-2 mt-3 wrap">
              {college.deadlines.map((d: CollegeDeadline) => (
                <button
                  key={d.kind}
                  type="button"
                  className="chip chip-sm"
                  aria-pressed={round === d.kind}
                  onClick={() => updateCollegeEntry(entry.id, { applicationRound: d.kind })}
                >
                  {d.kind}
                </button>
              ))}
            </div>
            {roundDeadline ? (
              <div className="mt-4">
                <DataRow
                  label={roundDeadline.kind}
                  value={roundDeadline.date ? formatDate(roundDeadline.date, 'long') : 'No date published'}
                  note={
                    <span>
                      {daysAway !== undefined ? `${relativeDays(daysAway)}. ` : ''}
                      {roundDeadline.note ?? ''}
                    </span>
                  }
                />
                <div className="row g-2 mt-2 items-center">
                  <ProvenanceChip provenance={college.provenance} compact />
                  <span className="t-2xs faint">Confirm on the college&rsquo;s own admissions page.</span>
                </div>
              </div>
            ) : null}
            {college.admissionsUrl ? (
              <Button size="sm" variant="ghost" href={college.admissionsUrl} iconRight="external" className="mt-3">
                Admissions site
              </Button>
            ) : null}
          </Card>

          <Card pad="md">
            <h3 className="t-sm w-600">Intended major on this application</h3>
            <select
              className="select mt-3"
              value={entry.intendedMajorId ?? ''}
              onChange={(e) => updateCollegeEntry(entry.id, { intendedMajorId: e.target.value || undefined })}
              aria-label="Intended major"
            >
              <option value="">Undecided</option>
              {college.majors.map((m) => (
                <option key={m} value={m}>
                  {MAJOR_BY_ID.get(m)?.name ?? m}
                </option>
              ))}
            </select>
            <p className="t-2xs faint mt-2">
              Applying undecided is not a weakness at most colleges. Where a major is competitive for admission, it can matter — check whether
              this one admits by major.
            </p>
          </Card>

          <Card pad="md">
            <h3 className="t-sm w-600">Decision</h3>
            <div className="row g-2 mt-3 wrap">
              {DECISIONS.map((d) => (
                <button
                  key={d}
                  type="button"
                  className="chip chip-sm"
                  aria-pressed={entry.decision === d}
                  onClick={() => {
                    updateCollegeEntry(entry.id, { decision: entry.decision === d ? undefined : d, stage: 'decision' });
                    toast('Decision recorded.', 'default');
                  }}
                >
                  {d}
                </button>
              ))}
            </div>
          </Card>

          <Card pad="md">
            <h3 className="t-sm w-600">Your notes</h3>
            <textarea
              className="input textarea mt-3"
              rows={5}
              value={entry.notes ?? ''}
              onChange={(e) => updateCollegeEntry(entry.id, { notes: e.target.value })}
              placeholder="What you liked, who you spoke to, what you still need to find out."
              aria-label="Notes about this application"
            />
          </Card>
        </div>
      </div>

      <Notice tone="warn" icon="alert" className="mt-6">
        <span className="w-600">Pathway AI does not submit applications.</span> Everything here is a checklist you maintain. The submission itself
        happens on the Common Application or the college&rsquo;s own portal, and only you can do it.
      </Notice>

      <p className="t-2xs faint mt-4 row g-2">
        <Icon name="info" size={12} className="mt-1 shrink-0" />
        <span>
          Deadline and policy data on this page is demo data. A shipped version would verify each date against the college directly and show when
          it was last checked.
        </span>
      </p>
    </div>
  );
}
