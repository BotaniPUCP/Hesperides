'use client';

import { useCallback, useState } from 'react';
import type { PlaceDetail, PlaceSummary } from '@shared/types';
import { placesApi, type PlaceFilters } from '@/lib/places-api';
import { useRequest } from './useRequest';

export function usePlaces(filters: PlaceFilters) {
  const { data, loading, errorMessage } = useRequest(JSON.stringify(filters), () => placesApi.list(filters));
  return { places: (data ?? []) as PlaceSummary[], loading, errorMessage };
}

/** La ficha de un lugar. `reload` la vuelve a pedir tras editarla. */
export function usePlace(code: string | null | undefined) {
  const [version, setVersion] = useState(0);
  const { data, loading, errorMessage, notFound } = useRequest(code ? `${code}:${version}` : null, () =>
    placesApi.detail(code as string),
  );
  const reload = useCallback(() => setVersion((v) => v + 1), []);
  return { place: data as PlaceDetail | null, loading, errorMessage, notFound, reload };
}
