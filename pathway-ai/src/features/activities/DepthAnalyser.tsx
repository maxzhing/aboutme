import { useMemo } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useEngine } from '@/store/useEngine';
import { useAppStore } from '@/store/useAppStore';
import { Badge, Button, Card, Notice } from '@/components/ui/primitives';
import { PageHeader, SectionHeader } from '@/components/ui/shared';
import { AIGuidanceNote } from '@/components/ui/Provenance';
import { ProgressRing } from '@/components/charts';
import { analyseActivityDepth } from '@/domain/engine/projects';
import { tightenActivityDescription } from '@/domain/engine/writing';
import { countLabel } from '@/lib/format';

/* Section 25 — depth over breadth, made concrete. */

const STATE_TONE: Record<string, 'ok' | 'accent' | 'warn' | 'default'> = {
  strong: 'ok',
  present: 'accent',
  thin: 'warn',
  absent: 'default',
};

const EFFORT_LABEL: Record<string, string> = {
  small: 'a few hours',
  medium: 'a few weekends',
  large: 'a term or more',
};

export function DepthAnalyser() {
  const { activityId } = useParams<{ activityId: string }>();
  const navigate = useNavigate();
  const ctx = useEngine();
  const { state, updateActivity, toast } = useAppStore();

  const activities = state.profile.activities;
  const selectedId = activityId ?? activities[0]?.id;
  const analysis = useMemo(() => (selectedId ? analyseActivityDepth(ctx, selectedId) : undefined), [ctx, selectedId]);
  const activity = activities.find((a) => a.id === selectedId);
  const tightened = useMemo(
    () => (selectedId && activity?.description ? tightenActivityDescription(ctx, selectedId) : undefined),
    [ctx, selectedId, activity?.description],
  );

  if (!activities.length) {
    return (
      <div className="page">
        <PageHeader eyebrow="Beyond class" title="Depth analysis" back={{ to: '/app/activities', label: 'Activities' }} />
        <Card pad="lg">
          <p className="t-sm subtle ta-center">
            Nothing to analyse yet.{' '}
            <Link to="/app/activities/mine" className="c-accent">
              Add what you already do
            </Link>{' '}
            and this will tell you where each one is deep and where it is thin.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="page">
      <PageHeader
        eyebrow="Beyond class"
        title="Depth analysis"
        description="Colleges read depth, initiative and impact rather than a count of activities. This reads each of yours against those, and says what is actually missing."
        back={{ to: '/app/activities', label: 'Activities' }}
      />

      <Card pad="md">
        <p className="t-2xs eyebrow mb-3">Choose an activity</p>
        <div className="row g-2 wrap">
          {activities.map((a) => (
            <button
              key={a.id}
              type="button"
              className="chip chip-sm"
              aria-pressed={a.id === selectedId}
              onClick={() => navigate(`/app/activities/depth/${a.id}`)}
            >
              {a.name}
            </button>
          ))}
        </div>
      </Card>

      {analysis && activity ? (
        <>
          <div className="split-aside mt-4">
            <div className="col g-4">
              <Card pad="md">
                <div className="row g-4 items-center wrap">
                  <ProgressRing
                    value={analysis.depthScore}
                    size={92}
                    stroke={8}
                    label={String(Math.round(analysis.depthScore))}
                    sublabel="depth"
                    tone={analysis.depthScore >= 70 ? 'var(--ok)' : analysis.depthScore >= 45 ? 'var(--accent)' : 'var(--warn)'}
                    ariaLabel={`Depth reading ${Math.round(analysis.depthScore)} out of 100`}
                  />
                  <div className="grow">
                    <h2 className="t-lg w-600">{activity.name}</h2>
                    <p className="t-sm subtle mt-2">{analysis.summary}</p>
                  </div>
                </div>
                <p className="t-2xs faint mt-4">
                  This number describes the record you have entered, not the value of what you did. An activity that matters to you and shows up
                  thin here usually just needs writing up properly.
                </p>
              </Card>

              <Card pad="md">
                <SectionHeader title="Dimension by dimension" description="What reads as deep, and what does not." />
                <div className="col g-3">
                  {analysis.dimensions.map((d) => (
                    <div key={d.label} className="row between g-3 items-start wrap">
                      <div className="grow" style={{ minWidth: 0 }}>
                        <p className="t-sm w-600">{d.label}</p>
                        <p className="t-xs subtle mt-1">{d.note}</p>
                      </div>
                      <Badge tone={STATE_TONE[d.state]}>{d.state}</Badge>
                    </div>
                  ))}
                </div>
              </Card>

              <Card pad="md">
                <SectionHeader
                  title="Ways to take this further"
                  description="Rooted in what you are already doing. You will not find 'join another club' here — adding a sixth shallow activity is the opposite of what this page is for."
                />
                <div className="col g-3">
                  {analysis.deepeningIdeas.map((idea) => (
                    <div key={idea.title} className="card card-pad-sm">
                      <div className="row between g-2 items-start wrap">
                        <p className="t-sm w-600">{idea.title}</p>
                        <Badge>{EFFORT_LABEL[idea.effort] ?? idea.effort}</Badge>
                      </div>
                      <p className="t-xs subtle mt-2">{idea.why}</p>
                    </div>
                  ))}
                  {!analysis.deepeningIdeas.length ? (
                    <p className="t-sm subtle">
                      Nothing obvious to add — this one already reads as deep. The useful question now is whether it still interests you, not how
                      to extend it further.
                    </p>
                  ) : null}
                </div>
              </Card>

              {tightened ? (
                <Card pad="md">
                  <SectionHeader
                    title="How this would read on an application"
                    description="Common App gives you 150 characters. This is your own description compressed — nothing added, nothing invented."
                  />
                  <div className="col g-3">
                    <div>
                      <p className="t-2xs eyebrow mb-2">Your words</p>
                      <p className="t-sm subtle">{tightened.original}</p>
                    </div>
                    <div>
                      <p className="t-2xs eyebrow mb-2">Tightened to {tightened.characterCount} characters</p>
                      <p className="t-sm" style={{ fontFamily: 'var(--font-mono)' }}>
                        {tightened.tightened}
                      </p>
                    </div>
                    {tightened.notes.length ? (
                      <ul className="col g-1">
                        {tightened.notes.map((n) => (
                          <li key={n} className="t-2xs subtle">
                            • {n}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    <div className="row g-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        icon="check"
                        onClick={() => {
                          updateActivity(activity.id, { description: tightened.tightened });
                          toast('Description replaced with the tightened version. You can still edit it.', 'ok');
                        }}
                      >
                        Use the tightened version
                      </Button>
                      <Button size="sm" variant="ghost" to="/app/activities/mine">
                        Edit it myself
                      </Button>
                    </div>
                  </div>
                  <p className="t-2xs faint mt-3">
                    This only removes filler and condenses your phrasing. It never adds a claim, a number or an outcome you did not write.
                  </p>
                </Card>
              ) : (
                <Card pad="md">
                  <p className="t-sm subtle">
                    No description written for this activity yet.{' '}
                    <Link to="/app/activities/mine" className="c-accent">
                      Write one
                    </Link>{' '}
                    and we can show you how it would read in the 150 characters an application gives you.
                  </p>
                </Card>
              )}
            </div>

            <div className="col g-4">
              <Card pad="md">
                <h3 className="t-sm w-600">What you recorded</h3>
                <div className="col g-2 mt-3 t-xs subtle">
                  <div className="row between g-2">
                    <span>Years involved</span>
                    <span className="mono">{activity.gradesInvolved.length || '—'}</span>
                  </div>
                  <div className="row between g-2">
                    <span>Hours a week</span>
                    <span className="mono">{activity.hoursPerWeek ?? '—'}</span>
                  </div>
                  <div className="row between g-2">
                    <span>Weeks a year</span>
                    <span className="mono">{activity.weeksPerYear ?? '—'}</span>
                  </div>
                  <div className="row between g-2">
                    <span>Accomplishments listed</span>
                    <span className="mono">{activity.accomplishments.length}</span>
                  </div>
                  <div className="row between g-2">
                    <span>Leadership role</span>
                    <span className="mono">{activity.leadership ? 'yes' : 'no'}</span>
                  </div>
                </div>
                <Button size="sm" variant="ghost" to="/app/activities/mine" icon="edit" className="mt-4">
                  Edit this activity
                </Button>
              </Card>

              <Card pad="md">
                <h3 className="t-sm w-600">Across everything</h3>
                <p className="t-xs subtle mt-2">
                  {countLabel(activities.length, 'activity', 'activities')} recorded,{' '}
                  {countLabel(activities.filter((a) => a.gradesInvolved.length >= 2).length, 'multi-year commitment')}.
                </p>
                <p className="t-2xs faint mt-3">
                  A list of two or three things you have done for years, with something real to show for them, reads better than eight you joined
                  last autumn. That is not a trick — it is simply what sustained interest looks like on paper.
                </p>
              </Card>

              <Card pad="md">
                <h3 className="t-sm w-600">If nothing here excites you</h3>
                <p className="t-xs subtle mt-2">
                  That is worth taking seriously rather than working around. A self-directed project is often the strongest option available to a
                  student whose school offers little — and it is entirely within your control.
                </p>
                <Button size="sm" variant="ghost" to="/app/projects" iconRight="arrow-right" className="mt-3">
                  Project studio
                </Button>
              </Card>
            </div>
          </div>

          <AIGuidanceNote>
            The depth reading is computed from what you entered: years, hours, role, accomplishments and how you described it. It is a description
            of your record, not an assessment of you, and it carries no weight with any admissions office.
          </AIGuidanceNote>
        </>
      ) : (
        <Card pad="lg" className="mt-4">
          <p className="t-sm subtle ta-center">Select an activity above to see its analysis.</p>
        </Card>
      )}

      <Notice tone="info" icon="info" className="mt-6">
        <span className="w-600">A word on what admissions readers actually see.</span> They read your list in the context of your school, your
        family circumstances and what was available to you. A part-time job or caring for a sibling is not a lesser activity than a selective
        summer programme, and the strongest applications are usually the most honest ones.
      </Notice>
    </div>
  );
}
