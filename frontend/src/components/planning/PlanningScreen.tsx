'use client';

import Link from 'next/link';
import { useState } from 'react';
import { PageHeader } from '@/components/layouts/PageHeader';
import { LoadingSkeleton } from '@/components/ui';
import { useRequest } from '@/hooks/useRequest';
import { planningApi } from '@/lib/planning-api';
import { SETS_PATH } from './GreenAreaSetsScreen';
import { PlanningCard } from './PlanningCard';
import { PlanningMap } from './PlanningMap';

/** Qué mantenimiento preventivo toca planificar y dónde (SPEC-203 §5.1). Ordenado por urgencia en el servidor. */
export function PlanningScreen() {
  const planning = useRequest('planning-rows', () => planningApi.rows());
  const [selected, setSelected] = useState<string | null>(null);
  const rows = planning.data ?? [];
  const selectedRow = rows.find((r) => `${r.setId}:${r.activityTypeItemId}` === selected) ?? null;

  return (
    <section className="space-y-6">
      <PageHeader title="Planificación preventiva"
        description="Cada tarjeta es una actividad de un conjunto de áreas verdes. Su frecuencia dice si ya toca hacerla; lo más urgente va primero." />
      {planning.loading && <LoadingSkeleton />}
      {planning.errorMessage && <p role="alert" className="text-sm text-action-danger">{planning.errorMessage}</p>}
      {planning.data && rows.length === 0 && (
        <div className="rounded-lg border border-neutral-200 bg-neutral-0 p-6 text-center">
          <p className="font-semibold text-neutral-900">Todavía no hay conjuntos para planificar</p>
          <p className="mt-1 text-sm text-neutral-500">Guarda un conjunto de jardines y elige qué actividades se planifican en él.</p>
          <Link href={SETS_PATH} className="mt-3 inline-block text-sm font-semibold text-brand-700 underline">Ir a Conjuntos</Link>
        </div>
      )}
      {rows.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <ul className="space-y-3">
            {rows.map((row) => {
              const key = `${row.setId}:${row.activityTypeItemId}`;
              return <PlanningCard key={key} row={row} selected={key === selected} onSelect={() => setSelected(key)} />;
            })}
          </ul>
          <div className="lg:sticky lg:top-4 lg:h-[70vh]">
            <PlanningMap setId={selectedRow?.setId ?? null} />
          </div>
        </div>
      )}
    </section>
  );
}
