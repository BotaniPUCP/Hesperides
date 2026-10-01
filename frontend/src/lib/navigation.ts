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

export const NAVIGATION: readonly NavGroup[] = [
  {
    id: 'mapa',
    label: 'Mapa',
    icon: '🗺️',
    items: [
      // SPEC-102: los cuatro roles ven el mapa; el operario es quien más lo usa.
      {
        label: 'Mapa del campus',
        href: '/mapa',
        icon: '🌳',
        roles: ['ADMIN', 'COORDINADOR', 'SUPERVISOR', 'OPERARIO'],
      },
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
      // SPEC-101: ADMIN y COORDINADOR configuran; SUPERVISOR y OPERARIO consultan.
      {
        label: 'Frecuencias de mantenimiento',
        href: '/admin/frecuencias',
        icon: '📅',
        roles: ['ADMIN', 'COORDINADOR', 'SUPERVISOR', 'OPERARIO'],
      },
      // SPEC-003 §5.6: configuración global. Quien no es ADMIN no debe ver
      // siquiera que existe, porque enseñaría qué gobierna la validación.
      { label: 'Parámetros del sistema', href: '/admin/parametros', icon: '⚙️', roles: ['ADMIN'] },
    ],
  },
];

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
