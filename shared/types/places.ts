/**
 * Catálogo de lugares: edificios, jardines, estacionamientos y complejos, con
 * perspectivas fotografiadas desde sus alrededores (/api/v1/places).
 */

export interface CodeLabel {
  code: string;
  label: string;
}

export interface PlaceRef {
  code: string;
  name: string;
}

export type PlaceKindCode = 'OUTDOOR' | 'INDOOR';
export type PerspectiveSideCode = 'FRONT' | 'BACK' | 'SIDE';

/** Una tarjeta del catálogo. */
export interface PlaceSummary {
  code: string;
  name: string;
  parent: PlaceRef | null;
  kind: CodeLabel;
  category: CodeLabel;
  mainPhotoUrl: string | null;
  perspectiveCount: number;
  hasFront: boolean;
  hasBack: boolean;
}

/** De dónde sale el contorno. INHERITED: un interior, ubicado por su padre. */
export interface PlaceOutline {
  source: 'BUILDING' | 'ZONE' | 'FEATURE' | 'DRAWN' | 'INHERITED';
  buildingId: number | null;
  zoneCode: string | null;
  featureCode: string | null;
  centerLat: number | null;
  centerLon: number | null;
}

export interface PlacePhoto {
  id: number;
  thumbnailUrl: string;
  fullUrl: string;
  author: string | null;
  takenOn: string | null;
}

export interface PlacePerspective {
  id: number;
  side: CodeLabel;
  /** El nombre estándar que arma el sistema: «Al lado de CIA · oeste, hacia Gelarti». */
  displayName: string;
  compass: string | null;
  landmark: PlaceRef | null;
  lat: number;
  lon: number;
  /** Hacia dónde miran las fotos: 0 al norte, creciendo hacia el este. */
  headingDeg: number;
  photos: PlacePhoto[];
}

export interface InteriorGroup {
  view: CodeLabel;
  photos: PlacePhoto[];
}

export interface PlaceDetail {
  code: string;
  name: string;
  parent: PlaceRef | null;
  kind: CodeLabel;
  category: CodeLabel;
  outline: PlaceOutline;
  aliases: string[];
  children: PlaceRef[];
  mainPhotos: PlacePhoto[];
  perspectives: PlacePerspective[];
  interior: InteriorGroup[];
}
