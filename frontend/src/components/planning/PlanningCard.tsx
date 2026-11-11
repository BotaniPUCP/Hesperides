'use client';

import Link from 'next/link';
import type { PlanningRow } from '@shared/types';
import { Badge, type BadgeColor } from '@/components/ui';
import { cn } from '@/lib/cn';
import { contentsLabel, historyLine, rhythmText, stateDetail, stateLabel } from './planningTexts';

/** Color del estado según SPEC-C01: rojo atrasada, ámbar toca, azul abierta, verde al día. */
const TONE: Record<PlanningRow['state'], BadgeColor> = {
  OVERDUE: 'danger',
  DUE: 'warning',
  IN_PROGRESS: 'info',
  SCHEDULED: 'info',
  NOT_DUE: 'success',
  DONE_FOR_PERIOD: 'success',
  NOT_CONFIGURED: 'neutral',
};

const PLANNABLE: PlanningRow['state'][] = ['OVERDUE', 'DUE', 'NOT_DUE'];
const FREQUENCIES_PATH = '/intervenciones/frecuencias';

export function planHref(row: PlanningRow): string {
  return `/intervenciones/nueva?conjunto=${row.setId}&actividad=${row.activityTypeItemId}`;
}

interface Props {
  row: PlanningRow;
  selected: boolean;
  onSelect: () => void;
}

/**
 * Una actividad de un conjunto y si ya toca (SPEC-203 §7). Todas las tarjetas
 * tienen la misma forma: estado, actividad y conjunto, tres datos y una acción.
 */
export function PlanningCard({ row, selected, onSelect }: Props) {
  const history = historyLine(row);
  const rhythm = rhythmText(row);
  const detail = stateDetail(row).replace(/^\((.*)\)$/, '$1');
  return (
    <li className={cn('rounded-lg border bg-neutral-0 text-sm', selected ? 'border-brand-600 ring-1 ring-brand-600' : 'border-neutral-200')}>
      <button type="button" onClick={onSelect} aria-pressed={selected} className="block w-full p-3 text-left">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <Badge label={stateLabel(row)} color={TONE[row.state]} />
          {detail && <span className="text-xs text-neutral-600">{detail}</span>}
        </span>
        <span className="mt-2 block font-semibold text-neutral-900">{row.activityLabel ?? 'Actividad'}</span>
        <span className="block text-neutral-600">en <span className="font-medium text-neutral-800">{row.setName}</span></span>
        <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs">
          <dt className="text-neutral-500">{history.label}</dt>
          <dd className="text-neutral-800">{history.value}</dd>
          <dt className="text-neutral-500">Contiene</dt>
          <dd className="text-neutral-800">{contentsLabel(row.zoneCount, row.elementCount)}</dd>
          {rhythm && <>
            <dt className="text-neutral-500">Frecuencia</dt>
            <dd className="text-neutral-800">{rhythm}</dd>
          </>}
        </dl>
      </button>
      <Action row={row} />
    </li>
  );
}

/** La única acción de la tarjeta, siempre abajo: planificar, ver lo abierto o configurar la frecuencia. */
function Action({ row }: { row: PlanningRow }) {
  let action = null;
  if (row.openIntervention) {
    action = <Link href={`/intervenciones/${row.openIntervention.id}`} className="text-xs font-semibold text-brand-700 underline">
      Ver intervención {row.openIntervention.code}</Link>;
  } else if (PLANNABLE.includes(row.state)) {
    action = <Link href={planHref(row)} className="inline-block rounded-md bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700">
      Planificar intervención</Link>;
  } else if (row.state === 'NOT_CONFIGURED') {
    action = <Link href={FREQUENCIES_PATH} className="text-xs font-semibold text-brand-700 underline">Configurar frecuencia</Link>;
  }
  return action && <div className="border-t border-neutral-200 px-3 py-2">{action}</div>;
}
