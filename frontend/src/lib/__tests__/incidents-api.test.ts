import { apiClient } from '../api';
import { incidentsApi } from '../incidents-api';

jest.mock('../api', () => ({ apiClient: { get: jest.fn(), post: jest.fn(), put: jest.fn(), postForm: jest.fn() } }));

beforeEach(() => jest.clearAllMocks());

const capture = {
  description: 'Rama', reportedUrgencyCode: 'MEDIUM', locationReference: null, latitude: null, longitude: null,
  zoneId: null, requestedByOrganizationCode: null, requestedByName: null, requesterContactCode: null,
  requestedForOrganizationCode: null, sourceCode: null, externalCode: null,
};

it('creates through the central client with an explicit idempotency header', () => {
  incidentsApi.create(capture, 'stable-reference');
  expect(apiClient.post).toHaveBeenCalledWith('/incidents', capture, { 'Idempotency-Key': 'stable-reference' });
});

it('pide la lista completa para filtrarla en el navegador (SPEC-119)', () => {
  incidentsApi.all();
  expect(apiClient.get).toHaveBeenLastCalledWith('/incidents/all');
});

it('activates and closes with the version that the screen saw', () => {
  incidentsApi.activate(7, 3);
  expect(apiClient.post).toHaveBeenCalledWith('/incidents/7/activate', { version: 3 });
  incidentsApi.close(7, 4, 'Se podó');
  expect(apiClient.post).toHaveBeenCalledWith('/incidents/7/close', { version: 4, resolutionSummary: 'Se podó' });
});

it('links, removes and replaces work on the incident side', () => {
  incidentsApi.link(7, 3, 11);
  expect(apiClient.post).toHaveBeenCalledWith('/incidents/7/links', { version: 3, interventionId: 11 });
  incidentsApi.unlink(7, 5, 3, 'Equivocada');
  expect(apiClient.post).toHaveBeenCalledWith('/incidents/7/links/5/remove', { version: 3, reason: 'Equivocada' });
  incidentsApi.replace(7, 5, 3, 12, 'Pasa al tercero');
  expect(apiClient.post).toHaveBeenCalledWith('/incidents/7/links/5/replace', { version: 3, interventionId: 12, reason: 'Pasa al tercero' });
});

it('pide todas las intervenciones que se pueden vincular, sin texto', () => {
  incidentsApi.candidates();
  expect(apiClient.get).toHaveBeenCalledWith('/incidents/intervention-candidates');
});

it('searches incidents and links them from an intervention', () => {
  incidentsApi.search();
  expect(apiClient.get).toHaveBeenCalledWith('/incidents/search');
  incidentsApi.linkFromWork(11, 7);
  expect(apiClient.post).toHaveBeenCalledWith('/interventions/11/incident-links', { incidentId: 7 });
  incidentsApi.unlinkFromWork(11, 5, 'Equivocada');
  expect(apiClient.post).toHaveBeenCalledWith('/interventions/11/incident-links/5/remove', { reason: 'Equivocada' });
});

it('uploads through the existing multipart helper, retaining its retry reference', () => {
  const file = new File(['photo'], 'evidence.webp', { type: 'image/webp' });
  incidentsApi.upload(7, file, 'stable-reference');
  const [path, body] = jest.mocked(apiClient.postForm).mock.calls[0];
  expect(path).toBe('/incidents/7/photos');
  expect(body.get('file')).toBe(file);
  expect(body.get('clientReference')).toBe('stable-reference');
});

it('reads private photos, the map and the own reports through the authenticated client', () => {
  incidentsApi.photo(7, 3);
  expect(apiClient.get).toHaveBeenCalledWith('/incidents/7/photos/3');
  incidentsApi.map();
  expect(apiClient.get).toHaveBeenCalledWith('/incidents/map');
  incidentsApi.mine();
  expect(apiClient.get).toHaveBeenCalledWith('/incidents/mine');
});
