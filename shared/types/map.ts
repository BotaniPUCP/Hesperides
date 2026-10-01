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
