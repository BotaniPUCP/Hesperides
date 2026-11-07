'use client';

import { useEffect, useState } from 'react';
import { LoadingSkeleton } from '@/components/ui';
import { Map3DView } from '@/components/map3d/Map3DView';
import type { Viewer } from '@/components/map3d/viewer/createViewer';
import { cn } from '@/lib/cn';
import { useSceneData } from '../useSceneData';
import { buildingName, buildingsOutline, CHILDREN_OUTLINE, pickOnMap, pointOutline, toggleBuilding, type PickedOutline } from './mapPick';

const nada = () => undefined;
const NO_BUILDINGS: readonly number[] = [];
type Mode = 'element' | 'point' | 'children';

const HINTS: Record<Mode, string> = {
  element: 'Haz clic en el edificio, el área verde o el estacionamiento. Si el lugar son varios bloques, pulsa cada uno.',
  point: 'Haz clic donde está el lugar.',
  children: 'Para un complejo: su contorno es el de los lugares que tienen este como «Dentro de».',
};

export interface OutlinePickerProps {
  picked: PickedOutline | null;
  onPick: (picked: PickedOutline | null) => void;
}

/**
 * Elige el contorno en el mapa: un clic sobre un edificio, área verde o
 * estacionamiento lo toma del mapa (los edificios se suman); en modo punto, el
 * clic marca un punto; un complejo puede tomarlo de los lugares que contiene.
 */
export function OutlinePicker({ picked, onPick }: OutlinePickerProps) {
  const { data, isLoading } = useSceneData();
  const [mode, setMode] = useState<Mode>(picked?.outline.fromChildren ? 'children' : 'element');
  const [viewer, setViewer] = useState<Viewer | null>(null);
  const buildingIds = picked?.outline.buildingIds ?? NO_BUILDINGS;

  useEffect(() => {
    viewer?.setMarkedBuildings(buildingIds);
  }, [viewer, buildingIds]);

  if (isLoading) return <LoadingSkeleton variant="map" />;
  if (!data) return <p className="text-sm text-neutral-600">El mapa no está disponible; no se puede elegir el contorno.</p>;

  const choose = (value: Mode) => {
    setMode(value);
    if (value === 'children') onPick(CHILDREN_OUTLINE);
    else if (picked?.outline.fromChildren) onPick(null);
  };

  const modeButton = (value: Mode, label: string) => (
    <button
      type="button"
      aria-pressed={mode === value}
      onClick={() => choose(value)}
      className={cn('rounded-md border px-3 py-1.5 text-xs', mode === value ? 'border-brand-600 bg-brand-50 font-semibold text-brand-800' : 'border-neutral-200 text-neutral-700')}
    >
      {label}
    </button>
  );

  const label = buildingIds.length > 0 ? buildingsOutline(data, buildingIds).label : picked?.label;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        {modeButton('element', 'Elegir en el mapa')}
        {modeButton('point', 'Marcar un punto')}
        {modeButton('children', 'De sus lugares internos')}
        <span className="text-xs text-neutral-600">{HINTS[mode]}</span>
      </div>
      {mode !== 'children' && (
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
              const next = pickOnMap(picked, data, target);
              // Los bloques elegidos se ven con su marca; la selección de un solo elemento confundiría.
              if (target.layer === 'campusBuildings' || next === picked) viewer?.select(null, false);
              if (next !== picked) onPick(next);
            }}
            onPointPick={(lat, lon) => mode === 'point' && onPick(pointOutline({ lat, lon }))}
          />
        </div>
      )}
      <p className={cn('text-sm', picked ? 'text-neutral-800' : 'text-alert-warning-fg')}>
        {picked ? <>Contorno: <strong>{label}</strong></> : 'Todavía no se eligió el contorno.'}
      </p>
      {buildingIds.length > 1 && (
        <ul className="flex flex-wrap gap-2">
          {buildingIds.map((id) => (
            <li key={id} className="flex items-center gap-1 rounded-full border border-neutral-200 py-0.5 pl-3 pr-1 text-xs text-neutral-700">
              {buildingName(data, id)}
              <button
                type="button"
                aria-label={`Quitar ${buildingName(data, id)}`}
                onClick={() => onPick(toggleBuilding(data, buildingIds, id))}
                className="rounded-full px-1.5 text-neutral-500 hover:bg-neutral-100"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
