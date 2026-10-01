import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Sidebar } from '../Sidebar';

const logout = jest.fn();
let mockPathname = '/';
let mockAuth: {
  user: { email: string; fullName: string; role: { code: string; label: string } } | null;
  logout: jest.Mock;
};

jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockAuth,
}));

jest.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
}));

function comoRol(code: string, label: string) {
  mockAuth.user = { email: 'x@pucp.edu.pe', fullName: 'Persona Prueba', role: { code, label } };
}

describe('Sidebar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPathname = '/';
    mockAuth = { user: null, logout };
    comoRol('ADMIN', 'Administrador');
  });

  it('enlaza siempre el inicio', () => {
    render(<Sidebar />);

    expect(screen.getByRole('link', { name: /inicio/i })).toHaveAttribute('href', '/');
  });

  it('muestra el grupo Administración como un desplegable, cerrado fuera de sus rutas', () => {
    render(<Sidebar />);

    const grupo = screen.getByRole('button', { name: /administración/i });
    expect(grupo).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('link', { name: /usuarios/i })).not.toBeInTheDocument();
  });

  it('despliega y repliega el grupo al pulsarlo', async () => {
    render(<Sidebar />);
    const grupo = screen.getByRole('button', { name: /administración/i });

    await userEvent.click(grupo);
    expect(grupo).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('link', { name: /usuarios/i })).toHaveAttribute('href', '/admin/usuarios');

    await userEvent.click(grupo);
    expect(grupo).toHaveAttribute('aria-expanded', 'false');
  });

  it('abre solo el grupo que contiene la página activa y la marca', () => {
    mockPathname = '/admin/catalogos';
    render(<Sidebar />);

    expect(screen.getByRole('button', { name: /administración/i })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    expect(screen.getByRole('link', { name: /catálogos/i })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: /usuarios/i })).not.toHaveAttribute('aria-current');
  });

  it('enlaza catálogos, que antes no tenía ningún acceso desde la aplicación', () => {
    mockPathname = '/admin/usuarios';
    render(<Sidebar />);

    expect(screen.getByRole('link', { name: /catálogos/i })).toHaveAttribute('href', '/admin/catalogos');
  });

  it('a un OPERARIO no le muestra usuarios, catálogos ni parámetros', () => {
    comoRol('OPERARIO', 'Operario de campo');
    mockPathname = '/admin/frecuencias';
    render(<Sidebar />);

    const nav = screen.getByRole('navigation', { name: /principal/i });
    expect(within(nav).getByRole('link', { name: /frecuencias/i })).toBeInTheDocument();
    expect(within(nav).queryByRole('link', { name: /usuarios/i })).not.toBeInTheDocument();
    expect(within(nav).queryByRole('link', { name: /catálogos/i })).not.toBeInTheDocument();
    expect(within(nav).queryByRole('link', { name: /parámetros/i })).not.toBeInTheDocument();
  });

  it('muestra quién tiene la sesión y permite cerrarla', async () => {
    render(<Sidebar />);

    expect(screen.getByText('Persona Prueba')).toBeInTheDocument();
    expect(screen.getByText('Administrador')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }));
    expect(logout).toHaveBeenCalledTimes(1);
  });

  it('avisa al navegar, para que el panel móvil pueda cerrarse', async () => {
    const onNavigate = jest.fn();
    render(<Sidebar onNavigate={onNavigate} />);

    await userEvent.click(screen.getByRole('link', { name: /inicio/i }));
    expect(onNavigate).toHaveBeenCalledTimes(1);
  });
});
