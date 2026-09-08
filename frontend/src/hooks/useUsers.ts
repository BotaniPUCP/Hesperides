'use client';

import { useEffect, useState } from 'react';
import type { UsersPage } from '@shared/types';
import { apiClient, ApiError } from '@/lib/api';
import { INITIAL_FILTERS, isFiltersEmpty } from '@/lib/users';
import type { UserRow, UsersFilters } from '@/lib/users';

/**
 * Listado paginado de usuarios (SPEC-100 GET /users) con los cuatro filtros
 * del spec. Cada cambio de filtro vuelve a la página 0; la caja de resultados
 * se acota a un contador vigente para no colapsar si un filtro deja fuera la
 * página actual.
 */
export function useUsers(pageSize = 20) {
  const [filters, setFilters] = useState<UsersFilters>(INITIAL_FILTERS);
  const [page, setPage] = useState(0);
  const [reload, setReload] = useState(0);
  const [data, setData] = useState<UsersPage<UserRow> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);

  // Si los filtros redujeron el total, la página actual puede quedar fuera de
  // rango. Se corrige durante el render (patrón "ajustar estado con props"),
  // que React reintenta antes de pintar sin re-montar el componente.
  if (data !== null && data.totalPages > 0 && page >= data.totalPages) {
    setPage(data.totalPages - 1);
  }

  useEffect(() => {
    let active = true;
    let disposed = false;
    // El esqueleto debe mostrarse ya para la nueva consulta, pero el setState
    // se programa de forma asíncrona (la regla set-state-in-effect prohíbe
    // hacerlo sincrónicamente en el cuerpo del efecto).
    Promise.resolve().then(() => {
      if (!disposed) setIsLoading(true);
    });

    const params = new URLSearchParams();
    if (filters.search.trim() !== '') params.set('search', filters.search.trim());
    if (filters.roleCode) params.set('roleCode', filters.roleCode);
    // isActive null no se envía: el backend lista solo activos por defecto.
    if (filters.isActive !== null) params.set('isActive', String(filters.isActive));
    if (filters.teamId !== null) params.set('teamId', String(filters.teamId));
    params.set('page', String(page));
    params.set('size', String(pageSize));

    apiClient
      .get<UsersPage<UserRow>>(`/users?${params.toString()}`)
      .then((result) => {
        if (!active) return;
        setData(result);
        setError(null);
      })
      .catch((caught: unknown) => {
        if (active) {
          setError(caught instanceof ApiError ? caught : new ApiError(0, 'Sin conexión. Verifique su red.'));
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
      disposed = true;
    };
  }, [filters, page, pageSize, reload]);

  const applyFilters = (next: UsersFilters) => {
    setFilters(next);
    setPage(0);
  };

  const hasActiveFilters = !isFiltersEmpty(filters);

  return {
    data,
    isLoading,
    error,
    filters,
    hasActiveFilters,
    applyFilters,
    page,
    setPage,
    reload: () => setReload((current) => current + 1),
  };
}