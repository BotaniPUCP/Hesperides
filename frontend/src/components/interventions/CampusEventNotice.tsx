'use client';

import { ReservationWarnings } from '@/components/reservas/ReservationWarnings';
import { useCampusEventCheck } from '@/hooks/useCampusEvents';
import type { InterventionLocation } from '@/lib/interventions-api';

interface Props {
  date: string;
  locations: InterventionLocation[];
}

const unique = <T,>(values: T[]): T[] => [...new Set(values)];

/**
 * Los eventos del calendario que tocan una intervención (SPEC-114 §5.4): un bloqueante en sus
 * jardines o un feriado en su fecha. Solo informan, nunca impiden guardar (D-05).
 */
export function CampusEventNotice({ date, locations }: Props) {
  const zoneIds = unique(locations.map((l) => l.zoneId).filter((id): id is number => id !== null));
  const placeIds = unique(locations.map((l) => l.placeId).filter((id): id is number => id !== null));
  const ready = date !== '' && (zoneIds.length > 0 || placeIds.length > 0);
  const { warnings } = useCampusEventCheck(ready ? { dates: [date], zoneIds, placeIds } : null);
  return <ReservationWarnings warnings={warnings} title="Calendario del campus" />;
}
