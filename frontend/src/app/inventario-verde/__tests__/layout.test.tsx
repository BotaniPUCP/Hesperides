import { render, screen } from '@testing-library/react';
import InventarioVerdeLayout from '../layout';

let mockAuth: {
  user: { email: string; fullName: string; mustChangePassword: boolean; role: { code: string; label: string } } | null;
  isLoading: boolean;
  logout: jest.Mock;
};

jest.mock('@/hooks/useAuth', () => ({ useAuth: () => mockAuth }));
jest.mock('next/navigation', () => ({ usePathname: () => '/inventario-verde' }));

const admin = { email: 'a@pucp.edu.pe', fullName: 'Ana', mustChangePassword: false, role: { code: 'ADMIN', label: 'Administrador' } };

describe('Layout del inventario verde', () => {
  it('sin sesión muestra el inventario solo: es público', () => {
    mockAuth = { user: null, isLoading: false, logout: jest.fn() };
    render(<InventarioVerdeLayout><p>contenido</p></InventarioVerdeLayout>);

    expect(screen.getByText('contenido')).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Principal' })).not.toBeInTheDocument();
  });

  it('con sesión lo muestra dentro del sidebar, como el resto del sistema', () => {
    mockAuth = { user: admin, isLoading: false, logout: jest.fn() };
    render(<InventarioVerdeLayout><p>contenido</p></InventarioVerdeLayout>);

    expect(screen.getByText('contenido')).toBeInTheDocument();
    expect(screen.getAllByRole('navigation', { name: 'Principal' }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('link', { name: /Inventario verde/i })[0]).toHaveAttribute('aria-current', 'page');
  });
});
