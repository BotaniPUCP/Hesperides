'use client';

import { useSyncExternalStore } from 'react';
import { rememberedHref } from '@/lib/listMemory';

// Lo recordado se escribe en la pantalla anterior: no cambia mientras se está en esta.
const subscribeToNothing = () => () => {};

/** La ruta con los últimos filtros de su lista. En el servidor, la ruta sola. */
export function useRememberedHref(path: string): string {
  return useSyncExternalStore(subscribeToNothing, () => rememberedHref(path), () => path);
}
