'use client';

import { useMemo } from 'react';
import type { LocationCount, Species, SpeciesFilters, SpecimenFilters, Specimen } from '@shared/types';
import { inventarioVerdeApi } from '@/lib/inventario-verde-api';
import { sortSpecimens, speciesMatching, specimensMatching } from '@/lib/inventory/inventoryLists';
import { speciesList, specimensList } from '@/lib/preload/inventoryLists';
import { pageOf } from '@/lib/search/pageOf';
import { usePreloadedList } from './usePreloadedList';
import { useRequest } from './useRequest';

export interface UseInventarioVerdeSpeciesParams extends SpeciesFilters {
  page?: number;
  pageSize?: number;
}

/**
 * El catálogo de especies, cargado una vez al abrir la pantalla y filtrado y paginado en el
 * navegador (SPEC-119). Registrar o editar una especie o un ejemplar lo vuelve a pedir solo.
 */
export function useInventarioVerdeSpecies(params: UseInventarioVerdeSpeciesParams = {}) {
  const { search = '', vegetationType, retiring, page = 0, pageSize = 16 } = params;
  const list = usePreloadedList(speciesList);
  const matching = useMemo(() => speciesMatching(list.items, { search, vegetationType, retiring }),
    [list.items, search, vegetationType, retiring]);
  const shown = pageOf(matching, page, pageSize);
  return {
    species: shown.rows,
    totalElements: matching.length,
    totalPages: Math.max(Math.ceil(matching.length / pageSize), 1),
    currentPage: shown.page,
    loading: !list.loaded && list.errorMessage === null,
    errorMessage: list.loaded ? null : list.errorMessage,
  };
}

export function useInventarioVerdeSpeciesBySlug(slug: string | null | undefined, reloadKey?: number) {
  const queryKey = slug ? (reloadKey === undefined ? slug : `${slug}:${reloadKey}`) : null;
  const { data, loading, errorMessage, notFound } = useRequest(queryKey, () =>
    inventarioVerdeApi.speciesBySlug(slug as string),
  );
  return { species: data as Species | null, loading, errorMessage, notFound };
}

export interface UseInventarioVerdeSpecimensParams extends SpecimenFilters {
  page?: number;
  pageSize?: number;
}

/**
 * Los ejemplares de una especie (o todos, sin `slug`), filtrados, ordenados y paginados en el
 * navegador sobre la lista precargada (SPEC-119). Las ubicaciones del filtro siguen viniendo
 * del backend: se piden una vez y no dependen de lo que se escribe.
 */
export function useInventarioVerdeSpecimens(
  slug: string | null | undefined,
  params: UseInventarioVerdeSpecimensParams = {},
) {
  const { search = '', location = 'ALL', vegetationType, critical, measured, sortBy = 'reference', sortDirection = 'asc', page = 0, pageSize = 12 } =
    params;
  const list = usePreloadedList(specimensList);
  const matching = useMemo(() => sortSpecimens(
    specimensMatching(list.items, { slug, search, location, vegetationType, critical, measured }), sortBy, sortDirection),
  [list.items, slug, search, location, vegetationType, critical, measured, sortBy, sortDirection]);
  const shown = pageOf(matching, page, pageSize);
  const locationsKey = slug ? `locations:${slug}` : 'locations:all';
  const locations = useRequest(locationsKey, () =>
    slug ? inventarioVerdeApi.locations(slug) : inventarioVerdeApi.allLocations(),
  );

  return {
    specimens: shown.rows as Specimen[],
    allFilteredCount: matching.length,
    totalElements: matching.length,
    totalPages: Math.max(Math.ceil(matching.length / pageSize), 1),
    currentPage: shown.page,
    availableLocations: (locations.data ?? []) as LocationCount[],
    loading: !list.loaded && list.errorMessage === null,
    errorMessage: list.loaded ? null : list.errorMessage,
  };
}

export function useInventarioVerdeSpecimenByCode(
  code: string | null | undefined,
  reloadKey?: number,
  focusRevision?: number,
) {
  const queryKey = code
    ? `${code}:${reloadKey ?? 0}:${focusRevision ?? 0}`
    : null;
  const { data, loading, errorMessage, notFound } = useRequest(
    queryKey,
    () => inventarioVerdeApi.specimen(code as string),
    { keepPreviousData: true },
  );
  return { specimen: data, species: data?.species ?? null, loading, errorMessage, notFound };
}

/** Totales y tipos de vegetación. El filtro solo ofrece los tipos con ejemplares (README, D-1). */
export function useInventarioVerdeStats(reloadKey?: number) {
  const { data, loading, errorMessage } = useRequest(
    reloadKey !== undefined ? `summary:${reloadKey}` : 'summary',
    () => inventarioVerdeApi.summary(),
  );
  return {
    totalSpecies: data?.totalSpecies ?? 0,
    totalSpecimens: data?.totalSpecimens ?? 0,
    vegetationTypes: (data?.vegetationTypes ?? []).filter((t) => t.count > 0),
    loading,
    errorMessage,
  };
}
