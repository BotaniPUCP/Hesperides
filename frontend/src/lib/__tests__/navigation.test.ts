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
  it('a un ADMIN le muestra inventario verde, catastro completo y las cuatro pantallas de administración', () => {
    expect(hrefsDe('ADMIN')).toEqual([
      '/inventario-verde',
      '/inventario-verde/registrar',
      '/intervenciones',
      '/intervenciones/planificacion',
      '/intervenciones/conjuntos',
      '/intervenciones/frecuencias',
      '/catastro/ejemplares',
      '/catastro/registrar',
      '/catastro/importar',
      '/catastro/estandares',
      '/lugares/migracion',
      '/admin/usuarios',
      '/admin/catalogos',
      '/admin/parametros',
    ]);
  });

  it('a un COORDINADOR no le muestra catálogos ni parámetros, que son solo de ADMIN', () => {
    // SPEC-003 §4 y §5.6: el backend responde 403 al resto. Mostrar el enlace
    // sería mandarlo a una pantalla que solo puede negarle el paso.
    expect(hrefsDe('COORDINADOR')).toEqual([
      '/inventario-verde',
      '/inventario-verde/registrar',
      '/intervenciones',
      '/intervenciones/planificacion',
      '/intervenciones/conjuntos',
      '/intervenciones/frecuencias',
      '/catastro/ejemplares',
      '/catastro/registrar',
      '/catastro/importar',
      '/catastro/estandares',
      '/lugares/migracion',
      '/admin/usuarios',
    ]);
  });

  it('a un SUPERVISOR le muestra el formulario del catastro pero no la carga por CSV', () => {
    // SPEC-103 D-03: el supervisor registra en campo, una planta a la vez.
    expect(hrefsDe('SUPERVISOR')).toEqual([
      '/inventario-verde',
      '/inventario-verde/registrar',
      '/intervenciones',
      '/catastro/ejemplares',
      '/catastro/registrar',
      '/catastro/estandares',
      '/admin/usuarios',
    ]);
  });

  it('a un OPERARIO le muestra especies, intervenciones y ejemplares; las frecuencias son de coordinación (SPEC-203 D-12)', () => {
    expect(hrefsDe('OPERARIO')).toEqual([
      '/inventario-verde',
      '/intervenciones',
      '/catastro/ejemplares',
    ]);
  });

  it('el mapa y los lugares son enlaces directos para los cuatro roles; incidencias, riego y reportes, para quien los opera', () => {
    expect(visibleDirectLinks('ADMIN').map((l) => l.href)).toEqual(['/mapa', '/lugares', '/riego', '/reportes']);
    for (const rol of ['COORDINADOR', 'SUPERVISOR']) {
      expect(visibleDirectLinks(rol).map((l) => l.href)).toEqual(['/incidencias', '/mapa', '/lugares', '/riego', '/reportes']);
    }
    expect(visibleDirectLinks('OPERARIO').map((l) => l.href)).toEqual(['/mapa', '/lugares']);
    expect(visibleNavigation('ADMIN').map((g) => g.label)).toEqual([
      'Catálogo botánico',
      'Intervenciones',
      'Catastro verde',
      'Administración',
    ]);
  });

  it('solo coordinación y capataces ven el acceso directo a incidencias', () => {
    for (const role of ['COORDINADOR', 'SUPERVISOR']) {
      expect(visibleDirectLinks(role).some((item) => item.href === '/incidencias')).toBe(true);
    }
    for (const role of ['ADMIN', 'OPERARIO', 'DESCONOCIDO']) {
      expect(visibleDirectLinks(role).some((item) => item.href === '/incidencias')).toBe(false);
    }
  });

  it('Reportes es un enlace directo, no un grupo, y el operario no lo ve (SPEC-202 CA-G03, CA-G04)', () => {
    for (const role of ['ADMIN', 'COORDINADOR', 'SUPERVISOR']) {
      expect(visibleDirectLinks(role).filter((item) => item.href === '/reportes').map((item) => item.label))
        .toEqual(['Reportes']);
    }
    expect(visibleDirectLinks('OPERARIO').some((item) => item.href === '/reportes')).toBe(false);
    expect(NAVIGATION.some((group) => group.items.some((item) => item.href === '/reportes'))).toBe(false);
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
