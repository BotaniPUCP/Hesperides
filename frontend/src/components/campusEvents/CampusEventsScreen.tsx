'use client';

import Link from 'next/link';
import type { CampusEventOccurrence, CampusEventType } from '@shared/types';
import { PageHeader } from '@/components/layouts/PageHeader';
import { EmptyState, LoadingSkeleton } from '@/components/ui';
import { useCanMaintainCampusEvents, useCampusEventOccurrences } from '@/hooks/useCampusEvents';
import { useListUrlState } from '@/hooks/useListUrlState';
import { dayHeading, todayInLima } from '@/lib/reservation-format';
import { eventHours, groupByDay, monthLabel, monthRange, shiftMonth } from './campusEventFormat';

const LIST_PATH = '/calendario';
const DEFAULTS = { mes: '', tipo: '', fecha: '' };
const MONTH = /^\d{4}-\d{2}$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

const FILTERS: { value: '' | CampusEventType; label: string }[] = [
  { value: '', label: 'Todos' }, { value: 'BLOCKING', label: 'Bloqueantes' }, { value: 'HOLIDAY', label: 'Feriados' },
];

/** El morado del globo «Evento bloqueante»; el feriado, neutro (SPEC-114 §7). */
const TYPE_CLASS: Record<CampusEventType, string> = {
  BLOCKING: 'bg-[#F3E5F5] text-[#6A1B9A] dark:bg-[#4A148C]/40 dark:text-[#E1BEE7]',
  HOLIDAY: 'bg-neutral-100 text-neutral-700',
};

function scopeText(o: CampusEventOccurrence): string {
  if (o.scope === 'CAMPUS') return 'Todo el campus';
  return `${o.zoneName ?? 'Zona'}${o.zoneActive ? '' : ' (zona dada de baja)'}`;
}

/**
 * La agenda del calendario del campus (SPEC-114 §5.2): un mes, por día, con filtro por tipo.
 * El mes vive en la URL; `fecha` (el enlace del globo del mapa) abre el mes de ese día.
 */
export function CampusEventsScreen() {
  const { values, setValues } = useListUrlState(LIST_PATH, DEFAULTS);
  const canMaintain = useCanMaintainCampusEvents();
  const month = MONTH.test(values.mes) ? values.mes
    : DATE.test(values.fecha) ? values.fecha.slice(0, 7) : todayInLima().slice(0, 7);
  const type = (values.tipo === 'BLOCKING' || values.tipo === 'HOLIDAY') ? values.tipo : null;
  const { from, to } = monthRange(month);
  const { occurrences, loading, errorMessage } = useCampusEventOccurrences(from, to, type);
  const groups = groupByDay(occurrences);
  const goTo = (next: string) => setValues({ mes: next, fecha: '' });

  return (
    <div className="space-y-6">
      <PageHeader title="Calendario del campus"
        description="Eventos bloqueantes y feriados. Al programar trabajo o reservar un jardín en esas fechas, el sistema avisa, pero no impide."
        actions={canMaintain && (
          <Link href="/calendario/nuevo" className="rounded-md bg-forest-700 px-4 py-2 text-sm font-semibold text-white hover:bg-forest-800">
            Registrar evento
          </Link>
        )} />

      <section className="surface-card flex flex-wrap items-center justify-between gap-3" aria-label="Mes y filtro">
        <div className="flex items-center gap-2">
          <button type="button" aria-label="Mes anterior" onClick={() => goTo(shiftMonth(month, -1))}
            className="rounded-md border border-neutral-200 px-2 py-1 text-sm hover:bg-neutral-50">←</button>
          <h2 className="min-w-44 text-center text-base font-semibold text-neutral-900">{monthLabel(month)}</h2>
          <button type="button" aria-label="Mes siguiente" onClick={() => goTo(shiftMonth(month, 1))}
            className="rounded-md border border-neutral-200 px-2 py-1 text-sm hover:bg-neutral-50">→</button>
          <button type="button" onClick={() => goTo(todayInLima().slice(0, 7))}
            className="rounded-md border border-neutral-200 px-3 py-1 text-sm hover:bg-neutral-50">Hoy</button>
        </div>
        <div role="group" aria-label="Tipo de evento" className="flex gap-1">
          {FILTERS.map((f) => (
            <button key={f.label} type="button" aria-pressed={(type ?? '') === f.value} onClick={() => setValues({ tipo: f.value })}
              className={`rounded-md px-3 py-1 text-sm ${(type ?? '') === f.value ? 'bg-forest-700 text-white' : 'border border-neutral-200 hover:bg-neutral-50'}`}>
              {f.label}
            </button>
          ))}
        </div>
      </section>

      {errorMessage && <p role="alert" className="text-sm text-action-danger">{errorMessage}</p>}
      {loading && occurrences.length === 0 ? <LoadingSkeleton /> : groups.length === 0 ? (
        <EmptyState title={`No hay eventos en ${monthLabel(month).split(' ')[0].toLowerCase()}`}
          description="Los eventos bloqueantes y los feriados que se registren aparecerán aquí." />
      ) : (
        <ol className="space-y-4">
          {groups.map(([day, items]) => (
            <li key={day} className="surface-card space-y-2">
              <h3 className="text-sm font-semibold text-neutral-900">{dayHeading(day)}</h3>
              <ul className="divide-y divide-neutral-100">
                {items.map((o) => <Row key={`${o.eventId}-${day}`} occurrence={o} canEdit={canMaintain} />)}
              </ul>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function Row({ occurrence: o, canEdit }: { occurrence: CampusEventOccurrence; canEdit: boolean }) {
  return (
    <li className="flex flex-wrap items-center gap-3 py-2 text-sm">
      <span className="w-28 shrink-0 tabular-nums text-neutral-600">{eventHours(o)}</span>
      <span className="min-w-0 flex-1">
        <span className="block font-medium text-neutral-900">{o.name}</span>
        <span className="block text-xs text-neutral-600">{scopeText(o)}</span>
      </span>
      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${TYPE_CLASS[o.typeCode]}`}>{o.typeLabel}</span>
      {canEdit && (
        <Link href={`/calendario/${o.eventId}`} className="text-xs font-medium text-brand-700 hover:underline">Editar</Link>
      )}
    </li>
  );
}
