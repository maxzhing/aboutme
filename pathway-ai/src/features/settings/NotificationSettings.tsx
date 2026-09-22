import { useAppStore } from '@/store/useAppStore';
import { Badge, Button, Card, Field, Notice, Switch } from '@/components/ui/primitives';
import { SectionHeader } from '@/components/ui/shared';
import { countLabel } from '@/lib/format';
import { timeAgo } from '@/lib/date';
import type { UserPreferences } from '@/domain/types';

/* Section 58 — notifications, with a hard cap on nagging. */

type ToggleKey = Exclude<keyof UserPreferences['notifications'], 'deadlineLeadDays'>;

const TOGGLES: { key: ToggleKey; label: string; description: string }[] = [
  { key: 'deadlines', label: 'Deadline warnings', description: 'The only ones that are genuinely time-critical.' },
  { key: 'opportunities', label: 'New matched opportunities', description: 'When something in the catalog fits your direction.' },
  { key: 'studyReminders', label: 'Study reminders', description: 'A nudge when a planned block is coming up.' },
  { key: 'testProgress', label: 'SAT progress', description: 'When a domain band moves, in either direction.' },
  { key: 'apProgress', label: 'AP progress', description: 'Unit coverage and practice milestones.' },
  { key: 'collegeUpdates', label: 'College list changes', description: 'When something about a saved college changes.' },
  { key: 'weeklyReview', label: 'Weekly review', description: 'One summary at the end of the week.' },
];

export function NotificationSettings() {
  const { state, setPreferences, markAllNotificationsRead, toast } = useAppStore();
  const n = state.preferences.notifications;
  const unread = state.notifications.filter((x) => !x.read);

  function set(key: ToggleKey, value: boolean) {
    setPreferences({ notifications: { ...n, [key]: value } });
  }

  return (
    <div className="col g-6">
      <Notice tone="info" icon="bell">
        Pathway AI will not send you a notification to tell you a notification exists. Everything below is off by default except deadlines, and
        an app that manufactures urgency about college admissions is doing real harm.
      </Notice>

      <Card pad="md">
        <SectionHeader title="What you want to hear about" />
        <div className="col g-4">
          {TOGGLES.map((t) => (
            <Switch
              key={t.key}
              checked={n[t.key]}
              onChange={(v) => set(t.key, v)}
              label={t.label}
              description={t.description}
            />
          ))}
        </div>
      </Card>

      <Card pad="md">
        <SectionHeader title="Deadline warnings" description="How far ahead to start reminding you." />
        <Field label="Days before a deadline" hint="Too early and you ignore them; too late and they are not useful. Two weeks suits most people.">
          {(f) => (
            <input
              {...f}
              className="input"
              inputMode="numeric"
              value={n.deadlineLeadDays}
              onChange={(e) => setPreferences({ notifications: { ...n, deadlineLeadDays: Math.max(1, Number(e.target.value) || 14) } })}
            />
          )}
        </Field>
      </Card>

      <Card pad="md">
        <SectionHeader
          title="In-app notifications"
          description={unread.length ? `${countLabel(unread.length, 'unread notification')}.` : 'Nothing unread.'}
          action={
            unread.length ? (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  markAllNotificationsRead();
                  toast('All marked as read.', 'default');
                }}
              >
                Mark all read
              </Button>
            ) : undefined
          }
        />
        {state.notifications.length ? (
          <div className="col g-2">
            {state.notifications.slice(0, 12).map((x) => (
              <div key={x.id} className="row between g-3 items-start">
                <div className="grow" style={{ minWidth: 0 }}>
                  <p className={`t-sm${x.read ? ' faint' : ' w-600'}`}>{x.title}</p>
                  {x.body ? <p className="t-xs subtle mt-1">{x.body}</p> : null}
                </div>
                <div className="row g-2 items-center">
                  {!x.read ? <Badge tone="accent">new</Badge> : null}
                  <span className="t-2xs faint">{timeAgo(x.createdAt)}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="t-sm subtle">No notifications yet.</p>
        )}
      </Card>

      <Card pad="md">
        <SectionHeader title="Email and push" />
        <p className="t-sm subtle">
          This build sends neither. Notifications live inside the app, where you can see all of them and turn any of them off. A shipped version
          would add email for deadlines only, opt-in, with a single unsubscribe link that actually works.
        </p>
      </Card>
    </div>
  );
}
