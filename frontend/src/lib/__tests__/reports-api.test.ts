import { apiClient } from '../api';
import { reportsApi } from '../reports-api';
import { EMPTY_MONTHLY_FILTERS } from '../reportNavigation';

jest.mock('../api', () => ({ apiClient: { get: jest.fn() } }));

beforeEach(() => jest.clearAllMocks());

it('pide las opciones y las secciones de un sector por el cliente central', () => {
  reportsApi.options();
  reportsApi.sections(2);
  expect(apiClient.get).toHaveBeenNthCalledWith(1, '/reports/options');
  expect(apiClient.get).toHaveBeenNthCalledWith(2, '/reports/options/sections?sectorId=2');
});

it('sin filtros pide la mensual sin parámetros, para que el backend aplique sus valores por defecto', () => {
  reportsApi.monthly(EMPTY_MONTHLY_FILTERS);
  expect(apiClient.get).toHaveBeenCalledWith('/reports/monthly');
});

it('envía solo los filtros presentes, por id', () => {
  reportsApi.monthly({ ...EMPTY_MONTHLY_FILTERS, dateFrom: '2026-10-01', dateTo: '2026-10-31', sectorId: 2, typeItemId: 41 });
  expect(apiClient.get).toHaveBeenCalledWith('/reports/monthly?dateFrom=2026-10-01&dateTo=2026-10-31&sectorId=2&typeItemId=41');
});
