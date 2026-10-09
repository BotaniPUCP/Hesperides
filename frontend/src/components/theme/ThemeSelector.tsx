'use client';

import { useTheme } from '@/hooks/useTheme';
import { cn } from '@/lib/cn';
import type { ThemePreference } from '@/lib/theme';

const OPTIONS: ReadonlyArray<{ value: ThemePreference; label: string; icon: string }> = [
  { value: 'light', label: 'Claro', icon: '☀️' },
  { value: 'dark', label: 'Oscuro', icon: '🌙' },
  { value: 'system', label: 'Sistema', icon: '💻' },
];

/**
 * Radios nativos con aspecto de control segmentado: el teclado (flechas) y el
 * lector de pantalla funcionan sin escribir nada de accesibilidad a mano.
 */
export function ThemeSelector() {
  const { preference, setPreference } = useTheme();

  return (
    <fieldset>
      <legend className="mb-2 text-xs font-medium text-neutral-500">Apariencia</legend>
      <div className="grid grid-cols-3 gap-1 rounded-md bg-neutral-100 p-1">
        {OPTIONS.map((option) => (
          <label
            key={option.value}
            className={cn(
              'flex cursor-pointer flex-col items-center gap-0.5 rounded px-1 py-1.5 text-xs transition-colors',
              'has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-600',
              preference === option.value
                ? 'bg-neutral-0 font-semibold text-brand-700 shadow-sm'
                : 'text-neutral-600 hover:text-neutral-900',
            )}
          >
            <input
              type="radio"
              name="theme-preference"
              value={option.value}
              checked={preference === option.value}
              onChange={() => setPreference(option.value)}
              className="sr-only"
            />
            <span aria-hidden="true">{option.icon}</span>
            {option.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
