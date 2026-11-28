import { Bot, PauseCircle, X } from 'lucide-react';
import { useTutorDock } from '@/lib/tutorDock';
import { getQuestion } from '@/data/questions';
import { SKILL } from '@/lib/taxonomy';
import { TutorChat } from './TutorChat';

/**
 * The AI tutor, docked on the right of every page. On a question it knows which one is open and whether it has
 * been answered (so before an answer it coaches without giving the answer away); elsewhere it answers general
 * SAT questions. Paused during timed tests so a score stays the student's own.
 */
export function TutorDock() {
  const { open, setOpen, qid, answer, paused } = useTutorDock();
  const q = qid ? getQuestion(qid) : undefined;
  return (
    <>
      {!open && (
        <button type="button" onClick={() => setOpen(true)} data-testid="tutor-dock-open"
          className="no-print fixed bottom-5 right-5 z-40 inline-flex items-center gap-2 rounded-full bg-brand px-4 py-3 text-sm font-semibold text-white shadow-lg transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">
          <Bot size={18} aria-hidden />AI tutor
        </button>
      )}
      {open && (
        <aside aria-label="AI tutor" data-testid="tutor-dock" data-no-shortcuts
          className="no-print fixed inset-x-0 bottom-0 z-40 flex h-[75vh] flex-col border-t border-line bg-surface shadow-2xl lg:inset-y-0 lg:left-auto lg:right-0 lg:h-screen lg:w-[400px] lg:border-l lg:border-t-0">
          <div className="flex items-center gap-2 border-b border-line px-4 py-3">
            <Bot size={18} className="text-brand" aria-hidden />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-bold">AI tutor</div>
              <div className="truncate text-xs text-faint" data-testid="tutor-dock-context">
                {paused ? 'Paused during the timed test' : q ? `Helping with this ${SKILL[q.skill].name} question` : 'Ask anything about the SAT'}
              </div>
            </div>
            <button type="button" className="btn-ghost !p-1.5" onClick={() => setOpen(false)} aria-label="Close the AI tutor" data-testid="tutor-dock-close"><X size={18} /></button>
          </div>
          <div className="min-h-0 flex-1 p-3">
            {paused ? (
              <div className="grid h-full place-items-center text-center text-sm text-muted" data-testid="tutor-dock-paused">
                <div><PauseCircle className="mx-auto mb-2 text-brand" size={30} aria-hidden />The tutor is paused during timed tests so your score stays fair.<br />It opens again as soon as you finish.</div>
              </div>
            ) : (
              <TutorChat key={qid ?? 'general'} qid={qid} answer={answer ?? null} dock />
            )}
          </div>
        </aside>
      )}
    </>
  );
}

/** Space for the docked tutor on wide screens, so it sits beside the page instead of covering it. */
export function useDockPadding() {
  const open = useTutorDock((s) => s.open);
  return open ? 'lg:pr-[400px]' : '';
}
