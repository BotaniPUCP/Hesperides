import { MODULE_THEMES, moduleForPath } from '../moduleThemes';

describe('moduleForPath', () => {
  it.each([
    ['/catastro/ejemplares', 'catastro'],
    ['/catastro/ejemplares/EV-000001', 'catastro'],
    ['/catastro/importar', 'catastro'],
    ['/lugares/migracion', 'lugares'],
    ['/inventario-verde', 'catalogo'],
    ['/inventario-verde/registrar', 'catalogo'],
    ['/inventario-verde/especies/roystonea-regia', 'catalogo'],
    ['/inventario-verde/ejemplares', 'catastro'],
    ['/inventario-verde/especies/roystonea-regia/ejemplares/EV-000001', 'catastro'],
    ['/riego', 'riego'],
    ['/riego/', 'riego'],
    ['/intervenciones', 'intervenciones'],
    ['/intervenciones/12/editar', 'intervenciones'],
    ['/lugares', 'lugares'],
    ['/lugares/LUG-0001', 'lugares'],
    ['/incidencias/7', 'incidencias'],
    ['/reportes', 'reportes'],
    ['/admin/usuarios', 'administracion'],
    ['/directorio', 'directorio'],
    ['/directorio/ORG-0001', 'directorio'],
    ['/directorio/contactos/CON-0001', 'directorio'],
    ['/directorio/registrar', 'directorio'],
  ])('%s pertenece al módulo %s', (path, module) => {
    expect(moduleForPath(path)).toBe(module);
  });

  it.each([['/'], ['/mapa'], ['/login'], ['/ruta-desconocida'], ['/riegos'], [''], [null]])(
    '%s no lleva fondo de módulo',
    (path) => {
      expect(moduleForPath(path)).toBeNull();
    },
  );
});

describe('MODULE_THEMES', () => {
  const HEX = /^#[0-9A-F]{6}$/;

  it.each(Object.entries(MODULE_THEMES))('%s define cuatro tonos válidos de día y de noche', (_, theme) => {
    for (const stops of [theme.day, theme.night]) {
      expect(stops).toHaveLength(4);
      stops.forEach((stop) => expect(stop).toMatch(HEX));
    }
    expect(theme.nightAccent).toMatch(/^\d{1,3}, \d{1,3}, \d{1,3}$/);
  });

  it('cada módulo tiene un color propio', () => {
    const tonos = Object.values(MODULE_THEMES).map((theme) => theme.day[0]);
    expect(new Set(tonos).size).toBe(tonos.length);
  });
});
