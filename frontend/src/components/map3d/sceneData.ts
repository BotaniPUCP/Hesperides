import type {
  BuildingProperties,
  CampusFeatureProperties,
  GeoJsonFeature,
  GeoJsonGeometry,
  MapLayersResponse,
  ReferenceProperties,
  SupervisionZoneProperties,
  ZoneProperties,
} from '@shared/types';
import { LocalPlane } from './projection';

/** Anillo plano en metros: x0, y0, x1, y1… (y hacia el norte). */
export type Ring = number[];
/** Polígono: el primer anillo es el exterior; los demás, huecos. */
export type Polygon = Ring[];

export interface ScenePoly<P> {
  g: Polygon[];
  props: P;
}

export interface ScenePoint<P> {
  p: [number, number];
  props: P;
}

/** Las capas ya proyectadas al plano local, repartidas como las dibuja el visor. */
export interface SceneData {
  plane: LocalPlane;
  campus: Polygon[];
  greenAreas: ScenePoly<ZoneProperties>[];
  xerophytic: ScenePoly<ZoneProperties>[];
  reserve: ScenePoly<ZoneProperties>[];
  supervision: ScenePoly<SupervisionZoneProperties>[];
  campusBuildings: ScenePoly<BuildingProperties>[];
  contextBuildings: ScenePoly<BuildingProperties>[];
  parking: ScenePoly<CampusFeatureProperties>[];
  sidewalks: ScenePoly<CampusFeatureProperties>[];
  bins: ScenePoint<CampusFeatureProperties>[];
  gates: ScenePoint<CampusFeatureProperties>[];
  fauna: ScenePoint<CampusFeatureProperties>[];
  references: ScenePoint<ReferenceProperties>[];
  sectorNameByCode: Record<string, string>;
}

type Position = [number, number];

function ringToPlane(ring: Position[], plane: LocalPlane): Ring {
  const closed = ring.length > 1 && ring[0][0] === ring[ring.length - 1][0] && ring[0][1] === ring[ring.length - 1][1];
  const vertices = closed ? ring.slice(0, -1) : ring;
  return vertices.flatMap(([lon, lat]) => {
    const p = plane.toPlane(lat, lon);
    return [p.x, p.y];
  });
}

function polygons(geometry: GeoJsonGeometry, plane: LocalPlane): Polygon[] {
  if (geometry.type === 'Polygon') {
    return [(geometry.coordinates as Position[][]).map((r) => ringToPlane(r, plane))];
  }
  if (geometry.type === 'MultiPolygon') {
    return (geometry.coordinates as Position[][][]).map((poly) => poly.map((r) => ringToPlane(r, plane)));
  }
  throw new Error(`Geometría no poligonal: ${geometry.type}`);
}

function point(geometry: GeoJsonGeometry, plane: LocalPlane): [number, number] {
  const [lon, lat] = geometry.coordinates as Position;
  const p = plane.toPlane(lat, lon);
  return [p.x, p.y];
}

const toPoly =
  (plane: LocalPlane) =>
  <P>(f: GeoJsonFeature<P>): ScenePoly<P> => ({ g: polygons(f.geometry, plane), props: f.properties });

const toPoint =
  (plane: LocalPlane) =>
  <P>(f: GeoJsonFeature<P>): ScenePoint<P> => ({ p: point(f.geometry, plane), props: f.properties });

export function toSceneData(response: MapLayersResponse): SceneData {
  const plane = new LocalPlane(response.origin.lat, response.origin.lon);
  const poly = toPoly(plane);
  const pt = toPoint(plane);
  const { layers } = response;
  const features = layers.features.features;
  const ofType = (type: string) => features.filter((f) => f.properties.type === type);

  const boundary = ofType('CAMPUS_BOUNDARY')[0];
  if (!boundary) {
    throw new Error('Falta el límite del campus: sin él no se puede armar la maqueta');
  }

  const sections = layers.sections.features;
  return {
    plane,
    campus: polygons(boundary.geometry, plane),
    greenAreas: sections.filter((f) => f.properties.landscapeType !== 'XEROPHYTIC').map(poly),
    xerophytic: sections.filter((f) => f.properties.landscapeType === 'XEROPHYTIC').map(poly),
    reserve: [...sections.filter((f) => f.properties.reservable), ...layers.subsections.features].map(poly),
    supervision: layers.supervisionZones.features.map(poly),
    campusBuildings: layers.buildings.features.filter((b) => b.properties.campus).map(poly),
    contextBuildings: layers.buildings.features.filter((b) => !b.properties.campus).map(poly),
    parking: ofType('PARKING').map(poly),
    sidewalks: ofType('RISKY_SIDEWALK').map(poly),
    bins: ofType('WASTE_BIN').map(pt),
    gates: ofType('GATE').map(pt),
    fauna: ofType('FAUNA').map(pt),
    references: layers.references.features.map(pt),
    sectorNameByCode: Object.fromEntries(layers.sectors.features.map((s) => [s.properties.code, s.properties.name])),
  };
}
