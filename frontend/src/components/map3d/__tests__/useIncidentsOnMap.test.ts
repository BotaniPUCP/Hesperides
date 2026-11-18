import { renderHook, waitFor } from '@testing-library/react';
import { useAuth } from '@/hooks/useAuth';
import { incidentsApi } from '@/lib/incidents-api';
import { useIncidentsOnMap } from '../incidents/useIncidentsOnMap';
import type { Viewer } from '../viewer/createViewer';

const push = jest.fn();
jest.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
jest.mock('@/hooks/useAuth', () => ({ useAuth: jest.fn() }));
jest.mock('@/lib/incidents-api', () => ({ incidentsApi: { map: jest.fn() } }));

const map = { markers: [{ id: 7, code: 'INC-2026-0007', title: null, latitude: -12.07, longitude: -77.08, urgencyCode: 'HIGH', deadlineStatus: 'OVERDUE' as const }], withoutLocation: 2 };

function viewerRef() {
  return { current: { setIncidentMarkers: jest.fn() } as unknown as Viewer };
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(useAuth).mockReturnValue({ user: { id: 1, role: { code: 'SUPERVISOR' } } } as ReturnType<typeof useAuth>);
  jest.mocked(incidentsApi.map).mockResolvedValue(map);
});

it('paints the active incidents with their deadline and counts those without location', async () => {
  const viewer = viewerRef();
  const { result } = renderHook(() => useIncidentsOnMap(viewer, 1, { incidents: true }));
  await waitFor(() => expect(viewer.current.setIncidentMarkers).toHaveBeenLastCalledWith([{ id: 7, lat: -12.07, lon: -77.08, deadlineStatus: 'OVERDUE' }]));
  expect(result.current.withoutLocation).toBe(2);
});

it('clears the markers when the layer is turned off', async () => {
  const viewer = viewerRef();
  renderHook(() => useIncidentsOnMap(viewer, 1, { incidents: false }));
  await waitFor(() => expect(viewer.current.setIncidentMarkers).toHaveBeenLastCalledWith([]));
});

it('opens the incident when its marker is picked', () => {
  const { result } = renderHook(() => useIncidentsOnMap(viewerRef(), 1, { incidents: true }));
  result.current.onIncidentPick(7);
  expect(push).toHaveBeenCalledWith('/incidencias/7');
});

it('does not ask for incidents without a role that uses them', () => {
  jest.mocked(useAuth).mockReturnValue({ user: null } as ReturnType<typeof useAuth>);
  renderHook(() => useIncidentsOnMap(viewerRef(), 1, { incidents: true }));
  expect(incidentsApi.map).not.toHaveBeenCalled();
});
