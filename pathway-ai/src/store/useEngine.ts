import { useMemo } from 'react';
import { useAppStore } from './useAppStore';
import { buildContext, type EngineContext } from '@/domain/engine/context';

/**
 * The single hook every feature uses to reach the engine. Memoised on account
 * state so recommendations stay stable between renders.
 */
export function useEngine(): EngineContext {
  const state = useAppStore((s) => s.state);
  return useMemo(() => buildContext(state), [state]);
}

export function useProfile() {
  return useAppStore((s) => s.state.profile);
}

export function usePreferences() {
  return useAppStore((s) => s.state.preferences);
}
