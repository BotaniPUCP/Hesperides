'use client';

import { useReservationNearby } from '@/hooks/useReservations';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { SEARCH_DEBOUNCE_MS } from '@/lib/constants';
import type { InterventionLocation } from '@/lib/interventions-api';
import { ReservationWarnings } from '@/components/reservas/ReservationWarnings';

interface Props {
  date: string;
  locations: InterventionLocation[];
}

const unique = <T,>(values: T[]): T[] => [...new Set(values)];

/**
 * Las reservas que tocan las ubicaciones de una intervención (SPEC-107 §5.3):
 * en el mismo jardín o a la distancia configurada. Solo informan, no bloquean
 * (D-07); con más de 20 se muestran 20 y «y N más».
 */
export function ReservationNearbyNotice({ date, locations }: Props) {
  const zoneIds = unique(locations.map((l) => l.zoneId).filter((id): id is number => id !== null));
  const placeIds = unique(locations.map((l) => l.placeId).filter((id): id is number => id !== null));
  const elementIds = unique(locations.flatMap((l) => l.elementIds ?? [])).filter((id) => Number.isFinite(id));
  const points = locations
    .filter((l) => l.location !== null && Number.isFinite(l.location.latitude) && Number.isFinite(l.location.longitude))
    .map((l) => `${l.location!.latitude},${l.location!.longitude}`)
    .join(';');
  const elementCodes = unique(locations.flatMap((l) => [...(l.elementCodes ?? []), ...(l.linkedElementCodes ?? [])]))
    .filter((code) => code.trim() !== '');

  // Los códigos se escriben a mano: esperar a que la persona deje de teclear evita una consulta por letra.
  const settledPoints = useDebouncedValue(points, SEARCH_DEBOUNCE_MS);
  const settledCodes = useDebouncedValue(elementCodes.join(','), SEARCH_DEBOUNCE_MS);
  const codes = settledCodes === '' ? [] : settledCodes.split(',');

  const ready = date !== ''
    && (zoneIds.length > 0 || placeIds.length > 0 || elementIds.length > 0
      || settledPoints !== '' || codes.length > 0);
  const { warnings } = useReservationNearby(ready ? {
    date,
    zoneIds,
    placeIds,
    elementIds,
    points: settledPoints === '' ? undefined : settledPoints,
    elementCodes: codes,
  } : null);

  return <ReservationWarnings warnings={warnings} maxVisible={20} />;
}
