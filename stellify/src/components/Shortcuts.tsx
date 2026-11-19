'use client';
import { useEffect, useState } from 'react';
import { Modal } from './ui';

/** Every keyboard shortcut in one place. Opens with "?" or the keyboard button in the top bar. */
export const SHORTCUTS: { group: string; keys: [string[], string][] }[] = [
  { group: 'Answering a question', keys: [
    [['A', 'B', 'C', 'D'], 'choose an answer (1–4 also work)'],
    [['Enter'], 'check the answer, then go on'],
    [['N'], 'next question'],
    [['←', '→'], 'previous or next question'],
    [['F'], 'flag for review'],
    [['H'], 'show the next hint'],
  ] },
  { group: 'Path', keys: [
    [['Arrow keys'], 'move between neighbouring skills'],
    [['Enter'], 'open the skill'],
  ] },
  { group: 'Anywhere', keys: [
    [['Ctrl', 'K'], 'search'],
    [['?'], 'this list'],
    [['Esc'], 'close a dialog'],
  ] },
];

export function ShortcutSheet() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const show = () => setOpen(true);
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (e.key !== '?' || e.metaKey || e.ctrlKey || e.altKey || t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
      e.preventDefault(); setOpen(true);
    };
    window.addEventListener('stellify:shortcuts', show);
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('stellify:shortcuts', show); window.removeEventListener('keydown', onKey); };
  }, []);
  return (
    <Modal open={open} onClose={() => setOpen(false)} title="Keyboard shortcuts">
      <div className="space-y-5" data-testid="shortcut-sheet">
        {SHORTCUTS.map((g) => (
          <section key={g.group}>
            <h3 className="mb-2 font-sans text-[12px] font-semibold uppercase tracking-[0.08em] text-faint">{g.group}</h3>
            <dl className="divide-y divide-line border-y border-line">
              {g.keys.map(([keys, what]) => (
                <div key={what} className="flex items-center justify-between gap-4 py-2 text-[15px]">
                  <dt className="flex flex-wrap gap-1">{keys.map((k) => <kbd key={k} className="kbd">{k}</kbd>)}</dt>
                  <dd className="text-right text-muted">{what}</dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
    </Modal>
  );
}
