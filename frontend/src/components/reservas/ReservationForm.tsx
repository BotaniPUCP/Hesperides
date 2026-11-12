'use client';

import { useState } from 'react';
import type { OrganizationRef } from '@shared/types';
import { PageHeader } from '@/components/layouts/PageHeader';
import { ContactPicker } from '@/components/directorio/ContactPicker';
import type { ContactPick } from '@/components/directorio/ContactForm';
import { OrganizationPicker } from '@/components/directorio/OrganizationPicker';
import { Button, Select, Textarea } from '@/components/ui';
import { useUnsavedChangesGuard } from '@/components/forms/unsaved/useUnsavedChangesGuard';
import { useCanMaintainReservations, useReservationCheck, useReservationGardens } from '@/hooks/useReservations';
import { mensajeDeApiError } from '@/lib/api-errors';
import { isoFromInput, todayInLima } from '@/lib/reservation-format';
import { reservationsApi } from '@/lib/reservations-api';
import { ReservationTimeField as TimeField } from './ReservationTimeField';
import { ReservationWarnings } from './ReservationWarnings';

const DEFAULT_START = '09:00';
const DEFAULT_END = '11:00';

/**
 * Registrar una reserva (SPEC-107 §5.1, D-02): el responsable sigue al solicitante
 * hasta que alguien lo cambia a mano. Los avisos nunca impiden guardar (D-04, D-07).
 * Después solo cambia el responsable (D-02c): eso es `ResponsibleChangeForm`.
 */
export function ReservationForm() {
  const canMaintain = useCanMaintainReservations();
  const [dirty, setDirty] = useState(false);
  const guard = useUnsavedChangesGuard(dirty);
  const { gardens, loading: loadingGardens, errorMessage: gardensError } = useReservationGardens();

  const [placeId, setPlaceId] = useState<number | null>(null);
  const [requestedBy, setRequestedBy] = useState<OrganizationRef | null>(null);
  const [requester, setRequester] = useState<ContactPick | null>(null);
  const [requestedFor, setRequestedFor] = useState<OrganizationRef | null>(null);
  const [responsible, setResponsible] = useState<ContactPick | null>(null);
  const [responsibleTouched, setResponsibleTouched] = useState(false);
  const [day, setDay] = useState(todayInLima());
  const [startTime, setStartTime] = useState(DEFAULT_START);
  const [endTime, setEndTime] = useState(DEFAULT_END);
  const [purpose, setPurpose] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  const startsAt = day === '' || startTime === '' ? null : isoFromInput(`${day}T${startTime}`);
  const endsAt = day === '' || endTime === '' ? null : isoFromInput(`${day}T${endTime}`);
  /** Fin no posterior al inicio: se resalta en vivo, además del aviso superior al guardar. */
  const rangeInvalid = startsAt !== null && endsAt !== null && endsAt <= startsAt;
  const checkable = placeId !== null && startsAt !== null && endsAt !== null && !rangeInvalid;
  const check = useReservationCheck(checkable ? { placeId, startsAt, endsAt } : null);

  if (!canMaintain) {
    return <p role="alert" className="text-sm text-alert-danger-fg">No tienes permiso para registrar reservas.</p>;
  }

  function chooseRequester(next: ContactPick | null) {
    setRequester(next);
    setDirty(true);
    if (!responsibleTouched) setResponsible(next);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    if (placeId === null) { setError('Elige el jardín que se va a reservar.'); return; }
    if (requestedBy === null || requester === null) {
      setError('Elige la organización que pide el jardín y su solicitante.');
      return;
    }
    if (responsible === null) { setError('Indica un responsable.'); return; }
    if (startsAt === null || endsAt === null) { setError('Indica la fecha, la hora de inicio y la de fin.'); return; }
    if (rangeInvalid) { setError('La hora de fin debe ser posterior a la de inicio: la reserva es de un solo día.'); return; }

    setPending(true);
    try {
      const saved = await reservationsApi.create({
        placeId,
        requestedByCode: requestedBy.code,
        requesterCode: requester.code,
        requestedForCode: requestedFor === null || requestedFor.code === requestedBy.code ? null : requestedFor.code,
        responsibleCode: responsible.code,
        startsAt,
        endsAt,
        purpose: purpose.trim() === '' ? null : purpose.trim(),
        version: null,
      });
      setDirty(false);
      // La confirmación es la ficha misma, con su banner y los avisos del horario.
      guard.navigate(`/reservas/${saved.code}?creada=1`);
    } catch (e) {
      setError(mensajeDeApiError(e));
    } finally {
      setPending(false);
    }
  }

  const gardenOptions = gardens.map((garden) => ({
    id: garden.id,
    code: String(garden.id),
    label: garden.aliases.length > 0 ? `${garden.name} (${garden.aliases.join(', ')})` : garden.name,
  }));

  return (
    <form className="space-y-6" onChange={() => setDirty(true)} onSubmit={submit}>
      {guard.dialog}
      <PageHeader title="Nueva reserva"
        description="Un jardín prestable, quién lo pide y quién responde por él, todos del Directorio. Los cruces y el trabajo cercano avisan, pero no impiden guardar." />
      {error && <p role="alert" className="rounded-md bg-alert-danger-bg p-3 text-sm text-alert-danger-fg">{error}</p>}
      <fieldset disabled={pending} className="surface-card space-y-5 disabled:opacity-70">
        <legend className="sr-only">Datos de la reserva</legend>
        <Select id="reservation-garden" label="Jardín" required value={placeId === null ? null : String(placeId)}
          options={gardenOptions} loading={loadingGardens}
          errorMessage={gardensError ?? undefined}
          helperText="Solo aparecen los jardines prestables del catálogo de lugares."
          onChange={(option) => setPlaceId(option?.id ?? null)} />
        <div className="grid gap-4 sm:grid-cols-2">
          <OrganizationPicker id="reservation-requested-by" label="Pedido de" value={requestedBy}
            onChange={(next) => { setRequestedBy(next); setRequester(null); setResponsible(null); setResponsibleTouched(false); setDirty(true); }} />
          <ContactPicker id="reservation-requester" label="Solicitante" organization={requestedBy}
            value={requester} onChange={chooseRequester} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <OrganizationPicker id="reservation-requested-for" label="Para" value={requestedFor}
            helperText="Solo si la usará otra organización."
            onChange={(next) => { setRequestedFor(next); setDirty(true); }} />
          <ContactPicker id="reservation-responsible" label="Responsable" organization={null}
            searchEverywhere value={responsible}
            onChange={(next) => { setResponsible(next); setResponsibleTouched(true); setDirty(true); }} />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <TimeField label="Fecha" type="date" value={day} onChange={setDay} />
          <TimeField label="Hora de inicio" type="time" value={startTime} onChange={setStartTime}
            errorMessage={rangeInvalid ? 'Debe ser anterior a la hora de fin.' : undefined} />
          <TimeField label="Hora de fin" type="time" value={endTime} onChange={setEndTime}
            errorMessage={rangeInvalid ? 'La hora de fin debe ser posterior a la de inicio.' : undefined} />
        </div>
        <Textarea id="reservation-purpose" label="Motivo" value={purpose} onChange={setPurpose}
          maxLength={300} rows={3} helperText="Opcional, hasta 300 caracteres." />
        <ReservationWarnings warnings={check.warnings} title="Avisos de este horario" />
        {check.errorMessage && (
          <p role="status" className="rounded-md border border-alert-warning-border bg-alert-warning-bg p-3 text-sm text-alert-warning-fg">
            No se pudieron consultar los avisos de este horario. Puedes guardar igual.
          </p>
        )}
      </fieldset>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" loading={pending}>Registrar reserva</Button>
        <Button variant="ghost" onClick={() => guard.navigate('/reservas')}>Cancelar</Button>
      </div>
    </form>
  );
}
