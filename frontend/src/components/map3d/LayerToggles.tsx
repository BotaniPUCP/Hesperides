'use client';

import { LAYER_TOGGLES } from './layerList';
import type { LayerId } from './target';

export interface LayerTogglesProps {
  visible: Record<string, boolean>;
  onToggle: (id: LayerId, visible: boolean) => void;
}

export function LayerToggles({ visible, onToggle }: LayerTogglesProps) {
  return (
    <fieldset className="space-y-1">
      <legend className="mb-1 text-xs font-semibold uppercase tracking-wide text-neutral-500">Capas</legend>
      {LAYER_TOGGLES.map((t) => (
        <label key={t.id} className="flex cursor-pointer items-center gap-2 text-xs text-neutral-700">
          <input type="checkbox" checked={visible[t.id]} onChange={(e) => onToggle(t.id, e.target.checked)} className="accent-brand-600" />
          {t.label}
        </label>
      ))}
    </fieldset>
  );
}
