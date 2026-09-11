import { apiClient, ApiError, setAccessToken } from '../api';

describe('apiClient', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    // El token vive en memoria del modulo: sin limpiarlo, una prueba dejaria
    // sesion abierta para la siguiente.
    setAccessToken(null);
  });

  function okResponse() {
    return {
      ok: true,
      status: 200,
      json: async () => ({ ok: true, message: '', data: null }),
    };
  }

  function cabecerasDelUltimoFetch(mock: jest.Mock): Record<string, string> {
    return (mock.mock.calls[0][1] as RequestInit).headers as Record<string, string>;
  }

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

  it('manda el access token como Authorization: Bearer', async () => {
    // El backend lo lee del header y nunca de la cookie (SPEC-001 §5.1). Sin
    // esto toda ruta de negocio responde 401 y la sesion no sirve de nada.
    const fetchMock = jest.fn().mockResolvedValue(okResponse());
    global.fetch = fetchMock as unknown as typeof fetch;
    setAccessToken('jwt-de-prueba');

    await apiClient.get('/users');

    expect(cabecerasDelUltimoFetch(fetchMock).Authorization).toBe('Bearer jwt-de-prueba');
  });

  it('no manda Authorization cuando no hay sesion en memoria', async () => {
    const fetchMock = jest.fn().mockResolvedValue(okResponse());
    global.fetch = fetchMock as unknown as typeof fetch;

    await apiClient.post('/auth/login', { email: 'a@b.pe', password: 'x' });

    expect(cabecerasDelUltimoFetch(fetchMock).Authorization).toBeUndefined();
  });

  it('adjunta las cookies en cada peticion, que es como viaja el refresh', async () => {
    const fetchMock = jest.fn().mockResolvedValue(okResponse());
    global.fetch = fetchMock as unknown as typeof fetch;

    await apiClient.get('/users');

    expect((fetchMock.mock.calls[0][1] as RequestInit).credentials).toBe('include');
  });

  it('throws ApiError with status 0 when the network is unreachable', async () => {
    global.fetch = jest.fn().mockRejectedValue(new TypeError('Failed to fetch')) as unknown as typeof fetch;

    await expect(apiClient.get('/health')).rejects.toBeInstanceOf(ApiError);
  });
});
