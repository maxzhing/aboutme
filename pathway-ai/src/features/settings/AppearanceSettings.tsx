import { useAppStore } from '@/store/useAppStore';
import { Button, Card, Notice, Switch } from '@/components/ui/primitives';
import { SectionHeader } from '@/components/ui/shared';
import { Icon } from '@/components/ui/Icon';
import type { UserPreferences } from '@/domain/types';

/* Sections 62–63 — appearance and accessibility. */

const THEMES: { id: UserPreferences['theme']; label: string; icon: 'sun' | 'moon' | 'sliders' }[] = [
  { id: 'system', label: 'Match my system', icon: 'sliders' },
  { id: 'light', label: 'Light', icon: 'sun' },
  { id: 'dark', label: 'Dark', icon: 'moon' },
];

const SCALES: { id: UserPreferences['fontScale']; label: string; sample: string }[] = [
  { id: 'sm', label: 'Compact', sample: '0.94×' },
  { id: 'md', label: 'Default', sample: '1×' },
  { id: 'lg', label: 'Large', sample: '1.12×' },
  { id: 'xl', label: 'Largest', sample: '1.25×' },
];

export function AppearanceSettings() {
  const { state, setPreferences, toast } = useAppStore();
  const prefs = state.preferences;

  return (
    <div className="col g-6">
      <Card pad="md">
        <SectionHeader title="Theme" description="Dark mode is a full palette, not an inverted one — contrast ratios hold in both." />
        <div className="row g-2 wrap">
          {THEMES.map((t) => (
            <button
              key={t.id}
              type="button"
              className="chip"
              aria-pressed={prefs.theme === t.id}
              onClick={() => setPreferences({ theme: t.id })}
            >
              <Icon name={t.icon} size={13} /> {t.label}
            </button>
          ))}
        </div>
      </Card>

      <Card pad="md">
        <SectionHeader title="Text size" description="Scales every size in the app proportionally. Layouts reflow rather than clipping." />
        <div className="row g-2 wrap">
          {SCALES.map((s) => (
            <button key={s.id} type="button" className="chip" aria-pressed={prefs.fontScale === s.id} onClick={() => setPreferences({ fontScale: s.id })}>
              {s.label} <span className="mono faint">{s.sample}</span>
            </button>
          ))}
        </div>
        <p className="t-sm mt-4">This is what body text looks like at your current setting. Pick whichever you can read without leaning in.</p>
      </Card>

      <Card pad="md">
        <SectionHeader title="Accessibility" />
        <div className="col g-4">
          <Switch
            checked={prefs.contrast === 'high'}
            onChange={(v) => setPreferences({ contrast: v ? 'high' : 'normal' })}
            label="High contrast"
            description="Strengthens borders, text and focus rings throughout."
          />
          <Switch
            checked={prefs.motion === 'reduced'}
            onChange={(v) => setPreferences({ motion: v ? 'reduced' : 'system' })}
            label="Reduce motion"
            description="Removes transitions and entrance animations. We also honour your system setting automatically."
          />
        </div>

        <Notice tone="info" icon="info" className="mt-4">
          Every interactive element in this app is reachable by keyboard, every image and chart has a text alternative, and no information is
          carried by colour alone. If something here is hard to use, that is a bug — not something to work around.
        </Notice>
      </Card>

      <Card pad="md">
        <SectionHeader title="Keyboard shortcuts" />
        <div className="col g-2">
          {[
            { keys: '⌘K / Ctrl+K', what: 'Open the command palette' },
            { keys: '/', what: 'Focus search' },
            { keys: 'Esc', what: 'Close any dialog or palette' },
            { keys: 'Tab / Shift+Tab', what: 'Move between controls' },
            { keys: '← →', what: 'Move between tabs when a tab has focus' },
          ].map((k) => (
            <div key={k.keys} className="row between g-3 t-sm">
              <span className="subtle">{k.what}</span>
              <kbd className="kbd">{k.keys}</kbd>
            </div>
          ))}
        </div>
      </Card>

      <Card pad="md">
        <SectionHeader title="Check it looks right" description="Switch through the modes and make sure nothing breaks for you." />
        <div className="row g-2 wrap">
          <Button
            variant="ghost"
            onClick={() => {
              setPreferences({ theme: prefs.theme === 'dark' ? 'light' : 'dark' });
              toast(`Switched to ${prefs.theme === 'dark' ? 'light' : 'dark'} mode.`, 'default');
            }}
          >
            Toggle theme
          </Button>
          <Button variant="ghost" onClick={() => setPreferences({ contrast: prefs.contrast === 'high' ? 'normal' : 'high' })}>
            Toggle contrast
          </Button>
          <Button variant="ghost" onClick={() => setPreferences({ fontScale: prefs.fontScale === 'xl' ? 'md' : 'xl' })}>
            Toggle large text
          </Button>
        </div>
      </Card>
    </div>
  );
}
