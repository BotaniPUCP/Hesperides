'use client';

import { useMemo } from 'react';
import type { UserDetail, UserFilters } from '@shared/types';
import { USERS_PAGE_SIZE } from '@/lib/constants';
import { usersList } from '@/lib/preload/userLists';
import { pageOf } from '@/lib/search/pageOf';
import { filterByText } from '@/lib/search/searchText';
import { usePreloadedList } from './usePreloadedList';

export interface UseUsersResult {
  rows: UserDetail[];
  totalElements: number;
  isLoading: boolean;
  /** Mensaje ya traducido, o null. Un fallo del listado se muestra en la pantalla, no como toast: no queda nada debajo que seguir usando. */
  errorMessage: string | null;
  refresh: () => void;
}

/**
 * `isActive` sin valor es «todos»: la pantalla abre con `true` porque eso se necesita el 95% de
 * las veces (SPEC-100 §5.5). `false` es «solo inactivos», por eso se compara con undefined.
 */
export function usersMatching(users: UserDetail[], filters: UserFilters): UserDetail[] {
  return filterByText(users, filters.search ?? '').filter((u) =>
    (filters.isActive === undefined || u.isActive === filters.isActive)
    && (!filters.roleCode || u.role.code === filters.roleCode)
    && (filters.teamId === undefined || u.teams.some((t) => t.id === filters.teamId)));
}

/**
 * Listado con filtros y páginas sobre la lista completa, que se carga una vez al abrir la
 * pantalla y se filtra en el navegador mientras se escribe (SPEC-119). Crear, editar o
 * desactivar a alguien la vuelve a pedir sola; `refresh` es para el botón «Reintentar».
 */
export function useUsers(filters: UserFilters, page: number): UseUsersResult {
  const { items, loaded, errorMessage, reload } = usePreloadedList(usersList);
  const { search, roleCode, isActive, teamId } = filters;
  const matching = useMemo(() => usersMatching(items, { search, roleCode, isActive, teamId }),
    [items, search, roleCode, isActive, teamId]);

  return {
    rows: pageOf(matching, page, USERS_PAGE_SIZE).rows,
    totalElements: matching.length,
    isLoading: !loaded && errorMessage === null,
    errorMessage: loaded ? null : errorMessage,
    refresh: reload,
  };
}
