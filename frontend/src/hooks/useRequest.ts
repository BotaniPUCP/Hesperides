'use client';

import { useCallback, useEffect, useState } from 'react';
import { ApiError } from '@/lib/api';
import { mensajeDeApiError } from '@/lib/api-errors';

interface RequestState<T> {
  key: string;
  data: T | null;
  errorMessage: string | null;
  notFound: boolean;
}

export interface UseRequestOptions {
  keepPreviousData?: boolean;
}

/**
 * Una consulta al backend que se repite cuando cambia `key`. Guardar la clave
 * junto a la respuesta es lo que evita mostrar por un render los datos del
 * filtro anterior, y descartar las respuestas que llegan tarde. Con `key` null
 * no consulta.
 */
export function useRequest<T>(
  key: string | null,
  load: () => Promise<T>,
  options: UseRequestOptions = {},
) {
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
  const data = options.keepPreviousData ? (fresh?.data ?? state?.data ?? null) : (fresh?.data ?? null);

  // A successful mutation can return the updated resource without a second GET.
  // A callback from an older query must not replace the current resource.
  const updateData = useCallback((data: T) => {
    setState((current) => current?.key === key ? { ...current, data, errorMessage: null, notFound: false } : current);
  }, [key]);
  return {
    data,
    loading: key !== null && fresh === null,
    errorMessage: fresh?.errorMessage ?? null,
    notFound: fresh?.notFound ?? false,
    updateData,
  };
}
