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

/** De dónde sale el contorno al guardar: uno solo, o ninguno para un interior. */
export interface OutlineInput {
  buildingId?: number | null;
  zoneCode?: string | null;
  featureCode?: string | null;
  /** GeoJSON de un punto marcado a mano, cuando el lugar no está en el mapa. */
  geometry?: { type: 'Point'; coordinates: [number, number] } | null;
}

export interface PlaceInput {
  name: string;
  kindCode: PlaceKindCode;
  categoryCode: string;
  parentCode: string | null;
  outline: OutlineInput;
  aliases: string[];
}

export interface PerspectiveInput {
  sideCode: PerspectiveSideCode;
  lat: number;
  lon: number;
  headingDeg: number;
}

/** A qué va una foto: a una perspectiva, a una vista interior, o a ninguna (principal). */
export interface PhotoInput {
  perspectiveId?: number;
  interiorViewCode?: string;
  author?: string;
  takenOn?: string;
}

/** Un lugar sugerido para una referencia antigua; más puntaje, más probable. */
export interface PlaceSuggestion {
  place: PlaceRef;
  score: number;
}

/** Referencias pendientes con el mismo nombre, que se deciden juntas. */
export interface ReferenceQueueGroup {
  name: string;
  category: string;
  referenceCodes: string[];
  lat: number;
  lon: number;
  /** El lado que nombra el texto («espalda de…»); null si no nombra ninguno. */
  detectedSide: PerspectiveSideCode | null;
  /** «Frente a X» a veces es «al otro lado de la calle, mirando a X». */
  sideUncertain: boolean;
  suggestions: PlaceSuggestion[];
}

export interface ReferenceQueuePage {
  page: number;
  size: number;
  totalGroups: number;
  groups: ReferenceQueueGroup[];
}

export interface MigrationProgress {
  total: number;
  linked: number;
  discarded: number;
  pending: number;
}
