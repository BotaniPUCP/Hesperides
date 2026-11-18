'use client';

import { useState } from 'react';
import { Button, Modal } from '@/components/ui';

export interface DefinitiveDeactivationModalProps {
  entityLabel: string;
  onCancel: () => void;
  onConfirm: (reason: string) => Promise<void>;
  activeCount?: number;
}

/** Motivo obligatorio y confirmación explícita para una baja o proceso de retiro. */
export function DefinitiveDeactivationModal({
  entityLabel,
  onCancel,
  onConfirm,
  activeCount,
}: DefinitiveDeactivationModalProps) {
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasRemainingSpecimens = typeof activeCount === 'number' && activeCount > 0;

  async function confirm() {
    const normalized = reason.trim();
    if (!normalized || saving) return;
    setSaving(true);
    setError(null);
    try {
      await onConfirm(normalized);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo procesar la solicitud. Inténtalo de nuevo.');
    } finally {
      setSaving(false);
    }
  }

  const modalTitle = hasRemainingSpecimens
    ? 'Confirmar proceso de retiro'
    : 'Confirmar baja definitiva';

  const confirmButtonLabel = hasRemainingSpecimens
    ? 'Confirmar retiro'
    : 'Dar de baja';

  const reasonLabel = hasRemainingSpecimens
    ? 'Motivo del retiro'
    : 'Motivo de la baja';

  return (
    <Modal
      isOpen
      onClose={() => { if (!saving) onCancel(); }}
      title={modalTitle}
      size="sm"
      closeOnOverlayClick={!saving}
      closeOnEsc={!saving}
      footer={(
        <div className="flex w-full justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onCancel} disabled={saving}>Cancelar</Button>
          <Button variant="danger" size="sm" onClick={confirm} loading={saving} disabled={saving || !reason.trim()}>
            {confirmButtonLabel}
          </Button>
        </div>
      )}
    >
      <div className="space-y-3 text-sm text-neutral-700">
        {hasRemainingSpecimens ? (
          <div className="space-y-2.5">
            <p>
              Esta especie aún tiene <strong className="text-neutral-900">{activeCount} {activeCount === 1 ? 'ejemplar vivo' : 'ejemplares vivos'}</strong> en el campus.
            </p>
            <div className="p-3 rounded-xl bg-amber-50/90 border border-amber-200/90 text-xs text-amber-950 leading-relaxed">
              Al confirmar, <strong>no se borrará del sistema</strong> para que se pueda seguir cuidando sus ejemplares actuales, pero <strong>quedará bloqueada para registrar nuevos ejemplares</strong>. La ficha pasará a baja definitiva de forma automática cuando se retire el último ejemplar del campus.
            </div>
          </div>
        ) : (
          <p>
            La baja de <strong className="text-neutral-900">{entityLabel}</strong> es definitiva. No se borrarán
            sus historiales ni se podrá reactivar la ficha.
          </p>
        )}
        <div className="space-y-1.5">
          <label htmlFor="deactivation-reason" className="block text-sm font-medium text-neutral-800">
            {reasonLabel} <span aria-hidden="true">*</span>
          </label>
          <textarea
            id="deactivation-reason"
            aria-label={reasonLabel}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            maxLength={500}
            rows={3}
            required
            disabled={saving}
            className="w-full rounded-xl border border-neutral-300 bg-neutral-0 p-3 text-sm text-neutral-900 focus:border-brand-600 focus:outline-hidden focus:ring-1 focus:ring-brand-600"
          />
          <p className="text-xs text-neutral-500">Obligatorio; hasta 500 caracteres.</p>
        </div>
        {error && <p role="alert" className="rounded-lg bg-alert-danger-bg p-3 text-sm text-alert-danger-fg">{error}</p>}
      </div>
    </Modal>
  );
}
