'use client';

import { useCallback, useEffect, useMemo, type RefObject } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useRequest } from '@/hooks/useRequest';
import { incidentsApi } from '@/lib/incidents-api';
import { canUseIncidents } from '@/lib/incidentRoles';
import { INCIDENTS_TOGGLE } from '../layerList';
import type { Viewer } from '../viewer/createViewer';

/**
 * La capa «Incidencias» del mapa (SPEC-201 §3.10): las activas que la persona puede ver, del
 * color de su plazo. Pulsar una abre su detalle. Si la API falla, el mapa sigue sin la capa.
 */
export function useIncidentsOnMap(viewer: RefObject<Viewer | null>, viewerEpoch: number, visible: Record<string, boolean>) {
  const { user } = useAuth();
  const router = useRouter();
  const on = Boolean(visible[INCIDENTS_TOGGLE]);
  const scope = user && canUseIncidents(user.role?.code) ? `incident-map:${user.id}` : null;
  const map = useRequest(on ? scope : null, () => incidentsApi.map()).data;
  const markers = useMemo(() => (map?.markers ?? []).map((m) => ({
    id: m.id, lat: m.latitude, lon: m.longitude, deadlineStatus: m.deadlineStatus,
  })), [map]);

  useEffect(() => {
    viewer.current?.setIncidentMarkers(on ? markers : []);
  }, [viewer, viewerEpoch, on, markers]);

  const onIncidentPick = useCallback((id: number) => router.push(`/incidencias/${id}`), [router]);
  return { onIncidentPick, withoutLocation: on ? (map?.withoutLocation ?? 0) : 0 };
}
