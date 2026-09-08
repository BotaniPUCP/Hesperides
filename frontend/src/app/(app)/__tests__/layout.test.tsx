import { render, screen, waitFor } from '@testing-library/react';
import AppShellLayout from '../layout';

var mockReplace = jest.fn();
var mockPathname = '/admin/usuarios';
var mockAuth: { user: any; isLoading: boolean } = { user: null, isLoading: false };

jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockAuth,
}));
jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace, push: jest.fn() }),
  usePathname: () => mockPathname,
}));

const adminUser = {
  id: 1,
  email: 'ana.torres@pucp.edu.pe',
  firstName: 'Ana',
  lastName: 'Torres',
  fullName: 'Ana Torres',
  role: { id: 1, code: 'ADMIN', label: 'Administrador' },
  isActive: true,
  credentialStatus: 'DELIVERED',
  mustChangePassword: false,
  lastLogin: null,
  teams: [],
};

describe('AppShellLayout (guards)', () => {
  beforeEach(() => {
    mockReplace.mockReset();
    mockPathname = '/admin/usuarios';
    mockAuth = { user: null, isLoading: false };
  });

  it('redirige a /cambiar-password cuando mustChangePassword es true', async () => {
    mockAuth = { user: { ...(adminUser as any), mustChangePassword: true }, isLoading: false };
    render(
      <AppShellLayout>
        <div>Contenido protegido</div>
      </AppShellLayout>,
    );

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/cambiar-password'));
    // Sin sesión aún en la bandera forzada: no se muestra navegación.
    expect(screen.queryByText('Usuarios')).not.toBeInTheDocument();
  });

  it('no redirige estando en /cambiar-password y oculta la navegación', () => {
    mockPathname = '/cambiar-password';
    mockAuth = { user: { ...(adminUser as any), mustChangePassword: true }, isLoading: false };
    render(
      <AppShellLayout>
        <div>Contenido del cambio de contraseña</div>
      </AppShellLayout>,
    );

    expect(mockReplace).not.toHaveBeenCalled();
    expect(screen.getByText('Contenido del cambio de contraseña')).toBeInTheDocument();
    expect(screen.queryByText('Usuarios')).not.toBeInTheDocument();
  });

  it('muestra la navegación y el contenido para un ADMIN sin cambio obligatorio', () => {
    mockAuth = { user: adminUser, isLoading: false };
    render(
      <AppShellLayout>
        <div>Listado de usuarios</div>
      </AppShellLayout>,
    );

    expect(mockReplace).not.toHaveBeenCalled();
    expect(screen.getByText('Listado de usuarios')).toBeInTheDocument();
    expect(screen.getByText('Usuarios')).toBeInTheDocument();
  });

  it('redirige a /login cuando no hay sesión', async () => {
    mockAuth = { user: null, isLoading: false };
    render(
      <AppShellLayout>
        <div>Nunca visible</div>
      </AppShellLayout>,
    );

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/login'));
    expect(screen.queryByText('Nunca visible')).not.toBeInTheDocument();
  });
});