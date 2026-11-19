'use client';

import { useState } from 'react';
import type { Reservation } from '@shared/types';
import { ContactPicker } from '@/components/directorio/ContactPicker';
import type { ContactPick } from '@/components/directorio/ContactForm';
import { Button } from '@/components/ui';
import { mensajeDeApiError } from '@/lib/api-errors';
import { formatDay, formatSchedule, reservationDay } from '@/lib/reservation-format';
import { reservationsApi } from '@/lib/reservations-api';

interface Props {
  reservation: Reservation;
  onSaved: (reservation: Reservation) => void;
  onCancel: () => void;
}

/**
 * Editar una reserva es cambiar su responsable (SPEC-107 D-02c). Lo demás se ve,
 * pero no se toca: otro jardín, horario, «Para» o motivo es otra reserva.
 */
export function ResponsibleChangeForm({ reservation, onSaved, onCancel }: Props) {
  const current = { code: reservation.responsible.code, fullName: reservation.responsible.fullName };
  const [responsible, setResponsible] = useState<ContactPick | null>(current);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    if (responsible === null) { setError('Indica un responsable.'); return; }
    setPending(true);
    try {
      onSaved(await reservationsApi.changeResponsible(reservation.code, responsible.code, reservation.version));
    } catch (e) {
      setError(mensajeDeApiError(e));
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="space-y-6" onSubmit={submit}>
      {error && <p role="alert" className="rounded-md bg-alert-danger-bg p-3 text-sm text-alert-danger-fg">{error}</p>}
      <fieldset disabled={pending} className="surface-card space-y-5 disabled:opacity-70">
        <legend className="sr-only">Responsable de la reserva</legend>
        <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
          <Fixed label="Jardín" value={reservation.place.name} />
          <Fixed label="Horario" value={`${formatDay(reservationDay(reservation.startsAt), true)}, ${formatSchedule(reservation.startsAt, reservation.endsAt)}`} />
          <Fixed label="Pedido de" value={`${reservation.requestedBy.name} · ${reservation.requester.fullName}`} />
          <Fixed label="Para" value={reservation.requestedFor?.name ?? 'La misma organización que pide'} />
          <Fixed label="Motivo" value={reservation.purpose ?? '—'} />
        </dl>
        <p className="text-sm text-neutral-600">
          Solo cambia el responsable. Para otro jardín u otro horario, anula esta reserva y registra una nueva.
        </p>
        <ContactPicker id="reservation-responsible" label="Responsable" organization={null}
          searchEverywhere value={responsible} onChange={setResponsible} />
      </fieldset>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" loading={pending}>Guardar responsable</Button>
        <Button variant="ghost" onClick={onCancel}>Cancelar edición</Button>
      </div>
    </form>
  );
}

function Fixed({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-medium text-neutral-600">{label}</dt>
      <dd className="text-neutral-900">{value}</dd>
    </div>
  );
}
