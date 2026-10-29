'use client';

import { Button, Modal } from '@/components/ui';

export interface LeaveConfirmDialogProps {
  isOpen: boolean;
  onStay: () => void;
  onLeave: () => void;
}

/** «Tienes cambios sin guardar»: el mismo aviso en todo formulario del sistema. */
export function LeaveConfirmDialog({ isOpen, onStay, onLeave }: LeaveConfirmDialogProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onStay}
      title="Cambios sin guardar"
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onStay}>
            Seguir editando
          </Button>
          <Button variant="danger" onClick={onLeave}>
            Salir sin guardar
          </Button>
        </>
      }
    >
      <p className="text-sm text-neutral-700">Tienes cambios sin guardar. Si sales, se perderán.</p>
    </Modal>
  );
}
