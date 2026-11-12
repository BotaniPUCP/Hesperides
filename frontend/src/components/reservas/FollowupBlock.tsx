'use client';

import { useState } from 'react';
import type { Reservation, ReservationFollowupEntry } from '@shared/types';
import { Button } from '@/components/ui';
import { mensajeDeApiError } from '@/lib/api-errors';
import { formatDateTime } from '@/lib/reservation-format';
import { reservationsApi } from '@/lib/reservations-api';

interface Props {
  entries: ReservationFollowupEntry[];
  value: boolean;
  labelOn: string;
  labelOff: string;
  buttonLabel: string;
  buttonOff: string;
  /** El plazo para cambiar la marca sigue abierto. */
  open: boolean;
  blockedText: string;
  canChange: boolean;
  version: number;
  onChanged: (reservation: Reservation) => void;
  code: string;
  kind: 'confirmation' | 'usage';
}

/**
 * Una marca de seguimiento de la reserva (confirmación del solicitante o uso del
 * espacio): su estado, el botón para cambiarla mientras el plazo está abierto y
 * su historial, del más reciente al más antiguo.
 */
export function FollowupBlock(props: Props) {
  const { entries, value, labelOn, labelOff, buttonLabel, buttonOff, open, blockedText, canChange } = props;
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  async function toggle() {
    setPending(true);
    setError('');
    try {
      const next = !value;
      const saved = props.kind === 'confirmation'
        ? await reservationsApi.confirmUse(props.code, next, props.version)
        : await reservationsApi.recordUsage(props.code, next, props.version);
      props.onChanged(saved);
    } catch (e) {
      setError(mensajeDeApiError(e));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="grid gap-2">
      <p className={value ? 'font-medium text-success-600' : 'text-neutral-700'}>{value ? labelOn : labelOff}</p>
      {canChange && open && (
        <div>
          <Button variant="secondary" size="sm" onClick={toggle} disabled={pending}>
            {value ? buttonOff : buttonLabel}
          </Button>
        </div>
      )}
      {canChange && !open && <p className="text-xs text-neutral-500">{blockedText}</p>}
      {error && <p role="alert" className="text-sm text-action-danger">{error}</p>}
      {entries.length > 0 && (
        <ul className="space-y-0.5 text-xs text-neutral-500">
          {[...entries].reverse().map((entry) => (
            <li key={`${entry.at}-${entry.by}`}>
              {entry.value ? 'Marcado' : 'Quitado'} el {formatDateTime(entry.at)} por {entry.by}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
