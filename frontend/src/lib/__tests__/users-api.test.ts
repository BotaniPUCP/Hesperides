import { usersApi } from '../users-api';
import { apiClient } from '../api';

jest.mock('../api', () => ({
  apiClient: { get: jest.fn(), post: jest.fn(), put: jest.fn() },
  ApiError: class ApiError extends Error {},
}));

const mockedGet = apiClient.get as jest.Mock;
const mockedPost = apiClient.post as jest.Mock;
const mockedPut = apiClient.put as jest.Mock;

describe('usersApi.all', () => {
  beforeEach(() => jest.clearAllMocks());

  it('pide la lista completa, sin filtros: se filtra en el navegador (SPEC-119)', async () => {
    mockedGet.mockResolvedValue([]);

    await usersApi.all();

    expect(mockedGet).toHaveBeenCalledWith('/users/all');
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
