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

  it('enlaza el mapa directamente, sin un desplegable de un solo ítem', () => {
    render(<Sidebar />);

    expect(screen.getByRole('link', { name: /mapa/i })).toHaveAttribute('href', '/mapa');
    expect(screen.queryByRole('button', { name: /mapa/i })).not.toBeInTheDocument();
  });

  it('marca el mapa como página activa', () => {
    mockPathname = '/mapa';
    render(<Sidebar />);

    expect(screen.getByRole('link', { name: /mapa/i })).toHaveAttribute('aria-current', 'page');
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

  it('en Registrar especie marca solo ese enlace, no también Especies', () => {
    mockPathname = '/inventario-verde/registrar';
    render(<Sidebar />);

    expect(screen.getByRole('link', { name: 'Registrar especie' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Especies' })).not.toHaveAttribute('aria-current');
  });

  it('en la ficha de una especie, sin enlace propio, marca Especies', () => {
    mockPathname = '/inventario-verde/especies/roystonea-regia';
    render(<Sidebar />);

    expect(screen.getByRole('link', { name: 'Especies' })).toHaveAttribute('aria-current', 'page');
  });

  it('Migrar referencias vive en Lugares: lo abre, marca solo ese enlace y no abre Catastro verde', () => {
    mockPathname = '/lugares/migracion';
    render(<Sidebar />);

    expect(screen.getByRole('button', { name: 'Lugares' })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('link', { name: 'Migrar referencias' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Catálogo de lugares' })).not.toHaveAttribute('aria-current');
    expect(screen.getByRole('button', { name: /catastro verde/i })).toHaveAttribute('aria-expanded', 'false');
  });

  it('Importar lugares es un submódulo de Lugares para administración y coordinación', () => {
    mockPathname = '/lugares/importar';
    const { rerender } = render(<Sidebar />);

    expect(screen.getByRole('button', { name: /lugares/i })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('link', { name: 'Importar lugares' })).toHaveAttribute('href', '/lugares/importar');
    expect(screen.getByRole('link', { name: 'Importar lugares' })).toHaveAttribute('aria-current', 'page');

    comoRol('SUPERVISOR', 'Supervisor');
    rerender(<Sidebar />);
    expect(screen.queryByRole('link', { name: 'Importar lugares' })).not.toBeInTheDocument();
  });

  it('Nuevo lugar es un submódulo de Lugares para administración y coordinación', () => {
    mockPathname = '/lugares/nuevo';
    const { rerender } = render(<Sidebar />);

    expect(screen.getByRole('button', { name: 'Lugares' })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('link', { name: 'Nuevo lugar' })).toHaveAttribute('href', '/lugares/nuevo');
    expect(screen.getByRole('link', { name: 'Nuevo lugar' })).toHaveAttribute('aria-current', 'page');

    comoRol('SUPERVISOR', 'Supervisor');
    rerender(<Sidebar />);
    expect(screen.queryByRole('link', { name: 'Nuevo lugar' })).not.toBeInTheDocument();
  });

  it('Exportar lugares es un submódulo de Lugares para administración y coordinación', () => {
    mockPathname = '/lugares/exportar';
    const { rerender } = render(<Sidebar />);

    expect(screen.getByRole('button', { name: 'Lugares' })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('link', { name: 'Exportar lugares' })).toHaveAttribute('href', '/lugares/exportar');
    expect(screen.getByRole('link', { name: 'Exportar lugares' })).toHaveAttribute('aria-current', 'page');

    comoRol('SUPERVISOR', 'Supervisor');
    rerender(<Sidebar />);
    expect(screen.queryByRole('link', { name: 'Exportar lugares' })).not.toBeInTheDocument();
  });

  describe('al pasar a otra pantalla por un enlace interno, sin recargar', () => {
    it('abre el grupo de destino para que se vea la página actual, y cierra el de origen', () => {
      mockPathname = '/catastro/ejemplares';
      const { rerender } = render(<Sidebar />);
      expect(screen.getByRole('button', { name: /catastro verde/i })).toHaveAttribute('aria-expanded', 'true');

      mockPathname = '/admin/usuarios';
      rerender(<Sidebar />);

      expect(screen.getByRole('button', { name: /administración/i })).toHaveAttribute('aria-expanded', 'true');
      expect(screen.getByRole('link', { name: 'Usuarios' })).toHaveAttribute('aria-current', 'page');
      expect(screen.getByRole('button', { name: /catastro verde/i })).toHaveAttribute('aria-expanded', 'false');
    });

    it('moverse dentro del mismo grupo no lo cierra aunque cambie la página', () => {
      mockPathname = '/catastro/ejemplares';
      const { rerender } = render(<Sidebar />);

      mockPathname = '/catastro/importar';
      rerender(<Sidebar />);

      expect(screen.getByRole('button', { name: /catastro verde/i })).toHaveAttribute('aria-expanded', 'true');
      expect(screen.getByRole('link', { name: 'Importar al catastro' })).toHaveAttribute('aria-current', 'page');
    });

    it('respeta un grupo ajeno que la persona abrió a mano', async () => {
      mockPathname = '/catastro/ejemplares';
      const { rerender } = render(<Sidebar />);
      await userEvent.click(screen.getByRole('button', { name: /administración/i }));

      mockPathname = '/catastro/importar';
      rerender(<Sidebar />);

      expect(screen.getByRole('button', { name: /administración/i })).toHaveAttribute('aria-expanded', 'true');
    });

    it('si la persona cerró el grupo actual, navegar dentro de él no lo reabre', async () => {
      mockPathname = '/catastro/ejemplares';
      const { rerender } = render(<Sidebar />);
      await userEvent.click(screen.getByRole('button', { name: /catastro verde/i }));

      mockPathname = '/catastro/importar';
      rerender(<Sidebar />);

      expect(screen.getByRole('button', { name: /catastro verde/i })).toHaveAttribute('aria-expanded', 'false');
    });
  });

  it('en la ficha de un lugar abre Lugares y marca el catálogo', () => {
    mockPathname = '/lugares/LUG-0001';
    render(<Sidebar />);

    expect(screen.getByRole('button', { name: 'Lugares' })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('link', { name: 'Catálogo de lugares' })).toHaveAttribute('aria-current', 'page');
  });

  it.each([['SUPERVISOR', 'Supervisor'], ['OPERARIO', 'Operario']])(
    'a %s, que no migra, el catálogo de lugares le queda como enlace directo y sin clic de más',
    (code, label) => {
      comoRol(code, label);
      mockPathname = '/lugares/LUG-0001';
      render(<Sidebar />);

      expect(screen.getByRole('link', { name: 'Catálogo de lugares' })).toHaveAttribute('aria-current', 'page');
      expect(screen.queryByRole('button', { name: 'Lugares' })).not.toBeInTheDocument();
      expect(screen.queryByRole('link', { name: 'Migrar referencias' })).not.toBeInTheDocument();
    },
  );

  describe('un grupo con un solo enlace visible no es un desplegable', () => {
    it('Intervenciones es enlace directo para todos', () => {
      mockPathname = '/intervenciones/10';
      render(<Sidebar />);

      expect(screen.getByRole('link', { name: 'Intervenciones' })).toHaveAttribute('aria-current', 'page');
      expect(screen.queryByRole('button', { name: /intervenciones/i })).not.toBeInTheDocument();
    });

    it('al OPERARIO no le queda ningún desplegable: ve directo las pantallas que consulta', () => {
      comoRol('OPERARIO', 'Operario de campo');
      render(<Sidebar />);

      const nav = screen.getByRole('navigation', { name: /principal/i });
      expect(within(nav).queryAllByRole('button')).toHaveLength(0);
      for (const nombre of ['Catálogo de lugares', 'Especies', 'Intervenciones', 'Ejemplares', 'Frecuencias de mantenimiento']) {
        expect(within(nav).getByRole('link', { name: nombre })).toBeInTheDocument();
      }
    });

    it('al SUPERVISOR solo le quedan directos los de un enlace; el resto sigue desplegable', () => {
      comoRol('SUPERVISOR', 'Supervisor');
      render(<Sidebar />);

      expect(screen.getByRole('link', { name: 'Catálogo de lugares' })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Intervenciones' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /administración/i })).toBeInTheDocument();
      expect(screen.queryByRole('link', { name: 'Usuarios' })).not.toBeInTheDocument();
    });

    it('a ADMIN, Lugares sigue siendo desplegable porque tiene dos enlaces', () => {
      render(<Sidebar />);

      expect(screen.getByRole('button', { name: 'Lugares' })).toBeInTheDocument();
    });

    it('un enlace directo avisa al navegar, para cerrar el panel móvil', async () => {
      const onNavigate = jest.fn();
      render(<Sidebar onNavigate={onNavigate} />);
      const link = screen.getByRole('link', { name: 'Intervenciones' });
      link.addEventListener('click', (event) => event.preventDefault());

      await userEvent.click(link);

      expect(onNavigate).toHaveBeenCalled();
    });
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

  it('esconde las preferencias tras el engrane y ahí ofrece el modo oscuro', async () => {
    render(<Sidebar />);
    const engrane = screen.getByRole('button', { name: 'Preferencias' });

    expect(engrane).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('radio', { name: /oscuro/i })).not.toBeInTheDocument();

    await userEvent.click(engrane);
    expect(engrane).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('radio', { name: /oscuro/i })).toBeInTheDocument();

    await userEvent.click(engrane);
    expect(screen.queryByRole('radio', { name: /oscuro/i })).not.toBeInTheDocument();
  });

  it('avisa al navegar, para que el panel móvil pueda cerrarse', async () => {
    const onNavigate = jest.fn();
    render(<Sidebar onNavigate={onNavigate} />);

    await userEvent.click(screen.getByRole('link', { name: /inicio/i }));
    expect(onNavigate).toHaveBeenCalledTimes(1);
  });
});
