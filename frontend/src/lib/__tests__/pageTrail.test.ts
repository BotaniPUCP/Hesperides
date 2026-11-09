import { buildPageTrail } from '../pageTrail';

const labels = (pathname: string, options = {}) => buildPageTrail(pathname, { withHome: true, ...options }).map((i) => i.label);

describe('buildPageTrail', () => {
  it('en Inicio solo muestra Inicio', () => {
    expect(buildPageTrail('/', { withHome: true })).toEqual([{ label: 'Inicio' }]);
  });

  it('una pantalla suelta del menú cuelga de Inicio', () => {
    expect(buildPageTrail('/riego', { withHome: true })).toEqual([{ label: 'Inicio', href: '/' }, { label: 'Riego' }]);
  });

  it('una pantalla de un grupo muestra el grupo, sin enlace porque no es una página', () => {
    expect(buildPageTrail('/admin/usuarios', { withHome: true })).toEqual([
      { label: 'Inicio', href: '/' },
      { label: 'Administración' },
      { label: 'Usuarios' },
    ]);
  });

  it('elige el enlace más específico del menú', () => {
    expect(labels('/inventario-verde/registrar')).toEqual(['Inicio', 'Catálogo botánico', 'Registrar especie']);
  });

  it('no repite el nombre cuando el grupo se llama igual que su pantalla', () => {
    expect(labels('/intervenciones')).toEqual(['Inicio', 'Intervenciones']);
  });

  it('una subruta enlaza a su pantalla y termina en el código', () => {
    expect(buildPageTrail('/catastro/ejemplares/EV-000001', { withHome: true })).toEqual([
      { label: 'Inicio', href: '/' },
      { label: 'Catastro verde' },
      { label: 'Ejemplares', href: '/catastro/ejemplares' },
      { label: 'EV-000001' },
    ]);
  });

  it.each([
    ['/incidencias/nueva', 'Informar'],
    ['/intervenciones/nueva', 'Nueva intervención'],
    ['/lugares/nuevo', 'Nuevo lugar'],
  ])('%s tiene un nombre propio y no el segmento de la URL', (ruta, nombre) => {
    expect(labels(ruta).at(-1)).toBe(nombre);
  });

  it('editar enlaza de vuelta a la ficha', () => {
    expect(buildPageTrail('/lugares/LUG-1/editar', { withHome: true }).slice(-2)).toEqual([
      { label: 'LUG-1', href: '/lugares/LUG-1' },
      { label: 'Editar' },
    ]);
  });

  it('salta los segmentos de la URL que no son una página', () => {
    expect(buildPageTrail('/inventario-verde/especies/molle/ejemplares/EV-1', { withHome: true }).slice(-3)).toEqual([
      { label: 'Especies', href: '/inventario-verde' },
      { label: 'molle', href: '/inventario-verde/especies/molle' },
      { label: 'EV-1' },
    ]);
  });

  it('la pantalla puede dar el nombre real de un segmento', () => {
    expect(labels('/intervenciones/13/editar', { labels: { 13: 'INT-000013' } })).toEqual([
      'Inicio', 'Intervenciones', 'INT-000013', 'Editar',
    ]);
  });

  it('la pantalla puede intercalar padres antes de la ficha', () => {
    const trail = buildPageTrail('/lugares/LUG-2', {
      withHome: true,
      labels: { 'LUG-2': 'Jardín' },
      parents: [{ label: 'Campus', href: '/lugares/LUG-1' }],
    });

    expect(trail.slice(-3)).toEqual([
      { label: 'Catálogo de lugares', href: '/lugares' },
      { label: 'Campus', href: '/lugares/LUG-1' },
      { label: 'Jardín' },
    ]);
  });

  it('sin sesión no ofrece Inicio, que llevaría al login', () => {
    expect(labels('/inventario-verde', { withHome: false })).toEqual(['Catálogo botánico', 'Especies']);
  });

  it('una ruta que no está en el menú sigue teniendo ruta', () => {
    expect(labels('/algo/raro')).toEqual(['Inicio', 'algo', 'raro']);
  });
});
