import { act, renderHook, waitFor } from '@testing-library/react';
import { useAuth } from '../useAuth';
import { useIncidentDetail, useIncidentOptions, useIncidents, useIncidentSummary } from '../useIncidents';
import { incidentsApi } from '@/lib/incidents-api';
import { ApiError } from '@/lib/api';
import { incidentOptions, incidentPage, pendingDetail, approvedDetail } from '@/components/incidents/__fixtures__/incidents';

jest.mock('../useAuth', () => ({ useAuth: jest.fn() }));
jest.mock('next/navigation', () => ({ useSearchParams: jest.fn() }));
jest.mock('@/lib/incidents-api', () => ({ incidentsApi: {
  list: jest.fn(), options: jest.fn(), summary: jest.fn(), detail: jest.fn(),
} }));
const api = incidentsApi as jest.Mocked<typeof incidentsApi>;
const auth = jest.mocked(useAuth);
const filters = { search: '', status: '', page: 0 };

beforeEach(() => {
  jest.resetAllMocks();
  auth.mockReturnValue({ user: { id: 1, role: { code: 'COORDINADOR' } } } as ReturnType<typeof useAuth>);
  api.list.mockResolvedValue(incidentPage);
  api.options.mockResolvedValue(incidentOptions);
  api.detail.mockResolvedValue(pendingDetail);
});

it('loads the list even when options and summary fail, without refetching them for each filter', async () => {
  api.options.mockRejectedValue(new ApiError(500, 'Unavailable'));
  api.summary.mockRejectedValue(new ApiError(500, 'Unavailable'));
  const { result, rerender } = renderHook(({ search }) => ({
    list: useIncidents({ ...filters, search }), options: useIncidentOptions(), summary: useIncidentSummary(),
  }), { initialProps: { search: '' } });
  await waitFor(() => expect(result.current.list.data).toEqual(incidentPage));
  await waitFor(() => expect(result.current.options.errorMessage).toBeTruthy());
  expect(result.current.summary.errorMessage).toBeTruthy();
  rerender({ search: 'rama' });
  await waitFor(() => expect(api.list).toHaveBeenLastCalledWith(0, '', 'rama'));
  expect(api.options).toHaveBeenCalledTimes(1);
  expect(api.summary).toHaveBeenCalledTimes(1);
});

it('does not display results from an old query while the next query loads', async () => {
  let resolveOld!: (data: typeof incidentPage) => void;
  api.list.mockReturnValueOnce(new Promise((resolve) => { resolveOld = resolve; }));
  const next = { ...incidentPage, content: [] };
  api.list.mockResolvedValueOnce(next);
  const { result, rerender } = renderHook(({ search }) => useIncidents({ ...filters, search }), { initialProps: { search: 'old' } });
  rerender({ search: 'new' });
  expect(result.current.data).toBeNull();
  await waitFor(() => expect(result.current.data).toEqual(next));
  await act(async () => resolveOld(incidentPage));
  expect(result.current.data).toEqual(next);
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

  auth.mockReturnValue({ user: { id: 2, role: { code: 'SUPERVISOR' } } } as ReturnType<typeof useAuth>);
  renderHook(() => useIncidentSummary());
  expect(api.summary).not.toHaveBeenCalled();
  auth.mockReturnValue({ user: { id: 3, role: { code: 'ADMIN' } } } as ReturnType<typeof useAuth>);
  renderHook(() => useIncidents(filters));
  expect(api.list).not.toHaveBeenCalled();
});

it('discards data when the signed-in actor changes', async () => {
  const { result, rerender } = renderHook(() => useIncidents(filters));
  await waitFor(() => expect(result.current.data).toEqual(incidentPage));
  api.list.mockReturnValueOnce(new Promise(() => {}));
  auth.mockReturnValue({ user: { id: 2, role: { code: 'COORDINADOR' } } } as ReturnType<typeof useAuth>);
  rerender();
  expect(result.current.data).toBeNull();
  expect(result.current.loading).toBe(true);
});
