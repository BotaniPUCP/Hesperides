'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from './useAuth';
import { useRequest } from './useRequest';
import { incidentsApi } from '@/lib/incidents-api';
import { incidentFilters, incidentHref, incidentQuery, type IncidentFilters } from '@/lib/incidentNavigation';
import { rememberListQuery } from '@/lib/listMemory';

/** Includes the actor in request keys so responses cannot leak across accounts. */
function useIncidentScope() {
  const { user } = useAuth();
  return user && ['COORDINADOR', 'SUPERVISOR'].includes(user.role.code) ? `${user.id}:${user.role.code}` : null;
}

export function useIncidentNavigation() {
  const params = useSearchParams();
  const filters = incidentFilters(params);
  const href = (path: string) => incidentHref(path, filters);
  const query = incidentQuery(filters);
  // Detail URLs carry the list filters used by the shared breadcrumb.
  useEffect(() => rememberListQuery('/incidencias', query), [query]);
  const changeFilters = (next: IncidentFilters | ((current: IncidentFilters) => IncidentFilters)) => {
    // Next's History API integration updates useSearchParams without a server
    // navigation for every keystroke. Back still returns from detail to this URL.
    const current=incidentFilters(new URLSearchParams(window.location.search));
    window.history.replaceState(null, '', incidentHref('/incidencias',typeof next==='function' ? next(current) : next));
  };
  return { filters, href, listHref: href('/incidencias'), changeFilters };
}

export function useIncidents(filters: IncidentFilters) {
  const scope = useIncidentScope();
  const [revision, setRevision] = useState(0);
  const request = useRequest(scope ? JSON.stringify([scope, filters, revision]) : null,
    () => incidentsApi.list(filters.page, filters.status, filters.search,filters));
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
