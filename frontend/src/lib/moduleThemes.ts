/**
 * Color de fondo de cada módulo (SPEC-C01 §3.1). Vive aquí y no en Tailwind
 * porque lo pinta un canvas, que necesita los valores y no una clase.
 *
 * Solo tiñe el fondo: botones, enlaces y badges conservan sus tokens. Rojo y
 * ámbar quedan fuera a propósito, porque ya significan «crítico» y «advertencia».
 */
export type ModuleId =
  | 'catastro'
  | 'catalogo'
  | 'riego'
  | 'intervenciones'
  | 'lugares'
  | 'incidencias'
  | 'reportes'
  | 'administracion';

export interface ModuleTheme {
  /** Del tono más intenso, arriba, al más claro, abajo. */
  day: readonly [string, string, string, string];
  /** Del cielo más oscuro, arriba, al más claro, abajo. */
  night: readonly [string, string, string, string];
  /** Componentes RGB de la trama nocturna. */
  nightAccent: string;
}

export const MODULE_THEMES: Readonly<Record<ModuleId, ModuleTheme>> = {
  catastro: {
    day: ['#0D7344', '#10B981', '#6EE7B7', '#F0FDF4'],
    night: ['#020B05', '#05180D', '#0A2817', '#123C24'],
    nightAccent: '52, 211, 153',
  },
  catalogo: {
    day: ['#4D6B12', '#84A41A', '#C5DB6A', '#F7FEE7'],
    night: ['#0A0D02', '#181F06', '#28330C', '#3A4A12'],
    nightAccent: '163, 230, 53',
  },
  riego: {
    day: ['#0B5F8A', '#0EA5E9', '#7DD3FC', '#F0F9FF'],
    night: ['#020810', '#061726', '#0A2A42', '#103C5C'],
    nightAccent: '56, 189, 248',
  },
  intervenciones: {
    day: ['#0F6E6E', '#14B8A6', '#7DE3D4', '#F0FDFA'],
    night: ['#020B0B', '#051A1A', '#0A2C2B', '#103E3C'],
    nightAccent: '45, 212, 191',
  },
  lugares: {
    day: ['#8A3F1F', '#C4673A', '#EDB08C', '#FEF6F0'],
    night: ['#0E0603', '#211008', '#36190C', '#4A2411'],
    nightAccent: '234, 138, 92',
  },
  incidencias: {
    day: ['#6B2463', '#A8448F', '#DDA6D0', '#FCF4FA'],
    night: ['#0C030B', '#1F0A1C', '#34112F', '#491A43'],
    nightAccent: '224, 130, 200',
  },
  reportes: {
    day: ['#2F3A8F', '#4F5FD9', '#A5B0F5', '#F2F4FF'],
    night: ['#04050F', '#0C0F28', '#161B44', '#20285F'],
    nightAccent: '129, 140, 248',
  },
  administracion: {
    day: ['#334155', '#64748B', '#B4BFCC', '#F8FAFC'],
    night: ['#05070B', '#0F141C', '#1B2330', '#283446'],
    nightAccent: '148, 163, 184',
  },
};

/**
 * Gana la primera que coincide, así que lo específico va antes. Un ejemplar del
 * catálogo público es catastro.
 */
const MODULE_ROUTES: readonly (readonly [RegExp, ModuleId])[] = [
  [/^\/inventario-verde\/especies\/[^/]+\/ejemplares(\/|$)/, 'catastro'],
  [/^\/inventario-verde\/ejemplares(\/|$)/, 'catastro'],
  [/^\/inventario-verde(\/|$)/, 'catalogo'],
  [/^\/catastro(\/|$)/, 'catastro'],
  [/^\/lugares(\/|$)/, 'lugares'],
  [/^\/intervenciones(\/|$)/, 'intervenciones'],
  [/^\/incidencias(\/|$)/, 'incidencias'],
  [/^\/riego(\/|$)/, 'riego'],
  [/^\/reportes(\/|$)/, 'reportes'],
  [/^\/admin(\/|$)/, 'administracion'],
];

/** Inicio y el mapa no tienen fondo de módulo: el mapa ya pinta su propio cielo. */
export function moduleForPath(pathname: string | null): ModuleId | null {
  if (!pathname) return null;
  const route = MODULE_ROUTES.find(([pattern]) => pattern.test(pathname));
  return route ? route[1] : null;
}
