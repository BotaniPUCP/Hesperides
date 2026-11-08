'use client';

import { useState, type ReactNode } from 'react';
import { Button } from '@/components/ui';
import { ConfirmActionModal } from '@/components/users/ConfirmActionModal';
import { mensajeDeApiError } from '@/lib/api-errors';

interface DeactivateActionProps {
  title: string;
  /** Qué pasa al dar de baja, para decidir con eso a la vista. */
  children: ReactNode;
  deactivate: () => Promise<unknown>;
  onDone: () => void;
}

/** «Dar de baja» con confirmación. Es baja lógica: lo que ya lo usaba lo sigue mostrando. */
export function DeactivateAction({ title, children, deactivate, onDone }: DeactivateActionProps) {
  const [open, setOpen] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    setWorking(true);
    setError(null);
    try {
      await deactivate();
      setOpen(false);
      onDone();
    } catch (e) {
      setError(mensajeDeApiError(e));
    } finally {
      setWorking(false);
    }
  }

  return (
    <>
      <Button variant="danger" onClick={() => setOpen(true)}>Dar de baja</Button>
      <ConfirmActionModal isOpen={open} title={title} confirmLabel="Sí, dar de baja" destructive isWorking={working}
        onConfirm={confirm} onCancel={() => setOpen(false)}>
        {children}
        {error && <p role="alert" className="mt-3 text-alert-danger-fg">{error}</p>}
      </ConfirmActionModal>
    </>
  );
}
