'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { PlanningRow } from '@shared/types';
import { PageHeader } from '@/components/layouts/PageHeader';
import { Button, LoadingSkeleton } from '@/components/ui';
import { useConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useListUrlState } from '@/hooks/useListUrlState';
import { useRequest } from '@/hooks/useRequest';
import { mensajeDeApiError } from '@/lib/api-errors';
import { planningApi } from '@/lib/planning-api';
import { NEW_PLANNING_PATH, PlanningCard } from './PlanningCard';
import { filterRows, PLANNING_FILTERS, PlanningFilters } from './PlanningFilters';
import { PlanningMap } from './PlanningMap';
import { contentsLabel, partialProgress, pendingLabel } from './planningTexts';

const PATH = '/intervenciones/planificacion';
const NEW_LINK = 'rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700';

/**
 * Qué mantenimiento preventivo toca planificar y dónde (SPEC-203 §5.1). Cada tarjeta es una
 * actividad planificada en un conjunto (§3.4); vienen ordenadas por urgencia desde el servidor.
 * Los filtros van en la URL: una frecuencia enlaza aquí con su actividad puesta.
 */
export function PlanningScreen() {
  const { values: filters, setValues: setFilters } = useListUrlState(PATH, PLANNING_FILTERS);
  const [reload, setReload] = useState(0);
  const planning = useRequest(`planning-rows:${reload}`, () => planningApi.rows());
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { ask, dialog } = useConfirmDialog();
  const all = planning.data ?? [];
  const rows = filterRows(all, filters);
  const filtered = Object.values(filters).some(Boolean);
  const selectedRow = rows.find((r) => `${r.setId}:${r.activityTypeItemId}` === selected) ?? null;
  const partialSelected = selectedRow !== null && partialProgress(selectedRow) !== null;

  const remove = async (row: PlanningRow) => {
    const confirmed = await ask({
      title: 'Eliminar planificación',
      confirmLabel: 'Eliminar',
      message: <>
        <p>¿Eliminar la planificación de <strong>{row.activityLabel ?? 'esta actividad'}</strong> en <strong>{row.setName}</strong>?</p>
        <p>Dejará de aparecer aquí. Las intervenciones ya registradas no se borran.</p>
      </>,
    });
    if (!confirmed) return;
    setError(null);
    try {
      await planningApi.assignments.remove(row.assignmentId);
      setReload((n) => n + 1);
    } catch (e) {
      setError(mensajeDeApiError(e));
    }
  };

  return (
    <section className="space-y-6">
      <PageHeader title="Planificación preventiva"
        description="Una tarjeta por cada actividad planificada en un conjunto de áreas verdes, de la más urgente a la menos."
        actions={<Link href={NEW_PLANNING_PATH} className={NEW_LINK}>+ Nueva planificación</Link>} />
      {all.length > 0 && <PlanningFilters rows={all} value={filters} onChange={setFilters} />}
      {filtered && all.length > 0 && (
        <div role="status" className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-neutral-200 bg-neutral-0 px-3 py-2 text-sm">
          <span>Mostrando {rows.length} de {all.length} planificaciones.</span>
          <Button variant="secondary" size="sm" onClick={() => setFilters(PLANNING_FILTERS)}>Ver todas</Button>
        </div>
      )}
      {error && <p role="alert" className="text-sm text-action-danger">{error}</p>}
      {planning.loading && !planning.data && <LoadingSkeleton />}
      {planning.errorMessage && <p role="alert" className="text-sm text-action-danger">{planning.errorMessage}</p>}
      {planning.data && all.length === 0 && (
        <div className="rounded-lg border border-neutral-200 bg-neutral-0 p-6 text-center">
          <p className="font-semibold text-neutral-900">Todavía no hay planificaciones</p>
          <p className="mt-1 text-sm text-neutral-500">Elige qué actividad se hace en un conjunto de áreas verdes para ver aquí cuándo toca.</p>
          <Link href={NEW_PLANNING_PATH} className={`mt-3 inline-block ${NEW_LINK}`}>+ Nueva planificación</Link>
        </div>
      )}
      {all.length > 0 && rows.length === 0 && (
        <p className="rounded-lg border border-neutral-200 bg-neutral-0 p-6 text-center text-sm text-neutral-600">
          Ninguna planificación coincide con los filtros.</p>
      )}
      {rows.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <ul className="space-y-3">
            {rows.map((row) => {
              const key = `${row.setId}:${row.activityTypeItemId}`;
              return <PlanningCard key={key} row={row} selected={key === selected} onSelect={() => setSelected(key)}
                onRemove={() => remove(row)} />;
            })}
          </ul>
          <div className="flex flex-col gap-2 lg:sticky lg:top-4 lg:h-[70vh]">
            {/* Qué conjunto está en el mapa; sin tarjeta elegida, cómo verlo. */}
            <p aria-live="polite" className="rounded-md border border-neutral-200 bg-neutral-0 px-3 py-2 text-sm text-neutral-700 shadow-xs">
              {selectedRow ? <>En el mapa: <strong className="text-neutral-900">{selectedRow.setName}</strong>
                {' · '}{contentsLabel(selectedRow.zoneCount, selectedRow.elementCount)}</>
                : 'Elige una tarjeta para ver su conjunto en el mapa.'}
            </p>
            <div className="min-h-0 flex-1">
              {/* Una tarjeta nueva empieza resaltando lo que falta: la clave reinicia el mapa al cambiar de fila. */}
              <PlanningMap key={selected ?? 'ninguna'} setId={selectedRow?.setId ?? null}
                pendingZoneIds={partialSelected ? selectedRow.pendingZoneIds : null}
                pendingElementIds={partialSelected ? selectedRow.pendingElementIds : null}
                pendingLabel={partialSelected ? pendingLabel(selectedRow) : ''} />
            </div>
          </div>
        </div>
      )}
      {dialog}
    </section>
  );
}
