import { apiClient, ApiError } from '../api';

describe('refresh encolado', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  function envelope(data: unknown) {
    return {
      ok: true,
      status: 200,
      json: async () => ({ ok: true, message: '', data }),
    } as Response;
  }

  function unauthorized() {
    return {
      ok: false,
      status: 401,
      json: async () => ({ ok: false, message: 'Invalid or expired token', data: null }),
    } as Response;
  }

  it('dispara un unico refresh aunque tres peticiones fallen a la vez', async () => {
    let refreshCalls = 0;
    const fetchMock = jest.fn(async (url: string) => {
      if (String(url).includes('/auth/refresh')) {
        refreshCalls += 1;
        return envelope({ accessToken: 'nuevo' });
      }
      // Antes del refresh cada endpoint da 401; despues responde bien.
      return refreshCalls === 0 ? unauthorized() : envelope({ id: 1 });
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    await Promise.all([
      apiClient.get('/users'),
      apiClient.get('/zones'),
      apiClient.get('/incidents'),
    ]);

    expect(refreshCalls).toBe(1);
  });

  it('reintenta la peticion original una sola vez tras un refresh exitoso', async () => {
    let attempts = 0;
    global.fetch = jest.fn(async (url: string) => {
      if (String(url).includes('/auth/refresh')) return envelope({});
      attempts += 1;
      return attempts === 1 ? unauthorized() : envelope({ id: 7 });
    }) as unknown as typeof fetch;

    const result = await apiClient.get<{ id: number }>('/users/7');

    expect(result).toEqual({ id: 7 });
    expect(attempts).toBe(2);
  });

  it('propaga el 401 sin reintentar en bucle si el refresh falla', async () => {
    global.fetch = jest.fn(async () => unauthorized()) as unknown as typeof fetch;

    await expect(apiClient.get('/users')).rejects.toBeInstanceOf(ApiError);
  });

  it('no intenta refrescar cuando el que falla es el propio login', async () => {
    const fetchMock = jest.fn(async () => unauthorized());
    global.fetch = fetchMock as unknown as typeof fetch;

    await expect(apiClient.post('/auth/login', {})).rejects.toBeInstanceOf(ApiError);

    // Una sola llamada: la del login. Nunca un refresh.
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
