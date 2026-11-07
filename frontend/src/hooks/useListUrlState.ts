'use client';

import { useCallback, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { rememberListQuery } from '@/lib/listMemory';
import { listHref, listQuery, readListValues, type ListValues } from '@/lib/listUrl';

/**
 * Filtros de un listado guardados en su URL. `defaults` debe ser una constante
 * del módulo. Reemplaza la entrada del historial en vez de agregar otra: volver
 * desde la lista sale de ella, no deshace filtro por filtro.
 */
export function useListUrlState<K extends string>(path: string, defaults: Readonly<ListValues<K>>) {
  const params = useSearchParams();
  const values = useMemo(() => readListValues(params, defaults), [params, defaults]);
  const query = listQuery(values, defaults);

  useEffect(() => {
    rememberListQuery(path, query);
  }, [path, query]);

  const setValues = useCallback(
    (patch: Partial<ListValues<K>>) => {
      // Se lee la URL actual y no `values`: un mismo clic puede enviar dos cambios
      // seguidos, y el segundo borraría al primero si partiera del render anterior.
      const current = readListValues(new URLSearchParams(window.location.search), defaults);
      window.history.replaceState(null, '', listHref(path, { ...current, ...patch }, defaults));
    },
    [path, defaults],
  );

  return { values, setValues, query };
}
