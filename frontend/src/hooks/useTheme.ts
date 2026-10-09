'use client';

import { useSyncExternalStore } from 'react';
import { DARK_SCHEME_QUERY, DEFAULT_THEME_PREFERENCE, resolveTheme } from '@/lib/theme';
import type { ResolvedTheme, ThemePreference } from '@/lib/theme';
import { readThemePreference, saveThemePreference, subscribeToThemePreference } from '@/lib/theme-store';
import { useMediaQuery } from './useMediaQuery';

export interface ThemeState {
  preference: ThemePreference;
  resolved: ResolvedTheme;
  setPreference: (preference: ThemePreference) => void;
}

/** Punto de entrada único al tema: lo que eligió la persona y lo que se ve. */
export function useTheme(): ThemeState {
  const preference = useSyncExternalStore(
    subscribeToThemePreference,
    readThemePreference,
    () => DEFAULT_THEME_PREFERENCE,
  );
  const systemPrefersDark = useMediaQuery(DARK_SCHEME_QUERY);

  return {
    preference,
    resolved: resolveTheme(preference, systemPrefersDark),
    setPreference: saveThemePreference,
  };
}
