'use client';

import { useCallback, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from './useAuth';
import { useRequest } from './useRequest';
import { incidentsApi } from '@/lib/incidents-api';
import { incidentFilters, incidentHref, type IncidentFilters } from '@/lib/incidentNavigation';

/** Includes the actor in request keys so responses cannot leak across accounts. */
function useIncidentScope() {
  const { user } = useAuth();
  return user && ['COORDINADOR', 'SUPERVISOR'].includes(user.role.code) ? `${user.id}:${user.role.code}` : null;
}

export function useIncidentNavigation() {
  const params = useSearchParams();
  const filters = incidentFilters(params);
  const href = (path: string) => incidentHref(path, filters);
  const changeFilters = (next: IncidentFilters) => {
    // Next's History API integration updates useSearchParams without a server
    // navigation for every keystroke. Back still returns from detail to this URL.
    window.history.replaceState(null, '', incidentHref('/incidencias', next));
  };
  return { filters, href, listHref: href('/incidencias'), changeFilters };
}

export function useIncidents(filters: IncidentFilters) {
  const scope = useIncidentScope();
  const [revision, setRevision] = useState(0);
  const request = useRequest(scope ? JSON.stringify([scope, filters, revision]) : null,
    () => incidentsApi.list(filters.page, filters.status, filters.search));
  const reload = useCallback(() => setRevision((v) => v + 1), []);
  return { ...request, reload };
}

export function useIncidentOptions() {
  const scope = useIncidentScope();
  const [revision, setRevision] = useState(0);
  const request = useRequest(scope ? `${scope}:options:${revision}` : null, () => incidentsApi.options());
  const reload = useCallback(() => setRevision((v) => v + 1), []);
  return { ...request, reload };
}

export function useIncidentSummary() {
  const { user } = useAuth();
  const [revision, setRevision] = useState(0);
  const request = useRequest(user?.role.code === 'COORDINADOR' ? `${user.id}:summary:${revision}` : null,
    () => incidentsApi.summary());
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
