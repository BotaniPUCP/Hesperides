import { apiClient, setAccessToken } from '../api';

beforeEach(() => { global.fetch = jest.fn(); });
afterEach(() => { setAccessToken(null); jest.restoreAllMocks(); });

it('preserves multipart boundaries and authentication when retrying an upload after refresh', async () => {
  const fetchMock = jest.mocked(global.fetch)
    .mockResolvedValueOnce({ status: 401 } as Response)
    .mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true, data: { accessToken: 'renewed' } }) } as Response)
    .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ ok: true, data: { id: 2 } }) } as Response);
  const form = new FormData(); form.append('file', new File(['image'], 'photo.png'));
  setAccessToken('expired');
  await expect(apiClient.post('/incidents/1/photos', form)).resolves.toEqual({ id: 2 });
  expect(fetchMock.mock.calls[0][1]?.body).toBe(form);
  expect(fetchMock.mock.calls[2][1]?.body).toBe(form);
  expect(fetchMock.mock.calls[2][1]?.headers).toEqual({ Authorization: 'Bearer renewed' });
});

it('keeps the idempotency header on the actual POST', async () => {
  const fetchMock = jest.mocked(global.fetch).mockResolvedValue({ ok: true, status: 201, json: async () => ({ ok: true, data: { id: 1 } }) } as Response);
  await apiClient.post('/incidents', { description: 'Rama' }, { 'Idempotency-Key': 'stable-reference' });
  expect(fetchMock.mock.calls[0][1]?.headers).toMatchObject({ 'Idempotency-Key': 'stable-reference', 'Content-Type': 'application/json' });
});
