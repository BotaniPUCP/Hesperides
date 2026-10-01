'use client';

import { MODES, type ModeId } from './modes';

export interface ModeLegendProps {
  mode: ModeId;
  hidden: Set<string>;
  onModeChange: (mode: ModeId) => void;
  onToggleCategory: (key: string) => void;
}

/** Cómo se colorean las áreas verdes y qué significa cada color. Pulsar una categoría la atenúa. */
export function ModeLegend({ mode, hidden, onModeChange, onToggleCategory }: ModeLegendProps) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Colorear por</legend>
      <div className="flex flex-wrap gap-1">
        {(Object.keys(MODES) as ModeId[]).map((id) => (
          <button
            key={id}
            type="button"
            aria-pressed={mode === id}
            onClick={() => onModeChange(id)}
            className={`rounded-md px-2 py-1 text-xs ${mode === id ? 'bg-brand-600 text-white' : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'}`}
          >
            {MODES[id].label}
          </button>
        ))}
      </div>
      {mode !== 'base' && (
        <ul className="space-y-1">
          {MODES[mode].cats.map((c) => (
            <li key={c.key}>
              <button
                type="button"
                aria-pressed={!hidden.has(c.key)}
                onClick={() => onToggleCategory(c.key)}
                className={`flex w-full items-center gap-2 text-left text-xs ${hidden.has(c.key) ? 'text-neutral-400 line-through' : 'text-neutral-700'}`}
              >
                <span className="h-3 w-3 shrink-0 rounded-sm" style={{ backgroundColor: c.color }} />
                {c.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </fieldset>
  );
}
