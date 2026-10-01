/**
 * Un elemento del mapa: la capa a la que pertenece y su posición en ella. Lo
 * comparten la escena 3D (qué se pinta como seleccionado), el buscador (a dónde
 * llevar la cámara) y la ficha (qué mostrar).
 */

export type PolyLayerId =
  | 'campusBuildings'
  | 'contextBuildings'
  | 'greenAreas'
  | 'xerophytic'
  | 'reserve'
  | 'supervision'
  | 'parking'
  | 'sidewalks';

export type PointLayerId = 'bins' | 'gates' | 'fauna' | 'references';

export type LayerId = PolyLayerId | PointLayerId;

export interface Target {
  layer: LayerId;
  index: number;
}

export const sameTarget = (a: Target | null, b: Target | null): boolean =>
  a !== null && b !== null && a.layer === b.layer && a.index === b.index;
