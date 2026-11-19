'use client';

import { useEffect, useSyncExternalStore } from 'react';
import type { PreloadedList, PreloadedState } from '@/lib/preload/preloadedList';

export interface UsePreloadedListResult<T> extends PreloadedState<T> {
  reload: () => void;
}

/**
 * La lista se pide al montar quien la usa (SPEC-119 D-04) y se comparte con los demás
 * buscadores de la pantalla. Con `enabled` en false no se pide: un buscador que aún no se abrió.
 */
export function usePreloadedList<T>(list: PreloadedList<T>, enabled = true): UsePreloadedListResult<T> {
  const state = useSyncExternalStore(list.subscribe, list.snapshot, list.snapshot);

  useEffect(() => {
    if (!enabled) return;
    list.open();
    return () => list.close();
  }, [list, enabled]);

  return { ...state, reload: list.reload };
}
