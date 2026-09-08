import { render, screen, waitFor } from '@testing-library/react';
import Home from '../page';

var mockReplace = jest.fn();
var mockAuth: { user: any; isLoading: boolean } = { user: null, isLoading: false };

jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockAuth,
}));
jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace, push: jest.fn() }),
  usePathname: () => '/',
}));

const nonAdminUser = {
  id: 2,
  email: 'luis.paredes@pucp.edu.pe',
  firstName: 'Luis',
  lastName: 'Paredes',
  fullName: 'Luis Paredes',
  role: { id: 2, code: 'OPERARIO', label: 'Operario' },
  isActive: true,
  credentialStatus: 'DELIVERED',
  mustChangePassword: false,
  lastLogin: null,
  teams: [],
};

describe('Home', () => {
  beforeEach(() => {
    mockReplace.mockReset();
    mockAuth = { user: null, isLoading: true };
  });

  it('redirige a /login cuando no hay sesión', async () => {
    mockAuth = { user: null, isLoading: false };
    render(<Home />);
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/login'));
  });

  it('redirige a /admin/usuarios para un administrador', async () => {
    mockAuth = {
      user: { ...nonAdminUser, role: { id: 1, code: 'ADMIN', label: 'Administrador' } },
      isLoading: false,
    };
    render(<Home />);
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/admin/usuarios'));
  });

  it('muestra el bienvenido para un rol sin bandera mustChangePassword', () => {
    mockAuth = { user: nonAdminUser, isLoading: false };
    render(<Home />);
    expect(mockReplace).not.toHaveBeenCalled();
    expect(screen.getByRole('heading', { name: /hesperides/i })).toBeInTheDocument();
    expect(screen.getByText(/Bienvenido, Luis/i)).toBeInTheDocument();
  });
});