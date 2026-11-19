'use client';

import type { ImportConfirmationSummary, ImportKind } from '@shared/types';
import { Button, Modal } from '@/components/ui';

export interface ConfirmarImportacionModalProps {
  summary: ImportConfirmationSummary;
  isOpen: boolean;
  isWorking: boolean;
  error: string | null;
  onBack: () => void;
  onConfirm: () => void;
  kind?: ImportKind;
}

/** Solo confirma las cantidades del plan; el detalle permanece en la vista previa. */
export function ConfirmarImportacionModal({
  summary,
  isOpen,
  isWorking,
  error,
  onBack,
  onConfirm,
  kind,
}: ConfirmarImportacionModalProps) {
  const back = () => {
    if (!isWorking) onBack();
  };

  const sinOperacionesModal = summary.toCreate === 0 && summary.toUpdate === 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={back}
      title="Confirmar importación"
      size="sm"
      closeOnOverlayClick={!isWorking}
      closeOnEsc={!isWorking}
      footer={(
        <div className="flex w-full justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={back} disabled={isWorking}>
            Volver
          </Button>
          <Button variant="primary" size="sm" onClick={onConfirm} loading={isWorking} disabled={isWorking || sinOperacionesModal}>
            Confirmar e importar
          </Button>
        </div>
      )}
    >
      <div className="space-y-4">
        <p className="text-sm text-neutral-700">Se guardarán estas operaciones:</p>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="rounded-lg border border-neutral-200 px-4 py-3">
            <dt className="text-sm text-neutral-600">Nuevos registros</dt>
            <dd className="text-2xl font-bold text-neutral-900">{summary.toCreate}</dd>
          </div>
          <div className="rounded-lg border border-neutral-200 px-4 py-3">
            <dt className="text-sm text-neutral-600">Actualizaciones</dt>
            <dd className="text-2xl font-bold text-neutral-900">{summary.toUpdate}</dd>
          </div>
        </dl>
        {sinOperacionesModal && (
          <p role="alert" className="text-xs font-medium text-amber-800 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
            {kind === 'species'
              ? 'No hay especies que se puedan importar.'
              : 'No hay ejemplares que se puedan importar. Todas las filas del archivo serán omitidas debido a duplicados descartados o especies sin asociación.'}
          </p>
        )}
        {error && <p role="alert" className="text-sm text-action-danger">{error}</p>}
      </div>
    </Modal>
  );
}
