'use client';

import { useState } from 'react';
import { Button, Modal } from '@/components/ui';

export interface DefinitiveDeactivationModalProps {
  entityLabel: string;
  onCancel: () => void;
  onConfirm: (reason: string) => Promise<void>;
}

/** Motivo obligatorio y confirmación explícita para una baja que no puede revertirse. */
export function DefinitiveDeactivationModal({ entityLabel, onCancel, onConfirm }: DefinitiveDeactivationModalProps) {
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    const normalized = reason.trim();
    if (!normalized || saving) return;
    setSaving(true);
    setError(null);
    try {
      await onConfirm(normalized);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo dar de baja. Inténtalo de nuevo.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      isOpen
      onClose={() => { if (!saving) onCancel(); }}
      title="Confirmar baja definitiva"
      size="sm"
      closeOnOverlayClick={!saving}
      closeOnEsc={!saving}
      footer={(
        <div className="flex w-full justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onCancel} disabled={saving}>Cancelar</Button>
          <Button variant="danger" size="sm" onClick={confirm} loading={saving} disabled={saving || !reason.trim()}>
            Dar de baja
          </Button>
        </div>
      )}
    >
      <div className="space-y-3 text-sm text-neutral-700">
        <p>
          La baja de <strong className="text-neutral-900">{entityLabel}</strong> es definitiva. No se borrarán
          sus historiales ni se podrá reactivar la ficha.
        </p>
        <div className="space-y-1.5">
          <label htmlFor="deactivation-reason" className="block text-sm font-medium text-neutral-800">
            Motivo <span aria-hidden="true">*</span>
          </label>
          <textarea
            id="deactivation-reason"
            aria-label="Motivo de la baja"
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
