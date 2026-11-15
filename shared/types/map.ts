/**
 * Contrato de la API del mapa (SPEC-102 §3). Las capas llegan como
 * FeatureCollection GeoJSON en WGS 84, armadas por PostGIS.
 */

export interface GeoJsonGeometry {
  type: 'Point' | 'Polygon' | 'MultiPolygon' | string;
  coordinates: unknown;
}

export interface GeoJsonFeature<P> {
  type: 'Feature';
  geometry: GeoJsonGeometry;
  properties: P;
}

export interface FeatureCollection<P> {
  type: 'FeatureCollection';
  features: GeoJsonFeature<P>[];
}

export interface ZoneProperties {
  code: string;
  name: string;
  description: string | null;
  parentCode: string | null;
  mapCode: string | null;
  useType: string | null;
  reservable: boolean;
  reservationOwner: string | null;
  areaM2: number | null;
  /** `GREEN_AREA` o `XEROPHYTIC`; nulo en los sectores. */
  landscapeType: string | null;
  irrigationCurrent: string | null;
  irrigationProject: string | null;
}

export interface SupervisionZoneProperties {
  code: string;
  name: string;
  supervisor: string;
  areaM2: number | null;
}

export interface ReferenceProperties {
  code: string;
  name: string;
  category: string;
  parentCode: string | null;
  aliases: string[] | null;
}

export interface BuildingProperties {
  id: number;
  name: string | null;
  inferredName: boolean;
  category: string | null;
  campus: boolean;
  heightM: number | null;
  levels: number | null;
  source: 'OSM' | 'PUCP';
  aliases: string[] | null;
  /** Id del edificio principal que lo agrupa; nulo (o ausente, formato 2) si es principal. */
  parentId: number | null;
  /** Clave del edificio en el plano oficial; solo los principales la traen. */
  planKey: string | null;
  /** Cota de la base del edificio en el plano, en metros. */
  baseM: number | null;
  /** Códigos oficiales del plano; nulo en los edificios agrupados. */
  codes: BuildingCode[] | null;
}

export interface BuildingCode {
  code: string;
  label: string;
}

/** Qué es cada pieza del modelo 3D de los edificios del plano. */
export type BuildingNodeKind = 'edificio' | 'suelo' | 'jardin' | 'muro' | 'huaca-muro' | 'huaca-tope' | 'decoracion';

/** Manifiesto del modelo 3D de los edificios del plano (SPEC-108 §3). */
export interface BuildingModelManifest {
  version: string;
  anchor: { lat: number; lon: number };
  nodes: Record<string, BuildingNodeKind>;
  sunken: { polygon: GeoJsonGeometry; floorM: number }[];
  huaca: { label: string; at: [number, number, number] };
  /** Claves de los principales cuyo modelo es todo suelo (dos rampas de estacionamiento). */
  groundOnly: string[];
  /** Ajustes por edificio (SPEC-108 D-16), por `plan_key` de una malla de edificio. Su huella en la base ya viene ajustada. */
  adjustments?: Record<string, BuildingAdjustment>;
  /** Escaleras que reemplazan una parte de la malla (SPEC-108 D-17), por `plan_key`. Su huella en la base ya no la incluye. */
  stairs?: Record<string, BuildingStair>;
  /** Edificios que el SKP dibuja dentro de la malla de otro (SPEC-108 D-18), por su propio `plan_key`. */
  pieces?: Record<string, BuildingPiece>;
}

/**
 * Un edificio que el SKP dibuja dentro de la malla de otro (SPEC-108 D-18): el visor le pasa los triángulos que
 * caen enteros en su polígono, en el marco de la malla ya ajustada (D-16). En la base, cada uno tiene su huella.
 */
export interface BuildingPiece {
  /** La `plan_key` de la malla de la que sale. */
  from: string;
  polygon: PlanPoint[];
  /** Qué se separó y a pedido de quién. */
  why: string;
}

/** Un punto del plano en metros alrededor del anclaje: [este, norte]. */
export type PlanPoint = [number, number];

/** Un tramo recto: sube de la arista `from` a la arista `to`; el primer punto de las dos va del mismo costado. */
export interface StairFlight {
  from: [PlanPoint, PlanPoint];
  to: [PlanPoint, PlanPoint];
  fromM: number;
  toM: number;
  /** La primera contrahuella se levanta en `from` y la última sube al descanso en `to`. */
  risers: number;
}

/** Una losa horizontal entre tramos, o donde termina la escalera. */
export interface StairLanding {
  polygon: PlanPoint[];
  atM: number;
}

/**
 * Una parte de la malla de un edificio que en realidad es una escalera (SPEC-108 D-17): el visor quita sus
 * triángulos, cierra el edificio donde estaba pegada y dibuja la escalera, que solo toca el suelo al arrancar.
 * Va en el marco de la malla ya ajustada (D-16), si el edificio tiene ajuste.
 */
export interface BuildingStair {
  /** Se quitan los triángulos que caen enteros en el polígono y entre las dos cotas. */
  replaces: { polygon: PlanPoint[]; fromM: number; toM: number };
  /** Donde la parte quitada estaba pegada al edificio: un muro entre las mismas cotas por cada segmento. */
  walls: [PlanPoint, PlanPoint][];
  flights: StairFlight[];
  landings: StairLanding[];
  /** Qué se corrigió y a pedido de quién. */
  why: string;
}

/**
 * Una transformación afín en metros alrededor del anclaje (x este, y norte) que el visor aplica a la malla:
 * x' = a·x + b·y + e, y' = c·x + d·y + f. La altura no cambia.
 */
export interface BuildingAdjustment {
  /** [a, b, c, d, e, f] */
  matrix: [number, number, number, number, number, number];
  /** Qué se corrigió y a pedido de quién. */
  why: string;
}

export interface CampusFeatureProperties {
  code: string | null;
  /** Código de FEATURE_TYPE: WASTE_BIN, GATE, FAUNA, PARKING, RISKY_SIDEWALK, CAMPUS_BOUNDARY. */
  type: string;
  typeLabel: string;
  name: string | null;
  attributes: Record<string, unknown> | null;
}

/** Un ejemplar del inventario verde. Las medidas solo vienen si alguien las tomó (C-08). */
export interface VegetationProperties {
  /** Código propio del ejemplar (EV-000123). */
  code: string;
  speciesSlug: string;
  commonName: string | null;
  scientificName: string;
  /** Código de SPECIES_TYPE: TREE, PALM, SHRUB, HERB, CLIMBER, SUCCULENT… */
  typeCode: string;
  typeLabel: string;
  quantity: number;
  heightM: number | null;
  crownRadiusM: number | null;
}

export interface MapLayers {
  sectors: FeatureCollection<ZoneProperties>;
  sections: FeatureCollection<ZoneProperties>;
  subsections: FeatureCollection<ZoneProperties>;
  supervisionZones: FeatureCollection<SupervisionZoneProperties>;
  references: FeatureCollection<ReferenceProperties>;
  buildings: FeatureCollection<BuildingProperties>;
  features: FeatureCollection<CampusFeatureProperties>;
  vegetation: FeatureCollection<VegetationProperties>;
}

export interface MapLayersResponse {
  version: number;
  origin: { lat: number; lon: number };
  /** Mientras haya edificios de OpenStreetMap, el mapa debe mostrar la atribución. */
  attributionRequired: boolean;
  layers: MapLayers;
}

export interface LocationDescription {
  sectionCode: string | null;
  sectionName: string | null;
  buildingName: string | null;
  relation: 'INSIDE' | 'ADJACENT_TO_SECTION' | 'NEAREST' | null;
  distanceM: number;
  text: string;
}
