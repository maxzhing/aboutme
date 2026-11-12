'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from './store';
import { getQuestion } from '@/data/questions';
import { computeAllSkillStats } from './engine/mastery';
import { overview } from './engine/analytics';
import { computeStreak } from './engine/streak';
import { levelFromXp } from './engine/xp';
import type { AppState } from './types';

/** The persisted student state (stable reference between unrelated updates). */
export function useAppState(): AppState {
  return useStore() as unknown as AppState;
}

export function useSkillStats() {
  const attempts = useStore((s) => s.attempts);
  return useMemo(() => computeAllSkillStats(attempts, getQuestion), [attempts]);
}

export function useOverview() {
  const s = useAppState();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => overview(s, getQuestion), [s.attempts]);
}

export function useStreak() {
  const activity = useStore((s) => s.activity);
  const rest = useStore((s) => s.profile.restDays);
  return useMemo(() => computeStreak(activity, rest), [activity, rest]);
}

export function useLevel() {
  const xp = useStore((s) => s.pet.xp);
  return useMemo(() => levelFromXp(xp), [xp]);
}

/** Re-renders once a second while `running`; returns elapsed ms since start. */
export function useStopwatch(running: boolean, resetKey: unknown) {
  const start = useRef(Date.now());
  const [, tick] = useState(0);
  useEffect(() => { start.current = Date.now(); tick((n) => n + 1); }, [resetKey]);
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [running, resetKey]);
  return { elapsed: () => Date.now() - start.current };
}

export function useMounted() {
  const [m, set] = useState(false);
  useEffect(() => set(true), []);
  return m;
}
