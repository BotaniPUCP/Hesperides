'use client';

import Link from 'next/link';
import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import type { GreenAreaSetSummary } from '@shared/types';
import { PageHeader } from '@/components/layouts/PageHeader';
import { Button, Card, EmptyState, LoadingSkeleton } from '@/components/ui';
import { useConfirmDialog, type ConfirmOptions } from '@/components/ui/ConfirmDialog';
import { mensajeDeApiError } from '@/lib/api-errors';
import { useRequest } from '@/hooks/useRequest';
import { greenAreaSetsApi } from '@/lib/green-area-sets-api';
import { contentsLabel } from './planningTexts';

export const SETS_PATH = '/intervenciones/conjuntos';
/** El aspecto de `<Button variant="secondary" size="sm">`, en un enlace: lleva a otra página. */
const SECONDARY_BUTTON = 'inline-flex h-8 items-center rounded-md border border-neutral-200 bg-neutral-0 px-3 text-sm font-medium text-neutral-900 transition-colors hover:bg-neutral-50 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2';
/** La misma pregunta al eliminar un conjunto desde la lista o desde su página. */
export function removeSetQuestion(name: string): ConfirmOptions {
  return {
    title: 'Eliminar conjunto',
    confirmLabel: 'Eliminar',
    message: <>
      <p>¿Eliminar <strong>{name}</strong>?</p>
      <p>Sus planificaciones se eliminan y dejará de aparecer en Planificación. Las intervenciones ya registradas no se borran.</p>
    </>,
  };
}

/** «12 Palmera, 3 Árbol»: los ejemplares por tipo, del más numeroso al menos. */
function typesText(set: GreenAreaSetSummary): string {
  return set.specimenTypes.map((t) => `${t.count} ${t.label}`).join(', ');
}

/** Lo que es el conjunto: qué tiene y de qué tipo. Qué se le planifica se ve en Planificación preventiva. */
function SetCard({ set, onRemove }: { set: GreenAreaSetSummary; onRemove: () => void }) {
  const empty = set.zoneCount + set.elementCount === 0;
  return (
    // La tarjeta llena su fila y las acciones van al pie: así se alinean con las de la tarjeta vecina.
    <Card className="flex h-full flex-col [&>div]:flex [&>div]:flex-1 [&>div]:flex-col">
      <Link href={`${SETS_PATH}/${set.id}`} className="block space-y-3">
        <div className="flex items-start justify-between gap-3">
          <span className="font-semibold text-neutral-900">{set.name}</span>
          <span className="whitespace-nowrap text-xs text-neutral-500">Actualizado {format(parseISO(set.updatedAt), 'dd/MM/yyyy')}</span>
        </div>
        {set.description && <p className="line-clamp-2 text-sm text-neutral-600">{set.description}</p>}
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
          <dt className="text-neutral-500">Contiene</dt>
          <dd className={empty ? 'text-action-danger' : 'font-medium text-neutral-900'}>
            {empty ? 'Vacío: sus jardines y ejemplares se dieron de baja' : contentsLabel(set.zoneCount, set.elementCount)}
          </dd>
          {set.specimenTypes.length > 0 && <>
            <dt className="text-neutral-500">Ejemplares</dt>
            <dd className="text-neutral-900">{typesText(set)}</dd>
          </>}
        </dl>
      </Link>
      {/* Como en las tarjetas de Planificación: quitar a la izquierda, ver a la derecha. */}
      <div className="mt-auto flex items-center gap-2 pt-3">
        <Button variant="ghost" size="sm" aria-label={`Eliminar ${set.name}`} onClick={onRemove}>Eliminar</Button>
        {!empty && (
          <Link href={`${SETS_PATH}/${set.id}#mapa`} aria-label={`Ver ${set.name} en el mapa`} className={`ml-auto ${SECONDARY_BUTTON}`}>Ver en el mapa</Link>
        )}
      </div>
    </Card>
  );
}

/** Los conjuntos de áreas verdes guardados (SPEC-203 §5.2). */
export function GreenAreaSetsScreen() {
  const [reload, setReload] = useState(0);
  const sets = useRequest(`green-area-sets:${reload}`, () => greenAreaSetsApi.list());
  const [error, setError] = useState<string | null>(null);
  const { ask, dialog } = useConfirmDialog();

  const remove = async (set: GreenAreaSetSummary) => {
    if (!(await ask(removeSetQuestion(set.name)))) return;
    setError(null);
    try {
      await greenAreaSetsApi.remove(set.id);
      setReload((n) => n + 1);
    } catch (e) {
      setError(mensajeDeApiError(e));
    }
  };

  return (
    <section className="space-y-6">
      <PageHeader title="Conjuntos de áreas verdes" description="Grupos de jardines y ejemplares que se planifican y atienden juntos"
        actions={<Link href={`${SETS_PATH}/nuevo`} className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">
          + Nuevo conjunto
        </Link>} />
      {error && <p role="alert" className="text-sm text-action-danger">{error}</p>}
      {sets.loading && !sets.data && <LoadingSkeleton />}
      {sets.errorMessage && <p role="alert" className="text-sm text-action-danger">{sets.errorMessage}</p>}
      {sets.data?.length === 0 && (
        <EmptyState title="Todavía no hay conjuntos guardados"
          description="Crea uno eligiendo sus jardines y ejemplares en el mapa; luego aparecerá en la planificación." />
      )}
      <ul className="grid gap-3 md:grid-cols-2">
        {sets.data?.map((set) => <li key={set.id}><SetCard set={set} onRemove={() => remove(set)} /></li>)}
      </ul>
      {dialog}
    </section>
  );
}
