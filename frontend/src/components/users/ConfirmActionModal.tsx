'use client';

import type { ReactNode } from 'react';
import { Button, Modal } from '@/components/ui';

export interface ConfirmActionModalProps {
  isOpen: boolean;
  title: string;
  /** El texto nombra a la persona afectada: "la cuenta de María García", nunca "este usuario". */
  children: ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  isWorking?: boolean;
  destructive?: boolean;
}

/**
 * Confirmación de una acción que no se deshace sola. Vive en la carpeta de la
 * feature y no en `components/ui` (SPEC-C01 §10.2): no es un componente nuevo,
 * es `Modal` y `Button` combinados de la forma que necesita esta pantalla.
 *
 * `sm` para que el modal no ocupe la pantalla entera en móvil: una pregunta de
 * dos líneas a pantalla completa se lee como un error del sistema.
 */
export function ConfirmActionModal({
  isOpen,
  title,
  children,
  confirmLabel,
  onConfirm,
  onCancel,
  isWorking = false,
  destructive = false,
}: ConfirmActionModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onCancel} disabled={isWorking}>
            Cancelar
          </Button>
          <Button
            variant={destructive ? 'danger' : 'primary'}
            onClick={onConfirm}
            loading={isWorking}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="text-sm text-neutral-700">{children}</div>
    </Modal>
  );
}
