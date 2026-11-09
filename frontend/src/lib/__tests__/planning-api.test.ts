import { apiClient } from '../api';
import { greenAreaSetsApi } from '../green-area-sets-api';
import { planningApi } from '../planning-api';

jest.mock('../api', () => ({ apiClient: { get: jest.fn(), post: jest.fn(), put: jest.fn(), del: jest.fn() } }));

beforeEach(() => jest.clearAllMocks());

it('pide la planificación y los jardines atendidos hace poco (SPEC-203 §3.2, §3.3)', () => {
  planningApi.rows();
  planningApi.recentAttention(30, '2026-11-08', [112, 113]);
  expect(apiClient.get).toHaveBeenNthCalledWith(1, '/maintenance/planning');
  expect(apiClient.get).toHaveBeenNthCalledWith(2,
    '/maintenance/planning/recent-attention?activityTypeItemId=30&date=2026-11-08&zoneIds=112,113');
});

it('lee, crea, edita y da de baja conjuntos (SPEC-203 §3.1)', () => {
  const body = { name: 'Pabellones', description: null, zoneIds: [1], activityTypeItemIds: [30], version: 2 };
  greenAreaSetsApi.list();
  greenAreaSetsApi.get(3);
  greenAreaSetsApi.create(body);
  greenAreaSetsApi.update(3, body);
  greenAreaSetsApi.remove(3);
  expect(apiClient.get).toHaveBeenNthCalledWith(1, '/green-area-sets');
  expect(apiClient.get).toHaveBeenNthCalledWith(2, '/green-area-sets/3');
  expect(apiClient.post).toHaveBeenCalledWith('/green-area-sets', body);
  expect(apiClient.put).toHaveBeenCalledWith('/green-area-sets/3', body);
  expect(apiClient.del).toHaveBeenCalledWith('/green-area-sets/3');
});
