import { useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';

/**
 * Applies accessibility and appearance preferences to the document root.
 * Section 57: theme, contrast, font scale and motion are all user-controlled.
 */
export function ThemeEffect() {
  const prefs = useAppStore((s) => s.state.preferences);

  useEffect(() => {
    const root = document.documentElement;
    if (prefs.theme === 'system') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', prefs.theme);

    if (prefs.contrast === 'high') root.setAttribute('data-contrast', 'high');
    else root.removeAttribute('data-contrast');

    if (prefs.fontScale === 'md') root.removeAttribute('data-font-scale');
    else root.setAttribute('data-font-scale', prefs.fontScale);

    if (prefs.motion === 'system') root.removeAttribute('data-motion');
    else root.setAttribute('data-motion', prefs.motion);
  }, [prefs.theme, prefs.contrast, prefs.fontScale, prefs.motion]);

  return null;
}
