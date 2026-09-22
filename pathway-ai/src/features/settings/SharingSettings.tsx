import { useAppStore } from '@/store/useAppStore';
import { Button, Card, Field, Notice, Switch } from '@/components/ui/primitives';
import { SectionHeader } from '@/components/ui/shared';
import { Icon } from '@/components/ui/Icon';
import type { ShareSettings } from '@/domain/types';

/* Section 60 — parent sharing, controlled entirely by the student. */

const AREAS: { key: keyof ShareSettings['share']; label: string; description: string }[] = [
  { key: 'deadlines', label: 'Deadlines', description: 'What is due and when. Usually the most useful thing to share.' },
  { key: 'collegeList', label: 'College list', description: 'Which colleges you are considering and at what stage.' },
  { key: 'financial', label: 'Cost planning', description: 'Net price estimates against the budget. Often a conversation worth having.' },
  { key: 'academics', label: 'Academics', description: 'Courses and AP plan. Not your grades unless you enter them.' },
  { key: 'majorPlanning', label: 'Major and career direction', description: 'What you are thinking about studying.' },
  { key: 'testing', label: 'Testing', description: 'Test dates and scores you have recorded.' },
  { key: 'activities', label: 'Activities', description: 'What you do outside class.' },
  { key: 'essays', label: 'Essays', description: 'Your drafts. Most students keep this off — an essay read too early rarely survives it.' },
];

export function SharingSettings() {
  const { state, setShareSettings, toast } = useAppStore();
  const share = state.share;

  function toggleArea(key: keyof ShareSettings['share'], value: boolean) {
    setShareSettings({ share: { ...share.share, [key]: value } });
  }

  const enabledCount = Object.values(share.share).filter(Boolean).length;

  return (
    <div className="col g-6">
      <Notice tone="info" icon="lock">
        <span className="w-600">You control this completely.</span> Nothing is shared until you switch it on, each area is separate, and turning
        sharing off stops it immediately. Your parents cannot enable anything from their side.
      </Notice>

      <Card pad="md">
        <SectionHeader title="Parent view" description="A read-only summary of whichever areas you choose." />
        <Switch
          checked={share.enabled}
          onChange={(v) => {
            setShareSettings({ enabled: v });
            toast(v ? 'Sharing is on. Only the areas you select are visible.' : 'Sharing is off. Nothing is visible.', v ? 'ok' : 'default');
          }}
          label="Share a summary with a parent or guardian"
          description="Off by default."
        />

        {share.enabled ? (
          <div className="row g-3 wrap mt-4">
            <Field label="Their name" hint="Shown on the summary so it is clear who it is for.">
              {(f) => <input {...f} className="input" value={share.parentName ?? ''} onChange={(e) => setShareSettings({ parentName: e.target.value })} />}
            </Field>
            <Field label="Their email" hint="Optional. Stored on this device only — this build does not send email.">
              {(f) => <input {...f} type="email" className="input" value={share.parentEmail ?? ''} onChange={(e) => setShareSettings({ parentEmail: e.target.value })} />}
            </Field>
          </div>
        ) : null}
      </Card>

      {share.enabled ? (
        <>
          <Card pad="md">
            <SectionHeader title="What they can see" description={`${enabledCount} of ${AREAS.length} areas shared.`} />
            <div className="col g-4">
              {AREAS.map((a) => (
                <Switch key={a.key} checked={share.share[a.key]} onChange={(v) => toggleArea(a.key, v)} label={a.label} description={a.description} />
              ))}
            </div>
          </Card>

          <Card pad="md">
            <SectionHeader title="Preview" description="Exactly what the parent view shows, from their side." />
            <Button variant="ghost" icon="eye" to="/app/parent">
              Open the parent view
            </Button>
            <p className="t-2xs faint mt-3">
              Worth looking at before you share. It is a summary, not a feed — it does not show your practice attempts, your counselor
              conversations, or anything you wrote privately.
            </p>
          </Card>
        </>
      ) : null}

      <Card pad="md">
        <SectionHeader title="What is never shared" description="Regardless of these settings." />
        <ul className="col g-2">
          {[
            'Your conversations with the AI counselor.',
            'Individual practice attempts and which questions you got wrong.',
            'Your private notes on activities — the "why it matters to you" field.',
            'Anything you wrote and then deleted.',
          ].map((s) => (
            <li key={s} className="row g-2 t-sm subtle">
              <Icon name="lock" size={13} className="mt-1 shrink-0" />
              <span>{s}</span>
            </li>
          ))}
        </ul>
      </Card>

      <Card pad="md">
        <SectionHeader title="A note on pressure" />
        <p className="t-sm subtle">
          Sharing deadlines usually helps — someone else knowing when things are due takes weight off you. Sharing everything, all the time,
          often does the opposite. If the parent view is turning into daily monitoring, turning most of it off is a reasonable thing to do, and
          you do not need a reason.
        </p>
      </Card>
    </div>
  );
}
