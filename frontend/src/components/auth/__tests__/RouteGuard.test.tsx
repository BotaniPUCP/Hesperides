import { render, screen } from '@testing-library/react';
import { RouteGuard } from '../RouteGuard';

const push = jest.fn();
let mockPathname = '/';
let mockAuth: {
  user: { fullName: string; mustChangePassword?: boolean } | null;
  isLoading: boolean;
  login: jest.Mock;
  logout: jest.Mock;
};

jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockAuth,
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace: push }),
  usePathname: () => mockPathname,
}));

describe('RouteGuard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuth = { user: null, isLoading: false, login: jest.fn(), logout: jest.fn() };
    mockPathname = '/';
  });

  it('mientras comprueba la sesion no muestra ni contenido ni redirige', () => {
    mockAuth.isLoading = true;
    render(
      <RouteGuard>
        <p>Contenido protegido</p>
      </RouteGuard>,
    );

    expect(screen.queryByText('Contenido protegido')).not.toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('sin sesion redirige a login y no muestra el contenido', () => {
    render(
      <RouteGuard>
        <p>Contenido protegido</p>
      </RouteGuard>,
    );

    expect(push).toHaveBeenCalledWith('/login');
    expect(screen.queryByText('Contenido protegido')).not.toBeInTheDocument();
  });

  it('con sesion muestra el contenido y no redirige', () => {
    mockAuth.user = { fullName: 'Ana Torres' };
    render(
      <RouteGuard>
        <p>Contenido protegido</p>
      </RouteGuard>,
    );

    expect(screen.getByText('Contenido protegido')).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it('en modo guest con sesion redirige al inicio', () => {
    mockAuth.user = { fullName: 'Ana Torres' };
    render(
      <RouteGuard mode="guest">
        <p>Formulario de login</p>
      </RouteGuard>,
    );

    expect(push).toHaveBeenCalledWith('/');
    expect(screen.queryByText('Formulario de login')).not.toBeInTheDocument();
  });

  it('en modo guest sin sesion muestra el contenido', () => {
    render(
      <RouteGuard mode="guest">
        <p>Formulario de login</p>
      </RouteGuard>,
    );

    expect(screen.getByText('Formulario de login')).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  describe('contrasena temporal', () => {
    it('con mustChangePassword lleva a /cambiar-password en vez de mostrar la pantalla', () => {
      // El backend responde 403 a cualquier endpoint mientras la clave siga
      // siendo la temporal (PasswordChangeRequiredFilter), asi que dejar pasar
      // aqui produciria una pantalla que solo sabe mostrar errores.
      mockAuth.user = { fullName: 'Ana Torres', mustChangePassword: true };

      render(
        <RouteGuard>
          <p>Contenido protegido</p>
        </RouteGuard>,
      );

      expect(push).toHaveBeenCalledWith('/cambiar-password');
      expect(screen.queryByText('Contenido protegido')).not.toBeInTheDocument();
    });

    it('no redirige si ya esta en /cambiar-password, que seria un bucle infinito', () => {
      mockAuth.user = { fullName: 'Ana Torres', mustChangePassword: true };
      mockPathname = '/cambiar-password';

      render(
        <RouteGuard>
          <p>Formulario de cambio</p>
        </RouteGuard>,
      );

      expect(push).not.toHaveBeenCalled();
      expect(screen.getByText('Formulario de cambio')).toBeInTheDocument();
    });

    it('con la contrasena ya cambiada deja ver el contenido normalmente', () => {
      mockAuth.user = { fullName: 'Ana Torres', mustChangePassword: false };

      render(
        <RouteGuard>
          <p>Contenido protegido</p>
        </RouteGuard>,
      );

      expect(push).not.toHaveBeenCalled();
      expect(screen.getByText('Contenido protegido')).toBeInTheDocument();
    });
  });
});
