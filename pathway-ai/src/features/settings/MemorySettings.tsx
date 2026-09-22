import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useEngine } from '@/store/useEngine';
import { useAppStore } from '@/store/useAppStore';
import { Badge, Button, Card, Notice, Switch } from '@/components/ui/primitives';
import { SectionHeader } from '@/components/ui/shared';
import { COLLEGE_BY_ID } from '@/data/colleges';
import { MAJOR_BY_ID } from '@/data/majors';
import { CAREER_BY_ID } from '@/data/careers';
import { AP_COURSE_BY_ID } from '@/data/ap';
import { OPPORTUNITY_BY_ID } from '@/domain/engine/briefing';
import { countLabel } from '@/lib/format';
import { timeAgo } from '@/lib/date';
import { Icon } from '@/components/ui/Icon';

/* Section 57 — what the AI remembers, editable and deletable. */

const SOURCE_LABEL: Record<string, string> = {
  onboarding: 'From onboarding',
  feedback: 'Learned from your feedback',
  chat: 'From something you said to the counselor',
  manual: 'You set this directly',
};

function labelFor(targetType: string, targetId: string): string {
  switch (targetType) {
    case 'college':
      return COLLEGE_BY_ID.get(targetId)?.shortName ?? COLLEGE_BY_ID.get(targetId)?.name ?? targetId;
    case 'major':
      return MAJOR_BY_ID.get(targetId)?.name ?? targetId;
    case 'career':
      return CAREER_BY_ID.get(targetId)?.name ?? targetId;
    case 'ap-course':
      return AP_COURSE_BY_ID.get(targetId)?.name ?? targetId;
    case 'opportunity':
      return OPPORTUNITY_BY_ID.get(targetId)?.name ?? targetId;
    default:
      return targetId;
  }
}

export function MemorySettings() {
  const ctx = useEngine();
  const { state, setLearnedPreferenceActive, removeLearnedPreference, recordFeedback, toast } = useAppStore();

  const prefs = state.learnedPreferences;
  const feedback = state.feedback;

  const hidden = useMemo(() => feedback.filter((f) => f.kind === 'not-interested'), [feedback]);
  const interested = useMemo(() => feedback.filter((f) => f.kind === 'interested' || f.kind === 'saved'), [feedback]);

  return (
    <div className="col g-6">
      <Notice tone="ai" icon="sparkles">
        <span className="w-600">Everything the app has inferred about you is on this page, in plain language.</span> Nothing is hidden in a
        model you cannot see, and every rule here can be switched off or deleted. If a rule is wrong, the recommendations built on it are wrong
        too.
      </Notice>

      <Card pad="md">
        <SectionHeader title="Rules the app is applying" description={`${countLabel(prefs.filter((p) => p.active).length, 'active rule')}.`} />
        {prefs.length ? (
          <div className="col g-3">
            {prefs.map((p) => (
              <div key={p.id} className="row between g-3 items-start wrap">
                <div className="grow" style={{ minWidth: 0 }}>
                  <p className={`t-sm${p.active ? '' : ' faint'}`}>{p.statement}</p>
                  <p className="t-2xs faint mt-1">
                    {SOURCE_LABEL[p.source] ?? p.source} · {timeAgo(p.createdAt)}
                  </p>
                </div>
                <div className="row g-2 items-center">
                  <Switch checked={p.active} onChange={(v) => setLearnedPreferenceActive(p.id, v)} label="Apply" />
                  <Button
                    size="sm"
                    variant="ghost"
                    icon="trash"
                    aria-label="Delete this rule"
                    onClick={() => {
                      removeLearnedPreference(p.id);
                      toast('Rule deleted. Recommendations have been recalculated.', 'default');
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="t-sm subtle">
            No rules learned yet. They appear as you tell the app things — that a college is too far, that something is out of budget, that you
            are not interested in a suggestion.
          </p>
        )}
      </Card>

      <Card pad="md">
        <SectionHeader title="Constraints currently in effect" description="The computed result of your profile and the rules above — what every recommendation is filtered through right now." />
        <div className="col g-2">
          {ctx.constraints.maxCostPerYear !== undefined ? (
            <p className="t-sm subtle">• Maximum annual cost: ${ctx.constraints.maxCostPerYear.toLocaleString()}</p>
          ) : null}
          {ctx.constraints.maxDistanceMiles !== undefined ? (
            <p className="t-sm subtle">• Within {ctx.constraints.maxDistanceMiles} miles</p>
          ) : null}
          {ctx.constraints.excludedStates.size ? (
            <p className="t-sm subtle">• Excluding {Array.from(ctx.constraints.excludedStates).join(', ')}</p>
          ) : null}
          {ctx.constraints.excludedRegions.size ? (
            <p className="t-sm subtle">• Excluding {Array.from(ctx.constraints.excludedRegions).join(', ')}</p>
          ) : null}
          {ctx.constraints.excludedCategories.size ? (
            <p className="t-sm subtle">• Not suggesting {Array.from(ctx.constraints.excludedCategories).join(', ')}</p>
          ) : null}
          <p className="t-sm subtle">• About {ctx.constraints.availableWeeklyHours} hours a week free for something new</p>
          {ctx.constraints.notes.map((n) => (
            <p key={n} className="t-sm subtle">
              • {n}
            </p>
          ))}
        </div>
      </Card>

      <Card pad="md">
        <SectionHeader title="Things you hid" description="Suggestions you marked as not interesting. They are excluded from matching entirely." />
        {hidden.length ? (
          <div className="col g-2">
            {hidden.map((f) => (
              <div key={f.id} className="row between g-3 items-center">
                <div>
                  <span className="t-sm">{labelFor(f.targetType, f.targetId)}</span>
                  <Badge>{f.targetType}</Badge>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  icon="refresh"
                  onClick={() => {
                    recordFeedback({ targetType: f.targetType, targetId: f.targetId, kind: 'interested' });
                    toast('Unhidden. It can appear in matching again.', 'ok');
                  }}
                >
                  Unhide
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <p className="t-sm subtle">Nothing hidden.</p>
        )}
      </Card>

      {interested.length ? (
        <Card pad="md">
          <SectionHeader title="Things you marked as interesting" description="These are weighted up in matching." />
          <div className="row g-2 wrap">
            {interested.map((f) => (
              <span key={f.id} className="chip chip-static chip-sm">
                {labelFor(f.targetType, f.targetId)}
              </span>
            ))}
          </div>
        </Card>
      ) : null}

      <Card pad="md">
        <SectionHeader title="How the recommendations actually work" description="Worth knowing, since you are the one deciding whether to trust them." />
        <div className="col g-3">
          {[
            {
              title: 'Deterministic, not generative',
              body: 'Given the same profile, the engine produces the same recommendations every time. There is no language model deciding which college to show you, which is why every suggestion can point at the specific inputs behind it.',
            },
            {
              title: 'Four independent fit dimensions',
              body: 'Academic, personal, opportunity and financial fit are computed separately and never combined into one number, because a college that is cheap and wrong for you is not "averagely" right.',
            },
            {
              title: 'Fit is not admission probability',
              body: 'Nothing in this app estimates your chance of getting in anywhere. That depends on an application nobody has read yet, in a process with genuine randomness in it.',
            },
            {
              title: 'Your feedback changes the weights, not the rules',
              body: 'Telling the app something is too expensive adds a visible rule you can see and delete above. It does not silently retrain anything.',
            },
          ].map((c) => (
            <div key={c.title}>
              <p className="t-sm w-600">{c.title}</p>
              <p className="t-xs subtle mt-1">{c.body}</p>
            </div>
          ))}
        </div>
      </Card>

      <p className="t-2xs faint row g-2">
        <Icon name="shield" size={12} className="mt-1 shrink-0" />
        <span>
          Everything on this page lives on this device. To remove all of it, see{' '}
          <Link to="/app/settings/data" className="c-accent">
            your data
          </Link>
          .
        </span>
      </p>
    </div>
  );
}
