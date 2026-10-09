import type { MapLayersResponse } from '@shared/types';

/** Capas mínimas pero completas: una de cada cosa, todas en el mismo cuadrado de ~10 m. */
export const LAT0 = -12.07;
export const LON0 = -77.08;

/** Cuadrado de ~10 m en grados, con el anillo cerrado como en GeoJSON. */
function square(dLat = 0, dLon = 0) {
  const a = 0.00009;
  const ring = [
    [LON0 + dLon, LAT0 + dLat],
    [LON0 + dLon + a, LAT0 + dLat],
    [LON0 + dLon + a, LAT0 + dLat + a],
    [LON0 + dLon, LAT0 + dLat + a],
    [LON0 + dLon, LAT0 + dLat],
  ];
  return { type: 'MultiPolygon', coordinates: [[ring]] };
}

function zone(code: string, extra: Record<string, unknown> = {}) {
  return {
    type: 'Feature' as const,
    geometry: square(),
    properties: {
      code, name: code, description: null, parentCode: null, mapCode: null, useType: null,
      reservable: false, reservationOwner: null, areaM2: 100, landscapeType: 'GREEN_AREA',
      irrigationCurrent: null, irrigationProject: null, ...extra,
    },
  };
}

function feature(type: string, geometry: { type: string; coordinates: unknown }) {
  return { type: 'Feature' as const, geometry, properties: { code: type, type, typeLabel: type, name: type, attributes: null } };
}

function building(id: number, campus: boolean) {
  return {
    type: 'Feature' as const,
    geometry: square(),
    properties: { id, name: null, inferredName: false, category: null, campus, heightM: 9, levels: 3, source: 'OSM' as const, aliases: null },
  };
}

const point = { type: 'Point', coordinates: [LON0, LAT0] };

export const sampleLayers: MapLayersResponse = {
  version: 7,
  origin: { lat: LAT0, lon: LON0 },
  attributionRequired: true,
  layers: {
    sectors: { type: 'FeatureCollection', features: [zone('SEC-VERDE-01', { name: 'Sector verde 01', landscapeType: null })] },
    sections: {
      type: 'FeatureCollection',
      features: [
        zone('AV-0001', { parentCode: 'SEC-VERDE-01' }),
        zone('AV-0002', { reservable: true, reservationOwner: 'DAF' }),
        zone('XE-0001', { landscapeType: 'XEROPHYTIC' }),
      ],
    },
    subsections: { type: 'FeatureCollection', features: [zone('AV-0002-1', { reservable: true, parentCode: 'AV-0002' })] },
    supervisionZones: {
      type: 'FeatureCollection',
      features: [{ type: 'Feature', geometry: square(), properties: { code: 'ZS-1', name: 'Zona 1', supervisor: 'Ana', areaM2: 1 } }],
    },
    references: {
      type: 'FeatureCollection',
      features: [{ type: 'Feature', geometry: point, properties: { code: 'REF-0001', name: 'Tinkuy', category: 'Servicios PUCP', parentCode: null, aliases: null } }],
    },
    buildings: { type: 'FeatureCollection', features: [building(1, true), building(2, false)] },
    features: {
      type: 'FeatureCollection',
      features: [
        feature('CAMPUS_BOUNDARY', square()),
        feature('WASTE_BIN', point),
        feature('GATE', point),
        feature('FAUNA', point),
        feature('DRINKING_FOUNTAIN', point),
        feature('PARKING', square()),
        feature('RISKY_SIDEWALK', square()),
      ],
    },
    vegetation: {
      type: 'FeatureCollection',
      features: [
        { type: 'Feature', geometry: point, properties: { code: 'EV-000001', speciesSlug: 'roystonea-regia', commonName: 'Palmera real',
          scientificName: 'Roystonea regia', typeCode: 'PALM', typeLabel: 'Palmera', quantity: 1, heightM: 7.5, crownRadiusM: 3.4 } },
        { type: 'Feature', geometry: point, properties: { code: 'EV-000400', speciesSlug: 'delonix-regia', commonName: 'Ponciana',
          scientificName: 'Delonix regia', typeCode: 'TREE', typeLabel: 'Árbol', quantity: 1, heightM: null, crownRadiusM: null } },
      ],
    },
  },
};
