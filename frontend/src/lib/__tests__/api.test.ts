import { apiClient, ApiError } from '../api';

describe('apiClient', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('unwraps data from the response envelope', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ok: true, message: 'Service is healthy', data: { status: 'UP' } }),
    }) as unknown as typeof fetch;

    const result = await apiClient.get<{ status: string }>('/health');

    expect(result).toEqual({ status: 'UP' });
  });

  it('throws ApiError carrying status and message on failure', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ ok: false, message: 'Catalog type not found', data: null }),
    }) as unknown as typeof fetch;

    await expect(apiClient.get('/catalogs/NOPE')).rejects.toMatchObject({
      name: 'ApiError',
      status: 404,
      message: 'Catalog type not found',
    });
  });

  it('throws ApiError with status 0 when the network is unreachable', async () => {
    global.fetch = jest.fn().mockRejectedValue(new TypeError('Failed to fetch')) as unknown as typeof fetch;

    await expect(apiClient.get('/health')).rejects.toBeInstanceOf(ApiError);
  });
});
