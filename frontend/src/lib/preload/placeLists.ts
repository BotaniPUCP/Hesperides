import type { PlaceSummary, ReferenceQueueGroup } from '@shared/types';
import { placesApi } from '@/lib/places-api';
import { definePreloadedList } from './preloadedList';

/** Todo lo que se escribe bajo /places, importación incluida (SPEC-119 D-03). */
export const placesList = definePreloadedList<PlaceSummary>('places', () => placesApi.list(), [/^\/places(\/|$)/]);

export const referenceQueueList = definePreloadedList<ReferenceQueueGroup>(
  'reference-queue', () => placesApi.referenceQueue(), [/^\/places\/reference-links/]);
