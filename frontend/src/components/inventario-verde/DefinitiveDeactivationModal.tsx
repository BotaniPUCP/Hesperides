'use client';

import { useState } from 'react';
import { Button, Modal } from '@/components/ui';
import { useUnsavedChangesGuard } from '@/components/forms/unsaved/useUnsavedChangesGuard';

export interface DefinitiveDeactivationModalProps {
  entityLabel: string;
  onCancel: () => void;
  onConfirm: (reason: string) => Promise<void>;
  activeCount?: number;
}

/** Motivo obligatorio y confirmación explícita en dos pasos para una baja o proceso de retiro. */
export function DefinitiveDeactivationModal({
  entityLabel,
  onCancel,
  onConfirm,
  activeCount,
}: DefinitiveDeactivationModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isDirty = reason.trim().length > 0;
  const guard = useUnsavedChangesGuard(isDirty);
  const cerrar = () => {
    if (saving) return;
    guard.confirm(onCancel);
  };

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

  const modalTitle = step === 1
    ? (hasRemainingSpecimens ? 'Confirmar proceso de retiro · Paso 1 de 2' : 'Confirmar baja definitiva · Paso 1 de 2')
    : (hasRemainingSpecimens ? 'Resumen del proceso de retiro · Paso 2 de 2' : 'Resumen de la baja definitiva · Paso 2 de 2');

  const confirmButtonLabel = hasRemainingSpecimens
    ? 'Confirmar retiro'
    : 'Dar de baja';

  const reasonLabel = hasRemainingSpecimens
    ? 'Motivo del retiro'
    : 'Motivo de la baja';

  return (
    <>
      <Modal
        isOpen
        onClose={cerrar}
        title={modalTitle}
        size="sm"
        closeOnOverlayClick={!saving}
        closeOnEsc={!saving}
        footer={
          step === 1 ? (
            <div className="flex w-full justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={cerrar} disabled={saving}>
                Cancelar
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setStep(2)}
                disabled={saving || !reason.trim()}
              >
                Continuar →
              </Button>
            </div>
          ) : (
            <div className="flex w-full justify-between items-center gap-2">
              <Button variant="secondary" size="sm" onClick={() => setStep(1)} disabled={saving}>
                ← Atrás
              </Button>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={cerrar} disabled={saving}>
                  Cancelar
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={confirm}
                  loading={saving}
                  disabled={saving}
                >
                  {confirmButtonLabel}
                </Button>
              </div>
            </div>
          )
        }
      >
        <div className="space-y-3.5 text-sm text-neutral-700">
          {step === 1 ? (
            <>
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
                  La baja de <strong className="text-neutral-900">{entityLabel}</strong> es definitiva e irreversible. No se borrarán sus historiales.
                </p>
              )}

              <div className="space-y-1.5">
                <label htmlFor="deactivation-reason" className="block text-sm font-medium text-neutral-800">
                  {reasonLabel} <span aria-hidden="true" className="text-red-500">*</span>
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
                  placeholder={`Explica brevemente el motivo para proceder con ${hasRemainingSpecimens ? 'el retiro' : 'la baja'}...`}
                  className="w-full rounded-xl border border-neutral-300 bg-neutral-0 p-3 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-brand-600 focus:outline-hidden focus:ring-1 focus:ring-brand-600"
                />
                <div className="flex justify-between items-center text-xs text-neutral-500">
                  <span>Obligatorio; hasta 500 caracteres.</span>
                  <span>{reason.length}/500</span>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Paso 2: Resumen consolidado de la acción */}
              {hasRemainingSpecimens ? (
                <div className="rounded-xl border border-amber-200/90 bg-amber-50/70 p-3.5 space-y-2 text-xs text-neutral-700">
                  <div className="flex items-center justify-between pb-2 border-b border-amber-200/60">
                    <span className="text-neutral-600 font-medium">Especie a retirar:</span>
                    <strong className="text-neutral-900 font-bold text-sm italic">{entityLabel}</strong>
                  </div>
                  <div className="space-y-1.5 leading-relaxed">
                    <p className="font-semibold text-amber-950 flex items-center gap-1.5">
                      <span>⚠️</span>
                      <span>Impacto de la acción:</span>
                    </p>
                    <ul className="list-disc pl-4 space-y-1 text-neutral-700">
                      <li>
                        La especie pasará a estado <strong className="text-amber-900 font-semibold">En proceso de retiro</strong>.
                      </li>
                      <li>
                        Los <strong className="text-neutral-900 font-semibold">{activeCount} {activeCount === 1 ? 'ejemplar vivo' : 'ejemplares vivos'}</strong> seguirán activos para podas e intervenciones.
                      </li>
                      <li>
                        Quedará <strong className="text-neutral-900 font-semibold">bloqueada</strong> para el registro de nuevos ejemplares en Catastro.
                      </li>
                      <li>
                        Pasará a <strong className="text-neutral-900 font-semibold">baja definitiva automática</strong> cuando se retire su último ejemplar.
                      </li>
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-red-200/90 bg-red-50/70 p-3.5 space-y-2 text-xs text-neutral-700">
                  <div className="flex items-center justify-between pb-2 border-b border-red-200/60">
                    <span className="text-neutral-600 font-medium">Elemento a dar de baja:</span>
                    <strong className="text-neutral-900 font-bold text-sm">{entityLabel}</strong>
                  </div>
                  <div className="space-y-1.5 leading-relaxed">
                    <p className="font-semibold text-red-950 flex items-center gap-1.5">
                      <span>⚠️</span>
                      <span>Impacto de la acción:</span>
                    </p>
                    <ul className="list-disc pl-4 space-y-1 text-neutral-700">
                      <li>
                        El registro pasará inmediatamente a estado <strong className="text-red-900 font-semibold">Retirado / De baja</strong>.
                      </li>
                      <li>
                        Esta acción es <strong className="text-neutral-900 font-semibold">definitiva e irreversible</strong>. No se podrá reactivar.
                      </li>
                      <li>
                        Sus registros dendrométricos, fotos e intervenciones se conservarán para consulta histórica.
                      </li>
                    </ul>
                  </div>
                </div>
              )}

              {/* Tarjeta con el motivo redactado */}
              <div className="rounded-xl border border-neutral-200 bg-neutral-50/80 p-3 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-neutral-700">{reasonLabel}:</span>
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    disabled={saving}
                    className="text-xs font-semibold text-brand-700 hover:text-brand-900 hover:underline cursor-pointer"
                  >
                    Editar motivo
                  </button>
                </div>
                <p className="text-xs text-neutral-800 italic break-words whitespace-pre-wrap bg-neutral-0 p-2.5 rounded-lg border border-neutral-200/60">
                  «{reason.trim()}»
                </p>
              </div>

              <p className="text-xs text-neutral-600 font-medium">
                ¿Confirmas ejecutar la acción con los datos y el motivo indicados?
              </p>
            </>
          )}

          {error && <p role="alert" className="rounded-lg bg-alert-danger-bg p-3 text-sm text-alert-danger-fg">{error}</p>}
        </div>
      </Modal>
      {guard.dialog}
    </>
  );
}
