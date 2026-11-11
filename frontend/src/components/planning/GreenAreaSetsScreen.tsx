'use client';

import Link from 'next/link';
import { format, parseISO } from 'date-fns';
import type { GreenAreaSetSummary, PlanningRow } from '@shared/types';
import { PageHeader } from '@/components/layouts/PageHeader';
import { Card, EmptyState, LoadingSkeleton } from '@/components/ui';
import { useRequest } from '@/hooks/useRequest';
import { greenAreaSetsApi } from '@/lib/green-area-sets-api';
import { planningApi } from '@/lib/planning-api';
import { STATE_TONE } from './PlanningCard';
import { contentsLabel, stateDetail, stateLabel } from './planningTexts';

export const SETS_PATH = '/intervenciones/conjuntos';

/** Hasta aquí se nombran los sectores; el resto se resume con «y N más». */
const SECTORS_SHOWN = 3;

function sectorsText(names: string[]): string {
  if (names.length <= SECTORS_SHOWN) return names.join(', ');
  return `${names.slice(0, SECTORS_SHOWN).join(', ')} y ${names.length - SECTORS_SHOWN} más`;
}

/** Lo más urgente del conjunto en la planificación: la primera fila suya, que ya viene ordenada por urgencia. */
function Urgent({ row }: { row: PlanningRow | undefined }) {
  if (!row) return <p className="text-sm text-neutral-500">Sin actividades en la planificación</p>;
  return (
    <p className="text-sm">
      <span className="text-neutral-600">Lo más urgente: </span>
      <span className="font-medium text-neutral-900">{row.activityLabel ?? 'Actividad'}</span>
      {' · '}<span className={STATE_TONE[row.state]}><strong>{stateLabel(row)}</strong> {stateDetail(row)}</span>
    </p>
  );
}

function SetCard({ set, urgent }: { set: GreenAreaSetSummary; urgent: PlanningRow | undefined }) {
  const empty = set.zoneCount + set.elementCount === 0;
  return (
    <Card>
      <Link href={`${SETS_PATH}/${set.id}`} className="block space-y-3">
        <div className="flex items-start justify-between gap-3">
          <span className="font-semibold text-neutral-900">{set.name}</span>
          <span className="whitespace-nowrap text-xs text-neutral-500">Actualizado {format(parseISO(set.updatedAt), 'dd/MM/yyyy')}</span>
        </div>
        {set.description && <p className="line-clamp-2 text-sm text-neutral-600">{set.description}</p>}
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
          <dt className="text-neutral-500">Contiene</dt>
          <dd className={empty ? 'text-action-danger' : 'font-medium text-neutral-900'}>
            {empty ? 'Nada: no aparece en la planificación' : contentsLabel(set.zoneCount, set.elementCount)}
          </dd>
          {set.sectorNames.length > 0 && <>
            <dt className="text-neutral-500">{set.sectorNames.length === 1 ? 'Sector' : 'Sectores'}</dt>
            <dd className="text-neutral-900">{sectorsText(set.sectorNames)}</dd>
          </>}
          {/* Solo ejemplares que no caen en ninguna sección: no tienen sector, pero sí dónde están. */}
          {set.sectorNames.length === 0 && !empty && <>
            <dt className="text-neutral-500">Sector</dt>
            <dd className="text-neutral-900">Fuera de toda sección</dd>
          </>}
        </dl>
        <Urgent row={urgent} />
        <div className="flex flex-wrap gap-1 border-t border-neutral-200 pt-3">
          {set.activities.map((a) => (
            <span key={a.id} className="rounded-md bg-neutral-100 px-2 py-0.5 text-xs text-neutral-700">{a.label}</span>
          ))}
        </div>
      </Link>
    </Card>
  );
}

/** Los conjuntos de áreas verdes guardados (SPEC-203 §5.2). */
export function GreenAreaSetsScreen() {
  const sets = useRequest('green-area-sets', () => greenAreaSetsApi.list());
  // La planificación solo completa la tarjeta: si falla, la lista se muestra igual.
  const rows = useRequest('green-area-sets-planning', () => planningApi.rows().catch(() => [] as PlanningRow[]));
  const firstRow = (setId: number) => rows.data?.find((r) => r.setId === setId);

  return (
    <section className="space-y-6">
      <PageHeader title="Conjuntos de áreas verdes" description="Grupos de jardines y ejemplares que se planifican y atienden juntos"
        actions={<Link href={`${SETS_PATH}/nuevo`} className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">
          Nuevo conjunto
        </Link>} />
      {sets.loading && <LoadingSkeleton />}
      {sets.errorMessage && <p role="alert" className="text-sm text-action-danger">{sets.errorMessage}</p>}
      {sets.data?.length === 0 && (
        <EmptyState title="Todavía no hay conjuntos guardados"
          description="Crea uno eligiendo sus jardines y ejemplares en el mapa; luego aparecerá en la planificación." />
      )}
      <ul className="grid gap-3 md:grid-cols-2">
        {sets.data?.map((set) => <li key={set.id}><SetCard set={set} urgent={firstRow(set.id)} /></li>)}
      </ul>
    </section>
  );
}
