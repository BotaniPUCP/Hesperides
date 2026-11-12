'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { Reservation } from '@shared/types';
import { Badge, Button } from '@/components/ui';
import { mensajeDeApiError } from '@/lib/api-errors';
import { formatSchedule, isEditable, stateColor, stateLabel, usageColor, usageLabel } from '@/lib/reservation-format';
import { reservationsApi } from '@/lib/reservations-api';

interface Props {
  reservation: Reservation;
  canMaintain: boolean;
  canRecordUsage: boolean;
  onCancel: (reservation: Reservation) => void;
  onUsageChanged: (reservation: Reservation) => void;
}

/**
 * El botón rápido de la agenda (enmienda del 11 nov 2026): marcar o desmarcar
 * el uso del espacio sin entrar a la ficha, solo dentro del horario.
 */
function QuickUseButton({ code, used, version, onChanged }: {
  code: string; used: boolean; version: number; onChanged: (reservation: Reservation) => void;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    setError(null);
    setPending(true);
    try {
      onChanged(await reservationsApi.recordUsage(code, !used, version));
    } catch (e) {
      setError(mensajeDeApiError(e));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="w-full space-y-1">
      <Button size="sm" variant={used ? 'ghost' : 'secondary'} disabled={pending} onClick={toggle}>
        {used ? 'Quitar marca de uso' : 'Marcar en uso'}
      </Button>
      {error && (
        <p role="alert" className="rounded-md bg-alert-danger-bg p-2 text-sm text-alert-danger-fg">{error}</p>
      )}
    </div>
  );
}

/**
 * Una reserva en la agenda (SPEC-107 §5.2). Toda la tarjeta lleva a su ficha; los
 * botones quedan por encima del enlace para seguir funcionando por su cuenta.
 */
export function ReservationCard({ reservation, canMaintain, canRecordUsage, onCancel, onUsageChanged }: Props) {
  const { responsible } = reservation;
  return (
    <li className="surface-card relative flex flex-wrap items-start gap-3 transition-colors hover:bg-neutral-50">
      <p className="w-40 shrink-0 font-medium text-neutral-900">
        {formatSchedule(reservation.startsAt, reservation.endsAt)}
      </p>
      <div className="min-w-0 flex-1 basis-56">
        <p className="font-semibold text-neutral-900">
          <Link href={`/reservas/${reservation.code}`}
            className="after:absolute after:inset-0 after:rounded-2xl after:content-[''] hover:underline">
            {reservation.place.name}
          </Link>
          <span className="font-normal text-neutral-700">
            {' '}· Pedido de {reservation.requestedBy.name}
            {reservation.requestedFor && ` para ${reservation.requestedFor.name}`}
          </span>
        </p>
        <p className="text-sm text-neutral-600">
          <span className="font-medium text-neutral-700">Responsable:</span> {responsible.fullName}
          {responsible.role && ` · ${responsible.role}`}
          {responsible.mobile && ` · ${responsible.mobile}`}
        </p>
        {reservation.cancelReason && (
          <p className="text-sm text-neutral-600">Motivo de anulación: {reservation.cancelReason}</p>
        )}
      </div>
      <Badge label={stateLabel(reservation.state)} color={stateColor(reservation.state)}
        className={reservation.state === 'CANCELLED' ? 'line-through' : undefined} />
      {reservation.state !== 'CANCELLED' && (
        <div className="flex flex-wrap items-center gap-1">
          {reservation.useConfirmed && <Badge label="Confirmada" color="info" />}
          <Badge label={usageLabel(reservation.usageState)} color={usageColor(reservation.usageState)} />
        </div>
      )}
      {canRecordUsage && reservation.canRecordUsage && (
        <div className="relative z-10 w-full">
          <QuickUseButton code={reservation.code} used={reservation.spaceUsed} version={reservation.version}
            onChanged={onUsageChanged} />
        </div>
      )}
      {canMaintain && isEditable(reservation.state) && (
        <div className="relative z-10 flex gap-1">
          <Link href={`/reservas/${reservation.code}?editar=1`}
            className="inline-flex h-8 items-center rounded-md px-3 text-sm text-brand-700 hover:bg-neutral-50">
            Editar
          </Link>
          <Button size="sm" variant="ghost" onClick={() => onCancel(reservation)}>Anular</Button>
        </div>
      )}
    </li>
  );
}
