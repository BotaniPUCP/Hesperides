'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { LeaveConfirmDialog } from './LeaveConfirmDialog';
import { leavingLink } from './leavingLink';

export interface UnsavedChangesGuard {
  /** Ejecuta `action` (cancelar, cerrar un modal) si no hay nada que perder; si lo hay, pregunta antes. */
  confirm: (action: () => void) => void;
  /** Navega después de guardar: sin preguntar y sin dejar la entrada extra del historial. */
  navigate: (href: string) => void;
  /** El aviso; se monta junto al formulario. */
  dialog: ReactNode;
}

/**
 * Avisa antes de perder lo escrito en un formulario. Mientras `dirty`:
 * - cerrar o recargar la pestaña muestra el aviso del navegador;
 * - un enlace interno (sidebar, miga de pan) pide confirmar;
 * - el botón «Atrás» también: se deja una entrada propia en el historial que lo
 *   absorbe, y se quita al dejar de haber cambios.
 */
export function useUnsavedChangesGuard(dirty: boolean): UnsavedChangesGuard {
  const router = useRouter();
  const [pending, setPending] = useState<(() => void) | null>(null);
  const dirtyRef = useRef(dirty);
  const armed = useRef(false);
  const ignoreNextPop = useRef(false);

  // Primero de los efectos: los demás y los manejadores leen el valor ya al día.
  useEffect(() => {
    dirtyRef.current = dirty;
  });

  /** Salir de verdad: la entrada propia del historial se reemplaza en vez de quedar detrás. */
  const go = useCallback(
    (href: string) => {
      const replace = armed.current;
      armed.current = false;
      if (replace) router.replace(href);
      else router.push(href);
    },
    [router],
  );

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    const onClick = (e: MouseEvent) => {
      const href = leavingLink(e, window.location);
      if (!href) return;
      e.preventDefault();
      e.stopPropagation();
      setPending(() => () => go(href));
    };
    window.addEventListener('beforeunload', warn);
    document.addEventListener('click', onClick, true);
    return () => {
      window.removeEventListener('beforeunload', warn);
      document.removeEventListener('click', onClick, true);
    };
  }, [dirty, go]);

  useEffect(() => {
    if (dirty && !armed.current) {
      armed.current = true;
      window.history.pushState(window.history.state, '', window.location.href);
    } else if (!dirty && armed.current) {
      armed.current = false;
      ignoreNextPop.current = true;
      window.history.back();
    }
  }, [dirty]);

  useEffect(() => {
    const onPop = () => {
      if (ignoreNextPop.current) {
        ignoreNextPop.current = false;
        return;
      }
      if (!armed.current || !dirtyRef.current) return;
      // Se consumió la entrada propia: se vuelve a poner y se pregunta.
      window.history.pushState(window.history.state, '', window.location.href);
      setPending(() => () => {
        armed.current = false;
        window.history.go(-2);
      });
    };
    window.addEventListener('popstate', onPop);
    return () => {
      window.removeEventListener('popstate', onPop);
      // Un modal que se cierra con su entrada aún puesta la quita al irse.
      if (armed.current) {
        armed.current = false;
        window.history.back();
      }
    };
  }, []);

  const confirm = useCallback((action: () => void) => {
    if (dirtyRef.current) setPending(() => action);
    else action();
  }, []);

  const dialog = (
    <LeaveConfirmDialog
      isOpen={pending !== null}
      onStay={() => setPending(null)}
      onLeave={() => {
        const action = pending;
        setPending(null);
        action?.();
      }}
    />
  );
  return { confirm, navigate: go, dialog };
}
