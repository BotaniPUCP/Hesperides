/**
 * Estructura del sidebar. Es un dato y no JSX para que añadir una pantalla sea
 * añadir una entrada, y para que la regla de quién ve qué se pruebe sin montar
 * componentes.
 *
 * Los grupos siguen los módulos del dominio (M1 Configuración, M2 Catastro,
 * M3 Intervenciones…), no un único «Administración» que lo agrupe todo: cuando
 * lleguen el catastro o el riego, cada uno entra como su propio grupo en vez de
 * mezclar la configuración con el trabajo diario.
 *
 * Mostrar un enlace a quien no puede abrirlo es prometerle algo que el backend
 * no cumple. Por eso cada ítem declara sus roles, y la pantalla de destino sigue
 * validando por su cuenta: ocultar un enlace no es una medida de seguridad.
 */

import { INCIDENT_MEMBER_ROLES } from './incidentRoles';

export interface NavItem {
  label: string;
  href: string;
  icon: string;
  roles: readonly string[];
}

export interface NavGroup {
  id: string;
  label: string;
  icon: string;
  items: readonly NavItem[];
}

export const HOME_ITEM = { label: 'Inicio', href: '/', icon: '🏠' } as const;

/**
 * Pantallas que van sueltas bajo Inicio, para todos los roles que las ven. Un grupo
 * de NAVIGATION también se muestra suelto cuando el rol solo ve uno de sus enlaces:
 * un desplegable con un solo ítem obliga a un clic de más.
 */
export const DIRECT_LINKS: readonly NavItem[] = [
  { label: 'Incidencias', href: '/incidencias', icon: '📋', roles: INCIDENT_MEMBER_ROLES },
  // SPEC-102: los cuatro roles ven el mapa; el operario es quien más lo usa.
  { label: 'Mapa', href: '/mapa', icon: '🗺️', roles: ['ADMIN', 'COORDINADOR', 'SUPERVISOR', 'OPERARIO'] },
  // M7 - Riego: consulta para administrador y coordinador; registro para supervisor.
  { label: 'Riego', href: '/riego', icon: '💧', roles: ['ADMIN', 'COORDINADOR', 'SUPERVISOR'] },
  // M6 - SPEC-202 D-09: una sola pantalla con tres pestañas; el operario no lee reportes (Anexo A).
  { label: 'Reportes', href: '/reportes', icon: '📊', roles: ['ADMIN', 'COORDINADOR', 'SUPERVISOR'] },
];

export const NAVIGATION: readonly NavGroup[] = [
  {
    // M9. Lo consultan todos; editarlo y migrar las referencias antiguas es de quien lo administra.
    id: 'lugares',
    label: 'Lugares',
    icon: '🏛️',
    items: [
      { label: 'Catálogo de lugares', href: '/lugares', icon: '🏛️', roles: ['ADMIN', 'COORDINADOR', 'SUPERVISOR', 'OPERARIO'] },
      { label: 'Migrar referencias', href: '/lugares/migracion', icon: '🔀', roles: ['ADMIN', 'COORDINADOR'] },
    ],
  },
  {
    // Catálogo taxonómico botánico de especies del campus PUCP.
    id: 'inventario-verde',
    label: 'Catálogo botánico',
    icon: '🌿',
    items: [
      { label: 'Especies', href: '/inventario-verde', icon: '🌿', roles: ['ADMIN', 'COORDINADOR', 'SUPERVISOR', 'OPERARIO'] },
      { label: 'Registrar especie', href: '/inventario-verde/registrar', icon: '📍', roles: ['ADMIN', 'COORDINADOR', 'SUPERVISOR'] },
    ],
  },
  {
    id: 'intervenciones',
    label: 'Intervenciones',
    icon: '🧰',
    items: [
      { label: 'Intervenciones', href: '/intervenciones', icon: '📋', roles: ['ADMIN', 'COORDINADOR', 'SUPERVISOR', 'OPERARIO'] },
      // SPEC-203 D-12: planificar, armar conjuntos y fijar cada cuánto es trabajo de coordinación.
      { label: 'Planificación preventiva', href: '/intervenciones/planificacion', icon: '📅', roles: ['ADMIN', 'COORDINADOR'] },
      { label: 'Conjuntos de áreas verdes', href: '/intervenciones/conjuntos', icon: '🗺️', roles: ['ADMIN', 'COORDINADOR'] },
      { label: 'Frecuencias', href: '/intervenciones/frecuencias', icon: '🔁', roles: ['ADMIN', 'COORDINADOR'] },
    ],
  },
  {
    // M2 · SPEC-103. Registrar el campus es trabajo diario, no configuración.
    id: 'catastro',
    label: 'Catastro verde',
    icon: '🌳',
    items: [
      // Inventario georreferenciado de ejemplares botánicos censados en el campus.
      { label: 'Ejemplares', href: '/catastro/ejemplares', icon: '🌳', roles: ['ADMIN', 'COORDINADOR', 'SUPERVISOR', 'OPERARIO'] },
      // D-03: el supervisor registra por formulario (plantas, tachos, bebederos); la carga masiva es de quien coordina.
      { label: 'Registrar en el catastro', href: '/catastro/registrar', icon: '📍', roles: ['ADMIN', 'COORDINADOR', 'SUPERVISOR'] },
      { label: 'Importar al catastro', href: '/catastro/importar', icon: '📥', roles: ['ADMIN', 'COORDINADOR'] },
      { label: 'Estándares de carga', href: '/catastro/estandares', icon: '📏', roles: ['ADMIN', 'COORDINADOR', 'SUPERVISOR'] },
    ],
  },
  {
    // SPEC-106: el capataz consulta; registrar, uno a uno o por archivo, es de coordinación.
    id: 'directorio',
    label: 'Directorio',
    icon: '📇',
    items: [
      { label: 'Directorio', href: '/directorio', icon: '📇', roles: ['ADMIN', 'COORDINADOR', 'SUPERVISOR'] },
      { label: 'Registro individual', href: '/directorio/registrar', icon: '➕', roles: ['ADMIN', 'COORDINADOR'] },
      { label: 'Registro masivo', href: '/directorio/importar', icon: '📥', roles: ['ADMIN', 'COORDINADOR'] },
    ],
  },
  {
    id: 'administracion',
    label: 'Administración',
    icon: '🛠️',
    items: [
      // Anexo A de SPEC-001: el operario no lee ni escribe usuarios.
      {
        label: 'Usuarios',
        href: '/admin/usuarios',
        icon: '👥',
        roles: ['ADMIN', 'COORDINADOR', 'SUPERVISOR'],
      },
      // SPEC-003 §4: el backend responde 403 a quien no es ADMIN.
      { label: 'Catálogos', href: '/admin/catalogos', icon: '🗂️', roles: ['ADMIN'] },
      // SPEC-003 §5.6: configuración global. Quien no es ADMIN no debe ver
      // siquiera que existe, porque enseñaría qué gobierna la validación.
      { label: 'Parámetros del sistema', href: '/admin/parametros', icon: '⚙️', roles: ['ADMIN'] },
    ],
  },
];

/** Enlaces directos que el rol puede abrir. */
export function visibleDirectLinks(roleCode: string): NavItem[] {
  return DIRECT_LINKS.filter((item) => item.roles.includes(roleCode));
}

/** Grupos con solo los ítems que el rol puede abrir; los grupos vacíos se omiten. */
export function visibleNavigation(roleCode: string): NavGroup[] {
  return NAVIGATION.map((grupo) => ({
    ...grupo,
    items: grupo.items.filter((item) => item.roles.includes(roleCode)),
  })).filter((grupo) => grupo.items.length > 0);
}

/** Una ruta está activa si es el destino exacto o una subruta suya. */
export function isActivePath(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * El único enlace del menú que representa la ruta: el más específico. Varios
 * pueden coincidir, porque /inventario-verde/registrar es subruta de /inventario-verde.
 */
export function activeHref(pathname: string, hrefs: readonly string[]): string | null {
  return hrefs
    .filter((href) => isActivePath(pathname, href))
    .reduce<string | null>((best, href) => (best === null || href.length > best.length ? href : best), null);
}
