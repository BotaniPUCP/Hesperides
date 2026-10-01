'use client';

import { useEffect, useState } from 'react';
import type { LocationCount, Species, SpeciesFilters, SpecimenFilters, Specimen } from '@shared/types';
import { ApiError } from '@/lib/api';
import { mensajeDeApiError } from '@/lib/api-errors';
import { inventarioVerdeApi } from '@/lib/inventario-verde-api';

interface RequestState<T> {
  key: string;
  data: T | null;
  errorMessage: string | null;
  notFound: boolean;
}

/**
 * Una consulta al backend que se repite cuando cambia `key`. Guardar la clave
 * junto a la respuesta es lo que evita mostrar por un render los datos del
 * filtro anterior, y descartar las respuestas que llegan tarde.
 */
function useRequest<T>(key: string | null, load: () => Promise<T>) {
  const [state, setState] = useState<RequestState<T> | null>(null);

  useEffect(() => {
    if (key === null) return;
    let current = true;
    load()
      .then((data) => current && setState({ key, data, errorMessage: null, notFound: false }))
      .catch((error: unknown) => {
        if (!current) return;
        const notFound = error instanceof ApiError && error.status === 404;
        setState({ key, data: null, errorMessage: notFound ? null : mensajeDeApiError(error), notFound });
      });
    return () => {
      current = false;
    };
    // `load` cambia en cada render; la clave resume todo lo que la consulta usa.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const fresh = state?.key === key ? state : null;
  return {
    data: fresh?.data ?? null,
    loading: key !== null && fresh === null,
    errorMessage: fresh?.errorMessage ?? null,
    notFound: fresh?.notFound ?? false,
  };
}

export interface UseInventarioVerdeSpeciesParams extends SpeciesFilters {
  page?: number;
  pageSize?: number;
}

export function useInventarioVerdeSpecies(params: UseInventarioVerdeSpeciesParams = {}) {
  const { search = '', vegetationType, page = 0, pageSize = 24 } = params;
  const request = { search, vegetationType, page, size: pageSize };
  const { data, loading, errorMessage } = useRequest(JSON.stringify(request), () =>
    inventarioVerdeApi.species(request),
  );
  return {
    species: data?.content ?? [],
    totalElements: data?.page.totalElements ?? 0,
    totalPages: Math.max(data?.page.totalPages ?? 1, 1),
    currentPage: data?.page.number ?? page,
    loading,
    errorMessage,
  };
}

export function useInventarioVerdeSpeciesBySlug(slug: string | null | undefined) {
  const { data, loading, errorMessage, notFound } = useRequest(slug || null, () =>
    inventarioVerdeApi.speciesBySlug(slug as string),
  );
  return { species: data as Species | null, loading, errorMessage, notFound };
}

export interface UseInventarioVerdeSpecimensParams extends SpecimenFilters {
  page?: number;
  pageSize?: number;
}

export function useInventarioVerdeSpecimens(
  slug: string | null | undefined,
  params: UseInventarioVerdeSpecimensParams = {},
) {
  const { search = '', location = 'ALL', sortBy = 'reference', sortDirection = 'asc', page = 0, pageSize = 12 } =
    params;
  const request = { search, location, sortBy, sortDirection, page, size: pageSize };
  const specimens = useRequest(slug ? `${slug}:${JSON.stringify(request)}` : null, () =>
    inventarioVerdeApi.specimens(slug as string, request),
  );
  const locations = useRequest(slug || null, () => inventarioVerdeApi.locations(slug as string));
  const total = specimens.data?.page.totalElements ?? 0;
  return {
    specimens: (specimens.data?.content ?? []) as Specimen[],
    allFilteredCount: total,
    totalElements: total,
    totalPages: Math.max(specimens.data?.page.totalPages ?? 1, 1),
    currentPage: specimens.data?.page.number ?? page,
    availableLocations: (locations.data ?? []) as LocationCount[],
    loading: specimens.loading,
    errorMessage: specimens.errorMessage,
  };
}

export function useInventarioVerdeSpecimenByCode(code: string | null | undefined) {
  const { data, loading, errorMessage, notFound } = useRequest(code || null, () =>
    inventarioVerdeApi.specimen(code as string),
  );
  return { specimen: data, species: data?.species ?? null, loading, errorMessage, notFound };
}

/** Totales y tipos de vegetación. El filtro solo ofrece los tipos con ejemplares (README, D-1). */
export function useInventarioVerdeStats() {
  const { data, loading, errorMessage } = useRequest('summary', () => inventarioVerdeApi.summary());
  return {
    totalSpecies: data?.totalSpecies ?? 0,
    totalSpecimens: data?.totalSpecimens ?? 0,
    vegetationTypes: (data?.vegetationTypes ?? []).filter((t) => t.count > 0),
    loading,
    errorMessage,
  };
}
