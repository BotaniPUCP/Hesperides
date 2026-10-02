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

  describe('getIfChanged', () => {
    it('manda la etiqueta guardada en If-None-Match', async () => {
      const fetchMock = jest.fn().mockResolvedValue({
        ...okResponse(),
        headers: { get: () => '"8"' },
      });
      global.fetch = fetchMock as unknown as typeof fetch;

      await apiClient.getIfChanged('/map/layers', '"7"');

      expect(cabecerasDelUltimoFetch(fetchMock)['If-None-Match']).toBe('"7"');
    });

    it('ante un 304 avisa que no hubo cambios, sin leer cuerpo', async () => {
      // El 304 no trae cuerpo: intentar leer el sobre JSON fallaría.
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 304,
        headers: { get: () => '"7"' },
        json: async () => {
          throw new Error('un 304 no tiene cuerpo');
        },
      }) as unknown as typeof fetch;

      await expect(apiClient.getIfChanged('/map/layers', '"7"')).resolves.toEqual({ changed: false });
    });

    it('con datos nuevos devuelve los datos y la etiqueta nueva', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: { get: (h: string) => (h.toLowerCase() === 'etag' ? '"8"' : null) },
        json: async () => ({ ok: true, message: '', data: { version: 8 } }),
      }) as unknown as typeof fetch;

      await expect(apiClient.getIfChanged('/map/layers', '"7"')).resolves.toEqual({
        changed: true,
        data: { version: 8 },
        etag: '"8"',
      });
    });

    it('sin etiqueta guardada no manda If-None-Match', async () => {
      const fetchMock = jest.fn().mockResolvedValue({ ...okResponse(), headers: { get: () => null } });
      global.fetch = fetchMock as unknown as typeof fetch;

      await apiClient.getIfChanged('/map/layers', null);

      expect(cabecerasDelUltimoFetch(fetchMock)['If-None-Match']).toBeUndefined();
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

  describe('formularios con archivos', () => {
    it('envía el FormData tal cual y deja que el navegador ponga el Content-Type', async () => {
      const fetchMock = jest.fn().mockResolvedValue(okResponse());
      global.fetch = fetchMock as unknown as typeof fetch;
      const form = new FormData();
      form.append('file', new Blob(['a;b']), 'carga.csv');

      await apiClient.postForm('/imports/specimens/preview', form);

      const init = fetchMock.mock.calls[0][1] as RequestInit;
      expect(init.method).toBe('POST');
      expect(init.body).toBe(form);
      expect(cabecerasDelUltimoFetch(fetchMock)['Content-Type']).toBeUndefined();
    });

    it('putForm usa PUT', async () => {
      const fetchMock = jest.fn().mockResolvedValue(okResponse());
      global.fetch = fetchMock as unknown as typeof fetch;

      await apiClient.putForm('/green-inventory/specimens/EV-000001', new FormData());

      expect((fetchMock.mock.calls[0][1] as RequestInit).method).toBe('PUT');
    });
  });

  describe('getBlob', () => {
    it('devuelve el archivo con el token de la sesión', async () => {
      setAccessToken('t');
      const blob = new Blob(['codigo;nombre_cientifico']);
      const fetchMock = jest.fn().mockResolvedValue({ ok: true, status: 200, blob: async () => blob });
      global.fetch = fetchMock as unknown as typeof fetch;

      await expect(apiClient.getBlob('/green-inventory/export.csv')).resolves.toBe(blob);
      expect(cabecerasDelUltimoFetch(fetchMock).Authorization).toBe('Bearer t');
    });

    it('un error trae el mensaje del sobre', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 403,
        json: async () => ({ ok: false, message: 'Access denied', data: null }),
      }) as unknown as typeof fetch;

      await expect(apiClient.getBlob('/green-inventory/export.csv')).rejects.toMatchObject({ status: 403 });
    });
  });
});
