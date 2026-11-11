import { apiClient } from '../api';
import { reservationsApi } from '../reservations-api';

jest.mock('../api', () => ({
  apiClient: { get: jest.fn(), getBlob: jest.fn(), post: jest.fn(), put: jest.fn(), postForm: jest.fn() },
}));

beforeEach(() => jest.clearAllMocks());

describe('reservations-api', () => {
  it('lee la agenda con sus filtros y la página (SPEC-107 §3)', () => {
    reservationsApi.list({
      from: '2026-11-11', to: '2026-12-11', placeId: 4, organizationCode: ' ORG-0031 ',
      includeCancelled: true,
    }, 2);

    expect(apiClient.get).toHaveBeenCalledWith(
      '/reservations?from=2026-11-11&to=2026-12-11&placeId=4&organizationCode=ORG-0031'
      + '&includeCancelled=true&page=2&size=20');
  });

  it('omite de la URL lo que no filtra', () => {
    reservationsApi.list({ includeCancelled: false }, 0);

    expect(apiClient.get).toHaveBeenCalledWith('/reservations?page=0&size=20');
  });

  it('consulta los avisos antes de guardar y los del registro de intervención', () => {
    reservationsApi.check({
      placeId: 4, startsAt: '2026-11-13T10:00:00-05:00', endsAt: '2026-11-13T14:00:00-05:00',
      excludeCode: 'RES-0042',
    });
    reservationsApi.nearby({
      date: '2026-11-13', zoneIds: [1, 2], placeIds: [3], points: '1,2;3,4',
      elementCodes: ['AV-0001', 'AV-0002'],
    });

    expect(apiClient.get).toHaveBeenNthCalledWith(1,
      '/reservations/check?placeId=4&startsAt=2026-11-13T10%3A00%3A00-05%3A00'
      + '&endsAt=2026-11-13T14%3A00%3A00-05%3A00&excludeCode=RES-0042');
    expect(apiClient.get).toHaveBeenNthCalledWith(2,
      '/reservations/nearby?date=2026-11-13&zoneIds=1%2C2&placeIds=3'
      + '&points=1%2C2%3B3%2C4&elementCodes=AV-0001%2CAV-0002');
  });

  it('crea, edita y anula con los cuerpos documentados', () => {
    const body = {
      placeId: 4, organizationCode: 'ORG-0031', contactCode: null,
      startsAt: '2026-11-13T10:00:00-05:00', endsAt: '2026-11-13T14:00:00-05:00',
      purpose: 'Feria', version: null,
    };
    reservationsApi.create(body);
    reservationsApi.update('RES-0042', { ...body, version: 0 });
    reservationsApi.cancel('RES-0042', 'Suspensión de clases', 0);

    expect(apiClient.post).toHaveBeenCalledWith('/reservations', body);
    expect(apiClient.put).toHaveBeenCalledWith('/reservations/RES-0042', { ...body, version: 0 });
    expect(apiClient.post).toHaveBeenCalledWith('/reservations/RES-0042/cancel',
      { reason: 'Suspensión de clases', version: 0 });
  });

  it('resuelve jardines, organizaciones del filtro, plantilla y registro masivo', () => {
    reservationsApi.gardens('rosales');
    reservationsApi.organizations();
    reservationsApi.importTemplate();
    reservationsApi.confirmImport(7);

    expect(apiClient.get).toHaveBeenNthCalledWith(1, '/reservations/gardens?q=rosales');
    expect(apiClient.get).toHaveBeenNthCalledWith(2, '/reservations/organizations');
    expect(apiClient.getBlob).toHaveBeenCalledWith('/imports/templates/reservations');
    expect(apiClient.post).toHaveBeenCalledWith('/imports/7/confirm', {});
  });
});
