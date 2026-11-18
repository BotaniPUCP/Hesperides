import type { InventorySummary, Species, Specimen, SpecimenDetail, SpecimenListItem } from '@shared/types';
import { normalize } from '@/lib/search/searchText';

/** Datos de muestra con la forma de /api/v1/green-inventory, tomados del catastro real. */

/** Lo que una especie crítica sin promedios trae además de sus datos botánicos. */
export const medidasDeEspecieCritica = {
  critical: true,
  referenceHeightM: null,
  referenceHeightSourceCode: null,
  referenceHeightSourceName: null,
  referenceCrownRadiusM: null,
  referenceCrownRadiusSourceCode: null,
  referenceCrownRadiusSourceName: null,
  usesTrunkHeight: true,
  usesDbh: true,
  unmeasuredSpecimenCount: 0,
  extraMeasures: [],
};

export const palmeraReal: Species = {
  slug: 'roystonea-regia',
  isActive: true,
  scientificName: 'Roystonea regia',
  commonName: 'Palmera real',
  otherNames: [],
  family: 'Arecaceae',
  vegetationTypeCode: 'PALM',
  vegetationTypeName: 'Palmera',
  specimenCount: 167,
  imageUrl: 'https://drive.google.com/thumbnail?id=abc&sz=w1000',
  imageSource: 'SPECIMEN',
  photos: [],
  ...medidasDeEspecieCritica,
  unmeasuredSpecimenCount: 130,
  searchKey: 'roystonea regia palmera real arecaceae',
};

export const palmeraReina: Species = {
  ...palmeraReal,
  slug: 'syagrus-romanzoffiana',
  scientificName: 'Syagrus romanzoffiana',
  commonName: 'Palmera reina',
  otherNames: ['Palmera bruja'],
  specimenCount: 13,
  searchKey: 'syagrus romanzoffiana palmera reina arecaceae palmera bruja',
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

/** Como llegan en `/specimens/all`: con lo que el navegador usa para filtrarlos (SPEC-119). */
export function listed(specimen: Specimen, extra: Partial<SpecimenListItem> = {}): SpecimenListItem {
  return {
    speciesSlug: 'roystonea-regia', speciesCommonName: 'Palmera real', speciesScientificName: 'Roystonea regia',
    vegetationTypeCode: 'PALM', speciesCritical: true, measured: true,
    searchKey: normalize([specimen.code, specimen.sourceReference, specimen.sourceLocation, 'palmera real roystonea regia']
      .filter(Boolean).join(' ')),
    ...specimen, ...extra,
  };
}

export const p01Detail: SpecimenDetail = {
  ...p01,
  id: 1,
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
  measuredAt: '2026-01-01',
  speciesCritical: true,
  measurementStatus: 'MEASURED',
  referenceHeightM: null,
  referenceCrownRadiusM: null,
  referenceHeightSourceName: null,
  referenceCrownRadiusSourceName: null,
  lastPruningDate: null,
  measuredBeforeLastPruning: false,
  pruningAssignment: 'THIRD_PARTY',
  extraMeasures: [],
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

