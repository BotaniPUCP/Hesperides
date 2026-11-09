'use client';

import Link from 'next/link';
import { Card, EmptyState, LoadingSkeleton } from '@/components/ui';
import { useRequest } from '@/hooks/useRequest';
import { greenAreaSetsApi } from '@/lib/green-area-sets-api';
import { gardensLabel } from './planningTexts';

export const SETS_PATH = '/intervenciones/conjuntos';

/** Los conjuntos de áreas verdes guardados (SPEC-203 §5.2). */
export function GreenAreaSetsScreen() {
  const sets = useRequest('green-area-sets', () => greenAreaSetsApi.list());

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Conjuntos de áreas verdes</h1>
          <p className="text-neutral-500">Grupos de jardines que se planifican y atienden juntos</p>
        </div>
        <Link href={`${SETS_PATH}/nuevo`} className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">
          Nuevo conjunto
        </Link>
      </div>
      {sets.loading && <LoadingSkeleton />}
      {sets.errorMessage && <p role="alert" className="text-sm text-action-danger">{sets.errorMessage}</p>}
      {sets.data?.length === 0 && (
        <EmptyState title="Todavía no hay conjuntos guardados"
          description="Crea uno eligiendo sus jardines en el mapa; luego aparecerá en la planificación." />
      )}
      <ul className="grid gap-3 md:grid-cols-2">
        {sets.data?.map((set) => (
          <li key={set.id}>
            <Card>
              <Link href={`${SETS_PATH}/${set.id}`} className="block space-y-1">
                <span className="block font-semibold text-neutral-900">{set.name}</span>
                <span className="block text-sm text-neutral-500">
                  {set.zoneCount === 0 ? 'sin jardines' : gardensLabel(set.zoneCount)}
                </span>
                <span className="flex flex-wrap gap-1 pt-1">
                  {set.activities.map((a) => (
                    <span key={a.id} className="rounded-md bg-neutral-100 px-2 py-0.5 text-xs text-neutral-700">{a.label}</span>
                  ))}
                </span>
              </Link>
            </Card>
          </li>
        ))}
      </ul>
    </section>
  );
}
