/**
 * Los errores del catálogo de lugares (M9) en español. El backend habla en
 * inglés técnico a propósito (SPEC-000); aquí se decide qué lee la persona.
 */

/** Un mensaje del backend que trae un dato (un nombre, un código) y su traducción con ese dato. */
export type MessagePattern = readonly [RegExp, (match: RegExpMatchArray) => string];

export const PLACE_MESSAGES: Record<string, string> = {
  'The place has no outline to locate its perspectives':
    'Este lugar todavía no tiene ubicación en el mapa. Elige su contorno o, si es un complejo, agrega primero los lugares que contiene.',
  'The drawn outline is not a valid geometry': 'El contorno marcado no es válido. Vuelve a marcarlo en el mapa.',
  'The drawn outline is not valid GeoJSON': 'El contorno marcado no es válido. Vuelve a marcarlo en el mapa.',
  'The new order must list every perspective of the place exactly once; reload and try again':
    'Las perspectivas cambiaron mientras las ordenabas. Actualiza la página e inténtalo de nuevo.',
  'Only outdoor places have perspectives; add photos to the indoor place instead':
    'Solo los lugares exteriores tienen perspectivas. A un interior agrégale fotos por vista.',
  'The place already has a perspective of that side: edit it instead':
    'Este lugar ya tiene una perspectiva de ese lado. Edítala en vez de crear otra.',
  'A photo belongs to a perspective or to an indoor view, not both': 'Una foto va en una perspectiva o en una vista interior, no en ambas.',
  'Indoor views are only for indoor places': 'Las vistas interiores son solo para lugares interiores.',
  'Delete the perspectives before turning the place into an indoor one':
    'Elimina sus perspectivas antes de convertir el lugar en interior.',
  'The place has places inside it: move or delete them first': 'Este lugar contiene otros lugares. Muévelos o elimínalos primero.',
  'A place cannot be inside one of its own places': 'Un lugar no puede estar dentro de uno de los lugares que contiene.',
  'Give one outline source: buildings, a zone, a feature, a drawing or the places inside it':
    'Elige una sola forma de ubicar el lugar: edificios, área verde, estacionamiento, un punto o sus lugares internos.',
  'An outdoor place needs an outline to be located on the map': 'Un lugar exterior necesita contorno: elígelo en el mapa.',
  'An indoor place is located by its parent and has no outline of its own':
    'Un lugar interior se ubica por el lugar donde está: no lleva contorno propio.',
  'An indoor place must be inside another place': 'Un lugar interior debe estar dentro de otro: elige «Dentro de».',
};

export const PLACE_PATTERNS: readonly MessagePattern[] = [
  [/^Places can be nested at most (\d+) levels deep$/,
    ([, levels]) => `Los lugares se anidan hasta ${levels} niveles. Elige un «Dentro de» de un nivel más arriba.`],
  [/^There is already a place named «(.+)» there$/,
    ([, name]) => `Ya existe un lugar llamado «${name}» en ese mismo nivel. Usa otro nombre o edita el existente.`],
  [/^Building \d+ already belongs to «(.+)» \((\S+)\)$/,
    ([, name, code]) => `Uno de los edificios elegidos ya pertenece a «${name}» (${code}). Quítalo de ese lugar o elige otro edificio.`],
  [/^Reference (\S+) was already migrated or discarded$/,
    ([, code]) => `La referencia ${code} ya fue decidida, quizá por otra persona. Actualiza la página.`],
  [/^Unknown perspective side: .+$/, () => 'El lado elegido para la perspectiva no es válido. Actualiza la pantalla.'],
  [/^Unknown \S+ code: .+$/, () => 'La opción elegida ya no está disponible. Actualiza la pantalla.'],
];
