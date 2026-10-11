import { useEffect } from 'react';

const THEMES = ['system', 'light', 'dark'];

/** Popup toggle cycle: system → light → dark → system. */
export function nextTheme(current) {
  return THEMES[(THEMES.indexOf(current || 'system') + 1) % THEMES.length];
}

/**
 * Applies the stored theme to <html>. "system" is resolved through
 * prefers-color-scheme and re-resolved live when the OS switches.
 */
export function useTheme(setting) {
  useEffect(() => {
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const theme = setting === 'light' || setting === 'dark'
        ? setting
        : mql.matches ? 'dark' : 'light';
      document.documentElement.dataset.theme = theme;
    };
    apply();
    mql.addEventListener('change', apply);
    return () => mql.removeEventListener('change', apply);
  }, [setting]);
}