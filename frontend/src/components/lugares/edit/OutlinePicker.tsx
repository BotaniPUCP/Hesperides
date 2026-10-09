'use client';

import { useState } from 'react';
import { LoadingSkeleton } from '@/components/ui';
import { Map3DView } from '@/components/map3d/Map3DView';
import type { Viewer } from '@/components/map3d/viewer/createViewer';
import { cn } from '@/lib/cn';
import { useSceneData } from '../useSceneData';
import { outlineFromTarget, pointOutline, type PickedOutline } from './mapPick';

const nada = () => undefined;
type Mode = 'element' | 'point';

export interface OutlinePickerProps {
  picked: PickedOutline | null;
  onPick: (picked: PickedOutline) => void;
}

/**
 * Elige el contorno en el mapa: un clic sobre un edificio, área verde o
 * estacionamiento lo toma del mapa; en modo punto, el clic marca un punto para
 * lo que no está dibujado.
 */
export function OutlinePicker({ picked, onPick }: OutlinePickerProps) {
  const { data, isLoading } = useSceneData();
  const [mode, setMode] = useState<Mode>('element');
  const [viewer, setViewer] = useState<Viewer | null>(null);

  if (isLoading) return <LoadingSkeleton variant="map" />;
  if (!data) return <p className="text-sm text-neutral-600">El mapa no está disponible; no se puede elegir el contorno.</p>;

  const modeButton = (value: Mode, label: string) => (
    <button
      type="button"
      aria-pressed={mode === value}
      onClick={() => setMode(value)}
      className={cn('rounded-md border px-3 py-1.5 text-xs', mode === value ? 'border-brand-600 bg-brand-50 font-semibold text-brand-800' : 'border-neutral-200 text-neutral-700')}
    >
      {label}
    </button>
  );

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        {modeButton('element', 'Elegir en el mapa')}
        {modeButton('point', 'Marcar un punto')}
        <span className="text-xs text-neutral-600">
          {mode === 'element' ? 'Haz clic en el edificio, el área verde o el estacionamiento.' : 'Haz clic donde está el lugar.'}
        </span>
      </div>
      <div className="relative h-80 overflow-hidden rounded-lg border border-neutral-200">
        <Map3DView
          data={data}
          onReady={setViewer}
          onUnsupported={nada}
          onHover={nada}
          onCompass={nada}
          onGroundPick={nada}
          onSelect={(target) => {
            if (mode !== 'element' || !target) return;
            const found = outlineFromTarget(data, target);
            if (found) onPick(found);
            else viewer?.select(null, false);
          }}
          onPointPick={(lat, lon) => mode === 'point' && onPick(pointOutline({ lat, lon }))}
        />
      </div>
      <p className={cn('text-sm', picked ? 'text-neutral-800' : 'text-alert-warning-fg')}>
        {picked ? <>Contorno: <strong>{picked.label}</strong></> : 'Todavía no se eligió el contorno.'}
      </p>
    </div>
  );
}
