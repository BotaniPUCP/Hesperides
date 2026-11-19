'use client';

import { useMemo, useState } from 'react';
import { useRequest } from '@/hooks/useRequest';
import { greenAreaSetsApi } from '@/lib/green-area-sets-api';
import { SetMap } from './SetMap';

const NONE: string[] = [];

interface Props {
  setId: number | null;
  /** Con avance parcial, lo que falta (las listas de la fila: estables entre renders); null si no. */
  pendingZoneIds?: number[] | null;
  pendingElementIds?: number[] | null;
  /** «2 jardines», «1 jardín y 3 ejemplares». */
  pendingLabel?: string;
}

/**
 * El campus con los jardines y ejemplares del conjunto elegido iluminados; sin conjunto, sin realce
 * (SPEC-203 §7). Con avance parcial resalta solo lo que falta, y deja ver el conjunto entero.
 */
export function PlanningMap({ setId, pendingZoneIds = null, pendingElementIds = null, pendingLabel = '' }: Props) {
  const set = useRequest(setId ? `planning-map-set:${setId}` : null, () => greenAreaSetsApi.get(setId!));
  const [whole, setWhole] = useState(false);
  const hasPending = pendingZoneIds !== null && pendingElementIds !== null;
  const onlyPending = hasPending && !whole;
  const zoneCodes = useMemo(() => (setId && set.data
    ? set.data.zones.filter((z) => !onlyPending || (pendingZoneIds ?? []).includes(z.id)).map((z) => z.code) : NONE),
  [setId, set.data, onlyPending, pendingZoneIds]);
  const specimenCodes = useMemo(() => (setId && set.data
    ? set.data.elements.filter((e) => !onlyPending || (pendingElementIds ?? []).includes(e.id)).map((e) => e.code) : NONE),
  [setId, set.data, onlyPending, pendingElementIds]);
  return (
    <div className="relative lg:h-full">
      <SetMap zoneCodes={zoneCodes} specimenCodes={specimenCodes} className="lg:h-full" />
      {hasPending && set.data && (
        <div role="group" aria-label="Qué se resalta" className="absolute bottom-3 right-3 z-30 flex items-center gap-1 rounded-md bg-neutral-0 py-1 pl-3 pr-1 text-xs font-semibold text-neutral-900 shadow">
          <span aria-live="polite" className="pr-2">{onlyPending ? `Resaltado: lo que falta (${pendingLabel})` : 'Resaltado: todo el conjunto'}</span>
          <button type="button" className="rounded px-2 py-1 text-brand-700 hover:bg-neutral-100" onClick={() => setWhole((v) => !v)}>
            {onlyPending ? 'Ver todo el conjunto' : 'Ver solo lo que falta'}</button>
        </div>
      )}
    </div>
  );
}
