import { NAVIGATION, isActivePath, visibleNavigation } from '../navigation';

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
  it('a un ADMIN le muestra las cuatro pantallas de administración', () => {
    expect(hrefsDe('ADMIN')).toEqual([
      '/admin/usuarios',
      '/admin/catalogos',
      '/admin/frecuencias',
      '/admin/parametros',
    ]);
  });

  it('a un COORDINADOR no le muestra catálogos ni parámetros, que son solo de ADMIN', () => {
    // SPEC-003 §4 y §5.6: el backend responde 403 al resto. Mostrar el enlace
    // sería mandarlo a una pantalla que solo puede negarle el paso.
    expect(hrefsDe('COORDINADOR')).toEqual(['/admin/usuarios', '/admin/frecuencias']);
  });

  it('a un SUPERVISOR le muestra usuarios (su cuadrilla) y frecuencias', () => {
    expect(hrefsDe('SUPERVISOR')).toEqual(['/admin/usuarios', '/admin/frecuencias']);
  });

  it('a un OPERARIO solo le muestra frecuencias, que puede consultar', () => {
    expect(hrefsDe('OPERARIO')).toEqual(['/admin/frecuencias']);
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
