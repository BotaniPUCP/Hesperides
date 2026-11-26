'use client';

import { LAYER_TOGGLES, type LayerToggle, type ToggleId } from './layerList';

export interface LayerTogglesProps {
  layers?: readonly LayerToggle[];
  visible: Record<string, boolean>;
  onToggle: (id: ToggleId, visible: boolean) => void;
}

export function LayerToggles({ layers = LAYER_TOGGLES, visible, onToggle }: LayerTogglesProps) {
  return (
    <fieldset className="space-y-1">
      <legend className="mb-1 text-xs font-semibold uppercase tracking-wide text-neutral-500">Capas</legend>
      {layers.map((t) => (
        <label key={t.id} className="flex cursor-pointer items-center gap-2 text-xs text-neutral-700">
          <input type="checkbox" checked={visible[t.id]} onChange={(e) => onToggle(t.id, e.target.checked)} className="accent-brand-600" />
          {t.label}
        </label>
      ))}
    </fieldset>
  );
}
