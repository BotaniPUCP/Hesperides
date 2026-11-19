import { act, renderHook, waitFor } from '@testing-library/react';
import { useAuth } from '../useAuth';
import { useIncidentDetail, useIncidentList, useIncidentMine, useIncidentNavigation, useIncidentOptions } from '../useIncidents';
import { useSearchParams } from 'next/navigation';
import { rememberedHref } from '@/lib/listMemory';
import { incidentsApi } from '@/lib/incidents-api';
import { ApiError } from '@/lib/api';
import { incidentOptions, incidentList, pendingDetail, approvedDetail, incidentMine } from '@/components/incidents/__fixtures__/incidents';

jest.mock('../useAuth', () => ({ useAuth: jest.fn() }));
jest.mock('next/navigation', () => ({ useSearchParams: jest.fn() }));
jest.mock('@/lib/incidents-api', () => ({ incidentsApi: {
  all: jest.fn(), options: jest.fn(), mine: jest.fn(), detail: jest.fn(),
} }));
const api = incidentsApi as jest.Mocked<typeof incidentsApi>;
const auth = jest.mocked(useAuth);

beforeEach(() => {
  jest.resetAllMocks();
  auth.mockReturnValue({ user: { id: 1, role: { code: 'COORDINADOR' } } } as ReturnType<typeof useAuth>);
  api.all.mockResolvedValue(incidentList);
  api.options.mockResolvedValue(incidentOptions);
  api.detail.mockResolvedValue(pendingDetail);
});

it('recuerda los filtros de la URL para que el breadcrumb regrese a la lista filtrada', () => {
  jest.mocked(useSearchParams).mockReturnValue(new URLSearchParams('search=rama&status=OPEN') as ReturnType<typeof useSearchParams>);

  renderHook(() => useIncidentNavigation());

  expect(rememberedHref('/incidencias')).toBe('/incidencias?search=rama&status=OPEN');
  window.sessionStorage.clear();
});

it('loads the whole list once even when options and own reports fail (SPEC-119)', async () => {
  api.options.mockRejectedValue(new ApiError(500, 'Unavailable'));
  api.mine.mockRejectedValue(new ApiError(500, 'Unavailable'));
  const { result, rerender } = renderHook(() => ({
    list: useIncidentList(), options: useIncidentOptions(), mine: useIncidentMine(),
  }));
  await waitFor(() => expect(result.current.list.items).toEqual(incidentList));
  await waitFor(() => expect(result.current.options.errorMessage).toBeTruthy());
  expect(result.current.mine.errorMessage).toBeTruthy();
  rerender();
  expect(api.all).toHaveBeenCalledTimes(1);
  expect(api.options).toHaveBeenCalledTimes(1);
  expect(api.mine).toHaveBeenCalledTimes(1);
});

it('updates detail from a mutation response without another GET and can reload', async () => {
  const { result } = renderHook(() => useIncidentDetail(7));
  await waitFor(() => expect(result.current.data).toEqual(pendingDetail));
  act(() => result.current.updateData(approvedDetail));
  expect(result.current.data).toEqual(approvedDetail);
  expect(api.detail).toHaveBeenCalledTimes(1);
  act(() => result.current.reload());
  await waitFor(() => expect(api.detail).toHaveBeenCalledTimes(2));
});

it('does not allow a callback from another incident to overwrite the current detail', async () => {
  const { result, rerender } = renderHook(({ id }) => useIncidentDetail(id), { initialProps: { id: 7 } });
  await waitFor(() => expect(result.current.data).toEqual(pendingDetail));
  const staleUpdate = result.current.updateData;
  const next = { ...approvedDetail, incident: { ...approvedDetail.incident, id: 8 } };
  api.detail.mockResolvedValueOnce(next);
  rerender({ id: 8 });
  await waitFor(() => expect(result.current.data).toEqual(next));
  act(() => staleUpdate(approvedDetail));
  expect(result.current.data).toEqual(next);
});

it('distinguishes not found from network failure and does not call restricted endpoints', async () => {
  api.detail.mockRejectedValueOnce(new ApiError(404, 'Not found'));
  const { result } = renderHook(() => useIncidentDetail(7));
  await waitFor(() => expect(result.current.notFound).toBe(true));
  expect(result.current.errorMessage).toBeNull();

  auth.mockReturnValue({ user: { id: 3, role: { code: 'DESCONOCIDO' } } } as ReturnType<typeof useAuth>);
  renderHook(() => useIncidentList());
  renderHook(() => useIncidentMine());
  expect(api.all).not.toHaveBeenCalled();
  expect(api.mine).not.toHaveBeenCalled();
});

it('el operario consulta la lista y sus propios reportes (SPEC-201 §3.1)', async () => {
  auth.mockReturnValue({ user: { id: 4, role: { code: 'OPERARIO' } } } as ReturnType<typeof useAuth>);
  api.mine.mockResolvedValue(incidentMine);
  renderHook(() => useIncidentList());
  renderHook(() => useIncidentMine());
  await waitFor(() => expect(api.all).toHaveBeenCalled());
  expect(api.mine).toHaveBeenCalled();
});
