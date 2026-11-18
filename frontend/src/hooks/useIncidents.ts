'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from './useAuth';
import { useRequest } from './useRequest';
import { incidentsApi } from '@/lib/incidents-api';
import { incidentsList } from '@/lib/preload/incidentLists';
import { canUseIncidents } from '@/lib/incidentRoles';
import { incidentFilters, incidentHref, incidentQuery, type IncidentFilters } from '@/lib/incidentNavigation';
import { rememberListQuery } from '@/lib/listMemory';
import { usePreloadedList } from './usePreloadedList';

/** Includes the actor in request keys so responses cannot leak across accounts. */
function useIncidentScope() {
  const { user } = useAuth();
  return user && canUseIncidents(user.role.code) ? `${user.id}:${user.role.code}` : null;
}

export function useIncidentNavigation() {
  const params = useSearchParams();
  const filters = incidentFilters(params);
  const href = (path: string) => incidentHref(path, filters);
  const query = incidentQuery(filters);
  // Los filtros de la lista viajan en la URL del detalle; el breadcrumb los lee de aquí.
  useEffect(() => rememberListQuery('/incidencias', query), [query]);
  const changeFilters = (next: IncidentFilters) => {
    // Next's History API integration updates useSearchParams without a server
    // navigation for every keystroke. Back still returns from detail to this URL.
    window.history.replaceState(null, '', incidentHref('/incidencias', next));
  };
  return { filters, href, listHref: href('/incidencias'), changeFilters };
}

/**
 * Todas las incidencias que ve quien pregunta, cargadas al abrir la lista y filtradas en el
 * navegador (SPEC-119). Al cambiar de cuenta se descartan con el cierre de sesión (D-05).
 */
export function useIncidentList() {
  const scope = useIncidentScope();
  return usePreloadedList(incidentsList, scope !== null);
}

export function useIncidentOptions() {
  const scope = useIncidentScope();
  const [revision, setRevision] = useState(0);
  const request = useRequest(scope ? `${scope}:options:${revision}` : null, () => incidentsApi.options());
  const reload = useCallback(() => setRevision((v) => v + 1), []);
  return { ...request, reload };
}

/** Solo los envíos de la persona, aunque vea más por su cuadrilla (SPEC-201 §3.11). */
export function useIncidentMine() {
  const scope = useIncidentScope();
  const [revision, setRevision] = useState(0);
  const request = useRequest(scope ? `${scope}:mine:${revision}` : null, () => incidentsApi.mine());
  const reload = useCallback(() => setRevision((v) => v + 1), []);
  return { ...request, reload };
}

export function useIncidentDetail(id: number) {
  const scope = useIncidentScope();
  const [revision, setRevision] = useState(0);
  const request = useRequest(scope ? `${scope}:incident:${id}:${revision}` : null, () => incidentsApi.detail(id));
  const reload = useCallback(() => setRevision((v) => v + 1), []);
  return { ...request, reload };
}
