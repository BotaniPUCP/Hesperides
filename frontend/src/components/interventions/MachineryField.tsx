'use client';

import { useRequest } from '@/hooks/useRequest';
import { campusEventsApi } from '@/lib/campus-events-api';

const WEEKEND = new Set([0, 6]);

const isWeekend = (isoDate: string) => WEEKEND.has(new Date(`${isoDate}T12:00:00Z`).getUTCDay());

/**
 * SPEC-115 D-01: un tipo que sugiere maquinaria marca la casilla mientras nadie la haya tocado;
 * cambiar a un tipo que no la sugiere no la desmarca.
 */
export function machineryAfterTypeChange(state: { checked: boolean; touched: boolean }, suggests: boolean): boolean {
  return state.touched ? state.checked : state.checked || suggests;
}

interface Props {
  date: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

/**
 * La casilla «Usa maquinaria de corte» y su aviso en línea (SPEC-115 §5.2). El aviso es una
 * ayuda: si el día no es sábado, domingo ni feriado, el backend tampoco deja guardar.
 */
export function MachineryField({ date, checked, onChange }: Props) {
  const weekday = checked && date !== '' && !isWeekend(date);
  const { data } = useRequest(weekday ? `machinery-holiday:${date}` : null,
    () => campusEventsApi.occurrences(date, date, 'HOLIDAY'));
  const notAllowed = weekday && data !== null && data !== undefined && data.length === 0;

  return (
    <div className="grid gap-1 text-sm sm:col-span-2">
      <label className="flex items-center gap-2 text-neutral-700">
        <input type="checkbox" className="accent-brand-600" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        Usa maquinaria de corte (motosierra, podadora de altura)
      </label>
      {notAllowed && (
        <p role="status" className="rounded-md border border-alert-warning-border bg-alert-warning-bg px-2 py-1 text-xs text-alert-warning-fg">
          La maquinaria de corte solo se programa sábados, domingos o feriados.
        </p>
      )}
    </div>
  );
}
