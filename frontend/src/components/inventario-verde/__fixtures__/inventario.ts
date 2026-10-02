import type { InventorySummary, Page, Species, Specimen, SpecimenDetail } from '@shared/types';

/** Datos de muestra con la forma de /api/v1/green-inventory, tomados del catastro real. */

export const palmeraReal: Species = {
  slug: 'roystonea-regia',
  scientificName: 'Roystonea regia',
  commonName: 'Palmera real',
  otherNames: [],
  family: 'Arecaceae',
  vegetationTypeCode: 'PALM',
  vegetationTypeName: 'Palmera',
  specimenCount: 167,
  imageUrl: 'https://drive.google.com/thumbnail?id=abc&sz=w1000',
};

export const palmeraReina: Species = {
  ...palmeraReal,
  slug: 'syagrus-romanzoffiana',
  scientificName: 'Syagrus romanzoffiana',
  commonName: 'Palmera reina',
  otherNames: ['Palmera bruja'],
  specimenCount: 13,
};

export const p01: Specimen = {
  code: 'EV-000001',
  sourceReference: 'p01',
  sourceLocation: 'Educación',
  latitude: -12.067219,
  longitude: -77.079643,
  photoUrl: 'https://drive.google.com/file/d/abc/view',
  imageUrl: 'https://drive.google.com/thumbnail?id=abc&sz=w1000',
  thumbnailUrl: 'https://drive.google.com/thumbnail?id=abc&sz=w1000',
  quantity: 1,
  notes: 'Medida en «mediciones forestales - palmeras».',
};

export const p02: Specimen = { ...p01, code: 'EV-000002', sourceReference: 'p02', notes: null };

export const p01Detail: SpecimenDetail = {
  ...p01,
  legacyCode: null,
  elementTypeCode: 'INDIVIDUAL',
  elementTypeName: 'Ejemplar',
  heightM: 7.5,
  trunkHeightM: 6,
  dbhCm: 150,
  crownRadiusM: 3.4,
  isBanded: true,
  dataSource: 'MEASURED',
  section: { code: 'AV-0312', name: 'D 3' },
  species: palmeraReal,
};

export const summary: InventorySummary = {
  totalSpecies: 90,
  totalSpecimens: 965,
  vegetationTypes: [
    { code: 'TREE', label: 'Árbol', count: 570 },
    { code: 'PALM', label: 'Palmera', count: 250 },
    { code: 'GROUNDCOVER', label: 'Cubresuelo', count: 0 },
  ],
};

export function page<T>(content: T[], totalElements = content.length, number = 0, size = 24): Page<T> {
  return { content, page: { number, size, totalElements, totalPages: Math.max(1, Math.ceil(totalElements / size)) } };
}
