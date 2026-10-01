import { render, screen } from '@testing-library/react';
import AppLayout from '../layout';

let mockAuth: {
  user: {
    email: string;
    fullName: string;
    mustChangePassword: boolean;
    role: { code: string; label: string };
  } | null;
  isLoading: boolean;
  logout: jest.Mock;
};

jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockAuth,
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  usePathname: () => '/',
}));

describe('Layout de las pantallas con sesión', () => {
  beforeEach(() => {
    mockAuth = {
      user: {
        email: 'admin@pucp.edu.pe',
        fullName: 'Administrador Hesperides',
        mustChangePassword: false,
        role: { code: 'ADMIN', label: 'Administrador' },
      },
      isLoading: false,
      logout: jest.fn(),
    };
  });

  it('envuelve la página con el sidebar', () => {
    render(
      <AppLayout>
        <p>pantalla</p>
      </AppLayout>,
    );

    expect(screen.getByText('pantalla')).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: /principal/i })).toBeInTheDocument();
  });

  it('sin sesión no muestra ni la página ni el sidebar: el guard lo bloquea', () => {
    mockAuth.user = null;
    render(
      <AppLayout>
        <p>pantalla</p>
      </AppLayout>,
    );

    expect(screen.queryByText('pantalla')).not.toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: /principal/i })).not.toBeInTheDocument();
  });
});
