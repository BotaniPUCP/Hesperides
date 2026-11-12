'use client';

import { useState } from 'react';
import type { Reservation, ReservationFollowupEntry } from '@shared/types';
import { Badge, Button } from '@/components/ui';
import { mensajeDeApiError } from '@/lib/api-errors';
import { formatDateTime } from '@/lib/reservation-format';
import { reservationsApi } from '@/lib/reservations-api';

interface Props {
  code: string;
  kind: 'confirmation' | 'usage';
  version: number;
  value: boolean;
  entries: ReservationFollowupEntry[];
  /** Si la ventana de esta marca está abierta ahora mismo (lo dice el backend). */
  open: boolean;
  canChange: boolean;
  labelOn: string;
  labelOff: string;
  buttonLabel: string;
  buttonOff: string;
  blockedText: string;
  onChanged: (reservation: Reservation) => void;
}

/**
 * Confirmación del solicitante y marca de uso del espacio (enmienda del
 * 11 nov 2026): una marca, su botón — solo dentro de su ventana — y las
 * veces que cambió, con fecha y quién.
 */
export function FollowupBlock({ code, kind, version, value, entries, open, canChange,
  labelOn, labelOff, buttonLabel, buttonOff, blockedText, onChanged }: Props) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    setError(null);
    setPending(true);
    try {
      const saved = kind === 'confirmation'
        ? await reservationsApi.confirmUse(code, !value, version)
        : await reservationsApi.recordUsage(code, !value, version);
      onChanged(saved);
    } catch (e) {
      setError(mensajeDeApiError(e));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-center gap-2">
        <Badge label={value ? labelOn : labelOff} color={value ? 'success' : 'neutral'} />
        {canChange && open && (
          <Button size="sm" variant="secondary" disabled={pending} onClick={toggle}>
            {value ? buttonOff : buttonLabel}
          </Button>
        )}
      </div>
      {canChange && !open && (
        <p className="text-xs text-neutral-500">{blockedText}</p>
      )}
      {error && (
        <p role="alert" className="rounded-md bg-alert-danger-bg p-2 text-sm text-alert-danger-fg">{error}</p>
      )}
      {entries.length > 0 && (
        <ul className="space-y-0.5 text-sm text-neutral-600">
          {entries.map((entry, index) => (
            <li key={index}>
              {entry.value ? labelOn : labelOff} — {formatDateTime(entry.at)} por {entry.by}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
