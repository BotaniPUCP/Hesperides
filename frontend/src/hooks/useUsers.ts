'use client';

import { useCallback, useEffect, useState } from 'react';
import type { UserDetail, UserFilters } from '@shared/types';
import { usersApi } from '@/lib/users-api';
import { mensajeDeApiError } from '@/lib/api-errors';
import { SEARCH_DEBOUNCE_MS } from '@/lib/constants';
import { useDebouncedValue } from './useDebouncedValue';

export interface UseUsersResult {
  rows: UserDetail[];
  totalElements: number;
  isLoading: boolean;
  /** Mensaje ya traducido, o null. Un fallo del listado se muestra en la pantalla, no como toast: no queda nada debajo que seguir usando. */
  errorMessage: string | null;
  refresh: () => void;
}

interface Respuesta {
  /** Consulta que produjo estos datos. Compararla con la consulta actual es lo que dice si están al día. */
  consulta: string;
  rows: UserDetail[];
  totalElements: number;
  errorMessage: string | null;
}

/**
 * Listado paginado con filtros. El término de búsqueda se consulta con retraso
 * (§7.1); el resto de filtros no, porque elegir un rol en un `Select` es un
 * gesto único y esperar 300 ms tras él solo se siente lento.
 *
 * `isLoading` no es un estado propio sino una comparación: se está cargando
 * mientras la última respuesta recibida no corresponda a la consulta vigente.
 * Así no hay forma de dejarlo desincronizado —el clásico spinner eterno de un
 * `finally` que no se ejecutó— ni de encadenar un render extra por cada
 * petición solo para encender la bandera.
 */
export function useUsers(filters: UserFilters, page: number): UseUsersResult {
  const [respuesta, setRespuesta] = useState<Respuesta | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const search = useDebouncedValue(filters.search ?? '', SEARCH_DEBOUNCE_MS);
  const { roleCode, isActive, teamId } = filters;

  // Los efectos dependen de los campos sueltos y no del objeto `filters`: la
  // página lo reconstruye en cada render, así que depender del objeto volvería
  // a consultar el backend con cada pulsación de cualquier tecla.
  const consulta = JSON.stringify([search, roleCode, isActive, teamId, page, reloadToken]);

  const refresh = useCallback(() => setReloadToken((token) => token + 1), []);

  useEffect(() => {
    // Una respuesta lenta de una consulta ya sustituida no debe pisar a la
    // nueva: sin esta bandera, escribir rápido puede dejar en pantalla los
    // resultados de un término anterior.
    let vigente = true;

    usersApi
      .list({ search, roleCode, isActive, teamId }, page)
      .then((pagina) => {
        if (!vigente) return;
        setRespuesta({
          consulta,
          rows: pagina.content,
          totalElements: pagina.page.totalElements,
          errorMessage: null,
        });
      })
      .catch((error: unknown) => {
        if (!vigente) return;
        setRespuesta({
          consulta,
          rows: [],
          totalElements: 0,
          errorMessage: mensajeDeApiError(error),
        });
      });

    return () => {
      vigente = false;
    };
  }, [consulta, search, roleCode, isActive, teamId, page]);

  const isLoading = respuesta === null || respuesta.consulta !== consulta;

  return {
    rows: respuesta?.rows ?? [],
    totalElements: respuesta?.totalElements ?? 0,
    isLoading,
    // El error de la consulta anterior se retira en cuanto empieza la
    // siguiente: dejarlo visible mientras se reintenta haría creer que el
    // reintento ya falló.
    errorMessage: isLoading ? null : (respuesta?.errorMessage ?? null),
    refresh,
  };
}
