import { apiClient } from '../api';
import { incidentsApi } from '../incidents-api';

jest.mock('../api', () => ({ apiClient: { get: jest.fn(), post: jest.fn(), postForm: jest.fn() } }));

beforeEach(() => jest.clearAllMocks());

it('creates through the central client with an explicit idempotency header', () => {
  const capture = { description: 'Rama', locationReference: null, latitude: null, longitude: null };
  incidentsApi.create(capture, 'stable-reference');
  expect(apiClient.post).toHaveBeenCalledWith('/incidents', capture, { 'Idempotency-Key': 'stable-reference' });
});

it('uploads through the existing multipart helper, retaining its retry reference', () => {
  const file = new File(['photo'], 'evidence.webp', { type: 'image/webp' });
  incidentsApi.upload(7, file, 'stable-reference');
  const [path, body] = jest.mocked(apiClient.postForm).mock.calls[0];
  expect(path).toBe('/incidents/7/photos');
  expect(body.get('file')).toBe(file);
  expect(body.get('clientReference')).toBe('stable-reference');
});

it('reads private photo content through the authenticated JSON client', () => {
  incidentsApi.photo(7, 3);
  expect(apiClient.get).toHaveBeenCalledWith('/incidents/7/photos/3');
});
