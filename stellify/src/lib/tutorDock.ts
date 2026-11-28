import { create } from 'zustand';

/**
 * What the side tutor is looking at. Question screens report the open question (and the student's answer once
 * it is submitted, never before); timed tests mark the tutor as paused. Not saved: it describes the screen.
 */
interface DockState {
  open: boolean;
  qid?: string;
  answer?: string | null;
  paused?: boolean;
  setOpen: (open: boolean) => void;
  setContext: (c: { qid?: string; answer?: string | null; paused?: boolean }) => void;
  clearContext: () => void;
}
const KEY = 'stellify-tutor-dock';
const initialOpen = () => { try { return localStorage.getItem(KEY) === '1'; } catch { return false; } };

export const useTutorDock = create<DockState>((set) => ({
  open: initialOpen(),
  setOpen: (open) => { try { localStorage.setItem(KEY, open ? '1' : '0'); } catch { /* storage unavailable */ } set({ open }); },
  setContext: (c) => set({ qid: c.qid, answer: c.answer ?? null, paused: !!c.paused }),
  clearContext: () => set({ qid: undefined, answer: null, paused: false }),
}));
