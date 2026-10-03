'use client';

import type { PlaceDetail, PlaceSummary } from '@shared/types';
import { placesApi, type PlaceFilters } from '@/lib/places-api';
import { useRequest } from './useRequest';

export function usePlaces(filters: PlaceFilters) {
  const { data, loading, errorMessage } = useRequest(JSON.stringify(filters), () => placesApi.list(filters));
  return { places: (data ?? []) as PlaceSummary[], loading, errorMessage };
}

export function usePlace(code: string | null | undefined) {
  const { data, loading, errorMessage, notFound } = useRequest(code || null, () => placesApi.detail(code as string));
  return { place: data as PlaceDetail | null, loading, errorMessage, notFound };
}
