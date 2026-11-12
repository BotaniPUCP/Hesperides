'use client';

import { useState } from 'react';
import type { Reservation } from '@shared/types';
import { Button, Modal, Textarea } from '@/components/ui';
import { mensajeDeApiError } from '@/lib/api-errors';
import { reservationsApi } from '@/lib/reservations-api';

interface Props {
  reservation: Reservation | null;
  onClose: () => void;
  onCancelled: (reservation: Reservation) => void;
}

/**
 * Anular no borra (SPEC-107 D-09): el motivo es obligatorio y la reserva queda
 * en la agenda como «Anulada» cuando se piden las anuladas. El formulario se
 * monta con la reserva como clave: cada apertura empieza con el campo vacío.
 */
export function CancelReservationDialog({ reservation, onClose, onCancelled }: Props) {
  return (
    <Modal isOpen={reservation !== null} onClose={onClose} title="Anular reserva" size="md">
      {reservation !== null && (
        <CancelForm key={reservation.code} reservation={reservation}
          onClose={onClose} onCancelled={onCancelled} />
      )}
    </Modal>
  );
}

function CancelForm({ reservation, onClose, onCancelled }:
  { reservation: Reservation; onClose: () => void; onCancelled: (reservation: Reservation) => void }) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  async function confirm() {
    if (reason.trim() === '') { setError('Indica el motivo de la anulación.'); return; }
    setPending(true);
    setError('');
    try {
      const cancelled = await reservationsApi.cancel(reservation.code, reason.trim(), reservation.version);
      onCancelled(cancelled);
      onClose();
    } catch (e) {
      setError(mensajeDeApiError(e));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-neutral-700">
        {reservation.place.name} · Pedido de {reservation.requestedBy.name}. La reserva no se borra:
        queda como anulada y se puede consultar.
      </p>
      <Textarea id="cancel-reason" label="Motivo de la anulación" value={reason} onChange={setReason}
        required maxLength={500} rows={3} helperText="Hasta 500 caracteres." />
      {error && <p role="alert" className="text-sm text-alert-danger-fg">{error}</p>}
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose} disabled={pending}>Volver</Button>
        <Button variant="danger" onClick={confirm} loading={pending}>Anular reserva</Button>
      </div>
    </div>
  );
}
