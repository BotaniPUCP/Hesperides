/**
 * Los códigos de bebedero en palabras: las etiquetas de FOUNTAIN_KIND y
 * FOUNTAIN_STATUS (V015). Un código que no está aquí se muestra tal cual,
 * para que un dato nuevo se vea y no desaparezca.
 */
const KIND: Record<string, string> = {
  FOUNTAIN: 'Fuente',
  BOTTLE_FILLER: 'Llenador de botella',
  UNKNOWN: 'Sin dato',
};

const STATUS: Record<string, string> = {
  OPERATIONAL: 'Operativo',
  NEW: 'Nuevo',
  REMODELING: 'En remodelación',
  DETERIORATED: 'En deterioro',
  DECOMMISSIONED: 'De baja',
};

const label = (dict: Record<string, string>, code: unknown) => (typeof code === 'string' ? (dict[code] ?? code) : null);

export const fountainKind = (code: unknown) => label(KIND, code);
export const fountainStatus = (code: unknown) => label(STATUS, code);
