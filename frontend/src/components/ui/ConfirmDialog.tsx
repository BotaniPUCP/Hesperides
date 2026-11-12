'use client';

import { useCallback, useRef, useState, type ReactNode } from 'react';
import { Button } from './Button';
import { Modal } from './Modal';

export interface ConfirmOptions {
  title: string;
  message: ReactNode;
  /** El verbo de la acción: «Eliminar», «Desactivar»… nunca un «Aceptar» genérico. */
  confirmLabel: string;
  cancelLabel?: string;
}

/**
 * Confirmación en una ventana del sistema, no en la alerta del navegador: se ve como el
 * resto de la aplicación y nombra la acción en su botón. `ask` resuelve true solo si se confirmó.
 *
 *   const { ask, dialog } = useConfirmDialog();
 *   if (!(await ask({ title, message, confirmLabel: 'Eliminar' }))) return;
 *   …
 *   return <>{…}{dialog}</>;
 */
export function useConfirmDialog() {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((confirmed: boolean) => void) | null>(null);

  const close = useCallback((confirmed: boolean) => {
    resolver.current?.(confirmed);
    resolver.current = null;
    setOptions(null);
  }, []);

  const ask = useCallback((next: ConfirmOptions) => new Promise<boolean>((resolve) => {
    resolver.current?.(false);
    resolver.current = resolve;
    setOptions(next);
  }), []);

  const dialog = (
    <Modal isOpen={options !== null} onClose={() => close(false)} title={options?.title ?? ''} size="sm"
      footer={<>
        <Button variant="ghost" onClick={() => close(false)}>{options?.cancelLabel ?? 'Cancelar'}</Button>
        <Button variant="danger" onClick={() => close(true)}>{options?.confirmLabel ?? ''}</Button>
      </>}>
      <div className="space-y-2 text-sm text-neutral-700">{options?.message}</div>
    </Modal>
  );

  return { ask, dialog };
}
