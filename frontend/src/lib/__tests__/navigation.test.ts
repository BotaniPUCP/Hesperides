import { NAVIGATION, isActivePath, visibleDirectLinks, visibleNavigation } from '../navigation';

describe('isActivePath', () => {
  it('marca activa la ruta exacta', () => {
    expect(isActivePath('/admin/usuarios', '/admin/usuarios')).toBe(true);
  });

  it('marca activa una subruta del destino', () => {
    expect(isActivePath('/admin/usuarios/42', '/admin/usuarios')).toBe(true);
  });

  it('no confunde un prefijo de texto con una subruta', () => {
    expect(isActivePath('/admin/usuarios-archivados', '/admin/usuarios')).toBe(false);
  });

  it('el inicio solo está activo en la raíz, no en todas las rutas', () => {
    // Toda ruta empieza por «/»: sin este caso, Inicio quedaría marcado siempre.
    expect(isActivePath('/', '/')).toBe(true);
    expect(isActivePath('/admin/usuarios', '/')).toBe(false);
  });
});

function hrefsDe(rol: string): string[] {
  return visibleNavigation(rol).flatMap((grupo) => grupo.items.map((item) => item.href));
}

describe('visibleNavigation', () => {
  it('a un ADMIN le muestra el catastro completo y las cuatro pantallas de administración', () => {
    expect(hrefsDe('ADMIN')).toEqual([
      '/catastro/registrar',
      '/catastro/importar',
      '/catastro/estandares',
      '/admin/usuarios',
      '/admin/catalogos',
      '/admin/frecuencias',
      '/admin/parametros',
    ]);
  });

  it('a un COORDINADOR no le muestra catálogos ni parámetros, que son solo de ADMIN', () => {
    // SPEC-003 §4 y §5.6: el backend responde 403 al resto. Mostrar el enlace
    // sería mandarlo a una pantalla que solo puede negarle el paso.
    expect(hrefsDe('COORDINADOR')).toEqual([
      '/catastro/registrar',
      '/catastro/importar',
      '/catastro/estandares',
      '/admin/usuarios',
      '/admin/frecuencias',
    ]);
  });

  it('a un SUPERVISOR le muestra el formulario del catastro pero no la carga por CSV', () => {
    // SPEC-103 D-03: el supervisor registra en campo, una planta a la vez.
    expect(hrefsDe('SUPERVISOR')).toEqual([
      '/catastro/registrar',
      '/catastro/estandares',
      '/admin/usuarios',
      '/admin/frecuencias',
    ]);
  });

  it('a un OPERARIO le muestra frecuencias, que puede consultar', () => {
    expect(hrefsDe('OPERARIO')).toEqual(['/admin/frecuencias']);
  });

  it('el mapa, el inventario verde y los lugares son enlaces directos para los cuatro roles, no grupos', () => {
    for (const rol of ['ADMIN', 'COORDINADOR', 'SUPERVISOR', 'OPERARIO']) {
      expect(visibleDirectLinks(rol).map((l) => l.href)).toEqual(['/mapa', '/inventario-verde', '/lugares']);
    }
    expect(visibleNavigation('ADMIN').map((g) => g.label)).toEqual(['Catastro', 'Administración']);
  });

  it('un rol desconocido no ve enlaces directos', () => {
    expect(visibleDirectLinks('DESCONOCIDO')).toEqual([]);
  });

  it('omite un grupo cuando el rol no puede ver ninguno de sus ítems', () => {
    // Un rol desconocido no ve nada: el grupo vacío no debe aparecer como una
    // cabecera desplegable que no despliega nada.
    expect(visibleNavigation('ROL_INEXISTENTE')).toEqual([]);
  });

  it('no altera la configuración original al filtrar', () => {
    const totalAntes = NAVIGATION.flatMap((grupo) => grupo.items).length;
    visibleNavigation('OPERARIO');
    expect(NAVIGATION.flatMap((grupo) => grupo.items)).toHaveLength(totalAntes);
  });
});
