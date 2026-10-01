import { render, screen } from '@testing-library/react';
import HomePage from '../page';

let mockAuth: {
  user: { email: string; fullName: string; role: { code: string; label: string } } | null;
};

jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockAuth,
}));

describe('HomePage', () => {
  beforeEach(() => {
    mockAuth = {
      user: {
        email: 'admin@pucp.edu.pe',
        fullName: 'Administrador Hesperides',
        role: { code: 'ADMIN', label: 'Administrador' },
      },
    };
  });

  it('saluda a la persona con sesion iniciada', () => {
    render(<HomePage />);

    expect(screen.getByText(/Administrador Hesperides/)).toBeInTheDocument();
    expect(screen.getByText('admin@pucp.edu.pe')).toBeInTheDocument();
  });

  it('ya no lista enlaces a los módulos: la navegación vive en el sidebar', () => {
    // Dos listas de navegación divergen: la del sidebar es la única fuente.
    render(<HomePage />);

    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});
