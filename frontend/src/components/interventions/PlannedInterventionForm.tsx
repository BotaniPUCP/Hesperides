'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { GreenAreaSetDetail, PlanningRow } from '@shared/types';
import { Button, LoadingSkeleton } from '@/components/ui';
import { contentsLabel } from '@/components/planning/planningTexts';
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
 * Van por código para que se vean en la caja «Agregar ejemplares por código» y se
 * puedan quitar antes de guardar.
 */
const specimensLocation = (codes: string[]): InterventionLocation => ({ clientReference: createClientUuid(), zoneId: null,
  placeId: null, location: null, elementIds: [], elementCodes: codes, description: 'Ejemplares del conjunto', unitItemId: null, requestedQuantity: null });

async function loadPlan(setId: number, activityId: number) {
  const [set, rows] = await Promise.all([greenAreaSetsApi.get(setId), planningApi.rows()]);
  const row = rows.find((r) => r.setId === setId && r.activityTypeItemId === activityId) ?? null;
  return { set, row };
}

/** El registro prellenado con todo el conjunto o, si se pide, solo con lo que falta. */
function prefillFor(set: GreenAreaSetDetail, row: PlanningRow | null, activityId: number, onlyPending: boolean): InterventionPrefill {
  const zones = onlyPending && row ? set.zones.filter((z) => row.pendingZoneIds.includes(z.id)) : set.zones;
  const elements = onlyPending && row ? set.elements.filter((e) => row.pendingElementIds.includes(e.id)) : set.elements;
  return {
    typeId: activityId,
    date: row?.suggestedDate ?? '',
    description: `Planificada desde: ${row?.activityLabel ?? 'mantenimiento'} en ${set.name}`,
    locations: [...zones.map((z) => locationFor(z.id)),
      ...(elements.length > 0 ? [specimensLocation(elements.map((e) => e.code))] : [])],
  };
}

/**
 * Registro de intervención lleno desde una fila de planificación (SPEC-203 §5.6). Con
 * {@code onlyPending} propone solo lo que falta, y ofrece sumar lo que ya está al día.
 */
export function PlannedInterventionForm({ setId, activityId, onlyPending = false }: { setId: number; activityId: number; onlyPending?: boolean }) {
  const plan = useRequest(`plan-prefill:${setId}:${activityId}`, () => loadPlan(setId, activityId));
  const [pendingOnly, setPendingOnly] = useState(onlyPending);
  const row = plan.data?.row ?? null;
  const pending = row ? row.pendingZoneIds.length + row.pendingElementIds.length : 0;
  const total = plan.data ? plan.data.set.zones.length + plan.data.set.elements.length : 0;
  // Si ya no falta nada (o la fila no lo sabe), no hay nada que recortar: va el conjunto entero.
  const trimmed = pendingOnly && pending > 0 && pending < total;
  // Una vez por elección: el formulario toma el prellenado al montarse, con sus propios ids de ubicación.
  const prefill = useMemo(() => (plan.data ? prefillFor(plan.data.set, plan.data.row, activityId, trimmed) : null),
    [plan.data, activityId, trimmed]);
  if (plan.errorMessage) return <p role="alert" className="text-sm text-action-danger">{plan.errorMessage}</p>;
  if (!plan.data || !prefill) return <LoadingSkeleton />;
  const open = row?.openIntervention ?? null;
  return (
    <div className="space-y-4">
      {open && (
        <p role="status" className="rounded-md border border-alert-warning-border bg-alert-warning-bg p-3 text-sm text-alert-warning-fg">
          Ya hay una intervención abierta para esto: <Link href={`/intervenciones/${open.id}`} className="underline">{open.code}</Link>.
          Puedes crear otra igual.
        </p>
      )}
      {trimmed && row && (
        <div role="status" className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-neutral-200 bg-neutral-50 p-3 text-sm text-neutral-700">
          <span>Se propone solo lo que falta: {contentsLabel(row.pendingZoneIds.length, row.pendingElementIds.length)}.
            Lo demás del conjunto ya está al día.</span>
          <Button variant="secondary" size="sm" onClick={() => setPendingOnly(false)}>Incluir todo el conjunto</Button>
        </div>
      )}
      {/* Cambiar entre «lo que falta» y «todo» vuelve a armar el formulario con esas ubicaciones. */}
      <InterventionForm key={trimmed ? 'pendientes' : 'todo'} prefill={prefill} />
    </div>
  );
}
