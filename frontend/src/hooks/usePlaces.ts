'use client';

import { useCallback, useState } from 'react';
import type { PlaceDetail } from '@shared/types';
import { placesApi } from '@/lib/places-api';
import { placesList } from '@/lib/preload/placeLists';
import { usePreloadedList } from './usePreloadedList';
import { useRequest } from './useRequest';

/**
 * Todos los lugares vigentes, para buscarlos y filtrarlos en el navegador (SPEC-119). Con
 * `enabled` en false no se pide: un buscador que todavía no se abrió.
 */
export const usePlaceList = (enabled = true) => usePreloadedList(placesList, enabled);

/** La ficha de un lugar. `reload` la vuelve a pedir tras editarla. */
export function usePlace(code: string | null | undefined) {
  const [version, setVersion] = useState(0);
  const { data, loading, errorMessage, notFound } = useRequest(code ? `${code}:${version}` : null, () =>
    placesApi.detail(code as string),
  );
  const reload = useCallback(() => setVersion((v) => v + 1), []);
  return { place: data as PlaceDetail | null, loading, errorMessage, notFound, reload };
}
