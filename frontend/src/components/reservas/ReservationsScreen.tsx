'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { Reservation } from '@shared/types';
import { PageHeader } from '@/components/layouts/PageHeader';
import { Button, EmptyState, LoadingSkeleton, Select } from '@/components/ui';
import { useCanMaintainReservations, useCanRecordUsage, useReservationGardens, useReservationOrganizations, useReservations } from '@/hooks/useReservations';
import { useListUrlState } from '@/hooks/useListUrlState';
import { isoDateFrom, pageFrom } from '@/lib/listUrl';
import { addDays, dayHeading, reservationDay, todayInLima } from '@/lib/reservation-format';
import { RESERVATIONS_PAGE_SIZE } from '@/lib/reservations-api';
import { CancelReservationDialog } from './CancelReservationDialog';
import { ReservationCard } from './ReservationCard';

const LIST_PATH = '/reservas';
const DEFAULTS = { desde: '', hasta: '', jardin: '', organizacion: '', anuladas: '', page: '0' };
const DEFAULT_DAYS = 30;

function groupByDay(items: Reservation[]): [string, Reservation[]][] {
  const groups = new Map<string, Reservation[]>();
  for (const reservation of items) {
    const day = reservationDay(reservation.startsAt);
    const group = groups.get(day);
    if (group) group.push(reservation);
    else groups.set(day, [reservation]);
  }
  return [...groups.entries()];
}

/**
 * La agenda de reservas (SPEC-107 §5.2): por defecto desde hoy y 30 días
 * adelante, sin anuladas, agrupada por día local. Los filtros viven en la URL.
 */
export function ReservationsScreen() {
  const { values, setValues } = useListUrlState(LIST_PATH, DEFAULTS);
  const canMaintain = useCanMaintainReservations();
  const canRecordUsage = useCanRecordUsage();
  const today = todayInLima();
  const from = isoDateFrom(values.desde) || today;
  const to = isoDateFrom(values.hasta) || addDays(today, DEFAULT_DAYS);
  const placeId = /^\d+$/.test(values.jardin) ? Number(values.jardin) : undefined;
  const page = pageFrom(values.page);
  const [version, setVersion] = useState(0);
  const { result, loading, errorMessage } = useReservations({
    from, to, placeId, organizationCode: values.organizacion || undefined,
    includeCancelled: values.anuladas === 'true',
  }, page, version);
  const { gardens } = useReservationGardens();
  const { organizations } = useReservationOrganizations();
  const [cancelling, setCancelling] = useState<Reservation | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const groups = useMemo(() => groupByDay(result.items), [result.items]);
  const lastPage = Math.max(0, Math.ceil(result.total / RESERVATIONS_PAGE_SIZE) - 1);

  function filter(patch: Partial<typeof DEFAULTS>) {
    setValues({ page: '0', ...patch });
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Agenda de reservas"
        description="Qué organización usa qué jardín prestable y cuándo. Los avisos de cruce o de trabajo cercano informan, pero no impiden reservar."
        actions={canMaintain && (
          <>
            <Link href="/reservas/importar"
              className="rounded-md border border-neutral-200 bg-neutral-0 px-4 py-2 text-sm font-semibold text-neutral-900 hover:bg-neutral-50">
              Registro masivo
            </Link>
            <Link href="/reservas/nueva"
              className="rounded-md bg-forest-700 px-4 py-2 text-sm font-semibold text-white hover:bg-forest-800">
              Nueva reserva
            </Link>
          </>
        )} />

      <section className="surface-card grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="Filtros">
        <label className="grid gap-1 text-sm font-medium text-neutral-700">
          Desde
          <input type="date" value={from} onChange={(event) => filter({ desde: event.target.value })}
            className="h-10 rounded-md border border-neutral-200 bg-neutral-0 px-3 text-base text-neutral-900" />
        </label>
        <label className="grid gap-1 text-sm font-medium text-neutral-700">
          Hasta
          <input type="date" value={to} onChange={(event) => filter({ hasta: event.target.value })}
            className="h-10 rounded-md border border-neutral-200 bg-neutral-0 px-3 text-base text-neutral-900" />
        </label>
        <Select id="filter-garden" label="Jardín" value={placeId === undefined ? null : String(placeId)}
          clearable options={gardens.map((g) => ({ id: g.id, code: String(g.id), label: g.name }))}
          onChange={(option) => filter({ jardin: option === null ? '' : String(option.id) })} />
        <Select id="filter-organization" label="Organización" value={values.organizacion || null}
          clearable options={organizations.map((o) => ({ id: 0, code: o.code, label: o.name }))}
          onChange={(option) => filter({ organizacion: option?.code ?? '' })} />
        <label className="flex items-center gap-2 self-end text-sm text-neutral-800">
          <input type="checkbox" checked={values.anuladas === 'true'}
            onChange={(event) => filter({ anuladas: event.target.checked ? 'true' : '' })} />
          Incluir anuladas
        </label>
        <div className="self-end">
          <Button variant="ghost" onClick={() => setValues({ ...DEFAULTS })}>Limpiar filtros</Button>
        </div>
      </section>

      {notice && (
        <p role="status" className="rounded-md bg-alert-success-bg p-3 text-sm text-alert-success-fg">{notice}</p>
      )}

      {errorMessage ? (
        <p role="alert" className="rounded-md bg-alert-danger-bg p-3 text-sm text-alert-danger-fg">
          No se pudo cargar la agenda. {errorMessage}
        </p>
      ) : loading ? (
        <LoadingSkeleton variant="table-row" count={6} />
      ) : result.items.length === 0 ? (
        <EmptyState title="No hay reservas en este rango"
          description="Prueba con otro rango de fechas o incluye las anuladas." />
      ) : (
        <div className="space-y-6">
          {groups.map(([day, reservations]) => (
            <section key={day} aria-label={dayHeading(day)} className="space-y-2">
              <h2 className="text-base font-bold text-neutral-900">{dayHeading(day)}</h2>
              <ul className="space-y-2">
                {reservations.map((reservation) => (
                  <ReservationCard key={reservation.code} reservation={reservation}
                    canMaintain={canMaintain} canRecordUsage={canRecordUsage}
                    onCancel={setCancelling}
                    onUsageChanged={(saved) => {
                      setVersion((v) => v + 1);
                      setNotice(saved.spaceUsed
                        ? `Reserva ${saved.code} marcada en uso.`
                        : `Se quitó la marca de uso de ${saved.code}.`);
                    }} />
                ))}
              </ul>
            </section>
          ))}

          <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-neutral-600">
            <p>{result.total} {result.total === 1 ? 'reserva' : 'reservas'}</p>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="secondary" disabled={page === 0}
                onClick={() => setValues({ page: String(page - 1) })}>Anterior</Button>
              <span>Página {page + 1} de {lastPage + 1}</span>
              <Button size="sm" variant="secondary" disabled={page >= lastPage}
                onClick={() => setValues({ page: String(page + 1) })}>Siguiente</Button>
            </div>
          </div>
        </div>
      )}

      <CancelReservationDialog reservation={cancelling} onClose={() => setCancelling(null)}
        onCancelled={(reservation) => {
          setVersion((v) => v + 1);
          setNotice(`Reserva ${reservation.code} anulada.`);
        }} />
    </div>
  );
}
