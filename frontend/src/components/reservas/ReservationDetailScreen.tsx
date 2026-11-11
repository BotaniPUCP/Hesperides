'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import type { Reservation } from '@shared/types';
import { PageHeader } from '@/components/layouts/PageHeader';
import { Badge, Button, EmptyState, LoadingSkeleton } from '@/components/ui';
import { useCanMaintainReservations, useReservation } from '@/hooks/useReservations';
import { formatDay, formatDateTime, isEditable, stateColor, stateLabel } from '@/lib/reservation-format';
import { CancelReservationDialog } from './CancelReservationDialog';
import { ReservationForm } from './ReservationForm';
import { ReservationWarnings } from './ReservationWarnings';

interface Props {
  code: string;
  startEditing?: boolean;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-0.5 py-2 sm:grid-cols-[11rem_minmax(0,1fr)] sm:gap-3">
      <dt className="text-sm font-medium text-neutral-600">{label}</dt>
      <dd className="min-w-0 break-words text-neutral-900">{children}</dd>
    </div>
  );
}

/** La ficha de una reserva (SPEC-107 §5.2). Editar es en línea, solo ADMIN y COORDINADOR. */
export function ReservationDetailScreen({ code, startEditing = false }: Props) {
  const router = useRouter();
  const canMaintain = useCanMaintainReservations();
  const { reservation, loading, errorMessage, notFound, updateData } = useReservation(code);
  const [editing, setEditing] = useState(startEditing);
  const [cancelling, setCancelling] = useState(false);
  const [warnings, setWarnings] = useState<Reservation['warnings']>([]);
  const [notice, setNotice] = useState<string | null>(null);

  function leaveEditing() {
    setEditing(false);
    if (startEditing) router.replace(`/reservas/${code}`);
  }

  if (loading && reservation === null) return <LoadingSkeleton variant="text" count={8} />;
  if (notFound || (reservation === null && errorMessage === null)) {
    return <EmptyState title="Reserva no encontrada" description="Puede que el enlace esté mal escrito o que ya no tengas acceso." />;
  }
  if (reservation === null) {
    return <p role="alert" className="rounded-md bg-alert-danger-bg p-3 text-sm text-alert-danger-fg">{errorMessage}</p>;
  }

  const editable = canMaintain && isEditable(reservation.state);

  if (editing && editable) {
    return (
      <div className="space-y-6">
        <PageHeader title={`Editar ${reservation.code}`}
          description={`${reservation.place.name} · ${formatDay(reservation.startsAt.slice(0, 10), true)}`} />
        <ReservationForm initial={reservation} onCancel={leaveEditing}
          onSaved={(saved) => {
            updateData(saved);
            setWarnings(saved.warnings);
            setNotice(`Reserva ${saved.code} actualizada.`);
            leaveEditing();
          }} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title={`Reserva ${reservation.code}`}
        description={`${reservation.place.name} · Pedido de ${reservation.requestedBy.name}
          ${reservation.requestedFor ? ` para ${reservation.requestedFor.name}` : ''}`}
        actions={
          <>
            <Link href={`/reservas?jardin=${reservation.place.id}`}
              className="rounded-md border border-neutral-200 bg-neutral-0 px-4 py-2 text-sm font-semibold text-neutral-900 hover:bg-neutral-50">
              Ver en la agenda
            </Link>
            {editable && (
              <>
                <Button variant="secondary" onClick={() => setEditing(true)}>Editar</Button>
                <Button variant="danger" onClick={() => setCancelling(true)}>Anular</Button>
              </>
            )}
          </>
        } />

      {notice && (
        <p role="status" className="rounded-md bg-alert-success-bg p-3 text-sm text-alert-success-fg">{notice}</p>
      )}
      {warnings.length > 0 && <ReservationWarnings warnings={warnings} title="Avisos al guardar" />}

      <section className="surface-card">
        <div className="flex flex-wrap items-center gap-2">
          <Badge label={stateLabel(reservation.state)} color={stateColor(reservation.state)}
            className={reservation.state === 'CANCELLED' ? 'line-through' : undefined} />
          {reservation.state === 'CANCELLED' && reservation.cancelReason && (
            <span className="text-sm text-neutral-600">Motivo: {reservation.cancelReason}</span>
          )}
        </div>
        <dl className="mt-3 divide-y divide-neutral-100">
          <Field label="Jardín">
            <Link href={`/lugares/${reservation.place.code}`} className="text-brand-700 hover:underline">
              {reservation.place.name}
            </Link>
            <span className="ml-2 text-sm text-neutral-600">{reservation.place.code}</span>
          </Field>
          <Field label="Pedido de">
            {reservation.requestedBy.name}
            <span className="ml-2 text-sm text-neutral-600">
              Solicitó {reservation.requester.fullName}
              {reservation.requester.role && ` (${reservation.requester.role})`}
            </span>
          </Field>
          <Field label="Para">{reservation.requestedFor?.name ?? 'La misma organización que pide'}</Field>
          <Field label="Responsable">
            {reservation.responsible.fullName}
            {reservation.responsible.role && ` · ${reservation.responsible.role}`}
            {reservation.responsible.mobile && (
              <> · <a href={`tel:${reservation.responsible.mobile}`} className="text-brand-700 hover:underline">
                {reservation.responsible.mobile}
              </a></>
            )}
            {reservation.responsible.extension && ` · anexo ${reservation.responsible.extension}`}
          </Field>
          {reservation.responsibleHistory.length > 1 && (
            <Field label="Responsables anteriores">
              <ul className="space-y-0.5 text-sm text-neutral-600">
                {reservation.responsibleHistory.slice(0, -1).map((entry) => (
                  <li key={`${entry.contact.code}-${entry.assignedAt}`}>
                    {entry.contact.fullName}
                    {entry.contact.role && ` (${entry.contact.role})`} — {formatDateTime(entry.assignedAt)}
                    {' '}por {entry.assignedBy}
                  </li>
                ))}
              </ul>
            </Field>
          )}
          <Field label="Inicio">{formatDateTime(reservation.startsAt)}</Field>
          <Field label="Fin">{formatDateTime(reservation.endsAt)}</Field>
          <Field label="Motivo">{reservation.purpose ?? '—'}</Field>
        </dl>
      </section>

      <CancelReservationDialog reservation={cancelling ? reservation : null}
        onClose={() => setCancelling(false)}
        onCancelled={(cancelled) => {
          updateData(cancelled);
          setWarnings([]);
          setNotice(`Reserva ${cancelled.code} anulada.`);
        }} />
    </div>
  );
}
