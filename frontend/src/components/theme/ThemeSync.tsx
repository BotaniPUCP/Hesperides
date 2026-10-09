'use client';

import { useEffect } from 'react';
import { useTheme } from '@/hooks/useTheme';
import { DARK_CLASS } from '@/lib/theme';

/**
 * Lleva el tema resuelto a <html>. El script de arranque ya lo puso antes de
 * hidratar; esto lo mantiene al día cuando la persona cambia de opción, cuando
 * cambia el SO estando en "Sistema" o cuando otra pestaña elige otro tema.
 */
export function ThemeSync() {
  const { resolved } = useTheme();

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle(DARK_CLASS, resolved === 'dark');
    root.style.colorScheme = resolved;
  }, [resolved]);

  return null;
}
