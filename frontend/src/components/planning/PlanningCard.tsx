'use client';

import Link from 'next/link';
import type { PlanningRow } from '@shared/types';
import { Badge, type BadgeColor } from '@/components/ui';
import { cn } from '@/lib/cn';
import { contentsLabel, historyLine, rhythmText, stateDetail, stateLabel } from './planningTexts';

/** Color del estado según SPEC-C01: rojo atrasada, ámbar pendiente, azul abierta, verde al día. */
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
 * Una actividad de un conjunto y cuándo hay que hacerla (SPEC-203 §7). Todas las tarjetas
 * tienen la misma forma: actividad y conjunto a la izquierda, estado a la derecha, tres datos y una acción.
 */
export function PlanningCard({ row, selected, onSelect }: Props) {
  const history = historyLine(row);
  const rhythm = rhythmText(row);
  const detail = stateDetail(row).replace(/^\((.*)\)$/, '$1');
  return (
    <li className={cn('rounded-lg border bg-neutral-0 text-sm', selected ? 'border-brand-600 ring-1 ring-brand-600' : 'border-neutral-200')}>
      <button type="button" onClick={onSelect} aria-pressed={selected} className="block w-full p-4 text-left">
        <span className="flex items-start justify-between gap-4">
          <span className="min-w-0">
            <span className="block font-semibold text-neutral-900">{row.activityLabel ?? 'Actividad'}</span>
            <span className="block text-neutral-600">en <span className="font-medium text-neutral-800">{row.setName}</span></span>
          </span>
          <span className="flex max-w-[45%] shrink-0 flex-col items-end gap-1 text-right">
            <Badge label={stateLabel(row)} color={TONE[row.state]} />
            {detail && <span className="text-xs text-neutral-600">{detail}</span>}
          </span>
        </span>
        {/* Tres columnas fijas en todas las tarjetas, aunque falte la frecuencia, para que se lean igual. */}
        <dl className="mt-3 grid grid-cols-1 gap-x-4 gap-y-2 rounded-md bg-neutral-50 px-3 py-2 text-xs sm:grid-cols-3">
          <Datum label={history.label} value={history.value} />
          <Datum label="Contiene" value={contentsLabel(row.zoneCount, row.elementCount)} />
          {rhythm && <Datum label="Frecuencia" value={rhythm} />}
        </dl>
      </button>
      <Action row={row} />
    </li>
  );
}

function Datum({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-neutral-500">{label}</dt>
      <dd className="font-medium text-neutral-800">{value}</dd>
    </div>
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
  return action && <div className="flex justify-end border-t border-neutral-200 px-4 py-2">{action}</div>;
}
