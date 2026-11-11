'use client';

import Link from 'next/link';
import { LoadingSkeleton } from '@/components/ui';
import { useRequest } from '@/hooks/useRequest';
import { createClientUuid } from '@/lib/client-uuid';
import { greenAreaSetsApi } from '@/lib/green-area-sets-api';
import type { InterventionLocation } from '@/lib/interventions-api';
import { planningApi } from '@/lib/planning-api';
import { InterventionForm, type InterventionPrefill } from './InterventionForm';

const locationFor = (zoneId: number): InterventionLocation => ({ clientReference: createClientUuid(), zoneId, placeId: null,
  location: null, elementIds: [], description: '', unitItemId: null, requestedQuantity: null });

/**
 * Los ejemplares del conjunto van juntos en una ubicación propia: nombrarlos uno
 * por uno daría decenas de tarjetas, y una ubicación con solo ejemplares es válida.
 */
const specimensLocation = (elementIds: number[]): InterventionLocation => ({ clientReference: createClientUuid(), zoneId: null,
  placeId: null, location: null, elementIds, description: 'Ejemplares del conjunto', unitItemId: null, requestedQuantity: null });

async function loadPrefill(setId: number, activityId: number) {
  const [set, rows] = await Promise.all([greenAreaSetsApi.get(setId), planningApi.rows()]);
  const row = rows.find((r) => r.setId === setId && r.activityTypeItemId === activityId) ?? null;
  const prefill: InterventionPrefill = {
    typeId: activityId,
    date: row?.suggestedDate ?? '',
    description: `Planificada desde: ${row?.activityLabel ?? 'mantenimiento'} en ${set.name}`,
    locations: [...set.zones.map((z) => locationFor(z.id)),
      ...(set.elements.length > 0 ? [specimensLocation(set.elements.map((e) => e.id))] : [])],
  };
  return { prefill, open: row?.openIntervention ?? null };
}

/** Registro de intervención lleno desde una fila de planificación (SPEC-203 §5.6). */
export function PlannedInterventionForm({ setId, activityId }: { setId: number; activityId: number }) {
  const plan = useRequest(`plan-prefill:${setId}:${activityId}`, () => loadPrefill(setId, activityId));
  if (plan.errorMessage) return <p role="alert" className="text-sm text-action-danger">{plan.errorMessage}</p>;
  if (!plan.data) return <LoadingSkeleton />;
  const open = plan.data.open;
  return (
    <div className="space-y-4">
      {open && (
        <p role="status" className="rounded-md border border-alert-warning-border bg-alert-warning-bg p-3 text-sm text-alert-warning-fg">
          Ya hay una intervención abierta para esto: <Link href={`/intervenciones/${open.id}`} className="underline">{open.code}</Link>.
          Puedes crear otra igual.
        </p>
      )}
      <InterventionForm prefill={plan.data.prefill} />
    </div>
  );
}
