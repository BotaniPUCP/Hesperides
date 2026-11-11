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
import { ReservationWarnings } from './ReservationWarnings';

interface Props {
  initial?: Reservation;
  /** Se llama al terminar una edición, con la reserva actualizada y sus avisos. */
  onSaved?: (reservation: Reservation) => void;
  onCancel?: () => void;
}

const DEFAULT_START = `${todayInLima()}T09:00`;
const DEFAULT_END = `${todayInLima()}T11:00`;

/**
 * Registrar o editar una reserva (SPEC-107 §5.1). Mientras haya jardín y horario
 * pide los avisos de cruce y de trabajo cercano; ninguno impide guardar (D-04, D-07).
 */
export function ReservationForm({ initial, onSaved, onCancel }: Props) {
  const canMaintain = useCanMaintainReservations();
  const [dirty, setDirty] = useState(false);
  const guard = useUnsavedChangesGuard(dirty);
  const { gardens, loading: loadingGardens, errorMessage: gardensError } = useReservationGardens();

  const [placeId, setPlaceId] = useState<number | null>(initial?.place.id ?? null);
  const [organization, setOrganization] = useState<OrganizationRef | null>(
    initial === undefined ? null : { ...initial.organization, active: true });
  const [contact, setContact] = useState<ContactPick | null>(
    initial?.contact === null || initial?.contact === undefined
      ? null
      : { code: initial.contact.code, fullName: initial.contact.fullName });
  const [starts, setStarts] = useState(initial ? inputFromIso(initial.startsAt) : DEFAULT_START);
  const [ends, setEnds] = useState(initial ? inputFromIso(initial.endsAt) : DEFAULT_END);
  const [purpose, setPurpose] = useState(initial?.purpose ?? '');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const [created, setCreated] = useState<Reservation | null>(null);

  const startsAt = starts === '' ? null : isoFromInput(starts);
  const endsAt = ends === '' ? null : isoFromInput(ends);
  const checkable = placeId !== null && startsAt !== null && endsAt !== null && endsAt > startsAt;
  const check = useReservationCheck(checkable
    ? { placeId, startsAt, endsAt, excludeCode: initial?.code }
    : null);

  if (!canMaintain) {
    return <p role="alert" className="text-sm text-alert-danger-fg">No tienes permiso para registrar reservas.</p>;
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    if (placeId === null) { setError('Elige el jardín que se va a reservar.'); return; }
    if (organization === null) { setError('Elige la organización que reserva.'); return; }
    if (startsAt === null || endsAt === null) { setError('Indica la fecha y hora de inicio y de fin.'); return; }
    if (endsAt <= startsAt) { setError('La reserva debe terminar después de empezar.'); return; }

    const body = {
      placeId,
      organizationCode: organization.code,
      contactCode: contact?.code ?? null,
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
          description="Un jardín prestable, una organización del Directorio y un horario. Los cruces y el trabajo cercano avisan, pero no impiden guardar." />
      )}
      {error && <p role="alert" className="rounded-md bg-alert-danger-bg p-3 text-sm text-alert-danger-fg">{error}</p>}
      <fieldset disabled={pending} className="surface-card space-y-5 disabled:opacity-70">
        <legend className="sr-only">Datos de la reserva</legend>
        <Select id="reservation-garden" label="Jardín" required value={placeId === null ? null : String(placeId)}
          options={gardenOptions} loading={loadingGardens}
          errorMessage={gardensError ?? undefined}
          helperText="Solo aparecen los jardines prestables del catálogo de lugares."
          onChange={(option) => setPlaceId(option?.id ?? null)} />
        <div className="grid gap-4 sm:grid-cols-2">
          <OrganizationPicker id="reservation-organization" label="Organización" value={organization}
            onChange={(next) => { setOrganization(next); setContact(null); }} />
          <ContactPicker id="reservation-contact" label="Contacto (opcional)" organization={organization}
            value={contact} onChange={setContact} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1 text-sm font-medium text-neutral-700">
            Inicio<span className="ml-0.5 text-action-danger">*</span>
            <input type="datetime-local" required value={starts}
              onChange={(event) => setStarts(event.target.value)}
              className="h-10 rounded-md border border-neutral-200 bg-neutral-0 px-3 text-base text-neutral-900" />
          </label>
          <label className="grid gap-1 text-sm font-medium text-neutral-700">
            Fin<span className="ml-0.5 text-action-danger">*</span>
            <input type="datetime-local" required value={ends}
              onChange={(event) => setEnds(event.target.value)}
              className="h-10 rounded-md border border-neutral-200 bg-neutral-0 px-3 text-base text-neutral-900" />
          </label>
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
