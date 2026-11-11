'use client';

import Link from 'next/link';
import type { PlanningRow } from '@shared/types';
import { cn } from '@/lib/cn';
import { lastLine, rhythmText, rowTitle, stateDetail, stateLabel } from './planningTexts';

/** Color del estado según SPEC-C01: rojo atrasada, ámbar toca, azul abierta, verde al día. */
/** El color de cada estado; también lo usa la lista de conjuntos. */
export const STATE_TONE: Record<PlanningRow['state'], string> = {
  OVERDUE: 'text-action-danger',
  DUE: 'text-alert-warning-fg',
  IN_PROGRESS: 'text-info-600',
  SCHEDULED: 'text-info-600',
  NOT_DUE: 'text-success-600',
  DONE_FOR_PERIOD: 'text-success-600',
  NOT_CONFIGURED: 'text-neutral-500',
};

const PLANNABLE: PlanningRow['state'][] = ['OVERDUE', 'DUE', 'NOT_DUE'];

export function planHref(row: PlanningRow): string {
  return `/intervenciones/nueva?conjunto=${row.setId}&actividad=${row.activityTypeItemId}`;
}

interface Props {
  row: PlanningRow;
  selected: boolean;
  onSelect: () => void;
}

/** Una fila de planificación en tres líneas (SPEC-203 §7). */
export function PlanningCard({ row, selected, onSelect }: Props) {
  return (
    <li className={cn('rounded-lg border bg-neutral-0 p-3 text-sm', selected ? 'border-brand-600 ring-1 ring-brand-600' : 'border-neutral-200')}>
      <button type="button" onClick={onSelect} aria-pressed={selected} className="block w-full text-left">
        <span className="flex flex-wrap items-baseline justify-between gap-2">
          <strong className="text-neutral-900">{rowTitle(row)}</strong>
          <span className={STATE_TONE[row.state]}>
            <strong>{stateLabel(row)}</strong> {stateDetail(row)}
          </span>
        </span>
        <span className="mt-1 block text-neutral-700">{lastLine(row)}</span>
        {rhythmText(row) && <span className="mt-0.5 block text-xs text-neutral-500">{rhythmText(row)}</span>}
      </button>
      <div className="mt-2">
        {PLANNABLE.includes(row.state) && (
          <Link href={planHref(row)} className="inline-block rounded-md bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700">
            Planificar intervención
          </Link>
        )}
        {row.openIntervention && (
          <Link href={`/intervenciones/${row.openIntervention.id}`} className="text-xs font-semibold text-brand-700 underline">
            Ver intervención
          </Link>
        )}
      </div>
    </li>
  );
}
