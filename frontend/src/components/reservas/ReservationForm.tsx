'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { OrganizationRef, Reservation } from '@shared/types';
import { PageHeader } from '@/components/layouts/PageHeader';
import { ContactPicker } from '@/components/directorio/ContactPicker';
import type { ContactPick } from '@/components/directorio/ContactForm';
import { OrganizationPicker } from '@/components/directorio/OrganizationPicker';
import { Button, Select, Textarea } from '@/components/ui';
import { useUnsavedChangesGuard } from '@/components/forms/unsaved/useUnsavedChangesGuard';
import { useCanMaintainReservations, useReservationCheck, useReservationGardens } from '@/hooks/useReservations';
import { mensajeDeApiError } from '@/lib/api-errors';
import { inputFromIso, isoFromInput, todayInLima } from '@/lib/reservation-format';
import { reservationsApi } from '@/lib/reservations-api';
import { ReservationTimeField as TimeField } from './ReservationTimeField';
import { ReservationWarnings } from './ReservationWarnings';

interface Props {
  initial?: Reservation;
  /** Se llama al terminar una edición, con la reserva actualizada y sus avisos. */
  onSaved?: (reservation: Reservation) => void;
  onCancel?: () => void;
}

const DEFAULT_START = '09:00';
const DEFAULT_END = '11:00';
/** `aaaa-mm-ddThh:mm` partido en su día y su hora: una reserva es de un solo día (D-01). */
const dayOf = (local: string) => local.slice(0, 10);
const timeOf = (local: string) => local.slice(11, 16);

const toPick = (contact: ReservationContactPickSource): ContactPick =>
  ({ code: contact.code, fullName: contact.fullName });

interface ReservationContactPickSource {
  code: string;
  fullName: string;
}

/**
 * Registrar o editar una reserva (SPEC-107 §5.1, D-02): «Pedido de» y su
 * solicitante son fijos, «Para» es opcional y el responsable sigue al solicitante
 * hasta que alguien lo cambia a mano. Los avisos nunca impiden guardar (D-04, D-07).
 */
export function ReservationForm({ initial, onSaved, onCancel }: Props) {
  const canMaintain = useCanMaintainReservations();
  const [dirty, setDirty] = useState(false);
  const guard = useUnsavedChangesGuard(dirty);
  const { gardens, loading: loadingGardens, errorMessage: gardensError } = useReservationGardens();

  const [placeId, setPlaceId] = useState<number | null>(initial?.place.id ?? null);
  const [requestedBy, setRequestedBy] = useState<OrganizationRef | null>(
    initial === undefined ? null : { ...initial.requestedBy, active: true });
  const [requester, setRequester] = useState<ContactPick | null>(
    initial === undefined ? null : toPick(initial.requester));
  const [requestedFor, setRequestedFor] = useState<OrganizationRef | null>(
    initial?.requestedFor === null || initial?.requestedFor === undefined
      ? null
      : { ...initial.requestedFor, active: true });
  const [responsible, setResponsible] = useState<ContactPick | null>(
    initial === undefined ? null : toPick(initial.responsible));
  /** El responsable sigue al solicitante hasta que el usuario lo cambia a mano (D-02). */
  const [responsibleTouched, setResponsibleTouched] = useState(initial !== undefined);
  const [day, setDay] = useState(initial ? dayOf(inputFromIso(initial.startsAt)) : todayInLima());
  const [startTime, setStartTime] = useState(initial ? timeOf(inputFromIso(initial.startsAt)) : DEFAULT_START);
  const [endTime, setEndTime] = useState(initial ? timeOf(inputFromIso(initial.endsAt)) : DEFAULT_END);
  const [purpose, setPurpose] = useState(initial?.purpose ?? '');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const [created, setCreated] = useState<Reservation | null>(null);

  const startsAt = day === '' || startTime === '' ? null : isoFromInput(`${day}T${startTime}`);
  const endsAt = day === '' || endTime === '' ? null : isoFromInput(`${day}T${endTime}`);
  const checkable = placeId !== null && startsAt !== null && endsAt !== null && endsAt > startsAt;
  const check = useReservationCheck(checkable
    ? { placeId, startsAt, endsAt, excludeCode: initial?.code }
    : null);

  if (!canMaintain) {
    return <p role="alert" className="text-sm text-alert-danger-fg">No tienes permiso para registrar reservas.</p>;
  }

  function chooseRequester(next: ContactPick | null) {
    setRequester(next);
    setDirty(true);
    if (!responsibleTouched) setResponsible(next);
  }

  function chooseResponsible(next: ContactPick | null) {
    setResponsible(next);
    setResponsibleTouched(true);
    setDirty(true);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    if (placeId === null) { setError('Elige el jardín que se va a reservar.'); return; }
    if (initial === undefined && (requestedBy === null || requester === null)) {
      setError('Elige la organización que pide el jardín y su solicitante.');
      return;
    }
    if (responsible === null) { setError('Indica un responsable.'); return; }
    if (startsAt === null || endsAt === null) { setError('Indica la fecha, la hora de inicio y la de fin.'); return; }
    if (endsAt <= startsAt) { setError('La hora de fin debe ser posterior a la de inicio: la reserva es de un solo día.'); return; }

    const sameOrganization = requestedFor?.code === requestedBy?.code;
    const body = {
      placeId,
      requestedByCode: initial === undefined ? requestedBy?.code : undefined,
      requesterCode: initial === undefined ? requester?.code : undefined,
      requestedForCode: sameOrganization ? null : requestedFor?.code ?? null,
      responsibleCode: responsible.code,
      startsAt,
      endsAt,
      purpose: purpose.trim() === '' ? null : purpose.trim(),
      version: initial?.version ?? null,
    };

    setPending(true);
    try {
      const saved = initial === undefined
        ? await reservationsApi.create(body)
        : await reservationsApi.update(initial.code, body);
      if (onSaved) {
        onSaved(saved);
      } else {
        setDirty(false);
        setCreated(saved);
      }
    } catch (e) {
      setError(mensajeDeApiError(e));
    } finally {
      setPending(false);
    }
  }

  if (created !== null) {
    return (
      <div className="surface-card space-y-4">
        {guard.dialog}
        <p role="status" className="rounded-md bg-alert-success-bg p-3 text-sm text-alert-success-fg">
          Reserva {created.code} registrada para {created.place.name}.
        </p>
        <ReservationWarnings warnings={created.warnings} title="Avisos al guardar" />
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => guard.navigate('/reservas')}>Volver a la agenda</Button>
          <Link href={`/reservas/${created.code}`} className="inline-flex h-10 items-center px-4 text-brand-700 underline">
            Ver la ficha
          </Link>
        </div>
      </div>
    );
  }

  const gardenOptions = gardens.map((garden) => ({
    id: garden.id,
    code: String(garden.id),
    label: garden.aliases.length > 0 ? `${garden.name} (${garden.aliases.join(', ')})` : garden.name,
  }));

  return (
    <form className="space-y-6" onChange={() => setDirty(true)} onSubmit={submit}>
      {guard.dialog}
      {initial === undefined && (
        <PageHeader title="Nueva reserva"
          description="Un jardín prestable, quién lo pide y quién responde por él, todos del Directorio. Los cruces y el trabajo cercano avisan, pero no impiden guardar." />
      )}
      {error && <p role="alert" className="rounded-md bg-alert-danger-bg p-3 text-sm text-alert-danger-fg">{error}</p>}
      <fieldset disabled={pending} className="surface-card space-y-5 disabled:opacity-70">
        <legend className="sr-only">Datos de la reserva</legend>
        <Select id="reservation-garden" label="Jardín" required value={placeId === null ? null : String(placeId)}
          options={gardenOptions} loading={loadingGardens}
          errorMessage={gardensError ?? undefined}
          helperText="Solo aparecen los jardines prestables del catálogo de lugares."
          onChange={(option) => setPlaceId(option?.id ?? null)} />
        {initial === undefined ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <OrganizationPicker id="reservation-requested-by" label="Pedido de" value={requestedBy}
              onChange={(next) => { setRequestedBy(next); setRequester(null); setResponsible(null); setResponsibleTouched(false); setDirty(true); }} />
            <ContactPicker id="reservation-requester" label="Solicitante" organization={requestedBy}
              value={requester} onChange={chooseRequester} />
          </div>
        ) : (
          <p className="rounded-md border border-neutral-200 bg-neutral-50 p-3 text-sm text-neutral-700">
            <strong className="text-neutral-900">Pedido de:</strong> {initial.requestedBy.name}
            {initial.requester.role && ` · ${initial.requester.role}`} · {initial.requester.fullName}.
            Quién pidió no cambia: para corregirlo, anula esta reserva y registra otra.
          </p>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <OrganizationPicker id="reservation-requested-for" label="Para" value={requestedFor}
            helperText="Solo si la usará otra organización."
            onChange={(next) => { setRequestedFor(next); setDirty(true); }} />
          <ContactPicker id="reservation-responsible" label="Responsable" organization={null}
            searchEverywhere value={responsible} onChange={chooseResponsible} />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <TimeField label="Fecha" type="date" value={day} onChange={setDay} />
          <TimeField label="Hora de inicio" type="time" value={startTime} onChange={setStartTime} />
          <TimeField label="Hora de fin" type="time" value={endTime} onChange={setEndTime} />
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
        <Button type="submit" loading={pending}>{initial === undefined ? 'Registrar reserva' : 'Guardar cambios'}</Button>
        {initial === undefined ? (
          <Button variant="ghost" onClick={() => guard.navigate('/reservas')}>Cancelar</Button>
        ) : (
          <Button variant="ghost" onClick={onCancel}>Cancelar edición</Button>
        )}
      </div>
    </form>
  );
}
