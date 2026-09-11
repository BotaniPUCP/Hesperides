import { render, screen } from '@testing-library/react';
import HomePage from '../page';

const logout = jest.fn();
let mockAuth: {
  user: { email: string; fullName: string; role: { code: string; label: string } } | null;
  isLoading: boolean;
  login: jest.Mock;
  logout: jest.Mock;
};

jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockAuth,
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  // RouteGuard consulta la ruta actual para no redirigir a /cambiar-password
  // desde /cambiar-password: sin este mock, el guard revienta al montar.
  usePathname: () => '/',
}));

describe('HomePage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuth = {
      user: {
        email: 'admin@pucp.edu.pe',
        fullName: 'Administrador Hesperides',
        role: { code: 'ADMIN', label: 'Administrador' },
      },
      isLoading: false,
      login: jest.fn(),
      logout,
    };
  });

  it('saluda a la persona con sesion iniciada', () => {
    render(<HomePage />);

    expect(screen.getByText(/Administrador Hesperides/)).toBeInTheDocument();
    expect(screen.getByText('admin@pucp.edu.pe')).toBeInTheDocument();
  });

  it('ofrece cerrar sesion', () => {
    render(<HomePage />);

    expect(screen.getByRole('button', { name: 'Cerrar sesión' })).toBeInTheDocument();
  });

  it('enlaza la gestion de usuarios para quien puede abrirla', () => {
    render(<HomePage />);

    expect(screen.getByRole('link', { name: /gestión de usuarios/i })).toHaveAttribute(
      'href',
      '/admin/usuarios',
    );
  });

  it('no enlaza usuarios a un OPERARIO, que no tiene ninguna accion sobre el modulo', () => {
    // Anexo A de SPEC-001: el operario no lee ni escribe usuarios. Ofrecerle el
    // enlace seria mandarlo a una pantalla que solo puede negarle el paso.
    mockAuth.user = {
      email: 'operario@pucp.edu.pe',
      fullName: 'Luis Quispe',
      role: { code: 'OPERARIO', label: 'Operario de campo' },
    };

    render(<HomePage />);

    expect(screen.queryByRole('link', { name: /gestión de usuarios/i })).not.toBeInTheDocument();
  });

  it('sin sesion no muestra el contenido: el guard lo bloquea', () => {
    mockAuth.user = null;
    render(<HomePage />);

    expect(screen.queryByText('admin@pucp.edu.pe')).not.toBeInTheDocument();
  });
});
