'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import type { Reservation } from '@shared/types';
import { Badge } from '@/components/ui';
import { formatDateTime, stateColor, stateLabel, usageLabel } from '@/lib/reservation-format';
import { FollowupBlock } from './FollowupBlock';

interface Props {
  reservation: Reservation;
  canMaintain: boolean;
  canRecordUsage: boolean;
  updateData: (reservation: Reservation) => void;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-0.5 py-2 sm:grid-cols-[11rem_minmax(0,1fr)] sm:gap-3">
      <dt className="text-sm font-medium text-neutral-600">{label}</dt>
      <dd className="min-w-0 break-words text-neutral-900">{children}</dd>
    </div>
  );
}

/** Por qué no se puede marcar el uso, según dónde esté el reloj (D-12). */
function usageBlockedText(reservation: Reservation): string {
  if (reservation.state === 'FINISHED' || reservation.state === 'CANCELLED') {
    return 'La reserva terminó o fue anulada: el uso quedó registrado como está.';
  }
  if (reservation.state === 'UPCOMING') {
    return 'El espacio se marca en uso a partir de la hora de inicio de la reserva.';
  }
  // En curso tras el corte: la misma tolerancia que la confirmación.
  return 'Ya no se puede marcar el uso: el corte es minutos antes del fin de la reserva.';
}

/** Los datos de una reserva en su ficha (SPEC-107 §5.2), con su seguimiento de uso. */
export function ReservationDetails({ reservation, canMaintain, canRecordUsage, updateData }: Props) {
  return (
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
            <Field label="Confirmación del solicitante">
              <FollowupBlock
                entries={reservation.confirmationHistory}
                value={reservation.useConfirmed}
                labelOn="El solicitante confirmó el uso"
                labelOff="Sin confirmación del solicitante"
                buttonLabel="Registrar confirmación"
                buttonOff="Quitar confirmación"
                open={reservation.canConfirm}
                blockedText="El plazo de confirmación ya cerró: solo se confirma antes del corte."
                canChange={canMaintain}
                version={reservation.version}
                onChanged={updateData}
                code={reservation.code}
                kind="confirmation" />
            </Field>
            <Field label="Uso del espacio">
              <FollowupBlock
                entries={reservation.usageHistory}
                value={reservation.spaceUsed}
                labelOn="El espacio está siendo usado"
                labelOff={usageLabel(reservation.usageState)}
                buttonLabel="Marcar en uso"
                buttonOff="Quitar marca de uso"
                open={reservation.canRecordUsage}
                blockedText={usageBlockedText(reservation)}
                canChange={canRecordUsage}
                version={reservation.version}
                onChanged={updateData}
                code={reservation.code}
                kind="usage" />
            </Field>
          </dl>
        </section>
  );
}
