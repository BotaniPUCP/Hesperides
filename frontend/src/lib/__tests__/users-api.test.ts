import { usersApi } from '../users-api';
import { apiClient } from '../api';

jest.mock('../api', () => ({
  apiClient: { get: jest.fn(), post: jest.fn(), put: jest.fn() },
  ApiError: class ApiError extends Error {},
}));

const mockedGet = apiClient.get as jest.Mock;
const mockedPost = apiClient.post as jest.Mock;
const mockedPut = apiClient.put as jest.Mock;

describe('usersApi.list', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGet.mockResolvedValue({ content: [], page: { number: 0, size: 20, totalElements: 0, totalPages: 0 } });
  });

  it('omits filters that have no value instead of sending them empty', async () => {
    // Un `?search=` vacío no es lo mismo que no filtrar: el backend lo recibiría
    // como cadena vacía y buscaría por ella.
    await usersApi.list({}, 0);

    const path = mockedGet.mock.calls[0][0] as string;
    expect(path).not.toContain('search=');
    expect(path).not.toContain('roleCode=');
    expect(path).not.toContain('isActive=');
    expect(path).not.toContain('teamId=');
  });

  it('sends every filter that does have a value', async () => {
    await usersApi.list({ search: 'ana', roleCode: 'OPERARIO', isActive: false, teamId: 7 }, 2);

    const path = mockedGet.mock.calls[0][0] as string;
    expect(path).toContain('search=ana');
    expect(path).toContain('roleCode=OPERARIO');
    expect(path).toContain('isActive=false');
    expect(path).toContain('teamId=7');
    expect(path).toContain('page=2');
  });

  it('keeps isActive=false in the query, because false is a filter and not an absence', async () => {
    // El fallo clásico: `if (filters.isActive)` descarta false y el filtro
    // "solo inactivos" deja de funcionar sin dar ningún error.
    await usersApi.list({ isActive: false }, 0);

    expect(mockedGet.mock.calls[0][0]).toContain('isActive=false');
  });

  it('encodes a search term with spaces and accents', async () => {
    await usersApi.list({ search: 'María García' }, 0);

    const path = mockedGet.mock.calls[0][0] as string;
    expect(path).toContain('search=Mar%C3%ADa+Garc%C3%ADa');
  });
});

describe('usersApi write operations', () => {
  beforeEach(() => jest.clearAllMocks());

  it('creates a user against POST /users', async () => {
    mockedPost.mockResolvedValue({ id: 9 });

    await usersApi.create({
      email: 'ana@pucp.edu.pe',
      firstName: 'Ana',
      lastName: 'Torres',
      roleCode: 'OPERARIO',
      initialPassword: 'ClaveValida123',
    });

    expect(mockedPost).toHaveBeenCalledWith('/users', expect.objectContaining({ email: 'ana@pucp.edu.pe' }));
  });

  it('updates a user against PUT /users/{id} and never sends a password', async () => {
    mockedPut.mockResolvedValue({ id: 9 });

    await usersApi.update(9, {
      email: 'ana@pucp.edu.pe',
      firstName: 'Ana',
      lastName: 'Torres',
      roleCode: 'SUPERVISOR',
    });

    expect(mockedPut).toHaveBeenCalledWith('/users/9', expect.not.objectContaining({ password: expect.anything() }));
  });

  it('hits the dedicated action paths for the credential and activation flows', async () => {
    mockedPost.mockResolvedValue({});

    await usersApi.deactivate(3);
    await usersApi.reactivate(3);
    await usersApi.resendCredentials(3);
    await usersApi.markCredentialsDelivered(3);
    await usersApi.changeOwnPassword({ currentPassword: 'Temporal123', newPassword: 'NuevaClave456' });

    const paths = mockedPost.mock.calls.map((call) => call[0]);
    expect(paths).toEqual([
      '/users/3/deactivate',
      '/users/3/reactivate',
      '/users/3/resend-credentials',
      '/users/3/mark-credentials-delivered',
      '/users/me/password',
    ]);
  });
});
