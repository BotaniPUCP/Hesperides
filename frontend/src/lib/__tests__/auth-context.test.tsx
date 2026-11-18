import { act, render, screen, waitFor } from '@testing-library/react';
import { apiClient, setAccessToken, setPasswordChangeRequiredHandler } from '../api';
import { AuthProvider, useAuthContext } from '../auth-context';
import { definePreloadedList } from '../preload/preloadedList';

function Sonda() {
  const { user } = useAuthContext();
  return <p>{user === null ? 'sin sesion' : `cambio:${String(user.mustChangePassword)}`}</p>;
}

function respuesta(status: number, message: string, data: unknown = null) {
  return { ok: status < 400, status, json: async () => ({ ok: status < 400, message, data }) };
}

describe('AuthProvider', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    setAccessToken(null);
    setPasswordChangeRequiredHandler(null);
  });

  it('relee la sesion cuando el backend exige cambiar la contraseña', async () => {
    // Reproduce a quien le regeneran la clave con la pestaña abierta: su copia
    // de la sesion aun dice false y RouteGuard no lo desviaria nunca.
    let exigeCambio = false;
    global.fetch = jest.fn(async (url: string) => {
      if (url.endsWith('/auth/me')) {
        return respuesta(200, '', { id: 1, mustChangePassword: exigeCambio });
      }
      return respuesta(403, 'Password change required before using the system');
    }) as unknown as typeof fetch;

    render(
      <AuthProvider>
        <Sonda />
      </AuthProvider>,
    );
    expect(await screen.findByText('cambio:false')).toBeInTheDocument();

    exigeCambio = true;
    await act(async () => {
      await expect(apiClient.get('/reports/options')).rejects.toMatchObject({ status: 403 });
    });

    await waitFor(() => expect(screen.getByText('cambio:true')).toBeInTheDocument());
  });

  it.each(['login', 'logout'] as const)('al hacer %s descarta las listas precargadas del usuario anterior (SPEC-119 D-05)', async (action) => {
    global.fetch = jest.fn(async (url: string) => respuesta(200, '',
      url.endsWith('/auth/login') ? { accessToken: 't', user: { id: 2 } } : { id: 1 })) as unknown as typeof fetch;
    const lista = definePreloadedList('auth-test', async () => ['secreto'], []);
    function Acciones() {
      const { login, logout } = useAuthContext();
      return <>
        <button onClick={() => void login('a@b.pe', 'x')}>login</button>
        <button onClick={() => void logout()}>logout</button>
      </>;
    }
    render(<AuthProvider><Acciones /></AuthProvider>);
    lista.open();
    await waitFor(() => expect(lista.snapshot().items).toEqual(['secreto']));

    await act(async () => screen.getByRole('button', { name: action }).click());

    await waitFor(() => expect(lista.snapshot().items).toEqual([]));
  });
});
