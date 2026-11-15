'use client';

import { useEffect, useRef, type RefObject } from 'react';
import { useToast, type ToastOptions } from '@/components/ui';
import { isAdminModeToggle } from './flyMotion';

const ADMIN_ON: ToastOptions = {
  variant: 'info',
  title: 'Modo de movimiento de administrador',
  description: 'W y S avanzan y retroceden, A y D van a los costados, Espacio sube y Shift baja. Con el clic derecho miras alrededor. Ctrl+Shift+U para salir.',
};
const ADMIN_OFF: ToastOptions = {
  variant: 'info',
  title: 'Modo de movimiento normal',
  description: 'Volviste a la vista 3D inicial.',
};

/** Cualquier visor con modo de movimiento de administrador: el de los pilotos o el del mapa. */
export interface AdminModeTarget {
  /** Al salir del modo se vuelve a la vista 3D inicial. */
  setAdminMode: (on: boolean) => void;
}

/** Ctrl+Shift+U alterna el modo de movimiento del visor, en cualquier parte de la página. */
export function useAdminModeToggle(viewer: RefObject<AdminModeTarget | null>, ready: boolean) {
  const { showToast } = useToast();
  const adminMode = useRef(false);

  useEffect(() => {
    if (!ready) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat || !isAdminModeToggle(event)) return;
      event.preventDefault();
      adminMode.current = !adminMode.current;
      viewer.current?.setAdminMode(adminMode.current);
      showToast(adminMode.current ? ADMIN_ON : ADMIN_OFF);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [ready, viewer, showToast]);
}
