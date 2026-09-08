import { render, screen } from '@testing-library/react';
import HomePage from '../page';

const logout = jest.fn();
let mockAuth: {
  user: { email: string; fullName: string; role: { label: string } } | null;
  isLoading: boolean;
  login: jest.Mock;
  logout: jest.Mock;
};

jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockAuth,
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
}));

describe('HomePage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuth = {
      user: {
        email: 'admin@pucp.edu.pe',
        fullName: 'Administrador Hesperides',
        role: { label: 'Administrador' },
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

  it('sin sesion no muestra el contenido: el guard lo bloquea', () => {
    mockAuth.user = null;
    render(<HomePage />);

    expect(screen.queryByText('admin@pucp.edu.pe')).not.toBeInTheDocument();
  });
});
