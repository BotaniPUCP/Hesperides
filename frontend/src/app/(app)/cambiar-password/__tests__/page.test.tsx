import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import CambiarPasswordPage from '../page';

jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: {
      id: 1,
      email: 'ana.torres@pucp.edu.pe',
      firstName: 'Ana',
      lastName: 'Torres',
      fullName: 'Ana Torres',
      role: { id: 1, code: 'ADMIN', label: 'Administrador' },
      isActive: true,
      credentialStatus: 'DELIVERED',
      mustChangePassword: true,
      lastLogin: null,
      teams: [],
    },
    isLoading: false,
  }),
}));
jest.mock('@/components/ui/ToastProvider', () => ({
  useToast: () => ({ showToast: jest.fn(), dismissAll: jest.fn() }),
}));
jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace: jest.fn(), push: jest.fn() }),
}));

const CURRENT = 'ViejaClave2025';
const NEXT = 'ClaveSuperior2026';

function fillValid() {
  fireEvent.change(screen.getByLabelText(/^Contraseña actual/), { target: { value: CURRENT } });
  fireEvent.change(screen.getByLabelText(/^Nueva contraseña/), { target: { value: NEXT } });
  fireEvent.change(screen.getByLabelText(/^Confirmar nueva contraseña/), { target: { value: NEXT } });
}

describe('CambiarPasswordPage', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ok: true, message: 'ok', data: null }),
    }) as unknown as typeof fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('deshabilita el envío hasta que se cumple la política y coincide la confirmación', () => {
    render(<CambiarPasswordPage />);
    const submit = screen.getByRole('button', { name: 'Cambiar y continuar' });
    expect(submit).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/^Contraseña actual/), { target: { value: CURRENT } });
    expect(submit).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/^Nueva contraseña/), { target: { value: 'clavecorta' } });
    expect(submit).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/^Nueva contraseña/), { target: { value: NEXT } });
    fireEvent.change(screen.getByLabelText(/^Confirmar nueva contraseña/), { target: { value: NEXT } });
    expect(submit).toBeEnabled();
  });

  it('muestra error si las copias de la nueva contraseña no coinciden', () => {
    render(<CambiarPasswordPage />);
    fireEvent.change(screen.getByLabelText(/^Contraseña actual/), { target: { value: CURRENT } });
    fireEvent.change(screen.getByLabelText(/^Nueva contraseña/), { target: { value: NEXT } });
    fireEvent.change(screen.getByLabelText(/^Confirmar nueva contraseña/), { target: { value: 'OtraClave2026' } });

    expect(screen.getByText('Las contraseñas no coinciden')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cambiar y continuar' })).toBeDisabled();
  });

  it('muestra "La contraseña actual es incorrecta" cuando el backend responde 400', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ ok: false, message: 'Current password is incorrect', data: null }),
    }) as unknown as typeof fetch;

    render(<CambiarPasswordPage />);
    fillValid();
    fireEvent.click(screen.getByRole('button', { name: 'Cambiar y continuar' }));

    await waitFor(() => expect(screen.getByText('La contraseña actual es incorrecta')).toBeInTheDocument());

    const fetchMock = global.fetch as jest.Mock;
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain('/users/me/password');
    expect(JSON.parse(init.body)).toEqual({ currentPassword: CURRENT, newPassword: NEXT });
  });
});